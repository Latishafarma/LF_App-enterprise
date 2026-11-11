import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Calendar,
  Plus,
  Printer,
  Ban,
  RotateCcw,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Trash2,
  X,
  Building,
  User,
  Phone,
  MapPin,
  CalendarDays,
  ExternalLink
} from 'lucide-react';
import { Transaction, Medicine, StockMutation, CartItem, Branch, Mitra } from '../types';
import { getSavedPharmacyProfile, getSavedAPJProfile } from './PharmacySettingsModal';
import { openPrintWindow } from '../utils/printHelper';

interface SalesHistoryViewProps {
  transactions: Transaction[];
  onUpdateTransaction: (updated: Transaction) => void;
  onAddTransaction: (trx: Transaction, mutations: StockMutation[]) => void;
  medicines: Medicine[];
  onRestockFromCancelOrReturn: (items: CartItem[], reason: string, refNo: string, type: 'Batal' | 'Retur') => void;
  currentBranch: Branch;
  userName: string;
  mitraList?: Mitra[];
  activeRole?: string;
  onDeleteTransactions?: (ids: string[]) => void;
}

// Terbilang helper in Indonesian
function terbilangRupiah(n: number): string {
  const rounded = Math.round(Math.abs(n));
  if (rounded === 0) return 'Nol Rupiah';
  
  const bil = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  function convert(x: number): string {
    if (x < 12) return bil[x];
    if (x < 20) return convert(x - 10) + ' Belas';
    if (x < 100) return convert(Math.floor(x / 10)) + ' Puluh ' + convert(x % 10);
    if (x < 200) return 'Seratus ' + convert(x - 100);
    if (x < 1000) return convert(Math.floor(x / 100)) + ' Ratus ' + convert(x % 100);
    if (x < 2000) return 'Seribu ' + convert(x - 1000);
    if (x < 1000000) return convert(Math.floor(x / 1000)) + ' Ribu ' + convert(x % 1000);
    if (x < 1000000000) return convert(Math.floor(x / 1000000)) + ' Juta ' + convert(x % 1000000);
    return convert(Math.floor(x / 1000000000)) + ' Milyar ' + convert(x % 1000000000);
  }

  return convert(rounded).trim().replace(/\s+/g, ' ') + ' Rupiah';
}

