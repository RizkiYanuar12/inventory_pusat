# SS_Inventaris: Pesan → Kirim → Terima

1 aplikasi web: outlet pesan via link permanen, gudang proses + kirim, outlet konfirmasi terima. Tanpa WA/manual spreadsheet.

## 1. Latar

- Outlet pesan via WA + spreadsheet manual → lambat, human error, tidak terlacak.
- Gudang kirim tanpa bukti terima terstruktur.
- Tujuan: 1 aplikasi web, link unik per outlet, dengan login (gudang 1 kredensial bersama + outlet username+password per link).

## 2. User & 1 Link

- Admin Gudang: kelola stock, lihat pesanan, approve/tolak per item, tandai dikirim / batalkan pengiriman, monitoring terima.
- Outlet: pesan barang + konfirmasi terima via link permanen `/pesan/<slug>-<token8>` (wajib login password — link saja tidak cukup; tutup tab = sesi hilang, login ulang).
- Detail peran: `GUDANG.MD` (gudang), `OUTLET.MD` (outlet). Detail teknis: `PRD.MD`.

## 3. Alur

- Pesan: outlet buka link → Tab `Pesan Baru` (keranjang tanpa angka stock) → submit → `BARU` + info batch masuk & rencana kirim otomatis → pindah ke Tab `Riwayat`.
- Loket + gabung: loket buka tiap hari di bawah jam 15:00 WIB (di atasnya kunci total: `Hanya menerima pesanan di bawah jam 15.00 WIB`). Pesan sehati-Jakarta menempel ke order `BARU` hari itu juga (ID sama, `digabung: true`); beda hari / sudah diputus → ID baru.
- Batal oleh outlet: outlet TIDAK punya tombol batal; mau batal hubungi gudang via WA/telpon → gudang Tolak semua item → `DITOLAK` (terminal, boleh pesan ulang).
- Kirim: gudang approve per item (Penuhi / Tolak + keterangan; parsial `qtyKirim` + keterangan wajib) → `DISETUJUI` / `DISETUJUI SEBAGIAN` → record pengiriman TERBENTUK OTOMATIS + stock kurang 1x (tanpa tombol buat-manual) → `SIAP KIRIM` → manual `Tandai Dikirim` → `DIKIRIM` (surat muncul di Tab Surat Jalan outlet).
- Batal kirim: hanya sebelum outlet lapor (alasan wajib) → kembali ke status semula; setelah `DITERIMA`/`DITERIMA SEBAGIAN` → kunci mati.
- Terima: outlet Tab `Surat Jalan` → ceklis per baris sesuai + jumlah terima + keterangan bila beda + nama penerima → 1 tombol `Kirim Laporan Terima` → `DITERIMA` / `DITERIMA SEBAGIAN` (otomatis, lalu terkunci). Gudang read-only.

## 4. Jadwal Slot

- Slot: Senin & Kamis, cutoff 15:00 WIB (Asia/Jakarta). `batchMasuk` = slot terdekat, `rencanaKirim` = slot sesudahnya.
- Contoh: Senin 10:00 → masuk Senin → kirim Kamis; Senin 16:00 / Selasa / Rabu → masuk Kamis → kirim Senin depan; Kamis 10:00 → masuk Kamis → kirim Senin depan; Kamis 16:00 / Jumat–Minggu → masuk Senin → kirim Kamis.

## 5. Login & Akun

- Outlet: buka link → form username+password (username pre-set gudang 1x, terkunci). Password pertama dibuat sendiri saat pertama buka link (ketik 2x, min 4, sekali saja); sesi cookie HttpOnly 24 jam.
- Lupa password → hubungi gudang via WA/telepon — reset via Tab Lainnya (Kelola Akun). Tanpa reset mandiri.
- Gudang: 1 akun bersama, login sekali → semua tab terbuka 24 jam. Ganti password via Tab Lainnya.

## 6. Panduan Peran

- Outlet: lihat `OUTLET.MD` (buka link, 3 tab, loket, terima, foto).
- Gudang: lihat `GUDANG.MD` (hub `/pesanan` Daftar/Lacak/Lainnya, putus per item, verifikasi kirim, lonceng, cetak surat jalan).
- Skema data + API + acceptance: lihat `PRD.MD` §5, §6, §11.

## 7. Non-fungsional + Cara Test

- Browser modern, Android 9+ / iOS 14+, RAM 4GB. Input full manual (scan/kamera dicabut).
- Ngrok hanya untuk test; prod perlu URL permanen.

### Cara Test di HP via Ngrok (tanpa build)

1. Terminal 1: `node server.js` (backend port 3000, sumber `/api`).
2. Terminal 2: `cd frontend; npm run dev -- --host --port 5173` (frontend live HMR).
3. Terminal 3: `ngrok http 5173` → buka URL HTTPS di HP (Incognito).
4. Jika error `blocked request ... not allowed`: tambah `host: true` + `allowedHosts: ['<url-ngrok>', '.ngrok-free.dev']` di `frontend/vite.config.js`, lalu restart dev server.
- Catatan: tiap edit `frontend/src/` langsung tampil di HP tanpa `npm run build`. `build` hanya wajib untuk `ngrok http 3000` (serve `frontend/dist` via Express).