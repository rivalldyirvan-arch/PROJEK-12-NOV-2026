import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Building2,
  Calculator,
  AlertTriangle,
  ArrowRight,
  User,
  CreditCard,
  Phone,
  Mail,
  Wallet,
  Layers,
  ChevronDown,
  ChevronUp,
  Lock,
  RotateCcw,
  Package,
  Copy,
  BookOpen,
  MoreHorizontal,
  Eye,
  Download as DownloadIcon
} from 'lucide-react';
import { formatRupiah, formatDateIndo, TAX_TYPES, calculateTax } from '../lib/taxRules';
import { savePurchaseRequest, deletePurchaseRequest, saveVendor, executePurchasePayment, cancelPurchasePayment, getVendorDeposit } from '../lib/databaseService';
import { useAuth } from '../lib/authContext';
import PurchasePrintPreviewModal from './PurchasePrintPreviewModal';
import SearchableSelect from '../components/SearchableSelect';

export const PPH_COA_MAP = {
  'PPh 23': { 
    name: 'PPh Pasal 23 (Jasa & Sewa)', 
    coaCode: '2113', 
    coaName: 'Hutang Pajak - PPh 23 Jasa/Sewa',
    defaultRate: 2.0 
  },
  'PPh 21': { 
    name: 'PPh Pasal 21 (Tenaga Ahli/Karyawan)', 
    coaCode: '2111', 
    coaName: 'Hutang Pajak - PPh 21 Karyawan/Ahli',
    defaultRate: 2.5 
  },
  'PPh 22': { 
    name: 'PPh Pasal 22 (Pengadaan Barang/BUMN)', 
    coaCode: '2112', 
    coaName: 'Hutang Pajak - PPh 22 Pengadaan',
    defaultRate: 1.5 
  },
  'PPh 25': { 
    name: 'PPh Pasal 25 (Angsuran Pajak)', 
    coaCode: '2116', 
    coaName: 'Hutang Pajak - PPh 25 Angsuran',
    defaultRate: 0.75 
  },
  'PPh 4(2)': { 
    name: 'PPh Pasal 4 Ayat (2) Final', 
    coaCode: '2114', 
    coaName: 'Hutang Pajak - PPh 4 Ayat (2) Final',
    defaultRate: 10.0 
  }
};

const DEPARTMENTS = [
  'Finance & Accounting',
  'IT & Infrastructure',
  'HR & GA',
  'Marketing & Sales',
  'Operations',
  'Executive & Legal'
];

const VENDOR_CATEGORIES = [
  'IT & Software',
  'Konsultan & Jasa Profesional',
  'Sewa & Gedung',
  'Konstruksi & Renovasi',
  'Material & Perlengkapan',
  'Logistik & Ekspedisi',
  'Lain-lain'
];

const STATUS_FILTERS = ['Semua', 'Draft', 'Menunggu Persetujuan', 'Disetujui', 'Sebagian Dibayar', 'Lunas', 'Ditolak'];

