import React from 'react';
import {
  LayoutDashboard,
  Users,
  Activity,
  Globe,
  Stethoscope,
  FolderOpen,
  FileSpreadsheet,
  Receipt,
  FileCheck2,
  Boxes,
  ClipboardList,
  Truck,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Settings,
  GitBranch,
  ShieldAlert,
  Volume2,
  FileText,
  Handshake,
  Building2,
  RotateCcw,
  Database,
  ClipboardCheck,
  FlaskConical,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingResepCount: number;
  pendingOnlineCount: number;
  activeRole: string;
  allowedPermissions?: string[];
  staffRoles?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingResepCount,
  pendingOnlineCount,
  activeRole,
  allowedPermissions,
  staffRoles = []
}) => {
  const isAdmin =
    activeRole === 'Super Admin / APJ' || staffRoles.includes('Super Admin / APJ');

  const canAccess = (permId: string): boolean => {
    if (isAdmin) return true;
    if (!allowedPermissions) return true;
    return allowedPermissions.includes(permId);
  };

  const hasFrontOffice =
    canAccess('fo-antrean') ||
    canAccess('fo-pasien') ||
    canAccess('fo-checkin') ||
    canAccess('fo-online');

  const hasRME =
    canAccess('rme-pemeriksaan') ||
    canAccess('rme-cek-lab') ||
    canAccess('rme-riwayat') ||
    canAccess('rme-laporan');

  const hasPOS =
    canAccess('pos-kasir') || canAccess('pos-resep') || canAccess('pos-riwayat');

  const hasInventory =
    canAccess('inv-master') ||
    canAccess('inv-kartu-stok') ||
    canAccess('inv-stok-opname') ||
    canAccess('inv-pembelian') ||
    canAccess('inv-retur-riwayat') ||
    canAccess('inv-defecta');

  const hasFinance =
    canAccess('keuangan-labarugi') ||
    canAccess('keuangan-hutang-piutang') ||
    canAccess('keuangan-setting');

  const hasSystem = canAccess('sys-cabang') || canAccess('sys-audit');

  const hasSetup =
    canAccess('setup-mitra') ||
    canAccess('setup-supplier') ||
    canAccess('setup-database');

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shrink-0 select-none">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Main Tab Links */}
        {canAccess('dashboard') && (
          <div className="p-3 border-b border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-sky-400" />
              <span>Dashboard Eksekutif</span>
            </button>
          </div>
        )}

        <nav className="p-3 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {/* MODUL 1: FRONT OFFICE & ANTREAN */}
          {hasFrontOffice && (
            <div>
              <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                1. Front Office & Antrean
              </p>
              <div className="space-y-0.5">
                {canAccess('fo-antrean') && (
                  <button
                    onClick={() => setActiveTab('fo-antrean')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'fo-antrean'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Volume2 className="w-4 h-4 text-indigo-400" />
                      <span>Live Monitor & Suara</span>
                    </span>
                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      Voice
                    </span>
                  </button>
                )}

                {canAccess('fo-pasien') && (
                  <button
                    onClick={() => setActiveTab('fo-pasien')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'fo-pasien'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Master Pasien & Kartu QR</span>
                  </button>
                )}

                {canAccess('fo-checkin') && (
                  <button
                    onClick={() => setActiveTab('fo-checkin')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'fo-checkin'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-rose-400" />
                    <span>Check-in & Tanda Vital</span>
                  </button>
                )}

                {canAccess('fo-online') && (
                  <button
                    onClick={() => setActiveTab('fo-online')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'fo-online'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-sky-400" />
                      <span>Pendaftaran Online</span>
                    </span>
                    {pendingOnlineCount > 0 && (
                      <span className="bg-sky-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                        {pendingOnlineCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MODUL 2: PELAYANAN DOKTER & RME */}
          {hasRME && (
            <div>
              <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                2. Pelayanan Dokter & RME
              </p>
              <div className="space-y-0.5">
                {canAccess('rme-pemeriksaan') && (
                  <button
                    onClick={() => setActiveTab('rme-pemeriksaan')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'rme-pemeriksaan'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 text-sky-400" />
                    <span>Ruang Periksa Dokter (SOAP)</span>
                  </button>
                )}

                {canAccess('rme-cek-lab') && (
                  <button
                    onClick={() => setActiveTab('rme-cek-lab')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'rme-cek-lab'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <FlaskConical className="w-4 h-4 text-purple-400" />
                      <span>Cek Lab & Diagnostik</span>
                    </span>
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      Lab
                    </span>
                  </button>
                )}

                {canAccess('rme-riwayat') && (
                  <button
                    onClick={() => setActiveTab('rme-riwayat')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'rme-riwayat'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <FolderOpen className="w-4 h-4 text-emerald-400" />
                    <span>Arsip e-RME & Riwayat</span>
                  </button>
                )}

                {canAccess('rme-laporan') && (
                  <button
                    onClick={() => setActiveTab('rme-laporan')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'rme-laporan'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    <span>Laporan Medis & Morbiditas</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MODUL 3: FARMASI & KASIR POS */}
          {hasPOS && (
            <div>
              <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                3. Farmasi & Kasir POS
              </p>
              <div className="space-y-0.5">
                {canAccess('pos-kasir') && (
                  <button
                    onClick={() => setActiveTab('pos-kasir')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'pos-kasir'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    <span>Form POS Kasir Multi-Tier</span>
                  </button>
                )}

                {canAccess('pos-resep') && (
                  <button
                    onClick={() => setActiveTab('pos-resep')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'pos-resep'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <FileCheck2 className="w-4 h-4 text-amber-400" />
                      <span>Antrean E-Resep & Skrining</span>
                    </span>
                    {pendingResepCount > 0 && (
                      <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                        {pendingResepCount}
                      </span>
                    )}
                  </button>
                )}

                {canAccess('pos-riwayat') && (
                  <button
                    onClick={() => setActiveTab('pos-riwayat')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'pos-riwayat'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Riwayat & Faktur Penjualan</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MODUL 4: INVENTARIS PUSAT & LOGISTIK */}
          {hasInventory && (
            <div>
              <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                4. Inventaris & Logistik Pusat
              </p>
              <div className="space-y-0.5">
                {canAccess('inv-master') && (
                  <button
                    onClick={() => setActiveTab('inv-master')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'inv-master'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Boxes className="w-4 h-4 text-sky-400" />
                    <span>Master Obat & Harga Bertingkat</span>
                  </button>
                )}

                {canAccess('inv-kartu-stok') && (
                  <button
                    onClick={() => setActiveTab('inv-kartu-stok')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'inv-kartu-stok'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4 text-indigo-400" />
                    <span>Kartu Stok Digital (FEFO)</span>
                  </button>
                )}

                {canAccess('inv-stok-opname') && (
                  <button
                    onClick={() => setActiveTab('inv-stok-opname')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'inv-stok-opname'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                      <span>Stok Opname</span>
                    </span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      Live
                    </span>
                  </button>
                )}

                {canAccess('inv-pembelian') && (
                  <button
                    onClick={() => setActiveTab('inv-pembelian')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'inv-pembelian'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-teal-400" />
                    <span>Pembelian & Faktur PBF</span>
                  </button>
                )}

                {canAccess('inv-retur-riwayat') && (
                  <button
                    onClick={() => setActiveTab('inv-retur-riwayat')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'inv-retur-riwayat'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    <span>Retur Pembelian</span>
                  </button>
                )}

                {canAccess('inv-defecta') && (
                  <button
                    onClick={() => setActiveTab('inv-defecta')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'inv-defecta'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <span>Defecta & Re-Order Otomatis</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MODUL 5: KEUANGAN & AKUNTANSI */}
          {hasFinance && (
            <div>
              <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                5. Keuangan & Akuntansi
              </p>
              <div className="space-y-0.5">
                {canAccess('keuangan-labarugi') && (
                  <button
                    onClick={() => setActiveTab('keuangan-labarugi')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'keuangan-labarugi'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Laba Rugi & Valuasi Aset</span>
                  </button>
                )}

                {canAccess('keuangan-hutang-piutang') && (
                  <button
                    onClick={() => setActiveTab('keuangan-hutang-piutang')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'keuangan-hutang-piutang'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>Hutang & Piutang</span>
                  </button>
                )}

                {canAccess('keuangan-setting') && (
                  <button
                    onClick={() => setActiveTab('keuangan-setting')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'keuangan-setting'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Pengaturan Tarif & Jasa</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MODUL 6: SISTEM & MULTI-CABANG */}
          {hasSystem && (
            <div>
              <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                6. Sistem & Multi-Cabang
              </p>
              <div className="space-y-0.5">
                {canAccess('sys-cabang') && (
                  <button
                    onClick={() => setActiveTab('sys-cabang')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'sys-cabang'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <GitBranch className="w-4 h-4 text-sky-400" />
                    <span>Sinkronisasi Multi-Cabang</span>
                  </button>
                )}

                {canAccess('sys-audit') && (
                  <button
                    onClick={() => setActiveTab('sys-audit')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'sys-audit'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    <span>Audit Trail & Riwayat Log</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MODUL 7: SETUP */}
          {hasSetup && (
            <div>
              <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                7. Setup
              </p>
              <div className="space-y-0.5">
                {canAccess('setup-mitra') && (
                  <button
                    onClick={() => setActiveTab('setup-mitra')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'setup-mitra'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Handshake className="w-4 h-4 text-emerald-400" />
                    <span>Mitra (Fasilitas Kesehatan)</span>
                  </button>
                )}

                {canAccess('setup-supplier') && (
                  <button
                    onClick={() => setActiveTab('setup-supplier')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'setup-supplier'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-sky-400" />
                    <span>Supplier (Distributor & PBF)</span>
                  </button>
                )}

                {canAccess('setup-database') && (
                  <button
                    onClick={() => setActiveTab('setup-database')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'setup-database'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>Export & Import Database</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* Footer Info with Active Role & Hak Akses Badge */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1 text-slate-400 font-bold truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{activeRole}</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-mono font-bold text-[9px] shrink-0">
            {allowedPermissions ? `${allowedPermissions.length} Hak Akses` : 'Penuh'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 flex items-center justify-between">
          <span className="font-semibold">Latisha Farma V8.0</span>
          <span className="text-emerald-400 font-bold">Online</span>
        </div>
      </div>
    </aside>
  );
};
