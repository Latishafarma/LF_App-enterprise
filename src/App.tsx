/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  INITIAL_BRANCHES,
  INITIAL_ICD10_LIST,
  INITIAL_MEDICINES,
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_STAFF,
  INITIAL_PATIENT_QUEUE,
  INITIAL_ONLINE_REGISTRATIONS,
  INITIAL_RME_RECORDS,
  INITIAL_E_PRESCRIPTIONS,
  INITIAL_PURCHASE_INVOICES,
  INITIAL_TRANSACTIONS,
  INITIAL_STOCK_MUTATIONS,
  INITIAL_TRANSFERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_MITRA,
  INITIAL_SUPPLIERS
} from './data/initialData';

import {
  Branch,
  Medicine,
  Patient,
  Doctor,
  Staff,
  PatientQueue,
  OnlineRegistration,
  RMERecord,
  EPrescription,
  Transaction,
  PurchaseInvoice,
  StockMutation,
  StockTransfer,
  AuditLog,
  FeeConfig,
  DEFAULT_FEE_CONFIG,
  Mitra,
  Supplier,
  CartItem,
  PurchaseReturnRecord,
  LabTestRecord,
  StockOpnameRecord,
  StockOpnameItemRecord,
  DEFAULT_ROLE_PERMISSIONS,
  CashierShiftSession,
  StaffRole,
  getStaffActiveRoles,
  resolveStaffEffectivePermissions
} from './types';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { LiveMonitorView } from './components/LiveMonitorView';
import { PatientMasterView } from './components/PatientMasterView';
import { CheckinView } from './components/CheckinView';
import { OnlineRegistrationView } from './components/OnlineRegistrationView';
import { DoctorSOAPView } from './components/DoctorSOAPView';
import { LabTestView } from './components/LabTestView';
import { RMEHistoryView } from './components/RMEHistoryView';
import { RMERecord as RMERecordType } from './types';
import { RMEReportsView } from './components/RMEReportsView';
import { POSCashierView } from './components/POSCashierView';
import { EPrescriptionQueueView } from './components/EPrescriptionQueueView';
import { InventoryView } from './components/InventoryView';
import { StockCardView } from './components/StockCardView';
import { StockOpnameView } from './components/StockOpnameView';
import { DefectaView } from './components/DefectaView';
import { PurchaseInvoiceView } from './components/PurchaseInvoiceView';
import { SalesHistoryView } from './components/SalesHistoryView';
import { BranchSyncView } from './components/BranchSyncView';
import { FinancialReportsView } from './components/FinancialReportsView';
import { FeeSettingsView } from './components/FeeSettingsView';
import { SetupMitraView } from './components/SetupMitraView';
import { SetupSupplierView } from './components/SetupSupplierView';
import { AuditTrailView } from './components/AuditTrailView';
import { MobileFieldStaffView } from './components/MobileFieldStaffView';
import { PrintView } from './components/PrintView';
import { PurchaseReturnHistoryView } from './components/PurchaseReturnHistoryView';
import { DebtReceivableView } from './components/DebtReceivableView';
import {
  PharmacySettingsModal,
  getSavedPharmacyProfile,
  formatPharmacyAddress
} from './components/PharmacySettingsModal';
import { DatabaseBackupView } from './components/DatabaseBackupView';
import { Lock, ShieldCheck, IdCard, User, AlertCircle, CheckCircle } from 'lucide-react';

