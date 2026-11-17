/**
 * Engine Perhitungan Penyusutan Aset Tetap
 * Sesuai Standar Akuntansi Keuangan (Komersial) & Ketentuan Pajak UU PPh Indonesia (Fiskal)
 */

export const TAX_ASSET_GROUPS = {
  'Kelompok 1': {
    name: 'Kelompok 1 (Bukan Bangunan)',
    usefulLifeYears: 4,
    straightLineRate: 25.0, // 25% per tahun
    decliningBalanceRate: 50.0, // 50% per tahun
    description: 'Komputer, printer, scanner, ponsel, mebel kayu/rotan ringan, perkakas bengkel'
  },
  'Kelompok 2': {
    name: 'Kelompok 2 (Bukan Bangunan)',
    usefulLifeYears: 8,
    straightLineRate: 12.5, // 12.5% per tahun
    decliningBalanceRate: 25.0, // 25% per tahun
    description: 'Mobil operasional, truk ringan, motor, mesin kantor, pendingin AC, mebel logam'
  },
  'Kelompok 3': {
    name: 'Kelompok 3 (Bukan Bangunan)',
    usefulLifeYears: 16,
    straightLineRate: 6.25, // 6.25% per tahun
    decliningBalanceRate: 12.5, // 12.5% per tahun
    description: 'Mesin manufaktur, mesin tekstil, kapal/perahu kecil'
  },
  'Kelompok 4': {
    name: 'Kelompok 4 (Bukan Bangunan)',
    usefulLifeYears: 20,
    straightLineRate: 5.0, // 5% per tahun
    decliningBalanceRate: 10.0, // 10% per tahun
    description: 'Alat berat konstruksi, lokomotif, galangan kapal'
  },
  'Bangunan Permanen': {
    name: 'Bangunan Permanen',
    usefulLifeYears: 20,
    straightLineRate: 5.0, // 5% per tahun (hanya Garis Lurus)
    decliningBalanceRate: 0,
    description: 'Gedung kantor, pabrik permanen, ruko bertingkat'
  },
  'Bangunan Tidak Permanen': {
    name: 'Bangunan Tidak Permanen',
    usefulLifeYears: 10,
    straightLineRate: 10.0, // 10% per tahun (hanya Garis Lurus)
    decliningBalanceRate: 0,
    description: 'Gudang darurat, barak kayu, bangunan sementara'
  }
};

export const INITIAL_ASSET_CATEGORIES = [
  {
    id: 'cat-komputer',
    code: 'KOMP',
    name: 'Komputer & Peralatan IT',
    assetAccountCode: '1205',
    accumDeprecAccountCode: '1281',
    deprecExpenseAccountCode: '6201',
    defaultDeprecMethod: 'Garis Lurus',
    defaultUsefulLifeYears: 4,
    defaultSalvageValuePct: 0,
    taxGroup: 'Kelompok 1',
    isActive: true
  },
  {
    id: 'cat-kendaraan',
    code: 'KDRN',
    name: 'Kendaraan Operasional',
    assetAccountCode: '1202',
    accumDeprecAccountCode: '1282',
    deprecExpenseAccountCode: '6202',
    defaultDeprecMethod: 'Garis Lurus',
    defaultUsefulLifeYears: 8,
    defaultSalvageValuePct: 10,
    taxGroup: 'Kelompok 2',
    isActive: true
  },
  {
    id: 'cat-bangunan',
    code: 'BGNN',
    name: 'Bangunan & Gedung Kantor',
    assetAccountCode: '1203',
    accumDeprecAccountCode: '1283',
    deprecExpenseAccountCode: '6203',
    defaultDeprecMethod: 'Garis Lurus',
    defaultUsefulLifeYears: 20,
    defaultSalvageValuePct: 0,
    taxGroup: 'Bangunan Permanen',
    isActive: true
  },
  {
    id: 'cat-perabot',
    code: 'PRBT',
    name: 'Peralatan & Perabot Kantor',
    assetAccountCode: '1206',
    accumDeprecAccountCode: '1284',
    deprecExpenseAccountCode: '6204',
    defaultDeprecMethod: 'Garis Lurus',
    defaultUsefulLifeYears: 4,
    defaultSalvageValuePct: 5,
    taxGroup: 'Kelompok 1',
    isActive: true
  },
  {
    id: 'cat-mesin',
    code: 'MESN',
    name: 'Mesin & Peralatan Pabrik',
    assetAccountCode: '1204',
    accumDeprecAccountCode: '1285',
    deprecExpenseAccountCode: '6205',
    defaultDeprecMethod: 'Garis Lurus',
    defaultUsefulLifeYears: 8,
    defaultSalvageValuePct: 0,
    taxGroup: 'Kelompok 2',
    isActive: true
  }
];

