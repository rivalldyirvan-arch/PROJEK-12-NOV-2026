import { getSupabase } from './supabase';
import { INITIAL_USERS, INITIAL_ROLES } from './initialUsers';
import { INITIAL_PRODUCTS } from './initialData';
import { INITIAL_ASSET_CATEGORIES, calculateCommercialDepreciationSchedule, calculateTaxDepreciationSchedule } from './assetCalculator';
import {
  DEFAULT_COA_MAPPINGS,
  DEFAULT_JOURNAL_SEQUENCES,
  getDefaultPeriods,
  getPeriodCodeFromDate,
  validateJournalEntry,
  buildReversalLines,
  generateJournalNumber
} from './accountingService';

const STORAGE_KEYS = {
  COA: 'app_coa_data',
  VENDORS: 'app_vendors_data',
  PURCHASES: 'app_purchases_data',
  PRODUCTS: 'app_products_data',
  TAX: 'app_tax_data',
  USERS: 'app_users_data',
  ROLES: 'app_roles_data',
  VENDOR_DEPOSITS: 'app_vendor_deposits_data',
  PAYMENT_TRANSACTIONS: 'app_payment_transactions_data',
  PURCHASES_PAYMENTS: 'app_purchases_payments_data',
  FIXED_ASSETS: 'app_fixed_assets_data',
  ASSET_CATEGORIES: 'app_asset_categories_data',
  JOURNAL_ENTRIES: 'app_journal_entries_data',
  ASSET_MOVEMENTS: 'app_asset_movements_data',
  ASSET_DISPOSALS: 'app_asset_disposals_data',
  ASSET_POSTINGS: 'app_asset_postings_data',
  ASSET_AUDIT_LOGS: 'app_asset_audit_logs_data',
  ACCOUNTING_PERIODS: 'app_accounting_periods_data',
  JOURNAL_SEQUENCES: 'app_journal_sequences_data',
  COA_MAPPINGS: 'app_coa_mappings_data',
  AUDIT_LOGS: 'app_audit_logs_data'
};

// Local storage helpers (only for offline / demo mode)
const getLocal = (key, fallback = []) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error('Error reading localStorage', e);
    return fallback;
  }
};

const setLocal = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing localStorage', e);
  }
};

// Clear any dummy cache in local storage when Supabase is active
export function clearLocalDummyCache() {
  localStorage.removeItem(STORAGE_KEYS.PURCHASES);
  localStorage.removeItem(STORAGE_KEYS.TAX);
  localStorage.removeItem(STORAGE_KEYS.VENDORS);
  localStorage.removeItem(STORAGE_KEYS.COA);
}

// Test Supabase Connection
export async function testSupabaseConnection() {
  const supabase = getSupabase();
  if (!supabase) {
    return { connected: false, message: 'Supabase URL & Anon Key belum dikonfigurasi.' };
  }

  try {
    const { count, error } = await supabase.from('coa').select('*', { count: 'exact', head: true });
    if (error) {
      return { connected: false, message: `Error Supabase: ${error.message}` };
    }
    // Clear dummy cache when Supabase is active!
    clearLocalDummyCache();
    return { connected: true, message: 'Koneksi ke Supabase aktif dan berhasil!' };
  } catch (err) {
    return { connected: false, message: `Gagal terhubung: ${err.message}` };
  }
}

// ==============================================================================
// 1. MODUL CHART OF ACCOUNTS (COA)
// ==============================================================================
export async function fetchCOA() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('coa').select('*').order('code', { ascending: true });
      if (!error && data) {
        return data.map(item => ({
          id: item.id,
          code: item.code,
          name: item.name,
          category: item.category,
          subCategory: item.sub_category,
          normalBalance: item.normal_balance,
          level: item.level,
          parentCode: item.parent_code,
          balance: Number(item.balance || 0),
          isActive: item.is_active
        }));
      }
      if (error) {
        console.error('Supabase fetch COA error:', error.message);
      }
    } catch (err) {
      console.warn('Error reading COA from Supabase:', err);
    }
  }

  return getLocal(STORAGE_KEYS.COA, []);
}

export async function saveCOAAccount(account) {
  const supabase = getSupabase();
  const id = account.id || account.code;
  const newAccount = { ...account, id };

  if (supabase) {
    try {
      const dbPayload = {
        id: newAccount.id,
        code: newAccount.code,
        name: newAccount.name,
        category: newAccount.category,
        sub_category: newAccount.subCategory,
        normal_balance: newAccount.normalBalance,
        level: newAccount.level || 3,
        parent_code: newAccount.parentCode || null,
        balance: Number(newAccount.balance || 0),
        is_active: newAccount.isActive !== false
      };
      const { error } = await supabase.from('coa').upsert(dbPayload);
      if (error) console.error('Supabase upsert COA error:', error);
      return newAccount;
    } catch (err) {
      console.error('Error saving COA to Supabase:', err);
    }
  }

  const localList = getLocal(STORAGE_KEYS.COA, []);
  const index = localList.findIndex(a => a.id === id || a.code === account.code);
  let updated;
  if (index >= 0) {
    updated = [...localList];
    updated[index] = newAccount;
  } else {
    updated = [newAccount, ...localList];
  }
  setLocal(STORAGE_KEYS.COA, updated);
  return newAccount;
}

export async function deleteCOAAccount(id) {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('coa').delete().eq('id', id);
      return true;
    } catch (err) {
      console.error('Supabase delete COA error:', err);
    }
  }

  const localList = getLocal(STORAGE_KEYS.COA, []);
  const filtered = localList.filter(a => a.id !== id && a.code !== id);
  setLocal(STORAGE_KEYS.COA, filtered);
  return true;
}

// ==============================================================================
// 2. MODUL MASTER SUPPLIER / VENDOR
// ==============================================================================
export async function fetchVendors() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('vendors').select('*').order('code', { ascending: true });
      if (!error && data) {
        return data.map(item => ({
          id: item.id,
          code: item.code,
          name: item.name,
          type: item.type,
          category: item.category,
          npwp: item.npwp,
          hasNpwp: item.has_npwp,
          address: item.address,
          city: item.city,
          picName: item.pic_name,
          picEmail: item.pic_email,
          picPhone: item.pic_phone,
          bankName: item.bank_name,
          bankAccount: item.bank_account,
          bankAccountHolder: item.bank_account_holder,
          paymentTerm: item.payment_term,
          status: item.status,
          notes: item.notes
        }));
      }
      if (error) console.error('Supabase fetch vendors error:', error.message);
    } catch (err) {
      console.warn('Error reading vendors from Supabase:', err);
    }
  }

  return getLocal(STORAGE_KEYS.VENDORS, []);
}

export async function saveVendor(vendor) {
  const supabase = getSupabase();
  const id = vendor.id || `vnd-${Date.now()}`;
  const newVendor = { ...vendor, id };

  if (supabase) {
    try {
      const dbPayload = {
        id: newVendor.id,
        code: newVendor.code,
        name: newVendor.name,
        type: newVendor.type,
        category: newVendor.category,
        npwp: newVendor.npwp || '',
        has_npwp: !!newVendor.hasNpwp,
        address: newVendor.address || '',
        city: newVendor.city || '',
        pic_name: newVendor.picName || '',
        pic_email: newVendor.picEmail || '',
        pic_phone: newVendor.picPhone || '',
        bank_name: newVendor.bankName || '',
        bank_account: newVendor.bankAccount || '',
        bank_account_holder: newVendor.bankAccountHolder || '',
        payment_term: newVendor.paymentTerm || 'Net 30',
        status: newVendor.status || 'Aktif',
        notes: newVendor.notes || ''
      };
      const { error } = await supabase.from('vendors').upsert(dbPayload);
      if (error) console.error('Supabase upsert vendor error:', error);
      return newVendor;
    } catch (err) {
      console.error('Error saving vendor to Supabase:', err);
    }
  }

  const localList = getLocal(STORAGE_KEYS.VENDORS, []);
  const index = localList.findIndex(v => v.id === id);
  let updated;
  if (index >= 0) {
    updated = [...localList];
    updated[index] = newVendor;
  } else {
    updated = [newVendor, ...localList];
  }
  setLocal(STORAGE_KEYS.VENDORS, updated);
  return newVendor;
}

export async function deleteVendor(id) {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('vendors').delete().eq('id', id);
      return true;
    } catch (err) {
      console.error('Supabase delete vendor error:', err);
    }
  }

  const localList = getLocal(STORAGE_KEYS.VENDORS, []);
  const filtered = localList.filter(v => v.id !== id);
  setLocal(STORAGE_KEYS.VENDORS, filtered);
  return true;
}

// ==============================================================================
// 3. MODUL PEMBELIAN & PENGAJUAN (PURCHASE REQUESTS)
// ==============================================================================
export async function fetchPurchaseRequests() {
  const supabase = getSupabase();
  const paymentMeta = getLocal(STORAGE_KEYS.PURCHASES_PAYMENTS, {});

  if (supabase) {
    try {
      const { data, error } = await supabase.from('purchase_requests').select('*').order('request_date', { ascending: false });
      if (!error && data) {
        return data.map(item => {
          const meta = paymentMeta[item.id] || paymentMeta[item.request_number] || {};
          const origPayable = Number(item.total_payable || 0);
          return {
            id: item.id,
            requestNumber: item.request_number,
            requestDate: item.request_date,
            dueDate: item.due_date,
            requesterName: item.requester_name,
            department: item.department,
            vendorId: item.vendor_id,
            vendorName: item.vendor_name,
            title: item.title,
            description: item.description,
            subtotal: Number(item.subtotal || 0),
            discount: Number(item.discount || 0),
            dpp: Number(item.dpp || 0),
            ppnRate: Number(item.ppn_rate || 0),
            ppnAmount: Number(item.ppn_amount || 0),
            hasPph: item.has_pph !== undefined ? Boolean(item.has_pph) : (item.pph_type && item.pph_type !== 'Non-PPh' && Number(item.pph_amount || 0) > 0),
            pphType: item.pph_type,
            pphRate: Number(item.pph_rate || 0),
            pphAmount: Number(item.pph_amount || 0),
            pphCoaAccount: item.pph_coa_account || '',
            totalPayable: origPayable,
            remainingPayable: meta.remainingPayable !== undefined ? Number(meta.remainingPayable) : (item.status === 'Lunas' ? 0 : origPayable),
            paidAmount: meta.paidAmount !== undefined ? Number(meta.paidAmount) : (item.status === 'Lunas' ? origPayable : 0),
            paymentHistory: meta.paymentHistory || [],
            grandTotal: Number(item.grand_total || 0),
            status: item.status,
            approvalDate: item.approval_date,
            approvedBy: item.approved_by,
            coaDebitAccount: item.coa_debit_account,
            coaCreditAccount: item.coa_credit_account,
            items: (item.items || []).map(it => ({
              ...it,
              taxRate: it.taxRate !== undefined ? Number(it.taxRate) : (Number(item.ppn_rate) || 0)
            }))
          };
        });
      }
      if (error) console.error('Supabase fetch purchase requests error:', error.message);
    } catch (err) {
      console.warn('Error reading purchase requests from Supabase:', err);
    }
  }

  const localList = getLocal(STORAGE_KEYS.PURCHASES, []);
  return localList.map(item => {
    const meta = paymentMeta[item.id] || paymentMeta[item.requestNumber] || {};
    const origPayable = Number(item.totalPayable || 0);
    return {
      ...item,
      hasPph: item.hasPph !== undefined ? Boolean(item.hasPph) : (item.pphType && item.pphType !== 'Non-PPh' && Number(item.pphAmount || 0) > 0),
      remainingPayable: meta.remainingPayable !== undefined ? Number(meta.remainingPayable) : (item.status === 'Lunas' ? 0 : origPayable),
      paidAmount: meta.paidAmount !== undefined ? Number(meta.paidAmount) : (item.status === 'Lunas' ? origPayable : 0),
      paymentHistory: meta.paymentHistory || item.paymentHistory || [],
      items: (item.items || []).map(it => ({
        ...it,
        taxRate: it.taxRate !== undefined ? Number(it.taxRate) : (Number(item.ppnRate) || 0)
      }))
    };
  });
}

