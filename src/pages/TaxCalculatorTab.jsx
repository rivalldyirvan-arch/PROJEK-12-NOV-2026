import React, { useState } from 'react';
import { Calculator, ArrowRight, ShieldCheck, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { formatRupiah, calculateTax } from '../lib/taxRules';

export default function TaxCalculatorTab() {
  const [activeTax, setActiveTax] = useState('PPh 23');

  // PPh 21 inputs
  const [pph21Scheme, setPph21Scheme] = useState('tenaga_ahli'); // 'tenaga_ahli', 'ter_pegawai', 'bukan_pegawai'
  const [pph21Gross, setPph21Gross] = useState(20000000);
  const [pph21HasNpwp, setPph21HasNpwp] = useState(true);
  const [pph21Method, setPph21Method] = useState('gross'); // 'gross', 'gross_up'

  // PPh 22 inputs
  const [pph22Category, setPph22Category] = useState('bumn'); // 'bumn' (1.5%), 'impor_api' (2.5%), 'impor_non_api' (7.5%), 'industri' (0.3%)
  const [pph22Gross, setPph22Gross] = useState(50000000);
  const [pph22HasNpwp, setPph22HasNpwp] = useState(true);

  // PPh 23 inputs
  const [pph23Category, setPph23Category] = useState('jasa'); // 'jasa' (2%), 'sewa' (2%), 'royalti' (15%)
  const [pph23Gross, setPph23Gross] = useState(15000000);
  const [pph23HasNpwp, setPph23HasNpwp] = useState(true);

  // PPh 25 inputs
  const [pph25Type, setPph25Type] = useState('badan'); // 'badan' (annual/12), 'oppt' (0.75% omzet)
  const [pph25AnnualTax, setPph25AnnualTax] = useState(120000000);
  const [pph25Credits, setPph25Credits] = useState(24000000);
  const [pph25MonthlyRevenue, setPph25MonthlyRevenue] = useState(50000000);

  // PPh 4(2) inputs
  const [pph42Category, setPph42Category] = useState('sewa_tanah_gedung'); // 'sewa_tanah_gedung' (10%), 'konstruksi_kecil' (1.75%), 'konstruksi_menengah' (2.65%), 'tanah_jual' (2.5%), 'umkm' (0.5%)
  const [pph42Gross, setPph42Gross] = useState(60000000);

  // --- CALCULATION LOGIC ---

  // PPh 21 Calculation
  let pph21Dpp = pph21Gross;
  let pph21Rate = 5;
  let pph21Tax = 0;
  let pph21NetReceived = 0;

  if (pph21Scheme === 'tenaga_ahli' || pph21Scheme === 'bukan_pegawai') {
    pph21Dpp = pph21Gross * 0.5; // DPP 50%
    pph21Rate = 5; // Tier 1 Ps 17 (0 - 60jt)
    let effRate = pph21HasNpwp ? pph21Rate : pph21Rate * 1.2; // 20% higher without NPWP
    pph21Tax = Math.round((pph21Dpp * effRate) / 100);
    pph21NetReceived = pph21Gross - pph21Tax;
  } else {
    // TER Pegawai Tetap Kategori A (sample)
    if (pph21Gross <= 5400000) pph21Rate = 0;
    else if (pph21Gross <= 5650000) pph21Rate = 0.25;
    else if (pph21Gross <= 5950000) pph21Rate = 0.5;
    else if (pph21Gross <= 6300000) pph21Rate = 0.75;
    else if (pph21Gross <= 6750000) pph21Rate = 1.0;
    else if (pph21Gross <= 7500000) pph21Rate = 1.25;
    else if (pph21Gross <= 8550000) pph21Rate = 1.5;
    else if (pph21Gross <= 9650000) pph21Rate = 1.75;
    else if (pph21Gross <= 10050000) pph21Rate = 2.0;
    else if (pph21Gross <= 10350000) pph21Rate = 2.25;
    else if (pph21Gross <= 10700000) pph21Rate = 2.5;
    else if (pph21Gross <= 11050000) pph21Rate = 3.0;
    else if (pph21Gross <= 11600000) pph21Rate = 3.5;
    else if (pph21Gross <= 12500000) pph21Rate = 4.0;
    else if (pph21Gross <= 13750000) pph21Rate = 5.0;
    else pph21Rate = 7.0;

    let effRate = pph21HasNpwp ? pph21Rate : pph21Rate * 1.2;
    pph21Tax = Math.round((pph21Gross * effRate) / 100);
    pph21NetReceived = pph21Gross - pph21Tax;
  }

  // PPh 22 Calculation
  let pph22Rate = 1.5;
  if (pph22Category === 'impor_api') pph22Rate = 2.5;
  else if (pph22Category === 'impor_non_api') pph22Rate = 7.5;
  else if (pph22Category === 'industri') pph22Rate = 0.3;

  let pph22EffRate = pph22HasNpwp ? pph22Rate : pph22Rate * 2.0; // 100% higher
  let pph22Tax = Math.round((pph22Gross * pph22EffRate) / 100);
  let pph22NetReceived = pph22Gross - pph22Tax;

  // PPh 23 Calculation
  let pph23Rate = 2.0;
  if (pph23Category === 'royalti') pph23Rate = 15.0;

  let pph23EffRate = pph23HasNpwp ? pph23Rate : pph23Rate * 2.0; // 100% higher without NPWP
  let pph23Tax = Math.round((pph23Gross * pph23EffRate) / 100);
  let pph23NetReceived = pph23Gross - pph23Tax;

  // PPh 25 Calculation
  let pph25MonthlyTax = 0;
  if (pph25Type === 'badan') {
    const netAnnualTax = Math.max(0, pph25AnnualTax - pph25Credits);
    pph25MonthlyTax = Math.round(netAnnualTax / 12);
  } else {
    pph25MonthlyTax = Math.round((pph25MonthlyRevenue * 0.75) / 100);
  }

  // PPh 4(2) Calculation
  let pph42Rate = 10.0;
  if (pph42Category === 'konstruksi_kecil') pph42Rate = 1.75;
  else if (pph42Category === 'konstruksi_menengah') pph42Rate = 2.65;
  else if (pph42Category === 'tanah_jual') pph42Rate = 2.5;
  else if (pph42Category === 'umkm') pph42Rate = 0.5;

  let pph42Tax = Math.round((pph42Gross * pph42Rate) / 100);
  let pph42NetReceived = pph42Gross - pph42Tax;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-xl">
            <Calculator className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Kalkulator & Simulator Pajak Indonesia (DJP)</h2>
            <p className="text-xs text-emerald-100">
              Simulasi perhitungan cepat pemotongan PPh 21, PPh 22, PPh 23, Angsuran PPh 25, & PPh Final Pasal 4 Ayat (2)
            </p>
          </div>
        </div>
      </div>

      {/* Tax Switcher Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {['PPh 21', 'PPh 22', 'PPh 23', 'PPh 25', 'PPh 4(2)'].map((tax) => (
          <button
            key={tax}
            onClick={() => setActiveTax(tax)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTax === tax
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>{tax}</span>
            {activeTax === tax && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>
        ))}
      </div>

      {/* Calculator Body */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {/* TAB 1: PPH 21 */}
        {activeTax === 'PPh 21' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inputs */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Parameter Perhitungan PPh 21
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Skema Pemotongan
                  </label>
                  <select
                    value={pph21Scheme}
                    onChange={(e) => setPph21Scheme(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="tenaga_ahli">Tenaga Ahli (Arsitek, Pengacara, Konsultan, Dokter) - DPP 50%</option>
                    <option value="bukan_pegawai">Bukan Pegawai (Imbalan Jasa Perorangan) - DPP 50%</option>
                    <option value="ter_pegawai">Pegawai Tetap (Tarif Efektif Rata-Rata / TER PP 58/2023)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Penghasilan Bruto (Rp)
                  </label>
                  <input
                    type="number"
                    value={pph21Gross}
                    onChange={(e) => setPph21Gross(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pph21HasNpwp}
                      onChange={(e) => setPph21HasNpwp(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>Memiliki NPWP Valid</span>
                  </label>
                  {!pph21HasNpwp && (
                    <p className="text-[11px] text-amber-700 font-medium">
                      ⚠️ Tanpa NPWP dikenakan tarif 20% lebih tinggi dari tarif normal.
                    </p>
                  )}
                </div>
              </div>

              {/* Result Summary */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hasil Simulasi PPh 21</h4>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Penghasilan Bruto:</span>
                      <span className="font-mono font-bold">{formatRupiah(pph21Gross)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Dasar Pengenaan Pajak (DPP):</span>
                      <span className="font-mono font-bold text-slate-800">{formatRupiah(pph21Dpp)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tarif Pajak Efektif:</span>
                      <span className="font-bold text-purple-700">{pph21HasNpwp ? pph21Rate : (pph21Rate * 1.2).toFixed(2)}%</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-slate-900 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Potongan PPh 21:</span>
                      <span className="text-base font-extrabold text-purple-700 font-mono">
                        {formatRupiah(pph21Tax)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-800">
                      <span className="text-xs font-bold">Net Diterima Tenaga Kerja:</span>
                      <span className="text-base font-extrabold font-mono">
                        {formatRupiah(pph21NetReceived)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-200">
                  Dasar Hukum: UU HPP & PP 58 Tahun 2023 (TER) / PMK 168/2023.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PPH 22 */}
        {activeTax === 'PPh 22' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Parameter PPh Pasal 22</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Transaksi Pengadaan
                  </label>
                  <select
                    value={pph22Category}
                    onChange={(e) => setPph22Category(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="bumn">Pembelian Barang oleh Bendaharawan / BUMN (1.5%)</option>
                    <option value="impor_api">Impor Barang dengan API (2.5%)</option>
                    <option value="impor_non_api">Impor Barang Tanpa API (7.5%)</option>
                    <option value="industri">Penjualan Industri Tertentu (Semen, Kertas, Baja) (0.3%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nilai Pembelian / Bruto (Rp)
                  </label>
                  <input
                    type="number"
                    value={pph22Gross}
                    onChange={(e) => setPph22Gross(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pph22HasNpwp}
                      onChange={(e) => setPph22HasNpwp(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 w-4 h-4"
                    />
                    <span>Vendor Memiliki NPWP</span>
                  </label>
                  {!pph22HasNpwp && (
                    <p className="text-[11px] text-amber-700 font-medium">
                      ⚠️ Tanpa NPWP dikenakan tarif 100% lebih tinggi ({pph22Rate * 2}%).
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hasil PPh 22</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Nilai Transaksi (DPP):</span>
                      <span className="font-mono font-bold">{formatRupiah(pph22Gross)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tarif PPh 22 Diterapkan:</span>
                      <span className="font-bold text-amber-700">{pph22EffRate}%</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-slate-900 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Pajak Dipungut (PPh 22):</span>
                      <span className="text-base font-extrabold text-amber-700 font-mono">
                        {formatRupiah(pph22Tax)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-800">
                      <span className="text-xs font-bold">Net Dibayar ke Supplier:</span>
                      <span className="text-base font-extrabold font-mono">
                        {formatRupiah(pph22NetReceived)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-200">
                  DJP PMK 34/PMK.010/2017 stdd PMK 41/PMK.010/2022.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PPH 23 */}
        {activeTax === 'PPh 23' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Parameter PPh Pasal 23</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Objek PPh 23
                  </label>
                  <select
                    value={pph23Category}
                    onChange={(e) => setPph23Category(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="jasa">Jasa Teknik, Manajemen, Konsultan, IT & Jasa Lainnya (2%)</option>
                    <option value="sewa">Sewa & Penghasilan Penggunaan Harta selain Tanah/Bangunan (2%)</option>
                    <option value="royalti">Royalti, Hadiah, Penghargaan, Dividen OP, Bunga (15%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nilai Imbalan Jasa / Bruto (Rp)
                  </label>
                  <input
                    type="number"
                    value={pph23Gross}
                    onChange={(e) => setPph23Gross(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pph23HasNpwp}
                      onChange={(e) => setPph23HasNpwp(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 w-4 h-4"
                    />
                    <span>Vendor Memiliki NPWP</span>
                  </label>
                  {!pph23HasNpwp && (
                    <p className="text-[11px] text-rose-700 font-medium">
                      ⚠️ Sanksi Non-NPWP: Tarif naik 100% menjadi {pph23Rate * 2}%!
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hasil PPh 23</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Nilai Bruto Jasa (DPP):</span>
                      <span className="font-mono font-bold">{formatRupiah(pph23Gross)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tarif Dipotong:</span>
                      <span className="font-bold text-emerald-700">{pph23EffRate}%</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-slate-900 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">PPh 23 Dipotong:</span>
                      <span className="text-base font-extrabold text-emerald-700 font-mono">
                        {formatRupiah(pph23Tax)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-800">
                      <span className="text-xs font-bold">Net Dibayar ke Vendor:</span>
                      <span className="text-base font-extrabold font-mono">
                        {formatRupiah(pph23NetReceived)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-200">
                  Dasar Hukum: Pasal 23 UU PPh & PMK 141/PMK.03/2015. Wajib setor tgl 15 bulan berikutnya.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PPH 25 */}
        {activeTax === 'PPh 25' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Parameter Angsuran PPh 25</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Wajib Pajak
                  </label>
                  <select
                    value={pph25Type}
                    onChange={(e) => setPph25Type(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="badan">Wajib Pajak Badan (Berdasarkan SPT Tahunan Tahun Lalu)</option>
                    <option value="oppt">Wajib Pajak Orang Pribadi Pengusaha Tertentu (0.75% Omzet)</option>
                  </select>
                </div>

                {pph25Type === 'badan' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pajak Terutang SPT Tahunan Tahun Lalu (Rp)
                      </label>
                      <input
                        type="number"
                        value={pph25AnnualTax}
                        onChange={(e) => setPph25AnnualTax(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Total Kredit Pajak (PPh 22, 23, 24) (Rp)
                      </label>
                      <input
                        type="number"
                        value={pph25Credits}
                        onChange={(e) => setPph25Credits(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Peredaran Bruto / Omzet Bulan Berjalan (Rp)
                    </label>
                    <input
                      type="number"
                      value={pph25MonthlyRevenue}
                      onChange={(e) => setPph25MonthlyRevenue(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hasil Angsuran PPh 25</h4>
                  <div className="space-y-2 text-xs">
                    {pph25Type === 'badan' ? (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>Pajak Terutang Tahunan:</span>
                          <span className="font-mono font-bold">{formatRupiah(pph25AnnualTax)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Kredit Pajak (22, 23, 24):</span>
                          <span className="font-mono text-rose-600">- {formatRupiah(pph25Credits)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-200 pt-1">
                          <span>Dasar Angsuran (12 Bulan):</span>
                          <span className="font-mono">{formatRupiah(pph25AnnualTax - pph25Credits)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-600">
                        <span>Omzet Bulanan:</span>
                        <span className="font-mono font-bold">{formatRupiah(pph25MonthlyRevenue)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t-2 border-slate-900 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Angsuran PPh 25 Wajib Setor / Bulan:</span>
                      <span className="text-base font-extrabold text-indigo-700 font-mono">
                        {formatRupiah(pph25MonthlyTax)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-200">
                  Jatuh tempo pembayaran tanggal 15 bulan kalender berikutnya. Pelaporan nihil jika sudah tervalidasi NTPN.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PPH 4(2) FINAL */}
        {activeTax === 'PPh 4(2)' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Parameter PPh Final Pasal 4 Ayat (2)</h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Objek Pajak Final
                  </label>
                  <select
                    value={pph42Category}
                    onChange={(e) => setPph42Category(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="sewa_tanah_gedung">Sewa Tanah dan/atau Bangunan Kantor / Ruko (10%)</option>
                    <option value="konstruksi_kecil">Jasa Pelaksana Konstruksi Kualifikasi Kecil (1.75%)</option>
                    <option value="konstruksi_menengah">Jasa Pelaksana Konstruksi Kualifikasi Menengah/Besar (2.65%)</option>
                    <option value="tanah_jual">Pengalihan Hak atas Tanah & Bangunan (2.5%)</option>
                    <option value="umkm">Peredaran Bruto Tertentu / UMKM PP 55 (0.5%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nilai Bruto Transaksi / Sewa (Rp)
                  </label>
                  <input
                    type="number"
                    value={pph42Gross}
                    onChange={(e) => setPph42Gross(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hasil PPh 4 Ayat (2)</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Nilai Bruto Transaksi:</span>
                      <span className="font-mono font-bold">{formatRupiah(pph42Gross)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tarif Final:</span>
                      <span className="font-bold text-rose-700">{pph42Rate}%</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-slate-900 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">PPh Final Terutang / Dipotong:</span>
                      <span className="text-base font-extrabold text-rose-700 font-mono">
                        {formatRupiah(pph42Tax)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-800">
                      <span className="text-xs font-bold">Net Dibayar ke Pemilik / Rekanan:</span>
                      <span className="text-base font-extrabold font-mono">
                        {formatRupiah(pph42NetReceived)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-200">
                  PPh Final bersifat final dan tidak dapat dikreditkan dalam SPT Tahunan Badan.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

