// Adapter Vercel serverless: export app Express apa adanya (tanpa listen).
// Hanya dipakai di Vercel; lokal/Render tetap `node server.js`.
// backend/server.js hanya listen bila require.main === module, jadi aman di-require.
const app = require('../backend/server');
const { initDb } = require('../backend/lib/data');

// initDb (5 head-count murah) sekali per cold start, bukan per request.
let siap = null;
module.exports = (req, res) => {
  if (!siap) siap = initDb().catch((err) => { siap = null; throw err; });
  return siap.then(() => app(req, res));
};
