import React from 'react';
import { X, Printer, Download, Building2, CheckCircle2 } from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/taxRules';

export default function PurchasePrintPreviewModal({ pr, vendor, coaList, onClose }) {
  if (!pr) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-slate-900 px-6 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Pratinjau Dokumen Cetak</span>
            <span className="text-slate-400">•</span>
            <span className="text-xs font-mono">{pr.requestNumber}</span>
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

        {/* Printable Purchase Requisition / Order Voucher */}
        <div className="p-8 space-y-6 text-slate-800 bg-white" id="printable-po">
          {/* Company & Document Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-emerald-600" />
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">PT SOLUSI FINANSIAL DIGITAL</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Gedung Cyber One Lt. 14, Jl. HR Rasuna Said, Jakarta Selatan<br />
                NPWP: 01.222.333.4-055.000 • Telp: (021) 5088-9900
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200 inline-block mb-1">
                PENGAJUAN PEMBELIAN
              </span>
              <div className="text-xs font-mono font-bold text-slate-800">{pr.requestNumber}</div>
              <div className="text-xs text-slate-500">Tanggal: {formatDateIndo(pr.requestDate)}</div>
              <div className="text-xs text-slate-500">Jatuh Tempo: {formatDateIndo(pr.dueDate) || '-'}</div>
            </div>
          </div>

          {/* Info Details Grid */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Informasi Pemohon</span>
              <div className="font-bold text-slate-800 text-sm">{pr.requesterName}</div>
              <div className="text-slate-600">Departemen: <strong>{pr.department}</strong></div>
              <div className="text-slate-600">Keperluan: <strong>{pr.title}</strong></div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Vendor / Rekanan Dituju</span>
              <div className="font-bold text-slate-800 text-sm">{pr.vendorName}</div>
              <div className="text-slate-600">NPWP: {vendor?.npwp || 'Tidak Ada (Non-NPWP)'}</div>
              <div className="text-slate-600">Bank: {vendor?.bankName || '-'} ({vendor?.bankAccount || '-'} a/n {vendor?.bankAccountHolder || '-'})</div>
            </div>
          </div>

          {/* Description */}
          {pr.description && (
            <div className="text-xs bg-slate-50/50 p-3 rounded-lg border border-slate-100">
              <span className="font-semibold text-slate-600">Keterangan / Rincian Kebutuhan:</span>
              <p className="text-slate-700 mt-0.5">{pr.description}</p>
            </div>
          )}

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3 w-8 text-center">No</th>
                  <th className="py-2.5 px-3">Deskripsi Barang / Jasa</th>
                  <th className="py-2.5 px-3">Alokasi COA</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-center">Satuan</th>
                  <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pr.items && pr.items.length > 0 ? (
                  pr.items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{it.description}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{it.coaId || '-'}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{it.qty}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{it.unit}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(it.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatRupiah(it.subtotal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-2.5 px-3 text-center text-slate-500">Tidak ada item rincian.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tax & Financial Summary */}
          <div className="flex justify-end text-xs">
            <div className="w-72 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Barang/Jasa:</span>
                <span className="font-mono font-semibold">{formatRupiah(pr.subtotal)}</span>
              </div>
              {pr.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon:</span>
                  <span className="font-mono font-semibold">- {formatRupiah(pr.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 font-bold border-t border-slate-200 pt-1.5">
                <span>DPP (Dasar Pengenaan Pajak):</span>
                <span className="font-mono">{formatRupiah(pr.dpp)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>PPN ({pr.ppnRate || 0}%):</span>
                <span className="font-mono font-semibold">+ {formatRupiah(pr.ppnAmount)}</span>
              </div>
              {pr.pphType !== 'Non-PPh' && (
                <div className="flex justify-between text-purple-700 font-medium">
                  <span>Potongan {pr.pphType} ({pr.pphRate}%):</span>
                  <span className="font-mono font-bold">- {formatRupiah(pr.pphAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-extrabold text-sm border-t-2 border-slate-800 pt-2">
                <span>Total Net Dibayar (Payable):</span>
                <span className="font-mono text-emerald-700">{formatRupiah(pr.totalPayable)}</span>
              </div>
            </div>
          </div>

          {/* Signature Boxes */}
          <div className="grid grid-cols-3 gap-6 text-center text-xs pt-4 border-t border-slate-200">
            <div>
              <span className="text-slate-500">Diajukan Oleh,</span>
              <div className="h-16 flex items-center justify-center font-bold text-slate-800">
                {pr.requesterName}
              </div>
              <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">Staff / Pemohon</div>
            </div>

            <div>
              <span className="text-slate-500">Diperiksa Keuangan,</span>
              <div className="h-16 flex items-center justify-center font-bold text-slate-800">
                Siti Rahmawati
              </div>
              <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">Finance & Tax Spv</div>
            </div>

            <div>
              <span className="text-slate-500">Disetujui Oleh,</span>
              <div className="h-16 flex items-center justify-center font-bold text-emerald-800">
                {pr.approvedBy || (pr.status === 'Disetujui' || pr.status === 'Lunas' ? 'Irfan Hakim' : '(Menunggu Approval)')}
              </div>
              <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">Direktur / Manajemen</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

