import { supabase } from './supabase.js';

const form = document.getElementById('form-reset');
const errorEl = document.getElementById('reset-error');
const successEl = document.getElementById('reset-success');
const submitBtn = document.getElementById('reset-submit');

// Link reset password dari email membuat session recovery otomatis
// (Supabase JS membaca token dari URL - detectSessionInUrl aktif secara default).
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  errorEl.textContent = 'Link reset password tidak valid atau sudah kedaluwarsa. Silakan minta link baru dari halaman login.';
  errorEl.classList.remove('hidden');
  form.classList.add('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.classList.add('hidden');

  const password = form.password.value;
  const passwordConfirm = form.password_confirm.value;

  if (password.length < 6) {
    errorEl.textContent = 'Password minimal 6 karakter.';
    errorEl.classList.remove('hidden');
    return;
  }
  if (password !== passwordConfirm) {
    errorEl.textContent = 'Konfirmasi password tidak cocok.';
    errorEl.classList.remove('hidden');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Menyimpan...';

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    errorEl.textContent = 'Gagal menyimpan password: ' + error.message;
    errorEl.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Simpan Password Baru';
    return;
  }

  await supabase.auth.signOut();
  form.classList.add('hidden');
  successEl.classList.remove('hidden');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 2500);
});
