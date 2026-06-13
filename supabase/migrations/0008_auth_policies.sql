-- =========================================================
-- Migration: Wajibkan Supabase Auth (login) untuk akses data
-- Jalankan di Supabase SQL Editor. Aman dijalankan di DB yang sudah berisi data.
--
-- PENTING: sebelum menjalankan migrasi ini, buat minimal satu user
-- di Authentication > Users (Supabase Dashboard) - aktifkan
-- "Auto Confirm User" agar bisa langsung login. Setelah migrasi ini
-- berjalan, key anon TIDAK BISA lagi membaca/menulis tabel di bawah;
-- aplikasi wajib login dulu (lihat login.html & assets/js/auth.js).
-- =========================================================

-- greenhouses
drop policy if exists "anon full access" on greenhouses;
create policy "authenticated full access" on greenhouses
  for all to authenticated using (true) with check (true);

-- log_harian
drop policy if exists "anon full access" on log_harian;
create policy "authenticated full access" on log_harian
  for all to authenticated using (true) with check (true);

-- biaya_operasional
drop policy if exists "anon full access" on biaya_operasional;
create policy "authenticated full access" on biaya_operasional
  for all to authenticated using (true) with check (true);

-- panen
drop policy if exists "anon full access" on panen;
create policy "authenticated full access" on panen
  for all to authenticated using (true) with check (true);

-- master_pupuk
drop policy if exists "anon full access" on master_pupuk;
create policy "authenticated full access" on master_pupuk
  for all to authenticated using (true) with check (true);

-- log_pupuk
drop policy if exists "anon full access" on log_pupuk;
create policy "authenticated full access" on log_pupuk
  for all to authenticated using (true) with check (true);

-- log_pupuk_detail
drop policy if exists "anon full access" on log_pupuk_detail;
create policy "authenticated full access" on log_pupuk_detail
  for all to authenticated using (true) with check (true);

-- event_panen
drop policy if exists "anon full access" on event_panen;
create policy "authenticated full access" on event_panen
  for all to authenticated using (true) with check (true);

-- panen_detail
drop policy if exists "anon full access" on panen_detail;
create policy "authenticated full access" on panen_detail
  for all to authenticated using (true) with check (true);

-- biaya_jenis
drop policy if exists "anon full access" on biaya_jenis;
create policy "authenticated full access" on biaya_jenis
  for all to authenticated using (true) with check (true);

-- jenis_kegiatan_pupuk
drop policy if exists "anon full access" on jenis_kegiatan_pupuk;
create policy "authenticated full access" on jenis_kegiatan_pupuk
  for all to authenticated using (true) with check (true);

-- settings (PIN Master Pupuk)
drop policy if exists "anon full access" on settings;
create policy "authenticated full access" on settings
  for all to authenticated using (true) with check (true);