export async function savePurchaseRequest(pr) {
  const supabase = getSupabase();
  const id = pr.id || `pr-${Date.now()}`;
  const newPR = { ...pr, id };

  // Save payment metadata if present
  if (newPR.remainingPayable !== undefined || newPR.paymentHistory) {
    const paymentMeta = getLocal(STORAGE_KEYS.PURCHASES_PAYMENTS, {});
    paymentMeta[newPR.id] = {
      remainingPayable: newPR.remainingPayable,
      paidAmount: newPR.paidAmount,
      paymentHistory: newPR.paymentHistory || []
    };
    if (newPR.requestNumber) {
      paymentMeta[newPR.requestNumber] = paymentMeta[newPR.id];
    }
    setLocal(STORAGE_KEYS.PURCHASES_PAYMENTS, paymentMeta);
  }

  if (supabase) {
    try {
      const dbPayload = {
        id: newPR.id,
        request_number: newPR.requestNumber,
        request_date: newPR.requestDate,
        due_date: newPR.dueDate || null,
        requester_name: newPR.requesterName,
        department: newPR.department,
        vendor_id: newPR.vendorId || null,
        vendor_name: newPR.vendorName,
        title: newPR.title,
        description: newPR.description || '',
        subtotal: Number(newPR.subtotal || 0),
        discount: Number(newPR.discount || 0),
        dpp: Number(newPR.dpp || 0),
        ppn_rate: Number(newPR.ppnRate || 0),
        ppn_amount: Number(newPR.ppnAmount || 0),
        pph_type: newPR.pphType || 'Non-PPh',
        pph_rate: Number(newPR.pphRate || 0),
        pph_amount: Number(newPR.pphAmount || 0),
        total_payable: Number(newPR.totalPayable || 0),
        grand_total: Number(newPR.grandTotal || 0),
        status: newPR.status || 'Draft',
        approval_date: newPR.approvalDate || null,
        approved_by: newPR.approvedBy || null,
        coa_debit_account: newPR.coaDebitAccount || null,
        coa_credit_account: newPR.coaCreditAccount || null,
        items: newPR.items || []
      };
      const { error } = await supabase.from('purchase_requests').upsert(dbPayload);
      if (error) console.error('Supabase upsert purchase request error:', error);

      // Auto-sync tax record if PR has PPh and is approved or marked paid
      if (newPR.pphType && newPR.pphType !== 'Non-PPh' && newPR.pphAmount > 0) {
        await autoSyncTaxRecordFromPurchase(newPR);
      }

      return newPR;
    } catch (err) {
      console.error('Error saving purchase request to Supabase:', err);
    }
  }

  const localList = getLocal(STORAGE_KEYS.PURCHASES, []);
  const index = localList.findIndex(p => p.id === id);
  let updated;
  if (index >= 0) {
    updated = [...localList];
    updated[index] = newPR;
  } else {
    updated = [newPR, ...localList];
  }
  setLocal(STORAGE_KEYS.PURCHASES, updated);

  if (newPR.pphType && newPR.pphType !== 'Non-PPh' && newPR.pphAmount > 0) {
    await autoSyncTaxRecordFromPurchase(newPR);
  }

  return newPR;
}

export async function deletePurchaseRequest(id, options = {}) {
  const { reverseJournal = false } = options;

  // ---- Ambil data PR sebelum dihapus (untuk keperluan reversal COA & jurnal) ----
  let prToDelete = null;
  try {
    const allPR = getLocal(STORAGE_KEYS.PURCHASES, []);
    prToDelete = allPR.find(p => p.id === id) || null;
  } catch (e) {
    console.warn('Tidak bisa baca data PR sebelum hapus:', e);
  }

  // ---- Jika PR Lunas: Reversal COA saldo Kas/Bank yang terkait ----
  if (reverseJournal && prToDelete) {
    try {
      const coaAll = await fetchCOA();

      // 1. Reversal saldo Kas/Bank (saldo naik kembali)
      const lastPayment = Array.isArray(prToDelete.paymentHistory) && prToDelete.paymentHistory.length > 0
        ? prToDelete.paymentHistory.find(h => Number(h.allocatedAmount) > 0)
        : null;
      if (lastPayment && lastPayment.accountCode) {
        const cashBankAcc = coaAll.find(a => a.code === lastPayment.accountCode);
        if (cashBankAcc) {
          await saveCOAAccount({
            ...cashBankAcc,
            balance: Number(cashBankAcc.balance || 0) + Number(lastPayment.allocatedAmount || 0)
          });
        }
      }

      // 2. Reversal saldo Hutang Usaha (AP 2101) → kembali ke 0 (tutup hutang)
      const apCode = prToDelete.coaCreditAccount || '2101';
      const apAcc = coaAll.find(a => a.code === apCode);
      if (apAcc) {
        const grossPayable = Number(prToDelete.dpp || 0) + Number(prToDelete.ppnAmount || 0);
        // Hutang sudah ditutup saat Lunas, reversal: kembalikan saldo kredit hutang jika pernah tercatat
        // (dalam mode demo/lokal saldo COA biasanya tidak diubah per transaksi, skip jika balance = 0)
      }

      // 3. Reverse jurnal entry terkait (tandai Void di local storage)
      const journals = getLocal(STORAGE_KEYS.JOURNAL_ENTRIES, []);
      const updated = journals.map(j => {
        if (j.referenceId === id || j.referenceNo === prToDelete.requestNumber) {
          return { ...j, status: 'Void', voidReason: `Dihapus oleh pengguna (PR ${prToDelete.requestNumber})`, voidAt: new Date().toISOString() };
        }
        return j;
      });
      setLocal(STORAGE_KEYS.JOURNAL_ENTRIES, updated);
    } catch (err) {
      console.warn('Gagal reversal COA/Jurnal saat hapus PR Lunas:', err);
    }

    // 4. Hapus Tax Record terkait
    try {
      const taxList = await fetchTaxRecords();
      const taxItem = taxList.find(t => t.referenceNo === prToDelete.requestNumber && t.sourceModule === 'Pembelian');
      if (taxItem) {
        await deleteTaxRecord(taxItem.id);
      }
    } catch (err) {
      console.warn('Gagal hapus tax record saat hapus PR:', err);
    }
  }

  // ---- Hapus PR dari Supabase ----
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('purchase_requests').delete().eq('id', id);
      return true;
    } catch (err) {
      console.error('Supabase delete purchase error:', err);
    }
  }

  // ---- Hapus PR dari localStorage ----
  const localList = getLocal(STORAGE_KEYS.PURCHASES, []);
  const filtered = localList.filter(p => p.id !== id);
  setLocal(STORAGE_KEYS.PURCHASES, filtered);
  return true;
}

// Auto sync tax record when PR has PPh (Hutang PPh diakui saat status Lunas berdasarkan tanggal pembayaran)
async function autoSyncTaxRecordFromPurchase(pr) {
  const taxList = await fetchTaxRecords();
  const existing = taxList.find(t => t.referenceNo === pr.requestNumber);
  
  // Jika pengajuan belum Lunas, jangan akui hutang PPh dulu (hapus jika pernah tersimpan)
  if (pr.status !== 'Lunas') {
    if (existing && existing.sourceModule === 'Pembelian') {
      await deleteTaxRecord(existing.id);
    }
    return;
  }

  // Jika Lunas: Tentukan masa/bulan pajak berdasarkan tanggal pembayaran pelunasan
  const lastPayment = Array.isArray(pr.paymentHistory) && pr.paymentHistory.length > 0 ? pr.paymentHistory[0] : null;
  const payDate = lastPayment?.paymentDate || pr.paymentDate || new Date().toISOString().slice(0, 10);
  const d = new Date(payDate);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const taxRecord = {
    id: existing ? existing.id : `tax-auto-${pr.id}`,
    taxType: pr.pphType,
    taxPeriodMonth: month,
    taxPeriodYear: year,
    transactionDate: payDate,
    referenceNo: pr.requestNumber,
    sourceModule: 'Pembelian',
    vendorId: pr.vendorId || null,
    taxpayerName: pr.vendorName,
    taxpayerNpwp: '',
    hasNpwp: true,
    taxObjectCode: pr.pphType === 'PPh 23' ? '24-104-01' : (pr.pphType === 'PPh 4(2)' ? '28-401-01' : '21-100-02'),
    taxObjectDescription: `Pemotongan ${pr.pphType} atas pelunasan ${pr.title}`,
    grossAmount: Number(pr.subtotal || pr.dpp || 0),
    dppAmount: Number(pr.dpp || 0),
    taxRate: Number(pr.pphRate || 0),
    taxAmount: Number(pr.pphAmount || 0),
    billingId: existing?.billingId || '',
    ntpn: existing?.ntpn || '',
    paymentDate: payDate,
    status: existing?.status || 'Lunas / Disetor (NTPN)',
    notes: `Otomatis dibukukan pada masa ${month}/${year} dari Pelunasan PR ${pr.requestNumber} (Tgl Bayar: ${payDate})`
  };

  await saveTaxRecord(taxRecord);
}

// ==============================================================================
// 4. MODUL PAJAK PPH 21/22/23/25/4(2)
// ==============================================================================
export async function fetchTaxRecords() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('tax_records').select('*').order('transaction_date', { ascending: false });
      if (!error && data) {
        return data.map(item => ({
          id: item.id,
          taxType: item.tax_type,
          taxPeriodMonth: item.tax_period_month,
          taxPeriodYear: item.tax_period_year,
          transactionDate: item.transaction_date,
          referenceNo: item.reference_no,
          sourceModule: item.source_module,
          vendorId: item.vendor_id,
          taxpayerName: item.taxpayer_name,
          taxpayerNpwp: item.taxpayer_npwp,
          hasNpwp: item.has_npwp,
          taxObjectCode: item.tax_object_code,
          taxObjectDescription: item.tax_object_description,
          grossAmount: Number(item.gross_amount || 0),
          dppAmount: Number(item.dpp_amount || 0),
          taxRate: Number(item.tax_rate || 0),
          taxAmount: Number(item.tax_amount || 0),
          billingId: item.billing_id,
          ntpn: item.ntpn,
          paymentDate: item.payment_date,
          status: item.status,
          notes: item.notes
        }));
      }
      if (error) console.error('Supabase fetch tax records error:', error.message);
    } catch (err) {
      console.warn('Error reading tax records from Supabase:', err);
    }
  }

  return getLocal(STORAGE_KEYS.TAX, []);
}

export async function saveTaxRecord(record) {
  const supabase = getSupabase();
  const id = record.id || `tax-${Date.now()}`;
  const newRecord = { ...record, id };

  if (supabase) {
    try {
      const dbPayload = {
        id: newRecord.id,
        tax_type: newRecord.taxType,
        tax_period_month: Number(newRecord.taxPeriodMonth),
        tax_period_year: Number(newRecord.taxPeriodYear),
        transaction_date: newRecord.transactionDate,
        reference_no: newRecord.referenceNo || '',
        source_module: newRecord.sourceModule || 'Manual',
        vendor_id: newRecord.vendorId || null,
        taxpayer_name: newRecord.taxpayerName,
        taxpayer_npwp: newRecord.taxpayerNpwp || '',
        has_npwp: !!newRecord.hasNpwp,
        tax_object_code: newRecord.taxObjectCode || '',
        tax_object_description: newRecord.taxObjectDescription || '',
        gross_amount: Number(newRecord.grossAmount || 0),
        dpp_amount: Number(newRecord.dppAmount || 0),
        tax_rate: Number(newRecord.taxRate || 0),
        tax_amount: Number(newRecord.taxAmount || 0),
        billing_id: newRecord.billingId || '',
        ntpn: newRecord.ntpn || '',
        payment_date: newRecord.paymentDate || null,
        status: newRecord.status || 'Draft / Belum Disetor',
        notes: newRecord.notes || ''
      };
      const { error } = await supabase.from('tax_records').upsert(dbPayload);
      if (error) console.error('Supabase upsert tax record error:', error);
      return newRecord;
    } catch (err) {
      console.error('Error saving tax record to Supabase:', err);
    }
  }

  const localList = getLocal(STORAGE_KEYS.TAX, []);
  const index = localList.findIndex(t => t.id === id);
  let updated;
  if (index >= 0) {
    updated = [...localList];
    updated[index] = newRecord;
  } else {
    updated = [newRecord, ...localList];
  }
  setLocal(STORAGE_KEYS.TAX, updated);
  return newRecord;
}

