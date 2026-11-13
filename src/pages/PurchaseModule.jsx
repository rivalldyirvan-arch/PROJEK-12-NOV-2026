import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Download,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  FileText,
  X,
  Building,
  Calculator,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { formatRupiah, formatDateIndo, TAX_TYPES, calculateTax } from '../lib/taxRules';
import { savePurchaseRequest, deletePurchaseRequest } from '../lib/databaseService';
import PurchasePrintPreviewModal from './PurchasePrintPreviewModal';

const DEPARTMENTS = [
  'Finance & Accounting',
  'IT & Infrastructure',
  'HR & GA',
  'Marketing & Sales',
  'Operations',
  'Executive & Legal'
];

const STATUS_FILTERS = ['Semua', 'Draft', 'Menunggu Persetujuan', 'Disetujui', 'Lunas', 'Ditolak'];

export default function PurchaseModule({
  purchaseRequests = [],
  vendorList = [],
  coaList = [],
  onRefresh,
  showToast
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPR, setEditingPR] = useState(null);
  const [printPR, setPrintPR] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    requestNumber: '',
    requestDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    requesterName: '',
    department: 'Finance & Accounting',
    vendorId: '',
    vendorName: '',
    title: '',
    description: '',
    subtotal: 0,
    discount: 0,
    dpp: 0,
    ppnRate: 11,
    ppnAmount: 0,
    pphType: 'PPh 23',
    pphRate: 2.0,
    pphAmount: 0,
    totalPayable: 0,
    grandTotal: 0,
    status: 'Menunggu Persetujuan',
    coaDebitAccount: '6103',
    coaCreditAccount: '2101',
    items: [
      { id: '1', description: '', coaId: '6103', qty: 1, unit: 'Bulan', unitPrice: 0, subtotal: 0 }
    ]
  });

  // Filtered List
  const filteredList = purchaseRequests.filter((pr) => {
    const matchesStatus = selectedStatus === 'Semua' || pr.status === selectedStatus;
    const matchesSearch =
      pr.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.requesterName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Open Create Form
  const handleOpenAdd = () => {
    setEditingPR(null);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(0, 6);
    const count = purchaseRequests.length + 1;
    const autoNumber = `PR-${dateStr}-${String(count).padStart(3, '0')}`;

    const defaultVendor = vendorList[0] || null;

    setFormData({
      requestNumber: autoNumber,
      requestDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      requesterName: 'Ahmad Fauzi',
      department: 'Finance & Accounting',
      vendorId: defaultVendor ? defaultVendor.id : '',
      vendorName: defaultVendor ? defaultVendor.name : '',
      title: '',
      description: '',
      subtotal: 0,
      discount: 0,
      dpp: 0,
      ppnRate: 11,
      ppnAmount: 0,
      pphType: 'PPh 23',
      pphRate: 2.0,
      pphAmount: 0,
      totalPayable: 0,
      grandTotal: 0,
      status: 'Menunggu Persetujuan',
      coaDebitAccount: '6103',
      coaCreditAccount: '2101',
      items: [
        { id: 'item-1', description: '', coaId: '6103', qty: 1, unit: 'Unit', unitPrice: 0, subtotal: 0 }
      ]
    });
    setIsModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (pr) => {
    setEditingPR(pr);
    setFormData({
      ...pr,
      items: pr.items && pr.items.length > 0 ? pr.items : [
        { id: 'item-1', description: pr.title, coaId: pr.coaDebitAccount || '6103', qty: 1, unit: 'Paket', unitPrice: pr.subtotal, subtotal: pr.subtotal }
      ]
    });
    setIsModalOpen(true);
  };

  // Calculate totals when line items, taxes, or vendor changes
  const recalculateTotals = (items, discountVal, ppnRateVal, pphTypeVal, pphRateVal, vendorIdVal) => {
    const sub = items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
    const disc = Number(discountVal) || 0;
    const dpp = Math.max(0, sub - disc);

    // PPN
    const ppnRate = Number(ppnRateVal) || 0;
    const ppnAmount = Math.round((dpp * ppnRate) / 100);

    // Selected Vendor check for NPWP penalty
    const vendor = vendorList.find(v => v.id === (vendorIdVal || formData.vendorId));
    const hasNpwp = vendor ? vendor.hasNpwp : true;

    // PPh
    let pphRate = Number(pphRateVal) || 0;
    if (pphTypeVal === 'Non-PPh') {
      pphRate = 0;
    }

    const taxCalc = calculateTax({
      taxType: pphTypeVal,
      baseRate: pphRate,
      hasNpwp,
      dpp
    });

    const pphAmount = taxCalc.taxAmount;
    const totalPayable = dpp + ppnAmount - pphAmount;
    const grandTotal = dpp + ppnAmount;

    return {
      subtotal: sub,
      discount: disc,
      dpp,
      ppnRate,
      ppnAmount,
      pphType: pphTypeVal,
      pphRate,
      pphAmount,
      totalPayable,
      grandTotal
    };
  };

  // Line item handlers
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'qty' || field === 'unitPrice') {
      const q = field === 'qty' ? Number(value) : Number(item.qty || 1);
      const p = field === 'unitPrice' ? Number(value) : Number(item.unitPrice || 0);
      item.subtotal = q * p;
    }

    newItems[index] = item;
    const calculated = recalculateTotals(
      newItems,
      formData.discount,
      formData.ppnRate,
      formData.pphType,
      formData.pphRate,
      formData.vendorId
    );

    setFormData({
      ...formData,
      items: newItems,
      ...calculated
    });
  };

  const handleAddItem = () => {
    const newItems = [
      ...formData.items,
      { id: `item-${Date.now()}`, description: '', coaId: formData.coaDebitAccount || '6103', qty: 1, unit: 'Unit', unitPrice: 0, subtotal: 0 }
    ];
    setFormData({ ...formData, items: newItems });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, idx) => idx !== index);
    const calculated = recalculateTotals(
      newItems,
      formData.discount,
      formData.ppnRate,
      formData.pphType,
      formData.pphRate,
      formData.vendorId
    );
    setFormData({ ...formData, items: newItems, ...calculated });
  };

  const handleVendorSelect = (vId) => {
    const v = vendorList.find(x => x.id === vId);
    let defaultPph = formData.pphType;
    let defaultRate = formData.pphRate;

    if (v) {
      if (v.category === 'Sewa & Gedung') {
        defaultPph = 'PPh 4(2)';
        defaultRate = 10.0;
      } else if (v.category === 'Konstruksi & Renovasi') {
        defaultPph = 'PPh 4(2)';
        defaultRate = 1.75;
      } else if (v.type === 'Orang Pribadi') {
        defaultPph = 'PPh 21';
        defaultRate = 2.5;
      } else {
        defaultPph = 'PPh 23';
        defaultRate = 2.0;
      }
    }

    const calculated = recalculateTotals(
      formData.items,
      formData.discount,
      formData.ppnRate,
      defaultPph,
      defaultRate,
      vId
    );

    setFormData({
      ...formData,
      vendorId: vId,
      vendorName: v ? v.name : '',
      pphType: defaultPph,
      pphRate: defaultRate,
      ...calculated
    });
  };

  const handlePphTypeSelect = (type) => {
    let rate = 0;
    if (type === 'PPh 23') rate = 2.0;
    else if (type === 'PPh 21') rate = 2.5;
    else if (type === 'PPh 22') rate = 1.5;
    else if (type === 'PPh 4(2)') rate = 10.0;
    else rate = 0;

    const calculated = recalculateTotals(
      formData.items,
      formData.discount,
      formData.ppnRate,
      type,
      rate,
      formData.vendorId
    );

    setFormData({
      ...formData,
      pphType: type,
      pphRate: rate,
      ...calculated
    });
  };

  // Status Action (Approve, Reject, Pay)
  const handleUpdateStatus = async (pr, newStatus) => {
    const updated = {
      ...pr,
      status: newStatus,
      approvalDate: newStatus === 'Disetujui' ? new Date().toISOString() : pr.approvalDate,
      approvedBy: newStatus === 'Disetujui' ? 'Irfan Hakim (Direktur Keuangan)' : pr.approvedBy
    };
    await savePurchaseRequest(updated);
    showToast?.(`Pengajuan ${pr.requestNumber} status diubah ke ${newStatus}`, 'success');
    onRefresh();
  };

  const handleDelete = async (pr) => {
    if (window.confirm(`Hapus pengajuan pembelian ${pr.requestNumber}?`)) {
      await deletePurchaseRequest(pr.id);
      showToast?.(`Pengajuan ${pr.requestNumber} berhasil dihapus`, 'success');
      onRefresh();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      alert('Judul Pengajuan Pembelian wajib diisi!');
      return;
    }
    if (!formData.vendorId) {
      alert('Silakan pilih Supplier/Vendor!');
      return;
    }

    const payload = {
      ...formData,
      id: editingPR ? editingPR.id : `pr-${Date.now()}`
    };

    await savePurchaseRequest(payload);
    showToast?.(`Pengajuan ${formData.requestNumber} berhasil disimpan`, 'success');
    setIsModalOpen(false);
    onRefresh();
  };

  const handleExportCSV = () => {
    const headers = ['No Pengajuan,Tanggal,Pemohon,Departemen,Vendor,Judul Pengajuan,DPP,PPN,PPh Terpotong,Total Bayar,Status'];
    const rows = filteredList.map(p =>
      `"${p.requestNumber}","${p.requestDate}","${p.requesterName}","${p.department}","${p.vendorName}","${p.title}","${p.dpp}","${p.ppnAmount}","${p.pphAmount}","${p.totalPayable}","${p.status}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Pengajuan_Pembelian_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedVendor = vendorList.find(v => v.id === formData.vendorId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">3. Modul Pembelian & Pengajuan (Purchase Request)</h2>
              <p className="text-xs text-slate-500">Alur pengajuan pengadaan, persetujuan (approval), pemotongan pajak PPh, & cetak voucher PO</p>
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
            Buat Pengajuan Baru
          </button>
        </div>
      </div>

      {/* Filter and Status Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedStatus === st
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari no. pengajuan, vendor, judul..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table of Purchase Requests */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">No. Pengajuan</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Departemen / Pemohon</th>
                <th className="py-3 px-4">Vendor Dituju</th>
                <th className="py-3 px-4">Keperluan Pengadaan</th>
                <th className="py-3 px-4 text-right">DPP Nilai Bersih</th>
                <th className="py-3 px-4 text-right">Pot. PPh</th>
                <th className="py-3 px-4 text-right">Net Dibayar</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi & Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Tidak ada pengajuan pembelian yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((pr) => {
                  const statusColors = {
                    'Draft': 'bg-slate-100 text-slate-700',
                    'Menunggu Persetujuan': 'bg-amber-100 text-amber-800 border-amber-200',
                    'Disetujui': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    'Ditolak': 'bg-rose-100 text-rose-800',
                    'Lunas': 'bg-teal-100 text-teal-800'
                  };

                  return (
                    <tr key={pr.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {pr.requestNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateIndo(pr.requestDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{pr.requesterName}</div>
                        <div className="text-[10px] text-slate-500">{pr.department}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {pr.vendorName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-[200px] truncate" title={pr.title}>
                        {pr.title}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                        {formatRupiah(pr.dpp)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        {pr.pphType !== 'Non-PPh' && pr.pphAmount > 0 ? (
                          <div>
                            <span className="font-bold text-purple-700">-{formatRupiah(pr.pphAmount)}</span>
                            <div className="text-[10px] text-purple-600 font-sans">{pr.pphType} ({pr.pphRate}%)</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">
                        {formatRupiah(pr.totalPayable)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[pr.status] || 'bg-slate-100 text-slate-700'}`}>
                          {pr.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Button */}
                          <button
                            onClick={() => setPrintPR(pr)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Cetak Faktur Pengajuan PO"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Workflow Actions */}
                          {pr.status === 'Menunggu Persetujuan' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(pr, 'Disetujui')}
                                className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition shadow-xs"
                                title="Setujui Pengajuan"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(pr, 'Ditolak')}
                                className="px-2 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition border border-rose-200"
                                title="Tolak Pengajuan"
                              >
                                Tolak
                              </button>
                            </>
                          )}

                          {pr.status === 'Disetujui' && (
                            <button
                              onClick={() => handleUpdateStatus(pr, 'Lunas')}
                              className="px-2 py-1 text-[10px] font-bold text-teal-800 bg-teal-100 hover:bg-teal-200 rounded-md transition"
                              title="Tandai Sudah Dibayar / Lunas"
                            >
                              Bayar Lunas
                            </button>
                          )}

                          {/* Edit & Delete */}
                          <button
                            onClick={() => handleOpenEdit(pr)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Edit Pengajuan"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(pr)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Pengajuan"
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

      {/* Modal Create / Edit Purchase Request */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                {editingPR ? `Edit Pengajuan: ${editingPR.requestNumber}` : 'Form Pengajuan Pembelian Baru (Purchase Request)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Row 1: No PR, Dates, Requester */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    No. Pengajuan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.requestNumber}
                    onChange={(e) => setFormData({ ...formData, requestNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Pengajuan
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.requestDate}
                    onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pemohon (Requester)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.requesterName}
                    onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Departemen
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Vendor Selection & Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Pilih Supplier / Vendor Dituju *
                  </label>
                  <select
                    required
                    value={formData.vendorId}
                    onChange={(e) => handleVendorSelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="">-- Pilih Rekanan / Vendor --</option>
                    {vendorList.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.code} - {v.name} ({v.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-slate-600 flex flex-col justify-center">
                  {selectedVendor ? (
                    <div>
                      <div className="font-bold text-slate-800">{selectedVendor.name}</div>
                      <div className="text-[11px] text-slate-500">
                        NPWP: {selectedVendor.hasNpwp && selectedVendor.npwp ? selectedVendor.npwp : <span className="text-rose-600 font-bold">Non-NPWP</span>} • TOP: {selectedVendor.paymentTerm}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Bank: {selectedVendor.bankName} {selectedVendor.bankAccount} (a/n {selectedVendor.bankAccountHolder})
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Pilih vendor untuk melihat status NPWP & rekening bank.</span>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Judul Pengajuan / Kebutuhan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Langganan Cloud Server AWS Q4 2026 atau Sewa Kantor"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status Pengajuan
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                    <option value="Disetujui">Disetujui</option>
                    <option value="Lunas">Lunas</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Rincian Item Pengadaan (Line Items)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                  >
                    + Tambah Baris
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={item.id || index} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Deskripsi item barang / jasa"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={item.coaId}
                          onChange={(e) => handleItemChange(index, 'coaId', e.target.value)}
                          className="w-full px-2 py-1.5 text-[11px] bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          title="Alokasi Akun COA"
                        >
                          <option value="">Pilih COA...</option>
                          {coaList
                            .filter(a => a.category === 'Expense' || a.category === 'Asset')
                            .map(a => (
                              <option key={a.id} value={a.code}>
                                {a.code} - {a.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-center font-bold"
                        />
                      </div>
                      <div className="col-span-1">
                        <input
                          type="text"
                          placeholder="Satuan"
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Harga Satuan"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-right font-mono"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Hapus Baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Taxation & Calculation Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Tax Selectors */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Ketentuan Pajak & Pemotongan (Withholding)
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tarif PPN
                      </label>
                      <select
                        value={formData.ppnRate}
                        onChange={(e) => {
                          const rate = Number(e.target.value);
                          const calculated = recalculateTotals(
                            formData.items,
                            formData.discount,
                            rate,
                            formData.pphType,
                            formData.pphRate,
                            formData.vendorId
                          );
                          setFormData({ ...formData, ppnRate: rate, ...calculated });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                      >
                        <option value={0}>0% (Bebas PPN / Non-PPN)</option>
                        <option value={11}>11% (PPN Standar)</option>
                        <option value={12}>12% (PPN Terkini)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Jenis PPh Dipotong
                      </label>
                      <select
                        value={formData.pphType}
                        onChange={(e) => handlePphTypeSelect(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                      >
                        {TAX_TYPES.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {formData.pphType !== 'Non-PPh' && (
                    <div className="p-3 bg-white rounded-lg border border-purple-200 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Tarif Pajak {formData.pphType}:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-purple-800">
                          <input
                            type="number"
                            step="0.01"
                            value={formData.pphRate}
                            onChange={(e) => {
                              const r = Number(e.target.value);
                              const calculated = recalculateTotals(
                                formData.items,
                                formData.discount,
                                formData.ppnRate,
                                formData.pphType,
                                r,
                                formData.vendorId
                              );
                              setFormData({ ...formData, pphRate: r, ...calculated });
                            }}
                            className="w-16 px-1.5 py-0.5 text-xs border border-purple-300 rounded text-right"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      {selectedVendor && !selectedVendor.hasNpwp && (
                        <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Tarif sanksi non-NPWP otomatis diterapkan (+20% PPh 21 / +100% PPh 23).
                        </div>
                      )}
                    </div>
                  )}

                  {/* COA Accounts Integration */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Akun Debet (Beban / Aset)
                      </label>
                      <select
                        value={formData.coaDebitAccount}
                        onChange={(e) => setFormData({ ...formData, coaDebitAccount: e.target.value })}
                        className="w-full px-2 py-1.5 text-[11px] bg-white border border-slate-300 rounded-lg"
                      >
                        {coaList.filter(a => a.category === 'Expense' || a.category === 'Asset').map(a => (
                          <option key={a.id} value={a.code}>{a.code} - {a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Akun Kredit (Kas / Hutang)
                      </label>
                      <select
                        value={formData.coaCreditAccount}
                        onChange={(e) => setFormData({ ...formData, coaCreditAccount: e.target.value })}
                        className="w-full px-2 py-1.5 text-[11px] bg-white border border-slate-300 rounded-lg"
                      >
                        {coaList.filter(a => a.category === 'Liability' || a.subCategory === 'Kas & Bank').map(a => (
                          <option key={a.id} value={a.code}>{a.code} - {a.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Calculation Summary Box */}
                <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-2 text-xs flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal Item:</span>
                      <span className="font-mono font-semibold">{formatRupiah(formData.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Diskon (Rp):</span>
                      <input
                        type="number"
                        value={formData.discount}
                        onChange={(e) => {
                          const d = Number(e.target.value) || 0;
                          const calculated = recalculateTotals(
                            formData.items,
                            d,
                            formData.ppnRate,
                            formData.pphType,
                            formData.pphRate,
                            formData.vendorId
                          );
                          setFormData({ ...formData, discount: d, ...calculated });
                        }}
                        className="w-28 px-2 py-0.5 text-xs border border-slate-300 rounded text-right font-mono"
                      />
                    </div>
                    <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1.5">
                      <span>DPP (Dasar Pajak):</span>
                      <span className="font-mono">{formatRupiah(formData.dpp)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>PPN ({formData.ppnRate}%):</span>
                      <span className="font-mono font-semibold">+ {formatRupiah(formData.ppnAmount)}</span>
                    </div>
                    {formData.pphType !== 'Non-PPh' && (
                      <div className="flex justify-between text-purple-700 font-semibold">
                        <span>Potongan {formData.pphType} ({formData.pphRate}%):</span>
                        <span className="font-mono">- {formatRupiah(formData.pphAmount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-center">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Net Pembayaran ke Vendor</span>
                      <div className="text-base font-extrabold text-emerald-700 font-mono">
                        {formatRupiah(formData.totalPayable)}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      Nilai Faktur: {formatRupiah(formData.grandTotal)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
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
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
                >
                  Simpan Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {printPR && (
        <PurchasePrintPreviewModal
          pr={printPR}
          vendor={vendorList.find(v => v.id === printPR.vendorId)}
          coaList={coaList}
          onClose={() => setPrintPR(null)}
        />
      )}
    </div>
  );
}