interface NewInvoiceItem {
  medicineId: string;
  name: string;
  kekuatan: string;
  batchNo: string;
  expDate: string;
  unit: string;
  unitOptions: string[];
  availableStock: number;
  qty: number;
  price: number;
  discount: number;
  discountType: 'percent' | 'nominal';
  subtotal: number;
  hpp: number;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  transactions,
  onUpdateTransaction,
  onAddTransaction,
  medicines,
  onRestockFromCancelOrReturn,
  currentBranch,
  userName,
  mitraList = [],
  activeRole = 'Super Admin / APJ',
  onDeleteTransactions
}) => {
  const isSuperAdmin = activeRole === 'Super Admin / APJ';
  const [selectedTrxIds, setSelectedTrxIds] = useState<string[]>([]);
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  // Helper to format Date object to local YYYY-MM-DD
  const toLocalYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to normalize any transaction date string (ISO YYYY-MM-DD or Indonesian DD/MM/YYYY) into YYYY-MM-DD
  const normalizeDateToYMD = (rawDate?: string): string => {
    if (!rawDate) return '';
    const trimmed = rawDate.trim();
    // 1. Check YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    // 2. Check DD/MM/YYYY or DD-MM-YYYY (e.g. from toLocaleString('id-ID') -> "11/11/2026, 00.19.32")
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // 3. Fallback Date parse
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return toLocalYMD(parsed);
    }
    return trimmed.split(' ')[0].split('T')[0];
  };

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'today' | '7days' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState(() => toLocalYMD(new Date()));
  const [endDate, setEndDate] = useState(() => toLocalYMD(new Date()));
  const [statusFilter, setStatusFilter] = useState<'all' | 'Selesai' | 'Dibatalkan' | 'Diretur'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'POS' | 'FAKTUR'>('all');

  const handleSelectDatePreset = (preset: 'all' | 'today' | '7days' | 'month' | 'custom') => {
    setDateFilterPreset(preset);
    const now = new Date();
    const todayStr = toLocalYMD(now);
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6); // 7 days inclusive of today
      setStartDate(toLocalYMD(d7));
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toLocalYMD(firstDay));
      setEndDate(todayStr);
    } else if (preset === 'custom') {
      if (!startDate) setStartDate(todayStr);
      if (!endDate) setEndDate(todayStr);
    }
  };

  // Modals
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [selectedTrxForPrint, setSelectedTrxForPrint] = useState<Transaction | null>(null);
  const [printDocType, setPrintDocType] = useState<'faktur' | 'kwitansi'>('faktur');
  const [trxToCancel, setTrxToCancel] = useState<Transaction | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [trxToReturn, setTrxToReturn] = useState<Transaction | null>(null);
  const [returnReason, setReturnReason] = useState('Barang Rusak / Cacat Kemasan');
  const [returnNotes, setReturnNotes] = useState('');

  // Helper to calculate dueDate automatically based on invoice date and payment term
  const calculateDueDateFromTerm = (baseDateStr: string, termStr: string): string => {
    const base = baseDateStr ? new Date(`${baseDateStr}T00:00:00`) : new Date();
    const d = isNaN(base.getTime()) ? new Date() : new Date(base);
    const matchDays = termStr.match(/(\d+)/);
    const days = matchDays ? parseInt(matchDays[1], 10) : 0;
    d.setDate(d.getDate() + days);
    return toLocalYMD(d);
  };

  // New Invoice State
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNo: `FPJ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-4)}`,
    date: toLocalYMD(new Date()),
    dueDate: calculateDueDateFromTerm(toLocalYMD(new Date()), 'Cash / COD'),
    term: 'Cash / COD',
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerLicense: '',
    paymentMethod: 'Transfer Bank',
    usePpn: false,
    description: ''
  });

  const [invoiceItems, setInvoiceItems] = useState<NewInvoiceItem[]>([]);
  const [selectedMedId, setSelectedMedId] = useState('');

  // Autocomplete states for Pilih Mitra & Pilih Obat dari Inventori
  const [mitraSearchQuery, setMitraSearchQuery] = useState('');
  const [showMitraDropdown, setShowMitraDropdown] = useState(false);
  const mitraDropdownRef = useRef<HTMLDivElement>(null);

  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const medDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mitraDropdownRef.current && !mitraDropdownRef.current.contains(e.target as Node)) {
        setShowMitraDropdown(false);
      }
      if (medDropdownRef.current && !medDropdownRef.current.contains(e.target as Node)) {
        setShowMedDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMitraOptions = useMemo(() => {
    const q = mitraSearchQuery.trim().toLowerCase();
    if (!q) return mitraList;
    return mitraList.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q) ||
        (m.address || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.licenseNo || '').toLowerCase().includes(q)
    );
  }, [mitraList, mitraSearchQuery]);

  const filteredMedicineOptions = useMemo(() => {
    const q = medSearchQuery.trim().toLowerCase();
    if (!q) return medicines;
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.kekuatan || '').toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.batchNo || '').toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q)
    );
  }, [medicines, medSearchQuery]);

  // Filter Transactions logic
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const today = toLocalYMD(now);
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    const d7Str = toLocalYMD(d7);
    const curMonth = today.slice(0, 7);

    return transactions.filter((t) => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesId = t.id.toLowerCase().includes(q);
        const matchesCustomer = (t.customerName || '').toLowerCase().includes(q);
        const matchesKasir = (t.kasir || '').toLowerCase().includes(q);
        const matchesItem = t.items.some((item) => item.name.toLowerCase().includes(q));
        if (!matchesId && !matchesCustomer && !matchesKasir && !matchesItem) {
          return false;
        }
      }

      // Status
      const trxStatus = t.status || 'Selesai';
      if (statusFilter !== 'all' && trxStatus !== statusFilter) {
        return false;
      }

      // Type
      if (typeFilter === 'POS' && t.type === 'FAKTUR_PENJUALAN') return false;
      if (typeFilter === 'FAKTUR' && t.type !== 'FAKTUR_PENJUALAN') return false;

      // Date filtering (normalized to YYYY-MM-DD)
      const trxDate = normalizeDateToYMD(t.date);

      if (dateFilterPreset === 'today') {
        if (trxDate !== today) return false;
      } else if (dateFilterPreset === '7days') {
        if (!trxDate || trxDate < d7Str || trxDate > today) return false;
      } else if (dateFilterPreset === 'month') {
        if (!trxDate.startsWith(curMonth)) return false;
      } else if (dateFilterPreset === 'custom') {
        if (startDate && trxDate < startDate) return false;
        if (endDate && trxDate > endDate) return false;
      }

      return true;
    });
  }, [transactions, searchTerm, statusFilter, typeFilter, dateFilterPreset, startDate, endDate]);

  // KPI Calculations
  const stats = useMemo(() => {
    let totalOmzet = 0;
    let countSelesai = 0;
    let countBatal = 0;
    let countRetur = 0;
    let countFaktur = 0;

    filteredTransactions.forEach((t) => {
      const st = t.status || 'Selesai';
      if (st === 'Selesai') {
        totalOmzet += t.total;
        countSelesai++;
        if (t.type === 'FAKTUR_PENJUALAN') countFaktur++;
      } else if (st === 'Dibatalkan') {
        countBatal++;
      } else if (st === 'Diretur') {
        countRetur++;
      }
    });

    return { totalOmzet, countSelesai, countBatal, countRetur, countFaktur };
  }, [filteredTransactions]);

  // Selection & Bulk Delete Logic (Super Admin / APJ only)
  const allFilteredIds = useMemo(() => filteredTransactions.map((t) => t.id), [filteredTransactions]);
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedTrxIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTrxIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      const combined = new Set([...selectedTrxIds, ...allFilteredIds]);
      setSelectedTrxIds(Array.from(combined));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedTrxIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleConfirmDeleteSelected = () => {
    if (selectedTrxIds.length === 0) return;
    if (onDeleteTransactions) {
      onDeleteTransactions(selectedTrxIds);
    }
    setSelectedTrxIds([]);
    setConfirmDeleteModalOpen(false);
  };

  // Helper to get unit options from master Medicine record (Satuan Besar first, then Satuan Kecil)
  const getMedicineUnitOptions = (med?: Medicine, fallbackUnit?: string): string[] => {
    if (!med) return fallbackUnit ? [fallbackUnit] : ['Pcs'];
    const rawUnits = [med.satuanBesar, med.satuanKecil, med.unit]
      .map((u) => (u || '').trim())
      .filter(Boolean);
    const unique: string[] = [];
    for (const u of rawUnits) {
      if (!unique.some((existing) => existing.toLowerCase() === u.toLowerCase())) {
        unique.push(u);
      }
    }
    return unique.length > 0 ? unique : [fallbackUnit || 'Pcs'];
  };

  // Helper to compute row discount in Rupiah from percent or nominal
  const computeItemDiscountNominal = (price: number, qty: number, discount: number, discountType: 'percent' | 'nominal'): number => {
    const gross = Math.max(0, price * qty);
    if (discountType === 'nominal') {
      return Math.max(0, Math.min(gross, discount));
    }
    const pct = Math.max(0, Math.min(100, discount));
    return Math.round((gross * pct) / 100);
  };

  // Handle Add Item to New Invoice
  const addMedicineObjectToInvoice = (med: Medicine) => {
    if (invoiceItems.some((it) => it.medicineId === med.id)) {
      alert(`Obat "${med.name}" sudah ada di tabel faktur! Ubah jumlah Qty pada baris terkait.`);
      return;
    }

    const unitOptions = getMedicineUnitOptions(med);
    const defaultUnit = (med.satuanBesar || unitOptions[0] || med.satuanKecil || med.unit || 'Pcs').trim();
    const isBesar =
      med.satuanBesar &&
      defaultUnit.toLowerCase() === med.satuanBesar.trim().toLowerCase() &&
      (!med.satuanKecil || med.satuanBesar.trim().toLowerCase() !== med.satuanKecil.trim().toLowerCase());
    const ratio = Math.max(1, med.rasioKonversi || 1);
    const basePriceKecil = med.sellPriceMitra || med.sellPrice || 0;
    const price = isBesar ? basePriceKecil * ratio : basePriceKecil;
    const baseHppKecil = med.hpp || Math.round(basePriceKecil * 0.8);
    const hpp = isBesar ? baseHppKecil * ratio : baseHppKecil;

    const newItem: NewInvoiceItem = {
      medicineId: med.id,
      name: med.name,
      kekuatan: med.kekuatan || '-',
      batchNo: med.batchNo || 'BATCH-' + Date.now().toString().slice(-4),
      expDate: med.expDate || '2027-12-31',
      unit: defaultUnit,
      unitOptions,
      availableStock: med.stock,
      qty: 1,
      price,
      discount: 0,
      discountType: 'percent',
      subtotal: price,
      hpp
    };

    setInvoiceItems((prev) => [...prev, newItem]);
    setSelectedMedId('');
    setMedSearchQuery('');
    setShowMedDropdown(false);
  };

  const handleAddItemToInvoice = () => {
    let med = medicines.find((m) => m.id === selectedMedId);
    if (!med && medSearchQuery.trim()) {
      med = filteredMedicineOptions[0];
    }
    if (!med) return;
    addMedicineObjectToInvoice(med);
  };

  const handleUpdateItemUnit = (idx: number, newUnit: string) => {
    setInvoiceItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const med = medicines.find((m) => m.id === item.medicineId);
        let newPrice = item.price;
        let newHpp = item.hpp;
        if (med) {
          const isBesar =
            med.satuanBesar &&
            newUnit.trim().toLowerCase() === med.satuanBesar.trim().toLowerCase() &&
            (!med.satuanKecil || med.satuanBesar.trim().toLowerCase() !== med.satuanKecil.trim().toLowerCase());
          const ratio = Math.max(1, med.rasioKonversi || 1);
          const basePriceKecil = med.sellPriceMitra || med.sellPrice || 0;
          newPrice = isBesar ? basePriceKecil * ratio : basePriceKecil;
          const baseHppKecil = med.hpp || Math.round(basePriceKecil * 0.8);
          newHpp = isBesar ? baseHppKecil * ratio : baseHppKecil;
        }
        const discVal = computeItemDiscountNominal(newPrice, item.qty, item.discount, item.discountType);
        return {
          ...item,
          unit: newUnit,
          price: newPrice,
          hpp: newHpp,
          subtotal: Math.max(0, newPrice * item.qty - discVal)
        };
      })
    );
  };

  const handleUpdateItemQty = (idx: number, qty: number) => {
    setInvoiceItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const validQty = Math.max(1, Math.min(qty, item.availableStock > 0 ? item.availableStock : 9999));
        const discVal = computeItemDiscountNominal(item.price, validQty, item.discount, item.discountType);
        return {
          ...item,
          qty: validQty,
          subtotal: Math.max(0, item.price * validQty - discVal)
        };
      })
    );
  };

  const handleUpdateItemPrice = (idx: number, price: number) => {
    setInvoiceItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const discVal = computeItemDiscountNominal(price, item.qty, item.discount, item.discountType);
        return {
          ...item,
          price,
          subtotal: Math.max(0, price * item.qty - discVal)
        };
      })
    );
  };

  const handleUpdateItemDiscount = (idx: number, discount: number) => {
    setInvoiceItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const sanitizedDiscount =
          item.discountType === 'percent'
            ? Math.max(0, Math.min(100, discount))
            : Math.max(0, Math.min(item.price * item.qty, discount));
        const discVal = computeItemDiscountNominal(item.price, item.qty, sanitizedDiscount, item.discountType);
        return {
          ...item,
          discount: sanitizedDiscount,
          subtotal: Math.max(0, item.price * item.qty - discVal)
        };
      })
    );
  };

  const handleUpdateItemDiscountType = (idx: number, newType: 'percent' | 'nominal') => {
    setInvoiceItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        return {
          ...item,
          discountType: newType,
          discount: 0,
          subtotal: item.price * item.qty
        };
      })
    );
  };

  const handleRemoveInvoiceItem = (idx: number) => {
    setInvoiceItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Invoice calculations
  const invoiceSubtotalGross = invoiceItems.reduce((acc, it) => acc + it.price * it.qty, 0);
  const invoiceTotalDiscount = invoiceItems.reduce(
    (acc, it) => acc + computeItemDiscountNominal(it.price, it.qty, it.discount, it.discountType),
    0
  );
  const invoiceDpp = invoiceSubtotalGross - invoiceTotalDiscount;
  const invoicePpn = invoiceForm.usePpn ? Math.round(invoiceDpp * 0.11) : 0;
  const invoiceGrandTotal = invoiceDpp + invoicePpn;
  const invoiceTotalHpp = invoiceItems.reduce((acc, it) => acc + it.hpp * it.qty, 0);

  // Submit New Invoice
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (invoiceItems.length === 0) {
      alert('Daftar obat dalam faktur tidak boleh kosong!');
      return;
    }

    // Check stock
    for (const item of invoiceItems) {
      if (item.availableStock < item.qty) {
        alert(`Stok obat "${item.name}" tidak mencukupi (Tersedia: ${item.availableStock}, Diminta: ${item.qty})!`);
        return;
      }
    }

    const resolvedCustomerName = invoiceForm.customerName.trim() || 'Reguler';

    const cartItems: CartItem[] = invoiceItems.map((it) => ({
      id: it.medicineId,
      name: it.name,
      kekuatan: it.kekuatan,
      batchNo: it.batchNo,
      expDate: it.expDate,
      qty: it.qty,
      unit: it.unit,
      tuslah: 0,
      price: it.price,
      discount: it.discount,
      subtotal: it.subtotal,
      hpp: it.hpp
    }));

    const resolvedPaymentMethod = invoiceForm.paymentMethod;

    const newTrx: Transaction = {
      id: invoiceForm.invoiceNo,
      date: invoiceForm.date,
      type: 'FAKTUR_PENJUALAN',
      kasir: userName,
      customerName: resolvedCustomerName,
      customerAddress: invoiceForm.customerAddress,
      customerPhone: invoiceForm.customerPhone,
      dueDate: invoiceForm.dueDate,
      term: invoiceForm.term,
      usePpn: invoiceForm.usePpn,
      dpp: invoiceDpp,
      ppn: invoicePpn,
      status: 'Selesai',
      subtotal: invoiceDpp,
      discount: invoiceTotalDiscount,
      chargeCC: 0,
      total: invoiceGrandTotal,
      payAmount: invoiceGrandTotal,
      change: 0,
      hppTotal: invoiceTotalHpp,
      profit: invoiceGrandTotal - invoicePpn - invoiceTotalHpp,
      paymentMethod: resolvedPaymentMethod,
      description: invoiceForm.description || `Faktur Penjualan B2B/Mitra: ${resolvedCustomerName}`,
      items: cartItems,
      branchId: currentBranch.id
    };

    // Stock mutations
    const mutations: StockMutation[] = invoiceItems.map((it) => ({
      id: `MUT-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      date: invoiceForm.date,
      time: new Date().toLocaleTimeString('id-ID'),
      medicineId: it.medicineId,
      medicineName: it.name,
      refNo: invoiceForm.invoiceNo,
      type: 'PENJUALAN',
      inQty: 0,
      outQty: it.qty,
      balance: Math.max(0, it.availableStock - it.qty),
      ket: `Penjualan Faktur PBF/Mitra: ${resolvedCustomerName}`,
      petugas: userName,
      branchId: currentBranch.id
    }));

    onAddTransaction(newTrx, mutations);
    setShowNewInvoiceModal(false);
    setSelectedTrxForPrint(newTrx); // Offer to print immediately!

    // Reset Form
    const todayStr = toLocalYMD(new Date());
    setInvoiceForm({
      invoiceNo: `FPJ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-4)}`,
      date: todayStr,
      dueDate: calculateDueDateFromTerm(todayStr, 'Cash / COD'),
      term: 'Cash / COD',
      customerName: '',
      customerAddress: '',
      customerPhone: '',
      customerLicense: '',
      paymentMethod: 'Transfer Bank',
      usePpn: false,
      description: ''
    });
    setInvoiceItems([]);
    setMitraSearchQuery('');
    setMedSearchQuery('');
  };

  // Confirm Cancel Transaction
  const handleConfirmCancel = () => {
    if (!trxToCancel) return;
    if (!cancelReason.trim()) {
      alert('Harap isi alasan pembatalan!');
      return;
    }

    const updated: Transaction = {
      ...trxToCancel,
      status: 'Dibatalkan',
      cancelReason
    };

    // Restock items
    onRestockFromCancelOrReturn(trxToCancel.items, cancelReason, trxToCancel.id, 'Batal');
    onUpdateTransaction(updated);

    setTrxToCancel(null);
    setCancelReason('');
  };

  // Confirm Return Transaction
  const handleConfirmReturn = () => {
    if (!trxToReturn) return;
    const finalReason = returnNotes.trim() ? `${returnReason} (${returnNotes.trim()})` : returnReason;

    const updated: Transaction = {
      ...trxToReturn,
      status: 'Diretur',
      returnReason: finalReason,
      returnDate: new Date().toISOString().split('T')[0]
    };

    // Restock items
    onRestockFromCancelOrReturn(trxToReturn.items, finalReason, trxToReturn.id, 'Retur');
    onUpdateTransaction(updated);

    setTrxToReturn(null);
    setReturnReason('Barang Rusak / Cacat Kemasan');
    setReturnNotes('');
  };

  // Execute Print with fallback and bypass iframe sandbox
  const handlePrintDocument = (docMode?: 'faktur-penjualan' | 'kwitansi-penjualan') => {
    if (!selectedTrxForPrint) return;

    const targetMode =
      docMode || (printDocType === 'kwitansi' ? 'kwitansi-penjualan' : 'faktur-penjualan');

    if (docMode === 'kwitansi-penjualan') setPrintDocType('kwitansi');
    if (docMode === 'faktur-penjualan') setPrintDocType('faktur');

    // Save active transaction into localStorage for standalone print tab
    try {
      localStorage.setItem('latisha_active_print_trx', JSON.stringify(selectedTrxForPrint));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }

    openPrintWindow(targetMode, { trxId: selectedTrxForPrint.id, petugas: userName });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              Riwayat & Faktur Penjualan
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring rekapitulasi transaksi kasir POS, penerbitan Faktur Penjualan resmi standar PBF/Apotek, pembatalan, dan retur penjualan.
          </p>
        </div>

        <button
          onClick={() => setShowNewInvoiceModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Faktur Penjualan</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Omzet</p>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black text-slate-800 mt-1">
            Rp {stats.totalOmzet.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{stats.countSelesai} transaksi selesai</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Faktur B2B/Mitra</p>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-lg font-black text-slate-800 mt-1">
            {stats.countFaktur} Faktur
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Penjualan tempo & grosir</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Transaksi Selesai</p>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-slate-800 mt-1">
            {stats.countSelesai}
          </p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Stok terpotong otomatis</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Batal / Retur</p>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-lg font-black text-slate-800 mt-1">
            {stats.countBatal + stats.countRetur}
          </p>
          <p className="text-[10px] text-rose-500 font-medium mt-0.5">{stats.countBatal} Batal, {stats.countRetur} Retur</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Pencarian otomatis: No. Faktur / Transaksi, Nama Pelanggan, Kasir, atau Nama Obat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => handleSelectDatePreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                dateFilterPreset === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Waktu
            </button>
            <button
              type="button"
              onClick={() => handleSelectDatePreset('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                dateFilterPreset === 'today'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handleSelectDatePreset('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                dateFilterPreset === '7days'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => handleSelectDatePreset('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                dateFilterPreset === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => handleSelectDatePreset('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                dateFilterPreset === 'custom'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Rentang Tanggal
            </button>
          </div>
        </div>

        {/* Custom Date Range & Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          {dateFilterPreset !== 'all' && (
            <div className="flex items-center gap-2 bg-indigo-50/70 px-3 py-1.5 rounded-xl border border-indigo-100">
              <span className="text-[11px] font-bold text-indigo-700">Periode Filter:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateFilterPreset('custom');
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-slate-400 text-xs font-bold">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateFilterPreset('custom');
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-bold">Jalur:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-slate-50 focus:outline-none"
            >
              <option value="all">Semua Jenis Transaksi</option>
              <option value="POS">Kasir POS (Reguler/Klinik/Resep)</option>
              <option value="FAKTUR">Faktur Penjualan</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-bold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-slate-50 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="Selesai">Selesai (Aktif)</option>
              <option value="Dibatalkan">Dibatalkan</option>
              <option value="Diretur">Diretur</option>
            </select>
          </div>

          {isSuperAdmin && (
            <button
              type="button"
              disabled={selectedTrxIds.length === 0}
              onClick={() => {
                if (selectedTrxIds.length > 0) {
                  setConfirmDeleteModalOpen(true);
                }
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition ${
                selectedTrxIds.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih {selectedTrxIds.length > 0 ? `(${selectedTrxIds.length})` : ''}</span>
            </button>
          )}

          <span className="ml-auto text-xs text-slate-500 font-medium">
            Menampilkan <strong className="text-slate-800">{filteredTransactions.length}</strong> transaksi
          </span>
        </div>
      </div>

      {/* Main Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                {isSuperAdmin && (
                  <th className="p-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3">No. Transaksi / Faktur</th>
                <th className="p-3">Tanggal & Waktu</th>
                <th className="p-3">Jenis & Jalur</th>
                <th className="p-3">Pelanggan / Faskes</th>
                <th className="p-3">Rincian Obat (Item)</th>
                <th className="p-3 text-right">Total Netto</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Aksi Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} className="p-8 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-bold">Tidak ada riwayat transaksi penjualan yang sesuai filter.</p>
                    <p className="text-[11px] mt-0.5">Ubah kata kunci pencarian atau rentang tanggal di atas.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const status = t.status || 'Selesai';
                  const isFaktur = t.type === 'FAKTUR_PENJUALAN';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      {isSuperAdmin && (
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedTrxIds.includes(t.id)}
                            onChange={() => handleToggleSelectOne(t.id)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          {isFaktur ? (
                            <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          ) : (
                            <Receipt className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          <span>{t.id}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                          Kasir: {t.kasir}
                        </div>
                      </td>

                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        <div className="font-bold text-slate-700">{t.date}</div>
                        {t.dueDate && (
                          <div className="text-[10px] text-amber-600 font-medium">
                            Jatuh tempo: {t.dueDate}
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isFaktur
                              ? 'bg-indigo-100 text-indigo-700'
                              : t.type === 'KLINIK'
                              ? 'bg-sky-100 text-sky-700'
                              : t.type === 'MITRA'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isFaktur ? 'Faktur PBF/B2B' : t.type}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {t.paymentMethod || 'Tunai'}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-800">
                          {!t.customerName || t.customerName === 'Pelanggan Umum' ? 'Reguler' : t.customerName}
                        </div>
                        {t.customerAddress && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {t.customerAddress}
                          </div>
                        )}
                      </td>

                      <td className="p-3 max-w-[220px]">
                        <div className="space-y-0.5">
                          {t.items.slice(0, 2).map((it, idx) => (
                            <div key={idx} className="text-[11px] text-slate-700 truncate">
                              • <span className="font-semibold">{it.name}</span>{' '}
                              <span className="text-slate-400">({it.qty} {it.unit})</span>
                            </div>
                          ))}
                          {t.items.length > 2 && (
                            <div className="text-[10px] text-indigo-600 font-bold">
                              +{t.items.length - 2} item obat lainnya...
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-right">
                        <div className="font-black text-slate-900 text-sm">
                          Rp {t.total.toLocaleString('id-ID')}
                        </div>
                        {t.ppn ? (
                          <div className="text-[9px] text-slate-400">
                            (Termasuk PPN 11% Rp {t.ppn.toLocaleString('id-ID')})
                          </div>
                        ) : null}
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            status === 'Selesai'
                              ? 'bg-emerald-100 text-emerald-700'
                              : status === 'Dibatalkan'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {status === 'Selesai' && <CheckCircle className="w-3 h-3" />}
                          {status === 'Dibatalkan' && <XCircle className="w-3 h-3" />}
                          {status === 'Diretur' && <RotateCcw className="w-3 h-3" />}
                          <span>{status}</span>
                        </span>
                        {t.paymentStatus && t.paymentStatus !== 'Lunas' && (
                          <div className="mt-1">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                t.paymentStatus === 'Sebagian'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-teal-100 text-teal-800 border border-teal-300'
                              }`}
                            >
                              Piutang: {t.paymentStatus}
                            </span>
                            {t.remainingAmount !== undefined && t.remainingAmount > 0 && (
                              <div className="text-[9px] text-teal-700 font-mono font-bold mt-0.5">
                                Sisa: Rp {t.remainingAmount.toLocaleString('id-ID')}
                              </div>
                            )}
                          </div>
                        )}
                        {status === 'Dibatalkan' && t.cancelReason && (
                          <div className="text-[9px] text-rose-600 truncate max-w-[120px] mt-0.5" title={t.cancelReason}>
                            {t.cancelReason}
                          </div>
                        )}
                        {status === 'Diretur' && t.returnReason && (
                          <div className="text-[9px] text-amber-600 truncate max-w-[120px] mt-0.5" title={t.returnReason}>
                            {t.returnReason}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Cetak Faktur Button */}
                          <button
                            onClick={() => setSelectedTrxForPrint(t)}
                            title="Cetak Dokumen Faktur / Struk Resmi"
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Batal Button */}
                          {status === 'Selesai' && (
                            <button
                              onClick={() => setTrxToCancel(t)}
                              title="Batalkan Transaksi & Kembalikan Stok"
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Retur Button */}
                          {status === 'Selesai' && (
                            <button
                              onClick={() => setTrxToReturn(t)}
                              title="Retur Obat & Kembalikan Stok"
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: + Faktur Penjualan (PBF / Mitra) */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-7xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Form Faktur Penjualan</h3>
                  <p className="text-[11px] text-slate-400">Apotek Latisha Farma - Format Dokumen Niaga Farmasi Resmi</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewInvoiceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-6 space-y-6 text-xs max-h-[82vh] overflow-y-auto custom-scrollbar">
              {/* Header Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Faktur Penjualan</label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.invoiceNo}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNo: e.target.value })}
                    className="w-full p-2 border rounded-lg font-mono font-bold bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Faktur</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setInvoiceForm((prev) => ({
                        ...prev,
                        date: newDate,
                        dueDate: calculateDueDateFromTerm(newDate, prev.term)
                      }));
                    }}
                    className="w-full p-2 border rounded-lg font-medium bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Jatuh Tempo <span className="text-[10px] text-indigo-600 font-semibold">(Otomatis sesuai Term)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full p-2 border rounded-lg font-bold text-indigo-950 bg-indigo-50/50 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Syarat Pembayaran (Term)</label>
                  <select
                    value={invoiceForm.term}
                    onChange={(e) => {
                      const newTerm = e.target.value;
                      setInvoiceForm((prev) => ({
                        ...prev,
                        term: newTerm,
                        dueDate: calculateDueDateFromTerm(prev.date, newTerm)
                      }));
                    }}
                    className="w-full p-2 border rounded-lg font-medium bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Cash / COD">Cash / COD (Tunai Saat Terima)</option>
                    <option value="Tempo 7 Hari">Tempo 7 Hari</option>
                    <option value="Tempo 14 Hari">Tempo 14 Hari</option>
                    <option value="Tempo 30 Hari">Tempo 30 Hari</option>
                    <option value="Tempo 60 Hari">Tempo 60 Hari</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={invoiceForm.paymentMethod}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentMethod: e.target.value })}
                    className="w-full p-2 border rounded-lg font-bold bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Cash / Tunai">Cash / Tunai</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={invoiceForm.usePpn}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, usePpn: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Kenakan PPN 11% (Faktur Pajak)</span>
                  </label>
                </div>

                <div className="md:col-span-3 p-2.5 bg-white rounded-xl border border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    Rekening Resmi:
                  </span>
                  <div className="font-mono font-bold text-slate-900 text-xs">
                    SEABANK 9015-5031-5849 a/n Mardin, BRI 7704-0101-3765-531 a/n Mardin
                  </div>
                </div>
              </div>

              {/* Customer / Ordering Party Information */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-black text-slate-800 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                    <Building className="w-4 h-4 text-indigo-500" />
                    Identitas Pelanggan / Fasilitas Kesehatan Pemesan
                  </h4>
                  <div className="relative w-full sm:w-72" ref={mitraDropdownRef}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-bold shrink-0 text-xs">Pilih Mitra:</span>
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                        <input
                          type="text"
                          value={mitraSearchQuery}
                          onChange={(e) => {
                            setMitraSearchQuery(e.target.value);
                            setShowMitraDropdown(true);
                          }}
                          onFocus={() => setShowMitraDropdown(true)}
                          placeholder="Ketik cari nama mitra / klinik..."
                          className="w-full pl-8 pr-6 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        {mitraSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setMitraSearchQuery('');
                              setShowMitraDropdown(true);
                            }}
                            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {showMitraDropdown && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                        {filteredMitraOptions.length === 0 ? (
                          <div className="p-3 text-center text-slate-400 italic text-[11px]">
                            Mitra tidak ditemukan. Silakan ketik manual pada kolom di bawah.
                          </div>
                        ) : (
                          filteredMitraOptions.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => {
                                setInvoiceForm((prev) => ({
                                  ...prev,
                                  customerName: m.name,
                                  customerPhone: m.phone || '',
                                  customerLicense: m.licenseNo || '',
                                  customerAddress: m.address || ''
                                }));
                                setMitraSearchQuery(m.name);
                                setShowMitraDropdown(false);
                              }}
                              className="p-2.5 hover:bg-indigo-50 cursor-pointer transition-colors"
                            >
                              <div className="font-bold text-slate-800 flex items-center justify-between gap-2">
                                <span>{m.name}</span>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold shrink-0">
                                  {m.category || 'Mitra'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                {m.address || '-'} · {m.phone || '-'}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Faskes / Apotek / Pembeli *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Klinik Harapan Sehat / dr. Ahmad"
                      value={invoiceForm.customerName}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })}
                      className="w-full p-2 border rounded-lg font-bold bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">No. Kontak / Telepon</label>
                    <input
                      type="text"
                      placeholder="0812-xxxx-xxxx"
                      value={invoiceForm.customerPhone}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, customerPhone: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">No. Izin Faskes / SIPA (Opsional)</label>
                    <input
                      type="text"
                      placeholder="503/xxx/SIA/2024"
                      value={invoiceForm.customerLicense}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, customerLicense: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alamat Lengkap Pengiriman</label>
                  <input
                    type="text"
                    placeholder="Jl. Merdeka No. 12, Kel. Bone, Kec. Masamba"
                    value={invoiceForm.customerAddress}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customerAddress: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Items Table and Picker */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-black text-slate-800 uppercase text-[11px] tracking-wider">
                    Daftar Obat & Barang Pesanan
                  </h4>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-80" ref={medDropdownRef}>
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={medSearchQuery}
                        onChange={(e) => {
                          setMedSearchQuery(e.target.value);
                          setSelectedMedId('');
                          setShowMedDropdown(true);
                        }}
                        onFocus={() => setShowMedDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItemToInvoice();
                          }
                        }}
                        placeholder="Ketik nama obat dari inventori..."
                        className="w-full pl-8 pr-7 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      {medSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setMedSearchQuery('');
                            setSelectedMedId('');
                            setShowMedDropdown(true);
                          }}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {showMedDropdown && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                          {filteredMedicineOptions.length === 0 ? (
                            <div className="p-3 text-center text-slate-400 italic text-xs">
                              Obat "{medSearchQuery}" tidak ditemukan di inventori.
                            </div>
                          ) : (
                            filteredMedicineOptions.map((m) => (
                              <div
                                key={m.id}
                                onClick={() => {
                                  addMedicineObjectToInvoice(m);
                                }}
                                className="p-2.5 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-slate-800 truncate">
                                    {m.name} {m.kekuatan ? <span className="text-slate-500 font-normal">({m.kekuatan})</span> : null}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    Stok: <strong className={m.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}>{m.stock} {m.unit}</strong>
                                    {m.satuanBesar ? ` (${m.satuanBesar})` : ''} · Rp {(m.sellPriceMitra || m.sellPrice || 0).toLocaleString('id-ID')}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    addMedicineObjectToInvoice(m);
                                  }}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-md font-bold text-[10px] transition shrink-0 cursor-pointer"
                                >
                                  + Pilih
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItemToInvoice}
                      disabled={!selectedMedId && !medSearchQuery.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Item</span>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] whitespace-nowrap">
                      <tr>
                        <th className="p-2.5 text-center w-10">No</th>
                        <th className="p-2.5 min-w-[190px]">Nama Obat / Sediaan</th>
                        <th className="p-2.5 whitespace-nowrap">Kekuatan</th>
                        <th className="p-2.5 whitespace-nowrap">No. Batch & ED</th>
                        <th className="p-2.5 text-center whitespace-nowrap">Qty</th>
                        <th className="p-2.5 whitespace-nowrap min-w-[115px]">Satuan</th>
                        <th className="p-2.5 text-right whitespace-nowrap min-w-[125px]">Harga</th>
                        <th className="p-2.5 text-center whitespace-nowrap min-w-[135px]">Diskon</th>
                        <th className="p-2.5 text-right whitespace-nowrap min-w-[125px]">Subtotal</th>
                        <th className="p-2.5 text-center whitespace-nowrap w-14">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-400">
                            Belum ada item obat yang ditambahkan ke faktur. Pilih obat di menu pencarian di atas.
                          </td>
                        </tr>
                      ) : (
                        invoiceItems.map((it, idx) => {
                          const med = medicines.find((m) => m.id === it.medicineId);
                          const unitOptions = it.unitOptions && it.unitOptions.length > 0
                            ? it.unitOptions
                            : getMedicineUnitOptions(med, it.unit);

                          return (
                            <tr key={it.medicineId} className="hover:bg-slate-50">
                              <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-slate-800">{it.name}</td>
                              <td className="p-2.5 text-slate-600">{it.kekuatan}</td>
                              <td className="p-2.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                                <div>{it.batchNo}</div>
                                <div className="text-[10px] text-slate-400">ED: {it.expDate}</div>
                              </td>
                              <td className="p-2.5 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  max={it.availableStock}
                                  value={it.qty}
                                  onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)}
                                  className="w-16 p-1 border rounded text-center font-bold"
                                />
                                <div className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">Maks {it.availableStock}</div>
                              </td>
                              <td className="p-2.5 text-slate-700 font-semibold">
                                {unitOptions.length > 1 ? (
                                  <select
                                    value={it.unit}
                                    onChange={(e) => handleUpdateItemUnit(idx, e.target.value)}
                                    className="w-full min-w-[95px] p-1.5 border border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                  >
                                    {unitOptions.map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 whitespace-nowrap">
                                    {unitOptions[0] || it.unit}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={it.price > 0 ? Math.round(it.price).toLocaleString('id-ID') : ''}
                                  onChange={(e) =>
                                    handleUpdateItemPrice(
                                      idx,
                                      parseInt(e.target.value.replace(/\D/g, ''), 10) || 0
                                    )
                                  }
                                  placeholder="0"
                                  className="w-24 p-1 border rounded text-right font-mono font-bold"
                                />
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="inline-flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                                  <select
                                    value={it.discountType}
                                    onChange={(e) =>
                                      handleUpdateItemDiscountType(idx, e.target.value as 'percent' | 'nominal')
                                    }
                                    className="px-1.5 py-1 bg-slate-100 text-[10px] font-black text-slate-700 border-r border-slate-300 focus:outline-none cursor-pointer"
                                    title="Pilih jenis diskon (% atau Nominal Rp)"
                                  >
                                    <option value="percent">%</option>
                                    <option value="nominal">Rp</option>
                                  </select>
                                  {it.discountType === 'percent' ? (
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={it.discount || ''}
                                      placeholder="0"
                                      onChange={(e) =>
                                        handleUpdateItemDiscount(idx, parseFloat(e.target.value) || 0)
                                      }
                                      className="w-14 p-1 text-center font-mono font-bold text-xs focus:outline-none"
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={
                                        it.discount > 0
                                          ? Math.round(it.discount).toLocaleString('id-ID')
                                          : ''
                                      }
                                      placeholder="0"
                                      onChange={(e) =>
                                        handleUpdateItemDiscount(
                                          idx,
                                          parseInt(e.target.value.replace(/\D/g, ''), 10) || 0
                                        )
                                      }
                                      className="w-20 p-1 text-right font-mono font-bold text-xs focus:outline-none"
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5 text-right font-black text-slate-800">
                                Rp {it.subtotal.toLocaleString('id-ID')}
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInvoiceItem(idx)}
                                  className="text-rose-500 hover:text-rose-700 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
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

              {/* Total & Summary Section */}
              <div className="flex flex-col md:flex-row justify-between gap-6 pt-3 border-t border-slate-200">
                <div className="flex-1 space-y-2">
                  <label className="block font-bold text-slate-700">Catatan Faktur / Syarat Pengiriman</label>
                  <textarea
                    rows={3}
                    value={invoiceForm.description}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                    placeholder="Barang diterima dalam kondisi baik. Pembayaran jatuh tempo wajib tepat waktu."
                    className="w-full p-2.5 border rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 italic">
                    * Menyimpan faktur ini akan secara otomatis mengurangi stok inventori dan mencatat mutasi keluar.
                  </p>
                </div>

                <div className="w-full md:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Bruto:</span>
                    <span>Rp {invoiceSubtotalGross.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Diskon Item:</span>
                    <span className="text-rose-600 font-bold">- Rp {invoiceTotalDiscount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 font-bold border-t border-slate-200 pt-1">
                    <span>Dasar Pengenaan Pajak (DPP):</span>
                    <span>Rp {invoiceDpp.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>PPN 11%:</span>
                    <span>{invoiceForm.usePpn ? `Rp ${invoicePpn.toLocaleString('id-ID')}` : 'Rp 0 (Non-PPN)'}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black text-sm border-t border-slate-300 pt-2">
                    <span>Total Netto (Faktur):</span>
                    <span className="text-indigo-700">Rp {invoiceGrandTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200">
                    Terbilang: {terbilangRupiah(invoiceGrandTotal)}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewInvoiceModal(false)}
                  className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Terbitkan & Simpan Faktur Penjualan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Cetak Faktur Penjualan & Kwitansi Resmi Standar PBF / Apotek */}
      {selectedTrxForPrint && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    Pratinjau Cetak {printDocType === 'kwitansi' ? 'Kwitansi Pembayaran' : 'Faktur Penjualan Resmi'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setPrintDocType('faktur')}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        printDocType === 'faktur'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Lihat Faktur
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintDocType('kwitansi')}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        printDocType === 'kwitansi'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Lihat Kwitansi
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintDocument('faktur-penjualan')}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                  title="Cetak Faktur Penjualan Resmi"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Faktur</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintDocument('kwitansi-penjualan')}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                  title="Cetak Kwitansi Pembayaran"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Kwitansi</span>
                </button>
                <button
                  onClick={() => setSelectedTrxForPrint(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 max-h-[82vh] overflow-y-auto bg-slate-50 flex justify-center custom-scrollbar">
              {printDocType === 'kwitansi' ? (
                <div
                  id="printable-section"
                  className="bg-white p-8 rounded-lg shadow-sm border-2 border-slate-800 w-full max-w-2xl text-slate-900 text-xs leading-relaxed"
                >
                  {(() => {
                    const pharmacyProfile = getSavedPharmacyProfile();
                    const apjProfile = getSavedAPJProfile();
                    const resolvedCust =
                      !selectedTrxForPrint.customerName || selectedTrxForPrint.customerName === 'Pelanggan Umum'
                        ? 'Reguler'
                        : selectedTrxForPrint.customerName;
                    return (
                      <>
                        {/* KOP KWITANSI */}
                        <div className="border-b-2 border-slate-900 pb-4 mb-5 flex justify-between items-center gap-4">
                          <div className="flex items-center gap-3.5">
                            {pharmacyProfile.logoUrl && (
                              <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                                <img
                                  src={pharmacyProfile.logoUrl}
                                  alt="Logo Faskes"
                                  className="w-14 h-14 object-contain"
                                />
                              </div>
                            )}
                            <div>
                              <h2 className="text-lg font-black tracking-wider text-slate-900 uppercase">
                                {pharmacyProfile.name}
                              </h2>
                              <p className="text-[11px] text-slate-700 font-medium">
                                {pharmacyProfile.address}, {pharmacyProfile.city}
                              </p>
                              <p className="text-[11px] text-slate-600">
                                Telp / WhatsApp: {pharmacyProfile.phone} | Email: {pharmacyProfile.email}
                              </p>
                              <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                                <span>SIA: <strong>{pharmacyProfile.sia}</strong></span> |{' '}
                                <span>APJ: <strong>{apjProfile.name}</strong></span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="inline-block px-3.5 py-1.5 bg-slate-900 text-white font-mono font-black text-sm rounded tracking-widest uppercase">
                              KWITANSI
                            </div>
                          </div>
                        </div>

                        {/* ISI KWITANSI */}
                        <div className="space-y-4 text-xs my-4">
                          <div className="grid grid-cols-12 items-center border-b border-dashed border-slate-300 pb-2.5">
                            <div className="col-span-4 font-bold text-slate-600 uppercase tracking-wider">
                              No. Transaksi
                            </div>
                            <div className="col-span-8 font-mono font-black text-slate-900 text-sm">
                              : {selectedTrxForPrint.id}
                            </div>
                          </div>

                          <div className="grid grid-cols-12 items-center border-b border-dashed border-slate-300 pb-2.5">
                            <div className="col-span-4 font-bold text-slate-600 uppercase tracking-wider">
                              DITERIMA Dari
                            </div>
                            <div className="col-span-8 font-extrabold text-slate-900 text-sm">
                              : {resolvedCust}
                            </div>
                          </div>

                          <div className="grid grid-cols-12 items-center border-b border-dashed border-slate-300 pb-2.5">
                            <div className="col-span-4 font-bold text-slate-600 uppercase tracking-wider">
                              Nilai Tagihan
                            </div>
                            <div className="col-span-8">
                              <span className="inline-block px-4 py-1.5 bg-slate-100 border-2 border-slate-800 rounded font-mono font-black text-base text-slate-900">
                                Rp {selectedTrxForPrint.total.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-12 items-start border-b border-dashed border-slate-300 pb-3">
                            <div className="col-span-4 font-bold text-slate-600 uppercase tracking-wider pt-1">
                              Terbilang
                            </div>
                            <div className="col-span-8 p-2.5 bg-slate-50 border border-slate-300 rounded italic font-bold text-slate-900">
                              # {terbilangRupiah(selectedTrxForPrint.total)} #
                            </div>
                          </div>
                        </div>

                        {/* TANGGAL & TANDA TANGAN PETUGAS SESUAI AKUN */}
                        <div className="mt-8 pt-4 flex justify-end">
                          <div className="w-64 text-center space-y-1">
                            <p className="text-[11px] font-semibold text-slate-700">
                              {pharmacyProfile.city || 'Tangerang'}, {selectedTrxForPrint.date}
                            </p>
                            <p className="text-[11px] font-bold text-slate-800">
                              Petugas Penerima,
                            </p>
                            <div className="h-20 flex items-end justify-center">
                              <span className="text-[9px] text-slate-400 italic">(Tanda Tangan & Stempel)</span>
                            </div>
                            <p className="font-black text-slate-900 border-t border-slate-800 pt-1 text-xs">
                              {userName || selectedTrxForPrint.kasir}
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div
                  id="printable-section"
                  className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 w-full max-w-3xl text-slate-900 text-xs leading-relaxed"
                  style={{ minHeight: '800px' }}
                >
                  {/* KOP APOTEK RESMI TERINTEGRASI PROFIL APOTEK & APJ */}
                  {(() => {
                    const pharmacyProfile = getSavedPharmacyProfile();
                    const apjProfile = getSavedAPJProfile();
                    return (
                      <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-center gap-4">
                        <div className="flex items-center gap-3.5">
                          {pharmacyProfile.logoUrl && (
                            <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                              <img
                                src={pharmacyProfile.logoUrl}
                                alt="Logo Faskes"
                                className="w-14 h-14 object-contain"
                              />
                            </div>
                          )}
                          <div>
                            <h2 className="text-lg font-black tracking-wider text-slate-900 uppercase">
                              {pharmacyProfile.name}
                            </h2>
                            <p className="text-[11px] text-slate-700 font-medium">
                              {pharmacyProfile.address}, {pharmacyProfile.city}
                            </p>
                            <p className="text-[11px] text-slate-600">
                              Telp / WhatsApp: {pharmacyProfile.phone} | Email: {pharmacyProfile.email}
                            </p>
                            <div className="text-[10px] text-slate-600 font-medium mt-1">
                              <span>SIA: <strong>{pharmacyProfile.sia}</strong></span> |{' '}
                              <span>NPWP: <strong>{pharmacyProfile.npwp}</strong></span> |{' '}
                              <span>APJ: <strong>{apjProfile.name}</strong> (SIPA: {apjProfile.sipa})</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-black text-xs rounded">
                            FAKTUR PENJUALAN
                          </div>
                          <div className="text-[10px] font-mono text-slate-600 mt-1">
                            No: <strong>{selectedTrxForPrint.id}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Info Header: Pemesan & Transaksi */}
                  <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        KEPADA YTH. (PEMESAN / FASKES):
                      </p>
                      <p className="font-bold text-slate-900 text-sm">
                        {!selectedTrxForPrint.customerName || selectedTrxForPrint.customerName === 'Pelanggan Umum'
                          ? 'Reguler'
                          : selectedTrxForPrint.customerName}
                      </p>
                      {selectedTrxForPrint.customerAddress && (
                        <p className="text-slate-600 mt-0.5">{selectedTrxForPrint.customerAddress}</p>
                      )}
                      {selectedTrxForPrint.customerPhone && (
                        <p className="text-slate-600">Telp: {selectedTrxForPrint.customerPhone}</p>
                      )}
                    </div>

                    <div className="space-y-1 text-right">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tanggal Faktur:</span>
                        <strong className="text-slate-800">{selectedTrxForPrint.date}</strong>
                      </div>
                      {selectedTrxForPrint.dueDate && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Jatuh Tempo:</span>
                          <strong className="text-amber-700">{selectedTrxForPrint.dueDate}</strong>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Syarat Pembayaran:</span>
                        <strong>{selectedTrxForPrint.term || 'Tunai / COD'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Petugas / Kasir:</span>
                        <strong>{selectedTrxForPrint.kasir}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Tabel Rincian Obat */}
                  <table className="w-full border-collapse border border-slate-300 text-[11px] mb-4">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold">
                        <th className="border border-slate-300 p-2 text-center w-8">No</th>
                        <th className="border border-slate-300 p-2 text-left">Nama Obat / Alat Kesehatan</th>
                        <th className="border border-slate-300 p-2 text-left">Kekuatan</th>
                        <th className="border border-slate-300 p-2 text-left">No. Batch</th>
                        <th className="border border-slate-300 p-2 text-center">Exp Date</th>
                        <th className="border border-slate-300 p-2 text-center">Qty</th>
                        <th className="border border-slate-300 p-2 text-center">Satuan</th>
                        <th className="border border-slate-300 p-2 text-right">Harga</th>
                        <th className="border border-slate-300 p-2 text-center">Diskon</th>
                        <th className="border border-slate-300 p-2 text-right">Total (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTrxForPrint.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 p-1.5 font-bold text-slate-800">{it.name}</td>
                          <td className="border border-slate-300 p-1.5">{it.kekuatan || '-'}</td>
                          <td className="border border-slate-300 p-1.5 font-mono">{it.batchNo || '-'}</td>
                          <td className="border border-slate-300 p-1.5 text-center font-mono">{it.expDate || '-'}</td>
                          <td className="border border-slate-300 p-1.5 text-center font-bold">{it.qty}</td>
                          <td className="border border-slate-300 p-1.5 text-center">{it.unit}</td>
                          <td className="border border-slate-300 p-1.5 text-right">{it.price.toLocaleString('id-ID')}</td>
                          <td className="border border-slate-300 p-1.5 text-center">
                            {it.discount && it.discount > 100
                              ? `Rp ${it.discount.toLocaleString('id-ID')}`
                              : `${it.discount || 0}%`}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-right font-bold">
                            {it.subtotal.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Ringkasan Perhitungan */}
                  <div className="flex justify-between items-start gap-6 mb-8 text-[11px]">
                    <div className="flex-1 space-y-2">
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                        <p className="font-bold text-slate-700">Terbilang:</p>
                        <p className="italic font-semibold text-slate-900 mt-0.5">
                          # {terbilangRupiah(selectedTrxForPrint.total)} #
                        </p>
                      </div>

                      <div className="text-[10px] text-slate-500 space-y-0.5">
                        <p><strong>Ketentuan Faktur:</strong></p>
                        <p>1. Barang yang sudah diterima dalam kondisi baik tidak dapat dikembalikan tanpa persetujuan.</p>
                        <p>2. Pembayaran via transfer harap ke Rekening Resmi: <strong>SEABANK 9015-5031-5849 a/n Mardin, BRI 7704-0101-3765-531 a/n Mardin</strong>.</p>
                      </div>
                    </div>

                    <div className="w-64 space-y-1 text-slate-700 border border-slate-300 p-3 rounded bg-slate-50">
                      <div className="flex justify-between">
                        <span>Dasar Pengenaan Pajak (DPP):</span>
                        <span className="font-mono">Rp {(selectedTrxForPrint.dpp || (selectedTrxForPrint.total - (selectedTrxForPrint.ppn || 0))).toLocaleString('id-ID')}</span>
                      </div>
                      {selectedTrxForPrint.ppn ? (
                        <div className="flex justify-between">
                          <span>PPN 11%:</span>
                          <span className="font-mono">Rp {selectedTrxForPrint.ppn.toLocaleString('id-ID')}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between font-black text-slate-900 border-t border-slate-300 pt-1 text-xs">
                        <span>TOTAL FAKTUR:</span>
                        <span className="font-mono">Rp {selectedTrxForPrint.total.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3 KOLOM TANDA TANGAN RESMI */}
                  <div className="grid grid-cols-3 gap-4 text-center text-[10px] pt-4 border-t border-slate-300">
                    <div>
                      <p className="font-bold text-slate-700">Yang Menerima / Faskes Pemesan,</p>
                      <div className="h-20 flex items-end justify-center">
                        <p className="text-slate-400 italic text-[9px]">(Stempel & Tanda Tangan)</p>
                      </div>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                        {!selectedTrxForPrint.customerName || selectedTrxForPrint.customerName === 'Pelanggan Umum'
                          ? 'Reguler'
                          : selectedTrxForPrint.customerName}
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-700">Petugas Gudang / Kasir,</p>
                      <div className="h-20 flex items-end justify-center">
                        <p className="text-slate-400 italic text-[9px]">(Tanda Tangan)</p>
                      </div>
                      <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                        {selectedTrxForPrint.kasir || userName}
                      </p>
                    </div>

                    <div>
                      {(() => {
                        const apjProfile = getSavedAPJProfile();
                        return (
                          <>
                            <p className="font-bold text-slate-700">Apoteker Pengelola Apotek (APJ),</p>
                            <div className="h-20 flex items-end justify-center">
                              <p className="text-indigo-600 font-mono font-bold text-[9px]">Latisha Farma APJ Seal</p>
                            </div>
                            <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                              {apjProfile.name}
                            </p>
                            <p className="text-[9px] text-slate-600 font-mono">SIPA: {apjProfile.sipa}</p>
                            <p className="text-[9px] text-slate-500 font-mono">STRA: {apjProfile.stra}</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Konfirmasi Batal Transaksi */}
      {trxToCancel && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-2.5 bg-rose-50 rounded-xl">
                <Ban className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-black text-base text-slate-800">Batalkan Transaksi Penjualan?</h3>
                <p className="text-xs text-slate-500">Transaksi #{trxToCancel.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Pembatalan transaksi akan mengembalikan seluruh stok obat yang terjual ({trxToCancel.items.reduce((a, b) => a + b.qty, 0)} item) kembali ke inventori farmasi serta mencatat mutasi stok pembatalan.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Pembatalan *
              </label>
              <textarea
                rows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Salah input pesanan kasir, transaksi dibatalkan oleh pembeli..."
                className="w-full p-2.5 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTrxToCancel(null);
                  setCancelReason('');
                }}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Ya, Batalkan & Kembalikan Stok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Form Retur Penjualan */}
      {trxToReturn && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <span className="p-2.5 bg-amber-50 rounded-xl">
                <RotateCcw className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-black text-base text-slate-800">Proses Retur Penjualan</h3>
                <p className="text-xs text-slate-500">Transaksi #{trxToReturn.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Retur penjualan akan memulihkan kuantitas stok barang di gudang inventori farmasi dan memperbarui status faktur menjadi <strong>Diretur</strong>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Alasan Retur
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold bg-slate-50"
                >
                  <option value="Barang Rusak / Cacat Kemasan">Barang Rusak / Cacat Kemasan</option>
                  <option value="Mendekati Tanggal Kedaluwarsa (ED)">Mendekati Tanggal Kedaluwarsa (ED)</option>
                  <option value="Salah Kirim Sediaan / Dosis Obat">Salah Kirim Sediaan / Dosis Obat</option>
                  <option value="Permintaan Retur dari Faskes / Pembeli">Permintaan Retur dari Faskes / Pembeli</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan Retur (Opsional)
                </label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Keterangan kondisi fisik obat yang diretur..."
                  className="w-full p-2.5 border rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTrxToReturn(null);
                  setReturnReason('Barang Rusak / Cacat Kemasan');
                  setReturnNotes('');
                }}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Konfirmasi Retur & Masukkan Stok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Terpilih */}
      {confirmDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800">Hapus Transaksi Terpilih</h3>
                <p className="text-xs text-slate-500">Konfirmasi penghapusan data transaksi</p>
              </div>
            </div>
            <p className="text-xs text-slate-700">
              Apakah Anda yakin ingin menghapus <strong className="text-rose-700 font-bold">{selectedTrxIds.length}</strong> transaksi yang dipilih secara permanen?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSelected}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                Hapus {selectedTrxIds.length} Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