export async function deleteTaxRecord(id) {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('tax_records').delete().eq('id', id);
      return true;
    } catch (err) {
      console.error('Supabase delete tax record error:', err);
    }
  }

  const localList = getLocal(STORAGE_KEYS.TAX, []);
  const filtered = localList.filter(t => t.id !== id);
  setLocal(STORAGE_KEYS.TAX, filtered);
  return true;
}


// ==============================================================================
// 5. MODUL MASTER USER & ROLES (AUTHENTICATION & RBAC)
// ==============================================================================
export async function fetchUsers() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('app_users').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map(u => ({
          id: u.id,
          email: u.email,
          password: u.password,
          fullName: u.full_name,
          role: u.role,
          department: u.department,
          phone: u.phone,
          isActive: u.is_active !== false,
          lastLogin: u.last_login
        }));
      }
      if (error && error.code !== 'PGRST116') {
        console.warn('Note: app_users table in Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Error reading app_users from Supabase:', err);
    }
  }

  let local = getLocal(STORAGE_KEYS.USERS, null);
  if (!local || local.length === 0) {
    local = INITIAL_USERS;
    setLocal(STORAGE_KEYS.USERS, local);
  }
  return local;
}

export async function saveUser(user) {
  const supabase = getSupabase();
  const id = user.id || `usr-${Date.now()}`;
  const newUser = { ...user, id };

  if (supabase) {
    try {
      const dbPayload = {
        id: newUser.id,
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.fullName,
        role: newUser.role,
        department: newUser.department || '',
        phone: newUser.phone || '',
        is_active: newUser.isActive !== false,
        last_login: newUser.lastLogin || null
      };
      await supabase.from('app_users').upsert(dbPayload);
    } catch (err) {
      console.warn('Supabase upsert app_users error:', err);
    }
  }

  const localList = await fetchUsers();
  const index = localList.findIndex(u => u.id === id || u.email === user.email);
  let updated;
  if (index >= 0) {
    updated = [...localList];
    updated[index] = newUser;
  } else {
    updated = [...localList, newUser];
  }
  setLocal(STORAGE_KEYS.USERS, updated);
  return newUser;
}

export async function deleteUser(id) {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('app_users').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete app_users error:', err);
    }
  }

  const localList = await fetchUsers();
  const filtered = localList.filter(u => u.id !== id);
  setLocal(STORAGE_KEYS.USERS, filtered);
  return true;
}

// ROLES
export async function fetchRoles() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('app_roles').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          permissions: r.permissions || [],
          isSystem: r.is_system
        }));
      }
    } catch (err) {
      console.warn('Error reading app_roles from Supabase:', err);
    }
  }

  let local = getLocal(STORAGE_KEYS.ROLES, null);
  if (!local || local.length === 0) {
    local = INITIAL_ROLES;
    setLocal(STORAGE_KEYS.ROLES, local);
  }
  return local;
}

export async function saveRole(role) {
  const supabase = getSupabase();
  const id = role.id || `role-${Date.now()}`;
  const newRole = { ...role, id };

  if (supabase) {
    try {
      const dbPayload = {
        id: newRole.id,
        name: newRole.name,
        description: newRole.description || '',
        permissions: newRole.permissions || [],
        is_system: !!newRole.isSystem
      };
      await supabase.from('app_roles').upsert(dbPayload);
    } catch (err) {
      console.warn('Supabase upsert app_roles error:', err);
    }
  }

  const localList = await fetchRoles();
  const index = localList.findIndex(r => r.id === id || r.name === role.name);
  let updated;
  if (index >= 0) {
    updated = [...localList];
    updated[index] = newRole;
  } else {
    updated = [...localList, newRole];
  }
  setLocal(STORAGE_KEYS.ROLES, updated);
  return newRole;
}

export async function deleteRole(id) {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('app_roles').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete app_roles error:', err);
    }
  }

  const localList = await fetchRoles();
  const filtered = localList.filter(r => r.id !== id);
  setLocal(STORAGE_KEYS.ROLES, filtered);
  return true;
}

// ==============================================================================
// 7. MODUL DEPOSIT VENDOR & AUDIT TRAIL PEMBAYARAN (LUNAS)
// ==============================================================================

export function fetchVendorDeposits() {
  return getLocal(STORAGE_KEYS.VENDOR_DEPOSITS, {});
}

export function getVendorDeposit(vendorId) {
  if (!vendorId) return { balance: 0, history: [] };
  const deposits = fetchVendorDeposits();
  return deposits[vendorId] || { balance: 0, history: [] };
}

export function updateVendorDeposit(vendorId, amountDelta, { referenceNo = '', memo = '', type = '' } = {}) {
  if (!vendorId) return null;
  const deposits = fetchVendorDeposits();
  const current = deposits[vendorId] || { balance: 0, history: [] };
  const newBalance = Math.max(0, (Number(current.balance) || 0) + Number(amountDelta || 0));
  const newEntry = {
    id: `dep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString().slice(0, 10),
    amount: Math.abs(Number(amountDelta || 0)),
    type: type || (amountDelta >= 0 ? 'IN' : 'OUT'),
    referenceNo: referenceNo || '',
    memo: memo || '',
    createdAt: new Date().toISOString(),
    balanceAfter: newBalance
  };
  const updated = {
    ...deposits,
    [vendorId]: {
      balance: newBalance,
      history: [newEntry, ...(current.history || [])]
    }
  };
  setLocal(STORAGE_KEYS.VENDOR_DEPOSITS, updated);
  return updated[vendorId];
}

export function fetchPaymentTransactions() {
  return getLocal(STORAGE_KEYS.PAYMENT_TRANSACTIONS, []);
}

export function recordPaymentTransaction(tx) {
  const list = fetchPaymentTransactions();
  const newTx = {
    id: tx.id || `paytx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    ...tx
  };
  setLocal(STORAGE_KEYS.PAYMENT_TRANSACTIONS, [newTx, ...list]);
  return newTx;
}

/**
 * Eksekusi Pembayaran Pengajuan (Single atau Batch Kelompok)
 */
export async function executePurchasePayment({
  prList = [],
  vendorId,
  vendorName,
  paymentDate,
  referenceNo,
  paymentMethod, // 'Kas' | 'Bank' | 'Deposit'
  accountCode,   // COA code (e.g. '1101', '1102')
  accountName = '',
  paidAmount = 0,
  depositUsed = 0,
  excessAmount = 0,
  approvedExcessAsDeposit = false,
  notes = '',
  currentUser
}) {
  if (!prList || prList.length === 0) {
    throw new Error('Tidak ada pengajuan yang dipilih untuk dibayar.');
  }

  // 1. Potong Saldo Akun COA jika Kas atau Bank
  let updatedCOA = null;
  if (paymentMethod === 'Kas' || paymentMethod === 'Bank') {
    if (accountCode && paidAmount > 0) {
      const coaAll = await fetchCOA();
      const targetAccount = coaAll.find(a => a.code === accountCode);
      if (targetAccount) {
        const curBal = Number(targetAccount.balance || 0);
        const newBal = Math.max(0, curBal - paidAmount);
        updatedCOA = await saveCOAAccount({
          ...targetAccount,
          balance: newBal
        });
      }
    }
  }

  // 2. Potong Deposit jika metode DEPOSIT
  if (paymentMethod === 'Deposit' && depositUsed > 0 && vendorId) {
    updateVendorDeposit(vendorId, -depositUsed, {
      referenceNo,
      memo: `Pembayaran ${prList.length} PR via Saldo Deposit (${prList.map(p => p.requestNumber).join(', ')})`,
      type: 'OUT'
    });
  }

  // 3. Tambah Deposit jika ada kelebihan pembayaran dan disetujui
  if (excessAmount > 0 && approvedExcessAsDeposit && vendorId) {
    updateVendorDeposit(vendorId, excessAmount, {
      referenceNo,
      memo: `Kelebihan pembayaran pelunasan PR ref ${referenceNo} dialokasikan ke Deposit Rekanan`,
      type: 'IN'
    });
  }

  // 4. Distribusikan Pembayaran ke masing-masing PR
  let fundAvailable = paymentMethod === 'Deposit' ? depositUsed : paidAmount;
  const updatedPRs = [];

  for (const pr of prList) {
    const curDue = Number(pr.remainingPayable !== undefined ? pr.remainingPayable : pr.totalPayable) || 0;
    const allocation = Math.min(fundAvailable, curDue);
    const newRemaining = Math.max(0, curDue - allocation);
    fundAvailable = Math.max(0, fundAvailable - allocation);

    const isFullyPaid = newRemaining === 0;
    const newStatus = isFullyPaid ? 'Lunas' : 'Sebagian Dibayar';

    const paymentRecord = {
      id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      paymentDate,
      referenceNo,
      paymentMethod,
      accountCode: accountCode || (paymentMethod === 'Deposit' ? 'DEPOSIT' : ''),
      accountName: accountName || (paymentMethod === 'Deposit' ? 'Deposit Vendor' : ''),
      allocatedAmount: allocation,
      remainingPayable: newRemaining,
      status: newStatus,
      paidBy: currentUser?.fullName || 'Staff Keuangan',
      paidAt: new Date().toISOString(),
      notes: notes || ''
    };

    const existingHistory = Array.isArray(pr.paymentHistory) ? pr.paymentHistory : [];
    const updatedPRData = {
      ...pr,
      status: newStatus,
      remainingPayable: newRemaining,
      paidAmount: (Number(pr.paidAmount || 0)) + allocation,
      paymentHistory: [paymentRecord, ...existingHistory]
    };

    const saved = await savePurchaseRequest(updatedPRData);
    updatedPRs.push(saved);

    // Jika Lunas: Bukukan Jurnal Pelunasan Kas & Pengakuan Hutang PPh ke Buku Besar
    if (isFullyPaid) {
      try {
        const dpp = Number(pr.dpp) || Number(pr.subtotal) || 0;
        const ppn = Number(pr.ppnAmount) || 0;
        const pph = Number(pr.pphAmount) || 0;
        const grossPayable = dpp + ppn;
        const netPayable = Number(pr.totalPayable) || (grossPayable - pph);
        const pphCoa = pr.pphCoaAccount || (pr.pphType === 'PPh 23' ? '2113' : (pr.pphType === 'PPh 4(2)' ? '2114' : (pr.pphType === 'PPh 21' ? '2111' : (pr.pphType === 'PPh 22' ? '2112' : '2116'))));
        const pphName = pr.pphType || 'PPh Withholding';

        const lines = [
          {
            accountCode: pr.coaCreditAccount || '2101',
            accountName: 'Hutang Usaha (AP)',
            description: `Pelunasan Hutang Usaha atas ${pr.requestNumber} (${pr.vendorName})`,
            debit: grossPayable,
            credit: 0
          }
        ];

        if (pph > 0) {
          lines.push({
            accountCode: pphCoa,
            accountName: `Hutang Pajak - ${pphName}`,
            description: `Pemotongan ${pphName} (${pr.pphRate || 0}%) atas ${pr.title}`,
            debit: 0,
            credit: pph
          });
        }

        lines.push({
          accountCode: accountCode || (paymentMethod === 'Kas' ? '1101' : '1102'),
          accountName: accountName || (paymentMethod === 'Kas' ? 'Kas Kantor' : 'Bank BCA Operasional'),
          description: `Pembayaran Net via ${paymentMethod} kepada ${pr.vendorName}`,
          debit: 0,
          credit: netPayable
        });

        await saveJournalEntry({
          sourceModule: 'Pembelian (Pelunasan)',
          referenceId: pr.id,
          referenceNo: referenceNo || `PAY-${pr.requestNumber}`,
          entryDate: paymentDate,
          description: `Pelunasan Kas & Pemotongan PPh: ${pr.requestNumber} (${pr.vendorName})`,
          totalDebit: grossPayable,
          totalCredit: grossPayable,
          postedBy: currentUser?.fullName || 'Staff Keuangan',
          lines
        });
      } catch (err) {
        console.warn('Gagal memposting jurnal pelunasan:', err);
      }
    }
  }

  // 5. Simpan Audit Trail Transaksi Pembayaran
  const totalDue = prList.reduce((sum, p) => sum + (Number(p.remainingPayable !== undefined ? p.remainingPayable : p.totalPayable) || 0), 0);
  const auditTx = {
    referenceNo,
    paymentDate,
    vendorId,
    vendorName: vendorName || prList[0]?.vendorName || 'Rekanan',
    prNumbers: prList.map(p => p.requestNumber),
    prTitles: prList.map(p => p.title),
    paymentMethod,
    accountCode: accountCode || (paymentMethod === 'Deposit' ? 'DEPOSIT' : ''),
    accountName: accountName || (paymentMethod === 'Deposit' ? 'Deposit Vendor' : ''),
    nominalPengajuan: totalDue,
    nominalPembayaranAktual: paymentMethod === 'Deposit' ? depositUsed : paidAmount,
    depositUsed,
    excessAmount,
    approvedExcessAsDeposit: !!approvedExcessAsDeposit,
    selisih: totalDue - (paymentMethod === 'Deposit' ? depositUsed : paidAmount),
    finalStatus: updatedPRs.every(p => p.status === 'Lunas') ? 'Lunas' : 'Sebagian Dibayar',
    paidBy: currentUser?.fullName || 'Staff Keuangan',
    notes: notes || ''
  };

  recordPaymentTransaction(auditTx);

  return {
    success: true,
    updatedPRs,
    updatedCOA,
    auditTx
  };
}

