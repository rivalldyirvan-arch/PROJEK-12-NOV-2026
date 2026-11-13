import React, { useState } from 'react';
import { 
  Users2, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  Trash2, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Eye,
  Receipt
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/taxRules';
import { saveVendor, deleteVendor, getVendorDeposit } from '../lib/databaseService';

const VENDOR_CATEGORIES = [
  'IT & Software',
  'Konsultan & Jasa Profesional',
  'Sewa & Gedung',
  'Konstruksi & Renovasi',
  'Material & Perlengkapan',
  'Logistik & Ekspedisi',
  'Lain-lain'
];

export default function VendorModule({ vendorList = [], purchaseRequests = [], taxRecords = [], onRefresh, showToast }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [viewingVendor, setViewingVendor] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'Badan',
    category: 'IT & Software',
    npwp: '',
    hasNpwp: true,
    address: '',
    city: 'Jakarta',
    picName: '',
    picEmail: '',
    picPhone: '',
    bankName: 'BCA',
    bankAccount: '',
    bankAccountHolder: '',
    paymentTerm: 'Net 30',
    status: 'Aktif',
    notes: ''
  });

  // Filter
  const filteredVendors = vendorList.filter((v) => {
    const matchesType = selectedType === 'Semua' || v.type === selectedType;
    const matchesSearch = 
      v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.npwp && v.npwp.includes(searchTerm)) ||
      (v.picName && v.picName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleOpenAdd = () => {
    setEditingVendor(null);
    const nextNumber = vendorList.length + 1;
    const autoCode = `VND-${String(nextNumber).padStart(3, '0')}`;

    setFormData({
      code: autoCode,
      name: '',
      type: 'Badan',
      category: 'IT & Software',
      npwp: '',
      hasNpwp: true,
      address: '',
      city: 'Jakarta',
      picName: '',
      picEmail: '',
      picPhone: '',
      bankName: 'BCA',
      bankAccount: '',
      bankAccountHolder: '',
      paymentTerm: 'Net 30',
      status: 'Aktif',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVendor(v);
    setFormData({
      code: v.code,
      name: v.name,
      type: v.type,
      category: v.category,
      npwp: v.npwp || '',
      hasNpwp: !!v.hasNpwp,
      address: v.address || '',
      city: v.city || '',
      picName: v.picName || '',
      picEmail: v.picEmail || '',
      picPhone: v.picPhone || '',
      bankName: v.bankName || 'BCA',
      bankAccount: v.bankAccount || '',
      bankAccountHolder: v.bankAccountHolder || '',
      paymentTerm: v.paymentTerm || 'Net 30',
      status: v.status || 'Aktif',
      notes: v.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (v) => {
    if (window.confirm(`Hapus data rekanan "${v.name}"?`)) {
      await deleteVendor(v.id);
      showToast?.(`Rekanan ${v.name} berhasil dihapus`, 'success');
      onRefresh();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Nama Vendor / Rekanan wajib diisi!');
      return;
    }

    const payload = {
      ...formData,
      id: editingVendor ? editingVendor.id : `vnd-${Date.now()}`
    };

    await saveVendor(payload);
    showToast?.(`Data rekanan ${formData.name} berhasil disimpan`, 'success');
    setIsModalOpen(false);
    onRefresh();
  };

  const handleExportCSV = () => {
    const headers = ['Kode Vendor,Nama Rekanan,Tipe,Kategori,NPWP,Memiliki NPWP,PIC,Email,Telepon,Bank,No Rekening,Atas Nama,TOP,Status'];
    const rows = filteredVendors.map(v => 
      `"${v.code}","${v.name}","${v.type}","${v.category}","${v.npwp || ''}","${v.hasNpwp ? 'Ya' : 'Tidak'}","${v.picName || ''}","${v.picEmail || ''}","${v.picPhone || ''}","${v.bankName || ''}","${v.bankAccount || ''}","${v.bankAccountHolder || ''}","${v.paymentTerm}","${v.status}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daftar_Supplier_Vendor_${new Date().toISOString().slice(0, 10)}.csv`);
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
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">2. Modul Master Supplier & Rekanan (Vendor)</h2>
              <p className="text-xs text-slate-500">Database rekanan bisnis, informasi perpajakan (NPWP/NIK) dan rekening bank pembayaran</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor CSV
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Vendor Baru
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['Semua', 'Badan', 'Orang Pribadi'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedType === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'Semua' ? 'Semua Rekanan' : `Entitas ${type}`}
            </button>
          ))}
        </div>

        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama, NPWP, kategori, atau PIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200">
            Tidak ada vendor yang cocok dengan kriteria pencarian.
          </div>
        ) : (
          filteredVendors.map((vendor) => {
            const linkedPRs = purchaseRequests.filter(p => p.vendorId === vendor.id);
            const linkedTaxes = taxRecords.filter(t => t.vendorId === vendor.id);
            const vendorDeposit = getVendorDeposit(vendor.id);

            return (
              <div 
                key={vendor.id} 
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {vendor.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {vendorDeposit?.balance > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200" title="Saldo deposit vendor">
                          Deposit: {formatRupiah(vendorDeposit.balance)}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        vendor.type === 'Badan' ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {vendor.type}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        vendor.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {vendor.status}
                      </span>
                    </div>
                  </div>

                  {/* Title & Category */}
                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1" title={vendor.name}>
                    {vendor.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{vendor.category}</p>

                  {/* Tax NPWP info */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">NPWP / NIK:</span>
                      {vendor.hasNpwp && vendor.npwp ? (
                        <span className="font-mono font-bold text-slate-800">{vendor.npwp}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                          <AlertTriangle className="w-3 h-3" /> Non-NPWP (+100% PPh)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Term of Payment:</span>
                      <span className="font-semibold text-slate-700">{vendor.paymentTerm}</span>
                    </div>
                  </div>

                  {/* Bank Account */}
                  <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">{vendor.bankName} - {vendor.bankAccount || '-'}</div>
                      <div className="text-[11px] text-slate-500">a/n {vendor.bankAccountHolder || vendor.name}</div>
                    </div>
                  </div>

                  {/* PIC Contact */}
                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-[130px]">{vendor.picName || 'PIC Belum Ada'}</span>
                    </div>
                    {vendor.picPhone && (
                      <span className="font-mono text-[11px] text-slate-600">{vendor.picPhone}</span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setViewingVendor(vendor)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Riwayat Transaksi ({linkedPRs.length})
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(vendor)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      title="Edit Vendor"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(vendor)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Vendor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add / Edit Vendor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users2 className="w-4 h-4 text-emerald-400" />
                {editingVendor ? `Edit Rekanan: ${editingVendor.name}` : 'Tambah Rekanan / Vendor Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kode Vendor *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tipe Entitas *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="Badan">Badan Usaha (PT / CV / Firma)</option>
                    <option value="Orang Pribadi">Orang Pribadi (Tenaga Ahli / Vendor)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kategori Jasa / Produk
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {VENDOR_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Resmi Vendor / Rekanan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Sarana Digital Solusi"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Pajak Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Kepatuhan Pajak (NPWP / NIK)</span>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasNpwp}
                      onChange={(e) => setFormData({ ...formData, hasNpwp: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>Memiliki NPWP Valid</span>
                  </label>
                </div>

                {formData.hasNpwp ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nomor NPWP (15 atau 16 digit)
                    </label>
                    <input
                      type="text"
                      placeholder="01.234.567.8-012.000"
                      value={formData.npwp}
                      onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                    <span>Vendor tanpa NPWP akan otomatis dikenakan tarif pemotongan PPh 20% lebih tinggi (PPh 21) atau 100% lebih tinggi (PPh 23/22).</span>
                  </div>
                )}
              </div>

              {/* Bank Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Bank
                  </label>
                  <input
                    type="text"
                    placeholder="BCA / Mandiri / BRI / BNI"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nomor Rekening
                  </label>
                  <input
                    type="text"
                    placeholder="123-456-7890"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Pemilik Rekening
                  </label>
                  <input
                    type="text"
                    placeholder="Sesuai buku tabungan"
                    value={formData.bankAccountHolder}
                    onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* PIC Contact */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama PIC
                  </label>
                  <input
                    type="text"
                    placeholder="Dimas Wicaksono"
                    value={formData.picName}
                    onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email PIC
                  </label>
                  <input
                    type="email"
                    placeholder="pic@vendor.co.id"
                    value={formData.picEmail}
                    onChange={(e) => setFormData({ ...formData, picEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    No HP / Telepon
                  </label>
                  <input
                    type="text"
                    placeholder="0812-3456-7890"
                    value={formData.picPhone}
                    onChange={(e) => setFormData({ ...formData, picPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Address & Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Alamat Lengkap
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Jl. Rasuna Said Kav. 5..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Term of Payment (TOP)
                    </label>
                    <select
                      value={formData.paymentTerm}
                      onChange={(e) => setFormData({ ...formData, paymentTerm: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Cash">Cash On Delivery / Cash</option>
                      <option value="Net 7">Net 7 Hari</option>
                      <option value="Net 14">Net 14 Hari</option>
                      <option value="Net 30">Net 30 Hari (1 Bulan)</option>
                      <option value="Net 60">Net 60 Hari (2 Bulan)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Status Rekanan
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
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
                  Simpan Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Vendor Profile & Transaction History */}
      {viewingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">{viewingVendor.name}</h3>
                <p className="text-xs text-slate-400 font-mono">{viewingVendor.code} • {viewingVendor.type}</p>
              </div>
              <button 
                onClick={() => setViewingVendor(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500">NPWP / NIK:</span>
                  <div className="font-mono font-bold text-slate-800">{viewingVendor.npwp || 'Tidak Memiliki NPWP'}</div>
                </div>
                <div>
                  <span className="text-slate-500">Term of Payment:</span>
                  <div className="font-bold text-slate-800">{viewingVendor.paymentTerm}</div>
                </div>
                <div>
                  <span className="text-slate-500">Bank Transfer:</span>
                  <div className="font-semibold text-slate-800">{viewingVendor.bankName} - {viewingVendor.bankAccount}</div>
                  <div className="text-[11px] text-slate-500">a/n {viewingVendor.bankAccountHolder}</div>
                </div>
                <div>
                  <span className="text-slate-500">Kontak PIC:</span>
                  <div className="font-semibold text-slate-800">{viewingVendor.picName} ({viewingVendor.picPhone})</div>
                  <div className="text-[11px] text-slate-500">{viewingVendor.picEmail}</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Riwayat Pengajuan Pembelian Terkait
                </h4>
                {purchaseRequests.filter(p => p.vendorId === viewingVendor.id).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada pengajuan pembelian untuk rekanan ini.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {purchaseRequests
                      .filter(p => p.vendorId === viewingVendor.id)
                      .map(p => (
                        <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-800">{p.requestNumber}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-700">{p.status}</span>
                            </div>
                            <p className="text-slate-600 mt-0.5">{p.title}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900">{formatRupiah(p.totalPayable)}</span>
                            {p.pphType !== 'Non-PPh' && (
                              <div className="text-[10px] text-purple-700">Pot. {p.pphType}: {formatRupiah(p.pphAmount)}</div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-right">
              <button
                onClick={() => setViewingVendor(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

