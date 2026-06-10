import { supabase, formatRupiah, formatKg, formatTanggal, escapeHtml, showToast, todayISO } from './supabase.js';
import { onFilterChange, applyDateFilter } from './filter.js';
import { exportSheet } from './export.js';
import { skeletonRows, emptyState } from './ui.js';
import { gradeTotalKg, gradePenghasilan, buildPanenExportRows } from './panen-shared.js';

const summaryEl = document.getElementById('panen-summary');
const form = document.getElementById('form-event-panen');
const list = document.getElementById('event-panen-list');
const exportBtn = document.getElementById('panen-export');

let greenhouses = [];
let events = [];

form.tanggal.value = todayISO();

async function loadGreenhouses() {
  const { data, error } = await supabase.from('greenhouses').select('id, nama').order('created_at', { ascending: true });
  if (error) {
    showToast('Gagal memuat data greenhouse: ' + error.message, true);
    return;
  }
  greenhouses = data || [];
}

export async function load() {
  list.innerHTML = skeletonRows(2, 'h-48');

  let query = supabase.from('event_panen').select('*');
  query = applyDateFilter(query, 'tanggal');
  const { data: eventRows, error } = await query
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = emptyState('Gagal memuat data: ' + escapeHtml(error.message), 'search');
    return;
  }

  const ids = (eventRows || []).map((e) => e.id);
  let detailRows = [];
  if (ids.length) {
    const { data, error: detailError } = await supabase.from('panen_detail').select('*').in('event_panen_id', ids);
    if (detailError) {
      list.innerHTML = emptyState('Gagal memuat detail: ' + escapeHtml(detailError.message), 'search');
      return;
    }
    detailRows = data || [];
  }

  events = (eventRows || []).map((e) => ({
    ...e,
    details: detailRows.filter((d) => d.event_panen_id === e.id),
  }));

  render();
  renderSummary();
}

function renderSummary() {
  let totalKg = 0;
  let totalPenghasilan = 0;

  events.forEach((ev) => {
    ev.details.forEach((d) => {
      totalKg += gradeTotalKg(d);
      totalPenghasilan += gradePenghasilan(d, ev);
    });
  });

  summaryEl.innerHTML = `
    <div class="card p-4 fade-in">
      <p class="text-xs text-muted uppercase tracking-wide">Total Hasil Panen</p>
      <p class="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">${formatKg(totalKg)}</p>
    </div>
    <div class="card p-4 fade-in fade-in-1">
      <p class="text-xs text-muted uppercase tracking-wide">Total Penghasilan</p>
      <p class="text-lg sm:text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">${formatRupiah(totalPenghasilan)}</p>
    </div>
  `;
}

