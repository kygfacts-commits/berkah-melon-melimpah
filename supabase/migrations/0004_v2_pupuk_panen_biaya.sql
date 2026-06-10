-- =========================================================
-- Migration V2: Master Pupuk, Log Pupuk, Event Panen, Biaya Jenis
-- Jalankan script ini di Supabase SQL Editor (Project > SQL Editor)
-- Aman dijalankan di database yang sudah berisi data.
-- =========================================================

-- ---------------------------------------------------------------
-- 1. MASTER PUPUK
-- Daftar harga pupuk (admin). Perubahan harga di sini TIDAK
-- mempengaruhi data log_pupuk_detail yang sudah tersimpan
-- (snapshot harga disimpan langsung di log_pupuk_detail).
-- ---------------------------------------------------------------
create table if not exists master_pupuk (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  urutan int not null default 0,
  satuan text not null default 'grm' check (satuan in ('sdk', 'ttp', 'ml', 'grm')),
  satuan_dasar text not null default 'gram' check (satuan_dasar in ('gram', 'ml')),
  konversi_ke_satuan_dasar numeric(14,4) not null default 1,
  ukuran_kemasan numeric(14,4) not null default 0,
  harga_per_kemasan numeric(14,2) not null default 0,
  harga_per_satuan_dasar numeric(14,4) generated always as (
    case when ukuran_kemasan > 0 then harga_per_kemasan / ukuran_kemasan else 0 end
  ) stored,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed 17 jenis pupuk default (idempotent: hanya insert jika nama belum ada)
insert into master_pupuk (nama, urutan)
select v.nama, v.urutan from (values
  ('KNO Merah', 1), ('Ultradap', 2), ('Yaramila', 3), ('Magnes', 4), ('MKP', 5),
  ('KNO Putih', 6), ('Calcium', 7), ('Mordern', 8), ('Vitaron', 9), ('Demolis', 10),
  ('Antila', 11), ('Bendas', 12), ('Starban', 13), ('Javagros', 14), ('Kalingga', 15),
  ('Premix', 16), ('Antracol', 17)
) as v(nama, urutan)
where not exists (select 1 from master_pupuk mp where mp.nama = v.nama);

-- ---------------------------------------------------------------
-- 2. LOG PUPUK (per greenhouse)
-- log_pupuk = header (tanggal, HST, jenis kegiatan)
-- log_pupuk_detail = dosis per pupuk + snapshot harga saat input
-- ---------------------------------------------------------------
create table if not exists log_pupuk (
  id uuid primary key default gen_random_uuid(),
  greenhouse_id uuid not null references greenhouses(id) on delete cascade,
  tanggal date not null,
  hst int not null default 0,
  jenis_kegiatan text not null check (jenis_kegiatan in ('spray', 'pemupukan', 'injek', 'spray_injek')),
  keterangan text,
  created_at timestamptz not null default now()
);

create table if not exists log_pupuk_detail (
  id uuid primary key default gen_random_uuid(),
  log_pupuk_id uuid not null references log_pupuk(id) on delete cascade,
  master_pupuk_id uuid references master_pupuk(id) on delete set null,
  nama_pupuk text not null,
  satuan text not null,
  dosis numeric(14,4) not null default 0,
  harga_per_satuan numeric(14,4) not null default 0,
  biaya numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_log_pupuk_greenhouse on log_pupuk (greenhouse_id);
create index if not exists idx_log_pupuk_tanggal on log_pupuk (tanggal desc);
create index if not exists idx_log_pupuk_detail_log on log_pupuk_detail (log_pupuk_id);

-- ---------------------------------------------------------------
-- 3. EVENT PANEN (global, semua GH barengan)
-- event_panen = 1 tanggal + harga per grade (A/B/C/D), berlaku
-- untuk semua greenhouse.
-- panen_detail = hasil panen (kg per grade) per greenhouse untuk
-- event tersebut.
-- ---------------------------------------------------------------
create table if not exists event_panen (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  harga_grade_a numeric(14,2) not null default 0,
  harga_grade_b numeric(14,2) not null default 0,
  harga_grade_c numeric(14,2) not null default 0,
  harga_grade_d numeric(14,2) not null default 0,
  keterangan text,
  created_at timestamptz not null default now()
);

create table if not exists panen_detail (
  id uuid primary key default gen_random_uuid(),
  event_panen_id uuid not null references event_panen(id) on delete cascade,
  greenhouse_id uuid not null references greenhouses(id) on delete cascade,
  kg_grade_a numeric(10,2) not null default 0,
  kg_grade_b numeric(10,2) not null default 0,
  kg_grade_c numeric(10,2) not null default 0,
  kg_grade_d numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (event_panen_id, greenhouse_id)
);

create index if not exists idx_event_panen_tanggal on event_panen (tanggal desc);
create index if not exists idx_panen_detail_event on panen_detail (event_panen_id);
create index if not exists idx_panen_detail_greenhouse on panen_detail (greenhouse_id);

-- ---------------------------------------------------------------
-- 4. BIAYA JENIS (dropdown jenis biaya operasional, global)
-- ---------------------------------------------------------------
create table if not exists biaya_jenis (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kode text not null unique,
  created_at timestamptz not null default now()
);

insert into biaya_jenis (nama, kode) values
  ('Listrik', 'listrik'),
  ('Air', 'air'),
  ('Tenaga Kerja', 'tenaga_kerja'),
  ('Lainnya', 'lainnya')
on conflict (kode) do nothing;

-- jenis_biaya sebelumnya dibatasi 4 nilai tetap lewat CHECK constraint;
-- sekarang bebas mengikuti kode di tabel biaya_jenis.
alter table biaya_operasional drop constraint if exists biaya_operasional_jenis_biaya_check;

-- ---------------------------------------------------------------
-- 5. Row Level Security (anon full access, sama seperti tabel lain)
-- ---------------------------------------------------------------
alter table master_pupuk enable row level security;
alter table log_pupuk enable row level security;
alter table log_pupuk_detail enable row level security;
alter table event_panen enable row level security;
alter table panen_detail enable row level security;
alter table biaya_jenis enable row level security;

drop policy if exists "anon full access" on master_pupuk;
create policy "anon full access" on master_pupuk
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on log_pupuk;
create policy "anon full access" on log_pupuk
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on log_pupuk_detail;
create policy "anon full access" on log_pupuk_detail
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on event_panen;
create policy "anon full access" on event_panen
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on panen_detail;
create policy "anon full access" on panen_detail
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on biaya_jenis;
create policy "anon full access" on biaya_jenis
  for all to anon using (true) with check (true);
