-- =========================================================
-- Skema database: Aplikasi Pencatatan Budidaya Melon
-- Jalankan script ini di Supabase SQL Editor (Project > SQL Editor)
-- =========================================================

create extension if not exists "pgcrypto";

-- 1. Log Harian: catatan kegiatan harian + biaya yang menyertainya
create table if not exists log_harian (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  uraian_kegiatan text not null,
  nominal_biaya numeric(14,2) not null default 0,
  keterangan text,
  created_at timestamptz not null default now()
);

-- 2. Biaya Operasional: listrik, air, tenaga kerja, lainnya
create table if not exists biaya_operasional (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  jenis_biaya text not null check (jenis_biaya in ('listrik', 'air', 'tenaga_kerja', 'lainnya')),
  nominal numeric(14,2) not null default 0,
  keterangan text,
  created_at timestamptz not null default now()
);

-- 3. Panen: tanggal panen dan jumlah hasil (kg)
create table if not exists panen (
  id uuid primary key default gen_random_uuid(),
  tanggal_panen date not null,
  jumlah_kg numeric(10,2) not null default 0,
  keterangan text,
  created_at timestamptz not null default now()
);

-- Index untuk mempercepat pengurutan berdasarkan tanggal
create index if not exists idx_log_harian_tanggal on log_harian (tanggal desc);
create index if not exists idx_biaya_operasional_tanggal on biaya_operasional (tanggal desc);
create index if not exists idx_panen_tanggal on panen (tanggal_panen desc);

-- =========================================================
-- Row Level Security (RLS)
-- Aplikasi mengakses Supabase memakai publishable (anon) key
-- tanpa login, sehingga policy berikut membuka akses penuh
-- (baca, tambah, ubah, hapus) untuk role anon.
--
-- Jika nanti aplikasi menambahkan login pengguna, ganti
-- policy ini agar dibatasi per user (mis. dengan kolom
-- user_id dan auth.uid()).
-- =========================================================

alter table log_harian enable row level security;
alter table biaya_operasional enable row level security;
alter table panen enable row level security;

create policy "anon full access" on log_harian
  for all to anon using (true) with check (true);

create policy "anon full access" on biaya_operasional
  for all to anon using (true) with check (true);

create policy "anon full access" on panen
  for all to anon using (true) with check (true);
