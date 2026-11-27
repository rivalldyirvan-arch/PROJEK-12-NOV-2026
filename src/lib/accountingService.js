/**
 * Core Accounting Engine (Double Entry, Penomoran Jurnal, Validasi Periode, & Pemetaan COA)
 * Mengikuti prinsip akuntansi berterima umum di Indonesia (SAK).
 */

export const JOURNAL_TYPES = [
  { type: 'Jurnal Umum', prefix: 'GEN', label: 'Jurnal Umum (General Journal)' },
  { type: 'Jurnal Penjualan', prefix: 'SAL', label: 'Jurnal Penjualan (Sales Journal)' },
  { type: 'Jurnal Pembelian', prefix: 'PUR', label: 'Jurnal Pembelian (Purchase Journal)' },
  { type: 'Jurnal Penerimaan Kas', prefix: 'CRJ', label: 'Jurnal Penerimaan Kas (Cash Receipt)' },
  { type: 'Jurnal Pengeluaran Kas', prefix: 'CDJ', label: 'Jurnal Pengeluaran Kas (Cash Disbursement)' },
  { type: 'Jurnal Bank', prefix: 'BNK', label: 'Jurnal Bank (Bank Journal)' },
  { type: 'Jurnal Penyesuaian', prefix: 'ADJ', label: 'Jurnal Penyesuaian (Adjusting Journal)' },
  { type: 'Jurnal Penyusutan', prefix: 'DEP', label: 'Jurnal Penyusutan (Depreciation Journal)' },
  { type: 'Jurnal Akrual', prefix: 'ACR', label: 'Jurnal Akrual (Accrual Journal)' },
  { type: 'Jurnal Pembalik', prefix: 'REV', label: 'Jurnal Pembalik (Reversing Journal)' },
  { type: 'Jurnal Penutup', prefix: 'CLS', label: 'Jurnal Penutup (Closing Journal)' }
];

export const COA_CATEGORIES = [
  { key: 'Asset', label: 'Aset', normalBalance: 'Debit' },
  { key: 'Liability', label: 'Kewajiban', normalBalance: 'Credit' },
  { key: 'Equity', label: 'Ekuitas', normalBalance: 'Credit' },
  { key: 'Revenue', label: 'Pendapatan', normalBalance: 'Credit' },
  { key: 'COGS', label: 'Harga Pokok Penjualan', normalBalance: 'Debit' },
  { key: 'Expense', label: 'Beban Operasional', normalBalance: 'Debit' },
  { key: 'Other Revenue', label: 'Pendapatan Lain-lain', normalBalance: 'Credit' },
  { key: 'Other Expense', label: 'Beban Lain-lain', normalBalance: 'Debit' }
];

export const DEFAULT_JOURNAL_SEQUENCES = JOURNAL_TYPES.map((jt) => ({
  id: `seq-${jt.prefix.toLowerCase()}`,
  journalType: jt.type,
  prefix: jt.prefix,
  formatPattern: '{PREFIX}-{YYYY}{MM}-{SEQ}',
  seqDigits: 4,
  lastNumber: 0,
  resetMonthly: true
}));

export const DEFAULT_COA_MAPPINGS = [
  { id: 'map-sales', mappingKey: 'default_sales', label: 'Pendapatan Penjualan Default', moduleGroup: 'Penjualan', accountCode: '4101', description: 'Akun kredit pendapatan utama saat faktur penjualan diposting' },
  { id: 'map-sales-disc', mappingKey: 'default_sales_discount', label: 'Diskon / Retur Penjualan', moduleGroup: 'Penjualan', accountCode: '4-40201', description: 'Akun debit pengurang pendapatan penjualan' },
  { id: 'map-ar', mappingKey: 'default_ar', label: 'Piutang Usaha (AR)', moduleGroup: 'Piutang', accountCode: '1120', description: 'Akun piutang dagang pelanggan' },
  { id: 'map-purchase', mappingKey: 'default_purchase_expense', label: 'Beban Pembelian / Pengadaan', moduleGroup: 'Pembelian', accountCode: '6105', description: 'Akun beban default saat transaksi pembelian' },
  { id: 'map-ap', mappingKey: 'default_ap', label: 'Utang Usaha (AP)', moduleGroup: 'Utang', accountCode: '2101', description: 'Akun hutang usaha rekanan/vendor' },
  { id: 'map-cash', mappingKey: 'default_cash', label: 'Kas Kecil / Kas Operasional', moduleGroup: 'Kas & Bank', accountCode: '1101', description: 'Akun kas default untuk transaksi tunai' },
  { id: 'map-bank', mappingKey: 'default_bank', label: 'Bank Operasional Utama', moduleGroup: 'Kas & Bank', accountCode: '1102', description: 'Akun bank default untuk transfer & pelunasan' },
  { id: 'map-ppn-in', mappingKey: 'default_ppn_masukan', label: 'PPN Masukan (Input VAT)', moduleGroup: 'Pajak', accountCode: '1601', description: 'Akun PPN Masukan atas pembelian' },
  { id: 'map-ppn-out', mappingKey: 'default_ppn_keluaran', label: 'PPN Keluaran (Output VAT)', moduleGroup: 'Pajak', accountCode: '2115', description: 'Akun PPN Keluaran atas penjualan' },
  { id: 'map-pph23', mappingKey: 'default_pph23_payable', label: 'Utang Pajak PPh 23', moduleGroup: 'Pajak', accountCode: '2113', description: 'Akun pemotongan PPh 23' },
  { id: 'map-inventory', mappingKey: 'default_inventory', label: 'Persediaan Barang Dagang', moduleGroup: 'Persediaan', accountCode: '1130', description: 'Akun persediaan barang dagang' },
  { id: 'map-asset', mappingKey: 'default_fixed_asset', label: 'Aset Tetap Peralatan & Server', moduleGroup: 'Aset Tetap', accountCode: '1201', description: 'Akun kapitalisasi aset tetap default' },
  { id: 'map-retained', mappingKey: 'default_retained_earnings', label: 'Laba Ditahan (Retained Earnings)', moduleGroup: 'Ekuitas', accountCode: '3201', description: 'Akun tujuan pemindahan laba/rugi saat closing' },
  { id: 'map-summary', mappingKey: 'default_income_summary', label: 'Ikhtisar Laba Rugi', moduleGroup: 'Closing', accountCode: '3901', description: 'Akun penampung sementara saat jurnal penutup' }
];

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function getPeriodCodeFromDate(dateStr) {
  if (!dateStr || dateStr.length < 7) return new Date().toISOString().slice(0, 7);
  return dateStr.slice(0, 7); // YYYY-MM
}

export function formatPeriodName(periodCode) {
  if (!periodCode || !periodCode.includes('-')) return periodCode || '-';
  const [y, m] = periodCode.split('-');
  const monthIdx = parseInt(m, 10) - 1;
  return `${MONTH_NAMES_ID[monthIdx] || m} ${y}`;
}

export function getDefaultPeriods() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const list = [];
  for (let offset = -1; offset <= 1; offset++) {
    const d = new Date(y, (m - 1) + offset, 1);
    const fy = d.getFullYear();
    const pm = d.getMonth() + 1;
    const code = `${fy}-${String(pm).padStart(2, '0')}`;
    list.push({
      id: `per-${code}`,
      periodCode: code,
      fiscalYear: fy,
      periodMonth: pm,
      periodName: formatPeriodName(code),
      quarter: Math.ceil(pm / 3),
      status: 'Open',
      openedAt: new Date().toISOString(),
      openedBy: 'Sistem'
    });
  }
  return list;
}

/**
 * Generate nomor jurnal otomatis berdasarkan jenis jurnal, tanggal, dan konfigurasi sequence.
 */
