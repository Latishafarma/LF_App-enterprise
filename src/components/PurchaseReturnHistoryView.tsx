import React, { useState } from 'react';
import { Truck, Search, Printer, Trash2, RotateCcw, Calendar, Receipt, Plus, X, Edit2 } from 'lucide-react';
import { PurchaseReturnRecord, PurchaseReturnItem, PurchaseInvoice } from '../types';
import { openPrintWindow } from '../utils/printHelper';

interface PurchaseReturnHistoryViewProps {
  returns: PurchaseReturnRecord[];
  invoices: PurchaseInvoice[];
  userName?: string;
  onDeleteReturn?: (id: string) => void;
  onProcessReturn?: (invoiceId: string, returnedItems: Array<{ medicineId: string; name?: string; qty: number; unit: string; batchNo?: string; expDate?: string; price?: number; subtotal?: number; reason?: string }>) => void;
  onUpdateReturn?: (returnId: string, returnedItems: Array<{ medicineId: string; name?: string; qty: number; unit: string; batchNo?: string; expDate?: string; price?: number; subtotal?: number; reason?: string }>) => void;
}

export const PurchaseReturnHistoryView: React.FC<PurchaseReturnHistoryViewProps> = ({
  returns,
  invoices,
  userName = 'Apoteker',
  onDeleteReturn,
  onProcessReturn,
  onUpdateReturn
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [activeReturnInvoice, setActiveReturnInvoice] = useState<PurchaseInvoice | null>(null);
  const [isReturnSaved, setIsReturnSaved] = useState(false);
  const [isReturnProcessed, setIsReturnProcessed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseReturnRecord | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [returnItems, setReturnItems] = useState<Array<{
    medicineId: string;
    name: string;
    qty: number;
    unit: string;
    batchNo: string;
    expDate: string;
    price: number;
    returQty: number;
    reason: string;
    alasan: string;
  }>>([]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingReturnId(null);
    setSelectedInvoiceId('');
    setActiveReturnInvoice(null);
    setReturnItems([]);
    setIsReturnSaved(false);
    setIsReturnProcessed(false);
    setIsReturnModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsReturnModalOpen(false);
    setIsEditing(false);
    setEditingReturnId(null);
    setSelectedInvoiceId('');
    setActiveReturnInvoice(null);
    setReturnItems([]);
    setIsReturnSaved(false);
    setIsReturnProcessed(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    if (onDeleteReturn) {
      onDeleteReturn(targetId);
    }
    showNotification(`Riwayat retur #${targetId} berhasil dihapus.`, 'success');
    setDeleteTarget(null);
  };

  // Sinkronisasi reaktif (two-way binding) data retur langsung ke active print session
  const syncActivePrintStorage = (
    inv: PurchaseInvoice,
    items: typeof returnItems,
    currentEditId: string | null
  ) => {
    try {
      const payloadItems = items.map((it) => {
        const textReason = String(it.reason || it.alasan || '').trim();
        return {
          medicineId: it.medicineId,
          name: it.name,
          qty: it.returQty,
          unit: it.unit,
          batchNo: it.batchNo,
          expDate: it.expDate,
          price: it.price,
          subtotal: it.returQty * it.price,
          reason: textReason,
          alasan: textReason
        };
      });

      const returnDocData = {
        id: currentEditId || `RET-PREVIEW-${inv.invoiceNo}`,
        returnId: currentEditId || undefined,
        invoiceId: inv.id,
        invoiceNo: inv.invoiceNo,
        pbfName: inv.pbfName,
        date: inv.date,
        salesman: inv.salesman || '-',
        petugas: userName || 'Apoteker',
        items: payloadItems,
        totalReturValue: payloadItems.reduce((acc, it) => acc + it.subtotal, 0),
        timestamp: Date.now()
      };
      localStorage.setItem('latisha_active_print_retur', JSON.stringify(returnDocData));
    } catch (e) {
      console.error('syncActivePrintStorage error:', e);
    }
  };

  const handleSelectInvoiceForReturn = (invId: string) => {
    setSelectedInvoiceId(invId);
    setIsReturnSaved(false);
    setIsReturnProcessed(false);
    const inv = invoices.find((i) => i.id === invId);
    if (!inv) {
      setActiveReturnInvoice(null);
      setReturnItems([]);
      return;
    }
    setActiveReturnInvoice(inv);
    const initialItems = (inv.items || []).map((it) => ({
      medicineId: it.medicineId || '',
      name: it.name,
      qty: it.qty,
      unit: it.unit || 'Box',
      batchNo: it.batchNo || '-',
      expDate: it.expDate || '2028-12-31',
      price: it.price || 0,
      returQty: it.qty,
      reason: '',
      alasan: ''
    }));
    setReturnItems(initialItems);
    syncActivePrintStorage(inv, initialItems, null);
  };

  // Reaktif: Setiap ketikan / perubahan alasan retur langsung mengubah state dan sync ke pratinjau cetak
  const handleItemReasonChange = (idx: number, newReason: string) => {
    const updated = returnItems.map((item, i) =>
      i === idx ? { ...item, reason: newReason, alasan: newReason } : item
    );
    setReturnItems(updated);
    if (activeReturnInvoice) {
      syncActivePrintStorage(activeReturnInvoice, updated, editingReturnId);
    }
  };

  const handleItemQtyChange = (idx: number, newQty: number) => {
    const updated = returnItems.map((item, i) => (i === idx ? { ...item, returQty: newQty } : item));
    setReturnItems(updated);
    if (activeReturnInvoice) {
      syncActivePrintStorage(activeReturnInvoice, updated, editingReturnId);
    }
  };

  const handleRemoveReturnItem = (idx: number) => {
    const updated = returnItems.filter((_, i) => i !== idx);
    setReturnItems(updated);
    if (activeReturnInvoice) {
      syncActivePrintStorage(activeReturnInvoice, updated, editingReturnId);
    }
  };

  const handleSaveReturn = () => {
    if (!activeReturnInvoice) {
      showNotification('Pilih nomor faktur pembelian terlebih dahulu!', 'error');
      return;
    }
    if (returnItems.length === 0) {
      showNotification('Minimal harus ada 1 item obat yang diretur!', 'error');
      return;
    }
    const invalid = returnItems.some((it) => it.returQty <= 0 || it.returQty > it.qty);
    if (invalid) {
      showNotification('Jumlah retur (Qty Retur) harus lebih dari 0 dan tidak melebihi Qty awal faktur!', 'error');
      return;
    }

    const payloadItems = returnItems.map((it) => {
      const textReason = String(it.reason || it.alasan || '').trim();
      return {
        medicineId: it.medicineId,
        name: it.name,
        qty: it.returQty,
        unit: it.unit,
        batchNo: it.batchNo,
        expDate: it.expDate,
        price: it.price,
        subtotal: it.returQty * it.price,
        reason: textReason,
        alasan: textReason
      };
    });

    // Sinkronkan ke active print session seketika
    syncActivePrintStorage(activeReturnInvoice, returnItems, editingReturnId);

    // VALIDASI STATUS MODE SECARA KETAT:
    // Cek apakah mode edit aktif (isEditing bernilai true atau editingReturnId tidak kosong)
    const isEditModeActive = Boolean(isEditing || editingReturnId);

    if (isEditModeActive && editingReturnId) {
      // 1. Mencegah Pembuatan Data Baru Saat Edit:
      // Sistem TIDAK BOLEH menambahkan baris baru (duplikasi). Wajib overwrite data lama via onUpdateReturn.
      if (onUpdateReturn) {
        onUpdateReturn(editingReturnId, payloadItems);
      }
      showNotification(`Data riwayat retur #${editingReturnId} berhasil diperbarui (overwrite / update). Tidak ada baris duplikat baru yang dibuat.`, 'success');
      // 2. Reset status form ke mode normal, bersihkan state, dan tutup modal
      handleCloseModal();
      return;
    }

    // 2. Mode Tambah Baru (Create):
    // HANYA dijalankan jika bukan mode edit (editingReturnId null / kosong)
    if (onProcessReturn) {
      onProcessReturn(activeReturnInvoice.id, payloadItems);
    }
    setIsReturnSaved(true);
    showNotification(`Data retur untuk faktur #${activeReturnInvoice.invoiceNo} berhasil disimpan dan otomatis tercatat di riwayat retur pembelian. Tombol Proses sekarang aktif.`, 'success');
  };

  const handleProcessReturnAction = () => {
    if (!activeReturnInvoice) {
      showNotification('Pilih nomor faktur pembelian terlebih dahulu!', 'error');
      return;
    }
    const isEditModeActive = Boolean(isEditing || editingReturnId);
    if (!isReturnSaved && !isEditModeActive) {
      showNotification('Silakan klik tombol "Simpan" terlebih dahulu sebelum memproses retur!', 'error');
      return;
    }
    if (returnItems.length === 0) {
      showNotification('Minimal harus ada 1 item obat yang diretur!', 'error');
      return;
    }
    const invalid = returnItems.some((it) => it.returQty <= 0 || it.returQty > it.qty);
    if (invalid) {
      showNotification('Jumlah retur (Qty Retur) harus lebih dari 0 dan tidak melebihi Qty awal faktur!', 'error');
      return;
    }

    const payloadItems = returnItems.map((it) => {
      const textReason = String(it.reason || it.alasan || '').trim();
      return {
        medicineId: it.medicineId,
        name: it.name,
        qty: it.returQty,
        unit: it.unit,
        batchNo: it.batchNo,
        expDate: it.expDate,
        price: it.price,
        subtotal: it.returQty * it.price,
        reason: textReason,
        alasan: textReason
      };
    });

    syncActivePrintStorage(activeReturnInvoice, returnItems, editingReturnId);

    if (isEditModeActive && editingReturnId) {
      if (onUpdateReturn) {
        onUpdateReturn(editingReturnId, payloadItems);
      }
      showNotification(`Pembaruan retur #${editingReturnId} berhasil diproses dan disimpan!`, 'success');
      handleCloseModal();
      return;
    }

    if (onProcessReturn) {
      onProcessReturn(activeReturnInvoice.id, payloadItems);
    }
    setIsReturnProcessed(true);
    showNotification(`Proses retur faktur #${activeReturnInvoice.invoiceNo} berhasil! Stok digital telah disesuaikan dan tercatat di riwayat retur. Tombol Cetak Dokumen sekarang aktif.`, 'success');
  };

  const handlePrintReturnAction = () => {
    if (!activeReturnInvoice) {
      showNotification('Pilih nomor faktur pembelian terlebih dahulu!', 'error');
      return;
    }
    if (!isReturnProcessed && !isReturnSaved && !editingReturnId) {
      showNotification('Silakan klik tombol "Simpan" atau "Proses" terlebih dahulu sebelum mencetak dokumen retur!', 'error');
      return;
    }
    if (returnItems.length === 0) {
      showNotification('Minimal harus ada 1 item obat yang diretur!', 'error');
      return;
    }

    const payloadItems = returnItems.map((it) => {
      const textReason = String(it.reason || it.alasan || '').trim();
      return {
        medicineId: it.medicineId,
        name: it.name,
        qty: it.returQty,
        unit: it.unit,
        batchNo: it.batchNo,
        expDate: it.expDate,
        price: it.price,
        subtotal: it.returQty * it.price,
        reason: textReason,
        alasan: textReason
      };
    });

    const docId = editingReturnId || `RET-${Date.now().toString().slice(-6)}`;
    const returnDocData = {
      id: docId,
      returnId: docId,
      invoiceId: activeReturnInvoice.id,
      invoiceNo: activeReturnInvoice.invoiceNo,
      pbfName: activeReturnInvoice.pbfName,
      date: activeReturnInvoice.date,
      salesman: activeReturnInvoice.salesman || '-',
      petugas: userName || 'Apoteker',
      items: payloadItems,
      totalReturValue: payloadItems.reduce((acc, it) => acc + it.subtotal, 0),
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('latisha_active_print_retur', JSON.stringify(returnDocData));
      openPrintWindow('retur-pembelian', {
        invoiceId: activeReturnInvoice.id,
        returId: docId
      });
    } catch (err) {
      console.error('Print retur error:', err);
      showNotification('Gagal membuka pratinjau cetak retur.', 'error');
    }
  };

  const handleEditReturn = (ret: PurchaseReturnRecord) => {
    // 1. Aktifkan mode Edit secara eksplisit dengan menyimpan flag dan id dokumen yang sedang diedit
    setIsEditing(true);
    setEditingReturnId(ret.id);
    const inv = invoices.find((i) => i.id === ret.invoiceId);
    if (inv) {
      setActiveReturnInvoice(inv);
      setSelectedInvoiceId(inv.id);
    } else {
      setActiveReturnInvoice({
        id: ret.invoiceId,
        pbfName: ret.pbfName,
        invoiceNo: ret.invoiceNo,
        date: ret.date,
        dueDate: ret.date,
        salesman: ret.salesman || '',
        term: '30 Hari',
        usePpn: true,
        items: [],
        grossDpp: ret.totalReturValue,
        totalDiscountAmount: 0,
        dpp: ret.totalReturValue,
        ppn: 0,
        totalTagihan: ret.totalReturValue,
        status: 'Lunas',
        branchId: 'BRANCH-CENTRAL'
      });
      setSelectedInvoiceId(ret.invoiceId);
    }

    const loadedItems = ret.items.map((it) => {
      const textReason = String(it.reason || (it as any).alasan || '').trim();
      return {
        medicineId: it.medicineId,
        name: it.name,
        qty: it.qty,
        unit: it.unit,
        batchNo: it.batchNo || '-',
        expDate: it.expDate || '2028-12-31',
        price: it.price,
        returQty: it.qty,
        reason: textReason,
        alasan: textReason
      };
    });

    setReturnItems(loadedItems);
    setIsReturnSaved(true);
    setIsReturnProcessed(true);
    setIsReturnModalOpen(true);

    // Sinkronkan data edit ke active print session
    syncActivePrintStorage(
      inv || ({
        id: ret.invoiceId,
        invoiceNo: ret.invoiceNo,
        pbfName: ret.pbfName,
        date: ret.date,
        salesman: ret.salesman || '-'
      } as any),
      loadedItems,
      ret.id
    );
  };

  const filteredReturns = returns.filter(
    (r: PurchaseReturnRecord) =>
      r.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pbfName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrintReturn = (ret: PurchaseReturnRecord) => {
    try {
      const formattedForPrint = {
        id: ret.id,
        returnId: ret.id,
        invoiceId: ret.invoiceId,
        invoiceNo: ret.invoiceNo,
        pbfName: ret.pbfName,
        date: ret.date,
        salesman: ret.salesman || '-',
        petugas: ret.petugas || userName || 'Apoteker',
        items: (ret.items || []).map((it) => {
          const textReason = String(it.reason || (it as any).alasan || '').trim();
          return {
            medicineId: it.medicineId,
            name: it.name,
            qty: it.qty,
            unit: it.unit,
            batchNo: it.batchNo || '-',
            expDate: it.expDate || '-',
            price: it.price || 0,
            subtotal: it.subtotal || ((it.qty || 0) * (it.price || 0)),
            reason: textReason,
            alasan: textReason
          };
        }),
        totalReturValue: ret.totalReturValue || 0,
        branchId: ret.branchId,
        timestamp: Date.now()
      };
      localStorage.setItem('latisha_active_print_retur', JSON.stringify(formattedForPrint));
      openPrintWindow('retur-pembelian', {
        invoiceId: ret.invoiceId,
        returId: ret.id
      });
    } catch (err) {
      console.error('Print return error:', err);
      showNotification('Gagal membuka pratinjau cetak surat retur.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              Retur Pembelian
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola pengembalian barang / sediaan farmasi ke Pedagang Besar Farmasi (PBF) serta arsip riwayat mutasi pengurangan stok.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Truck className="w-4 h-4 rotate-180" />
            <span>Retur Faktur</span>
          </button>

          <span className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 font-extrabold text-xs border border-rose-200">
            Total Retur: {returns.length} Dokumen
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari berdasarkan No. Faktur, Nama PBF / Distributor, atau ID Retur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3">ID Retur & Faktur</th>
              <th className="p-3">Tanggal & Waktu</th>
              <th className="p-3">Supplier / PBF</th>
              <th className="p-3 text-center">Jml Item Retur</th>
              <th className="p-3 text-right">Total Nilai Retur</th>
              <th className="p-3">Petugas</th>
              <th className="p-3 text-center">Aksi (Edit / Cetak / Hapus)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredReturns.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="font-bold">Belum ada riwayat retur pembelian yang tercatat.</p>
                </td>
              </tr>
            ) : (
              filteredReturns.map((ret: PurchaseReturnRecord) => {
                const totalValue = ret.items.reduce((acc: number, it: PurchaseReturnItem) => acc + (it.subtotal || it.qty * it.price), 0);
                return (
                  <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono">
                      <span className="font-extrabold text-rose-700 text-sm block">{ret.id}</span>
                      <span className="text-xs text-slate-600 font-bold">Faktur: {ret.invoiceNo}</span>
                    </td>

                    <td className="p-3 font-mono">
                      <div className="text-slate-800 font-bold">{ret.date}</div>
                      <div className="text-[10px] text-slate-400">{ret.time}</div>
                    </td>

                    <td className="p-3 font-bold text-slate-900">
                      {ret.pbfName}
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold text-[11px]">
                        {ret.items.length} Item
                      </span>
                      <div
                        className="text-[10px] text-slate-500 truncate max-w-[190px] mx-auto mt-1"
                        title={ret.items.map((it) => `${it.name}: ${it.reason || it.alasan || '-'}`).join('\n')}
                      >
                        {ret.items.map((it) => it.reason || it.alasan).filter(Boolean).join(', ') || '-'}
                      </div>
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      Rp {totalValue.toLocaleString('id-ID')}
                    </td>

                    <td className="p-3 font-mono text-slate-600 text-[11px]">
                      {ret.petugas}
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditReturn(ret)}
                          title="Edit Riwayat Retur"
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintReturn(ret)}
                          title="Cetak Ulang Surat Retur"
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-200 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Cetak</span>
                        </button>

                        {onDeleteReturn && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(ret);
                            }}
                            title="Hapus Arsip Retur"
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold border border-rose-200 flex items-center gap-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
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

      {/* Return Modal with Invoice Selector and 3 Action Buttons */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 my-6">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${editingReturnId ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  <Truck className="w-5 h-5 rotate-180" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">
                      {editingReturnId ? `Edit Dokumen Retur #${editingReturnId}` : 'Form Input Retur Pembelian ke PBF'}
                    </h3>
                    {editingReturnId ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] tracking-wide uppercase shadow-2xs">
                        Mode Edit (Update)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] tracking-wide uppercase shadow-2xs">
                        Mode Tambah Baru
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {editingReturnId
                      ? `Memperbarui rincian item sediaan yang diretur untuk dokumen #${editingReturnId}`
                      : 'Pilih nomor faktur pembelian dan atur kuantitas sediaan yang diretur ke PBF'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Edit Mode Notice Banner */}
              {editingReturnId && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 font-bold text-sm">✏️</span>
                    <span>
                      <strong>Mode Edit Aktif:</strong> Anda sedang memperbarui data riwayat retur <strong>#{editingReturnId}</strong>. Menekan tombol <strong>Simpan Perubahan</strong> akan memperbarui data riwayat yang sudah ada secara langsung tanpa membuat baris baru.
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-mono text-[10px] font-bold shrink-0 ml-2">
                    ID: {editingReturnId}
                  </span>
                </div>
              )}
              {/* Invoice Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Pilih No. Faktur Pembelian PBF <span className="text-rose-500">*</span>
                  </label>
                  {(isEditing || editingReturnId) && (
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md border border-amber-300">
                      🔒 Faktur Terkunci (Mode Edit Retur #{editingReturnId})
                    </span>
                  )}
                </div>
                <select
                  disabled={Boolean(isEditing || editingReturnId)}
                  value={selectedInvoiceId}
                  onChange={(e) => handleSelectInvoiceForReturn(e.target.value)}
                  className={`w-full p-2.5 border border-slate-300 rounded-xl font-bold text-xs ${
                    isEditing || editingReturnId
                      ? 'bg-slate-100 text-slate-600 cursor-not-allowed border-dashed'
                      : 'bg-slate-50 focus:ring-2 focus:ring-rose-500 focus:outline-none'
                  }`}
                >
                  <option value="">-- Pilih Faktur Pembelian untuk Diretur --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      Faktur #{inv.invoiceNo} — PBF: {inv.pbfName} ({inv.date}) — Total: Rp {inv.totalTagihan?.toLocaleString('id-ID') || 0}
                    </option>
                  ))}
                </select>
              </div>

              {activeReturnInvoice && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Supplier / PBF</span>
                    <strong className="text-slate-900">{activeReturnInvoice.pbfName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tanggal Faktur</span>
                    <strong className="text-slate-900">{activeReturnInvoice.date}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Termin</span>
                    <strong className="text-slate-900">{activeReturnInvoice.term}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Status Bayar</span>
                    <strong className="text-slate-900">{activeReturnInvoice.status}</strong>
                  </div>
                </div>
              )}

              {activeReturnInvoice ? (
                <>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-medium text-xs">
                    💡 Daftar obat dimuat otomatis dari faktur {activeReturnInvoice.invoiceNo}. Anda dapat menghapus item obat yang tidak diretur atau menyesuaikan Qty Retur dan Alasan Retur.
                  </div>

                  {/* Return Items Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">No</th>
                          <th className="p-2.5">Nama Obat / Sediaan</th>
                          <th className="p-2.5 text-center">Qty Awal</th>
                          <th className="p-2.5 text-center bg-rose-50 text-rose-800">Qty Retur</th>
                          <th className="p-2.5 text-center">Batch & ED</th>
                          <th className="p-2.5">Alasan Retur</th>
                          <th className="p-2.5 text-center w-12">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {returnItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                              Semua item obat telah dihapus dari daftar retur.
                            </td>
                          </tr>
                        ) : (
                          returnItems.map((rit, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-slate-800">
                                {rit.name}
                                <div className="text-[10px] font-mono text-slate-400">Harga: Rp {rit.price.toLocaleString('id-ID')}</div>
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold">
                                {rit.qty} {rit.unit}
                              </td>
                              <td className="p-2.5 text-center bg-rose-50/50">
                                <input
                                  type="number"
                                  min={1}
                                  max={rit.qty}
                                  value={rit.returQty}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    handleItemQtyChange(idx, val);
                                  }}
                                  className="w-20 p-1.5 border border-rose-300 rounded-lg font-mono font-bold text-center bg-white text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                />
                                <span className="ml-1 text-[10px] text-slate-600 font-bold">{rit.unit}</span>
                              </td>
                              <td className="p-2.5 text-center font-mono text-[10px]">
                                <div className="font-bold text-slate-800">{rit.batchNo}</div>
                                <div className="text-slate-400">ED: {rit.expDate}</div>
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  value={rit.reason ?? rit.alasan ?? ''}
                                  onChange={(e) => handleItemReasonChange(idx, e.target.value)}
                                  placeholder="Tulis alasan retur (cth: Kemasan rusak, ED dekat, dll)..."
                                  className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                />
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {['Kemasan rusak', 'ED dekat (< 6 bln)', 'Tidak sesuai pesanan', 'Salah kirim PBF'].map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => handleItemReasonChange(idx, preset)}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 transition cursor-pointer"
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveReturnItem(idx)}
                                  title="Hapus dari daftar retur"
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-slate-400 italic">
                  Silakan pilih nomor faktur pembelian terlebih dahulu pada pilihan di atas untuk memuat daftar obat.
                </div>
              )}

              {/* 3 Mandatory Control Buttons at the Bottom */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700 transition cursor-pointer"
                >
                  Tutup / Batal
                </button>

                <div className="flex items-center gap-2">
                  {/* a. Tombol Simpan */}
                  <button
                    type="button"
                    onClick={handleSaveReturn}
                    className={`px-4 py-2.5 text-white rounded-xl font-bold shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                      editingReturnId
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <span>{editingReturnId ? 'Simpan Perubahan' : 'Simpan'}</span>
                  </button>

                  {/* b. Tombol Proses */}
                  <button
                    type="button"
                    disabled={!isReturnSaved && !editingReturnId}
                    onClick={handleProcessReturnAction}
                    className={`px-5 py-2.5 rounded-xl font-black shadow-md transition active:scale-95 flex items-center gap-1.5 ${
                      isReturnSaved || editingReturnId
                        ? 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-65'
                    }`}
                  >
                    <span>{editingReturnId ? 'Update & Selesai' : 'Proses'}</span>
                  </button>

                  {/* c. Tombol Cetak */}
                  <button
                    type="button"
                    disabled={!isReturnProcessed && !isReturnSaved && !editingReturnId}
                    onClick={handlePrintReturnAction}
                    className={`px-5 py-2.5 rounded-xl font-black shadow-md transition active:scale-95 flex items-center gap-1.5 ${
                      isReturnProcessed || isReturnSaved || editingReturnId
                        ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-65'
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Dokumen Retur</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800">Hapus Riwayat Retur</h3>
                <p className="text-xs text-slate-500">Konfirmasi penghapusan arsip retur</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl text-xs text-rose-950 space-y-1">
              <p>
                Apakah Anda yakin ingin menghapus dokumen riwayat retur <strong className="font-mono text-rose-700">#{deleteTarget.id}</strong> untuk faktur <strong className="text-slate-900">{deleteTarget.invoiceNo}</strong> ({deleteTarget.pbfName})?
              </p>
              <p className="text-[11px] text-rose-600 font-semibold">
                Data yang dihapus tidak dapat dipulihkan kembali.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Retur</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold ${
              notification.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : notification.type === 'info'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-emerald-900 text-white border-emerald-700'
            }`}
          >
            <span>{notification.message}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-white/60 hover:text-white p-0.5 rounded cursor-pointer transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
