-- ==============================================================================
-- MIGRATION: MASTER DATA PRODUK & JASA (PRODUCTS MODULE)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'Pcs',
  category TEXT,
  product_type TEXT NOT NULL DEFAULT 'Barang',
  image_url TEXT,
  is_purchased BOOLEAN DEFAULT TRUE,
  purchase_price NUMERIC DEFAULT 0,
  purchase_account_code TEXT,
  purchase_tax_type NUMERIC DEFAULT 0,
  is_sold BOOLEAN DEFAULT FALSE,
  selling_price NUMERIC DEFAULT 0,
  sales_account_code TEXT,
  sales_tax_type NUMERIC DEFAULT 0,
  discount_account_code TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public / authenticated access
DROP POLICY IF EXISTS "Public access for products" ON products;
CREATE POLICY "Public access for products" ON products
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert initial sample products if table is empty
INSERT INTO products (
  id, code, barcode, name, description, unit, category, product_type,
  is_purchased, purchase_price, purchase_account_code, purchase_tax_type,
  is_sold, selling_price, sales_account_code, sales_tax_type, discount_account_code, is_active
) VALUES 
(
  'prd-1', 'PRD-ATK-001', '899100123001', 'Kertas HVS A4 80gr Sinar Dunia (Rim)',
  'Kertas HVS ukuran A4 80 gram kualitas prima untuk printer laser & fotokopi, isi 500 lembar per rim.',
  'Rim', 'Alat Tulis Kantor', 'Barang',
  true, 55000, '6105', 11,
  false, 0, '4101', 0, '4-40201', true
),
(
  'prd-2', 'PRD-IT-002', '899200543002', 'Laptop Dell Vostro Core i7 16GB SSD 512GB',
  'Perangkat komputer kerja bisnis Dell Vostro Intel Core i7 13th Gen, RAM 16GB DDR5, SSD 512GB NVMe, Windows 11 Pro.',
  'Unit', 'Perangkat IT & Komputer', 'Barang',
  true, 14500000, '1205', 11,
  true, 17200000, '4-41100', 11, '4-40201', true
),
(
  'prd-3', 'JSA-TAX-003', '', 'Jasa Konsultan Pajak & Audit Laporan Keuangan',
  'Jasa asistensi kepatuhan perpajakan bulanan SPT Masa PPh & PPN serta review rekonsiliasi fiskal tahunan.',
  'Bulan', 'Jasa Konsultan', 'Jasa',
  true, 15000000, '6103', 11,
  true, 20000000, '4101', 11, '4-40201', true
),
(
  'prd-4', 'JSA-BLD-004', '', 'Sewa Ruang Kantor & Service Charge Gedung',
  'Biaya sewa ruang kantor operasional 250m2 termasuk fasilitas air, AC sentral, dan keamanan gedung.',
  'Bulan', 'Sewa Gedung', 'Jasa',
  true, 40000000, '6102', 11,
  false, 0, '4101', 0, '4-40201', true
),
(
  'prd-5', 'JSA-REN-005', '', 'Pekerjaan Renovasi Partisi & Instalasi Listrik',
  'Pekerjaan perbaikan ruangan, partisi kaca tempered 10mm, dan peremajaan instalasi kelistrikan kantor.',
  'Paket', 'Pemeliharaan & Renovasi', 'Jasa',
  true, 22000000, '6107', 1.1,
  false, 0, '4101', 0, '4-40201', true
)
ON CONFLICT (code) DO NOTHING;

