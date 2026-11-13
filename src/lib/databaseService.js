import { getSupabase } from './supabase';
import { INITIAL_USERS, INITIAL_ROLES } from './initialUsers';

const STORAGE_KEYS = {
  COA: 'app_coa_data',
  VENDORS: 'app_vendors_data',
  PURCHASES: 'app_purchases_data',
  TAX: 'app_tax_data',
  USERS: 'app_users_data',
  ROLES: 'app_roles_data',
  VENDOR_DEPOSITS: 'app_vendor_deposits_data',
  PAYMENT_TRANSACTIONS: 'app_payment_transactions_data',
  PURCHASES_PAYMENTS: 'app_purchases_payments_data'
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
            pphType: item.pph_type,
            pphRate: Number(item.pph_rate || 0),
            pphAmount: Number(item.pph_amount || 0),
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
            items: item.items || []
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
      remainingPayable: meta.remainingPayable !== undefined ? Number(meta.remainingPayable) : (item.status === 'Lunas' ? 0 : origPayable),
      paidAmount: meta.paidAmount !== undefined ? Number(meta.paidAmount) : (item.status === 'Lunas' ? origPayable : 0),
      paymentHistory: meta.paymentHistory || item.paymentHistory || []
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

export async function deletePurchaseRequest(id) {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('purchase_requests').delete().eq('id', id);
      return true;
    } catch (err) {
      console.error('Supabase delete purchase error:', err);
    }
  }

  const localList = getLocal(STORAGE_KEYS.PURCHASES, []);
  const filtered = localList.filter(p => p.id !== id);
  setLocal(STORAGE_KEYS.PURCHASES, filtered);
  return true;
}

// Auto sync tax record when PR has PPh
async function autoSyncTaxRecordFromPurchase(pr) {
  const taxList = await fetchTaxRecords();
  const existing = taxList.find(t => t.referenceNo === pr.requestNumber);
  
  const d = new Date(pr.requestDate);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const taxRecord = {
    id: existing ? existing.id : `tax-auto-${pr.id}`,
    taxType: pr.pphType,
    taxPeriodMonth: month,
    taxPeriodYear: year,
    transactionDate: pr.requestDate,
    referenceNo: pr.requestNumber,
    sourceModule: 'Pembelian',
    vendorId: pr.vendorId || null,
    taxpayerName: pr.vendorName,
    taxpayerNpwp: '',
    hasNpwp: true,
    taxObjectCode: pr.pphType === 'PPh 23' ? '24-104-01' : (pr.pphType === 'PPh 4(2)' ? '28-401-01' : '21-100-02'),
    taxObjectDescription: `Pemotongan ${pr.pphType} atas ${pr.title}`,
    grossAmount: pr.subtotal,
    dppAmount: pr.dpp,
    taxRate: pr.pphRate,
    taxAmount: pr.pphAmount,
    billingId: existing?.billingId || '',
    ntpn: existing?.ntpn || '',
    paymentDate: existing?.paymentDate || null,
    status: pr.status === 'Lunas' ? (existing?.status || 'Lunas / Disetor (NTPN)') : (existing?.status || 'Draft / Belum Disetor'),
    notes: `Otomatis dibuat dari Pengajuan Pembelian ${pr.requestNumber}`
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
