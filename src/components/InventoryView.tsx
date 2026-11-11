import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Download,
  Calendar,
  X,
  PackageCheck,
  ShieldAlert
} from 'lucide-react';
import { Medicine } from '../types';

interface InventoryViewProps {
  medicines: Medicine[];
  onAddMedicine: (med: Medicine) => void;
  onUpdateMedicine: (med: Medicine) => void;
  onDeleteMedicine: (id: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  medicines,
  onAddMedicine,
  onUpdateMedicine,
  onDeleteMedicine
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('SEMUA');
  const [stockStatusFilter, setStockStatusFilter] = useState('SEMUA');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    category: 'Obat Keras' as Medicine['category'],
    kelas: '',
    nappza: 'Non-NAPPZA',
    kekuatan: '',
    form: 'Tablet',
    satuanBesar: '',
    satuanKecil: '',
    rasioKonversi: 1,
    hnaBesar: 0,
    markupReguler: 30,
    sellPriceReguler: 0,
    markupKlinik: 25,
    sellPriceKlinik: 0,
    markupMitra: 20,
    sellPriceMitra: 0,
    minStock: 0,
    maxStock: 0,
    batchNo: '',
    stock: 0,
    expDate: '',
    rack: '',
    supplier: ''
  });

  // Calculate live HPP (+11% PPN)
  const hna = Number(form.hnaBesar) || 0;
  const ratio = Math.max(1, Number(form.rasioKonversi) || 1);
  const hppBesar = Math.round(hna * 1.11); // +11% PPN
  const hppKecil = Math.round(hppBesar / ratio);

  // Bidirectional updates: HNA change recalculates prices based on active markup percentages
  const updateHna = (newHna: number) => {
    const safeHna = Math.max(0, newHna);
    const safeRatio = Math.max(1, Number(form.rasioKonversi) || 1);
    const newHppKecil = Math.round(Math.round(safeHna * 1.11) / safeRatio);
    setForm((prev) => ({
      ...prev,
      hnaBesar: safeHna,
      sellPriceReguler: Math.round(newHppKecil * (1 + (Number(prev.markupReguler) || 0) / 100)),
      sellPriceKlinik: Math.round(newHppKecil * (1 + (Number(prev.markupKlinik) || 0) / 100)),
      sellPriceMitra: Math.round(newHppKecil * (1 + (Number(prev.markupMitra) || 0) / 100)),
    }));
  };

  // Changing ratio updates small unit HPP and recalculates tier selling prices
  const updateRasio = (newRatio: number) => {
    const safeRatio = Math.max(1, newRatio);
    const safeHna = Math.max(0, Number(form.hnaBesar) || 0);
    const newHppKecil = Math.round(Math.round(safeHna * 1.11) / safeRatio);
    setForm((prev) => ({
      ...prev,
      rasioKonversi: safeRatio,
      sellPriceReguler: Math.round(newHppKecil * (1 + (Number(prev.markupReguler) || 0) / 100)),
      sellPriceKlinik: Math.round(newHppKecil * (1 + (Number(prev.markupKlinik) || 0) / 100)),
      sellPriceMitra: Math.round(newHppKecil * (1 + (Number(prev.markupMitra) || 0) / 100)),
    }));
  };

  // Changing % Markup calculates Harga Jual: Harga Jual = HPP * (1 + markup/100)
  const handleMarkupChange = (tier: 'reguler' | 'klinik' | 'mitra', markupVal: number) => {
    const currentHppKecil = hppKecil;
    const newPrice = Math.round(currentHppKecil * (1 + markupVal / 100));

    if (tier === 'reguler') {
      setForm((prev) => ({ ...prev, markupReguler: markupVal, sellPriceReguler: newPrice }));
    } else if (tier === 'klinik') {
      setForm((prev) => ({ ...prev, markupKlinik: markupVal, sellPriceKlinik: newPrice }));
    } else {
      setForm((prev) => ({ ...prev, markupMitra: markupVal, sellPriceMitra: newPrice }));
    }
  };

  // Changing Harga Jual calculates % Markup: % Markup = ((Harga Jual - HPP) / HPP) * 100
  const handlePriceChange = (tier: 'reguler' | 'klinik' | 'mitra', priceVal: number) => {
    const currentHppKecil = hppKecil;
    let newMarkup = 0;
    if (currentHppKecil > 0) {
      newMarkup = Math.round(((priceVal - currentHppKecil) / currentHppKecil) * 1000) / 10;
    }

    if (tier === 'reguler') {
      setForm((prev) => ({ ...prev, sellPriceReguler: priceVal, markupReguler: newMarkup }));
    } else if (tier === 'klinik') {
      setForm((prev) => ({ ...prev, sellPriceKlinik: priceVal, markupKlinik: newMarkup }));
    } else {
      setForm((prev) => ({ ...prev, sellPriceMitra: priceVal, markupMitra: newMarkup }));
    }
  };

  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.batchNo.toLowerCase().includes(q) ||
        (m.kelas && m.kelas.toLowerCase().includes(q)) ||
        (m.nappza && m.nappza.toLowerCase().includes(q)) ||
        (m.kekuatan && m.kekuatan.toLowerCase().includes(q)) ||
        m.barcode.includes(q);

      const matchCat = categoryFilter === 'SEMUA' || m.category === categoryFilter;

      let matchStock = true;
      if (stockStatusFilter === 'MENIPIS') {
        matchStock = m.stock <= m.minStock;
      } else if (stockStatusFilter === 'EXP_NEAR') {
        const expTime = new Date(m.expDate).getTime();
        const threeMonthsFromNow = Date.now() + 90 * 86400000;
        matchStock = expTime <= threeMonthsFromNow;
      }

      return matchSearch && matchCat && matchStock;
    });
  }, [medicines, searchTerm, categoryFilter, stockStatusFilter]);

  const handleOpenAdd = () => {
    setEditId(null);
    setForm({
      name: '',
      category: 'Obat Keras',
      kelas: '',
      nappza: 'Non-NAPPZA',
      kekuatan: '',
      form: 'Tablet',
      satuanBesar: '',
      satuanKecil: '',
      rasioKonversi: 1,
      hnaBesar: 0,
      markupReguler: 30,
      sellPriceReguler: 0,
      markupKlinik: 25,
      sellPriceKlinik: 0,
      markupMitra: 20,
      sellPriceMitra: 0,
      minStock: 0,
      maxStock: 0,
      batchNo: '',
      stock: 0,
      expDate: '',
      rack: '',
      supplier: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Medicine) => {
    setEditId(m.id);
    const ratio = m.rasioKonversi || 1;
    const hna = m.hnaBesar || Math.round(((m.hpp || 0) * ratio) / 1.11);
    const hpp = m.hpp || Math.round(Math.round(hna * 1.11) / ratio);

    const calcMarkup = (price: number, baseHpp: number, fallback: number) => {
      if (baseHpp > 0 && price > 0) {
        return Math.round(((price - baseHpp) / baseHpp) * 1000) / 10;
      }
      return fallback;
    };

    const hppBesarFromMed = Math.round(hna * 1.11);
    const sellReguler = m.sellPrice || Math.round(hpp * 1.3);
    const sellKlinik = m.sellPriceKlinik || Math.round(hpp * 1.25);
    const rawSellMitra = m.sellPriceMitra || Math.round(hpp * 1.2);
    // Normalize if rawSellMitra was stored as satuanBesar
    const sellMitraKecil =
      ratio > 1 && rawSellMitra >= hppBesarFromMed * 0.75
        ? Math.round(rawSellMitra / ratio)
        : rawSellMitra;

    setForm({
      name: m.name,
      category: m.category,
      kelas: m.kelas || 'Analgesik / Antipiretik',
      nappza: m.nappza || 'Non-NAPPZA',
      kekuatan: m.kekuatan || '',
      form: m.form,
      satuanBesar: m.satuanBesar || 'Box',
      satuanKecil: m.satuanKecil || m.unit || 'Strip',
      rasioKonversi: ratio,
      hnaBesar: hna,
      markupReguler:
        typeof m.markupReguler === 'number' ? m.markupReguler : calcMarkup(sellReguler, hpp, 30),
      sellPriceReguler: sellReguler,
      markupKlinik:
        typeof m.markupKlinik === 'number' ? m.markupKlinik : calcMarkup(sellKlinik, hpp, 25),
      sellPriceKlinik: sellKlinik,
      markupMitra:
        typeof m.markupMitra === 'number' ? m.markupMitra : calcMarkup(sellMitraKecil, hpp, 20),
      sellPriceMitra: sellMitraKecil,
      minStock: m.minStock,
      maxStock: m.maxStock,
      batchNo: m.batchNo,
      stock: m.stock,
      expDate: m.expDate,
      rack: m.rack,
      supplier: m.supplier
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      alert('Nama obat wajib diisi!');
      return;
    }

    const ratioVal = Math.max(1, Number(form.rasioKonversi) || 1);
    const hnaVal = Number(form.hnaBesar) || 0;
    const hppBesarVal = Math.round(hnaVal * 1.11);
    const hppKecilVal = Math.round(hppBesarVal / ratioVal);

    const payload: Medicine = {
      id: editId || `OBT-${String(medicines.length + 1).padStart(3, '0')}`,
      barcode: `899123456${String(medicines.length + 1).padStart(3, '0')}`,
      name: form.name,
      category: form.category,
      kelas: form.kelas || 'Umum',
      nappza: form.nappza || 'Non-NAPPZA',
      kekuatan: form.kekuatan || '-',
      form: form.form,
      unit: form.satuanKecil,
      satuanKecil: form.satuanKecil,
      satuanBesar: form.satuanBesar,
      rasioKonversi: ratioVal,
      hnaBesar: hnaVal,
      hpp: hppKecilVal,
      sellPrice: Number(form.sellPriceReguler) || 0,
      sellPriceKlinik: Number(form.sellPriceKlinik) || 0,
      sellPriceMitra: Number(form.sellPriceMitra) || 0,
      markupReguler: Number(form.markupReguler) || 0,
      markupKlinik: Number(form.markupKlinik) || 0,
      markupMitra: Number(form.markupMitra) || 0,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 10,
      maxStock: Number(form.maxStock) || 100,
      batchNo: form.batchNo,
      expDate: form.expDate,
      rack: form.rack,
      supplier: form.supplier,
      branchId: 'BR-01'
    };

    if (editId) {
      onUpdateMedicine(payload);
    } else {
      onAddMedicine(payload);
    }

    setIsModalOpen(false);
  };

  const exportCSV = () => {
    const headers = 'ID,Barcode,Nama,Kekuatan,Kategori,KelasTerapi,NAPPZA,Satuan,Stok,MinStok,HPP,HargaJual,Batch,ExpDate\n';
    const rows = medicines
      .map(
        (m) =>
          `"${m.id}","${m.barcode}","${m.name}","${m.kekuatan || ''}","${m.category}","${m.kelas || 'Umum'}","${m.nappza || 'Non-NAPPZA'}","${m.unit}",${m.stock},${m.minStock},${m.hpp},${m.sellPrice},"${m.batchNo}","${m.expDate}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Master_Stok_Latisha_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const lowMarkupMedicines = useMemo(() => {
    return medicines.filter((m) => {
      const medRatio = Math.max(1, m.rasioKonversi || 1);
      const effectiveHppBesar = Math.round(
        (m.hnaBesar || ((m.hpp || 0) * medRatio) / 1.11) * 1.11
      );
      const effectiveHppKecil = m.hpp || Math.round(effectiveHppBesar / medRatio);
      const isMitraAlreadyBesar =
        medRatio > 1 && (m.sellPriceMitra || 0) >= effectiveHppBesar * 0.75;
      const sellMitraKecil = isMitraAlreadyBesar
        ? Math.round((m.sellPriceMitra || 0) / medRatio)
        : m.sellPriceMitra || 0;

      const resolveM = (saved?: number, price?: number) => {
        if (typeof saved === 'number' && !isNaN(saved)) return saved;
        if (effectiveHppKecil > 0 && price && price > 0) {
          return ((price - effectiveHppKecil) / effectiveHppKecil) * 100;
        }
        return 0;
      };

      const mReg = resolveM(m.markupReguler, m.sellPrice);
      const mKli = resolveM(m.markupKlinik, m.sellPriceKlinik);
      const mMit = resolveM(m.markupMitra, sellMitraKecil);

      return mReg < 10 || mKli < 10 || mMit < 10;
    });
  }, [medicines]);

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari obat (Nama / Barcode / Batch)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 border rounded-xl text-xs font-bold bg-white text-slate-700 outline-none"
          >
            <option value="SEMUA">Semua Golongan</option>
            <option value="Obat Bebas">Obat Bebas</option>
            <option value="Obat Bebas Terbatas">Obat Bebas Terbatas</option>
            <option value="Obat Keras">Obat Keras</option>
            <option value="Alat Kesehatan">Alat Kesehatan</option>
          </select>

          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="p-2 border rounded-xl text-xs font-bold bg-white text-slate-700 outline-none"
          >
            <option value="SEMUA">Semua Status Stok</option>
            <option value="MENIPIS">Stok Kritis / Defecta (≤ Min)</option>
            <option value="EXP_NEAR">Expired Dekat (&lt; 3 Bulan)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Obat Baru</span>
          </button>
        </div>

        {/* Notifikasi Indikator Markup <10% (Prioritas Alarm) */}
        <div className="w-full pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          {lowMarkupMedicines.length > 0 ? (
            <div className="w-full p-2.5 bg-rose-50 border-2 border-rose-500 rounded-xl flex items-center gap-2 text-rose-700 font-extrabold animate-pulse">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-rose-600 font-black tracking-wide uppercase mr-2">
                  ADA OBAT MARKUP &lt;10%:
                </span>
                <span className="text-rose-900 font-mono text-xs underline">
                  {lowMarkupMedicines.map((m) => m.name).join(', ')}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[10px] uppercase font-mono font-black shrink-0">
                {lowMarkupMedicines.length} Produk
              </span>
            </div>
          ) : (
            <div className="w-full p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Indikator Markup: Semua produk Obat Memiliki Markup ≥ 10% (Aman)</span>
            </div>
          )}
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-600 text-[10px]">
            <tr>
              <th className="p-3 w-20 text-center font-bold">Aksi</th>
              <th className="p-3">Nama Produk</th>
              <th className="p-3 text-center">Kekuatan</th>
              <th className="p-3">Kategori / Golongan</th>
              <th className="p-3">Kelas Terapi</th>
              <th className="p-3 text-center">NAPPZA</th>
              <th className="p-3">Satuan & Konversi</th>
              <th className="p-3 text-right">HNA (Besar)</th>
              <th className="p-3 text-right">HPP (+11%)</th>
              <th className="p-3 text-right">Jual Reguler</th>
              <th className="p-3 text-right text-indigo-700">Jual Klinik</th>
              <th className="p-3 text-right text-emerald-700">Jual Mitra</th>
              <th className="p-3 text-center">Batch & Exp (FEFO)</th>
              <th className="p-3 text-center">Stok</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredMedicines.map((m) => {
              const isLowStock = m.stock <= m.minStock;
              const isNearExp = new Date(m.expDate).getTime() <= Date.now() + 90 * 86400000;

              const medRatio = Math.max(1, m.rasioKonversi || 1);
              const effectiveHppBesar = Math.round(
                (m.hnaBesar || ((m.hpp || 0) * medRatio) / 1.11) * 1.11
              );
              const effectiveHppKecil = m.hpp || Math.round(effectiveHppBesar / medRatio);

              // Nominal Harga Satuan Besar untuk Kolom Jual Mitra
              const isMitraAlreadyBesar =
                medRatio > 1 && (m.sellPriceMitra || 0) >= effectiveHppBesar * 0.75;
              const jualMitraBesar = isMitraAlreadyBesar
                ? m.sellPriceMitra
                : Math.round((m.sellPriceMitra || 0) * medRatio);
              const sellMitraKecilForMarkup = isMitraAlreadyBesar
                ? Math.round((m.sellPriceMitra || 0) / medRatio)
                : m.sellPriceMitra || 0;

              const resolveMarkup = (
                savedMarkup: number | undefined,
                priceKecil: number,
                baseHpp: number
              ): number => {
                if (typeof savedMarkup === 'number' && !isNaN(savedMarkup)) {
                  return Math.round(savedMarkup * 10) / 10;
                }
                if (baseHpp > 0 && priceKecil > 0) {
                  return Math.round(((priceKecil - baseHpp) / baseHpp) * 1000) / 10;
                }
                return 0;
              };

              const markupRegulerVal = resolveMarkup(m.markupReguler, m.sellPrice, effectiveHppKecil);
              const markupKlinikVal = resolveMarkup(m.markupKlinik, m.sellPriceKlinik, effectiveHppKecil);
              const markupMitraVal = resolveMarkup(
                m.markupMitra,
                sellMitraKecilForMarkup,
                effectiveHppKecil
              );

              const renderMarkupBadge = (markupVal: number) => {
                const formatted = Number.isInteger(markupVal)
                  ? `${markupVal}%`
                  : `${markupVal.toFixed(1).replace(/\.0$/, '')}%`;

                if (markupVal < 10) {
                  return (
                    <div
                      className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300"
                      title="Alert: Markup rendah (< 10%)"
                    >
                      <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                      <span>{formatted}</span>
                    </div>
                  );
                }
                if (markupVal <= 20) {
                  return (
                    <div
                      className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-700 border border-blue-300"
                      title="Markup standar (10% - 20%)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                      <span>{formatted}</span>
                    </div>
                  );
                }
                return (
                  <div
                    className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-300"
                    title="Markup optimal (> 20%)"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>{formatted}</span>
                  </div>
                );
              };

              return (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 justify-center">
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="p-1.5 text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition inline-flex items-center cursor-pointer"
                        title={`Edit obat ${m.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus data obat "${m.name}" (${m.id})?`)) {
                            onDeleteMedicine(m.id);
                          }
                        }}
                        className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition inline-flex items-center cursor-pointer"
                        title={`Hapus obat ${m.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  <td className="p-3">
                    <strong className="text-slate-900 block">{m.name}</strong>
                    <span className="font-mono text-[10px] text-slate-400">{m.barcode}</span>
                  </td>

                  <td className="p-3 text-center whitespace-nowrap">
                    <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                      {m.kekuatan || '-'}
                    </span>
                  </td>

                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        m.category === 'Obat Keras'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : m.category === 'Obat Bebas Terbatas'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : m.category === 'Obat Bebas'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m.category}
                    </span>
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 inline-block">
                      {m.kelas || 'Umum'}
                    </span>
                  </td>

                  <td className="p-3 text-center whitespace-nowrap">
                    {m.nappza && m.nappza !== 'Non-NAPPZA' ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                        m.nappza === 'Narkotik'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : m.nappza === 'Psikotropik'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : m.nappza === 'OOT'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-orange-100 text-orange-800 border border-orange-300'
                      }`}>
                        <ShieldAlert className="w-3 h-3" />
                        {m.nappza}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Bukan NAPPZA</span>
                    )}
                  </td>

                  <td className="p-3">
                    <span className="font-bold text-slate-800">{m.satuanBesar}</span> / {m.satuanKecil}
                    <span className="block text-[10px] text-slate-400 font-mono">
                      1 : {m.rasioKonversi}
                    </span>
                  </td>

                  <td className="p-3 text-right font-mono text-slate-500">
                    Rp {m.hnaBesar.toLocaleString('id-ID')}
                  </td>

                  <td className="p-3 text-right font-mono font-bold text-amber-700">
                    Rp {m.hpp.toLocaleString('id-ID')}
                  </td>

                  <td className="p-3 text-right font-mono whitespace-nowrap">
                    <div className="font-black text-slate-900">
                      Rp {m.sellPrice.toLocaleString('id-ID')}
                    </div>
                    {renderMarkupBadge(markupRegulerVal)}
                  </td>

                  <td className="p-3 text-right font-mono whitespace-nowrap">
                    <div className="font-bold text-indigo-700">
                      Rp {m.sellPriceKlinik.toLocaleString('id-ID')}
                    </div>
                    {renderMarkupBadge(markupKlinikVal)}
                  </td>

                  <td className="p-3 text-right font-mono whitespace-nowrap">
                    <div className="font-bold text-emerald-700">
                      Rp {jualMitraBesar.toLocaleString('id-ID')}
                    </div>
                    {renderMarkupBadge(markupMitraVal)}
                  </td>

                  <td className="p-3 text-center font-mono">
                    <span className="block text-slate-700 font-bold">{m.batchNo}</span>
                    <span
                      className={`text-[10px] font-bold ${
                        isNearExp ? 'text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200' : 'text-slate-400'
                      }`}
                    >
                      {m.expDate}
                    </span>
                  </td>

                  <td className="p-3 text-center">
                    <span
                      className={`inline-block font-black font-mono px-2 py-0.5 rounded-full text-xs ${
                        isLowStock
                          ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {m.stock} {m.unit}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 my-6">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-extrabold text-sm uppercase tracking-wide">
                {editId ? 'Edit Master Data Obat' : 'Tambah Obat Baru ke Master List'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Produk Obat *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Paracetamol 500mg"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori / Golongan *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as Medicine['category'] })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-white"
                  >
                    <option value="Obat Bebas">Obat Bebas (Hijau)</option>
                    <option value="Obat Bebas Terbatas">Obat Bebas Terbatas (Biru)</option>
                    <option value="Obat Keras">Obat Keras (Merah / K)</option>
                    <option value="Alat Kesehatan">Alat Kesehatan</option>
                    <option value="Herbal / Suplemen">Herbal / Suplemen</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kelas Terapi *</label>
                  <input
                    type="text"
                    list="kelasTerapiList"
                    required
                    placeholder="Contoh: Analgesik / Antipiretik, Antibiotik, dll"
                    value={form.kelas}
                    onChange={(e) => setForm({ ...form, kelas: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                  <datalist id="kelasTerapiList">
                    <option value="Analgesik / Antipiretik" />
                    <option value="Antibiotik / Antimikroba" />
                    <option value="Antiinflamasi / NSAID" />
                    <option value="Antihipertensi (CCB / ACE-I / ARB)" />
                    <option value="Antidiabetes Oral" />
                    <option value="Antihistamin / Antialergi" />
                    <option value="Antitusif & Ekspektoran (Batuk / Flu)" />
                    <option value="Gastrointestinal (Antasida / PPI / H2 Blocker)" />
                    <option value="Antikolesterol / Statin" />
                    <option value="Kortikosteroid" />
                    <option value="Sedatif / Anxiolitik" />
                    <option value="Vitamin, Mineral & Suplemen" />
                    <option value="Herbal & Fitofarmaka" />
                    <option value="Alat Kesehatan Habis Pakai" />
                  </datalist>
                </div>
              </div>

              {/* Rincian Kekuatan Sediaan & Kategori Pengawasan NAPPZA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kekuatan Sediaan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 500 mg, 10 mg, 0.5 mg, 125 mg/5ml, 100 ml"
                    value={form.kekuatan}
                    onChange={(e) => setForm({ ...form, kekuatan: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Dosis zat aktif atau volume netto sediaan obat
                  </span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori NAPPZA *</label>
                  <select
                    value={form.nappza}
                    onChange={(e) => setForm({ ...form, nappza: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="Non-NAPPZA">Non-NAPPZA (Bukan NAPPZA)</option>
                    <option value="Prekursor">Prekursor Farmasi (Wajib SIPNAP)</option>
                    <option value="OOT">OOT - Obat-Obat Tertentu (BPOM)</option>
                    <option value="Psikotropik">Psikotropik (Wajib SIPNAP)</option>
                    <option value="Narkotik">Narkotik (Wajib SIPNAP)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Klasifikasi pelaporan regulasi BPOM & SIPNAP Kemenkes
                  </span>
                </div>
              </div>

              {/* Satuan & Konversi */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="font-black text-slate-800 text-[11px] uppercase tracking-wider block">
                  Satuan & Aturan Konversi
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Satuan Besar</label>
                    <input
                      type="text"
                      placeholder="Contoh: Box / Karton"
                      value={form.satuanBesar}
                      onChange={(e) => setForm({ ...form, satuanBesar: e.target.value })}
                      className="w-full p-2 border rounded-xl font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Satuan Terkecil</label>
                    <input
                      type="text"
                      placeholder="Contoh: Strip / Tablet / Botol"
                      value={form.satuanKecil}
                      onChange={(e) => setForm({ ...form, satuanKecil: e.target.value })}
                      className="w-full p-2 border rounded-xl font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Rasio Konversi</label>
                    <input
                      type="number"
                      min={1}
                      value={form.rasioKonversi}
                      onChange={(e) => updateRasio(parseInt(e.target.value) || 1)}
                      className="w-full p-2 border rounded-xl font-mono font-bold bg-white text-sky-700"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Markup - div:nth-of-type(4) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <span className="font-black text-slate-800 text-[11px] uppercase tracking-wider block">
                      Perhitungan Harga: HNA, HPP (+11%), & Harga Jual Bertingkat
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Ubah % Markup untuk menghitung Harga Jual otomatis, atau isi Harga Jual untuk menghitung % Markup otomatis terhadap HPP.
                    </span>
                  </div>
                  <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2.5 py-1 rounded-full border border-sky-200">
                    PPN 11% Standar
                  </span>
                </div>

                {/* Kolom 1 (HNA) & Kolom 2 (HPP Otomatis Terisi) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Kolom 1: HNA (satuan Terbesar) */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-white inline-flex items-center justify-center text-[10px] font-black">
                          1
                        </span>
                        HNA (Satuan Terbesar: {form.satuanBesar || 'Box'}) *
                      </label>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Harga Netto Apotek
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-xs">Rp</span>
                      <input
                        type="number"
                        min={0}
                        required
                        value={form.hnaBesar}
                        onChange={(e) => updateHna(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full pl-9 pr-3 py-2 border rounded-xl font-mono font-bold text-slate-900 text-sm bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="0"
                      />
                    </div>

                    <div className="text-[10px] text-slate-500 flex justify-between pt-0.5">
                      <span>Rasio: 1 {form.satuanBesar || 'Box'} = {form.rasioKonversi} {form.satuanKecil || 'Strip'}</span>
                      <span className="font-mono font-semibold text-slate-700">
                        HNA/{form.satuanKecil || 'Satuan'}: Rp {Math.round((Number(form.hnaBesar) || 0) / Math.max(1, Number(form.rasioKonversi) || 1)).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Kolom 2: HPP (otomatis terisi diperoleh dari perhitungan HNA+11%) */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-600 text-white inline-flex items-center justify-center text-[10px] font-black">
                          2
                        </span>
                        HPP (Otomatis: HNA + 11%)
                      </label>
                      <span className="text-[10px] font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-300">
                        Otomatis Terisi
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-white rounded-lg border border-amber-200">
                        <span className="text-[10px] text-amber-800/80 font-bold block">
                          HPP per {form.satuanBesar || 'Box'}
                        </span>
                        <div className="font-mono font-black text-amber-900 text-sm">
                          Rp {hppBesar.toLocaleString('id-ID')}
                        </div>
                        <span className="text-[9px] text-slate-400 block font-mono">
                          = Rp {Number(form.hnaBesar).toLocaleString('id-ID')} + 11%
                        </span>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-amber-300 ring-1 ring-amber-300">
                        <span className="text-[10px] text-amber-800 font-bold block">
                          HPP per {form.satuanKecil || 'Strip'} (Dasar Jual)
                        </span>
                        <div className="font-mono font-black text-amber-900 text-sm">
                          Rp {hppKecil.toLocaleString('id-ID')}
                        </div>
                        <span className="text-[9px] text-slate-400 block font-mono">
                          = HPP {form.satuanBesar || 'Box'} ÷ {form.rasioKonversi}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-amber-800 flex items-center justify-between pt-0.5 font-medium">
                      <span>PPN 11%: Rp {Math.round((Number(form.hnaBesar) || 0) * 0.11).toLocaleString('id-ID')}</span>
                      <span className="font-bold text-amber-900">Perhitungan Otomatis</span>
                    </div>
                  </div>
                </div>

                {/* Kolom 3: Harga Jual (masing-masing memiliki kolom markup) */}
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-sky-600 text-white inline-flex items-center justify-center text-[10px] font-black">
                        3
                      </span>
                      Harga Jual (Masing-masing memiliki kolom % Markup & Harga Jual)
                    </label>
                    <span className="text-[10px] text-slate-500 italic">
                      * Mengatur % Markup menghitung Harga Jual, atau sebaliknya mengisi Harga Jual otomatis menghitung % Markup
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* 1. Jual Reguler (OTC) */}
                    <div className="p-3 bg-white border-2 border-sky-200 rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-center justify-between border-b border-sky-100 pb-1.5">
                        <span className="text-xs font-black text-sky-900">1. Jual Reguler (OTC)</span>
                        <span className="text-[9px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">Umum</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            % Markup
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              value={form.markupReguler}
                              onChange={(e) => handleMarkupChange('reguler', parseFloat(e.target.value) || 0)}
                              className="w-full pl-2 pr-6 py-1.5 border rounded-lg font-mono font-bold text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Harga Jual (Rp)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={form.sellPriceReguler}
                            onChange={(e) => handlePriceChange('reguler', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border rounded-lg font-mono font-black text-xs bg-white text-sky-900 focus:ring-1 focus:ring-sky-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-1.5 bg-slate-50 rounded-lg flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">Margin/{form.satuanKecil || 'Satuan'}:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          +Rp {Math.max(0, (Number(form.sellPriceReguler) || 0) - hppKecil).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* 2. Jual Pasien Klinik */}
                    <div className="p-3 bg-white border-2 border-indigo-200 rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                        <span className="text-xs font-black text-indigo-900">2. Jual Pasien Klinik</span>
                        <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">Klinik</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            % Markup
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              value={form.markupKlinik}
                              onChange={(e) => handleMarkupChange('klinik', parseFloat(e.target.value) || 0)}
                              className="w-full pl-2 pr-6 py-1.5 border rounded-lg font-mono font-bold text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Harga Jual (Rp)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={form.sellPriceKlinik}
                            onChange={(e) => handlePriceChange('klinik', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border rounded-lg font-mono font-black text-xs bg-white text-indigo-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-1.5 bg-slate-50 rounded-lg flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">Margin/{form.satuanKecil || 'Satuan'}:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          +Rp {Math.max(0, (Number(form.sellPriceKlinik) || 0) - hppKecil).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* 3. Jual Khusus Mitra */}
                    <div className="p-3 bg-white border-2 border-emerald-200 rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                        <span className="text-xs font-black text-emerald-900">3. Jual Khusus Mitra</span>
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Mitra</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            % Markup
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              value={form.markupMitra}
                              onChange={(e) => handleMarkupChange('mitra', parseFloat(e.target.value) || 0)}
                              className="w-full pl-2 pr-6 py-1.5 border rounded-lg font-mono font-bold text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">
                            Harga Jual (Rp)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={form.sellPriceMitra}
                            onChange={(e) => handlePriceChange('mitra', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border rounded-lg font-mono font-black text-xs bg-white text-emerald-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="p-1.5 bg-slate-50 rounded-lg space-y-1 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Harga/{form.satuanBesar || 'Box'} (Besar):</span>
                          <span className="font-mono font-black text-emerald-800">
                            Rp {Math.round((Number(form.sellPriceMitra) || 0) * ratio).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Margin/{form.satuanKecil || 'Satuan'}:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            +Rp {Math.max(0, (Number(form.sellPriceMitra) || 0) - hppKecil).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch & FEFO Stock */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="font-black text-slate-800 text-[11px] uppercase tracking-wider block">
                  Informasi Stok & FEFO (First Expired First Out)
                </span>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Stok Awal</label>
                    <input
                      type="number"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border rounded-xl font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Buffer Minimum</label>
                    <input
                      type="number"
                      value={form.minStock}
                      onChange={(e) => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border rounded-xl font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Nomor Batch</label>
                    <input
                      type="text"
                      value={form.batchNo}
                      onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
                      className="w-full p-2 border rounded-xl font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Expired Date</label>
                    <input
                      type="date"
                      value={form.expDate}
                      onChange={(e) => setForm({ ...form, expDate: e.target.value })}
                      className="w-full p-2 border rounded-xl font-mono font-bold bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t sticky bottom-0 bg-white py-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-xl shadow-md uppercase tracking-wider"
                >
                  Simpan Master Obat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