/**
 * Hitung Total Harga Perolehan (Kapitalisasi SAK)
 */
export function calculateAcquisitionCost({
  purchasePrice = 0,
  deliveryCost = 0,
  installationCost = 0,
  otherCost = 0,
  discount = 0,
  nonCreditableVat = 0
}) {
  const p = Number(purchasePrice) || 0;
  const d = Number(deliveryCost) || 0;
  const i = Number(installationCost) || 0;
  const o = Number(otherCost) || 0;
  const disc = Number(discount) || 0;
  const vat = Number(nonCreditableVat) || 0;

  // Rumus: Harga Beli + Pengiriman + Instalasi + Biaya Lain - Diskon + PPN non-kredit
  const total = Math.max(0, p + d + i + o - disc + vat);
  return total;
}

/**
 * Hitung Jadwal Penyusutan Komersial (Straight Line, Declining Balance, Units of Production)
 */
export function calculateCommercialDepreciationSchedule({
  acquisitionCost,
  salvageValue = 0,
  usefulLifeYears = 4,
  inServiceDate,
  method = 'Garis Lurus',
  decliningRatePct = null,
  totalEstimatedUnits = 0,
  actualUnitsPerMonth = 0
}) {
  const cost = Number(acquisitionCost) || 0;
  const salvage = Number(salvageValue) || 0;
  const years = Number(usefulLifeYears) || 4;
  const totalMonths = Math.max(1, Math.round(years * 12));
  const depreciableAmount = Math.max(0, cost - salvage);

  const startDate = inServiceDate ? new Date(inServiceDate) : new Date();
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1; // 1-12

  const monthlySchedules = [];
  let currentBookValue = cost;
  let runningAccumulated = 0;

  if (method === 'Garis Lurus') {
    // Garis Lurus: Beban bulanan tetap
    const monthlyRate = depreciableAmount / totalMonths;

    for (let m = 0; m < totalMonths; m++) {
      const pMonth = ((startMonth - 1 + m) % 12) + 1;
      const pYear = startYear + Math.floor((startMonth - 1 + m) / 12);
      const openBV = currentBookValue;

      // Beban bulanan tidak boleh membuat nilai buku turun di bawah nilai residu
      let depAmount = Math.min(monthlyRate, currentBookValue - salvage);
      depAmount = Math.max(0, Math.round(depAmount));

      // Bulan terakhir: selesaikan pembulatan
      if (m === totalMonths - 1) {
        depAmount = Math.max(0, currentBookValue - salvage);
      }

      runningAccumulated += depAmount;
      currentBookValue = Math.max(salvage, cost - runningAccumulated);

      monthlySchedules.push({
        periodIndex: m + 1,
        periodYear: pYear,
        periodMonth: pMonth,
        periodLabel: `${pYear}-${String(pMonth).padStart(2, '0')}`,
        openingBookValue: openBV,
        depreciationAmount: depAmount,
        accumulatedDepreciation: runningAccumulated,
        closingBookValue: currentBookValue
      });

      if (currentBookValue <= salvage) break;
    }
  } else if (method === 'Saldo Menurun' || method === 'Saldo Menurun Ganda') {
    // Saldo Menurun: Tarif tahunan dibagi 12
    const defaultRate = method === 'Saldo Menurun Ganda' ? (2 / years) * 100 : (1 / years) * 100;
    const annualRate = Number(decliningRatePct) > 0 ? Number(decliningRatePct) : defaultRate;
    const monthlyFactor = (annualRate / 100) / 12;

    for (let m = 0; m < totalMonths; m++) {
      const pMonth = ((startMonth - 1 + m) % 12) + 1;
      const pYear = startYear + Math.floor((startMonth - 1 + m) / 12);
      const openBV = currentBookValue;

      let depAmount = openBV * monthlyFactor;
      if (currentBookValue - depAmount < salvage) {
        depAmount = Math.max(0, currentBookValue - salvage);
      }
      depAmount = Math.round(depAmount);

      runningAccumulated += depAmount;
      currentBookValue = Math.max(salvage, cost - runningAccumulated);

      monthlySchedules.push({
        periodIndex: m + 1,
        periodYear: pYear,
        periodMonth: pMonth,
        periodLabel: `${pYear}-${String(pMonth).padStart(2, '0')}`,
        openingBookValue: openBV,
        depreciationAmount: depAmount,
        accumulatedDepreciation: runningAccumulated,
        closingBookValue: currentBookValue
      });

      if (currentBookValue <= salvage) break;
    }
  } else if (method === 'Unit Produksi') {
    // Unit Produksi: Tarif per unit = (Cost - Salvage) / Total Estimasi Unit
    const estUnits = Number(totalEstimatedUnits) > 0 ? Number(totalEstimatedUnits) : 10000;
    const ratePerUnit = depreciableAmount / estUnits;
    const units = Number(actualUnitsPerMonth) > 0 ? Number(actualUnitsPerMonth) : (estUnits / totalMonths);

    for (let m = 0; m < totalMonths; m++) {
      const pMonth = ((startMonth - 1 + m) % 12) + 1;
      const pYear = startYear + Math.floor((startMonth - 1 + m) / 12);
      const openBV = currentBookValue;

      let depAmount = Math.min(units * ratePerUnit, currentBookValue - salvage);
      depAmount = Math.round(depAmount);

      runningAccumulated += depAmount;
      currentBookValue = Math.max(salvage, cost - runningAccumulated);

      monthlySchedules.push({
        periodIndex: m + 1,
        periodYear: pYear,
        periodMonth: pMonth,
        periodLabel: `${pYear}-${String(pMonth).padStart(2, '0')}`,
        openingBookValue: openBV,
        depreciationAmount: depAmount,
        accumulatedDepreciation: runningAccumulated,
        closingBookValue: currentBookValue
      });

      if (currentBookValue <= salvage) break;
    }
  }

  // Ringkasan Tahunan
  const yearlySchedules = [];
  const yearsMap = {};
  monthlySchedules.forEach(item => {
    if (!yearsMap[item.periodYear]) {
      yearsMap[item.periodYear] = {
        periodYear: item.periodYear,
        openingBookValue: item.openingBookValue,
        depreciationAmount: 0,
        accumulatedDepreciation: 0,
        closingBookValue: 0
      };
    }
    yearsMap[item.periodYear].depreciationAmount += item.depreciationAmount;
    yearsMap[item.periodYear].accumulatedDepreciation = item.accumulatedDepreciation;
    yearsMap[item.periodYear].closingBookValue = item.closingBookValue;
  });

  return {
    monthlySchedules,
    yearlySchedules: Object.values(yearsMap),
    monthlyDepreciationEstimate: monthlySchedules[0]?.depreciationAmount || 0,
    annualDepreciationEstimate: (monthlySchedules[0]?.depreciationAmount || 0) * 12
  };
}