/**
 * Batalkan Pelunasan Pengajuan (Cancel Payment / Reversal)
 * Mengembalikan status PR menjadi 'Disetujui', paidAmount = 0, remainingPayable = totalPayable.
 * Melakukan pembalikan saldo Kas/Bank atau Deposit jika tercatat dalam histori pembayaran.
 * Mencatat reversal audit trail di buku transaksi dan paymentHistory.
 */
export async function cancelPurchasePayment({
  pr,
  cancellationReason = '',
  currentUser
}) {
  if (!pr || !pr.id) {
    throw new Error('Data pengajuan tidak valid untuk dibatalkan.');
  }
  if (pr.status !== 'Lunas') {
    throw new Error('Hanya pengajuan dengan status Lunas yang dapat dibatalkan pelunasannya.');
  }

  const netPayable = Number(pr.totalPayable || 0);
  const existingHistory = Array.isArray(pr.paymentHistory) ? pr.paymentHistory : [];
  
  // Cari transaksi pembayaran terakhir atau yang relevan untuk reversal
  const lastPayment = existingHistory[0] || null;
  const paidToReverse = Number(pr.paidAmount || (lastPayment?.allocatedAmount ?? netPayable)) || 0;
  const reversalDate = new Date().toISOString().slice(0, 10);
  const reversalRef = `REV-${lastPayment?.referenceNo || pr.requestNumber || Date.now()}`;

  // 1. Reversal Saldo Kas/Bank di COA jika pembayaran sebelumnya menggunakan Kas/Bank
  let reversedCOA = null;
  if (lastPayment && (lastPayment.paymentMethod === 'Kas' || lastPayment.paymentMethod === 'Bank') && lastPayment.accountCode && paidToReverse > 0) {
    try {
      const coaAll = await fetchCOA();
      const targetAccount = coaAll.find(a => a.code === lastPayment.accountCode);
      if (targetAccount) {
        const curBal = Number(targetAccount.balance || 0);
        const newBal = curBal + paidToReverse; // Kembalikan dana ke kas/bank
        reversedCOA = await saveCOAAccount({
          ...targetAccount,
          balance: newBal
        });
      }
    } catch (err) {
      console.warn('Gagal membalik saldo COA saat pembatalan:', err);
    }
  }

  // 2. Reversal Saldo Deposit Vendor jika pembayaran sebelumnya menggunakan Deposit
  if (lastPayment && lastPayment.paymentMethod === 'Deposit' && pr.vendorId && paidToReverse > 0) {
    try {
      updateVendorDeposit(pr.vendorId, paidToReverse, {
        referenceNo: reversalRef,
        memo: `Pembalikan penggunaan deposit atas pembatalan pelunasan PR ${pr.requestNumber}`,
        type: 'IN'
      });
    } catch (err) {
      console.warn('Gagal membalik saldo deposit saat pembatalan:', err);
    }
  }

  // 3. Catat Entri Reversal ke Payment History PR (Jangan hapus histori, buat entri pembatalan)
  const reversalRecord = {
    id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    paymentDate: reversalDate,
    referenceNo: reversalRef,
    paymentMethod: lastPayment?.paymentMethod || 'Reversal',
    accountCode: lastPayment?.accountCode || '',
    accountName: lastPayment?.accountName || '',
    allocatedAmount: -paidToReverse,
    remainingPayable: netPayable,
    status: 'Disetujui',
    cancelledBy: currentUser?.fullName || 'Staff Keuangan',
    cancelledAt: new Date().toISOString(),
    cancellationReason: cancellationReason || 'Pembatalan Pelunasan oleh Pengguna',
    notes: `Pelunasan dibatalkan. Status dikembalikan ke Disetujui.`
  };

  // 4. Update Data Pengajuan Pembelian:
  // Status kembali ke 'Disetujui', paidAmount = 0, remainingPayable = netPayable
  // DPP, PPh, Vendor, dan data pengadaan tidak berubah!
  const updatedPRData = {
    ...pr,
    status: 'Disetujui',
    paidAmount: 0,
    remainingPayable: netPayable,
    paymentHistory: [reversalRecord, ...existingHistory]
  };

  const savedPR = await savePurchaseRequest(updatedPRData);

  // 5. Catat ke Audit Trail Transaksi Pembayaran (payment_transactions)
  const cancelTx = {
    referenceNo: reversalRef,
    paymentDate: reversalDate,
    vendorId: pr.vendorId || null,
    vendorName: pr.vendorName || 'Rekanan',
    prNumbers: [pr.requestNumber],
    prTitles: [pr.title],
    paymentMethod: `BATAL (${lastPayment?.paymentMethod || 'Pelunasan'})`,
    accountCode: lastPayment?.accountCode || '',
    accountName: lastPayment?.accountName || '',
    nominalPengajuan: netPayable,
    nominalPembayaranAktual: -paidToReverse,
    depositUsed: 0,
    excessAmount: 0,
    approvedExcessAsDeposit: false,
    selisih: netPayable,
    finalStatus: 'Disetujui (Pelunasan Dibatalkan)',
    paidBy: currentUser?.fullName || 'Staff Keuangan',
    notes: `PEMBATALAN PELUNASAN: ${cancellationReason || 'Koreksi transaksi pelunasan'}`
  };

  recordPaymentTransaction(cancelTx);

  // 6. Sinkronisasi status pajak jika ada
  if (pr.pphType && pr.pphType !== 'Non-PPh' && pr.pphAmount > 0) {
    try {
      const taxList = await fetchTaxRecords();
      const taxItem = taxList.find(t => t.referenceNo === pr.requestNumber);
      if (taxItem && taxItem.status !== 'Lunas / Disetor (NTPN)') {
        await saveTaxRecord({
          ...taxItem,
          status: 'Draft / Belum Disetor',
          paymentDate: null
        });
      }
    } catch (err) {
      console.warn('Gagal memperbarui status pajak saat pembatalan:', err);
    }
  }

  return {
    success: true,
    updatedPR: savedPR,
    reversedCOA,
    cancelTx
  };
}

// ==============================================================================
// 8. MODUL JURNAL UMUM, PERIODE AKUNTANSI, PEMETAAN COA & AUDIT TRAIL
// ==============================================================================

export async function fetchAuditLogs() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
      if (!error && data) {
        return data.map(item => ({
          id: item.id,
          userId: item.user_id,
          userName: item.user_name,
          action: item.action,
          entityType: item.entity_type,
          entityId: item.entity_id,
          referenceNo: item.reference_no,
          beforeData: item.before_data,
          afterData: item.after_data,
          reason: item.reason,
          createdAt: item.created_at
        }));
      }
    } catch (err) {
      console.warn('Error reading audit_logs from Supabase:', err);
    }
  }
  return getLocal(STORAGE_KEYS.AUDIT_LOGS, []);
}

export async function recordAuditLog({
  userId = null,
  userName = 'Sistem',
  action,
  entityType,
  entityId = null,
  referenceNo = null,
  beforeData = null,
  afterData = null,
  reason = ''
}) {
  const logItem = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    userName,
    action,
    entityType,
    entityId,
    referenceNo,
    beforeData,
    afterData,
    reason,
    createdAt: new Date().toISOString()
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('audit_logs').insert({
        id: logItem.id,
        user_id: logItem.userId,
        user_name: logItem.userName,
        action: logItem.action,
        entity_type: logItem.entityType,
        entity_id: logItem.entityId,
        reference_no: logItem.referenceNo,
        before_data: logItem.beforeData,
        after_data: logItem.afterData,
        reason: logItem.reason,
        created_at: logItem.createdAt
      });
    } catch (err) {
      console.warn('Supabase insert audit_logs error:', err);
    }
  }

  const localLogs = getLocal(STORAGE_KEYS.AUDIT_LOGS, []);
  setLocal(STORAGE_KEYS.AUDIT_LOGS, [logItem, ...localLogs].slice(0, 500));
  return logItem;
}

export async function fetchAccountingPeriods() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('accounting_periods').select('*').order('period_code', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          periodCode: item.period_code,
          fiscalYear: item.fiscal_year,
          periodMonth: item.period_month,
          periodName: item.period_name,
          quarter: item.quarter,
          status: item.status,
          openedAt: item.opened_at,
          openedBy: item.opened_by,
          closedAt: item.closed_at,
          closedBy: item.closed_by,
          lockedAt: item.locked_at,
          lockedBy: item.locked_by,
          reopenReason: item.reopen_reason,
          notes: item.notes
        }));
      }
    } catch (err) {
      console.warn('Error reading accounting_periods from Supabase:', err);
    }
  }
  const local = getLocal(STORAGE_KEYS.ACCOUNTING_PERIODS, null);
  if (!local || local.length === 0) {
    const defaults = getDefaultPeriods();
    setLocal(STORAGE_KEYS.ACCOUNTING_PERIODS, defaults);
    return defaults;
  }
  return local;
}

export async function saveAccountingPeriod(period, currentUser = null, reason = '') {
  const id = period.id || `per-${period.periodCode}`;
  const newPeriod = {
    ...period,
    id,
    updatedAt: new Date().toISOString()
  };

  const localList = getLocal(STORAGE_KEYS.ACCOUNTING_PERIODS, getDefaultPeriods());
  const prev = localList.find(p => p.id === id || p.periodCode === period.periodCode) || null;

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('accounting_periods').upsert({
        id: newPeriod.id,
        period_code: newPeriod.periodCode,
        fiscal_year: newPeriod.fiscalYear,
        period_month: newPeriod.periodMonth,
        period_name: newPeriod.periodName,
        quarter: newPeriod.quarter,
        status: newPeriod.status,
        opened_at: newPeriod.openedAt || null,
        opened_by: newPeriod.openedBy || null,
        closed_at: newPeriod.closedAt || null,
        closed_by: newPeriod.closedBy || null,
        locked_at: newPeriod.lockedAt || null,
        locked_by: newPeriod.lockedBy || null,
        reopen_reason: newPeriod.reopenReason || null,
        notes: newPeriod.notes || null,
        updated_at: newPeriod.updatedAt
      });
    } catch (err) {
      console.warn('Supabase upsert accounting_periods error:', err);
    }
  }

  const idx = localList.findIndex(p => p.id === id || p.periodCode === period.periodCode);
  let updated;
  if (idx >= 0) {
    updated = [...localList];
    updated[idx] = newPeriod;
  } else {
    updated = [newPeriod, ...localList];
  }
  setLocal(STORAGE_KEYS.ACCOUNTING_PERIODS, updated);

  await recordAuditLog({
    userId: currentUser?.id || null,
    userName: currentUser?.fullName || 'Sistem',
    action: `PERIOD_${(newPeriod.status || 'UPDATE').toUpperCase()}`,
    entityType: 'accounting_periods',
    entityId: id,
    referenceNo: newPeriod.periodCode,
    beforeData: prev ? { status: prev.status } : null,
    afterData: { status: newPeriod.status },
    reason: reason || `Perubahan status periode ${newPeriod.periodCode} menjadi ${newPeriod.status}`
  });

  return newPeriod;
}

