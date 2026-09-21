// Auth gudang: scrypt + cookie manual + sesi opaque + rate-limit.
// Tanpa dep baru: scrypt via crypto bawaan. Hoist dari server.js lama (dulu di bawah, dipakai di atas).
const crypto = require('crypto');
const { sb } = require('../../db');

// Hash format `scrypt$salt$hash` (pola sama untuk password outlet menyusul).
function hashKataSandi(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(plain || ''), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
function cekKataSandi(plain, tersimpan) {
  try {
    const [tag, salt, hash] = String(tersimpan || '').split('$');
    if (tag !== 'scrypt' || !salt || !hash) return false;
    const cek = crypto.scryptSync(String(plain || ''), salt, 64).toString('hex');
    const a = Buffer.from(cek, 'hex'), b = Buffer.from(hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

// Rate-limit geser 10/mnt per kunci (login gudang; login outlet menyusul pola sama).
const emberRate = new Map(); // kunci -> [ms, ...]
function kenaRate(kunci, batas = 10, jendelaMs = 60000) {
  const kini = Date.now();
  const list = (emberRate.get(kunci) || []).filter(t => kini - t < jendelaMs);
  if (list.length >= batas) { emberRate.set(kunci, list); return true; }
  list.push(kini);
  emberRate.set(kunci, list);
  return false;
}

function bacaCookie(req, nama) {
  const h = req.headers.cookie || '';
  for (const pot of h.split(';')) {
    const i = pot.indexOf('=');
    if (i < 0) continue;
    if (pot.slice(0, i).trim() === nama) return decodeURIComponent(pot.slice(i + 1).trim());
  }
  return '';
}

// Sesi persisten di Supabase (tabel `sesi`): aman multi-instance + cold start (Vercel serverless).
// Baris: { token, jenis: 'gudang'|'outlet', token_outlet, exp }. Pengganti Map in-memory.
async function simpanSesi(tok, { jenis, tokenOutlet = null, expMs }) {
  const r = await sb.from('sesi').upsert({
    token: tok,
    jenis,
    token_outlet: tokenOutlet,
    exp: new Date(expMs).toISOString(),
  });
  if (r.error) throw new Error(r.error.message);
}
async function ambilSesi(tok) {
  if (!tok) return null;
  const r = await sb.from('sesi').select('*').eq('token', tok).maybeSingle();
  if (r.error) throw new Error(r.error.message);
  const s = r.data;
  if (!s) return null;
  if (!s.exp || new Date(s.exp).getTime() < Date.now()) {
    await hapusSesi(tok); // sapu oportunistik (pengganti interval prune di serverless)
    return null;
  }
  return s;
}
async function hapusSesi(tok) {
  if (!tok) return;
  const r = await sb.from('sesi').delete().eq('token', tok);
  if (r.error) throw new Error(r.error.message);
}

const UMUR_SESI_GUDANG_MS = 24 * 3600 * 1000;
async function wajibGudang(req, res, next) {
  if (String(process.env.GUDANG_GATE || '').toLowerCase() === 'off') return next(); // kill-switch uji
  try {
    const tok = bacaCookie(req, 'sesi_gudang');
    const s = await ambilSesi(tok);
    if (!tok || !s || s.jenis !== 'gudang') {
      return res.status(401).json({ error: 'Login gudang dulu.' });
    }
    next();
  } catch {
    res.status(500).json({ error: 'Sesi tak terbaca.' });
  }
}

// Sesi outlet terikat 1 link (banyak link hidup berdampingan, login B tak menendang A).
// Tutup tab = login ulang via flag sessionStorage di frontend (cookie HttpOnly 24 jam ditimpa saat masuk ulang).
const UMUR_SESI_OUTLET_MS = 24 * 3600 * 1000;
function namaCookieOutlet(token) {
  const t = String(token || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 32) || 'x';
  return `sesi_outlet_${t}`;
}
async function wajibOutlet(req, res, next) {
  try {
    const tok = bacaCookie(req, namaCookieOutlet(req.params.token));
    const s = await ambilSesi(tok);
    // Mismatch/kedaluwarsa = 401 saja TANPA menghapus (sesi itu mungkin masih sah untuk link asalnya di tab sebelah).
    if (!tok || !s || s.jenis !== 'outlet' || s.token_outlet !== String(req.params.token || '').trim()) {
      return res.status(401).json({ error: 'Login outlet dulu.' });
    }
    next();
  } catch {
    res.status(500).json({ error: 'Sesi tak terbaca.' });
  }
}

// HTTPS di belakang proxy (ngrok/hosting): percayai X-Forwarded-Proto (lihat `trust proxy` di server.js).
function apakahHttps(req) {
  if (!req) return false;
  if (req.secure) return true;
  const proto = req.headers && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return proto === 'https';
}
// Flag `; Secure` hanya saat HTTPS (HTTP localhost/dev tetap bisa login).
function atributSecure(req) {
  return apakahHttps(req) ? '; Secure' : '';
}

// Sapu entri kedaluwarsa tiap jam (sesi 24 jam + rate 1 mnt); tanpa ubah perilaku.
// Sesi disapu via DB (jalan di proses persistent; di serverless tak dipanggil + sapu oportunistik di ambilSesi).
function mulaiPruneSesi() {
  const sapu = async () => {
    try {
      const kini = Date.now();
      await sb.from('sesi').delete().lt('exp', new Date(kini).toISOString());
      for (const [kunci, list] of emberRate) {
        const sisa = (list || []).filter(t => kini - t < 60000);
        if (sisa.length) emberRate.set(kunci, sisa);
        else emberRate.delete(kunci);
      }
    } catch (e) { console.warn('prune sesi gagal:', e.message); }
  };
  const timer = setInterval(sapu, 3600 * 1000);
  if (timer.unref) timer.unref();
}

module.exports = {
  hashKataSandi, cekKataSandi, kenaRate, bacaCookie,
  simpanSesi, ambilSesi, hapusSesi, UMUR_SESI_GUDANG_MS, wajibGudang,
  UMUR_SESI_OUTLET_MS, namaCookieOutlet, wajibOutlet,
  apakahHttps, atributSecure, mulaiPruneSesi,
};
