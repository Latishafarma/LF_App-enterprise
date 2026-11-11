import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Users,
  Activity,
  Baby,
  Printer,
  Calendar,
  Search,
  Stethoscope
} from 'lucide-react';
import { RMERecord } from '../types';
import { openPrintWindow } from '../utils/printHelper';
import { useFacilityProfiles, formatPharmacyAddress } from './PharmacySettingsModal';

interface RMEReportsViewProps {
  rmeRecords: RMERecord[];
}

export const RMEReportsView: React.FC<RMEReportsViewProps> = ({ rmeRecords }) => {
  const { pharmacyProfile, apjProfile, dpjProfile } = useFacilityProfiles();
  const pharmacyFullAddress = formatPharmacyAddress(pharmacyProfile);

  const [reportType, setReportType] = useState<'KUNJUNGAN' | 'KASUS'>('KUNJUNGAN');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Filter Kunjungan
  const filteredKunjungan = useMemo(() => {
    return rmeRecords.filter((ex) => {
      const matchDate = (!startDate || ex.date >= startDate) && (!endDate || ex.date <= endDate);
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        ex.patientName.toLowerCase().includes(q) ||
        ex.rmId.toLowerCase().includes(q) ||
        ex.soapA.toLowerCase().includes(q);
      return matchDate && matchSearch;
    });
  }, [rmeRecords, startDate, endDate, searchQuery]);

  // Filter Kasus
  const filteredKasus = useMemo(() => {
    return rmeRecords.filter((ex) => {
      const matchDate = (!startDate || ex.date >= startDate) && (!endDate || ex.date <= endDate);
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        ex.soapA.toLowerCase().includes(q) ||
        ex.icdCode.toLowerCase().includes(q);
      return matchDate && matchSearch;
    });
  }, [rmeRecords, startDate, endDate, searchQuery]);

  // Filter Anak (Pediatrik 0-18 tahun)
  const filteredAnak = useMemo(() => {
    return rmeRecords.filter((ex) => {
      const isPediatric = ex.age >= 0 && ex.age <= 18;
      const matchDate = (!startDate || ex.date >= startDate) && (!endDate || ex.date <= endDate);
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        ex.patientName.toLowerCase().includes(q) ||
        ex.rmId.toLowerCase().includes(q);
      return isPediatric && matchDate && matchSearch;
    });
  }, [rmeRecords, startDate, endDate, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Filter Buttons */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
            Laporan Rekam Medis & Epidemiologi Penyakit
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekapitulasi kunjungan dan distribusi diagnosa ICD-10.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setReportType('KUNJUNGAN')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              reportType === 'KUNJUNGAN'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1. Rekap Kunjungan</span>
          </button>

          <button
            onClick={() => setReportType('KASUS')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              reportType === 'KASUS'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>2. Kasus ICD-10</span>
          </button>
        </div>
      </div>

      {/* Date Range & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs">
        <div className="sm:col-span-5">
          <label className="block font-bold text-slate-700 mb-1">
            Pencarian Otomatis
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={
                reportType === 'KASUS'
                  ? 'Ketik nama penyakit atau kode ICD-10...'
                  : 'Ketik nama pasien atau no RM...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-xl font-semibold bg-slate-50 focus:bg-white outline-none"
            />
          </div>
        </div>

        <div className="sm:col-span-3">
          <label className="block font-bold text-slate-700 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border rounded-xl font-bold bg-slate-50"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="block font-bold text-slate-700 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border rounded-xl font-bold bg-slate-50"
          />
        </div>

        <div className="sm:col-span-1">
          <button
            onClick={() => {
              try {
                localStorage.setItem(
                  'latisha_active_print_morbiditas',
                  JSON.stringify({
                    reportType,
                    startDate,
                    endDate,
                    kunjungan: filteredKunjungan,
                    kasus: filteredKasus,
                    anak: filteredAnak
                  })
                );
              } catch {}
              openPrintWindow('laporan-morbiditas', {
                reportType,
                startDate,
                endDate
              });
            }}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-bold transition shadow-sm flex items-center justify-center gap-1 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Printable Report Output */}
      <div
        id="printable-section"
        className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 text-slate-900"
      >
        {/* Kop Surat Terintegrasi Profil Apotek, APJ, dan DPJ */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between gap-4">
            {pharmacyProfile.logoUrl ? (
              <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                <img
                  src={pharmacyProfile.logoUrl}
                  alt="Logo Faskes"
                  className="w-16 h-16 object-contain"
                />
              </div>
            ) : (
              <div className="w-16 shrink-0" />
            )}
            <div className="flex-1 text-center">
              <h2 className="font-black text-base text-slate-900 uppercase tracking-wider">
                {pharmacyProfile.name}
              </h2>
              <p className="text-[11px] text-slate-700 font-medium mt-0.5">
                {pharmacyFullAddress} · Telepon / WA: {pharmacyProfile.phone} · Email: {pharmacyProfile.email}
              </p>
              <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                SIA: <strong>{pharmacyProfile.sia}</strong> · NIB: {pharmacyProfile.nib} · APJ: <strong>{apjProfile.name}</strong> (SIPA: {apjProfile.sipa})
              </p>
              <p className="text-[10px] text-emerald-800 font-mono font-bold mt-0.5">
                Dokter Penanggung Jawab (DPJ): {dpjProfile.name} · SIP: {dpjProfile.sip} · {dpjProfile.idi}
              </p>
            </div>
            <div className="w-16 shrink-0" />
          </div>
          <div className="text-center">
            <div className="mt-3 inline-block px-4 py-1 bg-sky-100 text-sky-900 rounded-full font-black text-xs uppercase">
              {reportType === 'KUNJUNGAN' && 'LAPORAN REKAPITULASI KUNJUNGAN PASIEN'}
              {reportType === 'KASUS' && 'LAPORAN DISTRIBUSI KASUS & DIAGNOSA (ICD-10)'}
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              Periode: {startDate} s.d. {endDate}
            </p>
          </div>
        </div>

        {/* Kartu Profil DPJ (Dokter Penanggung Jawab) untuk Dokumen Laporan Medis */}
        <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex flex-wrap justify-between items-center gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                Dokter Penanggung Jawab (DPJ) Layanan Medis
              </span>
              <div className="font-black text-slate-900 text-xs mt-0.5">
                {dpjProfile.name} <span className="font-semibold text-emerald-800">({dpjProfile.specialization})</span>
              </div>
              <div className="font-mono text-[10px] text-slate-700 mt-0.5">
                SIP: <strong>{dpjProfile.sip}</strong> · {dpjProfile.idi} · Telp: {dpjProfile.phone}
              </div>
            </div>
          </div>
          <div className="text-right font-mono text-[10px] text-emerald-950 bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
            <span className="text-[9px] font-sans font-bold uppercase text-slate-400 block">Jadwal Praktik DPJ</span>
            <strong>{dpjProfile.schedule}</strong>
          </div>
        </div>

        {/* Tab 1: Kunjungan */}
        {reportType === 'KUNJUNGAN' && (
          <div className="space-y-3">
            <table className="w-full text-left text-xs border border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold border">
                  <th className="p-2 border text-center w-10">No</th>
                  <th className="p-2 border w-24">Tanggal</th>
                  <th className="p-2 border w-24">No. RM</th>
                  <th className="p-2 border">Nama Pasien</th>
                  <th className="p-2 border text-center w-16">Umur</th>
                  <th className="p-2 border">Diagnosa Utama</th>
                  <th className="p-2 border w-32">Dokter</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-700">
                {filteredKunjungan.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                      Tidak ada data kunjungan pada periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredKunjungan.map((item, idx) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-2 border text-center">{idx + 1}</td>
                      <td className="p-2 border font-mono">{item.date}</td>
                      <td className="p-2 border font-mono font-bold text-sky-700">{item.rmId}</td>
                      <td className="p-2 border font-bold text-slate-900">{item.patientName}</td>
                      <td className="p-2 border text-center">{item.age} thn</td>
                      <td className="p-2 border font-semibold">{item.soapA}</td>
                      <td className="p-2 border">{item.doctorName || dpjProfile.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="text-right text-xs font-bold text-slate-700 pt-2">
              Total Pasien Terlayani: <span className="text-sky-700 font-black">{filteredKunjungan.length} Orang</span>
            </div>
          </div>
        )}

        {/* Tab 2: Kasus */}
        {reportType === 'KASUS' && (
          <div className="space-y-3">
            <table className="w-full text-left text-xs border border-collapse">
              <thead>
                <tr className="bg-slate-100 font-bold border">
                  <th className="p-2 border text-center w-10">No</th>
                  <th className="p-2 border w-24 text-center">Kode ICD-10</th>
                  <th className="p-2 border">Deskripsi Diagnosis Penyakit</th>
                  <th className="p-2 border w-24 text-center">Tanggal</th>
                  <th className="p-2 border">Pasien</th>
                  <th className="p-2 border">Terapi yang Diberikan</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-700">
                {filteredKasus.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                      Tidak ditemukan kasus penyakit sesuai kriteria filter.
                    </td>
                  </tr>
                ) : (
                  filteredKasus.map((item, idx) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-2 border text-center">{idx + 1}</td>
                      <td className="p-2 border text-center font-mono font-black text-indigo-700">
                        {item.icdCode}
                      </td>
                      <td className="p-2 border font-bold">{item.soapA}</td>
                      <td className="p-2 border text-center font-mono">{item.date}</td>
                      <td className="p-2 border">{item.patientName} ({item.rmId})</td>
                      <td className="p-2 border text-[11px]">
                        {item.prescription?.map((p) => `${p.name} (${p.qty})`).join(', ') || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="text-right text-xs font-bold text-slate-700 pt-2">
              Total Kasus: <span className="text-sky-700 font-black">{filteredKasus.length} Kasus</span>
            </div>
          </div>
        )}

        {/* Signature Area Terintegrasi Profil DPJ & APJ */}
        <div className="grid grid-cols-2 pt-8 text-xs">
          <div className="text-center space-y-12">
            <p className="font-semibold text-slate-700">
              Mengetahui,<br />
              Apoteker Penanggung Jawab (APJ),
            </p>
            <div>
              <p className="font-extrabold underline text-slate-900">{apjProfile.name}</p>
              <p className="text-[10px] text-slate-600 font-mono">SIPA: {apjProfile.sipa}</p>
              <p className="text-[10px] text-slate-500 font-mono">STRA: {apjProfile.stra}</p>
            </div>
          </div>
          <div className="text-center space-y-12">
            <p className="font-semibold text-slate-700">
              {pharmacyProfile.city}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
              Dokter Penanggung Jawab Klinis (DPJ),
            </p>
            <div>
              <p className="font-extrabold underline text-slate-900">{dpjProfile.name}</p>
              <p className="text-[10px] text-slate-600 font-mono">SIP: {dpjProfile.sip}</p>
              <p className="text-[10px] text-slate-500 font-mono">{dpjProfile.idi}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