const stripTitles = (name: string): string => {
  return name
    .replace(/\b(apt|dr|drg|ns|prof|hj|h)\b\.?\s*/gi, '')
    .replace(/,\s*(s\.?farm|m\.?farm|sp\.?pd|sp\.?a|sp\.?og|s\.?kep|a\.?md\.?far|a\.?md\.?kep|s\.?ked|m\.?kes|apt)\b.*/gi, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeStr = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

const verifyStaffCredentials = (inputName: string, inputId: string, list: Staff[]): Staff | null => {
  const cleanId = inputId.trim().toLowerCase();
  const cleanName = inputName.trim();
  if (!cleanId || !cleanName) return null;

  // Find staff where ID matches
  const staffById = list.find((s) => s.id.toLowerCase() === cleanId);
  if (!staffById) return null;

  const normInput = normalizeStr(cleanName);
  const normFull = normalizeStr(staffById.name);
  const normStripped = normalizeStr(stripTitles(staffById.name));
  const normInputStripped = normalizeStr(stripTitles(cleanName));

  if (normInput === normFull || normInput === normStripped || normInputStripped === normStripped) {
    return staffById;
  }

  // Also match if stripped name contains input name or vice-versa (min 3 chars)
  if (normStripped.length >= 3 && normInputStripped.length >= 3) {
    if (normStripped.includes(normInputStripped) || normInputStripped.includes(normStripped)) {
      return staffById;
    }
  }

  // Match significant individual words (e.g. "Mardin", "Anis", "Ratna", "Rahma", "Lestari")
  const skipWords = new Set(['apt', 'dr', 'drg', 'ns', 'prof', 'sfarm', 'skep', 'amdfar', 'amdkep']);
  const inputWords = cleanName.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(' ').filter(w => w.length >= 3 && !skipWords.has(w));
  const staffWords = staffById.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(' ').filter(w => w.length >= 3 && !skipWords.has(w));
  
  if (inputWords.length > 0 && inputWords.some(w => staffWords.includes(w))) {
    return staffById;
  }

  return null;
};

export default function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const printMode = searchParams.get('print');

  if (printMode) {
    return <PrintView mode={printMode} searchParams={searchParams} />;
  }

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem('latisha_is_logged_in');
    return saved === 'true';
  });
  const [activeStaffId, setActiveStaffId] = useState<string>(() => {
    return localStorage.getItem('latisha_active_staff_id') || 'STF-001';
  });
  const [activeRole, setActiveRole] = useState<StaffRole>(() => {
    const saved = localStorage.getItem('latisha_active_role') as StaffRole | null;
    return saved || 'Super Admin / APJ';
  });
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('latisha_user_name') || 'apt. Mardin, S.Farm';
  });
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMode, setIsMobileMode] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'apotek' | 'apj' | 'dpj' | 'pegawai'>('apotek');

  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('latisha_role_permissions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_ROLE_PERMISSIONS;
      }
    }
    return DEFAULT_ROLE_PERMISSIONS;
  });

  // Core Data State (Loaded from LocalStorage if available, with AI dummy simulation purged)
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('latisha_branches');
    if (!saved) return INITIAL_BRANCHES;
    try {
      const parsed: Branch[] = JSON.parse(saved);
      const cleaned = parsed.map((b, idx) => {
        if (idx === 0) {
          const isLegacyDummyName =
            b.name?.trim().toLowerCase() === 'apotek & klinik pratama latisha farma';
          const isLegacyDummyAddr = b.address
            ?.toLowerCase()
            .includes('jl. raya kesehatan no. 45');
          const isLegacyDummyPhone = b.phone?.trim() === '(021) 8899-7722';
          if (isLegacyDummyName || isLegacyDummyAddr || isLegacyDummyPhone) {
            return {
              ...b,
              name: isLegacyDummyName ? INITIAL_BRANCHES[0].name : b.name,
              address: isLegacyDummyAddr ? INITIAL_BRANCHES[0].address : b.address,
              phone: isLegacyDummyPhone ? INITIAL_BRANCHES[0].phone : b.phone
            };
          }
        }
        return b;
      });
      localStorage.setItem('latisha_branches', JSON.stringify(cleaned));
      return cleaned;
    } catch {
      return INITIAL_BRANCHES;
    }
  });

  const [currentBranch, setCurrentBranch] = useState<Branch>(branches[0] || INITIAL_BRANCHES[0]);

  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const saved = localStorage.getItem('latisha_medicines');
    if (!saved) return [];
    try {
      const list: Medicine[] = JSON.parse(saved);
      // Remove AI dummy template medicines (OBT-001..OBT-010 with BTC-202 batch), keep real user medicines
      return list.filter((m) => !(m.batchNo?.startsWith('BTC-202') && /^OBT-0(0[1-9]|10)$/.test(m.id)));
    } catch (e) {
      return [];
    }
  });

  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('latisha_patients');
    if (!saved) return [];
    try {
      const list: Patient[] = JSON.parse(saved);
      // Remove AI dummy template patients (RM-001..RM-005 with template NIK 160100293029...), keep real patients
      return list.filter((p) => !(p.nik?.startsWith('160100293029') && /^RM-00[1-5]$/.test(p.id)));
    } catch (e) {
      return [];
    }
  });

  const [doctors, setDoctors] = useState<Doctor[]>(() => {
    try {
      const savedDpj = localStorage.getItem('latisha_dpj_profile');
      if (savedDpj) {
        const parsed = JSON.parse(savedDpj);
        if (parsed.name) {
          return INITIAL_DOCTORS.map((doc, idx) =>
            idx === 0
              ? {
                  ...doc,
                  name: parsed.name,
                  sip: parsed.sip || doc.sip,
                  specialization: parsed.specialization || doc.specialization,
                  schedule: parsed.schedule || doc.schedule
                }
              : doc
          );
        }
      }
    } catch {}
    return INITIAL_DOCTORS;
  });
  const [staffList, setStaffList] = useState<Staff[]>(() => {
    const saved = localStorage.getItem('latisha_staff');
    return saved ? JSON.parse(saved) : INITIAL_STAFF;
  });

  const [loginNameInput, setLoginNameInput] = useState('');
  const [loginIdInput, setLoginIdInput] = useState('');
  const [loginErrorMessage, setLoginErrorMessage] = useState('');

  const [queue, setQueue] = useState<PatientQueue[]>(() => {
    const saved = localStorage.getItem('latisha_queue');
    if (!saved) return [];
    try {
      const list: PatientQueue[] = JSON.parse(saved);
      return list.filter((q) => !(/^A-00[1-3]$/.test(q.nomor) && /^RM-00[1-3]$/.test(q.rmId)));
    } catch (e) {
      return [];
    }
  });

  const [onlineRegistrations, setOnlineRegistrations] = useState<OnlineRegistration[]>(() => {
    const saved = localStorage.getItem('latisha_online_registrations');
    if (!saved) return [];
    try {
      const list: OnlineRegistration[] = JSON.parse(saved);
      return list.filter((r) => !['REG-2026-001', 'REG-2026-002'].includes(r.id));
    } catch (e) {
      return [];
    }
  });

  const [rmeRecords, setRmeRecords] = useState<RMERecord[]>(() => {
    const saved = localStorage.getItem('latisha_rme_records');
    if (!saved) return [];
    try {
      const list: RMERecord[] = JSON.parse(saved);
      return list.filter((r) => !['RME-2026-001', 'RME-2026-002'].includes(r.id));
    } catch (e) {
      return [];
    }
  });

  const [labRecords, setLabRecords] = useState<LabTestRecord[]>(() => {
    const saved = localStorage.getItem('latisha_lab_records');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  });

  const [prescriptions, setPrescriptions] = useState<EPrescription[]>(() => {
    const saved = localStorage.getItem('latisha_prescriptions');
    if (!saved) return [];
    try {
      const list: EPrescription[] = JSON.parse(saved);
      return list.filter((p) => !['RX-9921', 'RX-9922', 'RX-9923'].includes(p.id));
    } catch (e) {
      return [];
    }
  });

  const [activePrescriptionForPOS, setActivePrescriptionForPOS] = useState<EPrescription | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('latisha_transactions');
    if (!saved) return [];
    try {
      const list: Transaction[] = JSON.parse(saved);
      return list.filter((t) => !['TRX-1001', 'TRX-1002', 'FPJ-202610-1003', 'TRX-1004'].includes(t.id));
    } catch (e) {
      return [];
    }
  });

  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(() => {
    const saved = localStorage.getItem('latisha_purchase_invoices');
    if (!saved) return [];
    try {
      const list: PurchaseInvoice[] = JSON.parse(saved);
      return list.filter((i) => !['INV-PBF-2026-001', 'INV-PBF-2026-002', 'INV-PBF-2026-003'].includes(i.id));
    } catch (e) {
      return [];
    }
  });

  const [stockMutations, setStockMutations] = useState<StockMutation[]>(() => {
    const saved = localStorage.getItem('latisha_stock_mutations');
    if (!saved) return [];
    try {
      const list: StockMutation[] = JSON.parse(saved);
      return list.filter((m) => !['MUT-01', 'MUT-02', 'MUT-03'].includes(m.id));
    } catch (e) {
      return [];
    }
  });

  const [transfers, setTransfers] = useState<StockTransfer[]>(() => {
    const saved = localStorage.getItem('latisha_transfers');
    if (!saved) return [];
    try {
      const list: StockTransfer[] = JSON.parse(saved);
      return list.filter((t) => t.id !== 'TRF-001');
    } catch (e) {
      return [];
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('latisha_audit_logs');
    if (!saved) return [];
    try {
      const list: AuditLog[] = JSON.parse(saved);
      return list.filter((l) => !['LOG-001', 'LOG-002'].includes(l.id));
    } catch (e) {
      return [];
    }
  });

  const [feeConfig, setFeeConfig] = useState<FeeConfig>(() => {
    const saved = localStorage.getItem('latisha_fee_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_FEE_CONFIG;
      }
    }
    return DEFAULT_FEE_CONFIG;
  });

  const [mitraList, setMitraList] = useState<Mitra[]>(() => {
    const saved = localStorage.getItem('latisha_mitra');
    if (!saved) return [];
    try {
      const list: Mitra[] = JSON.parse(saved);
      return list.filter((m) => !['MTR-001', 'MTR-002', 'MTR-003'].includes(m.id));
    } catch (e) {
      return [];
    }
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('latisha_suppliers');
    if (!saved) return [];
    try {
      const list: Supplier[] = JSON.parse(saved);
      return list.filter((s) => !['SUP-001', 'SUP-002', 'SUP-003', 'SUP-004'].includes(s.id));
    } catch (e) {
      return [];
    }
  });

  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturnRecord[]>(() => {
    const saved = localStorage.getItem('latisha_purchase_returns');
    return saved ? JSON.parse(saved) : [];
  });

  const [opnameRecords, setOpnameRecords] = useState<StockOpnameRecord[]>(() => {
    const saved = localStorage.getItem('latisha_stock_opname_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [cashierShifts, setCashierShifts] = useState<CashierShiftSession[]>(() => {
    try {
      const alreadyCleared = localStorage.getItem('latisha_cashier_shifts_cleared_v2');
      if (!alreadyCleared) {
        localStorage.removeItem('latisha_cashier_shifts');
        localStorage.setItem('latisha_cashier_shifts_cleared_v2', 'true');
        return [];
      }
      const saved = localStorage.getItem('latisha_cashier_shifts');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      return [];
    }
    return [];
  });

  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-Save to localStorage
  useEffect(() => {
    localStorage.setItem('latisha_medicines', JSON.stringify(medicines));
    localStorage.setItem('latisha_patients', JSON.stringify(patients));
    localStorage.setItem('latisha_queue', JSON.stringify(queue));
    localStorage.setItem('latisha_online_registrations', JSON.stringify(onlineRegistrations));
    localStorage.setItem('latisha_rme_records', JSON.stringify(rmeRecords));
    localStorage.setItem('latisha_prescriptions', JSON.stringify(prescriptions));
    localStorage.setItem('latisha_transactions', JSON.stringify(transactions));
    localStorage.setItem('latisha_purchase_invoices', JSON.stringify(purchaseInvoices));
    localStorage.setItem('latisha_stock_mutations', JSON.stringify(stockMutations));
    localStorage.setItem('latisha_transfers', JSON.stringify(transfers));
    localStorage.setItem('latisha_audit_logs', JSON.stringify(auditLogs));
    localStorage.setItem('latisha_branches', JSON.stringify(branches));
    localStorage.setItem('latisha_fee_config', JSON.stringify(feeConfig));
    localStorage.setItem('latisha_mitra', JSON.stringify(mitraList));
    localStorage.setItem('latisha_suppliers', JSON.stringify(suppliers));
    localStorage.setItem('latisha_purchase_returns', JSON.stringify(purchaseReturns));
    localStorage.setItem('latisha_lab_records', JSON.stringify(labRecords));
    localStorage.setItem('latisha_stock_opname_records', JSON.stringify(opnameRecords));
    localStorage.setItem('latisha_staff', JSON.stringify(staffList));
    localStorage.setItem('latisha_role_permissions', JSON.stringify(rolePermissions));
    localStorage.setItem('latisha_cashier_shifts', JSON.stringify(cashierShifts));
    localStorage.setItem('latisha_active_staff_id', activeStaffId);
    localStorage.setItem('latisha_active_role', activeRole);
    localStorage.setItem('latisha_user_name', userName);
  }, [
    medicines,
    patients,
    queue,
    onlineRegistrations,
    rmeRecords,
    labRecords,
    prescriptions,
    transactions,
    purchaseInvoices,
    stockMutations,
    transfers,
    auditLogs,
    branches,
    feeConfig,
    mitraList,
    suppliers,
    purchaseReturns,
    opnameRecords,
    staffList,
    rolePermissions,
    cashierShifts,
    activeStaffId,
    activeRole,
    userName
  ]);

  // Resolve current logged-in staff account & effective RBAC permissions live from staffList
  const currentStaff: Staff | undefined =
    staffList.find((s) => s.id === activeStaffId) ||
    staffList.find((s) => userName.toLowerCase().includes(s.name.toLowerCase())) ||
    staffList[0];

  const currentStaffRoles: StaffRole[] = getStaffActiveRoles(currentStaff, activeRole);
  const allowedPermissions: string[] = resolveStaffEffectivePermissions(
    currentStaff,
    activeRole,
    rolePermissions
  );

  // Sync activeRole, userName, and activeTab whenever staffList or rolePermissions are updated
  useEffect(() => {
    if (!currentStaff) return;

    // Keep userName in sync if currentStaff's name was edited in Pengaturan Sistem
    if (currentStaff.id === activeStaffId && currentStaff.name && userName !== currentStaff.name) {
      setUserName(currentStaff.name);
    }

    // Ensure activeRole is one of the employee's active checked roles
    const validRoles = getStaffActiveRoles(currentStaff, currentStaff.role);
    if (!validRoles.includes(activeRole)) {
      const nextRole = validRoles.includes('Super Admin / APJ')
        ? 'Super Admin / APJ'
        : validRoles[0];
      setActiveRole(nextRole);
    }

    // Ensure activeTab is permitted for the current employee & role
    const effectivePerms = resolveStaffEffectivePermissions(
      currentStaff,
      validRoles.includes(activeRole) ? activeRole : validRoles[0],
      rolePermissions
    );
    if (!effectivePerms.includes(activeTab)) {
      const fallbackTab = effectivePerms[0] || 'dashboard';
      if (fallbackTab !== activeTab) {
        setActiveTab(fallbackTab);
      }
    }

    // Disable mobile field mode if employee no longer has 'mobile-lapangan' permission
    if (isMobileMode && !effectivePerms.includes('mobile-lapangan')) {
      setIsMobileMode(false);
    }
  }, [currentStaff, activeStaffId, activeRole, rolePermissions, activeTab, isMobileMode, userName]);

  const addAuditLog = (module: string, detail: string) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-6)}`,
      time: new Date().toLocaleTimeString('id-ID'),
      role: activeRole,
      user: userName,
      module,
      detail,
      branchId: currentBranch.id
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Handler: Sync Now
  const handleSyncNow = () => {
    setIsSyncing(true);
    addAuditLog('Multi-Cabang Sync', `Sinkronisasi data real-time dengan server cabang ${currentBranch.name}`);
    setTimeout(() => {
      setIsSyncing(false);
      setBranches((prev) =>
        prev.map((b) => ({
          ...b,
          lastSyncTime: 'Baru saja',
          syncStatus: 'Tersinkronisasi'
        }))
      );
      alert(`Sinkronisasi real-time cabang ${currentBranch.name} berhasil! Semua data farmasi dan pasien up-to-date.`);
    }, 1200);
  };

  // Handler: Queue Status Update
  const handleUpdateQueueStatus = (nomor: string, newStatus: PatientQueue['status']) => {
    setQueue((prev) =>
      prev.map((q) => (q.nomor === nomor ? { ...q, status: newStatus } : q))
    );
    addAuditLog('Live Antrean', `Status antrean ${nomor} diperbarui menjadi '${newStatus}'`);
  };

  const handleCallNext = () => {
    if (queue.length === 0) return;
    const current = queue.find((q) => q.status === 'Diperiksa') || queue[0];
    if (current) {
      handleUpdateQueueStatus(current.nomor, 'Selesai');
    }
  };

  // Handler: Save RME & Dispatch E-Prescription
  const handleSaveRME = (record: RMERecord, prescription?: EPrescription) => {
    setRmeRecords((prev) => [record, ...prev]);
    if (prescription) {
      setPrescriptions((prev) => [prescription, ...prev]);
    }
    addAuditLog('RME Dokter', `Pemeriksaan RME pasien ${record.patientName} (${record.rmId}) disimpan.`);
  };

  // Handler: Update RME Record
  const handleUpdateRME = (updatedRecord: RMERecord) => {
    setRmeRecords((prev) =>
      prev.map((rec) => (rec.id === updatedRecord.id ? updatedRecord : rec))
    );
    addAuditLog('RME Dokter', `Catatan RME pasien ${updatedRecord.patientName} (${updatedRecord.rmId}) berhasil diperbarui.`);
  };

  // Handler: Delete Single RME Record
  const handleDeleteRME = (id: string) => {
    setRmeRecords((prev) => prev.filter((rec) => rec.id !== id));
    addAuditLog('RME Dokter', `Catatan RME #${id} berhasil dihapus dari riwayat.`);
  };

  // Handler: Bulk Delete RME Records
  const handleBulkDeleteRME = (ids: string[]) => {
    setRmeRecords((prev) => prev.filter((rec) => !ids.includes(rec.id)));
    addAuditLog('RME Dokter', `${ids.length} catatan RME berhasil dihapus secara massal.`);
  };

  // Handler: Update Patient in Queue (e.g. vital signs, complaint from Doctor SOAP Workspace)
  const handleUpdateQueuePatient = (nomor: string, updatedData: Partial<PatientQueue>) => {
    setQueue((prev) =>
      prev.map((q) => (q.nomor === nomor ? { ...q, ...updatedData } : q))
    );
    addAuditLog('Antrean Pasien', `Data pemeriksaan antrean #${nomor} diperbarui oleh Dokter.`);
  };

  // Handlers: Cek Lab & Laboratorium
  const handleAddLabRecord = (record: LabTestRecord) => {
    setLabRecords((prev) => [record, ...prev]);
    addAuditLog('Cek Lab', `Input dokumen hasil lab #${record.id} pasien ${record.patientName}`);
  };

  const handleUpdateLabRecord = (record: LabTestRecord) => {
    setLabRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
    addAuditLog('Cek Lab', `Update dokumen hasil lab #${record.id} pasien ${record.patientName}`);
  };

  const handleDeleteLabRecord = (id: string) => {
    const found = labRecords.find((r) => r.id === id);
    setLabRecords((prev) => prev.filter((r) => r.id !== id));
    addAuditLog('Cek Lab', `Hapus dokumen lab #${id} pasien ${found?.patientName || ''}`);
  };

  // Handler: Finish Queue from Doctor's room
  const handleFinishDoctorQueue = (nomor: string) => {
    setQueue((prev) => prev.filter((q) => q.nomor !== nomor));
  };

  // Handler: Save Cashier Transaction
  const handleSaveTransaction = (trx: Transaction, mutations: StockMutation[]) => {
    setTransactions((prev) => [trx, ...prev]);
    setStockMutations((prev) => [...mutations, ...prev]);

    // Deduct stock from medicines
    setMedicines((prev) =>
      prev.map((m) => {
        const cartItem = trx.items.find((i) => i.id === m.id);
        if (cartItem) {
          return {
            ...m,
            stock: Math.max(0, m.stock - cartItem.qty)
          };
        }
        return m;
      })
    );

    addAuditLog('POS Kasir', `Transaksi #${trx.id} senilai Rp ${trx.total.toLocaleString('id-ID')} terbayar.`);
  };

  // Handlers: Cashier Shift & Session Management (Buka & Tutup Kasir + Approval Selisih)
  const handleOpenCashierShift = (newShift: CashierShiftSession) => {
    setCashierShifts((prev) => [newShift, ...prev]);
    addAuditLog(
      'Buka Shift Kasir',
      `Buka Kasir #${newShift.id} (${newShift.shiftName}) oleh ${newShift.cashierName}. Modal Awal (Cash Float): Rp ${newShift.openingFloat.toLocaleString('id-ID')}. Catatan: ${newShift.openingNotes || '-'}`
    );
  };

  const handleCloseCashierShift = (closedShift: CashierShiftSession) => {
    setCashierShifts((prev) => {
      const exists = prev.some((s) => s.id === closedShift.id);
      if (exists) {
        return prev.map((s) => (s.id === closedShift.id ? closedShift : s));
      }
      return [closedShift, ...prev];
    });

    const denomSummary = closedShift.denominations
      .map((d) => `${d.label} x ${d.sheets} lbr = Rp ${d.subtotal.toLocaleString('id-ID')}`)
      .join(' | ');

    if (closedShift.difference !== 0) {
      addAuditLog(
        'ALERT SELISIH KASIR (Menunggu Approval Super Admin)',
        `[PERINGATAN REAL-TIME KE SUPER ADMIN / APJ] Tutup Kasir #${closedShift.id} (${closedShift.shiftName} - ${closedShift.cashierName}) mengalami SELISIH ${closedShift.differenceStatus.toUpperCase()} sebesar ${closedShift.difference > 0 ? '+' : '-'}Rp ${Math.abs(closedShift.difference).toLocaleString('id-ID')}. Kas Fisik Laci: Rp ${closedShift.physicalCashInDrawer.toLocaleString('id-ID')} vs Kas Sistem Seharusnya: Rp ${closedShift.expectedCashInDrawer.toLocaleString('id-ID')} (Modal: Rp ${closedShift.openingFloat.toLocaleString('id-ID')} + Omset Tunai: Rp ${closedShift.systemCashSales.toLocaleString('id-ID')}). Rincian Fisik: [${denomSummary}]. Status: Menunggu Approval Tutup Kasir.`
      );
      alert(
        `Terdapat selisih ${closedShift.differenceStatus} sebesar ${closedShift.difference > 0 ? '+' : '-'}Rp ${Math.abs(closedShift.difference).toLocaleString('id-ID')}.\n\nStatus shift telah diubah menjadi "Menunggu Approval Tutup Kasir" dan notifikasi peringatan real-time telah dikirimkan ke akun Super Admin / APJ.`
      );
    } else {
      addAuditLog(
        'Tutup Shift Kasir (Sesuai)',
        `Tutup Kasir #${closedShift.id} (${closedShift.shiftName} - ${closedShift.cashierName}) SELESAI & SESUAI (Balance Rp 0). Total Kas Fisik Laci: Rp ${closedShift.physicalCashInDrawer.toLocaleString('id-ID')} | Omset Tunai Sistem: Rp ${closedShift.systemCashSales.toLocaleString('id-ID')} | Modal Awal: Rp ${closedShift.openingFloat.toLocaleString('id-ID')}. Rincian Fisik: [${denomSummary}].`
      );
      alert(
        `Tutup Kasir #${closedShift.id} berhasil disimpan! Kas fisik di laci sesuai dengan sistem (Rp ${closedShift.physicalCashInDrawer.toLocaleString('id-ID')}).`
      );
    }
  };

  const handleApproveRejectCashierShift = (
    shiftId: string,
    action: 'APPROVE' | 'REJECT',
    notes: string
  ) => {
    if (activeRole !== 'Super Admin / APJ') {
      alert('Hanya Super Admin / APJ yang berwenang memberikan persetujuan (Approve / Reject) selisih tutup kasir!');
      return;
    }

    const targetShift = cashierShifts.find((s) => s.id === shiftId);
    if (!targetShift) return;

    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    const nextStatus: CashierShiftSession['status'] =
      action === 'APPROVE' ? 'Ditutup (Approved Super Admin)' : 'Ditolak (Hitung Ulang)';

    setCashierShifts((prev) =>
      prev.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              status: nextStatus,
              approvedBy: userName,
              approvalTime: nowTime,
              approvalNotes: notes
            }
          : s
      )
    );

    const denomSummary = targetShift.denominations
      .map((d) => `${d.label}:${d.sheets}`)
      .join(', ');

    addAuditLog(
      action === 'APPROVE'
        ? 'Approval Tutup Kasir (Disetujui Super Admin)'
        : 'Reject Tutup Kasir (Ditolak Super Admin)',
      `Super Admin / APJ (${userName}) telah ${action === 'APPROVE' ? 'MENYETUJUI (APPROVE)' : 'MENOLAK (REJECT / HITUNG ULANG)'} Tutup Kasir #${shiftId} (${targetShift.cashierName}) dengan selisih ${targetShift.difference > 0 ? '+' : '-'}Rp ${Math.abs(targetShift.difference).toLocaleString('id-ID')} (${targetShift.differenceStatus}). Rincian Fisik: [${denomSummary}]. Catatan Super Admin: ${notes}`
    );
  };

  // Handler: Add Sales Invoice Transaction
  const handleAddSalesInvoice = (trx: Transaction, mutations: StockMutation[]) => {
    handleSaveTransaction(trx, mutations);
    addAuditLog('Faktur Penjualan', `Faktur penjualan #${trx.id} untuk ${trx.customerName} senilai Rp ${trx.total.toLocaleString('id-ID')} diterbitkan.`);
  };

  // Handler: Update Transaction
  const handleUpdateTransaction = (updated: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    addAuditLog('Riwayat Penjualan', `Transaksi #${updated.id} diperbarui (Status: ${updated.status || 'Selesai'})`);
  };

  // Handler: Restock items from Cancel or Return
  const handleRestockFromCancelOrReturn = (
    items: CartItem[],
    reason: string,
    refNo: string,
    actionType: 'Batal' | 'Retur'
  ) => {
    // 1. Restock medicines
    setMedicines((prev) =>
      prev.map((m) => {
        const found = items.find((it) => it.id === m.id);
        if (found) {
          return {
            ...m,
            stock: m.stock + found.qty
          };
        }
        return m;
      })
    );

    // 2. Add Stock Mutations (PENYESUAIAN)
    const newMutations: StockMutation[] = items.map((it) => ({
      id: `MUT-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('id-ID'),
      medicineId: it.id,
      medicineName: it.name,
      refNo,
      type: 'PENYESUAIAN',
      inQty: it.qty,
      outQty: 0,
      balance: (medicines.find((m) => m.id === it.id)?.stock || 0) + it.qty,
      ket: `${actionType === 'Batal' ? 'Pembatalan' : 'Retur'} Penjualan #${refNo}: ${reason}`,
      petugas: userName,
      branchId: currentBranch.id
    }));

    setStockMutations((prev) => [...newMutations, ...prev]);
    addAuditLog(
      actionType === 'Batal' ? 'Batal Penjualan' : 'Retur Penjualan',
      `${actionType === 'Batal' ? 'Pembatalan' : 'Retur'} transaksi #${refNo}. Stok dikembalikan. Alasan: ${reason}`
    );
  };

  // Handler: Approve Prescription to POS
  const handleApprovePrescriptionToPOS = (rx: EPrescription) => {
    setPrescriptions((prev) =>
      prev.map((p) =>
        p.id === rx.id ? { ...p, status: 'Lolos Skrining' } : p
      )
    );
    setActivePrescriptionForPOS(rx);
    setActiveTab('pos-kasir');
    addAuditLog('Skrining Resep', `Resep #${rx.id} pasien ${rx.patientName} lolos skrining dan diteruskan ke Kasir POS.`);
  };

  // Handler: Reject Prescription
  const handleRejectPrescription = (rxId: string, reason: string) => {
    setPrescriptions((prev) =>
      prev.map((p) =>
        p.id === rxId ? { ...p, status: 'Ditolak', screeningNotes: `Ditolak: ${reason}` } : p
      )
    );
    addAuditLog('Skrining Resep', `Resep #${rxId} ditolak apoteker. Alasan: ${reason}`);
  };

  // Handler: Add Purchase Invoice (increments stock)
  const handleAddPurchaseInvoice = (
    invoice: PurchaseInvoice,
    stockIncrements: { medId: string; qty: number }[]
  ) => {
    setPurchaseInvoices((prev) => [invoice, ...prev]);

    // Increment stocks
    setMedicines((prev) =>
      prev.map((m) => {
        const found = stockIncrements.find((inc) => inc.medId === m.id);
        if (found) {
          return {
            ...m,
            stock: m.stock + found.qty
          };
        }
        return m;
      })
    );

    // Add mutations
    const newMutations: StockMutation[] = invoice.items.map((it) => ({
      id: `MUT-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      date: invoice.date,
      time: new Date().toLocaleTimeString('id-ID'),
      medicineId: it.medicineId || '',
      medicineName: it.name,
      refNo: invoice.invoiceNo,
      type: 'PEMBELIAN',
      inQty: it.qty,
      outQty: 0,
      balance: (medicines.find((m) => m.id === it.medicineId)?.stock || 0) + it.qty,
      ket: `Penerimaan Faktur PBF ${invoice.pbfName}`,
      petugas: userName,
      branchId: currentBranch.id
    }));

    setStockMutations((prev) => [...newMutations, ...prev]);
    addAuditLog('Faktur PBF', `Input faktur pembelian #${invoice.invoiceNo} dari ${invoice.pbfName}`);
  };

  // Handler: Update Purchase Invoice
  const handleUpdatePurchaseInvoice = (updated: PurchaseInvoice) => {
    const existing = purchaseInvoices.find((i) => i.id === updated.id);
    if (existing && existing.status === 'Lunas') {
      alert('Faktur dengan status Lunas tidak dapat diedit lagi!');
      return;
    }
    setPurchaseInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    addAuditLog('Faktur PBF', `Update faktur pembelian #${updated.invoiceNo} (${updated.pbfName})`);
  };

  // Handler: Delete Purchase Invoice
  const handleDeletePurchaseInvoice = (id: string) => {
    const inv = purchaseInvoices.find((i) => i.id === id);
    if (!inv) return;
    if (inv.status === 'Lunas') {
      alert('Faktur dengan status Lunas tidak dapat dihapus!');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus faktur pembelian #${inv.invoiceNo} dari ${inv.pbfName}?`)) {
      setPurchaseInvoices((prev) => prev.filter((i) => i.id !== id));
      addAuditLog('Faktur PBF', `Hapus faktur pembelian #${inv.invoiceNo}`);
      alert(`Faktur pembelian #${inv.invoiceNo} berhasil dihapus.`);
    }
  };

  // Handler: Process Return Purchase
  const handleProcessReturn = (
    invoiceId: string,
    returnedItems: { medicineId: string; name?: string; qty: number; unit: string; batchNo?: string; expDate?: string; price?: number; subtotal?: number; reason?: string }[]
  ) => {
    const inv = purchaseInvoices.find((i) => i.id === invoiceId);
    if (!inv) return;

    // Reduce stock in medicines
    setMedicines((prev) =>
      prev.map((m) => {
        const found = returnedItems.find((r) => r.medicineId === m.id);
        if (found) {
          const ratio = m.rasioKonversi || 1;
          const multiplier = found.unit === m.satuanBesar ? ratio : 1;
          return {
            ...m,
            stock: Math.max(0, m.stock - found.qty * multiplier)
          };
        }
        return m;
      })
    );

    // Record stock mutations
    const newMutations: StockMutation[] = returnedItems.map((rit) => {
      const med = medicines.find((m) => m.id === rit.medicineId);
      const currentStock = med?.stock || 0;
      const ratio = med?.rasioKonversi || 1;
      const multiplier = rit.unit === med?.satuanBesar ? ratio : 1;
      const dedQty = rit.qty * multiplier;

      return {
        id: `MUT-RET-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('id-ID'),
        medicineId: rit.medicineId,
        medicineName: rit.name || med?.name || 'Obat',
        refNo: `RET-${inv.invoiceNo}`,
        type: 'RETUR PEMBELIAN',
        inQty: 0,
        outQty: dedQty,
        balance: Math.max(0, currentStock - dedQty),
        ket: `Retur ke PBF ${inv.pbfName}${rit.reason ? ' - Alasan: ' + rit.reason : ''}`,
        petugas: userName,
        branchId: currentBranch.id
      };
    });

    setStockMutations((prev) => [...newMutations, ...prev]);

    // Create PurchaseReturnRecord
    const detailedItems = returnedItems.map((rit) => {
      const med = medicines.find((m) => m.id === rit.medicineId);
      const price = rit.price || med?.hpp || 0;
      return {
        medicineId: rit.medicineId,
        name: rit.name || med?.name || 'Obat',
        qty: rit.qty,
        unit: rit.unit,
        batchNo: rit.batchNo || med?.batchNo || '-',
        expDate: rit.expDate || med?.expDate || '2028-12-31',
        price,
        subtotal: (rit as any).subtotal || (rit.qty * price),
        reason: rit.reason || (rit as any).alasan || '',
        alasan: rit.reason || (rit as any).alasan || ''
      };
    });

    const totalVal = detailedItems.reduce((acc, it) => acc + it.subtotal, 0);
    const newReturnRecord: PurchaseReturnRecord = {
      id: `RET-${Date.now().toString().slice(-6)}`,
      invoiceId: inv.id,
      invoiceNo: inv.invoiceNo,
      pbfName: inv.pbfName,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('id-ID'),
      salesman: inv.salesman,
      items: detailedItems,
      totalReturValue: totalVal,
      petugas: userName,
      branchId: currentBranch.id
    };

    setPurchaseReturns((prev) => [newReturnRecord, ...prev]);
    addAuditLog('Retur PBF', `Proses retur faktur #${inv.invoiceNo} ke ${inv.pbfName} sebanyak ${returnedItems.length} item obat.`);
  };

  const handleDeletePurchaseReturn = (id: string) => {
    setPurchaseReturns((prev) => prev.filter((r) => r.id !== id));
    addAuditLog('Retur PBF', `Hapus arsip riwayat retur #${id}`);
  };

  // Handler: Update Existing Purchase Return Record (Overwrite data lama, cegah duplikasi)
  const handleUpdatePurchaseReturn = (
    returnId: string,
    updatedItems: { medicineId: string; name?: string; qty: number; unit: string; batchNo?: string; expDate?: string; price?: number; subtotal?: number; reason?: string; alasan?: string }[]
  ) => {
    setPurchaseReturns((prev) => {
      const updatedList = prev.map((ret) => {
        if (ret.id === returnId) {
          const detailedItems = updatedItems.map((rit) => {
            const med = medicines.find((m) => m.id === rit.medicineId);
            const price = rit.price || med?.hpp || 0;
            return {
              medicineId: rit.medicineId,
              name: rit.name || med?.name || 'Obat',
              qty: rit.qty,
              unit: rit.unit,
              batchNo: rit.batchNo || med?.batchNo || '-',
              expDate: rit.expDate || med?.expDate || '2028-12-31',
              price,
              subtotal: rit.subtotal || (rit.qty * price),
              reason: rit.reason || (rit as any).alasan || '',
              alasan: rit.reason || (rit as any).alasan || ''
            };
          });
          const totalVal = detailedItems.reduce((acc, it) => acc + it.subtotal, 0);

          return {
            ...ret,
            items: detailedItems,
            totalReturValue: totalVal
          };
        }
        return ret;
      });
      try {
        localStorage.setItem('latisha_purchase_returns', JSON.stringify(updatedList));
      } catch (e) {}
      return updatedList;
    });
    addAuditLog('Retur PBF', `Perbarui data riwayat retur #${returnId}`);
  };

  // Handler: Accept Online Registration to Today's Queue
  const handleAcceptOnlineRegistrationToQueue = (reg: OnlineRegistration) => {
    // Check if patient exists, else create new
    let patient = patients.find((p) => p.nik === reg.nik);
    if (!patient) {
      const newRmId = `RM-${String(patients.length + 1).padStart(3, '0')}`;
      const birthYear = new Date(reg.birthDate).getFullYear();
      const calculatedAge = Math.max(0, new Date().getFullYear() - birthYear);

      patient = {
        id: newRmId,
        nik: reg.nik,
        name: reg.name,
        age: calculatedAge,
        gender: reg.gender,
        birthDate: reg.birthDate,
        phone: reg.phone,
        address: reg.address,
        allergy: reg.allergy,
        category: 'Pasien Praktik',
        registeredOnline: true,
        registrationDate: new Date().toISOString().split('T')[0]
      };

      setPatients((prev) => [patient!, ...prev]);
    }

    const nextNum = `A-${String(queue.length + 1).padStart(3, '0')}`;
    const newQueueItem: PatientQueue = {
      nomor: nextNum,
      rmId: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      vital: { td: '120/80', suhu: 36.5, nadi: 80, spo2: 98 },
      status: 'Menunggu',
      doctorId: reg.doctorId,
      doctorName: reg.doctorName,
      checkinTime: reg.appointmentTime,
      source: 'Pendaftaran Online',
      complaint: reg.complaint,
      serviceType: reg.serviceType,
      branchId: currentBranch.id
    };

    setQueue((prev) => [...prev, newQueueItem]);
    setOnlineRegistrations((prev) =>
      prev.map((r) => (r.id === reg.id ? { ...r, status: 'Diterima' } : r))
    );

    addAuditLog('Online Registration', `Verifikasi booking #${reg.bookingCode} untuk pasien ${reg.name} diterbitkan nomor antrean ${nextNum}`);
    alert(`Pasien ${reg.name} berhasil diverifikasi dan masuk antrean ${nextNum}`);
  };

  // Handler: Add Stock Transfer
  const handleAddTransfer = (transfer: StockTransfer) => {
    setTransfers((prev) => [transfer, ...prev]);

    // Update stock in medicine list
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id === transfer.medicineId) {
          return {
            ...m,
            stock: Math.max(0, m.stock - transfer.qty)
          };
        }
        return m;
      })
    );

    addAuditLog('Transfer Stok', `Transfer #${transfer.id} sebanyak ${transfer.qty} ${transfer.unit} ${transfer.medicineName}`);
  };

  // Handler: Add Branch
  const handleAddBranch = (newBranch: Branch) => {
    setBranches((prev) => [...prev, newBranch]);
    addAuditLog('Cabang', `Tambah cabang baru: ${newBranch.name} (${newBranch.code})`);
    alert(`Cabang "${newBranch.name}" berhasil didaftarkan ke sistem multi-cabang!`);
  };

  // Handler: Delete Branch
  const handleDeleteBranch = (branchId: string) => {
    const branchToDelete = branches.find((b) => b.id === branchId);
    if (!branchToDelete) return;
    if (branchToDelete.isCentral) {
      alert('Cabang utama/pusat dilindungi dan tidak dapat dihapus!');
      return;
    }
    setBranches((prev) => prev.filter((b) => b.id !== branchId));
    if (currentBranch.id === branchId) {
      const fallback = branches.find((b) => b.isCentral) || branches[0];
      if (fallback) setCurrentBranch(fallback);
    }
    addAuditLog('Cabang', `Hapus cabang: ${branchToDelete.name} (${branchToDelete.code})`);
    alert(`Cabang "${branchToDelete.name}" telah dihapus.`);
  };

  // Handler: Update Branch (including Pusat Induk status)
  const handleUpdateBranch = (updatedBranch: Branch) => {
    setBranches((prev) => {
      // If setting as central, remove central flag from others
      if (updatedBranch.isCentral) {
        return prev.map((b) =>
          b.id === updatedBranch.id
            ? { ...updatedBranch, isCentral: true }
            : { ...b, isCentral: false }
        );
      }
      return prev.map((b) => (b.id === updatedBranch.id ? updatedBranch : b));
    });

    if (currentBranch.id === updatedBranch.id) {
      setCurrentBranch(updatedBranch);
    }

    addAuditLog('Cabang', `Update data cabang: ${updatedBranch.name} (${updatedBranch.code})${updatedBranch.isCentral ? ' [Pusat Induk]' : ''}`);
    alert(`Data cabang "${updatedBranch.name}" berhasil diperbarui!`);
  };

  // Handlers: Mitra
  const handleAddMitra = (m: Mitra) => {
    setMitraList((prev) => [m, ...prev]);
    addAuditLog('Setup Mitra', `Registrasi faskes mitra baru: ${m.name} (${m.licenseNo})`);
  };

  const handleUpdateMitra = (m: Mitra) => {
    setMitraList((prev) => prev.map((item) => (item.id === m.id ? m : item)));
    addAuditLog('Setup Mitra', `Update data faskes mitra: ${m.name} (${m.id})`);
  };

  const handleDeleteMitra = (id: string) => {
    const found = mitraList.find((item) => item.id === id);
    setMitraList((prev) => prev.filter((item) => item.id !== id));
    addAuditLog('Setup Mitra', `Hapus faskes mitra: ${found?.name || id}`);
  };

  // Handlers: Supplier
  const handleAddSupplier = (s: Supplier) => {
    setSuppliers((prev) => [s, ...prev]);
    addAuditLog('Setup Supplier', `Registrasi supplier/PBF baru: ${s.name} (${s.phone})`);
  };

  const handleUpdateSupplier = (s: Supplier) => {
    setSuppliers((prev) => prev.map((item) => (item.id === s.id ? s : item)));
    addAuditLog('Setup Supplier', `Update data supplier/PBF: ${s.name} (${s.id})`);
  };

  const handleDeleteSupplier = (id: string) => {
    const found = suppliers.find((item) => item.id === id);
    setSuppliers((prev) => prev.filter((item) => item.id !== id));
    addAuditLog('Setup Supplier', `Hapus supplier/PBF: ${found?.name || id}`);
  };

  // Handler: Stock Opname Live Reconciliation
  const handleApplyStockOpname = (
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
  ) => {
    const opnameOfficer = customPetugas || userName;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const refNo = `SO-${today.replace(/-/g, '')}-${String(opnameRecords.length + 1).padStart(2, '0')}`;
    const newMutations: StockMutation[] = [];
    const opnameItems: StockOpnameItemRecord[] = [];

    adjustments.forEach((adj) => {
      const med = medicines.find((m) => m.id === adj.medicineId);
      const hpp = adj.hpp ?? med?.hpp ?? 0;
      const sellPrice = adj.sellPrice ?? med?.sellPrice ?? 0;
      const unit = adj.unit ?? med?.unit ?? 'Unit';
      const sysStock = adj.systemStock !== undefined ? adj.systemStock : adj.finalStock - adj.difference;
      const nominalDiffHpp = adj.difference * hpp;
      const nominalDiffSell = adj.difference * sellPrice;

      opnameItems.push({
        medicineId: adj.medicineId,
        medicineName: adj.medicineName || med?.name || 'Obat',
        unit,
        hpp,
        sellPrice,
        systemStock: sysStock,
        physicalStock: adj.finalStock,
        difference: adj.difference,
        nominalDiffHpp,
        nominalDiffSell,
        reason: adj.reason
      });

      if (adj.difference !== 0) {
        newMutations.push({
          id: `MUT-OPN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          date: today,
          time: `${time} WIB`,
          medicineId: adj.medicineId,
          medicineName: adj.medicineName || med?.name || 'Obat',
          refNo,
          type: 'STOK_OPNAME',
          inQty: adj.difference > 0 ? adj.difference : 0,
          outQty: adj.difference < 0 ? Math.abs(adj.difference) : 0,
          balance: adj.finalStock,
          ket: `${adj.reason} (Nominal Selisih HPP: ${nominalDiffHpp >= 0 ? '+' : '-'}Rp ${Math.abs(nominalDiffHpp).toLocaleString('id-ID')})`,
          petugas: opnameOfficer,
          branchId: currentBranch.id,
          hpp,
          nominalDiff: nominalDiffHpp
        });
      }
    });

    setMedicines((prev) =>
      prev.map((med) => {
        const found = adjustments.find((a) => a.medicineId === med.id);
        if (found) {
          return {
            ...med,
            stock: found.finalStock
          };
        }
        return med;
      })
    );

    if (newMutations.length > 0) {
      setStockMutations((prev) => [...newMutations, ...prev]);
    }

    const matchCount = opnameItems.filter((i) => i.difference === 0).length;
    const surplusItems = opnameItems.filter((i) => i.difference > 0);
    const deficitItems = opnameItems.filter((i) => i.difference < 0);
    const totalSurplusNominal = surplusItems.reduce((acc, i) => acc + i.nominalDiffHpp, 0);
    const totalDeficitNominal = deficitItems.reduce((acc, i) => acc + Math.abs(i.nominalDiffHpp), 0);
    const netNominalDiff = totalSurplusNominal - totalDeficitNominal;

    const newOpnameRecord: StockOpnameRecord = {
      id: `OPN-${Date.now().toString().slice(-6)}`,
      refNo,
      date: today,
      time: `${time} WIB`,
      petugas: opnameOfficer,
      branchId: currentBranch.id,
      branchName: currentBranch.name,
      totalItemsCounted: opnameItems.length,
      matchCount,
      surplusCount: surplusItems.length,
      deficitCount: deficitItems.length,
      totalSurplusNominal,
      totalDeficitNominal,
      netNominalDiff,
      notes: notes || 'Rekonsiliasi Stok Opname Live',
      items: opnameItems
    };

    setOpnameRecords((prev) => [newOpnameRecord, ...prev]);

    addAuditLog(
      'Stok Opname',
      `Stok Opname #${refNo} disimpan (${adjustments.length} item, Selisih Bersih: ${netNominalDiff >= 0 ? '+' : '-'}Rp ${Math.abs(netNominalDiff).toLocaleString('id-ID')}) oleh ${opnameOfficer}`
    );
  };

  const handleDeleteOpnameRecord = (id: string) => {
    setOpnameRecords((prev) => prev.filter((r) => r.id !== id));
    addAuditLog('Stok Opname', `Hapus riwayat stok opname #${id}`);
  };

  // Handler: Export Backup JSON
  const handleExportBackup = () => {
    const backupData = {
      version: 'Latisha Farma Enterprise V8.0',
      timestamp: new Date().toISOString(),
      branches,
      medicines,
      patients,
      queue,
      onlineRegistrations,
      rmeRecords,
      prescriptions,
      transactions,
      purchaseInvoices,
      stockMutations,
      transfers,
      staffList,
      auditLogs,
      mitraList,
      suppliers
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Latisha_Farma_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addAuditLog('Cloud Backup', 'Ekspor pencadangan data JSON berhasil diunduh.');
  };

  // Login Screen if logged out
  const matchedLoginStaff = verifyStaffCredentials(loginNameInput, loginIdInput, staffList);

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-800">
          <div className="p-8 text-center bg-slate-900 border-b border-slate-800 space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg text-2xl font-black">
              LF
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide">LATISHA FARMA</h1>
              <p className="text-xs text-sky-400 font-bold uppercase tracking-wider">
                Enterprise Pharmacy & Clinic System
              </p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const matched = verifyStaffCredentials(loginNameInput, loginIdInput, staffList);
              if (!matched) {
                setLoginErrorMessage('Nama atau ID tidak ditemukan. Pastikan nama petugas (boleh nama saja atau dengan gelar) dan ID pegawai sesuai dengan data yang tersimpan di sistem.');
                return;
              }
              if (matched.status === 'Non-Aktif') {
                setLoginErrorMessage(`Akun pegawai ${matched.name} (${matched.id}) saat ini berstatus Non-Aktif. Silakan hubungi Super Admin / APJ.`);
                return;
              }

              const roles = getStaffActiveRoles(matched, matched.role);
              const primaryRole: StaffRole = roles.includes('Super Admin / APJ')
                ? 'Super Admin / APJ'
                : roles[0];
              const nextPerms = resolveStaffEffectivePermissions(matched, primaryRole, rolePermissions);

              setLoginErrorMessage('');
              setActiveStaffId(matched.id);
              setUserName(matched.name);
              setActiveRole(primaryRole);
              if (!nextPerms.includes(activeTab)) {
                setActiveTab(nextPerms[0] || 'dashboard');
              }
              setIsLoggedIn(true);
              localStorage.setItem('latisha_is_logged_in', 'true');
              addAuditLog('Auth', `Pengguna ${matched.name} (ID: ${matched.id}) berhasil masuk dengan peran ${primaryRole}`);
            }}
            className="p-8 space-y-4 text-xs"
          >
            {/* Notification alert if rejected */}
            {loginErrorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Autentikasi Gagal</strong>
                  <span className="leading-tight">{loginErrorMessage}</span>
                </div>
              </div>
            )}

            {/* 1. Nama Petugas (Diinput Manual Tanpa Riwayat / Dropdown) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Nama Petugas *
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">
                  Boleh nama saja atau dengan gelar
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Masukkan nama petugas"
                  value={loginNameInput}
                  onChange={(e) => {
                    setLoginNameInput(e.target.value);
                    if (loginErrorMessage) setLoginErrorMessage('');
                  }}
                  className="w-full p-2.5 pl-9 border rounded-xl font-bold bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* 2. ID Pegawai (Diinput Manual Tanpa Riwayat / Dropdown) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  ID Pegawai *
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">
                  Diinput manual (Kerahasiaan Terjaga)
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Masukkan ID pegawai"
                  value={loginIdInput}
                  onChange={(e) => {
                    setLoginIdInput(e.target.value);
                    if (loginErrorMessage) setLoginErrorMessage('');
                  }}
                  className="w-full p-2.5 pl-9 border rounded-xl font-mono font-bold bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none uppercase"
                />
                <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* 3. Hak Akses (Otomatis Terisi Sesuai Peran & Terkunci) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Hak Akses (Peran / Jabatan)</span>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> Kolom Terkunci
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={
                    matchedLoginStaff
                      ? getStaffActiveRoles(matchedLoginStaff, matchedLoginStaff.role).join(', ')
                      : loginNameInput.trim() && loginIdInput.trim()
                      ? 'Nama atau ID tidak ditemukan'
                      : 'Otomatis terisi saat Nama & ID valid...'
                  }
                  readOnly
                  disabled
                  className={`w-full p-2.5 pl-9 border rounded-xl font-bold cursor-not-allowed select-none transition ${
                    matchedLoginStaff
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : loginNameInput.trim() && loginIdInput.trim()
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                />
                <ShieldCheck
                  className={`w-4 h-4 absolute left-3 top-3 ${
                    matchedLoginStaff ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
              </div>
              {matchedLoginStaff ? (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Pegawai terverifikasi: {matchedLoginStaff.name} (
                    {resolveStaffEffectivePermissions(matchedLoginStaff, matchedLoginStaff.role, rolePermissions).length}{' '}
                    Modul Akses)
                  </span>
                </div>
              ) : loginNameInput.trim() && loginIdInput.trim() ? (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-rose-600">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Nama atau ID tidak ditemukan di data sistem</span>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">
                  Kolom ini otomatis mendeteksi peran resmi pegawai terdaftar dan terkunci untuk keamanan.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-xl shadow-lg transition text-xs tracking-wider uppercase cursor-pointer active:scale-98 mt-2"
            >
              Masuk ke Sistem Latisha Farma
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active Staff and Effective Doctors synchronized directly with Pengaturan Sistem & Profil Fasilitas (staffList)
  const activeStaffList = staffList.filter((s) => s.status !== 'Non-Aktif');
  const effectiveStaffList = activeStaffList.length > 0 ? activeStaffList : staffList;

  const effectiveDoctors: Doctor[] = (() => {
    const baseDocs = [...doctors];
    const staffDoctors = effectiveStaffList.filter(
      (s) => s.role === 'Dokter' || (s.roles && s.roles.includes('Dokter'))
    );
    staffDoctors.forEach((sd, idx) => {
      if (idx === 0 && baseDocs.length > 0) {
        // Keep primary doctor synced with primary doctor staff entry
        baseDocs[0] = {
          ...baseDocs[0],
          name: sd.name
        };
      } else if (!baseDocs.some((d) => d.name.toLowerCase() === sd.name.toLowerCase())) {
        baseDocs.push({
          id: `DOC-${sd.id}`,
          name: sd.name,
          sip: `SIP/2026/${sd.id}`,
          specialization: 'Dokter Umum / Klinis',
          schedule: 'Senin - Sabtu: 08.00 - 20.00 WIB',
          feePerPatient: feeConfig.doctorFee || 20000,
          commissionPercent: 5,
          phone: sd.phone || '0812-0000-0000',
          earnedCommission: 0,
          status: 'Aktif'
        });
      }
    });
    return baseDocs;
  })();

  // Active Doctor instance
  const currentDoctor = effectiveDoctors[0] || INITIAL_DOCTORS[0];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 text-slate-800">
      {/* Top Header */}
      <Header
        currentBranch={currentBranch}
        branches={branches}
        onSelectBranch={(b) => {
          setCurrentBranch(b);
          addAuditLog('Navigasi Cabang', `Beralih ke cabang ${b.name}`);
        }}
        activeRole={activeRole}
        userName={userName}
        currentStaff={currentStaff}
        allowedPermissions={allowedPermissions}
        isMobileMode={isMobileMode}
        onToggleMobileMode={() => setIsMobileMode(!isMobileMode)}
        onLogout={() => {
          setIsLoggedIn(false);
          setLoginNameInput('');
          setLoginIdInput('');
          setLoginErrorMessage('');
          localStorage.setItem('latisha_is_logged_in', 'false');
        }}
        onSyncNow={handleSyncNow}
        isSyncing={isSyncing}
        onOpenLiveMonitor={() => setActiveTab('fo-antrean')}
        onOpenSettings={(tab) => {
          setSettingsInitialTab(tab || 'apotek');
          setIsSettingsModalOpen(true);
        }}
        pendingShiftApprovalCount={
          cashierShifts.filter((s) => s.status === 'Menunggu Approval Tutup Kasir').length
        }
        onNavigateToCashierShiftApproval={() => setActiveTab('pos-kasir')}
      />

      {/* Main View Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        {!isMobileMode && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            pendingResepCount={prescriptions.filter((p) => p.status === 'Pending Skrining').length}
            pendingOnlineCount={onlineRegistrations.filter((r) => r.status === 'Menunggu Verifikasi').length}
            activeRole={activeRole}
            allowedPermissions={allowedPermissions}
            staffRoles={currentStaffRoles}
          />
        )}

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-100">
          {/* Mobile Field Staff Mode View */}
          {isMobileMode ? (
            <MobileFieldStaffView
              patients={patients}
              medicines={medicines}
              queue={queue}
              transactions={transactions}
              onApplyStockOpname={handleApplyStockOpname}
              onCloseMobileMode={() => setIsMobileMode(false)}
              onSaveMobileRME={(rec) => handleSaveRME(rec)}
              staffName={userName}
            />
          ) : !allowedPermissions.includes(activeTab) ? (
            <div className="max-w-lg mx-auto mt-12 p-8 bg-white rounded-3xl border border-rose-200 shadow-lg text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase">
                Modul Tidak Diizinkan untuk Peran Ini
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Akun pegawai <strong>{userName}</strong> dengan peran aktif{' '}
                <strong className="text-violet-700">{activeRole}</strong> tidak memiliki hak akses
                ke modul ini. Silakan pilih menu yang tersedia pada navigasi samping atau hubungi{' '}
                <strong>Super Admin / APJ</strong>.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab(allowedPermissions[0] || 'dashboard')}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition"
              >
                Kembali ke Beranda Akses
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Dashboard */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  transactions={transactions}
                  medicines={medicines}
                  queue={queue}
                  prescriptions={prescriptions}
                  currentBranch={currentBranch}
                  onNavigateTab={setActiveTab}
                />
              )}

              {/* Module 1: Front Office & Antrean */}
              {activeTab === 'fo-antrean' && (
                <LiveMonitorView
                  queue={queue}
                  onUpdateQueueStatus={handleUpdateQueueStatus}
                  onCallNext={handleCallNext}
                  clinicName={currentBranch.name}
                  doctorName={currentDoctor.name}
                />
              )}

              {activeTab === 'fo-pasien' && (
                <PatientMasterView
                  patients={patients}
                  onAddPatient={(p) => {
                    setPatients((prev) => [p, ...prev]);
                    addAuditLog('Master Pasien', `Registrasi pasien baru ${p.name} (${p.id})`);
                  }}
                  onUpdatePatient={(p) => {
                    setPatients((prev) => prev.map((item) => (item.id === p.id ? p : item)));
                    addAuditLog('Master Pasien', `Update data pasien ${p.name} (${p.id})`);
                  }}
                  onDeletePatient={(id) => {
                    setPatients((prev) => prev.filter((p) => p.id !== id));
                    addAuditLog('Master Pasien', `Hapus data pasien ${id}`);
                  }}
                  onSendToQueue={(p) => {
                    const nextNum = `A-${String(queue.length + 1).padStart(3, '0')}`;
                    const newQueueItem: PatientQueue = {
                      nomor: nextNum,
                      rmId: p.id,
                      name: p.name,
                      age: p.age,
                      gender: p.gender,
                      vital: { td: '120/80', suhu: 36.5, nadi: 80, spo2: 98 },
                      status: 'Menunggu',
                      doctorId: currentDoctor.id,
                      doctorName: currentDoctor.name,
                      checkinTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                      source: 'Pendaftaran Langsung (Walk-in)',
                      complaint: 'Pemeriksaan Dokter Umum',
                      serviceType: 'Poli Umum',
                      branchId: currentBranch.id
                    };
                    setQueue((prev) => [...prev, newQueueItem]);
                    setActiveTab('fo-antrean');
                    addAuditLog('Front Office', `Pasien ${p.name} didaftarkan ke antrean ${nextNum}`);
                  }}
                />
              )}

              {activeTab === 'fo-checkin' && (
                <CheckinView
                  patients={patients}
                  doctors={effectiveDoctors}
                  staffList={effectiveStaffList}
                  queue={queue}
                  onAddToQueue={(q) => {
                    setQueue((prev) => [...prev, q]);
                    addAuditLog('Check-in', `Pasien ${q.name} check-in dengan nomor antrean ${q.nomor}`);
                  }}
                  onNavigateToMonitor={() => setActiveTab('fo-antrean')}
                />
              )}

              {activeTab === 'fo-online' && (
                <OnlineRegistrationView
                  registrations={onlineRegistrations}
                  onAddRegistration={(reg) => {
                    setOnlineRegistrations((prev) => [reg, ...prev]);
                    addAuditLog('Online Booking', `Pendaftaran online baru ${reg.name} (${reg.bookingCode})`);
                  }}
                  onUpdateStatus={(id, status) => {
                    setOnlineRegistrations((prev) =>
                      prev.map((r) => (r.id === id ? { ...r, status } : r))
                    );
                    addAuditLog('Online Booking', `Status pendaftaran #${id} diperbarui menjadi ${status}`);
                  }}
                  onAcceptToQueue={handleAcceptOnlineRegistrationToQueue}
                  doctors={effectiveDoctors}
                  patients={patients}
                />
              )}

              {/* Module 2: Pelayanan Dokter & RME */}
              {activeTab === 'rme-pemeriksaan' && (
                <DoctorSOAPView
                  queue={queue}
                  medicines={medicines}
                  activeDoctor={currentDoctor}
                  icd10List={INITIAL_ICD10_LIST}
                  onSaveRME={handleSaveRME}
                  onFinishQueue={handleFinishDoctorQueue}
                  onUpdateQueuePatient={handleUpdateQueuePatient}
                  staffList={effectiveStaffList}
                  feeConfig={feeConfig}
                  labRecords={labRecords}
                />
              )}

              {activeTab === 'rme-cek-lab' && (
                <LabTestView
                  labRecords={labRecords}
                  patients={patients}
                  doctors={effectiveDoctors}
                  staffList={effectiveStaffList}
                  onAddLabRecord={handleAddLabRecord}
                  onUpdateLabRecord={handleUpdateLabRecord}
                  onDeleteLabRecord={handleDeleteLabRecord}
                />
              )}

              {activeTab === 'rme-riwayat' && (
                <RMEHistoryView
                  rmeRecords={rmeRecords}
                  staffList={effectiveStaffList}
                  medicines={medicines}
                  icd10List={INITIAL_ICD10_LIST}
                  onUpdateRecord={handleUpdateRME}
                  onDeleteRecord={handleDeleteRME}
                  onBulkDeleteRecords={handleBulkDeleteRME}
                />
              )}

              {activeTab === 'rme-laporan' && (
                <RMEReportsView rmeRecords={rmeRecords} />
              )}

              {activeTab === 'pos-kasir' && (
                <POSCashierView
                  medicines={medicines}
                  patients={patients}
                  doctors={effectiveDoctors}
                  mitraList={mitraList}
                  staffList={effectiveStaffList}
                  transactions={transactions}
                  onSaveTransaction={handleSaveTransaction}
                  activePrescription={activePrescriptionForPOS}
                  onClearActivePrescription={() => setActivePrescriptionForPOS(null)}
                  currentCashierName={userName}
                  activeRole={activeRole}
                  branchId={currentBranch.id}
                  feeConfig={feeConfig}
                  labRecords={labRecords}
                  cashierShifts={cashierShifts}
                  onOpenShift={handleOpenCashierShift}
                  onCloseShift={handleCloseCashierShift}
                  onApproveRejectShift={handleApproveRejectCashierShift}
                  onClearShiftHistory={() => {
                    setCashierShifts([]);
                    try {
                      localStorage.setItem('latisha_cashier_shifts', JSON.stringify([]));
                    } catch (e) {}
                  }}
                />
              )}

              {activeTab === 'pos-resep' && (
                <EPrescriptionQueueView
                  prescriptions={prescriptions}
                  rmeRecords={rmeRecords}
                  patients={patients}
                  onApproveToPOS={handleApprovePrescriptionToPOS}
                  onRejectPrescription={handleRejectPrescription}
                />
              )}

              {activeTab === 'pos-riwayat' && (
                <SalesHistoryView
                  transactions={transactions}
                  onUpdateTransaction={handleUpdateTransaction}
                  onAddTransaction={handleAddSalesInvoice}
                  medicines={medicines}
                  onRestockFromCancelOrReturn={handleRestockFromCancelOrReturn}
                  currentBranch={currentBranch}
                  userName={userName}
                  mitraList={mitraList}
                  activeRole={activeRole}
                  onDeleteTransactions={(idsToDelete) => {
                    setTransactions((prev) => {
                      const updated = prev.filter((t) => !idsToDelete.includes(t.id));
                      try {
                        localStorage.setItem('latisha_transactions', JSON.stringify(updated));
                      } catch (e) {}
                      return updated;
                    });
                    addAuditLog('Riwayat Penjualan', `Hapus ${idsToDelete.length} transaksi penjualan`);
                  }}
                />
              )}

              {/* Module 4: Inventaris & Logistik Pusat */}
              {activeTab === 'inv-master' && (
                <InventoryView
                  medicines={medicines}
                  onAddMedicine={(m) => {
                    setMedicines((prev) => [m, ...prev]);
                    addAuditLog('Master Obat', `Tambah obat baru ${m.name} (${m.id})`);
                  }}
                  onUpdateMedicine={(m) => {
                    setMedicines((prev) => prev.map((item) => (item.id === m.id ? m : item)));
                    addAuditLog('Master Obat', `Update master obat ${m.name} (${m.id})`);
                  }}
                  onDeleteMedicine={(id) => {
                    setMedicines((prev) => prev.filter((m) => m.id !== id));
                    addAuditLog('Master Obat', `Hapus obat ID: ${id}`);
                  }}
                />
              )}

              {activeTab === 'inv-kartu-stok' && (
                <StockCardView
                  medicines={medicines}
                  stockMutations={stockMutations}
                />
              )}

              {activeTab === 'inv-stok-opname' && (
                <StockOpnameView
                  medicines={medicines}
                  transactions={transactions}
                  currentBranch={currentBranch}
                  userName={userName}
                  staffList={effectiveStaffList}
                  onApplyStockOpname={handleApplyStockOpname}
                  opnameRecords={opnameRecords}
                  stockMutations={stockMutations}
                  onDeleteOpnameRecord={handleDeleteOpnameRecord}
                />
              )}

              {activeTab === 'inv-pembelian' && (
                <PurchaseInvoiceView
                  invoices={purchaseInvoices}
                  medicines={medicines}
                  suppliers={suppliers}
                  onAddInvoice={handleAddPurchaseInvoice}
                  onUpdateInvoice={handleUpdatePurchaseInvoice}
                  onDeleteInvoice={handleDeletePurchaseInvoice}
                  onProcessReturn={handleProcessReturn}
                  onUpdateInvoiceStatus={(id, status) => {
                    setPurchaseInvoices((prev) =>
                      prev.map((i) => (i.id === id ? { ...i, status } : i))
                    );
                    addAuditLog('Faktur PBF', `Status faktur #${id} diubah menjadi ${status}`);
                  }}
                />
              )}

              {activeTab === 'inv-retur-riwayat' && (
                <PurchaseReturnHistoryView
                  returns={purchaseReturns}
                  invoices={purchaseInvoices}
                  userName={userName}
                  onDeleteReturn={handleDeletePurchaseReturn}
                  onProcessReturn={handleProcessReturn}
                  onUpdateReturn={handleUpdatePurchaseReturn}
                />
              )}

              {activeTab === 'inv-defecta' && (
                <DefectaView medicines={medicines} suppliers={suppliers} />
              )}

              {/* Module 5: Keuangan & Akuntansi */}
              {activeTab === 'keuangan-labarugi' && (
                <FinancialReportsView
                  transactions={transactions}
                  medicines={medicines}
                  purchaseInvoices={purchaseInvoices}
                  rmeRecords={rmeRecords}
                  doctors={effectiveDoctors}
                  staffList={effectiveStaffList}
                  opnameRecords={opnameRecords}
                  stockMutations={stockMutations}
                  initialTab="laba-rugi"
                />
              )}

              {activeTab === 'keuangan-hutang-piutang' && (
                <DebtReceivableView
                  purchaseInvoices={purchaseInvoices}
                  transactions={transactions}
                  onUpdatePurchaseInvoices={(updated) => {
                    setPurchaseInvoices(updated);
                    try {
                      localStorage.setItem('latisha_purchase_invoices', JSON.stringify(updated));
                    } catch (e) {}
                  }}
                  onUpdateTransactions={(updated) => {
                    setTransactions(updated);
                    try {
                      localStorage.setItem('latisha_transactions', JSON.stringify(updated));
                    } catch (e) {}
                  }}
                  userName={userName}
                  onAddAuditLog={addAuditLog}
                />
              )}

              {activeTab === 'keuangan-setting' && (
                <FeeSettingsView
                  feeConfig={feeConfig}
                  onSaveFeeConfig={setFeeConfig}
                />
              )}

              {/* Module 6: Sistem & Multi-Cabang */}
              {activeTab === 'sys-cabang' && (
                <BranchSyncView
                  branches={branches}
                  currentBranch={currentBranch}
                  onSelectBranch={setCurrentBranch}
                  medicines={medicines}
                  transfers={transfers}
                  onAddTransfer={handleAddTransfer}
                  onSyncAllBranches={handleSyncNow}
                  isSyncing={isSyncing}
                  onExportBackup={handleExportBackup}
                  onAddBranch={handleAddBranch}
                  onUpdateBranch={handleUpdateBranch}
                  onDeleteBranch={handleDeleteBranch}
                  staffList={effectiveStaffList}
                  userName={userName}
                />
              )}

              {activeTab === 'sys-audit' && (
                <AuditTrailView logs={auditLogs} />
              )}

              {/* Module 7: Setup */}
              {activeTab === 'setup-mitra' && (
                <SetupMitraView
                  mitraList={mitraList}
                  onAddMitra={handleAddMitra}
                  onUpdateMitra={handleUpdateMitra}
                  onDeleteMitra={handleDeleteMitra}
                />
              )}

              {activeTab === 'setup-supplier' && (
                <SetupSupplierView
                  suppliers={suppliers}
                  onAddSupplier={handleAddSupplier}
                  onUpdateSupplier={handleUpdateSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                />
              )}

              {activeTab === 'setup-database' && (
                <DatabaseBackupView onDatabaseRestored={() => window.location.reload()} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Pharmacy & APJ Settings Modal (Accessible via Header Settings Icon - Super Admin / APJ Only) */}
      <PharmacySettingsModal
        isOpen={isSettingsModalOpen}
        initialTab={settingsInitialTab}
        onClose={() => setIsSettingsModalOpen(false)}
        activeRole={activeRole}
        userName={userName}
        activeStaffId={currentStaff?.id}
        staffList={staffList}
        branches={branches}
        rolePermissions={rolePermissions}
        onUpdateRolePermissions={(updated) => {
          setRolePermissions(updated);
          addAuditLog('Hak Akses', 'Konfigurasi checkbox hak akses peran diperbarui oleh Super Admin / APJ.');
        }}
        onAddStaff={(s) => {
          setStaffList((prev) => [...prev, s]);
          addAuditLog('Pegawai', `Registrasi staf baru ${s.name} (${s.role})`);
        }}
        onUpdateStaff={(updated) => {
          setStaffList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          addAuditLog('Pegawai', `Update peran & hak akses staf ${updated.name} (${updated.role})`);
        }}
        onDeleteStaff={(id) => {
          setStaffList((prev) => prev.filter((s) => s.id !== id));
          addAuditLog('Pegawai', `Hapus staf ID: ${id}`);
        }}
        onProfileUpdate={() => {
          // Sync Pharmacy, APJ, and DPJ updates to active system states immediately
          try {
            const parsedPharm = getSavedPharmacyProfile();
            if (parsedPharm.name) {
              const formattedAddr = formatPharmacyAddress(parsedPharm);
              setBranches((prev) =>
                prev.map((b, idx) =>
                  idx === 0
                    ? {
                        ...b,
                        name: parsedPharm.name,
                        address: formattedAddr,
                        phone: parsedPharm.phone,
                        siaNumber: parsedPharm.sia
                      }
                    : b
                )
              );
              setCurrentBranch((prev) => ({
                ...prev,
                name: parsedPharm.name,
                address: formattedAddr,
                phone: parsedPharm.phone,
                siaNumber: parsedPharm.sia
              }));
            }
            const savedApj = localStorage.getItem('latisha_apj_profile');
            if (savedApj) {
              const parsed = JSON.parse(savedApj);
              if (parsed.name) {
                setStaffList((prev) =>
                  prev.map((s) => (s.id === 'STF-001' ? { ...s, name: parsed.name, phone: parsed.phone || s.phone } : s))
                );
                if (currentStaff?.id === 'STF-001') {
                  setUserName(parsed.name);
                }
              }
            }
            const savedDpj = localStorage.getItem('latisha_dpj_profile');
            if (savedDpj) {
              const parsedDpj = JSON.parse(savedDpj);
              if (parsedDpj.name) {
                setDoctors((prev) =>
                  prev.map((doc, idx) =>
                    idx === 0
                      ? {
                          ...doc,
                          name: parsedDpj.name,
                          sip: parsedDpj.sip || doc.sip,
                          specialization: parsedDpj.specialization || doc.specialization,
                          schedule: parsedDpj.schedule || doc.schedule
                        }
                      : doc
                  )
                );
                setStaffList((prev) =>
                  prev.map((s) => (s.id === 'STF-002' ? { ...s, name: parsedDpj.name, phone: parsedDpj.phone || s.phone } : s))
                );
                if (currentStaff?.id === 'STF-002') {
                  setUserName(parsedDpj.name);
                }
              }
            }
          } catch (e) {}
        }}
      />
    </div>
  );
}
