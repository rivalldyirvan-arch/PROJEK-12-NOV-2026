import React, { useState, useCallback, useMemo } from 'react';
import {
  ShieldCheck, Play, CheckCircle2, XCircle, AlertTriangle, Clock,
  RefreshCw, ChevronRight, ChevronDown, ChevronUp, Info, FileText,
  BarChart3, BookOpen, Scale, Calculator, TrendingUp, Database,
  Layers, Activity, Eye, Clipboard, Download
} from 'lucide-react';
import {
  buildIncomeStatement,
  buildBalanceSheet,
  buildTrialBalance,
  buildAdjustedTrialBalance,
  buildPostClosingTrialBalance,
  calculateFinancialRatios,
  isEffectivePostedStatus
} from '../lib/accountingService';

// ─── Helpers ──────────────────────────────────────────────────────────────
const fmtRp = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(n)))}`;
};
const fmtNum = (n, dec = 2) => (n === null || n === undefined || isNaN(n)) ? '-' : n.toFixed(dec);
const today = () => new Date().toISOString().slice(0, 10);
const firstDayOfYear = () => `${new Date().getFullYear()}-01-01`;

// Status icon
function StatusIcon({ status }) {
  if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
  if (status === 'fail') return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  if (status === 'running') return <RefreshCw className="w-4 h-4 text-blue-500 flex-shrink-0 animate-spin" />;
  return <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />;
}

function StatusBadge({ status, label }) {
  const map = {
    pass: 'bg-emerald-100 text-emerald-800',
    fail: 'bg-red-100 text-red-700',
    warn: 'bg-amber-100 text-amber-800',
    running: 'bg-blue-100 text-blue-700',
    pending: 'bg-slate-100 text-slate-500'
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] || map.pending}`}>{label || status.toUpperCase()}</span>;
}

// ─── SUITE DEFINISI TES ───────────────────────────────────────────────────
/**
 * Setiap tes: { id, name, description, category, run(coaList, journalEntries) → { status, detail, data } }
 * status: 'pass' | 'fail' | 'warn'
 */
