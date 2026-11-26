import React, { useState, useMemo } from 'react';
import {
  FileArchive,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  Eye,
  X,
  Lock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/taxRules';
import { saveDocument, deleteDocument } from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import SearchableSelect from '../components/SearchableSelect';

const DOC_TYPES = [
  'Faktur Penjualan',
  'Invoice Pembelian',
  'Nota',
  'Kwitansi',
  'Bukti Transfer',
  'Bukti Penerimaan Kas',
  'Bukti Pengeluaran Kas',
  'Bukti Potong Pajak',
  'Faktur Pajak',
  'Purchase Order (PO)',
  'Delivery Order (DO)',
  'Credit Note',
  'Debit Note',
  'Mutasi Rekening Bank',
  'Dokumen Aset Tetap',
  'Dokumen Pendukung Lainnya'
];

const DOC_CATEGORIES = [
  'Penjualan',
  'Pembelian',
  'Biaya Operasional',
  'Pendapatan Lain-lain',
  'Kas Masuk',
  'Kas Keluar',
  'Dokumen Perpajakan',
  'Transaksi Bank',
  'Aset Tetap',
  'Dokumen Lainnya'
];

export default function DocumentArchiveModule({
  documents = [],
  coaList = [],
  journalEntries = [],
  onRefresh,
  showToast
}) {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [filterType, setFilterType] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [formData, setFormData] = useState({
    docNumber: '',
    docType: 'Invoice Pembelian',
    category: 'Pembelian',
    docDate: today,
    partnerName: '',
    partnerNpwp: '',
    description: '',
    dppAmount: 0,
    ppnAmount: 0,
    pphAmount: 0,
    totalAmount: 0,
    paymentInfo: '',
    fileName: '',
    fileType: 'PDF',
    fileSize: 0,
    fileDataUrl: '',
    accountCode: '',
    journalEntryNumber: '',
    ocrExtracted: false,
    ocrConfirmed: false,
    isLocked: false
  });

  // Validasi otomatis real-time dokumen
  const validationIssues = useMemo(() => {
    const issues = [];
    if (!formData.docNumber.trim()) issues.push('Nomor dokumen masih kosong.');
    if (!formData.docDate) issues.push('Tanggal transaksi belum diisi.');
    if (!formData.partnerName.trim()) issues.push('Nama vendor/pelanggan belum terisi.');
    const calcTotal = (Number(formData.dppAmount) || 0) + (Number(formData.ppnAmount) || 0) - (Number(formData.pphAmount) || 0);
    if (Number(formData.totalAmount) <= 0) issues.push('Total transaksi harus > 0.');
    if (Number(formData.dppAmount) > 0 && Math.abs(calcTotal - Number(formData.totalAmount)) > 1) {
      issues.push(`Nominal total (${formatRupiah(formData.totalAmount)}) tidak sesuai perhitungan DPP+PPN-PPh (${formatRupiah(calcTotal)}).`);
    }
    const isDuplicate = formData.docNumber.trim() && documents.some(d => d.docNumber.toLowerCase() === formData.docNumber.trim().toLowerCase());
    if (isDuplicate) issues.push(`Dokumen duplikat terdeteksi: nomor "${formData.docNumber}" sudah ada di arsip.`);
    return issues;
  }, [formData, documents]);

  const filteredDocs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return documents.filter(d => {
      const matchCat = filterCategory === 'Semua' || d.category === filterCategory;
      const matchType = filterType === 'Semua' || d.docType === filterType;
      const matchQ = !q ||
        (d.docNumber || '').toLowerCase().includes(q) ||
        (d.partnerName || '').toLowerCase().includes(q) ||
        (d.journalEntryNumber || '').toLowerCase().includes(q) ||
        (d.accountCode || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        (d.docDate || '').includes(q);
      return matchCat && matchType && matchQ;
    });
  }, [documents, filterCategory, filterType, searchTerm]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toUpperCase();
    const reader = new FileReader();
    reader.onload = () => {
      // Simulasi Ekstraksi OCR/AI dari nama file & metadata
      const numMatch = file.name.match(/([A-Z]{2,5}[-_]\d{4,8}[-_]?\d*)/i);
      const extractedNo = numMatch ? numMatch[1].toUpperCase().replace(/_/g, '-') : `DOC-${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({
        ...prev,
        fileName: file.name,
        fileType: ext,
        fileSize: file.size,
        fileDataUrl: typeof reader.result === 'string' && file.size <= 1500000 ? reader.result : '',
        docNumber: prev.docNumber || extractedNo,
        description: prev.description || `Dokumen diunggah dari file ${file.name}`,
        ocrExtracted: true,
        ocrConfirmed: false
      }));
      showToast?.('File terbaca! Silakan periksa & konfirmasi hasil ekstraksi sebelum menyimpan.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleAutoExtractOCR = () => {
    const dpp = Number(formData.dppAmount) || 10000000;
    const ppn = Math.round(dpp * 0.11);
    setFormData(prev => ({
      ...prev,
      docNumber: prev.docNumber || `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-001`,
      dppAmount: prev.dppAmount || dpp,
      ppnAmount: prev.ppnAmount || ppn,
      totalAmount: prev.totalAmount || (dpp + ppn),
      ocrExtracted: true,
      ocrConfirmed: false
    }));
    showToast?.('Ekstraksi OCR selesai. Wajib centang konfirmasi pemeriksaan pengguna.', 'success');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.ocrExtracted && !formData.ocrConfirmed) {
      alert('Hasil pembacaan otomatis (OCR/AI) wajib diperiksa dan dicentang konfirmasinya oleh pengguna terlebih dahulu.');
      return;
    }
    if (!formData.docNumber.trim()) {
      alert('Nomor dokumen wajib diisi!');
      return;
    }
    setIsSubmitting(true);
    try {
      const linkedJournal = journalEntries.find(j => j.entryNumber === formData.journalEntryNumber);
      await saveDocument({
        ...formData,
        journalEntryId: linkedJournal?.id || null,
        validationStatus: validationIssues.length === 0 ? 'Valid' : (validationIssues.some(i => i.includes('duplikat')) ? 'Duplikat' : 'Perlu Periksa'),
        validationNotes: validationIssues.join(' | ')
      }, currentUser);
      showToast?.(`Dokumen ${formData.docNumber} berhasil diarsipkan (retensi 10 tahun).`, 'success');
      setIsModalOpen(false);
      await onRefresh();
    } catch (err) {
      showToast?.(err.message || 'Gagal menyimpan dokumen', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Hapus dokumen arsip ${doc.docNumber}?`)) return;
    try {
      await deleteDocument(doc, currentUser);
      showToast?.(`Dokumen ${doc.docNumber} dihapus.`, 'success');
      await onRefresh();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const handleExportIndexCSV = () => {
    const headers = ['No Dokumen,Jenis,Kategori,Tanggal,Partner,NPWP,DPP,PPN,PPh,Total,No Jurnal,Akun COA,Status Validasi,Retensi Sampai,Versi'];
    const rows = filteredDocs.map(d =>
      `"${d.docNumber}","${d.docType}","${d.category}","${d.docDate}","${d.partnerName}","${d.partnerNpwp}","${d.dppAmount}","${d.ppnAmount}","${d.pphAmount}","${d.totalAmount}","${d.journalEntryNumber}","${d.accountCode}","${d.validationStatus}","${d.retentionUntil}","v${d.version}"`
    );
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI('data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')));
    link.setAttribute('download', `Indeks_Arsip_Dokumen_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
            <FileArchive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Manajemen Dokumen &amp; Arsip Audit (Retensi 10 Tahun)</h2>
            <p className="text-xs text-slate-500">
              Penyimpanan terpusat dokumen sumber (PDF, JPG, PNG, Excel, Word) dengan validasi duplikat, ekstraksi OCR, dan penelusuran ke jurnal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportIndexCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export Indeks Arsip
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload &amp; Arsipkan Dokumen
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari no. dokumen, tanggal, partner, akun, no. jurnal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
        >
          <option value="Semua">Semua Klasifikasi (10 Kategori)</option>
          {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
        >
          <option value="Semua">Semua Jenis Dokumen</option>
          {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                <th className="py-3 px-4">No. Dokumen &amp; File</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Jenis &amp; Klasifikasi</th>
                <th className="py-3 px-4">Vendor / Pelanggan</th>
                <th className="py-3 px-4 text-right">Total Transaksi</th>
                <th className="py-3 px-4">Jurnal &amp; COA</th>
                <th className="py-3 px-4 text-center">Validasi</th>
                <th className="py-3 px-4 text-center">Retensi</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Belum ada dokumen tersimpan di arsip. Klik <strong>Upload &amp; Arsipkan Dokumen</strong> untuk menambahkan.
                  </td>
                </tr>
              ) : (
                filteredDocs.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{d.docNumber}</div>
                      <div className="text-[10px] text-slate-400">{d.fileName || d.fileType} • v{d.version}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">{formatDateIndo(d.docDate)}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{d.docType}</div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">{d.category}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{d.partnerName || '-'}</div>
                      {d.partnerNpwp && <div className="text-[10px] text-slate-400 font-mono">NPWP: {d.partnerNpwp}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatRupiah(d.totalAmount)}</td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] font-bold text-indigo-700">{d.journalEntryNumber || 'Belum ditautkan'}</div>
                      <div className="text-[10px] text-slate-500">Akun: {d.accountCode || '-'}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.validationStatus === 'Valid' ? 'bg-emerald-100 text-emerald-800'
                        : d.validationStatus === 'Duplikat' ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                      }`}>
                        {d.validationStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-[10px] font-mono text-slate-500">
                      s/d {d.retentionUntil || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setPreviewDoc(d)} className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg" title="Lihat Detail">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!d.isLocked && !d.journalEntryId ? (
                          <button onClick={() => handleDelete(d)} className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg" title="Hapus">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="p-1.5 text-slate-400" title="Terkunci oleh kebijakan retensi 10 tahun / terhubung jurnal"><Lock className="w-3.5 h-3.5" /></span>
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

      {/* Modal Upload & OCR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                Upload, Ekstraksi &amp; Validasi Dokumen Transaksi
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="p-4 bg-amber-50/70 border border-dashed border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-amber-900">Pilih File Dokumen (PDF, JPG, PNG, Excel, Word)</div>
                  <div className="text-[11px] text-amber-700">Sistem membantu mengekstrak nomor &amp; metadata dokumen secara otomatis.</div>
                  {formData.fileName && <div className="mt-1 font-mono font-bold text-emerald-700">Terpilih: {formData.fileName}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-2 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold rounded-lg cursor-pointer">
                    Pilih File
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button type="button" onClick={handleAutoExtractOCR} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Ekstrak OCR
                  </button>
                </div>
              </div>

              {validationIssues.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Hasil Deteksi Validasi Dokumen:</div>
                  <ul className="list-disc pl-5 text-[11px]">
                    {validationIssues.map((iss, i) => <li key={i}>{iss}</li>)}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Dokumen *</label>
                  <input required type="text" value={formData.docNumber} onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Transaksi *</label>
                  <input required type="date" value={formData.docDate} onChange={(e) => setFormData({ ...formData, docDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Dokumen</label>
                  <select value={formData.docType} onChange={(e) => setFormData({ ...formData, docType: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg">
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Klasifikasi</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg">
                    {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor / Pelanggan</label>
                  <input type="text" value={formData.partnerName} onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NPWP / NIK</label>
                  <input type="text" value={formData.partnerNpwp} onChange={(e) => setFormData({ ...formData, partnerNpwp: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">DPP (Rp)</label>
                  <input type="number" value={formData.dppAmount} onChange={(e) => setFormData({ ...formData, dppAmount: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PPN (Rp)</label>
                  <input type="number" value={formData.ppnAmount} onChange={(e) => setFormData({ ...formData, ppnAmount: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PPh (Rp)</label>
                  <input type="number" value={formData.pphAmount} onChange={(e) => setFormData({ ...formData, pphAmount: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Transaksi *</label>
                  <input type="number" value={formData.totalAmount} onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tautkan ke Akun COA</label>
                  <SearchableSelect
                    options={coaList.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))}
                    value={formData.accountCode}
                    onChange={(val) => setFormData({ ...formData, accountCode: val })}
                    placeholder="Pilih akun COA terkait..."
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tautkan ke No. Jurnal</label>
                  <SearchableSelect
                    options={journalEntries.map(j => ({ value: j.entryNumber, label: `${j.entryNumber} - ${j.description}` }))}
                    value={formData.journalEntryNumber}
                    onChange={(val) => setFormData({ ...formData, journalEntryNumber: val })}
                    placeholder="Pilih jurnal terkait (opsional)..."
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Transaksi</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>

              {formData.ocrExtracted && (
                <label className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-900 cursor-pointer">
                  <input type="checkbox" checked={formData.ocrConfirmed} onChange={(e) => setFormData({ ...formData, ocrConfirmed: e.target.checked })} className="w-4 h-4 text-indigo-600" />
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Saya telah memeriksa dan mengonfirmasi kebenaran hasil ekstraksi OCR/AI sebelum diarsipkan.</span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan ke Arsip'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <span className="text-sm font-bold">{previewDoc.docNumber} • {previewDoc.docType}</span>
              <button onClick={() => setPreviewDoc(null)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div><strong>Tanggal:</strong> {formatDateIndo(previewDoc.docDate)}</div>
                <div><strong>Klasifikasi:</strong> {previewDoc.category}</div>
                <div><strong>Partner:</strong> {previewDoc.partnerName || '-'}</div>
                <div><strong>NPWP:</strong> {previewDoc.partnerNpwp || '-'}</div>
                <div><strong>Total:</strong> {formatRupiah(previewDoc.totalAmount)}</div>
                <div><strong>Retensi s/d:</strong> {previewDoc.retentionUntil}</div>
              </div>
              {previewDoc.fileDataUrl && previewDoc.fileDataUrl.startsWith('data:image') && (
                <img src={previewDoc.fileDataUrl} alt={previewDoc.fileName} className="max-h-64 mx-auto rounded-lg border border-slate-200" />
              )}
              {previewDoc.fileDataUrl && (
                <a href={previewDoc.fileDataUrl} download={previewDoc.fileName || previewDoc.docNumber} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg">
                  <Download className="w-3.5 h-3.5" /> Unduh Dokumen
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
