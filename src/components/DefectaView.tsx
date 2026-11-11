import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Printer,
  FileText,
  CheckCircle2,
  Building,
  RefreshCw,
  ShoppingCart,
  Plus,
  Trash2,
  Edit2,
  Search,
  Calendar,
  Package,
  Layers,
  ShieldAlert,
  ChevronDown,
  X,
  ExternalLink,
  Info,
  CheckSquare,
  Square,
  Eye
} from 'lucide-react';
import { Medicine, Supplier, PurchaseOrder, PurchaseOrderItem, SPGroupType } from '../types';
import { openPrintWindow } from '../utils/printHelper';
import { INITIAL_SUPPLIERS } from '../data/initialData';

interface DefectaViewProps {
  medicines: Medicine[];
  suppliers?: Supplier[];
}

export const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const detectSPGroup = (m: Partial<Medicine>): SPGroupType => {
  const nappza = (m.nappza || '').toLowerCase();
  const cat = (m.category || '').toLowerCase();

  if (nappza.includes('narkotik')) return 'NAR';
  if (nappza.includes('psikotropik')) return 'PSI';
  if (nappza.includes('prekursor')) return 'PRE';
  if (nappza.includes('oot') || nappza.includes('tertentu')) return 'OOT';
  if (cat.includes('alat') || cat.includes('alkes') || cat.includes('kesehatan')) return 'ALK';
  return 'REG';
};

export const getSPGroupMeta = (spType: SPGroupType) => {
  switch (spType) {
    case 'NAR':
      return {
        code: 'NAR',
        label: 'Narkotika',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
        title: 'Surat Pesanan Narkotika (PMK 3/2015)'
      };
    case 'PSI':
      return {
        code: 'PSI',
        label: 'Psikotropika',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
        title: 'Surat Pesanan Psikotropika (PMK 3/2015)'
      };
    case 'PRE':
      return {
        code: 'PRE',
        label: 'Prekursor',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        title: 'Surat Pesanan Prekursor Farmasi (BPOM 24/2021)'
      };
    case 'OOT':
      return {
        code: 'OOT',
        label: 'Obat Tertentu (OOT)',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
        title: 'Surat Pesanan Obat-Obat Tertentu (BPOM 10/2019)'
      };
    case 'ALK':
      return {
        code: 'ALK',
        label: 'Alkes & BMHP',
        badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
        title: 'Surat Pesanan Alat Kesehatan & BMHP'
      };
    case 'REG':
    default:
      return {
        code: 'REG',
        label: 'Reguler (OTC/Keras)',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
        title: 'Surat Pesanan Obat Jadi Reguler'
      };
  }
};

export const generateSPNumber = (spType: SPGroupType, orderIndex: number, dateStr?: string): string => {
  const d = dateStr ? new Date(dateStr) : new Date();
  const romanMonth = ROMAN_MONTHS[d.getMonth()] || 'I';
  const year = d.getFullYear();
  const seq = String(orderIndex).padStart(3, '0');
  return `ALF/${spType}/${romanMonth}/${year}/${seq}`;
};

