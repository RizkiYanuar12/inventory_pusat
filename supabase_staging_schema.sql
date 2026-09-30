-- Skema STAGING untuk debug localhost (DB latihan, prod aman).
-- Jalankan 1x di SQL Editor project Supabase BARU (staging), lalu isi .env.staging.
-- Disusun dari kode backend (backend/routes/*.js + backend/lib/data.js + db.js).
-- Kolom bertanda [ASUMSI] = tipe tak terbukti dari kode, dipilih yang kompatibel.
-- Alternatif exact: `supabase db dump --schema public` dari project prod (perlu CLI + DB password).

-- ============ MASTER ============
create table if not exists barang_inventory (
  id_barang text primary key,              -- MNL-0001... (app generate)
  nama_barang text not null,
  merk text not null default '',           -- = varian di API
  kategori text not null default '',       -- uppercase (BASAH/KERING/...)
  satuan text not null default 'pcs',      -- eceran kanonik huruf-kecil
  satuan_gudang text not null default '',
  isi_per_gudang numeric null,             -- NULL = terkunci-SO
  total numeric not null default 0,        -- satu-satunya sumber stock
  harga_barang numeric null,               -- moving-average; NULL = belum ada harga
  keterangan text not null default '',
  minimum_stock numeric not null default 5,
  dibuat_pada timestamptz null
);
-- Uji U28 menyebut unique index nama (case-insensitive); app juga menolak via ilike.
create unique index if not exists ux_barang_nama_lower on barang_inventory (lower(nama_barang));

create table if not exists vendor (
  id bigint generated always as identity primary key,
  nama_vendor text not null,
  nomor text not null default '',
  alamat text not null default '',
  created_at timestamptz not null default now()
);

-- ============ TRANSAKSI ============
create table if not exists transaksi (
  id_transaksi bigint generated always as identity primary key,
  id_barang text not null references barang_inventory (id_barang) on delete restrict,
  nama_barang text null,                   -- snapshot
  varian text not null default '',         -- snapshot merk
  kategori_bahan text not null default '', -- snapshot kategori
  jenis text not null,                     -- Masuk / Keluar
  jumlah bigint not null,                  -- bilangan bulat saja (desimal ditolak 22P02)
  satuan text not null default 'pcs',
  harga_satuan numeric null,               -- jejak nilai; NULL = lama/belum berhHarga
  id_kirim text null,                      -- chip KRM-... (hanya dari buatPengiriman)
  keterangan text null,                    -- "Vendor: X" / "Opname #SOP-..."
  id_vendor bigint null references vendor (id) on delete set null,
  dibuat_pada timestamptz null
);
create index if not exists ix_transaksi_barang on transaksi (id_barang);
create index if not exists ix_transaksi_vendor on transaksi (id_vendor);

-- ============ OUTLET + GUDANG + SESI ============
create table if not exists outlet (
  slug text primary key,
  token text unique not null,              -- token8 permanen di link /pesan/<slug>-<token>
  nama_outlet text null,
  username_outlet text unique null,        -- pre-set gudang 1x, lalu terkunci
  password_outlet text null                -- scrypt; NULL = klaim-pertama via link
);

create table if not exists gudang (
  id int primary key,                      -- selalu 1 (app hanya UPDATE id=1)
  password_gudang text null,               -- scrypt$salt$hash
  created_at timestamptz null
);

create table if not exists sesi (
  token text primary key,                  -- opaque acak
  jenis text not null,                     -- 'gudang' | 'outlet'
  token_outlet text null,
  exp timestamptz null                     -- 24 jam
);

-- ============ PESANAN + PENGIRIMAN ============
create table if not exists pesanan (
  id_pesan text primary key,               -- PSN-YYYYMMDD-NNN
  token_outlet text null,
  outlet text null,
  tanggal_pemesanan text null,             -- "Hari, DD Bulan YYYY pukul HH.MM WIB"
  tanggal_pengiriman text null,            -- rencana kirim (slot)
  status text not null default 'BARU',
  items_json jsonb null,                   -- sumber mesin (app JSON.parse)
  ringkasan text not null default '',      -- terjemahan manusiawi
  riwayat_status text not null default '',
  dibuat_pada timestamptz null
);
create index if not exists ix_pesanan_token on pesanan (token_outlet);

create table if not exists pengiriman (
  id_kirim text primary key,               -- KRM-YYYYMMDD-NNN
  token text not null default '',          -- kolom legacy, selalu kosong
  id_pesan text null,
  tanggal_buat text null,
  tanggal_kirim text not null default '',
  outlet text null,
  status text not null default 'SIAP KIRIM', -- SIAP KIRIM/DIKIRIM/DITERIMA/DITERIMA SEBAGIAN
  items_json jsonb null,
  ringkasan text not null default '',
  alasan text not null default '',         -- per-item, di dalam ringkasan/items
  nama_penerima text not null default '',
  tanggal_terima text not null default '',
  riwayat_status text not null default '',
  foto_kirim text null,
  foto_terima text null,
  dibuat_pada timestamptz null
);

-- ============ LONCENG ============
create table if not exists notifikasi (
  id bigint generated always as identity primary key,
  untuk text null,                         -- 'gudang'
  judul text null,
  isi text null,
  ref text null,                           -- id pesan/kirim terkait
  dibaca boolean not null default false,
  dibuat_pada timestamptz not null default now()
);

-- ============ OPNAME PUSAT ============
create table if not exists opname_sesi (
  id_sesi text primary key,                -- SOP-YYYYMMDD-NNN (termasuk sampling mini)
  status text not null,                    -- HITUNG/REVIEW/SELESAI/BATAL
  dibuat_pada timestamptz null,
  ditutup_pada timestamptz null
);

create table if not exists opname_item (
  id bigint generated always as identity primary key, -- [ASUMSI] (prod: kolom id ada)
  id_sesi text not null references opname_sesi (id_sesi) on delete cascade,
  id_barang text not null,
  sistem_qty numeric null,                 -- snapshot total saat mulai
  sistem_harga numeric null,               -- snapshot harga saat mulai
  fisik_qty numeric null                   -- hitungan tangan; NULL = belum dihitung
);
create index if not exists ix_opname_item_sesi on opname_item (id_sesi);

-- ============ HARDENING (cermin prod A1) ============
-- RLS on tanpa policy: anon DENY, app pakai service_role (bypass RLS).
alter table barang_inventory enable row level security;
alter table transaksi enable row level security;
alter table outlet enable row level security;
alter table gudang enable row level security;
alter table sesi enable row level security;
alter table pesanan enable row level security;
alter table pengiriman enable row level security;
alter table notifikasi enable row level security;
alter table opname_sesi enable row level security;
alter table opname_item enable row level security;
alter table vendor enable row level security;

-- ============ STORAGE bukti-kirim (foto paket dua arah) ============
insert into storage.buckets (id, name, public)
values ('bukti-kirim', 'bukti-kirim', true)
on conflict (id) do update set public = true;

drop policy if exists "bukti baca publik" on storage.objects;
create policy "bukti baca publik" on storage.objects
  for select using (bucket_id = 'bukti-kirim');

drop policy if exists "bukti anon upload" on storage.objects;
create policy "bukti anon upload" on storage.objects
  for insert with check (bucket_id = 'bukti-kirim');
