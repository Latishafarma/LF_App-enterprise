import React from 'react';
import {
  Building2,
  RefreshCw,
  Smartphone,
  Monitor,
  Settings,
  LogOut,
  Wifi,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { Branch, Staff, StaffRole, getStaffActiveRoles } from '../types';

interface HeaderProps {
  currentBranch: Branch;
  branches: Branch[];
  onSelectBranch: (branch: Branch) => void;
  activeRole: string;
  userName: string;
  currentStaff?: Staff;
  allowedPermissions?: string[];
  isMobileMode: boolean;
  onToggleMobileMode: () => void;
  onLogout: () => void;
  onSyncNow: () => void;
  isSyncing: boolean;
  onOpenLiveMonitor: () => void;
  onOpenSettings?: (tab?: 'apotek' | 'apj' | 'dpj' | 'pegawai') => void;
  pendingShiftApprovalCount?: number;
  onNavigateToCashierShiftApproval?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentBranch,
  branches,
  onSelectBranch,
  activeRole,
  userName,
  currentStaff,
  allowedPermissions,
  isMobileMode,
  onToggleMobileMode,
  onLogout,
  onSyncNow,
  isSyncing,
  onOpenLiveMonitor,
  onOpenSettings,
  pendingShiftApprovalCount = 0,
  onNavigateToCashierShiftApproval
}) => {
  const assignedRoles = getStaffActiveRoles(currentStaff, activeRole as StaffRole);
  const hasSuperAdminRole =
    activeRole === 'Super Admin / APJ' || assignedRoles.includes('Super Admin / APJ');

  const canAccess = (permId: string): boolean => {
    if (hasSuperAdminRole) return true;
    if (!allowedPermissions) return true;
    return allowedPermissions.includes(permId);
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 shrink-0 shadow-xs z-30">
      {/* Zone 1: Brand Zone */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-700 to-indigo-600 text-white flex items-center justify-center font-black shadow-sm text-lg">
          LF
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 text-base tracking-tight whitespace-nowrap">
              Latisha Farma
            </span>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 uppercase tracking-wider">
              Enterprise
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={currentBranch.id}
              onChange={(e) => {
                const found = branches.find((b) => b.id === e.target.value);
                if (found) onSelectBranch(found);
              }}
              className="bg-transparent text-slate-700 font-semibold text-xs border-none outline-none cursor-pointer hover:text-sky-700 transition-colors"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.isCentral ? '(Pusat)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Zone 2: System Status & Quick Links */}
      <div className="hidden xl:flex items-center gap-3 text-xs font-medium text-slate-600">
        {pendingShiftApprovalCount > 0 && (hasSuperAdminRole || canAccess('pos-kasir')) && (
          <button
            type="button"
            onClick={onNavigateToCashierShiftApproval}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-400 font-extrabold transition shadow-xs animate-pulse cursor-pointer"
            title="Klik untuk meninjau & memberikan persetujuan (Approve / Reject) selisih tutup kasir"
          >
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Approval Selisih Kasir ({pendingShiftApprovalCount})</span>
          </button>
        )}

        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-slate-700 font-semibold">Sync Cabang:</span>
          <span className="text-emerald-700 font-bold">{currentBranch.syncStatus}</span>
          <button
            onClick={onSyncNow}
            title="Sinkronisasi Data Sekarang"
            disabled={isSyncing}
            className="ml-1 p-1 hover:text-sky-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-600' : ''}`} />
          </button>
        </div>

        {canAccess('fo-antrean') && (
          <button
            onClick={onOpenLiveMonitor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <Monitor className="w-4 h-4 text-indigo-600" />
            <span>Layar Antrean & Suara</span>
          </button>
        )}
      </div>

      {/* Zone 3: Mobile Mode Toggle, Logged-in User Display & Settings */}
      <div className="flex items-center gap-2.5 shrink-0">
        {(canAccess('mobile-lapangan') || isMobileMode) && (
          <button
            onClick={onToggleMobileMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isMobileMode
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden md:inline">
              {isMobileMode ? 'Tutup Mode Mobile' : 'Mode Mobile Lapangan'}
            </span>
          </button>
        )}

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* Logged-in User Info (Static Display Only, No Dropdown) */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <span className="block text-xs font-bold text-slate-800 leading-tight">
              {userName}
            </span>
            <span className="block text-[10px] text-slate-500 font-semibold">
              {activeRole}
            </span>
          </div>

          <button
            onClick={() => onOpenSettings?.('apotek')}
            type="button"
            title={
              hasSuperAdminRole
                ? 'Pengaturan Sistem & Profil Fasilitas (Super Admin / APJ)'
                : 'Pengaturan Sistem & Profil Fasilitas (Khusus Super Admin / APJ)'
            }
            className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center border transition-all cursor-pointer shadow-xs active:scale-95 ${
              hasSuperAdminRole
                ? 'bg-sky-100 hover:bg-sky-200 text-sky-800 border-sky-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300'
            }`}
          >
            {hasSuperAdminRole ? (
              <Settings className="w-4 h-4 text-sky-800" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        </div>

        <button
          onClick={onLogout}
          title="Keluar dari sistem"
          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
