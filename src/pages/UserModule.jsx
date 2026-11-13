import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  X, 
  Lock, 
  Mail, 
  Phone, 
  Building, 
  UserCheck, 
  AlertTriangle,
  Key,
  Shield,
  Clock
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { fetchUsers, saveUser, deleteUser, fetchRoles, saveRole, deleteRole } from '../lib/databaseService';
import { DEFAULT_PERMISSIONS } from '../lib/initialUsers';
import { formatDateIndo } from '../lib/taxRules';

const DEPARTMENTS = [
  'Executive & IT',
  'Finance & Accounting',
  'Taxation & Compliance',
  'HR & GA',
  'Operations',
  'Marketing & Sales'
];

export default function UserModule({ showToast }) {
  const { currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'roles'

  // Data States
  const [userList, setUserList] = useState([]);
  const [roleList, setRoleList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('Semua');

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Staff / Requester',
    department: 'Operations',
    phone: '',
    isActive: true
  });

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });

  const loadAll = async () => {
    setLoading(true);
    const [u, r] = await Promise.all([fetchUsers(), fetchRoles()]);
    setUserList(u || []);
    setRoleList(r || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Filtered Users
  const filteredUsers = userList.filter((u) => {
    const matchesRole = selectedRoleFilter === 'Semua' || u.role === selectedRoleFilter;
    const matchesSearch = 
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  // User CRUD Handlers
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      fullName: '',
      email: '',
      password: '',
      role: roleList[0]?.name || 'Staff / Requester',
      department: 'Finance & Accounting',
      phone: '',
      isActive: true
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUserFormData({
      fullName: u.fullName,
      email: u.email,
      password: u.password,
      role: u.role,
      department: u.department || 'Finance & Accounting',
      phone: u.phone || '',
      isActive: u.isActive !== false
    });
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (u) => {
    if (u.id === currentUser?.id || u.email === currentUser?.email) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan!');
      return;
    }
    if (window.confirm(`Hapus pengguna "${u.fullName}" (${u.email})?`)) {
      await deleteUser(u.id);
      showToast?.(`Pengguna ${u.fullName} berhasil dihapus`, 'success');
      loadAll();
    }
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    if (!userFormData.fullName || !userFormData.email || !userFormData.password) {
      alert('Nama lengkap, email, dan kata sandi wajib diisi!');
      return;
    }

    const payload = {
      ...userFormData,
      id: editingUser ? editingUser.id : `usr-${Date.now()}`
    };

    await saveUser(payload);
    showToast?.(`Data pengguna ${payload.fullName} berhasil disimpan`, 'success');
    setIsUserModalOpen(false);
    loadAll();
  };

  // Role CRUD Handlers
  const handleOpenAddRole = () => {
    setEditingRole(null);
    setRoleFormData({
      name: '',
      description: '',
      permissions: ['create_purchase', 'view_reports']
    });
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (r) => {
    setEditingRole(r);
    setRoleFormData({
      name: r.name,
      description: r.description || '',
      permissions: r.permissions || []
    });
    setIsRoleModalOpen(true);
  };

  const handleDeleteRole = async (r) => {
    if (r.isSystem || r.name === 'Admin') {
      alert('Role sistem bawaan tidak dapat dihapus!');
      return;
    }
    if (window.confirm(`Hapus role "${r.name}"? Pengguna dengan role ini perlu dialihkan.`)) {
      await deleteRole(r.id);
      showToast?.(`Role ${r.name} berhasil dihapus`, 'success');
      loadAll();
    }
  };

  const handleTogglePermission = (permId) => {
    const perms = [...roleFormData.permissions];
    const idx = perms.indexOf(permId);
    if (idx >= 0) {
      perms.splice(idx, 1);
    } else {
      perms.push(permId);
    }
    setRoleFormData({ ...roleFormData, permissions: perms });
  };

  const handleSubmitRole = async (e) => {
    e.preventDefault();
    if (!roleFormData.name) {
      alert('Nama Role wajib diisi!');
      return;
    }

    const payload = {
      ...roleFormData,
      id: editingRole ? editingRole.id : `role-${Date.now()}`,
      isSystem: editingRole ? editingRole.isSystem : false
    };

    await saveRole(payload);
    showToast?.(`Role ${payload.name} berhasil disimpan`, 'success');
    setIsRoleModalOpen(false);
    loadAll();
  };

  // Access check
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto my-12 shadow-sm space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Akses Dibatasi (Hanya Administrator)</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Modul Master User dan Manajemen Role hanya dapat diakses dan dikelola oleh akun dengan role <strong>Admin</strong>. Anda saat ini login sebagai <strong>{currentUser?.role || 'User'}</strong>.
        </p>
      </div>
    );
  }

  const roleColors = {
    'Admin': 'bg-purple-100 text-purple-800 border-purple-200',
    'Finance & Accounting': 'bg-blue-100 text-blue-800 border-blue-200',
    'Tax Officer': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Manager': 'bg-amber-100 text-amber-800 border-amber-200',
    'Staff / Requester': 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">5. Modul Master User & Manajemen Role (RBAC)</h2>
            <p className="text-xs text-slate-500">Kelola otorisasi akun pengguna, role jabatan, dan pembatasan izin hak akses sistem</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'users' ? (
            <button
              onClick={handleOpenAddUser}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tambah User Baru
            </button>
          ) : (
            <button
              onClick={handleOpenAddRole}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tambah Role Baru
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Pengguna ({userList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Kelola Role & Hak Akses ({roleList.length})</span>
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {['Semua', ...roleList.map(r => r.name)].map((rName) => (
                <button
                  key={rName}
                  onClick={() => setSelectedRoleFilter(rName)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedRoleFilter === rName
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {rName}
                </button>
              ))}
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama, email, departemen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Nama Pengguna</th>
                    <th className="py-3 px-4">Email Login</th>
                    <th className="py-3 px-4">Role & Hak</th>
                    <th className="py-3 px-4">Departemen</th>
                    <th className="py-3 px-4">Kontak Telepon</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Login Terakhir</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Tidak ada user yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isCurrent = u.id === currentUser?.id || u.email === currentUser?.email;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                                {u.fullName.slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900">{u.fullName}</span>
                                {isCurrent && (
                                  <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                    Akun Anda
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {u.email}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleColors[u.role] || 'bg-slate-100 text-slate-700'}`}>
                              {u.role}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {u.department || '-'}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {u.phone || '-'}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {u.isActive !== false ? 'Aktif' : 'Dinonaktifkan'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                            {u.lastLogin ? formatDateIndo(u.lastLogin) : 'Belum pernah'}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Edit Pengguna & Role"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={isCurrent}
                                className={`p-1.5 rounded-lg transition ${
                                  isCurrent 
                                    ? 'text-slate-300 cursor-not-allowed' 
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title={isCurrent ? 'Tidak bisa menghapus akun yang sedang aktif' : 'Hapus Pengguna'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roleList.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900">{r.name}</span>
                    {r.isSystem && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                        Sistem Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{r.description || 'Tidak ada deskripsi'}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Hak Akses Terdaftar ({r.permissions?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {r.permissions && r.permissions.map(pId => {
                        const permDef = DEFAULT_PERMISSIONS.find(p => p.id === pId);
                        return (
                          <span key={pId} className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                            ✓ {permDef ? permDef.name : pId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {userList.filter(u => u.role === r.name).length} Pengguna Terkait
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditRole(r)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      title="Atur Hak Akses Role"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {!r.isSystem && r.name !== 'Admin' && (
                      <button
                        onClick={() => handleDeleteRole(r)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Add / Edit User */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                {editingUser ? `Edit Pengguna: ${editingUser.fullName}` : 'Tambah Pengguna Baru'}
              </h3>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dimas Setiawan, SE"
                  value={userFormData.fullName}
                  onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Login *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nama@perusahaan.com"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kata Sandi (Password) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Minimal 6 karakter"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Role / Peran *
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                  >
                    {roleList.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Departemen
                  </label>
                  <select
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="0812-xxxx-xxxx"
                  value={userFormData.phone}
                  onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userFormData.isActive}
                    onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Akun Aktif (Dapat Login ke Sistem)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Role */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                {editingRole ? `Edit Role: ${editingRole.name}` : 'Tambah Role Baru'}
              </h3>
              <button 
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRole} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Role *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Auditor Internal"
                  value={roleFormData.name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Deskripsi Tanggung Jawab
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan cakupan pekerjaan role..."
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Permissions Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Daftar Hak Akses (Permissions):
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto p-1">
                  {DEFAULT_PERMISSIONS.map(p => {
                    const isChecked = roleFormData.permissions.includes(p.id);

                    return (
                      <label 
                        key={p.id}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                          isChecked 
                            ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900' 
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(p.id)}
                          className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                        />
                        <div>
                          <div className="text-xs font-bold">{p.name}</div>
                          <div className="text-[11px] text-slate-500">{p.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs"
                >
                  Simpan Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

