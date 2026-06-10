// Helper PIN gate generik (4 digit). Status "terbuka" disimpan di
// localStorage per-perangkat sehingga pengguna tidak perlu memasukkan
// PIN berulang kali. Proteksi ini hanya di sisi UI (RLS Supabase tetap
// anon full access seperti tabel lainnya).

export function initPinGate({ pin, storageKey, gateEl, contentEl, lockBtnEl }) {
  function unlock() {
    localStorage.setItem(storageKey, '1');
    gateEl.classList.add('hidden');
    contentEl.classList.remove('hidden');
  }

  function lock() {
    localStorage.removeItem(storageKey);
    contentEl.classList.add('hidden');
    gateEl.classList.remove('hidden');
    const input = gateEl.querySelector('input[name="pin"]');
    if (input) {
      input.value = '';
      input.focus();
    }
  }

  if (localStorage.getItem(storageKey) === '1') {
    unlock();
  } else {
    gateEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
  }

  const form = gateEl.querySelector('form');
  const errorEl = gateEl.querySelector('[data-pin-error]');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = form.pin.value.trim();
    if (value === pin) {
      errorEl?.classList.add('hidden');
      unlock();
    } else {
      errorEl?.classList.remove('hidden');
      form.pin.value = '';
      form.pin.focus();
    }
  });

  lockBtnEl?.addEventListener('click', lock);
}