function render() {
  if (!events.length) {
    list.innerHTML = emptyState('Belum ada event panen, tambahkan di atas', 'leaf');
    return;
  }

  list.innerHTML = events
    .map((ev, i) => {
      const rowsHtml = greenhouses
        .map((gh) => {
          const d = ev.details.find((x) => x.greenhouse_id === gh.id);
          const totalKg = gradeTotalKg(d);
          const penghasilan = gradePenghasilan(d, ev);

          return `
        <tr class="gh-row border-t border-slate-100 dark:border-slate-700" data-gh-id="${gh.id}">
          <td class="px-1.5 py-1.5 font-medium text-heading whitespace-nowrap">${escapeHtml(gh.nama)}</td>
          <td class="px-1 py-1.5"><input type="number" min="0" step="0.1" data-field="kg_grade_a" value="${d?.kg_grade_a ?? ''}" placeholder="0" class="kg-input input-field text-xs !py-1 w-16"></td>
          <td class="px-1 py-1.5"><input type="number" min="0" step="0.1" data-field="kg_grade_b" value="${d?.kg_grade_b ?? ''}" placeholder="0" class="kg-input input-field text-xs !py-1 w-16"></td>
          <td class="px-1 py-1.5"><input type="number" min="0" step="0.1" data-field="kg_grade_c" value="${d?.kg_grade_c ?? ''}" placeholder="0" class="kg-input input-field text-xs !py-1 w-16"></td>
          <td class="px-1 py-1.5"><input type="number" min="0" step="0.1" data-field="kg_grade_d" value="${d?.kg_grade_d ?? ''}" placeholder="0" class="kg-input input-field text-xs !py-1 w-16"></td>
          <td class="px-1.5 py-1.5 text-xs font-medium text-heading total-kg whitespace-nowrap">${formatKg(totalKg)}</td>
          <td class="px-1.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 penghasilan whitespace-nowrap">${formatRupiah(penghasilan)}</td>
          <td class="px-1.5 py-1.5"><button type="button" data-action="save-detail" class="text-xs px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 whitespace-nowrap">Simpan</button></td>
        </tr>`;
        })
        .join('');

      return `
    <div class="event-card card p-4 space-y-3 fade-in fade-in-${Math.min(i + 1, 5)}" data-event-id="${ev.id}">
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="font-semibold text-heading">${formatTanggal(ev.tanggal)}</p>
          ${ev.keterangan ? `<p class="text-xs text-muted mt-0.5">${escapeHtml(ev.keterangan)}</p>` : ''}
        </div>
        <button type="button" data-action="delete-event" class="shrink-0 text-xs px-2.5 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-md font-medium hover:bg-rose-100 dark:hover:bg-rose-900/50">Hapus Event</button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label class="label text-xs">Harga A</label>
          <input type="number" min="0" step="100" data-field="harga_grade_a" value="${ev.harga_grade_a}" class="harga-input input-field text-sm !py-1.5">
        </div>
        <div>
          <label class="label text-xs">Harga B</label>
          <input type="number" min="0" step="100" data-field="harga_grade_b" value="${ev.harga_grade_b}" class="harga-input input-field text-sm !py-1.5">
        </div>
        <div>
          <label class="label text-xs">Harga C</label>
          <input type="number" min="0" step="100" data-field="harga_grade_c" value="${ev.harga_grade_c}" class="harga-input input-field text-sm !py-1.5">
        </div>
        <div>
          <label class="label text-xs">Harga D</label>
          <input type="number" min="0" step="100" data-field="harga_grade_d" value="${ev.harga_grade_d}" class="harga-input input-field text-sm !py-1.5">
        </div>
      </div>
      <button type="button" data-action="save-harga" class="text-xs px-3 py-1.5 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 rounded-md font-medium hover:bg-sky-100 dark:hover:bg-sky-900/50">Simpan Harga Grade</button>

      <div class="overflow-x-auto -mx-1">
        <table class="w-full text-sm min-w-[560px]">
          <thead>
            <tr class="text-xs text-muted text-left">
              <th class="px-1.5 py-1">Greenhouse</th>
              <th class="px-1 py-1">Kg A</th>
              <th class="px-1 py-1">Kg B</th>
              <th class="px-1 py-1">Kg C</th>
              <th class="px-1 py-1">Kg D</th>
              <th class="px-1.5 py-1">Total Kg</th>
              <th class="px-1.5 py-1">Penghasilan</th>
              <th class="px-1.5 py-1"></th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
    `;
    })
    .join('');
}

function recomputeCard(card) {
  const hargaA = Number(card.querySelector('[data-field="harga_grade_a"]').value) || 0;
  const hargaB = Number(card.querySelector('[data-field="harga_grade_b"]').value) || 0;
  const hargaC = Number(card.querySelector('[data-field="harga_grade_c"]').value) || 0;
  const hargaD = Number(card.querySelector('[data-field="harga_grade_d"]').value) || 0;

  card.querySelectorAll('.gh-row').forEach((tr) => {
    const kgA = Number(tr.querySelector('[data-field="kg_grade_a"]').value) || 0;
    const kgB = Number(tr.querySelector('[data-field="kg_grade_b"]').value) || 0;
    const kgC = Number(tr.querySelector('[data-field="kg_grade_c"]').value) || 0;
    const kgD = Number(tr.querySelector('[data-field="kg_grade_d"]').value) || 0;
    const totalKg = kgA + kgB + kgC + kgD;
    const penghasilan = kgA * hargaA + kgB * hargaB + kgC * hargaC + kgD * hargaD;
    tr.querySelector('.total-kg').textContent = formatKg(totalKg);
    tr.querySelector('.penghasilan').textContent = formatRupiah(penghasilan);
  });
}

