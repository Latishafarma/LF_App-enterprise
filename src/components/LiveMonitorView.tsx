import React, { useState } from 'react';
import {
  Volume2,
  SkipForward,
  RotateCcw,
  Maximize2,
  Minimize2,
  CheckCircle,
  Clock,
  User,
  Activity,
  Megaphone,
  Bell
} from 'lucide-react';
import { PatientQueue } from '../types';
import { announceQueueVoice, playQueueChime } from '../utils/audio';

interface LiveMonitorViewProps {
  queue: PatientQueue[];
  onUpdateQueueStatus: (nomor: string, newStatus: PatientQueue['status']) => void;
  onCallNext: () => void;
  clinicName?: string;
  doctorName?: string;
}

export const LiveMonitorView: React.FC<LiveMonitorViewProps> = ({
  queue,
  onUpdateQueueStatus,
  onCallNext,
  clinicName = 'Klinik & Apotek Latisha Farma',
  doctorName = 'dr. Anis Prima Dewi'
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState('Ruang Periksa Dokter Umum');

  // Currently called or examined patient
  const currentPatient = queue.find((p) => p.status === 'Diperiksa') || queue.find((p) => p.status === 'Menunggu') || null;

  const handleCallVoice = async (patient: PatientQueue) => {
    setIsCalling(true);
    await announceQueueVoice(patient.nomor, patient.name, selectedDestination);
    setIsCalling(false);
  };

  const handleTestChime = () => {
    playQueueChime();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto' : ''}`}>
      {/* Top Header Bar for Monitor */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="font-extrabold text-base tracking-tight text-white">{clinicName}</h2>
            <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono font-bold px-2 py-0.5 rounded border border-sky-500/30">
              Live Queue Monitor & Voice
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Dokter Praktek: <span className="text-slate-200 font-semibold">{doctorName}</span> · Sistem Panggilan Suara Otomatis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-xl outline-none"
          >
            <option value="Ruang Periksa Dokter Umum">Ruang Periksa Dokter Umum</option>
            <option value="Loket Kasir & Farmasi">Loket Kasir & Farmasi</option>
            <option value="Ruang Tindakan & Konseling">Ruang Tindakan & Konseling</option>
          </select>

          <button
            onClick={handleTestChime}
            title="Tes Nada Bel Antrean"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors border border-slate-700 text-xs font-bold flex items-center gap-1.5"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Tes Nada Bel</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors border border-slate-700 text-xs font-bold flex items-center gap-1.5"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Kecilkan' : 'Layar Penuh TV'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Waiting Room Big Display + Queue List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Big Screen Card (7 Cols) */}
        <div className="lg:col-span-7 bg-gradient-to-b from-slate-900 to-slate-950 text-white p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="text-xs font-black tracking-widest text-sky-400 uppercase">
                Antrean Sedang Dipanggil
              </span>
              <span className="text-xs font-bold text-slate-300 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
                Tujuan: {selectedDestination}
              </span>
            </div>

            <div className="text-center py-10 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Nomor Tiket Antrean
              </span>
              <div className="font-mono font-black text-7xl sm:text-9xl text-amber-400 tracking-wider drop-shadow-md select-all">
                {currentPatient ? currentPatient.nomor : '---'}
              </div>

              <div className="pt-2">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {currentPatient ? currentPatient.name : 'Belum Ada Antrean'}
                </h3>
                {currentPatient && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-3">
                    <span>RM: <strong className="text-sky-300">{currentPatient.rmId}</strong></span>
                    <span>·</span>
                    <span>Poli: <strong className="text-emerald-300">{currentPatient.serviceType}</strong></span>
                    <span>·</span>
                    <span>Status: <strong className="text-amber-300">{currentPatient.status}</strong></span>
                  </p>
                )}
              </div>

              {currentPatient?.vital && (
                <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 mt-2 font-mono">
                  <span>TD: {currentPatient.vital.td} mmHg</span>
                  <span>·</span>
                  <span>Suhu: {currentPatient.vital.suhu}°C</span>
                  <span>·</span>
                  <span>SpO2: {currentPatient.vital.spo2}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Call Buttons */}
          <div className="pt-6 border-t border-slate-800 flex flex-wrap gap-3">
            <button
              onClick={() => currentPatient && handleCallVoice(currentPatient)}
              disabled={!currentPatient || isCalling}
              className="flex-1 min-w-[200px] py-4 px-6 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              <Volume2 className={`w-5 h-5 ${isCalling ? 'animate-bounce' : ''}`} />
              <span>{isCalling ? 'Sedang Memanggil...' : 'Panggil Antrean (Voice Caller)'}</span>
            </button>

            <button
              onClick={() => {
                if (currentPatient) {
                  onUpdateQueueStatus(currentPatient.nomor, 'Selesai');
                  onCallNext();
                }
              }}
              disabled={queue.length === 0}
              className="py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Selesai & Lanjut</span>
            </button>

            <button
              onClick={onCallNext}
              disabled={queue.length <= 1}
              className="py-4 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-xs transition-colors border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
            >
              <SkipForward className="w-4 h-4" />
              <span>Lewati</span>
            </button>
          </div>
        </div>

        {/* Right Queue List (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <h3 className="font-extrabold text-sm text-slate-800">Daftar Antrean Hari Ini</h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                Total: {queue.length} Pasien
              </span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {queue.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <User className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-medium">Belum ada pasien dalam antrean hari ini.</p>
                </div>
              ) : (
                queue.map((item) => {
                  const isCurrent = item.nomor === currentPatient?.nomor;
                  return (
                    <div
                      key={item.nomor}
                      className={`p-3 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-sky-800">
                            {item.nomor}
                          </span>
                          <span className="font-bold text-xs text-slate-800 truncate max-w-[140px]">
                            {item.name}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            item.status === 'Diperiksa'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : item.status === 'Farmasi'
                              ? 'bg-purple-100 text-purple-800'
                              : item.status === 'Selesai'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
                        <span>Check-in: {item.checkinTime}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCallVoice(item)}
                            title="Panggil pasien ini secara spesifik"
                            className="px-2 py-0.5 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-[10px] font-bold transition-colors flex items-center gap-1"
                          >
                            <Volume2 className="w-3 h-3" /> Panggil
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Running Text Info Bar */}
          <div className="mt-4 p-3 bg-slate-900 text-slate-300 rounded-2xl text-xs flex items-center gap-3 overflow-hidden border border-slate-800">
            <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="overflow-hidden whitespace-nowrap">
              <span className="inline-block animate-marquee font-medium">
                Selamat Datang di Apotek & Praktek Dokter Latisha Farma · Mohon persiapkan KTP / Kartu Berobat saat dipanggil · Jam Praktek: 08.00 - 21.00 WIB · Melayani Resep Dokter, Konsultasi, Pemeriksaan Fisik & Obat Lengkap.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
