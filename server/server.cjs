// Small local API: json-server + login/register + signed tokens + permissions.
// Run with:  npm run api
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jsonServer = require('json-server');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, '..', 'db.json'));
const middlewares = jsonServer.defaults();
const PORT = 3000;
const TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---------- secret used to sign tokens (created once, kept out of git) ----------
const SECRET_FILE = path.join(__dirname, '.secret');
function loadSecret() {
  try {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, secret);
    return secret;
  }
}
const SECRET = loadSecret();

// ---------- password hashing (scrypt, built into Node) ----------
function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(plain, stored) {
  if (typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
  const [, salt, hash] = stored.split('$');
  const test = crypto.scryptSync(plain, salt, 64);
  const real = Buffer.from(hash, 'hex');
  return test.length === real.length && crypto.timingSafeEqual(test, real);
}

// ---------- signed tokens ----------
function signToken(userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_LIFETIME_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function readToken(token) {
  if (typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() ? data.uid : null;
  } catch {
    return null;
  }
}

const users = () => router.db.get('users');
const withoutPassword = ({ password, ...rest }) => rest;
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const sameId = (a, b) => String(a) === String(b);

// ---------- one-time migration: hash any plain-text passwords ----------
let migrated = 0;
users().value().forEach((u) => {
  if (typeof u.password === 'string' && !u.password.startsWith('scrypt$')) {
    users().find({ id: u.id }).assign({ password: hashPassword(u.password) }).value();
    migrated++;
  }
});
if (migrated) {
  router.db.write();
  console.log(`Hashed ${migrated} plain-text password(s) in db.json`);
}

server.use(middlewares);
server.use(jsonServer.bodyParser);

// ---------- login attempts limit (5 wrong tries = 1 minute lock) ----------
const failures = new Map();
const MAX_FAILURES = 5;
const LOCK_MS = 60 * 1000;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

// ---------- POST /login ----------
server.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const key = `${email.trim().toLowerCase()}|${req.ip}`;
  const record = failures.get(key);
  if (record && record.until > Date.now()) {
    return res.status(429).json({ message: 'Too many attempts. Try again in a minute.' });
  }

  const user = users().find((u) => (u.email || '').toLowerCase() === email.trim().toLowerCase()).value();
  if (!user || user.active === false || !verifyPassword(password, user.password)) {
    // start counting again if the last failure is old or the lock has ended
    const stale = !record || Date.now() - record.at > FAILURE_WINDOW_MS || (record.until && record.until <= Date.now());
    const count = (stale ? 0 : record.count) + 1;
    failures.set(key, { count, at: Date.now(), until: count >= MAX_FAILURES ? Date.now() + LOCK_MS : 0 });
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  failures.delete(key);
  res.json({ ...withoutPassword(user), token: signToken(user.id) });
});

// ---------- POST /register ----------
server.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || !isEmail(email) ||
      typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Invalid registration details' });
  }
  const exists = users().find((u) => (u.email || '').toLowerCase() === email.trim().toLowerCase()).value();
  if (exists) {
    return res.status(409).json({ message: 'Email already registered' });
  }
  // role and active are decided here, never by the browser
  const created = users()
    .insert({ name: name.trim(), email: email.trim(), password: hashPassword(password), role: 'user', active: true })
    .write();
  res.status(201).json(withoutPassword(created));
});

// ---------- GET /email-exists?email=... (used by the register form) ----------
server.get('/email-exists', (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const user = users().find((u) => (u.email || '').toLowerCase() === email).value();
  // "isAdmin" lets the login page hide "Create an account" for admin emails.
  res.json({ exists: !!user, isAdmin: !!user && user.role === 'admin' });
});

// ---------- who is calling? (reads the token) ----------
server.use((req, res, next) => {
  const auth = req.headers.authorization || '';
  const uid = auth.startsWith('Bearer ') ? readToken(auth.slice(7)) : null;
  const user = uid != null ? users().find((u) => sameId(u.id, uid)).value() : null;
  req.user = user && user.active !== false ? user : null;
  next();
});

// ---------- permission rules ----------
const OWNED = ['cart', 'wishlist', 'addresses', 'orders'];
// customers can cancel only until the order ships (admins are not limited)
const CANCELLABLE = ['Pending', 'Processing'];
const RETURN_WINDOW_DAYS = 7;

