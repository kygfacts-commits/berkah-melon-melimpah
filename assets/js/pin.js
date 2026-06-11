// Helper PIN gate generik (4 digit), didukung Supabase.
//
// PIN TIDAK pernah disimpan/di-cache di browser (tidak ada localStorage,
// sessionStorage, maupun cookie). Setiap kali halaman dibuka, PIN gate
// selalu tampil dan PIN yang dimasukkan diverifikasi langsung ke tabel
// `settings` di Supabase (kolom `value` berisi hash SHA-256 dari PIN).
// PIN salah -> redirect otomatis ke index.html.
//
// Proteksi ini tetap di sisi UI (RLS Supabase anon full access seperti
// tabel lainnya); tujuannya hanya mencegah hash PIN tersimpan polos.

const SETTINGS_TABLE = 'settings';

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getStoredHash(supabase, settingsKey, defaultPin) {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select('value')
    .eq('key', settingsKey)
    .maybeSingle();

  if (error || !data) {
    return sha256Hex(defaultPin);
  }
  return data.value;
}

export function initPinGate({ supabase, settingsKey, defaultPin, gateEl, contentEl, lockBtnEl, redirectUrl = 'index.html' }) {
  // Selalu mulai dari layar PIN — tidak ada status "sudah unlock" yang disimpan.
  gateEl.classList.remove('hidden');
  contentEl.classList.add('hidden');

  const form = gateEl.querySelector('form');
  const errorEl = gateEl.querySelector('[data-pin-error]');
  const submitBtn = form?.querySelector('button[type="submit"]');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = form.pin.value.trim();

    if (!/^\d{4}$/.test(value)) {
      errorEl?.classList.remove('hidden');
      form.pin.value = '';
      form.pin.focus();
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    const [storedHash, enteredHash] = await Promise.all([
      getStoredHash(supabase, settingsKey, defaultPin),
      sha256Hex(value),
    ]);
    if (submitBtn) submitBtn.disabled = false;

    if (enteredHash === storedHash) {
      errorEl?.classList.add('hidden');
      gateEl.classList.add('hidden');
      contentEl.classList.remove('hidden');
    } else {
      errorEl?.classList.remove('hidden');
      form.pin.value = '';
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 900);
    }
  });

  lockBtnEl?.addEventListener('click', () => {
    contentEl.classList.add('hidden');
    gateEl.classList.remove('hidden');
    if (form) {
      form.pin.value = '';
      form.pin.focus();
    }
    errorEl?.classList.add('hidden');
  });
}

// Mengganti PIN: verifikasi PIN lama, lalu simpan hash PIN baru ke Supabase.
export async function changePin({ supabase, settingsKey, defaultPin, oldPin, newPin }) {
  if (!/^\d{4}$/.test(oldPin)) {
    return { ok: false, error: 'PIN lama harus 4 digit angka.' };
  }
  if (!/^\d{4}$/.test(newPin)) {
    return { ok: false, error: 'PIN baru harus 4 digit angka.' };
  }

  const [storedHash, oldHash] = await Promise.all([
    getStoredHash(supabase, settingsKey, defaultPin),
    sha256Hex(oldPin),
  ]);

  if (oldHash !== storedHash) {
    return { ok: false, error: 'PIN lama salah.' };
  }

  const newHash = await sha256Hex(newPin);
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ key: settingsKey, value: newHash, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) {
    return { ok: false, error: 'Gagal menyimpan PIN baru: ' + error.message };
  }
  return { ok: true };
}
