import React, { useState, useMemo } from 'react';
import {
  Handshake,
  Search,
  Plus,
  Building,
  Phone,
  FileBadge,
  MapPin,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Building2,
  User,
  ExternalLink
} from 'lucide-react';
import { Mitra } from '../types';

interface SetupMitraViewProps {
  mitraList: Mitra[];
  onAddMitra: (mitra: Mitra) => void;
  onUpdateMitra: (mitra: Mitra) => void;
  onDeleteMitra: (id: string) => void;
}

export const SetupMitraView: React.FC<SetupMitraViewProps> = ({
  mitraList,
  onAddMitra,
  onUpdateMitra,
  onDeleteMitra
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMitra, setEditingMitra] = useState<Mitra | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    licenseNo: '',
    address: '',
    category: 'Klinik Pratama' as Mitra['category'],
    picName: ''
  });

  const filteredMitra = useMemo(() => {
    return mitraList.filter((m) => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchPhone = m.phone.toLowerCase().includes(q);
        const matchLicense = m.licenseNo.toLowerCase().includes(q);
        const matchAddress = m.address.toLowerCase().includes(q);
        const matchPic = (m.picName || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchLicense || matchAddress || matchPic;
      }
      return true;
    });
  }, [mitraList, searchTerm, categoryFilter]);

  const handleOpenAddModal = () => {
    setEditingMitra(null);
    setFormData({
      name: '',
      phone: '',
      licenseNo: '',
      address: '',
      category: 'Klinik Pratama',
      picName: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (mitra: Mitra) => {
    setEditingMitra(mitra);
    setFormData({
      name: mitra.name,
      phone: mitra.phone,
      licenseNo: mitra.licenseNo,
      address: mitra.address,
      category: mitra.category || 'Klinik Pratama',
      picName: mitra.picName || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.licenseNo.trim() || !formData.address.trim()) {
      alert('Harap lengkapi semua kolom wajib (Nama Faskes, No. Tlp, No. Izin, Alamat)!');
      return;
    }

    if (editingMitra) {
      const updated: Mitra = {
        ...editingMitra,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        licenseNo: formData.licenseNo.trim(),
        address: formData.address.trim(),
        category: formData.category,
        picName: formData.picName.trim()
      };
      onUpdateMitra(updated);
    } else {
      const newMitra: Mitra = {
        id: `MTR-${String(Date.now()).slice(-4)}`,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        licenseNo: formData.licenseNo.trim(),
        address: formData.address.trim(),
        category: formData.category,
        picName: formData.picName.trim(),
        createdAt: new Date().toISOString().split('T')[0]
      };
      onAddMitra(newMitra);
    }

    setShowModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data faskes mitra "${name}"?`)) {
      onDeleteMitra(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Handshake className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              Master Data Mitra (Fasilitas Kesehatan)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan direktori mitra klinik, apotek rekanan, praktik mandiri dokter, dan fasilitas kesehatan jejaring.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Mitra Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Live Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari berdasarkan Nama Faskes, No. Izin, Alamat, atau No. Telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold whitespace-nowrap">Kategori:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-slate-50 focus:outline-none"
          >
            <option value="all">Semua Kategori Faskes</option>
            <option value="Klinik Pratama">Klinik Pratama</option>
            <option value="Klinik Utama">Klinik Utama</option>
            <option value="Apotek Mitra">Apotek Mitra</option>
            <option value="Praktik Dokter Mandiri">Praktik Dokter Mandiri</option>
            <option value="Rumah Sakit">Rumah Sakit</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3">Nama Faskes</th>
                <th className="p-3">No. Izin Operasional</th>
                <th className="p-3">Kontak / No. Telepon</th>
                <th className="p-3">Alamat Lengkap</th>
                <th className="p-3">Kategori & PIC</th>
                <th className="p-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMitra.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Building className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-bold">Belum ada data fasilitas kesehatan mitra yang ditemukan.</p>
                    <p className="text-[11px] mt-0.5">Klik tombol "+ Tambah Mitra Baru" untuk mendaftarkan mitra baru.</p>
                  </td>
                </tr>
              ) : (
                filteredMitra.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{m.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {m.id}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-mono text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <FileBadge className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{m.licenseNo}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-700 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{m.phone}</span>
                      </div>
                    </td>
                    <td className="p-3 max-w-[260px]">
                      <div className="text-slate-600 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate" title={m.address}>{m.address}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {m.category || 'Klinik Pratama'}
                      </span>
                      {m.picName && (
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{m.picName}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          title="Edit Data Mitra"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, m.name)}
                          title="Hapus Mitra"
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

      {/* MODAL FORM MITRA */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {editingMitra ? 'Edit Fasilitas Kesehatan Mitra' : 'Form Mitra (Fasilitas Kesehatan Baru)'}
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
                  Nama Faskes *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Klinik Pratama Sehat Bersama / Apotek Mandiri"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Tlp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0812-xxxx-xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-medium bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Izin *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="503/014/KLINIK/2023"
                    value={formData.licenseNo}
                    onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alamat *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Jl. Poros Simpang Pematang No. 12, Kab. Mesuji, Lampung"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-medium bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kategori Faskes
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full p-2.5 border rounded-xl font-medium bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Klinik Pratama">Klinik Pratama</option>
                    <option value="Klinik Utama">Klinik Utama</option>
                    <option value="Apotek Mitra">Apotek Mitra</option>
                    <option value="Praktik Dokter Mandiri">Praktik Dokter Mandiri</option>
                    <option value="Rumah Sakit">Rumah Sakit</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Penanggung Jawab / PIC
                  </label>
                  <input
                    type="text"
                    placeholder="dr. Hendra Pratama"
                    value={formData.picName}
                    onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-medium bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{editingMitra ? 'Simpan Perubahan' : 'Simpan Mitra'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
