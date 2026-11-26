-- ==============================================================================
-- MIGRATION: FONDASI AKUNTANSI TERINTEGRASI (TAHAPAN 1)
-- COA TERPADU, PERIODE AKUNTANSI, JURNAL UMUM (DOUBLE ENTRY), & AUDIT TRAIL
-- ==============================================================================

-- 1. PERLUASAN KATEGORI & AKUN STANDAR COA (8 KELOMPOK AKUN)
-- Pastikan tidak ada duplikasi kode akun dan semua saldo awal 0
INSERT INTO public.coa (id, code, name, category, sub_category, normal_balance, level, parent_code, balance, is_active) VALUES
('1601', '1601', 'PPN Masukan (Pajak Masukan)', 'Asset', 'Pajak Dibayar di Muka', 'Debit', 3, '1100', 0, true),
('3901', '3901', 'Ikhtisar Laba Rugi (Income Summary)', 'Equity', 'Ikhtisar Penutup', 'Credit', 3, '3100', 0, true),
('7101', '7101', 'Pendapatan Lain-lain', 'Other Revenue', 'Pendapatan di Luar Usaha', 'Credit', 3, '7100', 0, true),
('7102', '7102', 'Pendapatan Bunga Bank & Jasa Giro', 'Other Revenue', 'Pendapatan di Luar Usaha', 'Credit', 3, '7100', 0, true),
('8101', '8101', 'Beban Administrasi Bank', 'Other Expense', 'Beban di Luar Usaha', 'Debit', 3, '8100', 0, true),
('8102', '8102', 'Beban Bunga & Keuangan', 'Other Expense', 'Beban Keuangan', 'Debit', 3, '8100', 0, true),
('8103', '8103', 'Beban Lain-lain', 'Other Expense', 'Beban di Luar Usaha', 'Debit', 3, '8100', 0, true)
ON CONFLICT (code) DO NOTHING;

-- 2. TABEL: MANAJEMEN PERIODE AKUNTANSI (ACCOUNTING PERIODS)
CREATE TABLE IF NOT EXISTS public.accounting_periods (
    id TEXT PRIMARY KEY,
    period_code VARCHAR(10) NOT NULL UNIQUE, -- Format: YYYY-MM (contoh: 2026-11)
    fiscal_year INT NOT NULL,
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_name VARCHAR(50) NOT NULL,
    quarter INT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'Locked')),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opened_by VARCHAR(150),
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by VARCHAR(150),
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by VARCHAR(150),
    reopen_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounting_periods_code ON public.accounting_periods(period_code);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_year_month ON public.accounting_periods(fiscal_year, period_month);

-- Seed Periode Default Tahun 2026 (Nov & Des terbuka)
INSERT INTO public.accounting_periods (id, period_code, fiscal_year, period_month, period_name, quarter, status, opened_by) VALUES
('per-2026-10', '2026-10', 2026, 10, 'Oktober 2026', 4, 'Open', 'Sistem'),
('per-2026-11', '2026-11', 2026, 11, 'November 2026', 4, 'Open', 'Sistem'),
('per-2026-12', '2026-12', 2026, 12, 'Desember 2026', 4, 'Open', 'Sistem')
ON CONFLICT (period_code) DO NOTHING;

