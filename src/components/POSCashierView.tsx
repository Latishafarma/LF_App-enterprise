import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Trash2,
  CreditCard,
  Printer,
  X,
  CheckCircle,
  FileCheck,
  User,
  ShoppingBag,
  Stethoscope,
  Users,
  FlaskConical,
  Play,
  Square,
  Wallet,
  Calculator,
  AlertTriangle,
  ShieldCheck,
  Clock,
  History,
  Check,
  Ban,
  Banknote
} from 'lucide-react';
import {
  Medicine,
  Patient,
  Doctor,
  Transaction,
  CartItem,
  EPrescription,
  StockMutation,
  FeeConfig,
  DEFAULT_FEE_CONFIG,
  Mitra,
  Staff,
  StaffFeeItem,
  LabTestRecord,
  CashierShiftSession,
  CashDenominationItem,
  CASH_DENOMINATIONS_LIST
} from '../types';
import { openPrintWindow } from '../utils/printHelper';
import { RupiahInput } from './RupiahInput';
import { useFacilityProfiles, formatPharmacyAddress } from './PharmacySettingsModal';

const normalizeTrxDateToYMD = (dateStr: string): string => {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);
  const idMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (idMatch) {
    const [, d, m, y] = idMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return clean.slice(0, 10);
};

interface POSCashierViewProps {
  medicines: Medicine[];
  patients: Patient[];
  doctors: Doctor[];
  mitraList: Mitra[];
  staffList?: Staff[];
  transactions: Transaction[];
  onSaveTransaction: (trx: Transaction, mutations: StockMutation[]) => void;
  activePrescription: EPrescription | null;
  onClearActivePrescription: () => void;
  currentCashierName?: string;
  activeRole?: string;
  branchId?: string;
  feeConfig?: FeeConfig;
  labRecords?: LabTestRecord[];
  cashierShifts?: CashierShiftSession[];
  onOpenShift?: (shift: CashierShiftSession) => void;
  onCloseShift?: (shift: CashierShiftSession) => void;
  onApproveRejectShift?: (shiftId: string, action: 'APPROVE' | 'REJECT', notes: string) => void;
  onClearShiftHistory?: () => void;
}

