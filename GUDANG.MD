# Panduan Gudang — Operasional Harian

> Untuk 2 operator gudang (1 akun bersama). Semua tulisan tombol dan pesan error di bawah disalin persis dari aplikasi.
> Panduan outlet terpisah: `OUTLET.MD`.

## 1. Masuk & keluar

- Kalau belum masuk, semua halaman mengarah ke halaman login (`/gudang-masuk`). Masuk sekali → semua tab terbuka (berlaku seharian, 24 jam).
- Tombol **Keluar** ada di homepage (dengan konfirmasi). Kalau sistem dimatikan lalu dinyalakan lagi, semua otomatis keluar — itu normal, masuk lagi.
- Ganti password gudang: Tab **Lainnya** → bagian **Password Gudang** → ketik 2× (min 4) → simpan. Password lama langsung tidak berlaku.
- Menu bawah selalu 5: **Home, Inventory, Pesanan (ada angka pesan baru), History, Input**. Lonceng notifikasi ada di bagian atas Home + hub (bunyi + angka tiap ada pesanan/laporan baru; buka kotak lonceng → Tandai dibaca).

## 2. Hub Pesanan & Kirim — Tab Daftar

Judul halaman **Pesanan & Kirim**. Pilihan tahap: **Baru / Siap Kirim / Dikirim / Diterima / Ditolak / Semua** (+ angka jumlah + pencarian). Urutan Baru/Siap/Dikirim: yang paling lama menunggu di atas; arsip: yang terbaru di atas.

### Memutus pesanan BARU (per barang)

1. Buka kartu BARU. Tiap baris ada tombol **Penuhi** / **Tolak** (awalnya Penuhi).
2. Penuhi penuh → biarkan kolom kirim kosong. Penuhi sebagian → isi kolom *"Kirim (= N), kosongkan bila penuh"* dengan jumlah yang dikirim + wajib isi *"Keterangan wajib: kenapa kurang (cth: stok tinggal 5)"*.
3. Tolak → wajib isi *"Keterangan wajib (cth: habis)"*. Tanpa keterangan → ditolak merah oleh sistem.
4. Tap **Putuskan** (satu klik untuk semua baris).
5. Hasil otomatis, **tanpa tombol tambahan**:
   - Semua dipenuhi → **DISETUJUI**; sebagian → **DISETUJUI SEBAGIAN** (sisa hangus, outlet pesan ulang manual bila masih butuh); semua ditolak → **DITOLAK** (titik akhir, tanpa pengiriman, tanpa kurang stok).
   - Bila ada yang dipenuhi, data pengiriman langsung terbentuk + **stok berkurang 1×** saat itu juga. Putus ulang → gagal dengan pesan merah (kartu BARU hanya bisa diputus sekali).

### Mengirim paket

1. Kartu SIAP KIRIM → tap **Verifikasi & Tandai** → pindah ke halaman `/input` layar verifikasi: tap kartu tiap baris + 1 foto paket (atau centang Lanjut tanpa foto). Tombol aktif setelah semua diceklis + foto.
2. Setelah paket diserahkan → tap tombol kirim hingga status **DIKIRIM**. Surat jalan langsung muncul di Tab Surat Jalan outlet.
3. Tombol lain di kartu DIKIRIM: **Batalkan**, **Lacak** (lompat ke Tab Lacak), **Print** (buka surat jalan di tab baru).

### Membatalkan pengiriman (mundur 1 langkah)

- Hanya selama outlet **belum** mengirim laporan. Tap **Batalkan** → isi alasan (wajib; kosong → *"Alasan pembatalan wajib diisi."*) → status kembali ke DISETUJUI/DISETUJUI SEBAGIAN semula, alasan tercatat di riwayat status, stok tidak diubah.
- Setelah outlet DITERIMA/DITERIMA SEBAGIAN → kunci mati, tidak bisa dibatalkan.

## 3. Tab Lacak — arsip semua kiriman

