-- ==============================================================================
-- MIGRATION: MODUL TRANSAKSI & DOKUMEN TERPUSAT (TAHAPAN 3)
-- DOKUMEN & ARSIP (RETENSI 10 TAHUN), PENJUALAN & PIUTANG, BIAYA, KAS & BANK
-- ==============================================================================

-- 1. TABEL: MANAJEMEN DOKUMEN & ARSIP TRANSAKSI
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT PRIMARY KEY,
    doc_number VARCHAR(100) NOT NULL,
    doc_type VARCHAR(60) NOT NULL, -- Faktur penjualan, Invoice pembelian, Nota, Kwitansi, Bukti transfer, dll
    category VARCHAR(60) NOT NULL, -- 10 Klasifikasi: Penjualan, Pembelian, Biaya Operasional, dll
    doc_date DATE NOT NULL,
    partner_name VARCHAR(255),
    partner_npwp VARCHAR(50),
    description TEXT,
    dpp_amount NUMERIC(18, 2) DEFAULT 0,
    ppn_amount NUMERIC(18, 2) DEFAULT 0,
    pph_amount NUMERIC(18, 2) DEFAULT 0,
    total_amount NUMERIC(18, 2) DEFAULT 0,
    payment_info TEXT,
    file_name VARCHAR(255),
    file_type VARCHAR(50), -- PDF, JPG, PNG, Excel, Word
    file_size INT DEFAULT 0,
    file_data_url TEXT,
    ocr_extracted BOOLEAN DEFAULT FALSE,
    ocr_confirmed BOOLEAN DEFAULT FALSE,
    validation_status VARCHAR(40) DEFAULT 'Valid', -- Valid, Perlu Periksa, Duplikat
    validation_notes TEXT,
    journal_entry_id TEXT REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    journal_entry_number VARCHAR(100),
    account_code VARCHAR(20),
    version INT DEFAULT 1,
    retention_until DATE, -- Minimal 10 tahun sesuai ketentuan perpajakan Indonesia
    is_locked BOOLEAN DEFAULT FALSE,
    uploaded_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_number ON public.documents(doc_number);
CREATE INDEX IF NOT EXISTS idx_documents_date ON public.documents(doc_date);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);

-- 2. TABEL: MASTER PELANGGAN (CUSTOMERS)
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    npwp VARCHAR(50),
    email VARCHAR(150),
    phone VARCHAR(50),
    address TEXT,
    payment_term VARCHAR(50) DEFAULT 'Net 30',
    status VARCHAR(20) DEFAULT 'Aktif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABEL: PENJUALAN & PIUTANG USAHA (SALES INVOICES)
CREATE TABLE IF NOT EXISTS public.sales_invoices (
    id TEXT PRIMARY KEY,
    invoice_number VARCHAR(80) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    due_date DATE,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100) DEFAULT 'Marketing & Sales',
    subtotal NUMERIC(18, 2) DEFAULT 0,
    discount NUMERIC(18, 2) DEFAULT 0,
    dpp NUMERIC(18, 2) DEFAULT 0,
    ppn_rate NUMERIC(5, 2) DEFAULT 11,
    ppn_amount NUMERIC(18, 2) DEFAULT 0,
    total_amount NUMERIC(18, 2) DEFAULT 0,
    paid_amount NUMERIC(18, 2) DEFAULT 0,
    remaining_amount NUMERIC(18, 2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'Draft', -- Draft, Posted, Sebagian Dibayar, Lunas
    ar_account_code VARCHAR(20) DEFAULT '1120',
    sales_account_code VARCHAR(20) DEFAULT '4101',
    items JSONB DEFAULT '[]'::jsonb,
    payment_history JSONB DEFAULT '[]'::jsonb,
    journal_entry_id TEXT,
    journal_entry_number VARCHAR(100),
    created_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABEL: BIAYA OPERASIONAL (OPERATIONAL EXPENSES)
CREATE TABLE IF NOT EXISTS public.operational_expenses (
    id TEXT PRIMARY KEY,
    expense_number VARCHAR(80) NOT NULL UNIQUE,
    expense_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    department VARCHAR(100) DEFAULT 'Operations',
    payee_name VARCHAR(255),
    description TEXT NOT NULL,
    expense_account_code VARCHAR(20) NOT NULL,
    expense_account_name VARCHAR(255),
    payment_account_code VARCHAR(20) NOT NULL, -- 1101 Kas / 1102 Bank / 2101 Utang
    payment_account_name VARCHAR(255),
    dpp_amount NUMERIC(18, 2) DEFAULT 0,
    ppn_amount NUMERIC(18, 2) DEFAULT 0,
    total_amount NUMERIC(18, 2) DEFAULT 0,
    reference_no VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Draft', -- Draft, Posted
    journal_entry_id TEXT,
    journal_entry_number VARCHAR(100),
    created_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABEL: TRANSAKSI KAS & BANK + REKONSILIASI
CREATE TABLE IF NOT EXISTS public.cash_bank_transactions (
    id TEXT PRIMARY KEY,
    tx_number VARCHAR(80) NOT NULL UNIQUE,
    tx_date DATE NOT NULL,
    tx_type VARCHAR(30) NOT NULL, -- Kas Masuk, Kas Keluar, Transfer Bank
    cash_account_code VARCHAR(20) NOT NULL,
    cash_account_name VARCHAR(255),
    contra_account_code VARCHAR(20) NOT NULL,
    contra_account_name VARCHAR(255),
    partner_name VARCHAR(255),
    reference_no VARCHAR(100),
    description TEXT NOT NULL,
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    reconciled_by VARCHAR(150),
    bank_statement_ref VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Posted',
    journal_entry_id TEXT,
    journal_entry_number VARCHAR(100),
    created_by VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all access on documents" ON public.documents;
CREATE POLICY "Allow public all access on documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on customers" ON public.customers;
CREATE POLICY "Allow public all access on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on sales_invoices" ON public.sales_invoices;
CREATE POLICY "Allow public all access on sales_invoices" ON public.sales_invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on operational_expenses" ON public.operational_expenses;
CREATE POLICY "Allow public all access on operational_expenses" ON public.operational_expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on cash_bank_transactions" ON public.cash_bank_transactions;
CREATE POLICY "Allow public all access on cash_bank_transactions" ON public.cash_bank_transactions FOR ALL USING (true) WITH CHECK (true);