export const DefectaView: React.FC<DefectaViewProps> = ({ medicines, suppliers = INITIAL_SUPPLIERS }) => {
  const [activeTab, setActiveTab] = useState<'defecta' | 'orders'>('defecta');
  const [selectedPeriod, setSelectedPeriod] = useState<'1bulan' | '3bulan' | '6bulan' | '1tahun'>('1bulan');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('SEMUA');
  const [searchTerm, setSearchTerm] = useState('');
  const [checkedMedicineIds, setCheckedMedicineIds] = useState<Set<string>>(new Set());

  // Purchase Orders State
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    try {
      const saved = localStorage.getItem('latisha_purchase_orders');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // Seed default purchase orders if empty
    const currentYear = new Date().getFullYear();
    const currentMonthRoman = ROMAN_MONTHS[new Date().getMonth()];
    const today = new Date().toISOString().split('T')[0];

    const initialPOs: PurchaseOrder[] = [
      {
        id: 'PO-202611-001',
        poNumber: 'PO-202611-001',
        date: today,
        supplierId: 'SUP-001',
        supplierName: 'PT. Kimia Farma Trading & Distribution',
        supplierAddress: 'Jl. Soekarno Hatta No. 45, Bandar Lampung',
        supplierPhone: '0721-789012',
        supplierLicenseNo: 'PBF-1871/DINKES/2021',
        spNumbers: {
          REG: `ALF/REG/${currentMonthRoman}/${currentYear}/001`,
          ALK: `ALF/ALK/${currentMonthRoman}/${currentYear}/001`,
          PRE: `ALF/PRE/${currentMonthRoman}/${currentYear}/001`,
          OOT: `ALF/OOT/${currentMonthRoman}/${currentYear}/001`,
          PSI: `ALF/PSI/${currentMonthRoman}/${currentYear}/001`,
          NAR: `ALF/NAR/${currentMonthRoman}/${currentYear}/001`
        },
        status: 'Diproses',
        items: [
          {
            id: 'POI-1',
            medicineId: 'OBT-001',
            name: 'Paracetamol 500mg',
            category: 'Obat Bebas',
            nappza: 'Non-NAPPZA',
            spType: 'REG',
            form: 'Tablet',
            kekuatan: '500 mg',
            satuanBesar: 'Box',
            satuanKecil: 'Strip',
            rasioKonversi: 10,
            currentStock: 12,
            minStock: 20,
            qtyBesar: 15,
            qtyKecil: 150,
            estimatedHna: 45000,
            subtotal: 675000
          },
          {
            id: 'POI-2',
            medicineId: 'OBT-003',
            name: 'Tremenza Tablet (Pseudoephedrine HCl)',
            category: 'Obat Keras',
            nappza: 'Prekursor',
            spType: 'PRE',
            form: 'Tablet',
            kekuatan: '60 mg',
            satuanBesar: 'Box',
            satuanKecil: 'Strip',
            rasioKonversi: 10,
            currentStock: 4,
            minStock: 10,
            qtyBesar: 5,
            qtyKecil: 50,
            estimatedHna: 85000,
            subtotal: 425000
          }
        ],
        notes: 'Pesanan Re-Order Defecta rutin. Mohon dikirim beserta faktur dan salinan CoA.',
        totalEstimatedCost: 1100000,
        createdAt: new Date().toISOString()
      }
    ];
    return initialPOs;
  });

  // Save POs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('latisha_purchase_orders', JSON.stringify(purchaseOrders));
    } catch (e) {}
  }, [purchaseOrders]);

  // Form Re-Order State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [orderForm, setOrderForm] = useState<{
    date: string;
    supplierId: string;
    supplierName: string;
    supplierAddress: string;
    supplierPhone: string;
    supplierLicenseNo: string;
    notes: string;
    items: PurchaseOrderItem[];
  }>({
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    supplierName: '',
    supplierAddress: '',
    supplierPhone: '',
    supplierLicenseNo: '',
    notes: '',
    items: []
  });

  // Supplier Autocomplete
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);

  // Medicine Search to Add Custom Item into PO
  const [isMedicineSearchOpen, setIsMedicineSearchOpen] = useState(false);
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');

  // Print SP Modal State
  const [printModalPo, setPrintModalPo] = useState<PurchaseOrder | null>(null);

  // Close supplier dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered suppliers for autocomplete
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.licenseNo && s.licenseNo.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

  // Defecta items calculation based on formula:
  // Rekomendasi Order = Pemakaian Rata-Rata dalam 1 Periode + Buffer Stok 10% - Sisa Stok
  const defectaList = useMemo(() => {
    const periodMonths =
      selectedPeriod === '1bulan' ? 1 : selectedPeriod === '3bulan' ? 3 : selectedPeriod === '6bulan' ? 6 : 12;

    return medicines.map((m) => {
      const isDefecta = m.stock <= m.minStock;
      const spType = detectSPGroup(m);

      // Pemakaian bulanan estimasi berbasis baseline minStock
      const monthlyUsage = Math.max(10, Math.round(m.minStock * 1.5));
      const pemakaianPeriode = monthlyUsage * periodMonths;
      const buffer10 = Math.round(pemakaianPeriode * 0.1);

      // Rekomendasi = (Pemakaian + Buffer 10%) - Sisa Stok
      const netKecil = pemakaianPeriode + buffer10 - m.stock;
      const rekomendasiKecil = Math.max(0, netKecil);
      const ratio = Math.max(1, m.rasioKonversi || 1);
      const rekomendasiBesar = Math.max(1, Math.ceil(rekomendasiKecil / ratio));

      const hna = m.hnaBesar || (m.hpp ? Math.round(m.hpp * ratio * 0.9) : 40000);
      const totalEstimasi = rekomendasiBesar * hna;

      return {
        ...m,
        isDefecta,
        spType,
        monthlyUsage,
        pemakaianPeriode,
        buffer10,
        rekomendasiKecil,
        rekomendasiBesar,
        hnaBesarEstimate: hna,
        totalEstimasi
      };
    });
  }, [medicines, selectedPeriod]);

  // Distinct suppliers in defecta list
  const defectaSuppliers = useMemo(() => {
    const setSup = new Set(
      defectaList.filter((m) => m.isDefecta).map((m) => m.supplier || 'PT Kimia Farma Trading')
    );
    return Array.from(setSup);
  }, [defectaList]);

  // Filtered Defecta view
  const filteredDefecta = useMemo(() => {
    return defectaList.filter((item) => {
      // Must be defecta (stock <= minStock) or searching for items
      if (!item.isDefecta) return false;

      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.barcode.includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.nappza && item.nappza.toLowerCase().includes(q));

      const matchSup =
        selectedSupplierFilter === 'SEMUA' || (item.supplier || 'PT Kimia Farma Trading') === selectedSupplierFilter;

      return matchSearch && matchSup;
    });
  }, [defectaList, searchTerm, selectedSupplierFilter]);

  // Handle Checkbox Selection
  const handleToggleCheck = (id: string) => {
    setCheckedMedicineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (checkedMedicineIds.size === filteredDefecta.length) {
      setCheckedMedicineIds(new Set());
    } else {
      setCheckedMedicineIds(new Set(filteredDefecta.map((m) => m.id)));
    }
  };

  // Open Re-Order Form
  const handleOpenReOrderForm = (singleItem?: any) => {
    setEditingOrderId(null);

    let itemsToOrder: any[] = [];
    let detectedSupplierName = '';
    let matchedSup: Supplier | undefined = undefined;

    if (singleItem) {
      itemsToOrder = [singleItem];
      detectedSupplierName = singleItem.supplier || '';
      matchedSup = suppliers.find((s) => s.name.toLowerCase() === detectedSupplierName.toLowerCase());
    } else if (checkedMedicineIds.size > 0) {
      itemsToOrder = defectaList.filter((m) => checkedMedicineIds.has(m.id));
      detectedSupplierName = itemsToOrder[0]?.supplier || '';
      matchedSup = suppliers.find((s) => s.name.toLowerCase() === detectedSupplierName.toLowerCase());
    } else {
      // Form baru kosong murni tanpa pre-filled supplier atau items
      itemsToOrder = [];
      detectedSupplierName = '';
      matchedSup = undefined;
    }

    const orderItems: PurchaseOrderItem[] = itemsToOrder.map((m, idx) => ({
      id: `ITEM-${Date.now()}-${idx}`,
      medicineId: m.id,
      name: m.name,
      category: m.category,
      nappza: m.nappza || 'Non-NAPPZA',
      spType: detectSPGroup(m),
      form: m.form,
      kekuatan: m.kekuatan || '',
      satuanBesar: m.satuanBesar || 'Box',
      satuanKecil: m.satuanKecil || m.unit || 'Strip',
      rasioKonversi: m.rasioKonversi || 10,
      currentStock: m.stock,
      minStock: m.minStock,
      qtyBesar: m.rekomendasiBesar || 1,
      qtyKecil: (m.rekomendasiBesar || 1) * (m.rasioKonversi || 10),
      estimatedHna: m.hnaBesar || m.hnaBesarEstimate || 50000,
      subtotal: (m.rekomendasiBesar || 1) * (m.hnaBesar || m.hnaBesarEstimate || 50000)
    }));

    setOrderForm({
      date: new Date().toISOString().split('T')[0],
      supplierId: matchedSup?.id || '',
      supplierName: matchedSup?.name || detectedSupplierName,
      supplierAddress: matchedSup?.address || '',
      supplierPhone: matchedSup?.phone || '',
      supplierLicenseNo: matchedSup?.licenseNo || '',
      notes: '',
      items: orderItems
    });

    setSupplierSearch(matchedSup?.name || detectedSupplierName);
    setIsOrderModalOpen(true);
  };

  // Open Edit Order Form
  const handleOpenEditOrder = (po: PurchaseOrder) => {
    setEditingOrderId(po.id);
    setOrderForm({
      date: po.date,
      supplierId: po.supplierId || '',
      supplierName: po.supplierName,
      supplierAddress: po.supplierAddress || '',
      supplierPhone: po.supplierPhone || '',
      supplierLicenseNo: po.supplierLicenseNo || '',
      notes: po.notes || '',
      items: po.items
    });
    setSupplierSearch(po.supplierName);
    setIsOrderModalOpen(true);
  };

  // Delete Order
  const handleDeleteOrder = (poId: string) => {
    if (confirm(`Hapus pesanan pembelian #${poId}? Data SP terkait akan dibatalkan.`)) {
      setPurchaseOrders((prev) => prev.filter((p) => p.id !== poId));
    }
  };

  // Save Order
  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.supplierName.trim()) {
      alert('Nama Supplier / PBF wajib dipilih!');
      return;
    }
    if (orderForm.items.length === 0) {
      alert('Pilih minimal 1 obat untuk pesanan pembelian!');
      return;
    }

    const orderIndex = editingOrderId
      ? parseInt(editingOrderId.replace(/\D/g, '').slice(-3)) || purchaseOrders.length + 1
      : purchaseOrders.length + 1;

    const currentYear = new Date(orderForm.date).getFullYear();
    const currentMonthRoman = ROMAN_MONTHS[new Date(orderForm.date).getMonth()];

    // Generate SP Numbers for each category ALF/{jenis SP}/{BLN}/{THN}/{No. Urut}
    const spNumbers: Record<SPGroupType, string> = {
      REG: generateSPNumber('REG', orderIndex, orderForm.date),
      ALK: generateSPNumber('ALK', orderIndex, orderForm.date),
      PRE: generateSPNumber('PRE', orderIndex, orderForm.date),
      OOT: generateSPNumber('OOT', orderIndex, orderForm.date),
      PSI: generateSPNumber('PSI', orderIndex, orderForm.date),
      NAR: generateSPNumber('NAR', orderIndex, orderForm.date)
    };

    const totalCost = orderForm.items.reduce((sum, it) => sum + it.subtotal, 0);

    let savedPo: PurchaseOrder;
    if (editingOrderId) {
      const existing = purchaseOrders.find((p) => p.id === editingOrderId);
      savedPo = {
        ...(existing || ({} as PurchaseOrder)),
        id: editingOrderId,
        poNumber: existing?.poNumber || editingOrderId,
        date: orderForm.date,
        supplierId: orderForm.supplierId,
        supplierName: orderForm.supplierName,
        supplierAddress: orderForm.supplierAddress,
        supplierPhone: orderForm.supplierPhone,
        supplierLicenseNo: orderForm.supplierLicenseNo,
        spNumbers: existing?.spNumbers || spNumbers,
        status: existing?.status || 'Diproses',
        items: orderForm.items,
        notes: orderForm.notes,
        totalEstimatedCost: totalCost,
        updatedAt: new Date().toISOString()
      };
      setPurchaseOrders((prev) =>
        prev.map((po) => (po.id === editingOrderId ? savedPo : po))
      );
    } else {
      const newPo: PurchaseOrder = {
        id: `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(
          orderIndex
        ).padStart(3, '0')}`,
        poNumber: `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(
          orderIndex
        ).padStart(3, '0')}`,
        date: orderForm.date,
        supplierId: orderForm.supplierId,
        supplierName: orderForm.supplierName,
        supplierAddress: orderForm.supplierAddress,
        supplierPhone: orderForm.supplierPhone,
        supplierLicenseNo: orderForm.supplierLicenseNo,
        spNumbers,
        status: 'Diproses',
        items: orderForm.items,
        notes: orderForm.notes,
        totalEstimatedCost: totalCost,
        createdAt: new Date().toISOString()
      };
      savedPo = newPo;
      setPurchaseOrders((prev) => [newPo, ...prev]);
    }

    setIsOrderModalOpen(false);
    setCheckedMedicineIds(new Set());
    setActiveTab('orders');

    // Automatically trigger Print Dialog for the saved PO with its inputted medicines
    setPrintModalPo(savedPo);
  };

  // Change Qty in Order Form
  const handleUpdateItemQty = (index: number, newQtyBesar: number) => {
    const qty = Math.max(1, newQtyBesar);
    setOrderForm((prev) => {
      const updated = [...prev.items];
      const item = updated[index];
      const qtyKecil = qty * (item.rasioKonversi || 1);
      const subtotal = qty * item.estimatedHna;
      updated[index] = { ...item, qtyBesar: qty, qtyKecil, subtotal };
      return { ...prev, items: updated };
    });
  };

  // Remove Item from Order Form
  const handleRemoveOrderItem = (index: number) => {
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Add Item to Order Form
  const handleAddMedicineToOrder = (med: Medicine) => {
    const exists = orderForm.items.some((i) => i.medicineId === med.id);
    if (exists) {
      alert(`Obat ${med.name} sudah ada dalam daftar pesanan.`);
      return;
    }

    const ratio = med.rasioKonversi || 10;
    const hna = med.hnaBesar || (med.hpp ? Math.round(med.hpp * ratio * 0.9) : 50000);

    const newItem: PurchaseOrderItem = {
      id: `ITEM-${Date.now()}-${orderForm.items.length}`,
      medicineId: med.id,
      name: med.name,
      category: med.category,
      nappza: med.nappza || 'Non-NAPPZA',
      spType: detectSPGroup(med),
      form: med.form,
      kekuatan: med.kekuatan || '',
      satuanBesar: med.satuanBesar || 'Box',
      satuanKecil: med.satuanKecil || med.unit || 'Strip',
      rasioKonversi: ratio,
      currentStock: med.stock,
      minStock: med.minStock,
      qtyBesar: 1,
      qtyKecil: ratio,
      estimatedHna: hna,
      subtotal: hna
    };

    setOrderForm((prev) => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setIsMedicineSearchOpen(false);
    setMedicineSearchQuery('');
  };

  // Group items in Form by SP Group for preview
  const formSPGroups = useMemo(() => {
    const groups: Partial<Record<SPGroupType, PurchaseOrderItem[]>> = {};
    orderForm.items.forEach((item) => {
      if (!groups[item.spType]) groups[item.spType] = [];
      groups[item.spType]!.push(item);
    });
    return groups;
  }, [orderForm.items]);

  // Print SP Handler for a specific PO and category
  const handlePrintSpecificSP = (po: PurchaseOrder, spType: SPGroupType | 'ALL') => {
    const isAll = spType === 'ALL';
    const filteredItems = isAll ? po.items : po.items.filter((it) => it.spType === spType);
    if (filteredItems.length === 0) {
      alert(`Tidak ada obat dalam kelompok ${spType} pada pesanan ini.`);
      return;
    }

    const romanMonth = ROMAN_MONTHS[new Date(po.date).getMonth()];
    const year = new Date(po.date).getFullYear();
    const spNumber = isAll
      ? (po.spNumbers?.['REG'] ? po.spNumbers['REG'].replace('/REG/', '/ALL/') : `ALF/ALL/${romanMonth}/${year}/001`)
      : (po.spNumbers[spType as SPGroupType] || generateSPNumber(spType as SPGroupType, 1, po.date));

    const spData = {
      spNumber,
      spType,
      supplierName: po.supplierName,
      supplierAddress: po.supplierAddress || '',
      supplierPhone: po.supplierPhone || '',
      orderDate: po.date,
      notes: po.notes || '',
      items: filteredItems.map((it) => ({
        id: it.id,
        medicineId: it.medicineId,
        name: it.name,
        category: it.category,
        nappza: it.nappza,
        kekuatan: it.kekuatan || '',
        form: it.form || 'Tablet',
        satuanBesar: it.satuanBesar || 'Box',
        satuanKecil: it.satuanKecil || 'Strip',
        rasioKonversi: it.rasioKonversi || 1,
        stock: it.currentStock,
        qtyBesar: it.qtyBesar,
        qtyKecil: it.qtyKecil,
        estimatedHna: it.estimatedHna,
        subtotal: it.subtotal
      }))
    };

    try {
      localStorage.setItem('latisha_active_print_sp', JSON.stringify(spData));
    } catch (e) {
      console.warn('Storage error:', e);
    }

    // Pass data encoded in URL search parameter for 100% resilience across all browser/iframe contexts
    const serializedData = encodeURIComponent(JSON.stringify(spData));
    openPrintWindow('surat-pesanan', {
      poId: po.id,
      spType,
      supplier: po.supplierName,
      data: serializedData
    });
  };

  // Summary KPI Cards
  const totalDefectaCount = filteredDefecta.length;
  const criticalDefectaCount = filteredDefecta.filter((m) => m.stock === 0).length;
  const totalEstimatedReorder = filteredDefecta.reduce((sum, m) => sum + m.totalEstimasi, 0);

  return (
    <div className="space-y-4">
      {/* Top Header - Matches Focus Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3 no-print">
        {/* div:nth-of-type(1) */}
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Buku Defecta & Pesanan Pembelian (Re-Order Otomatis)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekomendasi pesanan berbasis buffer stok minimum dan pemakaian rata-rata serta pemilahan Surat Pesanan resmi BPOM.
          </p>
        </div>

        {/* div:nth-of-type(2): button:nth-of-type(1) is Re-Order */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenReOrderForm()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Buka Form Pesanan Pembelian (Re-Order)"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Re-Order</span>
            {checkedMedicineIds.size > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-white text-indigo-700 rounded-full text-[10px] font-black">
                {checkedMedicineIds.size}
              </span>
            )}
          </button>

          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('defecta')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'defecta' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekomendasi Defecta ({totalDefectaCount})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pesanan Pembelian ({purchaseOrders.length})
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Obat Defecta
            </span>
            <div className="text-xl font-black text-rose-600 mt-0.5">{totalDefectaCount} Item</div>
            <span className="text-[10px] text-slate-500 font-medium">Stok fisik ≤ batas minimum</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Stok Kosong (Kritis)
            </span>
            <div className="text-xl font-black text-orange-600 mt-0.5">{criticalDefectaCount} Item</div>
            <span className="text-[10px] text-slate-500 font-medium">Stok fisik tersisa 0 unit</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Estimasi Biaya Re-Order
            </span>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              Rp {totalEstimatedReorder.toLocaleString('id-ID')}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Perkiraan HNA netto PBF</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Produk Terpilih
            </span>
            <div className="text-xl font-black text-indigo-600 mt-0.5">{checkedMedicineIds.size} Obat</div>
            <span className="text-[10px] text-slate-500 font-medium">Siap diproses Re-Order</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* VIEW 1: REKOMENDASI DEFECTA */}
      {activeTab === 'defecta' && (
        <div className="space-y-4">
          {/* Controls & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari obat defecta (Nama / Barcode)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              {/* Periode Pemakaian Rata-Rata */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600">Periode Pemakaian:</span>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as any)}
                  className="p-2 border rounded-xl text-xs font-bold bg-white text-slate-800 outline-none"
                >
                  <option value="1bulan">1 Bulan (30 Hari)</option>
                  <option value="3bulan">3 Bulan (90 Hari)</option>
                  <option value="6bulan">6 Bulan (180 Hari)</option>
                  <option value="1tahun">1 Tahun (365 Hari)</option>
                </select>
              </div>

              {/* Filter Supplier */}
              <select
                value={selectedSupplierFilter}
                onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                className="p-2 border rounded-xl text-xs font-bold bg-white text-slate-800 outline-none"
              >
                <option value="SEMUA">Semua Supplier PBF</option>
                {defectaSuppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Selection Quick Action */}
            <div className="flex items-center gap-2">
              {checkedMedicineIds.size > 0 && (
                <button
                  onClick={() => handleOpenReOrderForm()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Proses Re-Order ({checkedMedicineIds.size} Terpilih)</span>
                </button>
              )}
            </div>
          </div>

          {/* Defecta Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">
                Formula Order = Pemakaian Rata-Rata ({selectedPeriod.replace('bulan', ' Bulan').replace('tahun', ' Tahun')}) + Buffer Stok 10% - Sisa Stok
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Menampilkan {filteredDefecta.length} obat defecta
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-600 text-[10px]">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredDefecta.length > 0 && checkedMedicineIds.size === filteredDefecta.length}
                        onChange={handleToggleSelectAll}
                        className="rounded text-indigo-600 cursor-pointer w-4 h-4"
                        title="Pilih Semua"
                      />
                    </th>
                    <th className="p-3">Nama Obat & Barcode</th>
                    <th className="p-3 text-center">Kelompok SP (BPOM)</th>
                    <th className="p-3">Kemasan & Satuan</th>
                    <th className="p-3 text-center">Stok Fisik</th>
                    <th className="p-3 text-center">Batas Min</th>
                    <th className="p-3 text-center">Rata-rata Pemakaian</th>
                    <th className="p-3 text-center">Buffer 10%</th>
                    <th className="p-3 text-center bg-amber-50/70 text-amber-900">
                      Rekomendasi Order
                    </th>
                    <th className="p-3 text-right">Estimasi Biaya</th>
                    <th className="p-3">Supplier PBF</th>
                    <th className="p-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredDefecta.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-10 text-center text-slate-400 italic">
                        Tidak ada produk defecta yang memerlukan re-order saat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredDefecta.map((item) => {
                      const isChecked = checkedMedicineIds.has(item.id);
                      const groupMeta = getSPGroupMeta(item.spType);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 transition-colors ${isChecked ? 'bg-indigo-50/40' : ''}`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCheck(item.id)}
                              className="rounded text-indigo-600 cursor-pointer w-4 h-4"
                            />
                          </td>

                          <td className="p-3">
                            <strong className="text-slate-900 block">{item.name}</strong>
                            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                              <span>{item.barcode}</span>
                              {item.kekuatan && <span>· {item.kekuatan}</span>}
                            </div>
                          </td>

                          <td className="p-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${groupMeta.badgeClass}`}
                              title={groupMeta.title}
                            >
                              {groupMeta.code} ({groupMeta.label})
                            </span>
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            <span className="font-bold text-slate-800">{item.satuanBesar}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              1 {item.satuanBesar} = {item.rasioKonversi} {item.satuanKecil || item.unit}
                            </span>
                          </td>

                          <td className="p-3 text-center font-mono font-black text-rose-600 whitespace-nowrap">
                            {item.stock} {item.unit}
                          </td>

                          <td className="p-3 text-center font-mono text-slate-500 whitespace-nowrap">
                            {item.minStock} {item.unit}
                          </td>

                          <td className="p-3 text-center font-mono text-slate-700 whitespace-nowrap">
                            {item.pemakaianPeriode} {item.unit}
                          </td>

                          <td className="p-3 text-center font-mono text-slate-500 whitespace-nowrap">
                            +{item.buffer10} {item.unit}
                          </td>

                          <td className="p-3 text-center font-mono bg-amber-50/50 whitespace-nowrap">
                            <strong className="text-sky-900 text-xs block">
                              +{item.rekomendasiBesar} {item.satuanBesar}
                            </strong>
                            <span className="text-[10px] text-slate-500">
                              ({item.rekomendasiKecil} {item.satuanKecil || item.unit})
                            </span>
                          </td>

                          <td className="p-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            Rp {item.totalEstimasi.toLocaleString('id-ID')}
                          </td>

                          <td className="p-3 text-slate-600 text-[11px] whitespace-nowrap">
                            {item.supplier || 'PT Kimia Farma Trading'}
                          </td>

                          <td className="p-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleOpenReOrderForm(item)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                              title="Buat Pesanan Re-Order khusus item ini"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Re-Order</span>
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
        </div>
      )}

      {/* VIEW 2: PESANAN PEMBELIAN (RE-ORDER LIST) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
                Daftar Pesanan Pembelian & Surat Pesanan (SP) Resmi
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kelola pesanan pembelian, edit rincian item, hapus pesanan, dan cetak Surat Pesanan (SP) terpilah per kelompok BPOM.
              </p>
            </div>

            <button
              onClick={() => handleOpenReOrderForm()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Pesanan Pembelian Baru</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-600 text-[10px]">
                  <tr>
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3">No. PO & Tanggal</th>
                    <th className="p-3">Supplier PBF</th>
                    <th className="p-3">Rincian Item</th>
                    <th className="p-3 text-center">Kelompok SP Terpilah</th>
                    <th className="p-3 text-right">Total Estimasi</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center w-40">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        Belum ada pesanan pembelian yang dibuat. Klik tombol <strong>Re-Order</strong> untuk membuat pesanan baru.
                      </td>
                    </tr>
                  ) : (
                    purchaseOrders.map((po, idx) => {
                      // Distinct SP types in this PO
                      const spTypesInPo = Array.from(new Set(po.items.map((i) => i.spType)));

                      return (
                        <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>

                          <td className="p-3">
                            <strong className="font-mono text-slate-900 block">{po.poNumber}</strong>
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {po.date}
                            </span>
                          </td>

                          <td className="p-3">
                            <strong className="text-slate-900 block">{po.supplierName}</strong>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                              {po.supplierAddress || 'Distributor Resmi'}
                            </span>
                          </td>

                          <td className="p-3">
                            <span className="font-bold text-slate-800">{po.items.length} Macam Obat</span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[220px]">
                              {po.items.map((it) => `${it.name} (${it.qtyBesar} ${it.satuanBesar})`).join(', ')}
                            </span>
                          </td>

                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {spTypesInPo.map((type) => {
                                const meta = getSPGroupMeta(type);
                                return (
                                  <span
                                    key={type}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${meta.badgeClass}`}
                                    title={po.spNumbers[type] || meta.title}
                                  >
                                    {type}
                                  </span>
                                );
                              })}
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                              {spTypesInPo.length} Dokumen SP
                            </span>
                          </td>

                          <td className="p-3 text-right font-mono font-black text-slate-900">
                            Rp {po.totalEstimatedCost.toLocaleString('id-ID')}
                          </td>

                          <td className="p-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                po.status === 'Selesai'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : po.status === 'Dikirim'
                                  ? 'bg-sky-100 text-sky-800'
                                  : po.status === 'Diproses'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {po.status}
                            </span>
                          </td>

                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1 justify-center">
                              {/* Cetak SP Button */}
                              <button
                                onClick={() => setPrintModalPo(po)}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition inline-flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                                title="Cetak Surat Pesanan (SP)"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Cetak SP</span>
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenEditOrder(po)}
                                className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg transition cursor-pointer"
                                title="Edit Pesanan Pembelian"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeleteOrder(po.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition cursor-pointer"
                                title="Hapus Pesanan Pembelian"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* MODAL: FORM RE-ORDER / PESANAN PEMBELIAN */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 my-6">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  {editingOrderId ? 'Edit Pesanan Pembelian (Re-Order)' : 'Form Pesanan Pembelian Baru (Re-Order)'}
                </h3>
              </div>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto custom-scrollbar">
              {/* Header Details: Supplier with Autocomplete & Order Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                {/* Supplier Live Search */}
                <div className="relative sm:col-span-2" ref={supplierRef}>
                  <label className="block font-bold text-slate-700 mb-1">
                    Pilih Supplier / PBF *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Ketik untuk mencari Supplier / PBF..."
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setIsSupplierDropdownOpen(true);
                        setOrderForm((prev) => ({ ...prev, supplierName: e.target.value }));
                      }}
                      onFocus={() => setIsSupplierDropdownOpen(true)}
                      className="w-full p-2.5 border rounded-xl font-bold bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>

                  {isSupplierDropdownOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                      {filteredSuppliers.length === 0 ? (
                        <div className="p-3 text-slate-400 text-xs italic">
                          Tidak ditemukan supplier. Anda dapat menggunakan nama "{supplierSearch}" sebagai nama supplier baru.
                        </div>
                      ) : (
                        filteredSuppliers.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setOrderForm((prev) => ({
                                ...prev,
                                supplierId: s.id,
                                supplierName: s.name,
                                supplierAddress: s.address,
                                supplierPhone: s.phone,
                                supplierLicenseNo: s.licenseNo || ''
                              }));
                              setSupplierSearch(s.name);
                              setIsSupplierDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-slate-50 border-b border-slate-100 cursor-pointer transition flex items-center justify-between"
                          >
                            <div>
                              <strong className="text-slate-900 block text-xs">{s.name}</strong>
                              <span className="text-[10px] text-slate-500 block truncate">{s.address}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{s.phone}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {orderForm.supplierAddress && (
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Alamat: {orderForm.supplierAddress} · Kontak: {orderForm.supplierPhone}
                    </span>
                  )}
                </div>

                {/* Tanggal Pesanan */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Pesanan *</label>
                  <input
                    type="date"
                    required
                    value={orderForm.date}
                    onChange={(e) => setOrderForm({ ...orderForm, date: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-800 text-xs uppercase tracking-wide">
                    Daftar Produk Pesanan Pembelian ({orderForm.items.length} Item)
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsMedicineSearchOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Obat Lain</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-700">
                      <tr>
                        <th className="p-2.5 w-8 text-center">No</th>
                        <th className="p-2.5">Nama Obat</th>
                        <th className="p-2.5 text-center">Kelompok SP</th>
                        <th className="p-2.5 text-center">Stok Sisa</th>
                        <th className="p-2.5 text-center w-28 bg-amber-50 text-amber-900">Qty Pesan (Besar)</th>
                        <th className="p-2.5 text-center">Total Satuan</th>
                        <th className="p-2.5 text-right">Estimasi HNA</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                        <th className="p-2.5 text-center w-12">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {orderForm.items.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                            Belum ada obat dalam pesanan ini. Klik "+ Tambah Obat Lain" untuk memilih obat.
                          </td>
                        </tr>
                      ) : (
                        orderForm.items.map((it, idx) => {
                          const meta = getSPGroupMeta(it.spType);

                          return (
                            <tr key={it.id || idx} className="hover:bg-slate-50">
                              <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>

                              <td className="p-2.5">
                                <strong className="text-slate-900 block">{it.name}</strong>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {it.form} {it.kekuatan ? `· ${it.kekuatan}` : ''} ({it.satuanBesar} isi {it.rasioKonversi} {it.satuanKecil})
                                </span>
                              </td>

                              <td className="p-2.5 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${meta.badgeClass}`}>
                                  {meta.code}
                                </span>
                              </td>

                              <td className="p-2.5 text-center font-mono text-rose-600 font-bold">
                                {it.currentStock} {it.satuanKecil}
                              </td>

                              <td className="p-2.5 text-center bg-amber-50/50">
                                <div className="inline-flex items-center gap-1 justify-center">
                                  <input
                                    type="number"
                                    min={1}
                                    value={it.qtyBesar}
                                    onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)}
                                    className="w-16 p-1 text-center font-mono font-black border rounded-lg bg-white text-indigo-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                  />
                                  <span className="text-[10px] font-bold text-slate-600">{it.satuanBesar}</span>
                                </div>
                              </td>

                              <td className="p-2.5 text-center font-mono font-semibold text-slate-700">
                                {it.qtyKecil} {it.satuanKecil}
                              </td>

                              <td className="p-2.5 text-right font-mono text-slate-600">
                                Rp {it.estimatedHna.toLocaleString('id-ID')}
                              </td>

                              <td className="p-2.5 text-right font-mono font-black text-slate-900">
                                Rp {it.subtotal.toLocaleString('id-ID')}
                              </td>

                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOrderItem(idx)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                                  title="Hapus dari pesanan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

              {/* Automatic BPOM SP Grouping Analysis & Preview */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-indigo-950 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                    <ShieldAlert className="w-4 h-4 text-indigo-600" />
                    Analisis & Pemilahan Surat Pesanan Otomatis (Standar BPOM)
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-full border border-indigo-200">
                    Format No: ALF/jenis SP/BLN/THN/No. Urut
                  </span>
                </div>

                <p className="text-[11px] text-indigo-900/80">
                  Sistem menganalisis data master obat dan secara otomatis memilah pesanan ke dalam kelompok Surat Pesanan resmi yang terpisah sesuai regulasi BPOM RI:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['REG', 'ALK', 'PRE', 'OOT', 'PSI', 'NAR'] as SPGroupType[]).map((type) => {
                    const items = formSPGroups[type] || [];
                    const meta = getSPGroupMeta(type);
                    const currentMonthRoman = ROMAN_MONTHS[new Date(orderForm.date).getMonth()];
                    const currentYear = new Date(orderForm.date).getFullYear();
                    const demoSpNumber = `ALF/${type}/${currentMonthRoman}/${currentYear}/001`;

                    if (items.length === 0) return null;

                    return (
                      <div key={type} className="p-2.5 bg-white border border-indigo-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${meta.badgeClass}`}>
                            {type} ({meta.label})
                          </span>
                          <span className="text-[10px] font-bold text-indigo-900">{items.length} Obat</span>
                        </div>
                        <div className="text-[10px] font-mono font-bold text-slate-800 truncate" title={demoSpNumber}>
                          {demoSpNumber}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan Pesanan</label>
                <textarea
                  rows={2}
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  placeholder="Catatan pesanan, instruksi khusus pengiriman, dsb..."
                  className="w-full p-2.5 border rounded-xl font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                />
              </div>

              {/* Total & Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t sticky bottom-0 bg-white py-2">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Perkiraan Biaya:</span>
                  <strong className="text-base font-black text-indigo-950 font-mono">
                    Rp {orderForm.items.reduce((s, it) => s + it.subtotal, 0).toLocaleString('id-ID')}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOrderModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md uppercase tracking-wider text-xs cursor-pointer"
                  >
                    {editingOrderId ? 'Simpan Perubahan Pesanan' : 'Proses & Simpan Pesanan Pembelian'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CARI OBAT UNTUK DITAMBAHKAN KE PESANAN */}
      {isMedicineSearchOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex justify-between items-center">
              <h4 className="font-bold text-xs">Pilih Obat dari Master Data</h4>
              <button onClick={() => setIsMedicineSearchOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik nama obat / kategori / barcode..."
                  value={medicineSearchQuery}
                  onChange={(e) => setMedicineSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white outline-none"
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
                {medicines
                  .filter((m) => {
                    const q = medicineSearchQuery.toLowerCase();
                    return (
                      !q ||
                      m.name.toLowerCase().includes(q) ||
                      m.barcode.includes(q) ||
                      m.category.toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 15)
                  .map((med) => {
                    const spType = detectSPGroup(med);
                    const meta = getSPGroupMeta(spType);

                    return (
                      <div
                        key={med.id}
                        onClick={() => handleAddMedicineToOrder(med)}
                        className="p-2.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition"
                      >
                        <div>
                          <strong className="text-slate-900 block">{med.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Stok: {med.stock} {med.unit} · {med.satuanBesar} isi {med.rasioKonversi} {med.satuanKecil}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${meta.badgeClass}`}>
                          {meta.code}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CETAK SP RESMI TERPILAH PER KELOMPOK BPOM */}
      {printModalPo && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 my-6">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="font-extrabold text-sm uppercase tracking-wide">
                    Cetak Surat Pesanan (SP) Resmi BPOM
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Pesanan #{printModalPo.poNumber} · {printModalPo.items.length} Macam Obat
                  </span>
                </div>
              </div>
              <button onClick={() => setPrintModalPo(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto custom-scrollbar">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tujuan Pemesanan PBF:
                  </span>
                  <strong className="text-sm font-black text-slate-900 block">{printModalPo.supplierName}</strong>
                  <span className="text-[11px] text-slate-500">{printModalPo.supplierAddress || 'Distributor Resmi Farmasi'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tanggal Pesanan:
                  </span>
                  <strong className="text-xs font-mono font-bold text-slate-800">{printModalPo.date}</strong>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-800 mb-2">
                  Pilih Dokumen Surat Pesanan yang Ingin Dicetak:
                </p>

                <div className="space-y-3">
                  {/* Option 1: Cetak Seluruh Pesanan (Semua Obat yang Diinput) */}
                  <div className="p-3.5 border-2 border-indigo-500 bg-indigo-50/40 rounded-2xl shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white">
                          SEMUA OBAT
                        </span>
                        <div>
                          <strong className="text-slate-900 text-xs">Cetak Seluruh Pesanan Pembelian</strong>
                          <span className="text-[10px] text-slate-500 block">
                            Memuat seluruh {printModalPo.items.length} macam obat yang baru saja diinput
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          handlePrintSpecificSP(printModalPo, 'ALL');
                          setPrintModalPo(null);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak Seluruh Obat</span>
                      </button>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-indigo-100 max-h-36 overflow-y-auto">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Daftar Obat yang Dicetak:
                      </div>
                      <div className="divide-y divide-slate-100 font-medium">
                        {printModalPo.items.map((it, i) => (
                          <div key={it.id || i} className="py-1 flex items-center justify-between text-[11px]">
                            <span>
                              <strong className="text-slate-900">{it.name}</strong> {it.kekuatan && `(${it.kekuatan})`}
                            </span>
                            <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded">
                              {it.qtyBesar} {it.satuanBesar} ({it.qtyKecil} {it.satuanKecil})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Cetak Terpilah per Kelompok Regulasi BPOM */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Atau Cetak Surat Pesanan Khusus Terpilah (Aturan Regulasi BPOM):
                    </span>

                    <div className="space-y-2.5">
                      {(Array.from(new Set(printModalPo.items.map((i) => i.spType))) as SPGroupType[]).map((type) => {
                        const meta = getSPGroupMeta(type);
                        const itemsInGroup = printModalPo.items.filter((i) => i.spType === type);
                        const spNumber =
                          printModalPo.spNumbers[type] || generateSPNumber(type, 1, printModalPo.date);

                        return (
                          <div
                            key={type}
                            className="p-3 border border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-slate-50 transition space-y-2 bg-white"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${meta.badgeClass}`}>
                                    {type}
                                  </span>
                                  <strong className="text-slate-900 text-xs">{meta.title}</strong>
                                </div>
                                <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                  No. SP: <strong>{spNumber}</strong> ({itemsInGroup.length} Item Obat)
                                </p>
                              </div>

                              <button
                                onClick={() => {
                                  handlePrintSpecificSP(printModalPo, type);
                                  setPrintModalPo(null);
                                }}
                                className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                              >
                                <Printer className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Cetak SP {type}</span>
                              </button>
                            </div>

                            <div className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-600 flex flex-wrap gap-2">
                              {itemsInGroup.map((it) => (
                                <span key={it.id} className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                                  {it.name}: <strong>{it.qtyBesar} {it.satuanBesar}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end">
                <button
                  type="button"
                  onClick={() => setPrintModalPo(null)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
