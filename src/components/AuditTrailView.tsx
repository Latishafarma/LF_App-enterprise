import React, { useState } from 'react';
import { ShieldAlert, Search, Clock, User, Filter } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditTrailViewProps {
  logs: AuditLog[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('SEMUA');

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      log.detail.toLowerCase().includes(q) ||
      log.user.toLowerCase().includes(q) ||
      log.role.toLowerCase().includes(q) ||
      log.module.toLowerCase().includes(q);
    const matchMod = moduleFilter === 'SEMUA' || log.module === moduleFilter;
    return matchSearch && matchMod;
  });

  return (
    <div className="space-y-4 text-xs">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            Audit Trail & Riwayat Aktivitas Keamanan Sistem
          </h3>
          <p className="text-slate-500 mt-0.5">
            Pencatatan komprehensif seluruh aktivitas login, transaksi kasir, RME dokter, dan mutasi stok.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari aktivitas atau petugas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-600 text-[10px]">
            <tr>
              <th className="p-3 w-28">Waktu & Jam</th>
              <th className="p-3 w-36">Pengguna & Role</th>
              <th className="p-3 w-32">Modul Terkait</th>
              <th className="p-3">Rincian Aktivitas Sistem</th>
              <th className="p-3 text-center w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="p-3 font-mono text-slate-500 text-[11px]">{log.time}</td>
                <td className="p-3">
                  <strong className="text-slate-900 block">{log.user}</strong>
                  <span className="text-[10px] text-slate-400">{log.role}</span>
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                    {log.module}
                  </span>
                </td>
                <td className="p-3 text-slate-800">{log.detail}</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                    Tervalidasi
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