export async function fetchJournalSequences() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('journal_number_sequences').select('*');
      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          journalType: item.journal_type,
          prefix: item.prefix,
          formatPattern: item.format_pattern,
          seqDigits: item.seq_digits,
          lastNumber: item.last_number,
          resetMonthly: item.reset_monthly !== false
        }));
      }
    } catch (err) {
      console.warn('Error reading journal_number_sequences:', err);
    }
  }
  const local = getLocal(STORAGE_KEYS.JOURNAL_SEQUENCES, null);
  if (!local || local.length === 0) {
    setLocal(STORAGE_KEYS.JOURNAL_SEQUENCES, DEFAULT_JOURNAL_SEQUENCES);
    return DEFAULT_JOURNAL_SEQUENCES;
  }
  return local;
}

export async function saveJournalSequence(seq) {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('journal_number_sequences').upsert({
        id: seq.id,
        journal_type: seq.journalType,
        prefix: seq.prefix,
        format_pattern: seq.formatPattern,
        seq_digits: Number(seq.seqDigits) || 4,
        last_number: Number(seq.lastNumber) || 0,
        reset_monthly: seq.resetMonthly !== false,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Supabase upsert journal_number_sequences error:', err);
    }
  }
  const local = getLocal(STORAGE_KEYS.JOURNAL_SEQUENCES, DEFAULT_JOURNAL_SEQUENCES);
  const idx = local.findIndex(s => s.id === seq.id || s.journalType === seq.journalType);
  const updated = idx >= 0 ? local.map((s, i) => (i === idx ? seq : s)) : [...local, seq];
  setLocal(STORAGE_KEYS.JOURNAL_SEQUENCES, updated);
  return seq;
}

export async function fetchCoaMappings() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('coa_default_mappings').select('*');
      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          mappingKey: item.mapping_key,
          label: item.label,
          moduleGroup: item.module_group,
          accountCode: item.account_code,
          description: item.description
        }));
      }
    } catch (err) {
      console.warn('Error reading coa_default_mappings:', err);
    }
  }
  const local = getLocal(STORAGE_KEYS.COA_MAPPINGS, null);
  if (!local || local.length === 0) {
    setLocal(STORAGE_KEYS.COA_MAPPINGS, DEFAULT_COA_MAPPINGS);
    return DEFAULT_COA_MAPPINGS;
  }
  return local;
}

export async function saveCoaMapping(mapping, currentUser = null) {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('coa_default_mappings').upsert({
        id: mapping.id,
        mapping_key: mapping.mappingKey,
        label: mapping.label,
        module_group: mapping.moduleGroup,
        account_code: mapping.accountCode,
        description: mapping.description || '',
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Supabase upsert coa_default_mappings error:', err);
    }
  }
  const local = getLocal(STORAGE_KEYS.COA_MAPPINGS, DEFAULT_COA_MAPPINGS);
  const prev = local.find(m => m.mappingKey === mapping.mappingKey);
  const idx = local.findIndex(m => m.mappingKey === mapping.mappingKey || m.id === mapping.id);
  const updated = idx >= 0 ? local.map((m, i) => (i === idx ? mapping : m)) : [...local, mapping];
  setLocal(STORAGE_KEYS.COA_MAPPINGS, updated);

  await recordAuditLog({
    userId: currentUser?.id || null,
    userName: currentUser?.fullName || 'Admin',
    action: 'UPDATE_COA_MAPPING',
    entityType: 'coa_default_mappings',
    entityId: mapping.id,
    referenceNo: mapping.mappingKey,
    beforeData: prev ? { accountCode: prev.accountCode } : null,
    afterData: { accountCode: mapping.accountCode },
    reason: `Pemetaan COA ${mapping.label} diubah ke akun ${mapping.accountCode}`
  });

  return mapping;
}

export async function fetchJournalEntries() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('journal_entries').select('*').order('entry_date', { ascending: false });
      if (!error && data) {
        return data.map(item => ({
          id: item.id,
          entryNumber: item.entry_number,
          entryDate: item.entry_date,
          periodCode: item.period_code || getPeriodCodeFromDate(item.entry_date),
          journalType: item.journal_type || 'Jurnal Umum',
          sourceModule: item.source_module || 'Manual',
          referenceId: item.reference_id,
          referenceNo: item.reference_no,
          description: item.description,
          vendorOrCustomer: item.vendor_or_customer || '',
          department: item.department || '',
          taxInfo: item.tax_info || {},
          documentUrl: item.document_url || '',
          totalDebit: Number(item.total_debit || 0),
          totalCredit: Number(item.total_credit || 0),
          status: item.status || 'Posted',
          createdBy: item.created_by || item.posted_by || 'Sistem',
          approvedBy: item.approved_by || '',
          postedBy: item.posted_by,
          postedAt: item.posted_at,
          reversedFromId: item.reversed_from_id || null,
          lines: item.lines || []
        }));
      }
    } catch (err) {
      console.warn('Error reading journal entries from Supabase:', err);
    }
  }
  return getLocal(STORAGE_KEYS.JOURNAL_ENTRIES, []);
}

