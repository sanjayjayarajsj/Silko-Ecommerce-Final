// The only place the backend address lives.
// In browser on production (e.g. Vercel), use relative /api.
// On localhost, point to local Express/json-server on port 3000.
export const API_URL =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? '/api'
    : 'http://localhost:3000';