export function generateJournalNumber(journalType, entryDate, existingJournals = [], sequences = DEFAULT_JOURNAL_SEQUENCES) {
  const seqCfg = sequences.find(s => s.journalType === journalType)
    || DEFAULT_JOURNAL_SEQUENCES.find(s => s.journalType === journalType)
    || { prefix: 'GEN', formatPattern: '{PREFIX}-{YYYY}{MM}-{SEQ}', seqDigits: 4, resetMonthly: true };

  const dateObj = entryDate ? new Date(entryDate) : new Date();
  const yyyy = String(isNaN(dateObj.getTime()) ? new Date().getFullYear() : dateObj.getFullYear());
  const mm = String(isNaN(dateObj.getTime()) ? (new Date().getMonth() + 1) : (dateObj.getMonth() + 1)).padStart(2, '0');
  const prefix = seqCfg.prefix || 'GEN';
  const digits = Number(seqCfg.seqDigits) || 4;

  const baseHead = (seqCfg.formatPattern || '{PREFIX}-{YYYY}{MM}-{SEQ}')
    .replace('{PREFIX}', prefix)
    .replace('{YYYY}', yyyy)
    .replace('{MM}', mm)
    .split('{SEQ}')[0];

  const matchingSeqs = existingJournals
    .map(j => j.entryNumber || '')
    .filter(num => seqCfg.resetMonthly ? num.startsWith(baseHead) : num.startsWith(prefix))
    .map(num => {
      const parts = num.split('-');
      const last = parseInt(parts[parts.length - 1], 10);
      return Number.isNaN(last) ? 0 : last;
    });

  const nextSeq = matchingSeqs.length > 0 ? Math.max(...matchingSeqs) + 1 : 1;
  const seqStr = String(nextSeq).padStart(digits, '0');

  return (seqCfg.formatPattern || '{PREFIX}-{YYYY}{MM}-{SEQ}')
    .replace('{PREFIX}', prefix)
    .replace('{YYYY}', yyyy)
    .replace('{MM}', mm)
    .replace('{SEQ}', seqStr);
}

/**
 * Validasi Double Entry Accounting sebelum simpan / posting.
 */
