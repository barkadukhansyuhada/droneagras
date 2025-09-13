import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area, ComposedChart, Line } from 'recharts';

// ==============================================
// UTIL & UI SMALLS
// ==============================================
const formatCurrency = (value, compact = false) => {
  if (typeof value !== 'number' || isNaN(value)) return 'Rp 0';
  if (compact && Math.abs(value) >= 1_000_000)
    return `Rp ${(value / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Jt`;
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`;
};

const NavButton = ({ children, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-300 ${
      isActive ? 'bg-blue-900 text-white shadow-md' : 'bg-white text-blue-900 hover:bg-blue-100'
    }`}
  >
    {children}
  </button>
);

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center space-x-2 select-none cursor-pointer">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

const InfoTooltip = ({ text }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-block ml-2 align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onTouchStart={() => setOpen((v) => !v)}
    >
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold cursor-help select-none">i</span>
      {open && (
        <div className="absolute z-30 w-80 max-w-xs p-3 text-xs leading-relaxed text-gray-800 bg-white border border-gray-200 rounded-lg shadow-xl -left-2 mt-2">
          {text}
        </div>
      )}
    </span>
  );
};

// ==============================================
// KONSTAN & DATA (HARDCODED)
// ==============================================
// PPN Indonesia (asumsi umum)
const VAT_RATE = 0.11; // 11%

// Overhead proyek (tetap, tidak dialokasikan)
const PROJECT_OVERHEAD = {
  'Rental Mobil (Project)': 8_000_000,
  'Camp Manager (Project)': 12_000_000,
};

// >>> Shared beban produksi (menjawab: biaya kantor & koordinasi SAMA untuk T50 & T100)
const SHARED_PRODUCTION_EXPENSES_MONTHLY = {
  'Biaya Kantor (Proyek)': 13_431_000, // diambil dari total 483.516.000 / 36 bulan
  'Biaya Koordinasi (Proyek)': 6_861_111, // diambil dari total 247.000.000 / 36 bulan
};

// Asumsi operasi (untuk penjelasan)
const asumsiUmum = { 'Hari Kerja / Bulan': 22, 'Jam Kerja Efektif / Hari': '6 jam', 'Harga Borongan / Ha': 300_000 };

// Helper: bentuk deret arus kas
const makeCashflowSeries = (initial, monthly, months = 36) => {
  const out = [{ bulan: 1, arusKas: initial, kumulatif: initial }];
  for (let i = 0; i < months; i++) {
    const bulan = i + 2;
    const kum = initial + monthly * (i + 1);
    out.push({ bulan, arusKas: monthly, kumulatif: kum });
  }
  return out;
};

// FINANCE HELPERS
const DISCOUNT_RATE_PA = 0.18; // 18% p.a.
const monthlyRate = DISCOUNT_RATE_PA / 12;

function paybackFromCumulative(cumulArray) {
  if (!Array.isArray(cumulArray)) return null;
  for (let i = 0; i < cumulArray.length; i++) {
    if (typeof cumulArray[i] === 'number' && cumulArray[i] >= 0) return i + 1; // bulan ke-(i+1)
  }
  return null;
}

function npv(rate, cashflows) {
  let v = 0;
  for (let t = 0; t < cashflows.length; t++) {
    v += cashflows[t] / Math.pow(1 + rate, t + 1); // aliran mulai t=1
  }
  return v;
}

function irr(cashflows, guess = 0.1, maxIter = 100, tol = 1e-6) {
  if (!cashflows || cashflows.length === 0) return null;
  let r = guess;
  for (let k = 0; k < maxIter; k++) {
    let npv_val = cashflows[0];
    let d_npv = 0;
    for (let t = 1; t < cashflows.length; t++) {
      npv_val += cashflows[t] / Math.pow(1 + r, t);
      d_npv -= (t * cashflows[t]) / Math.pow(1 + r, t + 1);
    }
    const rNext = r - npv_val / (d_npv || 1e-12);
    if (!isFinite(rNext)) break;
    if (Math.abs(rNext - r) < tol) return rNext;
    r = rNext;
  }
  return null;
}

// ==============================================
// PER UNIT DATA
// ==============================================
const T50_DATA = {
  name: 'DJI Agras T50',
  hargaBaru: 400_000_000,
  produktivitasHaPerBulan: 484,
  targetOmset: 145_200_000,
  biayaOperasional: 33_000_000,
  biaya: { 'Gaji Tim': 25_000_000, BBM: 6_000_000, Perawatan: 2_000_000 }, // perawatan disamakan
  profitKotor: 112_200_000,
  bebanProduksiBulanan: SHARED_PRODUCTION_EXPENSES_MONTHLY,
  skemaPembelian: {
    cash: 400_000_000,
    leasing: { dp: 120_000_000, cicilanPerBulan: 9_644_444, tenorBulan: 36 },
  },
  get cashflowCash() { return makeCashflowSeries(-this.hargaBaru, this.profitKotor); },
  get cashflowLeasing() {
    const monthly = this.profitKotor - this.skemaPembelian.leasing.cicilanPerBulan;
    return makeCashflowSeries(-this.skemaPembelian.leasing.dp, monthly);
  },
};

