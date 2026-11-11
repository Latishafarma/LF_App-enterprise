import React, { useState } from 'react';
import {
  Globe,
  CheckCircle2,
  XCircle,
  Search,
  UserCheck,
  Calendar,
  Clock,
  QrCode,
  ShieldAlert,
  Send,
  Plus
} from 'lucide-react';
import { OnlineRegistration, Patient, Doctor, PatientQueue } from '../types';

interface OnlineRegistrationViewProps {
  registrations: OnlineRegistration[];
  onAddRegistration: (reg: OnlineRegistration) => void;
  onUpdateStatus: (id: string, status: OnlineRegistration['status']) => void;
  onAcceptToQueue: (reg: OnlineRegistration) => void;
  doctors: Doctor[];
  patients: Patient[];
}

export const OnlineRegistrationView: React.FC<OnlineRegistrationViewProps> = ({
  registrations,
  onAddRegistration,
  onUpdateStatus,
  onAcceptToQueue,
  doctors,
  patients
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'verifikasi' | 'portal-publik'>('verifikasi');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('SEMUA');
  const [submittedBooking, setSubmittedBooking] = useState<OnlineRegistration | null>(null);

  // Form State for Online Registration Form
  const [form, setForm] = useState({
    nik: '',
    name: '',
    phone: '',
    birthDate: '1995-06-15',
    gender: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    address: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '09:00',
    doctorId: doctors[0]?.id || 'DOC-001',
    serviceType: 'Poli Umum',
    paymentType: 'Umum / Mandiri' as OnlineRegistration['paymentType'],
    complaint: '',
    allergy: 'Tidak Ada'
  });

  const filteredRegistrations = registrations.filter((reg) => {
    const matchSearch =
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.bookingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.nik.includes(searchTerm) ||
      reg.phone.includes(searchTerm);
    const matchStatus = statusFilter === 'SEMUA' || reg.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handlePublicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.nik || !form.phone) {
      alert('Mohon lengkapi data NIK, Nama, dan Nomor WhatsApp!');
      return;
    }

    const doc = doctors.find((d) => d.id === form.doctorId);
    const bookingCode = `LTF-${Math.floor(10000 + Math.random() * 90000)}`;

    const newReg: OnlineRegistration = {
      id: `REG-${Date.now().toString().slice(-6)}`,
      bookingCode,
      ...form,
      doctorName: doc?.name || 'dr. Anis Prima Dewi',
      status: 'Menunggu Verifikasi',
      createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      branchId: 'BR-01'
    };

    onAddRegistration(newReg);
    setSubmittedBooking(newReg);
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher: Verification Panel vs Public Portal */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('verifikasi')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
              activeSubTab === 'verifikasi'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Panel Verifikasi Pendaftaran Online</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-200 text-sky-900 font-black">
              {registrations.filter((r) => r.status === 'Menunggu Verifikasi').length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('portal-publik')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
              activeSubTab === 'portal-publik'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Simulasi Portal Pendaftaran Mandiri Pasien</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'verifikasi' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3 text-xs">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kode booking, nama pasien, atau NIK..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-xl font-semibold bg-slate-50 focus:bg-white outline-none"
              />
            </div>

            <div className="flex items-center gap-2 font-medium">
              <span className="text-slate-500 font-bold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 border rounded-xl bg-white font-bold text-slate-700 outline-none"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                <option value="Diterima">Diterima</option>
                <option value="Ditolak">Ditolak</option>
              </select>
            </div>
          </div>

          {/* Registrations List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-600 text-[11px]">
                <tr>
                  <th className="p-3">Kode Booking & Waktu</th>
                  <th className="p-3">Data Pasien</th>
                  <th className="p-3">Tujuan Poli & Dokter</th>
                  <th className="p-3">Keluhan Pasien</th>
                  <th className="p-3">Metode Bayar</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Aksi Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400 italic">
                      Tidak ada permohonan pendaftaran online yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono">
                        <span className="font-extrabold text-sky-700 text-sm block">
                          {item.bookingCode}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.appointmentDate} · {item.appointmentTime} WIB
                        </span>
                      </td>

                      <td className="p-3">
                        <strong className="text-slate-900 block">{item.name}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">
                          NIK: {item.nik} · WA: {item.phone}
                        </span>
                        {item.allergy && item.allergy !== 'Tidak Ada' && (
                          <span className="block text-[10px] font-bold text-rose-600 mt-0.5">
                            Alergi: {item.allergy}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">{item.serviceType}</span>
                        <span className="text-[10px] text-sky-700">{item.doctorName}</span>
                      </td>

                      <td className="p-3 max-w-[200px]">
                        <p className="truncate text-slate-600">{item.complaint}</p>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {item.paymentType}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            item.status === 'Menunggu Verifikasi'
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : item.status === 'Diterima'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="p-3 text-center space-x-1.5">
                        {item.status === 'Menunggu Verifikasi' ? (
                          <>
                            <button
                              onClick={() => onAcceptToQueue(item)}
                              title="Verifikasi dan terbitkan nomor antrean poli hari ini"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Terima & Antre</span>
                            </button>
                            <button
                              onClick={() => onUpdateStatus(item.id, 'Ditolak')}
                              title="Tolak pendaftaran"
                              className="px-2 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg font-bold text-[11px] transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 font-bold text-[11px]">
                            {item.status === 'Diterima' ? '✓ Masuk Antrean' : '× Ditolak'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Public Facing Self-Registration Form */
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-md space-y-6">
          <div className="border-b border-slate-200 pb-4 text-center">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Pendaftaran Pasien Online Latisha Farma
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Daftar berobat praktis dari rumah tanpa antre lama. Dapatkan kode booking & nomor antrean langsung.
            </p>
          </div>

          {submittedBooking ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div>
                <h3 className="text-lg font-black text-emerald-900">
                  Pendaftaran Berhasil Dikirim!
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Simpan kode booking Anda untuk ditunjukkan kepada petugas resepsionis.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-emerald-200 inline-block font-mono">
                <span className="text-[10px] text-slate-400 block font-bold">KODE BOOKING</span>
                <span className="text-3xl font-black text-sky-800 tracking-wider">
                  {submittedBooking.bookingCode}
                </span>
                <div className="text-xs text-slate-700 mt-1">
                  Atas Nama: <strong>{submittedBooking.name}</strong>
                </div>
                <div className="text-[11px] text-slate-500">
                  Jadwal: {submittedBooking.appointmentDate} · Pukul {submittedBooking.appointmentTime} WIB
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setSubmittedBooking(null);
                    setActiveSubTab('verifikasi');
                  }}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition"
                >
                  Kembali ke Panel Pendaftaran
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePublicSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nomor Induk Kependudukan (NIK) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    placeholder="16 Digit KTP..."
                    value={form.nik}
                    onChange={(e) => setForm({ ...form, nik: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Lengkap Pasien *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Sesuai KTP..."
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Lahir *</label>
                  <input
                    type="date"
                    required
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as 'Laki-laki' | 'Perempuan' })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor WhatsApp Aktif *</label>
                  <input
                    type="text"
                    required
                    placeholder="0812-..."
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Domisili</label>
                <input
                  type="text"
                  placeholder="Kecamatan, Desa, Alamat lengkap..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Kunjungan</label>
                  <input
                    type="date"
                    required
                    value={form.appointmentDate}
                    onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pilihan Jam Praktek</label>
                  <select
                    value={form.appointmentTime}
                    onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white"
                  >
                    <option value="08:30">Pagi (08:30 - 11:30 WIB)</option>
                    <option value="14:00">Siang (14:00 - 16:30 WIB)</option>
                    <option value="18:30">Malam (18:30 - 21:00 WIB)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Layanan Poli Tujuan</label>
                  <select
                    value={form.serviceType}
                    onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white"
                  >
                    <option value="Poli Umum">Poli Umum</option>
                    <option value="Konseling Farmasi & Obat">Konseling Farmasi & Obat</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={form.paymentType}
                    onChange={(e) => setForm({ ...form, paymentType: e.target.value as OnlineRegistration['paymentType'] })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 focus:bg-white"
                  >
                    <option value="Umum / Mandiri">Umum / Mandiri (Tunai/QRIS)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Keluhan / Gejala Utama yang Dirasakan *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ceritakan keluhan sakit yang dirasakan..."
                  value={form.complaint}
                  onChange={(e) => setForm({ ...form, complaint: e.target.value })}
                  className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <label className="block font-bold text-rose-900 mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Riwayat Alergi Obat (Jika Ada)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Alergi Amoxicillin, Alergi Penisilin (Tulis 'Tidak Ada' bila tidak ada)"
                  value={form.allergy}
                  onChange={(e) => setForm({ ...form, allergy: e.target.value })}
                  className="w-full p-2 border border-rose-300 rounded-lg text-rose-900 font-bold bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Pendaftaran Berobat Online</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
