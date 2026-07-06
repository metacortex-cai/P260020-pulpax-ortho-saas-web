'use client';

import React, { useState, useRef, useEffect } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import {
  Users,
  Search,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  Wallet,
  ChevronDown,
  Phone,
  ArrowUp,
  ArrowDown,
  Check,
  Filter,
} from 'lucide-react';
import { ReportsService, DebtorReportItem } from '../../../lib/services/reports.service';
import Dropdown from '../../../components/ui/Dropdown';

// ─── Helper components ────────────────────────────────────────────────────────

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
      className={`w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-left transition-colors ${
        active
          ? 'bg-metronic-primary/5 text-metronic-primary font-bold'
          : 'text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-white/5'
      }`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1">{label}</span>
      {active && <Check size={13} className="text-metronic-primary flex-shrink-0" />}
    </button>
  );
}

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  align = 'left',
}: {
  label: string;
  column: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (c: string) => void;
  align?: 'left' | 'center' | 'right';
}) {
  const active = sortColumn === column;
  const alignClass =
    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th className="px-6 py-4 cursor-pointer select-none group/th" onClick={() => onSort(column)}>
      <div className={`flex items-center gap-1.5 ${alignClass}`}>
        <span>{label}</span>
        <span className="flex flex-col gap-px">
          <ArrowUp
            size={9}
            className={
              active && sortDirection === 'asc'
                ? 'text-metronic-primary'
                : 'opacity-25 group-hover/th:opacity-60'
            }
          />
          <ArrowDown
            size={9}
            className={
              active && sortDirection === 'desc'
                ? 'text-metronic-primary'
                : 'opacity-25 group-hover/th:opacity-60'
            }
          />
        </span>
      </div>
    </th>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DebtorsReportPage() {
  const [data, setData] = useState<DebtorReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortColumn, setSortColumn] = useState('delayDays');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await ReportsService.getDebtorsReport();
        setData(result);
        setCurrentPage(1);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Veriler yüklenirken bir hata oluştu.');
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusCls = (s: string) => {
    if (s === 'KRİTİK') return 'bg-metronic-danger-light text-metronic-danger';
    if (s === 'TAKİPTE') return 'bg-purple-50 text-purple-600';
    if (s === 'BEKLEYEN') return 'bg-amber-50 text-amber-600';
    return 'bg-slate-100 text-slate-500';
  };

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  // Derived KPI values
  const totalDebt = data.reduce((s, i) => s + i.totalDebt, 0);
  const overdueDebt = data.filter(i => i.delayDays >= 30).reduce((s, i) => s + i.totalDebt, 0);

  // Filter → Sort → Paginate
  const filtered = data.filter(item => {
    const ms =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const mf = filterStatus === 'ALL' || item.status === filterStatus;
    return ms && mf;
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = (a as any)[sortColumn];
    const bv = (b as any)[sortColumn];
    const as2 = typeof av === 'string' ? av.toLowerCase() : av;
    const bs2 = typeof bv === 'string' ? bv.toLowerCase() : bv;
    if (as2 < bs2) return sortDirection === 'asc' ? -1 : 1;
    if (as2 > bs2) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));
  const paginated = sorted.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);
  const startEntry = sorted.length === 0 ? 0 : (currentPage - 1) * pageLimit + 1;
  const endEntry = Math.min(currentPage * pageLimit, sorted.length);

  const pageWindow = () => {
    const pages: number[] = [];
    let s = Math.max(1, currentPage - 2);
    const e = Math.min(totalPages, s + 4);
    if (e - s < 4) s = Math.max(1, e - 4);
    for (let i = s; i <= e; i++) pages.push(i);
    return pages;
  };

  const exportCSV = () => {
    const BOM = '﻿';
    const headers = ['Hasta No', 'Ad Soyad', 'Telefon', 'Son Ödeme', 'Gecikme (Gün)', 'Durum', 'Kalan Borç (₺)'];
    const rows = sorted.map(r => [r.id, r.name, r.phone, r.lastPayment, r.delayDays, r.status, r.totalDebt.toFixed(2)]);
    const csv = BOM + [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'borclu_listesi.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const statusOpts = [
    { value: 'ALL', label: 'Tüm Durumlar' },
    { value: 'KRİTİK', label: 'Kritik' },
    { value: 'TAKİPTE', label: 'Takipte' },
    { value: 'BEKLEYEN', label: 'Bekleyen' },
  ];

  return (
    <MetronicLayout title="Borçlu Listesi Raporu" breadcrumbs={['Raporlar', 'Muhasebe']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Toplam Alacak', value: loading ? '—' : fmt(totalDebt), sub: 'Tüm hastalar', icon: <Wallet size={20} />, color: 'text-metronic-primary', bg: 'bg-metronic-primary-light dark:bg-metronic-primary/10' },
          { label: 'Gecikmiş Alacak', value: loading ? '—' : fmt(overdueDebt), sub: '30+ gün geciken', icon: <AlertCircle size={20} />, color: 'text-metronic-danger', bg: 'bg-red-50 dark:bg-red-500/10' },
          { label: 'Borçlu Hasta', value: loading ? '—' : `${data.length} Kişi`, sub: 'Aktif borcu olan', icon: <Users size={20} />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Kritik Borçlu', value: loading ? '—' : `${data.filter(i => i.status === 'KRİTİK').length} Kişi`, sub: 'Acil takip gereken', icon: <Clock size={20} />, color: 'text-metronic-success', bg: 'bg-metronic-success-light dark:bg-metronic-success/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg} ${stat.color}`}>{stat.icon}</div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-[1.3rem] font-black text-slate-800 dark:text-white mt-1 leading-none">{stat.value}</h3>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-metronic-danger text-[13px] font-medium">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Hasta adı veya dosya no ara..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-metronic-primary/20 transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <Dropdown
                trigger={
                  <button className="flex items-center gap-2 h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-[12px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all">
                    <Filter size={14} /> {statusOpts.find(o => o.value === filterStatus)?.label} <ChevronDown size={12} className="opacity-60" />
                  </button>
                }
              >
                {statusOpts.map(opt => (
                  <DropdownItem
                    key={opt.value}
                    label={opt.label}
                    active={filterStatus === opt.value}
                    onClick={() => { setFilterStatus(opt.value); setCurrentPage(1); }}
                  />
                ))}
              </Dropdown>

              <Dropdown
                trigger={
                  <button className="flex items-center gap-2 h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-[12px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all">
                    <Download size={14} /> Dışa Aktar <ChevronDown size={12} className="opacity-60" />
                  </button>
                }
              >
                <DropdownItem
                  icon={<FileSpreadsheet size={14} className="text-green-600" />}
                  label="CSV / Excel"
                  onClick={exportCSV}
                />
              </Dropdown>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50/50 dark:bg-white/[0.02] text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                <SortableHeader label="Hasta Bilgisi" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="px-6 py-4">İletişim</th>
                <SortableHeader label="Son Ödeme" column="lastPayment" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="center" />
                <SortableHeader label="Gecikme (Gün)" column="delayDays" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="center" />
                <th className="px-6 py-4 text-center">Durum</th>
                <SortableHeader label="Kalan Borç" column="totalDebt" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex items-center justify-center gap-3 text-slate-400">
                      <div className="w-5 h-5 border-2 border-metronic-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-[13px]">Veriler yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && !error && paginated.length === 0 && (
                <tr><td colSpan={6} className="py-16 text-center text-slate-400 text-[13px]">Veri bulunamadı.</td></tr>
              )}
              {!loading && paginated.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-slate-800 dark:text-white leading-tight">{item.name}</span>
                      <span className="text-[11px] text-slate-400 font-medium mt-0.5">{item.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-[13px]">
                      <Phone size={12} className="opacity-40" /> {item.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400 text-[13px] font-medium">{item.lastPayment}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[13px] font-bold ${item.delayDays > 30 ? 'text-metronic-danger' : 'text-slate-700 dark:text-slate-300'}`}>
                      {item.delayDays} gün
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${getStatusCls(item.status)}`}>{item.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-metronic-danger">{fmt(item.totalDebt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-slate-500">Sayfa başı:</span>
            <select
              value={pageLimit}
              onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="h-9 px-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[12px] font-bold outline-none cursor-pointer"
            >
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-[13px] text-slate-500 font-medium">
              {startEntry}–{endEntry} / <span className="font-bold text-slate-700 dark:text-white">{sorted.length}</span> kayıt
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition-all text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition-all"><ChevronLeft size={16} /></button>
            {pageWindow().map(p => (
              <button key={p} onClick={() => setCurrentPage(p)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all ${p === currentPage ? 'bg-metronic-primary text-white shadow-lg shadow-metronic-primary/20' : 'border border-slate-200 dark:border-white/10 text-slate-600 hover:bg-slate-50'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition-all"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition-all text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>
    </MetronicLayout>
  );
}
