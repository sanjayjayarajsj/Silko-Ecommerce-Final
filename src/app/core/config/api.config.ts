import { isDevMode } from '@angular/core';

// The only place the backend address lives.
//  - `ng serve` (dev)  -> your local json-server  (npm run api)
//  - production build  -> your hosted API (Render etc.)
// After you deploy the API, paste its public URL below (no trailing slash).
const PRODUCTION_API_URL = 'https://YOUR-SILKO-API.onrender.com';

export const API_URL = isDevMode() ? 'http://localhost:3000' : PRODUCTION_API_URL;