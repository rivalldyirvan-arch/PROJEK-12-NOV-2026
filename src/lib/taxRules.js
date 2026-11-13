/**
 * Aturan & Perhitungan Pajak Indonesia
 * PPh 21, PPh 22, PPh 23, PPh 25, PPh Final Pasal 4 Ayat (2)
 */

export const TAX_TYPES = [
  { id: 'PPh 21', name: 'PPh Pasal 21', description: 'Pajak atas penghasilan tenaga kerja / tenaga ahli / jasa perorangan' },
  { id: 'PPh 22', name: 'PPh Pasal 22', description: 'Pajak atas pembelian barang dari bendaharawan pemerintah / BUMN / impor' },
  { id: 'PPh 23', name: 'PPh Pasal 23', description: 'Pajak atas jasa manajemen, teknik, konsultan, sewa harta, dividen, royalti' },
  { id: 'PPh 25', name: 'PPh Pasal 25', description: 'Angsuran bulanan Pajak Penghasilan Badan / Orang Pribadi' },
  { id: 'PPh 4(2)', name: 'PPh Pasal 4 Ayat (2) Final', description: 'Pajak final sewa tanah/bangunan, jasa konstruksi, pengalihan hak' },
  { id: 'Non-PPh', name: 'Bebas PPh / Non-PPh', description: 'Transaksi tidak dikenakan pemotongan PPh' }
];

export const TAX_OBJECT_CODES = {
  'PPh 21': [
    { code: '21-100-01', name: 'Pegawai Tetap (Gaji / Upah Bulanan)', defaultRate: 5, requiresNPWP: true },
    { code: '21-100-02', name: 'Tenaga Ahli (Pengacara, Akuntan, Arsitek, Dokter, Konsultan, Notaris)', defaultRate: 2.5, requiresNPWP: true },
    { code: '21-100-03', name: 'Bukan Pegawai yang Menerima Imbalan Tidak Berkesinambungan', defaultRate: 2.5, requiresNPWP: true },
    { code: '21-100-04', name: 'Peserta Kegiatan (Honorarium, Hadiah, Uang Saku)', defaultRate: 5, requiresNPWP: true },
    { code: '21-100-05', name: 'Dewan Komisaris / Pengawas Tidak Merangkap Pegawai Tetap', defaultRate: 5, requiresNPWP: true }
  ],
  'PPh 22': [
    { code: '22-100-01', name: 'Pembelian Barang oleh Instansi Pemerintah / BUMN (1.5%)', defaultRate: 1.5, requiresNPWP: true },
    { code: '22-100-02', name: 'Penjualan Bahan Bakar Minyak & Gas (0.25% - 0.3%)', defaultRate: 0.25, requiresNPWP: true },
    { code: '22-100-03', name: 'Industri Tertentu (Semen, Kertas, Baja, Otomotif, Farmasi)', defaultRate: 0.3, requiresNPWP: true },
    { code: '22-100-04', name: 'Impor Barang dengan Angka Pengenal Importir / API (2.5%)', defaultRate: 2.5, requiresNPWP: true },
    { code: '22-100-05', name: 'Impor Barang Tanpa API (7.5%)', defaultRate: 7.5, requiresNPWP: true }
  ],
  'PPh 23': [
    { code: '24-104-01', name: 'Jasa Teknik, Manajemen, Konsultan, dan Jasa Lainnya (2%)', defaultRate: 2.0, requiresNPWP: true },
    { code: '24-100-01', name: 'Sewa dan Penghasilan Lain Sehubungan Penggunaan Harta selain Tanah/Bangunan (2%)', defaultRate: 2.0, requiresNPWP: true },
    { code: '24-101-01', name: 'Hadiah, Penghargaan, dan Bonus selain yang dipotong PPh 21 (15%)', defaultRate: 15.0, requiresNPWP: true },
    { code: '24-102-01', name: 'Bunga Pinjaman selain Bank (15%)', defaultRate: 15.0, requiresNPWP: true },
    { code: '24-103-01', name: 'Royalti atas Hak Cipta, Paten, Merek Dagang (15%)', defaultRate: 15.0, requiresNPWP: true },
    { code: '24-105-01', name: 'Dividen Penyertaan Modal Dalam Negeri WPOP (10% / PPh Final)', defaultRate: 10.0, requiresNPWP: true }
  ],
  'PPh 25': [
    { code: '25-100-01', name: 'Angsuran PPh Pasal 25 Wajib Pajak Badan Bulanan', defaultRate: 0, requiresNPWP: true, isFixedNominal: true },
    { code: '25-100-02', name: 'Angsuran PPh Pasal 25 Wajib Pajak Orang Pribadi Pengusaha Tertentu (0.75% Omzet)', defaultRate: 0.75, requiresNPWP: true }
  ],
  'PPh 4(2)': [
    { code: '28-401-01', name: 'Sewa Tanah dan/atau Bangunan (10%)', defaultRate: 10.0, requiresNPWP: true },
    { code: '28-402-01', name: 'Jasa Pelaksana Konstruksi Kualifikasi Kecil (1.75%)', defaultRate: 1.75, requiresNPWP: true },
    { code: '28-402-02', name: 'Jasa Pelaksana Konstruksi Kualifikasi Menengah/Besar (2.65%)', defaultRate: 2.65, requiresNPWP: true },
    { code: '28-402-03', name: 'Jasa Pelaksana Konstruksi Tanpa Sertifikat Kualifikasi (4.0%)', defaultRate: 4.0, requiresNPWP: true },
    { code: '28-402-04', name: 'Jasa Perencana / Pengawas Konstruksi Bersertifikat (2.65%)', defaultRate: 2.65, requiresNPWP: true },
    { code: '28-403-01', name: 'Pengalihan Hak atas Tanah dan/atau Bangunan (2.5%)', defaultRate: 2.5, requiresNPWP: true },
    { code: '28-405-01', name: 'Penghasilan Usaha dari Wajib Pajak Peredaran Bruto Tertentu / UMKM PP 55 (0.5%)', defaultRate: 0.5, requiresNPWP: true }
  ]
};

