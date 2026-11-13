-- ==============================================================================
-- SISTEM KEUANGAN & PAJAK PERUSAHAAN (INDONESIA)
-- SKEMA SUPABASE: COA, VENDOR, PENGAJUAN PEMBELIAN, PPH 21/22/23/25/4(2)
-- ==============================================================================

-- 1. EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL: CHART OF ACCOUNTS (COA)
CREATE TABLE IF NOT EXISTS public.coa (
    id TEXT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
    sub_category VARCHAR(100),
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('Debit', 'Credit')),
    level INT DEFAULT 3,
    parent_code VARCHAR(20),
    balance NUMERIC(18, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABEL: MASTER SUPPLIER / VENDOR
CREATE TABLE IF NOT EXISTS public.vendors (
    id TEXT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Badan', 'Orang Pribadi')),
    category VARCHAR(100) NOT NULL,
    npwp VARCHAR(50),
    has_npwp BOOLEAN DEFAULT TRUE,
    address TEXT,
    city VARCHAR(100),
    pic_name VARCHAR(150),
    pic_email VARCHAR(150),
    pic_phone VARCHAR(50),
    bank_name VARCHAR(100),
    bank_account VARCHAR(100),
    bank_account_holder VARCHAR(150),
    payment_term VARCHAR(50) DEFAULT 'Net 30',
    status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABEL: PENGAJUAN PEMBELIAN (PURCHASE REQUESTS)
CREATE TABLE IF NOT EXISTS public.purchase_requests (
    id TEXT PRIMARY KEY,
    request_number VARCHAR(50) NOT NULL UNIQUE,
    request_date DATE NOT NULL,
    due_date DATE,
    requester_name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
    vendor_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subtotal NUMERIC(18, 2) DEFAULT 0,
    discount NUMERIC(18, 2) DEFAULT 0,
    dpp NUMERIC(18, 2) DEFAULT 0,
    ppn_rate NUMERIC(5, 2) DEFAULT 11,
    ppn_amount NUMERIC(18, 2) DEFAULT 0,
    pph_type VARCHAR(20) DEFAULT 'Non-PPh',
    pph_rate NUMERIC(5, 2) DEFAULT 0,
    pph_amount NUMERIC(18, 2) DEFAULT 0,
    total_payable NUMERIC(18, 2) DEFAULT 0,
    grand_total NUMERIC(18, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Draft',
    approval_date TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(150),
    coa_debit_account VARCHAR(20),
    coa_credit_account VARCHAR(20),
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABEL: TRANSAKSI & PEMOTONGAN PAJAK (TAX RECORDS: PPH 21, 22, 23, 25, 4(2))
CREATE TABLE IF NOT EXISTS public.tax_records (
    id TEXT PRIMARY KEY,
    tax_type VARCHAR(20) NOT NULL, -- PPh 21, PPh 22, PPh 23, PPh 25, PPh 4(2)
    tax_period_month INT NOT NULL CHECK (tax_period_month BETWEEN 1 AND 12),
    tax_period_year INT NOT NULL,
    transaction_date DATE NOT NULL,
    reference_no VARCHAR(100),
    source_module VARCHAR(100) DEFAULT 'Pembelian',
    vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
    taxpayer_name VARCHAR(255) NOT NULL,
    taxpayer_npwp VARCHAR(50),
    has_npwp BOOLEAN DEFAULT TRUE,
    tax_object_code VARCHAR(50),
    tax_object_description TEXT,
    gross_amount NUMERIC(18, 2) DEFAULT 0,
    dpp_amount NUMERIC(18, 2) DEFAULT 0,
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    tax_amount NUMERIC(18, 2) DEFAULT 0,
    billing_id VARCHAR(50),
    ntpn VARCHAR(50),
    payment_date DATE,
    status VARCHAR(50) DEFAULT 'Draft / Belum Disetor',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (Full Access for Internal Web Finance)
-- ==============================================================================
ALTER TABLE public.coa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all access on coa" ON public.coa FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on vendors" ON public.vendors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on purchase_requests" ON public.purchase_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on tax_records" ON public.tax_records FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- SEED DATA (DATA AWAL LENGKAP)
-- ==============================================================================

-- COA Seed
INSERT INTO public.coa (id, code, name, category, sub_category, normal_balance, level, balance, is_active) VALUES
('1101', '1101', 'Kas Kecil (Petty Cash)', 'Asset', 'Kas & Bank', 'Debit', 3, 15000000, true),
('1102', '1102', 'Bank BCA Operasional', 'Asset', 'Kas & Bank', 'Debit', 3, 350000000, true),
('1103', '1103', 'Bank Mandiri Payroll & Tax', 'Asset', 'Kas & Bank', 'Debit', 3, 185000000, true),
('1120', '1120', 'Piutang Usaha', 'Asset', 'Piutang', 'Debit', 3, 75000000, true),
('1130', '1130', 'Persediaan Barang Dagang', 'Asset', 'Persediaan', 'Debit', 3, 120000000, true),
('1150', '1150', 'Pajak Dibayar di Muka - PPh 22', 'Asset', 'Pajak Dibayar di Muka', 'Debit', 3, 4500000, true),
('1151', '1151', 'Pajak Dibayar di Muka - PPh 23', 'Asset', 'Pajak Dibayar di Muka', 'Debit', 3, 12400000, true),
('1152', '1152', 'Pajak Dibayar di Muka - PPh 25', 'Asset', 'Pajak Dibayar di Muka', 'Debit', 3, 36000000, true),
('1153', '1153', 'PPN Masukan (Input VAT)', 'Asset', 'Pajak Dibayar di Muka', 'Debit', 3, 42000000, true),
('2101', '2101', 'Hutang Usaha (AP)', 'Liability', 'Kewajiban Lancar', 'Credit', 3, 110000000, true),
('2111', '2111', 'Hutang Pajak PPh 21', 'Liability', 'Hutang Pajak', 'Credit', 3, 8750000, true),
('2112', '2112', 'Hutang Pajak PPh 22', 'Liability', 'Hutang Pajak', 'Credit', 3, 3500000, true),
('2113', '2113', 'Hutang Pajak PPh 23', 'Liability', 'Hutang Pajak', 'Credit', 3, 6200000, true),
('2114', '2114', 'Hutang Pajak PPh 4(2) Final', 'Liability', 'Hutang Pajak', 'Credit', 3, 14500000, true),
('3101', '3101', 'Modal Disetor', 'Equity', 'Modal', 'Credit', 3, 500000000, true),
('4101', '4101', 'Pendapatan Jasa & Proyek', 'Revenue', 'Pendapatan Usaha', 'Credit', 3, 650000000, true),
('5101', '5101', 'Beban Subkontraktor & Jasa Ahli', 'Expense', 'HPP', 'Debit', 3, 140000000, true),
('5102', '5102', 'Biaya Server Cloud & Hosting', 'Expense', 'HPP', 'Debit', 3, 48000000, true),
('6101', '6101', 'Beban Gaji Karyawan', 'Expense', 'Beban Operasional', 'Debit', 3, 175000000, true),
('6102', '6102', 'Beban Sewa Gedung', 'Expense', 'Beban Operasional', 'Debit', 3, 85000000, true),
('6103', '6103', 'Beban Konsultan Hukum, Pajak & Akuntansi', 'Expense', 'Beban Operasional', 'Debit', 3, 35000000, true),
('6107', '6107', 'Beban Pemeliharaan & Renovasi', 'Expense', 'Beban Operasional', 'Debit', 3, 22000000, true)
ON CONFLICT (id) DO NOTHING;

-- Vendors Seed
INSERT INTO public.vendors (id, code, name, type, category, npwp, has_npwp, address, city, pic_name, pic_email, pic_phone, bank_name, bank_account, bank_account_holder, payment_term, status, notes) VALUES
('vnd-1', 'VND-001', 'PT Cloud Hosting Nusantara', 'Badan', 'IT & Software', '01.345.678.9-012.000', true, 'Cyber 2 Tower Lt. 18', 'Jakarta Selatan', 'Dimas Wicaksono', 'billing@cloudhosting.co.id', '0812-8877-6655', 'BCA', '542-019-2811', 'PT Cloud Hosting Nusantara', 'Net 30', 'Aktif', 'Penyedia server cloud AWS & hosting.'),
('vnd-2', 'VND-002', 'Kantor Konsultan Pajak & Hukum Hendra & Rekan', 'Badan', 'Konsultan & Jasa Profesional', '02.987.654.3-045.000', true, 'Gedung Menara Batavia Lt. 12', 'Jakarta Pusat', 'Hendra Setiawan, SE., BKP.', 'contact@hendra-tax.com', '0813-1122-3344', 'Bank Mandiri', '122-00-9988776-5', 'KKP Hendra & Rekan', 'Net 14', 'Aktif', 'Konsultan pajak, review e-Bupot & audit.'),
('vnd-3', 'VND-003', 'PT Graha Properti Indonesia', 'Badan', 'Sewa & Gedung', '03.456.789.0-078.000', true, 'Jl. Jenderal Sudirman Kav. 52-53', 'Jakarta Selatan', 'Jessica Suryanto', 'leasing@grahaproperti.co.id', '021-5259988', 'BCA', '001-987-6543', 'PT Graha Properti Indonesia', 'Net 14', 'Aktif', 'Pengelola gedung sewa ruang kantor (PPh 4 ayat 2).'),
('vnd-4', 'VND-004', 'Ir. Bambang Pamungkas, ST (Tenaga Ahli Arsitek)', 'Orang Pribadi', 'Konsultan & Jasa Profesional', '07.654.321.0-011.000', true, 'Jl. Kemang Timur No. 45', 'Jakarta Selatan', 'Ir. Bambang Pamungkas', 'bambang.architect@gmail.com', '0816-7788-9900', 'Bank BNI', '034-567-8901', 'Bambang Pamungkas', 'Cash', 'Aktif', 'Tenaga ahli perancang layout interior kantor.'),
('vnd-5', 'VND-005', 'CV Sentosa Perkasa Konstruksi', 'Badan', 'Konstruksi & Renovasi', '04.123.456.7-089.000', true, 'Jl. Daan Mogot KM 12 No. 8', 'Jakarta Barat', 'Rudi Hartono', 'sentosa.konstruksi@gmail.com', '0857-3344-5566', 'Bank BRI', '0339-01-002938-50-1', 'CV Sentosa Perkasa Konstruksi', 'Net 30', 'Aktif', 'Pelaksana konstruksi kualifikasi kecil (PPh 4(2) 1.75%).')
ON CONFLICT (id) DO NOTHING;



-- ==============================================================================
-- 6. TABEL: ROLES / PERAN PENGGUNA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_roles (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 7. TABEL: MASTER USER (AUTHENTICATION & USER MANAGEMENT)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all access on app_roles" ON public.app_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

-- Seed Roles
INSERT INTO public.app_roles (id, name, description, permissions, is_system) VALUES
('role-admin', 'Admin', 'Super Administrator dengan hak akses penuh termasuk kelola user & role', '["manage_users", "manage_roles", "manage_coa", "manage_vendors", "create_purchase", "approve_purchase", "pay_purchase", "manage_taxes", "view_reports"]'::jsonb, true),
('role-finance', 'Finance & Accounting', 'Manajer / Staf Keuangan untuk kelola COA, Vendor, Approval & Pembayaran Lunas', '["manage_coa", "manage_vendors", "create_purchase", "approve_purchase", "pay_purchase", "manage_taxes", "view_reports"]'::jsonb, true),
('role-tax', 'Tax Officer', 'Petugas Pajak khusus pemotongan PPh 21/22/23/25/4(2), ID Billing & NTPN', '["manage_vendors", "manage_taxes", "view_reports"]'::jsonb, true),
('role-manager', 'Manager', 'Pimpinan unit untuk otorisasi dan persetujuan (approval) pengajuan pembelian', '["create_purchase", "approve_purchase", "view_reports"]'::jsonb, true),
('role-staff', 'Staff / Requester', 'Staf operasional yang mengajukan pembelian dan pengadaan kebutuhan kantor', '["create_purchase", "view_reports"]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

-- Seed Users
INSERT INTO public.app_users (id, email, password, full_name, role, department, phone, is_active) VALUES
('usr-1', 'admin@perusahaan.com', 'admin123', 'Irvan Kholik (Super Admin)', 'Admin', 'Executive & IT', '0812-9988-7766', true),
('usr-2', 'finance@perusahaan.com', 'finance123', 'Siti Rahmawati, SE., Ak.', 'Finance & Accounting', 'Finance & Accounting', '0813-1122-3344', true),
('usr-3', 'tax@perusahaan.com', 'tax123', 'Budi Santoso, BKP', 'Tax Officer', 'Taxation & Compliance', '0815-5566-7788', true),
('usr-4', 'manager@perusahaan.com', 'manager123', 'Irfan Hakim (Direktur Operasional)', 'Manager', 'Operations', '0817-4433-2211', true),
('usr-5', 'staff@perusahaan.com', 'staff123', 'Ahmad Fauzi (IT Staff)', 'Staff / Requester', 'IT & Infrastructure', '0819-0011-2233', true)
ON CONFLICT (id) DO NOTHING;
