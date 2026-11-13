import React, { useState } from 'react';
import { 
  ReceiptText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Printer, 
  FileText, 
  X, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  CreditCard, 
  Building, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { formatRupiah, formatDateIndo, TAX_TYPES, TAX_OBJECT_CODES } from '../lib/taxRules';
import { saveTaxRecord, deleteTaxRecord } from '../lib/databaseService';
import BupotPrintPreviewModal from './BupotPrintPreviewModal';

const MONTH_NAMES = [
  'Semua Bulan', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function TaxModule({ taxRecords = [], vendorList = [], onRefresh, showToast }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTaxType, setSelectedTaxType] = useState('Semua');
  const [selectedMonth, setSelectedMonth] = useState(11); // default Nov
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedStatus, setSelectedStatus] = useState('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [payModalRecord, setPayModalRecord] = useState(null);
  const [printRecord, setPrintRecord] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    taxType: 'PPh 23',
    taxPeriodMonth: 11,
    taxPeriodYear: 2026,
    transactionDate: new Date().toISOString().slice(0, 10),
    referenceNo: '',
    sourceModule: 'Manual',
    vendorId: '',
    taxpayerName: '',
    taxpayerNpwp: '',
    hasNpwp: true,
    taxObjectCode: '24-104-01',
    taxObjectDescription: 'Jasa Teknik, Manajemen, Konsultan, dan Jasa Lainnya (2%)',
    grossAmount: 0,
    dppAmount: 0,
    taxRate: 2.0,
    taxAmount: 0,
    billingId: '',
    ntpn: '',
    paymentDate: '',
    status: 'Draft / Belum Disetor',
    notes: ''
  });

  // Pay Modal Form
  const [payData, setPayData] = useState({
    billingId: '',
    ntpn: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    status: 'Lunas / Disetor (NTPN)'
  });

  // Filtered List
  const filteredList = taxRecords.filter((rec) => {
    const matchesTax = selectedTaxType === 'Semua' || rec.taxType === selectedTaxType;
    const matchesMonth = selectedMonth === 0 || rec.taxPeriodMonth === selectedMonth;
    const matchesYear = rec.taxPeriodYear === selectedYear;
    const matchesStatus = selectedStatus === 'Semua' || rec.status === selectedStatus;
    const matchesSearch = 
      rec.taxpayerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.taxpayerNpwp && rec.taxpayerNpwp.includes(searchTerm)) ||
      (rec.referenceNo && rec.referenceNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rec.billingId && rec.billingId.includes(searchTerm)) ||
      (rec.ntpn && rec.ntpn.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesTax && matchesMonth && matchesYear && matchesStatus && matchesSearch;
  });

  // Metrics
  const totalTaxAll = filteredList.reduce((s, r) => s + (Number(r.taxAmount) || 0), 0);
  const totalPaid = filteredList
    .filter(r => r.status === 'Lunas / Disetor (NTPN)' || r.status === 'Dilaporkan SPT Masa')
    .reduce((s, r) => s + (Number(r.taxAmount) || 0), 0);
  const totalUnpaid = filteredList
    .filter(r => r.status === 'Draft / Belum Disetor' || r.status === 'Billing Terbit')
    .reduce((s, r) => s + (Number(r.taxAmount) || 0), 0);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({
      taxType: 'PPh 23',
      taxPeriodMonth: selectedMonth || 11,
      taxPeriodYear: selectedYear,
      transactionDate: new Date().toISOString().slice(0, 10),
      referenceNo: `MANUAL-${Date.now().toString().slice(-4)}`,
      sourceModule: 'Manual',
      vendorId: '',
      taxpayerName: '',
      taxpayerNpwp: '',
      hasNpwp: true,
      taxObjectCode: '24-104-01',
      taxObjectDescription: 'Jasa Teknik, Manajemen, Konsultan, dan Jasa Lainnya (2%)',
      grossAmount: 10000000,
      dppAmount: 10000000,
      taxRate: 2.0,
      taxAmount: 200000,
      billingId: '',
      ntpn: '',
      paymentDate: '',
      status: 'Draft / Belum Disetor',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setFormData({
      ...rec,
      paymentDate: rec.paymentDate || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenPay = (rec) => {
    setPayModalRecord(rec);
    setPayData({
      billingId: rec.billingId || `0982348${Date.now().toString().slice(-8)}`,
      ntpn: rec.ntpn || '',
      paymentDate: rec.paymentDate || new Date().toISOString().slice(0, 10),
      status: rec.ntpn ? 'Lunas / Disetor (NTPN)' : 'Billing Terbit'
    });
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!payModalRecord) return;

    const isLunas = !!payData.ntpn && payData.ntpn.trim() !== '';
    const updated = {
      ...payModalRecord,
      billingId: payData.billingId,
      ntpn: payData.ntpn,
      paymentDate: payData.paymentDate || new Date().toISOString().slice(0, 10),
      status: isLunas ? 'Lunas / Disetor (NTPN)' : 'Billing Terbit'
    };

    await saveTaxRecord(updated);
    showToast?.(`Bukti setor pajak ${updated.taxType} berhasil diperbarui!`, 'success');
    setPayModalRecord(null);
    onRefresh();
  };

  const handleDelete = async (rec) => {
    if (window.confirm(`Hapus catatan pemotongan pajak ${rec.taxType} untuk "${rec.taxpayerName}"?`)) {
      await deleteTaxRecord(rec.id);
      showToast?.('Catatan pajak berhasil dihapus', 'success');
      onRefresh();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.taxpayerName) {
      alert('Nama Wajib Pajak / Rekanan wajib diisi!');
      return;
    }

    const payload = {
      ...formData,
      id: editingRecord ? editingRecord.id : `tax-${Date.now()}`,
      grossAmount: Number(formData.grossAmount) || 0,
      dppAmount: Number(formData.dppAmount) || 0,
      taxRate: Number(formData.taxRate) || 0,
      taxAmount: Number(formData.taxAmount) || 0
    };

    await saveTaxRecord(payload);
    showToast?.(`Catatan pajak ${formData.taxType} berhasil disimpan!`, 'success');
    setIsModalOpen(false);
    onRefresh();
  };

  const handleExportCSV = () => {
    const headers = ['Masa Pajak,Tahun,Jenis Pajak,Tanggal Transaksi,No Ref,Nama WP,NPWP,Objek Pajak,Nilai Bruto,DPP,Tarif %,PPh Dipotong,ID Billing,NTPN,Tanggal Setor,Status'];
    const rows = filteredList.map(r => 
      `"${r.taxPeriodMonth}","${r.taxPeriodYear}","${r.taxType}","${r.transactionDate}","${r.referenceNo || ''}","${r.taxpayerName}","${r.taxpayerNpwp || ''}","${r.taxObjectDescription || ''}","${r.grossAmount}","${r.dppAmount}","${r.taxRate}","${r.taxAmount}","${r.billingId || ''}","${r.ntpn || ''}","${r.paymentDate || ''}","${r.status}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_SPT_Masa_Unifikasi_PPh_${selectedYear}_${selectedMonth}.csv`);
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
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">4. Modul Pajak PPh (PPh 21, 22, 23, 25, 4(2))</h2>
              <p className="text-xs text-slate-500">Rekapitulasi SPT Unifikasi, monitoring ID Billing & NTPN, serta cetak bukti pemotongan resmi</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor Rekap SPT (CSV)
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Catat Pajak Baru
          </button>
        </div>
      </div>

      {/* Top 3 Metric Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total PPh Terutang (Masa Dipilih)</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{formatRupiah(totalTaxAll)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{filteredList.length} Transaksi Pemotongan & Setoran</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Sudah Disetor (Valid NTPN)</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{formatRupiah(totalPaid)}</div>
          <p className="text-[11px] text-emerald-600 mt-0.5 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Selesai disetor ke kas negara
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Belum Disetor / Siap Billing</span>
          <div className="text-xl font-bold text-amber-700 mt-1">{formatRupiah(totalUnpaid)}</div>
          <p className="text-[11px] text-amber-600 mt-0.5 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Segera bayar sebelum tgl 15
          </p>
        </div>
      </div>

      {/* Filter and Period Selection Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tax Types Filter */}
          <div className="flex flex-wrap gap-1.5">
            {['Semua', 'PPh 21', 'PPh 22', 'PPh 23', 'PPh 25', 'PPh 4(2)'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTaxType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedTaxType === t
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Month & Year Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        {/* Second Row: Status Filter & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap gap-1.5">
            {['Semua', 'Draft / Belum Disetor', 'Billing Terbit', 'Lunas / Disetor (NTPN)', 'Dilaporkan SPT Masa'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  selectedStatus === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari WP, NPWP, billing, NTPN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Tax Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                <th className="py-3 px-3.5">Masa/Tgl</th>
                <th className="py-3 px-3.5">Jenis Pajak</th>
                <th className="py-3 px-3.5">Wajib Pajak / Rekanan</th>
                <th className="py-3 px-3.5">Objek Pajak</th>
                <th className="py-3 px-3.5 text-right">DPP Nilai Pajak</th>
                <th className="py-3 px-3.5 text-center">Tarif</th>
                <th className="py-3 px-3.5 text-right">PPh Terutang</th>
                <th className="py-3 px-3.5">ID Billing & NTPN</th>
                <th className="py-3 px-3.5 text-center">Status Setor</th>
                <th className="py-3 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Tidak ada catatan pemotongan pajak yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((rec) => {
                  const statusColors = {
                    'Draft / Belum Disetor': 'bg-amber-50 text-amber-800 border-amber-200',
                    'Billing Terbit': 'bg-sky-50 text-sky-800 border-sky-200',
                    'Lunas / Disetor (NTPN)': 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    'Dilaporkan SPT Masa': 'bg-purple-50 text-purple-800 border-purple-200'
                  };

                  const taxPill = {
                    'PPh 21': 'bg-blue-100 text-blue-800',
                    'PPh 22': 'bg-amber-100 text-amber-800',
                    'PPh 23': 'bg-emerald-100 text-emerald-800',
                    'PPh 25': 'bg-indigo-100 text-indigo-800',
                    'PPh 4(2)': 'bg-rose-100 text-rose-800'
                  };

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-800">
                          {rec.taxPeriodMonth}/{rec.taxPeriodYear}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatDateIndo(rec.transactionDate)}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded font-bold text-[10px] ${taxPill[rec.taxType] || 'bg-slate-100'}`}>
                          {rec.taxType}
                        </span>
                        {rec.referenceNo && (
                          <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                            {rec.referenceNo}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {rec.taxpayerName}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          {rec.taxpayerNpwp ? rec.taxpayerNpwp : (rec.hasNpwp ? 'NPWP Ada' : <span className="text-amber-700 font-bold">Non-NPWP</span>)}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 max-w-[200px]">
                        <span className="font-mono text-[10px] text-slate-500 block">
                          {rec.taxObjectCode}
                        </span>
                        <span className="text-slate-700 text-xs truncate block" title={rec.taxObjectDescription}>
                          {rec.taxObjectDescription}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono text-slate-700">
                        {formatRupiah(rec.dppAmount)}
                      </td>

                      <td className="py-3 px-3.5 text-center font-bold text-slate-800">
                        {rec.taxRate > 0 ? `${rec.taxRate}%` : 'Tetap'}
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono font-extrabold text-emerald-800">
                        {formatRupiah(rec.taxAmount)}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {rec.ntpn ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              NTPN: {rec.ntpn}
                            </span>
                            <div className="text-[10px] text-slate-400">Setor: {formatDateIndo(rec.paymentDate)}</div>
                          </div>
                        ) : rec.billingId ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-[11px] font-semibold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                              Billing: {rec.billingId}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Belum dibuat billing</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[rec.status] || 'bg-slate-100'}`}>
                          {rec.status}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Payment / NTPN recorder button */}
                          <button
                            onClick={() => handleOpenPay(rec)}
                            className="px-2 py-1 text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition"
                            title="Input / Update ID Billing & NTPN"
                          >
                            Setor NTPN
                          </button>

                          {/* Print Bupot */}
                          <button
                            onClick={() => setPrintRecord(rec)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                            title="Cetak Bukti Pemotongan Pajak (e-Bupot)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(rec)}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded transition"
                            title="Edit Catatan"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(rec)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Hapus Catatan"
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

      {/* Modal Add / Edit Tax Record */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-emerald-400" />
                {editingRecord ? `Edit Pemotongan: ${editingRecord.taxType}` : 'Catat Pemotongan Pajak Baru'}
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
                    Jenis Pajak PPh *
                  </label>
                  <select
                    value={formData.taxType}
                    onChange={(e) => {
                      const t = e.target.value;
                      let rate = 2.0;
                      if (t === 'PPh 21') rate = 2.5;
                      else if (t === 'PPh 22') rate = 1.5;
                      else if (t === 'PPh 4(2)') rate = 10.0;
                      else if (t === 'PPh 25') rate = 0;
                      setFormData({ ...formData, taxType: t, taxRate: rate });
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    {TAX_TYPES.filter(t => t.id !== 'Non-PPh').map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Masa Pajak (Bulan)
                  </label>
                  <select
                    value={formData.taxPeriodMonth}
                    onChange={(e) => setFormData({ ...formData, taxPeriodMonth: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    {MONTH_NAMES.slice(1).map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tahun Pajak
                  </label>
                  <input
                    type="number"
                    value={formData.taxPeriodYear}
                    onChange={(e) => setFormData({ ...formData, taxPeriodYear: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              {/* Taxpayer / Vendor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Wajib Pajak / Rekanan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Sarana Jasa atau Nama Pribadi"
                    value={formData.taxpayerName}
                    onChange={(e) => setFormData({ ...formData, taxpayerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    NPWP / NIK
                  </label>
                  <input
                    type="text"
                    placeholder="01.234.567.8-012.000"
                    value={formData.taxpayerNpwp}
                    onChange={(e) => setFormData({ ...formData, taxpayerNpwp: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Object description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Uraian Transaksi Objek Pajak
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jasa Konsultan IT atau Sewa Gedung Kantor"
                  value={formData.taxObjectDescription}
                  onChange={(e) => setFormData({ ...formData, taxObjectDescription: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Amounts & Rates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dasar Pengenaan Pajak (DPP)
                  </label>
                  <input
                    type="number"
                    value={formData.dppAmount}
                    onChange={(e) => {
                      const dpp = Number(e.target.value) || 0;
                      const tax = Math.round((dpp * formData.taxRate) / 100);
                      setFormData({ ...formData, dppAmount: dpp, grossAmount: dpp, taxAmount: tax });
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tarif Pajak (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxRate}
                    onChange={(e) => {
                      const rate = Number(e.target.value) || 0;
                      const tax = Math.round((formData.dppAmount * rate) / 100);
                      setFormData({ ...formData, taxRate: rate, taxAmount: tax });
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PPh Terutang (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData.taxAmount}
                    onChange={(e) => setFormData({ ...formData, taxAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-extrabold text-emerald-800"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status Pemotongan
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Draft / Belum Disetor">Draft / Belum Disetor</option>
                    <option value="Billing Terbit">Billing Terbit</option>
                    <option value="Lunas / Disetor (NTPN)">Lunas / Disetor (NTPN)</option>
                    <option value="Dilaporkan SPT Masa">Dilaporkan SPT Masa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                  />
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
                  Simpan Catatan Pajak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Setor NTPN */}
      {payModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Catat Setoran Pajak ke Kas Negara</h3>
                <p className="text-xs text-slate-400">{payModalRecord.taxType} • {formatRupiah(payModalRecord.taxAmount)}</p>
              </div>
              <button 
                onClick={() => setPayModalRecord(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nomor ID Billing DJP (15 Digit)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 098234817263518"
                  value={payData.billingId}
                  onChange={(e) => setPayData({ ...payData, billingId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  NTPN (Nomor Transaksi Penerimaan Negara) *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: D4F90A8123B7C011"
                  value={payData.ntpn}
                  onChange={(e) => setPayData({ ...payData, ntpn: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-extrabold text-emerald-800"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Didapat dari struk ATM / mutasi bank / BPN setelah berhasil transfer billing.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tanggal Pembayaran / Penyetoran
                </label>
                <input
                  type="date"
                  value={payData.paymentDate}
                  onChange={(e) => setPayData({ ...payData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayModalRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
                >
                  Simpan Bukti Setor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bupot Preview Modal */}
      {printRecord && (
        <BupotPrintPreviewModal
          record={printRecord}
          onClose={() => setPrintRecord(null)}
        />
      )}
    </div>
  );
}