const T100_DATA = {
  name: 'DJI Agras T100',
  hargaBaru: 550_000_000,
  produktivitasHaPerBulan: 880,
  targetOmset: 264_000_000,
  biayaOperasional: 39_500_000,
  biaya: { 'Gaji Tim': 30_000_000, BBM: 8_000_000, Perawatan: 2_000_000 }, // perawatan DISAMAKAN ke 2 jt/bulan
  profitKotor: 224_500_000,
  bebanProduksiBulanan: SHARED_PRODUCTION_EXPENSES_MONTHLY, // disamakan
  skemaPembelian: {
    cash: 550_000_000,
    leasing: { dp: 165_000_000, cicilanPerBulan: 13_261_111, tenorBulan: 36 },
  },
  get cashflowCash() { return makeCashflowSeries(-this.hargaBaru, this.profitKotor); },
  get cashflowLeasing() {
    const monthly = this.profitKotor - this.skemaPembelian.leasing.cicilanPerBulan;
    return makeCashflowSeries(-this.skemaPembelian.leasing.dp, monthly);
  },
};

/* ==================================================
   DEV SANITY TESTS (pseudo "test cases")
   ================================================== */
(function runSanityTests() {
  try {
    console.assert(T50_DATA.profitKotor === T50_DATA.targetOmset - T50_DATA.biayaOperasional, 'T50 profitKotor mismatch');
    console.assert(T100_DATA.profitKotor === T100_DATA.targetOmset - T100_DATA.biayaOperasional, 'T100 profitKotor mismatch');

    const t50Cash = T50_DATA.cashflowCash; const t50Leas = T50_DATA.cashflowLeasing;
    const t100Cash = T100_DATA.cashflowCash; const t100Leas = T100_DATA.cashflowLeasing;

    console.assert(t50Cash.length === 37 && t50Leas.length === 37, 'T50 cashflow length should be 37 (t0 + 36)');
    console.assert(t100Cash.length === 37 && t100Leas.length === 37, 'T100 cashflow length should be 37 (t0 + 36)');

    console.assert(t50Cash[0].arusKas === -T50_DATA.hargaBaru, 'T50 cash t0 should be -hargaBaru');
    console.assert(t50Leas[0].arusKas === -T50_DATA.skemaPembelian.leasing.dp, 'T50 leasing t0 should be -dp');
    console.assert(t50Cash[1].arusKas === T50_DATA.profitKotor, 'T50 cash month1 should equal profitKotor');
    console.assert(t50Leas[1].arusKas === (T50_DATA.profitKotor - T50_DATA.skemaPembelian.leasing.cicilanPerBulan), 'T50 leasing month1 should equal profitKotor - cicilan');

    console.assert(t100Cash[0].arusKas === -T100_DATA.hargaBaru, 'T100 cash t0 should be -hargaBaru');
    console.assert(t100Leas[0].arusKas === -T100_DATA.skemaPembelian.leasing.dp, 'T100 leasing t0 should be -dp');
    console.assert(t100Cash[1].arusKas === T100_DATA.profitKotor, 'T100 cash month1 should equal profitKotor');
    console.assert(t100Leas[1].arusKas === (T100_DATA.profitKotor - T100_DATA.skemaPembelian.leasing.cicilanPerBulan), 'T100 leasing month1 should equal profitKotor - cicilan');
  } catch (e) { console.error('Sanity tests failed:', e); }
})();

// ==============================================
// VAT HELPERS (tidak mengubah perhitungan profitKotor existing)
// ==============================================
function splitVATFromAmount(amount, inclusive) {
  if (!inclusive) return { base: amount, vat: amount * VAT_RATE };
  const base = amount / (1 + VAT_RATE);
  return { base, vat: amount - base };
}

