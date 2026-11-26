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