list.addEventListener('input', (e) => {
  const card = e.target.closest('.event-card');
  if (!card) return;
  if (e.target.classList.contains('harga-input') || e.target.classList.contains('kg-input')) {
    recomputeCard(card);
  }
});

list.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const card = btn.closest('.event-card');
  const eventId = card.dataset.eventId;

  if (btn.dataset.action === 'delete-event') {
    if (!confirm('Hapus event panen ini beserta semua data hasil per greenhouse-nya?')) return;
    const { error } = await supabase.from('event_panen').delete().eq('id', eventId);
    if (error) {
      showToast('Gagal menghapus: ' + error.message, true);
      return;
    }
    showToast('Event panen dihapus');
    await load();
    return;
  }

  if (btn.dataset.action === 'save-harga') {
    const payload = {
      harga_grade_a: Number(card.querySelector('[data-field="harga_grade_a"]').value) || 0,
      harga_grade_b: Number(card.querySelector('[data-field="harga_grade_b"]').value) || 0,
      harga_grade_c: Number(card.querySelector('[data-field="harga_grade_c"]').value) || 0,
      harga_grade_d: Number(card.querySelector('[data-field="harga_grade_d"]').value) || 0,
    };
    const { error } = await supabase.from('event_panen').update(payload).eq('id', eventId);
    if (error) {
      showToast('Gagal menyimpan harga: ' + error.message, true);
      return;
    }
    showToast('Harga grade disimpan');
    await load();
    return;
  }

  if (btn.dataset.action === 'save-detail') {
    const tr = btn.closest('.gh-row');
    const payload = {
      event_panen_id: eventId,
      greenhouse_id: tr.dataset.ghId,
      kg_grade_a: Number(tr.querySelector('[data-field="kg_grade_a"]').value) || 0,
      kg_grade_b: Number(tr.querySelector('[data-field="kg_grade_b"]').value) || 0,
      kg_grade_c: Number(tr.querySelector('[data-field="kg_grade_c"]').value) || 0,
      kg_grade_d: Number(tr.querySelector('[data-field="kg_grade_d"]').value) || 0,
    };
    const { error } = await supabase.from('panen_detail').upsert(payload, { onConflict: 'event_panen_id,greenhouse_id' });
    if (error) {
      showToast('Gagal menyimpan hasil panen: ' + error.message, true);
      return;
    }
    showToast('Hasil panen disimpan');
    await load();
    return;
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    tanggal: form.tanggal.value,
    harga_grade_a: Number(form.harga_grade_a.value) || 0,
    harga_grade_b: Number(form.harga_grade_b.value) || 0,
    harga_grade_c: Number(form.harga_grade_c.value) || 0,
    harga_grade_d: Number(form.harga_grade_d.value) || 0,
    keterangan: form.keterangan.value.trim() || null,
  };

  const { error } = await supabase.from('event_panen').insert(payload);
  if (error) {
    showToast('Gagal menyimpan: ' + error.message, true);
    return;
  }

  showToast('Event panen ditambahkan');
  form.reset();
  form.tanggal.value = todayISO();
  await load();
});

exportBtn?.addEventListener('click', () => {
  if (!events.length) {
    showToast('Tidak ada data untuk diexport', true);
    return;
  }

  exportSheet('Panen', 'Panen', buildPanenExportRows(events, greenhouses));
});

onFilterChange(load);

(async function init() {
  await loadGreenhouses();
  await load();
})();
