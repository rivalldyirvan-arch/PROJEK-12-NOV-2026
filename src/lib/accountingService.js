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
 * Hitung agregasi saldo per akun dari jurnal yang berstatus 'Posted' (Single Source of Truth Buku Besar).
 */
export function calculateBalancesFromJournals(coaList = [], journalEntries = []) {
  const balanceMap = {};
  coaList.forEach(c => {
    balanceMap[c.code] = { debit: 0, credit: 0, netBalance: 0 };
  });

  journalEntries
    .filter(j => j.status === 'Posted')
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

