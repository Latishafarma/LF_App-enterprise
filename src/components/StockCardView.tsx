import React, { useState, useMemo } from 'react';
import { ClipboardList, Printer, Search, Calendar, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Medicine, StockMutation } from '../types';
import { useFacilityProfiles, formatPharmacyAddress } from './PharmacySettingsModal';
import { openPrintWindow } from '../utils/printHelper';

interface StockCardViewProps {
  medicines: Medicine[];
  stockMutations: StockMutation[];
}

export const StockCardView: React.FC<StockCardViewProps> = ({
  medicines,
  stockMutations
}) => {
  const { pharmacyProfile, apjProfile } = useFacilityProfiles();
  const pharmacyFullAddress = formatPharmacyAddress(pharmacyProfile);
  const [selectedMedId, setSelectedMedId] = useState<string>(medicines[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const selectedMed = medicines.find((m) => m.id === selectedMedId) || medicines[0];

  const filteredMutations = useMemo(() => {
    return stockMutations.filter((m) => {
      if (m.medicineId !== selectedMedId) return false;
      if (startDate && m.date < startDate) return false;
      if (endDate && m.date > endDate) return false;
      return true;
    });
  }, [stockMutations, selectedMedId, startDate, endDate]);

  const totalIn = filteredMutations.reduce((acc, m) => acc + m.inQty, 0);
  const totalOut = filteredMutations.reduce((acc, m) => acc + m.outQty, 0);

  const handlePrint = () => {
    openPrintWindow('kartu-stok', {
      medId: selectedMedId,
      startDate,
      endDate
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter & Medicine Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
              Pilih Obat
            </label>
            <select
              value={selectedMedId}
              onChange={(e) => setSelectedMedId(e.target.value)}
              className="p-2 border rounded-xl bg-white font-bold text-xs text-slate-800 outline-none"
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.stock} {m.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 border rounded-xl bg-white text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 border rounded-xl bg-white text-xs font-bold"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Kartu Stok Resmi</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Total Mutasi Masuk
          </span>
          <div className="font-mono font-black text-xl text-emerald-600 mt-1 flex items-center gap-1">
            <ArrowDownRight className="w-5 h-5" /> +{totalIn} {selectedMed?.unit}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Total Mutasi Keluar
          </span>
          <div className="font-mono font-black text-xl text-rose-600 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-5 h-5" /> -{totalOut} {selectedMed?.unit}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Saldo Fisik Saat Ini
          </span>
          <div className="font-mono font-black text-xl text-sky-800 mt-1">
            {selectedMed?.stock} {selectedMed?.unit}
          </div>
        </div>
      </div>

      {/* Printable Card Container */}
      <div
        id="printable-section"
        className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4 text-xs text-slate-800"
      >
        <div className="border-b-2 border-slate-900 pb-3">
          <div className="flex items-center justify-between gap-4">
            {pharmacyProfile.logoUrl ? (
              <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                <img
                  src={pharmacyProfile.logoUrl}
                  alt="Logo Faskes"
                  className="w-14 h-14 object-contain"
                />
              </div>
            ) : (
              <div className="w-14 shrink-0" />
            )}
            <div className="flex-1 text-center">
              <h2 className="font-black text-base text-slate-900 uppercase">
                {pharmacyProfile.name}
              </h2>
              <p className="text-[11px] text-slate-600 font-medium">
                {pharmacyFullAddress} · Telp: {pharmacyProfile.phone} · SIA: {pharmacyProfile.sia}
              </p>
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wide mt-1">
                KARTU STOK RESMI FARMASI (FEFO AUDIT LEDGER)
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">
                Nama Obat: <strong className="text-slate-900">{selectedMed?.name}</strong> · Batch:{' '}
                <strong className="text-slate-900">{selectedMed?.batchNo}</strong> · Exp Date:{' '}
                <strong className="text-slate-900">{selectedMed?.expDate}</strong> · Lokasi:{' '}
                <strong className="text-slate-900">{selectedMed?.rack}</strong>
              </p>
            </div>
            <div className="w-14 shrink-0" />
          </div>
        </div>

        <table className="w-full text-left text-xs border border-collapse">
          <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
            <tr>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">No. Referensi</th>
              <th className="p-2 border">Jenis Mutasi</th>
              <th className="p-2 border text-center w-20">Masuk</th>
              <th className="p-2 border text-center w-20">Keluar</th>
              <th className="p-2 border text-center w-24">Saldo Akhir</th>
              <th className="p-2 border">Keterangan</th>
              <th className="p-2 border">Petugas</th>
            </tr>
          </thead>
          <tbody className="divide-y font-medium text-slate-700">
            {filteredMutations.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                  Belum ada catatan mutasi pergerakan stok untuk obat ini pada periode yang dipilih.
                </td>
              </tr>
            ) : (
              filteredMutations.map((m) => (
                <tr key={m.id} className="border-b hover:bg-slate-50">
                  <td className="p-2 border font-mono">{m.date}</td>
                  <td className="p-2 border font-mono font-bold text-sky-700">{m.refNo}</td>
                  <td className="p-2 border">
                    <span className="font-bold text-[10px] uppercase">{m.type}</span>
                  </td>
                  <td className="p-2 border text-center font-mono font-bold text-emerald-600">
                    {m.inQty > 0 ? `+${m.inQty}` : '-'}
                  </td>
                  <td className="p-2 border text-center font-mono font-bold text-rose-600">
                    {m.outQty > 0 ? `-${m.outQty}` : '-'}
                  </td>
                  <td className="p-2 border text-center font-mono font-black text-slate-900 bg-slate-50">
                    {m.balance}
                  </td>
                  <td className="p-2 border text-slate-600 text-[11px]">{m.ket}</td>
                  <td className="p-2 border text-slate-500 font-mono text-[10px]">{m.petugas}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="grid grid-cols-2 pt-6 text-xs">
          <div />
          <div className="text-center space-y-12">
            <p className="font-semibold text-slate-700">
              {pharmacyProfile.city}, {new Date().toLocaleDateString('id-ID')}<br />
              Apoteker Penanggung Jawab (APJ),
            </p>
            <div>
              <p className="font-extrabold underline text-slate-900">{apjProfile.name}</p>
              <p className="text-[10px] text-slate-600 font-mono">SIPA: {apjProfile.sipa}</p>
              <p className="text-[10px] text-slate-500 font-mono">STRA: {apjProfile.stra}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
