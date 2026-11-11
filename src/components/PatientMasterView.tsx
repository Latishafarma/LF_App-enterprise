import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  QrCode,
  Edit2,
  Trash2,
  AlertTriangle,
  Printer,
  X,
  Send,
  ShieldAlert
} from 'lucide-react';
import { Patient } from '../types';
import { openPrintWindow } from '../utils/printHelper';
import { getSavedPharmacyProfile } from './PharmacySettingsModal';

interface PatientMasterViewProps {
  patients: Patient[];
  onAddPatient: (patient: Patient) => void;
  onUpdatePatient: (patient: Patient) => void;
  onDeletePatient: (id: string) => void;
  onSendToQueue: (patient: Patient) => void;
}

export const PatientMasterView: React.FC<PatientMasterViewProps> = ({
  patients,
  onAddPatient,
  onUpdatePatient,
  onDeletePatient,
  onSendToQueue
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCardPatient, setSelectedCardPatient] = useState<Patient | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editPatientId, setEditPatientId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nik: '',
    name: '',
    birthDate: '',
    gender: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    phone: '',
    address: '',
    allergy: '',
    category: 'Pasien Praktik' as Patient['category'],
    bpjsNo: ''
  });

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    const q = searchTerm.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.nik.includes(q) ||
        p.phone.includes(q)
    );
  }, [patients, searchTerm]);

  const handleOpenAdd = () => {
    setEditPatientId(null);
    setFormData({
      nik: '',
      name: '',
      birthDate: '',
      gender: 'Laki-laki',
      phone: '',
      address: '',
      allergy: '',
      category: 'Pasien Praktik',
      bpjsNo: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (p: Patient) => {
    setEditPatientId(p.id);
    setFormData({
      nik: p.nik,
      name: p.name,
      birthDate: p.birthDate || '1990-01-01',
      gender: p.gender,
      phone: p.phone,
      address: p.address,
      allergy: p.allergy,
      category: p.category,
      bpjsNo: p.bpjsNo || '-'
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nik) {
      alert('Nama dan NIK wajib diisi!');
      return;
    }

    const birthYear = new Date(formData.birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const calculatedAge = Math.max(0, currentYear - birthYear);

    if (editPatientId) {
      const existing = patients.find((p) => p.id === editPatientId);
      if (!existing) return;
      onUpdatePatient({
        ...existing,
        ...formData,
        age: calculatedAge
      });
    } else {
      const newId = `RM-${String(patients.length + 1).padStart(3, '0')}`;
      const newPatient: Patient = {
        id: newId,
        ...formData,
        age: calculatedAge,
        registrationDate: new Date().toISOString().split('T')[0]
      };
      onAddPatient(newPatient);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pasien (Nama / NIK / No. RM / Telepon)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Registrasi Pasien Baru</span>
        </button>
      </div>

      {/* Patient Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="p-3 w-16 text-center">Aksi</th>
              <th className="p-3">No. RM & NIK</th>
              <th className="p-3">Nama Pasien</th>
              <th className="p-3">Kategori</th>
              <th className="p-3">Kontak & Alamat</th>
              <th className="p-3">Flag Alergi Obat</th>
              <th className="p-3 text-center">Kartu QR</th>
              <th className="p-3 text-center">Antrean</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400 italic">
                  Tidak ada data pasien yang sesuai dengan pencarian.
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      <button
                        onClick={() => handleOpenEdit(patient)}
                        title="Edit Pasien"
                        className="p-1.5 text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition inline-flex items-center cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus data pasien ${patient.name} (${patient.id})?`)) {
                            onDeletePatient(patient.id);
                          }
                        }}
                        title="Hapus Pasien"
                        className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition inline-flex items-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3 font-mono">
                    <span className="font-extrabold text-sky-700 block">{patient.id}</span>
                    <span className="text-[10px] text-slate-400 font-normal">NIK: {patient.nik}</span>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-800 block">{patient.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {patient.gender}, {patient.age} thn · Tgl Lahir: {patient.birthDate}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {patient.category}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="block font-mono text-[11px]">{patient.phone}</span>
                    <span className="text-[10px] text-slate-500 truncate block max-w-[180px]">
                      {patient.address}
                    </span>
                  </td>
                  <td className="p-3">
                    {patient.allergy && patient.allergy !== 'Tidak Ada' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200 text-[10px] animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        {patient.allergy}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Tidak Ada Alergi</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setSelectedCardPatient(patient)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 mx-auto"
                    >
                      <QrCode className="w-3 h-3" />
                      <span>Cetak QR</span>
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onSendToQueue(patient)}
                      title="Kirim pasien langsung ke antrean poli"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 mx-auto"
                    >
                      <Send className="w-3 h-3" />
                      <span>+ Antrean</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Registration & Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wide">
                {editPatientId ? 'Edit Data Pasien' : 'Registrasi Pasien Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    NIK Pasien (16 Digit KTP) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    placeholder="160100..."
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Pasien *</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as Patient['category'] })
                    }
                    className="w-full px-3 py-2 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="Pasien Praktik">Pasien Praktik Dokter</option>
                    <option value="Pasien Umum">Pasien Umum / OTC</option>
                    <option value="Mitra Perusahaan">Mitra Perusahaan / Nakes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap Pasien *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tn. Bambang Irawan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-bold text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Lahir *</label>
                  <input
                    type="date"
                    required
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gender: e.target.value as 'Laki-laki' | 'Perempuan'
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl font-bold bg-white"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="0812-..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono font-bold bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Domisili Lengkap</label>
                <input
                  type="text"
                  placeholder="Nama jalan, RT/RW, Desa, Kecamatan..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-white"
                />
              </div>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                <label className="block font-bold text-rose-900 text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Flag Riwayat Alergi Obat Spesifik
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Amoxicillin, Paracetamol, Sulfonamida (Ketik 'Tidak Ada' bila aman)"
                  value={formData.allergy}
                  onChange={(e) => setFormData({ ...formData, allergy: e.target.value })}
                  className="w-full px-3 py-2 border border-rose-300 rounded-xl font-bold text-rose-900 bg-white"
                />
                <span className="text-[10px] text-rose-600 block">
                  Peringatan ini akan muncul otomatis saat dokter meresepkan obat di ruang periksa.
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-black shadow-md uppercase tracking-wider"
                >
                  Simpan Pasien
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient QR Card Modal & Print Area */}
      {selectedCardPatient && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center space-y-4 border border-slate-300">
            <div id="printable-section" className="space-y-3">
              {(() => {
                const pharmacyProfile = getSavedPharmacyProfile();
                return (
                  <div className="border-b border-slate-300 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      {pharmacyProfile.logoUrl ? (
                        <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                          <img
                            src={pharmacyProfile.logoUrl}
                            alt="Logo Faskes"
                            className="w-10 h-10 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-10 shrink-0" />
                      )}
                      <div className="flex-1 text-center">
                        <h2 className="font-black text-slate-900 text-sm tracking-wide uppercase">
                          {pharmacyProfile.name}
                        </h2>
                        <p className="text-[10px] text-slate-600 font-medium">
                          {pharmacyProfile.address}, {pharmacyProfile.city} · {pharmacyProfile.phone}
                        </p>
                        <p className="text-[10px] text-sky-800 font-bold uppercase mt-0.5">
                          Kartu Rekam Medis Berobat Pasien
                        </p>
                      </div>
                      <div className="w-10 shrink-0" />
                    </div>
                  </div>
                );
              })()}

              <div className="bg-slate-50 border-2 border-slate-800 p-4 rounded-2xl text-left space-y-1.5">
                <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-widest">
                  Nomor Rekam Medis (RM)
                </span>
                <div className="text-2xl font-black font-mono text-sky-800 tracking-wider">
                  {selectedCardPatient.id}
                </div>
                <div className="font-extrabold text-sm text-slate-900">{selectedCardPatient.name}</div>
                <div className="text-[10px] text-slate-600 font-mono">
                  NIK: {selectedCardPatient.nik} · {selectedCardPatient.gender}
                </div>
                {selectedCardPatient.allergy !== 'Tidak Ada' && (
                  <div className="text-[10px] font-bold text-rose-700 pt-1">
                    Alergi: {selectedCardPatient.allergy}
                  </div>
                )}
              </div>

              <div className="w-36 h-36 mx-auto bg-white border border-slate-200 rounded-2xl p-2 flex items-center justify-center shadow-xs">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=LATISHA-RM-${selectedCardPatient.id}-${selectedCardPatient.nik}`}
                  alt="QR Code Pasien"
                  className="w-full h-full object-contain"
                />
              </div>

              <p className="text-[10px] text-slate-400 font-medium italic">
                Harap membawa kartu ini setiap kali berkunjung atau berobat.
              </p>
            </div>

            <div className="flex gap-2 pt-2 border-t no-print">
              <button
                onClick={() => {
                  if (selectedCardPatient) {
                    try {
                      localStorage.setItem('latisha_active_print_patient', JSON.stringify(selectedCardPatient));
                    } catch (e) {}
                    openPrintWindow('kartu-pasien', { patientId: selectedCardPatient.id });
                  }
                }}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Kartu
              </button>
              <button
                onClick={() => setSelectedCardPatient(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 font-bold rounded-xl text-xs text-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
