import React from 'react';
import { Database, ShieldCheck, Building2, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { getActiveSupabaseConfig } from '../lib/supabase';

export default function Navbar({ onOpenSupabaseModal, isSupabaseActive }) {
  const { url } = getActiveSupabaseConfig();
  const hasConfig = !!url;

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-6 shadow-xs">
      {/* Left: Brand & Company */}
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-slate-800 text-base leading-tight tracking-tight">FINANCE & TAX CORE</h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">v2.6 ID</span>
          </div>
          <p className="text-xs text-slate-500 leading-none mt-0.5">Sistem Terintegrasi COA, Vendor, Pengajuan Pembelian & PPh 21/22/23/25/4(2)</p>
        </div>
      </div>

      {/* Right: Supabase Connection Badge & Tools */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSupabaseModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            hasConfig && isSupabaseActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
          }`}
          title="Klik untuk melihat / mengubah konfigurasi database Supabase"
        >
          <Database className="w-3.5 h-3.5" />
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${hasConfig && isSupabaseActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {hasConfig && isSupabaseActive ? 'Supabase Connected' : 'Supabase (Demo/Local)'}
          </span>
          <span className="text-[10px] bg-white/80 px-1.5 py-0.2 rounded font-mono border border-slate-200">
            {hasConfig && isSupabaseActive ? 'Cloud Live' : 'Atur Supabase'}
          </span>
        </button>

        <div className="h-6 w-[1px] bg-slate-200" />

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-medium">PT Solusi Finansial Digital</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">Masa: Nov 2026</span>
        </div>
      </div>
    </header>
  );
}

