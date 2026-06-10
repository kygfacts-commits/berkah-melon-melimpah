// Konfigurasi koneksi Supabase + helper bersama untuk seluruh modul.
// "publishable key" aman dipakai di sisi client karena akses data
// dikontrol lewat Row Level Security (lihat supabase/schema.sql).
const SUPABASE_URL = 'https://dbqgcvvfoloxpjmspzmq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-j2XUHfmhAC7skAvLW3DMw_wQ6khv7T';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export function formatRupiah(value) {
  return 'Rp ' + Math.round(Number(value) || 0).toLocaleString('id-ID');
}

export function formatKg(value) {
  return Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kg';
}

export function formatTanggal(value) {
  if (!value) return '-';
  return new Date(value + 'T00:00:00').toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

let toastTimer;
export function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg text-sm text-white z-50 ${
    isError ? 'bg-rose-600' : 'bg-emerald-600'
  }`;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}
