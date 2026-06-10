-- =========================================================
-- Migration: Harga Jual per Kg
-- Jalankan script ini di Supabase SQL Editor (Project > SQL Editor)
-- Aman dijalankan di database yang sudah berisi data.
-- =========================================================

alter table greenhouses
  add column if not exists harga_jual_per_kg numeric(14,2) not null default 0;