export async function saveJournalEntry(entry, options = {}) {
  const { currentUser = null, validate = false } = options;
  const supabase = getSupabase();
  const existingJournals = await fetchJournalEntries();
  const periods = await fetchAccountingPeriods();
  const sequences = await fetchJournalSequences();

  const id = entry.id || `je-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const entryDate = entry.entryDate || new Date().toISOString().slice(0, 10);
  const periodCode = entry.periodCode || getPeriodCodeFromDate(entryDate);
  const journalType = entry.journalType || 'Jurnal Umum';
  const targetStatus = entry.status || 'Posted';
  const entryNumber = entry.entryNumber || generateJournalNumber(journalType, entryDate, existingJournals, sequences);

  const lines = (entry.lines || []).map(l => ({
    accountCode: l.accountCode,
    accountName: l.accountName || '',
    description: l.description || entry.description || '',
    debit: Number(l.debit) || 0,
    credit: Number(l.credit) || 0
  }));

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  if (validate || targetStatus === 'Posted') {
    const check = validateJournalEntry({
      entry: { ...entry, id, entryDate, periodCode, journalType, entryNumber },
      lines,
      periods,
      existingJournals,
      targetStatus
    });
    if (!check.isValid) {
      throw new Error(check.errors.join(' '));
    }
  }

  const newEntry = {
    ...entry,
    id,
    entryNumber,
    entryDate,
    periodCode,
    journalType,
    sourceModule: entry.sourceModule || 'Manual',
    totalDebit,
    totalCredit,
    status: targetStatus,
    createdBy: entry.createdBy || currentUser?.fullName || entry.postedBy || 'Sistem',
    postedBy: targetStatus === 'Posted' ? (entry.postedBy || currentUser?.fullName || 'Sistem') : (entry.postedBy || null),
    postedAt: targetStatus === 'Posted' ? (entry.postedAt || new Date().toISOString()) : null,
    lines
  };

  if (supabase) {
    try {
      if (targetStatus === 'Posted') {
        const { error: rpcError } = await supabase.rpc('post_journal_entry_atomic', {
          p_entry: {
            id: newEntry.id,
            entry_number: newEntry.entryNumber,
            entry_date: newEntry.entryDate,
            period_code: newEntry.periodCode,
            journal_type: newEntry.journalType,
            source_module: newEntry.sourceModule,
            reference_id: newEntry.referenceId || null,
            reference_no: newEntry.referenceNo || null,
            description: newEntry.description,
            vendor_or_customer: newEntry.vendorOrCustomer || null,
            department: newEntry.department || null,
            tax_info: newEntry.taxInfo || {},
            document_url: newEntry.documentUrl || null,
            created_by: newEntry.createdBy,
            approved_by: newEntry.approvedBy || newEntry.postedBy,
            reversed_from_id: newEntry.reversedFromId || null
          },
          p_lines: lines,
          p_user_name: newEntry.postedBy || 'Sistem'
        });

        if (rpcError) {
          // Fallback upsert langsung jika RPC belum di-deploy ke Supabase
          console.warn('RPC post_journal_entry_atomic fallback:', rpcError.message);
          await supabase.from('journal_entries').upsert({
            id: newEntry.id,
            entry_number: newEntry.entryNumber,
            entry_date: newEntry.entryDate,
            source_module: newEntry.sourceModule,
            reference_id: newEntry.referenceId || null,
            reference_no: newEntry.referenceNo || null,
            description: newEntry.description,
            total_debit: newEntry.totalDebit,
            total_credit: newEntry.totalCredit,
            status: newEntry.status,
            posted_by: newEntry.postedBy || 'Sistem',
            posted_at: newEntry.postedAt,
            lines: newEntry.lines
          });
        }
      } else {
        await supabase.from('journal_entries').upsert({
          id: newEntry.id,
          entry_number: newEntry.entryNumber,
          entry_date: newEntry.entryDate,
          period_code: newEntry.periodCode,
          journal_type: newEntry.journalType,
          source_module: newEntry.sourceModule,
          reference_id: newEntry.referenceId || null,
          reference_no: newEntry.referenceNo || null,
          description: newEntry.description,
          vendor_or_customer: newEntry.vendorOrCustomer || null,
          department: newEntry.department || null,
          total_debit: newEntry.totalDebit,
          total_credit: newEntry.totalCredit,
          status: newEntry.status,
          created_by: newEntry.createdBy,
          lines: newEntry.lines
        });
      }
    } catch (err) {
      console.warn('Supabase upsert journal error:', err);
    }
  }

  const localList = getLocal(STORAGE_KEYS.JOURNAL_ENTRIES, []);
  const index = localList.findIndex(j => j.id === id);
  let updated;
  if (index >= 0) {
    updated = [...localList];
    updated[index] = newEntry;
  } else {
    updated = [newEntry, ...localList];
  }
  setLocal(STORAGE_KEYS.JOURNAL_ENTRIES, updated);

  await recordAuditLog({
    userId: currentUser?.id || null,
    userName: currentUser?.fullName || newEntry.postedBy || 'Sistem',
    action: targetStatus === 'Posted' ? 'POST_JOURNAL' : 'SAVE_JOURNAL_DRAFT',
    entityType: 'journal_entries',
    entityId: newEntry.id,
    referenceNo: newEntry.entryNumber,
    afterData: { status: newEntry.status, totalDebit, totalCredit, periodCode },
    reason: newEntry.description
  });

  return newEntry;
}

export async function reverseJournalEntry(originalEntry, reason = '', currentUser = null) {
  if (!originalEntry || originalEntry.status !== 'Posted') {
    throw new Error('Hanya jurnal berstatus Posted yang dapat dibuatkan Jurnal Pembalik.');
  }
  if (!reason.trim()) {
    throw new Error('Alasan pembalikan jurnal wajib diisi untuk keperluan Audit Trail.');
  }

  const periods = await fetchAccountingPeriods();
  const today = new Date().toISOString().slice(0, 10);
  const periodCode = getPeriodCodeFromDate(today);
  const periodObj = periods.find(p => p.periodCode === periodCode);
  if (periodObj && (periodObj.status === 'Closed' || periodObj.status === 'Locked')) {
    throw new Error(`Periode ${periodCode} sudah ${periodObj.status}. Tidak dapat membuat jurnal pembalik pada periode terkunci.`);
  }

  const reversalLines = buildReversalLines(originalEntry.lines || []);
  const reversalEntry = await saveJournalEntry({
    entryDate: today,
    periodCode,
    journalType: 'Jurnal Pembalik',
    sourceModule: originalEntry.sourceModule || 'Manual',
    referenceId: originalEntry.id,
    referenceNo: `REV-${originalEntry.entryNumber}`,
    description: `Jurnal Pembalik atas ${originalEntry.entryNumber} — Alasan: ${reason}`,
    vendorOrCustomer: originalEntry.vendorOrCustomer || '',
    department: originalEntry.department || '',
    status: 'Posted',
    reversedFromId: originalEntry.id,
    lines: reversalLines
  }, { currentUser, validate: true });

  // Tandai jurnal asli sebagai Reversed
  const updatedOriginal = { ...originalEntry, status: 'Reversed' };
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('journal_entries').update({ status: 'Reversed', updated_at: new Date().toISOString() }).eq('id', originalEntry.id);
    } catch (err) {
      console.warn('Supabase mark Reversed error:', err);
    }
  }
  const localList = getLocal(STORAGE_KEYS.JOURNAL_ENTRIES, []);
  setLocal(STORAGE_KEYS.JOURNAL_ENTRIES, localList.map(j => (j.id === originalEntry.id ? updatedOriginal : j)));

  await recordAuditLog({
    userId: currentUser?.id || null,
    userName: currentUser?.fullName || 'Sistem',
    action: 'REVERSE_JOURNAL',
    entityType: 'journal_entries',
    entityId: originalEntry.id,
    referenceNo: originalEntry.entryNumber,
    beforeData: { status: 'Posted' },
    afterData: { status: 'Reversed', reversalEntryNumber: reversalEntry.entryNumber },
    reason
  });

  return reversalEntry;
}

export async function deleteDraftJournalEntry(entry, currentUser = null) {
  if (!entry || entry.status === 'Posted' || entry.status === 'Reversed') {
    throw new Error('Jurnal yang sudah diposting tidak boleh dihapus langsung! Gunakan Jurnal Pembalik.');
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('journal_entries').delete().eq('id', entry.id);
    } catch (err) {
      console.warn('Supabase delete draft journal error:', err);
    }
  }

  const localList = getLocal(STORAGE_KEYS.JOURNAL_ENTRIES, []);
  setLocal(STORAGE_KEYS.JOURNAL_ENTRIES, localList.filter(j => j.id !== entry.id));

  await recordAuditLog({
    userId: currentUser?.id || null,
    userName: currentUser?.fullName || 'Sistem',
    action: 'DELETE_DRAFT_JOURNAL',
    entityType: 'journal_entries',
    entityId: entry.id,
    referenceNo: entry.entryNumber,
    beforeData: { status: entry.status, description: entry.description },
    reason: 'Penghapusan draft jurnal'
  });

  return true;
}

// ==============================================================================
// 9. MODUL MASTER KATEGORI ASET TETAP
// ==============================================================================

export async function fetchAssetCategories() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('asset_categories').select('*').order('code', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          code: item.code,
          name: item.name,
          assetAccountCode: item.asset_account_code,
          accumDeprecAccountCode: item.accum_deprec_account_code,
          deprecExpenseAccountCode: item.deprec_expense_account_code,
          defaultDeprecMethod: item.default_deprec_method,
          defaultUsefulLifeYears: item.default_useful_life_years,
          defaultSalvageValuePct: Number(item.default_salvage_value_pct || 0),
          taxGroup: item.tax_group,
          isActive: item.is_active
        }));
      }
    } catch (err) {
      console.warn('Error reading asset categories from Supabase:', err);
    }
  }
  return getLocal(STORAGE_KEYS.ASSET_CATEGORIES, INITIAL_ASSET_CATEGORIES);
}

export async function saveAssetCategory(category) {
  const supabase = getSupabase();
  const id = category.id || `cat-${Date.now()}`;
  const newCat = { ...category, id };

  if (supabase) {
    try {
      const dbPayload = {
        id: newCat.id,
        code: newCat.code,
        name: newCat.name,
        asset_account_code: newCat.assetAccountCode,
        accum_deprec_account_code: newCat.accumDeprecAccountCode,
        deprec_expense_account_code: newCat.deprecExpenseAccountCode,
        default_deprec_method: newCat.defaultDeprecMethod || 'Garis Lurus',
        default_useful_life_years: Number(newCat.defaultUsefulLifeYears || 4),
        default_salvage_value_pct: Number(newCat.defaultSalvageValuePct || 0),
        tax_group: newCat.taxGroup || 'Kelompok 1',
        is_active: newCat.isActive !== false
      };
      await supabase.from('asset_categories').upsert(dbPayload);
    } catch (err) {
      console.warn('Supabase upsert asset_categories error:', err);
    }
  }

  const localList = await fetchAssetCategories();
  const index = localList.findIndex(c => c.id === id);
  let updated;
  if (index >= 0) {
    updated = [...localList];
    updated[index] = newCat;
  } else {
    updated = [...localList, newCat];
  }
  setLocal(STORAGE_KEYS.ASSET_CATEGORIES, updated);
  return newCat;
}

// ==============================================================================
// 10. MODUL ASET TETAP (FIXED ASSETS CRUD & CYCLES)
// ==============================================================================

export async function fetchFixedAssets() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('fixed_assets').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data.map(item => ({
          id: item.id,
          assetNumber: item.asset_number,
          name: item.name,
          categoryId: item.category_id,
          categoryName: item.category_name,
          description: item.description,
          acquisitionDate: item.acquisition_date,
          inServiceDate: item.in_service_date,
          location: item.location,
          department: item.department,
          custodian: item.custodian,
          serialNumber: item.serial_number,
          condition: item.condition,
          vendorId: item.vendor_id,
          vendorName: item.vendor_name,
          purchaseInvoiceNo: item.purchase_invoice_no,
          purchaseRequestId: item.purchase_request_id,
          purchasePrice: Number(item.purchase_price || 0),
          deliveryCost: Number(item.delivery_cost || 0),
          installationCost: Number(item.installation_cost || 0),
          otherCapitalizedCost: Number(item.other_capitalized_cost || 0),
          discountAmount: Number(item.discount_amount || 0),
          nonCreditableVat: Number(item.non_creditable_vat || 0),
          acquisitionCost: Number(item.acquisition_cost || 0),
          depreciationMethod: item.depreciation_method,
          usefulLifeYears: Number(item.useful_life_years || 4),
          usefulLifeMonths: Number(item.useful_life_months || 48),
          salvageValue: Number(item.salvage_value || 0),
          depreciationRatePct: Number(item.depreciation_rate_pct || 25),
          monthlyDepreciation: Number(item.monthly_depreciation || 0),
          accumulatedDepreciation: Number(item.accumulated_depreciation || 0),
          bookValue: Number(item.book_value || 0),
          totalEstimatedUnits: Number(item.total_estimated_units || 0),
          unitsProducedToDate: Number(item.units_produced_to_date || 0),
          taxGroup: item.tax_group,
          taxDepreciationMethod: item.tax_depreciation_method,
          taxUsefulLifeYears: Number(item.tax_useful_life_years || 4),
          taxRatePct: Number(item.tax_rate_pct || 25),
          taxMonthlyDepreciation: Number(item.tax_monthly_depreciation || 0),
          taxAccumulatedDepreciation: Number(item.tax_accumulated_depreciation || 0),
          taxBookValue: Number(item.tax_book_value || 0),
          status: item.status,
          lastDepreciationDate: item.last_depreciation_date
        }));
      }
    } catch (err) {
      console.warn('Error reading fixed assets from Supabase:', err);
    }
  }
  return getLocal(STORAGE_KEYS.FIXED_ASSETS, []);
}

export async function saveFixedAsset(asset) {
  const supabase = getSupabase();
  const id = asset.id || `ast-${Date.now()}`;
  
  // Hitung ulang schedule komersial & fiskal
  const comm = calculateCommercialDepreciationSchedule({
    acquisitionCost: asset.acquisitionCost,
    salvageValue: asset.salvageValue || 0,
    usefulLifeYears: asset.usefulLifeYears || 4,
    method: asset.depreciationMethod || 'Garis Lurus',
    inServiceDate: asset.inServiceDate || asset.acquisitionDate,
    totalEstimatedUnits: asset.totalEstimatedUnits || 0
  });

  const tax = calculateTaxDepreciationSchedule({
    acquisitionCost: asset.acquisitionCost,
    taxGroup: asset.taxGroup || 'Kelompok 1',
    taxMethod: asset.taxDepreciationMethod || 'Garis Lurus',
    inServiceDate: asset.inServiceDate || asset.acquisitionDate
  });

  const monthlyDep = comm.monthlyDepreciationEstimate;
  const accumDep = asset.accumulatedDepreciation !== undefined ? Number(asset.accumulatedDepreciation) : 0;
  const bookVal = Math.max(Number(asset.salvageValue || 0), Number(asset.acquisitionCost || 0) - accumDep);

  const taxMonthlyDep = tax.monthlyDepreciationEstimate;
  const taxAccumDep = asset.taxAccumulatedDepreciation !== undefined ? Number(asset.taxAccumulatedDepreciation) : 0;
  const taxBookVal = Math.max(0, Number(asset.acquisitionCost || 0) - taxAccumDep);

  const newAsset = {
    ...asset,
    id,
    monthlyDepreciation: monthlyDep,
    accumulatedDepreciation: accumDep,
    bookValue: bookVal,
    taxMonthlyDepreciation: taxMonthlyDep,
    taxAccumulatedDepreciation: taxAccumDep,
    taxBookValue: taxBookVal,
    status: asset.status || 'Active'
  };

  if (supabase) {
    try {
      const dbPayload = {
        id: newAsset.id,
        asset_number: newAsset.assetNumber,
        name: newAsset.name,
        category_id: newAsset.categoryId || null,
        category_name: newAsset.categoryName,
        description: newAsset.description || '',
        acquisition_date: newAsset.acquisitionDate,
        in_service_date: newAsset.inServiceDate || newAsset.acquisitionDate,
        location: newAsset.location || 'Kantor Pusat',
        department: newAsset.department || 'Operasional',
        custodian: newAsset.custodian || '',
        serial_number: newAsset.serialNumber || '',
        condition: newAsset.condition || 'Baik',
        vendor_id: newAsset.vendorId || null,
        vendor_name: newAsset.vendorName || '',
        purchase_invoice_no: newAsset.purchaseInvoiceNo || '',
        purchase_request_id: newAsset.purchaseRequestId || null,
        purchase_price: Number(newAsset.purchasePrice || 0),
        delivery_cost: Number(newAsset.deliveryCost || 0),
        installation_cost: Number(newAsset.installationCost || 0),
        other_capitalized_cost: Number(newAsset.otherCapitalizedCost || 0),
        discount_amount: Number(newAsset.discountAmount || 0),
        non_creditable_vat: Number(newAsset.nonCreditableVat || 0),
        acquisition_cost: Number(newAsset.acquisitionCost || 0),
        depreciation_method: newAsset.depreciationMethod || 'Garis Lurus',
        useful_life_years: Number(newAsset.usefulLifeYears || 4),
        useful_life_months: Math.round(Number(newAsset.usefulLifeYears || 4) * 12),
        salvage_value: Number(newAsset.salvageValue || 0),
        depreciation_rate_pct: Number(newAsset.depreciationRatePct || 25),
        monthly_depreciation: monthlyDep,
        accumulated_depreciation: accumDep,
        book_value: bookVal,
        total_estimated_units: Number(newAsset.totalEstimatedUnits || 0),
        units_produced_to_date: Number(newAsset.unitsProducedToDate || 0),
        tax_group: newAsset.taxGroup || 'Kelompok 1',
        tax_depreciation_method: newAsset.taxDepreciationMethod || 'Garis Lurus',
        tax_useful_life_years: Number(tax.usefulLifeYears || 4),
        tax_rate_pct: Number(tax.annualRate || 25),
        tax_monthly_depreciation: taxMonthlyDep,
        tax_accumulated_depreciation: taxAccumDep,
        tax_book_value: taxBookVal,
        status: newAsset.status,
        last_depreciation_date: newAsset.lastDepreciationDate || null
      };
      await supabase.from('fixed_assets').upsert(dbPayload);
    } catch (err) {
      console.warn('Supabase upsert fixed_assets error:', err);
    }
  }

  const localList = await fetchFixedAssets();
  const index = localList.findIndex(a => a.id === id);
  let updated;
  if (index >= 0) {
    updated = [...localList];
    updated[index] = newAsset;
  } else {
    updated = [newAsset, ...localList];
  }
  setLocal(STORAGE_KEYS.FIXED_ASSETS, updated);
  return newAsset;
}

export async function deleteFixedAsset(id) {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('fixed_assets').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete fixed asset error:', err);
    }
  }
  const localList = await fetchFixedAssets();
  const filtered = localList.filter(a => a.id !== id);
  setLocal(STORAGE_KEYS.FIXED_ASSETS, filtered);
  return true;
}

// ==============================================================================
// 11. OTOMATISASI GENERATE & POSTING JURNAL PENYUSUTAN BULANAN
// ==============================================================================

export async function fetchAssetPostings() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('asset_depreciation_postings').select('*').order('posting_date', { ascending: false });
      if (!error && data) {
        return data.map(item => ({
          id: item.id,
          postingNumber: item.posting_number,
          postingDate: item.posting_date,
          periodYear: item.period_year,
          periodMonth: item.period_month,
          totalAssetsProcessed: Number(item.total_assets_processed || 0),
          totalDepreciationAmount: Number(item.total_depreciation_amount || 0),
          journalEntryId: item.journal_entry_id,
          status: item.status,
          postedBy: item.posted_by,
          postedAt: item.posted_at,
          notes: item.notes
        }));
      }
    } catch (err) {
      console.warn('Error reading asset postings from Supabase:', err);
    }
  }
  return getLocal(STORAGE_KEYS.ASSET_POSTINGS, []);
}

/**
 * Preview Penyusutan Bulan Berjalan (Komersial) untuk Semua Aset Aktif
 */
export async function previewMonthlyDepreciation({ periodYear, periodMonth }) {
  const assets = await fetchFixedAssets();
  const categories = await fetchAssetCategories();
  const postings = await fetchAssetPostings();

  // Cek apakah periode ini sudah pernah diposting
  const alreadyPosted = postings.some(p => p.periodYear === periodYear && p.periodMonth === periodMonth && p.status === 'Posted');

  const eligibleAssets = assets.filter(a => a.status === 'Active');
  const details = [];
  let totalDep = 0;

  eligibleAssets.forEach(asset => {
    const cat = categories.find(c => c.id === asset.categoryId || c.name === asset.categoryName) || categories[0];
    const sched = calculateCommercialDepreciationSchedule({
      acquisitionCost: asset.acquisitionCost,
      salvageValue: asset.salvageValue || 0,
      usefulLifeYears: asset.usefulLifeYears || 4,
      method: asset.depreciationMethod || 'Garis Lurus',
      inServiceDate: asset.inServiceDate
    });

    // Cari jadwal untuk periode ini
    const targetPeriod = sched.monthlySchedules.find(m => m.periodYear === periodYear && m.periodMonth === periodMonth);
    const amount = targetPeriod ? targetPeriod.depreciationAmount : (asset.monthlyDepreciation || 0);

    // Pastikan tidak menyusutkan jika sudah habis masa manfaat (nilai buku <= residu)
    const maxDepreciable = Math.max(0, (Number(asset.bookValue) || 0) - (Number(asset.salvageValue) || 0));
    const effectiveDep = Math.min(amount, maxDepreciable);

    if (effectiveDep > 0) {
      totalDep += effectiveDep;
      details.push({
        assetId: asset.id,
        assetNumber: asset.assetNumber,
        assetName: asset.name,
        categoryName: asset.categoryName,
        assetAccountCode: cat?.assetAccountCode || '1201',
        accumDeprecAccountCode: cat?.accumDeprecAccountCode || '1281',
        deprecExpenseAccountCode: cat?.deprecExpenseAccountCode || '6201',
        currentBookValue: asset.bookValue,
        depreciationAmount: effectiveDep,
        newBookValue: Math.max(asset.salvageValue || 0, asset.bookValue - effectiveDep)
      });
    }
  });

  return {
    periodYear,
    periodMonth,
    periodLabel: `${periodYear}-${String(periodMonth).padStart(2, '0')}`,
    alreadyPosted,
    totalAssets: eligibleAssets.length,
    assetsToDepreciate: details.length,
    totalDepreciationAmount: totalDep,
    details
  };
}

/**
 * Eksekusi Posting Jurnal Penyusutan Bulanan
 */
export async function executeMonthlyDepreciationPosting({
  periodYear,
  periodMonth,
  currentUser,
  notes = ''
}) {
  const preview = await previewMonthlyDepreciation({ periodYear, periodMonth });
  if (preview.alreadyPosted) {
    throw new Error(`Penyusutan untuk periode ${periodYear}-${String(periodMonth).padStart(2, '0')} sudah pernah diposting. Jurnal tidak boleh dibuat ganda.`);
  }
  if (preview.details.length === 0 || preview.totalDepreciationAmount <= 0) {
    throw new Error(`Tidak ada aset aktif yang memenuhi syarat untuk disusutkan pada periode ini.`);
  }

  const postingNumber = `DEP-${periodYear}${String(periodMonth).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`;
  const postingDate = new Date().toISOString().slice(0, 10);

  // Buat Jurnal Lines (Debit Beban Penyusutan, Kredit Akumulasi Penyusutan) dikelompokkan per akun
  const linesMap = {};
  preview.details.forEach(item => {
    // 1. Debit: Beban Penyusutan
    const expCode = item.deprecExpenseAccountCode;
    if (!linesMap[`D-${expCode}`]) {
      linesMap[`D-${expCode}`] = {
        accountCode: expCode,
        accountName: `Beban Penyusutan (${item.categoryName})`,
        debit: 0,
        credit: 0,
        memo: `Penyusutan ${periodYear}-${periodMonth} - ${item.categoryName}`
      };
    }
    linesMap[`D-${expCode}`].debit += item.depreciationAmount;

    // 2. Kredit: Akumulasi Penyusutan
    const accCode = item.accumDeprecAccountCode;
    if (!linesMap[`C-${accCode}`]) {
      linesMap[`C-${accCode}`] = {
        accountCode: accCode,
        accountName: `Akumulasi Penyusutan (${item.categoryName})`,
        debit: 0,
        credit: 0,
        memo: `Akum. Penyusutan ${periodYear}-${periodMonth} - ${item.categoryName}`
      };
    }
    linesMap[`C-${accCode}`].credit += item.depreciationAmount;
  });

  const journalLines = Object.values(linesMap);

  // Simpan Jurnal Umum
  const journalEntry = await saveJournalEntry({
    entryDate: postingDate,
    sourceModule: 'Aset Tetap',
    referenceNo: postingNumber,
    description: `Penyusutan Aset Tetap Periode ${periodYear}-${String(periodMonth).padStart(2, '0')} (${preview.details.length} Aset)`,
    totalDebit: preview.totalDepreciationAmount,
    totalCredit: preview.totalDepreciationAmount,
    status: 'Posted',
    postedBy: currentUser?.fullName || 'Finance Staff',
    lines: journalLines
  });

  // Update nilai akumulasi & buku di data Aset
  const allAssets = await fetchFixedAssets();
  for (const item of preview.details) {
    const target = allAssets.find(a => a.id === item.assetId);
    if (target) {
      const newAccum = (Number(target.accumulatedDepreciation) || 0) + item.depreciationAmount;
      const newBook = Math.max(target.salvageValue || 0, (Number(target.acquisitionCost) || 0) - newAccum);
      const isFinished = newBook <= (target.salvageValue || 0);

      await saveFixedAsset({
        ...target,
        accumulatedDepreciation: newAccum,
        bookValue: newBook,
        status: isFinished ? 'Fully Depreciated' : target.status,
        lastDepreciationDate: postingDate
      });
    }
  }

  // Simpan Record Posting
  const postingRecord = {
    id: `post-${Date.now()}`,
    postingNumber,
    postingDate,
    periodYear,
    periodMonth,
    totalAssetsProcessed: preview.details.length,
    totalDepreciationAmount: preview.totalDepreciationAmount,
    journalEntryId: journalEntry.id,
    status: 'Posted',
    postedBy: currentUser?.fullName || 'Finance Staff',
    postedAt: new Date().toISOString(),
    notes: notes || `Posting otomatis penyusutan bulanan untuk ${preview.details.length} aset.`
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('asset_depreciation_postings').upsert({
        id: postingRecord.id,
        posting_number: postingRecord.postingNumber,
        posting_date: postingRecord.postingDate,
        period_year: postingRecord.periodYear,
        period_month: postingRecord.periodMonth,
        total_assets_processed: postingRecord.totalAssetsProcessed,
        total_depreciation_amount: postingRecord.totalDepreciationAmount,
        journal_entry_id: postingRecord.journalEntryId,
        status: postingRecord.status,
        posted_by: postingRecord.postedBy,
        posted_at: postingRecord.postedAt,
        notes: postingRecord.notes
      });
    } catch (e) {
      console.warn('Supabase upsert posting error:', e);
    }
  }

  const localPostings = getLocal(STORAGE_KEYS.ASSET_POSTINGS, []);
  setLocal(STORAGE_KEYS.ASSET_POSTINGS, [postingRecord, ...localPostings]);

  return {
    success: true,
    postingRecord,
    journalEntry,
    processedCount: preview.details.length,
    totalAmount: preview.totalDepreciationAmount
  };
}

// ==============================================================================
// 12. MUTASI & PERUBAHAN ASET
// ==============================================================================

export async function fetchAssetMovements() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('asset_movements').select('*').order('movement_date', { ascending: false });
      if (!error && data) {
        return data.map(m => ({
          id: m.id,
          movementNumber: m.movement_number,
          assetId: m.asset_id,
          movementDate: m.movement_date,
          movementType: m.movement_type,
          previousLocation: m.previous_location,
          previousDepartment: m.previous_department,
          previousCustodian: m.previous_custodian,
          previousCondition: m.previous_condition,
          newLocation: m.new_location,
          newDepartment: m.new_department,
          newCustodian: m.new_custodian,
          newCondition: m.new_condition,
          reason: m.reason,
          performedBy: m.performed_by
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch asset movements error:', e);
    }
  }
  return getLocal(STORAGE_KEYS.ASSET_MOVEMENTS, []);
}

export async function recordAssetMovement({
  asset,
  movementType,
  newLocation,
  newDepartment,
  newCustodian,
  newCondition,
  reason,
  currentUser
}) {
  const movNumber = `MOV-${Date.now().toString().slice(-6)}`;
  const movDate = new Date().toISOString().slice(0, 10);

  const movRecord = {
    id: `mov-${Date.now()}`,
    movementNumber: movNumber,
    assetId: asset.id,
    movementDate: movDate,
    movementType,
    previousLocation: asset.location,
    previousDepartment: asset.department,
    previousCustodian: asset.custodian,
    previousCondition: asset.condition,
    newLocation: newLocation || asset.location,
    newDepartment: newDepartment || asset.department,
    newCustodian: newCustodian || asset.custodian,
    newCondition: newCondition || asset.condition,
    reason: reason || 'Mutasi internal aset',
    performedBy: currentUser?.fullName || 'Admin'
  };

  const updatedAsset = {
    ...asset,
    location: movRecord.newLocation,
    department: movRecord.newDepartment,
    custodian: movRecord.newCustodian,
    condition: movRecord.newCondition
  };

  await saveFixedAsset(updatedAsset);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('asset_movements').upsert({
        id: movRecord.id,
        movement_number: movRecord.movementNumber,
        asset_id: movRecord.assetId,
        movement_date: movRecord.movementDate,
        movement_type: movRecord.movementType,
        previous_location: movRecord.previousLocation,
        previous_department: movRecord.previousDepartment,
        previous_custodian: movRecord.previousCustodian,
        previous_condition: movRecord.previousCondition,
        new_location: movRecord.newLocation,
        new_department: movRecord.newDepartment,
        new_custodian: movRecord.newCustodian,
        new_condition: movRecord.newCondition,
        reason: movRecord.reason,
        performed_by: movRecord.performedBy
      });
    } catch (e) {
      console.warn('Supabase record movement error:', e);
    }
  }

  const list = getLocal(STORAGE_KEYS.ASSET_MOVEMENTS, []);
  setLocal(STORAGE_KEYS.ASSET_MOVEMENTS, [movRecord, ...list]);

  return { success: true, movRecord, updatedAsset };
}

// ==============================================================================
// 13. PELEPASAN & PENJUALAN ASET (DISPOSAL)
// ==============================================================================

export async function fetchAssetDisposals() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('asset_disposals').select('*').order('disposal_date', { ascending: false });
      if (!error && data) {
        return data.map(d => ({
          id: d.id,
          disposalNumber: d.disposal_number,
          assetId: d.asset_id,
          assetNumber: d.asset_number,
          assetName: d.asset_name,
          disposalDate: d.disposal_date,
          disposalType: d.disposal_type,
          acquisitionCost: Number(d.acquisition_cost || 0),
          accumulatedDepreciation: Number(d.accumulated_depreciation || 0),
          bookValueAtDisposal: Number(d.book_value_at_disposal || 0),
          sellingPrice: Number(d.selling_price || 0),
          disposalExpenses: Number(d.disposal_expenses || 0),
          netProceeds: Number(d.net_proceeds || 0),
          gainOrLoss: Number(d.gain_or_loss || 0),
          buyerInfo: d.buyer_info,
          paymentAccountCode: d.payment_account_code,
          journalEntryId: d.journal_entry_id,
          notes: d.notes,
          disposedBy: d.disposed_by
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch asset disposals error:', e);
    }
  }
  return getLocal(STORAGE_KEYS.ASSET_DISPOSALS, []);
}

export async function executeAssetDisposal({
  asset,
  disposalDate,
  disposalType = 'Sold', // 'Sold', 'Scrapped', 'Damaged', 'Lost'
  sellingPrice = 0,
  disposalExpenses = 0,
  paymentAccountCode = '1102', // Default Bank BCA
  buyerInfo = '',
  notes = '',
  currentUser
}) {
  if (!asset || asset.status === 'Disposed') {
    throw new Error('Aset tidak valid atau sudah berstatus Dilepas.');
  }

  const dispNumber = `DSP-${Date.now().toString().slice(-6)}`;
  const dateStr = disposalDate || new Date().toISOString().slice(0, 10);
  const cost = Number(asset.acquisitionCost) || 0;
  const accum = Number(asset.accumulatedDepreciation) || 0;
  const bookValue = Math.max(0, cost - accum);

  const price = Number(sellingPrice) || 0;
  const exp = Number(disposalExpenses) || 0;
  const netProceeds = price - exp;
  const gainOrLoss = netProceeds - bookValue; // > 0 Laba, < 0 Rugi

  const categories = await fetchAssetCategories();
  const cat = categories.find(c => c.id === asset.categoryId || c.name === asset.categoryName) || categories[0];
  const assetAcc = cat?.assetAccountCode || '1201';
  const accumAcc = cat?.accumDeprecAccountCode || '1281';

  // Buat Jurnal Pelepasan Aset
  const journalLines = [];

  // 1. Debit Kas/Bank jika ada penerimaan bersih dari penjualan
  if (netProceeds > 0) {
    journalLines.push({
      accountCode: paymentAccountCode,
      accountName: 'Kas / Bank Penerimaan Penjualan Aset',
      debit: netProceeds,
      credit: 0,
      memo: `Penerimaan hasil penjualan aset ${asset.assetNumber}`
    });
  }

  // 2. Debit Akumulasi Penyusutan (Hapus akumulasi dari neraca)
  if (accum > 0) {
    journalLines.push({
      accountCode: accumAcc,
      accountName: `Akumulasi Penyusutan - ${asset.categoryName}`,
      debit: accum,
      credit: 0,
      memo: `Penghapusan akumulasi penyusutan aset ${asset.assetNumber}`
    });
  }

  // 3. Catat Rugi (Debit) atau Laba (Kredit) Pelepasan Aset
  if (gainOrLoss < 0) {
    // Rugi Pelepasan (Debit Akun 7201)
    journalLines.push({
      accountCode: '7201',
      accountName: 'Kerugian Pelepasan / Penjualan Aset Tetap',
      debit: Math.abs(gainOrLoss),
      credit: 0,
      memo: `Rugi pelepasan aset ${asset.assetNumber}`
    });
  } else if (gainOrLoss > 0) {
    // Laba Pelepasan (Kredit Akun 7101)
    journalLines.push({
      accountCode: '7101',
      accountName: 'Keuntungan (Laba) Pelepasan / Penjualan Aset Tetap',
      debit: 0,
      credit: gainOrLoss,
      memo: `Laba pelepasan aset ${asset.assetNumber}`
    });
  }

  // 4. Kredit Harga Perolehan Aset Tetap (Hapus aset dari neraca)
  journalLines.push({
    accountCode: assetAcc,
    accountName: `Aset Tetap - ${asset.categoryName}`,
    debit: 0,
    credit: cost,
    memo: `Penghapusan harga perolehan aset ${asset.assetNumber}`
  });

  const totDebit = journalLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totCredit = journalLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);

  // Simpan Jurnal Pelepasan
  const journalEntry = await saveJournalEntry({
    entryDate: dateStr,
    sourceModule: 'Aset Tetap',
    referenceNo: dispNumber,
    description: `Pelepasan / Penjualan Aset Tetap ${asset.assetNumber} (${asset.name}) - ${disposalType}`,
    totalDebit: totDebit,
    totalCredit: totCredit,
    status: 'Posted',
    postedBy: currentUser?.fullName || 'Finance Staff',
    lines: journalLines
  });

  // Update Saldo Kas / Bank jika ada penjualan
  if (netProceeds > 0 && paymentAccountCode) {
    try {
      const coaList = await fetchCOA();
      const targetAcc = coaList.find(a => a.code === paymentAccountCode);
      if (targetAcc) {
        await saveCOAAccount({
          ...targetAcc,
          balance: (Number(targetAcc.balance) || 0) + netProceeds
        });
      }
    } catch (e) {
      console.warn('Gagal menambah saldo kas pelepasan aset:', e);
    }
  }

  // Update Status Aset menjadi 'Disposed' dan nilai buku 0
  const updatedAsset = {
    ...asset,
    status: 'Disposed',
    bookValue: 0
  };
  await saveFixedAsset(updatedAsset);

  // Simpan Data Disposal
  const disposalRecord = {
    id: `dsp-${Date.now()}`,
    disposalNumber: dispNumber,
    assetId: asset.id,
    assetNumber: asset.assetNumber,
    assetName: asset.name,
    disposalDate: dateStr,
    disposalType,
    acquisitionCost: cost,
    accumulatedDepreciation: accum,
    bookValueAtDisposal: bookValue,
    sellingPrice: price,
    disposalExpenses: exp,
    netProceeds,
    gainOrLoss,
    buyerInfo: buyerInfo || '',
    paymentAccountCode: paymentAccountCode || '',
    journalEntryId: journalEntry.id,
    notes: notes || '',
    disposedBy: currentUser?.fullName || 'Admin'
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('asset_disposals').upsert({
        id: disposalRecord.id,
        disposal_number: disposalRecord.disposalNumber,
        asset_id: disposalRecord.assetId,
        asset_number: disposalRecord.assetNumber,
        asset_name: disposalRecord.assetName,
        disposal_date: disposalRecord.disposalDate,
        disposal_type: disposalRecord.disposalType,
        acquisition_cost: disposalRecord.acquisitionCost,
        accumulated_depreciation: disposalRecord.accumulatedDepreciation,
        book_value_at_disposal: disposalRecord.bookValueAtDisposal,
        selling_price: disposalRecord.sellingPrice,
        disposal_expenses: disposalRecord.disposalExpenses,
        net_proceeds: disposalRecord.netProceeds,
        gain_or_loss: disposalRecord.gainOrLoss,
        buyer_info: disposalRecord.buyerInfo,
        payment_account_code: disposalRecord.paymentAccountCode,
        journal_entry_id: disposalRecord.journalEntryId,
        notes: disposalRecord.notes,
        disposed_by: disposalRecord.disposedBy
      });
    } catch (e) {
      console.warn('Supabase upsert disposal error:', e);
    }
  }

  const localDisp = getLocal(STORAGE_KEYS.ASSET_DISPOSALS, []);
  setLocal(STORAGE_KEYS.ASSET_DISPOSALS, [disposalRecord, ...localDisp]);

  return {
    success: true,
    disposalRecord,
    journalEntry,
    updatedAsset
  };
}

// ==============================================================================
// 7. MODUL MASTER PRODUK & JASA (PRODUCTS)
// ==============================================================================
export async function fetchProducts() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').select('*').order('code', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          code: item.code,
          barcode: item.barcode || '',
          name: item.name,
          description: item.description || '',
          unit: item.unit || 'Pcs',
          category: item.category || 'Umum',
          productType: item.product_type || 'Barang',
          imageUrl: item.image_url || '',
          isPurchased: item.is_purchased !== false,
          purchasePrice: Number(item.purchase_price || 0),
          purchaseAccountCode: item.purchase_account_code || '6105',
          purchaseTaxType: Number(item.purchase_tax_type || 0),
          isSold: Boolean(item.is_sold),
          sellingPrice: Number(item.selling_price || 0),
          salesAccountCode: item.sales_account_code || '4101',
          salesTaxType: Number(item.sales_tax_type || 0),
          discountAccountCode: item.discount_account_code || '4-40201',
          isActive: item.is_active !== false,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
      }
      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase fetch products error:', error.message);
      }
    } catch (err) {
      console.warn('Error reading products from Supabase:', err);
    }
  }

  return getLocal(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
}

export async function saveProduct(product) {
  const supabase = getSupabase();
  const id = product.id || `prod-${Date.now()}`;
  const now = new Date().toISOString();
  
  const productData = {
    ...product,
    id,
    purchasePrice: Number(product.purchasePrice || 0),
    sellingPrice: Number(product.sellingPrice || 0),
    purchaseTaxType: Number(product.purchaseTaxType || 0),
    salesTaxType: Number(product.salesTaxType || 0),
    updatedAt: now
  };

  if (supabase) {
    try {
      const dbPayload = {
        id: productData.id,
        code: productData.code,
        barcode: productData.barcode || null,
        name: productData.name,
        description: productData.description || null,
        unit: productData.unit || 'Pcs',
        category: productData.category || null,
        product_type: productData.productType || 'Barang',
        image_url: productData.imageUrl || null,
        is_purchased: productData.isPurchased !== false,
        purchase_price: productData.purchasePrice,
        purchase_account_code: productData.purchaseAccountCode || null,
        purchase_tax_type: productData.purchaseTaxType,
        is_sold: Boolean(productData.isSold),
        selling_price: productData.sellingPrice,
        sales_account_code: productData.salesAccountCode || null,
        sales_tax_type: productData.salesTaxType,
        discount_account_code: productData.discountAccountCode || null,
        is_active: productData.isActive !== false,
        updated_at: now
      };

      const { data, error } = await supabase
        .from('products')
        .upsert(dbPayload, { onConflict: 'id' })
        .select()
        .single();

      if (!error && data) {
        const localList = getLocal(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
        const index = localList.findIndex(p => p.id === id || p.code === product.code);
        let updated;
        if (index >= 0) {
          updated = [...localList];
          updated[index] = productData;
        } else {
          updated = [productData, ...localList];
        }
        setLocal(STORAGE_KEYS.PRODUCTS, updated);
        return productData;
      }
      if (error) {
        console.warn('Supabase save product error:', error.message);
      }
    } catch (err) {
      console.warn('Error saving product to Supabase:', err);
    }
  }

  // Fallback to local
  const localList = getLocal(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  const index = localList.findIndex(p => p.id === id || p.code === product.code);
  let updated;
  if (index >= 0) {
    updated = [...localList];
    updated[index] = productData;
  } else {
    updated = [productData, ...localList];
  }
  setLocal(STORAGE_KEYS.PRODUCTS, updated);
  return productData;
}

export async function deleteProduct(id) {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        console.warn('Supabase delete product error:', error.message);
      }
    } catch (err) {
      console.warn('Error deleting product from Supabase:', err);
    }
  }

  const localList = getLocal(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  const filtered = localList.filter(p => p.id !== id);
  setLocal(STORAGE_KEYS.PRODUCTS, filtered);
  return true;
}


