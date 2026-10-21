// Small local API: json-server + login/register + signed tokens + permissions.
// Run with:  npm run api
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jsonServer = require('json-server');

const server = jsonServer.create();
const DB_FILE = path.join(__dirname, '..', 'db.json');

// json-server only creates routes for lists that already exist in db.json,
// so add an empty "reviews" list the first time.
{
  const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!Array.isArray(raw.reviews)) {
    raw.reviews = [];
    fs.writeFileSync(DB_FILE, JSON.stringify(raw, null, 2));
  }
}

const router = jsonServer.router(DB_FILE);
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

// ---------- reviews: helpers ----------
const reviewsList = () => router.db.get('reviews');
const cleanText = (value, max) => String(value ?? '').trim().slice(0, max);

// Keeps "ratingAverage" and "ratingCount" on each product up to date,
// so the product list and cards never have to download every review.
function refreshRating(productId) {
  const list = reviewsList().filter((r) => sameId(r.productId, productId)).value();
  const count = list.length;
  const average = count ? Math.round((list.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10 : 0;
  router.db.get('products').find((p) => sameId(p.id, productId)).assign({ ratingAverage: average, ratingCount: count }).value();
}

// Checks the rating and text of a review. Returns { error } or the clean values.
function checkReview(body, existing) {
  const rating = body.rating !== undefined ? Number(body.rating) : existing?.rating;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Please choose a rating from 1 to 5 stars.' };

  const comment = body.comment !== undefined ? cleanText(body.comment, 1000) : existing?.comment;
  if (!comment || comment.length < 5) return { error: 'Please write a few words about the watch (at least 5 characters).' };

  const title = body.title !== undefined ? cleanText(body.title, 80) : existing?.title;
  return { rating, comment, title: title || undefined };
}

// On every start: drop reviews of watches that no longer exist,
// and make sure every watch shows the right average.
{
  const productIds = router.db.get('products').map('id').value();
  const kept = reviewsList().filter((r) => productIds.some((id) => sameId(id, r.productId))).value();
  if (kept.length !== reviewsList().value().length) router.db.set('reviews', kept).value();
  router.db.get('products').value().forEach((product) => {
    if (product.ratingCount || kept.some((r) => sameId(r.productId, product.id))) refreshRating(product.id);
  });
  router.db.write();
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

// ---------- reviews: write routes (reading goes through the normal public GET) ----------
server.post('/reviews', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Please log in to write a review.' });

  const productId = Number((req.body || {}).productId);
  const product = router.db.get('products').find((p) => sameId(p.id, productId)).value();
  if (!product) return res.status(404).json({ message: 'Watch not found.' });

  const checked = checkReview(req.body || {}, null);
  if (checked.error) return res.status(400).json({ message: checked.error });

  const already = reviewsList().find((r) => sameId(r.productId, productId) && sameId(r.userId, req.user.id)).value();
  if (already) return res.status(409).json({ message: 'You have already reviewed this watch.' });

  // "Verified purchase" = this person has a delivered order that contains the watch
  const verifiedPurchase = router.db.get('orders').value().some((order) =>
    sameId(order.userId, req.user.id) && order.status === 'Delivered' &&
    (order.items || []).some((item) => item.product && !item.cancelled && sameId(item.product.id, productId))
  );

  const created = reviewsList().insert({
    productId,
    userId: req.user.id,
    userName: req.user.name,
    rating: checked.rating,
    title: checked.title,
    comment: checked.comment,
    createdAt: new Date().toISOString(),
    verifiedPurchase
  }).value();
  refreshRating(productId);
  router.db.write();
  res.status(201).json(created);
});

server.patch('/reviews/:id', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Please log in.' });
  const review = reviewsList().find((r) => sameId(r.id, req.params.id)).value();
  if (!review) return res.status(404).json({ message: 'Review not found.' });
  if (!sameId(review.userId, req.user.id)) return res.status(403).json({ message: 'You can only edit your own review.' });

  const checked = checkReview(req.body || {}, review);
  if (checked.error) return res.status(400).json({ message: checked.error });

  Object.assign(review, { rating: checked.rating, comment: checked.comment, title: checked.title, updatedAt: new Date().toISOString() });
  refreshRating(review.productId);
  router.db.write();
  res.json(review);
});

server.delete('/reviews/:id', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Please log in.' });
  const review = reviewsList().find((r) => sameId(r.id, req.params.id)).value();
  if (!review) return res.status(404).json({ message: 'Review not found.' });
  // the writer can delete their own review; an admin can delete any
  if (!sameId(review.userId, req.user.id) && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You can only delete your own review.' });
  }
  router.db.set('reviews', reviewsList().filter((r) => !sameId(r.id, review.id)).value()).value();
  refreshRating(review.productId);
  router.db.write();
  res.json({});
});

