// Jadwal Slot pengiriman (PRD seksi 7): Senin & Kamis, cutoff 15:00 WIB
const SLOT_DAYS = [1, 4]; // Senin=1, Kamis=4 (getUTCDay/dayNum: Minggu=0)
const SLOT_CUTOFF_JAM = 15;
const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Pecah Date menjadi komponen kalender Asia/Jakarta (kebal TZ server)
function jakartaParts(date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).map(x => [x.type, x.value])
  );
  return {
    ymd: `${p.year}-${p.month}-${p.day}`,
    dayNum: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday],
    jam: Number(p.hour) + Number(p.minute) / 60
  };
}

// Aritmetika tanggal berjangkar tengah hari Jakarta (UTC+7 tanpa DST, tanggal aman)
function anchorDariYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)); // 12:00 UTC = 19:00 WIB, tanggal sama
}
function geserHari(ymd, n) {
  const a = anchorDariYmd(ymd);
  a.setUTCDate(a.getUTCDate() + n);
  return a.toISOString().slice(0, 10);
}
// Slot terdekat >= ymd (sesudah=true: strictly after, untuk kasus lewat cutoff)
function slotBerikutnya(ymd, sesudah = false) {
  let cur = sesudah ? geserHari(ymd, 1) : ymd;
  for (let i = 0; i < 8; i++) {
    if (SLOT_DAYS.includes(anchorDariYmd(cur).getUTCDay())) return cur;
    cur = geserHari(cur, 1);
  }
  throw new Error('slotBerikutnya: tidak ketemu slot dalam 8 hari');
}

function hitungSlot(waktuPesan = new Date()) {
  const { ymd, dayNum, jam } = jakartaParts(new Date(waktuPesan));
  const diHariSlot = SLOT_DAYS.includes(dayNum);
  const batchMasuk = (diHariSlot && jam < SLOT_CUTOFF_JAM) ? ymd : slotBerikutnya(ymd, diHariSlot);
  const rencanaKirim = slotBerikutnya(batchMasuk, true);
  return { batchMasuk, rencanaKirim, batchLabel: formatTanggalSlot(batchMasuk), kirimLabel: formatTanggalSlot(rencanaKirim) };
}

function formatTanggalSlot(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const a = anchorDariYmd(ymd);
  return `${NAMA_HARI[a.getUTCDay()]}, ${d} ${NAMA_BULAN[m - 1]} ${y}`;
}

function formatWaktuBukti(date = new Date()) {
  return new Date(date).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

// Kolom tanggal_kirim/tanggal_terima hanya string panjang formatWaktuBukti (tidak bisa
// difilter SQL) -> ambil kunci bulan 'YYYY-MM' untuk agregasi. null = belum terkirim / bukan tanggal.
function bulanDariWaktuBukti(str) {
  const m = String(str || '').match(/(\d{1,2}) ([A-Za-z]+) (\d{4})/);
  if (!m) return null;
  const bulan = NAMA_BULAN.findIndex(n => n.toLowerCase() === m[2].toLowerCase());
  if (bulan < 0) return null;
  return `${m[3]}-${String(bulan + 1).padStart(2, '0')}`;
}

// Versi 'DD/MM/YYYY' dari string formatWaktuBukti (sumber sama, buat kolom Tgl Kirim).
function tglSingkatDariWaktuBukti(str) {
  const m = String(str || '').match(/(\d{1,2}) ([A-Za-z]+) (\d{4})/);
  if (!m) return null;
  const bulan = NAMA_BULAN.findIndex(n => n.toLowerCase() === m[2].toLowerCase());
  if (bulan < 0) return null;
  return `${String(m[1]).padStart(2, '0')}/${String(bulan + 1).padStart(2, '0')}/${m[3]}`;
}

// Gate loket pesan: Senin–Sabtu di bawah jam cutoff; Minggu libur total.
function pesanDibuka(waktu = new Date()) {
  const { dayNum, jam } = jakartaParts(new Date(waktu));
  if (dayNum === 0) return false; // Minggu libur
  return jam < SLOT_CUTOFF_JAM;
}
const PESAN_TUTUP = 'Hanya menerima pesanan di bawah jam 15.00 WIB.';
const PESAN_TUTUP_MINGGU = 'Hari Minggu libur — loket buka Senin–Sabtu di bawah jam 15.00 WIB.';

module.exports = {
  SLOT_DAYS, SLOT_CUTOFF_JAM, NAMA_HARI, NAMA_BULAN,
  jakartaParts, anchorDariYmd, geserHari, slotBerikutnya,
  hitungSlot, formatTanggalSlot, formatWaktuBukti, bulanDariWaktuBukti, tglSingkatDariWaktuBukti,
  pesanDibuka, PESAN_TUTUP, PESAN_TUTUP_MINGGU,
};
