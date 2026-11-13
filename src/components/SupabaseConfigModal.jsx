import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertTriangle, X, Copy, RefreshCw, ExternalLink } from 'lucide-react';
import { getActiveSupabaseConfig, saveSupabaseCredentials } from '../lib/supabase';
import { testSupabaseConnection, clearLocalDummyCache } from '../lib/databaseService';

export default function SupabaseConfigModal({ isOpen, onClose, onRefreshData }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getActiveSupabaseConfig();
      setUrl(config.url || '');
      setKey(config.key || '');
      setStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    // save temp to test
    saveSupabaseCredentials(url, key);
    const result = await testSupabaseConnection();
    setStatus(result);
    setTesting(false);
  };

  const handleSave = () => {
    saveSupabaseCredentials(url, key);
    onRefreshData();
    onClose();
  };

  const handleResetDemo = () => {
    if (window.confirm('Bersihkan semua cache lokal dan muat ulang data langsung dari Supabase?')) {
      clearLocalDummyCache();
      onRefreshData();
      onClose();
    }
  };

  const sqlSample = `-- Copy dan jalankan di SQL Editor Supabase Anda:
CREATE TABLE IF NOT EXISTS coa (
    id TEXT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    sub_category VARCHAR(100),
    normal_balance VARCHAR(10) NOT NULL,
    level INT DEFAULT 3,
    parent_code VARCHAR(20),
    balance NUMERIC(18, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL,
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
    status VARCHAR(20) DEFAULT 'Aktif',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_requests (
    id TEXT PRIMARY KEY,
    request_number VARCHAR(50) NOT NULL UNIQUE,
    request_date DATE NOT NULL,
    due_date DATE,
    requester_name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    vendor_id TEXT,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_records (
    id TEXT PRIMARY KEY,
    tax_type VARCHAR(20) NOT NULL,
    tax_period_month INT NOT NULL,
    tax_period_year INT NOT NULL,
    transaction_date DATE NOT NULL,
    reference_no VARCHAR(100),
    source_module VARCHAR(100) DEFAULT 'Pembelian',
    vendor_id TEXT,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buka izin akses RLS:
ALTER TABLE coa ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all access on coa" ON coa FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on vendors" ON vendors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on purchase_requests" ON purchase_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on tax_records" ON tax_records FOR ALL USING (true) WITH CHECK (true);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Database className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Koneksi Database Supabase</h3>
              <p className="text-xs text-emerald-100">Konfigurasi REST API Supabase & Mode Dual Sinkronisasi</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 space-y-2">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span>💡</span> Cara Menghubungkan Supabase:
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              1. Buka dashboard proyek Supabase Anda di <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-600 font-medium hover:underline inline-flex items-center">supabase.com <ExternalLink className="w-3 h-3 ml-0.5" /></a>.<br />
              2. Masuk ke menu <strong>Project Settings &gt; API</strong>, lalu salin <strong>Project URL</strong> dan <strong>anon / public API Key</strong>.<br />
              3. Jalankan Skrip SQL di bawah pada menu <strong>SQL Editor</strong> Supabase untuk membuat tabel dan hak akses.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Supabase Anon / Public Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {status && (
            <div className={`p-3.5 rounded-xl text-sm flex items-start gap-3 ${status.connected ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
              {status.connected ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
              <div>
                <p className="font-semibold">{status.connected ? 'Status: Terhubung ke Supabase' : 'Peringatan / Mode Demo'}</p>
                <p className="text-xs mt-0.5">{status.message}</p>
              </div>
            </div>
          )}

          {/* Toggle SQL */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setShowSql(!showSql)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
              >
                {showSql ? '▼ Sembunyikan Skrip SQL Supabase' : '▶ Tampilkan Skrip SQL Supabase (Skema Tabel & RLS)'}
              </button>
              {showSql && (
                <button
                  type="button"
                  onClick={copySql}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Tersalin!' : 'Salin SQL'}
                </button>
              )}
            </div>

            {showSql && (
              <pre className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl text-xs font-mono max-h-56 overflow-y-auto leading-relaxed border border-slate-800 select-all">
                {sqlSample}
              </pre>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDemo}
            className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium transition"
            title="Bersihkan cache lokal"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Bersihkan Cache Lokal
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={testing}
              onClick={handleTestConnection}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
            >
              {testing ? 'Menguji...' : 'Uji Koneksi'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition"
            >
              Simpan & Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

