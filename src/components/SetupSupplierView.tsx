import React, { useState, useMemo } from 'react';
import {
  Truck,
  Search,
  Plus,
  Building,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Mail,
  User,
  FileText
} from 'lucide-react';
import { Supplier } from '../types';

interface SetupSupplierViewProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
}

export const SetupSupplierView: React.FC<SetupSupplierViewProps> = ({
  suppliers,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    licenseNo: '',
    picName: ''
  });

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchAddress = s.address.toLowerCase().includes(q);
        const matchPhone = s.phone.toLowerCase().includes(q);
        const matchEmail = (s.email || '').toLowerCase().includes(q);
        const matchPic = (s.picName || '').toLowerCase().includes(q);
        return matchName || matchAddress || matchPhone || matchEmail || matchPic;
      }
      return true;
    });
  }, [suppliers, searchTerm]);

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      licenseNo: '',
      picName: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      address: supplier.address,
      phone: supplier.phone,
      email: supplier.email || '',
      licenseNo: supplier.licenseNo || '',
      picName: supplier.picName || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim() || !formData.phone.trim()) {
      alert('Harap lengkapi semua kolom wajib (Nama, Alamat, Kontak/telepon)!');
      return;
    }

    if (editingSupplier) {
      const updated: Supplier = {
        ...editingSupplier,
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        licenseNo: formData.licenseNo.trim(),
        picName: formData.picName.trim()
      };
      onUpdateSupplier(updated);
    } else {
      const newSupplier: Supplier = {
        id: `SUP-${String(Date.now()).slice(-4)}`,
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        licenseNo: formData.licenseNo.trim(),
        picName: formData.picName.trim(),
        createdAt: new Date().toISOString().split('T')[0]
      };
      onAddSupplier(newSupplier);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data supplier/PBF "${name}"?`)) {
      onDeleteSupplier(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <Truck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              Master Data Supplier & PBF (Pedagang Besar Farmasi)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan distributor resmi dan principal farmasi untuk pengadaan obat, faktur pembelian, dan defecta.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Supplier Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari berdasarkan Nama Supplier/PBF, Alamat, Kontak/telepon, atau PIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Total: <strong className="text-slate-800">{filteredSuppliers.length}</strong> Supplier
        </span>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3">Nama Supplier / PBF</th>
                <th className="p-3">Alamat Lengkap</th>
                <th className="p-3">Kontak / Telepon</th>
                <th className="p-3">No. Izin PBF & Email</th>
                <th className="p-3">PIC / Salesman</th>
                <th className="p-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-bold">Belum ada data supplier atau PBF yang ditemukan.</p>
                    <p className="text-[11px] mt-0.5">Klik tombol "+ Tambah Supplier Baru" untuk mendaftarkan rekanan distributor farmasi.</p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-sky-500 shrink-0" />
                        <span>{s.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {s.id}</div>
                    </td>
                    <td className="p-3 max-w-[280px]">
                      <div className="text-slate-600 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate" title={s.address}>{s.address}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-700 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{s.phone}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {s.licenseNo ? (
                        <div className="font-mono text-[11px] text-slate-600 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>{s.licenseNo}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                      {s.email && (
                        <div className="text-[10px] text-sky-600 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{s.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {s.picName ? (
                        <div className="text-slate-700 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.picName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          title="Edit Data Supplier"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          title="Hapus Supplier"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM SUPPLIER */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm">
                  {editingSupplier ? 'Edit Data Supplier / PBF' : 'Form Supplier (PBF & Distributor Farmasi)'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Supplier / PBF *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT. Kimia Farma Trading & Distribution / PT. AAM"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alamat Lengkap *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Kawasan Pergudangan Logistik Farmasi Way Halim, Bandar Lampung"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-medium bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kontak / Telepon *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 0721-789012 / 0812-xxxx-xxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-medium bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Izin PBF / Distribusi (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="HK.02.02/PBF/129/2021"
                    value={formData.licenseNo}
                    onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono text-xs bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email Resmi (Opsional)
                  </label>
                  <input
                    type="email"
                    placeholder="sales@pbf.co.id"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-medium bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Kontak Person / Salesman (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bpk. Bambang Irawan (Sales Executive)"
                  value={formData.picName}
                  onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-medium bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingSupplier ? 'Simpan Perubahan' : 'Simpan Supplier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
