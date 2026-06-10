import { formatTanggal } from './supabase.js';

export function gradeTotalKg(d) {
  return (Number(d?.kg_grade_a) || 0) + (Number(d?.kg_grade_b) || 0) + (Number(d?.kg_grade_c) || 0) + (Number(d?.kg_grade_d) || 0);
}

export function gradePenghasilan(d, ev) {
  return (
    (Number(d?.kg_grade_a) || 0) * (Number(ev.harga_grade_a) || 0) +
    (Number(d?.kg_grade_b) || 0) * (Number(ev.harga_grade_b) || 0) +
    (Number(d?.kg_grade_c) || 0) * (Number(ev.harga_grade_c) || 0) +
    (Number(d?.kg_grade_d) || 0) * (Number(ev.harga_grade_d) || 0)
  );
}

// events: array of event_panen rows with `.details` (panen_detail rows for that event)
// greenhouses: array of { id, nama }
export function buildPanenExportRows(events, greenhouses) {
  const rows = [];
  let sumKgA = 0;
  let sumKgB = 0;
  let sumKgC = 0;
  let sumKgD = 0;
  let sumTotalKg = 0;
  let sumPenghasilan = 0;

  events.forEach((ev) => {
    greenhouses.forEach((gh) => {
      const d = ev.details.find((x) => x.greenhouse_id === gh.id);
      const kgA = Number(d?.kg_grade_a) || 0;
      const kgB = Number(d?.kg_grade_b) || 0;
      const kgC = Number(d?.kg_grade_c) || 0;
      const kgD = Number(d?.kg_grade_d) || 0;
      const totalKg = kgA + kgB + kgC + kgD;
      const penghasilan = gradePenghasilan(d, ev);

      sumKgA += kgA;
      sumKgB += kgB;
      sumKgC += kgC;
      sumKgD += kgD;
      sumTotalKg += totalKg;
      sumPenghasilan += penghasilan;

      rows.push({
        'Tanggal Event': formatTanggal(ev.tanggal),
        Greenhouse: gh.nama,
        'Kg A': kgA,
        'Kg B': kgB,
        'Kg C': kgC,
        'Kg D': kgD,
        'Total Kg': totalKg,
        'Harga A': Number(ev.harga_grade_a) || 0,
        'Harga B': Number(ev.harga_grade_b) || 0,
        'Harga C': Number(ev.harga_grade_c) || 0,
        'Harga D': Number(ev.harga_grade_d) || 0,
        'Penghasilan (Rp)': penghasilan,
      });
    });
  });

  rows.push({
    'Tanggal Event': 'TOTAL',
    Greenhouse: '',
    'Kg A': sumKgA,
    'Kg B': sumKgB,
    'Kg C': sumKgC,
    'Kg D': sumKgD,
    'Total Kg': sumTotalKg,
    'Harga A': '',
    'Harga B': '',
    'Harga C': '',
    'Harga D': '',
    'Penghasilan (Rp)': sumPenghasilan,
  });

  return rows;
}
