// Auth guard untuk halaman terproteksi (semua halaman kecuali login.html
// & reset-password.html). Import modul ini PALING AWAL di setiap halaman
// (sebelum modul lain) agar redirect terjadi secepat mungkin.
//
// - Belum login -> redirect ke login.html.
// - Sudah login -> hapus class "auth-checking" dari <body> (lihat
//   assets/css/style.css) supaya konten ditampilkan.
// - Logout dari halaman lain / session berakhir -> redirect ke login.html.
// - Tombol [data-logout] di header dihubungkan ke supabase.auth.signOut().

import { supabase } from './supabase.js';

async function requireAuth() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    window.location.href = 'login.html';
    return;
  }
  document.body.classList.remove('auth-checking');
}

function initLogout() {
  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.href = 'login.html';
    });
  });
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    window.location.href = 'login.html';
  }
});

requireAuth();
initLogout();
