import React from 'react';
import { 
  LayoutDashboard, 
  FolderTree, 
  Users2, 
  ShoppingCart, 
  ReceiptText, 
  Calculator, 
  Database,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onOpenSupabaseModal, stats }) {
  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard Keuangan', 
      icon: LayoutDashboard,
      badge: null
    },
    { 
      id: 'coa', 
      label: '1. Modul COA (Akun)', 
      icon: FolderTree,
      badge: stats?.coaCount || 0
    },
    { 
      id: 'vendors', 
      label: '2. Modul Supplier/Vendor', 
      icon: Users2,
      badge: stats?.vendorCount || 0
    },
    { 
      id: 'purchases', 
      label: '3. Pembelian & Pengajuan', 
      icon: ShoppingCart,
      badge: stats?.pendingPrCount ? `${stats.pendingPrCount} Pending` : null,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    { 
      id: 'taxes', 
      label: '4. Modul Pajak PPh', 
      sub: 'PPh 21/22/23/25/4(2)',
      icon: ReceiptText,
      badge: stats?.taxRecordsCount || 0,
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    { 
      id: 'tax-calculator', 
      label: 'Kalkulator Pajak DJP', 
      icon: Calculator,
      badge: 'Simulasi'
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800 select-none">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-400 uppercase tracking-wider font-semibold">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Menu Navigasi ERP</span>
        </div>
      </div>

      <nav className="p-3 space-y-1.5 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                <div className="text-left">
                  <div className="leading-tight">{item.label}</div>
                  {item.sub && <div className={`text-[10px] ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>{item.sub}</div>}
                </div>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : (item.badgeColor || 'bg-slate-800 text-slate-300')
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Supabase Status Box */}
      <div className="p-4 m-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span>Supabase State</span>
          </div>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          Tersinkronisasi otomatis dengan database Supabase atau penyimpanan lokal aman.
        </p>
        <button
          onClick={onOpenSupabaseModal}
          className="w-full py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 border border-slate-600"
        >
          Konfigurasi & Skrip SQL
        </button>
      </div>

      <div className="p-4 border-t border-slate-800 text-center text-[10px] text-slate-500">
        Google Sheets Template Compatible<br />
        DJP Compliance PPh 21/22/23/25/4(2)
      </div>
    </aside>
  );
}
