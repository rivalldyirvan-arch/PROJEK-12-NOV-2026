import React, { useState } from 'react';
import { 
  FolderTree, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Layers,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';
import { formatRupiah } from '../lib/taxRules';
import { saveCOAAccount, deleteCOAAccount } from '../lib/databaseService';

const CATEGORIES = ['Semua', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

const CATEGORY_LABELS = {
  'Asset': 'Aset / Aktiva',
  'Liability': 'Kewajiban / Liabilitas',
  'Equity': 'Ekuitas / Modal',
  'Revenue': 'Pendapatan',
  'Expense': 'Beban / Biaya'
};

export default function CoaModule({ coaList = [], onRefresh, showToast }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

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

  // Filtered List
  const filteredList = coaList.filter((item) => {
    const matchesCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
    const matchesSearch = 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subCategory && item.subCategory.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Totals
  const totalDebit = coaList
    .filter(a => a.normalBalance === 'Debit')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const totalCredit = coaList
    .filter(a => a.normalBalance === 'Credit')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

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
    if (!formData.code || !formData.name) {
      alert('Kode Akun dan Nama Akun wajib diisi!');
      return;
    }

    const payload = {
      ...formData,
      id: editingAccount ? editingAccount.id : formData.code,
      balance: Number(formData.balance) || 0
    };

    await saveCOAAccount(payload);
    showToast?.(`Akun ${formData.code} berhasil disimpan`, 'success');
    setIsModalOpen(false);
    onRefresh();
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

        <div className="flex items-center gap-2.5">
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
                  const categoryBadgeColor = {
                    'Asset': 'bg-blue-50 text-blue-700 border-blue-200',
                    'Liability': 'bg-amber-50 text-amber-700 border-amber-200',
                    'Equity': 'bg-purple-50 text-purple-700 border-purple-200',
                    'Revenue': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'Expense': 'bg-rose-50 text-rose-700 border-rose-200'
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
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${categoryBadgeColor[acc.category] || 'bg-slate-100 text-slate-700'}`}>
                          {acc.category}
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
                        {formatRupiah(acc.balance)}
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
                      const defaultNormal = (cat === 'Asset' || cat === 'Expense') ? 'Debit' : 'Credit';
                      setFormData({ ...formData, category: cat, normalBalance: defaultNormal });
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Asset">Asset (Aset)</option>
                    <option value="Liability">Liability (Kewajiban / Hutang)</option>
                    <option value="Equity">Equity (Modal / Ekuitas)</option>
                    <option value="Revenue">Revenue (Pendapatan)</option>
                    <option value="Expense">Expense (Beban / Biaya)</option>
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

