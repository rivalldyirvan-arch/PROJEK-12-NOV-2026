import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Send,
  RotateCcw,
  X,
  FileCheck2,
  Scale,
  ShieldCheck,
  Download
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/taxRules';
import {
  ADJUSTMENT_TYPES,
  generateJournalNumber,
  buildAdjustedTrialBalance,
  generateClosingEntriesPreview,
  buildPostClosingTrialBalance,
  formatPeriodName
} from '../lib/accountingService';
import {
  saveJournalEntry,
  reverseJournalEntry,
  saveAccountingPeriod
} from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import SearchableSelect from '../components/SearchableSelect';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function AdjustingClosingModule({
  coaList = [],
  journalEntries = [],
  accountingPeriods = [],
  journalSequences = [],
  coaMappings = [],
  onRefresh,
  showToast
}) {
  const { currentUser, hasPermission } = useAuth();
  const now = new Date();
  const [activeSubTab, setActiveSubTab] = useState('adjusting'); // 'adjusting' | 'adjusted-tb' | 'closing' | 'post-closing'
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const periodCode = `${year}-${String(month).padStart(2, '0')}`;
  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${periodCode}-01`;
  const endDate = `${periodCode}-${String(lastDay).padStart(2, '0')}`;

  const [adjForm, setAdjForm] = useState({
    adjType: 'accrued_expense',
    entryDate: endDate,
    debitAccountCode: '6106',
    creditAccountCode: '2102',
    amount: 0,
    description: ''
  });

  const adjustingJournals = useMemo(
    () => journalEntries.filter(j => j.journalType === 'Jurnal Penyesuaian'),
    [journalEntries]
  );

  const adjustedTB = useMemo(
    () => buildAdjustedTrialBalance({ coaList, journalEntries, startDate, endDate }),
    [coaList, journalEntries, startDate, endDate]
  );

  const retainedCode = coaMappings.find(m => m.mappingKey === 'default_retained_earnings')?.accountCode || '3201';
  const summaryCode = coaMappings.find(m => m.mappingKey === 'default_income_summary')?.accountCode || '3901';

  const closingPreview = useMemo(
    () => generateClosingEntriesPreview({
      coaList,
      journalEntries,
      startDate,
      endDate,
      incomeSummaryCode: summaryCode,
      retainedEarningsCode: retainedCode
    }),
    [coaList, journalEntries, startDate, endDate, summaryCode, retainedCode]
  );

  const postClosingTB = useMemo(
    () => buildPostClosingTrialBalance({ coaList, journalEntries, endDate }),
    [coaList, journalEntries, endDate]
  );

  const existingClosingJournal = useMemo(
    () => journalEntries.find(j => j.journalType === 'Jurnal Penutup' && (j.periodCode === periodCode || (j.entryDate && j.entryDate.startsWith(periodCode))) && j.status === 'Posted'),
    [journalEntries, periodCode]
  );

  const pendingAdjustmentsInPeriod = useMemo(
    () => adjustingJournals.filter(j => (j.periodCode === periodCode || (j.entryDate && j.entryDate.startsWith(periodCode))) && (j.status === 'Draft' || j.status === 'Pending Approval')),
    [adjustingJournals, periodCode]
  );

  const coaOptions = useMemo(
    () => coaList.map(c => ({ value: c.code, label: `${c.code} - ${c.name}`, subLabel: c.category })),
    [coaList]
  );

  const handleSelectAdjType = (key) => {
    const found = ADJUSTMENT_TYPES.find(t => t.key === key);
    setAdjForm(prev => ({
      ...prev,
      adjType: key,
      debitAccountCode: found?.defaultDebit || prev.debitAccountCode,
      creditAccountCode: found?.defaultCredit || prev.creditAccountCode,
      description: found ? found.label : prev.description
    }));
  };

  const handleSaveAdjustment = async (targetStatus) => {
    const amt = Number(adjForm.amount) || 0;
    if (amt <= 0 || !adjForm.debitAccountCode || !adjForm.creditAccountCode) {
      alert('Akun Debit, Akun Kredit, dan Nominal Penyesuaian (> 0) wajib diisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      const debitAcc = coaList.find(c => c.code === adjForm.debitAccountCode);
      const creditAcc = coaList.find(c => c.code === adjForm.creditAccountCode);
      const entryNumber = generateJournalNumber('Jurnal Penyesuaian', adjForm.entryDate, journalEntries, journalSequences);
      await saveJournalEntry({
        entryNumber,
        entryDate: adjForm.entryDate,
        journalType: 'Jurnal Penyesuaian',
        sourceModule: 'Penyesuaian',
        description: adjForm.description || 'Jurnal Penyesuaian Akhir Periode',
        status: targetStatus,
        lines: [
          { accountCode: adjForm.debitAccountCode, accountName: debitAcc?.name || '', description: adjForm.description, debit: amt, credit: 0 },
          { accountCode: adjForm.creditAccountCode, accountName: creditAcc?.name || '', description: adjForm.description, debit: 0, credit: amt }
        ]
      }, { currentUser, validate: targetStatus === 'Posted' });
      showToast?.(`Jurnal Penyesuaian ${entryNumber} disimpan sebagai ${targetStatus}.`, 'success');
      setIsAdjModalOpen(false);
      await onRefresh();
    } catch (err) {
      showToast?.(err.message || 'Gagal menyimpan jurnal penyesuaian', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceAdjWorkflow = async (entry, newStatus) => {
    setIsSubmitting(true);
    try {
      await saveJournalEntry({
        ...entry,
        status: newStatus,
        approvedBy: newStatus === 'Posted' ? (currentUser?.fullName || 'Finance Manager') : entry.approvedBy
      }, { currentUser, validate: newStatus === 'Posted' });
      showToast?.(`Status ${entry.entryNumber} diubah menjadi ${newStatus}.`, 'success');
      await onRefresh();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverseAdj = async (entry) => {
    const reason = window.prompt(`Masukkan alasan pembuatan Jurnal Pembalik untuk ${entry.entryNumber}:`);
    if (!reason || !reason.trim()) return;
    await reverseJournalEntry(entry, reason, currentUser);
    showToast?.(`Jurnal Pembalik untuk ${entry.entryNumber} berhasil diposting.`, 'success');
    await onRefresh();
  };

  const handleExecuteClosing = async () => {
    if (existingClosingJournal) {
      alert(`Periode ${periodCode} sudah pernah ditutup dengan jurnal ${existingClosingJournal.entryNumber}. Tidak boleh terjadi jurnal penutup duplikat.`);
      return;
    }
    if (pendingAdjustmentsInPeriod.length > 0) {
      alert('Masih terdapat Jurnal Penyesuaian berstatus Draft/Pending Approval pada periode ini. Selesaikan terlebih dahulu.');
      return;
    }
    if (!closingPreview.adjTbBalanced || !closingPreview.isBalanced || closingPreview.lines.length === 0) {
      alert('Neraca Saldo Setelah Penyesuaian tidak seimbang atau tidak ada akun nominal bersaldo untuk ditutup.');
      return;
    }
    if (!window.confirm(`Otorisasi & Posting Jurnal Penutup untuk periode ${formatPeriodName(periodCode)}?\n\nPeriode akan otomatis dikunci setelah closing.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const entryNumber = generateJournalNumber('Jurnal Penutup', endDate, journalEntries, journalSequences);
      await saveJournalEntry({
        entryNumber,
        entryDate: endDate,
        periodCode,
        journalType: 'Jurnal Penutup',
        sourceModule: 'Closing',
        referenceNo: `CLS-${periodCode}`,
        description: `Jurnal Penutup Akhir Periode ${formatPeriodName(periodCode)}`,
        status: 'Posted',
        lines: closingPreview.lines
      }, { currentUser, validate: true });

      const existingPeriod = accountingPeriods.find(p => p.periodCode === periodCode);
      await saveAccountingPeriod({
        id: existingPeriod?.id || `per-${periodCode}`,
        periodCode,
        fiscalYear: year,
        periodMonth: month,
        periodName: formatPeriodName(periodCode),
        quarter: Math.ceil(month / 3),
        status: 'Closed',
        closedAt: new Date().toISOString(),
        closedBy: currentUser?.fullName || 'Finance Manager'
      }, currentUser, `Closing otomatis periode ${periodCode} (${entryNumber})`);

      showToast?.(`Proses Closing ${formatPeriodName(periodCode)} selesai! Jurnal ${entryNumber} terposting.`, 'success');
      await onRefresh();
    } catch (err) {
      showToast?.(err.message || 'Gagal memproses closing', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Jurnal Penyesuaian &amp; Proses Closing</h2>
            <p className="text-xs text-slate-500">
              Penyesuaian akhir periode, Neraca Saldo Disesuaikan, Jurnal Penutup otomatis, &amp; Post-Closing Trial Balance
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold">
            {MONTHS.map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-20 px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg" />
          <button
            onClick={() => {
              setAdjForm(prev => ({ ...prev, entryDate: endDate }));
              setIsAdjModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Buat Penyesuaian
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white p-2 rounded-2xl border border-slate-200">
        {[
          { id: 'adjusting', label: '1. Jurnal Penyesuaian' },
          { id: 'adjusted-tb', label: '2. Neraca Saldo Setelah Penyesuaian' },
          { id: 'closing', label: '3. Proses Closing & Jurnal Penutup' },
          { id: 'post-closing', label: '4. Neraca Saldo Setelah Penutupan' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeSubTab === t.id ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: JURNAL PENYESUAIAN */}
      {activeSubTab === 'adjusting' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">No. Jurnal</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Deskripsi Penyesuaian</th>
                  <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                  <th className="py-3 px-4 text-center">Status Workflow</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustingJournals.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400">Belum ada jurnal penyesuaian.</td></tr>
                ) : (
                  adjustingJournals.map(j => (
                    <tr key={j.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-purple-900">{j.entryNumber}</td>
                      <td className="py-3 px-4">{formatDateIndo(j.entryDate)}</td>
                      <td className="py-3 px-4 font-medium">{j.description}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">{formatRupiah(j.totalDebit)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          j.status === 'Posted' ? 'bg-emerald-100 text-emerald-800'
                          : j.status === 'Pending Approval' ? 'bg-amber-100 text-amber-800'
                          : j.status === 'Reversed' ? 'bg-slate-200 text-slate-700'
                          : 'bg-slate-100 text-slate-700'
                        }`}>{j.status}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {j.status === 'Draft' && (
                            <button onClick={() => handleAdvanceAdjWorkflow(j, 'Pending Approval')} className="px-2.5 py-1 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200">
                              Ajukan Persetujuan
                            </button>
                          )}
                          {(j.status === 'Draft' || j.status === 'Pending Approval') && hasPermission('approve_purchase') && (
                            <button onClick={() => handleAdvanceAdjWorkflow(j, 'Posted')} className="px-2.5 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
                              Setujui &amp; Posting
                            </button>
                          )}
                          {j.status === 'Posted' && (
                            <button onClick={() => handleReverseAdj(j)} className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded-md hover:bg-amber-100 flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" /> Jurnal Pembalik
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: NERACA SALDO SETELAH PENYESUAIAN */}
      {activeSubTab === 'adjusted-tb' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2 font-bold ${
            adjustedTB.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {adjustedTB.isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {adjustedTB.isBalanced
              ? `Neraca Saldo Setelah Penyesuaian SEIMBANG (Debit = Kredit = ${formatRupiah(adjustedTB.totals.afterDebit)})`
              : 'Neraca Saldo Setelah Penyesuaian TIDAK SEIMBANG!'}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase">
                    <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-700">Kode</th>
                    <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-700">Nama Akun</th>
                    <th colSpan={2} className="py-2 px-3 text-center border-b border-r border-slate-700">Sebelum Penyesuaian</th>
                    <th colSpan={2} className="py-2 px-3 text-center border-b border-r border-slate-700">Penyesuaian</th>
                    <th colSpan={2} className="py-2 px-3 text-center border-b border-slate-700 bg-purple-900">Setelah Penyesuaian</th>
                  </tr>
                  <tr className="bg-slate-800 text-slate-200 text-[10px] uppercase">
                    <th className="py-2 px-3 text-right border-r border-slate-700">Debit</th>
                    <th className="py-2 px-3 text-right border-r border-slate-700">Kredit</th>
                    <th className="py-2 px-3 text-right border-r border-slate-700">Debit</th>
                    <th className="py-2 px-3 text-right border-r border-slate-700">Kredit</th>
                    <th className="py-2 px-3 text-right border-r border-slate-700 bg-purple-950/60">Debit</th>
                    <th className="py-2 px-3 text-right bg-purple-950/60">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adjustedTB.rows.filter(r => r.hasActivity).map(r => (
                    <tr key={r.code} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold">{r.code}</td>
                      <td className="py-2 px-3 font-medium">{r.name}</td>
                      <td className="py-2 px-3 text-right font-mono">{r.beforeDebit > 0 ? formatRupiah(r.beforeDebit) : '–'}</td>
                      <td className="py-2 px-3 text-right font-mono">{r.beforeCredit > 0 ? formatRupiah(r.beforeCredit) : '–'}</td>
                      <td className="py-2 px-3 text-right font-mono text-purple-700">{r.adjDebit > 0 ? formatRupiah(r.adjDebit) : '–'}</td>
                      <td className="py-2 px-3 text-right font-mono text-purple-700">{r.adjCredit > 0 ? formatRupiah(r.adjCredit) : '–'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold bg-purple-50/30">{r.afterDebit > 0 ? formatRupiah(r.afterDebit) : '–'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold bg-purple-50/30">{r.afterCredit > 0 ? formatRupiah(r.afterCredit) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-[11px]">
                    <td colSpan={2} className="py-3 px-3">TOTAL</td>
                    <td className="py-3 px-3 text-right font-mono">{formatRupiah(adjustedTB.totals.beforeDebit)}</td>
                    <td className="py-3 px-3 text-right font-mono">{formatRupiah(adjustedTB.totals.beforeCredit)}</td>
                    <td className="py-3 px-3 text-right font-mono text-purple-200">{formatRupiah(adjustedTB.totals.adjDebit)}</td>
                    <td className="py-3 px-3 text-right font-mono text-purple-200">{formatRupiah(adjustedTB.totals.adjCredit)}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-300">{formatRupiah(adjustedTB.totals.afterDebit)}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-300">{formatRupiah(adjustedTB.totals.afterCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROSES CLOSING & JURNAL PENUTUP */}
      {activeSubTab === 'closing' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Kontrol &amp; Preview Jurnal Penutup ({formatPeriodName(periodCode)})
              </h3>
              <p className="text-xs text-slate-500">Menutup seluruh akun nominal (Pendapatan &amp; Beban) ke Laba Ditahan ({retainedCode}).</p>
            </div>
            {existingClosingJournal ? (
              <span className="px-3 py-1.5 rounded-xl bg-teal-100 text-teal-800 text-xs font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Sudah Closing ({existingClosingJournal.entryNumber})
              </span>
            ) : (
              <button
                disabled={isSubmitting || pendingAdjustmentsInPeriod.length > 0 || !closingPreview.adjTbBalanced || closingPreview.lines.length === 0}
                onClick={handleExecuteClosing}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-40 rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" /> Otorisasi &amp; Posting Closing
              </button>
            )}
          </div>

          {/* Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className={`p-3 rounded-xl border ${pendingAdjustmentsInPeriod.length === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              <strong>1. Jurnal Penyesuaian Selesai:</strong> {pendingAdjustmentsInPeriod.length === 0 ? 'Lolos (0 draft/pending)' : `${pendingAdjustmentsInPeriod.length} belum diposting`}
            </div>
            <div className={`p-3 rounded-xl border ${closingPreview.adjTbBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              <strong>2. Adjusted TB Seimbang:</strong> {closingPreview.adjTbBalanced ? 'Lolos (Seimbang)' : 'Tidak Seimbang'}
            </div>
            <div className={`p-3 rounded-xl border ${!existingClosingJournal ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <strong>3. Anti-Duplikasi Closing:</strong> {!existingClosingJournal ? 'Siap Closing' : 'Periode Sudah Ditutup'}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="py-2.5 px-3 text-left">Kode</th>
                  <th className="py-2.5 px-3 text-left">Nama Akun</th>
                  <th className="py-2.5 px-3 text-left">Keterangan</th>
                  <th className="py-2.5 px-3 text-right">Debit</th>
                  <th className="py-2.5 px-3 text-right">Kredit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closingPreview.lines.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">Tidak ada saldo akun nominal yang perlu ditutup pada periode ini.</td></tr>
                ) : (
                  closingPreview.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-mono font-bold">{l.accountCode}</td>
                      <td className="py-2 px-3 font-semibold">{l.accountName}</td>
                      <td className="py-2 px-3 text-slate-500">{l.description}</td>
                      <td className="py-2 px-3 text-right font-mono text-blue-800">{l.debit > 0 ? formatRupiah(l.debit) : '–'}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-800">{l.credit > 0 ? formatRupiah(l.credit) : '–'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={3} className="py-2.5 px-3">TOTAL PREVIEW CLOSING (Laba/Rugi Bersih: {formatRupiah(closingPreview.netIncome)})</td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-800">{formatRupiah(closingPreview.totalDebit)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800">{formatRupiah(closingPreview.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: NERACA SALDO SETELAH PENUTUPAN */}
      {activeSubTab === 'post-closing' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between font-bold ${
            postClosingTB.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2">
              {postClosingTB.isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {postClosingTB.isBalanced
                ? `Neraca Saldo Setelah Penutupan SEIMBANG (Hanya Akun Permanen • Debit = Kredit = ${formatRupiah(postClosingTB.totalDebit)})`
                : `Terdapat ${postClosingTB.nonZeroNominal.length} akun nominal yang belum ditutup (saldo belum 0). Lakukan proses Closing terlebih dahulu.`}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] uppercase">
                  <th className="py-3 px-4">Kode Akun</th>
                  <th className="py-3 px-4">Nama Akun Permanen (Aset, Kewajiban, Ekuitas)</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-right">Saldo Akhir Debit</th>
                  <th className="py-3 px-4 text-right">Saldo Akhir Kredit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {postClosingTB.rows.filter(r => r.hasBalance).length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">Belum ada saldo akun permanen.</td></tr>
                ) : (
                  postClosingTB.rows.filter(r => r.hasBalance).map(r => (
                    <tr key={r.code} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold">{r.code}</td>
                      <td className="py-2.5 px-4 font-medium">{r.name}</td>
                      <td className="py-2.5 px-4 text-slate-500">{r.category}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-800">{r.debit > 0 ? formatRupiah(r.debit) : '–'}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">{r.credit > 0 ? formatRupiah(r.credit) : '–'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold">
                  <td colSpan={3} className="py-3 px-4">TOTAL NERACA SALDO SETELAH PENUTUPAN</td>
                  <td className="py-3 px-4 text-right font-mono text-blue-200">{formatRupiah(postClosingTB.totalDebit)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-200">{formatRupiah(postClosingTB.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal Buat Jurnal Penyesuaian */}
      {isAdjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Buat Jurnal Penyesuaian Akhir Periode</h3>
              <button onClick={() => setIsAdjModalOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Template Jenis Penyesuaian</label>
                <select value={adjForm.adjType} onChange={(e) => handleSelectAdjType(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  {ADJUSTMENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Tanggal Penyesuaian *</label>
                <input type="date" value={adjForm.entryDate} onChange={(e) => setAdjForm({ ...adjForm, entryDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold mb-1">Akun Debit *</label>
                <SearchableSelect options={coaOptions} value={adjForm.debitAccountCode} onChange={(val) => setAdjForm({ ...adjForm, debitAccountCode: val })} />
              </div>
              <div>
                <label className="block font-bold mb-1">Akun Kredit *</label>
                <SearchableSelect options={coaOptions} value={adjForm.creditAccountCode} onChange={(val) => setAdjForm({ ...adjForm, creditAccountCode: val })} />
              </div>
              <div>
                <label className="block font-bold mb-1">Nominal Penyesuaian (Rp) *</label>
                <input type="number" value={adjForm.amount} onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono font-bold" />
              </div>
              <div>
                <label className="block font-bold mb-1">Deskripsi *</label>
                <input type="text" value={adjForm.description} onChange={(e) => setAdjForm({ ...adjForm, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAdjModalOpen(false)} className="px-4 py-2 text-slate-600 rounded-lg">Batal</button>
                <button type="button" disabled={isSubmitting} onClick={() => handleSaveAdjustment('Draft')} className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-lg">Simpan Draft</button>
                <button type="button" disabled={isSubmitting} onClick={() => handleSaveAdjustment('Posted')} className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg">Posting Penyesuaian</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

