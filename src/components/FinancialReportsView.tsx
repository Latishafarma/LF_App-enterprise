import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Boxes,
  Truck,
  Printer,
  Calendar,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Users,
  CheckCircle2,
  UserCheck,
  Award,
  Filter,
  Stethoscope,
  RotateCcw,
  ClipboardCheck
} from 'lucide-react';
import {
  Transaction,
  Medicine,
  PurchaseInvoice,
  RMERecord,
  Doctor,
  Staff,
  StaffFeeItem,
  StockOpnameRecord,
  StockOpnameItemRecord,
  StockMutation
} from '../types';
import { openPrintWindow } from '../utils/printHelper';
import { getSavedPharmacyProfile, getSavedAPJProfile, getSavedDPJProfile } from './PharmacySettingsModal';

interface FinancialReportsViewProps {
  transactions: Transaction[];
  medicines: Medicine[];
  purchaseInvoices: PurchaseInvoice[];
  rmeRecords: RMERecord[];
  doctors: Doctor[];
  staffList?: Staff[];
  opnameRecords?: StockOpnameRecord[];
  stockMutations?: StockMutation[];
  initialTab?: 'laba-rugi' | 'valuasi-aset' | 'fee-medis' | 'hutang-pbf' | 'hasil-stokopname';
}

