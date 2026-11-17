import React, { useState, useMemo, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Image as ImageIcon, 
  Upload, 
  HelpCircle, 
  X, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  Boxes, 
  Layers, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent, 
  ShoppingBag, 
  ShoppingBagIcon,
  RefreshCw,
  QrCode,
  FileSpreadsheet,
  ChevronDown,
  Info
} from 'lucide-react';
import { formatRupiah } from '../lib/taxRules';
import { saveProduct, deleteProduct } from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import SearchableSelect from '../components/SearchableSelect';

export const COMMON_UNITS = [
  'Pcs', 'Unit', 'Kg', 'Gram', 'Rim', 'Dus', 'Box', 'Paket', 'Set',
  'Meter', 'Liter', 'Bulan', 'Tahun', 'Hari', 'Jam', 'Lot', 'Lembar'
];

export const PRODUCT_CATEGORIES = [
  'Alat Tulis Kantor (ATK)',
  'Perangkat IT & Komputer',
  'Elektronik & Mesin Kantor',
  'Jasa Konsultan & Profesional',
  'Jasa IT & Software',
  'Sewa Gedung & Ruang Kantor',
  'Pemeliharaan & Renovasi',
  'Konsumsi & Catering',
  'Perjalanan Dinas & Transportasi',
  'Peralatan & Aset Tetap',
  'Bahan Baku & Material',
  'Lain-lain / Operasional'
];

const INITIAL_FORM_STATE = {
  id: '',
  code: '',
  barcode: '',
  name: '',
  description: '',
  unit: 'Pcs',
  category: 'Alat Tulis Kantor (ATK)',
  productType: 'Barang',
  imageUrl: '',
  // Harga dan Persediaan
  isPurchased: true,
  purchasePrice: 0,
  purchaseAccountCode: '6105', // Default: Beban Perlengkapan & ATK Kantor
  purchaseTaxType: 11, // Default PPN 11%
  isSold: false,
  sellingPrice: 0,
  salesAccountCode: '4-41100', // Default: Pendapatan Mitra
  salesTaxType: 11,
  discountAccountCode: '4-40201', // Default: Unbilled Revenues / Diskon
  isActive: true
};