- Langsung tampil semua kiriman terbaru-di-atas (20 awal + **Muat lagi**). Filter outlet/status/pencarian (termasuk kode kiriman). Klik kartu = buka/tutup detail.
- Per barang: `Nama | Terkirim: X | Diterima: Y/-` + baris selisih (kurang/lebih + keterangan outlet) + foto **Kirim**/**Terima** bila ada + **Alasan** bila ada.
- Tombol **Print / PDF** di detail membuka halaman surat jalan.

## 4. Surat jalan cetak

- Dibuka via **Print** (kartu Daftar / detail Lacak). Judul ikut outlet: `SURAT JALAN - {OUTLET}`. Hanya terbit untuk DIKIRIM ke atas — kartu SIAP KIRIM tidak ada tombolnya (membuka alamatnya langsung → ditolak pesan merah).
- Isi: tanggal pesan/kirim, tabel barang + harga satuan (harga rata-rata × jumlah; barang tanpa harga → 0 + catatan kaki), total akhir, kolom Checklist tangan (Procurement | Driver | Outlet), Penerima + PIC Pengirim. Baris TOLAK tercetak coret (harga `-`, tidak masuk total).
- Cetak via tombol print browser (kertas A4 melebar). Kalau belum masuk → diminta login dulu.

## 5. Tab Lainnya — Kelola Akun & password

### Kelola Akun Outlet

- Tiap outlet: nama + `@username` (atau `(tanpa username)`) + tombol **Salin** (*"Link pesan disalin."*).
- **Set username (sekali saja, terkunci permanen):** bila belum ada → kolom *"Username baru (min 3, sekali saja)"* → **Set**. Setelah tersimpan: *"Username @x terkunci"* — tidak bisa diubah lagi.
- **Reset password outlet (kapan saja):** isi *"Password baru (min 4)"* + *"Ketik ulang password baru"* → **Reset password** → konfirmasi *"Reset password {nama}? Sampaikan password baru ke outlet."* Kosong → *"Isi password baru 2x dulu."*
- SOP lupa password: outlet menghubungi via WA/telepon → reset di sini → sampaikan password baru ke outlet.
- Alamat link tidak pernah berubah — tidak ada tombol reset link.

## 6. Input, opname, vendor — ringkas

- **Input (`/input`):** cari nama → ketemu = form Masuk/Keluar; tidak ketemu = form barang baru (tanpa kolom kode, kode terisi otomatis mis. `MNL-0042`). **Eceran-saja:** ketik jumlah dalam satuan eceran, tanpa pilihan satuan; satuan selain eceran ditolak *"Kirim dalam {eceran} (sistem eceran-saja)"*. Masuk wajib Total Bayar (untuk menghitung harga rata-rata). Nama sama beda kapital → pesan merah *"Nama mirip sudah ada: … (MNL-…). Pakai yang ada atau ubah nama."*
- **Edit/hapus kartu Inventory:** Edit (nama duplikat → pesan merah + menyebut kode barangnya; satuan wajib ketik-ulang persis); Hapus → kotak konfirmasi (Nama/Varian/Kategori/Jumlah); dipakai pesanan/pengiriman → ditolak dengan pesan merah, tidak bisa dihapus.
- **Opname:** Mulai (gagal dengan pesan merah bila ada opname lain yang masih terbuka) → isi fisik per barang → Review (4 kolom + selisih warna; kembali untuk betulkan) → Putus (stok berubah sebesar selisih, jejak `Opname #SOP-…` di History) / Batal (tanpa mengubah apa pun).
- **Vendor (homepage):** tambah (nama wajib; mirip → pesan merah) → edit di tempat → hapus (konfirmasi). Pilihan vendor di form Masuk tersimpan sebagai jejak (tanda hijau di History).
- **History:** filter/pencarian (termasuk kode kiriman lewat tandanya), grafik, tabel Explorer, kartu Total Aset + unduh file CSV — bisa dibuka di Excel — (hari ini/per tanggal).

## 7. Kamus status & kunci

`BARU → DISETUJUI / DISETUJUI SEBAGIAN / DITOLAK (titik akhir) → SIAP KIRIM → DIKIRIM → DITERIMA / DITERIMA SEBAGIAN (titik akhir)`.
DITERIMA SEBAGIAN ditentukan aplikasi otomatis (jumlah kirim-vs-terima beda), bukan pilihan manual. Gudang hanya bisa melihat laporan terima, tidak bisa mengubah (tidak ada tombol konfirmasi terima). Memuat ulang/menekan tombol dua kali tidak membuat stok berkurang dua kali.

## 8. Masalah umum

- Tiba-tiba ke halaman login → waktu masuk habis / sistem dimatikan lalu dinyalakan. Masuk lagi.
- Outlet lapor "tidak bisa pesan" → cek jam (≥15.00 tutup), cek username sudah di-set + password sudah dibuat.
- Tombol Print hilang → kartu masih SIAP KIRIM (belum DIKIRIM).
- Putus ulang merah → kartu sudah tidak BARU (sudah diputus).
- Lonceng diam → cek tombol bisu per HP; bunyi hanya saat jumlah bertambah + butuh satu sentuhan dulu dengan halaman.

## 9. Keamanan akun bersama

Akun gudang dipakai berdua — anggap kata sandinya seperti kunci brankas:

- Pakai kata sandi yang panjang dan tidak bisa ditebak, contoh 4 kata acak seperti `kardus-hijau-lari-pagi`. Jangan pakai nama toko, tanggal, atau kata seperti `gudang123` — orang yang kenal toko kita bisa menebaknya.
- Jangan kirim alamat aplikasi dan kata sandi dalam 1 pesan yang sama. Sampaikan kata sandinya lewat cara lain (ditelepon atau langsung).
- Tiap ada orang gudang yang keluar/ganti: segera ganti kata sandi lewat Tab Lainnya → Password Gudang → ketik 2× → simpan. Kata sandi lama langsung tidak berlaku, jadi orang yang keluar tidak bisa masuk lagi.
- Kunci HP/komputer; tekan Keluar kalau selesai memakai perangkat bersama. Sekali masuk, aplikasi tetap terbuka seharian penuh sampai kamu keluar sendiri.
- Tidak ada jalan pintas tanpa login di aplikasi ini — semua halaman gudang selalu minta kata sandi, tanpa pengecualian.
- Kalau orang outlet iseng membuka link gudang, mereka hanya sampai di halaman login dan mentok di situ. Satu-satunya jalan masuk adalah kata sandi ini — jangan sampai ke tangan outlet.