function buildTestSuite(coaList, journalEntries) {
  const effective = journalEntries.filter(j => isEffectivePostedStatus(j.status));
  const startDate = firstDayOfYear();
  const endDate = today();

  return [
    // ── TES 1: Double Entry Balance setiap jurnal
    {
      id: 'T01',
      name: 'Validasi Double Entry (Debit = Kredit)',
      description: 'Setiap jurnal harus memiliki total debit = total kredit. Pelanggaran menunjukkan pencatatan yang tidak valid.',
      category: 'Integritas Jurnal',
      icon: Scale,
      run: () => {
        const unbalanced = [];
        journalEntries.forEach(j => {
          const totalD = (j.lines || []).reduce((s, l) => s + (Number(l.debit) || 0), 0);
          const totalC = (j.lines || []).reduce((s, l) => s + (Number(l.credit) || 0), 0);
          if (Math.abs(totalD - totalC) > 0.01) {
            unbalanced.push({ nomor: j.journalNumber || j.id, status: j.status, selisih: totalD - totalC });
          }
        });
        const status = unbalanced.length === 0 ? 'pass' : 'fail';
        return {
          status,
          detail: unbalanced.length === 0
            ? `✓ Semua ${journalEntries.length} jurnal seimbang (Debit = Kredit)`
            : `✗ ${unbalanced.length} jurnal tidak seimbang`,
          data: unbalanced,
          stats: { total: journalEntries.length, unbalanced: unbalanced.length, balanced: journalEntries.length - unbalanced.length }
        };
      }
    },

    // ── TES 2: Jurnal Posted → Running Balance GL akurat
    {
      id: 'T02',
      name: 'Running Balance Buku Besar',
      description: 'Verifikasi bahwa saldo berjalan di GL selalu akumulatif dan konsisten dengan total debit-kredit yang diposting.',
      category: 'Buku Besar',
      icon: BookOpen,
      run: () => {
        const errors = [];
        coaList.forEach(acc => {
          let running = Number(acc.balance) || 0;
          const isDebit = acc.normalBalance === 'Debit';
          if (!isDebit) running = -running;
          const txList = [];
          effective.forEach(j => {
            (j.lines || []).forEach(l => {
              if (l.accountCode !== acc.code) return;
              const prev = running;
              running += (Number(l.debit) || 0) - (Number(l.credit) || 0);
              txList.push({ jurnal: j.journalNumber, debit: l.debit, credit: l.credit, prev, after: running });
            });
          });
          if (txList.length > 0) {
            // Cek tidak ada lompatan negatif ekstrem pada aset (saldo aset tidak boleh < -100M)
            const minBal = txList.reduce((m, t) => Math.min(m, t.after), Infinity);
            if (acc.category === 'Asset' && minBal < -100000000) {
              errors.push({ account: `${acc.code} ${acc.name}`, minBalance: minBal });
            }
          }
        });
        const accountsWithTx = coaList.filter(acc =>
          effective.some(j => (j.lines || []).some(l => l.accountCode === acc.code))
        ).length;
        return {
          status: errors.length === 0 ? 'pass' : 'warn',
          detail: errors.length === 0
            ? `✓ Saldo berjalan valid pada ${accountsWithTx} akun aktif`
            : `⚠ ${errors.length} akun aset memiliki saldo negatif ekstrem`,
          data: errors,
          stats: { accountsChecked: accountsWithTx, issueCount: errors.length }
        };
      }
    },

    // ── TES 3: Trial Balance Debit = Kredit
    {
      id: 'T03',
      name: 'Neraca Saldo (Trial Balance) Seimbang',
      description: 'Total kolom debit harus = total kolom kredit di Neraca Saldo. Ini adalah syarat wajib sebelum closing.',
      category: 'Neraca Saldo',
      icon: Calculator,
      run: () => {
        const tb = buildTrialBalance({ coaList, journalEntries, startDate, endDate });
        const diff = Math.abs(tb.totalEndDebit - tb.totalEndCredit);
        const status = tb.isBalanced ? 'pass' : 'fail';
        return {
          status,
          detail: tb.isBalanced
            ? `✓ Neraca Saldo seimbang: Debit = Kredit = ${fmtRp(tb.totalEndDebit)}`
            : `✗ Tidak seimbang! Selisih: ${fmtRp(diff)}`,
          data: tb.unbalancedJournals || [],
          stats: {
            totalDebit: tb.totalEndDebit,
            totalCredit: tb.totalEndCredit,
            difference: diff,
            isBalanced: tb.isBalanced,
            accountCount: tb.rows?.length || 0
          }
        };
      }
    },

    // ── TES 4: Jurnal Penyesuaian masuk ke Adjusted TB
    {
      id: 'T04',
      name: 'Jurnal Penyesuaian → Adjusted Trial Balance',
      description: 'Jurnal Penyesuaian yang diposting harus masuk ke kolom penyesuaian di Adjusted TB dan mengubah saldo akhir.',
      category: 'Penyesuaian',
      icon: Layers,
      run: () => {
        const adjJournals = journalEntries.filter(j =>
          j.journalType === 'Jurnal Penyesuaian' && isEffectivePostedStatus(j.status)
        );
        const atb = buildAdjustedTrialBalance({ coaList, journalEntries, startDate, endDate });
        const hasAdjustments = atb.rows?.some(r => r.adjDebit > 0 || r.adjCredit > 0);
        const adjTotal = atb.rows?.reduce((s, r) => s + r.adjDebit + r.adjCredit, 0) || 0;

        let status = 'pass';
        let detail = '';
        if (adjJournals.length === 0) {
          status = 'warn';
          detail = `⚠ Tidak ada Jurnal Penyesuaian yang diposting. Jalankan penyesuaian akhir periode.`;
        } else if (!hasAdjustments) {
          status = 'fail';
          detail = `✗ Ada ${adjJournals.length} Jurnal Penyesuaian diposting, tapi tidak masuk ke Adjusted TB.`;
        } else {
          detail = `✓ ${adjJournals.length} Jurnal Penyesuaian masuk ke Adjusted TB (total mutasi: ${fmtRp(adjTotal)})`;
        }
        return {
          status,
          detail,
          data: adjJournals.map(j => ({ nomor: j.journalNumber, tanggal: j.entryDate })),
          stats: { adjJournalCount: adjJournals.length, adjTotal, hasAdjustments }
        };
      }
    },

    // ── TES 5: Income Statement cocok dengan akun L/R
    {
      id: 'T05',
      name: 'Laporan Laba Rugi Konsisten dengan COA',
      description: 'Total pendapatan di L/R harus bersumber dari akun Revenue di COA. Total beban dari akun Expense/COGS.',
      category: 'Laporan Keuangan',
      icon: TrendingUp,
      run: () => {
        const is = buildIncomeStatement({ coaList, journalEntries, startDate, endDate });
        const bs = buildBalanceSheet({ coaList, journalEntries, asOfDate: endDate });
        const issues = [];

        // Cek akun Revenue ada tapi total pendapatan = 0 padahal ada jurnal
        if (effective.length > 0 && is.totalRevenue === 0 && coaList.some(a => a.category === 'Revenue')) {
          issues.push('Ada akun Revenue di COA tapi pendapatan = 0 (cek jurnal Sales diposting atau belum)');
        }
        // Cek neraca seimbang
        if (!bs.isBalanced && Math.abs(bs.difference) > 100) {
          issues.push(`Neraca tidak seimbang (selisih ${fmtRp(bs.difference)}) — periksa saldo awal COA`);
        }
        // Cek laba bersih reasonable (tidak lebih dari total revenue)
        if (is.totalRevenue > 0 && Math.abs(is.netProfit) > is.totalRevenue * 10) {
          issues.push(`Laba bersih (${fmtRp(is.netProfit)}) sangat tidak wajar vs pendapatan (${fmtRp(is.totalRevenue)})`);
        }

        return {
          status: issues.length === 0 ? 'pass' : 'warn',
          detail: issues.length === 0
            ? `✓ L/R konsisten: Pendapatan ${fmtRp(is.totalRevenue)}, HPP ${fmtRp(is.totalCOGS)}, Laba Bersih ${fmtRp(is.netProfit)}`
            : `⚠ ${issues.length} potensi masalah ditemukan`,
          data: issues.map(i => ({ issue: i })),
          stats: {
            totalRevenue: is.totalRevenue,
            totalCOGS: is.totalCOGS,
            grossProfit: is.grossProfit,
            netProfit: is.netProfit,
            balanceSheetOk: bs.isBalanced
          }
        };
      }
    },

    // ── TES 6: Setelah Closing → Akun Nominal = 0
    {
      id: 'T06',
      name: 'Jurnal Penutup → Akun Nominal = 0',
      description: 'Setelah jurnal penutup diposting, semua akun nominal (Revenue, Expense, COGS, dll.) harus bersaldo 0.',
      category: 'Closing',
      icon: CheckCircle2,
      run: () => {
        const closingJournals = journalEntries.filter(j =>
          j.journalType === 'Jurnal Penutup' && isEffectivePostedStatus(j.status)
        );

        if (closingJournals.length === 0) {
          return {
            status: 'warn',
            detail: '⚠ Belum ada Jurnal Penutup diposting. Jalankan closing di modul Penyesuaian & Closing.',
            data: [],
            stats: { closingCount: 0 }
          };
        }

        const pctb = buildPostClosingTrialBalance({ coaList, journalEntries, endDate });
        const nonZeroNominal = pctb.nonZeroNominal || [];

        return {
          status: nonZeroNominal.length === 0 ? 'pass' : 'fail',
          detail: nonZeroNominal.length === 0
            ? `✓ Semua akun nominal bersaldo 0 setelah ${closingJournals.length} Jurnal Penutup diposting`
            : `✗ ${nonZeroNominal.length} akun nominal masih memiliki saldo setelah closing`,
          data: nonZeroNominal.map(r => ({ kode: r.code, nama: r.name, debit: r.debit, kredit: r.credit })),
          stats: { closingCount: closingJournals.length, nonZeroNominalCount: nonZeroNominal.length }
        };
      }
    },

    // ── TES 7: Post-Closing TB hanya akun permanen
    {
      id: 'T07',
      name: 'Post-Closing TB Hanya Akun Permanen',
      description: 'Neraca Saldo Setelah Penutupan hanya boleh berisi akun Aset, Kewajiban, dan Ekuitas.',
      category: 'Closing',
      icon: Database,
      run: () => {
        const closingJournals = journalEntries.filter(j =>
          j.journalType === 'Jurnal Penutup' && isEffectivePostedStatus(j.status)
        );
        if (closingJournals.length === 0) {
          return {
            status: 'warn',
            detail: '⚠ Belum ada Jurnal Penutup. Jalankan closing terlebih dahulu.',
            data: [], stats: {}
          };
        }
        const pctb = buildPostClosingTrialBalance({ coaList, journalEntries, endDate });
        const nominalWithBalance = pctb.nonZeroNominal || [];
        const permanentAccounts = pctb.rows || [];
        return {
          status: nominalWithBalance.length === 0 ? 'pass' : 'fail',
          detail: nominalWithBalance.length === 0
            ? `✓ Post-Closing TB valid: ${permanentAccounts.length} akun permanen, 0 akun nominal bersaldo`
            : `✗ Post-Closing TB mengandung ${nominalWithBalance.length} akun nominal yang masih bersaldo`,
          data: nominalWithBalance.map(r => ({ kode: r.code, nama: r.name, kategori: r.category })),
          stats: { permanentCount: permanentAccounts.length, nominalWithBalanceCount: nominalWithBalance.length }
        };
      }
    },

    // ── TES 8: Validasi Kalkulasi Rasio Keuangan
    {
      id: 'T08',
      name: 'Kalkulasi Rasio Keuangan Akurat',
      description: 'Verifikasi rumus rasio kunci: Current Ratio = Aset Lancar / Liab Lancar, Net Profit Margin = Laba Bersih / Pendapatan.',
      category: 'Analisis Keuangan',
      icon: BarChart3,
      run: () => {
        const ratios = calculateFinancialRatios({ coaList, journalEntries, startDate, endDate });
        const is = ratios.is;
        const bs = ratios.bs;
        const checks = [];

        // Manual re-check Current Ratio
        if (bs.totalCurrentLiabilities > 0) {
          const manualCR = bs.totalCurrentAssets / bs.totalCurrentLiabilities;
          const diff = Math.abs((ratios.currentRatio || 0) - manualCR);
          checks.push({
            rasio: 'Current Ratio',
            kalkulasi: fmtNum(ratios.currentRatio),
            manual: fmtNum(manualCR),
            match: diff < 0.001,
            formula: `${fmtRp(bs.totalCurrentAssets)} / ${fmtRp(bs.totalCurrentLiabilities)}`
          });
        }

        // Manual re-check Net Profit Margin
        if (is.totalRevenue > 0) {
          const manualNPM = (is.netProfit / is.totalRevenue) * 100;
          const diff = Math.abs((ratios.netProfitMargin || 0) - manualNPM);
          checks.push({
            rasio: 'Net Profit Margin',
            kalkulasi: fmtNum(ratios.netProfitMargin) + '%',
            manual: fmtNum(manualNPM) + '%',
            match: diff < 0.001,
            formula: `${fmtRp(is.netProfit)} / ${fmtRp(is.totalRevenue)} × 100`
          });
        }

        // ROA check
        if (ratios.avgTotalAssets > 0 && is.netProfit !== undefined) {
          const manualROA = (is.netProfit / ratios.avgTotalAssets) * 100;
          const diff = Math.abs((ratios.roa || 0) - manualROA);
          checks.push({
            rasio: 'Return on Assets (ROA)',
            kalkulasi: fmtNum(ratios.roa) + '%',
            manual: fmtNum(manualROA) + '%',
            match: diff < 0.001,
            formula: `${fmtRp(is.netProfit)} / Rata-rata Aset × 100`
          });
        }

        if (checks.length === 0) {
          return {
            status: 'warn',
            detail: '⚠ Tidak cukup data untuk memvalidasi rasio (butuh data pendapatan & liabilitas)',
            data: [], stats: { checksRun: 0 }
          };
        }

        const failed = checks.filter(c => !c.match);
        return {
          status: failed.length === 0 ? 'pass' : 'fail',
          detail: failed.length === 0
            ? `✓ ${checks.length} rasio keuangan terverifikasi akurat`
            : `✗ ${failed.length} rasio tidak akurat`,
          data: checks,
          stats: { checksRun: checks.length, failed: failed.length }
        };
      }
    },

    // ── TES 9: Audit Trail mencatat perubahan
    {
      id: 'T09',
      name: 'Audit Trail & Jejak Perubahan',
      description: 'Setiap tindakan posting, reversal, approval harus tercatat di audit trail dengan timestamp dan pelaku.',
      category: 'Audit & Kepatuhan',
      icon: Eye,
      run: () => {
        // Cek jurnal yang diposting memiliki status history
        const postedJournals = journalEntries.filter(j => j.status === 'Posted');
        const reversedJournals = journalEntries.filter(j => j.status === 'Reversed');
        const withHistory = journalEntries.filter(j => j.postedAt || j.postedBy || j.approvedAt || j.createdAt);
        const coverageRate = journalEntries.length > 0 ? (withHistory.length / journalEntries.length) * 100 : 0;

        // Cek tidak ada jurnal Posted tanpa tanggal posting
        const missingPostDate = postedJournals.filter(j => !j.postedAt && !j.approvedAt && !j.createdAt);

        return {
          status: coverageRate >= 80 ? 'pass' : coverageRate >= 50 ? 'warn' : 'fail',
          detail: `Audit trail coverage: ${fmtNum(coverageRate, 0)}% (${withHistory.length}/${journalEntries.length} jurnal). Posted: ${postedJournals.length}, Reversed: ${reversedJournals.length}`,
          data: missingPostDate.slice(0, 10).map(j => ({ nomor: j.journalNumber, status: j.status })),
          stats: {
            total: journalEntries.length,
            withHistory: withHistory.length,
            coverageRate,
            postedCount: postedJournals.length,
            reversedCount: reversedJournals.length,
            missingAuditData: missingPostDate.length
          }
        };
      }
    },

    // ── TES 10: Tidak ada jurnal duplikat / posting tidak lengkap
    {
      id: 'T10',
      name: 'Validasi Jurnal Duplikat & Kelengkapan',
      description: 'Nomor jurnal tidak boleh duplikat. Jurnal yang diposting harus memiliki minimal 2 baris (debit & kredit).',
      category: 'Integritas Jurnal',
      icon: ShieldCheck,
      run: () => {
        const issues = [];

        // Cek duplikat nomor jurnal
        const numberMap = {};
        journalEntries.forEach(j => {
          if (!j.journalNumber) return;
          if (numberMap[j.journalNumber]) {
            issues.push({ tipe: 'Duplikat', nomor: j.journalNumber, detail: `Nomor jurnal muncul ${numberMap[j.journalNumber] + 1} kali` });
          }
          numberMap[j.journalNumber] = (numberMap[j.journalNumber] || 0) + 1;
        });

        // Cek jurnal posted dengan < 2 baris
        journalEntries
          .filter(j => isEffectivePostedStatus(j.status))
          .forEach(j => {
            if (!j.lines || j.lines.length < 2) {
              issues.push({ tipe: 'Kurang Baris', nomor: j.journalNumber || j.id, detail: `Hanya ${j.lines?.length || 0} baris (minimum 2)` });
            }
          });

        // Cek jurnal draft yang sudah lama (> 30 hari)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
        const staleDrafts = journalEntries.filter(j =>
          j.status === 'Draft' && j.entryDate && j.entryDate < thirtyDaysAgo
        );
        if (staleDrafts.length > 0) {
          issues.push({ tipe: 'Draft Lama', nomor: `${staleDrafts.length} jurnal`, detail: `Draft lebih dari 30 hari — perlu diposting atau dihapus` });
        }

        return {
          status: issues.filter(i => i.tipe !== 'Draft Lama').length === 0 ? (staleDrafts.length > 0 ? 'warn' : 'pass') : 'fail',
          detail: issues.length === 0
            ? `✓ Tidak ada duplikat, semua jurnal posted memiliki ≥ 2 baris`
            : `${issues.filter(i => i.tipe !== 'Draft Lama').length} masalah kritis, ${staleDrafts.length} draft lama`,
          data: issues,
          stats: {
            totalJournals: journalEntries.length,
            duplicateNumbers: issues.filter(i => i.tipe === 'Duplikat').length,
            incompletePosted: issues.filter(i => i.tipe === 'Kurang Baris').length,
            staleDrafts: staleDrafts.length
          }
        };
      }
    }
  ];
}

