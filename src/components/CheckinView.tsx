import React, { useState, useMemo } from 'react';
import {
  HeartPulse,
  Send,
  AlertTriangle,
  UserCheck,
  Search,
  Scale
} from 'lucide-react';
import { Patient, PatientQueue, Doctor, Staff } from '../types';

interface CheckinViewProps {
  patients: Patient[];
  doctors: Doctor[];
  staffList?: Staff[];
  queue: PatientQueue[];
  onAddToQueue: (queueItem: PatientQueue) => void;
  onNavigateToMonitor: () => void;
}

export const CheckinView: React.FC<CheckinViewProps> = ({
  patients,
  doctors,
  staffList = [],
  queue,
  onAddToQueue,
  onNavigateToMonitor
}) => {
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Vital Signs
  const [tdSistolik, setTdSistolik] = useState('120');
  const [tdDiastolik, setTdDiastolik] = useState('80');
  const [suhu, setSuhu] = useState('36.5');
  const [nadi, setNadi] = useState('80');
  const [spo2, setSpo2] = useState('98');
  const [bb, setBb] = useState('65');
  const [tb, setTb] = useState('165');

  const activeStaff = useMemo(() => {
    return staffList.filter((s) => s.status !== 'Non-Aktif');
  }, [staffList]);

  const defaultNurse = useMemo(() => {
    const nurse = activeStaff.find(
      (s) =>
        s.role === 'Perawat / Bidan' ||
        s.role === 'Perawat / Nakes Lapangan' ||
        s.role === 'Kasir & Front Office'
    );
    return nurse?.name || activeStaff[0]?.name || '';
  }, [activeStaff]);

  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || 'DOC-001');
  const [screeningStaffName, setScreeningStaffName] = useState(defaultNurse);
  const [serviceType, setServiceType] = useState('Poli Umum');
  const [complaint, setComplaint] = useState('');

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return [];
    const q = patientSearch.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.nik.includes(q)
    );
  }, [patients, patientSearch]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // BMI Calculation
  const bmiInfo = useMemo(() => {
    const weight = parseFloat(bb);
    const height = parseFloat(tb) / 100;
    if (!weight || !height || height <= 0) return null;
    const bmi = +(weight / (height * height)).toFixed(1);
    let category = 'Normal';
    let colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (bmi < 18.5) {
      category = 'Berat Badan Kurang';
      colorClass = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (bmi >= 25 && bmi < 30) {
      category = 'Kelebihan Berat Badan (Overweight)';
      colorClass = 'text-orange-700 bg-orange-50 border-orange-200';
    } else if (bmi >= 30) {
      category = 'Obesitas';
      colorClass = 'text-rose-700 bg-rose-50 border-rose-200';
    }
    return { bmi, category, colorClass };
  }, [bb, tb]);

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatientId(p.id);
    setPatientSearch(`${p.id} - ${p.name}`);
    setShowDropdown(false);
  };

  const handleCheckin = () => {
    if (!selectedPatient) {
      alert('Pilih pasien dari daftar terlebih dahulu!');
      return;
    }

    const doctor = doctors.find((d) => d.id === selectedDoctorId);
    const nextNum = `A-${String(queue.length + 1).padStart(3, '0')}`;
    const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newQueueItem: PatientQueue = {
      nomor: nextNum,
      rmId: selectedPatient.id,
      name: selectedPatient.name,
      age: selectedPatient.age,
      gender: selectedPatient.gender,
      vital: {
        td: `${tdSistolik}/${tdDiastolik}`,
        suhu: parseFloat(suhu) || 36.5,
        nadi: parseInt(nadi) || 80,
        spo2: parseInt(spo2) || 98,
        bb: parseFloat(bb) || undefined,
        tb: parseFloat(tb) || undefined
      },
      status: 'Menunggu',
      doctorId: selectedDoctorId,
      doctorName: doctor?.name || 'dr. Anis Prima Dewi',
      checkinTime: currentTime,
      source: 'Pendaftaran Langsung (Walk-in)',
      complaint: complaint || 'Konsultasi & Pemeriksaan Fisik',
      serviceType,
      branchId: 'BR-01'
    };

    onAddToQueue(newQueueItem);
    alert(`Pasien ${selectedPatient.name} berhasil check-in dengan nomor antrean ${nextNum}`);
    onNavigateToMonitor();
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-wrap justify-between items-center gap-2">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-500" />
            Check-in Kunjungan & Skrining Tanda Vital Pasien
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Skrining awal perawat sebelum pasien masuk ke ruang periksa dokter.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Patient Selector & Allergy Warning (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilih Pasien Terdaftar *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik Nama, No. RM, atau NIK..."
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {showDropdown && filteredPatients.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y">
                {filteredPatients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className="p-3 hover:bg-sky-50 cursor-pointer text-xs font-medium transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <strong className="text-slate-800">{p.name}</strong>
                      <span className="font-mono text-sky-700 font-bold text-[11px]">{p.id}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      NIK: {p.nik} · {p.gender}, {p.age} thn
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedPatient && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800 text-sm">{selectedPatient.name}</span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <div>No. RM: <strong className="font-mono text-sky-700">{selectedPatient.id}</strong></div>
                <div>Kategori: <strong>{selectedPatient.category}</strong></div>
                <div>Alamat: {selectedPatient.address}</div>
              </div>

              {selectedPatient.allergy && selectedPatient.allergy !== 'Tidak Ada' && (
                <div className="p-3 bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs animate-pulse flex items-start gap-2 mt-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-black uppercase text-[10px] tracking-wider">
                      PERINGATAN ALERGI OBAT:
                    </span>
                    <span className="text-xs">{selectedPatient.allergy}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilih Layanan Poli
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="Poli Umum">Poli Umum</option>
              <option value="Konseling Farmasi & Obat">Konseling Farmasi & Obat</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Dokter Pemeriksa (Data Pegawai / DPJ)
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialization})
                </option>
              ))}
            </select>
          </div>

          {activeStaff.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Petugas Skrining / Perawat (Data Pegawai)
              </label>
              <select
                value={screeningStaffName || defaultNurse}
                onChange={(e) => setScreeningStaffName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {activeStaff.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name} ({st.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Vital Signs Inputs & Complaint (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            Tanda-Tanda Vital (Vital Signs)
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Tekanan Darah (mmHg)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={tdSistolik}
                  onChange={(e) => setTdSistolik(e.target.value)}
                  className="w-16 p-2 border rounded-xl bg-white font-mono font-bold text-center"
                />
                <span className="font-bold text-slate-400">/</span>
                <input
                  type="number"
                  value={tdDiastolik}
                  onChange={(e) => setTdDiastolik(e.target.value)}
                  className="w-16 p-2 border rounded-xl bg-white font-mono font-bold text-center"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Suhu Tubuh (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={suhu}
                onChange={(e) => setSuhu(e.target.value)}
                className="w-full p-2 border rounded-xl bg-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Denyut Nadi (bpm)
              </label>
              <input
                type="number"
                value={nadi}
                onChange={(e) => setNadi(e.target.value)}
                className="w-full p-2 border rounded-xl bg-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">
                SpO2 Oksigen (%)
              </label>
              <input
                type="number"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                className="w-full p-2 border rounded-xl bg-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Berat Badan (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={bb}
                onChange={(e) => setBb(e.target.value)}
                className="w-full p-2 border rounded-xl bg-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Tinggi Badan (cm)
              </label>
              <input
                type="number"
                value={tb}
                onChange={(e) => setTb(e.target.value)}
                className="w-full p-2 border rounded-xl bg-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">
                Indeks Massa Tubuh (BMI)
              </label>
              {bmiInfo ? (
                <div className={`p-2 border rounded-xl font-bold text-xs ${bmiInfo.colorClass}`}>
                  BMI: {bmiInfo.bmi} · {bmiInfo.category}
                </div>
              ) : (
                <div className="p-2 border rounded-xl text-slate-400 bg-slate-100 text-xs">
                  Masukkan BB & TB
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 text-xs mb-1">
              Keluhan Utama / Alasan Kunjungan Pasien
            </label>
            <textarea
              rows={3}
              placeholder="Contoh: Pasien mengeluh pusing berputar, mual sejak 2 hari, nafsu makan berkurang..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              className="w-full p-3 border rounded-xl bg-white font-medium text-xs focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <button
            onClick={handleCheckin}
            className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Pasien ke Antrean Ruang Dokter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