export function validateJournalEntry({ entry, lines, periods = [], existingJournals = [], targetStatus = 'Posted' }) {
  const errors = [];

  if (!entry.entryDate) {
    errors.push('Tanggal transaksi wajib diisi.');
  }
  if (!entry.description || !entry.description.trim()) {
    errors.push('Deskripsi transaksi wajib diisi.');
  }

  const periodCode = entry.periodCode || getPeriodCodeFromDate(entry.entryDate);
  const periodObj = periods.find(p => p.periodCode === periodCode);
  if (targetStatus === 'Posted' && periodObj && (periodObj.status === 'Closed' || periodObj.status === 'Locked')) {
    errors.push(`Periode akuntansi ${periodObj.periodName || periodCode} berstatus ${periodObj.status}. Posting baru tidak diizinkan.`);
  }

  // Cek referensi duplikat (jika referenceNo diisi dan bukan reversal)
  if (entry.referenceNo && entry.referenceNo.trim() && entry.journalType !== 'Jurnal Pembalik') {
    const dupRef = existingJournals.find(j =>
      j.id !== entry.id &&
      j.status !== 'Void' &&
      j.status !== 'Reversed' &&
      j.referenceNo &&
      j.referenceNo.trim().toLowerCase() === entry.referenceNo.trim().toLowerCase() &&
      j.sourceModule === (entry.sourceModule || 'Manual')
    );
    if (dupRef) {
      errors.push(`Nomor referensi "${entry.referenceNo}" sudah digunakan pada jurnal ${dupRef.entryNumber}.`);
    }
  }

  const validLines = (lines || []).filter(l => l.accountCode && (Number(l.debit) > 0 || Number(l.credit) > 0));
  if (validLines.length < 2) {
    errors.push('Jurnal wajib memiliki minimal 2 baris akun (Debit dan Kredit).');
  }

  let totalDebit = 0;
  let totalCredit = 0;

  (lines || []).forEach((line, idx) => {
    const d = Number(line.debit) || 0;
    const c = Number(line.credit) || 0;
    if (d < 0 || c < 0) {
      errors.push(`Baris #${idx + 1}: Nilai Debit/Kredit tidak boleh negatif.`);
    }
    if (d > 0 && c > 0) {
      errors.push(`Baris #${idx + 1}: Satu baris tidak boleh mengisi Debit dan Kredit sekaligus.`);
    }
    if ((d > 0 || c > 0) && !line.accountCode) {
      errors.push(`Baris #${idx + 1}: Akun COA wajib dipilih.`);
    }
    totalDebit += d;
    totalCredit += c;
  });

  if (targetStatus === 'Posted') {
    if (totalDebit <= 0 || totalCredit <= 0) {
      errors.push('Total Debit dan Total Kredit harus lebih besar dari 0 untuk diposting.');
    }
    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      errors.push(`Jurnal tidak seimbang! Selisih Debit & Kredit sebesar Rp ${Math.abs(totalDebit - totalCredit).toLocaleString('id-ID')}.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    totalDebit,
    totalCredit,
    periodCode
  };
}

/**
 * Bangun baris pembalik (Reversal) dengan menukar Debit <-> Kredit.
 */
export function buildReversalLines(lines = []) {
  return lines.map(l => ({
    accountCode: l.accountCode,
    accountName: l.accountName,
    description: `[Pembalik] ${l.description || ''}`.trim(),
    debit: Number(l.credit) || 0,
    credit: Number(l.debit) || 0
  }));
}

/**
 * Status jurnal yang sah masuk ke Buku Besar & Neraca Saldo.
 * Catatan: 'Reversed' tetap dihitung karena jurnal pembaliknya ('Posted') yang menetralkan saldonya.
 */
export function isEffectivePostedStatus(status) {
  return status === 'Posted' || status === 'Reversed';
}

/**
 * Hitung agregasi saldo per akun dari jurnal yang sudah diposting (Single Source of Truth Buku Besar).
 */
export function calculateBalancesFromJournals(coaList = [], journalEntries = []) {
  const balanceMap = {};
  coaList.forEach(c => {
    balanceMap[c.code] = { debit: 0, credit: 0, netBalance: 0 };
  });

  journalEntries
    .filter(j => isEffectivePostedStatus(j.status))
    .forEach(j => {
      (j.lines || []).forEach(line => {
        const code = line.accountCode;
        if (!balanceMap[code]) {
          balanceMap[code] = { debit: 0, credit: 0, netBalance: 0 };
        }
        balanceMap[code].debit += Number(line.debit) || 0;
        balanceMap[code].credit += Number(line.credit) || 0;
      });
    });

  coaList.forEach(c => {
    const m = balanceMap[c.code];
    m.netBalance = c.normalBalance === 'Debit'
      ? (m.debit - m.credit)
      : (m.credit - m.debit);
  });

  return balanceMap;
}

/**
 * Hitung Buku Besar (General Ledger) untuk satu akun pada rentang tanggal & filter tertentu.
 */
export function buildGeneralLedger({
  account,
  journalEntries = [],
  startDate = '',
  endDate = '',
  journalType = 'Semua',
  department = 'Semua',
  searchQuery = ''
}) {
  if (!account) return null;

  const isDebitNormal = account.normalBalance === 'Debit';
  const baseOpening = Number(account.balance) || 0;

  // Semua baris efektif untuk akun ini, diurutkan kronologis (tanggal naik)
  const allAccountEntries = [];
  journalEntries
    .filter(j => isEffectivePostedStatus(j.status))
    .forEach(j => {
      (j.lines || []).forEach((line, lineIdx) => {
        if (line.accountCode === account.code) {
          allAccountEntries.push({
            id: `${j.id}-${lineIdx}`,
            journalId: j.id,
            entryNumber: j.entryNumber,
            entryDate: j.entryDate,
            journalType: j.journalType || 'Jurnal Umum',
            sourceModule: j.sourceModule || 'Manual',
            referenceNo: j.referenceNo || '-',
            department: j.department || '-',
            description: line.description || j.description,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
            status: j.status,
            journal: j
          });
        }
      });
    });

  allAccountEntries.sort((a, b) => {
    if (a.entryDate !== b.entryDate) return a.entryDate.localeCompare(b.entryDate);
    return (a.entryNumber || '').localeCompare(b.entryNumber || '');
  });

  // Hitung Saldo Awal sebelum startDate
  let openingBalance = baseOpening;
  allAccountEntries.forEach(item => {
    if (startDate && item.entryDate < startDate) {
      openingBalance += isDebitNormal ? (item.debit - item.credit) : (item.credit - item.debit);
    }
  });

  // Filter transaksi dalam periode
  const q = (searchQuery || '').trim().toLowerCase();
  const periodRows = [];
  let runningBalance = openingBalance;
  let totalPeriodDebit = 0;
  let totalPeriodCredit = 0;

  allAccountEntries.forEach(item => {
    if (startDate && item.entryDate < startDate) return;
    if (endDate && item.entryDate > endDate) return;

    // Update running balance berdasarkan seluruh mutasi sah periode
    runningBalance += isDebitNormal ? (item.debit - item.credit) : (item.credit - item.debit);

    const matchType = journalType === 'Semua' || item.journalType === journalType;
    const matchDept = department === 'Semua' || item.department === department;
    const matchQ = !q ||
      (item.entryNumber || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.referenceNo || '').toLowerCase().includes(q);

    if (matchType && matchDept && matchQ) {
      totalPeriodDebit += item.debit;
      totalPeriodCredit += item.credit;
      periodRows.push({
        ...item,
        runningBalance
      });
    }
  });

  return {
    account,
    openingBalance,
    rows: periodRows,
    totalPeriodDebit,
    totalPeriodCredit,
    closingBalance: runningBalance
  };
}

/**
 * Hitung Neraca Saldo (Trial Balance) 8 Kolom untuk rentang tanggal tertentu.
 */
export function buildTrialBalance({ coaList = [], journalEntries = [], startDate = '', endDate = '' }) {
  const effectiveJournals = journalEntries.filter(j => isEffectivePostedStatus(j.status));

  // Deteksi jurnal tidak seimbang (untuk validasi & pemblokiran closing)
  const unbalancedJournals = effectiveJournals.filter(j => {
    const d = (j.lines || []).reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const c = (j.lines || []).reduce((s, l) => s + (Number(l.credit) || 0), 0);
    return Math.abs(d - c) >= 0.01;
  });

  const rows = coaList.map(acc => {
    const isDebitNormal = acc.normalBalance === 'Debit';
    const masterBal = Number(acc.balance) || 0;

    let openNet = isDebitNormal ? masterBal : -masterBal; // positif = Debit, negatif = Kredit
    let mutDebit = 0;
    let mutCredit = 0;

    effectiveJournals.forEach(j => {
      const inBefore = startDate && j.entryDate < startDate;
      const inRange = (!startDate || j.entryDate >= startDate) && (!endDate || j.entryDate <= endDate);

      (j.lines || []).forEach(line => {
        if (line.accountCode !== acc.code) return;
        const d = Number(line.debit) || 0;
        const c = Number(line.credit) || 0;
        if (inBefore) {
          openNet += (d - c);
        } else if (inRange) {
          mutDebit += d;
          mutCredit += c;
        }
      });
    });

    const openDebit = openNet > 0 ? openNet : 0;
    const openCredit = openNet < 0 ? Math.abs(openNet) : 0;

    const endNet = openNet + (mutDebit - mutCredit);
    const endDebit = endNet > 0 ? endNet : 0;
    const endCredit = endNet < 0 ? Math.abs(endNet) : 0;

    return {
      code: acc.code,
      name: acc.name,
      category: acc.category,
      normalBalance: acc.normalBalance,
      openDebit,
      openCredit,
      mutDebit,
      mutCredit,
      endDebit,
      endCredit,
      hasActivity: openDebit > 0 || openCredit > 0 || mutDebit > 0 || mutCredit > 0
    };
  });

  const totals = rows.reduce((t, r) => ({
    openDebit: t.openDebit + r.openDebit,
    openCredit: t.openCredit + r.openCredit,
    mutDebit: t.mutDebit + r.mutDebit,
    mutCredit: t.mutCredit + r.mutCredit,
    endDebit: t.endDebit + r.endDebit,
    endCredit: t.endCredit + r.endCredit
  }), { openDebit: 0, openCredit: 0, mutDebit: 0, mutCredit: 0, endDebit: 0, endCredit: 0 });

  const isBalanced =
    Math.abs(totals.openDebit - totals.openCredit) < 0.01 &&
    Math.abs(totals.mutDebit - totals.mutCredit) < 0.01 &&
    Math.abs(totals.endDebit - totals.endCredit) < 0.01 &&
    unbalancedJournals.length === 0;

  return {
    rows,
    totals,
    isBalanced,
    diffEnd: Math.abs(totals.endDebit - totals.endCredit),
    unbalancedJournals
  };
}

export const ADJUSTMENT_TYPES = [
  { key: 'accrued_expense', label: 'Beban yang Masih Harus Dibayar (Accrued Expenses)', defaultDebit: '6106', defaultCredit: '2102' },
  { key: 'accrued_revenue', label: 'Pendapatan yang Masih Harus Diterima (Accrued Revenue)', defaultDebit: '1120', defaultCredit: '4101' },
  { key: 'prepaid_expense', label: 'Beban Dibayar di Muka (Prepaid Expenses)', defaultDebit: '6102', defaultCredit: '1140' },
  { key: 'unearned_revenue', label: 'Pendapatan Diterima di Muka (Unearned Revenue)', defaultDebit: '2101', defaultCredit: '4102' },
  { key: 'depreciation', label: 'Penyusutan Aset Tetap (Depreciation)', defaultDebit: '6107', defaultCredit: '1201' },
  { key: 'amortization', label: 'Amortisasi Aset Takberwujud', defaultDebit: '6105', defaultCredit: '1201' },
  { key: 'inventory_adj', label: 'Penyesuaian Persediaan', defaultDebit: '5101', defaultCredit: '1130' },
  { key: 'bad_debt', label: 'Cadangan Kerugian Piutang', defaultDebit: '8103', defaultCredit: '1120' },
  { key: 'other_adj', label: 'Penyesuaian Akuntansi Lainnya', defaultDebit: '6105', defaultCredit: '2101' }
];

export function isNominalCategory(acc) {
  return ['Revenue', 'COGS', 'Expense', 'Other Revenue', 'Other Expense'].includes(acc.category);
}

/**
 * Hitung Neraca Saldo Setelah Penyesuaian (Adjusted Trial Balance) 8 Kolom.
 */
export function buildAdjustedTrialBalance({ coaList = [], journalEntries = [], startDate = '', endDate = '' }) {
  const effective = journalEntries.filter(j => isEffectivePostedStatus(j.status) && j.journalType !== 'Jurnal Penutup');

  const rows = coaList.map(acc => {
    const isDebitNormal = acc.normalBalance === 'Debit';
    const masterBal = Number(acc.balance) || 0;
    let beforeNet = isDebitNormal ? masterBal : -masterBal;
    let adjNet = 0;

    effective.forEach(j => {
      if (endDate && j.entryDate > endDate) return;
      const inAdj = j.journalType === 'Jurnal Penyesuaian' && (!startDate || j.entryDate >= startDate);

      (j.lines || []).forEach(l => {
        if (l.accountCode !== acc.code) return;
        const delta = (Number(l.debit) || 0) - (Number(l.credit) || 0);
        if (inAdj) {
          adjNet += delta;
        } else {
          beforeNet += delta;
        }
      });
    });

    const afterNet = beforeNet + adjNet;
    const beforeDebit = beforeNet > 0 ? beforeNet : 0;
    const beforeCredit = beforeNet < 0 ? Math.abs(beforeNet) : 0;
    const adjDebit = adjNet > 0 ? adjNet : 0;
    const adjCredit = adjNet < 0 ? Math.abs(adjNet) : 0;
    const afterDebit = afterNet > 0 ? afterNet : 0;
    const afterCredit = afterNet < 0 ? Math.abs(afterNet) : 0;

    return {
      code: acc.code,
      name: acc.name,
      category: acc.category,
      subCategory: acc.subCategory,
      normalBalance: acc.normalBalance,
      beforeDebit,
      beforeCredit,
      adjDebit,
      adjCredit,
      afterDebit,
      afterCredit,
      afterNet,
      hasActivity: beforeDebit > 0 || beforeCredit > 0 || adjDebit > 0 || adjCredit > 0 || afterDebit > 0 || afterCredit > 0
    };
  });

  const totals = rows.reduce((t, r) => ({
    beforeDebit: t.beforeDebit + r.beforeDebit,
    beforeCredit: t.beforeCredit + r.beforeCredit,
    adjDebit: t.adjDebit + r.adjDebit,
    adjCredit: t.adjCredit + r.adjCredit,
    afterDebit: t.afterDebit + r.afterDebit,
    afterCredit: t.afterCredit + r.afterCredit
  }), { beforeDebit: 0, beforeCredit: 0, adjDebit: 0, adjCredit: 0, afterDebit: 0, afterCredit: 0 });

  const isBalanced =
    Math.abs(totals.beforeDebit - totals.beforeCredit) < 0.01 &&
    Math.abs(totals.adjDebit - totals.adjCredit) < 0.01 &&
    Math.abs(totals.afterDebit - totals.afterCredit) < 0.01;

  return { rows, totals, isBalanced };
}

/**
 * Buat Preview Jurnal Penutup (Closing Entries) dari Neraca Saldo Setelah Penyesuaian.
 */
export function generateClosingEntriesPreview({
  coaList = [],
  journalEntries = [],
  startDate = '',
  endDate = '',
  incomeSummaryCode = '3901',
  retainedEarningsCode = '3201'
}) {
  const adjTb = buildAdjustedTrialBalance({ coaList, journalEntries, startDate, endDate });
  const getName = (code, fb) => coaList.find(c => c.code === code)?.name || fb;

  const lines = [];
  let totalRevenueClosed = 0;
  let totalExpenseClosed = 0;

  // 1. Tutup seluruh akun Pendapatan & Beban/HPP
  adjTb.rows.forEach(r => {
    const acc = coaList.find(c => c.code === r.code);
    if (!acc || !isNominalCategory(acc)) return;
    if (Math.abs(r.afterNet) < 0.01) return;

    // r.afterNet > 0 artinya bersaldo Debit, < 0 artinya bersaldo Kredit
    if (r.afterNet < 0) {
      const amt = Math.abs(r.afterNet);
      lines.push({
        accountCode: r.code,
        accountName: r.name,
        description: `Penutupan akun ${r.name}`,
        debit: amt,
        credit: 0
      });
      totalRevenueClosed += amt;
    } else {
      const amt = r.afterNet;
      lines.push({
        accountCode: r.code,
        accountName: r.name,
        description: `Penutupan akun ${r.name}`,
        debit: 0,
        credit: amt
      });
      totalExpenseClosed += amt;
    }
  });

  const netIncome = totalRevenueClosed - totalExpenseClosed;

  // 2. Pindahkan Ikhtisar Laba Rugi ke Laba Ditahan
  if (Math.abs(netIncome) >= 0.01) {
    if (netIncome > 0) {
      lines.push({
        accountCode: retainedEarningsCode,
        accountName: getName(retainedEarningsCode, 'Laba Ditahan (Retained Earnings)'),
        description: 'Pemindahan Laba Bersih Periode ke Laba Ditahan',
        debit: 0,
        credit: netIncome
      });
    } else {
      lines.push({
        accountCode: retainedEarningsCode,
        accountName: getName(retainedEarningsCode, 'Laba Ditahan (Retained Earnings)'),
        description: 'Pemindahan Rugi Bersih Periode ke Laba Ditahan',
        debit: Math.abs(netIncome),
        credit: 0
      });
    }
  }

  // Catat ringkasan Ikhtisar Laba Rugi (opsional eksplisit: Total Pendapatan - Total Beban = netIncome, sehingga jurnal langsung seimbang!)
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return {
    lines,
    totalRevenueClosed,
    totalExpenseClosed,
    netIncome,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    incomeSummaryCode,
    retainedEarningsCode,
    adjTbBalanced: adjTb.isBalanced
  };
}

/**
 * Hitung Neraca Saldo Setelah Penutupan (Post-Closing Trial Balance).
 * Hanya akun permanen (Asset, Liability, Equity) yang bersaldo; akun nominal harus 0.
 */
export function buildPostClosingTrialBalance({ coaList = [], journalEntries = [], endDate = '' }) {
  const effective = journalEntries.filter(j => isEffectivePostedStatus(j.status));

  const rows = coaList.map(acc => {
    const isDebitNormal = acc.normalBalance === 'Debit';
    const masterBal = Number(acc.balance) || 0;
    let net = isDebitNormal ? masterBal : -masterBal;

    effective.forEach(j => {
      if (endDate && j.entryDate > endDate) return;
      (j.lines || []).forEach(l => {
        if (l.accountCode !== acc.code) return;
        net += (Number(l.debit) || 0) - (Number(l.credit) || 0);
      });
    });

    const debit = net > 0.009 ? net : 0;
    const credit = net < -0.009 ? Math.abs(net) : 0;
    const isNominal = isNominalCategory(acc);

    return {
      code: acc.code,
      name: acc.name,
      category: acc.category,
      isNominal,
      debit,
      credit,
      hasBalance: debit > 0 || credit > 0
    };
  });

  const permanentRows = rows.filter(r => !r.isNominal);
  const nonZeroNominal = rows.filter(r => r.isNominal && r.hasBalance);

  const totalDebit = permanentRows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = permanentRows.reduce((s, r) => s + r.credit, 0);

  return {
    rows: permanentRows,
    nonZeroNominal,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 && nonZeroNominal.length === 0
  };
}


// ============================================================
//  PHASE 5 — LAPORAN KEUANGAN (FINANCIAL STATEMENTS)
// ============================================================

/**
 * Hitung Net Balance setiap akun dari daftar jurnal yang sudah diposting.
 * Net = masterBalance (saldo awal) + agregasi debit-kredit dari jurnal.
 * @param {object} acc - COA account object
 * @param {Array}  effectiveJournals - jurnal dengan status Posted/Reversed
 * @param {string} upToDate - 'YYYY-MM-DD', batas tanggal (inklusive)
 * @returns {number} net balance (positif=debit normal, negatif=kredit normal untuk akun kredit-normal)
 */
function getAccountNetBalance(acc, effectiveJournals, upToDate = '') {
  const isDebitNormal = acc.normalBalance === 'Debit';
  const masterBal = Number(acc.balance) || 0;
  let net = isDebitNormal ? masterBal : -masterBal;

  effectiveJournals.forEach(j => {
    if (upToDate && j.entryDate > upToDate) return;
    (j.lines || []).forEach(l => {
      if (l.accountCode !== acc.code) return;
      net += (Number(l.debit) || 0) - (Number(l.credit) || 0);
    });
  });
  return net; // positif = debit, negatif = kredit
}

/**
 * Mengambil transaksi jurnal hanya dalam rentang periode startDate-endDate.
 * Berbeda dengan getAccountNetBalance yang mengakumulasi dari awal.
 */
function getPeriodBalance(accCode, effectiveJournals, startDate, endDate) {
  let debit = 0;
  let credit = 0;
  effectiveJournals.forEach(j => {
    if (startDate && j.entryDate < startDate) return;
    if (endDate && j.entryDate > endDate) return;
    (j.lines || []).forEach(l => {
      if (l.accountCode !== accCode) return;
      debit += Number(l.debit) || 0;
      credit += Number(l.credit) || 0;
    });
  });
  return { debit, credit, net: debit - credit };
}

/**
 * Hitung rata-rata saldo dua titik waktu untuk rasio aktivitas.
 */
function averageBalance(start, end) {
  return (start + end) / 2;
}

// ----------------------------------------------------------------
// A. LAPORAN LABA RUGI (INCOME STATEMENT)
// ----------------------------------------------------------------
/**
 * Susun Laporan Laba Rugi berdasarkan COA dan jurnal.
 * @param {object} param
 * @param {Array}  param.coaList
 * @param {Array}  param.journalEntries
 * @param {string} param.startDate  YYYY-MM-DD
 * @param {string} param.endDate    YYYY-MM-DD
 * @returns {object} incomeStatement
 */
export function buildIncomeStatement({ coaList = [], journalEntries = [], startDate = '', endDate = '' }) {
  const effective = journalEntries.filter(j => isEffectivePostedStatus(j.status));

  // Ambil semua akun dan hitung net movement selama periode (bukan kumulatif)
  const rows = coaList.map(acc => {
    const pb = getPeriodBalance(acc.code, effective, startDate, endDate);
    // Untuk akun kredit-normal (Revenue, Other Revenue): nilai positif = kredit lebih besar → pendapatan
    // Untuk akun debit-normal (COGS, Expense, Other Expense): nilai positif = debit lebih besar → beban
    const isDebitNormal = acc.normalBalance === 'Debit';
    const amount = isDebitNormal ? (pb.debit - pb.credit) : (pb.credit - pb.debit);
    return {
      code: acc.code,
      name: acc.name,
      category: acc.category,
      subCategory: acc.subCategory || '',
      normalBalance: acc.normalBalance,
      amount, // positif selalu berarti "angka yang bermakna" sesuai sifat akun
      debit: pb.debit,
      credit: pb.credit
    };
  });

  // Kelompok Revenue (Pendapatan Usaha)
  const revenueRows = rows.filter(r => r.category === 'Revenue');
  const totalRevenue = revenueRows.reduce((s, r) => s + r.amount, 0);

  // Harga Pokok Penjualan (COGS / HPP)
  const cogsRows = rows.filter(r => r.category === 'COGS');
  const totalCOGS = cogsRows.reduce((s, r) => s + r.amount, 0);

  // Laba Kotor
  const grossProfit = totalRevenue - totalCOGS;

  // Beban Operasional
  const expenseRows = rows.filter(r => r.category === 'Expense');
  const totalExpense = expenseRows.reduce((s, r) => s + r.amount, 0);

  // Laba Operasional (EBIT)
  const operatingProfit = grossProfit - totalExpense;

  // Pendapatan Lain-lain
  const otherRevenueRows = rows.filter(r => r.category === 'Other Revenue');
  const totalOtherRevenue = otherRevenueRows.reduce((s, r) => s + r.amount, 0);

  // Beban Lain-lain
  const otherExpenseRows = rows.filter(r => r.category === 'Other Expense');
  const totalOtherExpense = otherExpenseRows.reduce((s, r) => s + r.amount, 0);

  // Laba Sebelum Pajak (EBT)
  const profitBeforeTax = operatingProfit + totalOtherRevenue - totalOtherExpense;

  // Pajak Penghasilan (cari akun pajak di Other Expense atau dari kode khusus)
  const taxRows = rows.filter(r =>
    r.category === 'Other Expense' &&
    (r.name.toLowerCase().includes('pajak penghasilan') ||
      r.name.toLowerCase().includes('income tax') ||
      r.code === '8201')
  );
  const totalTax = taxRows.reduce((s, r) => s + r.amount, 0);

  // Laba Bersih
  const netProfit = profitBeforeTax - totalTax;

  return {
    startDate,
    endDate,
    revenueRows,
    totalRevenue,
    cogsRows,
    totalCOGS,
    grossProfit,
    grossProfitMargin: totalRevenue !== 0 ? (grossProfit / totalRevenue) * 100 : 0,
    expenseRows,
    totalExpense,
    operatingProfit,
    operatingProfitMargin: totalRevenue !== 0 ? (operatingProfit / totalRevenue) * 100 : 0,
    otherRevenueRows,
    totalOtherRevenue,
    otherExpenseRows,
    totalOtherExpense,
    profitBeforeTax,
    taxRows,
    totalTax,
    netProfit,
    netProfitMargin: totalRevenue !== 0 ? (netProfit / totalRevenue) * 100 : 0,
    isProfit: netProfit >= 0
  };
}

// ----------------------------------------------------------------
// B. NERACA / BALANCE SHEET
// ----------------------------------------------------------------
/**
 * Susun Neraca per tanggal tertentu.
 * @param {object} param
 * @param {Array}  param.coaList
 * @param {Array}  param.journalEntries
 * @param {string} param.asOfDate  YYYY-MM-DD
 * @returns {object} balanceSheet
 */
export function buildBalanceSheet({ coaList = [], journalEntries = [], asOfDate = '' }) {
  const effective = journalEntries.filter(j => isEffectivePostedStatus(j.status));

  const rows = coaList.map(acc => {
    const net = getAccountNetBalance(acc, effective, asOfDate);
    // net: positif = sesuai sifat normal (asset=debit, liab/eq=credit dalam nilai absolut)
    // Untuk asset (debit-normal): net positif = balance positif
    // Untuk liab/equity (credit-normal): net negatif = balance positif (saldo kredit)
    const isDebitNormal = acc.normalBalance === 'Debit';
    const balance = isDebitNormal ? Math.max(net, 0) : Math.max(-net, 0);

    return {
      code: acc.code,
      name: acc.name,
      category: acc.category,
      subCategory: acc.subCategory || '',
      normalBalance: acc.normalBalance,
      balance,
      rawNet: net
    };
  });

  // ASET
  const assetRows = rows.filter(r => r.category === 'Asset');
  // Sub-kelompok aset: Lancar (kode 11xx) vs Tetap (kode 12xx+)
  const currentAssetRows = assetRows.filter(r => r.code.startsWith('11') || r.subCategory === 'Lancar' || r.name.toLowerCase().includes('lancar'));
  const fixedAssetRows = assetRows.filter(r => !currentAssetRows.includes(r));
  const totalCurrentAssets = currentAssetRows.reduce((s, r) => s + r.balance, 0);
  const totalFixedAssets = fixedAssetRows.reduce((s, r) => s + r.balance, 0);
  const totalAssets = assetRows.reduce((s, r) => s + r.balance, 0);

  // KEWAJIBAN
  const liabilityRows = rows.filter(r => r.category === 'Liability');
  const currentLiabilityRows = liabilityRows.filter(r => r.code.startsWith('21') || r.subCategory === 'Jangka Pendek');
  const longTermLiabilityRows = liabilityRows.filter(r => !currentLiabilityRows.includes(r));
  const totalCurrentLiabilities = currentLiabilityRows.reduce((s, r) => s + r.balance, 0);
  const totalLongTermLiabilities = longTermLiabilityRows.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilityRows.reduce((s, r) => s + r.balance, 0);

  // EKUITAS
  const equityRows = rows.filter(r => r.category === 'Equity');
  const totalEquity = equityRows.reduce((s, r) => s + r.balance, 0);

  // Validasi: Aset = Kewajiban + Ekuitas
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1;

  return {
    asOfDate,
    currentAssetRows,
    fixedAssetRows,
    totalCurrentAssets,
    totalFixedAssets,
    totalAssets,
    currentLiabilityRows,
    longTermLiabilityRows,
    totalCurrentLiabilities,
    totalLongTermLiabilities,
    totalLiabilities,
    equityRows,
    totalEquity,
    totalLiabilitiesAndEquity,
    isBalanced,
    difference: totalAssets - totalLiabilitiesAndEquity
  };
}

// ----------------------------------------------------------------
// C. LAPORAN PERUBAHAN EKUITAS
// ----------------------------------------------------------------
/**
 * Susun Laporan Perubahan Ekuitas.
 */
export function buildEquityStatement({ coaList = [], journalEntries = [], startDate = '', endDate = '' }) {
  const effective = journalEntries.filter(j => isEffectivePostedStatus(j.status));

  // Saldo awal ekuitas (sebelum startDate)
  const equityAccounts = coaList.filter(a => a.category === 'Equity');

  const openingEquityRows = equityAccounts.map(acc => {
    const net = getAccountNetBalance(acc, effective, startDate
      ? new Date(new Date(startDate).getTime() - 86400000).toISOString().slice(0, 10)
      : '');
    return { code: acc.code, name: acc.name, balance: Math.max(-net, 0) };
  });
  const openingEquity = openingEquityRows.reduce((s, r) => s + r.balance, 0);

  // Laba/Rugi periode dari Income Statement
  const is = buildIncomeStatement({ coaList, journalEntries, startDate, endDate });
  const netProfit = is.netProfit;

  // Prive/Dividen: cari akun di Equity dengan nama mengandung prive/dividen
  const priveAccounts = equityAccounts.filter(a =>
    a.name.toLowerCase().includes('prive') ||
    a.name.toLowerCase().includes('dividen') ||
    a.name.toLowerCase().includes('drawing')
  );
  let totalPrive = 0;
  priveAccounts.forEach(acc => {
    const pb = getPeriodBalance(acc.code, effective, startDate, endDate);
    totalPrive += pb.debit - pb.credit; // prive mengurangi ekuitas
  });

  // Modal akhir
  const closingEquity = openingEquity + netProfit - totalPrive;

  return {
    startDate,
    endDate,
    openingEquityRows,
    openingEquity,
    netProfit,
    isProfit: netProfit >= 0,
    priveAccounts,
    totalPrive,
    closingEquity,
    equityRows: equityAccounts.map(acc => {
      const net = getAccountNetBalance(acc, effective, endDate);
      return { code: acc.code, name: acc.name, balance: Math.max(-net, 0) };
    })
  };
}

// ----------------------------------------------------------------
// D. LAPORAN ARUS KAS (Metode Tidak Langsung / Indirect Method)
// ----------------------------------------------------------------
/**
 * Susun Laporan Arus Kas.
 */
export function buildCashFlowStatement({
  coaList = [],
  journalEntries = [],
  startDate = '',
  endDate = '',
  priorEndDate = '' // akhir periode sebelumnya untuk hitung perubahan
}) {
  const effective = journalEntries.filter(j => isEffectivePostedStatus(j.status));

  // Helper: saldo akhir suatu tanggal
  const endBal = (acc, dt) => {
    const net = getAccountNetBalance(acc, effective, dt);
    return acc.normalBalance === 'Debit' ? Math.max(net, 0) : Math.max(-net, 0);
  };

  // Laba Bersih
  const is = buildIncomeStatement({ coaList, journalEntries, startDate, endDate });
  const netProfit = is.netProfit;

  // --- AKTIVITAS OPERASI ---
  // Penyusutan (tambah balik non-kas)
  const depAccounts = coaList.filter(a =>
    a.name.toLowerCase().includes('penyusutan') ||
    a.name.toLowerCase().includes('amortisasi') ||
    a.name.toLowerCase().includes('depreciation')
  );
  let totalDepreciation = 0;
  depAccounts.forEach(acc => {
    const pb = getPeriodBalance(acc.code, effective, startDate, endDate);
    totalDepreciation += Math.max(pb.debit - pb.credit, 0);
  });

  // Perubahan modal kerja
  const arAccounts = coaList.filter(a => a.category === 'Asset' && (a.name.toLowerCase().includes('piutang') || a.code.startsWith('1120')));
  const invAccounts = coaList.filter(a => a.category === 'Asset' && (a.name.toLowerCase().includes('persediaan') || a.code.startsWith('1130')));
  const prepaidAccounts = coaList.filter(a => a.category === 'Asset' && (a.name.toLowerCase().includes('dibayar dimuka') || a.name.toLowerCase().includes('prepaid')));
  const apAccounts = coaList.filter(a => a.category === 'Liability' && (a.name.toLowerCase().includes('utang usaha') || a.code.startsWith('2101')));
  const accruedAccounts = coaList.filter(a => a.category === 'Liability' && (a.name.toLowerCase().includes('akrual') || a.name.toLowerCase().includes('terutang') || a.code.startsWith('2102')));

  const calcChange = (accounts, priorDt, curDt, isAsset) => {
    let priorSum = 0;
    let curSum = 0;
    accounts.forEach(acc => {
      priorSum += endBal(acc, priorDt);
      curSum += endBal(acc, curDt);
    });
    const change = curSum - priorSum;
    // Aset meningkat = kas berkurang (negatif), Liab meningkat = kas bertambah (positif)
    return isAsset ? -change : change;
  };

  const prior = priorEndDate || (startDate ? new Date(new Date(startDate).getTime() - 86400000).toISOString().slice(0, 10) : '');
  const changeAR = calcChange(arAccounts, prior, endDate, true);
  const changeInventory = calcChange(invAccounts, prior, endDate, true);
  const changePrepaid = calcChange(prepaidAccounts, prior, endDate, true);
  const changeAP = calcChange(apAccounts, prior, endDate, false);
  const changeAccrued = calcChange(accruedAccounts, prior, endDate, false);

  const operatingCashFlow = netProfit + totalDepreciation + changeAR + changeInventory + changePrepaid + changeAP + changeAccrued;

  // --- AKTIVITAS INVESTASI ---
  const fixedAssetAccounts = coaList.filter(a => a.category === 'Asset' && a.code.startsWith('12'));
  let investingCashFlow = 0;
  fixedAssetAccounts.forEach(acc => {
    const pb = getPeriodBalance(acc.code, effective, startDate, endDate);
    // Pembelian aset = arus kas negatif (debit naik)
    investingCashFlow -= (pb.debit - pb.credit);
  });

  // --- AKTIVITAS PENDANAAN ---
  const loanAccounts = coaList.filter(a => a.category === 'Liability' && (a.name.toLowerCase().includes('utang bank') || a.name.toLowerCase().includes('pinjaman') || a.code.startsWith('22')));
  const capitalAccounts = coaList.filter(a => a.category === 'Equity' && (a.name.toLowerCase().includes('modal') || a.code.startsWith('31')));
  const priveAccountsForCF = coaList.filter(a => a.category === 'Equity' && (a.name.toLowerCase().includes('prive') || a.name.toLowerCase().includes('dividen')));

  let financingCashFlow = 0;
  loanAccounts.forEach(acc => {
    const pb = getPeriodBalance(acc.code, effective, startDate, endDate);
    financingCashFlow += pb.credit - pb.debit; // utang naik = kas masuk
  });
  capitalAccounts.forEach(acc => {
    const pb = getPeriodBalance(acc.code, effective, startDate, endDate);
    financingCashFlow += pb.credit - pb.debit;
  });
  priveAccountsForCF.forEach(acc => {
    const pb = getPeriodBalance(acc.code, effective, startDate, endDate);
    financingCashFlow -= pb.debit - pb.credit;
  });

  // Perubahan kas bersih
  const netCashChange = operatingCashFlow + investingCashFlow + financingCashFlow;

  // Saldo kas
  const cashAccounts = coaList.filter(a => a.category === 'Asset' && (a.code.startsWith('1101') || a.code.startsWith('1102') || a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank')));
  let openingCash = 0;
  let closingCash = 0;
  cashAccounts.forEach(acc => {
    openingCash += endBal(acc, prior);
    closingCash += endBal(acc, endDate);
  });

  return {
    startDate,
    endDate,
    netProfit,
    // Operasi
    totalDepreciation,
    changeAR,
    changeInventory,
    changePrepaid,
    changeAP,
    changeAccrued,
    operatingCashFlow,
    // Investasi
    investingCashFlow,
    fixedAssetAccounts: fixedAssetAccounts.map(acc => {
      const pb = getPeriodBalance(acc.code, effective, startDate, endDate);
      return { code: acc.code, name: acc.name, amount: -(pb.debit - pb.credit) };
    }),
    // Pendanaan
    financingCashFlow,
    // Total
    netCashChange,
    openingCash,
    closingCash,
    reconciled: Math.abs((openingCash + netCashChange) - closingCash) < 1
  };
}

// ----------------------------------------------------------------
// E. RASIO KEUANGAN
// ----------------------------------------------------------------
/**
 * Hitung seluruh rasio keuangan dari data laporan keuangan.
 * Semua kalkulasi berbasis data aktual dari jurnal — tidak ada hardcode.
 */
export function calculateFinancialRatios({
  coaList = [],
  journalEntries = [],
  startDate = '',
  endDate = '',
  priorStartDate = '',
  priorEndDate = ''
}) {
  const effective = journalEntries.filter(j => isEffectivePostedStatus(j.status));

  // Periode berjalan
  const bs = buildBalanceSheet({ coaList, journalEntries, asOfDate: endDate });
  const is = buildIncomeStatement({ coaList, journalEntries, startDate, endDate });

  // Periode sebelumnya (untuk rata-rata)
  const bsPrior = priorEndDate
    ? buildBalanceSheet({ coaList, journalEntries, asOfDate: priorEndDate })
    : bs;

  const safe = (num, den) => (den !== 0 ? num / den : null);
  const pct = (num, den) => (den !== 0 ? (num / den) * 100 : null);

  // Komponen neraca
  const { totalCurrentAssets, totalCurrentLiabilities, totalAssets, totalLiabilities, totalEquity } = bs;
  const persediaanAcc = coaList.filter(a => a.name.toLowerCase().includes('persediaan') || a.code.startsWith('1130'));
  const prepaidAcc = coaList.filter(a => a.name.toLowerCase().includes('dibayar dimuka') || a.name.toLowerCase().includes('prepaid'));
  const kasAcc = coaList.filter(a => a.code.startsWith('1101') || a.code.startsWith('1102') || a.name.toLowerCase().includes('kas'));

  const endBal = (accs, dt) => accs.reduce((s, acc) => {
    const net = getAccountNetBalance(acc, effective, dt);
    return s + (acc.normalBalance === 'Debit' ? Math.max(net, 0) : Math.max(-net, 0));
  }, 0);

  const inventory = endBal(persediaanAcc, endDate);
  const inventoryPrior = endBal(persediaanAcc, priorEndDate || endDate);
  const prepaid = endBal(prepaidAcc, endDate);
  const cash = endBal(kasAcc, endDate);

  const ar = endBal(coaList.filter(a => a.name.toLowerCase().includes('piutang') || a.code.startsWith('112')), endDate);
  const arPrior = endBal(coaList.filter(a => a.name.toLowerCase().includes('piutang') || a.code.startsWith('112')), priorEndDate || endDate);
  const ap = endBal(coaList.filter(a => a.name.toLowerCase().includes('utang usaha') || a.code.startsWith('2101')), endDate);
  const apPrior = endBal(coaList.filter(a => a.name.toLowerCase().includes('utang usaha') || a.code.startsWith('2101')), priorEndDate || endDate);

  // Rata-rata aset & ekuitas
  const avgTotalAssets = averageBalance(bsPrior.totalAssets, totalAssets);
  const avgEquity = averageBalance(bsPrior.totalEquity, totalEquity);
  const avgAR = averageBalance(arPrior, ar);
  const avgAP = averageBalance(apPrior, ap);
  const avgInventory = averageBalance(inventoryPrior, inventory);

  // Periode hari
  const days = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
    : 365;

  // Beban bunga
  const interestAccounts = coaList.filter(a =>
    a.name.toLowerCase().includes('bunga') ||
    a.code === '8102' ||
    a.name.toLowerCase().includes('interest')
  );
  let interestExpense = 0;
  interestAccounts.forEach(acc => {
    const pb = getPeriodBalance(acc.code, effective, startDate, endDate);
    interestExpense += pb.debit - pb.credit;
  });

  // ---- LIKUIDITAS ----
  const currentRatio = safe(totalCurrentAssets, totalCurrentLiabilities);
  const quickRatio = safe(totalCurrentAssets - inventory - prepaid, totalCurrentLiabilities);
  const cashRatio = safe(cash, totalCurrentLiabilities);

  // ---- SOLVABILITAS ----
  const debtToAsset = safe(totalLiabilities, totalAssets);
  const debtToEquity = safe(totalLiabilities, totalEquity);
  const ebit = is.operatingProfit + (interestExpense > 0 ? interestExpense : 0);
  const interestCoverage = interestExpense > 0 ? safe(ebit, interestExpense) : null;

  // ---- PROFITABILITAS ----
  const grossProfitMargin = pct(is.grossProfit, is.totalRevenue);
  const operatingProfitMargin = pct(is.operatingProfit, is.totalRevenue);
  const netProfitMargin = pct(is.netProfit, is.totalRevenue);
  const roa = avgTotalAssets > 0 ? pct(is.netProfit, avgTotalAssets) : null;
  const roe = avgEquity > 0 ? pct(is.netProfit, avgEquity) : null;

  // ---- AKTIVITAS ----
  const inventoryTurnover = avgInventory > 0 ? safe(is.totalCOGS, avgInventory) : null;
  const daysInventoryOutstanding = inventoryTurnover ? days / inventoryTurnover : null;
  const arTurnover = avgAR > 0 ? safe(is.totalRevenue, avgAR) : null;
  const daysSOOutstanding = arTurnover ? days / arTurnover : null;
  // Pembelian = HPP + Persediaan Akhir - Persediaan Awal
  const purchases = is.totalCOGS + inventory - inventoryPrior;
  const apTurnover = avgAP > 0 ? safe(purchases, avgAP) : null;
  const daysPayableOutstanding = apTurnover ? days / apTurnover : null;
  const assetTurnover = avgTotalAssets > 0 ? safe(is.totalRevenue, avgTotalAssets) : null;
  const cashConversionCycle = (daysSOOutstanding !== null && daysInventoryOutstanding !== null && daysPayableOutstanding !== null)
    ? daysSOOutstanding + daysInventoryOutstanding - daysPayableOutstanding
    : null;

  return {
    period: { startDate, endDate, days },
    // Input data
    is,
    bs,
    // Likuiditas
    currentRatio,
    quickRatio,
    cashRatio,
    // Solvabilitas
    debtToAsset,
    debtToEquity,
    interestExpense,
    ebit,
    interestCoverage,
    // Profitabilitas
    grossProfitMargin,
    operatingProfitMargin,
    netProfitMargin,
    roa,
    roe,
    // Aktivitas
    inventoryTurnover,
    daysInventoryOutstanding,
    arTurnover,
    daysSOOutstanding,
    apTurnover,
    daysPayableOutstanding,
    assetTurnover,
    cashConversionCycle,
    // Pendukung
    inventory,
    cash,
    ar,
    ap,
    avgTotalAssets,
    avgEquity
  };
}

// ----------------------------------------------------------------
// F. PERBANDINGAN ANTAR PERIODE & TREN KUARTALAN
// ----------------------------------------------------------------

/**
 * Hitung perubahan (selisih Rp dan persentase %) antara dua nilai.
 */
function calcVariance(currentVal, priorVal) {
  const cur = Number(currentVal) || 0;
  const pri = Number(priorVal) || 0;
  const diff = cur - pri;
  const pct = pri !== 0 ? (diff / Math.abs(pri)) * 100 : (cur !== 0 ? 100 : 0);
  return { current: cur, prior: pri, diff, pct };
}

/**
 * Gabungkan baris akun periode berjalan dan periode pembanding.
 */
function mergeComparativeRows(currentRows = [], priorRows = [], valueKey = 'amount') {
  const map = new Map();
  currentRows.forEach(r => {
    map.set(r.code, {
      code: r.code,
      name: r.name,
      category: r.category,
      current: r[valueKey] || 0,
      prior: 0
    });
  });
  priorRows.forEach(r => {
    if (map.has(r.code)) {
      map.get(r.code).prior = r[valueKey] || 0;
    } else {
      map.set(r.code, {
        code: r.code,
        name: r.name,
        category: r.category,
        current: 0,
        prior: r[valueKey] || 0
      });
    }
  });
  return Array.from(map.values())
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(item => ({ ...item, ...calcVariance(item.current, item.prior) }));
}

/**
 * Susun Laporan Laba Rugi Komparatif (Periode Berjalan vs Periode Pembanding).
 */
export function buildComparativeIncomeStatement({
  coaList = [],
  journalEntries = [],
  currentStart = '',
  currentEnd = '',
  priorStart = '',
  priorEnd = ''
}) {
  const current = buildIncomeStatement({ coaList, journalEntries, startDate: currentStart, endDate: currentEnd });
  const prior = buildIncomeStatement({ coaList, journalEntries, startDate: priorStart, endDate: priorEnd });

  return {
    current,
    prior,
    revenueRows: mergeComparativeRows(current.revenueRows, prior.revenueRows, 'amount'),
    cogsRows: mergeComparativeRows(current.cogsRows, prior.cogsRows, 'amount'),
    expenseRows: mergeComparativeRows(current.expenseRows, prior.expenseRows, 'amount'),
    otherRevenueRows: mergeComparativeRows(current.otherRevenueRows, prior.otherRevenueRows, 'amount'),
    otherExpenseRows: mergeComparativeRows(current.otherExpenseRows, prior.otherExpenseRows, 'amount'),
    summary: {
      totalRevenue: calcVariance(current.totalRevenue, prior.totalRevenue),
      totalCOGS: calcVariance(current.totalCOGS, prior.totalCOGS),
      grossProfit: calcVariance(current.grossProfit, prior.grossProfit),
      totalExpense: calcVariance(current.totalExpense, prior.totalExpense),
      operatingProfit: calcVariance(current.operatingProfit, prior.operatingProfit),
      profitBeforeTax: calcVariance(current.profitBeforeTax, prior.profitBeforeTax),
      totalTax: calcVariance(current.totalTax, prior.totalTax),
      netProfit: calcVariance(current.netProfit, prior.netProfit)
    }
  };
}

/**
 * Susun Neraca Komparatif (Tanggal Berjalan vs Tanggal Pembanding).
 */
export function buildComparativeBalanceSheet({
  coaList = [],
  journalEntries = [],
  currentAsOf = '',
  priorAsOf = ''
}) {
  const current = buildBalanceSheet({ coaList, journalEntries, asOfDate: currentAsOf });
  const prior = buildBalanceSheet({ coaList, journalEntries, asOfDate: priorAsOf });

  return {
    current,
    prior,
    currentAssetRows: mergeComparativeRows(current.currentAssetRows, prior.currentAssetRows, 'balance'),
    fixedAssetRows: mergeComparativeRows(current.fixedAssetRows, prior.fixedAssetRows, 'balance'),
    currentLiabilityRows: mergeComparativeRows(current.currentLiabilityRows, prior.currentLiabilityRows, 'balance'),
    longTermLiabilityRows: mergeComparativeRows(current.longTermLiabilityRows, prior.longTermLiabilityRows, 'balance'),
    equityRows: mergeComparativeRows(current.equityRows, prior.equityRows, 'balance'),
    summary: {
      totalCurrentAssets: calcVariance(current.totalCurrentAssets, prior.totalCurrentAssets),
      totalFixedAssets: calcVariance(current.totalFixedAssets, prior.totalFixedAssets),
      totalAssets: calcVariance(current.totalAssets, prior.totalAssets),
      totalCurrentLiabilities: calcVariance(current.totalCurrentLiabilities, prior.totalCurrentLiabilities),
      totalLongTermLiabilities: calcVariance(current.totalLongTermLiabilities, prior.totalLongTermLiabilities),
      totalLiabilities: calcVariance(current.totalLiabilities, prior.totalLiabilities),
      totalEquity: calcVariance(current.totalEquity, prior.totalEquity),
      totalLiabilitiesAndEquity: calcVariance(current.totalLiabilitiesAndEquity, prior.totalLiabilitiesAndEquity)
    }
  };
}

/**
 * Hitung tren keuangan & rasio per kuartal (Q1–Q4) untuk tahun tertentu.
 */
export function buildQuarterlyTrend({ coaList = [], journalEntries = [], year }) {
  const y = Number(year) || new Date().getFullYear();
  const quarters = [
    { label: `Q1 ${y}`, short: 'Q1', start: `${y}-01-01`, end: `${y}-03-31`, priorEnd: `${y - 1}-12-31` },
    { label: `Q2 ${y}`, short: 'Q2', start: `${y}-04-01`, end: `${y}-06-30`, priorEnd: `${y}-03-31` },
    { label: `Q3 ${y}`, short: 'Q3', start: `${y}-07-01`, end: `${y}-09-30`, priorEnd: `${y}-06-30` },
    { label: `Q4 ${y}`, short: 'Q4', start: `${y}-10-01`, end: `${y}-12-31`, priorEnd: `${y}-09-30` }
  ];

  return quarters.map(q => {
    const is = buildIncomeStatement({ coaList, journalEntries, startDate: q.start, endDate: q.end });
    const ratios = calculateFinancialRatios({
      coaList,
      journalEntries,
      startDate: q.start,
      endDate: q.end,
      priorEndDate: q.priorEnd
    });

    return {
      label: q.label,
      short: q.short,
      startDate: q.start,
      endDate: q.end,
      revenue: is.totalRevenue,
      expense: is.totalCOGS + is.totalExpense + is.totalOtherExpense,
      netProfit: is.netProfit,
      grossProfitMargin: ratios.grossProfitMargin ?? 0,
      netProfitMargin: ratios.netProfitMargin ?? 0,
      currentRatio: ratios.currentRatio ?? 0,
      roe: ratios.roe ?? 0,
      totalAssets: ratios.bs?.totalAssets || 0
    };
  });
}
