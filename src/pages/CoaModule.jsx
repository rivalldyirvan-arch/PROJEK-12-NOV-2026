import React, { useState, useMemo } from 'react';
import { 
  FolderTree, 
  Plus, 
  Search, 
  Download, 
  Edit3, 
  Trash2, 
  X, 
  Settings2,
  CheckCircle2,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { formatRupiah } from '../lib/taxRules';
import { saveCOAAccount, deleteCOAAccount, saveCoaMapping, recordAuditLog } from '../lib/databaseService';
import { calculateBalancesFromJournals } from '../lib/accountingService';
import { useAuth } from '../lib/authContext';
import SearchableSelect from '../components/SearchableSelect';

const CATEGORIES = ['Semua', 'Asset', 'Liability', 'Equity', 'Revenue', 'COGS', 'Expense', 'Other Revenue', 'Other Expense'];

const CATEGORY_LABELS = {
  'Asset': 'Aset',
  'Liability': 'Kewajiban',
  'Equity': 'Ekuitas',
  'Revenue': 'Pendapatan',
  'COGS': 'Harga Pokok Penjualan',
  'Expense': 'Beban Operasional',
  'Other Revenue': 'Pendapatan Lain-lain',
  'Other Expense': 'Beban Lain-lain'
};

export default function CoaModule({ coaList = [], journalEntries = [], coaMappings = [], onRefresh, showToast }) {
  const { currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('accounts'); // 'accounts' | 'mappings'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [savingMappingKey, setSavingMappingKey] = useState(null);

  // Hitung saldo aktual dari jurnal yang sudah diposting
  const journalBalanceMap = useMemo(
    () => calculateBalancesFromJournals(coaList, journalEntries),
    [coaList, journalEntries]
  );

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Expense',
    subCategory: 'Beban Operasional',
    normalBalance: 'Debit',
    level: 3,
    balance: 0,
    isActive: true
  });

  // Helper klasifikasi 8 kelompok termasuk akun 5xxx yang sebelumnya Expense/HPP
  const getEffectiveCategory = (acc) => {
    if (acc.category === 'Expense' && (acc.subCategory === 'HPP' || String(acc.code).startsWith('5'))) {
      return 'COGS';
    }
    return acc.category;
  };

  // Filtered List
  const filteredList = coaList.filter((item) => {
    const effCat = getEffectiveCategory(item);
    const matchesCategory = selectedCategory === 'Semua' || effCat === selectedCategory;
    const matchesSearch = 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subCategory && item.subCategory.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Totals (menggabungkan saldo jurnal terposting jika ada)
  const getAccountDisplayBalance = (acc) => {
    const jBal = journalBalanceMap[acc.code]?.netBalance || 0;
    return (Number(acc.balance) || 0) + jBal;
  };

  const totalDebit = coaList
    .filter(a => a.normalBalance === 'Debit')
    .reduce((sum, a) => sum + getAccountDisplayBalance(a), 0);

  const totalCredit = coaList
    .filter(a => a.normalBalance === 'Credit')
    .reduce((sum, a) => sum + getAccountDisplayBalance(a), 0);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormData({
      code: '',
      name: '',
      category: 'Expense',
      subCategory: 'Beban Operasional',
      normalBalance: 'Debit',
      level: 3,
      balance: 0,
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc) => {
    setEditingAccount(acc);
    setFormData({
      code: acc.code,
      name: acc.name,
      category: acc.category,
      subCategory: acc.subCategory || '',
      normalBalance: acc.normalBalance,
      level: acc.level || 3,
      balance: acc.balance || 0,
      isActive: acc.isActive !== false
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (acc) => {
    if (window.confirm(`Hapus akun ${acc.code} - ${acc.name}?`)) {
      await deleteCOAAccount(acc.id);
      showToast?.(`Akun ${acc.code} berhasil dihapus`, 'success');
      onRefresh();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = (formData.code || '').trim();
    const cleanName = (formData.name || '').trim();
    if (!cleanCode || !cleanName) {
      alert('Kode Akun dan Nama Akun wajib diisi!');
      return;
    }

    // Cegah akun duplikat (kode maupun nama identik pada akun baru)
    const duplicateCode = coaList.find(
      a => a.code.trim().toLowerCase() === cleanCode.toLowerCase() && (!editingAccount || a.id !== editingAccount.id)
    );
    if (duplicateCode) {
      alert(`Gagal: Kode akun "${cleanCode}" sudah terdaftar (${duplicateCode.name}). Sistem melarang akun duplikat.`);
      return;
    }

    const payload = {
      ...formData,
      code: cleanCode,
      name: cleanName,
      id: editingAccount ? editingAccount.id : cleanCode,
      balance: Number(formData.balance) || 0
    };

    await saveCOAAccount(payload);
    await recordAuditLog({
      userId: currentUser?.id || null,
      userName: currentUser?.fullName || 'Sistem',
      action: editingAccount ? 'UPDATE_COA' : 'CREATE_COA',
      entityType: 'coa',
      entityId: payload.id,
      referenceNo: payload.code,
      beforeData: editingAccount ? { name: editingAccount.name, category: editingAccount.category } : null,
      afterData: { code: payload.code, name: payload.name, category: payload.category },
      reason: editingAccount ? 'Pembaruan data akun COA' : 'Penambahan akun COA baru'
    });
    showToast?.(`Akun ${cleanCode} berhasil disimpan`, 'success');
    setIsModalOpen(false);
    onRefresh();
  };

  const handleMappingChange = async (mapping, newAccountCode) => {
    if (!newAccountCode) return;
    setSavingMappingKey(mapping.mappingKey);
    try {
      await saveCoaMapping({ ...mapping, accountCode: newAccountCode }, currentUser);
      showToast?.(`Pemetaan "${mapping.label}" diperbarui ke akun ${newAccountCode}`, 'success');
      onRefresh();
    } catch (err) {
      showToast?.('Gagal menyimpan pemetaan COA: ' + (err.message || 'Error'), 'error');
    } finally {
      setSavingMappingKey(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Kode Akun,Nama Akun,Kategori,Sub Kategori,Saldo Normal,Level,Saldo Berjalan,Status'];
    const rows = filteredList.map(a => 
      `"${a.code}","${a.name}","${a.category}","${a.subCategory || ''}","${a.normalBalance}","${a.level}","${a.balance}","${a.isActive ? 'Aktif' : 'Nonaktif'}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `COA_Chart_of_Accounts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">1. Modul Bagan Akun (Chart of Accounts / COA)</h2>
              <p className="text-xs text-slate-500">Struktur kode rekening standar akuntansi Indonesia untuk alokasi pengeluaran & pajak</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('accounts')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeSubTab === 'accounts' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              Daftar Akun
            </button>
            <button
              onClick={() => setActiveSubTab('mappings')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeSubTab === 'mappings' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Pemetaan COA Otomatis
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
            title="Export CSV kompatibel Excel / Google Sheets"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor CSV
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Akun Baru
          </button>
        </div>
      </div>

      {activeSubTab === 'mappings' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-600" />
                Pengaturan Akun Otomatis Antar Modul
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Menentukan kode akun COA bawaan yang digunakan saat sistem membuat jurnal otomatis dari modul Penjualan, Pembelian, Kas &amp; Bank, Aset Tetap, Pajak, dan Closing.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {coaMappings.length} Pemetaan Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coaMappings.map((m) => {
              const selectedAcc = coaList.find(c => c.code === m.accountCode);
              return (
                <div key={m.mappingKey} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {m.moduleGroup}
                    </span>
                    {savingMappingKey === m.mappingKey ? (
                      <span className="text-[10px] text-amber-600 font-semibold">Menyimpan...</span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {m.accountCode}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{m.label}</div>
                    <div className="text-[11px] text-slate-500">{m.description}</div>
                  </div>
                  <SearchableSelect
                    options={coaList.map(c => ({ value: c.code, label: `${c.code} - ${c.name}`, subLabel: c.category }))}
                    value={m.accountCode}
                    onChange={(val) => handleMappingChange(m, val)}
                    placeholder="Pilih akun COA..."
                  />
                  {!selectedAcc && (
                    <div className="text-[10px] text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Akun {m.accountCode} tidak ditemukan di master COA!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
      <>

      {/* Summary Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Akun Aktif</span>
          <div className="text-xl font-bold text-slate-800 mt-1">{coaList.length} Akun</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Klasifikasi Aset, Liabilitas, Ekuitas, Pendapatan, Beban</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Saldo Debit</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{formatRupiah(totalDebit)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Aset Lancar, Kas, Bank & Beban Usaha</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Saldo Kredit</span>
          <div className="text-xl font-bold text-teal-700 mt-1">{formatRupiah(totalCredit)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Hutang Dagang, Hutang Pajak PPh, & Ekuitas</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'Semua' ? 'Semua Akun' : (CATEGORY_LABELS[cat] || cat)}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari kode atau nama akun..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* COA Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Kode Akun</th>
                <th className="py-3 px-4">Nama Akun</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Sub-Klasifikasi</th>
                <th className="py-3 px-4 text-center">Saldo Normal</th>
                <th className="py-3 px-4 text-right">Saldo Berjalan</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada akun yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((acc) => {
                  const effCategory = getEffectiveCategory(acc);
                  const categoryBadgeColor = {
                    'Asset': 'bg-blue-50 text-blue-700 border-blue-200',
                    'Liability': 'bg-amber-50 text-amber-700 border-amber-200',
                    'Equity': 'bg-purple-50 text-purple-700 border-purple-200',
                    'Revenue': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'COGS': 'bg-orange-50 text-orange-700 border-orange-200',
                    'Expense': 'bg-rose-50 text-rose-700 border-rose-200',
                    'Other Revenue': 'bg-teal-50 text-teal-700 border-teal-200',
                    'Other Expense': 'bg-pink-50 text-pink-700 border-pink-200'
                  };

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {acc.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <span className={acc.level === 1 ? 'font-bold text-slate-900' : (acc.level === 2 ? 'font-semibold' : '')}>
                          {acc.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${categoryBadgeColor[effCategory] || 'bg-slate-100 text-slate-700'}`}>
                          {CATEGORY_LABELS[effCategory] || acc.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {acc.subCategory || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          acc.normalBalance === 'Debit' ? 'bg-sky-100 text-sky-800' : 'bg-teal-100 text-teal-800'
                        }`}>
                          {acc.normalBalance}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {formatRupiah(getAccountDisplayBalance(acc))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          acc.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {acc.isActive !== false ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                            title="Edit Akun"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(acc)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal Add / Edit COA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-emerald-400" />
                {editingAccount ? `Edit Akun: ${editingAccount.code}` : 'Tambah Akun COA Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kode Akun *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 6108"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Level Akun
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={1}>Level 1 (Akun Induk Utama)</option>
                    <option value={2}>Level 2 (Sub-Klasifikasi)</option>
                    <option value={3}>Level 3 (Buku Besar / Standar)</option>
                    <option value={4}>Level 4 (Sub-Akun Rinci)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Akun *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beban Pemeliharaan Server Cloud"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kategori Utama
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const defaultNormal = (cat === 'Asset' || cat === 'COGS' || cat === 'Expense' || cat === 'Other Expense') ? 'Debit' : 'Credit';
                      setFormData({ ...formData, category: cat, normalBalance: defaultNormal });
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Asset">Aset (Asset)</option>
                    <option value="Liability">Kewajiban (Liability)</option>
                    <option value="Equity">Ekuitas (Equity)</option>
                    <option value="Revenue">Pendapatan (Revenue)</option>
                    <option value="COGS">Harga Pokok Penjualan (HPP)</option>
                    <option value="Expense">Beban Operasional (Expense)</option>
                    <option value="Other Revenue">Pendapatan Lain-lain</option>
                    <option value="Other Expense">Beban Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Saldo Normal
                  </label>
                  <select
                    value={formData.normalBalance}
                    onChange={(e) => setFormData({ ...formData, normalBalance: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit (Kredit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sub-Klasifikasi / Grup
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kas & Bank, Hutang Pajak, Beban Operasional"
                  value={formData.subCategory}
                  onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Saldo Berjalan (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>Akun Aktif (Bisa Dipilih)</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

