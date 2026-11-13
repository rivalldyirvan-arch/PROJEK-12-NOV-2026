import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Wallet, 
  Receipt, 
  FileText, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Calendar,
  Building2,
  Users,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  FileCheck2,
  X,
  Layers,
  ExternalLink,
  Eye,
  Filter,
  CreditCard,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/taxRules';
import { executePurchasePayment, getVendorDeposit } from '../lib/databaseService';
import { useAuth } from '../lib/authContext';

export default function Dashboard({ 
  coaList = [], 
  vendorList = [], 
  purchaseRequests = [], 
  taxRecords = [],
  onNavigate,
  onRefresh,
  showToast
}) {
  const { currentUser, hasPermission } = useAuth();

  // 1. Hitung Kas & Bank (COA subCategory 'Kas & Bank')
  const totalKasBank = coaList
    .filter(a => a.subCategory === 'Kas & Bank')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  // 2. Hitung Hutang Usaha & Pajak (COA kategori Liability)
  const totalHutangUsaha = coaList
    .filter(a => a.category === 'Liability')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  // 3. Hitung Pengajuan Belum Terbayarkan (Menunggu Persetujuan, Disetujui, Sebagian Dibayar)
  const pendingRequests = purchaseRequests.filter(p => p.status === 'Menunggu Persetujuan');
  const pendingNetPayable = pendingRequests.reduce((sum, p) => sum + (Number(p.remainingPayable !== undefined ? p.remainingPayable : p.totalPayable) || 0), 0);

  const approvedRequests = purchaseRequests.filter(p => p.status === 'Disetujui' || p.status === 'Sebagian Dibayar');
  const approvedNetPayable = approvedRequests.reduce((sum, p) => sum + (Number(p.remainingPayable !== undefined ? p.remainingPayable : p.totalPayable) || 0), 0);

  const unpaidRequests = purchaseRequests.filter(p => p.status === 'Menunggu Persetujuan' || p.status === 'Disetujui' || p.status === 'Sebagian Dibayar');
  const totalUnpaidNetPayable = pendingNetPayable + approvedNetPayable;

  // Modal State for Unpaid PRs
  const [isUnpaidModalOpen, setIsUnpaidModalOpen] = useState(false);
  const [modalFilterStatus, setModalFilterStatus] = useState('Semua'); // 'Semua' | 'Menunggu Persetujuan' | 'Disetujui'
  const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'detail'
  const [expandedVendors, setExpandedVendors] = useState({});

  // Payment Confirmation Modal State
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    referenceNo: '',
    paymentMethod: 'Bank', // 'Kas' | 'Bank' | 'Deposit'
    kasCode: '',
    bankCode: '',
    useExactAmount: true,
    actualPaidInput: '',
    depositToUseInput: '',
    excessApproval: null, // null | 'SETUJU' | 'TIDAK SETUJU'
    notes: ''
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const toggleVendorExpand = (vendorKey) => {
    setExpandedVendors(prev => ({
      ...prev,
      [vendorKey]: !prev[vendorKey]
    }));
  };

  const displayedRequests = unpaidRequests.filter(p => {
    if (modalFilterStatus === 'Semua') return true;
    if (modalFilterStatus === 'Disetujui') return p.status === 'Disetujui' || p.status === 'Sebagian Dibayar';
    return p.status === modalFilterStatus;
  });

  const displayedTotalNet = displayedRequests.reduce((sum, p) => sum + (Number(p.remainingPayable !== undefined ? p.remainingPayable : p.totalPayable) || 0), 0);
  const displayedTotalDpp = displayedRequests.reduce((sum, p) => sum + (Number(p.dpp) || 0), 0);
  const displayedTotalPph = displayedRequests.reduce((sum, p) => sum + (Number(p.pphAmount) || 0), 0);

  // Group displayed unpaid requests by Vendor
  const groupedVendors = useMemo(() => {
    const grouped = {};
    displayedRequests.forEach(pr => {
      const vKey = pr.vendorId || pr.vendorName || 'other';
      if (!grouped[vKey]) {
        const vInfo = vendorList.find(v => v.id === pr.vendorId);
        grouped[vKey] = {
          vendorKey: vKey,
          vendorId: pr.vendorId,
          vendorName: pr.vendorName || 'Rekanan / Vendor',
          vendorCode: vInfo?.code || '',
          category: vInfo?.category || '',
          bankName: vInfo?.bankName || '',
          bankAccount: vInfo?.bankAccount || '',
          bankAccountHolder: vInfo?.bankAccountHolder || '',
          items: [],
          totalNetPayable: 0,
          totalDpp: 0,
          totalPph: 0,
          pendingCount: 0,
          approvedCount: 0
        };
      }
      const curDue = Number(pr.remainingPayable !== undefined ? pr.remainingPayable : pr.totalPayable) || 0;
      grouped[vKey].items.push(pr);
      grouped[vKey].totalNetPayable += curDue;
      grouped[vKey].totalDpp += (Number(pr.dpp) || 0);
      grouped[vKey].totalPph += (Number(pr.pphAmount) || 0);
      if (pr.status === 'Menunggu Persetujuan') grouped[vKey].pendingCount += 1;
      if (pr.status === 'Disetujui' || pr.status === 'Sebagian Dibayar') grouped[vKey].approvedCount += 1;
    });
    return Object.values(grouped).sort((a, b) => b.totalNetPayable - a.totalNetPayable);
  }, [displayedRequests, vendorList]);

  // Akun Kas & Bank dari COA
  const kasAccounts = useMemo(() => {
    const list = coaList.filter(a => a.subCategory === 'Kas & Bank' && a.name.toLowerCase().includes('kas'));
    if (list.length > 0) return list;
    return [
      { id: '1101', code: '1101', name: 'Kas Kecil (Petty Cash)', balance: 15000000 },
      { id: '1104', code: '1104', name: 'Kas Besar (Main Cash)', balance: 45000000 }
    ];
  }, [coaList]);

  const bankAccounts = useMemo(() => {
    const list = coaList.filter(a => a.subCategory === 'Kas & Bank' && !a.name.toLowerCase().includes('kas'));
    if (list.length > 0) return list;
    return [
      { id: '1102', code: '1102', name: 'Bank BCA Operasional', balance: 350000000 },
      { id: '1103', code: '1103', name: 'Bank Mandiri Payroll & Tax', balance: 185000000 }
    ];
  }, [coaList]);

  // Handler Buka Form Konfirmasi Pelunasan
  const handleOpenPaymentModal = (prs, vendorGroup) => {
    const isAllowed = hasPermission('pay_purchase') || currentUser?.role?.toLowerCase().includes('admin') || currentUser?.role?.toLowerCase().includes('finance');
    if (!isAllowed) {
      alert('Akses Ditolak: Anda tidak memiliki wewenang untuk memproses pembayaran (Permission: pay_purchase). Hanya Finance dan Admin yang berwenang.');
      return;
    }

    const totalDue = prs.reduce((sum, p) => sum + (Number(p.remainingPayable !== undefined ? p.remainingPayable : p.totalPayable) || 0), 0);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSeq = String(Math.floor(100 + Math.random() * 900));
    const generatedRef = `PAY-${dateStr}-${randomSeq}`;

    const vId = vendorGroup.vendorId || prs[0]?.vendorId;
    const vendorDeposit = getVendorDeposit(vId);
    const availableDep = Number(vendorDeposit?.balance || 0);

    setPaymentModalData({
      targetPRs: prs,
      isGroup: prs.length > 1,
      vendorId: vId,
      vendorName: vendorGroup.vendorName || prs[0]?.vendorName || 'Rekanan',
      vendorCode: vendorGroup.vendorCode || '',
      vendorBank: vendorGroup.bankName ? `${vendorGroup.bankName} ${vendorGroup.bankAccount} (a/n ${vendorGroup.bankAccountHolder || vendorGroup.vendorName})` : 'Belum tercatat',
      totalDue,
      availableDeposit: availableDep
    });

    setPaymentForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      referenceNo: generatedRef,
      paymentMethod: 'Bank',
      kasCode: kasAccounts[0]?.code || '1101',
      bankCode: bankAccounts[0]?.code || '1102',
      useExactAmount: true,
      actualPaidInput: String(totalDue),
      depositToUseInput: String(Math.min(availableDep, totalDue)),
      excessApproval: null,
      notes: ''
    });
  };

  // Nominal Aktual yang Dibayarkan (Realtime)
  const effectivePaidAmount = useMemo(() => {
    if (!paymentModalData) return 0;
    if (paymentForm.paymentMethod === 'Deposit') {
      return Number(paymentForm.depositToUseInput) || 0;
    }
    if (paymentForm.useExactAmount) {
      return paymentModalData.totalDue;
    }
    return Number(paymentForm.actualPaidInput) || 0;
  }, [paymentModalData, paymentForm]);

  // Selisih = totalDue - effectivePaidAmount
  const paymentDifference = useMemo(() => {
    if (!paymentModalData) return 0;
    return paymentModalData.totalDue - effectivePaidAmount;
  }, [paymentModalData, effectivePaidAmount]);

  // Validasi Form Pembayaran
  const isPaymentValid = useMemo(() => {
    if (!paymentModalData || isSubmittingPayment) return false;
    if (!paymentForm.paymentDate || !paymentForm.referenceNo.trim()) return false;

    if (paymentForm.paymentMethod === 'Kas' && !paymentForm.kasCode) return false;
    if (paymentForm.paymentMethod === 'Bank' && !paymentForm.bankCode) return false;

    if (paymentForm.paymentMethod === 'Deposit') {
      const depToUse = Number(paymentForm.depositToUseInput) || 0;
      if (depToUse <= 0 || depToUse > paymentModalData.availableDeposit) return false;
    } else {
      if (effectivePaidAmount <= 0) return false;
    }

    // Selisih MINUS (Kelebihan Bayar): WAJIB SETUJU!
    if (paymentDifference < 0) {
      if (paymentForm.excessApproval !== 'SETUJU') return false;
    }

    return true;
  }, [paymentModalData, isSubmittingPayment, paymentForm, effectivePaidAmount, paymentDifference]);

  // Eksekusi Konfirmasi Pembayaran
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!isPaymentValid || !paymentModalData || isSubmittingPayment) return;

    setIsSubmittingPayment(true);
    try {
      let accountCode = '';
      let accountName = '';

      if (paymentForm.paymentMethod === 'Kas') {
        const chosen = kasAccounts.find(a => a.code === paymentForm.kasCode) || kasAccounts[0];
        accountCode = chosen?.code || '1101';
        accountName = chosen?.name || 'Kas Kecil';
      } else if (paymentForm.paymentMethod === 'Bank') {
        const bankAcc = bankAccounts.find(a => a.code === paymentForm.bankCode) || bankAccounts[0];
        accountCode = bankAcc?.code || '1102';
        accountName = bankAcc?.name || 'Bank Operasional';
      }

      const paidAmount = paymentForm.paymentMethod === 'Deposit'
        ? (Number(paymentForm.depositToUseInput) || 0)
        : (paymentForm.useExactAmount ? paymentModalData.totalDue : (Number(paymentForm.actualPaidInput) || 0));

      const excessAmount = Math.max(0, paidAmount - paymentModalData.totalDue);

      await executePurchasePayment({
        prList: paymentModalData.targetPRs,
        vendorId: paymentModalData.vendorId,
        vendorName: paymentModalData.vendorName,
        paymentDate: paymentForm.paymentDate,
        referenceNo: paymentForm.referenceNo,
        paymentMethod: paymentForm.paymentMethod,
        accountCode,
        accountName,
        paidAmount,
        depositUsed: paymentForm.paymentMethod === 'Deposit' ? paidAmount : 0,
        excessAmount,
        approvedExcessAsDeposit: paymentForm.excessApproval === 'SETUJU',
        notes: paymentForm.notes,
        currentUser
      });

      if (onRefresh) {
        await onRefresh();
      }

      showToast?.(
        `Pembayaran ${paymentForm.referenceNo} berhasil diproses! ${
          excessAmount > 0 && paymentForm.excessApproval === 'SETUJU'
            ? `Kelebihan ${formatRupiah(excessAmount)} ditambahkan ke deposit rekanan.`
            : ''
        }`,
        'success'
      );

      setPaymentModalData(null);
    } catch (err) {
      console.error('Error executing payment:', err);
      showToast?.('Gagal memproses pembayaran: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // 4. Hitung Rekap Pajak PPh
  const totalTaxAmount = taxRecords.reduce((sum, t) => sum + (Number(t.taxAmount) || 0), 0);
  const paidTax = taxRecords
    .filter(t => t.status === 'Lunas / Disetor (NTPN)' || t.status === 'Dilaporkan SPT Masa')
    .reduce((sum, t) => sum + (Number(t.taxAmount) || 0), 0);
  const unpaidTax = taxRecords
    .filter(t => t.status === 'Draft / Belum Disetor' || t.status === 'Billing Terbit')
    .reduce((sum, t) => sum + (Number(t.taxAmount) || 0), 0);

  // Pajak per PPh type
  const taxByType = {
    'PPh 21': taxRecords.filter(t => t.taxType === 'PPh 21').reduce((s, t) => s + (Number(t.taxAmount) || 0), 0),
    'PPh 22': taxRecords.filter(t => t.taxType === 'PPh 22').reduce((s, t) => s + (Number(t.taxAmount) || 0), 0),
    'PPh 23': taxRecords.filter(t => t.taxType === 'PPh 23').reduce((s, t) => s + (Number(t.taxAmount) || 0), 0),
    'PPh 25': taxRecords.filter(t => t.taxType === 'PPh 25').reduce((s, t) => s + (Number(t.taxAmount) || 0), 0),
    'PPh 4(2)': taxRecords.filter(t => t.taxType === 'PPh 4(2)').reduce((s, t) => s + (Number(t.taxAmount) || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-emerald-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Sistem Keuangan & Perpajakan Terintegrasi
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Ringkasan Eksekutif Keuangan</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Monitoring real-time saldo akun COA, kepatuhan pemotongan pajak PPh 21/22/23/25/4(2), dan alur pengajuan pembelian rekanan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('purchases')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/30 transition flex items-center gap-1.5"
            >
              + Buat Pengajuan Baru
            </button>
            <button
              onClick={() => onNavigate('taxes')}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border border-emerald-700/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              Rekap SPT Masa PPh
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Kas & Bank */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kas & Bank Tersedia</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-slate-800">{formatRupiah(totalKasBank)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">BCA & Mandiri</span> • Likuiditas lancar
            </p>
          </div>
        </div>

        {/* Card 2: Pengajuan Belum Terbayarkan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pengajuan Belum Terbayarkan
              </span>
              <button
                type="button"
                onClick={() => {
                  setModalFilterStatus('Semua');
                  setIsUnpaidModalOpen(true);
                }}
                className="p-2.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition cursor-pointer"
                title="Buka rincian pengajuan belum terbayarkan"
              >
                <Receipt className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-2.5">
              <div className="text-[11px] text-slate-400 font-medium">Total Net Payable ke Vendor:</div>
              <h3 className="text-xl font-extrabold text-slate-900">{formatRupiah(totalUnpaidNetPayable)}</h3>
            </div>
          </div>

          {/* Breakdown Status (Clickable) */}
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            {/* 1. Menunggu Persetujuan */}
            <button
              type="button"
              onClick={() => {
                setModalFilterStatus('Menunggu Persetujuan');
                setIsUnpaidModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-amber-50/80 border border-transparent hover:border-amber-200 text-left transition group cursor-pointer"
              title="Klik untuk melihat data pengajuan Menunggu Persetujuan"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-semibold text-slate-700 group-hover:text-amber-900">
                  Menunggu Persetujuan ({pendingRequests.length})
                </span>
              </div>
              <span className="text-xs font-bold text-amber-700 font-mono">
                {formatRupiah(pendingNetPayable)}
              </span>
            </button>

            {/* 2. Disetujui */}
            <button
              type="button"
              onClick={() => {
                setModalFilterStatus('Disetujui');
                setIsUnpaidModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-emerald-50/80 border border-transparent hover:border-emerald-200 text-left transition group cursor-pointer"
              title="Klik untuk melihat data pengajuan yang Disetujui (Siap Bayar)"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-900">
                  Disetujui / Siap Bayar ({approvedRequests.length})
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-700 font-mono">
                {formatRupiah(approvedNetPayable)}
              </span>
            </button>
          </div>
        </div>

        {/* Card 3: Pajak PPh Terpotong */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pajak PPh (Withholding)</span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-slate-800">{formatRupiah(totalTaxAmount)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">{formatRupiah(paidTax)} Disetor</span>
            </p>
          </div>
        </div>

        {/* Card 4: PPh Belum Disetor (Due Tax) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kewajiban Setor Pajak</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-amber-700">{formatRupiah(unpaidTax)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Jatuh tempo tgl 15 bulan ini</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Breakdown Pajak & Recent Purchase Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Purchase Requisitions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pengajuan Pembelian Terbaru</h3>
              <p className="text-xs text-slate-500">Daftar pengadaan barang & jasa serta status pemotongan PPh</p>
            </div>
            <button
              onClick={() => onNavigate('purchases')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              Lihat Semua ({purchaseRequests.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {purchaseRequests.slice(0, 5).map((pr) => {
              const statusStyles = {
                'Draft': 'bg-slate-100 text-slate-700',
                'Menunggu Persetujuan': 'bg-amber-100 text-amber-800 border-amber-200',
                'Disetujui': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                'Ditolak': 'bg-rose-100 text-rose-800',
                'Lunas': 'bg-teal-100 text-teal-800'
              };

              return (
                <div key={pr.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded-xl transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{pr.requestNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusStyles[pr.status] || 'bg-slate-100 text-slate-600'}`}>
                        {pr.status}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">{formatDateIndo(pr.requestDate)}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-1">{pr.title}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Vendor: <strong>{pr.vendorName}</strong></span>
                      {pr.pphType !== 'Non-PPh' && (
                        <span className="bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-medium border border-purple-200">
                          Potong {pr.pphType} ({pr.pphRate}%): {formatRupiah(pr.pphAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Total Bersih (Payable)</div>
                    <div className="text-sm font-extrabold text-slate-900">{formatRupiah(pr.totalPayable)}</div>
                    <div className="text-[10px] text-slate-500">DPP: {formatRupiah(pr.dpp)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Rekapitulasi Pajak PPh 21/22/23/25/4(2) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Komposisi Pajak PPh</h3>
              <p className="text-xs text-slate-500">Withholding & Angsuran Masa Berjalan</p>
            </div>
            <button
              onClick={() => onNavigate('taxes')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Detail SPT
            </button>
          </div>

          <div className="space-y-3">
            {/* PPh 21 */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-slate-800">PPh Pasal 21</span>
                </div>
                <span className="text-[10px] text-slate-500 ml-4">Gaji, Upah, & Tenaga Ahli</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">{formatRupiah(taxByType['PPh 21'])}</span>
              </div>
            </div>

            {/* PPh 22 */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-slate-800">PPh Pasal 22</span>
                </div>
                <span className="text-[10px] text-slate-500 ml-4">Pengadaan Barang & BUMN</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">{formatRupiah(taxByType['PPh 22'])}</span>
              </div>
            </div>

            {/* PPh 23 */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-800">PPh Pasal 23</span>
                </div>
                <span className="text-[10px] text-slate-500 ml-4">Jasa Manajemen, Teknik, Sewa</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">{formatRupiah(taxByType['PPh 23'])}</span>
              </div>
            </div>

            {/* PPh 25 */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-xs font-bold text-slate-800">PPh Pasal 25</span>
                </div>
                <span className="text-[10px] text-slate-500 ml-4">Angsuran PPh Badan Bulanan</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">{formatRupiah(taxByType['PPh 25'])}</span>
              </div>
            </div>

            {/* PPh 4(2) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-slate-800">PPh Final Pasal 4(2)</span>
                </div>
                <span className="text-[10px] text-slate-500 ml-4">Sewa Gedung & Jasa Konstruksi</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">{formatRupiah(taxByType['PPh 4(2)'])}</span>
              </div>
            </div>
          </div>

          {/* Compliance Alert Box */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Jadwal Kepatuhan Pajak (DJP)
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              • Tgl 10: Setor PPh 21/26<br />
              • Tgl 15: Setor PPh 22, 23, 25, 4(2)<br />
              • Tgl 20: Lapor SPT Masa Unifikasi PPh
            </p>
          </div>
        </div>
      </div>

      {/* Modal Detail Pengajuan Belum Terbayarkan */}
      {isUnpaidModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Rincian Pengajuan Belum Terbayarkan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total <strong className="text-slate-800">{displayedRequests.length} Pengajuan</strong> • Total Net Payable: <strong className="text-emerald-700 font-mono">{formatRupiah(displayedTotalNet)}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUnpaidModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Status & View Switcher */}
            <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalFilterStatus('Semua')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    modalFilterStatus === 'Semua'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({unpaidRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilterStatus('Menunggu Persetujuan')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    modalFilterStatus === 'Menunggu Persetujuan'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-amber-800 hover:bg-amber-100/60'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  Menunggu Persetujuan ({pendingRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilterStatus('Disetujui')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    modalFilterStatus === 'Disetujui'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-800 hover:bg-emerald-100/60'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  Disetujui ({approvedRequests.length})
                </button>
              </div>

              {/* View Switcher: Summary per Vendor vs Detail Rinci */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('summary')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'summary'
                      ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Tampilkan ringkasan yang dikelompokkan berdasarkan Rekanan / Vendor"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Ringkasan per Rekanan ({groupedVendors.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('detail')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'detail'
                      ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Tampilkan daftar rinci semua pengajuan"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Daftar Rinci Semua ({displayedRequests.length})
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4">
              {displayedRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="font-semibold text-slate-600 text-sm">Tidak ada pengajuan pada status ini</p>
                  <p className="text-xs text-slate-400 mt-0.5">Semua pengajuan telah lunas atau belum ada pengajuan baru.</p>
                </div>
              ) : viewMode === 'summary' ? (
                /* Mode 1: Ringkasan per Vendor (Summary Grouped) */
                <div className="space-y-3.5">
                  {groupedVendors.map((group) => {
                    const isExpanded = !!expandedVendors[group.vendorKey];
                    return (
                      <div
                        key={group.vendorKey}
                        className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition overflow-hidden"
                      >
                        {/* Summary Header per Vendor */}
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900">{group.vendorName}</span>
                              {group.vendorCode && (
                                <span className="bg-slate-200 text-slate-700 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">
                                  {group.vendorCode}
                                </span>
                              )}
                              {group.category && (
                                <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-medium border border-sky-200">
                                  {group.category}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                              {group.bankName ? (
                                <span>
                                  Rekening: <strong>{group.bankName} {group.bankAccount}</strong> (a/n {group.bankAccountHolder || group.vendorName})
                                </span>
                              ) : (
                                <span className="italic text-slate-400">Rekening bank belum diisi</span>
                              )}
                              <span>•</span>
                              <span className="font-semibold text-slate-700">
                                {group.items.length} Pengajuan
                              </span>
                              {group.pendingCount > 0 && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                                  {group.pendingCount} Menunggu
                                </span>
                              )}
                              {group.approvedCount > 0 && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                                  {group.approvedCount} Disetujui
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-2.5 border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
                            <div className="text-left md:text-right mr-1">
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                Total Net Tagihan
                              </div>
                              <div className="text-base font-extrabold text-emerald-700 font-mono">
                                {formatRupiah(group.totalNetPayable)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                DPP: {formatRupiah(group.totalDpp)} {group.totalPph > 0 && `• PPh: -${formatRupiah(group.totalPph)}`}
                              </div>
                            </div>

                            {/* Tombol LUNAS Kelompok (Summary) */}
                            {group.approvedCount > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(group.items.filter(p => p.status === 'Disetujui' || p.status === 'Sebagian Dibayar'), group)}
                                className="px-3 py-1.5 text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer border border-emerald-500/20"
                                title={`Bayar lunas sekaligus ${group.approvedCount} pengajuan yang telah disetujui untuk ${group.vendorName}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>LUNAS ({group.approvedCount} PR)</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleVendorExpand(group.vendorKey)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                                isExpanded
                                  ? 'bg-slate-800 text-white border-slate-800'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              <span>{isExpanded ? 'Tutup Detail' : `Lihat Detail (${group.items.length})`}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Accordion Detail Table under this Vendor */}
                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-white p-3 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                                  <th className="py-2 px-2.5 font-bold">No. PR</th>
                                  <th className="py-2 px-2.5 font-bold">Tanggal</th>
                                  <th className="py-2 px-2.5 font-bold">Judul / Keperluan</th>
                                  <th className="py-2 px-2.5 font-bold">Departemen</th>
                                  <th className="py-2 px-2.5 font-bold">Status</th>
                                  <th className="py-2 px-2.5 font-bold text-right">DPP</th>
                                  <th className="py-2 px-2.5 font-bold text-right">PPh</th>
                                  <th className="py-2 px-2.5 font-bold text-right">Net Payable</th>
                                  <th className="py-2 px-2.5 font-bold text-center">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.items.map((pr) => (
                                  <tr key={pr.id} className="hover:bg-slate-50/70">
                                    <td className="py-2.5 px-2.5 font-mono font-bold text-slate-800">{pr.requestNumber}</td>
                                    <td className="py-2.5 px-2.5 text-slate-600">{formatDateIndo(pr.requestDate)}</td>
                                    <td className="py-2.5 px-2.5 font-semibold text-slate-800 max-w-xs truncate" title={pr.title}>
                                      {pr.title}
                                    </td>
                                    <td className="py-2.5 px-2.5 text-slate-500">{pr.department}</td>
                                    <td className="py-2.5 px-2.5">
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        pr.status === 'Disetujui'
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                          : pr.status === 'Sebagian Dibayar'
                                          ? 'bg-sky-100 text-sky-800 border-sky-200'
                                          : 'bg-amber-100 text-amber-800 border-amber-200'
                                      }`}>
                                        {pr.status}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">{formatRupiah(pr.dpp)}</td>
                                    <td className="py-2.5 px-2.5 text-right font-mono text-purple-700">
                                      {pr.pphType !== 'Non-PPh' ? `${pr.pphType}: -${formatRupiah(pr.pphAmount)}` : '-'}
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-700">
                                      {formatRupiah(pr.remainingPayable !== undefined ? pr.remainingPayable : pr.totalPayable)}
                                      {pr.paidAmount > 0 && (
                                        <div className="text-[10px] text-slate-400 font-normal">
                                          Terbayar: {formatRupiah(pr.paidAmount)}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-2.5 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        {(pr.status === 'Disetujui' || pr.status === 'Sebagian Dibayar') && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenPaymentModal([pr], group)}
                                            className="px-2.5 py-1 text-[11px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                                            title="Bayar lunas pengajuan ini"
                                          >
                                            <CheckCircle className="w-3 h-3" />
                                            <span>LUNAS</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setIsUnpaidModalOpen(false);
                                            onNavigate('purchases');
                                          }}
                                          className="text-[11px] text-slate-500 hover:text-slate-700 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer p-1"
                                          title="Buka di modul pengajuan pembelian"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Mode 2: Daftar Rinci Semua (Flat Table) */
                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-3 font-bold">No. PR</th>
                        <th className="py-3 px-3 font-bold">Rekanan / Vendor</th>
                        <th className="py-3 px-3 font-bold">Tanggal</th>
                        <th className="py-3 px-3 font-bold">Judul / Kebutuhan</th>
                        <th className="py-3 px-3 font-bold">Departemen</th>
                        <th className="py-3 px-3 font-bold">Status</th>
                        <th className="py-3 px-3 font-bold text-right">DPP</th>
                        <th className="py-3 px-3 font-bold text-right">PPh</th>
                        <th className="py-3 px-3 font-bold text-right">Net Payable</th>
                        <th className="py-3 px-3 font-bold text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedRequests.map((pr) => (
                        <tr key={pr.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{pr.requestNumber}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{pr.vendorName}</td>
                          <td className="py-2.5 px-3 text-slate-600">{formatDateIndo(pr.requestDate)}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 max-w-xs truncate" title={pr.title}>
                            {pr.title}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{pr.department}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              pr.status === 'Disetujui'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : pr.status === 'Sebagian Dibayar'
                                ? 'bg-sky-100 text-sky-800 border-sky-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {pr.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatRupiah(pr.dpp)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-purple-700">
                            {pr.pphType !== 'Non-PPh' ? `${pr.pphType}: -${formatRupiah(pr.pphAmount)}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatRupiah(pr.remainingPayable !== undefined ? pr.remainingPayable : pr.totalPayable)}
                            {pr.paidAmount > 0 && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                Terbayar: {formatRupiah(pr.paidAmount)}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {(pr.status === 'Disetujui' || pr.status === 'Sebagian Dibayar') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const vInfo = vendorList.find(v => v.id === pr.vendorId) || { vendorId: pr.vendorId, vendorName: pr.vendorName };
                                    handleOpenPaymentModal([pr], vInfo);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                                  title="Bayar lunas pengajuan ini"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span>LUNAS</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsUnpaidModalOpen(false);
                                  onNavigate('purchases');
                                }}
                                className="text-[11px] text-slate-500 hover:text-slate-700 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer p-1"
                                title="Buka di modul pengajuan pembelian"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer Summary */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">Total DPP:</span> <strong className="font-mono text-slate-800">{formatRupiah(displayedTotalDpp)}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Total Pot. PPh:</span> <strong className="font-mono text-purple-700">-{formatRupiah(displayedTotalPph)}</strong>
                </div>
                <div className="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-300">
                  <span>Grand Total Net ke Vendor:</span> <strong className="font-mono font-extrabold text-emerald-800 ml-1">{formatRupiah(displayedTotalNet)}</strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUnpaidModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsUnpaidModalOpen(false);
                    onNavigate('purchases');
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Kelola di Modul Pembelian (PR)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* FORM KONFIRMASI PELUNASAN PEMBAYARAN */}
      {/* ================================================================= */}
      {paymentModalData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Form Konfirmasi Pelunasan Pembayaran
                  </h3>
                  <p className="text-xs text-slate-500">
                    {paymentModalData.isGroup 
                      ? `Pembayaran Kelompok (${paymentModalData.targetPRs.length} Pengajuan) • ${paymentModalData.vendorName}`
                      : `Pembayaran Satuan: ${paymentModalData.targetPRs[0]?.requestNumber} • ${paymentModalData.vendorName}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalData(null)}
                disabled={isSubmittingPayment}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmPayment} className="p-4 md:p-6 space-y-5">
              {/* Box 1: Info Tagihan yang Dibayarkan */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Vendor / Rekanan Tujuan
                  </span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {paymentModalData.vendorName} {paymentModalData.vendorCode && `(${paymentModalData.vendorCode})`}
                  </span>
                </div>
                <div className="text-xs text-slate-600 flex items-center justify-between">
                  <span>Rekening Tujuan Transfer:</span>
                  <span className="font-semibold text-slate-700 font-mono">{paymentModalData.vendorBank}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700">Total Nominal Pengajuan (Net Tagihan):</span>
                    <div className="text-[11px] text-slate-500 max-w-sm truncate" title={paymentModalData.targetPRs.map(p => p.requestNumber).join(', ')}>
                      {paymentModalData.targetPRs.map(p => p.requestNumber).join(', ')}
                    </div>
                  </div>
                  <div className="text-lg font-extrabold text-emerald-700 font-mono">
                    {formatRupiah(paymentModalData.totalDue)}
                  </div>
                </div>
              </div>

              {/* Box 2: Informasi Pembayaran (Wajib) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Pelunasan / Pembayaran *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    No. Transaksi / Referensi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PAY-20261113-001"
                    value={paymentForm.referenceNo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Box 3: Bayar Menggunakan (Pilihan Metode) */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Bayar Menggunakan (Metode Pembayaran) *
                </label>
                
                {/* 3 Tab Options: KAS, BANK, DEPOSIT */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: 'Kas' })}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      paymentForm.paymentMethod === 'Kas'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Wallet className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-bold">A. KAS</span>
                    <span className="text-[10px] text-slate-400">Kas Kecil / Kas Besar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: 'Bank' })}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      paymentForm.paymentMethod === 'Bank'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-bold">B. BANK</span>
                    <span className="text-[10px] text-slate-400">Transfer Rekening Bank</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, paymentMethod: 'Deposit' })}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      paymentForm.paymentMethod === 'Deposit'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-bold">C. DEPOSIT</span>
                    <span className="text-[10px] text-slate-400">Saldo Deposit Vendor</span>
                  </button>
                </div>

                {/* Sub-Selection based on Method */}
                {paymentForm.paymentMethod === 'Kas' && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <span className="text-xs font-bold text-slate-700 block">Pilih Akun Kas Sumber (Modul Kas & Bank):</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {kasAccounts.map(k => (
                        <label
                          key={k.code}
                          className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                            paymentForm.kasCode === k.code
                              ? 'bg-white border-emerald-500 ring-1 ring-emerald-500 text-emerald-900'
                              : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="kasChoice"
                              checked={paymentForm.kasCode === k.code}
                              onChange={() => setPaymentForm({ ...paymentForm, kasCode: k.code })}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <div className="text-xs font-bold">{k.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Kode: {k.code}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400">Saldo Saat Ini</div>
                            <div className="text-xs font-bold font-mono text-slate-800">{formatRupiah(k.balance)}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {paymentForm.paymentMethod === 'Bank' && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Pilih Rekening Bank Sumber (Modul Kas & Bank):
                    </label>
                    <select
                      value={paymentForm.bankCode}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bankCode: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    >
                      {bankAccounts.map(b => (
                        <option key={b.code} value={b.code}>
                          {b.name} (Kode: {b.code}) — Saldo: {formatRupiah(b.balance)}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      Data rekening otomatis diambil dari Master Akun Kas & Bank dan saldo akan terpotong secara real-time.
                    </p>
                  </div>
                )}

                {paymentForm.paymentMethod === 'Deposit' && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-700">Saldo Deposit Tersedia ({paymentModalData.vendorName}):</span>
                      <span className={`text-sm font-extrabold font-mono ${
                        paymentModalData.availableDeposit > 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {formatRupiah(paymentModalData.availableDeposit)}
                      </span>
                    </div>

                    {paymentModalData.availableDeposit <= 0 ? (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Vendor <strong>{paymentModalData.vendorName}</strong> belum memiliki saldo deposit. Silakan gunakan metode Kas atau Bank.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nominal Deposit yang Ingin Digunakan (Rp):
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={paymentModalData.availableDeposit}
                            value={paymentForm.depositToUseInput}
                            onChange={(e) => setPaymentForm({ ...paymentForm, depositToUseInput: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Sisa Saldo Deposit:</span>
                            <span className="font-mono font-bold text-slate-800">
                              {formatRupiah(Math.max(0, paymentModalData.availableDeposit - (Number(paymentForm.depositToUseInput) || 0)))}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Sisa Tagihan Belum Terbayar:</span>
                            <span className="font-mono font-bold text-amber-700">
                              {formatRupiah(Math.max(0, paymentModalData.totalDue - (Number(paymentForm.depositToUseInput) || 0)))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Box 4: Validasi Nominal Pembayaran & Penanganan Selisih */}
              {paymentForm.paymentMethod !== 'Deposit' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Apakah benar nominal yang Anda bayarkan sudah sesuai dengan nominal pengajuan?
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 text-xs">
                    <label className={`flex-1 p-3 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                      paymentForm.useExactAmount
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="amountMatch"
                        checked={paymentForm.useExactAmount}
                        onChange={() => {
                          setPaymentForm({
                            ...paymentForm,
                            useExactAmount: true,
                            actualPaidInput: String(paymentModalData.totalDue),
                            excessApproval: null
                          });
                        }}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Ya, Sesuai Nominal ({formatRupiah(paymentModalData.totalDue)})</span>
                    </label>

                    <label className={`flex-1 p-3 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                      !paymentForm.useExactAmount
                        ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="amountMatch"
                        checked={!paymentForm.useExactAmount}
                        onChange={() => {
                          setPaymentForm({
                            ...paymentForm,
                            useExactAmount: false,
                            excessApproval: null
                          });
                        }}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Tidak, Nominal Berbeda (Sebagian / Kelebihan)</span>
                    </label>
                  </div>

                  {!paymentForm.useExactAmount && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Nominal Aktual yang Dibayarkan (Rp) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Masukkan nominal yang sebenarnya dibayarkan"
                        value={paymentForm.actualPaidInput}
                        onChange={(e) => setPaymentForm({ ...paymentForm, actualPaidInput: e.target.value, excessApproval: null })}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-base"
                      />
                    </div>
                  )}

                  {/* Evaluation of Difference */}
                  {paymentDifference === 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Nominal pembayaran sesuai tagihan ({formatRupiah(effectivePaidAmount)}). Seluruh pengajuan akan berstatus <strong>LUNAS</strong>.</span>
                    </div>
                  )}

                  {paymentDifference < 0 && (
                    <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-900">
                      <div className="flex items-center gap-2 font-bold text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Terjadi Kelebihan Pembayaran Sebesar {formatRupiah(Math.abs(paymentDifference))}</span>
                      </div>
                      <p className="leading-relaxed">
                        Apakah kelebihan pembayaran sebesar <strong>{formatRupiah(Math.abs(paymentDifference))}</strong> tersebut akan dijadikan deposit atas nama <strong>{paymentModalData.vendorName}</strong>?
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setPaymentForm({ ...paymentForm, excessApproval: 'SETUJU' })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            paymentForm.excessApproval === 'SETUJU'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-emerald-50'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>SETUJU (Jadikan Deposit)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentForm({ ...paymentForm, excessApproval: 'TIDAK SETUJU' })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            paymentForm.excessApproval === 'TIDAK SETUJU'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-rose-50'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>TIDAK SETUJU</span>
                        </button>
                      </div>
                      {paymentForm.excessApproval === 'SETUJU' && (
                        <div className="text-[11px] text-emerald-700 font-semibold bg-white p-2 rounded border border-emerald-200">
                          ✓ Kelebihan pembayaran akan otomatis dicatat sebagai deposit vendor dan pengajuan akan ditandai LUNAS.
                        </div>
                      )}
                      {paymentForm.excessApproval === 'TIDAK SETUJU' && (
                        <div className="text-[11px] text-rose-700 font-semibold bg-white p-2 rounded border border-rose-200">
                          ✗ Transaksi tidak dapat dilanjutkan sebelum nominal pembayaran disesuaikan atau disetujui sebagai deposit.
                        </div>
                      )}
                    </div>
                  )}

                  {paymentDifference > 0 && (
                    <div className="p-3.5 bg-sky-50 border border-sky-300 rounded-xl space-y-1.5 text-xs text-sky-900">
                      <div className="flex items-center gap-2 font-bold text-sky-800">
                        <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" />
                        <span>Terjadi Kekurangan Pembayaran Sebesar {formatRupiah(paymentDifference)}</span>
                      </div>
                      <p className="leading-relaxed">
                        Pembayaran aktual sebesar <strong>{formatRupiah(effectivePaidAmount)}</strong> akan dicatat sebagai <strong>Pembayaran Sebagian</strong>. Sisa tagihan sebesar <strong>{formatRupiah(paymentDifference)}</strong> otomatis tetap tercatat di menu <strong>Pengajuan Belum Terbayarkan</strong> dan dapat dilunasi di kemudian hari.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Box 5: Catatan Pembayaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan Pembayaran (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Catatan transfer, no. bukti setor, atau memo persetujuan..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-500">Nominal Eksekusi:</span>{' '}
                  <strong className="text-emerald-700 font-mono text-sm">{formatRupiah(effectivePaidAmount)}</strong>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentModalData(null)}
                    disabled={isSubmittingPayment}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!isPaymentValid}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmittingPayment ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Menyimpan Pembayaran...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>SELESAI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

