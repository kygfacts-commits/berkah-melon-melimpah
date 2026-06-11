-- =========================================================
-- Migration: Settings (PIN Master Pupuk)
-- Jalankan di Supabase SQL Editor. Aman dijalankan di DB yang sudah berisi data.
--
-- Menyimpan PIN Master Pupuk sebagai hash SHA-256 (bukan plaintext).
-- PIN default '1234' -> sha256('1234').
-- =========================================================

create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into settings (key, value) values
  ('master_pupuk_pin', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4')
on conflict (key) do nothing;

alter table settings enable row level security;
drop policy if exists "anon full access" on settings;
create policy "anon full access" on settings for all to anon using (true) with check (true);
