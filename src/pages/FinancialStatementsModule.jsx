import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Scale, ArrowUpRight, ArrowDownRight,
  FileText, Download, Printer, RefreshCw, ChevronRight, AlertTriangle,
  CheckCircle, Info, DollarSign, PieChart, Activity, Layers, FileSpreadsheet,
  Calendar, Eye, ChevronDown, ChevronUp, Minus
} from 'lucide-react';
import {
  buildIncomeStatement,
  buildBalanceSheet,
  buildEquityStatement,
  buildCashFlowStatement,
  calculateFinancialRatios,
  formatPeriodName
} from '../lib/accountingService';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n, fallback = '-') => {
  if (n === null || n === undefined || isNaN(n)) return fallback;
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(Math.round(n));
};
const fmtRp = (n, fallback = '-') => {
  if (n === null || n === undefined || isNaN(n)) return fallback;
  const abs = Math.abs(Math.round(n));
  const str = `Rp ${new Intl.NumberFormat('id-ID').format(abs)}`;
  return n < 0 ? `(${str})` : str;
};
const fmtPct = (n, dec = 1) => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return `${n.toFixed(dec)}%`;
};
const fmtX = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return `${n.toFixed(2)}x`;
};
const fmtDays = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return `${Math.round(n)} hari`;
};
const today = () => new Date().toISOString().slice(0, 10);
const firstDayOfYear = () => `${new Date().getFullYear()}-01-01`;

// Badge warna
const badge = (val, good, warn) => {
  if (val === null || val === undefined || isNaN(val)) return 'bg-slate-100 text-slate-500';
  if (val >= good) return 'bg-emerald-100 text-emerald-800';
  if (val >= warn) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-700';
};

// Row komponen laporan laba rugi
function LRRow({ label, amount, indent = 0, bold = false, border = false, highlight = false, className = '' }) {
  const isNeg = amount < 0;
  return (
    <tr className={`${highlight ? 'bg-emerald-50' : ''} ${border ? 'border-t-2 border-slate-300' : ''}`}>
      <td className={`py-1.5 text-xs text-slate-700 ${bold ? 'font-bold' : ''}`} style={{ paddingLeft: `${(indent * 16) + 12}px` }}>
        {label}
      </td>
      <td className={`py-1.5 text-xs text-right pr-4 font-mono ${bold ? 'font-bold' : ''} ${isNeg ? 'text-red-600' : 'text-slate-800'} ${className}`}>
        {fmtRp(amount)}
      </td>
    </tr>
  );
}

// Row balance sheet
function BSRow({ label, amount, indent = 0, bold = false, highlight = false }) {
  return (
    <tr className={highlight ? 'bg-slate-50' : ''}>
      <td className={`py-1.5 text-xs ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`} style={{ paddingLeft: `${(indent * 16) + 12}px` }}>
        {label}
      </td>
      <td className={`py-1.5 text-xs text-right pr-4 font-mono ${bold ? 'font-bold text-slate-900' : 'text-slate-800'}`}>
        {amount !== undefined && amount !== null ? fmtRp(amount) : ''}
      </td>
    </tr>
  );
}

// Kartu ringkasan
function SummaryCard({ label, value, sub, icon: Icon, color = 'emerald', trend }) {
  const colorMap = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700'
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]} flex items-start gap-3`}>
      <div className="mt-0.5">
        <Icon className="w-4 h-4 opacity-70" />
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
        <div className="text-base font-bold mt-0.5">{value}</div>
        {sub && <div className="text-[10px] mt-0.5 opacity-60">{sub}</div>}
        {trend !== undefined && (
          <div className={`text-[10px] mt-1 flex items-center gap-1 font-semibold ${trend >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {fmtPct(trend)}
          </div>
        )}
      </div>
    </div>
  );
}

// Rasio baris
function RatioRow({ label, value, display, good, warn, interpretation }) {
  const cls = badge(typeof value === 'number' ? value : null, good, warn);
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="py-2.5 text-xs text-slate-700 pl-3">{label}</td>
      <td className="py-2.5 text-center">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{display}</span>
      </td>
      <td className="py-2.5 text-[10px] text-slate-500 pr-3 text-right">{interpretation || '-'}</td>
    </tr>
  );
}

// ─── Komponen Tab ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'income', label: 'Laba Rugi', icon: TrendingUp },
  { id: 'balance', label: 'Neraca', icon: Scale },
  { id: 'equity', label: 'Perubahan Ekuitas', icon: Layers },
  { id: 'cashflow', label: 'Arus Kas', icon: Activity },
  { id: 'ratios', label: 'Analisis & Rasio', icon: BarChart3 },
  { id: 'notes', label: 'CALK', icon: FileText },
];

