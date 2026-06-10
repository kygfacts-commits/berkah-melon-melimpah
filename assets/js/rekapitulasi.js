import { supabase, formatRupiah, formatKg, formatTanggal, getGreenhouseId, showToast } from './supabase.js';
import { applyDateFilter, onFilterChange, getFilter } from './filter.js';
import { exportSheet, exportWorkbook } from './export.js';
import { formatMonthLabel } from './ui.js';

const JENIS_LABEL = {
  listrik: 'Listrik',
  air: 'Air',
  tenaga_kerja: 'Tenaga Kerja',
  lainnya: 'Lainnya',
};

const greenhouseId = getGreenhouseId();

const els = {
  totalBiaya: document.getElementById('rekap-total-biaya'),
  totalPanen: document.getElementById('rekap-total-panen'),
  hpp: document.getElementById('rekap-hpp'),
  logTotal: document.getElementById('rekap-log-total'),
  listrik: document.getElementById('rekap-listrik'),
  air: document.getElementById('rekap-air'),
  tenagaKerja: document.getElementById('rekap-tenaga-kerja'),
  lainnya: document.getElementById('rekap-lainnya'),
  operasionalTotal: document.getElementById('rekap-operasional-total'),
  margin: document.getElementById('rekap-margin'),
  profitTotal: document.getElementById('rekap-profit-total'),
  profitStatus: document.getElementById('rekap-profit-status'),
  hargaJualInput: document.getElementById('harga-jual-input'),
  hargaJualSave: document.getElementById('harga-jual-save'),
  chartBiaya: document.getElementById('chart-biaya'),
  chartPanen: document.getElementById('chart-panen'),
};

let lastTotals = null;
let lastSeries = null;
let hargaJualPerKg = 0;
let chartBiaya = null;
let chartPanen = null;

function computeTotals(logRows, biayaRows, panenRows) {
  const totalLog = (logRows || []).reduce((sum, r) => sum + Number(r.nominal_biaya || 0), 0);

  const byJenis = { listrik: 0, air: 0, tenaga_kerja: 0, lainnya: 0 };
  let totalOperasional = 0;
  (biayaRows || []).forEach((r) => {
    const nominal = Number(r.nominal || 0);
    if (byJenis[r.jenis_biaya] !== undefined) byJenis[r.jenis_biaya] += nominal;
    totalOperasional += nominal;
  });

  const totalPanen = (panenRows || []).reduce((sum, r) => sum + Number(r.jumlah_kg || 0), 0);
  const totalBiaya = totalLog + totalOperasional;
  const hpp = totalPanen > 0 ? totalBiaya / totalPanen : 0;

  return { totalLog, byJenis, totalOperasional, totalPanen, totalBiaya, hpp };
}

// ---------------------------------------------------------------
// Harga jual per kg & estimasi profit
// ---------------------------------------------------------------

async function loadHargaJual() {
  if (!greenhouseId) return;
  const { data, error } = await supabase
    .from('greenhouses')
    .select('harga_jual_per_kg')
    .eq('id', greenhouseId)
    .maybeSingle();

  if (!error && data && data.harga_jual_per_kg != null) {
    hargaJualPerKg = Number(data.harga_jual_per_kg) || 0;
    if (els.hargaJualInput) els.hargaJualInput.value = hargaJualPerKg || '';
  }
}

function updateProfitDisplay(totals) {
  if (!els.margin || !els.profitTotal || !els.profitStatus) return;

  if (totals.totalPanen > 0 && hargaJualPerKg > 0) {
    const margin = hargaJualPerKg - totals.hpp;
    const totalProfit = margin * totals.totalPanen;
    const untung = margin >= 0;
    const colorClass = untung ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';

    els.margin.textContent = formatRupiah(margin) + ' / kg';
    els.margin.className = `text-xl font-bold mt-1 ${colorClass}`;

    els.profitTotal.textContent = formatRupiah(totalProfit);
    els.profitTotal.className = `text-xl font-bold mt-1 ${colorClass}`;

    els.profitStatus.textContent = untung
      ? `✅ Untung ${formatRupiah(Math.abs(totalProfit))} (estimasi)`
      : `⚠️ Rugi ${formatRupiah(Math.abs(totalProfit))} (estimasi)`;
    els.profitStatus.className = `text-sm font-semibold ${colorClass}`;
  } else {
    els.margin.textContent = '-';
    els.margin.className = 'text-xl font-bold mt-1 text-heading';

    els.profitTotal.textContent = '-';
    els.profitTotal.className = 'text-xl font-bold mt-1 text-heading';

    els.profitStatus.textContent =
      hargaJualPerKg > 0 ? '' : 'Masukkan harga jual per kg untuk melihat estimasi profit.';
    els.profitStatus.className = 'text-sm font-semibold text-muted';
  }
}