export default function ProductModule({ 
  productList = [], 
  coaList = [], 
  onRefresh, 
  showToast 
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('manage_coa') || hasPermission('manage_vendors') || hasPermission('create_purchase');

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, Barang, Jasa
  const [tradeFilter, setTradeFilter] = useState('ALL'); // ALL, BUY, SELL, BOTH
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // table | grid

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [saveActionDropdown, setSaveActionDropdown] = useState(false);

  // Deletion modal
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // File input ref
  const fileInputRef = useRef(null);

  // Filtered COA Options
  const purchaseCoaAccounts = useMemo(() => {
    return coaList.filter(a => a.category === 'Expense' || a.category === 'Asset');
  }, [coaList]);

  const salesCoaAccounts = useMemo(() => {
    return coaList.filter(a => a.category === 'Revenue');
  }, [coaList]);

  const discountCoaAccounts = useMemo(() => {
    return coaList.filter(a => a.category === 'Revenue' || a.category === 'Expense');
  }, [coaList]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return productList.filter(item => {
      const matchSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType = typeFilter === 'ALL' || item.productType === typeFilter;

      const matchCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

      let matchTrade = true;
      if (tradeFilter === 'BUY') matchTrade = item.isPurchased && !item.isSold;
      else if (tradeFilter === 'SELL') matchTrade = item.isSold && !item.isPurchased;
      else if (tradeFilter === 'BOTH') matchTrade = item.isPurchased && item.isSold;

      return matchSearch && matchType && matchCategory && matchTrade;
    });
  }, [productList, searchTerm, typeFilter, tradeFilter, categoryFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = productList.length;
    const goods = productList.filter(p => p.productType === 'Barang').length;
    const services = productList.filter(p => p.productType === 'Jasa').length;
    const purchased = productList.filter(p => p.isPurchased).length;
    const sold = productList.filter(p => p.isSold).length;
    return { total, goods, services, purchased, sold };
  }, [productList]);

  // Open Create Modal
  const handleOpenCreate = () => {
    // Generate code suggestion
    const nextNum = String(productList.length + 1).padStart(3, '0');
    setFormData({
      ...INITIAL_FORM_STATE,
      id: `prod-${Date.now()}`,
      code: `PRD-${nextNum}`
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (product) => {
    setFormData({
      ...product,
      purchasePrice: product.purchasePrice || 0,
      sellingPrice: product.sellingPrice || 0,
      purchaseTaxType: product.purchaseTaxType !== undefined ? product.purchaseTaxType : 11,
      salesTaxType: product.salesTaxType !== undefined ? product.salesTaxType : 11,
      purchaseAccountCode: product.purchaseAccountCode || '6105',
      salesAccountCode: product.salesAccountCode || '4-41100',
      discountAccountCode: product.discountAccountCode || '4-40201'
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Handle Image Upload with 5MB validation
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast?.('Hanya file gambar JPG atau PNG yang diperbolehkan!', 'error');
      return;
    }

    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) {
      showToast?.('Ukuran gambar melebihi batas maksimal 5 MB!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, imageUrl: reader.result }));
      showToast?.('Gambar produk berhasil dimuat', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Save product
  const handleSaveProduct = async (stayOpenAfterSave = false) => {
    if (!formData.name.trim()) {
      showToast?.('Nama Produk wajib diisi!', 'error');
      return;
    }
    if (!formData.code.trim()) {
      showToast?.('Kode Produk / SKU wajib diisi!', 'error');
      return;
    }
    if (!formData.unit.trim()) {
      showToast?.('Satuan Unit wajib dipilih!', 'error');
      return;
    }
    if (!formData.isPurchased && !formData.isSold) {
      showToast?.('Pilih minimal satu opsi: "Saya beli produk ini" atau "Saya jual produk ini"!', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await saveProduct(formData);
      showToast?.(
        isEditing ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil disimpan ke database!',
        'success'
      );
      if (onRefresh) await onRefresh();

      if (stayOpenAfterSave) {
        // Reset to new entry
        const nextNum = String(productList.length + 2).padStart(3, '0');
        setFormData({
          ...INITIAL_FORM_STATE,
          id: `prod-${Date.now()}`,
          code: `PRD-${nextNum}`
        });
        setIsEditing(false);
      } else {
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Error saving product:', err);
      showToast?.('Gagal menyimpan data produk', 'error');
    } finally {
      setIsSaving(false);
      setSaveActionDropdown(false);
    }
  };

  // Delete product
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      showToast?.(`Produk ${productToDelete.name} berhasil dihapus`, 'success');
      if (onRefresh) await onRefresh();
      setProductToDelete(null);
    } catch (err) {
      console.error('Error deleting product:', err);
      showToast?.('Gagal menghapus produk', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-700/60">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Package className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Master Data ERP
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Modul Master Produk & Jasa
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Kelola katalog barang & jasa terintegrasi dengan Akun COA, Ketentuan Pajak PPN (1.1%, 11%), serta otomatisasi pada Modul Pembelian (Purchase Request).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onRefresh && onRefresh()}
            className="p-2.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {canManage && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk / Jasa</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Katalog
            </span>
            <span className="text-xl font-extrabold text-slate-800 font-mono mt-0.5 block">
              {stats.total}
            </span>
            <span className="text-[10px] text-slate-400">Item Terdaftar</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Tipe Barang
            </span>
            <span className="text-xl font-extrabold text-blue-700 font-mono mt-0.5 block">
              {stats.goods}
            </span>
            <span className="text-[10px] text-slate-400">Fisik / Persediaan</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Tipe Jasa
            </span>
            <span className="text-xl font-extrabold text-purple-700 font-mono mt-0.5 block">
              {stats.services}
            </span>
            <span className="text-[10px] text-slate-400">Non-Fisik / Keahlian</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Dapat Dibeli
            </span>
            <span className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5 block">
              {stats.purchased}
            </span>
            <span className="text-[10px] text-slate-400">Pengadaan / PR</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Dapat Dijual
            </span>
            <span className="text-xl font-extrabold text-amber-700 font-mono mt-0.5 block">
              {stats.sold}
            </span>
            <span className="text-[10px] text-slate-400">Penjualan Mitra</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama produk, SKU, barcode, kategori, atau deskripsi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tipe filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
            >
              <option value="ALL">Semua Tipe (Barang & Jasa)</option>
              <option value="Barang">Hanya Barang</option>
              <option value="Jasa">Hanya Jasa</option>
            </select>

            {/* Beli / Jual filter */}
            <select
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
            >
              <option value="ALL">Semua Status Transaksi</option>
              <option value="BUY">Dapat Dibeli Saja</option>
              <option value="SELL">Dapat Dijual Saja</option>
              <option value="BOTH">Dibeli & Dijual Sekaligus</option>
            </select>

            {/* Kategori filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 max-w-[180px]"
            >
              <option value="ALL">Semua Kategori</option>
              {PRODUCT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  viewMode === 'table' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tabel
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Kartu
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl mx-auto flex items-center justify-center mb-3">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">Tidak ada produk ditemukan</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || typeFilter !== 'ALL' || tradeFilter !== 'ALL' || categoryFilter !== 'ALL'
              ? 'Coba sesuaikan kata kunci atau filter pencarian Anda.'
              : 'Belum ada produk yang didaftarkan. Klik tombol "Tambah Produk / Jasa" untuk menambahkan katalog baru.'}
          </p>
          {canManage && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Daftarkan Produk Pertama</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Produk & SKU</th>
                  <th className="py-3 px-4">Tipe & Kategori</th>
                  <th className="py-3 px-4">Satuan</th>
                  <th className="py-3 px-4">Harga Beli (Pengadaan)</th>
                  <th className="py-3 px-4">Harga Jual (Mitra)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product, idx) => {
                  const purchaseAcc = coaList.find(a => a.code === product.purchaseAccountCode);
                  const salesAcc = coaList.find(a => a.code === product.salesAccountCode);

                  return (
                    <tr key={product.id || idx} className="hover:bg-slate-50/70 transition group">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Info Produk */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                              product.productType === 'Jasa' 
                                ? 'bg-purple-50 text-purple-600 border-purple-200' 
                                : 'bg-blue-50 text-blue-600 border-blue-200'
                            }`}>
                              {product.productType === 'Jasa' ? (
                                <Layers className="w-5 h-5" />
                              ) : (
                                <Package className="w-5 h-5" />
                              )}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-800 hover:text-emerald-700 transition">
                                {product.name}
                              </span>
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono font-bold rounded text-[10px] border border-slate-200">
                                {product.code}
                              </span>
                            </div>
                            {product.barcode && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                                <QrCode className="w-3 h-3 text-slate-400" />
                                <span>{product.barcode}</span>
                              </div>
                            )}
                            {product.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tipe & Kategori */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            product.productType === 'Jasa'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {product.productType}
                          </span>
                          <div className="text-[11px] font-medium text-slate-600 truncate max-w-[140px]">
                            {product.category || 'Umum'}
                          </div>
                        </div>
                      </td>

                      {/* Satuan Unit */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 font-semibold rounded-md text-[11px]">
                          {product.unit || 'Pcs'}
                        </span>
                      </td>

                      {/* Harga Beli */}
                      <td className="py-3 px-4">
                        {product.isPurchased ? (
                          <div>
                            <div className="font-mono font-bold text-slate-900">
                              {formatRupiah(product.purchasePrice)}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span className="text-emerald-700 font-semibold">
                                {product.purchaseTaxType ? `PPN ${product.purchaseTaxType}%` : 'Bebas Pajak'}
                              </span>
                              <span>•</span>
                              <span className="font-mono truncate max-w-[100px]" title={purchaseAcc?.name}>
                                {product.purchaseAccountCode}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Tidak dibeli</span>
                        )}
                      </td>

                      {/* Harga Jual */}
                      <td className="py-3 px-4">
                        {product.isSold ? (
                          <div>
                            <div className="font-mono font-bold text-emerald-700">
                              {formatRupiah(product.sellingPrice)}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span className="text-blue-700 font-semibold">
                                {product.salesTaxType ? `PPN ${product.salesTaxType}%` : 'Bebas Pajak'}
                              </span>
                              <span>•</span>
                              <span className="font-mono truncate max-w-[100px]" title={salesAcc?.name}>
                                {product.salesAccountCode}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Tidak dijual</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          product.isActive !== false
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {product.isActive !== false ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Produk"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => setProductToDelete(product)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus Produk"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID / CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product, idx) => (
            <div
              key={product.id || idx}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition p-4 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                        product.productType === 'Jasa' 
                          ? 'bg-purple-50 text-purple-600 border-purple-200' 
                          : 'bg-blue-50 text-blue-600 border-blue-200'
                      }`}>
                        {product.productType === 'Jasa' ? (
                          <Layers className="w-6 h-6" />
                        ) : (
                          <Package className="w-6 h-6" />
                        )}
                      </div>
                    )}
                    <div>
                      <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {product.code}
                      </span>
                      <span className={`block text-[10px] font-bold mt-1 ${
                        product.productType === 'Jasa' ? 'text-purple-700' : 'text-blue-700'
                      }`}>
                        {product.productType} • {product.unit}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    product.isActive !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {product.isActive !== false ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <h4 className="font-bold text-slate-800 text-xs line-clamp-2 group-hover:text-emerald-700 transition">
                  {product.name}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                  {product.description || 'Tidak ada deskripsi rinci.'}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  {product.isPurchased && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                        Harga Beli:
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatRupiah(product.purchasePrice)}
                      </span>
                    </div>
                  )}

                  {product.isSold && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-amber-600" />
                        Harga Jual:
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatRupiah(product.sellingPrice)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[130px]">
                  {product.category}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(product)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setProductToDelete(product)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL TAMBAH / EDIT PRODUK */}
      {/* ================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    {isEditing ? 'Edit Data Produk & Jasa' : 'Daftarkan Produk & Jasa Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lengkapi informasi produk, harga persediaan, dan integrasi Akun COA ERP
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                  title="Panduan & Bantuan"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Form Body */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveProduct(false);
              }}
              className="p-5 md:p-6 space-y-6 flex-1 overflow-y-auto"
            >
              {/* SECTION 1: INFORMASI PRODUK */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    1. Informasi Produk
                  </span>
                </div>

                {/* Row 1: Nama Produk & Tipe Produk */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nama Produk *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kertas HVS A4 80gr Sinar Dunia / Jasa Konsultan Pajak"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tipe Produk *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, productType: 'Barang' })}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          formData.productType === 'Barang'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Barang</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, productType: 'Jasa' })}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          formData.productType === 'Jasa'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Jasa</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Kode / SKU, Barcode, Unit, Kategori */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Kode Produk / SKU *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="PRD-001"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nomor Barcode
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Contoh: 8991234567890"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                      <QrCode className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Unit (Satuan) *
                    </label>
                    <input
                      type="text"
                      list="unit-options"
                      required
                      placeholder="Pcs / Unit / Rim..."
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                    <datalist id="unit-options">
                      {COMMON_UNITS.map(u => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Kategori Produk
                    </label>
                    <input
                      type="text"
                      list="category-options"
                      placeholder="Pilih / ketik kategori..."
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <datalist id="category-options">
                      {PRODUCT_CATEGORIES.map(c => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Row 3: Deskripsi & Upload Gambar Produk */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Deskripsi Produk
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {formData.description?.length || 0} / 6.000 karakter
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={6000}
                      placeholder="Keterangan spesifikasi produk, lingkup pekerjaan jasa, merek, garansi, dsb (maksimal 6.000 karakter)..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                    />
                  </div>

                  {/* Upload Gambar Produk */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Gambar Produk (Maks. 5 MB)
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleImageChange}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2.5">
                      {formData.imageUrl ? (
                        <div className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-300 flex-shrink-0">
                          <img
                            src={formData.imageUrl}
                            alt="Preview Produk"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, imageUrl: '' })}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-md shadow-xs opacity-80 hover:opacity-100 transition"
                            title="Hapus Gambar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 transition cursor-pointer flex-shrink-0"
                          title="Klik untuk memilih file gambar"
                        >
                          <ImageIcon className="w-6 h-6 mb-1" />
                          <span className="text-[9px] font-bold">Pilih File</span>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 space-y-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-slate-700 text-xs inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Pilih Gambar Produk</span>
                        </button>
                        <p className="text-[10px] text-slate-400">
                          Format JPG / PNG, maks. 5 MB.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: HARGA DAN PERSEDIAAN */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    2. Harga dan Persediaan
                  </span>
                </div>

                {/* Sub-A: SAYA BELI PRODUK INI */}
                <div className={`p-4 rounded-xl border transition ${
                  formData.isPurchased 
                    ? 'bg-emerald-50/40 border-emerald-300 shadow-xs' 
                    : 'bg-white border-slate-200 opacity-75'
                }`}>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isPurchased}
                      onChange={(e) => setFormData({ ...formData, isPurchased: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-slate-800">
                        A. Saya beli produk ini
                      </span>
                      <span className="text-[11px] text-slate-500">
                        (Aktifkan jika produk ini diadakan/dibeli dari supplier atau vendor)
                      </span>
                    </div>
                  </label>

                  {formData.isPurchased && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5 pt-3 border-t border-emerald-200/70">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Harga Beli Satuan (Rp) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          required={formData.isPurchased}
                          value={formData.purchasePrice}
                          onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-right"
                        />
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block text-right">
                          {formatRupiah(formData.purchasePrice)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Akun Pembelian (COA) *
                        </label>
                        <SearchableSelect
                          required={formData.isPurchased}
                          value={formData.purchaseAccountCode}
                          onChange={(val) => setFormData({ ...formData, purchaseAccountCode: val })}
                          options={purchaseCoaAccounts.map(a => ({
                            value: a.code,
                            label: a.name,
                            code: a.code,
                            subtitle: `${a.category} • Saldo: ${formatRupiah(a.balance)}`
                          }))}
                          placeholder="Pilih Akun Beban / Aset..."
                          searchPlaceholder="Cari nama atau kode akun..."
                          size="sm"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          COA untuk pencatatan beban/aset pembelian
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Pajak Beli (PPN)
                        </label>
                        <select
                          value={formData.purchaseTaxType}
                          onChange={(e) => setFormData({ ...formData, purchaseTaxType: Number(e.target.value) })}
                          className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                        >
                          <option value={0}>Bebas Pajak (Tanpa PPN 0%)</option>
                          <option value={1.1}>PPN 1.1% (Tarif Tertentu)</option>
                          <option value={11}>PPN 11% (PPN Standar)</option>
                          <option value={12}>PPN 12% (PPN Terkini)</option>
                        </select>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Pajak otomatis terpilih saat input pengadaan
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-B: SAYA JUAL PRODUK INI */}
                <div className={`p-4 rounded-xl border transition ${
                  formData.isSold 
                    ? 'bg-blue-50/40 border-blue-300 shadow-xs' 
                    : 'bg-white border-slate-200 opacity-75'
                }`}>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isSold}
                      onChange={(e) => setFormData({ ...formData, isSold: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-blue-700" />
                      <span className="text-xs font-bold text-slate-800">
                        B. Saya jual produk ini
                      </span>
                      <span className="text-[11px] text-slate-500">
                        (Aktifkan jika produk atau jasa ini dijual kepada mitra atau pelanggan)
                      </span>
                    </div>
                  </label>

                  {formData.isSold && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mt-3.5 pt-3 border-t border-blue-200/70">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Harga Jual Satuan (Rp) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          required={formData.isSold}
                          value={formData.sellingPrice}
                          onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) || 0 })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-right"
                        />
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block text-right">
                          {formatRupiah(formData.sellingPrice)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Akun Penjualan (COA) *
                        </label>
                        <SearchableSelect
                          required={formData.isSold}
                          value={formData.salesAccountCode}
                          onChange={(val) => setFormData({ ...formData, salesAccountCode: val })}
                          options={salesCoaAccounts.map(a => ({
                            value: a.code,
                            label: a.name,
                            code: a.code,
                            subtitle: `${a.subCategory || a.category}`
                          }))}
                          placeholder="Pilih Akun Pendapatan..."
                          searchPlaceholder="Cari nama atau kode pendapatan..."
                          size="sm"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Contoh: 4-41100 Pendapatan Mitra
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Pajak Jual (PPN)
                        </label>
                        <select
                          value={formData.salesTaxType}
                          onChange={(e) => setFormData({ ...formData, salesTaxType: Number(e.target.value) })}
                          className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        >
                          <option value={0}>Bebas Pajak (Tanpa PPN 0%)</option>
                          <option value={1.1}>PPN 1.1% (Tarif Tertentu)</option>
                          <option value={11}>PPN 11% (PPN Standar)</option>
                          <option value={12}>PPN 12% (PPN Terkini)</option>
                        </select>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Pajak atas penjualan produk
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Akun Diskon Penjualan
                        </label>
                        <SearchableSelect
                          value={formData.discountAccountCode}
                          onChange={(val) => setFormData({ ...formData, discountAccountCode: val })}
                          options={discountCoaAccounts.map(a => ({
                            value: a.code,
                            label: a.name,
                            code: a.code,
                            subtitle: `${a.category}`
                          }))}
                          placeholder="Pilih Akun Diskon..."
                          searchPlaceholder="Cari nama atau kode akun diskon..."
                          size="sm"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Contoh: 4-40201 Unbilled Revenues
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: TOMBOL TINDAKAN & FOOTER */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-500" />
                    <span>Bantuan</span>
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 ml-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span>Produk Aktif</span>
                  </label>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Batalkan
                  </button>

                  {/* Split Button: Simpan & Simpan + Buat Baru */}
                  <div className="relative inline-flex rounded-xl shadow-xs">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-l-xl transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Simpan Produk</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveActionDropdown(!saveActionDropdown)}
                      className="px-2 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-r-xl border-l border-emerald-500/50 transition cursor-pointer"
                      title="Pilihan tindakan tambahan"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {saveActionDropdown && (
                      <div className="absolute right-0 bottom-full mb-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                        <button
                          type="button"
                          onClick={() => handleSaveProduct(true)}
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Simpan & Buat Baru</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveProduct(false)}
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold"
                        >
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                          <span>Simpan & Tutup</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL PANDUAN / BANTUAN */}
      {/* ================================================================= */}
      {showHelpModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-800">
                  Panduan Master Data Produk & Jasa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                <strong>1. Tipe Produk (Barang vs Jasa):</strong><br />
                Pilih <em>Barang</em> untuk produk fisik yang memiliki satuan unit persediaan. Pilih <em>Jasa</em> untuk keahlian, sewa, atau konsultasi.
              </p>
              <p>
                <strong>2. Fleksibilitas Transaksi:</strong><br />
                Produk dapat dikonfigurasikan hanya untuk dibeli (pengadaan operasional), hanya untuk dijual, atau dibeli sekaligus dijual (trading / barang dagang).
              </p>
              <p>
                <strong>3. Integrasi COA Otomatis:</strong><br />
                - <em>Akun Pembelian:</em> Ditujukan ke Akun Beban Operasional (6xxx) atau Aset Tetap (12xx).<br />
                - <em>Akun Penjualan:</em> Ditujukan ke Akun Pendapatan Usaha (contoh: 4-41100 Pendapatan Mitra).<br />
                - <em>Akun Diskon:</em> Contoh: 4-40201 Unbilled Revenues / Potongan Penjualan.
              </p>
              <p>
                <strong>4. Integrasi Modul Pembelian:</strong><br />
                Produk yang Anda daftarkan di sini akan langsung muncul pada dropdown baris item pengadaan di Modul 3 (Purchase Request), sehingga harga, satuan, akun COA, dan tarif PPN otomatis terisi tanpa input berulang!
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL KONFIRMASI HAPUS */}
      {/* ================================================================= */}
      {productToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">
                  Hapus Produk dari Master Data?
                </h3>
                <p className="text-xs text-slate-500">
                  Tindakan ini tidak dapat dibatalkan
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-800">{productToDelete.name}</div>
              <div className="font-mono text-slate-500">SKU: {productToDelete.code} • Satuan: {productToDelete.unit}</div>
              <div className="font-mono font-bold text-emerald-700">Harga Beli: {formatRupiah(productToDelete.purchasePrice)}</div>
            </div>

            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus produk ini dari database? Riwayat pengadaan sebelumnya yang menggunakan produk ini tidak akan terhapus.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Produk'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