export default function PurchaseModule({
  purchaseRequests = [],
  vendorList = [],
  productList = [],
  coaList = [],
  onRefresh,
  showToast
}) {
  const { currentUser, hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPR, setEditingPR] = useState(null);
  const [printPR, setPrintPR] = useState(null);

  // View Mode: 'list' (Daftar Rinci Semua) vs 'summary' (Ringkasan per Rekanan)
  const [viewMode, setViewMode] = useState('list');
  const [expandedVendors, setExpandedVendors] = useState({});

  // Payment Confirmation Modal State
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    referenceNo: '',
    paymentMethod: 'Bank',
    kasCode: '1101',
    bankCode: '1102',
    useExactAmount: true,
    actualPaidInput: '',
    depositToUseInput: '',
    excessApproval: null,
    notes: ''
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Cancel Payment Modal State
  const [cancellingPR, setCancellingPR] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);

  // Action dropdown & Journal modal state
  const [openActionMenu, setOpenActionMenu] = useState(null); // pr.id of open menu (Tindakan)
  const [openPrintMenu, setOpenPrintMenu] = useState(null);   // pr.id of open print menu
  const [journalModalPR, setJournalModalPR] = useState(null); // PR to show journal for

  // New Vendor Registration State
  const [isNewVendorModalOpen, setIsNewVendorModalOpen] = useState(false);
  const [isSavingNewVendor, setIsSavingNewVendor] = useState(false);
  const [lastCreatedVendor, setLastCreatedVendor] = useState(null);
  const [newVendorData, setNewVendorData] = useState({
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
    ppnRate: 0,
    ppnAmount: 0,
    hasPph: false, // Default: false (tidak dipotong PPh)
    pphType: 'Non-PPh',
    pphRate: 0,
    pphAmount: 0,
    pphCoaAccount: '',
    totalPayable: 0,
    grandTotal: 0,
    status: 'Menunggu Persetujuan',
    coaDebitAccount: '6105',
    coaCreditAccount: '2101',
    items: [
      { id: 'item-1', productId: '', description: '', coaId: '6105', qty: 1, unit: 'Unit', unitPrice: 0, taxRate: 0, subtotal: 0 }
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
      requesterName: currentUser?.fullName || 'Ahmad Fauzi',
      department: currentUser?.department || 'Finance & Accounting',
      vendorId: defaultVendor ? defaultVendor.id : '',
      vendorName: defaultVendor ? defaultVendor.name : '',
      title: '',
      description: '',
      subtotal: 0,
      discount: 0,
      dpp: 0,
      ppnRate: 0,
      ppnAmount: 0,
      hasPph: false,
      pphType: 'Non-PPh',
      pphRate: 0,
      pphAmount: 0,
      pphCoaAccount: '',
      totalPayable: 0,
      grandTotal: 0,
      status: 'Menunggu Persetujuan',
      coaDebitAccount: '6105',
      coaCreditAccount: '2101',
      items: [
        { id: 'item-1', productId: '', description: '', coaId: '6105', qty: 1, unit: 'Unit', unitPrice: 0, taxRate: 0, subtotal: 0 }
      ]
    });
    setIsModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (pr) => {
    setEditingPR(pr);
    const hasPph = pr.hasPph !== undefined 
      ? Boolean(pr.hasPph) 
      : (pr.pphType && pr.pphType !== 'Non-PPh' && Number(pr.pphAmount || 0) > 0);

    const initialItems = pr.items && pr.items.length > 0
      ? pr.items.map((it, idx) => ({
          ...it,
          id: it.id || `item-${idx + 1}`,
          productId: it.productId || '',
          taxRate: it.taxRate !== undefined ? Number(it.taxRate) : (Number(pr.ppnRate) || 0)
        }))
      : [
          { id: 'item-1', productId: '', description: pr.title, coaId: pr.coaDebitAccount || '6105', qty: 1, unit: 'Paket', unitPrice: pr.subtotal, taxRate: Number(pr.ppnRate) || 0, subtotal: pr.subtotal }
        ];

    setFormData({
      ...pr,
      hasPph,
      pphType: hasPph ? (pr.pphType && pr.pphType !== 'Non-PPh' ? pr.pphType : 'PPh 23') : 'Non-PPh',
      pphCoaAccount: hasPph ? (PPH_COA_MAP[pr.pphType]?.coaCode || '2113') : '',
      items: initialItems
    });
    setIsModalOpen(true);
  };

  // Calculate totals when line items, taxes, or vendor changes
  const recalculateTotals = (items, discountVal, hasPphVal, pphTypeVal, pphRateVal, vendorIdVal) => {
    const sub = items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
    const disc = Number(discountVal) || 0;
    const dpp = Math.max(0, sub - disc);

    // Hitung PPN dari setiap line item
    const rawLinePpn = items.reduce((acc, it) => {
      const lineSub = Number(it.subtotal) || 0;
      const lineRate = Number(it.taxRate) || 0;
      return acc + ((lineSub * lineRate) / 100);
    }, 0);

    // Jika ada diskon di level dokumen, pro-rata nilai PPN
    const discountFactor = sub > 0 ? (dpp / sub) : 1;
    const ppnAmount = Math.round(rawLinePpn * discountFactor);
    const ppnRate = dpp > 0 ? Number(((ppnAmount / dpp) * 100).toFixed(2)) : 0;

    // PPh (hanya dihitung jika checkbox dicentang)
    let pphAmount = 0;
    let effectivePphType = 'Non-PPh';
    let effectivePphRate = 0;
    let pphCoaAccount = '';

    if (hasPphVal) {
      effectivePphType = pphTypeVal && pphTypeVal !== 'Non-PPh' ? pphTypeVal : 'PPh 23';
      const coaInfo = PPH_COA_MAP[effectivePphType];
      effectivePphRate = Number(pphRateVal) || (coaInfo ? coaInfo.defaultRate : 2.0);
      pphCoaAccount = coaInfo ? coaInfo.coaCode : '2113';

      const vendor = vendorList.find(v => v.id === (vendorIdVal || formData.vendorId)) || 
        (lastCreatedVendor && lastCreatedVendor.id === (vendorIdVal || formData.vendorId) ? lastCreatedVendor : null);
      const hasNpwp = vendor ? vendor.hasNpwp : true;

      const taxCalc = calculateTax({
        taxType: effectivePphType,
        baseRate: effectivePphRate,
        hasNpwp,
        dpp
      });
      pphAmount = taxCalc.taxAmount;
    }

    const totalPayable = dpp + ppnAmount - pphAmount;
    const grandTotal = dpp + ppnAmount;

    return {
      subtotal: sub,
      discount: disc,
      dpp,
      ppnRate,
      ppnAmount,
      hasPph: Boolean(hasPphVal),
      pphType: effectivePphType,
      pphRate: effectivePphRate,
      pphAmount,
      pphCoaAccount,
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
      formData.hasPph,
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

  // Handler saat produk dipilih dari katalog produk
  const handleProductSelect = (index, productId) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };

    if (!productId || productId === 'custom') {
      item.productId = productId === 'custom' ? 'custom' : '';
      newItems[index] = item;
      setFormData(prev => ({ ...prev, items: newItems }));
      return;
    }

    const prod = productList.find(p => p.id === productId);
    if (prod) {
      item.productId = prod.id;
      item.description = prod.name;
      item.unit = prod.unit || item.unit || 'Unit';
      item.unitPrice = Number(prod.purchasePrice) || 0;
      item.taxRate = Number(prod.purchaseTaxType) || 0;
      item.coaId = prod.purchaseAccountCode || formData.coaDebitAccount || '6105';
      item.subtotal = (Number(item.qty) || 1) * item.unitPrice;
    }

    newItems[index] = item;
    const calculated = recalculateTotals(
      newItems,
      formData.discount,
      formData.hasPph,
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
      { id: `item-${Date.now()}`, productId: '', description: '', coaId: formData.coaDebitAccount || '6105', qty: 1, unit: 'Unit', unitPrice: 0, taxRate: 0, subtotal: 0 }
    ];
    setFormData({ ...formData, items: newItems });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, idx) => idx !== index);
    const calculated = recalculateTotals(
      newItems,
      formData.discount,
      formData.hasPph,
      formData.pphType,
      formData.pphRate,
      formData.vendorId
    );
    setFormData({ ...formData, items: newItems, ...calculated });
  };

  const handleOpenNewVendorModal = () => {
    const nextNumber = (vendorList?.length || 0) + 1;
    const autoCode = `VND-${String(nextNumber).padStart(3, '0')}`;
    setNewVendorData({
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
    setIsNewVendorModalOpen(true);
  };

  const handleCloseNewVendorModal = () => {
    setIsNewVendorModalOpen(false);
    setIsModalOpen(true);
    if (formData.vendorId === '__NEW_VENDOR__') {
      setFormData(prev => ({ ...prev, vendorId: '' }));
    }
  };

  const handleSaveNewVendor = async (e) => {
    e.preventDefault();
    if (!newVendorData.name.trim()) {
      alert('Nama Supplier / Vendor wajib diisi!');
      return;
    }

    setIsSavingNewVendor(true);
    try {
      const generatedId = `vnd-${Date.now()}`;
      const vendorToSave = {
        ...newVendorData,
        id: generatedId,
        code: newVendorData.code.trim() || `VND-${String((vendorList?.length || 0) + 1).padStart(3, '0')}`,
        name: newVendorData.name.trim()
      };

      await saveVendor(vendorToSave);
      setLastCreatedVendor(vendorToSave);

      // Refresh parent state so Modul 2 Vendor gets updated immediately
      if (onRefresh) {
        await onRefresh();
      }

      showToast?.(`Vendor "${vendorToSave.name}" berhasil didaftarkan dan langsung dipilih!`, 'success');

      // Auto-determine tax defaults based on the new vendor
      let defaultPph = formData.pphType;
      let defaultRate = formData.pphRate;
      if (vendorToSave.category === 'Sewa & Gedung') {
        defaultPph = 'PPh 4(2)';
        defaultRate = 10.0;
      } else if (vendorToSave.category === 'Konstruksi & Renovasi') {
        defaultPph = 'PPh 4(2)';
        defaultRate = 1.75;
      } else if (vendorToSave.type === 'Orang Pribadi') {
        defaultPph = 'PPh 21';
        defaultRate = 2.5;
      } else {
        defaultPph = 'PPh 23';
        defaultRate = 2.0;
      }

      const calculated = recalculateTotals(
        formData.items,
        formData.discount,
        formData.hasPph,
        defaultPph,
        defaultRate,
        vendorToSave.id
      );

      setFormData(prev => ({
        ...prev,
        vendorId: vendorToSave.id,
        vendorName: vendorToSave.name,
        pphType: defaultPph,
        pphRate: defaultRate,
        ...calculated
      }));

      setIsNewVendorModalOpen(false);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error saving new vendor from purchase modal:', err);
      showToast?.('Gagal mendaftarkan vendor: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSavingNewVendor(false);
    }
  };

  const handleVendorSelect = (vId) => {
    if (vId === '__NEW_VENDOR__') {
      handleOpenNewVendorModal();
      return;
    }

    const v = vendorList.find(x => x.id === vId) || (lastCreatedVendor && lastCreatedVendor.id === vId ? lastCreatedVendor : null);
    let defaultPph = formData.pphType;
    let defaultRate = formData.pphRate;

    if (formData.hasPph) {
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
    } else {
      defaultPph = 'Non-PPh';
      defaultRate = 0;
    }

    const calculated = recalculateTotals(
      formData.items,
      formData.discount,
      formData.hasPph,
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
    const coaInfo = PPH_COA_MAP[type];
    const rate = coaInfo ? coaInfo.defaultRate : 0;

    const calculated = recalculateTotals(
      formData.items,
      formData.discount,
      formData.hasPph,
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

  // Master Kas & Bank List from COA
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

  // Grouped by Vendor for Summary View
  const groupedVendors = useMemo(() => {
    const map = {};
    filteredList.forEach(pr => {
      const vKey = pr.vendorId || pr.vendorName || 'other';
      if (!map[vKey]) {
        const vInfo = vendorList.find(v => v.id === pr.vendorId) || {};
        map[vKey] = {
          vendorKey: vKey,
          vendorId: pr.vendorId,
          vendorName: pr.vendorName || vInfo.name || 'Vendor Tidak Dikenal',
          vendorCode: vInfo.code || '',
          category: vInfo.category || '',
          bankName: vInfo.bankName || '',
          bankAccount: vInfo.bankAccount || '',
          bankAccountHolder: vInfo.bankAccountHolder || '',
          items: [],
          totalDpp: 0,
          totalPph: 0,
          totalNetPayable: 0,
          pendingCount: 0,
          approvedCount: 0,
          paidCount: 0
        };
      }
      map[vKey].items.push(pr);
      map[vKey].totalDpp += Number(pr.dpp || 0);
      map[vKey].totalPph += Number(pr.pphAmount || 0);
      const prNet = pr.remainingPayable !== undefined ? Number(pr.remainingPayable) : Number(pr.totalPayable || 0);
      map[vKey].totalNetPayable += prNet;

      if (pr.status === 'Menunggu Persetujuan') map[vKey].pendingCount += 1;
      else if (pr.status === 'Disetujui' || pr.status === 'Sebagian Dibayar') map[vKey].approvedCount += 1;
      else if (pr.status === 'Lunas') map[vKey].paidCount += 1;
    });

    return Object.values(map).sort((a, b) => b.totalNetPayable - a.totalNetPayable);
  }, [filteredList, vendorList]);

  const toggleVendorExpand = (vKey) => {
    setExpandedVendors(prev => ({
      ...prev,
      [vKey]: !prev[vKey]
    }));
  };

  // Handler Buka Form Konfirmasi Pelunasan
  const handleOpenPaymentModal = (prs, vendorGroup = {}) => {
    const isAllowed = hasPermission('pay_purchase') || currentUser?.role?.toLowerCase().includes('admin') || currentUser?.role?.toLowerCase().includes('finance');
    if (!isAllowed) {
      alert('Akses Ditolak: Anda tidak memiliki wewenang untuk memproses pembayaran (Permission: pay_purchase). Hanya Finance dan Admin yang berwenang.');
      return;
    }

    const prList = Array.isArray(prs) ? prs : [prs];
    const totalDue = prList.reduce((sum, p) => sum + (Number(p.remainingPayable !== undefined ? p.remainingPayable : p.totalPayable) || 0), 0);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSeq = String(Math.floor(100 + Math.random() * 900));
    const generatedRef = `PAY-${dateStr}-${randomSeq}`;

    const vId = vendorGroup.vendorId || prList[0]?.vendorId;
    const vendorDeposit = getVendorDeposit(vId);
    const availableDep = Number(vendorDeposit?.balance || 0);

    const vInfo = vendorList.find(v => v.id === vId) || {};

    setPaymentModalData({
      targetPRs: prList,
      isGroup: prList.length > 1,
      vendorId: vId,
      vendorName: vendorGroup.vendorName || prList[0]?.vendorName || vInfo.name || 'Rekanan',
      vendorCode: vendorGroup.vendorCode || vInfo.code || '',
      vendorBank: vendorGroup.bankName
        ? `${vendorGroup.bankName} ${vendorGroup.bankAccount} (a/n ${vendorGroup.bankAccountHolder || vendorGroup.vendorName})`
        : (vInfo.bankName ? `${vInfo.bankName} ${vInfo.bankAccount} (a/n ${vInfo.bankAccountHolder || vInfo.name})` : 'Belum tercatat'),
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
      console.error('Error executing payment in PurchaseModule:', err);
      showToast?.('Gagal memproses pembayaran: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open Cancel Payment Modal
  const handleOpenCancelPayment = (pr) => {
    const isAllowed = hasPermission('pay_purchase') || currentUser?.role?.toLowerCase().includes('admin') || currentUser?.role?.toLowerCase().includes('finance');
    if (!isAllowed) {
      alert('Akses Ditolak: Anda tidak memiliki wewenang untuk membatalkan pelunasan. Hanya Finance dan Admin yang berwenang.');
      return;
    }
    setCancellingPR(pr);
    setCancellationReason('');
  };

  // Confirm Cancel Payment
  const handleConfirmCancelPayment = async (e) => {
    e?.preventDefault();
    if (!cancellingPR || isSubmittingCancellation) return;

    setIsSubmittingCancellation(true);
    try {
      await cancelPurchasePayment({
        pr: cancellingPR,
        cancellationReason,
        currentUser
      });

      if (onRefresh) {
        await onRefresh();
      }

      showToast?.(`Pelunasan pengajuan ${cancellingPR.requestNumber} berhasil dibatalkan. Status dikembalikan ke 'Disetujui'.`, 'success');
      setCancellingPR(null);
      setCancellationReason('');
    } catch (err) {
      console.error('Error cancelling payment:', err);
      showToast?.('Gagal membatalkan pelunasan: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  // Status Action (Approve, Reject, Pay)
  const handleUpdateStatus = async (pr, newStatus) => {
    const updated = {
      ...pr,
      status: newStatus,
      approvalDate: newStatus === 'Disetujui' ? new Date().toISOString() : pr.approvalDate,
      approvedBy: newStatus === 'Disetujui' ? (currentUser?.fullName || 'Irfan Hakim (Direktur Keuangan)') : pr.approvedBy
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

  // Duplicate: copy PR with a new unique request number
  const handleDuplicate = async (pr) => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(0, 6);
    // Generate next available number
    const existingNums = purchaseRequests
      .map(r => r.requestNumber)
      .filter(n => n && n.startsWith(`PR-${dateStr}`))
      .map(n => {
        const parts = n.split('-');
        return parseInt(parts[parts.length - 1]) || 0;
      });
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : purchaseRequests.length + 1;
    const newNumber = `PR-${dateStr}-${String(nextNum).padStart(3, '0')}`;

    const duplicated = {
      ...pr,
      id: `pr-${Date.now()}`,
      requestNumber: newNumber,
      requestDate: new Date().toISOString().slice(0, 10),
      status: 'Draft',
      paidAmount: 0,
      outstandingAmount: pr.totalPayable || pr.netPayable || 0,
      approvedBy: '',
      paymentHistory: []
    };
    await savePurchaseRequest(duplicated);
    showToast?.(`Pengajuan berhasil diduplikat menjadi ${newNumber}`, 'success');
    onRefresh();
    setOpenActionMenu(null);
  };

  // Build journal entries for a PR (Debit / Kredit breakdown)
  const buildJournalEntries = (pr) => {
    const entries = [];
    const dpp = Number(pr.dpp) || Number(pr.subtotal) || 0;
    const ppnAmount = Number(pr.ppnAmount) || 0;
    const pphAmount = Number(pr.pphAmount) || 0;
    const totalPayable = Number(pr.totalPayable) || (dpp + ppnAmount - pphAmount);
    const vendor = vendorList.find(v => v.id === pr.vendorId);

    // 1. Per line-item: Debit Beban/Aset
    if (pr.items && pr.items.length > 0) {
      pr.items.forEach((item, idx) => {
        const sub = Number(item.subtotal) || 0;
        if (sub === 0) return;
        const coaAccount = coaList.find(c => c.code === item.coaId) || { code: item.coaId || pr.coaDebitAccount || '6105', name: item.description || 'Beban Pengadaan' };
        entries.push({
          no: entries.length + 1,
          type: 'Debit',
          coaCode: coaAccount.code,
          coaName: coaAccount.name || item.description || `Item ${idx + 1}`,
          description: item.description || pr.title,
          amount: sub
        });
        // Per-line PPN
        const linePpn = Math.round((sub * (Number(item.taxRate) || 0)) / 100);
        if (linePpn > 0) {
          entries.push({
            no: entries.length + 1,
            type: 'Debit',
            coaCode: '1601',
            coaName: 'PPN Masukan',
            description: `PPN ${item.taxRate}% atas ${item.description || pr.title}`,
            amount: linePpn
          });
        }
      });
    } else {
      // Fallback: single line
      const debitCoa = coaList.find(c => c.code === pr.coaDebitAccount) || { code: pr.coaDebitAccount || '6105', name: 'Beban Pengadaan' };
      entries.push({
        no: 1,
        type: 'Debit',
        coaCode: debitCoa.code,
        coaName: debitCoa.name,
        description: pr.title,
        amount: dpp
      });
      if (ppnAmount > 0) {
        entries.push({
          no: entries.length + 1,
          type: 'Debit',
          coaCode: '1601',
          coaName: 'PPN Masukan',
          description: `PPN atas ${pr.title}`,
          amount: ppnAmount
        });
      }
    }

    // 2. Kredit: Hutang PPh (jika ada potongan PPh)
    if (pphAmount > 0 && pr.hasPph) {
      const pphInfo = PPH_COA_MAP[pr.pphType] || { coaCode: '2113', coaName: 'Hutang Pajak PPh' };
      entries.push({
        no: entries.length + 1,
        type: 'Kredit',
        coaCode: pphInfo.coaCode,
        coaName: pphInfo.coaName,
        description: `Potongan ${pr.pphType} (${pr.pphRate}%) atas ${pr.title}`,
        amount: pphAmount
      });
    }

    // 3. Kredit: Hutang Usaha / Kas & Bank
    const isLunas = pr.status === 'Lunas';
    const creditCoa = isLunas
      ? coaList.find(c => c.code === '1102') || { code: '1102', name: 'Kas & Bank' }
      : coaList.find(c => c.code === pr.coaCreditAccount) || { code: pr.coaCreditAccount || '2101', name: 'Hutang Usaha' };
    entries.push({
      no: entries.length + 1,
      type: 'Kredit',
      coaCode: creditCoa.code,
      coaName: creditCoa.name,
      description: isLunas ? `Pembayaran ke ${pr.vendorName || vendor?.name || '-'}` : `Hutang kepada ${pr.vendorName || vendor?.name || '-'}`,
      amount: totalPayable
    });

    return entries;
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

  const selectedVendor = vendorList.find(v => v.id === formData.vendorId) || (lastCreatedVendor && lastCreatedVendor.id === formData.vendorId ? lastCreatedVendor : null);

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
                    'Sebagian Dibayar': 'bg-sky-100 text-sky-800 border-sky-200',
                    'Ditolak': 'bg-rose-100 text-rose-800',
                    'Lunas': 'bg-teal-100 text-teal-800'
                  };

                  const payableAmount = pr.remainingPayable !== undefined ? pr.remainingPayable : pr.totalPayable;

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
                        {formatRupiah(payableAmount)}
                        {pr.paidAmount > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Terbayar: {formatRupiah(pr.paidAmount)}
                          </div>
                        )}
                      </td>

                      {/* Kolom 9: Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[pr.status] || 'bg-slate-100 text-slate-700'}`}>
                          {pr.status}
                        </span>
                      </td>

                      {/* Kolom 10: Aksi & Workflow */}
                      <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1.5 py-1">

                          {/* Row 1: Edit + Cetak + Tindakan + Jurnal */}
                          <div className="flex items-center gap-1 flex-wrap justify-center">

                            {/* 1. EDIT */}
                            <button
                              onClick={() => handleOpenEdit(pr)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-white border border-slate-300 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition shadow-xs"
                              title="Edit Pengajuan"
                            >
                              <Edit3 className="w-3 h-3" />
                              Edit
                            </button>

                            {/* 2. CETAK dropdown */}
                            <div className="relative">
                              <button
                                onClick={() => { setOpenPrintMenu(openPrintMenu === pr.id ? null : pr.id); setOpenActionMenu(null); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition shadow-xs"
                              >
                                <Printer className="w-3 h-3" />
                                Cetak
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              {openPrintMenu === pr.id && (
                                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 min-w-[160px] overflow-hidden">
                                  <button
                                    onClick={() => { setPrintPR(pr); setOpenPrintMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition text-left"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Preview & Cetak
                                  </button>
                                  <button
                                    onClick={() => { setPrintPR(pr); setOpenPrintMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition text-left border-t border-slate-100"
                                  >
                                    <DownloadIcon className="w-3.5 h-3.5" />
                                    Ekspor PDF
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* 3. TINDAKAN dropdown */}
                            <div className="relative">
                              <button
                                onClick={() => { setOpenActionMenu(openActionMenu === pr.id ? null : pr.id); setOpenPrintMenu(null); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-lg transition shadow-xs"
                              >
                                <MoreHorizontal className="w-3 h-3" />
                                Tindakan
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              {openActionMenu === pr.id && (
                                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 min-w-[170px] overflow-hidden">
                                  <button
                                    onClick={() => handleDuplicate(pr)}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition text-left"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    Duplikat Pengajuan
                                  </button>
                                  <button
                                    onClick={() => { handleDelete(pr); setOpenActionMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition text-left border-t border-slate-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Hapus Pengajuan
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* 4. LIHAT JURNAL */}
                            <button
                              onClick={() => setJournalModalPR(pr)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg transition shadow-xs"
                              title="Lihat Jurnal Akuntansi"
                            >
                              <BookOpen className="w-3 h-3" />
                              Jurnal
                            </button>
                          </div>

                          {/* Row 2: Workflow actions (status-based) */}
                          {pr.status === 'Menunggu Persetujuan' && hasPermission('approve_purchase') && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUpdateStatus(pr, 'Disetujui')}
                                className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition"
                              >✓ Setujui</button>
                              <button
                                onClick={() => handleUpdateStatus(pr, 'Ditolak')}
                                className="px-2.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition"
                              >✕ Tolak</button>
                            </div>
                          )}
                          {pr.status === 'Menunggu Persetujuan' && !hasPermission('approve_purchase') && (
                            <span className="text-[10px] text-slate-400 italic">Menunggu Review</span>
                          )}
                          {(pr.status === 'Disetujui' || pr.status === 'Sebagian Dibayar') && hasPermission('pay_purchase') && (
                            <button
                              type="button"
                              onClick={() => {
                                const vInfo = vendorList.find(v => v.id === pr.vendorId) || { vendorId: pr.vendorId, vendorName: pr.vendorName };
                                handleOpenPaymentModal([pr], vInfo);
                              }}
                              className="px-2.5 py-1 text-[10px] font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-md transition flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Konfirmasi LUNAS</span>
                            </button>
                          )}
                          {(pr.status === 'Disetujui' || pr.status === 'Sebagian Dibayar') && !hasPermission('pay_purchase') && (
                            <span className="text-[10px] text-emerald-600 font-semibold">Disetujui</span>
                          )}
                          {pr.status === 'Lunas' && hasPermission('pay_purchase') && (
                            <button
                              type="button"
                              onClick={() => handleOpenCancelPayment(pr)}
                              className="px-2.5 py-1 text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Batalkan Lunas</span>
                            </button>
                          )}

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
                    PILIH SUPPLIER / VENDOR DITUJU *
                  </label>
                  <SearchableSelect
                    required
                    options={vendorList.map(v => ({
                      value: v.id,
                      label: v.name,
                      code: v.code,
                      subtitle: `${v.type} • ${v.category} • NPWP: ${v.hasNpwp && v.npwp ? v.npwp : 'Non-NPWP'}`,
                      badge: v.type,
                      extraSearch: `${v.npwp || ''} ${v.bankName || ''} ${v.picName || ''}`
                    }))}
                    value={formData.vendorId}
                    onChange={(val) => handleVendorSelect(val)}
                    placeholder="-- Cari / Pilih Rekanan Vendor --"
                    searchPlaceholder="Cari nama, kode vendor, atau NPWP..."
                    actionOption={{
                      label: '➕ + Daftar Vendor / Supplier Baru...',
                      onSelect: handleOpenNewVendorModal
                    }}
                  />
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Rincian Item Pengadaan (Line Items)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      (Pilih produk katalog atau input manual, dan tentukan PPN per item)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    + Tambah Baris
                  </button>
                </div>

                {/* Table Headers */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-3">Produk (Katalog)</div>
                  <div className="col-span-3">Deskripsi Item</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-1 text-center">Satuan</div>
                  <div className="col-span-2 text-right">Harga Satuan</div>
                  <div className="col-span-1 text-center">Pajak PPN</div>
                  <div className="col-span-1 text-right">Aksi</div>
                </div>

                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={item.id || index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {/* 1. Searchable Dropdown Produk */}
                      <div className="md:col-span-3">
                        <SearchableSelect
                          value={item.productId || ''}
                          onChange={(val) => handleProductSelect(index, val)}
                          options={[
                            { value: 'custom', label: '-- Input Manual / Non-Katalog --', code: 'MANUAL', subtitle: 'Ketik deskripsi manual' },
                            ...productList.map(p => ({
                              value: p.id,
                              label: p.name,
                              code: p.code,
                              subtitle: `${p.category || 'Umum'} • ${p.unit} • ${formatRupiah(p.purchasePrice)}`,
                              badge: p.productType,
                              extraSearch: `${p.barcode || ''} ${p.unit || ''}`
                            }))
                          ]}
                          placeholder="Pilih Produk..."
                          searchPlaceholder="Cari nama atau SKU..."
                          size="sm"
                        />
                      </div>

                      {/* 2. Deskripsi Item */}
                      <div className="md:col-span-3">
                        <input
                          type="text"
                          required
                          placeholder="Deskripsi item barang / jasa"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {/* 3. Qty */}
                      <div className="md:col-span-1">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-center font-bold"
                        />
                      </div>

                      {/* 4. Satuan */}
                      <div className="md:col-span-1">
                        <input
                          type="text"
                          placeholder="Satuan"
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-center"
                        />
                      </div>

                      {/* 5. Harga Satuan */}
                      <div className="md:col-span-2">
                        <input
                          type="number"
                          placeholder="Harga Satuan"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-right font-mono font-semibold"
                        />
                      </div>

                      {/* 6. Dropdown Pajak (1.1%, 11%) - PPN per baris */}
                      <div className="md:col-span-1">
                        <select
                          value={item.taxRate !== undefined ? item.taxRate : 0}
                          onChange={(e) => handleItemChange(index, 'taxRate', Number(e.target.value))}
                          className="w-full px-1.5 py-1.5 text-[11px] bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                          title="Pilih Pajak (Bukan keharusan: Non-PPN, 1.1%, 11%)"
                        >
                          <option value={0}>0%</option>
                          <option value={1.1}>1.1%</option>
                          <option value={11}>11%</option>
                          <option value={12}>12%</option>
                        </select>
                      </div>

                      {/* 7. Subtotal & Hapus Baris */}
                      <div className="md:col-span-1 flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono font-bold text-slate-700 hidden md:inline truncate">
                          {formatRupiah(item.subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
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
                {/* Tax & Withholding Section */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Ketentuan Pajak & Pemotongan (Withholding)
                  </span>

                  {/* Box Ceklis PPh */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.hasPph)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const pphType = checked ? (formData.pphType !== 'Non-PPh' ? formData.pphType : 'PPh 23') : 'Non-PPh';
                          const defaultRate = PPH_COA_MAP[pphType]?.defaultRate || 2.0;
                          const pphRate = checked ? (formData.pphRate > 0 ? formData.pphRate : defaultRate) : 0;
                          const calculated = recalculateTotals(
                            formData.items,
                            formData.discount,
                            checked,
                            pphType,
                            pphRate,
                            formData.vendorId
                          );
                          setFormData({
                            ...formData,
                            hasPph: checked,
                            ...calculated
                          });
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800">
                          Potong Pajak Penghasilan (PPh Withholding)
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Centang untuk memotong PPh Pasal 23, 21, 22, 25, atau 4(2) Final
                        </p>
                      </div>
                    </label>

                    {/* JIKA DICEKLIS: MUNCULKAN JENIS PPH & TARIF TERDAFTAR DI COA */}
                    {formData.hasPph && (
                      <div className="pt-3 border-t border-purple-100 space-y-3 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Jenis PPh Dipotong *
                            </label>
                            <SearchableSelect
                              required
                              value={formData.pphType}
                              onChange={(val) => handlePphTypeSelect(val)}
                              options={Object.entries(PPH_COA_MAP).map(([key, info]) => ({
                                value: key,
                                label: info.name,
                                code: info.coaCode,
                                subtitle: info.coaName
                              }))}
                              placeholder="Pilih Jenis PPh..."
                              searchPlaceholder="Cari jenis PPh atau kode COA..."
                              emptyMessage="Jenis PPh tidak ditemukan"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Tarif Pajak {formData.pphType} (%)
                            </label>
                            <div className="flex items-center gap-1 font-mono font-bold text-purple-800">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.pphRate}
                                onChange={(e) => {
                                  const r = Number(e.target.value);
                                  const calculated = recalculateTotals(
                                    formData.items,
                                    formData.discount,
                                    true,
                                    formData.pphType,
                                    r,
                                    formData.vendorId
                                  );
                                  setFormData({ ...formData, pphRate: r, ...calculated });
                                }}
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-300 rounded-lg text-right font-bold"
                              />
                              <span className="text-xs font-bold text-slate-600">%</span>
                            </div>
                          </div>
                        </div>

                        {/* COA Link Info Banner */}
                        <div className="p-2.5 bg-purple-50/80 rounded-lg border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-purple-200/90 text-purple-900 font-mono font-extrabold text-[10px] rounded">
                              COA {PPH_COA_MAP[formData.pphType]?.coaCode || '2113'}
                            </span>
                            <span className="font-semibold text-[11px]">
                              {PPH_COA_MAP[formData.pphType]?.coaName || 'Hutang Pajak PPh'}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-purple-800">
                            -{formatRupiah(formData.pphAmount)}
                          </span>
                        </div>

                        {selectedVendor && !selectedVendor.hasNpwp && (
                          <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span>Tarif sanksi non-NPWP otomatis diterapkan (+20% PPh 21 / +100% PPh 23).</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* COA Accounts Integration */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Akun Debet Utama (Beban / Aset)
                      </label>
                      <SearchableSelect
                        value={formData.coaDebitAccount}
                        onChange={(val) => setFormData({ ...formData, coaDebitAccount: val })}
                        options={coaList.filter(a => a.category === 'Expense' || a.category === 'Asset').map(a => ({
                          value: a.code,
                          label: a.name,
                          code: a.code,
                          subtitle: a.category
                        }))}
                        placeholder="Pilih Akun Debet..."
                        searchPlaceholder="Cari nama atau kode akun..."
                        size="sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Akun Kredit Utama (Hutang Usaha)
                      </label>
                      <SearchableSelect
                        value={formData.coaCreditAccount}
                        onChange={(val) => setFormData({ ...formData, coaCreditAccount: val })}
                        options={coaList.filter(a => a.category === 'Liability' || a.subCategory === 'Kas & Bank').map(a => ({
                          value: a.code,
                          label: a.name,
                          code: a.code,
                          subtitle: a.subCategory || a.category
                        }))}
                        placeholder="Pilih Akun Kredit..."
                        searchPlaceholder="Cari nama atau kode akun..."
                        size="sm"
                      />
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
                            formData.hasPph,
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
                      <span>PPN (dari Line Items):</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        {formData.ppnAmount > 0 ? `+ ${formatRupiah(formData.ppnAmount)}` : 'Rp0 (Non-PPN)'}
                      </span>
                    </div>
                    {formData.hasPph && formData.pphAmount > 0 && (
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

      {/* Modal Pendaftaran Vendor / Supplier Baru */}
      {isNewVendorModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Daftar Vendor / Supplier Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Data otomatis tersimpan ke Modul Supplier/Vendor & database Supabase
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseNewVendorModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNewVendor} className="p-4 md:p-6 space-y-4">
              {/* Row 1: Code & Name */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kode Vendor *
                  </label>
                  <input
                    type="text"
                    required
                    value={newVendorData.code}
                    onChange={(e) => setNewVendorData({ ...newVendorData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Supplier / Vendor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Solusi Data Mandiri"
                    value={newVendorData.name}
                    onChange={(e) => setNewVendorData({ ...newVendorData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              {/* Row 2: Type & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tipe Rekanan *
                  </label>
                  <select
                    value={newVendorData.type}
                    onChange={(e) => setNewVendorData({ ...newVendorData, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="Badan">Badan (PT, CV, Yayasan, Firma)</option>
                    <option value="Orang Pribadi">Orang Pribadi (Perorangan / Ahli)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kategori Bidang Usaha *
                  </label>
                  <select
                    value={newVendorData.category}
                    onChange={(e) => setNewVendorData({ ...newVendorData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {VENDOR_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: NPWP & Tax */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Kepatuhan Pajak (NPWP)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={newVendorData.hasNpwp}
                      onChange={(e) => setNewVendorData({ ...newVendorData, hasNpwp: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Memiliki NPWP Valid</span>
                  </label>
                </div>

                {newVendorData.hasNpwp ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nomor NPWP (15 atau 16 digit)
                    </label>
                    <input
                      type="text"
                      placeholder="01.234.567.8-012.000"
                      value={newVendorData.npwp}
                      onChange={(e) => setNewVendorData({ ...newVendorData, npwp: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                    <span>Vendor tanpa NPWP akan dikenakan tarif pemotongan PPh 20% s/d 100% lebih tinggi (penalti non-NPWP).</span>
                  </div>
                )}
              </div>

              {/* Row 4: Bank Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Bank
                  </label>
                  <input
                    type="text"
                    placeholder="BCA / Mandiri / BRI / BNI"
                    value={newVendorData.bankName}
                    onChange={(e) => setNewVendorData({ ...newVendorData, bankName: e.target.value })}
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
                    value={newVendorData.bankAccount}
                    onChange={(e) => setNewVendorData({ ...newVendorData, bankAccount: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Atas Nama Rekening
                  </label>
                  <input
                    type="text"
                    placeholder="Sesuai buku tabungan"
                    value={newVendorData.bankAccountHolder}
                    onChange={(e) => setNewVendorData({ ...newVendorData, bankAccountHolder: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Row 5: PIC Contact */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama PIC
                  </label>
                  <input
                    type="text"
                    placeholder="Nama kontak"
                    value={newVendorData.picName}
                    onChange={(e) => setNewVendorData({ ...newVendorData, picName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email PIC
                  </label>
                  <input
                    type="email"
                    placeholder="pic@vendor.com"
                    value={newVendorData.picEmail}
                    onChange={(e) => setNewVendorData({ ...newVendorData, picEmail: e.target.value })}
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
                    value={newVendorData.picPhone}
                    onChange={(e) => setNewVendorData({ ...newVendorData, picPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Row 6: Address & Payment Term */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Alamat Lengkap
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Alamat kantor rekanan / vendor..."
                    value={newVendorData.address}
                    onChange={(e) => setNewVendorData({ ...newVendorData, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Term of Payment (TOP)
                    </label>
                    <select
                      value={newVendorData.paymentTerm}
                      onChange={(e) => setNewVendorData({ ...newVendorData, paymentTerm: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
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
                      Kota
                    </label>
                    <input
                      type="text"
                      placeholder="Jakarta Selatan"
                      value={newVendorData.city}
                      onChange={(e) => setNewVendorData({ ...newVendorData, city: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseNewVendorModal}
                  disabled={isSavingNewVendor}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingNewVendor}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingNewVendor ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan ke Supabase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Daftarkan & Pilih Vendor Ini</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* FORM KONFIRMASI PELUNASAN PEMBAYARAN                              */}
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
                    <span className="text-[10px] text-slate-400">Saldo Deposit Rekanan</span>
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
                              name="kasChoiceModule"
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
                    <SearchableSelect
                      value={paymentForm.bankCode}
                      onChange={(val) => setPaymentForm({ ...paymentForm, bankCode: val })}
                      options={bankAccounts.map(b => ({
                        value: b.code,
                        label: b.name,
                        code: b.code,
                        subtitle: `Saldo: ${formatRupiah(b.balance)}`
                      }))}
                      placeholder="Pilih Rekening Bank..."
                      searchPlaceholder="Cari nama atau kode bank..."
                    />
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
                        name="amountMatchModule"
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
                        name="amountMatchModule"
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
                          ✓ Kelebihan pembayaran akan otomatis dicatat sebagai deposit rekanan dan pengajuan akan ditandai LUNAS.
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
                        Pembayaran aktual sebesar <strong>{formatRupiah(effectivePaidAmount)}</strong> akan dicatat sebagai <strong>Pembayaran Sebagian</strong>. Sisa tagihan sebesar <strong>{formatRupiah(paymentDifference)}</strong> otomatis tetap tercatat di sistem dan dapat dilunasi di kemudian hari.
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

      {/* ================================================================= */}
      {/* MODAL KONFIRMASI BATALKAN PELUNASAN (CANCEL PAYMENT)               */}
      {/* ================================================================= */}
      {cancellingPR && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Konfirmasi Pembatalan Pelunasan
                  </h3>
                  <p className="text-[11px] text-slate-600 font-mono">
                    {cancellingPR.requestNumber} • {cancellingPR.vendorName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellingPR(null)}
                disabled={isSubmittingCancellation}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleConfirmCancelPayment} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-900 mb-1">
                  Apakah Anda yakin ingin membatalkan pelunasan pengajuan ini?
                </p>
                <p className="text-slate-600 text-[11px]">
                  Status pengajuan akan dikembalikan menjadi <strong>Disetujui</strong> dan nominal pembayaran akan dikembalikan ke kondisi sebelum pelunasan.
                </p>
              </div>

              {/* Rincian Finansial Reversal */}
              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>DPP Nilai Bersih:</span>
                  <span className="font-mono font-bold text-slate-800">{formatRupiah(cancellingPR.dpp)}</span>
                </div>
                {cancellingPR.pphType !== 'Non-PPh' && cancellingPR.pphAmount > 0 && (
                  <div className="flex items-center justify-between text-purple-700">
                    <span>Potongan {cancellingPR.pphType}:</span>
                    <span className="font-mono font-bold">-{formatRupiah(cancellingPR.pphAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-600 border-t border-amber-200/80 pt-1.5">
                  <span>Net Dibayar:</span>
                  <span className="font-mono font-bold text-slate-900">{formatRupiah(cancellingPR.totalPayable)}</span>
                </div>
                <div className="flex items-center justify-between text-rose-700">
                  <span>Total Pembayaran Dibatalkan:</span>
                  <span className="font-mono font-extrabold">{formatRupiah(cancellingPR.paidAmount || cancellingPR.totalPayable)}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-800 font-bold bg-white p-2 rounded-lg border border-amber-200">
                  <span>Outstanding (Sisa Tagihan) Kembali:</span>
                  <span className="font-mono">{formatRupiah(cancellingPR.totalPayable)}</span>
                </div>
              </div>

              {/* Alasan Pembatalan (Audit Trail) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alasan Pembatalan Pelunasan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kesalahan input rekening / memo koreksi transaksi..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCancellingPR(null)}
                  disabled={isSubmittingCancellation}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancellation}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingCancellation ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Memproses Pembatalan...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ya, Batalkan Pelunasan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL JURNAL AKUNTANSI                                             */}
      {/* ================================================================= */}
      {journalModalPR && (() => {
        const entries = buildJournalEntries(journalModalPR);
        const totalDebit = entries.filter(e => e.type === 'Debit').reduce((s, e) => s + e.amount, 0);
        const totalKredit = entries.filter(e => e.type === 'Kredit').reduce((s, e) => s + e.amount, 0);
        const isBalanced = Math.abs(totalDebit - totalKredit) < 1;
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">

              {/* Header */}
              <div className="bg-gradient-to-r from-purple-900 to-purple-700 px-6 py-4 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-300" />
                    Jurnal Akuntansi – {journalModalPR.requestNumber}
                  </h3>
                  <p className="text-xs text-purple-200 mt-0.5">{journalModalPR.title} • {journalModalPR.vendorName}</p>
                </div>
                <button onClick={() => setJournalModalPR(null)} className="text-purple-200 hover:text-white transition text-lg">✕</button>
              </div>

              {/* Info Row */}
              <div className="px-6 py-3 bg-purple-50 border-b border-purple-100 flex flex-wrap gap-4 text-xs text-slate-600">
                <div><span className="font-semibold text-slate-700">Tanggal:</span> {journalModalPR.requestDate}</div>
                <div><span className="font-semibold text-slate-700">Pemohon:</span> {journalModalPR.requesterName}</div>
                <div><span className="font-semibold text-slate-700">Departemen:</span> {journalModalPR.department}</div>
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    journalModalPR.status === 'Lunas' ? 'bg-teal-100 text-teal-800 border-teal-200'
                    : journalModalPR.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>{journalModalPR.status}</span>
                </div>
              </div>

              {/* Journal Table */}
              <div className="p-6">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="py-2.5 px-3 text-left font-bold w-8">#</th>
                        <th className="py-2.5 px-3 text-left font-bold w-16">Kode COA</th>
                        <th className="py-2.5 px-3 text-left font-bold">Nama Akun</th>
                        <th className="py-2.5 px-3 text-left font-bold">Keterangan</th>
                        <th className="py-2.5 px-3 text-right font-bold w-32">Debit (Rp)</th>
                        <th className="py-2.5 px-3 text-right font-bold w-32">Kredit (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.map((entry, idx) => (
                        <tr key={idx} className={`${
                          entry.type === 'Debit' ? 'bg-blue-50/40 hover:bg-blue-50' : 'bg-emerald-50/40 hover:bg-emerald-50'
                        } transition`}>
                          <td className="py-2.5 px-3 text-slate-500 font-mono">{entry.no}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {entry.coaCode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{entry.coaName}</td>
                          <td className="py-2.5 px-3 text-slate-500 italic truncate max-w-[180px]">{entry.description}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-800">
                            {entry.type === 'Debit' ? formatRupiah(entry.amount) : '–'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-800">
                            {entry.type === 'Kredit' ? formatRupiah(entry.amount) : '–'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-800 text-white font-bold">
                        <td colSpan={4} className="py-2.5 px-3 text-sm uppercase tracking-wider">Total</td>
                        <td className="py-2.5 px-3 text-right font-mono text-blue-200">{formatRupiah(totalDebit)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-200">{formatRupiah(totalKredit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Balance Check */}
                <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
                  isBalanced ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {isBalanced ? (
                    <><CheckCircle className="w-4 h-4 text-emerald-600" /> Jurnal Seimbang – Debit = Kredit = {formatRupiah(totalDebit)}</>
                  ) : (
                    <><AlertTriangle className="w-4 h-4 text-rose-600" /> Jurnal Tidak Seimbang! Selisih: {formatRupiah(Math.abs(totalDebit - totalKredit))}</>
                  )}
                </div>

                {/* Catatan */}
                <p className="text-[10px] text-slate-400 mt-2">
                  * Jurnal ini bersifat ilustratif berdasarkan data pengajuan. Posting jurnal definitif terjadi saat status <strong>Lunas</strong>.
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 pb-5 flex justify-end">
                <button
                  onClick={() => setJournalModalPR(null)}
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition shadow-xs"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}


