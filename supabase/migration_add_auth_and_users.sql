-- ==============================================================================
-- SKRIP UPDATE DATABASE SUPABASE
-- PENAMBAHAN SISTEM AUTH, ROLE-BASED ACCESS CONTROL (RBAC) & MASTER USER
-- Jalankan skrip ini di menu SQL Editor pada Dashboard Supabase Anda
-- ==============================================================================

-- 1. TABEL: ROLES / PERAN
CREATE TABLE IF NOT EXISTS public.app_roles (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABEL: MASTER USER (AUTHENTICATION & USER MANAGEMENT)
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

-- 3. AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- 4. KEBIJAKAN AKSES PENUH UNTUK CLIENT WEB
DROP POLICY IF EXISTS "Allow public all access on app_roles" ON public.app_roles;
CREATE POLICY "Allow public all access on app_roles" ON public.app_roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all access on app_users" ON public.app_users;
CREATE POLICY "Allow public all access on app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

-- 5. SEED DATA ROLES BAWAAN
INSERT INTO public.app_roles (id, name, description, permissions, is_system) VALUES
('role-admin', 'Admin', 'Super Administrator dengan hak akses penuh termasuk kelola user & role', '["manage_users", "manage_roles", "manage_coa", "manage_vendors", "create_purchase", "approve_purchase", "pay_purchase", "manage_taxes", "view_reports"]'::jsonb, true),
('role-finance', 'Finance & Accounting', 'Manajer / Staf Keuangan untuk kelola COA, Vendor, Approval & Pembayaran Lunas', '["manage_coa", "manage_vendors", "create_purchase", "approve_purchase", "pay_purchase", "manage_taxes", "view_reports"]'::jsonb, true),
('role-tax', 'Tax Officer', 'Petugas Pajak khusus pemotongan PPh 21/22/23/25/4(2), ID Billing & NTPN', '["manage_vendors", "manage_taxes", "view_reports"]'::jsonb, true),
('role-manager', 'Manager', 'Pimpinan unit untuk otorisasi dan persetujuan (approval) pengajuan pembelian', '["create_purchase", "approve_purchase", "view_reports"]'::jsonb, true),
('role-staff', 'Staff / Requester', 'Staf operasional yang mengajukan pembelian dan pengadaan kebutuhan kantor', '["create_purchase", "view_reports"]'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET 
    permissions = EXCLUDED.permissions,
    description = EXCLUDED.description;

-- 6. SEED DATA PENGGUNA AWAL (SUPER ADMIN & STAFF)
INSERT INTO public.app_users (id, email, password, full_name, role, department, phone, is_active) VALUES
('usr-1', 'admin@perusahaan.com', 'admin123', 'Irvan Kholik (Super Admin)', 'Admin', 'Executive & IT', '0812-9988-7766', true),
('usr-2', 'finance@perusahaan.com', 'finance123', 'Siti Rahmawati, SE., Ak.', 'Finance & Accounting', 'Finance & Accounting', '0813-1122-3344', true),
('usr-3', 'tax@perusahaan.com', 'tax123', 'Budi Santoso, BKP', 'Tax Officer', 'Taxation & Compliance', '0815-5566-7788', true),
('usr-4', 'manager@perusahaan.com', 'manager123', 'Irfan Hakim (Direktur Operasional)', 'Manager', 'Operations', '0817-4433-2211', true),
('usr-5', 'staff@perusahaan.com', 'staff123', 'Ahmad Fauzi (IT Staff)', 'Staff / Requester', 'IT & Infrastructure', '0819-0011-2233', true)
ON CONFLICT (email) DO NOTHING;