/**
 * Hitung Penyusutan Fiskal Sesuai UU PPh Indonesia
 */
export function calculateTaxDepreciationSchedule({
  acquisitionCost,
  taxGroup = 'Kelompok 1',
  taxMethod = 'Garis Lurus', // 'Garis Lurus' | 'Saldo Menurun'
  inServiceDate
}) {
  const cost = Number(acquisitionCost) || 0;
  const groupDef = TAX_ASSET_GROUPS[taxGroup] || TAX_ASSET_GROUPS['Kelompok 1'];
  const years = groupDef.usefulLifeYears;
  const isBuilding = taxGroup.includes('Bangunan');

  // Menurut UU PPh, bangunan HANYA boleh metode Garis Lurus
  const effectiveMethod = isBuilding ? 'Garis Lurus' : taxMethod;
  const annualRate = effectiveMethod === 'Saldo Menurun' 
    ? groupDef.decliningBalanceRate 
    : groupDef.straightLineRate;

  const totalMonths = years * 12;
  const startDate = inServiceDate ? new Date(inServiceDate) : new Date();
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;

  const monthlySchedules = [];
  let currentBookValue = cost;
  let runningAccumulated = 0;

  if (effectiveMethod === 'Garis Lurus') {
    // Tarif Garis Lurus UU PPh: Tarif tahunan diterapkan atas Harga Perolehan (Nilai Residu Fiskal diabaikan / Rp 0)
    const annualDep = cost * (annualRate / 100);
    const monthlyDep = Math.round(annualDep / 12);

    for (let m = 0; m < totalMonths; m++) {
      const pMonth = ((startMonth - 1 + m) % 12) + 1;
      const pYear = startYear + Math.floor((startMonth - 1 + m) / 12);
      const openBV = currentBookValue;

      let dep = Math.min(monthlyDep, currentBookValue);
      if (m === totalMonths - 1) {
        dep = currentBookValue; // Bulan terakhir susutkan seluruh sisa
      }

      runningAccumulated += dep;
      currentBookValue = Math.max(0, cost - runningAccumulated);

      monthlySchedules.push({
        periodIndex: m + 1,
        periodYear: pYear,
        periodMonth: pMonth,
        periodLabel: `${pYear}-${String(pMonth).padStart(2, '0')}`,
        openingBookValue: openBV,
        depreciationAmount: dep,
        accumulatedDepreciation: runningAccumulated,
        closingBookValue: currentBookValue
      });

      if (currentBookValue <= 0) break;
    }
  } else {
    // Saldo Menurun UU PPh: Tahun 1 s.d (N-1) tarif x Nilai Buku Awal Tahun. Tahun terakhir langsung habis disusutkan.
    const monthlyRate = (annualRate / 100) / 12;

    for (let m = 0; m < totalMonths; m++) {
      const pMonth = ((startMonth - 1 + m) % 12) + 1;
      const pYear = startYear + Math.floor((startMonth - 1 + m) / 12);
      const openBV = currentBookValue;

      let dep = Math.round(openBV * monthlyRate);
      // Tahun terakhir (bulan terakhir tahun ke-N), seluruh sisa nilai buku disusutkan sekaligus
      if (m >= totalMonths - 12 && m === totalMonths - 1) {
        dep = currentBookValue;
      }

      runningAccumulated += dep;
      currentBookValue = Math.max(0, cost - runningAccumulated);

      monthlySchedules.push({
        periodIndex: m + 1,
        periodYear: pYear,
        periodMonth: pMonth,
        periodLabel: `${pYear}-${String(pMonth).padStart(2, '0')}`,
        openingBookValue: openBV,
        depreciationAmount: dep,
        accumulatedDepreciation: runningAccumulated,
        closingBookValue: currentBookValue
      });

      if (currentBookValue <= 0) break;
    }
  }

  // Ringkasan Tahunan Fiskal
  const yearlySchedules = [];
  const yearsMap = {};
  monthlySchedules.forEach(item => {
    if (!yearsMap[item.periodYear]) {
      yearsMap[item.periodYear] = {
        periodYear: item.periodYear,
        openingBookValue: item.openingBookValue,
        depreciationAmount: 0,
        accumulatedDepreciation: 0,
        closingBookValue: 0
      };
    }
    yearsMap[item.periodYear].depreciationAmount += item.depreciationAmount;
    yearsMap[item.periodYear].accumulatedDepreciation = item.accumulatedDepreciation;
    yearsMap[item.periodYear].closingBookValue = item.closingBookValue;
  });

  return {
    groupName: groupDef.name,
    usefulLifeYears: years,
    annualRate,
    effectiveMethod,
    monthlySchedules,
    yearlySchedules: Object.values(yearsMap),
    monthlyDepreciationEstimate: monthlySchedules[0]?.depreciationAmount || 0,
    annualDepreciationEstimate: (monthlySchedules[0]?.depreciationAmount || 0) * 12
  };
}

