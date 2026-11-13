import React from 'react';
import { 
  DollarSign, 
  Wallet, 
  Receipt, 
  FileText, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Calendar,
  Building2,
  Users,
  ChevronRight,
  TrendingUp,
  FileCheck2
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/taxRules';

export default function Dashboard({ 
  coaList = [], 
  vendorList = [], 
  purchaseRequests = [], 
  taxRecords = [],
  onNavigate 
}) {
  // 1. Hitung Kas & Bank (COA subCategory 'Kas & Bank')
  const totalKasBank = coaList
    .filter(a => a.subCategory === 'Kas & Bank')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  // 2. Hitung Hutang Usaha & Pajak (COA kategori Liability)
  const totalHutangUsaha = coaList
    .filter(a => a.category === 'Liability')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  // 3. Hitung Pengajuan Pembelian
  const totalPengajuan = purchaseRequests.reduce((sum, p) => sum + (Number(p.grandTotal) || 0), 0);
  const pendingRequests = purchaseRequests.filter(p => p.status === 'Menunggu Persetujuan' || p.status === 'Draft');
  const approvedRequests = purchaseRequests.filter(p => p.status === 'Disetujui' || p.status === 'Lunas');

  // 4. Hitung Rekap Pajak PPh
  const totalTaxAmount = taxRecords.reduce((sum, t) => sum + (Number(t.taxAmount) || 0), 0);
  const paidTax = taxRecords
    .filter(t => t.status === 'Lunas / Disetor (NTPN)' || t.status === 'Dilaporkan SPT Masa')
    .reduce((sum, t) => sum + (Number(t.taxAmount) || 0), 0);
  const unpaidTax = taxRecords
    .filter(t => t.status === 'Draft / Belum Disetor' || t.status === 'Billing Terbit')
    .reduce((sum, t) => sum + (Number(t.taxAmount) || 0), 0);

  // Pajak per PPh type
  const taxByType = {
    'PPh 21': taxRecords.filter(t => t.taxType === 'PPh 21').reduce((s, t) => s + (Number(t.taxAmount) || 0), 0),
    'PPh 22': taxRecords.filter(t => t.taxType === 'PPh 22').reduce((s, t) => s + (Number(t.taxAmount) || 0), 0),
    'PPh 23': taxRecords.filter(t => t.taxType === 'PPh 23').reduce((s, t) => s + (Number(t.taxAmount) || 0), 0),
    'PPh 25': taxRecords.filter(t => t.taxType === 'PPh 25').reduce((s, t) => s + (Number(t.taxAmount) || 0), 0),
    'PPh 4(2)': taxRecords.filter(t => t.taxType === 'PPh 4(2)').reduce((s, t) => s + (Number(t.taxAmount) || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-emerald-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Sistem Keuangan & Perpajakan Terintegrasi v1
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Ringkasan Eksekutif Keuangan</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Monitoring real-time saldo akun COA, kepatuhan pemotongan pajak PPh 21/22/23/25/4(2), dan alur pengajuan pembelian rekanan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('purchases')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/30 transition flex items-center gap-1.5"
            >
              + Buat Pengajuan Baru
            </button>
            <button
              onClick={() => onNavigate('taxes')}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border border-emerald-700/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              Rekap SPT Masa PPh
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Kas & Bank */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kas & Bank Tersedia</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-slate-800">{formatRupiah(totalKasBank)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">BCA & Mandiri</span> • Likuiditas lancar
            </p>
          </div>
        </div>

        {/* Card 2: Pengajuan Pembelian */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pengajuan (PR)</span>
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-slate-800">{formatRupiah(totalPengajuan)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-amber-600 font-semibold">{pendingRequests.length} Menunggu Approval</span>
            </p>
          </div>
        </div>

        {/* Card 3: Pajak PPh Terpotong */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pajak PPh (Withholding)</span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-slate-800">{formatRupiah(totalTaxAmount)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">{formatRupiah(paidTax)} Disetor</span>
            </p>
          </div>
        </div>

        {/* Card 4: PPh Belum Disetor (Due Tax) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kewajiban Setor Pajak</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-extrabold text-amber-700">{formatRupiah(unpaidTax)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Jatuh tempo tgl 15 bulan ini</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Breakdown Pajak & Recent Purchase Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Purchase Requisitions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pengajuan Pembelian Terbaru</h3>
              <p className="text-xs text-slate-500">Daftar pengadaan barang & jasa serta status pemotongan PPh</p>
            </div>
            <button
              onClick={() => onNavigate('purchases')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              Lihat Semua ({purchaseRequests.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {purchaseRequests.slice(0, 5).map((pr) => {
              const statusStyles = {
                'Draft': 'bg-slate-100 text-slate-700',
                'Menunggu Persetujuan': 'bg-amber-100 text-amber-800 border-amber-200',
                'Disetujui': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                'Ditolak': 'bg-rose-100 text-rose-800',
                'Lunas': 'bg-teal-100 text-teal-800'
              };

              return (
                <div key={pr.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded-xl transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{pr.requestNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusStyles[pr.status] || 'bg-slate-100 text-slate-600'}`}>
                        {pr.status}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">{formatDateIndo(pr.requestDate)}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-1">{pr.title}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Vendor: <strong>{pr.vendorName}</strong></span>
                      {pr.pphType !== 'Non-PPh' && (
                        <span className="bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-medium border border-purple-200">
                          Potong {pr.pphType} ({pr.pphRate}%): {formatRupiah(pr.pphAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Total Bersih (Payable)</div>
                    <div className="text-sm font-extrabold text-slate-900">{formatRupiah(pr.totalPayable)}</div>
                    <div className="text-[10px] text-slate-500">DPP: {formatRupiah(pr.dpp)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Rekapitulasi Pajak PPh 21/22/23/25/4(2) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Komposisi Pajak PPh</h3>
              <p className="text-xs text-slate-500">Withholding & Angsuran Masa Berjalan</p>
            </div>
            <button
              onClick={() => onNavigate('taxes')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Detail SPT
            </button>
          </div>

          <div className="space-y-3">
            {/* PPh 21 */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-slate-800">PPh Pasal 21</span>
                </div>
                <span className="text-[10px] text-slate-500 ml-4">Gaji, Upah, & Tenaga Ahli</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">{formatRupiah(taxByType['PPh 21'])}</span>
              </div>
            </div>

            {/* PPh 22 */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-slate-800">PPh Pasal 22</span>
                </div>
                <span className="text-[10px] text-slate-500 ml-4">Pengadaan Barang & BUMN</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">{formatRupiah(taxByType['PPh 22'])}</span>
              </div>
            </div>

            {/* PPh 23 */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-800">PPh Pasal 23</span>
                </div>
                <span className="text-[10px] text-slate-500 ml-4">Jasa Manajemen, Teknik, Sewa</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">{formatRupiah(taxByType['PPh 23'])}</span>
              </div>
            </div>

            {/* PPh 25 */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-xs font-bold text-slate-800">PPh Pasal 25</span>
                </div>
                <span className="text-[10px] text-slate-500 ml-4">Angsuran PPh Badan Bulanan</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">{formatRupiah(taxByType['PPh 25'])}</span>
              </div>
            </div>

            {/* PPh 4(2) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-slate-800">PPh Final Pasal 4(2)</span>
                </div>
                <span className="text-[10px] text-slate-500 ml-4">Sewa Gedung & Jasa Konstruksi</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900">{formatRupiah(taxByType['PPh 4(2)'])}</span>
              </div>
            </div>
          </div>

          {/* Compliance Alert Box */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Jadwal Kepatuhan Pajak (DJP)
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              • Tgl 10: Setor PPh 21/26<br />
              • Tgl 15: Setor PPh 22, 23, 25, 4(2)<br />
              • Tgl 20: Lapor SPT Masa Unifikasi PPh
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

