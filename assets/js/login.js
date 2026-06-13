import { supabase } from './supabase.js';

// Sudah login -> langsung ke halaman utama, tidak perlu lihat form login lagi.
const { data: { session: existingSession } } = await supabase.auth.getSession();
if (existingSession) {
  window.location.href = 'index.html';
}

// ---------------------------------------------------------------
// Login
// ---------------------------------------------------------------
const formLogin = document.getElementById('form-login');
const loginError = document.getElementById('login-error');
const loginSubmit = document.getElementById('login-submit');

const togglePasswordBtn = document.getElementById('toggle-password');
togglePasswordBtn.addEventListener('click', () => {
  const passwordInput = formLogin.password;
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  togglePasswordBtn.textContent = showing ? '👁️' : '🙈';
  togglePasswordBtn.setAttribute('aria-label', showing ? 'Tampilkan password' : 'Sembunyikan password');
});

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  loginSubmit.disabled = true;
  loginSubmit.textContent = 'Memproses...';

  const { error } = await supabase.auth.signInWithPassword({
    email: formLogin.email.value.trim(),
    password: formLogin.password.value,
  });

  if (error) {
    loginError.textContent = 'Email atau password salah.';
    loginError.classList.remove('hidden');
    loginSubmit.disabled = false;
    loginSubmit.textContent = 'Masuk';
    return;
  }

  window.location.href = 'index.html';
});

// ---------------------------------------------------------------
// Lupa Password
// ---------------------------------------------------------------
const loginPanel = document.getElementById('login-panel');
const forgotPanel = document.getElementById('forgot-panel');
const forgotToggle = document.getElementById('forgot-toggle');
const backToLogin = document.getElementById('back-to-login');
const formForgot = document.getElementById('form-forgot');
const forgotMessage = document.getElementById('forgot-message');
const forgotSubmit = document.getElementById('forgot-submit');

forgotToggle.addEventListener('click', () => {
  loginPanel.classList.add('hidden');
  forgotPanel.classList.remove('hidden');
});

backToLogin.addEventListener('click', () => {
  forgotPanel.classList.add('hidden');
  loginPanel.classList.remove('hidden');
  forgotMessage.classList.add('hidden');
  formForgot.reset();
});

formForgot.addEventListener('submit', async (e) => {
  e.preventDefault();
  forgotSubmit.disabled = true;
  forgotSubmit.textContent = 'Mengirim...';

  const redirectTo = new URL('reset-password.html', window.location.href).href;
  await supabase.auth.resetPasswordForEmail(formForgot.email.value.trim(), { redirectTo });

  forgotSubmit.disabled = false;
  forgotSubmit.textContent = 'Kirim Link Reset';
  forgotMessage.textContent = 'Jika email terdaftar, link reset password telah dikirim. Silakan periksa inbox Anda.';
  forgotMessage.classList.remove('hidden');
  formForgot.reset();
});
