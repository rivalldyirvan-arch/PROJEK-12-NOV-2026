import React from 'react';
import { X, Printer, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/taxRules';

export default function BupotPrintPreviewModal({ record, onClose }) {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-slate-900 px-6 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Pratinjau Bukti Pemotongan Pajak</span>
            <span className="text-slate-400">•</span>
            <span className="text-xs font-mono">{record.taxType} - {record.referenceNo || record.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / Simpan PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable e-Bupot Voucher */}
        <div className="p-8 space-y-5 text-slate-800 bg-white" id="printable-bupot">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">KEMENTERIAN KEUANGAN REPUBLIK INDONESIA</h1>
                <h2 className="text-xs font-bold text-slate-700">DIREKTORAT JENDERAL PAJAK</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">BUKTI PEMOTONGAN/PEMUNGUTAN UNIFIKASI</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                FORMULIR BUPOT {record.taxType}
              </span>
              <div className="text-[11px] text-slate-500 mt-1">Masa Pajak: <strong>{record.taxPeriodMonth} / {record.taxPeriodYear}</strong></div>
            </div>
          </div>

          {/* Section A: Pemotong Pajak (Company) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">A. IDENTITAS PEMOTONG / PEMUNGUT PAJAK</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500">Nama Perusahaan:</span>
                <div className="font-bold text-slate-900">PT SOLUSI FINANSIAL DIGITAL</div>
              </div>
              <div>
                <span className="text-slate-500">NPWP Pemotong:</span>
                <div className="font-mono font-bold text-slate-900">01.222.333.4-055.000</div>
              </div>
            </div>
          </div>

          {/* Section B: Pihak Terpotong (Taxpayer / Vendor) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">B. IDENTITAS WAJIB PAJAK YANG DIPOTONG</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500">Nama Wajib Pajak:</span>
                <div className="font-bold text-slate-900">{record.taxpayerName}</div>
              </div>
              <div>
                <span className="text-slate-500">NPWP / NIK:</span>
                <div className="font-mono font-bold text-slate-900">
                  {record.taxpayerNpwp || (record.hasNpwp ? 'NPWP Terlampir' : 'TIDAK BER-NPWP')}
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Pajak Penghasilan Yang Dipotong */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200">
              C. RINCIAN OBJEK & BESARAN PAJAK PENGHASILAN
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] uppercase font-bold">
                  <th className="py-2 px-3">Kode Objek Pajak</th>
                  <th className="py-2 px-3">Uraian Transaksi</th>
                  <th className="py-2 px-3 text-right">Jumlah Bruto</th>
                  <th className="py-2 px-3 text-right">DPP Pajak</th>
                  <th className="py-2 px-3 text-center">Tarif</th>
                  <th className="py-2 px-3 text-right">PPh Dipotong</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{record.taxObjectCode || '-'}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{record.taxObjectDescription || record.taxType}</td>
                  <td className="py-3 px-3 text-right font-mono">{formatRupiah(record.grossAmount)}</td>
                  <td className="py-3 px-3 text-right font-mono font-medium">{formatRupiah(record.dppAmount)}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800">{record.taxRate}%</td>
                  <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-800">{formatRupiah(record.taxAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section D: Bukti Penyetoran Kas Negara (NTPN & ID Billing) */}
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-1">
            <div className="font-bold text-emerald-900 uppercase tracking-wider text-[10px] mb-1">
              D. BUKTI SETOR PENERIMAAN NEGARA (MPN G-3)
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-slate-500">Nomor ID Billing:</span>
                <div className="font-mono font-bold text-slate-800">{record.billingId || '(Belum Terbit)'}</div>
              </div>
              <div>
                <span className="text-slate-500">NTPN (Nomor Transaksi):</span>
                <div className="font-mono font-bold text-emerald-700">{record.ntpn || '(Belum Disetor)'}</div>
              </div>
              <div>
                <span className="text-slate-500">Tanggal Bayar / Setor:</span>
                <div className="font-semibold text-slate-800">{formatDateIndo(record.paymentDate)}</div>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-6 pt-6 text-center text-xs">
            <div>
              <p className="text-slate-500">Penerima Bukti Potong,</p>
              <div className="h-16 flex items-center justify-center font-bold text-slate-800">
                {record.taxpayerName}
              </div>
              <div className="border-t border-slate-300 pt-1 text-slate-600 font-medium">Wajib Pajak Terpotong</div>
            </div>
            <div>
              <p className="text-slate-500">Jakarta, {formatDateIndo(record.transactionDate)}</p>
              <div className="h-16 flex items-center justify-center font-bold text-emerald-800">
                Irfan Hakim, SE., Ak., CA
              </div>
              <div className="border-t border-slate-300 pt-1 text-slate-600 font-medium">Kuasa Pemotong Pajak (Finance Director)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

