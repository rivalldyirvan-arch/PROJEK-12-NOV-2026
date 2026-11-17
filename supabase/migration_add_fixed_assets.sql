-- ==============================================================================
-- SKEMA MIGRATION: MODUL ASET TETAP (FIXED ASSET MANAGEMENT) & JURNAL UMUM
-- FINANCE & TAX CORE - ERP SYSTEM
-- ==============================================================================

-- 1. TABEL: JURNAL UMUM & ENTRI BUKU BESAR
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id TEXT PRIMARY KEY,
    entry_number VARCHAR(100) NOT NULL UNIQUE,
    entry_date DATE NOT NULL,
    source_module VARCHAR(50) NOT NULL, -- 'Aset Tetap', 'Pembelian', 'Kas & Bank', 'Manual'
    reference_id TEXT,
    reference_no VARCHAR(100),
    description TEXT NOT NULL,
    total_debit NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_credit NUMERIC(18, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Posted', -- 'Draft', 'Posted', 'Reversed'
    posted_by VARCHAR(150),
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    lines JSONB DEFAULT '[]'::jsonb, -- Array of { accountCode, accountName, debit, credit, memo }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABEL: MASTER KATEGORI ASET TETAP
CREATE TABLE IF NOT EXISTS public.asset_categories (
    id TEXT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    asset_account_code VARCHAR(20) NOT NULL,
    accum_deprec_account_code VARCHAR(20) NOT NULL,
    deprec_expense_account_code VARCHAR(20) NOT NULL,
    default_deprec_method VARCHAR(50) NOT NULL DEFAULT 'Garis Lurus',
    default_useful_life_years INT NOT NULL DEFAULT 4,
    default_salvage_value_pct NUMERIC(5, 2) DEFAULT 0,
    tax_group VARCHAR(50) NOT NULL DEFAULT 'Kelompok 1',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABEL UTAMA: FIXED ASSETS
CREATE TABLE IF NOT EXISTS public.fixed_assets (
    id TEXT PRIMARY KEY,
    asset_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category_id TEXT REFERENCES public.asset_categories(id) ON DELETE SET NULL,
    category_name VARCHAR(150),
    description TEXT,
    acquisition_date DATE NOT NULL,
    in_service_date DATE NOT NULL,
    location VARCHAR(150) NOT NULL DEFAULT 'Kantor Pusat',
    department VARCHAR(100) NOT NULL DEFAULT 'Operasional',
    custodian VARCHAR(150),
    serial_number VARCHAR(100),
    condition VARCHAR(50) NOT NULL DEFAULT 'Baik', -- 'Sangat Baik', 'Baik', 'Cukup', 'Rusak Ringan', 'Rusak Berat'
    vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
    vendor_name VARCHAR(255),
    purchase_invoice_no VARCHAR(100),
    purchase_request_id TEXT REFERENCES public.purchase_requests(id) ON DELETE SET NULL,

    -- Komponen Harga Perolehan (Kapitalisasi)
    purchase_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
    delivery_cost NUMERIC(18, 2) DEFAULT 0,
    installation_cost NUMERIC(18, 2) DEFAULT 0,
    other_capitalized_cost NUMERIC(18, 2) DEFAULT 0,
    discount_amount NUMERIC(18, 2) DEFAULT 0,
    non_creditable_vat NUMERIC(18, 2) DEFAULT 0,
    acquisition_cost NUMERIC(18, 2) NOT NULL DEFAULT 0,

    -- Parameter Penyusutan Komersial
    depreciation_method VARCHAR(50) NOT NULL DEFAULT 'Garis Lurus', -- 'Garis Lurus', 'Saldo Menurun', 'Saldo Menurun Ganda', 'Unit Produksi'
    useful_life_years NUMERIC(5, 2) NOT NULL DEFAULT 4,
    useful_life_months INT NOT NULL DEFAULT 48,
    salvage_value NUMERIC(18, 2) DEFAULT 0,
    depreciation_rate_pct NUMERIC(6, 3) DEFAULT 25.0,
    monthly_depreciation NUMERIC(18, 2) DEFAULT 0,
    accumulated_depreciation NUMERIC(18, 2) DEFAULT 0,
    book_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_estimated_units NUMERIC(18, 2) DEFAULT 0,
    units_produced_to_date NUMERIC(18, 2) DEFAULT 0,

    -- Parameter Penyusutan Fiskal (UU PPh Indonesia)
    tax_group VARCHAR(50) NOT NULL DEFAULT 'Kelompok 1', -- 'Kelompok 1', 'Kelompok 2', 'Kelompok 3', 'Kelompok 4', 'Bangunan Permanen', 'Bangunan Tidak Permanen'
    tax_depreciation_method VARCHAR(50) NOT NULL DEFAULT 'Garis Lurus',
    tax_useful_life_years INT NOT NULL DEFAULT 4,
    tax_rate_pct NUMERIC(6, 3) DEFAULT 25.0,
    tax_monthly_depreciation NUMERIC(18, 2) DEFAULT 0,
    tax_accumulated_depreciation NUMERIC(18, 2) DEFAULT 0,
    tax_book_value NUMERIC(18, 2) NOT NULL DEFAULT 0,

    -- Status & Pelacakan
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- 'Draft', 'In Acquisition', 'Active', 'Fully Depreciated', 'Disposed'
    last_depreciation_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABEL: JADWAL PENYUSUTAN (DEPRECIATION SCHEDULES)
CREATE TABLE IF NOT EXISTS public.asset_depreciation_schedules (
    id TEXT PRIMARY KEY,
    asset_id TEXT REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    period_date DATE NOT NULL,
    schedule_type VARCHAR(20) NOT NULL DEFAULT 'Commercial', -- 'Commercial', 'Tax'
    opening_book_value NUMERIC(18, 2) NOT NULL,
    depreciation_amount NUMERIC(18, 2) NOT NULL,
    accumulated_depreciation NUMERIC(18, 2) NOT NULL,
    closing_book_value NUMERIC(18, 2) NOT NULL,
    is_posted BOOLEAN DEFAULT FALSE,
    journal_entry_id TEXT REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABEL: POSTING JURNAL PENYUSUTAN BULANAN
CREATE TABLE IF NOT EXISTS public.asset_depreciation_postings (
    id TEXT PRIMARY KEY,
    posting_number VARCHAR(100) NOT NULL UNIQUE,
    posting_date DATE NOT NULL,
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    total_assets_processed INT NOT NULL DEFAULT 0,
    total_depreciation_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    journal_entry_id TEXT REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Posted', -- 'Draft', 'Posted', 'Reversed'
    posted_by VARCHAR(150),
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABEL: MUTASI & PERUBAHAN ASET
CREATE TABLE IF NOT EXISTS public.asset_movements (
    id TEXT PRIMARY KEY,
    movement_number VARCHAR(100) NOT NULL UNIQUE,
    asset_id TEXT REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
    movement_date DATE NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'Relocation', 'Transfer Department', 'Change Custodian', 'Condition Update', 'Accounting Estimate Change'
    
    -- Nilai Sebelumnya
    previous_location VARCHAR(150),
    previous_department VARCHAR(100),
    previous_custodian VARCHAR(150),
    previous_condition VARCHAR(50),
    previous_useful_life INT,
    previous_salvage_value NUMERIC(18, 2),

    -- Nilai Baru
    new_location VARCHAR(150),
    new_department VARCHAR(100),
    new_custodian VARCHAR(150),
    new_condition VARCHAR(50),
    new_useful_life INT,
    new_salvage_value NUMERIC(18, 2),

    reason TEXT NOT NULL,
    performed_by VARCHAR(150),
    approved_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABEL: PELEPASAN / PENJUALAN ASET
CREATE TABLE IF NOT EXISTS public.asset_disposals (
    id TEXT PRIMARY KEY,
    disposal_number VARCHAR(100) NOT NULL UNIQUE,
    asset_id TEXT REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
    asset_number VARCHAR(50) NOT NULL,
    asset_name VARCHAR(255) NOT NULL,
    disposal_date DATE NOT NULL,
    disposal_type VARCHAR(50) NOT NULL, -- 'Sold', 'Scrapped', 'Damaged', 'Lost', 'Donated'
    
    -- Nilai Finansial saat Pelepasan
    acquisition_cost NUMERIC(18, 2) NOT NULL,
    accumulated_depreciation NUMERIC(18, 2) NOT NULL,
    book_value_at_disposal NUMERIC(18, 2) NOT NULL,
    selling_price NUMERIC(18, 2) DEFAULT 0,
    disposal_expenses NUMERIC(18, 2) DEFAULT 0,
    net_proceeds NUMERIC(18, 2) DEFAULT 0,
    gain_or_loss NUMERIC(18, 2) NOT NULL, -- Positif = Laba, Negatif = Rugi
    buyer_info VARCHAR(255),
    
    -- Akun Kas/Bank Pembayaran Penjualan
    payment_account_code VARCHAR(20),
    
    -- Jurnal Otomatis Pelepasan
    journal_entry_id TEXT REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    notes TEXT,
    disposed_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABEL: AUDIT TRAIL LOG ASET
CREATE TABLE IF NOT EXISTS public.asset_audit_logs (
    id TEXT PRIMARY KEY,
    asset_id TEXT,
    asset_number VARCHAR(50),
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DEPRECIATE', 'RELOCATE', 'DISPOSE', 'REVERSE'
    performed_by VARCHAR(150),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50)
);