els.hargaJualSave?.addEventListener('click', async () => {
  if (!greenhouseId) return;
  const value = Number(els.hargaJualInput.value) || 0;

  const { error } = await supabase
    .from('greenhouses')
    .update({ harga_jual_per_kg: value })
    .eq('id', greenhouseId);

  if (error) {
    showToast('Gagal menyimpan harga jual: ' + error.message, true);
    return;
  }

  hargaJualPerKg = value;
  showToast('Harga jual per kg disimpan');
  if (lastTotals) updateProfitDisplay(lastTotals);
});

// ---------------------------------------------------------------
// Grafik tren biaya & panen per bulan
// ---------------------------------------------------------------

function buildMonthlySeries(logRows, biayaRows, panenRows) {
  const costMap = new Map();
  (logRows || []).forEach((r) => {
    const month = (r.tanggal || '').slice(0, 7);
    if (!month) return;
    costMap.set(month, (costMap.get(month) || 0) + Number(r.nominal_biaya || 0));
  });
  (biayaRows || []).forEach((r) => {
    const month = (r.tanggal || '').slice(0, 7);
    if (!month) return;
    costMap.set(month, (costMap.get(month) || 0) + Number(r.nominal || 0));
  });

  const harvestMap = new Map();
  (panenRows || []).forEach((r) => {
    const month = (r.tanggal_panen || '').slice(0, 7);
    if (!month) return;
    harvestMap.set(month, (harvestMap.get(month) || 0) + Number(r.jumlah_kg || 0));
  });

  const months = [...new Set([...costMap.keys(), ...harvestMap.keys()])].sort();
  return {
    labels: months.map(formatMonthLabel),
    cost: months.map((m) => costMap.get(m) || 0),
    harvest: months.map((m) => harvestMap.get(m) || 0),
  };
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

function renderCharts(series) {
  if (typeof Chart === 'undefined' || !els.chartBiaya || !els.chartPanen) return;

  const dark = isDarkMode();
  const textColor = dark ? '#cbd5e1' : '#475569';
  const gridColor = dark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.1)';
  const scales = {
    x: { ticks: { color: textColor }, grid: { color: gridColor } },
    y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
  };

  chartBiaya?.destroy();
  chartBiaya = new Chart(els.chartBiaya, {
    type: 'bar',
    data: {
      labels: series.labels,
      datasets: [
        {
          label: 'Biaya (Rp)',
          data: series.cost,
          backgroundColor: 'rgba(20, 184, 166, 0.6)',
          borderColor: 'rgb(13, 148, 136)',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales,
    },
  });

  chartPanen?.destroy();
  chartPanen = new Chart(els.chartPanen, {
    type: 'line',
    data: {
      labels: series.labels,
      datasets: [
        {
          label: 'Panen (kg)',
          data: series.harvest,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: 'rgb(16, 185, 129)',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales,
    },
  });
}

// Re-render grafik dengan warna yang sesuai saat tema diganti.
document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (lastSeries) setTimeout(() => renderCharts(lastSeries), 50);
  });
});

// ---------------------------------------------------------------
// Rekap utama
// ---------------------------------------------------------------

export async function refreshRekap() {
  if (!greenhouseId) return;

  const [logRes, biayaRes, panenRes] = await Promise.all([
    applyDateFilter(supabase.from('log_harian').select('tanggal, nominal_biaya').eq('greenhouse_id', greenhouseId), 'tanggal'),
    applyDateFilter(supabase.from('biaya_operasional').select('tanggal, jenis_biaya, nominal').eq('greenhouse_id', greenhouseId), 'tanggal'),
    applyDateFilter(supabase.from('panen').select('tanggal_panen, jumlah_kg').eq('greenhouse_id', greenhouseId), 'tanggal_panen'),
  ]);

  const totals = computeTotals(logRes.data, biayaRes.data, panenRes.data);
  lastTotals = totals;

  els.totalBiaya.textContent = formatRupiah(totals.totalBiaya);
  els.totalPanen.textContent = formatKg(totals.totalPanen);
  els.hpp.textContent = totals.totalPanen > 0 ? formatRupiah(totals.hpp) + ' / kg' : '-';

  els.logTotal.textContent = formatRupiah(totals.totalLog);
  els.listrik.textContent = formatRupiah(totals.byJenis.listrik);
  els.air.textContent = formatRupiah(totals.byJenis.air);
  els.tenagaKerja.textContent = formatRupiah(totals.byJenis.tenaga_kerja);
  els.lainnya.textContent = formatRupiah(totals.byJenis.lainnya);
  els.operasionalTotal.textContent = formatRupiah(totals.totalOperasional);

  updateProfitDisplay(totals);

  lastSeries = buildMonthlySeries(logRes.data, biayaRes.data, panenRes.data);
  renderCharts(lastSeries);
}

