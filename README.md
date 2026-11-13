# Sistem Web Keuangan & Perpajakan Terintegrasi

Sistem Web Keuangan Perusahaan Indonesia modern yang dibangun menggunakan **React JS**, **Tailwind CSS**, dan **SUPABASE Database**, mengacu pada struktur Chart of Accounts (COA) akuntansi standar, manajemen rekanan/vendor, siklus pengajuan pembelian (Purchase Request & PO), serta kepatuhan pemotongan pajak penghasilan **PPh 21, PPh 22, PPh 23, PPh 25, dan PPh Final Pasal 4 Ayat (2)**.

---

## 🌟 Modul & Fitur Utama

### 1. Modul COA (Chart of Accounts / Bagan Akun Standar)
- **Struktur Hierarki Akun Standar Indonesia**:
  - `1-xxxx`: Aset Lancar, Kas, Bank BCA/Mandiri, Piutang, Persediaan, Pajak Dibayar di Muka (PPh 22, 23, 25, PPN Masukan), Aset Tetap.
  - `2-xxxx`: Kewajiban / Liabilitas (Hutang Usaha, Hutang Pajak PPh 21, 22, 23, 4(2), PPN Keluaran).
  - `3-xxxx`: Ekuitas (Modal Disetor, Laba Ditahan).
  - `4-xxxx`: Pendapatan (Pendapatan Jasa, Proyek, Lisensi).
  - `5-xxxx`: Beban Pokok Penjualan / HPP (Subkontraktor, Server Cloud AWS).
  - `6-xxxx`: Beban Operasional (Gaji, Sewa Gedung, Konsultan Pajak & Hukum, ATK, Renovasi).
- **Fitur**: Filter kategori tab, pencarian cepat, saldo normal (Debit/Credit), level akun, form tambah & edit akun, serta ekspor data ke format CSV.

### 2. Modul Master Supplier & Rekanan (Vendor)
- **Database Rekanan Lengkap**:
  - Tipe Entitas: **Badan Usaha** (PT / CV) vs **Orang Pribadi** (Tenaga Ahli / Konsultan).
  - Kepatuhan Pajak: Nomor NPWP / NIK 16 digit. Sistem otomatis mendeteksi vendor **Non-NPWP** yang terkena sanksi pemotongan pajak lebih tinggi (+20% PPh 21 atau +100% PPh 23/22).
  - Informasi Rekening Bank (BCA, Mandiri, BRI, BNI) untuk kemudahan transfer pembayaran.
  - Term of Payment (TOP: Cash, Net 7, Net 14, Net 30, Net 60).
  - Riwayat pengajuan pembelian & pemotongan pajak terkait untuk tiap rekanan.

### 3. Modul Pembelian & Pengajuan (Purchase Request & Order)
- **Siklus Pengadaan**:
  - Penomoran otomatis format `PR-YYYYMM-XXX`.
  - Pemilihan vendor yang langsung menarik status NPWP, bank, dan estimasi tipe pajak.
  - Multi-line item pengadaan: Deskripsi, Qty, Satuan, Harga Satuan, dan alokasi ke akun COA.
  - Perhitungan otomatis PPN (11% / 12% / Non-PPN).
  - Perhitungan otomatis pemotongan PPh (PPh 21, 22, 23, 4(2)) dengan deteksi sanksi non-NPWP.
  - Kalkulasi Net Payable (Nilai bersih yang ditransfer ke vendor).
  - **Alur Persetujuan (Workflow)**: `Draft` ➔ `Menunggu Persetujuan` ➔ `Disetujui (Approved)` ➔ `Lunas (Paid)` ➔ `Ditolak`.
  - **Cetak Faktur PO**: Pratinjau dokumen cetak resmi / simpan ke PDF.
  - **Otomatisasi Pajak**: Saat pengajuan yang mengandung PPh disetujui, sistem otomatis mencatatkannya ke Modul Pajak.

### 4. Modul Pajak PPh (PPh 21, 22, 23, 25, 4(2))
- **Rekapitulasi SPT Unifikasi & Bukti Potong**:
  - Filter berdasarkan Masa Pajak (Bulan) & Tahun Pajak.
  - Filter jenis pajak PPh 21, PPh 22, PPh 23, PPh 25, PPh 4(2).
  - Pencatatan ID Billing DJP dan NTPN (Nomor Transaksi Penerimaan Negara).
  - Pratinjau & Cetak Bukti Pemotongan Pajak Unifikasi (**e-Bupot Mock**).
  - Ekspor Rekap SPT Masa ke CSV.
- **Kalkulator & Simulator Pajak DJP**:
  - Simulator interaktif PPh 21 (TER PP 58/2023, Tenaga Ahli DPP 50% x Tarif Ps 17).
  - Simulator PPh 22 (Bendaharawan BUMN 1.5%, Industri 0.3%, Impor API 2.5% vs non-API 7.5%).
  - Simulator PPh 23 (Jasa 2%, Sewa Harta 2%, Dividen/Royalti 15%, tarif sanksi non-NPWP 4%).
  - Simulator Angsuran Bulanan PPh 25 Badan (Kredit Pajak Tahunan / 12).
  - Simulator PPh Final Pasal 4 Ayat 2 (Sewa Tanah/Bangunan 10%, Jasa Konstruksi 1.75% / 2.65% / 4%, UMKM 0.5%).
- **Jadwal Kepatuhan Pajak (Tax Calendar)**:
  - Tgl 10: Batas akhir setor PPh 21
  - Tgl 15: Batas akhir setor PPh 22, 23, 25, 4(2)
  - Tgl 20: Batas akhir lapor SPT Masa Unifikasi

---

## 🚀 Cara Menjalankan Proyek Secara Lokal

1. Buka folder proyek di terminal / PowerShell:
   ```bash
   cd "e:\IRVAN PC\PROJEK\PROJEK 12 NOV 2026"
   ```

2. Jalankan server pengembangan Vite:
   ```bash
   npm run dev
   ```

3. Buka URL yang muncul di browser Anda (biasanya `http://localhost:5173`).

---

## 🗄️ Menghubungkan ke SUPABASE

Sistem ini mendukung **Dual-Mode**:
1. **Mode Demo Lokal**: Langsung berfungsi 100% tanpa setup backend dengan mock data bawaan akuntansi Indonesia.
2. **Mode Supabase Live**: Tersinkronisasi secara real-time ke database cloud Supabase Anda.

### Langkah Setup Supabase:
1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka menu **SQL Editor** di dashboard Supabase Anda.
3. Buka file `supabase/schema.sql` di proyek ini, salin seluruh kodenya, dan klik **Run** di SQL Editor Supabase.
4. Masuk ke menu **Project Settings > API** di Supabase, lalu salin:
   - **Project URL**
   - **anon / public key**
5. Di aplikasi web, klik tombol **"Atur Supabase"** di pojok kanan atas navbar atau sidebar:
   - Tempelkan Project URL dan Anon Key.
   - Klik **Uji Koneksi**, lalu klik **Simpan & Terapkan**.
6. Atau masukkan ke file `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
   ```
