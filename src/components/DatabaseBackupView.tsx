import React, { useState } from 'react';
import {
  Database,
  HardDriveDownload,
  HardDriveUpload,
  CheckCircle,
  AlertTriangle,
  FileJson,
  ShieldCheck,
  RefreshCw,
  Layers,
  FileText,
  Activity,
  Boxes,
  Users,
  Receipt
} from 'lucide-react';

interface DatabaseBackupViewProps {
  onDatabaseRestored?: () => void;
}

export const DatabaseBackupView: React.FC<DatabaseBackupViewProps> = ({ onDatabaseRestored }) => {
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message: string;
  }>({ type: 'idle', message: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Quick stats from localStorage
  const getStorageCount = (key: string) => {
    try {
      const data = localStorage.getItem(key);
      if (!data) return 0;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.length : 1;
    } catch (e) {
      return 0;
    }
  };

  const medicineCount = getStorageCount('latisha_medicines');
  const patientCount = getStorageCount('latisha_patients');
  const transactionCount = getStorageCount('latisha_transactions');
  const invoiceCount = getStorageCount('latisha_purchase_invoices');
  const rmeCount = getStorageCount('latisha_rme_records');
  const queueCount = getStorageCount('latisha_queue');

  // Export full database as JSON
  const handleExportDatabase = () => {
    setIsExporting(true);
    try {
      const storageKeys = [
        'latisha_medicines',
        'latisha_patients',
        'latisha_queue',
        'latisha_online_registrations',
        'latisha_rme_records',
        'latisha_prescriptions',
        'latisha_transactions',
        'latisha_purchase_invoices',
        'latisha_stock_mutations',
        'latisha_transfers',
        'latisha_audit_logs',
        'latisha_fee_config',
        'latisha_mitra',
        'latisha_suppliers',
        'latisha_purchase_returns',
        'latisha_branches',
        'latisha_staff'
      ];

      const databaseDump: Record<string, any> = {
        app: 'Latisha Farma Enterprise',
        schemaVersion: '8.2.0',
        exportedAt: new Date().toISOString(),
        tables: {}
      };

      storageKeys.forEach((key) => {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            databaseDump.tables[key] = JSON.parse(item);
          } catch (e) {
            databaseDump.tables[key] = item;
          }
        }
      });

      const blob = new Blob([JSON.stringify(databaseDump, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `LatishaFarma_Database_Backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setImportStatus({
        type: 'success',
        message: 'Cadangan database (.json) berhasil diunduh ke perangkat Anda.'
      });
    } catch (err) {
      setImportStatus({
        type: 'error',
        message: 'Gagal membuat cadangan database: ' + (err instanceof Error ? err.message : String(err))
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Import / Restore database from JSON
  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Accept both format with tables or root keys
        const tables = parsed.tables || parsed;

        let restoredKeys = 0;
        Object.keys(tables).forEach((key) => {
          if (key.startsWith('latisha_')) {
            const val = typeof tables[key] === 'object' ? JSON.stringify(tables[key]) : tables[key];
            localStorage.setItem(key, val);
            restoredKeys++;
          }
        });

        if (restoredKeys === 0) {
          throw new Error('Berkas JSON tidak memuat tabel data Latisha Farma yang valid.');
        }

        setImportStatus({
          type: 'success',
          message: `Pemulihan berhasil! Sebanyak ${restoredKeys} tabel data telah dipulihkan ke sistem.`
        });

        if (onDatabaseRestored) {
          onDatabaseRestored();
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (err) {
        setImportStatus({
          type: 'error',
          message: 'Gagal memulihkan database. Pastikan berkas adalah file .json valid: ' + (err instanceof Error ? err.message : String(err))
        });
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Database className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Export & Import Database
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Pusat manajemen pencadangan (backup) dan pemulihan (restore) basis data Latisha Farma. Amankan data obat, riwayat transaksi kasir POS, faktur distributor PBF, dan rekam medis pasien ke dalam format JSON mandiri.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Sistem Database Lokal Aktif
          </span>
        </div>
      </div>

      {/* Status Alert */}
      {importStatus.message && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 font-bold text-xs shadow-xs animate-in fade-in ${
            importStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {importStatus.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="leading-relaxed">{importStatus.message}</span>
        </div>
      )}

      {/* Database Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Boxes className="w-4 h-4 text-sky-600" />
            <span>Master Obat</span>
          </div>
          <div className="text-xl font-black text-slate-900">{medicineCount}</div>
          <span className="text-[10px] text-slate-400">Item obat & alkes</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Pasien Terdaftar</span>
          </div>
          <div className="text-xl font-black text-slate-900">{patientCount}</div>
          <span className="text-[10px] text-slate-400">Berkas No. RM</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Receipt className="w-4 h-4 text-violet-600" />
            <span>Transaksi POS</span>
          </div>
          <div className="text-xl font-black text-slate-900">{transactionCount}</div>
          <span className="text-[10px] text-slate-400">Riwayat penjualan</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <FileText className="w-4 h-4 text-teal-600" />
            <span>Faktur PBF</span>
          </div>
          <div className="text-xl font-black text-slate-900">{invoiceCount}</div>
          <span className="text-[10px] text-slate-400">Pembelian logistik</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Activity className="w-4 h-4 text-rose-600" />
            <span>Rekam Medis</span>
          </div>
          <div className="text-xl font-black text-slate-900">{rmeCount}</div>
          <span className="text-[10px] text-slate-400">Catatan SOAP dokter</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Antrean Aktif</span>
          </div>
          <div className="text-xl font-black text-slate-900">{queueCount}</div>
          <span className="text-[10px] text-slate-400">Pasien berkunjung</span>
        </div>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. EXPORT DATABASE */}
        <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-sky-300 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-sm">
              <HardDriveDownload className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-base">
                Export Cadangan Database (Backup)
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Unduh seluruh data operasional apotek (master obat, stok, kartu stok FEFO, penjualan POS, faktur pembelian PBF, retur, rekam medis SOAP, dan daftar mitra) ke dalam berkas <strong className="text-slate-800">.json</strong> yang terstruktur rapi.
              </p>
            </div>

            <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 text-[11px] text-sky-950 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-700" />
                Format Data Terstandar
              </span>
              <p className="text-sky-800 text-[10px]">
                Berkas cadangan dapat disimpan di flashdisk, cloud drive, atau komputer cadangan untuk antisipasi kehilangan data perangkat.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportDatabase}
            disabled={isExporting}
            className="w-full py-3 bg-sky-700 hover:bg-sky-800 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <HardDriveDownload className="w-4 h-4" />
            )}
            <span>Download Cadangan Database (.json)</span>
          </button>
        </div>

        {/* 2. IMPORT DATABASE */}
        <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-indigo-300 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
              <HardDriveUpload className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-base">
                Import & Pulihkan Database (Restore)
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Pulihkan seluruh data sistem dari berkas cadangan <strong className="text-slate-800">.json</strong> yang telah diekspor sebelumnya. Sistem akan memvalidasi keutuhan data dan memperbarui seluruh tabel lokal secara otomatis.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-950 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Perhatian Sebelum Pemulihan
              </span>
              <p className="text-amber-800 text-[10px]">
                Proses pemulihan akan menimpa data yang sedang aktif dengan data yang ada pada file cadangan. Disarankan mengunduh cadangan terbaru sebelum melakukan restore.
              </p>
            </div>
          </div>

          <div>
            <label className="w-full py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-98">
              {isRestoring ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <HardDriveUpload className="w-4 h-4" />
              )}
              <span>Pilih Berkas Cadangan (.json)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportDatabase}
                className="hidden"
                disabled={isRestoring}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Pedoman Pemeliharaan Database */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs text-xs space-y-3">
        <h5 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
          <FileJson className="w-4 h-4 text-slate-600" />
          <span>Panduan Pengelolaan Cadangan Database Kefarmasian</span>
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-600">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-slate-800 block text-[11px]">1. Frekuensi Rutin</strong>
            <p className="text-[11px] leading-relaxed">
              Lakukan ekspor cadangan minimal 1 kali setiap akhir shift atau penutupan buku harian untuk menjamin integritas data transaksi POS.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-slate-800 block text-[11px]">2. Penyimpanan Cadangan</strong>
            <p className="text-[11px] leading-relaxed">
              Simpan file cadangan pada media eksternal yang aman dan terpisah dari komputer kasir untuk mitigasi risiko kegagalan hardware.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-slate-800 block text-[11px]">3. Keamanan Data Pasien</strong>
            <p className="text-[11px] leading-relaxed">
              Berkas cadangan memuat data rekam medis pasien yang bersifat rahasia kedokteran. Jaga kerahasiaan file cadangan sesuai permenkes RME.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
