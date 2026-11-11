import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  Plus,
  Search,
  Calendar,
  CheckCircle,
  Clock,
  X,
  Trash2,
  Receipt,
  Building,
  Phone,
  MapPin,
  Percent,
  Tag,
  ChevronDown,
  AlertCircle,
  Edit2,
  Printer
} from 'lucide-react';
import { PurchaseInvoice, PurchaseItem, Medicine, Supplier } from '../types';
import { openPrintWindow } from '../utils/printHelper';

interface PurchaseInvoiceViewProps {
  invoices: PurchaseInvoice[];
  medicines: Medicine[];
  suppliers?: Supplier[];
  onAddInvoice: (invoice: PurchaseInvoice, stockIncrements: { medId: string; qty: number }[]) => void;
  onUpdateInvoice?: (invoice: PurchaseInvoice) => void;
  onDeleteInvoice?: (id: string) => void;
  onProcessReturn?: (invoiceId: string, returnedItems: { medicineId: string; qty: number; unit: string; batchNo?: string; reason?: string }[]) => void;
  onUpdateInvoiceStatus: (id: string, status: 'Lunas' | 'Belum Lunas' | 'Sebagian') => void;
}

export const PurchaseInvoiceView: React.FC<PurchaseInvoiceViewProps> = ({
  invoices,
  medicines,
  suppliers = [],
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onProcessReturn,
  onUpdateInvoiceStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Calculate Due Date based on term
  const calculateDueDate = (dateStr: string, term: PurchaseInvoice['term']) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    let days = 30;
    if (term === 'Cash / COD') days = 0;
    else if (term === '14 Hari') days = 14;
    else if (term === '30 Hari') days = 30;
    else if (term === '60 Hari') days = 60;
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  };

  const initialDate = new Date().toISOString().split('T')[0];

  // Form State
  const [form, setForm] = useState({
    pbfName: '',
    invoiceNo: '',
    date: initialDate,
    term: '30 Hari' as PurchaseInvoice['term'],
    dueDate: calculateDueDate(initialDate, '30 Hari'),
    salesman: '',
    usePpn: true,
    diskonTotalNominal: 0,
    diskonTotalPersen: 0
  });

  // Supplier live search in modal
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [selectedSupplierObj, setSelectedSupplierObj] = useState<Supplier | null>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Items State
  const [items, setItems] = useState<PurchaseItem[]>([]);

  // Add Item Inputs
  const [selectedMedToAdd, setSelectedMedToAdd] = useState('');
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [isMedDropdownOpen, setIsMedDropdownOpen] = useState(false);
  const [qtyToAdd, setQtyToAdd] = useState(1);
  const [unitToAdd, setUnitToAdd] = useState('Box');
  const [priceToAdd, setPriceToAdd] = useState(0);
  const [discToAdd, setDiscToAdd] = useState(0); // Diskon Item (%)
  const [batchToAdd, setBatchToAdd] = useState('');
  const [expToAdd, setExpToAdd] = useState('');

  // Filtered suppliers based on live search
  const filteredSuppliers = suppliers.filter((s) => {
    if (!supplierSearch.trim()) return true;
    const q = supplierSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      (s.picName || '').toLowerCase().includes(q)
    );
  });

  // Handle supplier selection
  const handleSelectSupplier = (s: Supplier) => {
    setSelectedSupplierObj(s);
    setSupplierSearch(s.name);
    setForm((prev) => ({
      ...prev,
      pbfName: s.name,
      salesman: s.picName || prev.salesman
    }));
    setIsSupplierDropdownOpen(false);
  };

  // Handle date change -> auto updates due date
  const handleDateChange = (newDate: string) => {
    setForm((prev) => ({
      ...prev,
      date: newDate,
      dueDate: calculateDueDate(newDate, prev.term)
    }));
  };

  // Handle term change -> auto updates due date
  const handleTermChange = (newTerm: PurchaseInvoice['term']) => {
    setForm((prev) => ({
      ...prev,
      term: newTerm,
      dueDate: calculateDueDate(prev.date, newTerm)
    }));
  };

  // Calculations
  const grossTotal = items.reduce((acc, i) => acc + i.qty * i.price, 0);
  const totalItemDiscount = items.reduce((acc, i) => acc + (i.qty * i.price * (i.disc || 0)) / 100, 0);
  const subtotalAfterItemDisc = grossTotal - totalItemDiscount;
  const diskonTotalFaktur = form.diskonTotalNominal;
  const dpp = Math.max(0, subtotalAfterItemDisc - diskonTotalFaktur);
  const ppn = form.usePpn ? Math.round(dpp * 0.11) : 0;
  const totalTagihan = dpp + ppn;
  const totalDiscountAmount = totalItemDiscount + diskonTotalFaktur;

  // Handle Diskon Total Persen change
  const handleDiskonTotalPersenChange = (persen: number) => {
    const validPersen = Math.max(0, Math.min(100, persen));
    const calculatedNominal = Math.round((subtotalAfterItemDisc * validPersen) / 100);
    setForm((prev) => ({
      ...prev,
      diskonTotalPersen: validPersen,
      diskonTotalNominal: calculatedNominal
    }));
  };

  // Handle Diskon Total Nominal change
  const handleDiskonTotalNominalChange = (nominal: number) => {
    const validNominal = Math.max(0, Math.min(subtotalAfterItemDisc, nominal));
    const calculatedPersen = subtotalAfterItemDisc > 0 ? parseFloat(((validNominal / subtotalAfterItemDisc) * 100).toFixed(2)) : 0;
    setForm((prev) => ({
      ...prev,
      diskonTotalNominal: validNominal,
      diskonTotalPersen: calculatedPersen
    }));
  };

  const handleAddItem = () => {
    const med = medicines.find((m) => m.id === selectedMedToAdd);
    if (!med) {
      alert('Pilih obat terlebih dahulu dari hasil pencarian!');
      return;
    }

    const rawSubtotal = qtyToAdd * priceToAdd;
    const itemDiscAmount = (rawSubtotal * Math.max(0, Math.min(100, discToAdd))) / 100;
    const finalSubtotal = rawSubtotal - itemDiscAmount;

    setItems([
      ...items,
      {
        medicineId: med.id,
        name: med.name,
        qty: qtyToAdd,
        unit: unitToAdd || med.satuanBesar || 'Box',
        batchNo: batchToAdd || '-',
        expDate: expToAdd || '2028-12-31',
        price: priceToAdd,
        disc: discToAdd,
        subtotal: finalSubtotal
      }
    ]);

    // Reset inputs cleanly as requested
    setSelectedMedToAdd('');
    setMedSearchQuery('');
    setQtyToAdd(1);
    setUnitToAdd('Box');
    setPriceToAdd(0);
    setDiscToAdd(0);
    setBatchToAdd('');
    setExpToAdd('');
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleOpenEdit = (inv: PurchaseInvoice) => {
    if (inv.status === 'Lunas') {
      alert('Faktur dengan status Lunas tidak dapat diedit lagi!');
      return;
    }
    setEditingInvoiceId(inv.id);
    setForm({
      pbfName: inv.pbfName,
      invoiceNo: inv.invoiceNo,
      date: inv.date,
      term: inv.term,
      dueDate: inv.dueDate,
      salesman: inv.salesman,
      usePpn: inv.usePpn,
      diskonTotalNominal: inv.totalDiscountAmount || 0,
      diskonTotalPersen: 0
    });
    setItems(inv.items || []);
    setIsModalOpen(true);
  };

  const handlePrintRetur = (inv: PurchaseInvoice) => {
    try {
      localStorage.setItem('latisha_active_print_retur', JSON.stringify(inv));
      openPrintWindow('retur-pembelian', { invoiceId: inv.id });
    } catch (err) {
      console.error('Print retur error:', err);
      alert('Gagal membuka jendela cetak retur.');
    }
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pbfName.trim()) {
      alert('Nama Supplier / PBF wajib diisi!');
      return;
    }
    if (items.length === 0) {
      alert('Faktur minimal harus memiliki 1 barang obat!');
      return;
    }

    const invoiceData: PurchaseInvoice = {
      id: editingInvoiceId || `INV-PBF-${Date.now().toString().slice(-6)}`,
      pbfName: form.pbfName,
      invoiceNo: form.invoiceNo,
      date: form.date,
      dueDate: form.dueDate,
      salesman: form.salesman,
      term: form.term,
      usePpn: form.usePpn,
      items,
      grossDpp: grossTotal,
      totalDiscountAmount,
      dpp,
      ppn,
      totalTagihan,
      status: 'Belum Lunas',
      branchId: 'BR-01'
    };

    const increments = items.map((it) => {
      const med = medicines.find((m) => m.id === it.medicineId);
      const ratio = med?.rasioKonversi || 1;
      const multiplier = it.unit === med?.satuanBesar ? ratio : 1;
      return {
        medId: it.medicineId || '',
        qty: it.qty * multiplier
      };
    });

    if (editingInvoiceId && onUpdateInvoice) {
      onUpdateInvoice(invoiceData);
    } else {
      onAddInvoice(invoiceData, increments);
    }

    setIsModalOpen(false);
    setEditingInvoiceId(null);
    alert(`Faktur pembelian ${invoiceData.invoiceNo} dari ${invoiceData.pbfName} berhasil ${editingInvoiceId ? 'diperbarui' : 'dicatat'}!`);
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.pbfName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.salesman.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Truck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              Pembelian & Faktur PBF (Distributor)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Penerimaan faktur resmi dari Pedagang Besar Farmasi (PBF), pencatatan diskon bertingkat, PPN, dan penambahan stok digital otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              const now = new Date().toISOString().split('T')[0];
              setEditingInvoiceId(null);
              setForm({
                pbfName: '',
                invoiceNo: '',
                date: now,
                term: '30 Hari',
                dueDate: calculateDueDate(now, '30 Hari'),
                salesman: '',
                usePpn: true,
                diskonTotalNominal: 0,
                diskonTotalPersen: 0
              });
              setSelectedSupplierObj(null);
              setSupplierSearch('');
              setSelectedMedToAdd('');
              setMedSearchQuery('');
              setItems([]);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Input Faktur Pembelian PBF</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari berdasarkan No. Faktur PBF, Nama Distributor/PBF, atau Nama Salesman..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Total: <strong className="text-slate-800">{filteredInvoices.length}</strong> Faktur
        </span>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3">No. Faktur & PBF</th>
              <th className="p-3">Tgl & Jatuh Tempo</th>
              <th className="p-3">Salesman & Termin</th>
              <th className="p-3 text-center">Jml Item</th>
              <th className="p-3 text-right">DPP (Netto)</th>
              <th className="p-3 text-right">Total Tagihan</th>
              <th className="p-3 text-center">Status Bayar</th>
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="font-bold">Belum ada faktur pembelian yang tercatat.</p>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono">
                    <span className="font-extrabold text-teal-700 text-sm block">{inv.invoiceNo}</span>
                    <span className="text-xs text-slate-900 font-bold">{inv.pbfName}</span>
                  </td>

                  <td className="p-3 font-mono">
                    <div className="text-slate-700 font-bold">Tgl: {inv.date}</div>
                    <div className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Tempo: {inv.dueDate}</span>
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{inv.salesman}</div>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono mt-0.5">
                      {inv.term}
                    </span>
                  </td>

                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[11px]">
                      {inv.items.length} Item
                    </span>
                  </td>

                  <td className="p-3 text-right font-mono text-slate-600">
                    Rp {inv.dpp.toLocaleString('id-ID')}
                    {inv.totalDiscountAmount > 0 && (
                      <span className="block text-[9px] text-rose-500 font-normal">
                        Disc: -Rp {inv.totalDiscountAmount.toLocaleString('id-ID')}
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    <span className="text-sm">Rp {inv.totalTagihan.toLocaleString('id-ID')}</span>
                    <span className="block text-[9px] text-slate-400 font-normal">
                      {inv.usePpn ? '+ PPN 11%' : 'Non-PPN'}
                    </span>
                  </td>

                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        inv.status === 'Lunas'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'Sebagian'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inv.status === 'Lunas' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>{inv.status}</span>
                    </span>
                    {inv.status === 'Sebagian' && inv.remainingAmount !== undefined && (
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                        Sisa: Rp {inv.remainingAmount.toLocaleString('id-ID')}
                      </div>
                    )}
                  </td>

                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEdit(inv)}
                        disabled={inv.status === 'Lunas'}
                        title={inv.status === 'Lunas' ? 'Faktur Lunas tidak dapat diedit lagi' : 'Edit Faktur'}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                          inv.status === 'Lunas'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        }`}
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      {/* Hapus */}
                      <button
                        onClick={() => onDeleteInvoice && onDeleteInvoice(inv.id)}
                        disabled={inv.status === 'Lunas'}
                        title={inv.status === 'Lunas' ? 'Faktur Lunas tidak dapat dihapus' : 'Hapus Faktur'}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                          inv.status === 'Lunas'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 my-6">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-400" />
                <h3 className="font-extrabold text-sm uppercase">Input Faktur Pembelian PBF Baru</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-6 space-y-5 text-xs max-h-[82vh] overflow-y-auto custom-scrollbar">
              {/* Header Info: Supplier, Term, Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {/* 1. Supplier Selection with Live Search */}
                <div className="relative" ref={supplierDropdownRef}>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Nama Supplier PBF *</span>
                    <span className="text-[10px] text-teal-600 font-normal">Dari Submenu Supplier</span>
                  </label>
                  
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Ketik cari supplier / PBF..."
                      value={form.pbfName}
                      onChange={(e) => {
                        setForm({ ...form, pbfName: e.target.value });
                        setSupplierSearch(e.target.value);
                        setIsSupplierDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setSupplierSearch(form.pbfName);
                        setIsSupplierDropdownOpen(true);
                      }}
                      className="w-full p-2.5 pr-8 border rounded-xl font-bold bg-white text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                    <ChevronDown
                      onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                      className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 cursor-pointer"
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isSupplierDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                      {filteredSuppliers.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-xs">
                          Tidak ditemukan supplier "{supplierSearch}". Anda dapat tetap menggunakan nama ini atau menambahkannya di menu <strong>7. SETUP &gt; Supplier</strong>.
                        </div>
                      ) : (
                        filteredSuppliers.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => handleSelectSupplier(s)}
                            className="p-2.5 hover:bg-teal-50 cursor-pointer transition text-left"
                          >
                            <div className="font-bold text-slate-800 flex items-center justify-between">
                              <span>{s.name}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-teal-100 text-teal-700 rounded">
                                {s.id}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">{s.address}</div>
                            {s.phone && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                <span>{s.phone}</span>
                                {s.picName && <span className="ml-1 text-teal-600 font-medium">({s.picName})</span>}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Selected Supplier Details Snippet */}
                  {selectedSupplierObj && (
                    <div className="mt-1 text-[10px] text-slate-500 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedSupplierObj.address}</span>
                    </div>
                  )}
                </div>

                {/* 2. Nomor Faktur */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Faktur PBF *</label>
                  <input
                    type="text"
                    required
                    value={form.invoiceNo}
                    onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* 3. Tanggal Faktur */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Faktur *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* 4. Termin Pembayaran */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Termin Pembayaran *</label>
                  <select
                    value={form.term}
                    onChange={(e) => handleTermChange(e.target.value as PurchaseInvoice['term'])}
                    className="w-full p-2.5 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Cash / COD">Cash / COD (Tunai Saat Terima)</option>
                    <option value="14 Hari">Tempo 14 Hari</option>
                    <option value="30 Hari">Tempo 30 Hari</option>
                    <option value="60 Hari">Tempo 60 Hari</option>
                  </select>
                </div>

                {/* 5. Tanggal Jatuh Tempo (Otomatis Terisi Sesuai Termin) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Tanggal Jatuh Tempo *</span>
                    <span className="text-[10px] text-amber-600 font-bold">Otomatis Sesuai Termin</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-amber-50 text-amber-900 border-amber-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  <div className="text-[9px] text-slate-400 mt-1">
                    {form.term === 'Cash / COD'
                      ? 'Hari yang sama (0 hari)'
                      : `Dihitung otomatis +${form.term} dari tanggal faktur`}
                  </div>
                </div>

                {/* 6. Salesman / PIC */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Salesman / PIC</label>
                  <input
                    type="text"
                    value={form.salesman}
                    onChange={(e) => setForm({ ...form, salesman: e.target.value })}
                    placeholder="Nama Sales PBF"
                    className="w-full p-2.5 border rounded-xl bg-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Add Item Bar with Diskon Item */}
              <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-3">
                <span className="font-black text-teal-900 text-[11px] uppercase tracking-wider block flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-teal-600" />
                  Tambah Item Obat & Diskon Baris
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-3 relative">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Pilih Obat (Ketik untuk Cari)</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik nama obat..."
                        value={medSearchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMedSearchQuery(val);
                          setIsMedDropdownOpen(true);
                          const found = medicines.find(
                            (m) => m.name.toLowerCase() === val.toLowerCase()
                          );
                          if (found) {
                            setSelectedMedToAdd(found.id);
                            if (found.hpp) setPriceToAdd(found.hpp);
                            if (found.satuanBesar) setUnitToAdd(found.satuanBesar);
                          } else {
                            setSelectedMedToAdd('');
                          }
                        }}
                        onFocus={() => setIsMedDropdownOpen(true)}
                        className="w-full pl-3 pr-8 py-2 border rounded-xl font-bold bg-white text-xs outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>

                    {isMedDropdownOpen && (
                      <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {medicines
                          .filter((m) => {
                            if (!medSearchQuery.trim()) return true;
                            return m.name.toLowerCase().includes(medSearchQuery.toLowerCase());
                          })
                          .map((m) => (
                            <div
                              key={m.id}
                              onClick={() => {
                                setSelectedMedToAdd(m.id);
                                setMedSearchQuery(`${m.name} ${m.kekuatan ? `(${m.kekuatan})` : ''}`);
                                if (m.hpp) setPriceToAdd(m.hpp);
                                if (m.satuanBesar) setUnitToAdd(m.satuanBesar);
                                setIsMedDropdownOpen(false);
                              }}
                              className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-800 border-b border-slate-100 last:border-0 flex items-center justify-between"
                            >
                              <span>{m.name} {m.kekuatan ? `(${m.kekuatan})` : ''}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Stk: {m.stock} {m.unit}</span>
                            </div>
                          ))}
                        {medicines.filter((m) =>
                          m.name.toLowerCase().includes(medSearchQuery.toLowerCase())
                        ).length === 0 && (
                          <div className="p-3 text-slate-400 text-xs italic">
                            Tidak ditemukan obat "{medSearchQuery}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Qty */}
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={qtyToAdd}
                      onChange={(e) => setQtyToAdd(parseInt(e.target.value) || 1)}
                      className="w-full p-2 border rounded-xl font-bold bg-white font-mono text-center text-xs"
                    />
                  </div>

                  {/* Satuan Tersendiri */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Satuan</label>
                    <input
                      type="text"
                      placeholder="Box / Strip"
                      value={unitToAdd}
                      onChange={(e) => setUnitToAdd(e.target.value)}
                      className="w-full p-2 border rounded-xl font-bold bg-white text-xs"
                    />
                  </div>

                  {/* Harga Beli */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Harga @ (Rp)</label>
                    <input
                      type="number"
                      min={0}
                      value={priceToAdd}
                      onChange={(e) => setPriceToAdd(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border rounded-xl font-bold bg-white font-mono text-right text-xs"
                    />
                  </div>

                  {/* Diskon Item (%) */}
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Disc (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discToAdd}
                      onChange={(e) => setDiscToAdd(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border rounded-xl font-bold bg-white font-mono text-center text-xs"
                    />
                  </div>

                  {/* No. Batch */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">No. Batch</label>
                    <input
                      type="text"
                      placeholder="Batch"
                      value={batchToAdd}
                      onChange={(e) => setBatchToAdd(e.target.value)}
                      className="w-full p-2 border rounded-xl font-bold bg-white font-mono text-xs"
                    />
                  </div>

                  {/* ED Terpisah */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ED (Expired)</label>
                    <input
                      type="date"
                      value={expToAdd}
                      onChange={(e) => setExpToAdd(e.target.value)}
                      className="w-full p-2 border rounded-xl font-bold bg-white font-mono text-xs"
                    />
                  </div>

                  {/* Tombol Tambah */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-xs transition text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List with Diskon Item Column */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">No</th>
                      <th className="p-2.5">Obat / Sediaan</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-center">Batch & ED</th>
                      <th className="p-2.5 text-right">Harga Satuan</th>
                      <th className="p-2.5 text-center bg-teal-50 text-teal-800">Diskon Item (%)</th>
                      <th className="p-2.5 text-right bg-teal-50 text-teal-800">Nilai Diskon</th>
                      <th className="p-2.5 text-right">Subtotal Netto</th>
                      <th className="p-2.5 text-center w-12">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-400">
                          Belum ada item obat di faktur ini. Tambahkan obat menggunakan form di atas.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => {
                        const itemGross = it.qty * it.price;
                        const discVal = (itemGross * (it.disc || 0)) / 100;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-800">{it.name}</td>
                            <td className="p-2.5 text-center font-mono font-bold">
                              {it.qty} {it.unit}
                            </td>
                            <td className="p-2.5 text-center font-mono text-[11px]">
                              <div>{it.batchNo}</div>
                              <div className="text-[10px] text-slate-400">ED: {it.expDate}</div>
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-700">
                              Rp {it.price.toLocaleString('id-ID')}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-teal-700 bg-teal-50/40">
                              {it.disc || 0}%
                            </td>
                            <td className="p-2.5 text-right font-mono text-rose-600 bg-teal-50/40">
                              {discVal > 0 ? `-Rp ${discVal.toLocaleString('id-ID')}` : 'Rp 0'}
                            </td>
                            <td className="p-2.5 text-right font-mono font-black text-slate-900">
                              Rp {it.subtotal.toLocaleString('id-ID')}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1"
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

              {/* Summary Calculations with Diskon Total (Diskon Faktur) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {/* Left Side: Diskon Total / Diskon Faktur Controls */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Tag className="w-4 h-4 text-teal-600" />
                    <span>Diskon Total (Diskon Faktur Global)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Diskon tambahan pada keseluruhan faktur (di luar diskon per item).
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Diskon Total (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={form.diskonTotalPersen}
                          onChange={(e) => handleDiskonTotalPersenChange(parseFloat(e.target.value) || 0)}
                          className="w-full p-2 border rounded-xl font-bold bg-white text-center pr-6 text-xs"
                        />
                        <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Diskon Total Nominal (Rp)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={subtotalAfterItemDisc}
                        value={form.diskonTotalNominal}
                        onChange={(e) => handleDiskonTotalNominalChange(parseInt(e.target.value) || 0)}
                        className="w-full p-2 border rounded-xl font-bold bg-white font-mono text-right text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={form.usePpn}
                        onChange={(e) => setForm({ ...form, usePpn: e.target.checked })}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>Hitung PPN 11% Faktur (Faktur Pajak PBF)</span>
                    </label>
                  </div>
                </div>

                {/* Right Side: Total Calculation Breakdown */}
                <div className="space-y-1.5 font-mono text-xs bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Bruto (Gross):</span>
                    <span>Rp {grossTotal.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Total Diskon Item:</span>
                    <span>- Rp {totalItemDiscount.toLocaleString('id-ID')}</span>
                  </div>

                  {diskonTotalFaktur > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>Diskon Total Faktur ({form.diskonTotalPersen}%):</span>
                      <span>- Rp {diskonTotalFaktur.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-700 font-bold border-t pt-1">
                    <span>DPP (Dasar Pengenaan Pajak):</span>
                    <span>Rp {dpp.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>PPN 11%:</span>
                    <span>{form.usePpn ? `Rp ${ppn.toLocaleString('id-ID')}` : 'Rp 0 (Non-PPN)'}</span>
                  </div>

                  <div className="flex justify-between text-sm font-black border-t-2 border-slate-800 pt-2 text-slate-900">
                    <span>TOTAL TAGIHAN FAKTUR:</span>
                    <span className="text-teal-700">Rp {totalTagihan.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black shadow-md uppercase tracking-wider transition active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Simpan Faktur & Tambah Stok</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
