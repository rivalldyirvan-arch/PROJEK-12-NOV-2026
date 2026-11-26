import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Receipt,
  Plus,
  CheckCircle2,
  X,
  ArrowLeftRight
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/taxRules';
import { saveOperationalExpense, saveCashBankTransaction } from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import SearchableSelect from '../components/SearchableSelect';

export default function ExpenseCashBankModule({
  expenses = [],
  cashBankTx = [],
  coaList = [],
  onRefresh,
  showToast
}) {
  const { currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('expenses'); // 'expenses' | 'cashbank'
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCashBankModalOpen, setIsCashBankModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const [expForm, setExpForm] = useState({
    expenseNumber: `EXP-${today.slice(0, 7).replace('-', '')}-${String(expenses.length + 1).padStart(3, '0')}`,
    expenseDate: today,
    category: 'Operasional Kantor',
    department: 'Operations',
    payeeName: '',
    description: '',
    expenseAccountCode: '6105',
    paymentAccountCode: '1101',
    dppAmount: 0,
    ppnAmount: 0,
    referenceNo: ''
  });

  const [cbForm, setCbForm] = useState({
    txNumber: `CB-${today.slice(0, 7).replace('-', '')}-${String(cashBankTx.length + 1).padStart(3, '0')}`,
    txDate: today,
    txType: 'Kas Masuk',
    cashAccountCode: '1102',
    contraAccountCode: '3101',
    partnerName: '',
    referenceNo: '',
    description: '',
    amount: 0
  });

  const cashBankAccounts = useMemo(
    () => coaList.filter(c => c.subCategory === 'Kas & Bank' || c.code.startsWith('110')),
    [coaList]
  );

  const expenseAccounts = useMemo(
    () => coaList.filter(c => c.category === 'Expense' || c.category === 'Other Expense'),
    [coaList]
  );

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expForm.description.trim() || Number(expForm.dppAmount) <= 0) {
      alert('Deskripsi dan nominal biaya wajib diisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      await saveOperationalExpense(expForm, { postNow: true, currentUser, coaList });
      showToast?.(`Biaya ${expForm.expenseNumber} dicatat & Jurnal Pengeluaran otomatis terposting!`, 'success');
      setIsExpenseModalOpen(false);
      await onRefresh();
    } catch (err) {
      showToast?.(err.message || 'Gagal mencatat biaya', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCashBank = async (e) => {
    e.preventDefault();
    if (!cbForm.description.trim() || Number(cbForm.amount) <= 0) {
      alert('Deskripsi dan nominal transaksi wajib diisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      const cashAcc = coaList.find(c => c.code === cbForm.cashAccountCode);
      const contraAcc = coaList.find(c => c.code === cbForm.contraAccountCode);
      await saveCashBankTransaction({
        ...cbForm,
        cashAccountName: cashAcc?.name || cbForm.cashAccountCode,
        contraAccountName: contraAcc?.name || cbForm.contraAccountCode
      }, { currentUser, postJournal: true });
      showToast?.(`Transaksi ${cbForm.txNumber} berhasil & Jurnal Kas/Bank terposting!`, 'success');
      setIsCashBankModalOpen(false);
      await onRefresh();
    } catch (err) {
      showToast?.(err.message || 'Gagal menyimpan transaksi kas/bank', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleReconcile = async (tx) => {
    await saveCashBankTransaction({
      ...tx,
      isReconciled: !tx.isReconciled,
      reconciledAt: !tx.isReconciled ? new Date().toISOString() : null,
      reconciledBy: !tx.isReconciled ? (currentUser?.fullName || 'Finance') : ''
    }, { currentUser, postJournal: false });
    showToast?.(`Status rekonsiliasi ${tx.txNumber} diperbarui.`, 'success');
    await onRefresh();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-50 text-cyan-700 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Biaya Operasional &amp; Kas / Bank</h2>
            <p className="text-xs text-slate-500">
              Pencatatan pengeluaran biaya langsung, mutasi Kas Masuk/Keluar, Transfer Bank, dan Rekonsiliasi Rekening Koran
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveSubTab('expenses')} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${activeSubTab === 'expenses' ? 'bg-white text-cyan-700 shadow-xs' : 'text-slate-600'}`}>
              <Receipt className="w-3.5 h-3.5 inline mr-1" /> Biaya Operasional ({expenses.length})
            </button>
            <button onClick={() => setActiveSubTab('cashbank')} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${activeSubTab === 'cashbank' ? 'bg-white text-cyan-700 shadow-xs' : 'text-slate-600'}`}>
              <ArrowLeftRight className="w-3.5 h-3.5 inline mr-1" /> Kas, Bank &amp; Rekonsiliasi ({cashBankTx.length})
            </button>
          </div>

          {activeSubTab === 'expenses' ? (
            <button
              onClick={() => {
                setExpForm(prev => ({ ...prev, expenseNumber: `EXP-${today.slice(0, 7).replace('-', '')}-${String(expenses.length + 1).padStart(3, '0')}` }));
                setIsExpenseModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Catat Biaya
            </button>
          ) : (
            <button
              onClick={() => {
                setCbForm(prev => ({ ...prev, txNumber: `CB-${today.slice(0, 7).replace('-', '')}-${String(cashBankTx.length + 1).padStart(3, '0')}` }));
                setIsCashBankModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Transaksi Kas / Bank
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'expenses' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">No. Biaya</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Akun Beban (Debit)</th>
                  <th className="py-3 px-4">Dibayar Dari (Kredit)</th>
                  <th className="py-3 px-4">Deskripsi</th>
                  <th className="py-3 px-4 text-right">Total (Rp)</th>
                  <th className="py-3 px-4 text-center">No. Jurnal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400">Belum ada catatan biaya operasional.</td></tr>
                ) : (
                  expenses.map(ex => (
                    <tr key={ex.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{ex.expenseNumber}</td>
                      <td className="py-3 px-4">{formatDateIndo(ex.expenseDate)}</td>
                      <td className="py-3 px-4 font-semibold">{ex.expenseAccountCode} - {ex.expenseAccountName}</td>
                      <td className="py-3 px-4 text-slate-600">{ex.paymentAccountCode} - {ex.paymentAccountName}</td>
                      <td className="py-3 px-4">{ex.description}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">{formatRupiah(ex.totalAmount)}</td>
                      <td className="py-3 px-4 text-center font-mono text-indigo-700 font-bold">{ex.journalEntryNumber || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">No. Transaksi</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">Akun Kas/Bank</th>
                  <th className="py-3 px-4">Akun Lawan</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                  <th className="py-3 px-4 text-center">No. Jurnal</th>
                  <th className="py-3 px-4 text-center">Rekonsiliasi Bank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashBankTx.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-slate-400">Belum ada transaksi Kas &amp; Bank.</td></tr>
                ) : (
                  cashBankTx.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{t.txNumber}</td>
                      <td className="py-3 px-4">{formatDateIndo(t.txDate)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.txType === 'Kas Masuk' ? 'bg-emerald-100 text-emerald-800'
                          : t.txType === 'Transfer Bank' ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                        }`}>{t.txType}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold">{t.cashAccountCode} - {t.cashAccountName}</td>
                      <td className="py-3 px-4 text-slate-600">{t.contraAccountCode} - {t.contraAccountName}</td>
                      <td className="py-3 px-4">{t.description}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">{formatRupiah(t.amount)}</td>
                      <td className="py-3 px-4 text-center font-mono text-indigo-700 font-bold">{t.journalEntryNumber || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleReconcile(t)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            t.isReconciled ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {t.isReconciled ? 'Terekonsiliasi' : 'Tandai Cocok'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Catat Biaya */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <form onSubmit={handleSaveExpense} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Catat Biaya Operasional (Auto-Jurnal)</h3>
              <button type="button" onClick={() => setIsExpenseModalOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-bold mb-1">No. Biaya *</label><input required type="text" value={expForm.expenseNumber} onChange={(e) => setExpForm({ ...expForm, expenseNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono font-bold" /></div>
                <div><label className="block font-bold mb-1">Tanggal *</label><input required type="date" value={expForm.expenseDate} onChange={(e) => setExpForm({ ...expForm, expenseDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div>
                <label className="block font-bold mb-1">Akun Beban (Debit) *</label>
                <SearchableSelect options={expenseAccounts.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))} value={expForm.expenseAccountCode} onChange={(val) => setExpForm({ ...expForm, expenseAccountCode: val })} />
              </div>
              <div>
                <label className="block font-bold mb-1">Dibayar Melalui (Kredit) *</label>
                <select value={expForm.paymentAccountCode} onChange={(e) => setExpForm({ ...expForm, paymentAccountCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  {cashBankAccounts.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div><label className="block font-bold mb-1">Deskripsi *</label><input required type="text" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Contoh: Pembayaran tagihan internet kantor" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-bold mb-1">Nominal DPP (Rp) *</label><input required type="number" value={expForm.dppAmount} onChange={(e) => setExpForm({ ...expForm, dppAmount: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono font-bold" /></div>
                <div><label className="block font-bold mb-1">PPN Masukan (Rp)</label><input type="number" value={expForm.ppnAmount} onChange={(e) => setExpForm({ ...expForm, ppnAmount: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 text-slate-600 rounded-lg">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-cyan-600 text-white font-bold rounded-lg">Posting Biaya &amp; Jurnal</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal Transaksi Kas / Bank */}
      {isCashBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <form onSubmit={handleSaveCashBank} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Transaksi Kas &amp; Bank (Auto-Jurnal)</h3>
              <button type="button" onClick={() => setIsCashBankModalOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block font-bold mb-1">No. Transaksi *</label><input required type="text" value={cbForm.txNumber} onChange={(e) => setCbForm({ ...cbForm, txNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono font-bold" /></div>
                <div><label className="block font-bold mb-1">Tanggal *</label><input required type="date" value={cbForm.txDate} onChange={(e) => setCbForm({ ...cbForm, txDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block font-bold mb-1">Jenis *</label>
                  <select value={cbForm.txType} onChange={(e) => setCbForm({ ...cbForm, txType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    <option value="Kas Masuk">Kas Masuk</option>
                    <option value="Kas Keluar">Kas Keluar</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Akun Kas / Bank *</label>
                <select value={cbForm.cashAccountCode} onChange={(e) => setCbForm({ ...cbForm, cashAccountCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  {cashBankAccounts.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Akun Lawan (Contra Account) *</label>
                <SearchableSelect options={coaList.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))} value={cbForm.contraAccountCode} onChange={(val) => setCbForm({ ...cbForm, contraAccountCode: val })} />
              </div>
              <div><label className="block font-bold mb-1">Deskripsi *</label><input required type="text" value={cbForm.description} onChange={(e) => setCbForm({ ...cbForm, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block font-bold mb-1">Nominal (Rp) *</label><input required type="number" value={cbForm.amount} onChange={(e) => setCbForm({ ...cbForm, amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg font-mono font-bold" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCashBankModalOpen(false)} className="px-4 py-2 text-slate-600 rounded-lg">Batal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-cyan-600 text-white font-bold rounded-lg">Posting Transaksi</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