// ---------- orders: checks and constants ----------
const NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const ADDRESS_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s,.\-\/#']*$/;
const PAYMENT_METHODS = ['Card', 'UPI', 'COD'];
const MAX_QUANTITY_PER_PRODUCT = 5;
const MAX_PRODUCTS_IN_ORDER = 5;
const ORDER_FLOW = ['Pending', 'Processing', 'Shipped', 'Delivered'];
const RETURN_STATUSES = ['Requested', 'Approved', 'Picked Up', 'Refunded', 'Rejected'];
// customers can cancel only until the order ships; admins can cancel until it is delivered
const CUSTOMER_CANCELLABLE = ['Pending', 'Processing'];
const ADMIN_CANCELLABLE = ['Pending', 'Processing', 'Shipped'];

const productsList = () => router.db.get('products');
const findProduct = (id) => productsList().find((p) => sameId(p.id, id)).value();

// Checks the delivery details of an order or address. Returns { error } or the clean values.
function checkDelivery(body) {
  const fullName = cleanText(body.fullName, 60);
  const phone = String(body.phone ?? '').trim();
  const address = cleanText(body.address, 200);
  const city = cleanText(body.city, 60);
  const pincode = String(body.pincode ?? '').trim();

  if (fullName.length < 3 || !NAME_PATTERN.test(fullName)) return { error: 'Please enter a valid full name (letters only, at least 3 characters).' };
  if (!/^[6-9]\d{9}$/.test(phone)) return { error: 'Please enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.' };
  if (address.length < 5 || !ADDRESS_PATTERN.test(address)) return { error: 'Please enter a valid address (at least 5 characters).' };
  if (city.length < 2 || !NAME_PATTERN.test(city)) return { error: 'Please enter a valid city (letters only).' };
  if (!/^\d{6}$/.test(pincode)) return { error: 'PIN code must be exactly 6 digits.' };
  return { fullName, phone, address, city, pincode };
}

// The small copy of a watch kept inside an order (what it was, at the time of the order)
const orderSnapshot = (p) => ({
  id: p.id, name: p.name, brand: p.brand, price: p.price,
  image: p.image, category: p.category, description: p.description, stock: p.stock
});

