import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Printer,
  Save,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Boxes,
  Barcode,
  RotateCcw,
  Check,
  ShieldCheck,
  ShoppingCart,
  FileText,
  X,
  History,
  Calendar,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Medicine, Transaction, StockMutation, Branch, StockOpnameRecord, StockOpnameItemRecord, Staff } from '../types';
import { openPrintWindow } from '../utils/printHelper';

interface StockOpnameViewProps {
  medicines: Medicine[];
  transactions: Transaction[];
  currentBranch: Branch;
  userName: string;
  staffList?: Staff[];
  onApplyStockOpname: (
    adjustments: {
      medicineId: string;
      medicineName: string;
      finalStock: number;
      difference: number;
      reason: string;
      systemStock?: number;
      hpp?: number;
      sellPrice?: number;
      unit?: string;
    }[],
    notes?: string,
    customPetugas?: string
  ) => void;
  opnameRecords?: StockOpnameRecord[];
  stockMutations?: StockMutation[];
  onDeleteOpnameRecord?: (id: string) => void;
}

interface OpnameItemState {
  physicalStock: string; // string for input handling
  countedAt?: string;
  notes?: string;
}

export const StockOpnameView: React.FC<StockOpnameViewProps> = ({
  medicines,
  transactions,
  currentBranch,
  userName,
  staffList = [],
  onApplyStockOpname,
  opnameRecords = [],
  stockMutations = [],
  onDeleteOpnameRecord
}) => {
  const [selectedOpnameStaff, setSelectedOpnameStaff] = useState(userName);

  useEffect(() => {
    setSelectedOpnameStaff(userName);
  }, [userName]);
  const toLocalYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // View Mode: 'live' (Form Stokopname) or 'history' (Halaman Riwayat Opname)
  const [viewMode, setViewMode] = useState<'live' | 'history'>('live');

  // Date Range Filter for Riwayat Opname
  const [historyPreset, setHistoryPreset] = useState<'all' | 'today' | '7days' | 'month' | 'custom'>('all');
  const [historyStartDate, setHistoryStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return toLocalYMD(d);
  });
  const [historyEndDate, setHistoryEndDate] = useState<string>(() => toLocalYMD(new Date()));
  const [historySearch, setHistorySearch] = useState('');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const handleSelectHistoryPreset = (preset: 'all' | 'today' | '7days' | 'month' | 'custom') => {
    setHistoryPreset(preset);
    const now = new Date();
    const todayStr = toLocalYMD(now);
    if (preset === 'today') {
      setHistoryStartDate(todayStr);
      setHistoryEndDate(todayStr);
    } else if (preset === '7days') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6);
      setHistoryStartDate(toLocalYMD(d7));
      setHistoryEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setHistoryStartDate(toLocalYMD(firstDay));
      setHistoryEndDate(todayStr);
    }
  };

  // Combine opnameRecords and any legacy STOK_OPNAME mutations into unified history records
  const allOpnameHistory = useMemo<StockOpnameRecord[]>(() => {
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
          date: first.date.split(' ')[0].split('T')[0],
          time: first.time,
          petugas: first.petugas,
          branchId: first.branchId,
          branchName: currentBranch.name,
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
  }, [opnameRecords, stockMutations, medicines, currentBranch.name]);

  // Filtered History by Date Range and Search
  const filteredOpnameHistory = useMemo(() => {
    const now = new Date();
    const todayStr = toLocalYMD(now);
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    const d7Str = toLocalYMD(d7);
    const curMonth = todayStr.slice(0, 7);

    return allOpnameHistory.filter((rec) => {
      const recDate = rec.date ? rec.date.split('T')[0].split(' ')[0] : '';
      if (historyPreset === 'today') {
        if (recDate !== todayStr) return false;
      } else if (historyPreset === '7days') {
        if (recDate < d7Str || recDate > todayStr) return false;
      } else if (historyPreset === 'month') {
        if (!recDate.startsWith(curMonth)) return false;
      } else if (historyPreset === 'custom') {
        if (historyStartDate && recDate < historyStartDate) return false;
        if (historyEndDate && recDate > historyEndDate) return false;
      }

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchRef = rec.refNo.toLowerCase().includes(q) || rec.id.toLowerCase().includes(q);
        const matchPetugas = rec.petugas.toLowerCase().includes(q);
        const matchMed = rec.items.some((i) => i.medicineName.toLowerCase().includes(q));
        if (!matchRef && !matchPetugas && !matchMed) return false;
      }

      return true;
    });
  }, [allOpnameHistory, historyPreset, historyStartDate, historyEndDate, historySearch]);

  const historySummary = useMemo(() => {
    const totalSessions = filteredOpnameHistory.length;
    const totalSurplus = filteredOpnameHistory.reduce((acc, r) => acc + r.totalSurplusNominal, 0);
    const totalDeficit = filteredOpnameHistory.reduce((acc, r) => acc + r.totalDeficitNominal, 0);
    const netNominal = totalSurplus - totalDeficit;
    const totalItemsEvaluated = filteredOpnameHistory.reduce((acc, r) => acc + r.totalItemsCounted, 0);
    return { totalSessions, totalSurplus, totalDeficit, netNominal, totalItemsEvaluated };
  }, [filteredOpnameHistory]);

  // Session start timestamp (persisted in localStorage so refreshing doesn't lose live count)
  const [sessionStartTime, setSessionStartTime] = useState<string>(() => {
    const saved = localStorage.getItem('latisha_opname_session_time');
    if (saved) return saved;
    const now = new Date().toISOString();
    localStorage.setItem('latisha_opname_session_time', now);
    return now;
  });

  // Physical count state dictionary: { [medicineId]: { physicalStock, countedAt, notes } }
  const [counts, setCounts] = useState<Record<string, OpnameItemState>>(() => {
    try {
      const saved = localStorage.getItem('latisha_opname_counts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRack, setSelectedRack] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COUNTED' | 'UNCOUNTED' | 'DISCREPANCY' | 'MATCH'>('ALL');
  const [scannedBarcode, setScannedBarcode] = useState('');

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastAppliedCount, setLastAppliedCount] = useState(0);

  // Save counts to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('latisha_opname_counts', JSON.stringify(counts));
    } catch (e) {}
  }, [counts]);

  // Extract unique categories and racks
  const categories = useMemo(() => {
    const set = new Set(medicines.map((m) => m.category).filter(Boolean));
    return Array.from(set);
  }, [medicines]);

  const racks = useMemo(() => {
    const set = new Set(medicines.map((m) => m.rack).filter(Boolean));
    return Array.from(set);
  }, [medicines]);

  // Calculate live sales during this opname session per medicine
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

  // Calculate reconciliation for all items
  const reconciledItems = useMemo(() => {
    return medicines.map((med) => {
      const liveSales = liveSalesMap[med.id] || 0;
      const systemStock = med.stock;
      const countState = counts[med.id];
      const hasCounted = countState !== undefined && countState.physicalStock !== '';
      const parsedPhysical = hasCounted ? parseFloat(countState.physicalStock) || 0 : systemStock;

      // Real physical discrepancy = Counted Physical - System Stock
      // Because systemStock in Latisha Farma is already decremented in real-time by POS sales,
      // the discrepancy is directly: physicalStock - currentSystemStock.
      // Furthermore, we highlight live sales so the pharmacist knows X items were sold at the counter during the count!
      const difference = hasCounted ? parsedPhysical - systemStock : 0;
      const diffValueHpp = difference * med.hpp;

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
        physicalStock: countState?.physicalStock ?? '',
        parsedPhysical,
        difference,
        diffValueHpp,
        status,
        notes: countState?.notes || ''
      };
    });
  }, [medicines, counts, liveSalesMap]);

  // Filtered list
  const filteredList = useMemo(() => {
    return reconciledItems.filter((item) => {
      // Search
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        item.rack.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Category
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;

      // Rack
      if (selectedRack !== 'ALL' && item.rack !== selectedRack) return false;

      // Status Filter
      if (statusFilter === 'COUNTED' && !item.hasCounted) return false;
      if (statusFilter === 'UNCOUNTED' && item.hasCounted) return false;
      if (statusFilter === 'MATCH' && item.status !== 'MATCH') return false;
      if (statusFilter === 'DISCREPANCY' && (item.status === 'MATCH' || !item.hasCounted)) return false;

      return true;
    });
  }, [reconciledItems, searchTerm, selectedCategory, selectedRack, statusFilter]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalItems = medicines.length;
    const countedItems = reconciledItems.filter((r) => r.hasCounted).length;
    const matchCount = reconciledItems.filter((r) => r.status === 'MATCH').length;
    const surplusItems = reconciledItems.filter((r) => r.status === 'SURPLUS');
    const deficitItems = reconciledItems.filter((r) => r.status === 'DEFICIT');

    const totalSurplusValue = surplusItems.reduce((acc, r) => acc + r.diffValueHpp, 0);
    const totalDeficitValue = deficitItems.reduce((acc, r) => acc + Math.abs(r.diffValueHpp), 0);
    const netAdjustmentValue = totalSurplusValue - totalDeficitValue;

    const totalLiveSalesCount = Object.values(liveSalesMap).reduce((a, b) => a + b, 0);

    return {
      totalItems,
      countedItems,
      progressPercent: totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0,
      matchCount,
      surplusCount: surplusItems.length,
      deficitCount: deficitItems.length,
      totalSurplusValue,
      totalDeficitValue,
      netAdjustmentValue,
      totalLiveSalesCount
    };
  }, [medicines, reconciledItems, liveSalesMap]);

  // Handle single physical stock change
  const handlePhysicalStockChange = (medId: string, val: string) => {
    setCounts((prev) => ({
      ...prev,
      [medId]: {
        ...(prev[medId] || {}),
        physicalStock: val,
        countedAt: new Date().toLocaleTimeString('id-ID')
      }
    }));
  };

  // Quick action: Set physical stock = system stock
  const handleSetMatch = (medId: string, sysStock: number) => {
    setCounts((prev) => ({
      ...prev,
      [medId]: {
        ...(prev[medId] || {}),
        physicalStock: sysStock.toString(),
        countedAt: new Date().toLocaleTimeString('id-ID')
      }
    }));
  };

  // Quick action: Set all currently filtered uncounted items as match
  const handleSetAllFilteredMatch = () => {
    const newCounts = { ...counts };
    filteredList.forEach((item) => {
      if (!item.hasCounted) {
        newCounts[item.id] = {
          physicalStock: item.systemStock.toString(),
          countedAt: new Date().toLocaleTimeString('id-ID')
        };
      }
    });
    setCounts(newCounts);
  };

  // Reset Opname Session
  const handleResetSession = () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin mengatur ulang (reset) sesi Stok Opname ini? Semua data input hitungan fisik yang belum diposting akan dikosongkan.'
      )
    ) {
      setCounts({});
      const newTime = new Date().toISOString();
      setSessionStartTime(newTime);
      localStorage.setItem('latisha_opname_session_time', newTime);
      localStorage.removeItem('latisha_opname_counts');
    }
  };

  // Barcode quick search & focus
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedBarcode.trim()) return;
    const found = medicines.find(
      (m) =>
        (m.barcode && m.barcode.toLowerCase() === scannedBarcode.trim().toLowerCase()) ||
        m.id.toLowerCase() === scannedBarcode.trim().toLowerCase()
    );
    if (found) {
      setSearchTerm(found.name);
      setScannedBarcode('');
    } else {
      alert(`Obat dengan barcode / kode "${scannedBarcode}" tidak ditemukan.`);
    }
  };

  // Apply Reconciliation to System
  const handleExecuteApplyOpname = () => {
    const adjustments = reconciledItems
      .filter((r) => r.hasCounted)
      .map((r) => ({
        medicineId: r.id,
        medicineName: r.name,
        finalStock: r.parsedPhysical,
        difference: r.difference,
        systemStock: r.systemStock,
        hpp: r.hpp,
        sellPrice: r.sellPrice,
        unit: r.unit,
        reason:
          r.difference === 0
            ? 'Stok Opname Sesuai'
            : r.difference > 0
            ? `Selisih Lebih (+${r.difference}) Stok Opname Live`
            : `Selisih Kurang (${r.difference}) Stok Opname Live`
      }));

    if (adjustments.length === 0) {
      alert('Belum ada obat yang diisi hasil hitung fisiknya.');
      return;
    }

    onApplyStockOpname(adjustments, undefined, selectedOpnameStaff || userName);
    setLastAppliedCount(adjustments.length);
    setShowConfirmModal(false);
    setShowSuccessToast(true);

    // Clear completed counts
    setCounts({});
    const newTime = new Date().toISOString();
    setSessionStartTime(newTime);
    localStorage.setItem('latisha_opname_session_time', newTime);
    localStorage.removeItem('latisha_opname_counts');

    setTimeout(() => {
      setShowSuccessToast(false);
    }, 4000);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner: Live Operating Mode Information */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-md flex flex-wrap justify-between items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Sistem Stok Opname Non-Stop (Apotek Tetap Beroperasi)
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">
            {viewMode === 'history'
              ? 'Riwayat Kegiatan & Rekonsiliasi Stok Opname'
              : 'Rekonsiliasi Stok Opname Live (Real-Time POS Sync)'}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {viewMode === 'history'
              ? 'Arsip lengkap kegiatan stok opname beserta rincian selisih fisik, nominal selisih (HPP), dan petugas pemeriksa.'
              : 'Anda dapat menghitung stok fisik di rak tanpa harus menutup apotek. Setiap transaksi penjualan kasir POS yang terjadi selama sesi opname otomatis disinkronkan secara presisi sehingga tidak menimbulkan selisih semu.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 text-xs">
            <span className="text-[10px] text-slate-300 block font-mono">Sesi Dimulai:</span>
            <span className="font-bold text-white font-mono">
              {new Date(sessionStartTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </span>
          </div>

          {/* Button Riwayat Opname */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'history' ? 'live' : 'history')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer border shadow-sm ${
              viewMode === 'history'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
            }`}
            title="Lihat halaman riwayat kegiatan stok opname"
          >
            <History className="w-4 h-4" />
            <span>{viewMode === 'history' ? 'Kembali ke Form Opname' : 'Riwayat Opname'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
              viewMode === 'history' ? 'bg-slate-950 text-amber-400' : 'bg-white/20 text-white'
            }`}>
              {allOpnameHistory.length}
            </span>
          </button>

          {viewMode === 'live' && (
            <>
              <button
                type="button"
                onClick={handleResetSession}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                title="Reset hasil hitungan fisik sesi ini"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Sesi</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={stats.countedItems === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Terapkan Hasil Opname ({stats.countedItems})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {showSuccessToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <strong className="block text-xs font-bold">Rekonsiliasi Stok Opname Berhasil Diterapkan!</strong>
              <span className="text-[11px] text-emerald-700">
                Sebanyak {lastAppliedCount} item obat telah diperbarui stoknya di master obat dan tercatat resmi di Kartu Stok Digital & Log Audit.
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowSuccessToast(false)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {viewMode === 'history' ? (
        <div className="space-y-4">
          {/* Filter Range Tanggal & Pencarian Riwayat Opname */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari No. Referensi Opname, Nama Petugas, atau Nama Obat..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectHistoryPreset('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    historyPreset === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Waktu
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectHistoryPreset('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    historyPreset === 'today'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectHistoryPreset('7days')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    historyPreset === '7days'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  7 Hari Terakhir
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectHistoryPreset('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    historyPreset === 'month'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectHistoryPreset('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    historyPreset === 'custom'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Rentang Tanggal
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Filter Range Tanggal:
                </span>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => {
                    setHistoryStartDate(e.target.value);
                    setHistoryPreset('custom');
                  }}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-slate-400 font-bold">s/d</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => {
                    setHistoryEndDate(e.target.value);
                    setHistoryPreset('custom');
                  }}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <span className="text-[11px] text-slate-500 font-semibold">
                Menampilkan <strong>{filteredOpnameHistory.length}</strong> kegiatan stokopname
              </span>
            </div>
          </div>

          {/* KPI Summary Riwayat Opname */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Kegiatan Opname</span>
              <div className="font-mono font-black text-xl text-slate-900 mt-1">
                {historySummary.totalSessions} Sesi
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                {historySummary.totalItemsEvaluated} item obat diperiksa
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Selisih Lebih (+)</span>
              <div className="font-mono font-black text-xl text-blue-700 mt-1">
                +Rp {historySummary.totalSurplus.toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                Valuasi Surplus (HPP)
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Selisih Kurang (-)</span>
              <div className="font-mono font-black text-xl text-rose-700 mt-1">
                -Rp {historySummary.totalDeficit.toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                Valuasi Defisit / Susut (HPP)
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Nominal Selisih Bersih</span>
              <div
                className={`font-mono font-black text-xl mt-1 ${
                  historySummary.netNominal >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {historySummary.netNominal >= 0 ? '+' : '-'}Rp {Math.abs(historySummary.netNominal).toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                Tercatat di Laporan Keuangan
              </span>
            </div>
          </div>

          {/* Tabel Daftar Riwayat Kegiatan Stok Opname */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Daftar Riwayat Kegiatan Stok Opname
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Klik baris untuk melihat rincian obat & nominal selisih
              </span>
            </div>

            {filteredOpnameHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <ClipboardCheck className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600 text-xs">
                  Belum ada data riwayat kegiatan stokopname pada rentang tanggal ini.
                </p>
                <p className="text-[11px]">
                  Lakukan perhitungan di Form Opname lalu klik &quot;Terapkan Hasil Opname&quot; untuk menyimpan riwayat.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 text-xs">
                {filteredOpnameHistory.map((rec) => {
                  const isExpanded = expandedRecordId === rec.id;
                  return (
                    <div key={rec.id} className="bg-white">
                      <div
                        onClick={() => setExpandedRecordId(isExpanded ? null : rec.id)}
                        className="p-4 hover:bg-slate-50 transition cursor-pointer flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200 text-xs">
                              {rec.refNo}
                            </span>
                            <span className="font-bold text-slate-800">
                              {rec.date} · {rec.time}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                              Petugas: {rec.petugas}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                            <span>Total Diperiksa: <strong>{rec.totalItemsCounted} Obat</strong></span>
                            <span className="text-emerald-700 font-semibold">Cocok: {rec.matchCount}</span>
                            <span className="text-blue-700 font-semibold">Surplus (+): {rec.surplusCount}</span>
                            <span className="text-rose-700 font-semibold">Defisit (-): {rec.deficitCount}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right font-mono">
                            <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">
                              Nominal SelisihOpname
                            </span>
                            <span
                              className={`text-sm font-black ${
                                rec.netNominalDiff > 0
                                  ? 'text-blue-700'
                                  : rec.netNominalDiff < 0
                                  ? 'text-rose-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {rec.netNominalDiff >= 0 ? '+' : '-'}Rp {Math.abs(rec.netNominalDiff).toLocaleString('id-ID')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedRecordId(isExpanded ? null : rec.id);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isExpanded ? 'Tutup' : 'Rincian'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {onDeleteOpnameRecord && !rec.id.startsWith('OPN-HIST-') && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteOpnameRecord(rec.id);
                                }}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                                title="Hapus riwayat opname ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px] border border-slate-200 bg-white rounded-xl overflow-hidden">
                              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                                <tr>
                                  <th className="p-2 border">Nama Obat</th>
                                  <th className="p-2 border text-center">Stok Sistem</th>
                                  <th className="p-2 border text-center">Stok Fisik</th>
                                  <th className="p-2 border text-center">Selisih Qty</th>
                                  <th className="p-2 border text-right">HPP / Unit</th>
                                  <th className="p-2 border text-right">Nominal Selisih (HPP)</th>
                                  <th className="p-2 border">Keterangan</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {rec.items.map((it, idx) => (
                                  <tr key={`${rec.id}-${idx}`} className="hover:bg-slate-50">
                                    <td className="p-2 border font-bold text-slate-900">{it.medicineName}</td>
                                    <td className="p-2 border text-center font-mono">{it.systemStock} {it.unit}</td>
                                    <td className="p-2 border text-center font-mono font-bold">{it.physicalStock} {it.unit}</td>
                                    <td className="p-2 border text-center font-mono font-bold">
                                      <span
                                        className={
                                          it.difference > 0
                                            ? 'text-blue-700'
                                            : it.difference < 0
                                            ? 'text-rose-700'
                                            : 'text-emerald-700'
                                        }
                                      >
                                        {it.difference > 0 ? `+${it.difference}` : it.difference} {it.unit}
                                      </span>
                                    </td>
                                    <td className="p-2 border text-right font-mono">
                                      Rp {it.hpp.toLocaleString('id-ID')}
                                    </td>
                                    <td
                                      className={`p-2 border text-right font-mono font-bold ${
                                        it.nominalDiffHpp > 0
                                          ? 'text-blue-700'
                                          : it.nominalDiffHpp < 0
                                          ? 'text-rose-700'
                                          : 'text-emerald-700'
                                      }`}
                                    >
                                      {it.nominalDiffHpp >= 0 ? '+' : '-'}Rp {Math.abs(it.nominalDiffHpp).toLocaleString('id-ID')}
                                    </td>
                                    <td className="p-2 border text-slate-600">{it.reason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 4 KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Progress Hitung</span>
                <Boxes className="w-4 h-4 text-sky-500" />
              </div>
          <div className="font-mono font-black text-xl text-slate-900">
            {stats.countedItems} / {stats.totalItems}{' '}
            <span className="text-xs font-bold text-sky-600">({stats.progressPercent}%)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-sky-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Stok Cocok (Akurat)</span>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-mono font-black text-xl text-emerald-700">
            {stats.matchCount} <span className="text-xs font-bold text-slate-500">Obat</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Fisik = Catatan Sistem</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Selisih Kurang (Minus)</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="font-mono font-black text-xl text-rose-600">
            {stats.deficitCount} <span className="text-xs font-bold text-slate-500">Obat</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-rose-600 block">
            - Rp {stats.totalDeficitValue.toLocaleString('id-ID')}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Penjualan Kasir Live</span>
            <ShoppingCart className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="font-mono font-black text-xl text-indigo-700">
            {stats.totalLiveSalesCount} <span className="text-xs font-bold text-slate-500">Item Terjual</span>
          </div>
          <span className="text-[10px] text-indigo-600 font-semibold block">
            Otomatis dihitung tanpa tutup toko
          </span>
        </div>
      </div>

      {/* Control Bar: Search, Category, Rack, Barcode Scanner, & Status Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search by Name or Code */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama obat, kode, atau lokasi rak..."
              className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Quick Barcode Scanner Form */}
          <form onSubmit={handleBarcodeSubmit} className="sm:col-span-3 flex gap-1.5">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={scannedBarcode}
                onChange={(e) => setScannedBarcode(e.target.value)}
                placeholder="Scan / Ketik Barcode..."
                className="w-full pl-9 pr-2 py-2 border rounded-xl text-xs font-mono font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer transition"
            >
              Cari
            </button>
          </form>

          {/* Filter: Category */}
          <div className="sm:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border rounded-xl text-xs font-bold bg-slate-50 text-slate-800"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Rack */}
          <div className="sm:col-span-2">
            <select
              value={selectedRack}
              onChange={(e) => setSelectedRack(e.target.value)}
              className="w-full p-2 border rounded-xl text-xs font-bold bg-slate-50 text-slate-800"
            >
              <option value="ALL">Semua Rak</option>
              {racks.map((r) => (
                <option key={r} value={r}>
                  Rak {r}
                </option>
              ))}
            </select>
          </div>

          {/* Action: Quick Match Filtered */}
          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={handleSetAllFilteredMatch}
              title="Set semua obat yang tampil menjadi sesuai stok sistem"
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition flex items-center justify-center cursor-pointer border border-slate-300"
            >
              Set Cocok
            </button>
          </div>
        </div>

        {/* Status Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-2">Status Opname:</span>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition text-xs cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({reconciledItems.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('UNCOUNTED')}
            className={`px-3 py-1 rounded-lg font-bold transition text-xs cursor-pointer ${
              statusFilter === 'UNCOUNTED'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Belum Dihitung ({reconciledItems.filter((r) => !r.hasCounted).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('COUNTED')}
            className={`px-3 py-1 rounded-lg font-bold transition text-xs cursor-pointer ${
              statusFilter === 'COUNTED'
                ? 'bg-sky-600 text-white'
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
            }`}
          >
            Sudah Dihitung ({stats.countedItems})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DISCREPANCY')}
            className={`px-3 py-1 rounded-lg font-bold transition text-xs cursor-pointer ${
              statusFilter === 'DISCREPANCY'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Ada Selisih ({stats.surplusCount + stats.deficitCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('MATCH')}
            className={`px-3 py-1 rounded-lg font-bold transition text-xs cursor-pointer ${
              statusFilter === 'MATCH'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Cocok 100% ({stats.matchCount})
          </button>
        </div>
      </div>

      {/* Main Stock Opname Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-600 text-[11px]">
              <tr>
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3 min-w-[200px]">Produk Obat & Rak</th>
                <th className="p-3 text-center w-24">Stok Sistem</th>
                <th className="p-3 text-center w-24">Terjual Live</th>
                <th className="p-3 text-center w-36">Hitung Fisik di Rak</th>
                <th className="p-3 text-center w-28">Selisih</th>
                <th className="p-3 text-right w-32">Nilai Selisih (HPP)</th>
                <th className="p-3 text-center w-24">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400 italic">
                    Tidak ada data obat yang sesuai dengan kriteria filter stok opname.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.status === 'DEFICIT'
                          ? 'bg-rose-50/50 hover:bg-rose-50'
                          : item.status === 'SURPLUS'
                          ? 'bg-blue-50/50 hover:bg-blue-50'
                          : item.status === 'MATCH'
                          ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* No */}
                      <td className="p-3 text-center text-slate-400 font-mono text-[10px]">
                        {idx + 1}
                      </td>

                      {/* Product Name & Details */}
                      <td className="p-3">
                        <strong className="text-slate-900 block text-xs">{item.name}</strong>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-mono">
                          <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-700 font-semibold">
                            Rak: {item.rack || '-'}
                          </span>
                          <span>·</span>
                          <span>{item.category}</span>
                          <span>·</span>
                          <span>ED: {item.expDate}</span>
                        </div>
                      </td>

                      {/* System Stock */}
                      <td className="p-3 text-center font-mono">
                        <span className="font-extrabold text-slate-800 text-sm block">
                          {item.systemStock}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </td>

                      {/* Live Sales during Opname */}
                      <td className="p-3 text-center font-mono">
                        {item.liveSales > 0 ? (
                          <div className="inline-block px-2 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 text-[11px] font-bold">
                            <span className="block text-[9px] uppercase text-indigo-600">POS Kasir</span>
                            -{item.liveSales} {item.unit}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Physical Stock Input */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.physicalStock}
                            onChange={(e) => handlePhysicalStockChange(item.id, e.target.value)}
                            placeholder={item.systemStock.toString()}
                            className={`w-24 p-2 text-center font-mono font-black text-sm rounded-xl border outline-none transition ${
                              item.hasCounted
                                ? item.status === 'MATCH'
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 focus:ring-2 focus:ring-emerald-500'
                                  : item.status === 'DEFICIT'
                                  ? 'bg-rose-50 border-rose-400 text-rose-950 focus:ring-2 focus:ring-rose-500'
                                  : 'bg-blue-50 border-blue-400 text-blue-950 focus:ring-2 focus:ring-blue-500'
                                : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Difference */}
                      <td className="p-3 text-center font-mono font-bold text-xs">
                        {item.hasCounted ? (
                          item.difference === 0 ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full inline-flex items-center gap-1 text-[11px]">
                              <Check className="w-3 h-3 text-emerald-700" /> Cocok
                            </span>
                          ) : item.difference > 0 ? (
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full inline-flex items-center gap-1 text-[11px]">
                              <TrendingUp className="w-3 h-3 text-blue-700" /> +{item.difference}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full inline-flex items-center gap-1 text-[11px]">
                              <TrendingDown className="w-3 h-3 text-rose-700" /> {item.difference}
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum dihitung</span>
                        )}
                      </td>

                      {/* Discrepancy Value (HPP) */}
                      <td className="p-3 text-right font-mono font-bold text-xs">
                        {item.hasCounted ? (
                          item.diffValueHpp === 0 ? (
                            <span className="text-slate-400">Rp 0</span>
                          ) : item.diffValueHpp > 0 ? (
                            <span className="text-blue-700">+Rp {item.diffValueHpp.toLocaleString('id-ID')}</span>
                          ) : (
                            <span className="text-rose-700">
                              -Rp {Math.abs(item.diffValueHpp).toLocaleString('id-ID')}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSetMatch(item.id, item.systemStock)}
                          title="Set hitung fisik = stok sistem"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 rounded-lg text-[10px] font-bold transition cursor-pointer border border-slate-200"
                        >
                          Cocok
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Confirmation Modal Before Applying Opname */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  Konfirmasi Posting Rekonsiliasi Stok Opname
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-800">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-600 uppercase text-[10px] block">
                  Ringkasan Hasil Perhitungan Fisik:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Total Item Dihitung:</span>
                    <strong className="block text-slate-900 font-mono text-sm">
                      {stats.countedItems} Produk
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Akurasi Cocok (0 Selisih):</span>
                    <strong className="block text-emerald-700 font-mono text-sm">
                      {stats.matchCount} Produk
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Selisih Lebih (Surplus):</span>
                    <strong className="block text-blue-700 font-mono text-sm">
                      +{stats.surplusCount} Produk (+Rp {stats.totalSurplusValue.toLocaleString('id-ID')})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Selisih Kurang (Minus):</span>
                    <strong className="block text-rose-700 font-mono text-sm">
                      -{stats.deficitCount} Produk (-Rp {stats.totalDeficitValue.toLocaleString('id-ID')})
                    </strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Petugas Pelaksana Stok Opname (Data Pegawai) *
                </label>
                {staffList.length > 0 ? (
                  <select
                    value={selectedOpnameStaff}
                    onChange={(e) => setSelectedOpnameStaff(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {!staffList.some((s) => s.name === selectedOpnameStaff) && (
                      <option value={selectedOpnameStaff}>{selectedOpnameStaff}</option>
                    )}
                    {staffList
                      .filter((s) => s.status !== 'Non-Aktif')
                      .map((st) => (
                        <option key={st.id} value={st.name}>
                          {st.name} ({st.role})
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedOpnameStaff}
                    onChange={(e) => setSelectedOpnameStaff(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900"
                  />
                )}
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 text-[11px] leading-relaxed">
                <strong>Ketentuan Posting:</strong> Sistem akan langsung memperbarui stok akhir di Master Obat sesuai
                hasil hitung fisik. Catatan penyesuaian akan otomatis dicatat pada <em>Kartu Stok Digital FEFO</em> dengan tipe
                <strong> STOK_OPNAME</strong> oleh petugas <strong>{selectedOpnameStaff || userName}</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteApplyOpname}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Ya, Terapkan Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
