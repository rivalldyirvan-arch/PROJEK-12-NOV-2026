import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  Users,
  CheckCircle2,
  X,
  Banknote,
  FileText
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/taxRules';
import { saveCustomer, saveSalesInvoice, receiveSalesPayment } from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import SearchableSelect from '../components/SearchableSelect';

export default function SalesModule({
  salesInvoices = [],
  customers = [],
  coaList = [],
  coaMappings = [],
  onRefresh,
  showToast
}) {
  const { currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('invoices'); // 'invoices' | 'customers'
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [payModalInvoice, setPayModalInvoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [invForm, setInvForm] = useState({
    invoiceNumber: `INV-${today.slice(0, 7).replace('-', '')}-${String(salesInvoices.length + 1).padStart(3, '0')}`,
    invoiceDate: today,
    dueDate: today,
    customerId: '',
    customerName: '',
    title: '',
    subtotal: 0,
    discount: 0,
    ppnRate: 11,
    salesAccountCode: '4101'
  });

  const [custForm, setCustForm] = useState({
    code: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
    name: '',
    npwp: '',
    email: '',
    phone: '',
    address: '',
    paymentTerm: 'Net 30'
  });

  const [payForm, setPayForm] = useState({
    paymentDate: today,
    amount: 0,
    cashAccountCode: '1102',
    referenceNo: ''
  });

  const summary = useMemo(() => {
    const totalSales = salesInvoices.filter(s => s.status !== 'Draft').reduce((s, i) => s + Number(i.totalAmount || 0), 0);
    const totalRemainingAR = salesInvoices.filter(s => s.status !== 'Draft').reduce((s, i) => s + Number(i.remainingAmount || 0), 0);
    const totalCollected = salesInvoices.filter(s => s.status !== 'Draft').reduce((s, i) => s + Number(i.paidAmount || 0), 0);
    return { totalSales, totalRemainingAR, totalCollected };
  }, [salesInvoices]);

  const invDpp = Math.max(0, (Number(invForm.subtotal) || 0) - (Number(invForm.discount) || 0));
  const invPpn = Math.round(invDpp * ((Number(invForm.ppnRate) || 0) / 100));
  const invTotal = invDpp + invPpn;

  const cashBankAccounts = useMemo(
    () => coaList.filter(c => c.subCategory === 'Kas & Bank' || c.code.startsWith('110')),
    [coaList]
  );

  const revenueAccounts = useMemo(
    () => coaList.filter(c => c.category === 'Revenue' || c.category === 'Other Revenue'),
    [coaList]
  );

  const handleSaveInvoice = async (postNow) => {
    if (!invForm.customerName.trim() || !invForm.title.trim() || Number(invForm.subtotal) <= 0) {
      alert('Pelanggan, judul/keperluan penjualan, dan nominal subtotal wajib diisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      await saveSalesInvoice(
        { ...invForm, dpp: invDpp, ppnAmount: invPpn, totalAmount: invTotal },
        { postNow, currentUser, coaList, mappings: coaMappings }
      );
      showToast?.(
        postNow
          ? `Faktur ${invForm.invoiceNumber} diposting & Jurnal Penjualan otomatis terbentuk!`
          : `Draft faktur ${invForm.invoiceNumber} disimpan.`,
        'success'
      );
      setIsInvoiceModalOpen(false);
      await onRefresh();
    } catch (err) {
      showToast?.(err.message || 'Gagal menyimpan faktur', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!custForm.name.trim()) return;
    await saveCustomer(custForm);
    showToast?.(`Pelanggan "${custForm.name}" berhasil ditambahkan.`, 'success');
    setIsCustomerModalOpen(false);
    await onRefresh();
  };

  const handleConfirmReceivePayment = async (e) => {
    e.preventDefault();
    if (!payModalInvoice || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const cashAcc = coaList.find(c => c.code === payForm.cashAccountCode);
      await receiveSalesPayment({
        invoice: payModalInvoice,
        paymentDate: payForm.paymentDate,
        amount: payForm.amount,
        cashAccountCode: payForm.cashAccountCode,
        cashAccountName: cashAcc?.name || 'Bank Operasional',
        referenceNo: payForm.referenceNo,
        currentUser,
        coaList
      });
      showToast?.(`Penerimaan piutang ${payModalInvoice.invoiceNumber} berhasil & Jurnal Kas Masuk terbentuk!`, 'success');
      setPayModalInvoice(null);
      await onRefresh();
    } catch (err) {
      showToast?.(err.message || 'Gagal mencatat pelunasan piutang', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Penjualan &amp; Piutang Usaha (Accounts Receivable)</h2>
            <p className="text-xs text-slate-500">
              Pencatatan faktur penjualan, PPN Keluaran, dan penerimaan pelunasan piutang dengan jurnal otomatis ke Buku Besar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveSubTab('invoices')} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${activeSubTab === 'invoices' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'}`}>
              <FileText className="w-3.5 h-3.5 inline mr-1" /> Faktur Penjualan
            </button>
            <button onClick={() => setActiveSubTab('customers')} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${activeSubTab === 'customers' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'}`}>
              <Users className="w-3.5 h-3.5 inline mr-1" /> Pelanggan ({customers.length})
            </button>
          </div>

          {activeSubTab === 'invoices' ? (
            <button
              onClick={() => {
                setInvForm(prev => ({ ...prev, invoiceNumber: `INV-${today.slice(0, 7).replace('-', '')}-${String(salesInvoices.length + 1).padStart(3, '0')}` }));
                setIsInvoiceModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Buat Faktur Penjualan
            </button>
          ) : (
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Tambah Pelanggan
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Penjualan Terposting</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{formatRupiah(summary.totalSales)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Piutang Belum Tertagih (AR)</span>
          <div className="text-xl font-extrabold text-amber-700 mt-1 font-mono">{formatRupiah(summary.totalRemainingAR)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Kas Diterima</span>
          <div className="text-xl font-extrabold text-emerald-700 mt-1 font-mono">{formatRupiah(summary.totalCollected)}</div>
        </div>
      </div>

      {activeSubTab === 'invoices' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">No. Faktur</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 text-right">DPP</th>
                  <th className="py-3 px-4 text-right">PPN</th>
                  <th className="py-3 px-4 text-right">Total Tagihan</th>
                  <th className="py-3 px-4 text-right">Sisa Piutang</th>
                  <th className="py-3 px-4 text-center">Status &amp; Jurnal</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesInvoices.length === 0 ? (
                  <tr><td colSpan={10} className="py-12 text-center text-slate-400">Belum ada faktur penjualan.</td></tr>
                ) : (
                  salesInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{formatDateIndo(inv.invoiceDate)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{inv.customerName}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">{inv.title}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatRupiah(inv.dpp)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatRupiah(inv.ppnAmount)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatRupiah(inv.totalAmount)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">{formatRupiah(inv.remainingAmount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'Lunas' ? 'bg-teal-100 text-teal-800'
                          : inv.status === 'Posted' || inv.status === 'Sebagian Dibayar' ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                        }`}>
                          {inv.status}
                        </span>
                        {inv.journalEntryNumber && <div className="text-[10px] font-mono text-indigo-700 mt-0.5">{inv.journalEntryNumber}</div>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {inv.status === 'Draft' && (
                          <button
                            onClick={() => saveSalesInvoice(inv, { postNow: true, currentUser, coaList, mappings: coaMappings }).then(() => onRefresh())}
                            className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                          >
                            Posting Jurnal
                          </button>
                        )}
                        {(inv.status === 'Posted' || inv.status === 'Sebagian Dibayar') && (
                          <button
                            onClick={() => {
                              setPayModalInvoice(inv);
                              setPayForm({ paymentDate: today, amount: inv.remainingAmount, cashAccountCode: cashBankAccounts[0]?.code || '1102', referenceNo: `RCV-${inv.invoiceNumber}` });
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-1 mx-auto"
                          >
                            <Banknote className="w-3 h-3" /> Terima Bayar
                          </button>
                        )}
                        {inv.status === 'Lunas' && <CheckCircle2 className="w-4 h-4 text-teal-600 mx-auto" />}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">NPWP</th>
                <th className="py-3 px-4">Kontak</th>
                <th className="py-3 px-4">Termin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">Belum ada data pelanggan.</td></tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id}>
                    <td className="py-3 px-4 font-mono font-bold">{c.code}</td>
                    <td className="py-3 px-4 font-semibold">{c.name}</td>
                    <td className="py-3 px-4 font-mono">{c.npwp || '-'}</td>
                    <td className="py-3 px-4">{c.phone || c.email || '-'}</td>
                    <td className="py-3 px-4">{c.paymentTerm}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Buat Faktur Penjualan */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Buat Faktur Penjualan Baru</h3>
              <button onClick={() => setIsInvoiceModalOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Faktur *</label>
                  <input type="text" value={invForm.invoiceNumber} onChange={(e) => setInvForm({ ...invForm, invoiceNumber: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Faktur *</label>
                  <input type="date" value={invForm.invoiceDate} onChange={(e) => setInvForm({ ...invForm, invoiceDate: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pelanggan *</label>
                {customers.length > 0 ? (
                  <SearchableSelect
                    options={customers.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
                    value={invForm.customerId}
                    onChange={(val) => {
                      const c = customers.find(x => x.id === val);
                      setInvForm({ ...invForm, customerId: val, customerName: c?.name || '' });
                    }}
                    placeholder="Pilih pelanggan..."
                  />
                ) : (
                  <input type="text" placeholder="Nama Pelanggan / Perusahaan" value={invForm.customerName} onChange={(e) => setInvForm({ ...invForm, customerName: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg" />
                )}
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Jasa / Barang Dijual *</label>
                <input type="text" value={invForm.title} onChange={(e) => setInvForm({ ...invForm, title: e.target.value })} placeholder="Contoh: Jasa Implementasi Sistem ERP Q4" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Akun Pendapatan (Kredit)</label>
                <SearchableSelect
                  options={revenueAccounts.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))}
                  value={invForm.salesAccountCode}
                  onChange={(val) => setInvForm({ ...invForm, salesAccountCode: val })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subtotal (Rp) *</label>
                  <input type="number" value={invForm.subtotal} onChange={(e) => setInvForm({ ...invForm, subtotal: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Diskon (Rp)</label>
                  <input type="number" value={invForm.discount} onChange={(e) => setInvForm({ ...invForm, discount: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PPN (%)</label>
                  <select value={invForm.ppnRate} onChange={(e) => setInvForm({ ...invForm, ppnRate: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg">
                    <option value={11}>11%</option>
                    <option value={12}>12%</option>
                    <option value={0}>0% (Non-PPN)</option>
                  </select>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between font-bold text-emerald-900">
                <span>Total Tagihan (Piutang Usaha):</span>
                <span className="font-mono text-sm">{formatRupiah(invTotal)}</span>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold">Batal</button>
                <button type="button" disabled={isSubmitting} onClick={() => handleSaveInvoice(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold">Simpan Draft</button>
                <button type="button" disabled={isSubmitting} onClick={() => handleSaveInvoice(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold">Posting &amp; Buat Jurnal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Pelanggan */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <form onSubmit={handleSaveCustomer} className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Tambah Master Pelanggan</h3>
              <button type="button" onClick={() => setIsCustomerModalOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div><label className="block font-bold mb-1">Kode *</label><input required type="text" value={custForm.code} onChange={(e) => setCustForm({ ...custForm, code: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono" /></div>
              <div><label className="block font-bold mb-1">Nama Pelanggan *</label><input required type="text" value={custForm.name} onChange={(e) => setCustForm({ ...custForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block font-bold mb-1">NPWP</label><input type="text" value={custForm.npwp} onChange={(e) => setCustForm({ ...custForm, npwp: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono" /></div>
              <div><label className="block font-bold mb-1">Telepon / Email</label><input type="text" value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-4 py-2 text-slate-600 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg">Simpan</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal Penerimaan Piutang */}
      {payModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <form onSubmit={handleConfirmReceivePayment} className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-emerald-700 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Terima Pelunasan Piutang ({payModalInvoice.invoiceNumber})</h3>
              <button type="button" onClick={() => setPayModalInvoice(null)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div><label className="block font-bold mb-1">Tanggal Terima *</label><input required type="date" value={payForm.paymentDate} onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block font-bold mb-1">Masuk ke Akun Kas / Bank *</label>
                <select value={payForm.cashAccountCode} onChange={(e) => setPayForm({ ...payForm, cashAccountCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  {cashBankAccounts.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div><label className="block font-bold mb-1">Nominal Diterima (Rp) *</label><input required type="number" max={payModalInvoice.remainingAmount} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono font-bold" /></div>
              <div><label className="block font-bold mb-1">No. Referensi</label><input type="text" value={payForm.referenceNo} onChange={(e) => setPayForm({ ...payForm, referenceNo: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPayModalInvoice(null)} className="px-4 py-2 text-slate-600 rounded-lg">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg">Posting Penerimaan Kas</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