// ---------- orders: place an order ----------
// The browser only says WHICH watches, HOW MANY, and WHERE to send them.
// Prices, stock, the total and the status are all decided here.
server.post('/orders', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Please log in to place an order.' });
  if (req.user.role === 'admin') return res.status(403).json({ message: 'Admin accounts cannot place orders.' });
  const body = req.body || {};

  const delivery = checkDelivery(body);
  if (delivery.error) return res.status(400).json({ code: 'INVALID_DETAILS', message: delivery.error });
  if (!PAYMENT_METHODS.includes(body.paymentMethod)) {
    return res.status(400).json({ code: 'INVALID_DETAILS', message: 'Please choose a payment method.' });
  }

  // the items, with several lines for the same watch added together
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ code: 'INVALID_ITEMS', message: 'Your order has no items.' });
  }
  const wanted = new Map();
  for (const item of body.items) {
    const productId = Number(item && item.productId);
    const quantity = Number(item && item.quantity);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ code: 'INVALID_ITEMS', message: 'One of the items in your order is not valid.' });
    }
    wanted.set(productId, (wanted.get(productId) || 0) + quantity);
  }
  if (wanted.size > MAX_PRODUCTS_IN_ORDER) {
    return res.status(400).json({ code: 'INVALID_ITEMS', message: `You can order up to ${MAX_PRODUCTS_IN_ORDER} different watches at once.` });
  }
  for (const quantity of wanted.values()) {
    if (quantity > MAX_QUANTITY_PER_PRODUCT) {
      return res.status(400).json({ code: 'INVALID_ITEMS', message: `You can order up to ${MAX_QUANTITY_PER_PRODUCT} of each watch.` });
    }
  }

  // look every watch up on the server: real price, real stock
  const lines = [];
  const short = [];
  for (const [productId, quantity] of wanted) {
    const product = findProduct(productId);
    if (!product) {
      return res.status(409).json({ code: 'PRODUCT_GONE', message: 'One of the watches in your order is no longer available.', productIds: [productId] });
    }
    if (product.stock < quantity) short.push(product);
    lines.push({ product, quantity });
  }
  if (short.length > 0) {
    return res.status(409).json({
      code: 'OUT_OF_STOCK',
      message: short.map((p) => (p.stock === 0 ? `${p.name} is out of stock.` : `Only ${p.stock} left of ${p.name}.`)).join(' '),
      products: short
    });
  }

  const total = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  // If the price changed since the customer last saw it, tell them instead of charging a different amount.
  if (body.expectedTotal !== undefined && Number(body.expectedTotal) !== total) {
    return res.status(409).json({
      code: 'PRICE_CHANGED',
      message: 'The price of an item has changed. Please check the new total and place your order again.',
      total,
      products: lines.map((line) => line.product)
    });
  }

  // Everything below runs without any pause, so two orders can never both take the last watch.
  for (const { product, quantity } of lines) product.stock -= quantity;

  const order = router.db.get('orders').insert({
    userId: req.user.id,
    ...delivery,
    paymentMethod: body.paymentMethod,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    items: lines.map(({ product, quantity }) => ({ product: orderSnapshot(product), quantity })),
    total
  }).value();

  // An order made from the cart empties those lines. "Buy now" leaves the cart alone.
  if (body.source === 'cart') {
    const ordered = lines.map((line) => line.product.id);
    const remaining = router.db.get('cart').value().filter((c) =>
      !(sameId(c.userId, req.user.id) && c.product && ordered.some((id) => sameId(id, c.product.id)))
    );
    router.db.set('cart', remaining).value();
  }

  router.db.write();
  res.status(201).json(order);
});

// ---------- orders: cancelling and returning ----------
// An order can be cancelled as a whole, or one item at a time (before it ships).
// After delivery, each item can be returned on its own.
const lineAmount = (item) => item.product.price * item.quantity;
const findItem = (order, productId) =>
  (order.items || []).find((item) => item.product && sameId(item.product.id, productId));
const findOrder = (id) => router.db.get('orders').find((o) => sameId(o.id, id)).value();

// Cancels the given items of an order: gives their stock back (to each watch's
// CURRENT stock; watches deleted since are skipped) and adds their price to the refund.
// When no active item is left, the whole order becomes Cancelled.
function cancelItems(order, items, actor, note) {
  const now = new Date().toISOString();
  for (const item of items) {
    const product = findProduct(item.product.id);
    if (product) product.stock += item.quantity;
    item.cancelled = { at: now, by: actor, note };
    order.refundedTotal = (order.refundedTotal || 0) + lineAmount(item);
  }
  if ((order.items || []).every((item) => item.cancelled)) {
    Object.assign(order, { status: 'Cancelled', cancelNote: note, cancelledBy: actor, cancelledAt: now });
  }
}

// Who may cancel, and what note is needed. Returns { error, status } or { actor, note }.
function checkCancel(req, order) {
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && !sameId(order.userId, req.user.id)) {
    return { status: 403, error: 'You can only cancel your own orders.' };
  }
  const allowed = isAdmin ? ADMIN_CANCELLABLE : CUSTOMER_CANCELLABLE;
  if (!allowed.includes(order.status)) {
    return { status: 409, error: 'This order can no longer be cancelled.' };
  }
  const note = cleanText((req.body || {}).note, 300);
  if (isAdmin && !note) return { status: 400, error: 'Please give a reason for cancelling.' };
  return { actor: isAdmin ? 'admin' : 'user', note: note || 'Cancelled by you' };
}

// Cancel the whole order (every item that is still active)
server.post('/orders/:id/cancel', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Please log in.' });
  const order = findOrder(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found.' });

  const check = checkCancel(req, order);
  if (check.error) return res.status(check.status).json({ message: check.error });

  cancelItems(order, (order.items || []).filter((item) => !item.cancelled), check.actor, check.note);
  router.db.write();
  res.json(order);
});

