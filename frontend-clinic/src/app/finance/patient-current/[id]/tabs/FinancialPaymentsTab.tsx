'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus, X, Trash2, AlertCircle, CheckCircle2, Info,
  Filter, Download, FileText, Check, ChevronDown,
  Search, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Undo2, Wallet, ScrollText, Loader2,
} from 'lucide-react';
import Modal from '../../../../../components/ui/Modal';
import ConfirmModal from '../../../../../components/ui/ConfirmModal';
import InfoTooltip from '../../../../../components/ui/InfoTooltip';
import Dropdown from '../../../../../components/ui/Dropdown';
import { FinanceService, Payment, Balance, FinancialAccount, UnpaidTreatmentItem, PaidTreatmentItem } from '../../../../../lib/services/finance.service';
import { formatCurrency } from '../../../../../lib/utils/formatCurrency';
import { exportPaymentReceiptPDF } from '../../../../../lib/utils/exportPaymentReceipt';
import { exportStatementPDF } from '../../../../../lib/utils/exportStatementPDF';
import Skeleton from '../../../../../components/ui/Skeleton';
import { useToastStore } from '../../../../../store/toastStore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const paymentSchema = z.object({
  amount: z.string().min(1, 'Tutar zorunludur').refine(val => parseFloat(val) > 0, 'Tutar 0\'dan büyük olmalıdır'),
  date: z.string().min(1, 'Tarih zorunludur'),
  method: z.string().min(1, 'Yöntem zorunludur'),
  description: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const METHODS = [
  { label: 'NAKİT', value: 'CASH' },
  { label: 'KREDİ KARTI', value: 'CREDIT_CARD' },
  { label: 'HAVALE / EFT', value: 'TRANSFER' },
  { label: 'DİĞER', value: 'OTHER' }
];

const METHOD_LABELS: Record<string, string> = {
  CASH: 'NAKİT',
  CREDIT_CARD: 'KREDİ KARTI',
  TRANSFER: 'HAVALE / EFT',
  OTHER: 'DİĞER'
};

const ADVANCE_KEY = 'ADVANCE';

/* ─── Local helper components ─────────────────────────────────────────────── */


function DropdownItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${
        active
          ? 'bg-metronic-primary/5 text-metronic-primary font-bold'
          : 'text-slate-700 hover:bg-slate-50 hover:text-metronic-primary'
      }`}
    >
      {icon}{label}{active && <Check size={12} className="ml-auto text-metronic-primary" />}
    </button>
  );
}

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
}: {
  label: string;
  column: string;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (col: string) => void;
}) {
  const isActive = sortColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors"
    >
      <div className="flex items-center gap-1.5">
        {label}
        {isActive && (
          sortDirection === 'asc'
            ? <ArrowUp size={12} className="text-metronic-primary" />
            : <ArrowDown size={12} className="text-metronic-primary" />
        )}
      </div>
    </th>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */

export default function FinancialPaymentsTab({ patient }: { patient: any }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [distributionType, setDistributionType] = useState<'FIFO' | 'TREATMENT_BASED'>('FIFO');
  const [unpaidItems, setUnpaidItems] = useState<UnpaidTreatmentItem[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // İade (Refund) Modal state
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAccountId, setRefundAccountId] = useState('');
  const [paidItems, setPaidItems] = useState<PaidTreatmentItem[]>([]);
  const [refundAllocations, setRefundAllocations] = useState<Record<string, string>>({});
  const [refundSelectedItemIds, setRefundSelectedItemIds] = useState<string[]>([]);

  // Toolbar state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      method: 'CASH'
    }
  });

  const {
    register: registerRefund,
    handleSubmit: handleRefundSubmit,
    reset: resetRefund,
    watch: watchRefund,
    formState: { errors: refundErrors, isSubmitting: isRefundSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      method: 'CASH'
    }
  });

  const fetchData = useCallback(async () => {
    if (!patient?.id) return;
    try {
      setLoading(true);
      const [bal, pays] = await Promise.all([
        FinanceService.getPatientBalance(patient.id),
        FinanceService.getPatientPayments(patient.id),
      ]);
      setBalance(bal);
      setPayments(pays);
    } catch (err) {
      console.error('Failed to fetch finance data:', err);
      setBalance({ totalDebt: 0, advanceBalance: 0 });
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!modalOpen || !patient?.id) return;
    FinanceService.getAccounts().then(setAccounts).catch(() => setAccounts([]));
    FinanceService.getUnpaidTreatmentItems(patient.id).then(setUnpaidItems).catch(() => setUnpaidItems([]));
  }, [modalOpen, patient?.id]);

  useEffect(() => {
    if (!refundModalOpen || !patient?.id) return;
    FinanceService.getAccounts().then(setAccounts).catch(() => setAccounts([]));
    FinanceService.getPaidTreatmentItems(patient.id).then(setPaidItems).catch(() => setPaidItems([]));
  }, [refundModalOpen, patient?.id]);

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() cannot be memoized safely
  const watchedAmount = watch('amount');
  const watchedRefundAmount = watchRefund('amount');

  /* Seçili tedavi kalemlerine, girilen tutarı sırayla (en eskiden başlayarak) otomatik dağıt. */
  useEffect(() => {
    if (distributionType !== 'TREATMENT_BASED') return;
    let remaining = parseFloat(watchedAmount) || 0;
    const next: Record<string, string> = {};
    for (const item of unpaidItems) {
      if (!selectedItemIds.includes(item.id) || remaining <= 0) continue;
      const alloc = Math.min(remaining, item.remainingDebt);
      if (alloc > 0) next[item.id] = alloc.toFixed(2);
      remaining -= alloc;
    }
    setAllocations(next);
  }, [watchedAmount, selectedItemIds, unpaidItems, distributionType]);

  const advanceBalance = balance?.advanceBalance || 0;

  /* İade tutarını, seçili (ödemesi yapılan) tedavi kalemlerine ve/veya avans bakiyesine sırayla otomatik dağıt. */
  useEffect(() => {
    if (!refundModalOpen) return;
    let remaining = parseFloat(watchedRefundAmount) || 0;
    const next: Record<string, string> = {};
    for (const item of paidItems) {
      if (!refundSelectedItemIds.includes(item.id) || remaining <= 0) continue;
      const alloc = Math.min(remaining, item.paidAmount);
      if (alloc > 0) next[item.id] = alloc.toFixed(2);
      remaining -= alloc;
    }
    if (refundSelectedItemIds.includes(ADVANCE_KEY) && remaining > 0) {
      const alloc = Math.min(remaining, advanceBalance);
      if (alloc > 0) next[ADVANCE_KEY] = alloc.toFixed(2);
      remaining -= alloc;
    }
    setRefundAllocations(next);
  }, [watchedRefundAmount, refundSelectedItemIds, paidItems, refundModalOpen, advanceBalance]);

  const toggleItemSelect = (id: string) => {
    setSelectedItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleRefundItemSelect = (id: string) => {
    setRefundSelectedItemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  const allocationsTotal = Object.values(allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const refundAllocationsTotal = Object.values(refundAllocations).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  /* ── Filtering ── */
  const filtered = payments.filter(p => {
    const matchSearch = !searchTerm || [
      format(new Date(p.createdAt), 'dd.MM.yyyy'),
      String(p.amount),
      METHOD_LABELS[p.method] || p.method,
    ].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchMethod = !filterMethod || p.method === filterMethod;
    return matchSearch && matchMethod;
  });

  /* ── Sorting ── */
  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal: any, bVal: any;
    if (sortColumn === 'createdAt') {
      aVal = new Date(a.createdAt).getTime();
      bVal = new Date(b.createdAt).getTime();
    } else if (sortColumn === 'amount') {
      aVal = a.amount;
      bVal = b.amount;
    } else if (sortColumn === 'method') {
      aVal = METHOD_LABELS[a.method] || a.method;
      bVal = METHOD_LABELS[b.method] || b.method;
    } else {
      return 0;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));
  const paginated = sorted.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const exportCSV = () => {
    const rows = [['Tarih', 'Tutar', 'Yöntem']];
    sorted.forEach(p => {
      rows.push([
        format(new Date(p.createdAt), 'dd.MM.yyyy'),
        String(p.amount),
        METHOD_LABELS[p.method] || p.method,
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'odeme-gecmisi.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateReceipt = (p: Payment) => {
    exportPaymentReceiptPDF({
      date: p.createdAt,
      amount: p.amount,
      method: p.method,
      description: p.description,
      patient: {
        firstName: patient?.firstName || '',
        lastName: patient?.lastName || '',
      },
    });
  };

  const handleGenerateStatement = async () => {
    if (!patient?.id) return;
    try {
      setStatementLoading(true);
      const [statement, accountsList] = await Promise.all([
        FinanceService.getPatientStatement(patient.id),
        FinanceService.getAccounts(),
      ]);
      await exportStatementPDF({
        ...statement,
        bankAccounts: accountsList
          .filter(a => a.type === 'BANKA' && a.isActive)
          .map(a => ({ bankName: a.bankName, branch: a.branch, iban: a.iban, name: a.name, currency: a.currency })),
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Ekstre oluşturulurken bir hata oluştu.';
      addToast({ title: 'Hata', message: msg, type: 'error' });
    } finally {
      setStatementLoading(false);
    }
  };

  const setAllocationAmount = (itemId: string, value: string, max: number) => {
    const num = parseFloat(value);
    if (value !== '' && (isNaN(num) || num < 0)) return;
    if (!isNaN(num) && num > max) {
      setAllocations(prev => ({ ...prev, [itemId]: String(max) }));
      return;
    }
    setAllocations(prev => ({ ...prev, [itemId]: value }));
  };

  const resetPaymentExtras = () => {
    setAccountId('');
    setDistributionType('FIFO');
    setAllocations({});
    setSelectedItemIds([]);
  };

  const setRefundAllocationAmount = (itemId: string, value: string, max: number) => {
    const num = parseFloat(value);
    if (value !== '' && (isNaN(num) || num < 0)) return;
    if (!isNaN(num) && num > max) {
      setRefundAllocations(prev => ({ ...prev, [itemId]: String(max) }));
      return;
    }
    setRefundAllocations(prev => ({ ...prev, [itemId]: value }));
  };

  const resetRefundExtras = () => {
    setRefundAccountId('');
    setRefundAllocations({});
    setRefundSelectedItemIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === payments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(payments.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDeletePayments = async () => {
    setDeleting(true);
    try {
      await FinanceService.deletePayments(selectedIds);
      addToast({ title: 'Başarılı', message: `${selectedIds.length} ödeme kaydı silindi.`, type: 'success' });
      setSelectedIds([]);
      setDeleteModalOpen(false);
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Ödeme(ler) silinirken bir hata oluştu.';
      addToast({ title: 'Hata', message: msg, type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const onPaymentSubmit = async (data: PaymentFormData) => {
    const amount = parseFloat(data.amount);

    if (distributionType === 'TREATMENT_BASED') {
      if (Math.abs(allocationsTotal - amount) > 0.01) {
        addToast({ title: 'Hata', message: 'Tedavi kalemlerine dağıtılan toplam tutar, ödeme tutarına eşit olmalıdır.', type: 'error' });
        return;
      }
    }

    try {
      await FinanceService.processPayment({
        patientId: patient.id,
        amount,
        method: data.method,
        description: data.description,
        accountId: accountId || undefined,
        distributionType,
        allocations: distributionType === 'TREATMENT_BASED'
          ? Object.entries(allocations)
              .filter(([, v]) => parseFloat(v) > 0)
              .map(([treatmentItemId, v]) => ({ treatmentItemId, amount: parseFloat(v) }))
          : undefined,
      });
      addToast({ title: 'Başarılı', message: 'Ödeme başarıyla kaydedildi.', type: 'success' });
      setModalOpen(false);
      reset();
      resetPaymentExtras();
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Ödeme kaydedilirken bir hata oluştu.';
      addToast({ title: 'Hata', message: msg, type: 'error' });
    }
  };

  const onRefundSubmit = async (data: PaymentFormData) => {
    const amount = parseFloat(data.amount);

    if (Math.abs(refundAllocationsTotal - amount) > 0.01) {
      addToast({ title: 'Hata', message: 'Tedavi kalemlerine ve/veya avans bakiyesine dağıtılan toplam iade tutarı, iade tutarına eşit olmalıdır.', type: 'error' });
      return;
    }

    try {
      await FinanceService.processRefund({
        patientId: patient.id,
        amount,
        method: data.method,
        description: data.description,
        accountId: refundAccountId || undefined,
        allocations: Object.entries(refundAllocations)
          .filter(([id, v]) => id !== ADVANCE_KEY && parseFloat(v) > 0)
          .map(([treatmentItemId, v]) => ({ treatmentItemId, amount: parseFloat(v) })),
        refundFromAdvance: parseFloat(refundAllocations[ADVANCE_KEY] || '0') || undefined,
      });
      addToast({ title: 'Başarılı', message: 'İade başarıyla kaydedildi.', type: 'success' });
      setRefundModalOpen(false);
      resetRefund();
      resetRefundExtras();
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'İade kaydedilirken bir hata oluştu.';
      addToast({ title: 'Hata', message: msg, type: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="m-card mb-0 shadow-none border border-slate-200/60">
          <div className="m-card-body py-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Toplam Ödeme</p>
            {loading ? <Skeleton className="w-24 h-6 mt-1" /> : <p className="text-[22px] font-extrabold text-metronic-success">₺{formatCurrency(totalPaid)}</p>}
          </div>
        </div>
        <div className="m-card mb-0 shadow-none border border-slate-200/60">
          <div className="m-card-body py-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kalan Borç</p>
            {loading ? <Skeleton className="w-24 h-6 mt-1" /> : <p className="text-[22px] font-extrabold text-metronic-danger">₺{formatCurrency(balance?.totalDebt || 0)}</p>}
          </div>
        </div>
        <div className="m-card mb-0 shadow-none border border-slate-200/60">
          <div className="m-card-body py-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avans Bakiyesi</p>
            {loading ? <Skeleton className="w-24 h-6 mt-1" /> : <p className="text-[22px] font-extrabold text-metronic-primary">₺{formatCurrency(balance?.advanceBalance || 0)}</p>}
          </div>
        </div>
      </div>

      {/* Ödeme Listesi */}
      <div className="m-card shadow-none border border-slate-200/60 mb-0 overflow-hidden">

        {/* ── Toolbar header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <h4 className="text-base font-bold text-slate-700">Ödeme Geçmişi</h4>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200">
              {filtered.length} Kayıt
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Ara..."
                className="h-9 pl-9 pr-3 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary transition-colors w-44"
              />
            </div>

            {/* Filter dropdown */}
            <Dropdown
              align="right"
              trigger={
                <button className={`flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold border rounded-lg transition-colors ${
                  filterMethod
                    ? 'bg-metronic-primary text-white border-metronic-primary'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-metronic-primary hover:text-metronic-primary'
                }`}>
                  <Filter size={14} />
                  Filtrele
                  <ChevronDown size={12} />
                </button>
              }
            >
              <DropdownItem
                label="Tüm Yöntemler"
                active={!filterMethod}
                onClick={() => { setFilterMethod(''); setCurrentPage(1); }}
              />
              <DropdownItem
                label="Nakit"
                active={filterMethod === 'CASH'}
                onClick={() => { setFilterMethod('CASH'); setCurrentPage(1); }}
              />
              <DropdownItem
                label="Kredi Kartı"
                active={filterMethod === 'CREDIT_CARD'}
                onClick={() => { setFilterMethod('CREDIT_CARD'); setCurrentPage(1); }}
              />
              <DropdownItem
                label="Havale/EFT"
                active={filterMethod === 'TRANSFER'}
                onClick={() => { setFilterMethod('TRANSFER'); setCurrentPage(1); }}
              />
              <DropdownItem
                label="Diğer"
                active={filterMethod === 'OTHER'}
                onClick={() => { setFilterMethod('OTHER'); setCurrentPage(1); }}
              />
            </Dropdown>

            {/* Export dropdown */}
            <Dropdown
              align="right"
              trigger={
                <button className="flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold border border-slate-200 rounded-lg bg-white text-slate-600 hover:border-metronic-primary hover:text-metronic-primary transition-colors">
                  <Download size={14} />
                  Dışa Aktar
                  <ChevronDown size={12} />
                </button>
              }
            >
              <DropdownItem
                icon={<FileText size={14} />}
                label="CSV olarak indir"
                onClick={exportCSV}
              />
            </Dropdown>

            {/* Statement button */}
            <button
              onClick={handleGenerateStatement}
              disabled={statementLoading}
              className="flex items-center gap-1.5 h-9 px-4 bg-white text-slate-600 border border-slate-200 rounded-lg text-[13px] font-bold hover:border-metronic-primary hover:text-metronic-primary transition-colors disabled:opacity-50"
            >
              {statementLoading ? <Loader2 size={14} className="animate-spin" /> : <ScrollText size={14} />}
              Ekstre
            </button>

            {/* Refund button */}
            <button
              onClick={() => setRefundModalOpen(true)}
              className="flex items-center gap-1.5 h-9 px-4 bg-white text-metronic-danger border border-metronic-danger/30 rounded-lg text-[13px] font-bold hover:bg-metronic-danger hover:text-white transition-colors"
            >
              <Undo2 size={14} /> İade
            </button>

            {/* New payment button */}
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary text-white rounded-lg text-[13px] font-bold hover:bg-blue-600 transition-colors"
            >
              <Plus size={14} /> Yeni Ödeme
            </button>
          </div>
        </div>

        {/* ── Multi-select bar ── */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20">
            <span className="text-[13px] font-bold text-metronic-primary">
              {selectedIds.length} kayıt seçildi
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-bold text-white bg-metronic-danger border border-metronic-danger rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 size={13} /> Seçilenleri Sil
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-bold text-metronic-primary bg-white border border-metronic-primary/30 rounded-lg hover:bg-metronic-primary/5 transition-colors"
              >
                <X size={13} /> Seçimi Temizle
              </button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === payments.length && payments.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                  />
                </th>
                <SortableHeader label="Tarih" column="createdAt" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Tutar" column="amount" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Yöntem" column="method" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Kasa/Banka</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <div className="flex items-center">
                    Dağılım
                    <InfoTooltip title="Dağılım" description="Ödemenin hangi tedavi kalemlerine dağıtıldığını gösterir." />
                  </div>
                </th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Makbuz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-4 h-4" /></td>
                    <td className="py-4 px-4"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-4 px-4"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-4"><Skeleton className="w-16 h-6" /></td>
                    <td className="py-4 px-4"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-4"><Skeleton className="w-24 h-6" /></td>
                    <td className="py-4 px-4"><Skeleton className="w-6 h-6" /></td>
                  </tr>
                ))
              ) : paginated.length > 0 ? (
                paginated.map(p => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-metronic-primary-light/10' : ''}`}>
                      <td className="py-3 px-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-[13px] font-semibold text-slate-700">
                        {format(new Date(p.createdAt), 'dd.MM.yyyy')}
                      </td>
                      <td className="py-3 px-4 text-[14px] font-extrabold text-metronic-success">₺{formatCurrency(p.amount)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-md">{METHOD_LABELS[p.method]}</span>
                      </td>
                      <td className="py-3 px-4 text-[13px] font-semibold text-slate-600 whitespace-nowrap">
                        {p.account?.name || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="py-3 px-4">
                        {p.distributions && p.distributions.length > 0 ? (
                          <InfoTooltip
                            title="Dağıtılan Tedaviler"
                            description={
                              <div className="flex flex-col gap-1.5">
                                {p.distributions.map((d, i) => (
                                  <div key={i} className="flex items-center justify-between gap-3">
                                    <span className="text-slate-700 font-semibold">
                                      {d.treatmentItem?.tariff?.masterTreatment?.name || 'Tedavi'}
                                      {d.treatmentItem?.toothNo ? ` #${d.treatmentItem.toothNo}` : ''}
                                    </span>
                                    <span className="font-bold text-metronic-primary whitespace-nowrap">₺{formatCurrency(d.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            }
                          />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.amount > 0 ? (
                          <button
                            onClick={() => handleGenerateReceipt(p)}
                            title="Tahsilat Makbuzu Oluştur"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-metronic-primary transition-colors"
                          >
                            <FileText size={16} />
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={24} className="text-slate-300" />
                      <span className="text-[13px] font-medium">Henüz ödeme kaydı bulunmuyor.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer / Pagination ── */}
        {!loading && sorted.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 gap-3">
            {/* Left: page limit + record range */}
            <div className="flex items-center gap-3 text-[13px] text-slate-500">
              <div className="flex items-center gap-2">
                <select
                  value={pageLimit}
                  onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
                  className="h-8 px-2 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="font-medium">sayfa</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <span>
                Toplam{' '}
                <span className="font-bold text-slate-700">{sorted.length}</span>{' '}
                kayıttan{' '}
                <span className="font-bold text-slate-700">
                  {Math.min((currentPage - 1) * pageLimit + 1, sorted.length)}-{Math.min(currentPage * pageLimit, sorted.length)}
                </span>{' '}
                arası
              </span>
            </div>

            {/* Right: pagination buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-metronic-primary hover:text-metronic-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[13px] font-bold"
              >«</button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-metronic-primary hover:text-metronic-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              ><ChevronLeft size={14} /></button>

              {getPageNumbers().map((page, idx) =>
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-400 text-[13px]">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-colors ${
                      currentPage === page
                        ? 'bg-metronic-primary text-white border border-metronic-primary'
                        : 'border border-slate-200 text-slate-600 hover:border-metronic-primary hover:text-metronic-primary'
                    }`}
                  >{page}</button>
                )
              )}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-metronic-primary hover:text-metronic-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              ><ChevronRight size={14} /></button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-metronic-primary hover:text-metronic-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-[13px] font-bold"
              >»</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Yeni Ödeme Modalı ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetPaymentExtras(); }}
        title="Yeni Ödeme Al"
        subtitle={distributionType === 'FIFO' ? 'FIFO algoritması ödemeyi otomatik dağıtacak.' : 'Ödemeyi seçtiğiniz tedavi kalemlerine manuel olarak dağıtın.'}
        size={distributionType === 'TREATMENT_BASED' ? 'lg' : 'md'}
        footer={
          <>
            <button
              type="button"
              onClick={() => { setModalOpen(false); resetPaymentExtras(); }}
              disabled={isSubmitting}
              className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              form="add-payment-form"
              disabled={isSubmitting}
              className="px-5 py-2 text-[13px] font-bold bg-metronic-success text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
            </button>
          </>
        }
      >
        <form id="add-payment-form" onSubmit={handleSubmit(onPaymentSubmit)} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3">
            <Info size={16} className="text-slate-400 flex-shrink-0" />
            <p className="text-[12px] text-slate-600">
              Hastanın kalan bakiyesi: <span className="font-bold text-metronic-danger">₺{formatCurrency(balance?.totalDebt || 0)}</span>
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tutar (₺) <span className="text-metronic-danger">*</span></label>
            <input
              type="number"
              step="0.01"
              {...register('amount')}
              className={`m-input text-xl font-bold ${errors.amount ? 'border-red-500' : ''}`}
              placeholder="0.00"
            />
            {errors.amount && <span className="text-red-500 text-[10px]">{errors.amount.message}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ödeme Tarihi</label>
              <input type="date" {...register('date')} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ödeme Yöntemi</label>
              <select {...register('method')} className="m-input">
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kasa / Banka</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} className="m-input">
                <option value="">Seçiniz...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dağılım Türü</label>
              <select
                value={distributionType}
                onChange={e => { setDistributionType(e.target.value as 'FIFO' | 'TREATMENT_BASED'); setAllocations({}); setSelectedItemIds([]); }}
                className="m-input"
              >
                <option value="FIFO">FIFO</option>
                <option value="TREATMENT_BASED">Tedavi Bazlı</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Açıklama</label>
            <input type="text" {...register('description')} className="m-input" placeholder="İsteğe bağlı not" />
          </div>

          {distributionType === 'FIFO' ? (
            <div className="p-3 bg-metronic-primary-light/50 rounded-lg border border-metronic-primary/20 flex items-start gap-3">
              <CheckCircle2 size={18} className="text-metronic-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold text-metronic-primary">FIFO Dağıtım</p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">Ödeme kaydedildiğinde sistem önce tamamlanan tedavilere, sonra sıradaki bekleyen kalemlere otomatik olarak dağıtacak.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tedaviye Göre Dağıtım</label>
                <span className={`text-[11px] font-bold ${Math.abs(allocationsTotal - (parseFloat(watch('amount')) || 0)) > 0.01 ? 'text-metronic-danger' : 'text-metronic-success'}`}>
                  Dağıtılan: ₺{formatCurrency(allocationsTotal)} / ₺{formatCurrency(parseFloat(watch('amount')) || 0)}
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={unpaidItems.length > 0 && selectedItemIds.length === unpaidItems.length}
                          onChange={() => setSelectedItemIds(selectedItemIds.length === unpaidItems.length ? [] : unpaidItems.map(i => i.id))}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                        />
                      </th>
                      <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tedavi</th>
                      <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hekim</th>
                      <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Kalan Borç</th>
                      <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right w-32">Ödenecek Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unpaidItems.length === 0 ? (
                      <tr><td colSpan={5} className="py-6 text-center text-slate-400 text-[12px]">Ödenmemiş tedavi kalemi bulunmuyor.</td></tr>
                    ) : unpaidItems.map(item => {
                      const isChecked = selectedItemIds.includes(item.id);
                      return (
                        <tr key={item.id} className={isChecked ? 'bg-metronic-primary-light/10' : ''}>
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleItemSelect(item.id)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 text-[12px] font-semibold text-slate-700">
                            {item.name} {item.toothNo ? <span className="text-slate-400 font-mono">#{item.toothNo}</span> : null}
                          </td>
                          <td className="py-2 px-3 text-[12px] text-slate-500">{item.doctorName}</td>
                          <td className="py-2 px-3 text-[12px] font-bold text-metronic-danger text-right">₺{formatCurrency(item.remainingDebt)}</td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              max={item.remainingDebt}
                              value={allocations[item.id] ?? ''}
                              disabled={!isChecked}
                              onChange={e => setAllocationAmount(item.id, e.target.value, item.remainingDebt)}
                              placeholder="0.00"
                              className="m-input text-right text-[12px] py-1.5 disabled:bg-slate-50 disabled:text-slate-300"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* ── İade Modalı ── */}
      <Modal
        isOpen={refundModalOpen}
        onClose={() => { setRefundModalOpen(false); resetRefund(); resetRefundExtras(); }}
        title="İade Yap"
        subtitle="İade tutarını, ödemesi yapılan tedavi kalemlerinden seçtiklerinize dağıtın."
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setRefundModalOpen(false); resetRefund(); resetRefundExtras(); }}
              disabled={isRefundSubmitting}
              className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              form="add-refund-form"
              disabled={isRefundSubmitting}
              className="px-5 py-2 text-[13px] font-bold bg-metronic-danger text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {isRefundSubmitting ? 'Kaydediliyor...' : 'İadeyi Kaydet'}
            </button>
          </>
        }
      >
        <form id="add-refund-form" onSubmit={handleRefundSubmit(onRefundSubmit)} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3">
            <Info size={16} className="text-slate-400 flex-shrink-0" />
            <p className="text-[12px] text-slate-600">
              Hastanın kalan bakiyesi: <span className="font-bold text-metronic-danger">₺{formatCurrency(balance?.totalDebt || 0)}</span>
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">İade Tutarı (₺) <span className="text-metronic-danger">*</span></label>
            <input
              type="number"
              step="0.01"
              {...registerRefund('amount')}
              className={`m-input text-xl font-bold ${refundErrors.amount ? 'border-red-500' : ''}`}
              placeholder="0.00"
            />
            {refundErrors.amount && <span className="text-red-500 text-[10px]">{refundErrors.amount.message}</span>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">İade Tarihi</label>
              <input type="date" {...registerRefund('date')} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">İade Yöntemi</label>
              <select {...registerRefund('method')} className="m-input">
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kasa / Banka</label>
            <select value={refundAccountId} onChange={e => setRefundAccountId(e.target.value)} className="m-input">
              <option value="">Seçiniz...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Açıklama</label>
            <input type="text" {...registerRefund('description')} className="m-input" placeholder="İsteğe bağlı not" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ödemesi Yapılan Tedaviler</label>
              <span className={`text-[11px] font-bold ${Math.abs(refundAllocationsTotal - (parseFloat(watchRefund('amount')) || 0)) > 0.01 ? 'text-metronic-danger' : 'text-metronic-success'}`}>
                Dağıtılan: ₺{formatCurrency(refundAllocationsTotal)} / ₺{formatCurrency(parseFloat(watchRefund('amount')) || 0)}
              </span>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={paidItems.length > 0 && refundSelectedItemIds.length === paidItems.length}
                        onChange={() => setRefundSelectedItemIds(refundSelectedItemIds.length === paidItems.length ? [] : paidItems.map(i => i.id))}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                      />
                    </th>
                    <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tedavi</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hekim</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Ödenen Tutar</th>
                    <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right w-32">İade Edilecek Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {advanceBalance > 0 && (() => {
                    const isChecked = refundSelectedItemIds.includes(ADVANCE_KEY);
                    return (
                      <tr className={isChecked ? 'bg-metronic-primary-light/10' : ''}>
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRefundItemSelect(ADVANCE_KEY)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-[12px] font-semibold text-slate-700">
                          <span className="inline-flex items-center gap-1.5">
                            <Wallet size={13} className="text-metronic-primary" /> Avans Bakiyesi
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[12px] text-slate-400">—</td>
                        <td className="py-2 px-3 text-[12px] font-bold text-metronic-success text-right">₺{formatCurrency(advanceBalance)}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            max={advanceBalance}
                            value={refundAllocations[ADVANCE_KEY] ?? ''}
                            disabled={!isChecked}
                            onChange={e => setRefundAllocationAmount(ADVANCE_KEY, e.target.value, advanceBalance)}
                            placeholder="0.00"
                            className="m-input text-right text-[12px] py-1.5 disabled:bg-slate-50 disabled:text-slate-300"
                          />
                        </td>
                      </tr>
                    );
                  })()}
                  {paidItems.length === 0 && advanceBalance <= 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400 text-[12px]">Ödemesi yapılan tedavi kalemi bulunmuyor.</td></tr>
                  ) : paidItems.map(item => {
                    const isChecked = refundSelectedItemIds.includes(item.id);
                    return (
                      <tr key={item.id} className={isChecked ? 'bg-metronic-primary-light/10' : ''}>
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRefundItemSelect(item.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-[12px] font-semibold text-slate-700">
                          {item.name} {item.toothNo ? <span className="text-slate-400 font-mono">#{item.toothNo}</span> : null}
                        </td>
                        <td className="py-2 px-3 text-[12px] text-slate-500">{item.doctorName}</td>
                        <td className="py-2 px-3 text-[12px] font-bold text-metronic-success text-right">₺{formatCurrency(item.paidAmount)}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            max={item.paidAmount}
                            value={refundAllocations[item.id] ?? ''}
                            disabled={!isChecked}
                            onChange={e => setRefundAllocationAmount(item.id, e.target.value, item.paidAmount)}
                            placeholder="0.00"
                            className="m-input text-right text-[12px] py-1.5 disabled:bg-slate-50 disabled:text-slate-300"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Ödeme Silme Onay Modalı ── */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeletePayments}
        loading={deleting}
        title="Ödeme(leri) Sil"
        confirmLabel="Evet, Sil"
        message={
          <>
            <strong>{selectedIds.length}</strong> adet ödeme kaydını silmek üzeresiniz. Silinen ödemelerin tedavi kalemlerine dağıtılan tutarları hasta borcuna geri eklenecek, avans olarak kaydedilen kısım avans bakiyesinden düşülecektir. Bu işlem geri alınamaz.
          </>
        }
      />
    </div>
  );
}
