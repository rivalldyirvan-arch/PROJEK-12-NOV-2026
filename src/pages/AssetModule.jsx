import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  TrendingDown,
  ArrowRightLeft,
  Trash2,
  Edit3,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Printer,
  ChevronRight,
  Calculator,
  Shield,
  Clock,
  BookOpen,
  PieChart,
  BarChart3,
  CheckSquare,
  FileCheck2,
  Settings,
  HelpCircle
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/taxRules';
import {
  saveFixedAsset,
  deleteFixedAsset,
  saveAssetCategory,
  previewMonthlyDepreciation,
  executeMonthlyDepreciationPosting,
  recordAssetMovement,
  executeAssetDisposal
} from '../lib/databaseService';
import {
  TAX_ASSET_GROUPS,
  calculateAcquisitionCost,
  calculateCommercialDepreciationSchedule,
  calculateTaxDepreciationSchedule,
  calculateDepreciationReconciliation
} from '../lib/assetCalculator';
import { useAuth } from '../lib/authContext';

export default function AssetModule({
  assets = [],
  categories = [],
  journalEntries = [],
  postings = [],
  movements = [],
  disposals = [],
  coaList = [],
  vendorList = [],
  purchaseRequests = [],
  onRefresh,
  showToast
}) {
  const { currentUser, hasPermission, isAdmin } = useAuth();
  
  // 11 Submenu Navigation Tabs
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modal States
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [viewingAssetCard, setViewingAssetCard] = useState(null);
  
  // Disposal Modal State
  const [disposalTargetAsset, setDisposalTargetAsset] = useState(null);
  const [disposalForm, setDisposalForm] = useState({
    disposalDate: new Date().toISOString().slice(0, 10),
    disposalType: 'Sold',
    sellingPrice: 0,
    disposalExpenses: 0,
    paymentAccountCode: '1102',
    buyerInfo: '',
    notes: ''
  });
  const [isSubmittingDisposal, setIsSubmittingDisposal] = useState(false);

  // Movement Modal State
  const [movementTargetAsset, setMovementTargetAsset] = useState(null);
  const [movementForm, setMovementForm] = useState({
    movementType: 'Relocation',
    newLocation: '',
    newDepartment: '',
    newCustodian: '',
    newCondition: 'Baik',
    reason: ''
  });
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

  // Monthly Depreciation Posting State
  const [postingPeriod, setPostingPeriod] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  const [depreciationPreview, setDepreciationPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isPostingDepreciation, setIsPostingDepreciation] = useState(false);

  // Form State for Asset Acquisition / Create
  const [assetFormData, setAssetFormData] = useState({
    assetNumber: '',
    name: '',
    categoryId: categories[0]?.id || 'cat-komputer',
    description: '',
    acquisitionDate: new Date().toISOString().slice(0, 10),
    inServiceDate: new Date().toISOString().slice(0, 10),
    location: 'Kantor Pusat - Jakarta',
    department: 'IT & Infrastructure',
    custodian: '',
    serialNumber: '',
    condition: 'Baik',
    vendorId: '',
    purchaseInvoiceNo: '',
    purchaseRequestId: '',
    
    // Cost Components
    purchasePrice: 0,
    deliveryCost: 0,
    installationCost: 0,
    otherCapitalizedCost: 0,
    discountAmount: 0,
    nonCreditableVat: 0,
    
    // Commercial Parameters
    depreciationMethod: 'Garis Lurus',
    usefulLifeYears: 4,
    salvageValue: 0,
    totalEstimatedUnits: 0,
    
    // Tax Parameters
    taxGroup: 'Kelompok 1',
    taxDepreciationMethod: 'Garis Lurus'
  });

  // Calculate live acquisition cost in form
  const liveAcquisitionCost = useMemo(() => {
    return calculateAcquisitionCost({
      purchasePrice: assetFormData.purchasePrice,
      deliveryCost: assetFormData.deliveryCost,
      installationCost: assetFormData.installationCost,
      otherCost: assetFormData.otherCapitalizedCost,
      discount: assetFormData.discountAmount,
      nonCreditableVat: assetFormData.nonCreditableVat
    });
  }, [assetFormData]);

  // KPI Metrics for Dashboard
  const kpi = useMemo(() => {
    let totalCost = 0;
    let totalAccum = 0;
    let totalBV = 0;
    let currentMonthDep = 0;
    let activeCount = 0;
    let fullyDepreciatedCount = 0;
    let inAcquisitionCount = 0;
    let disposedCount = 0;

    assets.forEach(a => {
      const cost = Number(a.acquisitionCost || 0);
      const accum = Number(a.accumulatedDepreciation || 0);
      const bv = Number(a.bookValue !== undefined ? a.bookValue : Math.max(0, cost - accum));
      const monthly = Number(a.monthlyDepreciation || 0);

      totalCost += cost;
      totalAccum += accum;
      totalBV += bv;

      if (a.status === 'Active') {
        activeCount++;
        currentMonthDep += monthly;
      } else if (a.status === 'Fully Depreciated') {
        fullyDepreciatedCount++;
      } else if (a.status === 'In Acquisition' || a.status === 'Draft') {
        inAcquisitionCount++;
      } else if (a.status === 'Disposed') {
        disposedCount++;
      }
    });

    return {
      totalCost,
      totalAccum,
      totalBV,
      currentMonthDep,
      activeCount,
      fullyDepreciatedCount,
      inAcquisitionCount,
      disposedCount,
      totalAssetsCount: assets.length
    };
  }, [assets]);

  // Breakdown by Category for Dashboard Charts
  const categoryStats = useMemo(() => {
    const map = {};
    assets.forEach(a => {
      const cat = a.categoryName || 'Lain-lain';
      if (!map[cat]) {
        map[cat] = { name: cat, count: 0, cost: 0, accum: 0, bookValue: 0 };
      }
      map[cat].count++;
      map[cat].cost += Number(a.acquisitionCost || 0);
      map[cat].accum += Number(a.accumulatedDepreciation || 0);
      map[cat].bookValue += Number(a.bookValue || 0);
    });
    return Object.values(map);
  }, [assets]);

  // Filtered Assets List
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchSearch = 
        (a.assetNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.custodian || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.location || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = categoryFilter === 'All' || a.categoryId === categoryFilter || a.categoryName === categoryFilter;
      const matchStatus = statusFilter === 'All' || a.status === statusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [assets, searchTerm, categoryFilter, statusFilter]);

  // Submenu Tabs Configuration
  const SUB_TABS = [
    { id: 'dashboard', label: '1. Dashboard Aset', icon: PieChart },
    { id: 'list', label: '2. Daftar Aset', icon: Building2, badge: assets.length },
    { id: 'categories', label: '3. Kategori Aset', icon: Layers, badge: categories.length },
    { id: 'acquisition', label: '4. Perolehan Aset', icon: Plus },
    { id: 'commercial', label: '5. Penyusutan Komersial', icon: Calculator },
    { id: 'fiscal', label: '6. Penyusutan Fiskal', icon: FileCheck2 },
    { id: 'movements', label: '7. Mutasi Aset', icon: ArrowRightLeft, badge: movements.length },
    { id: 'disposals', label: '8. Pelepasan / Penjualan', icon: Trash2, badge: disposals.length },
    { id: 'journals', label: '9. Jurnal Aset', icon: BookOpen, badge: journalEntries.filter(j => j.sourceModule === 'Aset Tetap').length },
    { id: 'reports', label: '10. Laporan Aset', icon: FileText },
    { id: 'settings', label: '11. Pengaturan Aset', icon: Settings }
  ];

  // Open Create Asset Form
  const handleOpenAddAsset = (prSource = null) => {
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = assets.length + 1;
    const autoNumber = `AST-${yearMonth}-${String(count).padStart(4, '0')}`;
    const defaultCat = categories[0] || {};

    let initialPrice = 0;
    let initialName = '';
    let initialVendor = '';
    let initialPRId = '';

    if (prSource) {
      initialPrice = Number(prSource.dpp || prSource.totalPayable || 0);
      initialName = prSource.title || '';
      initialVendor = prSource.vendorId || '';
      initialPRId = prSource.id;
    }

    setEditingAsset(null);
    setAssetFormData({
      assetNumber: autoNumber,
      name: initialName,
      categoryId: defaultCat.id || 'cat-komputer',
      description: prSource?.description || '',
      acquisitionDate: new Date().toISOString().slice(0, 10),
      inServiceDate: new Date().toISOString().slice(0, 10),
      location: 'Kantor Pusat - Jakarta',
      department: prSource?.department || 'IT & Infrastructure',
      custodian: prSource?.requesterName || currentUser?.fullName || '',
      serialNumber: '',
      condition: 'Baik',
      vendorId: initialVendor,
      purchaseInvoiceNo: prSource?.requestNumber || '',
      purchaseRequestId: initialPRId,
      purchasePrice: initialPrice,
      deliveryCost: 0,
      installationCost: 0,
      otherCapitalizedCost: 0,
      discountAmount: 0,
      nonCreditableVat: 0,
      depreciationMethod: defaultCat.defaultDeprecMethod || 'Garis Lurus',
      usefulLifeYears: defaultCat.defaultUsefulLifeYears || 4,
      salvageValue: 0,
      totalEstimatedUnits: 0,
      taxGroup: defaultCat.taxGroup || 'Kelompok 1',
      taxDepreciationMethod: 'Garis Lurus'
    });
    setIsAssetModalOpen(true);
  };

  // Open Edit Asset
  const handleOpenEditAsset = (asset) => {
    setEditingAsset(asset);
    setAssetFormData({
      assetNumber: asset.assetNumber,
      name: asset.name,
      categoryId: asset.categoryId || categories[0]?.id,
      description: asset.description || '',
      acquisitionDate: asset.acquisitionDate,
      inServiceDate: asset.inServiceDate || asset.acquisitionDate,
      location: asset.location || 'Kantor Pusat',
      department: asset.department || 'Operasional',
      custodian: asset.custodian || '',
      serialNumber: asset.serialNumber || '',
      condition: asset.condition || 'Baik',
      vendorId: asset.vendorId || '',
      purchaseInvoiceNo: asset.purchaseInvoiceNo || '',
      purchaseRequestId: asset.purchaseRequestId || '',
      purchasePrice: asset.purchasePrice || asset.acquisitionCost,
      deliveryCost: asset.deliveryCost || 0,
      installationCost: asset.installationCost || 0,
      otherCapitalizedCost: asset.otherCapitalizedCost || 0,
      discountAmount: asset.discountAmount || 0,
      nonCreditableVat: asset.nonCreditableVat || 0,
      depreciationMethod: asset.depreciationMethod || 'Garis Lurus',
      usefulLifeYears: asset.usefulLifeYears || 4,
      salvageValue: asset.salvageValue || 0,
      totalEstimatedUnits: asset.totalEstimatedUnits || 0,
      taxGroup: asset.taxGroup || 'Kelompok 1',
      taxDepreciationMethod: asset.taxDepreciationMethod || 'Garis Lurus'
    });
    setIsAssetModalOpen(true);
  };

  // Handle Save Asset Form
  const handleSaveAsset = async (e) => {
    e.preventDefault();
    if (!assetFormData.name.trim()) {
      alert('Nama Aset Tetap wajib diisi!');
      return;
    }

    const selectedCat = categories.find(c => c.id === assetFormData.categoryId) || categories[0];
    const vendor = vendorList.find(v => v.id === assetFormData.vendorId);

    const cost = calculateAcquisitionCost({
      purchasePrice: assetFormData.purchasePrice,
      deliveryCost: assetFormData.deliveryCost,
      installationCost: assetFormData.installationCost,
      otherCost: assetFormData.otherCapitalizedCost,
      discount: assetFormData.discountAmount,
      nonCreditableVat: assetFormData.nonCreditableVat
    });

    const payload = {
      ...assetFormData,
      id: editingAsset ? editingAsset.id : `ast-${Date.now()}`,
      categoryName: selectedCat?.name || 'Komputer & IT',
      vendorName: vendor ? vendor.name : '',
      acquisitionCost: cost,
      salvageValue: Number(assetFormData.salvageValue || 0),
      usefulLifeYears: Number(assetFormData.usefulLifeYears || 4),
      accumulatedDepreciation: editingAsset ? editingAsset.accumulatedDepreciation : 0,
      status: editingAsset ? editingAsset.status : 'Active'
    };

    try {
      await saveFixedAsset(payload);
      showToast?.(`Aset tetap ${payload.assetNumber} berhasil disimpan!`, 'success');
      setIsAssetModalOpen(false);
      onRefresh?.();
    } catch (err) {
      console.error('Error saving asset:', err);
      showToast?.('Gagal menyimpan aset: ' + (err.message || 'Error'), 'error');
    }
  };

  // Handle Delete Asset
  const handleDeleteAsset = async (asset) => {
    if (window.confirm(`Hapus aset tetap ${asset.assetNumber} (${asset.name})? Seluruh riwayat transaksi akan dihapus.`)) {
      try {
        await deleteFixedAsset(asset.id);
        showToast?.(`Aset ${asset.assetNumber} berhasil dihapus.`, 'success');
        onRefresh?.();
      } catch (err) {
        showToast?.('Gagal menghapus aset: ' + err.message, 'error');
      }
    }
  };

  // Handle Preview Monthly Depreciation
  const handleLoadDepreciationPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const p = await previewMonthlyDepreciation({
        periodYear: Number(postingPeriod.year),
        periodMonth: Number(postingPeriod.month)
      });
      setDepreciationPreview(p);
    } catch (err) {
      console.error('Error previewing depreciation:', err);
      showToast?.('Gagal membuat preview: ' + err.message, 'error');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Handle Execute Monthly Depreciation Posting
  const handleExecutePosting = async () => {
    if (!window.confirm(`Posting jurnal penyusutan periode ${postingPeriod.year}-${String(postingPeriod.month).padStart(2, '0')} sebesar ${formatRupiah(depreciationPreview?.totalDepreciationAmount || 0)}? Jurnal akan otomatis masuk ke Buku Besar ERP.`)) {
      return;
    }

    setIsPostingDepreciation(true);
    try {
      const result = await executeMonthlyDepreciationPosting({
        periodYear: Number(postingPeriod.year),
        periodMonth: Number(postingPeriod.month),
        currentUser,
        notes: `Penyusutan komersial bulanan periode ${postingPeriod.year}-${postingPeriod.month}`
      });

      showToast?.(`Posting berhasil! Jurnal ${result.journalEntry.entryNumber} telah diposting untuk ${result.processedCount} aset.`, 'success');
      setDepreciationPreview(null);
      onRefresh?.();
    } catch (err) {
      console.error('Error posting depreciation:', err);
      showToast?.('Gagal posting jurnal: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsPostingDepreciation(false);
    }
  };

  // Handle Open Movement Modal
  const handleOpenMovementModal = (asset) => {
    setMovementTargetAsset(asset);
    setMovementForm({
      movementType: 'Relocation',
      newLocation: asset.location || '',
      newDepartment: asset.department || '',
      newCustodian: asset.custodian || '',
      newCondition: asset.condition || 'Baik',
      reason: ''
    });
  };

  // Handle Confirm Movement
  const handleConfirmMovement = async (e) => {
    e.preventDefault();
    if (!movementTargetAsset || isSubmittingMovement) return;
    if (!movementForm.reason.trim()) {
      alert('Alasan mutasi wajib diisi untuk audit trail!');
      return;
    }

    setIsSubmittingMovement(true);
    try {
      await recordAssetMovement({
        asset: movementTargetAsset,
        movementType: movementForm.movementType,
        newLocation: movementForm.newLocation,
        newDepartment: movementForm.newDepartment,
        newCustodian: movementForm.newCustodian,
        newCondition: movementForm.newCondition,
        reason: movementForm.reason,
        currentUser
      });

      showToast?.(`Mutasi aset ${movementTargetAsset.assetNumber} berhasil dicatat!`, 'success');
      setMovementTargetAsset(null);
      onRefresh?.();
    } catch (err) {
      showToast?.('Gagal mencatat mutasi: ' + err.message, 'error');
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  // Handle Open Disposal Modal
  const handleOpenDisposalModal = (asset) => {
    setDisposalTargetAsset(asset);
    setDisposalForm({
      disposalDate: new Date().toISOString().slice(0, 10),
      disposalType: 'Sold',
      sellingPrice: 0,
      disposalExpenses: 0,
      paymentAccountCode: '1102',
      buyerInfo: '',
      notes: ''
    });
  };

  // Handle Confirm Disposal
  const handleConfirmDisposal = async (e) => {
    e.preventDefault();
    if (!disposalTargetAsset || isSubmittingDisposal) return;

    const net = Number(disposalForm.sellingPrice || 0) - Number(disposalForm.disposalExpenses || 0);
    const book = Math.max(0, (Number(disposalTargetAsset.acquisitionCost) || 0) - (Number(disposalTargetAsset.accumulatedDepreciation) || 0));
    const gainLoss = net - book;
    const gainLossLabel = gainLoss >= 0 ? `Laba Rp ${formatRupiah(gainLoss)}` : `Rugi Rp ${formatRupiah(Math.abs(gainLoss))}`;

    if (!window.confirm(`Konfirmasi Pelepasan Aset ${disposalTargetAsset.assetNumber}? \n\nNilai Buku: ${formatRupiah(book)}\nHasil Bersih: ${formatRupiah(net)}\nPerhitungan: ${gainLossLabel}\n\nAset akan berstatus Dilepas dan jurnal otomatis dibuat.`)) {
      return;
    }

    setIsSubmittingDisposal(true);
    try {
      const res = await executeAssetDisposal({
        asset: disposalTargetAsset,
        disposalDate: disposalForm.disposalDate,
        disposalType: disposalForm.disposalType,
        sellingPrice: Number(disposalForm.sellingPrice || 0),
        disposalExpenses: Number(disposalForm.disposalExpenses || 0),
        paymentAccountCode: disposalForm.paymentAccountCode,
        buyerInfo: disposalForm.buyerInfo,
        notes: disposalForm.notes,
        currentUser
      });

      showToast?.(`Pelepasan aset ${disposalTargetAsset.assetNumber} berhasil diposting dengan jurnal ${res.journalEntry.entryNumber}!`, 'success');
      setDisposalTargetAsset(null);
      onRefresh?.();
    } catch (err) {
      showToast?.('Gagal memproses pelepasan: ' + err.message, 'error');
    } finally {
      setIsSubmittingDisposal(false);
    }
  };

  // Export CSV Helper
  const handleExportAssetsCSV = () => {
    const headers = ['No. Aset,Nama Aset,Kategori,Tgl Perolehan,Lokasi,Departemen,PIC,Harga Perolehan,Akumulasi Penyusutan,Nilai Buku,Status'];
    const rows = filteredAssets.map(a =>
      `"${a.assetNumber}","${a.name}","${a.categoryName}","${a.acquisitionDate}","${a.location}","${a.department}","${a.custodian}","${a.acquisitionCost}","${a.accumulatedDepreciation}","${a.bookValue}","${a.status}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Laporan_Aset_Tetap_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">Modul Aset Tetap (Fixed Asset Management)</h2>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                ERP Core
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Siklus penuh aset, penyusutan ganda komersial & fiskal UU PPh, otomatisasi jurnal, mutasi, pelepasan, dan kartu aset
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportAssetsCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={() => handleOpenAddAsset()}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Perolehan Aset</span>
          </button>
        </div>
      </div>

      {/* 11 Submenu Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {SUB_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. DASHBOARD ASET TETAP                                             */}
      {/* =================================================================== */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top 4 Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Harga Perolehan
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 font-mono">
                {formatRupiah(kpi.totalCost)}
              </h3>
              <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{kpi.totalAssetsCount} Total Aset Terdaftar</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Akumulasi Penyusutan
              </span>
              <h3 className="text-xl font-extrabold text-purple-700 font-mono">
                {formatRupiah(kpi.totalAccum)}
              </h3>
              <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-purple-500" />
                <span>{kpi.totalCost > 0 ? ((kpi.totalAccum / kpi.totalCost) * 100).toFixed(1) : 0}% Terdepresiasi</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Nilai Buku (Net Book Value)
              </span>
              <h3 className="text-xl font-extrabold text-emerald-700 font-mono">
                {formatRupiah(kpi.totalBV)}
              </h3>
              <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Komersial (Neraca Keuangan)</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Penyusutan Bulan Berjalan
              </span>
              <h3 className="text-xl font-extrabold text-amber-700 font-mono">
                {formatRupiah(kpi.currentMonthDep)}
              </h3>
              <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{kpi.activeCount} Aset Aktif Menyusut</span>
              </div>
            </div>
          </div>

          {/* Breakdown Status Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-xs">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div>
                <span className="text-slate-500 text-[10px] block">Aset Aktif</span>
                <strong className="text-emerald-900 text-sm">{kpi.activeCount} Aset</strong>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div>
                <span className="text-slate-500 text-[10px] block">Habis Masa Manfaat</span>
                <strong className="text-amber-900 text-sm">{kpi.fullyDepreciatedCount} Aset</strong>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-50 border border-blue-100">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <span className="text-slate-500 text-[10px] block">Dalam Perolehan</span>
                <strong className="text-blue-900 text-sm">{kpi.inAcquisitionCount} Aset</strong>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-100 border border-slate-200">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <div>
                <span className="text-slate-500 text-[10px] block">Dilepas / Dijual</span>
                <strong className="text-slate-800 text-sm">{kpi.disposedCount} Aset</strong>
              </div>
            </div>
          </div>

          {/* Charts & Categorical Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Nilai Aset per Kategori */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800">Distribusi Nilai Aset per Kategori</h3>
                </div>
                <span className="text-xs text-slate-400">{categoryStats.length} Kategori</span>
              </div>

              {categoryStats.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada data aset tercatat.
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryStats.map(cat => {
                    const pct = kpi.totalCost > 0 ? (cat.cost / kpi.totalCost) * 100 : 0;
                    return (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{cat.name} ({cat.count})</span>
                          <span className="font-mono font-bold text-slate-900">{formatRupiah(cat.cost)} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Akum. Susut: {formatRupiah(cat.accum)}</span>
                          <span className="font-semibold text-emerald-700">Nilai Buku: {formatRupiah(cat.bookValue)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Aksi Cepat & Jadwal Bulan Ini */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800">Otomatisasi Jurnal Penyusutan Periode Ini</h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {new Date().getFullYear()}-{String(new Date().getMonth() + 1).padStart(2, '0')}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Estimasi Beban Penyusutan Bulan Ini:</span>
                  <strong className="text-base font-extrabold text-slate-900 font-mono">
                    {formatRupiah(kpi.currentMonthDep)}
                  </strong>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Penyusutan komersial dihitung secara otomatis menggunakan metode Garis Lurus / Saldo Menurun dan langsung terintegrasi dengan jurnal debit/kredit COA ERP.
                </p>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => setActiveSubTab('commercial')}
                    className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Generate & Posting Jurnal</span>
                  </button>
                  <button
                    onClick={() => setActiveSubTab('fiscal')}
                    className="flex-1 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Rekonsiliasi Fiskal UU PPh</span>
                  </button>
                </div>
              </div>

              {/* Perolehan Terhubung dari Pembelian PR */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">Tarik Pengadaan dari Modul Pembelian:</span>
                  <span className="text-[10px] text-slate-400">Status Disetujui / Lunas</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {purchaseRequests.filter(p => p.status === 'Disetujui' || p.status === 'Lunas').slice(0, 3).map(pr => (
                    <div key={pr.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{pr.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{pr.requestNumber} • {pr.vendorName}</div>
                      </div>
                      <button
                        onClick={() => handleOpenAddAsset(pr)}
                        className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition cursor-pointer"
                      >
                        Jadikan Aset Tetap
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. DAFTAR ASET TETAP (TABLE VIEW)                                   */}
      {/* =================================================================== */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari no. aset, nama, PIC, lokasi..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none font-semibold text-slate-700"
              >
                <option value="All">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none font-semibold text-slate-700"
              >
                <option value="All">Semua Status</option>
                <option value="Active">Aktif</option>
                <option value="Fully Depreciated">Habis Masa Manfaat</option>
                <option value="Disposed">Dilepas / Dijual</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Menampilkan <strong>{filteredAssets.length}</strong> dari <strong>{assets.length}</strong> aset
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">No. Aset</th>
                    <th className="py-3 px-4">Nama Aset & Kategori</th>
                    <th className="py-3 px-4">Tgl Perolehan</th>
                    <th className="py-3 px-4">Lokasi & PIC</th>
                    <th className="py-3 px-4 text-right">Harga Perolehan</th>
                    <th className="py-3 px-4 text-right">Akum. Susut</th>
                    <th className="py-3 px-4 text-right">Nilai Buku (BV)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi Siklus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Tidak ada aset yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map(a => {
                      const statusStyles = {
                        Active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                        'Fully Depreciated': 'bg-amber-100 text-amber-800 border-amber-200',
                        Disposed: 'bg-slate-100 text-slate-700 border-slate-300'
                      };

                      return (
                        <tr key={a.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {a.assetNumber}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{a.name}</div>
                            <div className="text-[10px] text-slate-500">{a.categoryName} • {a.depreciationMethod}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {formatDateIndo(a.acquisitionDate)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-700">{a.location}</div>
                            <div className="text-[10px] text-slate-400">PIC: {a.custodian || '-'} ({a.department})</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(a.acquisitionCost)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-purple-700">
                            {formatRupiah(a.accumulatedDepreciation)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700">
                            {formatRupiah(a.bookValue)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyles[a.status] || 'bg-slate-100 text-slate-700'}`}>
                              {a.status === 'Active' ? 'Aktif' : (a.status === 'Fully Depreciated' ? 'Habis Manfaat' : 'Dilepas')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Kartu Aset */}
                              <button
                                onClick={() => setViewingAssetCard(a)}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                title="Lihat Kartu Aset Individual"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              {/* Mutasi */}
                              {a.status === 'Active' && (
                                <button
                                  onClick={() => handleOpenMovementModal(a)}
                                  className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                                  title="Mutasi Lokasi / PIC / Kondisi"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Pelepasan */}
                              {a.status !== 'Disposed' && (
                                <button
                                  onClick={() => handleOpenDisposalModal(a)}
                                  className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                  title="Pelepasan / Penjualan Aset"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Edit */}
                              <button
                                onClick={() => handleOpenEditAsset(a)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Edit Aset"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. MASTER KATEGORI ASET                                             */}
      {/* =================================================================== */}
      {activeSubTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-800">Master Kategori Aset Tetap</h3>
              <p className="text-xs text-slate-500">Konfigurasi pemetaan akun COA (Aset, Akumulasi, Beban) dan parameter fiskal per kelompok</p>
            </div>
            <button
              onClick={() => {
                const code = prompt('Masukkan Kode Kategori Baru (misal: INFR):');
                const name = prompt('Masukkan Nama Kategori Baru:');
                if (code && name) {
                  saveAssetCategory({
                    code: code.toUpperCase(),
                    name,
                    assetAccountCode: '1205',
                    accumDeprecAccountCode: '1281',
                    deprecExpenseAccountCode: '6201',
                    defaultDeprecMethod: 'Garis Lurus',
                    defaultUsefulLifeYears: 4,
                    taxGroup: 'Kelompok 1'
                  }).then(() => {
                    showToast?.('Kategori berhasil ditambahkan!', 'success');
                    onRefresh?.();
                  });
                }
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kategori</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Kode</th>
                  <th className="py-2.5 px-3">Nama Kategori</th>
                  <th className="py-2.5 px-3">Akun Aset (COA)</th>
                  <th className="py-2.5 px-3">Akun Akum. Susut</th>
                  <th className="py-2.5 px-3">Akun Beban Susut</th>
                  <th className="py-2.5 px-3">Masa Manfaat</th>
                  <th className="py-2.5 px-3">Grup Fiskal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{c.code}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{c.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{c.assetAccountCode}</td>
                    <td className="py-3 px-3 font-mono text-purple-700">{c.accumDeprecAccountCode}</td>
                    <td className="py-3 px-3 font-mono text-amber-700">{c.deprecExpenseAccountCode}</td>
                    <td className="py-3 px-3">{c.defaultUsefulLifeYears} Tahun ({c.defaultDeprecMethod})</td>
                    <td className="py-3 px-3">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                        {c.taxGroup}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. PENYUSUTAN KOMERSIAL & POSTING BULANAN                           */}
      {/* =================================================================== */}
      {activeSubTab === 'commercial' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-800">Eksekusi & Posting Jurnal Penyusutan Bulanan</h3>
                <p className="text-xs text-slate-500">Hitung beban penyusutan seluruh aset aktif bulan berjalan dan posting jurnal otomatis ke Buku Besar</p>
              </div>

              {/* Selector Periode */}
              <div className="flex items-center gap-2">
                <select
                  value={postingPeriod.month}
                  onChange={e => setPostingPeriod({ ...postingPeriod, month: Number(e.target.value) })}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>Bulan {i + 1}</option>
                  ))}
                </select>
                <select
                  value={postingPeriod.year}
                  onChange={e => setPostingPeriod({ ...postingPeriod, year: Number(e.target.value) })}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-bold"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
                <button
                  onClick={handleLoadDepreciationPreview}
                  disabled={isLoadingPreview}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Preview Periode</span>
                </button>
              </div>
            </div>

            {/* Preview Box */}
            {depreciationPreview && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700">Preview Periode: {depreciationPreview.periodLabel}</span>
                    <p className="text-[11px] text-slate-500">{depreciationPreview.assetsToDepreciate} dari {depreciationPreview.totalAssets} aset memenuhi syarat</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Total Beban Penyusutan:</span>
                    <strong className="text-lg font-extrabold text-emerald-700 font-mono">
                      {formatRupiah(depreciationPreview.totalDepreciationAmount)}
                    </strong>
                  </div>
                </div>

                {depreciationPreview.alreadyPosted ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-800 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Periode {depreciationPreview.periodLabel} telah diposting sebelumnya. Sistem mencegah duplikasi jurnal penyusutan.</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-end pt-2">
                    <button
                      onClick={handleExecutePosting}
                      disabled={isPostingDepreciation}
                      className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isPostingDepreciation ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Memposting ke Buku Besar...</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-4 h-4" />
                          <span>Posting Jurnal Penyusutan Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Table Details */}
                <div className="border-t border-slate-200 pt-2 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 text-[10px] uppercase font-bold">
                        <th className="py-1 px-2">No. Aset</th>
                        <th className="py-1 px-2">Nama Aset</th>
                        <th className="py-1 px-2">Akun Beban / Akum.</th>
                        <th className="py-1 px-2 text-right">Nilai Buku Lama</th>
                        <th className="py-1 px-2 text-right">Penyusutan</th>
                        <th className="py-1 px-2 text-right">Nilai Buku Baru</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {depreciationPreview.details.map(d => (
                        <tr key={d.assetId} className="hover:bg-white/80">
                          <td className="py-1.5 px-2 font-mono font-bold text-slate-800">{d.assetNumber}</td>
                          <td className="py-1.5 px-2 text-slate-700">{d.assetName}</td>
                          <td className="py-1.5 px-2 font-mono text-[10px] text-slate-500">{d.deprecExpenseAccountCode} / {d.accumDeprecAccountCode}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-600">{formatRupiah(d.currentBookValue)}</td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-700">{formatRupiah(d.depreciationAmount)}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-800">{formatRupiah(d.newBookValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. PENYUSUTAN FISKAL & REKONSILIASI UU PPH                          */}
      {/* =================================================================== */}
      {activeSubTab === 'fiscal' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800">Ketentuan Penyusutan Fiskal (UU PPh Indonesia)</h3>
              <p className="text-xs text-slate-500">
                Penyusutan fiskal dihitung secara mandiri untuk keperluan lampiran SPT Tahunan PPh Badan dan rekonsiliasi beda waktu (koreksi fiskal)
              </p>
            </div>

            {/* Reference Table of UU PPh Groups */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(TAX_ASSET_GROUPS).map(([key, grp]) => (
                <div key={key} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{key}</span>
                    <span className="text-emerald-700 font-mono">{grp.usefulLifeYears} Tahun</span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex justify-between">
                    <span>Garis Lurus: <strong>{grp.straightLineRate}%</strong></span>
                    {grp.decliningBalanceRate > 0 && <span>Saldo Menurun: <strong>{grp.decliningBalanceRate}%</strong></span>}
                  </div>
                  <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200">{grp.description}</p>
                </div>
              ))}
            </div>

            {/* Comparison Table for All Assets */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Tabel Perbandingan Penyusutan Komersial vs Fiskal Aset Tetap
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">No. Aset & Nama</th>
                      <th className="py-2.5 px-3">Harga Perolehan</th>
                      <th className="py-2.5 px-3">Metode Komersial</th>
                      <th className="py-2.5 px-3">Kelompok Fiskal</th>
                      <th className="py-2.5 px-3 text-right">Susut Komersial / Thn</th>
                      <th className="py-2.5 px-3 text-right">Susut Fiskal / Thn</th>
                      <th className="py-2.5 px-3 text-right">Selisih (Koreksi)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assets.map(a => {
                      const commAnnual = (Number(a.monthlyDepreciation) || 0) * 12;
                      const taxAnnual = (Number(a.taxMonthlyDepreciation) || 0) * 12;
                      const diff = commAnnual - taxAnnual;

                      return (
                        <tr key={a.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-slate-900">{a.assetNumber}</div>
                            <div className="text-[11px] text-slate-600">{a.name}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{formatRupiah(a.acquisitionCost)}</td>
                          <td className="py-2.5 px-3 text-slate-600">{a.depreciationMethod} ({a.usefulLifeYears} th)</td>
                          <td className="py-2.5 px-3 font-semibold text-blue-700">{a.taxGroup}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">{formatRupiah(commAnnual)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{formatRupiah(taxAnnual)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {diff === 0 ? (
                              <span className="text-slate-400">Nihil</span>
                            ) : diff > 0 ? (
                              <span className="text-amber-700">+{formatRupiah(diff)} (Positif)</span>
                            ) : (
                              <span className="text-sky-700">{formatRupiah(diff)} (Negatif)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 9. JURNAL ASET TETAP                                                */}
      {/* =================================================================== */}
      {activeSubTab === 'journals' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-800">Riwayat Jurnal Aset Tetap Terintegrasi</h3>
            <p className="text-xs text-slate-500">Seluruh jurnal penyusutan bulanan, kapitalisasi perolehan, dan pelepasan aset yang diposting ke Buku Besar</p>
          </div>

          <div className="space-y-3">
            {journalEntries.filter(j => j.sourceModule === 'Aset Tetap').length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada jurnal aset yang diposting. Lakukan posting penyusutan atau pelepasan aset terlebih dahulu.
              </div>
            ) : (
              journalEntries.filter(j => j.sourceModule === 'Aset Tetap').map(j => (
                <div key={j.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{j.entryNumber}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {j.status}
                      </span>
                    </div>
                    <span className="text-slate-500 font-mono">{formatDateIndo(j.entryDate)}</span>
                  </div>
                  <p className="font-semibold text-slate-700">{j.description}</p>
                  
                  {/* Lines */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                          <th className="py-1">Akun</th>
                          <th className="py-1">Keterangan</th>
                          <th className="py-1 text-right">Debit</th>
                          <th className="py-1 text-right">Kredit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-mono">
                        {(j.lines || []).map((l, idx) => (
                          <tr key={idx}>
                            <td className="py-1 font-bold text-slate-800">{l.accountCode} - {l.accountName}</td>
                            <td className="py-1 text-slate-500">{l.memo || '-'}</td>
                            <td className="py-1 text-right text-emerald-700">{l.debit > 0 ? formatRupiah(l.debit) : '-'}</td>
                            <td className="py-1 text-right text-purple-700">{l.credit > 0 ? formatRupiah(l.credit) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. PEROLEHAN ASET / MODAL INPUT ASET BARU                           */}
      {/* =================================================================== */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                {editingAsset ? `Edit Aset: ${editingAsset.assetNumber}` : 'Form Perolehan & Kapitalisasi Aset Tetap'}
              </h3>
              <button onClick={() => setIsAssetModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto text-xs">
              {/* Row 1: Identitas Aset */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-700 uppercase tracking-wider block">1. Identitas Aset</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">No. Aset (Otomatis)</label>
                    <input
                      type="text"
                      disabled
                      value={assetFormData.assetNumber}
                      className="w-full px-3 py-1.5 bg-slate-200 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-bold mb-1">Nama Aset Tetap *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Laptop Dell Latitude 5420 Core i7"
                      value={assetFormData.name}
                      onChange={e => setAssetFormData({ ...assetFormData, name: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Kategori Aset *</label>
                    <select
                      value={assetFormData.categoryId}
                      onChange={e => {
                        const cat = categories.find(c => c.id === e.target.value);
                        setAssetFormData({
                          ...assetFormData,
                          categoryId: e.target.value,
                          depreciationMethod: cat?.defaultDeprecMethod || 'Garis Lurus',
                          usefulLifeYears: cat?.defaultUsefulLifeYears || 4,
                          taxGroup: cat?.taxGroup || 'Kelompok 1'
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Tgl Perolehan</label>
                    <input
                      type="date"
                      value={assetFormData.acquisitionDate}
                      onChange={e => setAssetFormData({ ...assetFormData, acquisitionDate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Tgl Mulai Digunakan</label>
                    <input
                      type="date"
                      value={assetFormData.inServiceDate}
                      onChange={e => setAssetFormData({ ...assetFormData, inServiceDate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Lokasi Aset</label>
                    <input
                      type="text"
                      placeholder="Gedung Cyber One Lt. 14"
                      value={assetFormData.location}
                      onChange={e => setAssetFormData({ ...assetFormData, location: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Departemen Pengguna</label>
                    <input
                      type="text"
                      placeholder="IT & Infrastructure"
                      value={assetFormData.department}
                      onChange={e => setAssetFormData({ ...assetFormData, department: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Penanggung Jawab (PIC)</label>
                    <input
                      type="text"
                      placeholder="Nama Pegawai"
                      value={assetFormData.custodian}
                      onChange={e => setAssetFormData({ ...assetFormData, custodian: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Perhitungan Harga Perolehan (Kapitalisasi) */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 uppercase tracking-wider block">
                    2. Komponen Kapitalisasi Harga Perolehan (SAK)
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Total Nilai Kapitalisasi:</span>
                    <strong className="text-base font-extrabold text-emerald-800 font-mono">
                      {formatRupiah(liveAcquisitionCost)}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Harga Pembelian (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={assetFormData.purchasePrice}
                      onChange={e => setAssetFormData({ ...assetFormData, purchasePrice: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">(+) Biaya Pengiriman (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={assetFormData.deliveryCost}
                      onChange={e => setAssetFormData({ ...assetFormData, deliveryCost: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">(+) Biaya Instalasi / Uji (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={assetFormData.installationCost}
                      onChange={e => setAssetFormData({ ...assetFormData, installationCost: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">(-) Diskon Pembelian (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={assetFormData.discountAmount}
                      onChange={e => setAssetFormData({ ...assetFormData, discountAmount: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-rose-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">(+) PPN Tidak Dapat Dikreditkan</label>
                    <input
                      type="number"
                      min="0"
                      value={assetFormData.nonCreditableVat}
                      onChange={e => setAssetFormData({ ...assetFormData, nonCreditableVat: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Parameter Penyusutan Komersial & Fiskal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Komersial */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="font-bold text-slate-800 uppercase tracking-wider block">
                    3. Parameter Komersial (Akuntansi)
                  </span>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Metode Penyusutan</label>
                    <select
                      value={assetFormData.depreciationMethod}
                      onChange={e => setAssetFormData({ ...assetFormData, depreciationMethod: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    >
                      <option value="Garis Lurus">Garis Lurus (Straight Line)</option>
                      <option value="Saldo Menurun">Saldo Menurun (Declining Balance)</option>
                      <option value="Unit Produksi">Unit Produksi (Units of Production)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Masa Manfaat (Thn)</label>
                      <input
                        type="number"
                        min="1"
                        value={assetFormData.usefulLifeYears}
                        onChange={e => setAssetFormData({ ...assetFormData, usefulLifeYears: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Nilai Residu (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        value={assetFormData.salvageValue}
                        onChange={e => setAssetFormData({ ...assetFormData, salvageValue: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Fiskal */}
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2.5">
                  <span className="font-bold text-blue-900 uppercase tracking-wider block">
                    4. Parameter Fiskal (UU PPh Indonesia)
                  </span>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Kelompok Aset Pajak</label>
                    <select
                      value={assetFormData.taxGroup}
                      onChange={e => setAssetFormData({ ...assetFormData, taxGroup: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    >
                      {Object.keys(TAX_ASSET_GROUPS).map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Metode Fiskal</label>
                    <select
                      value={assetFormData.taxDepreciationMethod}
                      onChange={e => setAssetFormData({ ...assetFormData, taxDepreciationMethod: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                    >
                      <option value="Garis Lurus">Garis Lurus</option>
                      <option value="Saldo Menurun">Saldo Menurun (50% Kel 1 / 25% Kel 2)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Simpan Perolehan Aset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL MUTASI ASET                                                   */}
      {/* =================================================================== */}
      {movementTargetAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 px-5 py-3 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                <span>Form Mutasi Internal Aset: {movementTargetAsset.assetNumber}</span>
              </h3>
              <button onClick={() => setMovementTargetAsset(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleConfirmMovement} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1">
                <div>Aset: <strong className="text-slate-800">{movementTargetAsset.name}</strong></div>
                <div>Lokasi Saat Ini: <strong>{movementTargetAsset.location}</strong> ({movementTargetAsset.department})</div>
                <div>PIC Saat Ini: <strong>{movementTargetAsset.custodian || '-'}</strong></div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Jenis Mutasi</label>
                <select
                  value={movementForm.movementType}
                  onChange={e => setMovementForm({ ...movementForm, movementType: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="Relocation">Pindah Lokasi Fisik</option>
                  <option value="Transfer Department">Pindah Departemen</option>
                  <option value="Change Custodian">Ganti Penanggung Jawab (PIC)</option>
                  <option value="Condition Update">Pembaruan Kondisi Fisik</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lokasi Baru</label>
                  <input
                    type="text"
                    value={movementForm.newLocation}
                    onChange={e => setMovementForm({ ...movementForm, newLocation: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Departemen Baru</label>
                  <input
                    type="text"
                    value={movementForm.newDepartment}
                    onChange={e => setMovementForm({ ...movementForm, newDepartment: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">PIC Baru</label>
                  <input
                    type="text"
                    value={movementForm.newCustodian}
                    onChange={e => setMovementForm({ ...movementForm, newCustodian: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kondisi Fisik</label>
                  <select
                    value={movementForm.newCondition}
                    onChange={e => setMovementForm({ ...movementForm, newCondition: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Baik">Baik</option>
                    <option value="Cukup">Cukup</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Alasan Perubahan (Audit Trail) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pemindahan unit laptop ke staf baru / rotasi kerja..."
                  value={movementForm.reason}
                  onChange={e => setMovementForm({ ...movementForm, reason: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovementTargetAsset(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMovement}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL PELEPASAN / PENJUALAN ASET                                   */}
      {/* =================================================================== */}
      {disposalTargetAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-rose-900 px-5 py-3 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-300" />
                <span>Form Pelepasan / Penjualan Aset: {disposalTargetAsset.assetNumber}</span>
              </h3>
              <button onClick={() => setDisposalTargetAsset(null)} className="text-rose-200 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleConfirmDisposal} className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span>Nama Aset:</span>
                  <strong className="text-slate-900">{disposalTargetAsset.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Harga Perolehan:</span>
                  <span className="font-mono">{formatRupiah(disposalTargetAsset.acquisitionCost)}</span>
                </div>
                <div className="flex justify-between text-purple-700">
                  <span>Akumulasi Penyusutan:</span>
                  <span className="font-mono">-{formatRupiah(disposalTargetAsset.accumulatedDepreciation)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-emerald-800">
                  <span>Nilai Buku Saat Ini:</span>
                  <span className="font-mono">{formatRupiah(Math.max(0, (disposalTargetAsset.acquisitionCost || 0) - (disposalTargetAsset.accumulatedDepreciation || 0)))}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tanggal Pelepasan</label>
                  <input
                    type="date"
                    required
                    value={disposalForm.disposalDate}
                    onChange={e => setDisposalForm({ ...disposalForm, disposalDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Jenis Pelepasan</label>
                  <select
                    value={disposalForm.disposalType}
                    onChange={e => setDisposalForm({ ...disposalForm, disposalType: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Sold">Dijual ke Pihak Luar</option>
                    <option value="Scrapped">Dihapuskan / Rusak Berat</option>
                    <option value="Damaged">Rusak Tidak Dapat Diperbaiki</option>
                    <option value="Lost">Hilang</option>
                  </select>
                </div>
              </div>

              {disposalForm.disposalType === 'Sold' && (
                <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Harga Jual (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        value={disposalForm.sellingPrice}
                        onChange={e => setDisposalForm({ ...disposalForm, sellingPrice: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Biaya Penjualan (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        value={disposalForm.disposalExpenses}
                        onChange={e => setDisposalForm({ ...disposalForm, disposalExpenses: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Rekening Penerimaan</label>
                      <select
                        value={disposalForm.paymentAccountCode}
                        onChange={e => setDisposalForm({ ...disposalForm, paymentAccountCode: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold"
                      >
                        <option value="1102">Bank BCA Operasional (1102)</option>
                        <option value="1101">Kas Kecil (1101)</option>
                        <option value="1103">Bank Mandiri (1103)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Pembeli / Rekanan</label>
                      <input
                        type="text"
                        placeholder="Nama Pembeli..."
                        value={disposalForm.buyerInfo}
                        onChange={e => setDisposalForm({ ...disposalForm, buyerInfo: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Catatan / Alasan Pelepasan</label>
                <input
                  type="text"
                  placeholder="Memo berita acara pelepasan atau lelang aset..."
                  value={disposalForm.notes}
                  onChange={e => setDisposalForm({ ...disposalForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDisposalTargetAsset(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDisposal}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
                >
                  Eksekusi Pelepasan Aset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* KARTU ASET INDIVIDUAL (MODAL PREVIEW)                               */}
      {/* =================================================================== */}
      {viewingAssetCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold">Kartu Aset Tetap Individual</h3>
                  <p className="text-[10px] text-slate-400 font-mono">{viewingAssetCard.assetNumber} • {viewingAssetCard.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Kartu</span>
                </button>
                <button onClick={() => setViewingAssetCard(null)} className="text-slate-400 hover:text-white cursor-pointer">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block">Kategori:</span>
                  <strong className="text-slate-800">{viewingAssetCard.categoryName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Tgl Digunakan:</span>
                  <strong className="text-slate-800">{formatDateIndo(viewingAssetCard.inServiceDate || viewingAssetCard.acquisitionDate)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Lokasi:</span>
                  <strong className="text-slate-800">{viewingAssetCard.location}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">PIC / Pengguna:</span>
                  <strong className="text-slate-800">{viewingAssetCard.custodian || '-'}</strong>
                </div>
              </div>

              {/* Rincian Finansial */}
              <div className="grid grid-cols-3 gap-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">Harga Perolehan (Cost):</span>
                  <strong className="text-base font-extrabold text-slate-900 font-mono">{formatRupiah(viewingAssetCard.acquisitionCost)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Akumulasi Penyusutan:</span>
                  <strong className="text-base font-extrabold text-purple-700 font-mono">{formatRupiah(viewingAssetCard.accumulatedDepreciation)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Nilai Buku (Book Value):</span>
                  <strong className="text-base font-extrabold text-emerald-700 font-mono">{formatRupiah(viewingAssetCard.bookValue)}</strong>
                </div>
              </div>

              {/* Tabel Jadwal Penyusutan Komersial */}
              <div>
                <h4 className="font-bold text-slate-800 mb-1.5">Jadwal Penyusutan Komersial ({viewingAssetCard.depreciationMethod} - {viewingAssetCard.usefulLifeYears} Tahun)</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase sticky top-0">
                      <tr>
                        <th className="py-1.5 px-3">Periode</th>
                        <th className="py-1.5 px-3 text-right">Nilai Buku Awal</th>
                        <th className="py-1.5 px-3 text-right">Beban Susut</th>
                        <th className="py-1.5 px-3 text-right">Akumulasi</th>
                        <th className="py-1.5 px-3 text-right">Nilai Buku Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {calculateCommercialDepreciationSchedule({
                        acquisitionCost: viewingAssetCard.acquisitionCost,
                        salvageValue: viewingAssetCard.salvageValue,
                        usefulLifeYears: viewingAssetCard.usefulLifeYears,
                        method: viewingAssetCard.depreciationMethod,
                        inServiceDate: viewingAssetCard.inServiceDate
                      }).monthlySchedules.slice(0, 24).map(s => (
                        <tr key={s.periodLabel} className="hover:bg-slate-50">
                          <td className="py-1 px-3 text-slate-700 font-semibold">{s.periodLabel}</td>
                          <td className="py-1 px-3 text-right text-slate-600">{formatRupiah(s.openingBookValue)}</td>
                          <td className="py-1 px-3 text-right font-bold text-emerald-700">{formatRupiah(s.depreciationAmount)}</td>
                          <td className="py-1 px-3 text-right text-purple-700">{formatRupiah(s.accumulatedDepreciation)}</td>
                          <td className="py-1 px-3 text-right font-bold text-slate-900">{formatRupiah(s.closingBookValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

