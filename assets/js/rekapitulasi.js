import { supabase, formatRupiah, formatKg } from './supabase.js';

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
};

export async function refreshRekap() {
  const [logRes, biayaRes, panenRes] = await Promise.all([
    supabase.from('log_harian').select('nominal_biaya'),
    supabase.from('biaya_operasional').select('jenis_biaya, nominal'),
    supabase.from('panen').select('jumlah_kg'),
  ]);

  const totalLog = (logRes.data || []).reduce((sum, r) => sum + Number(r.nominal_biaya || 0), 0);

  const byJenis = { listrik: 0, air: 0, tenaga_kerja: 0, lainnya: 0 };
  let totalOperasional = 0;
  (biayaRes.data || []).forEach((r) => {
    const nominal = Number(r.nominal || 0);
    if (byJenis[r.jenis_biaya] !== undefined) byJenis[r.jenis_biaya] += nominal;
    totalOperasional += nominal;
  });

  const totalPanen = (panenRes.data || []).reduce((sum, r) => sum + Number(r.jumlah_kg || 0), 0);
  const totalBiaya = totalLog + totalOperasional;
  const hpp = totalPanen > 0 ? totalBiaya / totalPanen : 0;

  els.totalBiaya.textContent = formatRupiah(totalBiaya);
  els.totalPanen.textContent = formatKg(totalPanen);
  els.hpp.textContent = totalPanen > 0 ? formatRupiah(hpp) + ' / kg' : '-';

  els.logTotal.textContent = formatRupiah(totalLog);
  els.listrik.textContent = formatRupiah(byJenis.listrik);
  els.air.textContent = formatRupiah(byJenis.air);
  els.tenagaKerja.textContent = formatRupiah(byJenis.tenaga_kerja);
  els.lainnya.textContent = formatRupiah(byJenis.lainnya);
  els.operasionalTotal.textContent = formatRupiah(totalOperasional);
}

document.getElementById('btn-refresh-rekap')?.addEventListener('click', refreshRekap);

refreshRekap();