server.use((req, res, next) => {
  const [, resource, id] = req.path.split('/');
  const me = req.user;
  const isAdmin = !!me && me.role === 'admin';
  const deny = () => res.status(403).json({ message: 'Not allowed' });
  const needLogin = () => res.status(401).json({ message: 'Please log in' });

  if (resource === 'db') return deny(); // json-server's "download everything" route

  // Products: anyone can look, only admin can change.
  if (resource === 'products') {
    if (req.method === 'GET') return next();
    if (!me) return needLogin();
    if (isAdmin) return next();
    // TEMPORARY: checkout and cancel still change stock from the browser.
    // Section 5 moves this to the server; then this line is removed.
    const onlyStock = req.body && Object.keys(req.body).every((k) => k === 'stock');
    if (req.method === 'PATCH' && id && onlyStock) return next();
    return deny();
  }

  if (!me) return needLogin();
  if (isAdmin) return next();

  // Users: you can read and edit only yourself (and never your own "active" flag).
  if (resource === 'users') {
    if (!id || !sameId(id, me.id)) return deny();
    if (req.method === 'GET') return next();
    if (req.method === 'PATCH') {
      // a customer may only change their own name and profile picture
      for (const key of Object.keys(req.body || {})) {
        if (key !== 'name' && key !== 'profilePicture') delete req.body[key];
      }
      return next();
    }
    return deny();
  }

  // Cart, wishlist, addresses, orders: only your own records.
  if (OWNED.includes(resource)) {
    if (!id) {
      if (req.method === 'GET') return sameId(req.query.userId, me.id) ? next() : deny();
      if (req.method === 'POST') {
        if (req.body) {
          req.body.userId = me.id;
          if (resource === 'orders') {
            // a new order always starts as Pending, with no cancel/return history
            req.body.status = 'Pending';
            for (const key of ['deliveredAt', 'returnRequest', 'cancelNote', 'cancelledBy', 'cancelledAt']) {
              delete req.body[key];
            }
          }
        }
        return next();
      }
      return deny();
    }

    const record = router.db.get(resource).find((r) => sameId(r.id, id)).value();
    if (!record) return next(); // let json-server answer 404
    if (!sameId(record.userId, me.id)) return deny();

    if (resource === 'orders') {
      if (req.method === 'GET') return next();
      const body = req.body || {};
      const keys = Object.keys(body);

      if (req.method === 'PATCH' && keys.length > 0) {
        // 1) the customer cancels their own order (only while it can still be cancelled)
        const cancelKeys = ['status', 'cancelNote', 'cancelledBy', 'cancelledAt'];
        if (body.status === 'Cancelled' && keys.every((k) => cancelKeys.includes(k))) {
          if (!CANCELLABLE.includes(record.status)) return deny();
          body.cancelledBy = 'user';
          return next();
        }

        // 2) the customer asks to return a delivered order (once, inside the return window)
        if (keys.length === 1 && keys[0] === 'returnRequest' && body.returnRequest) {
          if (record.status !== 'Delivered' || record.returnRequest) return deny();
          if (record.deliveredAt && Date.now() - Date.parse(record.deliveredAt) > RETURN_WINDOW_DAYS * 86400000) return deny();
          const { reason, comment } = body.returnRequest;
          body.returnRequest = {
            reason: String(reason || '').slice(0, 200),
            comment: comment ? String(comment).slice(0, 1000) : undefined,
            requestedAt: new Date().toISOString(),
            status: 'Requested'
          };
          return next();
        }
      }
      return deny();
    }

    if (req.body && req.method !== 'DELETE') req.body.userId = me.id;
    return next();
  }

  return deny();
});

// ---------- extra protection for the /users resource ----------
server.use('/users', (req, res, next) => {
  // new accounts must go through POST /register; PUT would wipe the record
  if (req.method === 'POST' || req.method === 'PUT') return res.status(403).json({ message: 'Not allowed' });
  // nobody may change password, role or email directly
  if (req.method === 'PATCH' && req.body) {
    delete req.body.password;
    delete req.body.role;
    delete req.body.email;
  }
  next();
});

// ---------- never send a password hash back to the browser ----------
router.render = (req, res) => {
  const strip = (x) => (x && typeof x === 'object' && 'password' in x ? withoutPassword(x) : x);
  const data = res.locals.data;
  res.jsonp(Array.isArray(data) ? data.map(strip) : strip(data));
};

server.use(router);
server.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
