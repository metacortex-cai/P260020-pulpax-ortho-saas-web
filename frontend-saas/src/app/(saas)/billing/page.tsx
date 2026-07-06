'use client';

import { useState, useEffect, useRef } from 'react';
import {
  CreditCard, DollarSign, Users, Award, TrendingUp, Search, Calendar, RefreshCw,
  Star, CheckCircle, AlertCircle, Filter, ChevronDown, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, X
} from 'lucide-react';
import SaasMetronicLayout from '../../../components/layout/SaasMetronicLayout';
import { SaasService } from '../../../lib/services/saas.service';
import { useToastStore } from '../../../store/toastStore';
import { formatCurrency } from '../../../lib/utils/formatCurrency';

// --- ADR-001 standard file-local table components (see docs/ADR/ADR-001-standard-table-pattern.md) ---

function Dropdown({ trigger, children, align = 'right' }: { trigger: React.ReactNode; children: React.ReactNode; align?: 'right' | 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-50 bg-white dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl dark:shadow-[0_15px_50px_rgba(0,0,0,0.4)] min-w-[190px] py-1.5`} style={{ animation: 'fadeInDown 0.12s ease' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({ icon, label, active = false, danger = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : active ? 'text-metronic-primary bg-metronic-primary-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort, icon }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void; icon?: React.ReactNode }) {
  const isActive = sortColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={13} className="text-metronic-primary" /> : <ArrowDown size={13} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

export default function SaasBillingPage() {
  const { addToast } = useToastStore();
  const [clinics, setClinics] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ADR-001 standard state
  const [planFilter, setPlanFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(25);

  const fetchClinics = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await SaasService.getClinics();
      setClinics(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Klinik fatura verileri yüklenemedi.';
      setError(msg);
      addToast({ type: 'error', message: msg });
      setClinics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchClinics();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchClinics is redefined every render; adding it would retrigger this effect on every render
  }, []);

  // Compute Metrics
  const totalClinics = clinics.length;
  const activePaid = clinics.filter(c => c.plan !== 'FREE' && c.status === 'ACTIVE').length;
  const totalARR = clinics.reduce((acc, c) => {
    const prices: Record<string, number> = { FREE: 0, BASIC: 2400, PRO: 6000, ENTERPRISE: 15000 };
    return acc + (prices[c.plan] || 0);
  }, 0);
  const totalOutstandingBalance = clinics.reduce((acc, c) => acc + (Number(c.currentBalance) || 0), 0);

  const plans = Array.from(new Set(clinics.map(c => c.plan))).filter(Boolean);

  const filtered = clinics.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.plan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter ? c.plan === planFilter : true;
    return matchesSearch && matchesPlan;
  });

  const getSortedData = () => {
    const sorted = [...filtered];
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal: any = a[sortColumn];
        let bVal: any = b[sortColumn];
        if (sortColumn === 'currentBalance') {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        } else if (sortColumn === 'subscriptionEndDate') {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal as any)?.toLowerCase?.() ?? bVal;
        }
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  };

  const sortedData = getSortedData();
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageLimit));
  const paginated = sortedData.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  // Arama veya plan filtresi değişince sayfayı sıfırla (render sırasında, efekt olmadan)
  const [prevPagingFilters, setPrevPagingFilters] = useState({ searchTerm, planFilter });
  if (searchTerm !== prevPagingFilters.searchTerm || planFilter !== prevPagingFilters.planFilter) {
    setPrevPagingFilters({ searchTerm, planFilter });
    setCurrentPage(1);
  }

  return (
    <SaasMetronicLayout
      title="SaaS Finans & Faturalandırma"
      breadcrumbs={['Finans & Faturalar']}
      headerAction={
        <button
          onClick={fetchClinics}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-slate-200/60 dark:border-white/10 dark:text-white rounded-lg text-[13px] font-bold shadow-sm transition-all"
        >
          <RefreshCw size={14} /> Verileri Yenile
        </button>
      }
    >
      <style>{`
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <div className="flex flex-col gap-6">

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Yıllık Tekrarlayan Gelir (ARR)</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">₺{formatCurrency(totalARR)}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign size={22} />
            </div>
          </div>

          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Aktif Ücretli Abonelik</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">{activePaid} / {totalClinics}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Award size={22} />
            </div>
          </div>

          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Toplam Bakiye</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">₺{formatCurrency(totalOutstandingBalance)}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <CreditCard size={22} />
            </div>
          </div>

          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tahmini Büyüme Oranı</span>
              <span className="text-2xl font-black text-emerald-500 mt-1 block">+18.5%</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>

        {/* Clinics Subscription Health */}
        <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm flex flex-col">
          {/* Header, Badge, Search & Filter */}
          <div className="p-5 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Klinik Abonelik & Hak Ediş Durumları</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Kliniklerin plan durumları ve lisans bitiş süreleri</p>
              </div>
              <span className="px-3 py-1 bg-metronic-primary/10 text-metronic-primary text-[11px] font-bold rounded-full border border-metronic-primary/20 whitespace-nowrap">
                {filtered.length} KLİNİK
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Klinik veya plan ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-[13px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all dark:text-white"
                />
              </div>
              <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-[38px] px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 text-[13px] font-medium shadow-sm"><Filter size={16} /> Plan <ChevronDown size={14} className="opacity-50" /></button>}>
                <DropdownItem icon={<X size={14} />} label="Filtreyi Temizle" active={!planFilter} onClick={() => setPlanFilter(null)} />
                {plans.map(p => <DropdownItem key={p} label={p} active={planFilter === p} onClick={() => setPlanFilter(p)} icon={<div className="w-2 h-2 rounded-full bg-slate-300" />} />)}
              </Dropdown>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-200/60 dark:border-white/5">
                  <SortableHeader label="Klinik" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Aktif Abonelik Planı" column="plan" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Bakiye" column="currentBalance" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Lisans Bitiş Tarihi" column="subscriptionEndDate" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-white/5">
                      <td className="px-5 py-3.5">
                        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-white/10 mb-1.5" />
                        <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/10" />
                      </td>
                      <td className="px-5 py-3.5"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-white/10" /></td>
                      <td className="px-5 py-3.5 text-center"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-white/10 mx-auto" /></td>
                      <td className="px-5 py-3.5 text-center"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-white/10 mx-auto" /></td>
                      <td className="px-5 py-3.5 text-right"><div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-white/10 ml-auto" /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-sm">
                      {clinics.length === 0 ? 'Kayıtlı klinik bulunmuyor.' : 'Aranan kriterde klinik bulunamadı.'}
                    </td>
                  </tr>
                ) : paginated.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-800 dark:text-white block">{c.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">ID: {c.id}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Star size={14} className="text-amber-500 fill-amber-500" />
                        <span className="font-bold text-slate-700 dark:text-slate-200">{c.plan}</span>
                        <span className="text-[10px] text-slate-400">
                          ({c.plan === 'ENTERPRISE' ? '₺15.000 / Yıl' : c.plan === 'PRO' ? '₺6.000 / Yıl' : c.plan === 'BASIC' ? '₺2.400 / Yıl' : 'Trial'})
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-900 dark:text-white">
                      ₺{formatCurrency(Number(c.currentBalance || 0))}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-slate-500">
                        <Calendar size={14} />
                        <span>{new Date(c.subscriptionEndDate).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                      }`}>
                        {c.status === 'ACTIVE' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200/60 dark:border-white/5">
            <span className="text-slate-500 text-[13px]">Toplam <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> kayıt</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10"><ChevronLeft size={16} /></button>
              <span className="px-3 text-[13px] font-bold">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

      </div>
    </SaasMetronicLayout>
  );
}