/**
 * Matriks Rekonsiliasi Komersial vs Fiskal per Tahun
 */
export function calculateDepreciationReconciliation(commercialSchedule, taxSchedule) {
  const commYears = commercialSchedule?.yearlySchedules || [];
  const taxYears = taxSchedule?.yearlySchedules || [];

  const allYears = Array.from(new Set([...commYears.map(y => y.periodYear), ...taxYears.map(y => y.periodYear)])).sort();

  return allYears.map(year => {
    const c = commYears.find(y => y.periodYear === year) || { depreciationAmount: 0, closingBookValue: 0 };
    const t = taxYears.find(y => y.periodYear === year) || { depreciationAmount: 0, closingBookValue: 0 };
    const diff = c.depreciationAmount - t.depreciationAmount;

    return {
      year,
      commercialDepreciation: c.depreciationAmount,
      taxDepreciation: t.depreciationAmount,
      difference: diff,
      // Jika Komersial > Fiskal = Koreksi Positif; Jika Komersial < Fiskal = Koreksi Negatif
      correctionType: diff > 0 ? 'Koreksi Fiskal Positif' : (diff < 0 ? 'Koreksi Fiskal Negatif' : 'Nihil'),
      commercialEndingBookValue: c.closingBookValue,
      taxEndingBookValue: t.closingBookValue
    };
  });
}

