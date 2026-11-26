import React, { useState, useMemo, useEffect } from 'react';
import {
  Library,
  Search,
  Download,
  Printer,
  Eye,
  X,
  Calendar,
  FileText,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../lib/taxRules';
import { JOURNAL_TYPES, buildGeneralLedger } from '../lib/accountingService';
import SearchableSelect from '../components/SearchableSelect';

const DEPARTMENTS = [
  'Semua',
  'Finance & Accounting',
  'IT & Infrastructure',
  'HR & GA',
  'Marketing & Sales',
  'Operations',
  'Executive & Legal'
];

export default function GeneralLedgerModule({
  coaList = [],
  journalEntries = [],
  initialAccountCode = '',
  initialStartDate = '',
  initialEndDate = ''
}) {
  const defaultYear = new Date().getFullYear();
  const [selectedAccountCode, setSelectedAccountCode] = useState(
    initialAccountCode || coaList[0]?.code || ''
  );
  const [startDate, setStartDate] = useState(initialStartDate || `${defaultYear}-01-01`);
  const [endDate, setEndDate] = useState(initialEndDate || `${defaultYear}-12-31`);
  const [journalType, setJournalType] = useState('Semua');
  const [department, setDepartment] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceJournalModal, setSourceJournalModal] = useState(null);

  useEffect(() => {
    if (initialAccountCode) setSelectedAccountCode(initialAccountCode);
  }, [initialAccountCode]);

  useEffect(() => {
    if (initialStartDate) setStartDate(initialStartDate);
    if (initialEndDate) setEndDate(initialEndDate);
  }, [initialStartDate, initialEndDate]);

  useEffect(() => {
    if (!selectedAccountCode && coaList.length > 0) {
      setSelectedAccountCode(coaList[0].code);
    }
  }, [coaList, selectedAccountCode]);

  const selectedAccount = useMemo(
    () => coaList.find(c => c.code === selectedAccountCode) || null,
    [coaList, selectedAccountCode]
  );

  const ledger = useMemo(() => {
    if (!selectedAccount) return null;
    return buildGeneralLedger({
      account: selectedAccount,
      journalEntries,
      startDate,
      endDate,
      journalType,
      department,
      searchQuery
    });
  }, [selectedAccount, journalEntries, startDate, endDate, journalType, department, searchQuery]);

  const coaOptions = useMemo(() => {
    return coaList.map(c => ({
      value: c.code,
      label: `${c.code} - ${c.name}`,
      subLabel: `${c.category} • Normal: ${c.normalBalance}`
    }));
  }, [coaList]);

  const handleExportCSV = () => {
    if (!ledger) return;
    const headers = ['Tanggal,No. Jurnal,Jenis Jurnal,No. Referensi,Departemen,Deskripsi,Debit,Kredit,Saldo Berjalan'];
    const openingRow = `"${startDate || '-'}","SALDO AWAL","","","","Saldo Awal Periode","0","0","${ledger.openingBalance}"`;
    const rows = ledger.rows.map(r =>
      `"${r.entryDate}","${r.entryNumber}","${r.journalType}","${r.referenceNo}","${r.department}","${(r.description || '').replace(/"/g, '""')}","${r.debit}","${r.credit}","${r.runningBalance}"`
    );
    const closingRow = `"${endDate || '-'}","SALDO AKHIR","","","","Saldo Akhir Periode","${ledger.totalPeriodDebit}","${ledger.totalPeriodCredit}","${ledger.closingBalance}"`;

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, openingRow, ...rows, closingRow].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Buku_Besar_${selectedAccount.code}_${startDate}_sd_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-700 rounded-xl">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Buku Besar (General Ledger)</h2>
            <p className="text-xs text-slate-500">
              Rincian mutasi Debit, Kredit, dan Saldo Berjalan per akun dari seluruh jurnal berstatus Posted
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!ledger}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor Excel (CSV)
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3 no-print">
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Akun COA</label>
          <SearchableSelect
            options={coaOptions}
            value={selectedAccountCode}
            onChange={setSelectedAccountCode}
            placeholder="Cari kode atau nama akun..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jenis Jurnal</label>
          <select
            value={journalType}
            onChange={(e) => setJournalType(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
          >
            <option value="Semua">Semua Jenis</option>
            {JOURNAL_TYPES.map(jt => <option key={jt.type} value={jt.type}>{jt.type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cari Jurnal / Ref</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="No. jurnal / ket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {ledger && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Saldo Awal Periode</span>
            <div className="text-lg font-extrabold text-slate-800 mt-1 font-mono">{formatRupiah(ledger.openingBalance)}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Normal: {selectedAccount.normalBalance}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" /> Mutasi Debit
            </span>
            <div className="text-lg font-extrabold text-blue-700 mt-1 font-mono">{formatRupiah(ledger.totalPeriodDebit)}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">{ledger.rows.length} baris transaksi</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" /> Mutasi Kredit
            </span>
            <div className="text-lg font-extrabold text-emerald-700 mt-1 font-mono">{formatRupiah(ledger.totalPeriodCredit)}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Periode {startDate} s/d {endDate}</p>
          </div>
          <div className="bg-sky-50 p-4 rounded-xl border border-sky-200">
            <span className="text-[11px] font-bold text-sky-800 uppercase">Saldo Akhir Akun</span>
            <div className="text-lg font-extrabold text-sky-900 mt-1 font-mono">{formatRupiah(ledger.closingBalance)}</div>
            <p className="text-[10px] text-sky-700 mt-0.5">{selectedAccount.code} • {selectedAccount.name}</p>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {selectedAccount && (
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-mono font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded mr-2">{selectedAccount.code}</span>
              <strong className="text-slate-800">{selectedAccount.name}</strong>
              <span className="text-slate-400 ml-2">({selectedAccount.category} • {selectedAccount.subCategory || '-'})</span>
            </div>
            <div className="flex items-center gap-2 no-print">
              <span className="text-[11px] text-slate-500">Departemen:</span>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-md"
              >
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800 text-white uppercase font-bold tracking-wider text-[11px]">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">No. Jurnal</th>
                <th className="py-3 px-4">Jenis Jurnal</th>
                <th className="py-3 px-4">Deskripsi Transaksi</th>
                <th className="py-3 px-4">No. Referensi</th>
                <th className="py-3 px-4 text-right">Debit (Rp)</th>
                <th className="py-3 px-4 text-right">Kredit (Rp)</th>
                <th className="py-3 px-4 text-right">Saldo Berjalan (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger && (
                <tr className="bg-slate-50 font-semibold text-slate-700">
                  <td className="py-2.5 px-4 font-mono text-[11px]">{startDate || '-'}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-500">SALDO AWAL</td>
                  <td className="py-2.5 px-4">–</td>
                  <td className="py-2.5 px-4 italic">Saldo Awal Akun {selectedAccount?.code}</td>
                  <td className="py-2.5 px-4">–</td>
                  <td className="py-2.5 px-4 text-right font-mono">–</td>
                  <td className="py-2.5 px-4 text-right font-mono">–</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(ledger.openingBalance)}
                  </td>
                </tr>
              )}

              {!ledger || ledger.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Belum ada mutasi transaksi yang diposting untuk akun ini pada periode terpilih.
                  </td>
                </tr>
              ) : (
                ledger.rows.map(row => (
                  <tr key={row.id} className="hover:bg-sky-50/40 transition">
                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">{formatDateIndo(row.entryDate)}</td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => setSourceJournalModal(row.journal)}
                        className="font-mono font-bold text-indigo-700 hover:underline flex items-center gap-1"
                        title="Buka Jurnal Sumber"
                      >
                        {row.entryNumber}
                        <Eye className="w-3 h-3 no-print" />
                      </button>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {row.journalType}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-800 max-w-[280px]">{row.description}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{row.referenceNo}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-blue-800">
                      {row.debit > 0 ? formatRupiah(row.debit) : '–'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-800">
                      {row.credit > 0 ? formatRupiah(row.credit) : '–'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(row.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {ledger && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td colSpan={5} className="py-3 px-4 uppercase tracking-wider">SALDO AKHIR PERIODE</td>
                  <td className="py-3 px-4 text-right font-mono text-blue-200">{formatRupiah(ledger.totalPeriodDebit)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-200">{formatRupiah(ledger.totalPeriodCredit)}</td>
                  <td className="py-3 px-4 text-right font-mono text-sky-300">{formatRupiah(ledger.closingBalance)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal Jurnal Sumber */}
      {sourceJournalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-bold">Jurnal Sumber: {sourceJournalModal.entryNumber}</span>
              </div>
              <button onClick={() => setSourceJournalModal(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div><strong>Tanggal:</strong> {formatDateIndo(sourceJournalModal.entryDate)} • <strong>Modul:</strong> {sourceJournalModal.sourceModule}</div>
                <div className="mt-1"><strong>Deskripsi:</strong> {sourceJournalModal.description}</div>
              </div>
              <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="py-2 px-3 text-left">Kode</th>
                    <th className="py-2 px-3 text-left">Akun</th>
                    <th className="py-2 px-3 text-right">Debit</th>
                    <th className="py-2 px-3 text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(sourceJournalModal.lines || []).map((l, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-mono font-bold">{l.accountCode}</td>
                      <td className="py-2 px-3">{l.accountName}</td>
                      <td className="py-2 px-3 text-right font-mono text-blue-800">{Number(l.debit) > 0 ? formatRupiah(l.debit) : '–'}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-800">{Number(l.credit) > 0 ? formatRupiah(l.credit) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