// Cancel ONE item of an order
server.post('/orders/:id/items/:productId/cancel', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Please log in.' });
  const order = findOrder(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found.' });

  const check = checkCancel(req, order);
  if (check.error) return res.status(check.status).json({ message: check.error });

  const item = findItem(order, req.params.productId);
  if (!item) return res.status(404).json({ message: 'That item is not in this order.' });
  if (item.cancelled) return res.status(409).json({ message: 'This item is already cancelled.' });

  cancelItems(order, [item], check.actor, check.note);
  router.db.write();
  res.json(order);
});

// Customer asks to return ONE delivered item (once per item, inside the return window)
server.post('/orders/:id/items/:productId/return', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Please log in.' });
  const order = findOrder(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  if (!sameId(order.userId, req.user.id)) return res.status(403).json({ message: 'You can only return your own orders.' });

  if (order.status !== 'Delivered') return res.status(409).json({ message: 'Only delivered items can be returned.' });
  if (order.returnRequest) return res.status(409).json({ message: 'A return was already requested for this order.' });
  if (order.deliveredAt && Date.now() - Date.parse(order.deliveredAt) > RETURN_WINDOW_DAYS * 86400000) {
    return res.status(409).json({ message: 'The return period for this order has ended.' });
  }

  const item = findItem(order, req.params.productId);
  if (!item) return res.status(404).json({ message: 'That item is not in this order.' });
  if (item.cancelled) return res.status(409).json({ message: 'This item was cancelled.' });
  if (item.returnRequest) return res.status(409).json({ message: 'A return was already requested for this item.' });

  const reason = cleanText((req.body || {}).reason, 200);
  const comment = cleanText((req.body || {}).comment, 300);
  if (!reason) return res.status(400).json({ message: 'Please choose a reason for the return.' });
  if (reason === 'Other' && comment.length < 5) {
    return res.status(400).json({ message: 'Please describe the problem (at least 5 characters).' });
  }

  item.returnRequest = {
    reason,
    comment: comment || undefined,
    requestedAt: new Date().toISOString(),
    status: 'Requested'
  };
  router.db.write();
  res.json(order);
});

// Admin moves ONE item's return forward (or rejects it with a note)
const RETURN_NEXT = { 'Requested': ['Approved', 'Rejected'], 'Approved': ['Picked Up'], 'Picked Up': ['Refunded'] };

server.patch('/orders/:id/items/:productId/return', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Please log in.' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Not allowed' });

  const order = findOrder(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  const item = findItem(order, req.params.productId);
  if (!item || !item.returnRequest) return res.status(404).json({ message: 'There is no return request for this item.' });

  const status = (req.body || {}).status;
  const current = item.returnRequest.status;
  if (!RETURN_STATUSES.includes(status)) return res.status(400).json({ message: 'That return status is not valid.' });
  if (!(RETURN_NEXT[current] || []).includes(status)) {
    return res.status(409).json({ message: 'That return status change is not allowed.' });
  }

  const adminNote = cleanText((req.body || {}).adminNote, 300);
  if (status === 'Rejected' && adminNote.length < 5) {
    return res.status(400).json({ message: 'Please tell the customer why the return is rejected (at least 5 characters).' });
  }

  item.returnRequest.status = status;
  if (status === 'Rejected') item.returnRequest.adminNote = adminNote;
  item.returnRequest.updatedAt = new Date().toISOString();
  if (status === 'Refunded') order.refundedTotal = (order.refundedTotal || 0) + lineAmount(item);

  router.db.write();
  res.json(order);
});

// ---------- permission rules ----------
const OWNED = ['cart', 'wishlist', 'addresses', 'orders'];
const RETURN_WINDOW_DAYS = 7;