interface ClinicalServiceEvent {
  id: string;
  date: string;
  dateOnly: string;
  patientName: string;
  rmId?: string;
  source: 'Ruang Dokter & Kasir POS' | 'Ruang Periksa Dokter (RME)' | 'POS Kasir Langsung';
  status: 'Selesai di POS Kasir' | 'Pemeriksaan Selesai (RME Dokter)';
  assignedStaff: StaffFeeItem[];
  totalFee: number;
  trxId?: string;
  rmeId?: string;
}

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({
  transactions,
  medicines,
  purchaseInvoices,
  rmeRecords,
  doctors,
  staffList = [],
  opnameRecords = [],
  stockMutations = [],
  initialTab
}) => {
  const toLocalYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const normalizeDateToYMD = (rawDate?: string): string => {
    if (!rawDate) return '';
    const trimmed = rawDate.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return toLocalYMD(parsed);
    }
    return trimmed.split(' ')[0].split('T')[0];
  };

  const [activeTab, setActiveTab] = useState<'laba-rugi' | 'valuasi-aset' | 'fee-medis' | 'hutang-pbf' | 'hasil-stokopname'>(
    initialTab || 'laba-rugi'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState(() => toLocalYMD(new Date()));

  const handleSetDatePreset = (preset: 'today' | '7days' | 'month' | 'all') => {
    const now = new Date();
    const todayStr = toLocalYMD(now);
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setStartDate(toLocalYMD(d));
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toLocalYMD(firstDay));
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('2026-01-01');
      setEndDate(todayStr);
    }
  };

  // 1. Financial Calculations from Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = normalizeDateToYMD(t.date);
      return (!startDate || d >= startDate) && (!endDate || d <= endDate);
    });
  }, [transactions, startDate, endDate]);

  const totalOmzet = filteredTransactions.reduce((acc, t) => acc + t.total, 0);
  const totalHpp = filteredTransactions.reduce((acc, t) => acc + t.hppTotal, 0);
  const grossProfit = totalOmzet - totalHpp;

  // 2. Filtered RME Records from Ruang Periksa Dokter
  const filteredRmeRecords = useMemo(() => {
    return rmeRecords.filter((r) => {
      const d = normalizeDateToYMD(r.date);
      return (!startDate || d >= startDate) && (!endDate || d <= endDate);
    });
  }, [rmeRecords, startDate, endDate]);

  // 3. Filtered Clinic Transactions from POS Kasir
  const completedClinicTransactions = useMemo(() => {
    return filteredTransactions.filter((t) => t.type === 'KLINIK');
  }, [filteredTransactions]);

  // 4. Unified Clinical Service Events: Integrate Ruang Periksa Dokter (RME) + POS Kasir
  const clinicalServiceEvents = useMemo(() => {
    const events: ClinicalServiceEvent[] = [];
    const matchedTrxIds = new Set<string>();

    // Step A: Process each examination from Ruang Periksa Dokter (RME)
    filteredRmeRecords.forEach((rme) => {
      // Find matching transaction completed in POS Kasir
      const matchedTrx = completedClinicTransactions.find(
        (t) =>
          !matchedTrxIds.has(t.id) &&
          ((t.rmId && t.rmId === rme.rmId) ||
            t.customerName.toLowerCase() === rme.patientName.toLowerCase() ||
            (t.description && t.description.includes(rme.id)))
      );

      if (matchedTrx) {
        matchedTrxIds.add(matchedTrx.id);
      }

      // Determine assigned staff from RME record or POS transaction
      let staffAssigned: StaffFeeItem[] = [];
      if (rme.assignedStaff && rme.assignedStaff.length > 0) {
        staffAssigned = rme.assignedStaff;
      } else if (matchedTrx?.assignedStaff && matchedTrx.assignedStaff.length > 0) {
        staffAssigned = matchedTrx.assignedStaff;
      } else {
        const docName = rme.doctorName || matchedTrx?.doctorName || 'dr. Anis Prima Dewi';
        staffAssigned = [
          {
            staffId: staffList.find((s) => s.role === 'Dokter' || s.name === docName)?.id || 'STF-02',
            staffName: docName,
            role: 'Dokter',
            fee: rme.doctorFee || 20000
          }
        ];
        if (rme.medicalSupportFee) {
          staffAssigned.push({
            staffId: 'STF-03',
            staffName: 'Ns. Siti Nurhaliza, S.Kep',
            role: 'Perawat / Bidan',
            fee: rme.medicalSupportFee
          });
        }
        if (rme.adminFee) {
          staffAssigned.push({
            staffId: 'STF-04',
            staffName: 'Rina Kartika, A.Md.Farm',
            role: 'Apoteker',
            fee: rme.adminFee
          });
        }
      }

      const totalFee = staffAssigned.reduce((acc, s) => acc + s.fee, 0);

      events.push({
        id: matchedTrx ? `${rme.id} / ${matchedTrx.id}` : rme.id,
        date: rme.time ? `${rme.date} ${rme.time}` : rme.date,
        dateOnly: rme.date.split(' ')[0],
        patientName: rme.patientName,
        rmId: rme.rmId,
        source: matchedTrx ? 'Ruang Dokter & Kasir POS' : 'Ruang Periksa Dokter (RME)',
        status: matchedTrx ? 'Selesai di POS Kasir' : 'Pemeriksaan Selesai (RME Dokter)',
        assignedStaff: staffAssigned,
        totalFee,
        trxId: matchedTrx?.id,
        rmeId: rme.id
      });
    });

    // Step B: Add any clinic transaction in POS that was not linked to an RME record
    completedClinicTransactions.forEach((trx) => {
      if (matchedTrxIds.has(trx.id)) return;

      let staffAssigned: StaffFeeItem[] = [];
      if (trx.assignedStaff && trx.assignedStaff.length > 0) {
        staffAssigned = trx.assignedStaff;
      } else {
        const docName = trx.doctorName || 'dr. Anis Prima Dewi';
        staffAssigned = [
          {
            staffId: staffList.find((s) => s.role === 'Dokter' || s.name === docName)?.id || 'STF-02',
            staffName: docName,
            role: 'Dokter',
            fee: 20000
          }
        ];
      }

      const totalFee = staffAssigned.reduce((acc, s) => acc + s.fee, 0);

      events.push({
        id: trx.id,
        date: trx.date,
        dateOnly: trx.date.split(' ')[0],
        patientName: trx.customerName,
        rmId: trx.rmId,
        source: 'POS Kasir Langsung',
        status: 'Selesai di POS Kasir',
        assignedStaff: staffAssigned,
        totalFee,
        trxId: trx.id
      });
    });

    // Sort newest date first
    return events.sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredRmeRecords, completedClinicTransactions, staffList]);

  // 5. Aggregated Fee per Staff Member (Data Pegawai) from Unified Clinical Events
  const staffFeeSummaries = useMemo(() => {
    const baseStaff: Staff[] =
      staffList.length > 0
        ? staffList
        : [
            { id: 'STF-01', name: 'apt. Mardin, S.Farm', role: 'Super Admin / APJ', phone: '0812-3456-7890', status: 'Aktif', branchId: 'BR-01' },
            { id: 'STF-02', name: 'dr. Anis Prima Dewi', role: 'Dokter', phone: '0813-4567-8901', status: 'Aktif', branchId: 'BR-01' },
            { id: 'STF-03', name: 'Ns. Siti Nurhaliza, S.Kep', role: 'Perawat / Bidan', phone: '0814-5678-9012', status: 'Aktif', branchId: 'BR-01' },
            { id: 'STF-04', name: 'Rina Kartika, A.Md.Farm', role: 'Apoteker', phone: '0815-6789-0123', status: 'Aktif', branchId: 'BR-01' }
          ];

    const map = new Map<
      string,
      {
        staffId: string;
        staffName: string;
        role: string;
        patientCount: number;
        totalFee: number;
        transactions: { refId: string; date: string; patientName: string; fee: number; status: string }[];
      }
    >();

    // Initialize all staff from master data pegawai
    baseStaff.forEach((s) => {
      map.set(s.id, {
        staffId: s.id,
        staffName: s.name,
        role: s.role,
        patientCount: 0,
        totalFee: 0,
        transactions: []
      });
    });

    // Accumulate fees from each clinical event
    clinicalServiceEvents.forEach((ev) => {
      ev.assignedStaff.forEach((st) => {
        let entry = map.get(st.staffId);
        if (!entry) {
          // Check by name
          const foundKey = Array.from(map.keys()).find((k) => map.get(k)?.staffName.toLowerCase() === st.staffName.toLowerCase());
          if (foundKey) entry = map.get(foundKey);
        }
        if (!entry) {
          entry = {
            staffId: st.staffId || `STF-${Math.random().toString().slice(2, 5)}`,
            staffName: st.staffName,
            role: st.role,
            patientCount: 0,
            totalFee: 0,
            transactions: []
          };
          map.set(entry.staffId, entry);
        }

        entry.patientCount += 1;
        entry.totalFee += st.fee;
        entry.transactions.push({
          refId: ev.id,
          date: ev.date,
          patientName: ev.patientName,
          fee: st.fee,
          status: ev.status
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalFee - a.totalFee || b.patientCount - a.patientCount);
  }, [clinicalServiceEvents, staffList]);

  // Total accumulated staff fees across all staff
  const totalStaffFeesAccumulated = useMemo(() => {
    return staffFeeSummaries.reduce((acc, s) => acc + s.totalFee, 0);
  }, [staffFeeSummaries]);

  // Categorical Breakdown for Laba Rugi Report
  const totalDoctorFee = useMemo(() => {
    const feeFromStaff = staffFeeSummaries
      .filter((s) => s.role === 'Dokter')
      .reduce((acc, s) => acc + s.totalFee, 0);
    return feeFromStaff > 0 ? feeFromStaff : filteredRmeRecords.reduce((acc, r) => acc + (r.doctorFee || 20000), 0);
  }, [staffFeeSummaries, filteredRmeRecords]);

  const totalSupportFee = useMemo(() => {
    const feeFromStaff = staffFeeSummaries
      .filter((s) => s.role === 'Perawat / Bidan' || s.role === 'Perawat / Nakes Lapangan')
      .reduce((acc, s) => acc + s.totalFee, 0);
    return feeFromStaff > 0 ? feeFromStaff : filteredRmeRecords.reduce((acc, r) => acc + (r.medicalSupportFee || 5000), 0);
  }, [staffFeeSummaries, filteredRmeRecords]);

  const totalAdminFee = useMemo(() => {
    const feeFromStaff = staffFeeSummaries
      .filter((s) => s.role === 'Kasir & Front Office')
      .reduce((acc, s) => acc + s.totalFee, 0);
    return feeFromStaff > 0 ? feeFromStaff : filteredRmeRecords.reduce((acc, r) => acc + (r.adminFee || 1000), 0);
  }, [staffFeeSummaries, filteredRmeRecords]);

  // Total medical fee expenses
  const totalMedicalExpenses = totalStaffFeesAccumulated > 0
    ? totalStaffFeesAccumulated
    : filteredRmeRecords.reduce((acc, r) => acc + (r.doctorFee || 20000) + (r.medicalSupportFee || 5000) + (r.adminFee || 1000), 0);

  // 6. Laporan Hasil Stokopname & Nominal Selisih Stokopname
  const allOpnameRecords = useMemo<StockOpnameRecord[]>(() => {
    const list: StockOpnameRecord[] = [...opnameRecords];
    const existingRefNos = new Set(list.map((r) => r.refNo));

    const opnameMuts = stockMutations.filter((m) => m.type === 'STOK_OPNAME' && !existingRefNos.has(m.refNo));
    if (opnameMuts.length > 0) {
      const grouped = new Map<string, StockMutation[]>();
      opnameMuts.forEach((m) => {
        const key = `${m.date}__${m.refNo}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(m);
      });

      grouped.forEach((muts, key) => {
        const first = muts[0];
        const items: StockOpnameItemRecord[] = muts.map((m) => {
          const med = medicines.find((item) => item.id === m.medicineId);
          const hpp = m.hpp ?? med?.hpp ?? 0;
          const sellPrice = med?.sellPrice ?? 0;
          const diff = m.inQty > 0 ? m.inQty : -m.outQty;
          const sysStock = m.balance - diff;
          return {
            medicineId: m.medicineId,
            medicineName: m.medicineName,
            unit: med?.unit || 'Unit',
            hpp,
            sellPrice,
            systemStock: sysStock,
            physicalStock: m.balance,
            difference: diff,
            nominalDiffHpp: diff * hpp,
            nominalDiffSell: diff * sellPrice,
            reason: m.ket
          };
        });

        const surplusItems = items.filter((i) => i.difference > 0);
        const deficitItems = items.filter((i) => i.difference < 0);
        const totalSurplusNominal = surplusItems.reduce((acc, i) => acc + i.nominalDiffHpp, 0);
        const totalDeficitNominal = deficitItems.reduce((acc, i) => acc + Math.abs(i.nominalDiffHpp), 0);

        list.push({
          id: `OPN-HIST-${key}`,
          refNo: first.refNo,
          date: normalizeDateToYMD(first.date),
          time: first.time,
          petugas: first.petugas,
          branchId: first.branchId,
          branchName: 'Apotek Latisha Farma',
          totalItemsCounted: items.length,
          matchCount: items.filter((i) => i.difference === 0).length,
          surplusCount: surplusItems.length,
          deficitCount: deficitItems.length,
          totalSurplusNominal,
          totalDeficitNominal,
          netNominalDiff: totalSurplusNominal - totalDeficitNominal,
          notes: 'Rekonsiliasi Kartu Stok Opname',
          items
        });
      });
    }

    return list.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [opnameRecords, stockMutations, medicines]);

  const filteredOpnameRecords = useMemo(() => {
    return allOpnameRecords.filter((rec) => {
      const d = normalizeDateToYMD(rec.date);
      return (!startDate || d >= startDate) && (!endDate || d <= endDate);
    });
  }, [allOpnameRecords, startDate, endDate]);

  const totalOpnameSurplus = useMemo(() => {
    return filteredOpnameRecords.reduce((acc, r) => acc + r.totalSurplusNominal, 0);
  }, [filteredOpnameRecords]);

  const totalOpnameDeficit = useMemo(() => {
    return filteredOpnameRecords.reduce((acc, r) => acc + r.totalDeficitNominal, 0);
  }, [filteredOpnameRecords]);

  const netOpnameNominal = totalOpnameSurplus - totalOpnameDeficit;

  const estimatedNetProfit = grossProfit - totalMedicalExpenses + netOpnameNominal;

  // Central Inventory Valuation
  const totalAssetValue = medicines.reduce((acc, m) => acc + m.stock * m.hpp, 0);
  const totalRetailValue = medicines.reduce((acc, m) => acc + m.stock * m.sellPrice, 0);
  const totalStockItems = medicines.reduce((acc, m) => acc + m.stock, 0);

  // Accounts Payable to PBF
  const unpaidInvoices = purchaseInvoices.filter((i) => i.status === 'Belum Lunas');
  const totalHutangPbf = unpaidInvoices.reduce((acc, i) => acc + i.totalTagihan, 0);

  return (
    <div className="space-y-4">
      {/* Top Header & Sub-Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3 no-print">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Laporan Keuangan Otomatis Terintegrasi Inventaris Pusat
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Laba rugi real-time, laporan hasil stokopname (nominal selisih), valuasi aset, fee medis & hutang PBF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('laba-rugi')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'laba-rugi'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Laba Rugi Otomatis
          </button>
          <button
            onClick={() => setActiveTab('hasil-stokopname')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'hasil-stokopname'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Laporan Hasil Stokopname</span>
          </button>
          <button
            onClick={() => setActiveTab('valuasi-aset')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'valuasi-aset'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Valuasi Aset Inventaris
          </button>
          <button
            onClick={() => setActiveTab('fee-medis')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'fee-medis'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Rekap Fee Shift Medis
          </button>
          <button
            onClick={() => setActiveTab('hutang-pbf')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'hutang-pbf'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Hutang Faktur PBF
          </button>

          <button
            onClick={() => openPrintWindow('laporan-keuangan', { tab: activeTab, startDate, endDate })}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs no-print">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Total Penjualan Kasir (Omzet)
          </span>
          <div className="font-mono font-black text-lg text-slate-900 mt-1">
            Rp {totalOmzet.toLocaleString('id-ID')}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
            {filteredTransactions.length} Struk Transaksi
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            HPP Obat Terjual (COGS)
          </span>
          <div className="font-mono font-black text-lg text-amber-700 mt-1">
            Rp {totalHpp.toLocaleString('id-ID')}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
            Margin Kotor: Rp {grossProfit.toLocaleString('id-ID')}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Nominal Selisih Stokopname
          </span>
          <div
            className={`font-mono font-black text-lg mt-1 ${
              netOpnameNominal > 0
                ? 'text-blue-700'
                : netOpnameNominal < 0
                ? 'text-rose-600'
                : 'text-slate-900'
            }`}
          >
            {netOpnameNominal >= 0 ? '+' : '-'}Rp {Math.abs(netOpnameNominal).toLocaleString('id-ID')}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
            {filteredOpnameRecords.length} Sesi (+Rp {totalOpnameSurplus.toLocaleString('id-ID')} / -Rp {totalOpnameDeficit.toLocaleString('id-ID')})
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Estimasi Laba Bersih
          </span>
          <div className="font-mono font-black text-lg text-emerald-600 mt-1">
            Rp {estimatedNetProfit.toLocaleString('id-ID')}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
            Jasa Medis: Rp {totalMedicalExpenses.toLocaleString('id-ID')}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Valuasi Stok Fisik Pusat (HPP)
          </span>
          <div className="font-mono font-black text-lg text-sky-800 mt-1">
            Rp {totalAssetValue.toLocaleString('id-ID')}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-1 block">
            {totalStockItems} Unit · Jual: Rp {totalRetailValue.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Main Printable Section */}
      <div
        id="printable-section"
        className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6 text-xs text-slate-800"
      >
        {(() => {
          const pharmacyProfile = getSavedPharmacyProfile();
          const apjProfile = getSavedAPJProfile();
          return (
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
                  <h2 className="font-black text-base text-slate-900 uppercase">
                    {pharmacyProfile.name}
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    {pharmacyProfile.address}, {pharmacyProfile.city} · Telp: {pharmacyProfile.phone} · Email: {pharmacyProfile.email}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    SIA: {pharmacyProfile.sia} · NPWP: {pharmacyProfile.npwp} · APJ: {apjProfile.name} (SIPA: {apjProfile.sipa})
                  </p>
                </div>
                <div className="w-16 shrink-0" />
              </div>
              <div className="text-center">
                <div className="mt-2 inline-block px-4 py-1 bg-emerald-50 text-emerald-900 rounded-full font-black text-xs uppercase border border-emerald-300">
                  {activeTab === 'laba-rugi' && 'LAPORAN LABA RUGI OPERASIONAL & HASIL STOKOPNAME'}
                  {activeTab === 'hasil-stokopname' && 'LAPORAN HASIL STOKOPNAME & NOMINAL SELISIH INVENTARIS'}
                  {activeTab === 'valuasi-aset' && 'LAPORAN VALUASI ASET INVENTARIS SENTRAL'}
                  {activeTab === 'fee-medis' && 'REKAPITULASI JASA DOKTER & PETUGAS MEDIS'}
                  {activeTab === 'hutang-pbf' && 'DAFTAR HUTANG FAKTUR PEMBELIAN SUPPLIER (PBF)'}
                </div>
              </div>

          {/* Flexible & Adjustable Date Range in Report Header (CSS selector 2) */}
          <p className="text-[11px] text-slate-700 font-bold mt-2.5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 no-print" />
              <span>Periode Rentang Tanggal:</span>
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              title="Pilih tanggal mulai periode laporan"
            />
            <span className="text-slate-500 font-extrabold">s.d.</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-xs outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              title="Pilih tanggal akhir periode laporan"
            />
            <span className="inline-flex items-center gap-1 ml-1 no-print">
              <button
                type="button"
                onClick={() => handleSetDatePreset('today')}
                className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 transition cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset('7days')}
                className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 transition cursor-pointer"
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset('month')}
                className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 transition cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => handleSetDatePreset('all')}
                className="px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer"
              >
                Semua
              </button>
            </span>
          </p>
        </div>
          );
        })()}

        {/* Tab 1: Laba Rugi Otomatis & Laporan Hasil Stokopname */}
        {activeTab === 'laba-rugi' && (
          <div className="space-y-4 max-w-3xl mx-auto font-mono text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border space-y-2">
              <div className="flex justify-between font-bold text-slate-900 text-sm border-b pb-2">
                <span>1. PENDAPATAN OPERASIONAL</span>
                <span>Rp {totalOmzet.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-600 pl-4">
                <span>- Penjualan Kasir Farmasi (OTC / Resep)</span>
                <span>Rp {totalOmzet.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border space-y-2">
              <div className="flex justify-between font-bold text-amber-900 text-sm border-b pb-2">
                <span>2. BEBAN POKOK PENJUALAN (HPP / COGS)</span>
                <span>(Rp {totalHpp.toLocaleString('id-ID')})</span>
              </div>
              <div className="flex justify-between text-slate-600 pl-4">
                <span>- Harga Pokok Obat Terjual (Batch Cost)</span>
                <span>Rp {totalHpp.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 pt-2 border-t">
                <span>LABA KOTOR (GROSS PROFIT)</span>
                <span>Rp {grossProfit.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border space-y-2">
              <div className="flex justify-between font-bold text-slate-900 text-sm border-b pb-2">
                <span>3. BIAYA JASA MEDIS & OPERASIONAL</span>
                <span>(Rp {totalMedicalExpenses.toLocaleString('id-ID')})</span>
              </div>
              <div className="flex justify-between text-slate-600 pl-4">
                <span>- Jasa Medis Pemeriksaan Dokter</span>
                <span>Rp {totalDoctorFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-600 pl-4">
                <span>- Jasa Penunjang Medis (Perawat / Bidan)</span>
                <span>Rp {totalSupportFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-600 pl-4">
                <span>- Biaya Administrasi Front Office</span>
                <span>Rp {totalAdminFee.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* 4. Laporan Hasil Stokopname (Mencatat & Menyimpan Nominal Selisih Stokopname) */}
            <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-2.5">
              <div className="flex justify-between items-center font-bold text-indigo-950 text-sm border-b border-indigo-200 pb-2">
                <span className="flex items-center gap-2">
                  <span>4. LAPORAN HASIL STOKOPNAME (NOMINAL SELISIH STOK)</span>
                </span>
                <span
                  className={
                    netOpnameNominal > 0
                      ? 'text-blue-700'
                      : netOpnameNominal < 0
                      ? 'text-rose-700'
                      : 'text-emerald-700'
                  }
                >
                  {netOpnameNominal >= 0 ? '+' : '-'}Rp {Math.abs(netOpnameNominal).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-slate-700 pl-4">
                <span>- Selisih Lebih Stokopname / Surplus Fisik ({filteredOpnameRecords.reduce((a, r) => a + r.surplusCount, 0)} Item)</span>
                <span className="text-blue-700 font-bold">+Rp {totalOpnameSurplus.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-700 pl-4">
                <span>- Selisih Kurang Stokopname / Beban Susut Fisik ({filteredOpnameRecords.reduce((a, r) => a + r.deficitCount, 0)} Item)</span>
                <span className="text-rose-700 font-bold">(Rp {totalOpnameDeficit.toLocaleString('id-ID')})</span>
              </div>
              <div className="flex justify-between font-black text-indigo-950 pt-2 border-t border-indigo-200 pl-4">
                <span>TOTAL NOMINAL SELISIH STOKOPNAME BERSIH ({filteredOpnameRecords.length} Sesi Opname)</span>
                <span>
                  {netOpnameNominal >= 0 ? '+' : '-'}Rp {Math.abs(netOpnameNominal).toLocaleString('id-ID')}
                </span>
              </div>

              {filteredOpnameRecords.length > 0 && (
                <div className="pt-2 border-t border-indigo-200/80 font-sans">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase text-indigo-900">
                      Rincian Dokumen Hasil Stokopname Terimpan ({startDate} s.d. {endDate}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('hasil-stokopname')}
                      className="text-[10px] font-bold text-indigo-700 hover:underline no-print cursor-pointer"
                    >
                      Lihat Tabel Lengkap Hasil Stokopname →
                    </button>
                  </div>
                  <div className="overflow-x-auto bg-white rounded-xl border border-indigo-100">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-indigo-100/60 text-indigo-950 font-bold text-[10px] uppercase">
                        <tr>
                          <th className="p-2 border">No. Ref Opname</th>
                          <th className="p-2 border">Tanggal & Waktu</th>
                          <th className="p-2 border">Petugas</th>
                          <th className="p-2 border text-center">Jml Obat</th>
                          <th className="p-2 border text-right">Surplus (+)</th>
                          <th className="p-2 border text-right">Defisit (-)</th>
                          <th className="p-2 border text-right">Nominal Selisih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {filteredOpnameRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50">
                            <td className="p-2 border font-bold text-indigo-700">{rec.refNo}</td>
                            <td className="p-2 border">{rec.date} {rec.time}</td>
                            <td className="p-2 border font-sans">{rec.petugas}</td>
                            <td className="p-2 border text-center">{rec.totalItemsCounted}</td>
                            <td className="p-2 border text-right text-blue-700">+Rp {rec.totalSurplusNominal.toLocaleString('id-ID')}</td>
                            <td className="p-2 border text-right text-rose-700">-Rp {rec.totalDeficitNominal.toLocaleString('id-ID')}</td>
                            <td className={`p-2 border text-right font-bold ${rec.netNominalDiff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {rec.netNominalDiff >= 0 ? '+' : '-'}Rp {Math.abs(rec.netNominalDiff).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-300 flex justify-between font-black text-base text-emerald-950">
              <span>ESTIMASI LABA BERSIH (NET PROFIT):</span>
              <span>Rp {estimatedNetProfit.toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}

        {/* Tab Laporan Hasil Stokopname Lengkap */}
        {activeTab === 'hasil-stokopname' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-sans font-bold uppercase text-slate-400 block">
                  Total Kegiatan Opname
                </span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">
                  {filteredOpnameRecords.length} Sesi Opname
                </span>
              </div>
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl">
                <span className="text-[10px] font-sans font-bold uppercase text-blue-700 block">
                  Nominal Selisih Lebih (+)
                </span>
                <span className="text-lg font-black text-blue-800 mt-0.5 block">
                  +Rp {totalOpnameSurplus.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl">
                <span className="text-[10px] font-sans font-bold uppercase text-rose-700 block">
                  Nominal Selisih Kurang (-)
                </span>
                <span className="text-lg font-black text-rose-800 mt-0.5 block">
                  -Rp {totalOpnameDeficit.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <span className="text-[10px] font-sans font-bold uppercase text-emerald-800 block">
                  Nominal Selisih Bersih
                </span>
                <span className={`text-lg font-black mt-0.5 block ${netOpnameNominal >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                  {netOpnameNominal >= 0 ? '+' : '-'}Rp {Math.abs(netOpnameNominal).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {filteredOpnameRecords.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500">
                <p className="font-bold text-slate-700">
                  Belum ada catatan Laporan Hasil Stokopname pada periode {startDate} s.d. {endDate}.
                </p>
                <p className="text-[11px] mt-1">
                  Setiap kegiatan stokopname yang diterapkan pada menu Inventaris &rarr; Stok Opname otomatis tercatat beserta nominal selisihnya di laporan ini.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOpnameRecords.map((rec) => (
                  <div key={rec.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-black text-indigo-700 mr-2">{rec.refNo}</span>
                        <span className="font-bold text-slate-800">{rec.date} · {rec.time}</span>
                        <span className="ml-2 text-[11px] text-slate-600">Petugas: <strong>{rec.petugas}</strong></span>
                      </div>
                      <div className="font-mono font-black text-xs">
                        Nominal Selisih Bersih:{' '}
                        <span className={rec.netNominalDiff >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {rec.netNominalDiff >= 0 ? '+' : '-'}Rp {Math.abs(rec.netNominalDiff).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 font-bold uppercase text-[10px] text-slate-600">
                        <tr>
                          <th className="p-2.5 border">Nama Obat / Barang</th>
                          <th className="p-2.5 border text-center">Stok Sistem</th>
                          <th className="p-2.5 border text-center">Stok Fisik</th>
                          <th className="p-2.5 border text-center">Selisih Fisik</th>
                          <th className="p-2.5 border text-right">HPP Satuan</th>
                          <th className="p-2.5 border text-right">Nominal Selisih (HPP)</th>
                          <th className="p-2.5 border">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-medium text-slate-700">
                        {rec.items.map((it, idx) => (
                          <tr key={`${rec.id}-${idx}`} className="hover:bg-slate-50">
                            <td className="p-2.5 border font-bold text-slate-900">{it.medicineName}</td>
                            <td className="p-2.5 border text-center font-mono">{it.systemStock} {it.unit}</td>
                            <td className="p-2.5 border text-center font-mono font-bold">{it.physicalStock} {it.unit}</td>
                            <td className="p-2.5 border text-center font-mono font-bold">
                              <span className={it.difference > 0 ? 'text-blue-700' : it.difference < 0 ? 'text-rose-700' : 'text-emerald-700'}>
                                {it.difference > 0 ? `+${it.difference}` : it.difference} {it.unit}
                              </span>
                            </td>
                            <td className="p-2.5 border text-right font-mono">Rp {it.hpp.toLocaleString('id-ID')}</td>
                            <td className={`p-2.5 border text-right font-mono font-black ${it.nominalDiffHpp > 0 ? 'text-blue-700' : it.nominalDiffHpp < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {it.nominalDiffHpp >= 0 ? '+' : '-'}Rp {Math.abs(it.nominalDiffHpp).toLocaleString('id-ID')}
                            </td>
                            <td className="p-2.5 border text-slate-600">{it.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Valuasi Aset Inventaris */}
        {activeTab === 'valuasi-aset' && (
          <div className="space-y-4">
            <table className="w-full text-left text-xs border border-collapse">
              <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
                <tr>
                  <th className="p-2.5 border">Nama Obat / Barang</th>
                  <th className="p-2.5 border">Kategori</th>
                  <th className="p-2.5 border text-center w-20">Stok</th>
                  <th className="p-2.5 border text-right w-28">HPP Beli (+11%)</th>
                  <th className="p-2.5 border text-right w-28">Harga Jual</th>
                  <th className="p-2.5 border text-right w-36">Total Aset (HPP)</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-700">
                {medicines.map((m) => {
                  const subTotalHpp = m.stock * m.hpp;
                  return (
                    <tr key={m.id} className="border-b hover:bg-slate-50">
                      <td className="p-2.5 border font-bold text-slate-900">{m.name}</td>
                      <td className="p-2.5 border text-slate-600">{m.category}</td>
                      <td className="p-2.5 border text-center font-mono font-bold">{m.stock} {m.unit}</td>
                      <td className="p-2.5 border text-right font-mono">Rp {m.hpp.toLocaleString('id-ID')}</td>
                      <td className="p-2.5 border text-right font-mono">Rp {m.sellPrice.toLocaleString('id-ID')}</td>
                      <td className="p-2.5 border text-right font-mono font-black text-sky-800">
                        Rp {subTotalHpp.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-right text-sm font-black font-mono text-slate-900 pt-2">
              Total Valuasi Nilai Aset Obat Sentral: <span className="text-sky-800">Rp {totalAssetValue.toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}

        {/* Tab 3: Rekap Biaya & Fee Shift Medis Per Petugas */}
        {activeTab === 'fee-medis' && (
          <div className="space-y-6">
            {/* 1. Informational Banner & Date Range Filter Bar */}
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-amber-50 via-amber-50/60 to-indigo-50/60 p-4 rounded-2xl border border-amber-200 text-xs text-slate-700 flex items-start gap-3">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shrink-0 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-sm">
                      Rekapitulasi Biaya / Fee Per Petugas (Terintegrasi Ruang Periksa Dokter & Kasir)
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Tercatat Langsung dari Ruang Dokter & POS Kasir
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Setiap pemeriksaan pasien di Ruang Periksa Dokter (SOAP/RME) secara langsung mencatat alokasi jasa/fee bagi dokter dan nakes bertugas sesuai pilihan multi-petugas. Data tersinkronisasi otomatis dengan transaksi kasir POS tanpa duplikasi.
                  </p>
                </div>
              </div>

              {/* Filter Range Tanggal Rekapitulasi */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Filter className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">Filter Range Tanggal Rekapitulasi</span>
                    <span className="text-[10px] text-slate-500">Sesuaikan periode untuk menghitung fee petugas & riwayat layanan</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500">Mulai:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="font-mono font-bold text-slate-800 outline-none bg-transparent text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500">Sampai:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="font-mono font-bold text-slate-800 outline-none bg-transparent text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSetDatePreset('today')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDatePreset('7days')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                    >
                      7 Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDatePreset('month')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                    >
                      Bulan Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDatePreset('all')}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                    >
                      Semua Data
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Total Rekap Biaya Semua Petugas
                </span>
                <span className="text-xl font-black font-mono text-emerald-700 mt-0.5 block">
                  Rp {totalStaffFeesAccumulated.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                  Periode {startDate} s.d. {endDate}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Total Layanan Pasien Terdaftar
                </span>
                <span className="text-xl font-black font-mono text-indigo-700 mt-0.5 block">
                  {clinicalServiceEvents.length} Pasien
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                  {filteredRmeRecords.length} RME Dokter · {completedClinicTransactions.length} Selesai Kasir
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Jumlah Petugas Terdaftar Bertugas
                </span>
                <span className="text-xl font-black font-mono text-slate-900 mt-0.5 block">
                  {staffFeeSummaries.filter((s) => s.patientCount > 0).length} / {staffFeeSummaries.length} Pegawai
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                  Memperoleh alokasi fee dalam periode ini
                </span>
              </div>
            </div>

            {/* 3. Tabel 1: Rekapitulasi Akumulasi Biaya Per Petugas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  1. Rekapitulasi Akumulasi Biaya Per Petugas (Data Pegawai)
                </h4>
                <span className="text-[10px] text-slate-500 font-medium">
                  Urutan berdasarkan penerimaan fee tertinggi · Periode {startDate} s.d. {endDate}
                </span>
              </div>

              <table className="w-full text-left text-xs border border-collapse">
                <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
                  <tr>
                    <th className="p-2.5 border w-10 text-center">No</th>
                    <th className="p-2.5 border">Nama Pegawai / Petugas</th>
                    <th className="p-2.5 border w-28">ID Pegawai</th>
                    <th className="p-2.5 border">Jabatan / Role</th>
                    <th className="p-2.5 border text-center w-36">Pasien / Trx Selesai</th>
                    <th className="p-2.5 border text-right w-40">Total Rekap Biaya / Fee</th>
                    <th className="p-2.5 border text-center w-32">Status Rekapan</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium text-slate-700">
                  {staffFeeSummaries.map((staff, idx) => (
                    <tr
                      key={staff.staffId}
                      className={`border-b hover:bg-slate-50 transition-colors ${
                        staff.totalFee > 0 ? 'bg-white' : 'bg-slate-50/50 text-slate-400'
                      }`}
                    >
                      <td className="p-2.5 border text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 border">
                        <span className="font-bold text-slate-900 block">{staff.staffName}</span>
                      </td>
                      <td className="p-2.5 border font-mono text-[11px] text-slate-600">
                        {staff.staffId}
                      </td>
                      <td className="p-2.5 border">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {staff.role}
                        </span>
                      </td>
                      <td className="p-2.5 border text-center font-mono font-bold text-indigo-900">
                        {staff.patientCount} Pasien
                      </td>
                      <td className="p-2.5 border text-right font-mono font-black text-emerald-700 text-sm">
                        Rp {staff.totalFee.toLocaleString('id-ID')}
                      </td>
                      <td className="p-2.5 border text-center">
                        {staff.totalFee > 0 ? (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Siap Dicairkan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-100 text-slate-500 font-medium">
                            Belum Ada Pasien
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/80 font-black border-t-2 border-slate-300">
                    <td colSpan={4} className="p-2.5 text-right uppercase text-[11px] text-slate-800">
                      Total Seluruh Biaya / Fee Petugas:
                    </td>
                    <td className="p-2.5 border text-center font-mono text-indigo-900">
                      {staffFeeSummaries.reduce((a, s) => a + s.patientCount, 0)} Pasien
                    </td>
                    <td className="p-2.5 border text-right font-mono text-emerald-800 text-sm">
                      Rp {totalStaffFeesAccumulated.toLocaleString('id-ID')}
                    </td>
                    <td className="p-2.5 border" />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 4. Tabel 2: Log Detail Transaksi Pasien Klinik & Alokasi Petugas yang Bertugas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  2. Log Detail Transaksi Pasien Klinik & Alokasi Petugas yang Bertugas
                </h4>
                <span className="text-[10px] text-slate-500 font-medium">
                  {clinicalServiceEvents.length} pelayanan pasien (Ruang Periksa Dokter & Kasir POS)
                </span>
              </div>

              {clinicalServiceEvents.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400">
                  <p className="font-semibold">Belum ada data pemeriksaan pasien klinik pada periode ini ({startDate} s.d. {endDate}).</p>
                  <p className="text-[11px] mt-1">
                    Lakukan pemeriksaan di menu 'Ruang Dokter (SOAP)' atau selesaikan transaksi di 'POS Kasir' untuk melihat rincian alokasi fee di sini.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border border-collapse">
                  <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
                    <tr>
                      <th className="p-2.5 border w-32">No. RME / Struk</th>
                      <th className="p-2.5 border w-32">Waktu Layanan</th>
                      <th className="p-2.5 border">Nama Pasien</th>
                      <th className="p-2.5 border">Petugas yang Bertugas (Multi-Petugas)</th>
                      <th className="p-2.5 border text-right">Rincian Alokasi Fee</th>
                      <th className="p-2.5 border text-right w-28">Total Fee</th>
                      <th className="p-2.5 border text-center w-36">Sumber & Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium text-slate-700">
                    {clinicalServiceEvents.map((ev) => {
                      return (
                        <tr key={ev.id} className="border-b hover:bg-slate-50">
                          <td className="p-2.5 border font-mono font-bold text-sky-700">
                            {ev.id}
                          </td>
                          <td className="p-2.5 border font-mono text-slate-600 text-[11px]">
                            {ev.date}
                          </td>
                          <td className="p-2.5 border">
                            <span className="font-bold text-slate-900 block">{ev.patientName}</span>
                            {ev.rmId && (
                              <span className="font-mono text-[10px] text-slate-400">{ev.rmId}</span>
                            )}
                          </td>
                          <td className="p-2.5 border">
                            <div className="flex flex-wrap gap-1">
                              {ev.assignedStaff.map((s, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10px] font-medium"
                                >
                                  <strong>{s.staffName}</strong>
                                  <span className="text-[9px] text-indigo-600">({s.role})</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2.5 border text-right text-[11px] font-mono">
                            {ev.assignedStaff.map((s, sIdx) => (
                              <div key={sIdx} className="text-slate-700">
                                {s.staffName.split(',')[0].replace('dr. ', '')}:{' '}
                                <strong className="text-emerald-700">
                                  Rp {s.fee.toLocaleString('id-ID')}
                                </strong>
                              </div>
                            ))}
                          </td>
                          <td className="p-2.5 border text-right font-mono font-black text-emerald-800 text-xs">
                            Rp {ev.totalFee.toLocaleString('id-ID')}
                          </td>
                          <td className="p-2.5 border text-center">
                            <div className="space-y-0.5">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[9px] border inline-block ${
                                  ev.status === 'Selesai di POS Kasir'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-100 text-amber-800 border-amber-200'
                                }`}
                              >
                                {ev.status}
                              </span>
                              <span className="text-[9px] text-slate-400 block font-medium">
                                {ev.source}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Riwayat Catatan Pelayanan RME Referensi */}
            {filteredRmeRecords.length > 0 && (
              <details className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <summary className="font-bold text-slate-700 cursor-pointer select-none">
                  Lihat Riwayat Pemeriksaan SOAP / RME Dokter ({filteredRmeRecords.length} Catatan Pemeriksaan)
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs border border-collapse">
                    <thead className="bg-slate-200 font-bold uppercase text-[9px] text-slate-700">
                      <tr>
                        <th className="p-2 border">Waktu RME</th>
                        <th className="p-2 border">Pasien (RM)</th>
                        <th className="p-2 border">Dokter Pemeriksa</th>
                        <th className="p-2 border text-right">Fee Dokter</th>
                        <th className="p-2 border text-right">Fee Penunjang</th>
                        <th className="p-2 border text-right">Fee Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {filteredRmeRecords.map((r) => (
                        <tr key={r.id} className="border-b bg-white">
                          <td className="p-2 border font-mono text-[10px]">{r.date} {r.time}</td>
                          <td className="p-2 border font-bold">{r.patientName} ({r.rmId})</td>
                          <td className="p-2 border">{r.doctorName}</td>
                          <td className="p-2 border text-right font-mono text-emerald-700">
                            Rp {(r.doctorFee || 20000).toLocaleString('id-ID')}
                          </td>
                          <td className="p-2 border text-right font-mono text-indigo-700">
                            Rp {(r.medicalSupportFee || 5000).toLocaleString('id-ID')}
                          </td>
                          <td className="p-2 border text-right font-mono text-amber-700">
                            Rp {(r.adminFee || 1000).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        )}

        {/* Tab 4: Hutang Faktur PBF */}
        {activeTab === 'hutang-pbf' && (
          <div className="space-y-4">
            <table className="w-full text-left text-xs border border-collapse">
              <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
                <tr>
                  <th className="p-2.5 border">No. Faktur</th>
                  <th className="p-2.5 border">Supplier PBF</th>
                  <th className="p-2.5 border">Tgl Faktur</th>
                  <th className="p-2.5 border text-rose-600">Jatuh Tempo</th>
                  <th className="p-2.5 border text-right">Total Tagihan</th>
                  <th className="p-2.5 border text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-700">
                {purchaseInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b hover:bg-slate-50">
                    <td className="p-2.5 border font-mono font-bold text-sky-700">{inv.invoiceNo}</td>
                    <td className="p-2.5 border font-bold">{inv.pbfName}</td>
                    <td className="p-2.5 border font-mono">{inv.date}</td>
                    <td className="p-2.5 border font-mono font-bold text-rose-600">{inv.dueDate}</td>
                    <td className="p-2.5 border text-right font-mono font-black">
                      Rp {inv.totalTagihan.toLocaleString('id-ID')}
                    </td>
                    <td className="p-2.5 border text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          inv.status === 'Lunas'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right text-sm font-bold font-mono text-rose-700 pt-2">
              Total Hutang Dagang PBF Belum Lunas: Rp {totalHutangPbf.toLocaleString('id-ID')}
            </div>
          </div>
        )}

        {/* Signature Terintegrasi Profil Apotek, APJ, dan DPJ */}
        {(() => {
          const pharmacyProfile = getSavedPharmacyProfile();
          const apjProfile = getSavedAPJProfile();
          const dpjProfile = getSavedDPJProfile();
          return (
            <div className="grid grid-cols-2 pt-8 text-xs">
              <div className="text-center space-y-12">
                <p className="font-semibold text-slate-700">
                  Mengetahui,<br />
                  Dokter Penanggung Jawab Klinis (DPJ),
                </p>
                <div>
                  <p className="font-extrabold underline text-slate-900">{dpjProfile.name}</p>
                  <p className="text-[10px] text-slate-600 font-mono">SIP: {dpjProfile.sip}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{dpjProfile.idi}</p>
                </div>
              </div>
              <div className="text-center space-y-12">
                <p className="font-semibold text-slate-700">
                  {pharmacyProfile.city}, {new Date().toLocaleDateString('id-ID')}<br />
                  Disahkan oleh Apoteker Penanggung Jawab (APJ),
                </p>
                <div>
                  <p className="font-extrabold underline text-slate-900">{apjProfile.name}</p>
                  <p className="text-[10px] text-slate-600 font-mono">SIPA: {apjProfile.sipa}</p>
                  <p className="text-[10px] text-slate-500 font-mono">STRA: {apjProfile.stra}</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
