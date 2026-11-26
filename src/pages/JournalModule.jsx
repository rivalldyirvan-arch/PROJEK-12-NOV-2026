import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  RotateCcw,
  Trash2,
  Edit3,
  Eye,
  X,
  Calendar,
  Settings,
  History,
  FileCheck2,
  Send
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/taxRules';
import {
  JOURNAL_TYPES,
  generateJournalNumber,
  getPeriodCodeFromDate,
  formatPeriodName,
  validateJournalEntry
} from '../lib/accountingService';
import {
  saveJournalEntry,
  reverseJournalEntry,
  deleteDraftJournalEntry,
  saveAccountingPeriod,
  saveJournalSequence
} from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import SearchableSelect from '../components/SearchableSelect';

const DEPARTMENTS = [
  'Finance & Accounting',
  'IT & Infrastructure',
  'HR & GA',
  'Marketing & Sales',
  'Operations',
  'Executive & Legal'
];

export default function JournalModule({
  journalEntries = [],
  coaList = [],
  accountingPeriods = [],
  journalSequences = [],
  auditLogs = [],
  onRefresh,
  showToast
}) {
  const { currentUser, isAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('journals'); // 'journals' | 'periods' | 'sequences' | 'audit'

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterPeriod, setFilterPeriod] = useState('Semua');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);
  const [reversingEntry, setReversingEntry] = useState(null);
  const [reverseReason, setReverseReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Period Modal
  const [newPeriodMonth, setNewPeriodMonth] = useState(new Date().getMonth() + 1);
  const [newPeriodYear, setNewPeriodYear] = useState(new Date().getFullYear());

  // Form State
  const todayStr = new Date().toISOString().slice(0, 10);
  const [formData, setFormData] = useState({
    entryNumber: '',
    entryDate: todayStr,
    journalType: 'Jurnal Umum',
    referenceNo: '',
    vendorOrCustomer: '',
    department: 'Finance & Accounting',
    description: ''
  });
  const [lines, setLines] = useState([
    { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 },
    { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 }
  ]);

  // Filtered Journals
  const filteredJournals = useMemo(() => {
    return journalEntries.filter(j => {
      const pCode = j.periodCode || getPeriodCodeFromDate(j.entryDate);
      const matchType = filterType === 'Semua' || (j.journalType || 'Jurnal Umum') === filterType;
      const matchStatus = filterStatus === 'Semua' || j.status === filterStatus;
      const matchPeriod = filterPeriod === 'Semua' || pCode === filterPeriod;
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        (j.entryNumber || '').toLowerCase().includes(q) ||
        (j.description || '').toLowerCase().includes(q) ||
        (j.referenceNo || '').toLowerCase().includes(q) ||
        (j.vendorOrCustomer || '').toLowerCase().includes(q);
      return matchType && matchStatus && matchPeriod && matchSearch;
    });
  }, [journalEntries, filterType, filterStatus, filterPeriod, searchTerm]);

  // Summary Stats
  const stats = useMemo(() => {
    const posted = journalEntries.filter(j => j.status === 'Posted');
    const draft = journalEntries.filter(j => j.status === 'Draft');
    const totalDebit = posted.reduce((s, j) => s + (Number(j.totalDebit) || 0), 0);
    const totalCredit = posted.reduce((s, j) => s + (Number(j.totalCredit) || 0), 0);
    return {
      postedCount: posted.length,
      draftCount: draft.length,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
    };
  }, [journalEntries]);

  // Real-time form totals & validation
  const formTotals = useMemo(() => {
    const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);
    const periodCode = getPeriodCodeFromDate(formData.entryDate);
    const periodObj = accountingPeriods.find(p => p.periodCode === periodCode);
    const isPeriodBlocked = periodObj && (periodObj.status === 'Closed' || periodObj.status === 'Locked');
    return {
      totalDebit,
      totalCredit,
      diff,
      isBalanced: totalDebit > 0 && diff < 0.01,
      periodCode,
      periodObj,
      isPeriodBlocked
    };
  }, [lines, formData.entryDate, accountingPeriods]);

  const coaOptions = useMemo(() => {
    return coaList
      .filter(c => c.isActive !== false)
      .map(c => ({
        value: c.code,
        label: `${c.code} - ${c.name}`,
        subLabel: `${c.category} • Normal: ${c.normalBalance}`
      }));
  }, [coaList]);

  const handleOpenCreate = () => {
    const jType = 'Jurnal Umum';
    const autoNo = generateJournalNumber(jType, todayStr, journalEntries, journalSequences);
    setEditingEntry(null);
    setFormData({
      entryNumber: autoNo,
      entryDate: todayStr,
      journalType: jType,
      referenceNo: '',
      vendorOrCustomer: '',
      department: 'Finance & Accounting',
      description: ''
    });
    setLines([
      { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 },
      { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 }
    ]);
    setIsFormOpen(true);
  };

  const handleOpenEditDraft = (entry) => {
    if (entry.status !== 'Draft') {
      showToast?.('Jurnal yang sudah diposting tidak dapat diedit. Gunakan Jurnal Pembalik.', 'error');
      return;
    }
    setEditingEntry(entry);
    setFormData({
      entryNumber: entry.entryNumber,
      entryDate: entry.entryDate,
      journalType: entry.journalType || 'Jurnal Umum',
      referenceNo: entry.referenceNo || '',
      vendorOrCustomer: entry.vendorOrCustomer || '',
      department: entry.department || 'Finance & Accounting',
      description: entry.description || ''
    });
    setLines(
      (entry.lines || []).length >= 2
        ? entry.lines.map(l => ({ ...l }))
        : [
            { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 },
            { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 }
          ]
    );
    setIsFormOpen(true);
  };

  const handleTypeOrDateChange = (field, val) => {
    const next = { ...formData, [field]: val };
    if (!editingEntry) {
      next.entryNumber = generateJournalNumber(next.journalType, next.entryDate, journalEntries, journalSequences);
    }
    setFormData(next);
  };

  const handleLineChange = (idx, field, val) => {
    const next = [...lines];
    const row = { ...next[idx] };
    if (field === 'accountCode') {
      const acc = coaList.find(c => c.code === val);
      row.accountCode = val;
      row.accountName = acc ? acc.name : '';
    } else if (field === 'debit') {
      row.debit = Number(val) || 0;
      if (row.debit > 0) row.credit = 0;
    } else if (field === 'credit') {
      row.credit = Number(val) || 0;
      if (row.credit > 0) row.debit = 0;
    } else {
      row[field] = val;
    }
    next[idx] = row;
    setLines(next);
  };

  const handleSaveJournal = async (targetStatus) => {
    if (isSubmitting) return;
    const payload = {
      ...(editingEntry || {}),
      ...formData,
      sourceModule: 'Manual',
      status: targetStatus,
      lines: lines.filter(l => l.accountCode || Number(l.debit) > 0 || Number(l.credit) > 0)
    };

    const check = validateJournalEntry({
      entry: payload,
      lines: payload.lines,
      periods: accountingPeriods,
      existingJournals: journalEntries,
      targetStatus
    });

    if (!check.isValid) {
      alert('Validasi Jurnal Gagal:\n\n• ' + check.errors.join('\n• '));
      return;
    }

    setIsSubmitting(true);
    try {
      await saveJournalEntry(payload, { currentUser, validate: true });
      showToast?.(
        targetStatus === 'Posted'
          ? `Jurnal ${payload.entryNumber} berhasil diposting ke Buku Besar!`
          : `Draft jurnal ${payload.entryNumber} berhasil disimpan.`,
        'success'
      );
      setIsFormOpen(false);
      await onRefresh();
    } catch (err) {
      showToast?.(err.message || 'Gagal menyimpan jurnal', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDraft = async (entry) => {
    if (!window.confirm(`Hapus draft jurnal ${entry.entryNumber}?`)) return;
    try {
      await deleteDraftJournalEntry(entry, currentUser);
      showToast?.(`Draft ${entry.entryNumber} berhasil dihapus.`, 'success');
      await onRefresh();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const handleConfirmReverse = async (e) => {
    e.preventDefault();
    if (!reversingEntry || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const rev = await reverseJournalEntry(reversingEntry, reverseReason, currentUser);
      showToast?.(`Jurnal Pembalik ${rev.entryNumber} berhasil diposting!`, 'success');
      setReversingEntry(null);
      setReverseReason('');
      await onRefresh();
    } catch (err) {
      showToast?.(err.message || 'Gagal membuat jurnal pembalik', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePeriodStatusChange = async (period, newStatus) => {
    const reason = newStatus === 'Open' && period.status !== 'Open'
      ? window.prompt(`Masukkan alasan pembukaan kembali periode ${period.periodName}:`)
      : `Perubahan status periode ${period.periodCode} menjadi ${newStatus}`;
    if (newStatus === 'Open' && period.status !== 'Open' && (!reason || !reason.trim())) {
      return;
    }
    const now = new Date().toISOString();
    const updated = {
      ...period,
      status: newStatus,
      ...(newStatus === 'Closed' ? { closedAt: now, closedBy: currentUser?.fullName || 'Admin' } : {}),
      ...(newStatus === 'Locked' ? { lockedAt: now, lockedBy: currentUser?.fullName || 'Admin' } : {}),
      ...(newStatus === 'Open' ? { openedAt: now, openedBy: currentUser?.fullName || 'Admin', reopenReason: reason } : {})
    };
    await saveAccountingPeriod(updated, currentUser, reason);
    showToast?.(`Periode ${period.periodName} diubah ke status ${newStatus}`, 'success');
    await onRefresh();
  };

  const handleAddPeriod = async (e) => {
    e.preventDefault();
    const code = `${newPeriodYear}-${String(newPeriodMonth).padStart(2, '0')}`;
    if (accountingPeriods.some(p => p.periodCode === code)) {
      alert(`Periode ${code} sudah terdaftar.`);
      return;
    }
    await saveAccountingPeriod({
      id: `per-${code}`,
      periodCode: code,
      fiscalYear: Number(newPeriodYear),
      periodMonth: Number(newPeriodMonth),
      periodName: formatPeriodName(code),
      quarter: Math.ceil(Number(newPeriodMonth) / 3),
      status: 'Open',
      openedAt: new Date().toISOString(),
      openedBy: currentUser?.fullName || 'Admin'
    }, currentUser, `Pembukaan periode baru ${code}`);
    showToast?.(`Periode ${formatPeriodName(code)} berhasil dibuka.`, 'success');
    await onRefresh();
  };

  const handleUpdateSequence = async (seq, field, value) => {
    await saveJournalSequence({ ...seq, [field]: value });
    showToast?.(`Format nomor ${seq.journalType} diperbarui.`, 'success');
    await onRefresh();
  };

  const uniquePeriods = useMemo(() => {
    const set = new Set(accountingPeriods.map(p => p.periodCode));
    journalEntries.forEach(j => set.add(j.periodCode || getPeriodCodeFromDate(j.entryDate)));
    return Array.from(set).sort().reverse();
  }, [accountingPeriods, journalEntries]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Jurnal Umum &amp; Manajemen Periode Akuntansi</h2>
            <p className="text-xs text-slate-500">
              Sistem pembukuan berpasangan (Double Entry Accounting) tervalidasi dengan kontrol periode &amp; audit trail
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[
              { id: 'journals', label: 'Daftar Jurnal', icon: BookOpen },
              { id: 'periods', label: 'Periode Akuntansi', icon: Calendar },
              { id: 'sequences', label: 'Penomoran', icon: Settings },
              { id: 'audit', label: 'Audit Trail', icon: History }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                    activeSubTab === tab.id ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Buat Jurnal Baru
          </button>
        </div>
      </div>

      {/* TAB 1: DAFTAR JURNAL */}
      {activeSubTab === 'journals' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Jurnal Posted</span>
              <div className="text-xl font-extrabold text-slate-800 mt-1">{stats.postedCount} Entri</div>
              <p className="text-[11px] text-slate-400 mt-0.5">{stats.draftCount} Draft belum diposting</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Debit (Posted)</span>
              <div className="text-xl font-extrabold text-blue-700 mt-1 font-mono">{formatRupiah(stats.totalDebit)}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Akumulasi seluruh jurnal aktif</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Kredit (Posted)</span>
              <div className="text-xl font-extrabold text-emerald-700 mt-1 font-mono">{formatRupiah(stats.totalCredit)}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Wajib sama dengan Total Debit</p>
            </div>
            <div className={`p-4 rounded-xl border ${stats.isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Status Keseimbangan</span>
              <div className={`text-lg font-extrabold mt-1 flex items-center gap-1.5 ${stats.isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                {stats.isBalanced ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                {stats.isBalanced ? 'SEIMBANG' : 'TIDAK SEIMBANG'}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Double Entry Accounting Check</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari No. Jurnal, referensi, deskripsi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Semua">Semua Jenis Jurnal (11 Tipe)</option>
              {JOURNAL_TYPES.map(jt => (
                <option key={jt.type} value={jt.type}>{jt.type}</option>
              ))}
            </select>

            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Semua">Semua Periode</option>
              {uniquePeriods.map(p => (
                <option key={p} value={p}>{formatPeriodName(p)} ({p})</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Semua">Semua Status</option>
              <option value="Posted">Posted</option>
              <option value="Draft">Draft</option>
              <option value="Reversed">Reversed</option>
              <option value="Void">Void</option>
            </select>
          </div>

          {/* Journal Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                    <th className="py-3 px-4">No. Jurnal</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Jenis Jurnal</th>
                    <th className="py-3 px-4">Referensi &amp; Modul</th>
                    <th className="py-3 px-4">Deskripsi Transaksi</th>
                    <th className="py-3 px-4 text-right">Debit (Rp)</th>
                    <th className="py-3 px-4 text-right">Kredit (Rp)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredJournals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Belum ada entri jurnal yang sesuai filter. Klik <strong>Buat Jurnal Baru</strong> untuk mencatat transaksi.
                      </td>
                    </tr>
                  ) : (
                    filteredJournals.map(j => {
                      const statusBadge = {
                        'Posted': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                        'Draft': 'bg-amber-100 text-amber-800 border-amber-200',
                        'Reversed': 'bg-slate-200 text-slate-700 border-slate-300',
                        'Void': 'bg-rose-100 text-rose-800 border-rose-200'
                      }[j.status] || 'bg-slate-100 text-slate-700';

                      return (
                        <tr key={j.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-indigo-900">{j.entryNumber}</td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDateIndo(j.entryDate)}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-semibold">
                              {j.journalType || 'Jurnal Umum'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-[11px] font-semibold text-slate-700">{j.referenceNo || '-'}</div>
                            <div className="text-[10px] text-slate-400">{j.sourceModule || 'Manual'}</div>
                          </td>
                          <td className="py-3 px-4 max-w-[260px]">
                            <div className="font-medium text-slate-800 truncate">{j.description}</div>
                            {j.vendorOrCustomer && (
                              <div className="text-[10px] text-slate-400 truncate">{j.vendorOrCustomer}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-800">
                            {formatRupiah(j.totalDebit)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                            {formatRupiah(j.totalCredit)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                              {j.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setDetailEntry(j)}
                                className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                                title="Lihat Detail Baris Jurnal"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {j.status === 'Draft' && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditDraft(j)}
                                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                    title="Edit / Posting Draft"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDraft(j)}
                                    className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                    title="Hapus Draft"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              {j.status === 'Posted' && (
                                <button
                                  onClick={() => { setReversingEntry(j); setReverseReason(''); }}
                                  className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                  title="Buat Jurnal Pembalik (Reverse)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: MANAJEMEN PERIODE AKUNTANSI */}
      {activeSubTab === 'periods' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Pengaturan Periode Akuntansi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Periode berstatus <strong>Closed</strong> atau <strong>Locked</strong> otomatis memblokir posting jurnal baru tanpa otorisasi pembukaan kembali.
              </p>
            </div>
            <form onSubmit={handleAddPeriod} className="flex items-center gap-2">
              <select
                value={newPeriodMonth}
                onChange={(e) => setNewPeriodMonth(Number(e.target.value))}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{formatPeriodName(`2026-${String(m).padStart(2, '0')}`).split(' ')[0]}</option>
                ))}
              </select>
              <input
                type="number"
                value={newPeriodYear}
                onChange={(e) => setNewPeriodYear(Number(e.target.value))}
                className="w-20 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                + Buka Periode
              </button>
            </form>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Periode</th>
                  <th className="py-3 px-4 text-center">Triwulan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Keterangan / Otorisasi</th>
                  <th className="py-3 px-4 text-center">Kontrol Periode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accountingPeriods.map(p => (
                  <tr key={p.id || p.periodCode} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{p.periodCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{p.periodName}</td>
                    <td className="py-3 px-4 text-center">Q{p.quarter}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        p.status === 'Open' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : p.status === 'Closed' ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500">
                      {p.status === 'Open' ? `Dibuka oleh ${p.openedBy || 'Sistem'}` : `Ditutup/Dikunci oleh ${p.lockedBy || p.closedBy || 'Admin'}`}
                      {p.reopenReason && <div className="text-[10px] text-amber-700 italic">Alasan buka kembali: {p.reopenReason}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.status === 'Open' ? (
                          <>
                            <button
                              onClick={() => handlePeriodStatusChange(p, 'Closed')}
                              className="px-2.5 py-1 text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-md"
                            >
                              Tutup Periode
                            </button>
                            <button
                              onClick={() => handlePeriodStatusChange(p, 'Locked')}
                              className="px-2.5 py-1 text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 rounded-md flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" /> Kunci
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handlePeriodStatusChange(p, 'Open')}
                            className="px-2.5 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-md flex items-center gap-1"
                          >
                            <Unlock className="w-3 h-3" /> Buka Kembali
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PENGATURAN PENOMORAN JURNAL */}
      {activeSubTab === 'sequences' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Konfigurasi Penomoran Otomatis Jurnal</h3>
            <p className="text-xs text-slate-500">
              Format mendukung token <code>{'{PREFIX}'}</code>, <code>{'{YYYY}'}</code>, <code>{'{MM}'}</code>, dan <code>{'{SEQ}'}</code>.
            </p>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                  <th className="py-2.5 px-4">Jenis Jurnal</th>
                  <th className="py-2.5 px-4">Prefix</th>
                  <th className="py-2.5 px-4">Pola Format</th>
                  <th className="py-2.5 px-4">Contoh Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {journalSequences.map(seq => (
                  <tr key={seq.journalType}>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{seq.journalType}</td>
                    <td className="py-2.5 px-4">
                      <input
                        type="text"
                        disabled={!isAdmin}
                        value={seq.prefix}
                        onChange={(e) => handleUpdateSequence(seq, 'prefix', e.target.value.toUpperCase())}
                        className="w-24 px-2 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <input
                        type="text"
                        disabled={!isAdmin}
                        value={seq.formatPattern}
                        onChange={(e) => handleUpdateSequence(seq, 'formatPattern', e.target.value)}
                        className="w-56 px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-2.5 px-4 font-mono text-indigo-700 font-bold">
                      {generateJournalNumber(seq.journalType, todayStr, [], journalSequences)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Audit Trail Aktivitas Akuntansi</h3>
            <p className="text-xs text-slate-500">Rekaman permanen seluruh posting, pembalikan, perubahan periode, dan pemetaan COA.</p>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-4">Pengguna</th>
                  <th className="py-2.5 px-4">Aksi</th>
                  <th className="py-2.5 px-4">Referensi</th>
                  <th className="py-2.5 px-4">Keterangan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">Belum ada catatan audit trail.</td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{log.userName}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-indigo-700 font-bold">{log.referenceNo || log.entityId || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-600">{log.reason || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL INPUT JURNAL DOUBLE ENTRY */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                {editingEntry ? `Edit Draft Jurnal: ${editingEntry.entryNumber}` : 'Form Input Jurnal Umum (Double Entry)'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {formTotals.isPeriodBlocked && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-semibold">
                  <Lock className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  Periode {formTotals.periodCode} berstatus {formTotals.periodObj?.status}. Anda tidak dapat memposting jurnal pada periode ini.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nomor Jurnal *</label>
                  <input
                    type="text"
                    value={formData.entryNumber}
                    onChange={(e) => setFormData({ ...formData, entryNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tanggal Transaksi *</label>
                  <input
                    type="date"
                    value={formData.entryDate}
                    onChange={(e) => handleTypeOrDateChange('entryDate', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Jenis Jurnal</label>
                  <select
                    value={formData.journalType}
                    onChange={(e) => handleTypeOrDateChange('journalType', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {JOURNAL_TYPES.map(jt => (
                      <option key={jt.type} value={jt.type}>{jt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">No. Referensi</label>
                  <input
                    type="text"
                    placeholder="Contoh: INV-2026-001"
                    value={formData.referenceNo}
                    onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Vendor / Pelanggan</label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    value={formData.vendorOrCustomer}
                    onChange={(e) => setFormData({ ...formData, vendorOrCustomer: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Departemen / Cost Center</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Deskripsi Transaksi *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Setoran modal awal tunai ke Bank BCA"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Lines Table */}
              <div className="border border-slate-200 rounded-xl overflow-visible">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="py-2.5 px-3 text-left w-8">#</th>
                      <th className="py-2.5 px-3 text-left min-w-[260px]">Akun COA *</th>
                      <th className="py-2.5 px-3 text-left">Keterangan Baris</th>
                      <th className="py-2.5 px-3 text-right w-40">Debit (Rp)</th>
                      <th className="py-2.5 px-3 text-right w-40">Kredit (Rp)</th>
                      <th className="py-2.5 px-3 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <SearchableSelect
                            options={coaOptions}
                            value={line.accountCode}
                            onChange={(val) => handleLineChange(idx, 'accountCode', val)}
                            placeholder="Cari kode / nama akun..."
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Catatan baris..."
                            value={line.description}
                            onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            value={line.debit || ''}
                            onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 text-xs text-right font-mono font-bold text-blue-800 bg-blue-50/40 border border-slate-300 rounded-lg"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            value={line.credit || ''}
                            onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 text-xs text-right font-mono font-bold text-emerald-800 bg-emerald-50/40 border border-slate-300 rounded-lg"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          {lines.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-xs border-t border-slate-300">
                      <td colSpan={3} className="py-2.5 px-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setLines([...lines, { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 }])}
                          className="text-indigo-700 hover:underline font-bold text-xs"
                        >
                          + Tambah Baris Akun
                        </button>
                        <span className="uppercase text-slate-600">TOTAL</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-800">{formatRupiah(formTotals.totalDebit)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-800">{formatRupiah(formTotals.totalCredit)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Balance Status Banner */}
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                formTotals.isBalanced
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  {formTotals.isBalanced ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  {formTotals.isBalanced
                    ? `Jurnal Seimbang — Total Debit = Total Kredit = ${formatRupiah(formTotals.totalDebit)}`
                    : `Belum Seimbang — Selisih: ${formatRupiah(formTotals.diff)}`}
                </div>
                <span className="text-[11px] font-mono">Periode: {formTotals.periodCode}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveJournal('Draft')}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  Simpan Draft
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !formTotals.isBalanced || formTotals.isPeriodBlocked}
                  onClick={() => handleSaveJournal('Posted')}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Posting Jurnal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL JURNAL */}
      {detailEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">{detailEntry.entryNumber} • {detailEntry.journalType || 'Jurnal Umum'}</h3>
                <p className="text-xs text-slate-300">{formatDateIndo(detailEntry.entryDate)} • Modul: {detailEntry.sourceModule}</p>
              </div>
              <button onClick={() => setDetailEntry(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div><strong>Deskripsi:</strong> {detailEntry.description}</div>
                <div className="flex flex-wrap gap-4 text-slate-600">
                  <span><strong>Status:</strong> {detailEntry.status}</span>
                  <span><strong>Referensi:</strong> {detailEntry.referenceNo || '-'}</span>
                  <span><strong>Diposting Oleh:</strong> {detailEntry.postedBy || detailEntry.createdBy || '-'}</span>
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="py-2 px-3 text-left">Kode</th>
                      <th className="py-2 px-3 text-left">Nama Akun</th>
                      <th className="py-2 px-3 text-left">Keterangan</th>
                      <th className="py-2 px-3 text-right">Debit</th>
                      <th className="py-2 px-3 text-right">Kredit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(detailEntry.lines || []).map((l, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-mono font-bold">{l.accountCode}</td>
                        <td className="py-2 px-3 font-semibold">{l.accountName}</td>
                        <td className="py-2 px-3 text-slate-500">{l.description || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono text-blue-800">{Number(l.debit) > 0 ? formatRupiah(l.debit) : '–'}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-800">{Number(l.credit) > 0 ? formatRupiah(l.credit) : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={3} className="py-2 px-3">TOTAL</td>
                      <td className="py-2 px-3 text-right font-mono text-blue-800">{formatRupiah(detailEntry.totalDebit)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-800">{formatRupiah(detailEntry.totalCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI JURNAL PEMBALIK (REVERSAL) */}
      {reversingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <form onSubmit={handleConfirmReverse} className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-amber-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Buat Jurnal Pembalik ({reversingEntry.entryNumber})
              </h3>
              <button type="button" onClick={() => setReversingEntry(null)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Jurnal berstatus <strong>Posted</strong> tidak boleh dihapus. Sistem akan membuat jurnal baru dengan posisi Debit &amp; Kredit dibalik dan menandai jurnal asli sebagai <strong>Reversed</strong>.
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Alasan Pembalikan (Wajib Audit Trail) *</label>
                <textarea
                  required
                  rows={3}
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder="Contoh: Koreksi salah pilih akun beban atau nominal..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setReversingEntry(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold">
                  {isSubmitting ? 'Memproses...' : 'Posting Jurnal Pembalik'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

