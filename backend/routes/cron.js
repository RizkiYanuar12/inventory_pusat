// Cron Vercel 1x/hari (pengganti setTimeout scheduleRandomSampling yang tak jalan di serverless).
// Guard: Vercel mengirim Authorization: Bearer $CRON_SECRET otomatis.
const express = require('express');
const router = express.Router();
const { RandomSamplingChecking } = require('../lib/data');

router.get('/api/cron/sampling', async (req, res) => {
  try {
    const rahasia = String(process.env.CRON_SECRET || '');
    const beri = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!rahasia || beri !== rahasia) return res.status(401).json({ ok: false, pesan: 'Tak diizinkan.' });
    const sesi = await RandomSamplingChecking();
    res.json({ ok: true, sesi });
  } catch (err) {
    console.error(err);
    res.json({ ok: true, sesi: null, peringatan: err.message });
  }
});

module.exports = router;