server.use((req, res, next) => {
  const [, resource, id] = req.path.split('/');
  const me = req.user;
  const isAdmin = !!me && me.role === 'admin';
  const deny = () => res.status(403).json({ message: 'Not allowed' });
  const needLogin = () => res.status(401).json({ message: 'Please log in' });

  if (resource === 'db') return deny(); // json-server's "download everything" route

  // Reviews: anyone can read. Writing is handled by the routes above.
  if (resource === 'reviews') return req.method === 'GET' ? next() : deny();

  // Products: anyone can look, only admin can change.
  if (resource === 'products') {
    if (req.method === 'GET') return next();
    if (!me) return needLogin();
    if (isAdmin) return next();
    return deny(); // customers never change products: stock is handled by the server
  }

  if (!me) return needLogin();

  // Admin and orders: look, and move an order forward. Creating an order, cancelling
  // (which must give stock back) and deleting orders have their own rules.
  if (isAdmin && resource === 'orders') {
    if (req.method === 'GET') return next();
    if (req.method !== 'PATCH' || !id) return deny();
    const record = router.db.get('orders').find((r) => sameId(r.id, id)).value();
    if (!record) return next(); // json-server answers 404

    const body = req.body || {};
    const clean = {};

    if (body.status !== undefined) {
      const from = ORDER_FLOW.indexOf(record.status);
      const to = ORDER_FLOW.indexOf(body.status);
      if (from === -1 || to !== from + 1) {
        return res.status(409).json({ message: 'That status change is not allowed.' });
      }
      clean.status = body.status;
      if (body.status === 'Delivered') clean.deliveredAt = new Date().toISOString();
    }

    if (body.returnRequest !== undefined) {
      const change = body.returnRequest || {};
      if (!record.returnRequest) return deny();
      if (change.status !== undefined && !RETURN_STATUSES.includes(change.status)) {
        return res.status(400).json({ message: 'That return status is not valid.' });
      }
      clean.returnRequest = {
        ...record.returnRequest,
        ...(change.status !== undefined ? { status: change.status } : {}),
        ...(change.adminNote !== undefined ? { adminNote: cleanText(change.adminNote, 300) } : {}),
        updatedAt: new Date().toISOString()
      };
    }

    if (Object.keys(clean).length === 0) return deny();
    req.body = clean;
    return next();
  }

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
        // orders are created only by POST /orders (above), which does the pricing and stock
        if (resource === 'orders') return deny();
        const body = req.body || {};
        body.userId = me.id;

        // cart and wishlist keep a copy of the watch: always the real one, never what the browser says
        if (resource === 'cart' || resource === 'wishlist') {
          const live = findProduct(Number(body.product && body.product.id));
          if (!live) return res.status(404).json({ message: 'Watch not found.' });
          body.product = live;
        }
        if (resource === 'cart') {
          const quantity = Number(body.quantity);
          if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_PRODUCT) {
            return res.status(400).json({ message: `Quantity must be 1 to ${MAX_QUANTITY_PER_PRODUCT}.` });
          }
          body.quantity = quantity;
        }

        // a saved address must have valid details, including a mobile number
        if (resource === 'addresses') {
          const checked = checkDelivery(body);
          if (checked.error) return res.status(400).json({ message: checked.error });
          Object.assign(body, checked);
          body.type = body.type === 'Work' ? 'Work' : 'Home';
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
        // The only change a customer can make with PATCH: ask to return a delivered order
        // (once, inside the return window). Cancelling uses POST /orders/:id/cancel.
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

    if (resource === 'addresses' && req.method !== 'GET' && req.method !== 'DELETE') return deny();

    if (resource === 'cart' && req.method === 'PATCH') {
      // only the quantity of a cart line can change
      const quantity = Number((req.body || {}).quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_PRODUCT) {
        return res.status(400).json({ message: `Quantity must be 1 to ${MAX_QUANTITY_PER_PRODUCT}.` });
      }
      req.body = { quantity };
      return next();
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

  // A cart or wishlist line keeps an old copy of the watch. When it is read, swap in
  // the current one, so the price and stock shown are always today's.
  const resource = req.path.split('/')[1];
  const fresh = (x) => {
    if (!x || typeof x !== 'object' || !x.product) return x;
    const live = findProduct(x.product.id);
    return live ? { ...x, product: live } : x;
  };
  const live = resource === 'cart' || resource === 'wishlist';

  const data = res.locals.data;
  const prepare = (x) => strip(live ? fresh(x) : x);
  res.jsonp(Array.isArray(data) ? data.map(prepare) : prepare(data));
};

server.use(router);

if (require.main === module) {
  server.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

module.exports = server;