// ─── MAIN MODULE ─────────────────────────────────────────────────────────────
export default function FinancialStatementsModule({ coaList = [], journalEntries = [], showToast }) {
  const [activeTab, setActiveTab] = useState('income');
  const [startDate, setStartDate] = useState(firstDayOfYear());
  const [endDate, setEndDate] = useState(today());
  const [asOfDate, setAsOfDate] = useState(today());
  const [priorEndDate, setPriorEndDate] = useState('');
  const [showZero, setShowZero] = useState(false);
  const [calkNotes, setCalkNotes] = useState({});
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Computed ──────────────────────────────────────────────────────────────
  const is = useMemo(() =>
    buildIncomeStatement({ coaList, journalEntries, startDate, endDate }),
    [coaList, journalEntries, startDate, endDate]
  );

  const bs = useMemo(() =>
    buildBalanceSheet({ coaList, journalEntries, asOfDate }),
    [coaList, journalEntries, asOfDate]
  );

  const es = useMemo(() =>
    buildEquityStatement({ coaList, journalEntries, startDate, endDate }),
    [coaList, journalEntries, startDate, endDate]
  );

  const cf = useMemo(() =>
    buildCashFlowStatement({ coaList, journalEntries, startDate, endDate, priorEndDate }),
    [coaList, journalEntries, startDate, endDate, priorEndDate]
  );

  const ratios = useMemo(() =>
    calculateFinancialRatios({ coaList, journalEntries, startDate, endDate, priorEndDate }),
    [coaList, journalEntries, startDate, endDate, priorEndDate]
  );

  const handlePrint = useCallback(() => window.print(), []);

  const handleExportCSV = useCallback((data, filename) => {
    const rows = data.map(r => Object.values(r).join(',')).join('\n');
    const header = data.length > 0 ? Object.keys(data[0]).join(',') + '\n' : '';
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast?.(`${filename} berhasil diunduh`, 'success');
  }, [showToast]);

  // ─────────────────────────────────────────────────────────────────────────
  // TAB: LABA RUGI
  // ─────────────────────────────────────────────────────────────────────────
  const renderIncomeStatement = () => (
    <div className="space-y-4">
      {/* Period Controls */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-semibold">Periode:</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Dari</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
          <label className="text-xs text-slate-500">s/d</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showZero} onChange={e => setShowZero(e.target.checked)} className="rounded" />
          Tampilkan saldo nol
        </label>
        <div className="ml-auto flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600">
            <Printer className="w-3.5 h-3.5" /> Cetak
          </button>
          <button onClick={() => handleExportCSV(
            [...is.revenueRows, ...is.cogsRows, ...is.expenseRows, ...is.otherRevenueRows, ...is.otherExpenseRows]
              .map(r => ({ kode: r.code, nama: r.name, kategori: r.category, jumlah: r.amount })),
            `laba-rugi-${startDate}-${endDate}.csv`
          )} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Pendapatan" value={fmtRp(is.totalRevenue)} icon={TrendingUp} color="blue" />
        <SummaryCard label="Laba Kotor" value={fmtRp(is.grossProfit)} sub={fmtPct(is.grossProfitMargin) + ' Gross Margin'} icon={DollarSign} color={is.grossProfit >= 0 ? 'emerald' : 'red'} />
        <SummaryCard label="Laba Operasional" value={fmtRp(is.operatingProfit)} sub={fmtPct(is.operatingProfitMargin) + ' Opr Margin'} icon={Activity} color={is.operatingProfit >= 0 ? 'emerald' : 'amber'} />
        <SummaryCard label="Laba Bersih" value={fmtRp(is.netProfit)} sub={fmtPct(is.netProfitMargin) + ' Net Margin'} icon={is.isProfit ? ArrowUpRight : ArrowDownRight} color={is.isProfit ? 'emerald' : 'red'} />
      </div>

      {/* Laba Rugi Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Laporan Laba Rugi</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Periode {startDate} s/d {endDate}</p>
          </div>
          {!bs.isBalanced && <div className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold"><AlertTriangle className="w-3.5 h-3.5" /> Neraca tidak seimbang</div>}
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 pl-3">Keterangan</th>
              <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 pr-4">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {/* PENDAPATAN */}
            <tr className="bg-blue-50/60"><td colSpan={2} className="py-2 pl-3 text-[11px] font-bold text-blue-800 uppercase tracking-wider">I. Pendapatan Usaha</td></tr>
            {is.revenueRows.filter(r => showZero || r.amount !== 0).map(r => (
              <LRRow key={r.code} label={`${r.code} — ${r.name}`} amount={r.amount} indent={1} />
            ))}
            <LRRow label="Total Pendapatan Usaha" amount={is.totalRevenue} bold border highlight />

            {/* HPP */}
            <tr className="bg-slate-50/60"><td colSpan={2} className="py-2 pl-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">II. Harga Pokok Penjualan (HPP)</td></tr>
            {is.cogsRows.filter(r => showZero || r.amount !== 0).map(r => (
              <LRRow key={r.code} label={`${r.code} — ${r.name}`} amount={r.amount} indent={1} />
            ))}
            {is.cogsRows.length === 0 && <tr><td colSpan={2} className="text-center text-xs text-slate-400 py-2 italic">Tidak ada akun HPP</td></tr>}
            <LRRow label="Total HPP" amount={is.totalCOGS} bold />
            <LRRow label="LABA KOTOR" amount={is.grossProfit} bold border highlight />

            {/* BEBAN OPERASIONAL */}
            <tr className="bg-amber-50/40"><td colSpan={2} className="py-2 pl-3 text-[11px] font-bold text-amber-800 uppercase tracking-wider">III. Beban Operasional</td></tr>
            {is.expenseRows.filter(r => showZero || r.amount !== 0).map(r => (
              <LRRow key={r.code} label={`${r.code} — ${r.name}`} amount={r.amount} indent={1} />
            ))}
            {is.expenseRows.length === 0 && <tr><td colSpan={2} className="text-center text-xs text-slate-400 py-2 italic">Tidak ada akun beban operasional</td></tr>}
            <LRRow label="Total Beban Operasional" amount={is.totalExpense} bold />
            <LRRow label="LABA OPERASIONAL (EBIT)" amount={is.operatingProfit} bold border highlight />

            {/* LAIN-LAIN */}
            {(is.otherRevenueRows.length > 0 || is.otherExpenseRows.length > 0 || showZero) && (
              <>
                <tr className="bg-purple-50/40"><td colSpan={2} className="py-2 pl-3 text-[11px] font-bold text-purple-800 uppercase tracking-wider">IV. Pendapatan & Beban Lain-lain</td></tr>
                {is.otherRevenueRows.filter(r => showZero || r.amount !== 0).map(r => (
                  <LRRow key={r.code} label={`${r.code} — ${r.name}`} amount={r.amount} indent={1} />
                ))}
                {is.otherExpenseRows.filter(r => showZero || r.amount !== 0).map(r => (
                  <LRRow key={r.code} label={`${r.code} — ${r.name}`} amount={-r.amount} indent={1} />
                ))}
                <LRRow label="Pendapatan (Beban) Lain Bersih" amount={is.totalOtherRevenue - is.totalOtherExpense} bold />
              </>
            )}
            <LRRow label="LABA SEBELUM PAJAK" amount={is.profitBeforeTax} bold border highlight />

            {/* PAJAK */}
            {(is.taxRows.length > 0 || showZero) && (
              <>
                {is.taxRows.filter(r => showZero || r.amount !== 0).map(r => (
                  <LRRow key={r.code} label={`${r.code} — ${r.name}`} amount={-r.amount} indent={1} />
                ))}
                <LRRow label="Total Beban Pajak" amount={-is.totalTax} bold />
              </>
            )}

            {/* LABA BERSIH */}
            <tr className={`border-t-4 border-double border-slate-400 ${is.isProfit ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <td className="py-3 pl-3 text-sm font-black text-slate-900">
                {is.isProfit ? '✦ LABA BERSIH' : '✦ RUGI BERSIH'}
              </td>
              <td className={`py-3 pr-4 text-sm font-black text-right font-mono ${is.isProfit ? 'text-emerald-700' : 'text-red-700'}`}>
                {fmtRp(is.netProfit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TAB: NERACA
  // ─────────────────────────────────────────────────────────────────────────
  const renderBalanceSheet = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-semibold">Per Tanggal:</span>
        </div>
        <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showZero} onChange={e => setShowZero(e.target.checked)} className="rounded" />
          Tampilkan saldo nol
        </label>
        <div className="ml-auto flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600">
            <Printer className="w-3.5 h-3.5" /> Cetak
          </button>
        </div>
      </div>

      {/* Balance check banner */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold border ${bs.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
        {bs.isBalanced ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        {bs.isBalanced
          ? `Neraca seimbang: Total Aset = Total Kewajiban + Ekuitas = ${fmtRp(bs.totalAssets)}`
          : `Neraca TIDAK seimbang! Selisih: ${fmtRp(bs.difference)} — Periksa jurnal yang belum diposting.`
        }
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total Aset" value={fmtRp(bs.totalAssets)} icon={Layers} color="blue"
          sub={`Lancar: ${fmtRp(bs.totalCurrentAssets)} | Tetap: ${fmtRp(bs.totalFixedAssets)}`} />
        <SummaryCard label="Total Kewajiban" value={fmtRp(bs.totalLiabilities)} icon={TrendingDown} color={bs.totalLiabilities > 0 ? 'amber' : 'emerald'}
          sub={`Jk Pendek: ${fmtRp(bs.totalCurrentLiabilities)} | Jk Panjang: ${fmtRp(bs.totalLongTermLiabilities)}`} />
        <SummaryCard label="Total Ekuitas" value={fmtRp(bs.totalEquity)} icon={Scale} color="emerald" />
      </div>

      {/* Neraca Table */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* ASET */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-blue-600 text-white">
            <h3 className="text-sm font-bold">ASET</h3>
            <p className="text-[11px] text-blue-100">Per {asOfDate}</p>
          </div>
          <table className="w-full">
            <tbody>
              <tr className="bg-blue-50/50"><td colSpan={2} className="py-2 pl-3 text-[11px] font-bold text-blue-800">Aset Lancar</td></tr>
              {bs.currentAssetRows.filter(r => showZero || r.balance > 0).map(r => (
                <BSRow key={r.code} label={`${r.code} — ${r.name}`} amount={r.balance} indent={1} />
              ))}
              <BSRow label="Total Aset Lancar" amount={bs.totalCurrentAssets} bold highlight />

              <tr className="bg-blue-50/50"><td colSpan={2} className="py-2 pl-3 text-[11px] font-bold text-blue-800">Aset Tidak Lancar / Tetap</td></tr>
              {bs.fixedAssetRows.filter(r => showZero || r.balance > 0).map(r => (
                <BSRow key={r.code} label={`${r.code} — ${r.name}`} amount={r.balance} indent={1} />
              ))}
              <BSRow label="Total Aset Tidak Lancar" amount={bs.totalFixedAssets} bold highlight />

              <tr className="border-t-4 border-double border-blue-300 bg-blue-100">
                <td className="py-3 pl-3 text-sm font-black text-blue-900">TOTAL ASET</td>
                <td className="py-3 pr-4 text-sm font-black text-right text-blue-900 font-mono">{fmtRp(bs.totalAssets)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* KEWAJIBAN & EKUITAS */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-700 text-white">
            <h3 className="text-sm font-bold">KEWAJIBAN & EKUITAS</h3>
            <p className="text-[11px] text-slate-300">Per {asOfDate}</p>
          </div>
          <table className="w-full">
            <tbody>
              <tr className="bg-amber-50/50"><td colSpan={2} className="py-2 pl-3 text-[11px] font-bold text-amber-800">Kewajiban Jangka Pendek</td></tr>
              {bs.currentLiabilityRows.filter(r => showZero || r.balance > 0).map(r => (
                <BSRow key={r.code} label={`${r.code} — ${r.name}`} amount={r.balance} indent={1} />
              ))}
              <BSRow label="Total Kewajiban Jangka Pendek" amount={bs.totalCurrentLiabilities} bold highlight />

              <tr className="bg-amber-50/50"><td colSpan={2} className="py-2 pl-3 text-[11px] font-bold text-amber-800">Kewajiban Jangka Panjang</td></tr>
              {bs.longTermLiabilityRows.filter(r => showZero || r.balance > 0).map(r => (
                <BSRow key={r.code} label={`${r.code} — ${r.name}`} amount={r.balance} indent={1} />
              ))}
              <BSRow label="Total Kewajiban Jangka Panjang" amount={bs.totalLongTermLiabilities} bold highlight />
              <BSRow label="TOTAL KEWAJIBAN" amount={bs.totalLiabilities} bold border highlight />

              <tr className="bg-emerald-50/50"><td colSpan={2} className="py-2 pl-3 text-[11px] font-bold text-emerald-800">Ekuitas</td></tr>
              {bs.equityRows.filter(r => showZero || r.balance > 0).map(r => (
                <BSRow key={r.code} label={`${r.code} — ${r.name}`} amount={r.balance} indent={1} />
              ))}
              <BSRow label="TOTAL EKUITAS" amount={bs.totalEquity} bold highlight />

              <tr className="border-t-4 border-double border-slate-400 bg-slate-100">
                <td className="py-3 pl-3 text-sm font-black text-slate-900">TOTAL KEWAJIBAN & EKUITAS</td>
                <td className="py-3 pr-4 text-sm font-black text-right text-slate-900 font-mono">{fmtRp(bs.totalLiabilitiesAndEquity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TAB: PERUBAHAN EKUITAS
  // ─────────────────────────────────────────────────────────────────────────
  const renderEquityStatement = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-semibold">Periode:</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Dari</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
          <label className="text-xs text-slate-500">s/d</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-2xl">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-emerald-700 text-white">
          <h3 className="text-sm font-bold">Laporan Perubahan Ekuitas</h3>
          <p className="text-[11px] text-emerald-200">Periode {startDate} s/d {endDate}</p>
        </div>
        <table className="w-full">
          <tbody>
            {/* Saldo Awal */}
            <tr className="bg-slate-50 border-b border-slate-100">
              <td className="py-3 pl-5 text-xs font-bold text-slate-800">Modal / Ekuitas Awal Periode</td>
              <td className="py-3 pr-5 text-xs font-bold text-right font-mono text-slate-800">{fmtRp(es.openingEquity)}</td>
            </tr>
            {es.openingEquityRows.filter(r => r.balance > 0).map(r => (
              <tr key={r.code} className="border-b border-slate-50">
                <td className="py-1.5 pl-10 text-xs text-slate-600">{r.code} — {r.name}</td>
                <td className="py-1.5 pr-5 text-xs text-right font-mono text-slate-700">{fmtRp(r.balance)}</td>
              </tr>
            ))}

            {/* Laba/Rugi */}
            <tr className={`border-b border-slate-100 ${es.isProfit ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <td className="py-2.5 pl-5 text-xs font-semibold text-slate-700">
                {es.isProfit ? '+ Laba Bersih Periode' : '− Rugi Bersih Periode'}
              </td>
              <td className={`py-2.5 pr-5 text-xs font-semibold text-right font-mono ${es.isProfit ? 'text-emerald-700' : 'text-red-700'}`}>
                {fmtRp(es.netProfit)}
              </td>
            </tr>

            {/* Prive */}
            {es.totalPrive !== 0 && (
              <tr className="border-b border-slate-100 bg-amber-50">
                <td className="py-2.5 pl-5 text-xs font-semibold text-amber-800">− Prive / Dividen</td>
                <td className="py-2.5 pr-5 text-xs font-semibold text-right font-mono text-amber-800">({fmtRp(es.totalPrive)})</td>
              </tr>
            )}

            {/* Saldo Akhir */}
            <tr className="border-t-4 border-double border-emerald-400 bg-emerald-100">
              <td className="py-3 pl-5 text-sm font-black text-emerald-900">Modal / Ekuitas Akhir Periode</td>
              <td className="py-3 pr-5 text-sm font-black text-right font-mono text-emerald-900">{fmtRp(es.closingEquity)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TAB: ARUS KAS
  // ─────────────────────────────────────────────────────────────────────────
  const renderCashFlow = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-semibold">Periode:</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Dari</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
          <label className="text-xs text-slate-500">s/d</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
        <div className="flex items-center gap-2 ml-4">
          <label className="text-xs text-slate-500">Akhir Periode Lalu</label>
          <input type="date" value={priorEndDate} onChange={e => setPriorEndDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Arus Kas Operasi" value={fmtRp(cf.operatingCashFlow)} icon={Activity} color={cf.operatingCashFlow >= 0 ? 'emerald' : 'red'} />
        <SummaryCard label="Arus Kas Investasi" value={fmtRp(cf.investingCashFlow)} icon={TrendingDown} color={cf.investingCashFlow >= 0 ? 'blue' : 'amber'} />
        <SummaryCard label="Arus Kas Pendanaan" value={fmtRp(cf.financingCashFlow)} icon={Layers} color={cf.financingCashFlow >= 0 ? 'blue' : 'amber'} />
      </div>

      {!cf.reconciled && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold">
          <AlertTriangle className="w-4 h-4" />
          Rekonsiliasi kas belum seimbang. Periksa akun kas/bank dan transaksi yang tidak terkategori.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-2xl">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-teal-700 text-white">
          <h3 className="text-sm font-bold">Laporan Arus Kas (Metode Tidak Langsung)</h3>
          <p className="text-[11px] text-teal-200">Periode {startDate} s/d {endDate}</p>
        </div>
        <table className="w-full">
          <tbody>
            {/* Saldo Kas Awal */}
            <tr className="bg-slate-50 border-b border-slate-200">
              <td className="py-2.5 pl-4 text-xs font-bold text-slate-800">Saldo Kas & Bank Awal Periode</td>
              <td className="py-2.5 pr-4 text-xs font-bold text-right font-mono text-slate-800">{fmtRp(cf.openingCash)}</td>
            </tr>

            {/* OPERASI */}
            <tr className="bg-teal-50"><td colSpan={2} className="py-2.5 pl-4 text-[11px] font-bold text-teal-800 uppercase">A. Aktivitas Operasi</td></tr>
            <tr><td className="py-1.5 pl-8 text-xs text-slate-700">Laba Bersih</td><td className="py-1.5 pr-4 text-xs text-right font-mono text-slate-800">{fmtRp(cf.netProfit)}</td></tr>
            {cf.totalDepreciation !== 0 && <tr><td className="py-1.5 pl-8 text-xs text-slate-700">+ Penyusutan & Amortisasi</td><td className="py-1.5 pr-4 text-xs text-right font-mono text-slate-800">{fmtRp(cf.totalDepreciation)}</td></tr>}
            {cf.changeAR !== 0 && <tr><td className="py-1.5 pl-8 text-xs text-slate-700">Perubahan Piutang Usaha</td><td className={`py-1.5 pr-4 text-xs text-right font-mono ${cf.changeAR < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmtRp(cf.changeAR)}</td></tr>}
            {cf.changeInventory !== 0 && <tr><td className="py-1.5 pl-8 text-xs text-slate-700">Perubahan Persediaan</td><td className={`py-1.5 pr-4 text-xs text-right font-mono ${cf.changeInventory < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmtRp(cf.changeInventory)}</td></tr>}
            {cf.changePrepaid !== 0 && <tr><td className="py-1.5 pl-8 text-xs text-slate-700">Perubahan Beban Dibayar Dimuka</td><td className={`py-1.5 pr-4 text-xs text-right font-mono ${cf.changePrepaid < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmtRp(cf.changePrepaid)}</td></tr>}
            {cf.changeAP !== 0 && <tr><td className="py-1.5 pl-8 text-xs text-slate-700">Perubahan Utang Usaha</td><td className={`py-1.5 pr-4 text-xs text-right font-mono ${cf.changeAP >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtRp(cf.changeAP)}</td></tr>}
            {cf.changeAccrued !== 0 && <tr><td className="py-1.5 pl-8 text-xs text-slate-700">Perubahan Liabilitas Akrual</td><td className={`py-1.5 pr-4 text-xs text-right font-mono ${cf.changeAccrued >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtRp(cf.changeAccrued)}</td></tr>}
            <tr className="border-t border-teal-200 bg-teal-50/60">
              <td className="py-2 pl-4 text-xs font-bold text-teal-900">Total Arus Kas dari Operasi</td>
              <td className={`py-2 pr-4 text-xs font-bold text-right font-mono ${cf.operatingCashFlow >= 0 ? 'text-teal-800' : 'text-red-700'}`}>{fmtRp(cf.operatingCashFlow)}</td>
            </tr>

            {/* INVESTASI */}
            <tr className="bg-indigo-50"><td colSpan={2} className="py-2.5 pl-4 text-[11px] font-bold text-indigo-800 uppercase">B. Aktivitas Investasi</td></tr>
            {cf.fixedAssetAccounts.filter(r => r.amount !== 0).map(r => (
              <tr key={r.code}>
                <td className="py-1.5 pl-8 text-xs text-slate-700">{r.code} — {r.name}</td>
                <td className={`py-1.5 pr-4 text-xs text-right font-mono ${r.amount < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmtRp(r.amount)}</td>
              </tr>
            ))}
            {cf.fixedAssetAccounts.filter(r => r.amount !== 0).length === 0 && (
              <tr><td colSpan={2} className="py-1.5 pl-8 text-xs text-slate-400 italic">Tidak ada transaksi investasi</td></tr>
            )}
            <tr className="border-t border-indigo-200 bg-indigo-50/60">
              <td className="py-2 pl-4 text-xs font-bold text-indigo-900">Total Arus Kas dari Investasi</td>
              <td className={`py-2 pr-4 text-xs font-bold text-right font-mono ${cf.investingCashFlow >= 0 ? 'text-teal-800' : 'text-red-700'}`}>{fmtRp(cf.investingCashFlow)}</td>
            </tr>

            {/* PENDANAAN */}
            <tr className="bg-purple-50"><td colSpan={2} className="py-2.5 pl-4 text-[11px] font-bold text-purple-800 uppercase">C. Aktivitas Pendanaan</td></tr>
            <tr><td className="py-1.5 pl-8 text-xs text-slate-700">Pinjaman & Modal (bersih)</td><td className={`py-1.5 pr-4 text-xs text-right font-mono ${cf.financingCashFlow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtRp(cf.financingCashFlow)}</td></tr>
            <tr className="border-t border-purple-200 bg-purple-50/60">
              <td className="py-2 pl-4 text-xs font-bold text-purple-900">Total Arus Kas dari Pendanaan</td>
              <td className={`py-2 pr-4 text-xs font-bold text-right font-mono ${cf.financingCashFlow >= 0 ? 'text-teal-800' : 'text-red-700'}`}>{fmtRp(cf.financingCashFlow)}</td>
            </tr>

            {/* NET CHANGE */}
            <tr className="border-t-2 border-slate-300 bg-slate-100">
              <td className="py-2.5 pl-4 text-xs font-bold text-slate-800">Kenaikan (Penurunan) Kas Bersih</td>
              <td className={`py-2.5 pr-4 text-xs font-bold text-right font-mono ${cf.netCashChange >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtRp(cf.netCashChange)}</td>
            </tr>
            <tr className="border-t border-slate-200">
              <td className="py-2 pl-4 text-xs text-slate-700">Saldo Kas & Bank Awal</td>
              <td className="py-2 pr-4 text-xs text-right font-mono text-slate-800">{fmtRp(cf.openingCash)}</td>
            </tr>
            <tr className={`border-t-4 border-double border-teal-400 ${cf.reconciled ? 'bg-teal-100' : 'bg-red-100'}`}>
              <td className="py-3 pl-4 text-sm font-black text-teal-900">Saldo Kas & Bank Akhir Periode</td>
              <td className="py-3 pr-4 text-sm font-black text-right font-mono text-teal-900">{fmtRp(cf.closingCash)}</td>
            </tr>
            {!cf.reconciled && (
              <tr className="bg-red-50">
                <td colSpan={2} className="py-2 px-4 text-xs text-red-700 text-center font-semibold">
                  ⚠ Rekonsiliasi tidak seimbang — Hitung per Jurnal: {fmtRp(cf.openingCash + cf.netCashChange)} vs Saldo GL: {fmtRp(cf.closingCash)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TAB: RASIO KEUANGAN
  // ─────────────────────────────────────────────────────────────────────────
  const renderRatios = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-600"><Calendar className="w-3.5 h-3.5" /><span className="font-semibold">Periode Analisis:</span></div>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
          <span className="text-slate-400">—</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
        <div className="flex items-center gap-2 ml-4">
          <label className="text-xs text-slate-500">Akhir Periode Lalu (rata-rata)</label>
          <input type="date" value={priorEndDate} onChange={e => setPriorEndDate(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>Rasio dihitung dari data jurnal aktual. Untuk rasio aktivitas yang akurat, isi <strong>Akhir Periode Lalu</strong> agar saldo rata-rata dihitung dengan benar. Interpretasi rasio bersifat indikatif — bandingkan dengan standar industri masing-masing.</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* LIKUIDITAS */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-blue-600 text-white text-sm font-bold">🏦 Rasio Likuiditas</div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-[10px] text-slate-500 py-2 pl-3 uppercase">Rasio</th>
                <th className="text-center text-[10px] text-slate-500 py-2 uppercase">Nilai</th>
                <th className="text-right text-[10px] text-slate-500 py-2 pr-3 uppercase">Interpretasi</th>
              </tr>
            </thead>
            <tbody>
              <RatioRow label="Current Ratio" value={ratios.currentRatio} display={fmtX(ratios.currentRatio)} good={2} warn={1}
                interpretation={ratios.currentRatio >= 2 ? 'Sangat likuid' : ratios.currentRatio >= 1 ? 'Cukup likuid' : 'Risiko likuiditas'} />
              <RatioRow label="Quick Ratio" value={ratios.quickRatio} display={fmtX(ratios.quickRatio)} good={1} warn={0.5}
                interpretation={ratios.quickRatio >= 1 ? 'Baik' : ratios.quickRatio >= 0.5 ? 'Perhatian' : 'Kurang likuid'} />
              <RatioRow label="Cash Ratio" value={ratios.cashRatio} display={fmtX(ratios.cashRatio)} good={0.5} warn={0.2}
                interpretation={ratios.cashRatio >= 0.5 ? 'Kas cukup' : 'Kas terbatas'} />
            </tbody>
          </table>
        </div>

        {/* SOLVABILITAS */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-amber-600 text-white text-sm font-bold">🏗 Rasio Solvabilitas</div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-[10px] text-slate-500 py-2 pl-3 uppercase">Rasio</th>
                <th className="text-center text-[10px] text-slate-500 py-2 uppercase">Nilai</th>
                <th className="text-right text-[10px] text-slate-500 py-2 pr-3 uppercase">Interpretasi</th>
              </tr>
            </thead>
            <tbody>
              <RatioRow label="Debt to Asset" value={ratios.debtToAsset !== null ? (1 - ratios.debtToAsset) : null}
                display={fmtPct(ratios.debtToAsset !== null ? ratios.debtToAsset * 100 : null)} good={0.5} warn={0.3}
                interpretation={ratios.debtToAsset !== null ? (ratios.debtToAsset < 0.5 ? 'Konservatif' : ratios.debtToAsset < 0.7 ? 'Moderat' : 'Leverage tinggi') : '-'} />
              <RatioRow label="Debt to Equity" value={ratios.debtToEquity !== null ? (2 - ratios.debtToEquity) : null}
                display={fmtX(ratios.debtToEquity)} good={1} warn={0.5}
                interpretation={ratios.debtToEquity !== null ? (ratios.debtToEquity < 1 ? 'Sehat' : ratios.debtToEquity < 2 ? 'Moderat' : 'Tinggi') : '-'} />
              <RatioRow label="Interest Coverage" value={ratios.interestCoverage} display={fmtX(ratios.interestCoverage)} good={3} warn={1.5}
                interpretation={ratios.interestCoverage === null ? 'Tidak ada utang bunga' : ratios.interestCoverage >= 3 ? 'Aman' : ratios.interestCoverage >= 1.5 ? 'Perhatian' : 'Risiko gagal bayar'} />
            </tbody>
          </table>
        </div>

        {/* PROFITABILITAS */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-emerald-600 text-white text-sm font-bold">📈 Rasio Profitabilitas</div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-[10px] text-slate-500 py-2 pl-3 uppercase">Rasio</th>
                <th className="text-center text-[10px] text-slate-500 py-2 uppercase">Nilai</th>
                <th className="text-right text-[10px] text-slate-500 py-2 pr-3 uppercase">Interpretasi</th>
              </tr>
            </thead>
            <tbody>
              <RatioRow label="Gross Profit Margin" value={ratios.grossProfitMargin} display={fmtPct(ratios.grossProfitMargin)} good={40} warn={20}
                interpretation="GPM tinggi = efisiensi produksi baik" />
              <RatioRow label="Operating Profit Margin" value={ratios.operatingProfitMargin} display={fmtPct(ratios.operatingProfitMargin)} good={15} warn={5}
                interpretation="Efisiensi operasional" />
              <RatioRow label="Net Profit Margin" value={ratios.netProfitMargin} display={fmtPct(ratios.netProfitMargin)} good={10} warn={3}
                interpretation={ratios.netProfitMargin >= 10 ? 'Sangat profitable' : ratios.netProfitMargin >= 3 ? 'Cukup' : 'Tipis/Rugi'} />
              <RatioRow label="Return on Assets (ROA)" value={ratios.roa} display={fmtPct(ratios.roa)} good={10} warn={5}
                interpretation="Efisiensi penggunaan aset" />
              <RatioRow label="Return on Equity (ROE)" value={ratios.roe} display={fmtPct(ratios.roe)} good={15} warn={8}
                interpretation="Return untuk pemegang saham" />
            </tbody>
          </table>
        </div>

        {/* AKTIVITAS */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-purple-600 text-white text-sm font-bold">⚙ Rasio Aktivitas</div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-[10px] text-slate-500 py-2 pl-3 uppercase">Rasio</th>
                <th className="text-center text-[10px] text-slate-500 py-2 uppercase">Nilai</th>
                <th className="text-right text-[10px] text-slate-500 py-2 pr-3 uppercase">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <RatioRow label="Inventory Turnover" value={ratios.inventoryTurnover} display={fmtX(ratios.inventoryTurnover)} good={6} warn={3}
                interpretation={ratios.inventoryTurnover === null ? 'Tidak ada persediaan' : `${fmtX(ratios.inventoryTurnover)} perputaran`} />
              <RatioRow label="Days Inventory Outstanding" value={ratios.daysInventoryOutstanding !== null ? (100 - ratios.daysInventoryOutstanding) : null}
                display={fmtDays(ratios.daysInventoryOutstanding)} good={50} warn={30}
                interpretation="Rata-rata hari persediaan tersimpan" />
              <RatioRow label="AR Turnover" value={ratios.arTurnover} display={fmtX(ratios.arTurnover)} good={8} warn={4}
                interpretation={ratios.arTurnover === null ? 'Tidak ada piutang' : 'Perputaran piutang'} />
              <RatioRow label="Days Sales Outstanding (DSO)" value={ratios.daysSOOutstanding !== null ? (100 - ratios.daysSOOutstanding) : null}
                display={fmtDays(ratios.daysSOOutstanding)} good={60} warn={30}
                interpretation="Rata-rata hari penagihan piutang" />
              <RatioRow label="Days Payable Outstanding (DPO)" value={ratios.daysPayableOutstanding} display={fmtDays(ratios.daysPayableOutstanding)} good={30} warn={15}
                interpretation="Rata-rata hari pembayaran utang" />
              <RatioRow label="Asset Turnover" value={ratios.assetTurnover} display={fmtX(ratios.assetTurnover)} good={1.5} warn={0.8}
                interpretation="Efisiensi penggunaan total aset" />
              <RatioRow label="Cash Conversion Cycle" value={ratios.cashConversionCycle !== null ? (60 - ratios.cashConversionCycle) : null}
                display={fmtDays(ratios.cashConversionCycle)} good={30} warn={15}
                interpretation={ratios.cashConversionCycle !== null ? (ratios.cashConversionCycle < 30 ? 'Efisien' : 'Perhatian') : '-'} />
            </tbody>
          </table>
        </div>
      </div>

      {/* Komponen data */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h4 className="text-xs font-bold text-slate-700 mb-3">📊 Komponen Data Kalkulasi</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            ['Total Pendapatan', fmtRp(ratios.is?.totalRevenue)],
            ['Laba Kotor', fmtRp(ratios.is?.grossProfit)],
            ['Laba Operasional (EBIT)', fmtRp(ratios.ebit)],
            ['Laba Bersih', fmtRp(ratios.is?.netProfit)],
            ['Total Aset', fmtRp(ratios.bs?.totalAssets)],
            ['Rata-rata Total Aset', fmtRp(ratios.avgTotalAssets)],
            ['Total Ekuitas', fmtRp(ratios.bs?.totalEquity)],
            ['Rata-rata Ekuitas', fmtRp(ratios.avgEquity)],
            ['Kas & Bank', fmtRp(ratios.cash)],
            ['Piutang Usaha (AR)', fmtRp(ratios.ar)],
            ['Persediaan', fmtRp(ratios.inventory)],
            ['Utang Usaha (AP)', fmtRp(ratios.ap)],
          ].map(([label, val]) => (
            <div key={label} className="p-2 bg-slate-50 rounded-lg">
              <div className="text-[10px] text-slate-500 mb-0.5">{label}</div>
              <div className="font-mono font-semibold text-slate-800">{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TAB: CALK (Catatan atas Laporan Keuangan)
  // ─────────────────────────────────────────────────────────────────────────
  const CALK_SECTIONS = [
    { id: 'umum', label: '1. Umum — Profil & Kebijakan Akuntansi' },
    { id: 'kas', label: '2. Kas dan Setara Kas' },
    { id: 'piutang', label: '3. Piutang Usaha' },
    { id: 'persediaan', label: '4. Persediaan' },
    { id: 'aset-tetap', label: '5. Aset Tetap' },
    { id: 'utang', label: '6. Utang Usaha dan Kewajiban Lain-lain' },
    { id: 'ekuitas', label: '7. Ekuitas' },
    { id: 'pendapatan', label: '8. Pendapatan' },
    { id: 'beban', label: '9. Beban Operasional' },
    { id: 'pajak', label: '10. Perpajakan' },
    { id: 'kontinjensi', label: '11. Komitmen dan Kontinjensi' },
    { id: 'lainnya', label: '12. Peristiwa Setelah Tanggal Neraca' },
  ];

  const renderCALK = () => (
    <div className="space-y-3 max-w-3xl">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>Catatan atas Laporan Keuangan (CALK) merupakan bagian integral dari laporan keuangan. Isi setiap seksi dengan narasi dan kebijakan akuntansi yang relevan. Catatan disimpan secara lokal.</span>
      </div>

      {CALK_SECTIONS.map(sec => (
        <div key={sec.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => toggleSection(sec.id)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
          >
            <span className="text-sm font-semibold text-slate-800">{sec.label}</span>
            {expandedSections[sec.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {expandedSections[sec.id] && (
            <div className="px-4 pb-4 border-t border-slate-100">
              <textarea
                rows={6}
                value={calkNotes[sec.id] || ''}
                onChange={e => setCalkNotes(prev => ({ ...prev, [sec.id]: e.target.value }))}
                placeholder={`Isi catatan untuk ${sec.label}...`}
                className="w-full mt-3 border border-slate-300 rounded-lg px-3 py-2.5 text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none resize-y font-mono leading-relaxed"
              />
              <div className="text-[10px] text-slate-400 mt-1 text-right">
                {(calkNotes[sec.id] || '').length} karakter
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={() => {
          localStorage.setItem('calk_notes', JSON.stringify(calkNotes));
          showToast?.('CALK berhasil disimpan', 'success');
        }}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
      >
        <FileText className="w-3.5 h-3.5" /> Simpan CALK
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER MAIN
  // ─────────────────────────────────────────────────────────────────────────
  const tabContent = {
    income: renderIncomeStatement,
    balance: renderBalanceSheet,
    equity: renderEquityStatement,
    cashflow: renderCashFlow,
    ratios: renderRatios,
    notes: renderCALK,
  };

  // Load CALK from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('calk_notes');
      if (saved) setCalkNotes(JSON.parse(saved));
    } catch {}
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Laporan Keuangan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Laba Rugi · Neraca · Perubahan Ekuitas · Arus Kas · Rasio Keuangan · CALK — berdasarkan data jurnal aktual
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
          {journalEntries.filter(j => j.status === 'Posted' || j.status === 'Reversed').length} jurnal efektif
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tabContent[activeTab]?.()}
    </div>
  );
}
