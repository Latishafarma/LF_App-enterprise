import React, { useState } from 'react';
import {
  TrendingUp,
  Boxes,
  Users,
  FileCheck2,
  AlertTriangle,
  Receipt,
  Stethoscope,
  Volume2,
  Globe,
  ArrowRight,
  ShieldCheck,
  Building2,
  Activity,
  AlertCircle,
  Clock,
  RotateCcw,
  Tag,
  Sparkles,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';
import { Transaction, Medicine, PatientQueue, EPrescription, Branch } from '../types';

interface DashboardViewProps {
  transactions: Transaction[];
  medicines: Medicine[];
  queue: PatientQueue[];
  prescriptions: EPrescription[];
  currentBranch: Branch;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  medicines,
  queue,
  prescriptions,
  currentBranch,
  onNavigateTab
}) => {
  const [edFilter, setEdFilter] = useState<'all' | 'critical' | 'expired'>('all');

  const totalRevenue = transactions.reduce((acc, t) => acc + t.total, 0);
  const totalProfit = transactions.reduce((acc, t) => acc + (t.profit || 0), 0);
  const lowStockCount = medicines.filter((m) => m.stock <= m.minStock).length;
  const pendingRx = prescriptions.filter((p) => p.status === 'Pending Skrining').length;
  const totalAssetHpp = medicines.reduce((acc, m) => acc + m.stock * m.hpp, 0);

  // =========================================================================
  // MODUL 1: NOTIFIKASI OTOMATIS OBAT KEDALUWARSA (< 3 BULAN / 90 HARI)
  // =========================================================================
  const now = new Date();
  const nearExpMedicines = medicines
    .map((m) => {
      const expDateObj = new Date(m.expDate);
      const diffMs = expDateObj.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const valueLossHpp = m.stock * m.hpp;
      return {
        ...m,
        daysLeft,
        valueLossHpp,
        isExpired: daysLeft <= 0,
        isCritical: daysLeft > 0 && daysLeft <= 30,
        isWarning: daysLeft > 30 && daysLeft <= 90
      };
    })
    .filter((m) => m.daysLeft <= 90)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const totalLossHpp = nearExpMedicines.reduce((acc, m) => acc + m.valueLossHpp, 0);
  const expiredCount = nearExpMedicines.filter((m) => m.daysLeft <= 0).length;
  const criticalCount = nearExpMedicines.filter((m) => m.daysLeft > 0 && m.daysLeft <= 30).length;
  const warningCount = nearExpMedicines.filter((m) => m.daysLeft > 30 && m.daysLeft <= 90).length;

  const filteredExpMedicines = nearExpMedicines.filter((m) => {
    if (edFilter === 'expired') return m.daysLeft <= 0;
    if (edFilter === 'critical') return m.daysLeft > 0 && m.daysLeft <= 30;
    return true;
  });

  // =========================================================================
  // MODUL 2: TREN INTERAKSI OBAT (DRP) BULAN INI DENGAN RECHARTS
  // =========================================================================
  const drpTrendData = [
    {
      name: 'Kortikosteroid + NSAID',
      shortName: 'Steroid+NSAID',
      count: 18,
      severity: 'Sedang',
      color: '#f59e0b',
      mechanism: 'Peningkatan risiko ulkus peptikum, perdarahan saluran cerna atas & erosi lambung ganda.',
      recommendation: 'Berikan gastroprotektor PPI (Omeprazole) atau ganti analgetik parasetamol.',
      reference: 'BNF 86 hal. 620 & Lexicomp Drug Interactions',
      referenceUrl: 'https://www.drugs.com/drug-interactions.html'
    },
    {
      name: 'NSAID + Antihipertensi',
      shortName: 'NSAID+Tensi',
      count: 14,
      severity: 'Sedang',
      color: '#f59e0b',
      mechanism: 'NSAID menahan ekskresi natrium-air & menumpulkan efektivitas obat antihipertensi 3-6 mmHg.',
      recommendation: 'Batasi penggunaan NSAID max 3-5 hari atau ganti analgetik lini pertama.',
      reference: 'BNF 86 hal. 1105 & Pedoman PERKI Hipertensi',
      referenceUrl: 'https://inaheart.org/panduan-klinis/'
    },
    {
      name: 'ISPA Virus + Antibiotik',
      shortName: 'ISPA+Antibiotik',
      count: 12,
      severity: 'Sedang',
      color: '#f59e0b',
      mechanism: 'Common cold >90% disebabkan virus; peresepan antibiotik tergolong Obat Tanpa Indikasi.',
      recommendation: 'Edukasi terapi simptomatik rasional untuk menekan resistensi antimikroba (AMR).',
      reference: 'Pedoman Praktik Klinis Kemenkes RI No. 514/2015',
      referenceUrl: 'https://yankes.kemkes.go.id/unduhan/fileunduhan_1610411306_913506.pdf'
    },
    {
      name: 'Antihistamin Overdose',
      shortName: 'Dosis Setirizin',
      count: 9,
      severity: 'Sedang',
      color: '#38bdf8',
      mechanism: 'Cetirizine half-life 24 jam; peresepan 2-3x sehari memicu sedasi berlebih & polifarmasi.',
      recommendation: 'Koreksi frekuensi menjadi 1x1 tablet per hari malam hari.',
      reference: 'BPOM PIONAS Setirizin & BNF 86 hal. 312',
      referenceUrl: 'https://pionas.pom.go.id/monografi/setirizin-hidroklorida'
    },
    {
      name: 'Alergi Penisilin / Betalaktam',
      shortName: 'Alergi Betalaktam',
      count: 5,
      severity: 'Kritis',
      color: '#dc2626',
      mechanism: 'Riwayat hipersensitivitas tipe I diperantarai IgE berisiko memicu anafilaksis fatal.',
      recommendation: 'Hentikan segera; ganti antibiotik golongan makrolida (Azitromisin).',
      reference: 'BNF 86 Bab 5.1.1 & Lexicomp Drug Allergy Reference',
      referenceUrl: 'https://pionas.pom.go.id/monografi/amoksisilin'
    },
    {
      name: 'CCB + Makrolida',
      shortName: 'CCB+Makrolida',
      count: 4,
      severity: 'Kritis',
      color: '#dc2626',
      mechanism: 'Penghambatan CYP3A4 meningkatkan kadar Amlodipine hingga memicu hipotensi berat & syok.',
      recommendation: 'Ganti antibiotik alternatif atau pantau ketat tekanan darah & EKG.',
      reference: 'Stockley\'s Drug Interactions & Lexicomp',
      referenceUrl: 'https://www.drugs.com/drug-interactions.html'
    }
  ];

  const totalDrpThisMonth = drpTrendData.reduce((acc, item) => acc + item.count, 0);

  // Custom Tooltip Recharts
  const CustomDrpTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs max-w-xs space-y-1.5 animate-in fade-in">
          <div className="flex justify-between items-center gap-2">
            <span className="font-extrabold text-sm text-amber-300">{data.name}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase text-white ${
                data.severity === 'Kritis' ? 'bg-rose-600' : 'bg-amber-500'
              }`}
            >
              {data.severity}
            </span>
          </div>
          <div className="text-slate-300">
            Frekuensi Terdeteksi: <strong className="text-white font-mono">{data.count} Kasus</strong> bulan ini
          </div>
          <p className="text-[11px] text-slate-300 leading-tight">
            <strong>Mekanisme:</strong> {data.mechanism}
          </p>
          <div className="pt-1 border-t border-slate-800 text-[10px] text-sky-300 font-mono flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-sky-400 shrink-0" />
            <span>Ref: {data.reference}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-md flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest">
              Sistem Terpadu Aktif
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
            Dashboard Manajemen Apotek & Praktek Dokter Latisha Farma
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Lokasi Aktif: <strong className="text-white">{currentBranch.name}</strong> · Sinkronisasi Real-Time Multi-Cabang Berjalan Normal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateTab('fo-antrean')}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>Layar Antrean Suara</span>
          </button>
          <button
            onClick={() => onNavigateTab('pos-kasir')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Kasir POS Farmasi</span>
          </button>
        </div>
      </div>

      {/* 4 Top KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Total Omzet Penjualan
          </span>
          <div className="font-mono font-black text-2xl text-slate-900 mt-1">
            Rp {totalRevenue.toLocaleString('id-ID')}
          </div>
          <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
            ✓ {transactions.length} Struk Terbayar
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Estimasi Laba Kotor (Profit)
          </span>
          <div className="font-mono font-black text-2xl text-emerald-600 mt-1">
            Rp {totalProfit.toLocaleString('id-ID')}
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            Margin Penjualan Farmasi
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Pasien Antrean Hari Ini
          </span>
          <div className="font-mono font-black text-2xl text-sky-800 mt-1">
            {queue.length} Pasien
          </div>
          <span className="text-[11px] text-sky-600 font-bold mt-1 block">
            {queue.filter((q) => q.status === 'Menunggu').length} Menunggu Diperiksa
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Valuasi Stok Inventaris (HPP)
          </span>
          <div className="font-mono font-black text-2xl text-slate-900 mt-1">
            Rp {totalAssetHpp.toLocaleString('id-ID')}
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            {medicines.length} Produk Master Obat
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FITUR 1: MODUL NOTIFIKASI OTOMATIS OBAT KEDALUWARSA (< 3 BULAN)         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-rose-200 shadow-sm overflow-hidden space-y-4">
        {/* Banner Alert Header */}
        <div className="p-6 bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 text-white flex flex-wrap justify-between items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-rose-500 text-white rounded-lg shadow-sm">
                <AlertTriangle className="w-4 h-4 animate-bounce" />
              </span>
              <span className="text-[11px] font-mono font-black text-rose-300 uppercase tracking-widest">
                Pusat Mitigasi Kerugian Inventaris
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight text-white">
              Peringatan Otomatis Obat Masa Kedaluwarsa (ED &lt; 3 Bulan)
            </h3>
            <p className="text-xs text-rose-200/90 max-w-2xl">
              Deteksi dini obat yang mendekati atau telah melampaui tanggal kedaluwarsa untuk segera diproses retur ke PBF atau diprioritaskan penjualannya menggunakan prinsip FEFO (First-Expired, First-Out).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-right">
              <span className="text-[10px] uppercase font-bold text-rose-200 block">
                Total Nilai Terancam Rugi (HPP)
              </span>
              <span className="font-mono font-black text-lg text-amber-300">
                Rp {totalLossHpp.toLocaleString('id-ID')}
              </span>
            </div>

            <button
              onClick={() => onNavigateTab('inv-retur')}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Buat Retur ke PBF</span>
            </button>
          </div>
        </div>

        {/* Filter Status & KPI Mini Badges */}
        <div className="px-6 flex flex-wrap justify-between items-center gap-3 text-xs border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setEdFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                edFilter === 'all'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Semua Terancam ED (&lt; 90 Hari)</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-full font-mono text-[10px]">
                {nearExpMedicines.length}
              </span>
            </button>

            <button
              onClick={() => setEdFilter('critical')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                edFilter === 'critical'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Mendesak (&lt; 30 Hari)</span>
              <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full font-mono text-[10px]">
                {criticalCount}
              </span>
            </button>

            <button
              onClick={() => setEdFilter('expired')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                edFilter === 'expired'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Sudah Lewat (Expired)</span>
              <span className="px-1.5 py-0.2 bg-slate-800 text-white rounded-full font-mono text-[10px]">
                {expiredCount}
              </span>
            </button>
          </div>

          <div className="text-slate-500 text-[11px] flex items-center gap-2">
            <span>Rincian: <strong>{expiredCount}</strong> expired · <strong>{criticalCount}</strong> &lt; 30 hari · <strong>{warningCount}</strong> 31-90 hari</span>
          </div>
        </div>

        {/* Tabel Interaktif Daftar Obat ED */}
        <div className="px-6 pb-6">
          {filteredExpMedicines.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-60" />
              <p className="font-bold text-slate-700 text-xs">
                Tidak ada stok obat yang terancam kedaluwarsa pada kategori filter ini.
              </p>
              <p className="text-[11px] text-slate-500">
                Seluruh batch obat saat ini berada di atas batas aman 3 bulan (90 hari).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Nama Produk Obat</th>
                    <th className="p-3">Kategori & Bentuk</th>
                    <th className="p-3">Batch & Rak</th>
                    <th className="p-3 text-center">Tgl Kedaluwarsa</th>
                    <th className="p-3 text-center">Sisa Hari</th>
                    <th className="p-3 text-right">Sisa Stok Fisik</th>
                    <th className="p-3 text-right">Estimasi Nilai HPP</th>
                    <th className="p-3 text-center">Status & Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpMedicines.map((m) => {
                    const isExp = m.daysLeft <= 0;
                    const isCrit = m.daysLeft > 0 && m.daysLeft <= 30;

                    return (
                      <tr
                        key={m.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isExp
                            ? 'bg-rose-50/40'
                            : isCrit
                            ? 'bg-amber-50/40'
                            : ''
                        }`}
                      >
                        <td className="p-3 font-extrabold text-slate-900">
                          <div>{m.name}</div>
                          <span className="text-[10px] font-mono text-slate-400">Barcode: {m.barcode}</span>
                        </td>
                        <td className="p-3 text-slate-600">
                          <div>{m.category}</div>
                          <span className="text-[10px] text-slate-400">{m.form}</span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-700">
                          <div>No: {m.batchNo}</div>
                          <span className="text-[10px] text-slate-500">Rak: {m.rack}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800">
                          {m.expDate}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full font-mono font-black text-[10px] ${
                              isExp
                                ? 'bg-rose-600 text-white animate-pulse'
                                : isCrit
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {isExp ? `LEWAT (${Math.abs(m.daysLeft)}h)` : `${m.daysLeft} hari`}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-900">
                          {m.stock} {m.unit}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-rose-700">
                          Rp {m.valueLossHpp.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => onNavigateTab('inv-retur')}
                            title="Ajukan retur pembelian ke distributor PBF"
                            className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                          >
                            Retur PBF
                          </button>
                          <button
                            onClick={() => onNavigateTab('pos-kasir')}
                            title="Buka kasir untuk cuci gudang / diskon FEFO"
                            className="px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                          >
                            Diskon FEFO
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FITUR 2: DIAGRAM BATANG TREN DRP BULAN INI (RECHARTS)                     */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-wrap justify-between items-start border-b border-slate-200 pb-4 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                <Activity className="w-4 h-4 text-indigo-600" />
              </span>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                Tren Interaksi Obat (DRPs) Paling Umum Bulan Ini
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                Clinical Decision Support System
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Statistik frekuensi Drug-Related Problems yang berhasil diidentifikasi dan dicegah apoteker berlandaskan standar <strong>BNF 86</strong>, <strong>Lexicomp</strong>, dan <strong>Pedoman Praktik Klinis Kemenkes RI</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-right">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">
                Total DRPs Terdeteksi
              </span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {totalDrpThisMonth} Kasus
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('pos-resep')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Buka Skrining Resep</span>
            </button>
          </div>
        </div>

        {/* Visual Recharts BarChart & Clinical Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* BarChart Container (8 cols) */}
          <div className="lg:col-span-8 h-[300px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={drpTrendData}
                margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="shortName"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomDrpTooltip />} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={36}>
                  {drpTrendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Clinical Insights Card (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Efektivitas Skrining Farmasi</span>
            </h4>

            <div className="space-y-2">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">
                  Interaksi Tertinggi (Peringkat 1)
                </span>
                <span className="font-extrabold text-slate-900 text-xs block mt-0.5">
                  Kortikosteroid + NSAID (18 Kasus)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Berhasil dicegah dengan pemberian gastroprotektor PPI atau penyesuaian aturan minum sesudah makan.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">
                  Pencegahan Alergi Kritis
                </span>
                <span className="font-extrabold text-rose-700 text-xs block mt-0.5">
                  5 Kasus Alergi Penisilin / Betalaktam
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dicegah 100% sebelum peracikan, dialihkan ke antibiotik makrolida aman.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Rasio Intervensi Sukses:</span>
              <span className="font-black text-emerald-700 font-mono">98.2% Lolos Monitoring</span>
            </div>
          </div>
        </div>

        {/* Legend & Literature Links */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-full bg-rose-600" />
              Bahaya Kritis (Alergi / Toksisitas Fatal)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              Perhatian Sedang (Interaksi DDI / Indikasi)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-full bg-sky-400" />
              Penyesuaian Dosis Lazim
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">Rujukan Utama:</span>
            <a
              href="https://bnf.nice.org.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-0.5"
            >
              <span>BNF NICE UK</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span>·</span>
            <a
              href="https://pionas.pom.go.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-0.5"
            >
              <span>BPOM PIONAS</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Middle Row: Quick Navigation & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Quick Nav Cards (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
              Modul Pelayanan & Navigasi Cepat
            </h3>
            <span className="text-xs text-slate-400 font-medium">Akses langsung fitur utama</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              onClick={() => onNavigateTab('rme-pemeriksaan')}
              className="p-4 bg-sky-50/70 hover:bg-sky-100/70 rounded-2xl border border-sky-200 cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-sky-800">
                  Ruang Periksa Dokter
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Input SOAP, ICD-10 & e-resep otomatis
                </p>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('pos-resep')}
              className="p-4 bg-amber-50/70 hover:bg-amber-100/70 rounded-2xl border border-amber-200 cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-amber-800">
                    Antrean E-Resep & Skrining
                  </h4>
                  {pendingRx > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full">
                      {pendingRx}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Skrining klinis & teruskan ke kasir POS
                </p>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('fo-online')}
              className="p-4 bg-indigo-50/70 hover:bg-indigo-100/70 rounded-2xl border border-indigo-200 cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-indigo-800">
                  Pendaftaran Online
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Verifikasi booking pasien mandiri
                </p>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('inv-defecta')}
              className="p-4 bg-orange-50/70 hover:bg-orange-100/70 rounded-2xl border border-orange-200 cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-orange-800">
                  Defecta & Re-Order
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {lowStockCount} obat di bawah buffer min
                </p>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('keuangan-labarugi')}
              className="p-4 bg-emerald-50/70 hover:bg-emerald-100/70 rounded-2xl border border-emerald-200 cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-emerald-800">
                  Laba Rugi Otomatis
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Laporan keuangan terintegrasi HPP
                </p>
              </div>
            </div>

            <div
              onClick={() => onNavigateTab('sys-cabang')}
              className="p-4 bg-cyan-50/70 hover:bg-cyan-100/70 rounded-2xl border border-cyan-200 cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-cyan-800">
                  Multi-Cabang & Transfer
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Matriks stok & sync 4 cabang
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Warnings & FEFO Monitoring (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Peringatan Stok Rendah (Defecta)
            </h4>
            <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {lowStockCount} Item Menipis
            </span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar text-xs">
            {lowStockCount === 0 ? (
              <p className="text-slate-400 italic text-center py-8">
                Semua stok obat dalam kondisi aman di atas buffer minimum.
              </p>
            ) : (
              medicines
                .filter((m) => m.stock <= m.minStock)
                .map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <strong className="text-rose-900 block font-bold">{m.name}</strong>
                      <span className="text-[10px] text-slate-600">
                        Sisa: <strong className="text-rose-700 font-mono">{m.stock} {m.unit}</strong> (Buffer Min: {m.minStock})
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-200 text-rose-800 rounded font-black text-[9px]">
                      DEFECTA
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
