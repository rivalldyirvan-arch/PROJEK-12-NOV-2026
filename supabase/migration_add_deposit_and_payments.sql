-- ==============================================================================
-- MIGRATION: PENAMBAHAN TABEL DEPOSIT VENDOR & AUDIT TRAIL PEMBAYARAN LUNAS
-- ==============================================================================

-- 1. Tambah kolom saldo deposit pada tabel vendors
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS deposit_balance NUMERIC(15, 2) DEFAULT 0;

-- 2. Tambah kolom remaining_payable & payment_history pada tabel purchase_requests
ALTER TABLE public.purchase_requests 
ADD COLUMN IF NOT EXISTS remaining_payable NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]'::jsonb;

-- 3. Tabel Riwayat Audit Transaksi Pembayaran
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'paytx-' || round(extract(epoch from now())),
    reference_no VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL,
    vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
    vendor_name VARCHAR(255) NOT NULL,
    pr_numbers TEXT[] DEFAULT '{}',
    payment_method VARCHAR(50) NOT NULL, -- Kas, Bank, Deposit
    account_code VARCHAR(50),
    account_name VARCHAR(255),
    nominal_pengajuan NUMERIC(15, 2) NOT NULL,
    nominal_pembayaran_aktual NUMERIC(15, 2) NOT NULL,
    deposit_used NUMERIC(15, 2) DEFAULT 0,
    excess_amount NUMERIC(15, 2) DEFAULT 0,
    approved_excess_as_deposit BOOLEAN DEFAULT false,
    selisih NUMERIC(15, 2) DEFAULT 0,
    final_status VARCHAR(50) NOT NULL,
    paid_by VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel Mutasi Ledger Deposit Vendor
CREATE TABLE IF NOT EXISTS public.vendor_deposit_ledger (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'dep-' || round(extract(epoch from now())),
    vendor_id TEXT REFERENCES public.vendors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')), -- IN (tambah deposit), OUT (pakai deposit)
    amount NUMERIC(15, 2) NOT NULL,
    reference_no VARCHAR(100),
    memo TEXT,
    balance_after NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Aktifkan RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_deposit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all access on payment_transactions" ON public.payment_transactions;
CREATE POLICY "Allow public all access on payment_transactions" ON public.payment_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on vendor_deposit_ledger" ON public.vendor_deposit_ledger;
CREATE POLICY "Allow public all access on vendor_deposit_ledger" ON public.vendor_deposit_ledger FOR ALL USING (true) WITH CHECK (true);