// ==============================================
// VISUAL SECTIONS
// ==============================================
const CashflowSection = ({ title, cashData, leasingData, perUnitSummary, bebanProduksiBulanan, vatInclusive, applyVATToCashflow }) => {
  const paybackCash = paybackFromCumulative(cashData.map((d) => d.kumulatif));
  const paybackLeasing = paybackFromCumulative(leasingData.map((d) => d.kumulatif));

  const irrCashFlows = cashData.map((d) => d.arusKas);
  const irrCash = irr(irrCashFlows);
  const npvCash = npv(monthlyRate, irrCashFlows.slice(1)) + irrCashFlows[0];

  const combinedData = cashData.map((d, i) => ({
    bulan: `B${d.bulan}`,
    'Arus Kas (Cash)': d.arusKas,
    'Arus Kas (Leasing)': leasingData[i]?.arusKas ?? 0,
    'Kumulatif (Cash)': d.kumulatif,
    'Kumulatif (Leasing)': leasingData[i]?.kumulatif ?? 0,
  }));

  const { base: omzetExVAT, vat: ppnKeluaran } = splitVATFromAmount(perUnitSummary.targetOmset, vatInclusive);

  const irrTip = `IRR bulanan dihitung dari arus kas skema CASH (t0 investasi awal, t1..t36 arus kas operasi). IRR tahunan ≈ (1 + IRR_bulanan)^12 − 1.`;
  const npvTip = `NPV (Cash) memakai tingkat diskonto 18%/thn (≈ ${(monthlyRate * 100).toFixed(2)}%/bln). Rumus: Σ CF_t/(1+r)^t termasuk investasi awal (t0).`;

  const komponen = useMemo(() => {
    const { biayaOperasional, profitKotor, skemaPembelian } = perUnitSummary;
    const cicilan = skemaPembelian?.leasing?.cicilanPerBulan ?? 0;
    const bebanTetapProyek = Object.values(bebanProduksiBulanan || {}).reduce((a, b) => a + b, 0);

    const rows = [
      { nama: `Omzet (${vatInclusive ? 'Incl. PPN' : 'Excl. PPN'})`, cash: perUnitSummary.targetOmset, leasing: perUnitSummary.targetOmset },
      { nama: '— Dasar Pengenaan Pajak (DPP)', cash: omzetExVAT, leasing: omzetExVAT },
      { nama: `— PPN Keluaran (${(VAT_RATE*100).toFixed(0)}%)`, cash: -ppnKeluaran, leasing: -ppnKeluaran },
      { nama: 'Biaya Langsung', cash: -biayaOperasional, leasing: -biayaOperasional },
      { nama: 'Profit Kotor (tanpa PPN masukan)', cash: profitKotor, leasing: profitKotor },
      { nama: 'Cicilan Leasing', cash: 0, leasing: -cicilan },
      { nama: 'Arus Kas Operasi', cash: profitKotor, leasing: profitKotor - cicilan },
      { nama: 'Beban Produksi (Proyek)*', cash: -bebanTetapProyek, leasing: -bebanTetapProyek },
      { nama: 'Arus Kas Setelah Beban Produksi*', cash: profitKotor - bebanTetapProyek, leasing: (profitKotor - cicilan) - bebanTetapProyek },
    ];

    // Jika ingin PPN mempengaruhi arus kas: kurangi PPN Keluaran pada arus kas operasi
    if (applyVATToCashflow) {
      rows.push({ nama: 'Penyesuaian Arus Kas karena PPN (remit)', cash: -ppnKeluaran, leasing: -ppnKeluaran });
      rows.push({ nama: 'Arus Kas Net Setelah PPN', cash: profitKotor - bebanTetapProyek - ppnKeluaran, leasing: (profitKotor - cicilan) - bebanTetapProyek - ppnKeluaran });
    }

    return rows;
  }, [perUnitSummary, bebanProduksiBulanan, vatInclusive, applyVATToCashflow, omzetExVAT, ppnKeluaran]);

  const bebanNote = '* Beban produksi (Kantor & Koordinasi) bersifat proyek/tetap dan tidak dialokasikan ke per unit pada pembukuan. PPN Masukan dari capex/opex belum dimodelkan; lihat pertanyaan di bawah.';

  return (
    <section className="bg-white p-6 rounded-xl shadow-lg mb-12">
      <h2 className="text-2xl font-bold text-blue-900 text-center mb-6">{title}</h2>

      <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
        <Toggle label="Omzet sudah termasuk PPN (11%)" checked={vatInclusive} onChange={() => {}} />
        <Toggle label="Pengaruhi arus kas oleh PPN" checked={applyVATToCashflow} onChange={() => {}} />
        <InfoTooltip text={'Jika aktif: Omzet dianggap sudah termasuk PPN, kita pecah DPP & PPN Keluaran. Opsi kedua akan mengurangi arus kas dengan PPN yang harus disetor (tanpa memperhitungkan PPN Masukan).'} />
      </div>

      <h3 className="text-lg font-semibold text-gray-700 text-center mb-4">Proyeksi Arus Kas Kumulatif</h3>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={combinedData} margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bulan" />
          <YAxis tickFormatter={(v) => formatCurrency(v, true)} />
          <Tooltip formatter={(v) => formatCurrency(v)} />
          <Legend />
          <Area type="monotone" dataKey="Kumulatif (Cash)" stroke="#1565c0" fill="#1565c0" fillOpacity={0.3} />
          <Area type="monotone" dataKey="Kumulatif (Leasing)" stroke="#ef6c00" fill="#ef6c00" fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mt-6">
        <div className="bg-gray-50 p-4 rounded-lg"><p className="text-gray-500 font-semibold">Payback (Cash)</p><p className="text-blue-900 text-2xl font-bold">{paybackCash ? `${paybackCash} bln` : 'N/A'}</p></div>
        <div className="bg-gray-50 p-4 rounded-lg"><p className="text-gray-500 font-semibold">Payback (Leasing)</p><p className="text-blue-900 text-2xl font-bold">{paybackLeasing ? `${paybackLeasing} bln` : 'N/A'}</p></div>
        <div className="bg-gray-50 p-4 rounded-lg"><p className="text-gray-500 font-semibold flex items-center justify-center">IRR (Cash) <InfoTooltip text={irrTip} /></p><p className="text-blue-900 text-2xl font-bold">{irrCash !== null ? `${(irrCash * 100).toFixed(1)}%/bln` : 'N/A'}</p></div>
        <div className="bg-gray-50 p-4 rounded-lg"><p className="text-gray-500 font-semibold flex items-center justify-center">NPV (Cash) <InfoTooltip text={npvTip} /></p><p className="text-blue-900 text-2xl font-bold">{formatCurrency(npvCash)}</p></div>
      </div>

      {/* KOMPOSISI ARUS KAS (per bulan) */}
      <div className="mt-8">
        <h4 className="text-md font-semibold text-gray-700 mb-2 flex items-center">Komponen Arus Kas per Bulan
          <InfoTooltip text={'Baris bertanda * menunjukkan beban produksi proyek (kantor & koordinasi) yang TIDAK dialokasikan ke unit.'} />
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500"><th className="py-2 pr-4">Komponen</th><th className="py-2 pr-4">Cash</th><th className="py-2 pr-4">Leasing</th></tr>
            </thead>
            <tbody>
              {komponen.map((r) => (
                <tr key={r.nama} className="border-t">
                  <td className="py-2 pr-4 font-medium text-gray-700">{r.nama}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.cash)}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.leasing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">{bebanNote}</p>
      </div>
    </section>
  );
};

// Waterfall per unit
const WaterfallSection = ({ title, omzet, biayaMap }) => {
  const steps = []; let cum = 0; cum += omzet; steps.push({ name: 'Omzet', base: 0, delta: omzet, end: cum, color: '#2ecc71', type: 'pos' });
  for (const [k, v] of Object.entries(biayaMap)) { const s = cum; cum -= v; const base = Math.min(s, cum); const delta = Math.abs(s - cum); steps.push({ name: k, base, delta, end: cum, color: '#e74c3c', type: 'neg' }); }
  steps.push({ name: 'Profit Kotor', base: 0, delta: cum, end: cum, color: '#3498db', type: 'total' });
  const data = steps.map((s) => ({ name: s.name, base: s.base, delta: s.delta, end: s.end, color: s.color, type: s.type }));
  return (
    <section className="bg-white p-6 rounded-xl shadow-lg mb-12">
      <h2 className="text-2xl font-bold text-blue-900 text-center mb-6">{title}</h2>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 16, right: 24, left: 24, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(v) => formatCurrency(v, true)} domain={[0, (dataMax) => dataMax * 1.15]} />
          <Tooltip formatter={(val, key, { payload }) => (key === 'delta' ? `${payload.type === 'neg' ? '-' : '+'}${formatCurrency(payload.delta)}` : formatCurrency(val))} labelFormatter={(label) => <span style={{ fontWeight: 'bold' }}>{label}</span>} />
          <Bar dataKey="base" stackId="w" fill="rgba(0,0,0,0)" isAnimationActive={false} />
          <Bar dataKey="delta" stackId="w" isAnimationActive={false} barCategoryGap={8}>{data.map((e, i) => (<Cell key={i} fill={e.color} />))}</Bar>
          <Line type="linear" dataKey="end" stroke="#546e7a" dot={{ r: 2 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-500 mt-4 text-center italic">Waterfall per unit: Omzet (hijau) → Biaya langsung (merah) → Profit Kotor (biru).</p>
    </section>
  );
};

const ProjectWaterfallSection = ({ units = 3 }) => {
  const totalOmzet = T100_DATA.targetOmset * units;
  const totalBiayaLangsung = T100_DATA.biayaOperasional * units;
  const totalProfitKotor = T100_DATA.profitKotor * units;
  const overheadItems = Object.entries(PROJECT_OVERHEAD);
  const productionItems = Object.entries(SHARED_PRODUCTION_EXPENSES_MONTHLY);
  const steps = []; let cum = 0; cum += totalOmzet; steps.push({ name: `Total Omzet (${units} unit)`, base: 0, delta: totalOmzet, end: cum, color: '#2ecc71', type: 'pos' });
  const s1 = cum; cum -= totalBiayaLangsung; steps.push({ name: 'Biaya Langsung (Total)', base: Math.min(s1, cum), delta: Math.abs(s1 - cum), end: cum, color: '#e74c3c', type: 'neg' });
  steps.push({ name: 'Profit Kotor (Total)', base: 0, delta: cum, end: cum, color: '#3498db', type: 'total' });
  for (const [k, v] of overheadItems) { const s = cum; cum -= v; steps.push({ name: k, base: Math.min(s, cum), delta: Math.abs(s - cum), end: cum, color: '#f39c12', type: 'neg' }); }
  for (const [k, v] of productionItems) { const s = cum; cum -= v; steps.push({ name: k, base: Math.min(s, cum), delta: Math.abs(s - cum), end: cum, color: '#8e44ad', type: 'neg' }); }
  steps.push({ name: 'Profit Bersih Proyek (per bulan)', base: 0, delta: cum, end: cum, color: '#1e88e5', type: 'total' });
  const data = steps.map((s) => ({ name: s.name, base: s.base, delta: s.delta, end: s.end, color: s.color, type: s.type }));
  const ohTip = 'Overhead proyek & beban produksi (kantor/koordinasi) bersifat tetap dan tidak dialokasikan per unit.';
  return (
    <section className="bg-white p-6 rounded-xl shadow-lg mb-12">
      <h2 className="text-2xl font-bold text-blue-900 text-center mb-6">Dampak Overhead & Beban Produksi (Gabungan 3 Unit) <InfoTooltip text={ohTip} /></h2>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 16, right: 24, left: 24, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(v) => formatCurrency(v, true)} domain={[0, (dataMax) => dataMax * 1.15]} />
          <Tooltip formatter={(val, key, { payload }) => (key === 'delta' ? `${payload.type === 'neg' ? '-' : '+'}${formatCurrency(payload.delta)}` : formatCurrency(val))} />
          <Bar dataKey="base" stackId="w" fill="rgba(0,0,0,0)" isAnimationActive={false} />
          <Bar dataKey="delta" stackId="w" isAnimationActive={false}>{data.map((e, i) => (<Cell key={i} fill={e.color} />))}</Bar>
          <Line type="linear" dataKey="end" stroke="#546e7a" dot={{ r: 2 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-500 mt-4 text-center italic">Overhead & beban produksi bersifat tetap di level proyek.</p>
    </section>
  );
};

// ==============================================
// PAGES
// ==============================================
const SummaryPage = ({ vatInclusive, applyVATToCashflow }) => {
  const MetricCard = ({ title, value, description, icon, tooltip }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center text-center transform hover:scale-105 transition-transform duration-300">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="text-xl font-bold text-gray-700 flex items-center">{title}{tooltip && <InfoTooltip text={tooltip} />}</h3>
      <p className="text-4xl font-extrabold text-blue-900 my-2">{value}</p>
      <p className="text-gray-500">{description}</p>
    </div>
  );

  const paybackT100Cash = paybackFromCumulative(T100_DATA.cashflowCash.map((d) => d.kumulatif));
  const paybackT100Leasing = paybackFromCumulative(T100_DATA.cashflowLeasing.map((d) => d.kumulatif));
  const irrT100Cash = irr(T100_DATA.cashflowCash.map((d) => d.arusKas));
  const npvT100Cash = (() => { const cf = T100_DATA.cashflowCash.map((d) => d.arusKas); return npv(monthlyRate, cf.slice(1)) + cf[0]; })();

  const irrTip = `IRR bulanan dihitung dari arus kas skema CASH (t0 investasi awal, t1..t36 arus kas operasi). Angka ditampilkan dalam %/bln. Perkiraan IRR tahunan ≈ (1 + IRR_bulanan)^12 − 1.`;
  const npvTip = `NPV (Cash) dihitung terhadap tingkat diskonto 18%/thn (≈ ${(monthlyRate * 100).toFixed(2)}%/bln). Rumus: Σ CF_t/(1+r)^t termasuk investasi awal (t0). NPV > 0 → proyek layak pada tingkat diskonto tsb.`;

  const comparisonData = [
    { name: T50_DATA.name, 'Target Omset': T50_DATA.targetOmset, 'Biaya Operasional': T50_DATA.biayaOperasional, 'Profit Kotor': T50_DATA.profitKotor },
    { name: T100_DATA.name, 'Target Omset': T100_DATA.targetOmset, 'Biaya Operasional': T100_DATA.biayaOperasional, 'Profit Kotor': T100_DATA.profitKotor },
  ];
  const profitComparisonData = [
    { name: T50_DATA.name, 'Profit Kotor': T50_DATA.profitKotor, 'Profit Bersih (Leasing)': T50_DATA.profitKotor - T50_DATA.skemaPembelian.leasing.cicilanPerBulan },
    { name: T100_DATA.name, 'Profit Kotor': T100_DATA.profitKotor, 'Profit Bersih (Leasing)': T100_DATA.profitKotor - T100_DATA.skemaPembelian.leasing.cicilanPerBulan },
  ];

  return (
    <>
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-900 tracking-tight">Ringkasan Eksekutif</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">Fokus pada DJI Agras T100 untuk profitabilitas dan pengembalian investasi yang superior.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <MetricCard title="Payback (Cash)" value={`${paybackT100Cash} bln`} description="Estimasi pengembalian modal." icon="⏱️" />
        <MetricCard title="Payback (Leasing)" value={`${paybackT100Leasing} bln`} description="Estimasi pengembalian modal pada skema leasing." icon="⏱️" />
        <MetricCard title="IRR (Cash)" value={irrT100Cash ? `${(irrT100Cash * 100).toFixed(1)}%/bln` : 'N/A'} description="Internal Rate of Return skema cash." icon="📈" tooltip={irrTip} />
        <MetricCard title="NPV (Cash)" value={formatCurrency(npvT100Cash)} description="Net Present Value skema cash." icon="💎" tooltip={npvTip} />
      </section>

      <CashflowSection title="Analisis Arus Kas T100 (Cash vs Leasing)" cashData={T100_DATA.cashflowCash} leasingData={T100_DATA.cashflowLeasing} perUnitSummary={T100_DATA} bebanProduksiBulanan={T100_DATA.bebanProduksiBulanan} vatInclusive={vatInclusive} applyVATToCashflow={applyVATToCashflow} />

      <WaterfallSection title="Waterfall Laba Rugi T100 (Per Unit)" omzet={T100_DATA.targetOmset} biayaMap={T100_DATA.biaya} />
      <ProjectWaterfallSection units={3} />

      <section className="bg-white p-6 rounded-xl shadow-lg mb-12">
        <h2 className="text-2xl font-bold text-blue-900 text-center mb-6">Perbandingan Kinerja Bulanan (Per Unit)</h2>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={comparisonData} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(v) => formatCurrency(v, true)} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="Target Omset" fill="#2ecc71" />
            <Bar dataKey="Biaya Operasional" fill="#e74c3c" />
            <Bar dataKey="Profit Kotor" fill="#3498db" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="bg-white p-6 rounded-xl shadow-lg mb-12">
        <h2 className="text-2xl font-bold text-blue-900 text-center mb-6">Profit Kotor vs Profit Bersih (Leasing)</h2>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={profitComparisonData} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(v) => formatCurrency(v, true)} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="Profit Kotor" fill="#3498db" />
            <Bar dataKey="Profit Bersih (Leasing)" fill="#f39c12" />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </>
  );
};

const DetailPage = () => {
  const DetailCard = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg w-full">
      <h3 className="text-2xl font-bold text-blue-900 mb-4 border-b-2 border-blue-200 pb-2">{title}</h3>
      {children}
    </div>
  );

  const BreakdownItem = ({ droneData }) => (
    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
      <h4 className="font-bold text-xl text-gray-800 text-center mb-2">{droneData.name}</h4>
      <div>
        <p className="font-semibold text-gray-600">Perhitungan Omset:</p>
        <p className="text-sm text-gray-500 pl-4">{`${droneData.produktivitasHaPerBulan} Ha/Bulan × ${formatCurrency(asumsiUmum['Harga Borongan / Ha'])}`}</p>
        <p className="text-lg font-bold text-green-700 pl-4">= {formatCurrency(droneData.targetOmset)}</p>
      </div>
      <div>
        <p className="font-semibold text-gray-600">Biaya Langsung per Unit:</p>
        <ul className="list-disc list-inside pl-4 text-sm space-y-1">
          {Object.entries(droneData.biaya).map(([key, value]) => (<li key={key}><span className="font-semibold">{key}:</span> {formatCurrency(value)}</li>))}
        </ul>
        <p className="text-lg font-bold text-red-700 pl-4 mt-1">= Total {formatCurrency(droneData.biayaOperasional)}</p>
      </div>
      <div>
        <p className="font-semibold text-gray-600">Profit Kotor per Unit:</p>
        <p className="text-sm text-gray-500 pl-4">{`${formatCurrency(droneData.targetOmset)} - ${formatCurrency(droneData.biayaOperasional)}`}</p>
        <p className="text-lg font-bold text-blue-800 pl-4">= {formatCurrency(droneData.profitKotor)}</p>
      </div>
    </div>
  );

  const AcquisitionCostItem = ({ droneData }) => (
    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
      <h4 className="font-bold text-xl text-gray-800 text-center mb-2">{droneData.name}</h4>
      <div>
        <h5 className="font-bold text-lg text-gray-700">Pembelian Cash</h5>
        <p className="text-2xl font-bold text-blue-800">{formatCurrency(droneData.skemaPembelian.cash)}</p>
      </div>
      <div className="border-t pt-4">
        <h5 className="font-bold text-lg text-gray-700">Skema Leasing</h5>
        <ul className="text-gray-600 space-y-1 mt-2">
          <li><strong>Uang Muka (DP):</strong> {formatCurrency(droneData.skemaPembelian.leasing.dp)}</li>
          <li><strong>Cicilan / Bulan:</strong> {formatCurrency(droneData.skemaPembelian.leasing.cicilanPerBulan)}</li>
          <li><strong>Tenor:</strong> {droneData.skemaPembelian.leasing.tenorBulan} bulan</li>
        </ul>
        <div className="mt-3 bg-gray-100 p-3 rounded-md">
          <p className="font-semibold text-gray-800">Total Biaya Leasing:</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(droneData.skemaPembelian.leasing.dp + droneData.skemaPembelian.leasing.cicilanPerBulan * droneData.skemaPembelian.leasing.tenorBulan)}</p>
          <p className="text-xs text-gray-500">(Total = DP + Σ cicilan)</p>
        </div>
      </div>
    </div>
  );

  const ProductionExpenseCard = ({ label, monthlyMap }) => (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-bold text-xl text-gray-800 mb-2">{label}</h4>
      <ul className="list-disc list-inside text-sm space-y-1">
        {Object.entries(monthlyMap).map(([k, v]) => (<li key={k}><span className="font-semibold">{k}:</span> {formatCurrency(v)} / bulan</li>))}
      </ul>
      <p className="text-xs text-gray-500 italic mt-2">Sumber: total 36 bulan pada Excel → dibagi 36 untuk estimasi bulanan. Tidak dialokasikan per unit.</p>
    </div>
  );

  const OverheadProjectCard = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg w-full">
      <h3 className="text-2xl font-bold text-blue-900 mb-4 border-b-2 border-blue-200 pb-2">Overhead Proyek (Tetap, tidak dibagi)</h3>
      <ul className="list-disc list-inside text-sm space-y-1">
        {Object.entries(PROJECT_OVERHEAD).map(([k, v]) => (<li key={k}><span className="font-semibold">{k}:</span> {formatCurrency(v)} / bulan</li>))}
      </ul>
      <p className="text-xs text-gray-500 italic mt-2">Overhead ini tidak dimasukkan ke perhitungan per unit.</p>
    </div>
  );

  return (
    <>
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-900 tracking-tight">Analisis Rinci</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">Membedah angka di balik proyeksi untuk pengambilan keputusan yang informatif.</p>
      </header>

      <div className="space-y-8">
        <DetailCard title="Rincian Perhitungan per Unit (Berdasarkan Sheet Analisa)"><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><BreakdownItem droneData={T50_DATA} /><BreakdownItem droneData={T100_DATA} /></div></DetailCard>
        <DetailCard title="Analisis Biaya Akuisisi per Unit (Cash vs. Leasing)"><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><AcquisitionCostItem droneData={T50_DATA} /><AcquisitionCostItem droneData={T100_DATA} /></div></DetailCard>
        {/* ✨ Tambahan: Beban Produksi (biaya kantor & koordinasi, SAMA untuk T50 & T100) */}
        <DetailCard title="Beban Produksi Bulanan (Proyek)"><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><ProductionExpenseCard label="Skenario T50 (Per Bulan)" monthlyMap={T50_DATA.bebanProduksiBulanan} /><ProductionExpenseCard label="Skenario T100 (Per Bulan)" monthlyMap={T100_DATA.bebanProduksiBulanan} /><OverheadProjectCard /></div></DetailCard>
        <DetailCard title="Asumsi Operasional Utama"><div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">{Object.entries(asumsiUmum).map(([key, value]) => (<div key={key} className="bg-gray-50 p-4 rounded-lg"><p className="text-gray-500 font-semibold">{key}</p><p className="text-blue-900 text-2xl font-bold">{key.includes('Harga') ? formatCurrency(value) : key.includes('Hari Kerja') ? `${value} hari` : value}</p></div>))}</div></DetailCard>
      </div>
    </>
  );
};

