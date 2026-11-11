import React, { useState, useMemo } from 'react';
import {
  Smartphone,
  Stethoscope,
  Boxes,
  Volume2,
  Search,
  User,
  HeartPulse,
  Send,
  CheckCircle,
  Pill,
  ArrowLeft,
  AlertTriangle,
  ClipboardCheck,
  Check,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Save,
  Filter,
  CheckCheck,
  Building,
  TrendingDown,
  TrendingUp,
  FileCheck2,
  RefreshCw,
  X
} from 'lucide-react';
import { Patient, Medicine, PatientQueue, RMERecord, Transaction } from '../types';
import { announceQueueVoice } from '../utils/audio';

interface MobileFieldStaffViewProps {
  patients: Patient[];
  medicines: Medicine[];
  queue: PatientQueue[];
  transactions?: Transaction[];
  onApplyStockOpname?: (
    adjustments: {
      medicineId: string;
      medicineName: string;
      finalStock: number;
      difference: number;
      reason: string;
    }[]
  ) => void;
  onCloseMobileMode: () => void;
  onSaveMobileRME: (record: RMERecord) => void;
  staffName?: string;
}

export const MobileFieldStaffView: React.FC<MobileFieldStaffViewProps> = ({
  patients,
  medicines,
  queue,
  transactions = [],
  onApplyStockOpname,
  onCloseMobileMode,
  onSaveMobileRME,
  staffName = 'dr. Anis Prima Dewi (Home Visit)'
}) => {
  // Mobile Tab: default to 'stokopname' as requested by user
  const [mobileTab, setMobileTab] = useState<'stokopname' | 'cekstok' | 'homevisit' | 'antrean'>('stokopname');
  
  // ================= STOK OPNAME (LIVE) STATE =================
  const [sessionStartTime] = useState<string>(() => new Date().toISOString());
  const [opnameSearch, setOpnameSearch] = useState('');
  const [selectedRack, setSelectedRack] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNCOUNTED' | 'COUNTED' | 'DIFF'>('ALL');
  
  // Physical count storage: { [medicineId]: { physicalStock: string; notes: string } }
  const [mobileCounts, setMobileCounts] = useState<Record<string, { physicalStock: string; notes: string }>>({});
  const [showPostingConfirmModal, setShowPostingConfirmModal] = useState(false);
  const [postingSuccessMessage, setPostingSuccessMessage] = useState<string | null>(null);

  // List of unique racks
  const availableRacks = useMemo(() => {
    const set = new Set(medicines.map((m) => m.rack).filter(Boolean));
    return Array.from(set);
  }, [medicines]);

  // Live sales map during this opname session from POS transactions
  const liveSalesMap = useMemo(() => {
    const sessionDate = new Date(sessionStartTime);
    const map: Record<string, number> = {};

    transactions.forEach((trx) => {
      if (trx.status !== 'Dibatalkan' && trx.status !== 'Diretur') {
        const trxDate = new Date(trx.date);
        const isAfterSession = !isNaN(trxDate.getTime())
          ? trxDate >= sessionDate
          : trx.date >= sessionStartTime.slice(0, 10);

        if (isAfterSession) {
          trx.items?.forEach((item) => {
            if (item.id) {
              map[item.id] = (map[item.id] || 0) + (item.qty || 0);
            }
          });
        }
      }
    });

    return map;
  }, [transactions, sessionStartTime]);

  // Handle count change
  const handleCountChange = (medId: string, val: string) => {
    setMobileCounts((prev) => ({
      ...prev,
      [medId]: {
        physicalStock: val,
        notes: prev[medId]?.notes || ''
      }
    }));
  };

  // Adjust count by step (+1, -1, +5, etc.)
  const handleStepCount = (medId: string, step: number, currentSystemStock: number) => {
    const currentValStr = mobileCounts[medId]?.physicalStock;
    const currentNum = currentValStr !== undefined && currentValStr !== ''
      ? parseFloat(currentValStr) || 0
      : currentSystemStock;
    const nextVal = Math.max(0, currentNum + step);
    handleCountChange(medId, String(nextVal));
  };

  // Quick Match with System
  const handleMatchWithSystem = (med: Medicine) => {
    handleCountChange(med.id, String(med.stock));
  };

  // Reset count for single med
  const handleResetCount = (medId: string) => {
    setMobileCounts((prev) => {
      const copy = { ...prev };
      delete copy[medId];
      return copy;
    });
  };

  // Reconciled items for mobile
  const reconciledItems = useMemo(() => {
    return medicines.map((med) => {
      const liveSales = liveSalesMap[med.id] || 0;
      const systemStock = med.stock;
      const countState = mobileCounts[med.id];
      const hasCounted = countState !== undefined && countState.physicalStock !== '';
      const parsedPhysical = hasCounted ? parseFloat(countState.physicalStock) || 0 : systemStock;

      const difference = hasCounted ? parsedPhysical - systemStock : 0;
      const diffHpp = difference * med.hpp;

      let status: 'MATCH' | 'SURPLUS' | 'DEFICIT' | 'UNCOUNTED' = 'UNCOUNTED';
      if (hasCounted) {
        if (difference === 0) status = 'MATCH';
        else if (difference > 0) status = 'SURPLUS';
        else status = 'DEFICIT';
      }

      return {
        ...med,
        systemStock,
        liveSales,
        hasCounted,
        physicalStock: parsedPhysical,
        rawPhysicalInput: countState?.physicalStock ?? '',
        notes: countState?.notes || '',
        difference,
        diffHpp,
        status
      };
    });
  }, [medicines, mobileCounts, liveSalesMap]);

  // Filtered items based on search, rack, and status
  const filteredOpnameItems = useMemo(() => {
    return reconciledItems.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(opnameSearch.toLowerCase()) ||
        item.barcode.includes(opnameSearch) ||
        (item.rack && item.rack.toLowerCase().includes(opnameSearch.toLowerCase()));

      const matchRack = selectedRack === 'ALL' || item.rack === selectedRack;

      let matchStatus = true;
      if (statusFilter === 'UNCOUNTED') matchStatus = !item.hasCounted;
      if (statusFilter === 'COUNTED') matchStatus = item.hasCounted;
      if (statusFilter === 'DIFF') matchStatus = item.hasCounted && item.difference !== 0;

      return matchSearch && matchRack && matchStatus;
    });
  }, [reconciledItems, opnameSearch, selectedRack, statusFilter]);

  // Opname KPI summary metrics
  const opnameMetrics = useMemo(() => {
    const totalItems = medicines.length;
    const countedItems = reconciledItems.filter((i) => i.hasCounted).length;
    const matchCount = reconciledItems.filter((i) => i.hasCounted && i.difference === 0).length;
    const diffItems = reconciledItems.filter((i) => i.hasCounted && i.difference !== 0);
    const deficitCount = diffItems.filter((i) => i.difference < 0).length;
    const surplusCount = diffItems.filter((i) => i.difference > 0).length;
    const totalDiffHpp = diffItems.reduce((acc, curr) => acc + curr.diffHpp, 0);

    return {
      totalItems,
      countedItems,
      matchCount,
      diffCount: diffItems.length,
      deficitCount,
      surplusCount,
      totalDiffHpp
    };
  }, [medicines.length, reconciledItems]);

  // Execute Posting Opname from Mobile
  const handleExecutePostingOpname = () => {
    if (!onApplyStockOpname) {
      alert('Fungsi posting stok opname belum terhubung.');
      return;
    }

    const countedItems = reconciledItems.filter((i) => i.hasCounted);
    if (countedItems.length === 0) {
      alert('Belum ada item obat yang dihitung. Silakan masukkan hasil hitung fisik terlebih dahulu.');
      return;
    }

    const adjustments = countedItems.map((item) => ({
      medicineId: item.id,
      medicineName: item.name,
      finalStock: item.physicalStock,
      difference: item.difference,
      reason: item.notes || (item.difference === 0 ? 'Stok opname cocok' : `Penyesuaian SO Mobile (${item.difference > 0 ? '+' : ''}${item.difference} ${item.unit})`)
    }));

    onApplyStockOpname(adjustments);
    setShowPostingConfirmModal(false);
    setPostingSuccessMessage(`Berhasil memposting ${adjustments.length} item stok opname dari perangkat mobile!`);
    setTimeout(() => {
      setPostingSuccessMessage(null);
    }, 4000);
  };

  // ================= HOME VISIT STATE =================
  const [searchPatient, setSearchPatient] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patients[0] || null);
  const [td, setTd] = useState('120/80');
  const [suhu, setSuhu] = useState('36.5');
  const [nadi, setNadi] = useState('80');
  const [spo2, setSpo2] = useState('98');
  const [gds, setGds] = useState('110');
  const [soapS, setSoapS] = useState('');
  const [soapA, setSoapA] = useState('J00 - Common Cold');

  // ================= CEK STOK CEPAT STATE =================
  const [stockSearch, setStockSearch] = useState('');

  const currentQueuePatient = queue[0] || null;

  const handleSaveHomeVisit = () => {
    if (!selectedPatient) return;

    const newRecord: RMERecord = {
      id: `RME-HV-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      rmId: selectedPatient.id,
      patientName: selectedPatient.name,
      nik: selectedPatient.nik,
      age: selectedPatient.age,
      gender: selectedPatient.gender,
      doctorName: staffName,
      doctorId: 'DOC-001',
      vitalSign: {
        td,
        suhu: parseFloat(suhu) || 36.5,
        nadi: parseInt(nadi) || 80,
        spo2: parseInt(spo2) || 98
      },
      soapS: soapS || 'Kunjungan home visit medis ke rumah pasien.',
      soapO: `TD: ${td}, Suhu: ${suhu}C, Nadi: ${nadi}, GDS: ${gds} mg/dL`,
      soapA,
      icdCode: 'J00',
      icdName: soapA,
      prescription: [],
      doctorFee: 35000,
      medicalSupportFee: 15000,
      adminFee: 0,
      notes: 'Pemeriksaan rawat jalan luar gedung (Home Care)',
      branchId: 'BR-01'
    };

    onSaveMobileRME(newRecord);
    alert(`Rekam Medis Home Visit untuk ${selectedPatient.name} berhasil disimpan!`);
    setSoapS('');
  };

  const filteredMeds = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
      m.barcode.includes(stockSearch)
  );

  return (
    <div className="max-w-md mx-auto bg-slate-100 min-h-[780px] rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col font-sans relative">
      {/* Mobile Smartphone Header */}
      <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between shadow-md shrink-0">
        <button
          onClick={onCloseMobileMode}
          className="flex items-center gap-1 text-xs text-sky-400 font-bold hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div className="text-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
            Aplikasi Lapangan & Mobile
          </span>
          <span className="font-extrabold text-xs text-white flex items-center justify-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
            Latisha Mobile
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-mono font-bold">ONLINE</span>
        </div>
      </div>

      {/* Staff ID & Live Opname Active Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-900 to-indigo-900 text-white px-3.5 py-2 text-xs flex justify-between items-center border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-sky-300" />
          <span className="font-bold truncate max-w-[190px] text-[11px]">{staffName}</span>
        </div>
        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Opname Live Aktif
        </span>
      </div>

      {/* Success Notification Banner */}
      {postingSuccessMessage && (
        <div className="bg-emerald-600 text-white p-3 text-xs font-bold flex items-center justify-between shadow-md animate-fade-in shrink-0">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-4 h-4 shrink-0" />
            <span>{postingSuccessMessage}</span>
          </div>
          <button onClick={() => setPostingSuccessMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Navigation Tabs */}
      <div className="grid grid-cols-4 bg-white border-b text-[11px] font-bold shrink-0">
        <button
          onClick={() => setMobileTab('stokopname')}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition ${
            mobileTab === 'stokopname'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardCheck className={`w-4 h-4 ${mobileTab === 'stokopname' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Opname Live</span>
        </button>

        <button
          onClick={() => setMobileTab('cekstok')}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition ${
            mobileTab === 'cekstok'
              ? 'border-sky-600 text-sky-700 bg-sky-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className={`w-4 h-4 ${mobileTab === 'cekstok' ? 'text-sky-600' : 'text-slate-400'}`} />
          <span>Cek Stok</span>
        </button>

        <button
          onClick={() => setMobileTab('homevisit')}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition ${
            mobileTab === 'homevisit'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HeartPulse className={`w-4 h-4 ${mobileTab === 'homevisit' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Home Care</span>
        </button>

        <button
          onClick={() => setMobileTab('antrean')}
          className={`py-2.5 flex flex-col items-center gap-1 border-b-2 transition ${
            mobileTab === 'antrean'
              ? 'border-amber-600 text-amber-700 bg-amber-50/60'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Volume2 className={`w-4 h-4 ${mobileTab === 'antrean' ? 'text-amber-600' : 'text-slate-400'}`} />
          <span>Panggil</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs custom-scrollbar">
        {/* ================= TAB 1: STOK OPNAME (LIVE) ================= */}
        {mobileTab === 'stokopname' && (
          <div className="space-y-3">
            {/* Live Counter Info Pill */}
            <div className="p-3 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white rounded-2xl shadow-sm border border-emerald-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Stok Opname Tanpa Tutup Apotek</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded-full">
                  Live Sync
                </span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed">
                Kasir tetap bebas bertransaksi. Penjualan aktif otomatis dihitung secara *real-time* sehingga stok akhir apotek tetap akurat 100%.
              </p>

              {/* Opname Mini KPIs */}
              <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-800 text-center font-mono">
                <div className="bg-slate-800/70 p-1.5 rounded-xl">
                  <span className="text-[9px] text-slate-400 block font-sans">Dihitung</span>
                  <strong className="text-white text-xs">{opnameMetrics.countedItems}/{opnameMetrics.totalItems}</strong>
                </div>
                <div className="bg-slate-800/70 p-1.5 rounded-xl">
                  <span className="text-[9px] text-emerald-400 block font-sans">Cocok</span>
                  <strong className="text-emerald-400 text-xs">{opnameMetrics.matchCount}</strong>
                </div>
                <div className="bg-slate-800/70 p-1.5 rounded-xl">
                  <span className="text-[9px] text-rose-400 block font-sans">Kurang</span>
                  <strong className="text-rose-400 text-xs">{opnameMetrics.deficitCount}</strong>
                </div>
                <div className="bg-slate-800/70 p-1.5 rounded-xl">
                  <span className="text-[9px] text-sky-400 block font-sans">Lebih</span>
                  <strong className="text-sky-400 text-xs">{opnameMetrics.surplusCount}</strong>
                </div>
              </div>
            </div>

            {/* Search & Rack Filter Row */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari obat / barcode rak..."
                  value={opnameSearch}
                  onChange={(e) => setOpnameSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-xs outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
              </div>

              <div className="flex gap-2 items-center">
                <select
                  value={selectedRack}
                  onChange={(e) => setSelectedRack(e.target.value)}
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-xl font-bold text-[11px] text-slate-700 outline-none shadow-xs"
                >
                  <option value="ALL">Semua Lokasi Rak ({availableRacks.length})</option>
                  {availableRacks.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-36 p-2 bg-white border border-slate-200 rounded-xl font-bold text-[11px] text-slate-700 outline-none shadow-xs"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="UNCOUNTED">Belum Dihitung</option>
                  <option value="COUNTED">Sudah Dihitung</option>
                  <option value="DIFF">Ada Selisih</option>
                </select>
              </div>
            </div>

            {/* List of Medicines for Stock Opname */}
            <div className="space-y-2.5 pb-20">
              {filteredOpnameItems.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                  <Boxes className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-600 text-xs">Tidak ada obat yang cocok dengan filter.</p>
                  <button
                    onClick={() => {
                      setOpnameSearch('');
                      setSelectedRack('ALL');
                      setStatusFilter('ALL');
                    }}
                    className="text-[11px] text-emerald-600 font-bold underline"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                filteredOpnameItems.map((med) => {
                  const isCounted = med.hasCounted;
                  const diff = med.difference;

                  return (
                    <div
                      key={med.id}
                      className={`p-3 rounded-2xl border transition shadow-xs space-y-2.5 ${
                        !isCounted
                          ? 'bg-white border-slate-200'
                          : diff === 0
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : diff < 0
                          ? 'bg-rose-50/40 border-rose-200'
                          : 'bg-sky-50/40 border-sky-200'
                      }`}
                    >
                      {/* Medicine Info Header */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <h4 className="font-extrabold text-slate-900 text-xs leading-snug">
                            {med.name}
                          </h4>
                          <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                            <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded font-mono">
                              {med.rack || 'Tanpa Rak'}
                            </span>
                            <span>Batch: {med.batchNo || '-'}</span>
                            <span>Exp: {med.expDate || '-'}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {!isCounted ? (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                              Belum Dihitung
                            </span>
                          ) : diff === 0 ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Cocok
                            </span>
                          ) : diff < 0 ? (
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono">
                              <Minus className="w-3 h-3" />
                              Kurang {diff} {med.unit}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono">
                              <Plus className="w-3 h-3" />
                              Lebih +{diff} {med.unit}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Live Counter Sales Warning */}
                      {med.liveSales > 0 && (
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[10px] font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                            <span>Terjual di Kasir POS Sesi Ini:</span>
                          </span>
                          <span className="font-mono bg-amber-200/80 px-1.5 py-0.2 rounded">
                            +{med.liveSales} {med.unit}
                          </span>
                        </div>
                      )}

                      {/* Stock Comparison Grid */}
                      <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50/80 rounded-xl border border-slate-200/60 font-mono text-[11px]">
                        <div>
                          <span className="text-[9px] text-slate-500 font-sans block">Stok Sistem:</span>
                          <strong className="text-slate-800">{med.systemStock} {med.unit}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 font-sans block">Hasil Fisik:</span>
                          <strong className={isCounted ? (diff === 0 ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-400'}>
                            {isCounted ? `${med.physicalStock} ${med.unit}` : 'Belum diisi'}
                          </strong>
                        </div>
                      </div>

                      {/* Physical Stock Input Controls */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Input fisik..."
                            value={med.rawPhysicalInput}
                            onChange={(e) => handleCountChange(med.id, e.target.value)}
                            className="flex-1 p-2 bg-white border border-slate-300 rounded-xl font-mono font-extrabold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                          />

                          {/* Quick Step Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStepCount(med.id, -1, med.systemStock)}
                              className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition"
                              title="Kurang 1"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleStepCount(med.id, 1, med.systemStock)}
                              className="w-8 h-8 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition"
                              title="Tambah 1"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => handleStepCount(med.id, 5, med.systemStock)}
                              className="px-2 h-8 flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-[11px] transition"
                              title="Tambah 5"
                            >
                              +5
                            </button>
                          </div>
                        </div>

                        {/* Action Shortcuts: Match with system & Reset */}
                        <div className="flex items-center justify-between text-[10px] pt-0.5">
                          <button
                            onClick={() => handleMatchWithSystem(med)}
                            className="flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                          >
                            <CheckCheck className="w-3 h-3" />
                            <span>Sama dg Sistem ({med.systemStock})</span>
                          </button>

                          {isCounted && (
                            <button
                              onClick={() => handleResetCount(med.id)}
                              className="flex items-center gap-1 text-slate-400 hover:text-rose-600 font-medium"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Fixed Action Bar for Mobile Posting */}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl flex items-center justify-between gap-3 z-30">
              <div className="font-mono text-[11px]">
                <div className="text-[10px] text-slate-500 font-sans">Total Dihitung:</div>
                <strong className="text-slate-900 text-xs">
                  {opnameMetrics.countedItems} / {opnameMetrics.totalItems} Obat
                </strong>
                {opnameMetrics.diffCount > 0 && (
                  <span className="text-rose-600 text-[10px] font-bold block">
                    Selisih: {opnameMetrics.diffCount} item
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowPostingConfirmModal(true)}
                disabled={opnameMetrics.countedItems === 0}
                className={`py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md transition ${
                  opnameMetrics.countedItems > 0
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:from-emerald-700 hover:to-teal-800'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>Posting Hasil Opname</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 2: CEK STOK OBAT ================= */}
        {mobileTab === 'cekstok' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari obat di apotek..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border rounded-xl bg-white font-semibold outline-none"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {filteredMeds.map((m) => (
                <div key={m.id} className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex justify-between items-start">
                    <strong className="text-slate-900">{m.name}</strong>
                    <span
                      className={`font-black font-mono px-2 py-0.5 rounded-full text-[10px] ${
                        m.stock <= m.minStock ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {m.stock} {m.unit}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Lokasi: <span className="font-bold text-slate-700">{m.rack}</span> · Batch: {m.batchNo}
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t text-[11px] font-mono">
                    <span className="text-slate-500">Jual Reguler:</span>
                    <strong className="text-sky-800">Rp {m.sellPrice.toLocaleString('id-ID')}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: HOME CARE / VISIT ================= */}
        {mobileTab === 'homevisit' && (
          <div className="space-y-3.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pilih Pasien Kunjungan Rumah</label>
              <select
                value={selectedPatient?.id}
                onChange={(e) => {
                  const p = patients.find((item) => item.id === e.target.value);
                  if (p) setSelectedPatient(p);
                }}
                className="w-full p-2.5 border rounded-xl font-bold bg-white outline-none"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id} - {p.gender})
                  </option>
                ))}
              </select>
            </div>

            {selectedPatient && (
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="font-extrabold text-slate-900 text-sm">{selectedPatient.name}</div>
                <div className="text-slate-500 text-[11px] font-mono">
                  NIK: {selectedPatient.nik} · {selectedPatient.phone}
                </div>
                <div className="text-slate-600 text-[11px]">{selectedPatient.address}</div>

                {selectedPatient.allergy !== 'Tidak Ada' && (
                  <div className="mt-1 p-1.5 bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[10px] rounded-lg">
                    Alergi: {selectedPatient.allergy}
                  </div>
                )}
              </div>
            )}

            {/* Vital Signs Grid */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="font-black text-slate-700 text-[10px] uppercase">
                Input Tanda Vital Lapangan
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold">TD (mmHg)</label>
                  <input
                    type="text"
                    value={td}
                    onChange={(e) => setTd(e.target.value)}
                    className="w-full p-2 border rounded-xl font-mono font-bold bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold">Suhu (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={suhu}
                    onChange={(e) => setSuhu(e.target.value)}
                    className="w-full p-2 border rounded-xl font-mono font-bold bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold">Nadi (bpm)</label>
                  <input
                    type="number"
                    value={nadi}
                    onChange={(e) => setNadi(e.target.value)}
                    className="w-full p-2 border rounded-xl font-mono font-bold bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold">Gula Darah GDS (mg/dL)</label>
                  <input
                    type="number"
                    value={gds}
                    onChange={(e) => setGds(e.target.value)}
                    className="w-full p-2 border rounded-xl font-mono font-bold bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Anamnesis & Diagnosis */}
            <div className="space-y-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Keluhan Pasien</label>
                <textarea
                  rows={2}
                  placeholder="Kondisi pasien di rumah..."
                  value={soapS}
                  onChange={(e) => setSoapS(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Diagnosis Lapangan</label>
                <input
                  type="text"
                  value={soapA}
                  onChange={(e) => setSoapA(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold bg-white"
                />
              </div>
            </div>

            <button
              onClick={handleSaveHomeVisit}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-sky-600 text-white font-extrabold rounded-xl shadow-md uppercase tracking-wider text-xs flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Simpan RME Kunjungan Rumah</span>
            </button>
          </div>
        )}

        {/* ================= TAB 4: PANGGIL ANTREAN ================= */}
        {mobileTab === 'antrean' && (
          <div className="text-center space-y-6 py-6">
            <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-2">
              <span className="text-[10px] uppercase text-slate-400 font-bold">Antrean Sekarang</span>
              <div className="text-6xl font-black font-mono text-amber-400">
                {currentQueuePatient ? currentQueuePatient.nomor : '---'}
              </div>
              <div className="text-base font-bold text-white">
                {currentQueuePatient ? currentQueuePatient.name : 'Antrean Kosong'}
              </div>
            </div>

            <button
              onClick={() => {
                if (currentQueuePatient) {
                  announceQueueVoice(currentQueuePatient.nomor, currentQueuePatient.name, 'Ruang Periksa');
                }
              }}
              disabled={!currentQueuePatient}
              className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-2xl shadow-lg transition text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Volume2 className="w-5 h-5" />
              <span>Panggil Suara dari HP</span>
            </button>

            <div className="text-left bg-white p-4 rounded-2xl border space-y-2 text-xs">
              <span className="font-bold text-slate-700 uppercase text-[10px]">Daftar Antrean Hari Ini:</span>
              <div className="space-y-1.5">
                {queue.slice(0, 5).map((q) => (
                  <div key={q.nomor} className="flex justify-between p-2 bg-slate-50 rounded-xl">
                    <span className="font-mono font-bold text-sky-800">{q.nomor} — {q.name}</span>
                    <span className="text-[10px] font-bold text-slate-500">{q.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Posting Stock Opname */}
      {showPostingConfirmModal && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-4.5 space-y-3.5 shadow-2xl animate-fade-in border border-slate-200">
            <div className="flex items-center gap-2.5 text-emerald-800 font-extrabold text-sm border-b pb-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              <span>Konfirmasi Posting Stok Opname</span>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              Anda akan memposting hasil hitung fisik untuk{' '}
              <strong className="text-slate-900">{opnameMetrics.countedItems} item obat</strong>.
              Sistem akan otomatis memperbarui master stok dan mencatat kartu mutasi stok (FEFO).
            </p>

            <div className="p-3 bg-slate-50 rounded-2xl border space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Item Cocok:</span>
                <strong className="text-emerald-700">{opnameMetrics.matchCount} item</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Item Selisih Kurang:</span>
                <strong className="text-rose-700">{opnameMetrics.deficitCount} item</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Item Selisih Lebih:</span>
                <strong className="text-sky-700">{opnameMetrics.surplusCount} item</strong>
              </div>
              <div className="flex justify-between pt-1 border-t text-xs">
                <span className="text-slate-600 font-bold">Nilai Selisih HPP:</span>
                <strong className={opnameMetrics.totalDiffHpp < 0 ? 'text-rose-700' : 'text-emerald-700'}>
                  Rp {Math.round(opnameMetrics.totalDiffHpp).toLocaleString('id-ID')}
                </strong>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowPostingConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleExecutePostingOpname}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Posting Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