/**
 * Menghitung tarif efektif dan besaran pajak berdasarkan ketentuan NPWP
 * @param {string} taxType 
 * @param {number} baseRate 
 * @param {boolean} hasNpwp 
 * @param {number} dpp 
 */
export function calculateTax({ taxType, baseRate, hasNpwp = true, dpp = 0 }) {
  let effectiveRate = Number(baseRate) || 0;

  // Aturan kenaikan tarif bagi yang TIDAK memiliki NPWP:
  // - PPh 21: dikenakan tarif 20% lebih tinggi (tarif x 120%)
  // - PPh 22: dikenakan tarif 100% lebih tinggi (tarif x 200%)
  // - PPh 23: dikenakan tarif 100% lebih tinggi (tarif x 200%)
  // - PPh 4(2): tarif final tetap sama (tidak ada tarif sanksi non-NPWP, wajib dipotong tarif tetap)
  // - PPh 25: tidak berlaku pemotongan pihak ketiga
  if (!hasNpwp) {
    if (taxType === 'PPh 21') {
      effectiveRate = Number((effectiveRate * 1.2).toFixed(2));
    } else if (taxType === 'PPh 22' || taxType === 'PPh 23') {
      effectiveRate = Number((effectiveRate * 2.0).toFixed(2));
    }
  }

  const taxAmount = Math.round((dpp * effectiveRate) / 100);

  return {
    baseRate,
    effectiveRate,
    dpp,
    taxAmount,
    penaltyApplied: !hasNpwp && (taxType === 'PPh 21' || taxType === 'PPh 22' || taxType === 'PPh 23')
  };
}

/**
 * Format Rupiah
 */
export function formatRupiah(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

/**
 * Format Tanggal Indonesia
 */
export function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

