import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import SupabaseConfigModal from './components/SupabaseConfigModal';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import CoaModule from './pages/CoaModule';
import VendorModule from './pages/VendorModule';
import PurchaseModule from './pages/PurchaseModule';
import TaxModule from './pages/TaxModule';
import TaxCalculatorTab from './pages/TaxCalculatorTab';
import UserModule from './pages/UserModule';
import AssetModule from './pages/AssetModule';
import ProductModule from './pages/ProductModule';
import JournalModule from './pages/JournalModule';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './lib/authContext';
import { 
  fetchCOA, 
  fetchVendors, 
  fetchProducts,
  fetchPurchaseRequests, 
  fetchTaxRecords, 
  fetchFixedAssets,
  fetchAssetCategories,
  fetchJournalEntries,
  fetchAccountingPeriods,
  fetchJournalSequences,
  fetchCoaMappings,
  fetchAuditLogs,
  fetchAssetPostings,
  fetchAssetMovements,
  fetchAssetDisposals,
  testSupabaseConnection 
} from './lib/databaseService';

function MainAppContent() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSupabaseActive, setIsSupabaseActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Core Data Lists
  const [coaList, setCoaList] = useState([]);
  const [vendorList, setVendorList] = useState([]);
  const [productList, setProductList] = useState([]);
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [taxRecords, setTaxRecords] = useState([]);
  
  // Fixed Asset & Accounting Core Lists
  const [assetList, setAssetList] = useState([]);
  const [assetCategoryList, setAssetCategoryList] = useState([]);
  const [journalEntriesList, setJournalEntriesList] = useState([]);
  const [accountingPeriods, setAccountingPeriods] = useState([]);
  const [journalSequences, setJournalSequences] = useState([]);
  const [coaMappings, setCoaMappings] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [assetPostingsList, setAssetPostingsList] = useState([]);
  const [assetMovementsList, setAssetMovementsList] = useState([]);
  const [assetDisposalsList, setAssetDisposalsList] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Refresh and load all data (silent by default on refresh to prevent unmounting modals)
  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    try {
      const [coa, vendors, products, purchases, taxes, assets, categories, journals, periods, sequences, mappings, audits, postings, movements, disposals, conn] = await Promise.all([
        fetchCOA(),
        fetchVendors(),
        fetchProducts(),
        fetchPurchaseRequests(),
        fetchTaxRecords(),
        fetchFixedAssets(),
        fetchAssetCategories(),
        fetchJournalEntries(),
        fetchAccountingPeriods(),
        fetchJournalSequences(),
        fetchCoaMappings(),
        fetchAuditLogs(),
        fetchAssetPostings(),
        fetchAssetMovements(),
        fetchAssetDisposals(),
        testSupabaseConnection()
      ]);

      setCoaList(coa || []);
      setVendorList(vendors || []);
      setProductList(products || []);
      setPurchaseRequests(purchases || []);
      setTaxRecords(taxes || []);
      setAssetList(assets || []);
      setAssetCategoryList(categories || []);
      setJournalEntriesList(journals || []);
      setAccountingPeriods(periods || []);
      setJournalSequences(sequences || []);
      setCoaMappings(mappings || []);
      setAuditLogs(audits || []);
      setAssetPostingsList(postings || []);
      setAssetMovementsList(movements || []);
      setAssetDisposalsList(disposals || []);
      setIsSupabaseActive(conn.connected);
    } catch (err) {
      console.error('Error loading data:', err);
      showToast('Gagal memuat data keuangan', 'error');
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData(true);
    }
  }, [isAuthenticated, loadData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-400">Menyiapkan autentikasi...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show Login Page!
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Sidebar stats
  const stats = {
    coaCount: coaList.length,
    journalCount: journalEntriesList.filter(j => j.status === 'Posted').length,
    vendorCount: vendorList.length,
    productCount: productList.length,
    pendingPrCount: purchaseRequests.filter(p => p.status === 'Menunggu Persetujuan').length,
    taxRecordsCount: taxRecords.length,
    assetCount: assetList.length
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar 
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        isSupabaseActive={isSupabaseActive}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          stats={stats}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {loading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-slate-500">Memuat data sistem keuangan...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard 
                  coaList={coaList}
                  vendorList={vendorList}
                  purchaseRequests={purchaseRequests}
                  taxRecords={taxRecords}
                  onNavigate={setActiveTab}
                  onRefresh={loadData}
                  showToast={showToast}
                />
              )}

              {activeTab === 'coa' && (
                <CoaModule 
                  coaList={coaList}
                  journalEntries={journalEntriesList}
                  coaMappings={coaMappings}
                  onRefresh={loadData}
                  showToast={showToast}
                />
              )}

              {activeTab === 'journals' && (
                <JournalModule 
                  journalEntries={journalEntriesList}
                  coaList={coaList}
                  accountingPeriods={accountingPeriods}
                  journalSequences={journalSequences}
                  auditLogs={auditLogs}
                  onRefresh={loadData}
                  showToast={showToast}
                />
              )}

              {activeTab === 'vendors' && (
                <VendorModule 
                  vendorList={vendorList}
                  purchaseRequests={purchaseRequests}
                  taxRecords={taxRecords}
                  onRefresh={loadData}
                  showToast={showToast}
                />
              )}

              {activeTab === 'products' && (
                <ProductModule 
                  productList={productList}
                  coaList={coaList}
                  onRefresh={loadData}
                  showToast={showToast}
                />
              )}

              {activeTab === 'purchases' && (
                <PurchaseModule 
                  purchaseRequests={purchaseRequests}
                  vendorList={vendorList}
                  productList={productList}
                  coaList={coaList}
                  onRefresh={loadData}
                  showToast={showToast}
                />
              )}

              {activeTab === 'taxes' && (
                <TaxModule 
                  taxRecords={taxRecords}
                  vendorList={vendorList}
                  onRefresh={loadData}
                  showToast={showToast}
                />
              )}

              {activeTab === 'assets' && (
                <AssetModule 
                  assets={assetList}
                  categories={assetCategoryList}
                  journalEntries={journalEntriesList}
                  postings={assetPostingsList}
                  movements={assetMovementsList}
                  disposals={assetDisposalsList}
                  coaList={coaList}
                  vendorList={vendorList}
                  purchaseRequests={purchaseRequests}
                  onRefresh={loadData}
                  showToast={showToast}
                />
              )}

              {activeTab === 'tax-calculator' && (
                <TaxCalculatorTab />
              )}

              {activeTab === 'users' && (
                <UserModule showToast={showToast} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Supabase Config & SQL Script Modal */}
      <SupabaseConfigModal 
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onRefreshData={loadData}
      />

      {/* Toast Alert */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