const RiskPage = () => {
  const riskData = [
    { category: 'Risiko Operasional', icon: '⚙️', points: [
      { risk: 'Kerusakan alat / drone', mitigation: 'Perawatan preventif; stok suku cadang kritis; unit cadangan.' },
      { risk: 'Kecelakaan kerja', mitigation: 'Pelatihan K3 & APD.' },
      { risk: 'Cuaca ekstrem', mitigation: 'Monitoring cuaca & penjadwalan fleksibel.' },
      { risk: 'Keterampilan operator', mitigation: 'Sertifikasi & pelatihan berkelanjutan.' },
    ]},
    { category: 'Risiko Pasar & Kompetisi', icon: '📈', points: [
      { risk: 'Penurunan permintaan', mitigation: 'Diversifikasi klien & kontrak jangka panjang.' },
      { risk: 'Perang harga', mitigation: 'Kualitas layanan & reputasi.' },
      { risk: 'Akuisisi kontrak baru', mitigation: 'Pemasaran proaktif & kemitraan.' },
    ]},
    { category: 'Risiko Keuangan', icon: '🏦', points: [
      { risk: 'Kenaikan biaya operasional', mitigation: 'Kontrak BBM volume & optimasi rute.' },
      { risk: 'Pembayaran klien terlambat', mitigation: 'DP, penalti telat, insentif early payment.' },
      { risk: 'Arus kas awal negatif', mitigation: 'Buffer modal kerja 3–6 bulan.' },
    ]},
  ];

  const RiskCard = ({ category, icon, points }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg w-full">
      <h3 className="text-2xl font-bold text-blue-900 mb-4 flex items-center"><span className="text-3xl mr-3">{icon}</span>{category}</h3>
      <div className="space-y-4">{points.map((p, i) => (<div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4"><div><p className="font-semibold text-gray-700">Risiko:</p><p className="text-gray-600">{p.risk}</p></div><div className="bg-blue-50 p-3 rounded-lg"><p className="font-semibold text-blue-800">Mitigasi:</p><p className="text-blue-700">{p.mitigation}</p></div></div>))}</div>
    </div>
  );

  return (
    <>
      <header className="text-center mb-10"><h1 className="text-4xl sm:text-5xl font-extrabold text-blue-900 tracking-tight">Manajemen Risiko & Mitigasi</h1><p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">Mengidentifikasi potensi tantangan & strategi proaktif.</p></header>
      <div className="space-y-8">{riskData.map((d) => (<RiskCard key={d.category} {...d} />))}</div>
    </>
  );
};

// ==============================================
// ROOT APP
// ==============================================
export default function App() {
  const [activePage, setActivePage] = useState('summary');
  const [vatInclusive, setVatInclusive] = useState(false);
  const [applyVATToCashflow, setApplyVATToCashflow] = useState(false);

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <nav className="flex justify-center items-center mb-8 bg-white p-2 rounded-lg shadow-md space-x-2 flex-wrap">
          <NavButton onClick={() => setActivePage('summary')} isActive={activePage === 'summary'}>Ringkasan Eksekutif</NavButton>
          <NavButton onClick={() => setActivePage('details')} isActive={activePage === 'details'}>Analisis Rinci</NavButton>
          <NavButton onClick={() => setActivePage('risks')} isActive={activePage === 'risks'}>Manajemen Risiko</NavButton>
        </nav>

        <div className="bg-white p-3 rounded-lg shadow-sm mb-6 flex flex-wrap items-center justify-center gap-4">
          <Toggle label={`Omzet ${vatInclusive ? 'TERMASUK' : 'TIDAK termasuk'} PPN (11%)`} checked={vatInclusive} onChange={setVatInclusive} />
          <Toggle label="Kurangi arus kas dengan PPN Keluaran" checked={applyVATToCashflow} onChange={setApplyVATToCashflow} />
        </div>

        <main>
          {activePage === 'summary' && <SummaryPage vatInclusive={vatInclusive} applyVATToCashflow={applyVATToCashflow} />}
          {activePage === 'details' && <DetailPage />}
          {activePage === 'risks' && <RiskPage />}
        </main>

        <footer className="text-center mt-12 text-gray-500"><p>&copy; 2025 Proyeksi Investasi Drone Agraris. Data di-hardcode dari Excel.</p></footer>
      </div>
    </div>
  );
}
