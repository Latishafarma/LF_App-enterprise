import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  Shield,
  Phone,
  Building,
  X,
  Save,
  Search,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react';
import {
  Staff,
  StaffRole,
  Branch,
  SYSTEM_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS
} from '../types';

const AVAILABLE_ROLES: StaffRole[] = [
  'Super Admin / APJ',
  'Dokter',
  'Apoteker',
  'Perawat / Bidan',
  'Perawat / Nakes Lapangan',
  'Kasir & Front Office'
];

interface SetupStaffViewProps {
  staffList: Staff[];
  branches: Branch[];
  onAddStaff: (staff: Staff) => void;
  onUpdateStaff?: (staff: Staff) => void;
  onDeleteStaff: (id: string) => void;
  rolePermissions?: Record<string, string[]>;
  onUpdateRolePermissions?: (updated: Record<string, string[]>) => void;
}

export const SetupStaffView: React.FC<SetupStaffViewProps> = ({
  staffList,
  branches,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  rolePermissions = DEFAULT_ROLE_PERMISSIONS
}) => {
  const [form, setForm] = useState({
    name: '',
    role: 'Apoteker' as StaffRole,
    roles: ['Apoteker'] as StaffRole[],
    phone: '',
    branchId: branches[0]?.id || 'BR-01'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  const getStaffRoles = (st: Staff): StaffRole[] => {
    if (st.roles && st.roles.length > 0) return st.roles;
    return [st.role];
  };

  const getStaffPermissions = (st: Staff): string[] => {
    const roles = getStaffRoles(st);
    if (roles.includes('Super Admin / APJ')) {
      return SYSTEM_PERMISSIONS.map((p) => p.id);
    }
    if (st.permissions && st.permissions.length > 0) {
      return st.permissions.filter((id) => id !== 'sys-profil-fasilitas');
    }
    const merged = new Set<string>();
    roles.forEach((r) => {
      (rolePermissions[r] || DEFAULT_ROLE_PERMISSIONS[r] || []).forEach((id) => {
        if (id !== 'sys-profil-fasilitas') merged.add(id);
      });
    });
    return Array.from(merged);
  };

  const handleToggleRoleCheckbox = (st: Staff, targetRole: StaffRole) => {
    if (!onUpdateStaff) return;
    const currentRoles = getStaffRoles(st);
    const exists = currentRoles.includes(targetRole);
    let nextRoles: StaffRole[];
    if (exists) {
      if (currentRoles.length <= 1) return;
      nextRoles = currentRoles.filter((r) => r !== targetRole);
    } else {
      nextRoles = [...currentRoles, targetRole];
    }
    const primaryRole = nextRoles.includes('Super Admin / APJ')
      ? 'Super Admin / APJ'
      : nextRoles[0];

    const mergedPerms = new Set<string>(st.permissions || []);
    (rolePermissions[targetRole] || DEFAULT_ROLE_PERMISSIONS[targetRole] || []).forEach((p) => {
      if (!exists) mergedPerms.add(p);
    });
    if (!nextRoles.includes('Super Admin / APJ')) {
      mergedPerms.delete('sys-profil-fasilitas');
    } else {
      SYSTEM_PERMISSIONS.forEach((p) => mergedPerms.add(p.id));
    }

    onUpdateStaff({
      ...st,
      role: primaryRole,
      roles: nextRoles,
      permissions: Array.from(mergedPerms)
    });
  };

  const handleToggleStaffPerm = (st: Staff, permId: string) => {
    if (!onUpdateStaff) return;
    const roles = getStaffRoles(st);
    const hasSuperAdmin = roles.includes('Super Admin / APJ');
    if (permId === 'sys-profil-fasilitas' && !hasSuperAdmin) return;
    const currentPerms = getStaffPermissions(st);
    const exists = currentPerms.includes(permId);
    const nextPerms = exists
      ? currentPerms.filter((id) => id !== permId)
      : [...currentPerms, permId];
    onUpdateStaff({
      ...st,
      permissions: nextPerms
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;

    const roles: StaffRole[] = form.roles.length > 0 ? form.roles : [form.role];
    const primaryRole: StaffRole = roles.includes('Super Admin / APJ')
      ? 'Super Admin / APJ'
      : roles[0];

    const defaultPerms = new Set<string>();
    roles.forEach((r) => {
      (rolePermissions[r] || DEFAULT_ROLE_PERMISSIONS[r] || []).forEach((id) =>
        defaultPerms.add(id)
      );
    });
    if (!roles.includes('Super Admin / APJ')) {
      defaultPerms.delete('sys-profil-fasilitas');
    }

    const newStaff: Staff = {
      id: `STF-${String(staffList.length + 1).padStart(3, '0')}`,
      name: form.name,
      role: primaryRole,
      roles,
      permissions: Array.from(defaultPerms),
      phone: form.phone,
      branchId: form.branchId,
      status: 'Aktif'
    };

    onAddStaff(newStaff);
    setForm({
      name: '',
      role: 'Apoteker',
      roles: ['Apoteker'],
      phone: '',
      branchId: branches[0]?.id || 'BR-01'
    });
  };

  const handleOpenEdit = (staff: Staff) => {
    const role = (staff.role === 'Perawat / Nakes Lapangan' ? 'Perawat / Bidan' : staff.role) as Staff['role'];
    setEditingStaff({ ...staff, role, roles: getStaffRoles(staff) });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    if (onUpdateStaff) {
      onUpdateStaff(editingStaff);
    }
    setEditingStaff(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data pegawai "${name}"?`)) {
      onDeleteStaff(id);
    }
  };

  const filteredStaff = staffList.filter((st) => {
    const term = searchTerm.toLowerCase();
    const branch = branches.find((b) => b.id === st.branchId);
    return (
      st.name.toLowerCase().includes(term) ||
      st.id.toLowerCase().includes(term) ||
      st.phone.toLowerCase().includes(term) ||
      st.role.toLowerCase().includes(term) ||
      (branch?.name && branch.name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-5 text-xs">
      {/* Add Staff Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-sky-600" />
            Registrasi Pegawai (User) &amp; Hak Akses Peran
          </h3>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[10px] flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-700" /> Catatan: Halaman Pengaturan Sistem &amp; Profil Fasilitas hanya boleh diakses oleh Super Admin / APJ
          </span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Nama Lengkap &amp; Gelar *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: dr. Pratama, Sp.PD"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                No. Handphone / WA *
              </label>
              <input
                type="text"
                required
                placeholder="0812-..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold bg-white outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Penempatan Cabang
              </label>
              <select
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-sky-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Pegawai</span>
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
              Pilih Peran User (Checkbox Hak Akses Jabatan) *
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_ROLES.map((r) => {
                const isChecked = form.roles.includes(r);
                return (
                  <label
                    key={r}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer select-none transition ${
                      isChecked
                        ? 'bg-sky-600 text-white border-sky-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const exists = form.roles.includes(r);
                        const nextRoles = exists
                          ? form.roles.length > 1
                            ? form.roles.filter((item) => item !== r)
                            : form.roles
                          : [...form.roles, r];
                        setForm({ ...form, roles: nextRoles, role: nextRoles[0] });
                      }}
                      className="w-3.5 h-3.5 accent-sky-600 rounded cursor-pointer"
                    />
                    <span>{r}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </form>
      </div>

      {/* Staff Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search header bar */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari ID, nama pegawai, jabatan, atau cabang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium text-xs focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <span className="text-[11px] text-slate-500 font-semibold">
            Total Terdaftar: <strong className="text-slate-800">{filteredStaff.length}</strong> Pegawai
          </span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-600 text-[11px]">
            <tr>
              <th className="p-3 w-24">ID Pegawai</th>
              <th className="p-3">Nama Pegawai &amp; Gelar</th>
              <th className="p-3">Checkbox Peran (Role) &amp; Hak Akses</th>
              <th className="p-3">Kontak WA</th>
              <th className="p-3">Penempatan Cabang</th>
              <th className="p-3 text-center w-24">Status</th>
              <th className="p-3 text-center w-32">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                  Tidak ada data pegawai yang sesuai dengan pencarian.
                </td>
              </tr>
            ) : (
              filteredStaff.map((st) => {
                const branch = branches.find((b) => b.id === st.branchId);
                const activeRoles = getStaffRoles(st);
                const activePerms = getStaffPermissions(st);
                const isExpanded = expandedStaffId === st.id;
                const hasSuperAdmin = activeRoles.includes('Super Admin / APJ');

                return (
                  <React.Fragment key={st.id}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-sky-700">{st.id}</td>
                      <td className="p-3 font-bold text-slate-900">{st.name}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {AVAILABLE_ROLES.map((roleOpt) => {
                            const checked = activeRoles.includes(roleOpt);
                            return (
                              <label
                                key={roleOpt}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer select-none transition ${
                                  checked
                                    ? 'bg-sky-50 border-sky-400 text-sky-900'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleToggleRoleCheckbox(st, roleOpt)}
                                  className="w-3 h-3 accent-sky-600 rounded cursor-pointer"
                                />
                                <span>{roleOpt}</span>
                              </label>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{st.phone}</td>
                      <td className="p-3 text-slate-700 font-medium">{branch?.name || st.branchId}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            st.status === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setExpandedStaffId(isExpanded ? null : st.id)}
                            className="px-2 py-1 text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition cursor-pointer font-bold text-[10px] flex items-center gap-1"
                            title="Atur Checkbox Hak Akses Modul"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Hak Akses ({activePerms.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(st)}
                            className="p-1.5 text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition cursor-pointer shadow-2xs active:scale-95"
                            title="Edit Pegawai"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(st.id, st.name)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer shadow-2xs active:scale-95"
                            title="Hapus Pegawai"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/90">
                        <td colSpan={7} className="p-4 border-t border-slate-200">
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-xs text-slate-800">
                                Daftar Checkbox Hak Akses Modul — {st.name} ({st.id})
                              </span>
                              <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                Catatan: Halaman Pengaturan Sistem &amp; Profil Fasilitas hanya boleh diakses oleh Super Admin / APJ
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {SYSTEM_PERMISSIONS.map((perm) => {
                                const checked = activePerms.includes(perm.id);
                                const isLocked = perm.superAdminOnly && !hasSuperAdmin;
                                return (
                                  <label
                                    key={perm.id}
                                    className={`flex items-start gap-2 p-2 rounded-xl border text-[11px] select-none transition ${
                                      isLocked
                                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                        : checked
                                        ? 'bg-white border-emerald-300 text-slate-900 font-bold shadow-2xs cursor-pointer'
                                        : 'bg-white border-slate-200 text-slate-600 cursor-pointer hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={isLocked || hasSuperAdmin}
                                      onChange={() => handleToggleStaffPerm(st, perm.id)}
                                      className="w-3.5 h-3.5 mt-0.5 accent-emerald-600 rounded cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    <div className="leading-tight">
                                      <span className="block">{perm.label}</span>
                                      <span className="text-[9px] text-slate-400 block">
                                        {perm.category}
                                      </span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-2xs">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-400" />
                <h4 className="font-extrabold text-sm">
                  Edit Data Pegawai: <span className="font-mono text-sky-300">{editingStaff.id}</span>
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  required
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Jabatan / Peran Akses *
                  </label>
                  <select
                    value={editingStaff.role}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as Staff['role'] })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Super Admin / APJ">Super Admin / APJ</option>
                    <option value="Dokter">Dokter Pemeriksa</option>
                    <option value="Apoteker">Apoteker / Farmasi</option>
                    <option value="Perawat / Bidan">Perawat / Bidan</option>
                    <option value="Kasir & Front Office">Kasir & Front Office</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Status Pegawai *
                  </label>
                  <select
                    value={editingStaff.status}
                    onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value as Staff['status'] })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    No. Handphone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStaff.phone}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold bg-white outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Penempatan Cabang
                  </label>
                  <select
                    value={editingStaff.branchId}
                    onChange={(e) => setEditingStaff({ ...editingStaff, branchId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
