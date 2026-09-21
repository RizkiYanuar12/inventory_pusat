// Route gudang: sesi + password + kelola link (potong-pindah murni dari server.js lama).
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { sb } = require('../../db');
const { hashKataSandi, cekKataSandi, kenaRate, bacaCookie, simpanSesi, ambilSesi, hapusSesi, UMUR_SESI_GUDANG_MS, wajibGudang, atributSecure } = require('../lib/auth');

router.post('/api/gudang/masuk', async (req, res) => {
  try {
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || '?';
    if (kenaRate(`gudang:${ip}`)) {
      return res.status(429).json({ sukses: false, pesan: 'Terlalu banyak percobaan. Tunggu sebentar.' });
    }
    const { password } = req.body || {};
    const r = await sb.from('gudang').select('*').eq('id', 1).maybeSingle();
    if (r.error) throw new Error(r.error.message);
    if (!r.data) {
      return res.status(401).json({ sukses: false, pesan: 'Password gudang belum di-set. Minta ke developer.' });
    }
    if (!cekKataSandi(password, r.data.password_gudang)) {
      return res.status(401).json({ sukses: false, pesan: 'Password salah.' });
    }
    const tok = crypto.randomBytes(32).toString('hex');
    await simpanSesi(tok, { jenis: 'gudang', expMs: Date.now() + UMUR_SESI_GUDANG_MS });
    res.setHeader('Set-Cookie', `sesi_gudang=${tok}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${atributSecure(req)}`);
    res.json({ sukses: true, pesan: 'Masuk sebagai gudang.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ sukses: false, pesan: err.message });
  }
});

router.post('/api/gudang/keluar', async (req, res) => {
  const tok = bacaCookie(req, 'sesi_gudang');
  if (tok) await hapusSesi(tok);
  res.setHeader('Set-Cookie', `sesi_gudang=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${atributSecure(req)}`);
  res.json({ sukses: true, pesan: 'Keluar.' });
});

router.get('/api/gudang/sesi', async (req, res) => {
  if (String(process.env.GUDANG_GATE || '').toLowerCase() === 'off') return res.json({ masuk: true });
  try {
    const tok = bacaCookie(req, 'sesi_gudang');
    const s = await ambilSesi(tok);
    if (!tok || !s || s.jenis !== 'gudang') {
      return res.status(401).json({ masuk: false });
    }
    res.json({ masuk: true });
  } catch {
    res.status(500).json({ masuk: false });
  }
});

// Ganti password: SELALU wajib sesi (tanpa bootstrap terbuka).
router.post('/api/gudang/password', wajibGudang, async (req, res) => {
  try {
    const { password, konfirmasi } = req.body || {};
    if (!password || String(password).length < 4) {
      return res.status(400).json({ sukses: false, pesan: 'Password minimal 4 karakter.' });
    }
    if (password !== konfirmasi) {
      return res.status(400).json({ sukses: false, pesan: 'Ketik ulang tidak sama.' });
    }
    const up = await sb.from('gudang').update({ password_gudang: hashKataSandi(password) }).eq('id', 1).select('id');
    if (up.error) throw new Error(up.error.message);
    if (!up.data || up.data.length === 0) {
      return res.status(400).json({ sukses: false, pesan: 'Baris password gudang (id=1) tidak ada. Buat via SQL dulu.' });
    }
    res.json({ sukses: true, pesan: 'Password gudang diganti.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ sukses: false, pesan: err.message });
  }
});

// Gudang-internal (konsisten: /api/pengiriman pun memuat token). Dipakai Kelola Link (Tab Lainnya).
router.get('/api/outlet', wajibGudang, async (req, res) => {
  try {
    const r = await sb.from('outlet').select('*').order('nama_outlet', { ascending: true });
    if (r.error) throw new Error(r.error.message);
    res.json(r.data.map(o => ({
      slug: o.slug,
      outlet: o.nama_outlet,
      token: o.token || '',
      link: `/pesan/${o.slug}-${o.token || ''}`,
      username: o.username_outlet || '',
      punyaPassword: !!o.password_outlet,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