function buildRekapRows(totals) {
  const { from, to } = getFilter();
  const periode = from || to ? `${from || '...'} s/d ${to || '...'}` : 'Semua tanggal';
  const margin = hargaJualPerKg - totals.hpp;
  const totalProfit = margin * totals.totalPanen;

  return [
    { Keterangan: 'Periode', Nilai: periode },
    { Keterangan: 'Total Biaya Produksi (Rp)', Nilai: totals.totalBiaya },
    { Keterangan: 'Total Hasil Panen (kg)', Nilai: totals.totalPanen },
    { Keterangan: 'HPP per Kg (Rp)', Nilai: totals.totalPanen > 0 ? Math.round(totals.hpp) : 0 },
    { Keterangan: 'Harga Jual per Kg (Rp)', Nilai: hargaJualPerKg },
    { Keterangan: 'Margin per Kg (Rp)', Nilai: totals.totalPanen > 0 ? Math.round(margin) : 0 },
    { Keterangan: 'Estimasi Total Profit (Rp)', Nilai: totals.totalPanen > 0 ? Math.round(totalProfit) : 0 },
    { Keterangan: 'Total Log Harian (Rp)', Nilai: totals.totalLog },
    { Keterangan: 'Listrik (Rp)', Nilai: totals.byJenis.listrik },
    { Keterangan: 'Air (Rp)', Nilai: totals.byJenis.air },
    { Keterangan: 'Tenaga Kerja (Rp)', Nilai: totals.byJenis.tenaga_kerja },
    { Keterangan: 'Biaya Lainnya (Rp)', Nilai: totals.byJenis.lainnya },
    { Keterangan: 'Total Biaya Operasional (Rp)', Nilai: totals.totalOperasional },
  ];
}

async function exportSemua() {
  if (!greenhouseId) return;

  const [logRes, biayaRes, panenRes] = await Promise.all([
    applyDateFilter(supabase.from('log_harian').select('*').eq('greenhouse_id', greenhouseId), 'tanggal').order('tanggal', { ascending: false }),
    applyDateFilter(supabase.from('biaya_operasional').select('*').eq('greenhouse_id', greenhouseId), 'tanggal').order('tanggal', { ascending: false }),
    applyDateFilter(supabase.from('panen').select('*').eq('greenhouse_id', greenhouseId), 'tanggal_panen').order('tanggal_panen', { ascending: false }),
  ]);

  const logRows = logRes.data || [];
  const biayaRows = biayaRes.data || [];
  const panenRows = panenRes.data || [];
  const totals = computeTotals(logRows, biayaRows, panenRows);

  exportWorkbook('Export_Semua', [
    { name: 'Rekap', rows: buildRekapRows(totals) },
    {
      name: 'Log Harian',
      rows: logRows.map((r) => ({
        Tanggal: formatTanggal(r.tanggal),
        'Uraian Kegiatan': r.uraian_kegiatan,
        'Nominal Biaya (Rp)': Number(r.nominal_biaya || 0),
        Keterangan: r.keterangan || '',
      })),
    },
    {
      name: 'Biaya Operasional',
      rows: biayaRows.map((r) => ({
        Tanggal: formatTanggal(r.tanggal),
        'Jenis Biaya': JENIS_LABEL[r.jenis_biaya] || r.jenis_biaya,
        'Nominal (Rp)': Number(r.nominal || 0),
        Keterangan: r.keterangan || '',
      })),
    },
    {
      name: 'Panen',
      rows: panenRows.map((r) => ({
        'Tanggal Panen': formatTanggal(r.tanggal_panen),
        'Jumlah (kg)': Number(r.jumlah_kg || 0),
        Keterangan: r.keterangan || '',
      })),
    },
  ]);
}

document.getElementById('btn-refresh-rekap')?.addEventListener('click', refreshRekap);

document.getElementById('btn-export-rekap')?.addEventListener('click', () => {
  exportSheet('Rekap', 'Rekap', buildRekapRows(lastTotals || computeTotals([], [], [])));
});

document.getElementById('btn-export-semua')?.addEventListener('click', exportSemua);

onFilterChange(refreshRekap);

(async function init() {
  await loadHargaJual();
  await refreshRekap();
})();