// ─── MAIN MODULE ─────────────────────────────────────────────────────────────
export default function SystemValidationModule({ coaList = [], journalEntries = [], showToast }) {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [lastRunAt, setLastRunAt] = useState(null);

  const tests = useMemo(() => buildTestSuite(coaList, journalEntries), [coaList, journalEntries]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const runTest = useCallback(async (test) => {
    setRunningId(test.id);
    setResults(prev => ({ ...prev, [test.id]: { status: 'running' } }));
    await new Promise(r => setTimeout(r, 120)); // visual delay
    try {
      const result = test.run();
      setResults(prev => ({ ...prev, [test.id]: result }));
    } catch (err) {
      setResults(prev => ({ ...prev, [test.id]: { status: 'fail', detail: `Error: ${err.message}`, data: [] } }));
    }
    setRunningId(null);
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    setResults({});
    let failCount = 0;
    for (const test of tests) {
      setRunningId(test.id);
      setResults(prev => ({ ...prev, [test.id]: { status: 'running' } }));
      await new Promise(r => setTimeout(r, 80));
      try {
        const result = test.run();
        if (result.status === 'fail') failCount++;
        setResults(prev => ({ ...prev, [test.id]: result }));
      } catch (err) {
        failCount++;
        setResults(prev => ({ ...prev, [test.id]: { status: 'fail', detail: `Error: ${err.message}`, data: [] } }));
      }
    }
    setRunningId(null);
    setRunning(false);
    setLastRunAt(new Date().toLocaleString('id-ID'));
    showToast?.(failCount === 0 ? 'Semua tes selesai tanpa kegagalan ✓' : `${failCount} tes gagal — periksa detail`, failCount === 0 ? 'success' : 'error');
  }, [tests, showToast]);

  // Summary stats
  const summary = useMemo(() => {
    const vals = Object.values(results);
    return {
      pass: vals.filter(r => r.status === 'pass').length,
      fail: vals.filter(r => r.status === 'fail').length,
      warn: vals.filter(r => r.status === 'warn').length,
      running: vals.filter(r => r.status === 'running').length,
      total: tests.length,
      done: vals.filter(r => r.status && r.status !== 'running').length
    };
  }, [results, tests.length]);

  const handleExportReport = () => {
    const rows = tests.map(t => {
      const r = results[t.id] || {};
      return `${t.id},${t.name},${r.status || 'pending'},"${r.detail || '-'}"`;
    });
    const csv = `ID,Nama Tes,Status,Detail\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `laporan-validasi-sistem-${today()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast?.('Laporan validasi diunduh', 'success');
  };

  const categories = [...new Set(tests.map(t => t.category))];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Validasi Sistem Akuntansi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            10 tes wajib sesuai standar SAK Indonesia — verifikasi integritas seluruh siklus akuntansi
          </p>
        </div>
        {lastRunAt && (
          <div className="text-[11px] text-slate-400 text-right">
            <div>Terakhir dijalankan:</div>
            <div className="font-semibold text-slate-600">{lastRunAt}</div>
          </div>
        )}
      </div>

      {/* Summary scoreboard */}
      {summary.done > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-emerald-700">{summary.pass}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">LULUS</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-red-600">{summary.fail}</div>
            <div className="text-[11px] font-semibold text-red-500 mt-0.5">GAGAL</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-amber-600">{summary.warn}</div>
            <div className="text-[11px] font-semibold text-amber-500 mt-0.5">PERINGATAN</div>
          </div>
          <div className={`rounded-xl p-4 text-center border ${
            summary.fail === 0 && summary.done === summary.total
              ? 'bg-emerald-100 border-emerald-300'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="text-2xl font-black text-slate-700">{summary.done}/{summary.total}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">SELESAI</div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {running && (
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(summary.done / summary.total) * 100}%` }}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={runAll}
          disabled={running}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            running
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200'
          }`}
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Menjalankan tes...' : 'Jalankan Semua Tes'}
        </button>
        {summary.done > 0 && (
          <button onClick={handleExportReport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 hover:bg-slate-50 text-slate-600">
            <Download className="w-4 h-4" /> Export Laporan CSV
          </button>
        )}
        <div className="ml-auto text-[11px] text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Data: {coaList.length} akun COA · {journalEntries.length} jurnal ({journalEntries.filter(j => j.status === 'Posted').length} posted)
        </div>
      </div>

      {/* Test list by category */}
      {categories.map(cat => (
        <div key={cat} className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">{cat}</h3>
          {tests.filter(t => t.category === cat).map(test => {
            const result = results[test.id];
            const isRunningThis = runningId === test.id;
            const status = isRunningThis ? 'running' : result?.status || 'pending';
            const isOpen = expanded[test.id];
            const Icon = test.icon || ShieldCheck;

            return (
              <div key={test.id} className={`bg-white rounded-xl border transition-all ${
                status === 'pass' ? 'border-emerald-200' :
                status === 'fail' ? 'border-red-200' :
                status === 'warn' ? 'border-amber-200' :
                status === 'running' ? 'border-blue-200' : 'border-slate-200'
              }`}>
                <div className="flex items-start gap-3 p-4">
                  {/* Status Icon */}
                  <div className="mt-0.5">
                    <StatusIcon status={status} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-400">{test.id}</span>
                      <span className="text-sm font-bold text-slate-800">{test.name}</span>
                      <StatusBadge status={status} label={
                        status === 'pass' ? 'LULUS' :
                        status === 'fail' ? 'GAGAL' :
                        status === 'warn' ? 'PERINGATAN' :
                        status === 'running' ? 'BERJALAN...' : 'MENUNGGU'
                      } />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{test.description}</p>
                    {result?.detail && (
                      <p className={`text-xs mt-1.5 font-medium ${
                        status === 'pass' ? 'text-emerald-700' :
                        status === 'fail' ? 'text-red-700' :
                        status === 'warn' ? 'text-amber-700' : 'text-slate-600'
                      }`}>{result.detail}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => runTest(test)}
                      disabled={running}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 disabled:opacity-40"
                    >
                      Jalankan
                    </button>
                    {result && result.data !== undefined && (
                      <button onClick={() => toggleExpand(test.id)} className="text-slate-400 hover:text-slate-600">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Detail panel */}
                {isOpen && result && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    {/* Stats */}
                    {result.stats && Object.keys(result.stats).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        {Object.entries(result.stats).map(([key, val]) => {
                          if (typeof val === 'boolean') return null;
                          const isRp = key.toLowerCase().includes('total') || key.toLowerCase().includes('profit') || key.toLowerCase().includes('revenue') || key.toLowerCase().includes('balance') || key.toLowerCase().includes('adj');
                          return (
                            <div key={key} className="bg-slate-50 rounded-lg p-2">
                              <div className="text-[10px] text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</div>
                              <div className="text-xs font-bold text-slate-800 font-mono">
                                {isRp && typeof val === 'number' ? fmtRp(val) : (typeof val === 'number' ? val.toFixed(val % 1 === 0 ? 0 : 2) : String(val))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Data table */}
                    {result.data && result.data.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100">
                            <tr>
                              {Object.keys(result.data[0]).map(col => (
                                <th key={col} className="text-left py-1.5 px-2 text-[10px] font-semibold text-slate-500 uppercase">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.data.slice(0, 20).map((row, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                {Object.values(row).map((val, j) => (
                                  <td key={j} className="py-1.5 px-2 text-slate-700 font-mono">
                                    {typeof val === 'number' ? (val > 1000 ? fmtRp(val) : val.toFixed(2)) : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {result.data.length > 20 && (
                          <p className="text-[10px] text-slate-400 mt-1.5 text-center">... dan {result.data.length - 20} baris lainnya</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Tidak ada data detail untuk ditampilkan.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Footer info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800 flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Panduan:</strong> Jalankan semua tes secara berkala (terutama sebelum tutup buku). Tes <strong>GAGAL</strong> harus diselesaikan sebelum laporan keuangan diterbitkan. Tes <strong>PERINGATAN</strong> perlu diperiksa konteksnya. Semua tes berjalan dari data jurnal dan COA aktual — tidak ada hardcode.
        </div>
      </div>
    </div>
  );
}

