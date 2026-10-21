// Vercel Serverless Function entry point
const fs = require('fs');
const path = require('path');

// Ensure writable db.json exists in /tmp for Vercel serverless environment
const localDb = path.join(__dirname, '..', 'db.json');
const tmpDb = '/tmp/db.json';

if (process.env.VERCEL && !fs.existsSync(tmpDb) && fs.existsSync(localDb)) {
  try {
    fs.copyFileSync(localDb, tmpDb);
  } catch (err) {
    console.error('Failed to copy db.json to /tmp:', err);
  }
}

const server = require('../server/server.cjs');

module.exports = (req, res) => {
  // Strip /api prefix if present so Express routes match
  if (req.url.startsWith('/api')) {
    req.url = req.url.replace(/^\/api/, '') || '/';
  }
  return server(req, res);
};