export const POSCashierView: React.FC<POSCashierViewProps> = ({
  medicines,
  patients,
  doctors,
  mitraList,
  staffList = [],
  transactions,
  onSaveTransaction,
  activePrescription,
  onClearActivePrescription,
  currentCashierName = 'apt. Mardin, S.Farm',
  activeRole = 'Super Admin / APJ',
  branchId = 'BR-01',
  feeConfig,
  labRecords = [],
  cashierShifts = [],
  onOpenShift,
  onCloseShift,
  onApproveRejectShift,
  onClearShiftHistory
}) => {
  const { pharmacyProfile, apjProfile } = useFacilityProfiles();
  const [posJalur, setPosJalur] = useState<'REGULER' | 'KLINIK' | 'MITRA'>('REGULER');
  const [customer, setCustomer] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [doctor, setDoctor] = useState('Internal');
  const [assignedStaff, setAssignedStaff] = useState<StaffFeeItem[]>([]);

  // Cashier Shift Management States
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showShiftHistoryModal, setShowShiftHistoryModal] = useState(false);

  const [openShiftName, setOpenShiftName] = useState('Shift Pagi (07:00 - 14:00)');
  const [selectedShiftCashier, setSelectedShiftCashier] = useState(currentCashierName);
  const [openingFloatInput, setOpeningFloatInput] = useState<number>(200000);
  const [openingNotesInput, setOpeningNotesInput] = useState('');

  useEffect(() => {
    setSelectedShiftCashier(currentCashierName);
  }, [currentCashierName]);

  // Physical Denomination Input State (Lembar/Keping per Nominal: 1.000 s/d 100.000)
  const [denominationSheets, setDenominationSheets] = useState<Record<number, number>>({
    1000: 0,
    2000: 0,
    5000: 0,
    10000: 0,
    20000: 0,
    50000: 0,
    100000: 0
  });
  const [closingNotesInput, setClosingNotesInput] = useState('');
  const [approvalNotesInput, setApprovalNotesInput] = useState<Record<string, string>>({});

  const isSuperAdmin = activeRole === 'Super Admin / APJ';

  // Active Shift (Status: 'Aktif' or 'Ditolak (Hitung Ulang)')
  const activeShift = useMemo(() => {
    return cashierShifts.find(
      (s) => s.status === 'Aktif' || s.status === 'Ditolak (Hitung Ulang)'
    );
  }, [cashierShifts]);

  // Shifts waiting for Super Admin Approval
  const pendingApprovalShifts = useMemo(() => {
    return cashierShifts.filter((s) => s.status === 'Menunggu Approval Tutup Kasir');
  }, [cashierShifts]);

  // Calculate Today's / Active Shift's Cash & Non-Cash Sales from System Transactions
  const shiftSalesSummary = useMemo(() => {
    const now = new Date();
    const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Valid transactions from today
    const validTodayTrx = transactions.filter(
      (t) =>
        t.status !== 'Dibatalkan' &&
        t.status !== 'Diretur' &&
        normalizeTrxDateToYMD(t.date) === todayYMD
    );

    let cashSales = 0;
    let nonCashSales = 0;

    validTodayTrx.forEach((t) => {
      const pm = (t.paymentMethod || '').toLowerCase();
      if (pm.includes('tunai')) {
        cashSales += t.total;
      } else {
        nonCashSales += t.total;
      }
    });

    // Deduct cash sales already accounted for in closed/pending shifts from today
    const closedTodayShifts = cashierShifts.filter(
      (s) =>
        s.openDate === todayYMD &&
        s.id !== activeShift?.id &&
        (s.status === 'Ditutup (Sesuai)' ||
          s.status === 'Ditutup (Approved Super Admin)' ||
          s.status === 'Menunggu Approval Tutup Kasir')
    );

    const alreadyAccountedCash = closedTodayShifts.reduce(
      (acc, s) => acc + (s.systemCashSales || 0),
      0
    );

    const currentShiftCashSales = Math.max(0, cashSales - alreadyAccountedCash);
    const openingFloat = activeShift ? activeShift.openingFloat : openingFloatInput;
    const expectedCashInDrawer = openingFloat + currentShiftCashSales;

    return {
      cashSales: currentShiftCashSales,
      nonCashSales,
      openingFloat,
      expectedCashInDrawer,
      trxCount: validTodayTrx.length
    };
  }, [transactions, cashierShifts, activeShift, openingFloatInput]);

  // Denomination rows calculation
  const denominationRows = useMemo<CashDenominationItem[]>(() => {
    return CASH_DENOMINATIONS_LIST.map((d) => {
      const sheets = Math.max(0, Number(denominationSheets[d.nominal]) || 0);
      return {
        nominal: d.nominal,
        label: d.label,
        sheets,
        subtotal: d.nominal * sheets
      };
    });
  }, [denominationSheets]);

  const totalPhysicalCash = useMemo(() => {
    return denominationRows.reduce((acc, row) => acc + row.subtotal, 0);
  }, [denominationRows]);

  const cashDifference = useMemo(() => {
    return totalPhysicalCash - shiftSalesSummary.expectedCashInDrawer;
  }, [totalPhysicalCash, shiftSalesSummary.expectedCashInDrawer]);

  const cashDifferenceStatus = useMemo<'Sesuai' | 'Surplus (Lebih)' | 'Defisit (Kurang)'>(() => {
    if (cashDifference === 0) return 'Sesuai';
    if (cashDifference > 0) return 'Surplus (Lebih)';
    return 'Defisit (Kurang)';
  }, [cashDifference]);

  const handleConfirmOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newShift: CashierShiftSession = {
      id: `SHIFT-${todayYMD.replace(/-/g, '')}-${String(cashierShifts.length + 1).padStart(2, '0')}`,
      branchId,
      cashierName: selectedShiftCashier || currentCashierName,
      shiftName: openShiftName,
      openDate: todayYMD,
      openTime: `${timeStr} WIB`,
      openTimestamp: Date.now(),
      openingFloat: Math.max(0, Number(openingFloatInput) || 0),
      openingNotes: openingNotesInput.trim() || 'Pembukaan kasir normal',
      systemCashSales: 0,
      systemNonCashSales: 0,
      expectedCashInDrawer: Math.max(0, Number(openingFloatInput) || 0),
      physicalCashInDrawer: 0,
      difference: 0,
      differenceStatus: 'Sesuai',
      denominations: CASH_DENOMINATIONS_LIST.map((d) => ({
        nominal: d.nominal,
        label: d.label,
        sheets: 0,
        subtotal: 0
      })),
      status: 'Aktif',
      transactionCount: 0
    };

    onOpenShift?.(newShift);
    setShowOpenShiftModal(false);
    setOpeningNotesInput('');
  };

  const handleOpenCloseShiftModal = () => {
    if (activeShift && activeShift.denominations && activeShift.status === 'Ditolak (Hitung Ulang)') {
      const nextMap: Record<number, number> = {
        1000: 0,
        2000: 0,
        5000: 0,
        10000: 0,
        20000: 0,
        50000: 0,
        100000: 0
      };
      activeShift.denominations.forEach((d) => {
        nextMap[d.nominal] = d.sheets;
      });
      setDenominationSheets(nextMap);
      setClosingNotesInput(activeShift.closingNotes || '');
    } else {
      setDenominationSheets({
        1000: 0,
        2000: 0,
        5000: 0,
        10000: 0,
        20000: 0,
        50000: 0,
        100000: 0
      });
      setClosingNotesInput('');
    }
    setShowCloseShiftModal(true);
  };

  const handleConfirmCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const baseShift: CashierShiftSession = activeShift || {
      id: `SHIFT-${todayYMD.replace(/-/g, '')}-${String(cashierShifts.length + 1).padStart(2, '0')}`,
      branchId,
      cashierName: currentCashierName,
      shiftName: openShiftName,
      openDate: todayYMD,
      openTime: `${timeStr} WIB`,
      openTimestamp: Date.now(),
      openingFloat: shiftSalesSummary.openingFloat,
      openingNotes: 'Auto-buka saat tutup kasir',
      systemCashSales: shiftSalesSummary.cashSales,
      systemNonCashSales: shiftSalesSummary.nonCashSales,
      expectedCashInDrawer: shiftSalesSummary.expectedCashInDrawer,
      physicalCashInDrawer: totalPhysicalCash,
      difference: cashDifference,
      differenceStatus: cashDifferenceStatus,
      denominations: denominationRows,
      status: 'Aktif',
      transactionCount: shiftSalesSummary.trxCount
    };

    const hasDiscrepancy = cashDifference !== 0;

    const closedShift: CashierShiftSession = {
      ...baseShift,
      closeDate: todayYMD,
      closeTime: `${timeStr} WIB`,
      systemCashSales: shiftSalesSummary.cashSales,
      systemNonCashSales: shiftSalesSummary.nonCashSales,
      expectedCashInDrawer: shiftSalesSummary.expectedCashInDrawer,
      physicalCashInDrawer: totalPhysicalCash,
      difference: cashDifference,
      differenceStatus: cashDifferenceStatus,
      closingNotes:
        closingNotesInput.trim() ||
        (hasDiscrepancy
          ? `Terdapat selisih ${cashDifferenceStatus} Rp ${Math.abs(cashDifference).toLocaleString('id-ID')}`
          : 'Kas fisik sesuai dengan sistem'),
      denominations: denominationRows,
      status: hasDiscrepancy ? 'Menunggu Approval Tutup Kasir' : 'Ditutup (Sesuai)',
      transactionCount: shiftSalesSummary.trxCount
    };

    onCloseShift?.(closedShift);
    setShowCloseShiftModal(false);
  };

  // Helper: check if a LabTestRecord has already been paid/transacted in POS Kasir
  const isLabRecordPaidInPOS = useMemo(() => {
    const activeTrxs = (transactions || []).filter(
      (t) => t.status !== 'Dibatalkan' && t.status !== 'Diretur'
    );

    return (rec: LabTestRecord) => {
      const targetCartItemId = `LAB-FEE-${rec.id}`;
      const recPatientLower = (rec.patientName || '').trim().toLowerCase();

      return activeTrxs.some((trx) => {
        // 1. Exact match by LAB-FEE-{rec.id} item ID in transaction items
        const hasExactId = (trx.items || []).some((item) => item.id === targetCartItemId);
        if (hasExactId) return true;

        // 2. Fallback match: if transaction belongs to the same patient and contains a 'Biaya Cek Lab' item
        const trxCustLower = (trx.customerName || '').trim().toLowerCase();
        const isSamePatient =
          recPatientLower &&
          (trxCustLower === recPatientLower ||
            trxCustLower.includes(recPatientLower) ||
            recPatientLower.includes(trxCustLower));

        if (isSamePatient) {
          const hasLabFeeItem = (trx.items || []).some(
            (item) =>
              item.id === targetCartItemId ||
              (item.name &&
                item.name.toLowerCase().includes('biaya cek lab') &&
                (!item.id.startsWith('LAB-FEE-') || item.id === targetCartItemId))
          );
          if (hasLabFeeItem) return true;
        }
        return false;
      });
    };
  }, [transactions]);

  // Match only UNPAID lab test records for the currently selected customer / patient
  const matchingCustomerLabRecords = useMemo(() => {
    if (!labRecords || labRecords.length === 0 || !customer) return [];
    const q = customer.trim().toLowerCase();
    if (!q || q === 'pelanggan umum' || q === 'reguler') return [];

    return labRecords.filter((rec) => {
      const pName = (rec.patientName || '').trim().toLowerCase();
      const rm = (rec.rmId || '').trim().toLowerCase();
      const matchesCustomer =
        pName === q || (rm && rm === q) || pName.includes(q) || (rm && q.includes(rm));
      if (!matchesCustomer) return false;

      // Hanya tampilkan jika belum pernah dilakukan pembayaran di POS Kasir
      return !isLabRecordPaidInPOS(rec);
    });
  }, [labRecords, customer, isLabRecordPaidInPOS]);

  // Close customer dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [pluInput, setPluInput] = useState('');
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [showMedDropdown, setShowMedDropdown] = useState(false);

  const [tuslah, setTuslah] = useState(0);
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState('Strip');
  const [choosePrice, setChoosePrice] = useState<'Harga Jual 1' | 'Harga Jual 2' | 'Harga Jual 3'>('Harga Jual 1');
  const [price, setPrice] = useState(0);
  const [itemDiscount, setItemDiscount] = useState(0);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [description, setDescription] = useState('');
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [chargeCC, setChargeCC] = useState(0);

  const isLabFeeAlreadyInCart = useMemo(() => {
    if (matchingCustomerLabRecords.length === 0) return false;
    return matchingCustomerLabRecords.every((rec) =>
      cart.some((c) => c.id === `LAB-FEE-${rec.id}`)
    );
  }, [cart, matchingCustomerLabRecords]);

  const handleAddLabFeeToCart = () => {
    if (matchingCustomerLabRecords.length === 0) {
      return;
    }

    const unpaidNotInCart = matchingCustomerLabRecords.filter(
      (rec) => !cart.some((c) => c.id === `LAB-FEE-${rec.id}`)
    );

    if (unpaidNotInCart.length === 0) {
      return;
    }

    const newLabCartItems: CartItem[] = unpaidNotInCart.map((rec) => {
      const feeAmount =
        rec.cost && rec.cost > 0
          ? rec.cost
          : rec.items.reduce((s, it) => s + (it.price || 0), 0) || 50000;

      const paramSummary = rec.items
        .map((i) => i.parameter)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      const itemName = `Biaya Cek Lab: ${paramSummary || 'Pemeriksaan POCT'}${
        rec.items.length > 3 ? '...' : ''
      } (${rec.patientName})`;

      return {
        id: `LAB-FEE-${rec.id}`,
        name: itemName,
        qty: 1,
        unit: 'Pemeriksaan',
        tuslah: 0,
        price: feeAmount,
        discount: 0,
        subtotal: feeAmount,
        hpp: 0
      };
    });

    setCart((prev) => [...prev, ...newLabCartItems]);
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [subMethod, setSubMethod] = useState('Tunai (Cash)');
  const [payAmount, setPayAmount] = useState(0);
  const [lastFinishedTrx, setLastFinishedTrx] = useState<Transaction | null>(null);

  const handlePrintReceipt = () => {
    if (lastFinishedTrx) {
      try {
        localStorage.setItem('latisha_active_print_receipt', JSON.stringify(lastFinishedTrx));
      } catch (e) {
        console.warn('Storage save failed:', e);
      }
      openPrintWindow('struk-pos', { trxId: lastFinishedTrx.id });
    } else {
      openPrintWindow('struk-pos');
    }
  };

  // Fee configuration from Settings Submenu (or localStorage fallback)
  const currentFees = useMemo<FeeConfig>(() => {
    if (feeConfig) return feeConfig;
    const saved = localStorage.getItem('latisha_fee_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_FEE_CONFIG;
      }
    }
    return DEFAULT_FEE_CONFIG;
  }, [feeConfig]);

  // Filtered customer/mitra for autocomplete based on path
  const filteredCustomers = useMemo(() => {
    const q = customer.trim().toLowerCase();
    if (!q || q === 'pelanggan umum') return [];
    if (posJalur === 'MITRA') {
      return mitraList.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      );
    } else {
      return patients.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.nik?.includes(customer.trim())
      );
    }
  }, [posJalur, customer, mitraList, patients]);

  // List of medical services corresponding to Submenu Pengaturan Tarif & Jasa
  const availableServices = useMemo(() => {
    const base = [
      {
        id: 'JASA-DOKTER-UMUM',
        name: 'Jasa Dokter Umum',
        category: 'Poli Umum',
        price: currentFees.doctorFee ?? 20000
      },
      {
        id: 'JASA-PENUNJANG-MEDIS',
        name: 'Jasa Penunjang Medis (Perawat / Bidan)',
        category: 'Skrining & Nakes',
        price: currentFees.medicalSupportFee ?? 5000
      },
      {
        id: 'JASA-ADMIN-LOKET',
        name: 'Biaya Administrasi Pendaftaran',
        category: 'Administrasi',
        price: currentFees.adminFee ?? 1000
      },
      {
        id: 'JASA-HOME-VISIT',
        name: 'Jasa Kunjungan Rumah (Home Visit)',
        category: 'Home Care',
        price: currentFees.homeVisitFee ?? 35000
      },
      {
        id: 'JASA-APOTEKER',
        name: 'Jasa Apoteker',
        category: 'Telaah & Konseling',
        price: currentFees.pharmacistFee ?? 10000
      }
    ];

    if (currentFees.customTariffs && Array.isArray(currentFees.customTariffs)) {
      currentFees.customTariffs.forEach((ct) => {
        base.push({
          id: ct.id,
          name: ct.name,
          category: ct.category || 'Layanan Tambahan',
          price: ct.price || 0
        });
      });
    }

    return base;
  }, [currentFees]);

  const handleToggleService = (srv: { id: string; name: string; price: number }) => {
    if (posJalur !== 'KLINIK') return;

    const exists = cart.some((c) => c.id === srv.id);
    if (exists) {
      setCart(cart.filter((c) => c.id !== srv.id));
    } else {
      const newItem: CartItem = {
        id: srv.id,
        name: srv.name,
        qty: 1,
        unit: 'Layanan',
        tuslah: 0,
        price: srv.price,
        discount: 0,
        subtotal: srv.price,
        hpp: 0
      };
      setCart([...cart, newItem]);
    }
  };

  // Price Resolver
  const resolvePrice = (med: Medicine, priceType: string, targetUnit: string) => {
    if (!med) return 0;
    const isBesar = targetUnit && med.satuanBesar && targetUnit.trim().toLowerCase() === med.satuanBesar.trim().toLowerCase();
    const ratio = med.rasioKonversi || 1;

    let baseKecil = med.sellPrice;
    if (priceType === 'Harga Jual 3') {
      baseKecil = med.sellPriceMitra || Math.round(med.sellPrice * 0.9);
    } else if (priceType === 'Harga Jual 2') {
      baseKecil = med.sellPriceKlinik || Math.round(med.sellPrice * 0.95);
    }

    if (isBesar) {
      return baseKecil * ratio;
    }
    return baseKecil;
  };

  // Sync pricing tier when posJalur changes
  useEffect(() => {
    let pType: 'Harga Jual 1' | 'Harga Jual 2' | 'Harga Jual 3' = 'Harga Jual 1';
    if (posJalur === 'MITRA') pType = 'Harga Jual 3';
    else if (posJalur === 'KLINIK') pType = 'Harga Jual 2';

    setChoosePrice(pType);
    if (selectedMed) {
      setPrice(resolvePrice(selectedMed, pType, unit));
    }
  }, [posJalur]);

  // Helper to calculate fee rate per staff role based on feeConfig
  const getStaffFee = (staff: Staff): number => {
    const config = currentFees;
    if (staff.role === 'Dokter') {
      return config.doctorFee || 20000;
    }
    if (staff.role === 'Apoteker' || staff.role === 'Super Admin / APJ') {
      return config.pharmacistFee || 10000;
    }
    if (staff.role === 'Perawat / Bidan' || staff.role === 'Perawat / Nakes Lapangan') {
      return config.medicalSupportFee || 5000;
    }
    if (staff.role === 'Kasir & Front Office') {
      return config.adminFee || 1000;
    }
    return 5000;
  };

  const [showStaffSelector, setShowStaffSelector] = useState(false);

  // Load Incoming E-Prescription from Doctor's SOAP
  useEffect(() => {
    if (activePrescription) {
      setPosJalur('KLINIK');
      setCustomer(activePrescription.patientName || 'Pasien Klinik');
      setDoctor(activePrescription.doctorName || 'dr. Anis Prima Dewi');

      if (activePrescription.assignedStaff && activePrescription.assignedStaff.length > 0) {
        setAssignedStaff(activePrescription.assignedStaff);
      } else {
        const foundDoc = staffList.find(
          (s) => s.role === 'Dokter' || s.name.toLowerCase().includes('dr.')
        );
        setAssignedStaff([
          {
            staffId: foundDoc?.id || 'STF-02',
            staffName: activePrescription.doctorName || foundDoc?.name || 'dr. Anis Prima Dewi',
            role: 'Dokter',
            fee: currentFees.doctorFee || 20000
          }
        ]);
      }

      const loadedCart: CartItem[] = activePrescription.items.map((it) => {
        const med = medicines.find(
          (m) => m.name.toLowerCase().includes(it.name.toLowerCase()) || m.id === it.medicineId
        ) || medicines[0];

        const targetUnit = it.unit || med.satuanKecil || med.unit || 'Strip';
        const p = resolvePrice(med, 'Harga Jual 2', targetUnit);

        return {
          id: med.id,
          name: it.name,
          qty: it.qty || 1,
          unit: targetUnit,
          tuslah: 1000, // standard tuslah per prescription item
          price: p,
          discount: 0,
          subtotal: p * (it.qty || 1) + 1000,
          hpp: med.hpp || 2500
        };
      });

      setCart(loadedCart);
    }
  }, [activePrescription, medicines, staffList, currentFees]);

  const handleMedSelect = (med: Medicine) => {
    setSelectedMed(med);
    setPluInput(med.name);
    const defUnit = med.satuanKecil || med.unit || 'Strip';
    setUnit(defUnit);
    setPrice(resolvePrice(med, choosePrice, defUnit));
    setShowMedDropdown(false);
  };

  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit);
    if (selectedMed) {
      setPrice(resolvePrice(selectedMed, choosePrice, newUnit));
    }
  };

  const computedSubtotalInput = useMemo(() => {
    return Math.max(0, Number(price) * Number(qty) + Number(tuslah) - Number(itemDiscount));
  }, [price, qty, tuslah, itemDiscount]);

  const handleAddItem = () => {
    if (!selectedMed && !pluInput) {
      alert('Pilih atau ketik obat terlebih dahulu!');
      return;
    }

    const med =
      selectedMed ||
      medicines.find((m) => m.name.toLowerCase().includes(pluInput.toLowerCase())) ||
      medicines[0];

    const fallbackUnit = unit || med.satuanKecil || med.unit || 'Strip';
    const finalPrice = price > 0 ? price : resolvePrice(med, choosePrice, fallbackUnit);

    const newItem: CartItem = {
      id: med.id,
      name: med.name,
      qty: Number(qty) || 1,
      unit: fallbackUnit,
      tuslah: Number(tuslah) || 0,
      price: finalPrice,
      discount: Number(itemDiscount) || 0,
      subtotal: Math.max(0, finalPrice * (Number(qty) || 1) + Number(tuslah) - Number(itemDiscount)),
      hpp: med.hpp || 2000
    };

    setCart([...cart, newItem]);

    // Reset line inputs
    setPluInput('');
    setSelectedMed(null);
    setTuslah(0);
    setQty(1);
    setPrice(0);
    setItemDiscount(0);
  };

  const handleRemoveItem = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const cartSubtotal = cart.reduce((acc, i) => acc + i.subtotal, 0);
  const totalAfterDiscount = Math.max(0, cartSubtotal - Number(overallDiscount));
  const totalBeforeRounding = totalAfterDiscount + Number(serviceCharge) + Number(chargeCC);

  // Pembulatan Otomatis ke atas ke ribuan terdekat (misal 15.230 -> 16.000)
  const pembulatan = totalBeforeRounding > 0 && totalBeforeRounding % 1000 !== 0
    ? (Math.ceil(totalBeforeRounding / 1000) * 1000) - totalBeforeRounding
    : 0;

  const grandTotal = totalBeforeRounding + pembulatan;
  const totalItemsCount = cart.reduce((acc, i) => acc + i.qty, 0);
  const change = Math.max(0, payAmount - grandTotal);

  const handleSaveTransaction = () => {
    if (cart.length === 0) {
      alert('Keranjang kasir masih kosong!');
      return;
    }

    const isTempo = paymentMethod === 'Tempo / Piutang';
    if (payAmount < grandTotal && paymentMethod !== 'Kredit / Debit' && !isTempo) {
      alert('Nominal uang bayar kurang dari total belanja!');
      return;
    }

    const newTrxId = invoiceNo || `TRX-${Date.now().toString().slice(-6)}`;
    const nowTime = new Date().toLocaleString('id-ID');
    const today = new Date().toISOString().split('T')[0];

    const hppTotal = cart.reduce((acc, i) => acc + i.hpp * i.qty, 0);
    const profit = grandTotal - hppTotal;
    const effectivePaid = isTempo ? Math.min(grandTotal, Number(payAmount) || 0) : Number(payAmount);
    const remaining = isTempo ? Math.max(0, grandTotal - effectivePaid) : 0;
    const paymentStatus: 'Lunas' | 'Belum Lunas' | 'Sebagian' | 'Tempo' = isTempo
      ? remaining <= 0
        ? 'Lunas'
        : effectivePaid > 0
        ? 'Sebagian'
        : 'Belum Lunas'
      : 'Lunas';

    const resolvedCustomerName = customer.trim() || 'Reguler';

    const newTrx: Transaction = {
      id: newTrxId,
      date: nowTime,
      type: posJalur,
      kasir: currentCashierName,
      customerName: resolvedCustomerName,
      doctorName: doctor,
      dueDate: isTempo ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
      term: isTempo ? 'Tempo 30 Hari' : undefined,
      paymentStatus,
      paidAmount: effectivePaid,
      remainingAmount: remaining,
      assignedStaff:
        posJalur === 'KLINIK'
          ? assignedStaff.length > 0
            ? assignedStaff
            : [
                {
                  staffId: 'STF-02',
                  staffName: doctor || 'dr. Anis Prima Dewi',
                  role: 'Dokter',
                  fee: currentFees.doctorFee || 20000
                }
              ]
          : undefined,
      subtotal: cartSubtotal,
      discount: Number(overallDiscount),
      serviceCharge: Number(serviceCharge),
      pembulatan: Number(pembulatan),
      chargeCC: Number(chargeCC),
      total: grandTotal,
      payAmount: effectivePaid,
      change: isTempo ? 0 : change,
      hppTotal,
      profit,
      paymentMethod: isTempo ? 'Tempo / Piutang Pasien' : `${paymentMethod} (${subMethod})`,
      description,
      items: cart,
      branchId
    };

    const newMutations: StockMutation[] = cart
      .filter((c) => !c.id.startsWith('JASA-') && !c.id.startsWith('LAB-FEE-'))
      .map((c) => ({
        id: `MUT-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
        date: today,
        time: new Date().toLocaleTimeString('id-ID'),
        medicineId: c.id,
        medicineName: c.name,
        refNo: newTrxId,
        type: posJalur === 'KLINIK' ? 'RESEP_DOKTER' : 'PENJUALAN',
        inQty: 0,
        outQty: c.qty,
        balance: Math.max(0, (medicines.find((m) => m.id === c.id)?.stock || 0) - c.qty),
        ket: `Penjualan Kasir Jalur ${posJalur} (${resolvedCustomerName})`,
        petugas: currentCashierName,
        branchId
      }));

    onSaveTransaction(newTrx, newMutations);
    setLastFinishedTrx(newTrx);

    // Reset Form
    setCart([]);
    setCustomer('');
    setAssignedStaff([]);
    onClearActivePrescription();
    setInvoiceNo(`INV-${Date.now().toString().slice(-6)}`);
    setPayAmount(0);
    setOverallDiscount(0);
    setServiceCharge(0);
    setDescription('');
    setShowPaymentModal(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col min-h-[580px] text-xs font-sans overflow-hidden">
      {/* Top Cashier Shift & Session Management Bar (Buka & Tutup Kasir) */}
      <div className="px-4 py-3 bg-slate-900 text-white border-b border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Shift & Ringkasan Kas Laci */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                  activeShift
                    ? activeShift.status === 'Ditolak (Hitung Ulang)'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-400/40'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40'
                    : pendingApprovalShifts.length > 0
                    ? 'bg-amber-500/20 text-amber-400 border-amber-400/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs uppercase tracking-wide">
                    Manajemen Sesi &amp; Shift Kasir
                  </span>
                  {activeShift ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        activeShift.status === 'Ditolak (Hitung Ulang)'
                          ? 'bg-rose-500 text-white'
                          : 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {activeShift.status === 'Ditolak (Hitung Ulang)'
                        ? 'DITOLAK SUPER ADMIN — HITUNG ULANG'
                        : `SHIFT AKTIF: ${activeShift.shiftName}`}
                    </span>
                  ) : pendingApprovalShifts.length > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 animate-pulse">
                      MENUNGGU APPROVAL TUTUP KASIR ({pendingApprovalShifts.length})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      BELUM BUKA SHIFT
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 mt-0.5">
                  <span>
                    Kasir: <strong className="text-white">{activeShift?.cashierName || currentCashierName}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Modal Awal:{' '}
                    <strong className="font-mono text-sky-300">
                      Rp {shiftSalesSummary.openingFloat.toLocaleString('id-ID')}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Omset Tunai Sistem:{' '}
                    <strong className="font-mono text-emerald-300">
                      Rp {shiftSalesSummary.cashSales.toLocaleString('id-ID')}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Kas Seharusnya di Laci:{' '}
                    <strong className="font-mono text-amber-300">
                      Rp {shiftSalesSummary.expectedCashInDrawer.toLocaleString('id-ID')}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Buttons: Buka Kasir, Tutup Kasir, Riwayat Shift */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOpenShiftModal(true)}
              disabled={Boolean(activeShift)}
              className={`px-3.5 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition shadow-sm ${
                activeShift
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer active:scale-95'
              }`}
              title={
                activeShift
                  ? `Shift sedang aktif (${activeShift.id})`
                  : 'Buka sesi shift kasir & input modal awal laci (cash float)'
              }
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Buka Kasir</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCloseShiftModal}
              className="px-3.5 py-2 rounded-xl font-extrabold text-xs bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition shadow-sm cursor-pointer active:scale-95"
              title="Tutup kasir & input rincian lembar denominasi uang fisik di laci"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Tutup Kasir</span>
            </button>

            <button
              type="button"
              onClick={() => setShowShiftHistoryModal(true)}
              className="px-3 py-2 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="Lihat Riwayat Buka-Tutup Kasir & Approval Selisih"
            >
              <History className="w-3.5 h-3.5 text-sky-400" />
              <span>Riwayat Shift</span>
              {pendingApprovalShifts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                  {pendingApprovalShifts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Real-Time Alert & Approval Panel for Shifts with Discrepancy (Menunggu Approval Tutup Kasir) */}
        {pendingApprovalShifts.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/90 via-slate-900 to-rose-950/80 border border-amber-500/50 text-amber-100 space-y-3 animate-in fade-in">
            {pendingApprovalShifts.map((pShift) => (
              <div key={pShift.id} className="space-y-2.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs uppercase tracking-wide text-amber-300">
                          [NOTIFIKASI REAL-TIME] Menunggu Approval Tutup Kasir #{pShift.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                            pShift.difference > 0
                              ? 'bg-sky-500/30 text-sky-200 border border-sky-400/40'
                              : 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                          }`}
                        >
                          Selisih {pShift.differenceStatus}:{' '}
                          {pShift.difference > 0 ? '+' : '-'}Rp{' '}
                          {Math.abs(pShift.difference).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Petugas: <strong>{pShift.cashierName}</strong> ({pShift.shiftName}) · Waktu Tutup:{' '}
                        <span className="font-mono">{pShift.closeTime}</span> · Kas Sistem Seharusnya:{' '}
                        <strong className="font-mono text-white">
                          Rp {pShift.expectedCashInDrawer.toLocaleString('id-ID')}
                        </strong>{' '}
                        (Modal Rp {pShift.openingFloat.toLocaleString('id-ID')} + Omset Tunai Rp{' '}
                        {pShift.systemCashSales.toLocaleString('id-ID')}) vs Kas Fisik di Laci:{' '}
                        <strong className="font-mono text-amber-300">
                          Rp {pShift.physicalCashInDrawer.toLocaleString('id-ID')}
                        </strong>
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {pShift.denominations.map((d) => (
                          <span
                            key={d.nominal}
                            className="px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-[10px] font-mono text-slate-200"
                          >
                            {d.label}: <strong>{d.sheets} lbr</strong> (Rp{' '}
                            {d.subtotal.toLocaleString('id-ID')})
                          </span>
                        ))}
                      </div>
                      {pShift.closingNotes && (
                        <p className="text-[11px] text-amber-200/90 italic mt-1">
                          Catatan Kasir: "{pShift.closingNotes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Super Admin / APJ Approval Controls */}
                  {isSuperAdmin ? (
                    <div className="flex flex-wrap items-center gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-amber-500/30">
                      <input
                        type="text"
                        placeholder="Catatan Super Admin / APJ..."
                        value={approvalNotesInput[pShift.id] || ''}
                        onChange={(e) =>
                          setApprovalNotesInput({
                            ...approvalNotesInput,
                            [pShift.id]: e.target.value
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs w-48 outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onApproveRejectShift?.(
                            pShift.id,
                            'APPROVE',
                            approvalNotesInput[pShift.id] || 'Selisih telah diverifikasi & disetujui Super Admin / APJ'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Tutup Kasir</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onApproveRejectShift?.(
                            pShift.id,
                            'REJECT',
                            approvalNotesInput[pShift.id] || 'Ditolak Super Admin — mohon hitung ulang uang fisik di laci'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Reject (Hitung Ulang)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-[11px] text-amber-200 font-bold">
                      Menunggu verifikasi &amp; persetujuan dari akun <strong>Super Admin / APJ</strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Jalur & Customer Selector */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">
              Jalur Transaksi:
            </span>
            <button
              onClick={() => setPosJalur('REGULER')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                posJalur === 'REGULER'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              OTC / Umum (Jual 1)
            </button>
            <button
              onClick={() => setPosJalur('KLINIK')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                posJalur === 'KLINIK'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Pasien Klinik / Resep (Jual 2)
            </button>
            <button
              onClick={() => setPosJalur('MITRA')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                posJalur === 'MITRA'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Nakes / Mitra (Jual 3)
            </button>
          </div>

          <div className="text-[11px] font-bold text-sky-800 bg-sky-50 px-3 py-1 rounded-xl border border-sky-200">
            Skema Aktif: <strong>{choosePrice}</strong>
          </div>
        </div>

        {/* Customer & Doctor Input */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 flex gap-3 min-w-[300px]">
            <div className="flex-1 relative" ref={customerDropdownRef}>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                Pelanggan / Pasien
              </label>
              <input
                type="text"
                value={customer}
                onChange={(e) => {
                  setCustomer(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => {
                  if (customer.trim().length > 0) setShowCustomerDropdown(true);
                }}
                className="w-full p-2 border rounded-xl font-bold bg-white text-slate-800"
              />
              {showCustomerDropdown && customer.trim().length > 0 && (
                <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 italic">
                      Tidak ditemukan...
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setCustomer(c.name);
                          setShowCustomerDropdown(false);
                        }}
                        className="p-2.5 hover:bg-sky-50 cursor-pointer transition-colors"
                      >
                        <div className="font-bold text-slate-800 flex items-center justify-between">
                          <span>{c.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {c.id}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {posJalur === 'MITRA' 
                            ? (c as Mitra).address 
                            : `${(c as Patient).category} · ${(c as Patient).phone || 'No Phone'}`}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                Dokter Peresep
              </label>
              <select
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                className="w-full p-2 border rounded-xl font-bold bg-white text-slate-800"
              >
                <option value="Internal">Internal Apotek / OTC</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tombol + Biaya Cek Lab (Hanya ditampilkan jika ada pemeriksaan Lab yang belum pernah dibayar di POS Kasir) */}
            {matchingCustomerLabRecords.length > 0 && (
              <div className="shrink-0 flex items-end">
                <button
                  type="button"
                  onClick={handleAddLabFeeToCart}
                  className={`h-[38px] px-3.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                    isLabFeeAlreadyInCart
                      ? 'bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-200 cursor-pointer'
                      : 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer ring-2 ring-purple-300'
                  }`}
                  title={`Tambahkan biaya cek lab ${matchingCustomerLabRecords[0].patientName} (Rp ${(
                    matchingCustomerLabRecords[0].cost || 50000
                  ).toLocaleString('id-ID')})`}
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>+ Biaya Cek Lab</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-purple-800 text-white font-black">
                    {matchingCustomerLabRecords.length}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Grand Total Display */}
          <div className="text-right pl-6 border-l border-slate-200">
            <span className="text-xs font-bold text-slate-400 block">
              {cart.length} Jenis / {totalItemsCount} Item
            </span>
            <div className="text-3xl font-black font-mono text-slate-900 tracking-tight">
              Rp {grandTotal.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        {/* Notifikasi Cek Lab Pasien jika ada */}
        {matchingCustomerLabRecords.length > 0 && (
          <div className="p-2.5 bg-gradient-to-r from-purple-50 via-purple-50/70 to-indigo-50 border border-purple-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <FlaskConical className="w-4 h-4" />
              </span>
              <div>
                <span className="font-extrabold text-purple-950">
                  Tersedia Hasil Cek Lab Pasien ({matchingCustomerLabRecords[0].patientName}):
                </span>
                <span className="text-slate-600 ml-1.5 text-[11px]">
                  {matchingCustomerLabRecords[0].items.map((i) => i.parameter).filter(Boolean).slice(0, 3).join(', ')}
                  {' · '}
                  <strong className="text-purple-700 font-mono">
                    Rp {(matchingCustomerLabRecords[0].cost || 50000).toLocaleString('id-ID')}
                  </strong>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddLabFeeToCart}
              className={`px-3 py-1 rounded-lg font-extrabold text-[11px] transition shadow-xs flex items-center gap-1 cursor-pointer ${
                isLabFeeAlreadyInCart
                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isLabFeeAlreadyInCart ? 'Sudah di Keranjang' : '+ Masukkan ke Keranjang Kasir'}</span>
            </button>
          </div>
        )}

        {/* Assigned Staff (Data Pegawai) for Rekap Fee when posJalur === 'KLINIK' */}
        {posJalur === 'KLINIK' && (
          <div className="p-3 bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/80 rounded-xl border border-indigo-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Users className="w-4 h-4 text-indigo-700" />
                <span className="font-extrabold text-slate-800 text-xs">
                  Petugas Bertugas / Tim Layanan Medis:
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  {assignedStaff.length} Petugas Dipilih
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Total Fee Rekap: Rp {assignedStaff.reduce((a, s) => a + s.fee, 0).toLocaleString('id-ID')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowStaffSelector(!showStaffSelector)}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{showStaffSelector ? 'Tutup Pilihan Pegawai' : '+ Kelola / Tambah Petugas'}</span>
              </button>
            </div>

            {/* Badges of selected staff */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {assignedStaff.length === 0 ? (
                <span className="text-xs text-slate-400 italic">
                  Belum ada petugas terpilih (klik '+ Kelola / Tambah Petugas' untuk memilih dari data pegawai)
                </span>
              ) : (
                assignedStaff.map((st) => (
                  <span
                    key={st.staffId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-300 text-xs shadow-xs text-slate-800 font-semibold"
                  >
                    <span>{st.staffName}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                      {st.role}
                    </span>
                    <span className="text-[10px] font-bold font-mono text-emerald-700">
                      +Rp {st.fee.toLocaleString('id-ID')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAssignedStaff(assignedStaff.filter((s) => s.staffId !== st.staffId))}
                      className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                      title="Hapus petugas dari transaksi ini"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Quick dropdown / selection of staff from staffList */}
            {showStaffSelector && (
              <div className="mt-2 pt-2 border-t border-indigo-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {(staffList.length > 0
                  ? staffList
                  : [
                      { id: 'STF-01', name: 'apt. Mardin, S.Farm', role: 'Super Admin / APJ' },
                      { id: 'STF-02', name: 'dr. Anis Prima Dewi', role: 'Dokter' },
                      { id: 'STF-03', name: 'Ns. Siti Nurhaliza, S.Kep', role: 'Perawat / Bidan' },
                      { id: 'STF-04', name: 'Rina Kartika, A.Md.Farm', role: 'Apoteker' }
                    ]
                ).map((st) => {
                  const isSelected = assignedStaff.some((s) => s.staffId === st.id);
                  const feeRate = getStaffFee(st as Staff);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setAssignedStaff(assignedStaff.filter((s) => s.staffId !== st.id));
                        } else {
                          setAssignedStaff([
                            ...assignedStaff,
                            {
                              staffId: st.id,
                              staffName: st.name,
                              role: st.role,
                              fee: feeRate
                            }
                          ]);
                        }
                      }}
                      className={`text-left p-2 rounded-xl border text-xs transition flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="truncate mr-1">
                        <div className="font-bold truncate text-[11px]">{st.name}</div>
                        <div className={`text-[9px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {st.role}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono font-bold text-[10px] ${
                            isSelected ? 'text-indigo-100' : 'text-emerald-700'
                          }`}
                        >
                          Rp {feeRate.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* List Jasa Pelayanan Klinik & Resep (Sesuai Submenu Pengaturan Tarif & Jasa) */}
        <div
          className={`p-3 rounded-2xl border transition-all ${
            posJalur === 'KLINIK'
              ? 'bg-gradient-to-r from-indigo-50/90 via-white to-sky-50/90 border-indigo-200 shadow-xs'
              : 'bg-slate-100/70 border-dashed border-slate-300'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`p-1.5 rounded-lg ${
                  posJalur === 'KLINIK' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-300 text-slate-600'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                    Daftar Jasa Pelayanan (Tarif Submenu Pengaturan)
                  </span>
                  {posJalur === 'KLINIK' ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-emerald-200">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Aktif: Jalur Pasien Klinik / Resep
                    </span>
                  ) : (
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-300">
                      Hanya dapat dipilih saat Jalur Pasien Klinik / Resep
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  {posJalur === 'KLINIK'
                    ? 'Klik kartu jasa di bawah untuk menambah atau menghapus biaya layanan ke struk kasir.'
                    : 'Pilih jalur "Pasien Klinik / Resep (Jual 2)" untuk mengaktifkan pilihan jasa pelayanan.'}
                </p>
              </div>
            </div>

            {posJalur !== 'KLINIK' && (
              <button
                type="button"
                onClick={() => setPosJalur('KLINIK')}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Aktifkan Jalur Klinik & Resep</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {availableServices.map((srv) => {
              const isSelected = cart.some((c) => c.id === srv.id);
              const isDisabled = posJalur !== 'KLINIK';

              return (
                <button
                  type="button"
                  key={srv.id}
                  disabled={isDisabled}
                  onClick={() => handleToggleService(srv)}
                  title={
                    isDisabled
                      ? 'Aktifkan jalur Pasien Klinik / Resep untuk memilih jasa ini'
                      : isSelected
                      ? `Hapus ${srv.name} dari keranjang`
                      : `Tambah ${srv.name} ke keranjang`
                  }
                  className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                    isDisabled
                      ? 'bg-white/60 border-slate-200 cursor-not-allowed opacity-60'
                      : isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-400 cursor-pointer'
                      : 'bg-white hover:bg-indigo-50/70 border-slate-300 hover:border-indigo-300 cursor-pointer text-slate-800'
                  }`}
                >
                  <div className="w-full">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider block truncate ${
                          isSelected ? 'text-indigo-200' : 'text-slate-400'
                        }`}
                      >
                        {srv.category}
                      </span>
                      {isSelected ? (
                        <span className="w-4 h-4 rounded-full bg-white text-indigo-700 flex items-center justify-center shrink-0 shadow-xs">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                          +
                        </span>
                      )}
                    </div>
                    <div
                      className={`font-black text-xs leading-tight ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {srv.name}
                    </div>
                  </div>

                  <div className="mt-2 pt-1 border-t border-current/15 flex items-center justify-between">
                    <span
                      className={`font-mono font-bold text-xs ${
                        isSelected ? 'text-indigo-100' : 'text-indigo-700'
                      }`}
                    >
                      Rp {srv.price.toLocaleString('id-ID')}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isSelected ? 'Terpilih' : 'Pilih'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Item Input Row */}
      <div className="p-3 border-b border-slate-200 bg-slate-100 grid grid-cols-12 gap-2 items-end text-[11px]">
        {/* PLU / Medicine search */}
        <div className="col-span-4 relative">
          <label className="block font-bold text-slate-600 text-[10px] mb-0.5">
            Pencarian Obat (PLU / Barcode)
          </label>
          <input
            type="text"
            placeholder="Ketik nama atau barcode..."
            value={pluInput}
            onChange={(e) => {
              setPluInput(e.target.value);
              setShowMedDropdown(true);
            }}
            onFocus={() => setShowMedDropdown(true)}
            className="w-full p-2 border rounded-xl bg-white font-bold text-slate-800 outline-none"
          />

          {showMedDropdown && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y">
              {medicines
                .filter(
                  (m) =>
                    m.name.toLowerCase().includes(pluInput.toLowerCase()) ||
                    m.barcode.includes(pluInput)
                )
                .map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleMedSelect(m)}
                    className="p-2 hover:bg-sky-50 cursor-pointer text-xs flex justify-between items-center"
                  >
                    <div>
                      <strong className="text-slate-800 block">{m.name}</strong>
                      <span className="text-[10px] text-slate-500">
                        Stok: {m.stock} {m.unit} · {m.rack}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-sky-700">
                      Rp {resolvePrice(m, choosePrice, m.satuanKecil || m.unit).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Satuan */}
        <div className="col-span-2">
          <label className="block font-bold text-slate-600 text-[10px] mb-0.5">Satuan</label>
          <select
            value={unit}
            onChange={(e) => handleUnitChange(e.target.value)}
            className="w-full p-2 border rounded-xl bg-white font-bold"
          >
            {selectedMed ? (
              <>
                <option value={selectedMed.satuanKecil || selectedMed.unit}>
                  {selectedMed.satuanKecil || selectedMed.unit} (Kecil)
                </option>
                {selectedMed.satuanBesar && (
                  <option value={selectedMed.satuanBesar}>
                    {selectedMed.satuanBesar} (Besar / 1:{selectedMed.rasioKonversi})
                  </option>
                )}
              </>
            ) : (
              <option value="Strip">Strip</option>
            )}
          </select>
        </div>

        {/* Qty */}
        <div className="col-span-1">
          <label className="block font-bold text-slate-600 text-[10px] mb-0.5">Qty</label>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full p-2 border rounded-xl bg-white font-mono font-bold text-center"
          />
        </div>

        {/* Tuslah */}
        <div className="col-span-1">
          <label className="block font-bold text-slate-600 text-[10px] mb-0.5">Tuslah (Rp)</label>
          <input
            type="number"
            value={tuslah}
            onChange={(e) => setTuslah(parseInt(e.target.value) || 0)}
            className="w-full p-2 border rounded-xl bg-white font-mono font-bold text-center"
          />
        </div>

        {/* Harga @ */}
        <div className="col-span-2">
          <label className="block font-bold text-slate-600 text-[10px] mb-0.5">Harga @ (Rp)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
            className="w-full p-2 border rounded-xl bg-white font-mono font-bold text-right text-sky-900"
          />
        </div>

        {/* Subtotal Item & Add button */}
        <div className="col-span-2 flex gap-1.5 items-end">
          <div className="flex-1">
            <label className="block font-bold text-slate-600 text-[10px] mb-0.5">Subtotal</label>
            <input
              type="text"
              readOnly
              value={`Rp ${computedSubtotalInput.toLocaleString('id-ID')}`}
              className="w-full p-2 border rounded-xl bg-slate-200 text-right font-black font-mono text-slate-800"
            />
          </div>
          <button
            onClick={handleAddItem}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cart Items Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-2.5 border-r">Nama Obat / Barang</th>
              <th className="p-2.5 border-r text-center w-16">Qty</th>
              <th className="p-2.5 border-r text-center w-20">Satuan</th>
              <th className="p-2.5 border-r text-right w-24">Tuslah</th>
              <th className="p-2.5 border-r text-right w-28">Harga Satuan</th>
              <th className="p-2.5 border-r text-right w-24">Diskon</th>
              <th className="p-2.5 text-right w-36">Subtotal Netto</th>
              <th className="p-2.5 text-center w-12">#</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {cart.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                  <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  Keranjang belanja kasir masih kosong.
                </td>
              </tr>
            ) : (
              cart.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="p-2.5 border-r font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span>{item.name}</span>
                      {item.id.startsWith('JASA-') && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                          Jasa Layanan
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 border-r text-center font-mono font-bold">{item.qty}</td>
                  <td className="p-2.5 border-r text-center text-[11px] font-semibold">{item.unit}</td>
                  <td className="p-2.5 border-r text-right font-mono">Rp {item.tuslah.toLocaleString('id-ID')}</td>
                  <td className="p-2.5 border-r text-right font-mono">Rp {item.price.toLocaleString('id-ID')}</td>
                  <td className="p-2.5 border-r text-right font-mono text-rose-600">Rp {item.discount.toLocaleString('id-ID')}</td>
                  <td className="p-2.5 text-right font-mono font-black text-sky-800">Rp {item.subtotal.toLocaleString('id-ID')}</td>
                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Controls & Payment Trigger */}
      <div className="border-t border-slate-200 bg-slate-50 grid grid-cols-12 gap-3 p-3 items-center">
        <div className="col-span-8 grid grid-cols-12 gap-2 text-xs">
          <div className="col-span-6">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
              Catatan Transaksi
            </label>
            <input
              type="text"
              placeholder="Keterangan opsional..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-1.5 border rounded-lg bg-white"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
              Diskon (Rp)
            </label>
            <RupiahInput
              value={overallDiscount}
              onChangeValue={setOverallDiscount}
              className="w-full py-1 pr-2 border rounded-lg bg-white font-mono font-bold text-rose-600 outline-none"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
              Service Charge (Rp)
            </label>
            <RupiahInput
              value={serviceCharge}
              onChangeValue={setServiceCharge}
              className="w-full py-1 pr-2 border rounded-lg bg-white font-mono font-bold text-indigo-700 outline-none"
            />
          </div>
        </div>

        <div className="col-span-4 flex justify-end gap-2">
          <button
            onClick={() => {
              setPayAmount(grandTotal);
              setShowPaymentModal(true);
            }}
            disabled={cart.length === 0}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            <span>Bayar & Simpan (Rp {grandTotal.toLocaleString('id-ID')})</span>
          </button>
        </div>
      </div>

      {/* Payment Modal & Receipt Form */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wide">
                Pembayaran Transaksi Kasir
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Metode Pembayaran</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Tunai', 'Kredit / Debit', 'Digital QRIS', 'Tempo / Piutang'].map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setPaymentMethod(m);
                        setSubMethod(m);
                        if (m === 'Tempo / Piutang') {
                          setPayAmount(0);
                        }
                      }}
                      className={`py-2 px-3 rounded-xl font-bold border transition text-center ${
                        paymentMethod === m
                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tagihan Breakdown Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Subtotal Belanja:</span>
                  <span className="font-mono font-bold">Rp {cartSubtotal.toLocaleString('id-ID')}</span>
                </div>

                {overallDiscount > 0 && (
                  <div className="flex justify-between items-center text-rose-600 font-bold">
                    <span>Potongan Diskon:</span>
                    <span className="font-mono">-Rp {overallDiscount.toLocaleString('id-ID')}</span>
                  </div>
                )}

                {serviceCharge > 0 && (
                  <div className="flex justify-between items-center text-indigo-700 font-bold">
                    <span>Service Charge:</span>
                    <span className="font-mono">+Rp {serviceCharge.toLocaleString('id-ID')}</span>
                  </div>
                )}

                {pembulatan > 0 && (
                  <div className="flex justify-between items-center text-amber-800 font-bold">
                    <span>Pembulatan Otomatis (Ribuan Ke Atas):</span>
                    <span className="font-mono">+Rp {pembulatan.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-2 font-black text-slate-900">
                  <span className="font-bold text-slate-700">Total Tagihan Akhir:</span>
                  <span className="font-mono text-sky-900 text-lg">
                    Rp {grandTotal.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Uang Diterima (Rp) *
                    </label>
                    <RupiahInput
                      value={payAmount}
                      onChangeValue={setPayAmount}
                      className="w-full py-2 pr-2 border rounded-xl font-black font-mono text-base bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kembalian (Rp)</label>
                    <input
                      type="text"
                      readOnly
                      value={`Rp ${change.toLocaleString('id-ID')}`}
                      className="w-full p-2 border rounded-xl font-black font-mono text-base bg-slate-200 text-emerald-800"
                    />
                  </div>
                </div>

                {/* Quick Cash Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-bold self-center mr-1">Uang Pas:</span>
                  {[grandTotal, 20000, 50000, 100000, 200000].map((val) => (
                    <button
                      key={val}
                      onClick={() => setPayAmount(val)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[10px] font-mono font-bold hover:bg-sky-50"
                    >
                      Rp {val.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveTransaction}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg uppercase tracking-wider"
                >
                  Selesaikan & Cetak Struk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finished Transaction Receipt Modal & Print Format */}
      {lastFinishedTrx && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center space-y-4 border border-slate-300">
            <div id="printable-section" className="space-y-3 font-mono text-xs text-left">
              <div className="text-center border-b pb-2">
                {pharmacyProfile.logoUrl && (
                  <div className="flex justify-center mb-1.5">
                    <img
                      src={pharmacyProfile.logoUrl}
                      alt="Logo Faskes"
                      className="h-11 w-auto max-w-[110px] object-contain"
                    />
                  </div>
                )}
                <h3 className="font-extrabold text-sm uppercase">{pharmacyProfile.name}</h3>
                <p className="text-[10px] text-slate-500">{formatPharmacyAddress(pharmacyProfile)}</p>
                <p className="text-[10px] text-slate-500">Telp / WA: {pharmacyProfile.phone}</p>
                <p className="text-[9px] text-slate-400">SIA: {pharmacyProfile.sia} · APJ: {apjProfile.name}</p>
                <div className="mt-1 text-[10px] border-t border-dashed pt-1">
                  <div>No: {lastFinishedTrx.id}</div>
                  <div>Tgl: {lastFinishedTrx.date}</div>
                  <div>Kasir: {lastFinishedTrx.kasir}</div>
                  <div>
                    Pelanggan:{' '}
                    {!lastFinishedTrx.customerName || lastFinishedTrx.customerName === 'Pelanggan Umum'
                      ? 'Reguler'
                      : lastFinishedTrx.customerName}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 border-b border-dashed pb-2">
                {lastFinishedTrx.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <div>
                      <div>{it.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {it.qty} {it.unit} x Rp {it.price.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="font-bold">Rp {it.subtotal.toLocaleString('id-ID')}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right border-b border-dashed pb-2 font-bold">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rp {lastFinishedTrx.subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Diskon:</span>
                  <span>-Rp {lastFinishedTrx.discount.toLocaleString('id-ID')}</span>
                </div>
                {Boolean(lastFinishedTrx.serviceCharge) && lastFinishedTrx.serviceCharge! > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge:</span>
                    <span>+Rp {lastFinishedTrx.serviceCharge!.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {Boolean(lastFinishedTrx.pembulatan) && lastFinishedTrx.pembulatan! > 0 && (
                  <div className="flex justify-between">
                    <span>Pembulatan:</span>
                    <span>+Rp {lastFinishedTrx.pembulatan!.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>TOTAL:</span>
                  <span>Rp {lastFinishedTrx.total.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Bayar:</span>
                  <span>Rp {lastFinishedTrx.payAmount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>Kembali:</span>
                  <span>Rp {lastFinishedTrx.change.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-1">
                Terima kasih atas kunjungan Anda.<br />
                Semoga lekas sembuh!
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t no-print">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk</span>
              </button>
              <button
                type="button"
                onClick={() => setLastFinishedTrx(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 font-bold rounded-xl text-xs text-slate-800 cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: BUKA KASIR (MULAI SHIFT & MODAL AWAL / CASH FLOAT) */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">
                    Buka Kasir &amp; Mulai Shift Baru
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Masukkan modal awal laci kasir (Cash Float)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOpenShiftModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOpenShift} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Petugas Kasir Bertugas (Data Pegawai) *
                </label>
                {staffList.length > 0 ? (
                  <select
                    value={selectedShiftCashier}
                    onChange={(e) => setSelectedShiftCashier(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {!staffList.some((s) => s.name === selectedShiftCashier) && (
                      <option value={selectedShiftCashier}>{selectedShiftCashier}</option>
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
                    value={selectedShiftCashier}
                    onChange={(e) => setSelectedShiftCashier(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold bg-slate-100 text-slate-700"
                  />
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Sesi / Jadwal Shift *
                </label>
                <select
                  value={openShiftName}
                  onChange={(e) => setOpenShiftName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Shift Pagi (07:00 - 14:00)">Shift Pagi (07:00 - 14:00)</option>
                  <option value="Shift Siang (14:00 - 21:00)">Shift Siang (14:00 - 21:00)</option>
                  <option value="Shift Malam (21:00 - 07:00)">Shift Malam (21:00 - 07:00)</option>
                  <option value="Shift Reguler / Full Day">Shift Reguler / Full Day</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Modal Awal Laci Kasir (Cash Float) (Rp) *
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={openingFloatInput}
                  onChange={(e) => setOpeningFloatInput(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-black font-mono text-base bg-white text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[0, 100000, 200000, 300000, 500000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOpeningFloatInput(preset)}
                      className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[10px] border transition cursor-pointer ${
                        openingFloatInput === preset
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Rp {preset.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Pembukaan Laci Kasir
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Uang kembalian pecahan lengkap..."
                  value={openingNotesInput}
                  onChange={(e) => setOpeningNotesInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpenShiftModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Buka Laci Kasir &amp; Mulai Shift</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FORMULIR TUTUP KASIR & RINCIAN NOMINAL UANG FISIK (DENOMINASI) */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-400/30">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">
                    Formulir Tutup Kasir &amp; Audit Fisik Uang Laci (Denominasi)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Hitung jumlah lembar fisik uang Rupiah di laci dari pecahan Rp 1.000 hingga Rp 100.000
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseShiftModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleConfirmCloseShift}
              className="p-6 overflow-y-auto space-y-5 text-xs flex-1"
            >
              {/* Info Sesi Shift */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Petugas Kasir
                  </span>
                  <strong className="text-slate-900 text-xs">
                    {activeShift?.cashierName || currentCashierName}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Sesi Shift
                  </span>
                  <strong className="text-slate-900 text-xs">
                    {activeShift?.shiftName || openShiftName}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Modal Awal (Cash Float)
                  </span>
                  <strong className="font-mono text-sky-700 text-xs">
                    Rp {shiftSalesSummary.openingFloat.toLocaleString('id-ID')}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Total Omset Sistem (Tunai)
                  </span>
                  <strong className="font-mono text-emerald-700 text-xs">
                    Rp {shiftSalesSummary.cashSales.toLocaleString('id-ID')}
                  </strong>
                </div>
              </div>

              {/* Tabel Rincian Denominasi Uang Fisik */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    <span className="font-extrabold text-xs uppercase tracking-wide">
                      Tabel Rincian Nominal Uang Fisik (Denominasi Rupiah)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDenominationSheets({
                        1000: 0,
                        2000: 0,
                        5000: 0,
                        10000: 0,
                        20000: 0,
                        50000: 0,
                        100000: 0
                      })
                    }
                    className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer"
                  >
                    Reset Lembar ke 0
                  </button>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px]">
                    <tr>
                      <th className="p-3 border-r border-slate-200">Kolom Nominal Uang (Pecahan)</th>
                      <th className="p-3 border-r border-slate-200 text-center w-44">
                        Kolom Lembar / Keping
                      </th>
                      <th className="p-3 text-right w-52">
                        Kolom Baris Total (Nominal x Lembar)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {denominationRows.map((row) => (
                      <tr key={row.nominal} className="hover:bg-sky-50/40 transition">
                        <td className="p-3 border-r border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <span className="w-20 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-mono font-black text-emerald-900 text-center">
                              {row.label}
                            </span>
                            <span className="text-slate-600 font-bold">
                              Pecahan {row.label}
                            </span>
                          </div>
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setDenominationSheets((prev) => ({
                                  ...prev,
                                  [row.nominal]: Math.max(0, (prev[row.nominal] || 0) - 1)
                                }))
                              }
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 font-black text-slate-700 cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={row.sheets}
                              onChange={(e) =>
                                setDenominationSheets((prev) => ({
                                  ...prev,
                                  [row.nominal]: Math.max(0, parseInt(e.target.value) || 0)
                                }))
                              }
                              className="w-20 p-1.5 border border-slate-300 rounded-xl font-mono font-black text-center text-sm bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setDenominationSheets((prev) => ({
                                  ...prev,
                                  [row.nominal]: (prev[row.nominal] || 0) + 1
                                }))
                              }
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 font-black text-slate-700 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-sm text-slate-900 bg-slate-50/60">
                          Rp {row.subtotal.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Baris Ringkasan: Total Kas Fisik di Laci, Total Omset Sistem (Tunai), & Kolom Keterangan Selisih */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-sky-800 uppercase block">
                    1. Total Kas Fisik di Laci
                  </span>
                  <div className="text-xl font-black font-mono text-sky-950">
                    Rp {totalPhysicalCash.toLocaleString('id-ID')}
                  </div>
                  <p className="text-[10px] text-sky-700">
                    Total dari {denominationRows.reduce((a, b) => a + b.sheets, 0)} lembar uang fisik
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-700 uppercase block">
                    2. Total Omset Sistem (Tunai) &amp; Modal
                  </span>
                  <div className="text-xl font-black font-mono text-slate-900">
                    Rp {shiftSalesSummary.expectedCashInDrawer.toLocaleString('id-ID')}
                  </div>
                  <p className="text-[10px] text-slate-600 font-mono">
                    Omset Tunai: Rp {shiftSalesSummary.cashSales.toLocaleString('id-ID')} + Modal: Rp{' '}
                    {shiftSalesSummary.openingFloat.toLocaleString('id-ID')}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border-2 space-y-1 ${
                    cashDifference === 0
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                      : cashDifference > 0
                      ? 'bg-amber-50 border-amber-400 text-amber-950'
                      : 'bg-rose-50 border-rose-400 text-rose-950'
                  }`}
                >
                  <span className="text-[10px] font-extrabold uppercase block">
                    3. Kolom Keterangan Selisih
                  </span>
                  <div className="text-xl font-black font-mono">
                    {cashDifference === 0
                      ? 'Rp 0 (SESUAI)'
                      : `${cashDifference > 0 ? '+' : '-'}Rp ${Math.abs(cashDifference).toLocaleString('id-ID')}`}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        cashDifference === 0
                          ? 'bg-emerald-600 text-white'
                          : cashDifference > 0
                          ? 'bg-amber-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {cashDifference === 0
                        ? 'BALANCE / SESUAI'
                        : cashDifference > 0
                        ? 'SELISIH LEBIH (SURPLUS)'
                        : 'SELISIH KURANG (DEFISIT)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning jika ada selisih -> Wajib Approval Super Admin */}
              {cashDifference !== 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-extrabold text-xs block uppercase">
                      Peringatan Selisih Kas ({cashDifferenceStatus}:{' '}
                      {cashDifference > 0 ? '+' : '-'}Rp {Math.abs(cashDifference).toLocaleString('id-ID')}) — Wajib Approval Super Admin / APJ
                    </strong>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Terdapat selisih antara kas fisik di laci dengan pencatatan sistem. Saat tombol konfirmasi diklik, status shift akan otomatis berubah menjadi{' '}
                      <strong className="underline">"Menunggu Approval Tutup Kasir"</strong> dan sistem akan mengirimkan notifikasi peringatan real-time ke akun{' '}
                      <strong>Super Admin / APJ</strong> untuk ditinjau (Approve / Reject).
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Tutup Kasir / Penjelasan Selisih {cashDifference !== 0 ? '*' : '(Opsional)'}
                </label>
                <input
                  type="text"
                  required={cashDifference !== 0}
                  placeholder={
                    cashDifference !== 0
                      ? 'Wajib isi alasan/keterangan selisih kas untuk ditinjau Super Admin...'
                      : 'Catatan penutupan shift kasir...'
                  }
                  value={closingNotesInput}
                  onChange={(e) => setClosingNotesInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 text-white font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition ${
                    cashDifference === 0
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {cashDifference === 0
                      ? 'Simpan & Tutup Kasir (Sesuai)'
                      : 'Ajukan Tutup Kasir (Kirim ke Super Admin / APJ)'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RIWAYAT SHIFT KASIR & PANEL APPROVAL SUPER ADMIN */}
      {showShiftHistoryModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">
                    Riwayat Sesi Buka-Tutup Kasir &amp; Persetujuan Selisih (Approval Super Admin)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Log audit fisik lembaran uang Rupiah dan status verifikasi Super Admin / APJ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftHistoryModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {cashierShifts.length === 0 ? (
                <div className="p-10 text-center text-slate-400 italic border border-dashed border-slate-200 rounded-2xl">
                  Belum ada riwayat sesi buka-tutup kasir yang tercatat.
                </div>
              ) : (
                cashierShifts.map((sh) => (
                  <div
                    key={sh.id}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      sh.status === 'Menunggu Approval Tutup Kasir'
                        ? 'bg-amber-50/70 border-amber-300'
                        : sh.status === 'Ditolak (Hitung Ulang)'
                        ? 'bg-rose-50/60 border-rose-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                          {sh.id}
                        </span>
                        <span className="font-extrabold text-slate-900">{sh.shiftName}</span>
                        <span className="text-slate-500">· Petugas: <strong>{sh.cashierName}</strong></span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] uppercase ${
                          sh.status === 'Menunggu Approval Tutup Kasir'
                            ? 'bg-amber-500 text-slate-950'
                            : sh.status === 'Ditutup (Sesuai)' || sh.status === 'Ditutup (Approved Super Admin)'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : sh.status === 'Ditolak (Hitung Ulang)'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-sky-100 text-sky-800 border border-sky-300'
                        }`}
                      >
                        {sh.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Waktu Buka / Tutup</span>
                        <strong className="font-mono text-[11px]">
                          {sh.openDate} {sh.openTime} {sh.closeTime ? `— ${sh.closeTime}` : '(Masih Buka)'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Modal Awal</span>
                        <strong className="font-mono text-slate-800">
                          Rp {sh.openingFloat.toLocaleString('id-ID')}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Omset Tunai Sistem</span>
                        <strong className="font-mono text-emerald-700">
                          Rp {sh.systemCashSales.toLocaleString('id-ID')}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Total Kas Fisik Laci</span>
                        <strong className="font-mono text-sky-800">
                          Rp {sh.physicalCashInDrawer.toLocaleString('id-ID')}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Keterangan Selisih</span>
                        <strong
                          className={`font-mono ${
                            sh.difference === 0
                              ? 'text-emerald-700'
                              : sh.difference > 0
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {sh.difference === 0
                            ? 'Rp 0 (Sesuai)'
                            : `${sh.difference > 0 ? '+' : '-'}Rp ${Math.abs(sh.difference).toLocaleString('id-ID')} (${sh.differenceStatus})`}
                        </strong>
                      </div>
                    </div>

                    {/* Rincian Denominasi */}
                    {sh.denominations && sh.denominations.some((d) => d.sheets > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {sh.denominations.map((d) => (
                          <span
                            key={d.nominal}
                            className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-700"
                          >
                            {d.label} x {d.sheets} = <strong>Rp {d.subtotal.toLocaleString('id-ID')}</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {sh.approvedBy && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        Diverifikasi oleh <strong>{sh.approvedBy}</strong> pada {sh.approvalTime} · Catatan:{' '}
                        <em>{sh.approvalNotes || '-'}</em>
                      </div>
                    )}

                    {/* Tombol Approve / Reject untuk Super Admin jika status Menunggu Approval */}
                    {sh.status === 'Menunggu Approval Tutup Kasir' && isSuperAdmin && (
                      <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="Catatan persetujuan / penolakan Super Admin..."
                          value={approvalNotesInput[sh.id] || ''}
                          onChange={(e) =>
                            setApprovalNotesInput({
                              ...approvalNotesInput,
                              [sh.id]: e.target.value
                            })
                          }
                          className="flex-1 min-w-[220px] p-2 rounded-xl border border-amber-300 bg-white text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onApproveRejectShift?.(
                                sh.id,
                                'APPROVE',
                                approvalNotesInput[sh.id] || 'Disetujui Super Admin / APJ'
                              )
                            }
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve Tutup Kasir</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onApproveRejectShift?.(
                                sh.id,
                                'REJECT',
                                approvalNotesInput[sh.id] || 'Ditolak — hitung ulang fisik uang di laci'
                              )
                            }
                            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-4 h-4" />
                            <span>Reject Tutup Kasir</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-between items-center shrink-0">
              {cashierShifts.length > 0 && onClearShiftHistory ? (
                <button
                  type="button"
                  onClick={() => {
                    onClearShiftHistory();
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Riwayat Shift</span>
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setShowShiftHistoryModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