-- 3. TABEL: PENGATURAN PENOMORAN JURNAL OTOMATIS
CREATE TABLE IF NOT EXISTS public.journal_number_sequences (
    id TEXT PRIMARY KEY,
    journal_type VARCHAR(50) NOT NULL UNIQUE,
    prefix VARCHAR(15) NOT NULL,
    format_pattern VARCHAR(50) NOT NULL DEFAULT '{PREFIX}-{YYYY}{MM}-{SEQ}',
    seq_digits INT NOT NULL DEFAULT 4,
    last_number INT NOT NULL DEFAULT 0,
    reset_monthly BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.journal_number_sequences (id, journal_type, prefix, format_pattern, seq_digits) VALUES
('seq-umum', 'Jurnal Umum', 'GEN', '{PREFIX}-{YYYY}{MM}-{SEQ}', 4),
('seq-penjualan', 'Jurnal Penjualan', 'SAL', '{PREFIX}-{YYYY}{MM}-{SEQ}', 4),
('seq-pembelian', 'Jurnal Pembelian', 'PUR', '{PREFIX}-{YYYY}{MM}-{SEQ}', 4),
('seq-kas-masuk', 'Jurnal Penerimaan Kas', 'CRJ', '{PREFIX}-{YYYY}{MM}-{SEQ}', 4),
('seq-kas-keluar', 'Jurnal Pengeluaran Kas', 'CDJ', '{PREFIX}-{YYYY}{MM}-{SEQ}', 4),
('seq-bank', 'Jurnal Bank', 'BNK', '{PREFIX}-{YYYY}{MM}-{SEQ}', 4),
('seq-penyesuaian', 'Jurnal Penyesuaian', 'ADJ', '{PREFIX}-{YYYY}{MM}-{SEQ}', 4),
('seq-penyusutan', 'Jurnal Penyusutan', 'DEP', '{PREFIX}-{YYYY}{MM}-{SEQ}', 4),
('seq-akrual', 'Jurnal Akrual', 'ACR', '{PREFIX}-{YYYY}{MM}-{SEQ}', 4),
('seq-pembalik', 'Jurnal Pembalik', 'REV', '{PREFIX}-{YYYY}{MM}-{SEQ}', 4),
('seq-penutup', 'Jurnal Penutup', 'CLS', '{PREFIX}-{YYYY}{MM}-{SEQ}', 4)
ON CONFLICT (journal_type) DO NOTHING;

-- 4. TABEL: PEMETAAN COA OTOMATIS (COA DEFAULT MAPPINGS)
CREATE TABLE IF NOT EXISTS public.coa_default_mappings (
    id TEXT PRIMARY KEY,
    mapping_key VARCHAR(60) NOT NULL UNIQUE,
    label VARCHAR(150) NOT NULL,
    module_group VARCHAR(50) NOT NULL,
    account_code VARCHAR(20) NOT NULL REFERENCES public.coa(code) ON UPDATE CASCADE,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.coa_default_mappings (id, mapping_key, label, module_group, account_code, description) VALUES
('map-sales', 'default_sales', 'Pendapatan Penjualan Default', 'Penjualan', '4101', 'Akun kredit pendapatan utama saat faktur penjualan diposting'),
('map-sales-disc', 'default_sales_discount', 'Diskon / Retur Penjualan', 'Penjualan', '4-40201', 'Akun debit pengurang pendapatan penjualan'),
('map-ar', 'default_ar', 'Piutang Usaha (Accounts Receivable)', 'Piutang', '1120', 'Akun piutang dagang pelanggan'),
('map-purchase', 'default_purchase_expense', 'Beban Pembelian / Pengadaan Default', 'Pembelian', '6105', 'Akun beban default saat transaksi pembelian'),
('map-ap', 'default_ap', 'Utang Usaha (Accounts Payable)', 'Utang', '2101', 'Akun hutang usaha rekanan/vendor'),
('map-cash', 'default_cash', 'Kas Kecil / Kas Operasional', 'Kas & Bank', '1101', 'Akun kas default untuk transaksi tunai'),
('map-bank', 'default_bank', 'Bank Operasional Utama', 'Kas & Bank', '1102', 'Akun bank default untuk transfer & pelunasan'),
('map-ppn-in', 'default_ppn_masukan', 'PPN Masukan (Input VAT)', 'Pajak', '1601', 'Akun PPN Masukan atas pembelian'),
('map-ppn-out', 'default_ppn_keluaran', 'PPN Keluaran (Output VAT)', 'Pajak', '2115', 'Akun PPN Keluaran atas penjualan'),
('map-pph23', 'default_pph23_payable', 'Utang Pajak PPh 23', 'Pajak', '2113', 'Akun pemotongan PPh 23'),
('map-inventory', 'default_inventory', 'Persediaan Barang Dagang', 'Persediaan', '1130', 'Akun persediaan barang dagang'),
('map-asset', 'default_fixed_asset', 'Aset Tetap Peralatan & Server', 'Aset Tetap', '1201', 'Akun kapitalisasi aset tetap default'),
('map-retained', 'default_retained_earnings', 'Laba Ditahan (Retained Earnings)', 'Ekuitas', '3201', 'Akun tujuan pemindahan laba/rugi saat closing'),
('map-summary', 'default_income_summary', 'Ikhtisar Laba Rugi', 'Closing', '3901', 'Akun penampung sementara saat jurnal penutup')
ON CONFLICT (mapping_key) DO NOTHING;

-- 5. TABEL: JURNAL UMUM (JOURNAL ENTRIES - HEADER)
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id TEXT PRIMARY KEY,
    entry_number VARCHAR(100) NOT NULL UNIQUE,
    entry_date DATE NOT NULL,
    period_code VARCHAR(10),
    journal_type VARCHAR(50) NOT NULL DEFAULT 'Jurnal Umum',
    source_module VARCHAR(50) NOT NULL DEFAULT 'Manual',
    reference_id TEXT,
    reference_no VARCHAR(100),
    description TEXT NOT NULL,
    vendor_or_customer VARCHAR(255),
    department VARCHAR(100),
    tax_info JSONB DEFAULT '{}'::jsonb,
    document_url TEXT,
    total_debit NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_credit NUMERIC(18, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending Approval', 'Posted', 'Reversed', 'Void')),
    created_by VARCHAR(150),
    approved_by VARCHAR(150),
    posted_by VARCHAR(150),
    posted_at TIMESTAMP WITH TIME ZONE,
    reversed_from_id TEXT,
    lines JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_journal_balanced CHECK (
        status IN ('Draft', 'Pending Approval') OR (total_debit = total_credit AND total_debit > 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON public.journal_entries(period_code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_type ON public.journal_entries(journal_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_ref ON public.journal_entries(reference_no);

-- 6. TABEL: BARIS JURNAL RELASIONAL (JOURNAL LINES)
CREATE TABLE IF NOT EXISTS public.journal_lines (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    line_no INT NOT NULL DEFAULT 1,
    account_code VARCHAR(20) NOT NULL REFERENCES public.coa(code) ON UPDATE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    description TEXT,
    debit NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    department VARCHAR(100),
    partner_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_line_side CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON public.journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON public.journal_lines(account_code);

-- 7. TABEL: AUDIT TRAIL TERPUSAT (IMMUTABLE AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name VARCHAR(150) NOT NULL,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id TEXT,
    reference_no VARCHAR(100),
    before_data JSONB,
    after_data JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coa_default_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all access on accounting_periods" ON public.accounting_periods;
CREATE POLICY "Allow public all access on accounting_periods" ON public.accounting_periods FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on journal_number_sequences" ON public.journal_number_sequences;
CREATE POLICY "Allow public all access on journal_number_sequences" ON public.journal_number_sequences FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on coa_default_mappings" ON public.coa_default_mappings;
CREATE POLICY "Allow public all access on coa_default_mappings" ON public.coa_default_mappings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on journal_entries" ON public.journal_entries;
CREATE POLICY "Allow public all access on journal_entries" ON public.journal_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on journal_lines" ON public.journal_lines;
CREATE POLICY "Allow public all access on journal_lines" ON public.journal_lines FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow public all access on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 9. ATOMIC POSTING FUNCTION (POSTGRESQL RPC)
CREATE OR REPLACE FUNCTION public.post_journal_entry_atomic(
    p_entry JSONB,
    p_lines JSONB,
    p_user_name TEXT DEFAULT 'Sistem'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id TEXT;
    v_entry_date DATE;
    v_period_code VARCHAR(10);
    v_period_status VARCHAR(20);
    v_total_debit NUMERIC(18, 2) := 0;
    v_total_credit NUMERIC(18, 2) := 0;
    v_line JSONB;
    v_idx INT := 0;
    v_coa_exists INT;
BEGIN
    v_id := COALESCE(p_entry->>'id', 'je-' || extract(epoch from now())::bigint::text);
    v_entry_date := (p_entry->>'entry_date')::DATE;
    v_period_code := COALESCE(NULLIF(p_entry->>'period_code', ''), to_char(v_entry_date, 'YYYY-MM'));

    -- 1. Cek status periode akuntansi
    SELECT status INTO v_period_status
    FROM public.accounting_periods
    WHERE period_code = v_period_code;

    IF v_period_status IS NOT NULL AND v_period_status IN ('Closed', 'Locked') THEN
        RAISE EXCEPTION 'Periode akuntansi % sudah berstatus %. Posting ditolak.', v_period_code, v_period_status;
    END IF;

    -- 2. Hitung & validasi keseimbangan baris jurnal
    IF jsonb_array_length(p_lines) < 2 THEN
        RAISE EXCEPTION 'Jurnal wajib memiliki minimal 2 baris (Debit dan Kredit).';
    END IF;

    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::NUMERIC, 0);
        v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::NUMERIC, 0);

        SELECT COUNT(*) INTO v_coa_exists FROM public.coa WHERE code = v_line->>'accountCode';
        IF v_coa_exists = 0 THEN
            RAISE EXCEPTION 'Kode akun COA % tidak ditemukan di master COA.', v_line->>'accountCode';
        END IF;
    END LOOP;

    IF v_total_debit <= 0 OR v_total_debit <> v_total_credit THEN
        RAISE EXCEPTION 'Jurnal tidak seimbang! Total Debit (%) != Total Kredit (%).', v_total_debit, v_total_credit;
    END IF;

    -- 3. Upsert header jurnal sebagai Posted
    INSERT INTO public.journal_entries (
        id, entry_number, entry_date, period_code, journal_type, source_module,
        reference_id, reference_no, description, vendor_or_customer, department,
        tax_info, document_url, total_debit, total_credit, status,
        created_by, approved_by, posted_by, posted_at, reversed_from_id, lines
    ) VALUES (
        v_id,
        p_entry->>'entry_number',
        v_entry_date,
        v_period_code,
        COALESCE(p_entry->>'journal_type', 'Jurnal Umum'),
        COALESCE(p_entry->>'source_module', 'Manual'),
        p_entry->>'reference_id',
        p_entry->>'reference_no',
        p_entry->>'description',
        p_entry->>'vendor_or_customer',
        p_entry->>'department',
        COALESCE(p_entry->'tax_info', '{}'::jsonb),
        p_entry->>'document_url',
        v_total_debit,
        v_total_credit,
        'Posted',
        COALESCE(p_entry->>'created_by', p_user_name),
        COALESCE(p_entry->>'approved_by', p_user_name),
        p_user_name,
        NOW(),
        p_entry->>'reversed_from_id',
        p_lines
    )
    ON CONFLICT (id) DO UPDATE SET
        entry_date = EXCLUDED.entry_date,
        period_code = EXCLUDED.period_code,
        journal_type = EXCLUDED.journal_type,
        description = EXCLUDED.description,
        total_debit = EXCLUDED.total_debit,
        total_credit = EXCLUDED.total_credit,
        status = 'Posted',
        posted_by = EXCLUDED.posted_by,
        posted_at = NOW(),
        lines = EXCLUDED.lines,
        updated_at = NOW();

    -- 4. Replace baris relasional journal_lines
    DELETE FROM public.journal_lines WHERE journal_entry_id = v_id;

    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        v_idx := v_idx + 1;
        INSERT INTO public.journal_lines (
            id, journal_entry_id, line_no, account_code, account_name,
            description, debit, credit, department, partner_name
        ) VALUES (
            v_id || '-L' || v_idx,
            v_id,
            v_idx,
            v_line->>'accountCode',
            COALESCE(v_line->>'accountName', ''),
            COALESCE(v_line->>'description', p_entry->>'description'),
            COALESCE((v_line->>'debit')::NUMERIC, 0),
            COALESCE((v_line->>'credit')::NUMERIC, 0),
            p_entry->>'department',
            p_entry->>'vendor_or_customer'
        );
    END LOOP;

    -- 5. Catat Audit Trail
    INSERT INTO public.audit_logs (
        id, user_name, action, entity_type, entity_id, reference_no, after_data, reason
    ) VALUES (
        'aud-' || extract(epoch from now())::bigint::text || '-' || floor(random()*1000)::int,
        p_user_name,
        'POST_JOURNAL',
        'journal_entries',
        v_id,
        p_entry->>'entry_number',
        jsonb_build_object('total_debit', v_total_debit, 'total_credit', v_total_credit, 'period_code', v_period_code),
        'Posting jurnal double entry'
    );

    RETURN jsonb_build_object('success', true, 'id', v_id, 'total_debit', v_total_debit, 'total_credit', v_total_credit);
END;
$$;

