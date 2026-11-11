import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Building2,
  User,
  FileText,
  Printer,
  X,
  Plus,
  RefreshCw,
  Wallet,
  Receipt,
  ExternalLink
} from 'lucide-react';
import {
  PurchaseInvoice,
  Transaction,
  DebtPaymentRecord,
  ReceivablePaymentRecord,
  CashFlowRecord
} from '../types';
import { useFacilityProfiles, formatPharmacyAddress } from './PharmacySettingsModal';
import { openPrintWindow } from '../utils/printHelper';

interface DebtReceivableViewProps {
  purchaseInvoices: PurchaseInvoice[];
  transactions: Transaction[];
  onUpdatePurchaseInvoices: (invoices: PurchaseInvoice[]) => void;
  onUpdateTransactions: (transactions: Transaction[]) => void;
  userName?: string;
  onAddAuditLog?: (module: string, action: string) => void;
}

export const DebtReceivableView: React.FC<DebtReceivableViewProps> = ({
  purchaseInvoices,
  transactions,
  onUpdatePurchaseInvoices,
  onUpdateTransactions,
  userName = 'apt. Mardin, S.Farm',
  onAddAuditLog
}) => {
  const { pharmacyProfile, apjProfile } = useFacilityProfiles();
  const pharmacyFullAddress = formatPharmacyAddress(pharmacyProfile);
  // Navigation sub-tab
  const [activeTab, setActiveTab] = useState<'hutang' | 'piutang' | 'riwayat'>('hutang');

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'belum_lunas' | 'sebagian' | 'lunas' | 'overdue'>('all');

  // Local storage for payment history and cash flow ledger
  const [debtPayments, setDebtPayments] = useState<DebtPaymentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('latisha_debt_payments');
      if (saved) {
        const list: DebtPaymentRecord[] = JSON.parse(saved);
        return list.filter((p) => p.id !== 'PAY-HUTANG-001');
      }
    } catch (e) {}
    return [];
  });

  const [receivablePayments, setReceivablePayments] = useState<ReceivablePaymentRecord[]>(() => {
    try {
      const saved = localStorage.getItem('latisha_receivable_payments');
      if (saved) {
        const list: ReceivablePaymentRecord[] = JSON.parse(saved);
        return list.filter((p) => p.id !== 'PAY-PIUTANG-001');
      }
    } catch (e) {}
    return [];
  });

  const [cashFlowRecords, setCashFlowRecords] = useState<CashFlowRecord[]>(() => {
    try {
      const saved = localStorage.getItem('latisha_cash_flow');
      if (saved) {
        const list: CashFlowRecord[] = JSON.parse(saved);
        return list.filter((c) => !['CSH-001', 'CSH-002'].includes(c.id));
      }
    } catch (e) {}
    return [];
  });

  // Modal States
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<PurchaseInvoice | null>(null);
  const [selectedTrxForPay, setSelectedTrxForPay] = useState<Transaction | null>(null);
  const [receiptData, setReceiptData] = useState<{
    type: 'HUTANG' | 'PIUTANG';
    title: string;
    receiptNo: string;
    date: string;
    partyName: string;
    referenceNo: string;
    amount: number;
    paymentMethod: string;
    petugas: string;
    notes: string;
    previousBalance: number;
    remainingBalance: number;
  } | null>(null);

  // Form State for Payment
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'Kas Apotek (Tunai)',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNo: '',
    notes: ''
  });

  // Toast / Feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Helper: check if a date is overdue
  const isOverdue = (dueDateStr?: string) => {
    if (!dueDateStr) return false;
    const due = new Date(dueDateStr).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    return due < today;
  };

  // Helper: days remaining
  const getDaysRemaining = (dueDateStr?: string) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // 1. DATA HUTANG (Dari purchaseInvoices)
  const debtItems = useMemo(() => {
    return purchaseInvoices.map((inv) => {
      const total = inv.totalTagihan;
      let paid = inv.paidAmount;
      if (paid === undefined) {
        paid = inv.status === 'Lunas' ? total : 0;
      }
      const remaining = inv.remainingAmount !== undefined ? inv.remainingAmount : Math.max(0, total - paid);
      const overdue = remaining > 0 && isOverdue(inv.dueDate);
      const days = getDaysRemaining(inv.dueDate);

      return {
        ...inv,
        calculatedPaid: paid,
        calculatedRemaining: remaining,
        isOverdue: overdue,
        daysRemaining: days
      };
    });
  }, [purchaseInvoices]);

  // 2. DATA PIUTANG (Dari transactions)
  // Menangkap transaksi tempo, faktur penjualan mitra, atau transaksi dengan sisa piutang > 0
  const receivableItems = useMemo(() => {
    return transactions
      .filter((trx) => {
        const isTempoMethod =
          trx.paymentMethod?.toLowerCase().includes('tempo') ||
          trx.paymentMethod?.toLowerCase().includes('piutang') ||
          trx.paymentMethod?.toLowerCase().includes('kredit');
        const isFaktur = trx.type === 'FAKTUR_PENJUALAN' || trx.type === 'MITRA';
        const hasUnpaid = trx.paymentStatus === 'Belum Lunas' || trx.paymentStatus === 'Sebagian' || trx.paymentStatus === 'Tempo';
        const isNotFullyPaid = (trx.remainingAmount !== undefined && trx.remainingAmount > 0) || (trx.payAmount < trx.total && isTempoMethod);

        return isTempoMethod || isFaktur || hasUnpaid || isNotFullyPaid || trx.dueDate;
      })
      .map((trx) => {
        const total = trx.total;
        let paid = trx.paidAmount !== undefined ? trx.paidAmount : (trx.payAmount || 0);
        if (trx.paymentStatus === 'Lunas') {
          paid = total;
        }
        const remaining = trx.remainingAmount !== undefined ? trx.remainingAmount : Math.max(0, total - paid);
        const overdue = remaining > 0 && isOverdue(trx.dueDate);
        const days = getDaysRemaining(trx.dueDate);

        let finalStatus = trx.paymentStatus || 'Belum Lunas';
        if (remaining <= 0) {
          finalStatus = 'Lunas';
        } else if (paid > 0) {
          finalStatus = 'Sebagian';
        }

        return {
          ...trx,
          calculatedPaid: paid,
          calculatedRemaining: remaining,
          calculatedStatus: finalStatus,
          isOverdue: overdue,
          daysRemaining: days
        };
      });
  }, [transactions]);

  // KPI Calculations
  const totalDebtUnpaid = useMemo(() => {
    return debtItems.reduce((acc, it) => acc + (it.status !== 'Lunas' ? it.calculatedRemaining : 0), 0);
  }, [debtItems]);

  const totalDebtCount = useMemo(() => {
    return debtItems.filter((it) => it.status !== 'Lunas').length;
  }, [debtItems]);

  const debtOverdueCount = useMemo(() => {
    return debtItems.filter((it) => it.status !== 'Lunas' && it.isOverdue).length;
  }, [debtItems]);

  const totalReceivableUnpaid = useMemo(() => {
    return receivableItems.reduce((acc, it) => acc + (it.calculatedStatus !== 'Lunas' ? it.calculatedRemaining : 0), 0);
  }, [receivableItems]);

  const totalReceivableCount = useMemo(() => {
    return receivableItems.filter((it) => it.calculatedStatus !== 'Lunas').length;
  }, [receivableItems]);

  const receivableOverdueCount = useMemo(() => {
    return receivableItems.filter((it) => it.calculatedStatus !== 'Lunas' && it.isOverdue).length;
  }, [receivableItems]);

  // Filtered Debt List
  const filteredDebtList = useMemo(() => {
    return debtItems.filter((inv) => {
      const matchSearch =
        inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.pbfName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.salesman && inv.salesman.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'belum_lunas') return inv.status === 'Belum Lunas' && inv.calculatedPaid === 0;
      if (statusFilter === 'sebagian') return inv.status === 'Sebagian' || (inv.calculatedPaid > 0 && inv.calculatedRemaining > 0);
      if (statusFilter === 'lunas') return inv.status === 'Lunas';
      if (statusFilter === 'overdue') return inv.isOverdue && inv.status !== 'Lunas';

      return true;
    });
  }, [debtItems, searchTerm, statusFilter]);

  // Filtered Receivable List
  const filteredReceivableList = useMemo(() => {
    return receivableItems.filter((trx) => {
      const matchSearch =
        trx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trx.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trx.kasir && trx.kasir.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'belum_lunas') return trx.calculatedStatus === 'Belum Lunas' || (trx.calculatedPaid === 0 && trx.calculatedRemaining > 0);
      if (statusFilter === 'sebagian') return trx.calculatedStatus === 'Sebagian' || (trx.calculatedPaid > 0 && trx.calculatedRemaining > 0);
      if (statusFilter === 'lunas') return trx.calculatedStatus === 'Lunas';
      if (statusFilter === 'overdue') return trx.isOverdue && trx.calculatedStatus !== 'Lunas';

      return true;
    });
  }, [receivableItems, searchTerm, statusFilter]);

  // ACTION: Buka Modal Bayar Hutang (PBF)
  const handleOpenPayDebt = (inv: PurchaseInvoice & { calculatedRemaining: number; calculatedPaid: number }) => {
    setSelectedInvoiceForPay(inv);
    setPaymentForm({
      amount: inv.calculatedRemaining,
      paymentMethod: 'Transfer Bank (BCA 827-092-1122)',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNo: `TRF-${Date.now().toString().slice(-6)}`,
      notes: `Pelunasan faktur pembelian #${inv.invoiceNo} ke ${inv.pbfName}`
    });
  };

  // ACTION: Buka Modal Bayar Piutang (POS / Pasien / Mitra)
  const handleOpenPayReceivable = (trx: Transaction & { calculatedRemaining: number; calculatedPaid: number }) => {
    setSelectedTrxForPay(trx);
    setPaymentForm({
      amount: trx.calculatedRemaining,
      paymentMethod: 'Kas Apotek (Tunai)',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNo: `KWT-${Date.now().toString().slice(-6)}`,
      notes: `Penerimaan pelunasan piutang transaksi #${trx.id} a/n ${trx.customerName}`
    });
  };

  // EKSEKUSI PEMBAYARAN HUTANG (PBF)
  const handleProcessDebtPayment = () => {
    if (!selectedInvoiceForPay) return;

    const payAmount = Number(paymentForm.amount);
    if (payAmount <= 0) {
      alert('Nominal pembayaran harus lebih dari 0!');
      return;
    }

    const currentRemaining = selectedInvoiceForPay.remainingAmount !== undefined
      ? selectedInvoiceForPay.remainingAmount
      : (selectedInvoiceForPay.totalTagihan - (selectedInvoiceForPay.paidAmount || (selectedInvoiceForPay.status === 'Lunas' ? selectedInvoiceForPay.totalTagihan : 0)));

    if (payAmount > currentRemaining) {
      alert(`Nominal pembayaran (Rp ${payAmount.toLocaleString('id-ID')}) melebihi sisa hutang (Rp ${currentRemaining.toLocaleString('id-ID')})!`);
      return;
    }

    const currentPaid = selectedInvoiceForPay.paidAmount || 0;
    const newPaid = currentPaid + payAmount;
    const newRemaining = Math.max(0, currentRemaining - payAmount);
    const newStatus: 'Lunas' | 'Sebagian' | 'Belum Lunas' = newRemaining <= 0 ? 'Lunas' : 'Sebagian';

    // 1. UPDATE TABEL UTAMA PEMBELIAN & FAKTUR PBF
    const updatedInvoices = purchaseInvoices.map((inv) => {
      if (inv.id === selectedInvoiceForPay.id) {
        return {
          ...inv,
          status: newStatus,
          paidAmount: newPaid,
          remainingAmount: newRemaining
        };
      }
      return inv;
    });

    onUpdatePurchaseInvoices(updatedInvoices);
    try {
      localStorage.setItem('latisha_purchase_invoices', JSON.stringify(updatedInvoices));
    } catch (e) {}

    // 2. CATAT KE RIWAYAT PEMBAYARAN HUTANG
    const paymentRecordId = `PAY-HUTANG-${Date.now().toString().slice(-6)}`;
    const newDebtPayment: DebtPaymentRecord = {
      id: paymentRecordId,
      invoiceId: selectedInvoiceForPay.id,
      invoiceNo: selectedInvoiceForPay.invoiceNo,
      pbfName: selectedInvoiceForPay.pbfName,
      paymentDate: paymentForm.paymentDate,
      amount: payAmount,
      paymentMethod: paymentForm.paymentMethod,
      referenceNo: paymentForm.referenceNo || undefined,
      notes: paymentForm.notes || undefined,
      petugas: userName,
      previousBalance: currentRemaining,
      remainingBalance: newRemaining,
      createdAt: new Date().toISOString()
    };

    const nextDebtPayments = [newDebtPayment, ...debtPayments];
    setDebtPayments(nextDebtPayments);
    try {
      localStorage.setItem('latisha_debt_payments', JSON.stringify(nextDebtPayments));
    } catch (e) {}

    // 3. CATAT KE BUKU KAS (CASH FLOW RECORD - KELUAR)
    const newCashFlow: CashFlowRecord = {
      id: `CSH-${Date.now().toString().slice(-6)}`,
      date: paymentForm.paymentDate,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      type: 'OUT',
      category: 'Pembayaran Hutang PBF',
      amount: payAmount,
      referenceId: selectedInvoiceForPay.id,
      referenceNo: selectedInvoiceForPay.invoiceNo,
      partyName: selectedInvoiceForPay.pbfName,
      paymentMethod: paymentForm.paymentMethod,
      description: paymentForm.notes || `Pembayaran hutang faktur PBF #${selectedInvoiceForPay.invoiceNo}`,
      petugas: userName,
      createdAt: new Date().toISOString()
    };

    const nextCashFlow = [newCashFlow, ...cashFlowRecords];
    setCashFlowRecords(nextCashFlow);
    try {
      localStorage.setItem('latisha_cash_flow', JSON.stringify(nextCashFlow));
    } catch (e) {}

    // 4. CATAT AUDIT LOG
    if (onAddAuditLog) {
      onAddAuditLog(
        'Hutang & Piutang',
        `Pembayaran hutang faktur #${selectedInvoiceForPay.invoiceNo} (${selectedInvoiceForPay.pbfName}) sebesar Rp ${payAmount.toLocaleString('id-ID')} via ${paymentForm.paymentMethod}. Status: ${newStatus}`
      );
    }

    // 5. TAMPILKAN KUITANSI
    setReceiptData({
      type: 'HUTANG',
      title: 'BUKTI PENGELUARAN KAS / PEMBAYARAN HUTANG PBF',
      receiptNo: paymentRecordId,
      date: paymentForm.paymentDate,
      partyName: selectedInvoiceForPay.pbfName,
      referenceNo: selectedInvoiceForPay.invoiceNo,
      amount: payAmount,
      paymentMethod: paymentForm.paymentMethod,
      petugas: userName,
      notes: paymentForm.notes,
      previousBalance: currentRemaining,
      remainingBalance: newRemaining
    });

    setSelectedInvoiceForPay(null);
    showToast(
      `Pembayaran hutang faktur #${selectedInvoiceForPay.invoiceNo} sebesar Rp ${payAmount.toLocaleString('id-ID')} berhasil disimpan! Status faktur diperbarui menjadi ${newStatus}.`
    );
  };

  // EKSEKUSI PENERIMAAN / PELUNASAN PIUTANG (POS)
  const handleProcessReceivablePayment = () => {
    if (!selectedTrxForPay) return;

    const payAmount = Number(paymentForm.amount);
    if (payAmount <= 0) {
      alert('Nominal pelunasan piutang harus lebih dari 0!');
      return;
    }

    const currentRemaining = selectedTrxForPay.remainingAmount !== undefined
      ? selectedTrxForPay.remainingAmount
      : Math.max(0, selectedTrxForPay.total - (selectedTrxForPay.paidAmount !== undefined ? selectedTrxForPay.paidAmount : (selectedTrxForPay.payAmount || 0)));

    if (payAmount > currentRemaining) {
      alert(`Nominal pembayaran (Rp ${payAmount.toLocaleString('id-ID')}) melebihi sisa piutang (Rp ${currentRemaining.toLocaleString('id-ID')})!`);
      return;
    }

    const currentPaid = selectedTrxForPay.paidAmount !== undefined
      ? selectedTrxForPay.paidAmount
      : (selectedTrxForPay.payAmount || 0);

    const newPaid = currentPaid + payAmount;
    const newRemaining = Math.max(0, currentRemaining - payAmount);
    const newStatus: 'Lunas' | 'Sebagian' | 'Belum Lunas' = newRemaining <= 0 ? 'Lunas' : 'Sebagian';

    // 1. UPDATE TABEL UTAMA TRANSAKSI PENJUALAN POS
    const updatedTransactions = transactions.map((trx) => {
      if (trx.id === selectedTrxForPay.id) {
        return {
          ...trx,
          paymentStatus: newStatus,
          paidAmount: newPaid,
          payAmount: newPaid,
          remainingAmount: newRemaining,
          status: newStatus === 'Lunas' ? ('Selesai' as const) : trx.status
        };
      }
      return trx;
    });

    onUpdateTransactions(updatedTransactions);
    try {
      localStorage.setItem('latisha_transactions', JSON.stringify(updatedTransactions));
    } catch (e) {}

    // 2. CATAT KE RIWAYAT PENERIMAAN PIUTANG
    const paymentRecordId = `PAY-PIUTANG-${Date.now().toString().slice(-6)}`;
    const newReceivablePayment: ReceivablePaymentRecord = {
      id: paymentRecordId,
      transactionId: selectedTrxForPay.id,
      customerName: selectedTrxForPay.customerName,
      paymentDate: paymentForm.paymentDate,
      amount: payAmount,
      paymentMethod: paymentForm.paymentMethod,
      referenceNo: paymentForm.referenceNo || undefined,
      notes: paymentForm.notes || undefined,
      petugas: userName,
      previousBalance: currentRemaining,
      remainingBalance: newRemaining,
      createdAt: new Date().toISOString()
    };

    const nextReceivablePayments = [newReceivablePayment, ...receivablePayments];
    setReceivablePayments(nextReceivablePayments);
    try {
      localStorage.setItem('latisha_receivable_payments', JSON.stringify(nextReceivablePayments));
    } catch (e) {}

    // 3. CATAT KE BUKU KAS (CASH FLOW RECORD - MASUK)
    const newCashFlow: CashFlowRecord = {
      id: `CSH-${Date.now().toString().slice(-6)}`,
      date: paymentForm.paymentDate,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      type: 'IN',
      category: 'Pelunasan Piutang POS',
      amount: payAmount,
      referenceId: selectedTrxForPay.id,
      referenceNo: selectedTrxForPay.id,
      partyName: selectedTrxForPay.customerName,
      paymentMethod: paymentForm.paymentMethod,
      description: paymentForm.notes || `Penerimaan pelunasan piutang #${selectedTrxForPay.id}`,
      petugas: userName,
      createdAt: new Date().toISOString()
    };

    const nextCashFlow = [newCashFlow, ...cashFlowRecords];
    setCashFlowRecords(nextCashFlow);
    try {
      localStorage.setItem('latisha_cash_flow', JSON.stringify(nextCashFlow));
    } catch (e) {}

    // 4. CATAT AUDIT LOG
    if (onAddAuditLog) {
      onAddAuditLog(
        'Hutang & Piutang',
        `Penerimaan pelunasan piutang transaksi #${selectedTrxForPay.id} (${selectedTrxForPay.customerName}) sebesar Rp ${payAmount.toLocaleString('id-ID')} via ${paymentForm.paymentMethod}. Status: ${newStatus}`
      );
    }

    // 5. TAMPILKAN KUITANSI
    setReceiptData({
      type: 'PIUTANG',
      title: 'KUITANSI RESMI PENERIMAAN KAS / PELUNASAN PIUTANG',
      receiptNo: paymentRecordId,
      date: paymentForm.paymentDate,
      partyName: selectedTrxForPay.customerName,
      referenceNo: selectedTrxForPay.id,
      amount: payAmount,
      paymentMethod: paymentForm.paymentMethod,
      petugas: userName,
      notes: paymentForm.notes,
      previousBalance: currentRemaining,
      remainingBalance: newRemaining
    });

    setSelectedTrxForPay(null);
    showToast(
      `Pelunasan piutang transaksi #${selectedTrxForPay.id} sebesar Rp ${payAmount.toLocaleString('id-ID')} berhasil dicatat! Status transaksi POS diperbarui menjadi ${newStatus}.`
    );
  };

  // Cetak Kuitansi
  const handlePrintReceiptWindow = () => {
    if (selectedTrxForPay) {
      openPrintWindow('kwitansi-penjualan', { trxId: selectedTrxForPay.id });
    } else if (typeof window !== 'undefined' && window.self === window.top) {
      try {
        window.print();
      } catch (e) {}
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500 animate-slide-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="text-xs font-bold leading-relaxed">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:bg-emerald-800 p-1 rounded-lg text-emerald-200 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Manajemen Hutang & Piutang</h1>
              <p className="text-xs text-slate-300">
                Pencatatan real-time hutang dagang faktur PBF, piutang penjualan POS/mitra, dan mutasi arus kas apotek
              </p>
            </div>
          </div>
        </div>

        {/* Action / Sync Button */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono flex items-center gap-2 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Petugas: <strong className="text-white">{userName}</strong></span>
          </div>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Hutang PBF */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-rose-700">Total Hutang PBF</p>
              <h3 className="text-xl font-black font-mono text-slate-900 mt-1">
                Rp {totalDebtUnpaid.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-rose-100">
            <span className="text-slate-500 font-medium">{totalDebtCount} Faktur Belum Lunas</span>
            {debtOverdueCount > 0 ? (
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {debtOverdueCount} Lewat Tempo
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold text-[11px]">Jatuh Tempo Aman</span>
            )}
          </div>
        </div>

        {/* KPI 2: Total Piutang POS */}
        <div className="bg-white p-5 rounded-2xl border border-teal-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-teal-700">Total Piutang Penjualan</p>
              <h3 className="text-xl font-black font-mono text-slate-900 mt-1">
                Rp {totalReceivableUnpaid.toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl border border-teal-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-teal-100">
            <span className="text-slate-500 font-medium">{totalReceivableCount} Tagihan Piutang</span>
            {receivableOverdueCount > 0 ? (
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {receivableOverdueCount} Lewat Tempo
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold text-[11px]">Tagihan Terkendali</span>
            )}
          </div>
        </div>

        {/* KPI 3: Mutasi Kas Keluar (Bayar Hutang) */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-700">Realisasi Bayar Hutang</p>
              <h3 className="text-xl font-black font-mono text-slate-900 mt-1">
                Rp {debtPayments.reduce((acc, it) => acc + it.amount, 0).toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-amber-100 text-slate-500">
            <span>{debtPayments.length} Transaksi Pembayaran</span>
            <span className="text-amber-700 font-bold font-mono">Buku Kas Out</span>
          </div>
        </div>

        {/* KPI 4: Mutasi Kas Masuk (Pelunasan Piutang) */}
        <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-indigo-700">Realisasi Pelunasan Piutang</p>
              <h3 className="text-xl font-black font-mono text-slate-900 mt-1">
                Rp {receivablePayments.reduce((acc, it) => acc + it.amount, 0).toLocaleString('id-ID')}
              </h3>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-indigo-100 text-slate-500">
            <span>{receivablePayments.length} Transaksi Pelunasan</span>
            <span className="text-indigo-700 font-bold font-mono">Buku Kas In</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('hutang');
              setStatusFilter('all');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'hutang'
                ? 'bg-rose-700 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>Manajemen Hutang (Faktur PBF)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'hutang' ? 'bg-rose-900 text-rose-100' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {totalDebtCount}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('piutang');
              setStatusFilter('all');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'piutang'
                ? 'bg-teal-700 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Manajemen Piutang (Penjualan POS)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'piutang' ? 'bg-teal-900 text-teal-100' : 'bg-teal-100 text-teal-800'
              }`}
            >
              {totalReceivableCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('riwayat')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'riwayat'
                ? 'bg-indigo-700 text-white shadow-md'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Buku Kas & Riwayat Mutasi</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'riwayat' ? 'bg-indigo-900 text-indigo-100' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {cashFlowRecords.length}
            </span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        {activeTab !== 'riwayat' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeTab === 'hutang'
                    ? 'Cari No. Faktur / PBF / Sales...'
                    : 'Cari No. Trx / Pasien / Mitra...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="all">Semua Status</option>
              <option value="belum_lunas">Belum Lunas (0%)</option>
              <option value="sebagian">Sebagian (Dicicil)</option>
              <option value="overdue">Lewat Jatuh Tempo</option>
              <option value="lunas">Lunas</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB CONTENT 1: MANAJEMEN HUTANG (FAKTUR PBF) */}
      {activeTab === 'hutang' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-rose-700" />
                <span>Daftar Hutang Pembelian Barang Ke Distributor / PBF</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Terintegrasi langsung dengan tabel utama Pembelian & Faktur PBF
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Menampilkan <strong>{filteredDebtList.length}</strong> dari {debtItems.length} faktur
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/75 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center w-10">No</th>
                  <th className="p-3">No. Faktur PBF</th>
                  <th className="p-3">Distributor / PBF</th>
                  <th className="p-3">Tgl Faktur</th>
                  <th className="p-3">Jatuh Tempo</th>
                  <th className="p-3 text-right">Total Tagihan</th>
                  <th className="p-3 text-right">Sudah Dibayar</th>
                  <th className="p-3 text-right">Sisa Hutang</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDebtList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-bold">Tidak ada data faktur hutang yang cocok dengan filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredDebtList.map((inv, idx) => {
                    const isFullyPaid = inv.status === 'Lunas' || inv.calculatedRemaining <= 0;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          <div>{inv.invoiceNo}</div>
                          <div className="text-[10px] text-slate-400 font-normal">ID: {inv.id}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{inv.pbfName}</div>
                          <div className="text-[10px] text-slate-500">Sales: {inv.salesman || '-'}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-600">{inv.date}</td>
                        <td className="p-3 font-mono">
                          <div className={inv.isOverdue ? 'text-rose-700 font-bold' : 'text-slate-800'}>
                            {inv.dueDate || '-'}
                          </div>
                          {!isFullyPaid && inv.daysRemaining !== null && (
                            <div className="text-[10px]">
                              {inv.daysRemaining < 0 ? (
                                <span className="text-rose-600 font-bold">
                                  Lewat {Math.abs(inv.daysRemaining)} hari!
                                </span>
                              ) : inv.daysRemaining <= 5 ? (
                                <span className="text-amber-600 font-bold">
                                  Sisa {inv.daysRemaining} hari
                                </span>
                              ) : (
                                <span className="text-slate-400">Sisa {inv.daysRemaining} hari</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          Rp {inv.totalTagihan.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700 font-semibold">
                          Rp {inv.calculatedPaid.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-rose-700 text-sm">
                          Rp {inv.calculatedRemaining.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          {isFullyPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Lunas
                            </span>
                          ) : inv.calculatedPaid > 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                              Sebagian
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                              Belum Lunas
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {!isFullyPaid ? (
                            <button
                              onClick={() => handleOpenPayDebt(inv)}
                              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 mx-auto transition active:scale-95 cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Bayar Hutang</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Selesai</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: MANAJEMEN PIUTANG (PENJUALAN POS) */}
      {activeTab === 'piutang' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-teal-700" />
                <span>Daftar Piutang Pasien, Pelanggan, & Mitra Faskes (Penjualan POS)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Terintegrasi langsung dengan tabel riwayat penjualan & kasir POS
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Menampilkan <strong>{filteredReceivableList.length}</strong> dari {receivableItems.length} transaksi
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/75 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center w-10">No</th>
                  <th className="p-3">No. Trx / Faktur</th>
                  <th className="p-3">Pelanggan / Pasien / Mitra</th>
                  <th className="p-3">Tgl Transaksi</th>
                  <th className="p-3">Jatuh Tempo</th>
                  <th className="p-3 text-right">Total Transaksi</th>
                  <th className="p-3 text-right">Sudah Diterima</th>
                  <th className="p-3 text-right">Sisa Piutang</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReceivableList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-bold">Tidak ada data piutang yang cocok dengan filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredReceivableList.map((trx, idx) => {
                    const isFullyPaid = trx.calculatedStatus === 'Lunas' || trx.calculatedRemaining <= 0;
                    return (
                      <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          <div>{trx.id}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{trx.type}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{trx.customerName}</div>
                          {trx.customerPhone && (
                            <div className="text-[10px] text-slate-500 font-mono">{trx.customerPhone}</div>
                          )}
                          <div className="text-[10px] text-slate-400">Kasir: {trx.kasir}</div>
                        </td>
                        <td className="p-3 font-mono text-slate-600">{trx.date.split(' ')[0]}</td>
                        <td className="p-3 font-mono">
                          <div className={trx.isOverdue ? 'text-rose-700 font-bold' : 'text-slate-800'}>
                            {trx.dueDate || '-'}
                          </div>
                          {!isFullyPaid && trx.daysRemaining !== null && (
                            <div className="text-[10px]">
                              {trx.daysRemaining < 0 ? (
                                <span className="text-rose-600 font-bold">
                                  Lewat {Math.abs(trx.daysRemaining)} hari!
                                </span>
                              ) : trx.daysRemaining <= 5 ? (
                                <span className="text-amber-600 font-bold">
                                  Sisa {trx.daysRemaining} hari
                                </span>
                              ) : (
                                <span className="text-slate-400">Sisa {trx.daysRemaining} hari</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          Rp {trx.total.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700 font-semibold">
                          Rp {trx.calculatedPaid.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-teal-800 text-sm">
                          Rp {trx.calculatedRemaining.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          {isFullyPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Lunas
                            </span>
                          ) : trx.calculatedPaid > 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                              Sebagian
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-300">
                              Belum Lunas
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {!isFullyPaid ? (
                            <button
                              onClick={() => handleOpenPayReceivable(trx)}
                              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 mx-auto transition active:scale-95 cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Bayar Piutang</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Lunas</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: BUKU KAS & RIWAYAT MUTASI */}
      {activeTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-700" />
                <span>Buku Kas & Log Mutasi Pelunasan Hutang-Piutang</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Catatan mutasi kas masuk (pelunasan piutang) dan kas keluar (pembayaran hutang PBF)
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Total <strong>{cashFlowRecords.length}</strong> transaksi kas tercatat
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/75 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center w-10">No</th>
                  <th className="p-3">Waktu & Tanggal</th>
                  <th className="p-3">Jenis Arus Kas</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Pihak Terkait</th>
                  <th className="p-3">No. Referensi</th>
                  <th className="p-3">Metode Pembayaran</th>
                  <th className="p-3 text-right">Nominal Mutasi</th>
                  <th className="p-3">Petugas</th>
                  <th className="p-3 text-center">Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {cashFlowRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-bold">Belum ada riwayat mutasi pembayaran atau pelunasan.</p>
                    </td>
                  </tr>
                ) : (
                  cashFlowRecords.map((cf, idx) => (
                    <tr key={cf.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono">
                        <div className="font-bold text-slate-800">{cf.date}</div>
                        <div className="text-[10px] text-slate-400">{cf.time}</div>
                      </td>
                      <td className="p-3">
                        {cf.type === 'IN' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-max">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Kas Masuk</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 w-max">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>Kas Keluar</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{cf.category}</td>
                      <td className="p-3 font-bold text-slate-900">{cf.partyName}</td>
                      <td className="p-3 font-mono text-slate-600">{cf.referenceNo}</td>
                      <td className="p-3 text-slate-700">{cf.paymentMethod}</td>
                      <td
                        className={`p-3 text-right font-mono font-black text-sm ${
                          cf.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {cf.type === 'IN' ? '+' : '-'} Rp {cf.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-slate-600 font-mono text-[11px]">{cf.petugas}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setReceiptData({
                              type: cf.type === 'IN' ? 'PIUTANG' : 'HUTANG',
                              title:
                                cf.type === 'IN'
                                  ? 'KUITANSI PENERIMAAN KAS / PELUNASAN PIUTANG'
                                  : 'BUKTI PENGELUARAN KAS / PEMBAYARAN HUTANG PBF',
                              receiptNo: cf.id,
                              date: cf.date,
                              partyName: cf.partyName,
                              referenceNo: cf.referenceNo,
                              amount: cf.amount,
                              paymentMethod: cf.paymentMethod,
                              petugas: cf.petugas,
                              notes: cf.description,
                              previousBalance: cf.amount,
                              remainingBalance: 0
                            });
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-300 flex items-center gap-1 mx-auto transition cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Kuitansi</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: FORM PEMBAYARAN HUTANG PBF */}
      {selectedInvoiceForPay && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 animate-scale-up">
            <div className="px-6 py-4 bg-rose-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-800 rounded-xl text-rose-200">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Pembayaran Hutang Faktur PBF</h3>
                  <p className="text-[11px] text-rose-200 font-mono">
                    Faktur #{selectedInvoiceForPay.invoiceNo} - {selectedInvoiceForPay.pbfName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPay(null)}
                className="text-rose-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Ringkasan Hutang */}
              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Distributor / PBF:</span>
                  <span className="font-bold text-slate-900">{selectedInvoiceForPay.pbfName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Tanggal Jatuh Tempo:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {selectedInvoiceForPay.dueDate || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-rose-200 pt-2">
                  <span className="text-slate-600 font-medium">Total Nilai Tagihan:</span>
                  <span className="font-mono font-bold text-slate-800">
                    Rp {selectedInvoiceForPay.totalTagihan.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Sudah Terbayar Sebelumnya:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    Rp {((selectedInvoiceForPay as any).calculatedPaid || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t-2 border-rose-300 pt-2 text-sm">
                  <span className="font-black text-rose-900">SISA HUTANG HARUS DIBAYAR:</span>
                  <span className="font-black font-mono text-rose-700 text-base">
                    Rp {((selectedInvoiceForPay as any).calculatedRemaining || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Opsi Cepat */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold text-[11px]">Pilihan Cepat:</span>
                <button
                  type="button"
                  onClick={() =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: (selectedInvoiceForPay as any).calculatedRemaining || 0
                    })
                  }
                  className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-bold text-[11px] border border-rose-300 transition cursor-pointer"
                >
                  Bayar Lunas Sekaligus (100%)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: Math.round(((selectedInvoiceForPay as any).calculatedRemaining || 0) / 2)
                    })
                  }
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-300 transition cursor-pointer"
                >
                  Cicilan 50%
                </button>
              </div>

              {/* Input Nominal Bayar */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nominal Pembayaran Sekarang (Rp) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={(selectedInvoiceForPay as any).calculatedRemaining || 0}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) || 0 })}
                  className="w-full p-3 border-2 border-rose-300 rounded-xl font-mono font-black text-base text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
              </div>

              {/* Metode Pembayaran */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metode Pembayaran *</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Transfer Bank (BCA 827-092-1122)">Transfer BCA (827-092-1122)</option>
                    <option value="Transfer Bank (Mandiri)">Transfer Mandiri</option>
                    <option value="Transfer Bank (BRI)">Transfer BRI</option>
                    <option value="Kas Apotek (Tunai)">Kas Apotek (Tunai)</option>
                    <option value="Giro / Cek Tempo">Giro / Cek Tempo</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Transaksi Bayar *</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* No Bukti Transfer / Referensi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  No. Bukti Transfer / Kuitansi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Cth: TRF-BCA-88912 atau No. Kuitansi PBF"
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-xs"
                />
              </div>

              {/* Catatan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Pembayaran</label>
                <input
                  type="text"
                  placeholder="Catatan tambahan (opsional)..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPay(null)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessDebtPayment}
                  className="px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-black shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Proses & Simpan Pembayaran</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FORM PENERIMAAN / PELUNASAN PIUTANG POS */}
      {selectedTrxForPay && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 animate-scale-up">
            <div className="px-6 py-4 bg-teal-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-800 rounded-xl text-teal-200">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Penerimaan Pelunasan Piutang</h3>
                  <p className="text-[11px] text-teal-200 font-mono">
                    Transaksi #{selectedTrxForPay.id} - {selectedTrxForPay.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrxForPay(null)}
                className="text-teal-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Ringkasan Piutang */}
              <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Pelanggan / Pasien / Mitra:</span>
                  <span className="font-bold text-slate-900">{selectedTrxForPay.customerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Tanggal Transaksi:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {selectedTrxForPay.date}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-teal-200 pt-2">
                  <span className="text-slate-600 font-medium">Total Nilai Tagihan:</span>
                  <span className="font-mono font-bold text-slate-800">
                    Rp {selectedTrxForPay.total.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Sudah Diterima Sebelumnya:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    Rp {((selectedTrxForPay as any).calculatedPaid || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t-2 border-teal-300 pt-2 text-sm">
                  <span className="font-black text-teal-900">SISA PIUTANG YANG HARUS DITERIMA:</span>
                  <span className="font-black font-mono text-teal-800 text-base">
                    Rp {((selectedTrxForPay as any).calculatedRemaining || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Opsi Cepat */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold text-[11px]">Pilihan Cepat:</span>
                <button
                  type="button"
                  onClick={() =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: (selectedTrxForPay as any).calculatedRemaining || 0
                    })
                  }
                  className="px-3 py-1 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-lg font-bold text-[11px] border border-teal-300 transition cursor-pointer"
                >
                  Pelunasan Penuh (100%)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: Math.round(((selectedTrxForPay as any).calculatedRemaining || 0) / 2)
                    })
                  }
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-300 transition cursor-pointer"
                >
                  Cicilan 50%
                </button>
              </div>

              {/* Input Nominal Terima */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nominal Diterima Sekarang (Rp) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={(selectedTrxForPay as any).calculatedRemaining || 0}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) || 0 })}
                  className="w-full p-3 border-2 border-teal-300 rounded-xl font-mono font-black text-base text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              {/* Metode Pembayaran */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metode Penerimaan *</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Kas Apotek (Tunai)">Kas Apotek (Tunai)</option>
                    <option value="Transfer Bank (BCA)">Transfer BCA</option>
                    <option value="Transfer Bank (Mandiri)">Transfer Mandiri</option>
                    <option value="QRIS / Digital">QRIS / Digital</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Penerimaan *</label>
                  <input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* No Bukti / Referensi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  No. Bukti / Kuitansi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Cth: KWT-POS-00123"
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-xs"
                />
              </div>

              {/* Catatan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Penerimaan</label>
                <input
                  type="text"
                  placeholder="Catatan tambahan (opsional)..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedTrxForPay(null)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-slate-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessReceivablePayment}
                  className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-black shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Proses & Simpan Pelunasan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: KUITANSI & BUKTI BAYAR RESMI */}
      {receiptData && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-300 my-6 animate-scale-up">
            <div className="px-6 py-3 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs uppercase tracking-wide">
                  Pratinjau Kuitansi Pembayaran
                </span>
              </div>
              <button
                onClick={() => setReceiptData(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bagian Cetak Kuitansi */}
            <div id="receipt-print-area" className="p-8 text-slate-900 space-y-5 text-xs">
              {/* KOP APOTEK */}
              <div className="border-b-2 border-slate-900 pb-3">
                <div className="flex items-center justify-between gap-4">
                  {pharmacyProfile.logoUrl ? (
                    <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                      <img
                        src={pharmacyProfile.logoUrl}
                        alt="Logo Faskes"
                        className="w-14 h-14 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-14 shrink-0" />
                  )}
                  <div className="flex-1 text-center">
                    <h2 className="font-black text-lg tracking-wide uppercase text-slate-950">
                      {pharmacyProfile.name}
                    </h2>
                    <p className="text-[11px] text-slate-700 font-medium">
                      {pharmacyFullAddress}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      SIA: {pharmacyProfile.sia} | APJ: {apjProfile.name} (SIPA: {apjProfile.sipa}) | Telp/WA: {pharmacyProfile.phone}
                    </p>
                  </div>
                  <div className="w-14 shrink-0" />
                </div>
                <div className="text-center">
                  <div className="inline-block mt-2 px-4 py-0.5 rounded-md bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                    {receiptData.title}
                  </div>
                </div>
              </div>

              {/* Rincian Kuitansi */}
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-300 pb-3">
                <div>
                  <p className="text-slate-500 font-semibold text-[10px]">NO. KUITANSI BUKTI:</p>
                  <p className="font-mono font-bold text-slate-900">{receiptData.receiptNo}</p>
                  <p className="text-slate-500 font-semibold text-[10px] mt-2">TANGGAL TRANSAKSI:</p>
                  <p className="font-mono font-bold text-slate-900">{receiptData.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 font-semibold text-[10px]">
                    {receiptData.type === 'HUTANG' ? 'DIBAYARKAN KEPADA:' : 'DITERIMA DARI:'}
                  </p>
                  <p className="font-black text-sm text-slate-950">{receiptData.partyName}</p>
                  <p className="text-slate-500 font-semibold text-[10px] mt-2">NO. FAKTUR ASAL:</p>
                  <p className="font-mono font-bold text-indigo-700">{receiptData.referenceNo}</p>
                </div>
              </div>

              {/* Rincian Nominal */}
              <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Saldo Sebelum Pembayaran:</span>
                  <span className="font-mono font-bold text-slate-800">
                    Rp {receiptData.previousBalance.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-300 pt-2">
                  <span className="font-black text-slate-950">JUMLAH DIBAYARKAN / DITERIMA:</span>
                  <span
                    className={`font-black font-mono text-base ${
                      receiptData.type === 'HUTANG' ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    Rp {receiptData.amount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-300 pt-2">
                  <span className="text-slate-600 font-semibold">Sisa Saldo Setelah Transaksi:</span>
                  <span className="font-mono font-bold text-slate-900">
                    Rp {receiptData.remainingBalance.toLocaleString('id-ID')}{' '}
                    {receiptData.remainingBalance === 0 && '(LUNAS 100%)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                  <span>Metode Pembayaran:</span>
                  <span className="font-bold text-slate-800">{receiptData.paymentMethod}</span>
                </div>
                {receiptData.notes && (
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-dashed border-slate-200">
                    <span>Keterangan: </span>
                    <span className="italic">{receiptData.notes}</span>
                  </div>
                )}
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 pt-6 text-center text-xs">
                <div className="space-y-12">
                  <p className="font-bold text-slate-700">
                    {receiptData.type === 'HUTANG' ? 'Penerima (Sales / PBF),' : 'Penyetor (Pasien / Mitra),'}
                  </p>
                  <p className="font-bold text-slate-900">
                    ( {receiptData.partyName.slice(0, 25)} )
                  </p>
                </div>
                <div className="space-y-12">
                  <p className="font-bold text-slate-700">Kasir / Petugas Keuangan,</p>
                  <p className="font-bold text-slate-900 underline decoration-slate-400">
                    {receiptData.petugas}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="px-6 py-3 bg-slate-100 border-t border-slate-300 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrintReceiptWindow}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Bukti Kuitansi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
