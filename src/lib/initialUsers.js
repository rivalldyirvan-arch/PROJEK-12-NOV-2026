export const DEFAULT_PERMISSIONS = [
  { id: 'manage_users', name: 'Kelola Pengguna', description: 'Membuat, mengubah, menonaktifkan, dan menghapus user' },
  { id: 'manage_roles', name: 'Kelola Role & Akses', description: 'Membuat dan mengatur izin peran (permissions)' },
  { id: 'manage_coa', name: 'Kelola Bagan Akun (COA)', description: 'Tambah, edit, dan hapus akun COA' },
  { id: 'manage_vendors', name: 'Kelola Rekanan / Vendor', description: 'Tambah, edit, dan hapus master vendor' },
  { id: 'create_purchase', name: 'Buat Pengajuan Pembelian', description: 'Membuat draft dan mengajukan pengadaan' },
  { id: 'approve_purchase', name: 'Approval Pembelian', description: 'Menyetujui atau menolak pengajuan pembelian' },
  { id: 'pay_purchase', name: 'Proses Bayar Lunas', description: 'Mencairkan pembayaran dan menandai lunas' },
  { id: 'manage_taxes', name: 'Kelola Pajak PPh', description: 'Rekap SPT, input ID Billing, dan NTPN setoran' },
  { id: 'view_reports', name: 'Lihat Laporan & Dashboard', description: 'Akses dashboard eksekutif dan statistik' }
];

export const INITIAL_ROLES = [
  {
    id: 'role-admin',
    name: 'Admin',
    description: 'Super Administrator dengan hak akses penuh termasuk kelola user & role',
    permissions: ['manage_users', 'manage_roles', 'manage_coa', 'manage_vendors', 'create_purchase', 'approve_purchase', 'pay_purchase', 'manage_taxes', 'view_reports'],
    isSystem: true
  },
  {
    id: 'role-finance',
    name: 'Finance & Accounting',
    description: 'Manajer / Staf Keuangan untuk kelola COA, Vendor, Approval & Pembayaran Lunas',
    permissions: ['manage_coa', 'manage_vendors', 'create_purchase', 'approve_purchase', 'pay_purchase', 'manage_taxes', 'view_reports'],
    isSystem: true
  },
  {
    id: 'role-tax',
    name: 'Tax Officer',
    description: 'Petugas Pajak khusus pemotongan PPh 21/22/23/25/4(2), ID Billing & NTPN',
    permissions: ['manage_vendors', 'manage_taxes', 'view_reports'],
    isSystem: true
  },
  {
    id: 'role-manager',
    name: 'Manager',
    description: 'Pimpinan unit untuk otorisasi dan persetujuan (approval) pengajuan pembelian',
    permissions: ['create_purchase', 'approve_purchase', 'view_reports'],
    isSystem: true
  },
  {
    id: 'role-staff',
    name: 'Staff / Requester',
    description: 'Staf operasional yang mengajukan pembelian dan pengadaan kebutuhan kantor',
    permissions: ['create_purchase', 'view_reports'],
    isSystem: true
  }
];

export const INITIAL_USERS = [
  {
    id: 'usr-1',
    email: 'admin@perusahaan.com',
    password: 'admin123',
    fullName: 'Irvan Kholik (Super Admin)',
    role: 'Admin',
    department: 'Executive & IT',
    phone: '0812-9988-7766',
    isActive: true,
    lastLogin: new Date().toISOString()
  },
  {
    id: 'usr-2',
    email: 'finance@perusahaan.com',
    password: 'finance123',
    fullName: 'Siti Rahmawati, SE., Ak.',
    role: 'Finance & Accounting',
    department: 'Finance & Accounting',
    phone: '0813-1122-3344',
    isActive: true,
    lastLogin: null
  },
  {
    id: 'usr-3',
    email: 'tax@perusahaan.com',
    password: 'tax123',
    fullName: 'Budi Santoso, BKP',
    role: 'Tax Officer',
    department: 'Taxation & Compliance',
    phone: '0815-5566-7788',
    isActive: true,
    lastLogin: null
  },
  {
    id: 'usr-4',
    email: 'manager@perusahaan.com',
    password: 'manager123',
    fullName: 'Irfan Hakim (Direktur Operasional)',
    role: 'Manager',
    department: 'Operations',
    phone: '0817-4433-2211',
    isActive: true,
    lastLogin: null
  },
  {
    id: 'usr-5',
    email: 'staff@perusahaan.com',
    password: 'staff123',
    fullName: 'Ahmad Fauzi (IT Staff)',
    role: 'Staff / Requester',
    department: 'IT & Infrastructure',
    phone: '0819-0011-2233',
    isActive: true,
    lastLogin: null
  }
];

