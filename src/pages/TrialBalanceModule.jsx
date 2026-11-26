import React, { useState, useMemo } from 'react';
import {
  Scale,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { formatRupiah } from '../lib/taxRules';
import { buildTrialBalance } from '../lib/accountingService';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function TrialBalanceModule({
  coaList = [],
  journalEntries = [],
  onDrillDownLedger
}) {
  const now = new Date();
  const [periodMode, setPeriodMode] = useState('monthly'); // 'monthly' | 'quarterly' | 'yearly' | 'custom'
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [customStart, setCustomStart] = useState(`${now.getFullYear()}-01-01`);
  const [customEnd, setCustomEnd] = useState(`${now.getFullYear()}-12-31`);
  const [hideZeroRows, setHideZeroRows] = useState(false);

  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (periodMode === 'monthly') {
      const mm = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      return {
        startDate: `${year}-${mm}-01`,
        endDate: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
        periodLabel: `Bulan ${MONTHS[month - 1]} ${year}`
      };
    }
    if (periodMode === 'quarterly') {
      const startM = (quarter - 1) * 3 + 1;
      const endM = quarter * 3;
      const lastDay = new Date(year, endM, 0).getDate();
      return {
        startDate: `${year}-${String(startM).padStart(2, '0')}-01`,
        endDate: `${year}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
        periodLabel: `Triwulan Q${quarter} ${year}`
      };
    }
    if (periodMode === 'yearly') {
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        periodLabel: `Tahun Buku ${year}`
      };
    }
    return {
      startDate: customStart,
      endDate: customEnd,
      periodLabel: `${customStart} s/d ${customEnd}`
    };
  }, [periodMode, year, month, quarter, customStart, customEnd]);

  const tb = useMemo(
    () => buildTrialBalance({ coaList, journalEntries, startDate, endDate }),
    [coaList, journalEntries, startDate, endDate]
  );

  const displayedRows = useMemo(
    () => (hideZeroRows ? tb.rows.filter(r => r.hasActivity) : tb.rows),
    [tb.rows, hideZeroRows]
  );

  const handleExportCSV = () => {
    const headers = ['Kode Akun,Nama Akun,Saldo Awal Debit,Saldo Awal Kredit,Mutasi Debit,Mutasi Kredit,Saldo Akhir Debit,Saldo Akhir Kredit'];
    const rows = displayedRows.map(r =>
      `"${r.code}","${r.name}","${r.openDebit}","${r.openCredit}","${r.mutDebit}","${r.mutCredit}","${r.endDebit}","${r.endCredit}"`
    );
    const totalRow = `"TOTAL","","${tb.totals.openDebit}","${tb.totals.openCredit}","${tb.totals.mutDebit}","${tb.totals.mutCredit}","${tb.totals.endDebit}","${tb.totals.endCredit}"`;
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows, totalRow].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Neraca_Saldo_${startDate}_sd_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Neraca Saldo (Trial Balance)</h2>
            <p className="text-xs text-slate-500">
              Ikhtisar keseimbangan saldo awal, mutasi, dan saldo akhir seluruh akun Buku Besar • {periodLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor Excel (CSV)
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Period Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'monthly', label: 'Bulanan' },
              { id: 'quarterly', label: 'Triwulanan' },
              { id: 'yearly', label: 'Tahunan' },
              { id: 'custom', label: 'Kustom' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setPeriodMode(m.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  periodMode === m.id ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {periodMode !== 'custom' && (
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-20 px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg"
            />
          )}

          {periodMode === 'monthly' && (
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
            >
              {MONTHS.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>{mName}</option>
              ))}
            </select>
          )}

          {periodMode === 'quarterly' && (
            <select
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
            >
              <option value={1}>Q1 (Jan - Mar)</option>
              <option value={2}>Q2 (Apr - Jun)</option>
              <option value={3}>Q3 (Jul - Sep)</option>
              <option value={4}>Q4 (Okt - Des)</option>
            </select>
          )}

          {periodMode === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              />
            </div>
          )}
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={hideZeroRows}
            onChange={(e) => setHideZeroRows(e.target.checked)}
            className="rounded border-slate-300 text-teal-600"
          />
          <span>Sembunyikan akun bersaldo 0</span>
        </label>
      </div>

      {/* Automatic Validation Banner */}
      {tb.isBalanced ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>
              Neraca Saldo SEIMBANG — Total Saldo Akhir Debit = Total Saldo Akhir Kredit = {formatRupiah(tb.totals.endDebit)}
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
            SIAP UNTUK PENYESUAIAN / CLOSING
          </span>
        </div>
      ) : (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2 text-xs text-rose-900">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-extrabold">
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>
                PERINGATAN AKUNTANSI: Neraca Saldo TIDAK SEIMBANG pada {periodLabel} (Selisih: {formatRupiah(tb.diffEnd)}). Proses Closing DIBLOKIR!
              </span>
            </div>
          </div>
          {tb.unbalancedJournals.length > 0 && (
            <div className="pl-7 text-[11px] text-rose-800">
              Jurnal terdeteksi tidak seimbang:{' '}
              {tb.unbalancedJournals.map(j => j.entryNumber).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Trial Balance 8-Column Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
                <th rowSpan={2} className="py-3 px-3 border-r border-slate-700">Kode</th>
                <th rowSpan={2} className="py-3 px-3 border-r border-slate-700">Nama Akun</th>
                <th colSpan={2} className="py-2 px-3 text-center border-b border-r border-slate-700 bg-slate-800">Saldo Awal</th>
                <th colSpan={2} className="py-2 px-3 text-center border-b border-r border-slate-700 bg-slate-800">Mutasi Periode</th>
                <th colSpan={2} className="py-2 px-3 text-center border-b border-slate-700 bg-teal-900">Saldo Akhir</th>
              </tr>
              <tr className="bg-slate-800 text-slate-200 text-[10px] uppercase tracking-wider">
                <th className="py-2 px-3 text-right border-r border-slate-700">Debit</th>
                <th className="py-2 px-3 text-right border-r border-slate-700">Kredit</th>
                <th className="py-2 px-3 text-right border-r border-slate-700">Debit</th>
                <th className="py-2 px-3 text-right border-r border-slate-700">Kredit</th>
                <th className="py-2 px-3 text-right border-r border-slate-700 bg-teal-950/60">Debit</th>
                <th className="py-2 px-3 text-right bg-teal-950/60">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRows.map(row => (
                <tr
                  key={row.code}
                  onClick={() => onDrillDownLedger?.(row.code, startDate, endDate)}
                  className="hover:bg-teal-50/50 transition cursor-pointer group"
                  title="Klik untuk membuka Buku Besar akun ini"
                >
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{row.code}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800 flex items-center gap-1.5">
                    <span>{row.name}</span>
                    <ExternalLink className="w-3 h-3 text-teal-600 opacity-0 group-hover:opacity-100 transition no-print" />
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">{row.openDebit > 0 ? formatRupiah(row.openDebit) : '–'}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">{row.openCredit > 0 ? formatRupiah(row.openCredit) : '–'}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-700">{row.mutDebit > 0 ? formatRupiah(row.mutDebit) : '–'}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{row.mutCredit > 0 ? formatRupiah(row.mutCredit) : '–'}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 bg-teal-50/30">{row.endDebit > 0 ? formatRupiah(row.endDebit) : '–'}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 bg-teal-50/30">{row.endCredit > 0 ? formatRupiah(row.endCredit) : '–'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-[11px]">
                <td colSpan={2} className="py-3 px-3 uppercase tracking-wider">TOTAL NERACA SALDO</td>
                <td className="py-3 px-3 text-right font-mono">{formatRupiah(tb.totals.openDebit)}</td>
                <td className="py-3 px-3 text-right font-mono">{formatRupiah(tb.totals.openCredit)}</td>
                <td className="py-3 px-3 text-right font-mono text-blue-200">{formatRupiah(tb.totals.mutDebit)}</td>
                <td className="py-3 px-3 text-right font-mono text-emerald-200">{formatRupiah(tb.totals.mutCredit)}</td>
                <td className="py-3 px-3 text-right font-mono text-teal-300">{formatRupiah(tb.totals.endDebit)}</td>
                <td className="py-3 px-3 text-right font-mono text-teal-300">{formatRupiah(tb.totals.endCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
