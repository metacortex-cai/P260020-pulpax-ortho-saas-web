'use client';

import React, { useState, useRef, useEffect } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import {
  Calendar as CalendarIcon,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  UserCheck,
  UserX,
  Clock,
  ChevronDown,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  Filter,
} from 'lucide-react';
import { ReportsService, AppointmentReportItem } from '../../../lib/services/reports.service';
import { formatCurrency } from '../../../lib/utils/formatCurrency';
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
            className={active && sortDirection === 'asc' ? 'text-metronic-primary' : 'opacity-25 group-hover/th:opacity-60'}
          />
          <ArrowDown
            size={9}
            className={active && sortDirection === 'desc' ? 'text-metronic-primary' : 'opacity-25 group-hover/th:opacity-60'}
          />
        </span>
      </div>
    </th>
  );
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  'TAMAMLANDI': { label: 'Tamamlandı', color: 'text-metronic-success', bg: 'bg-metronic-success-light dark:bg-metronic-success/10' },
  'GELMEDİ': { label: 'Gelmedi', color: 'text-metronic-danger', bg: 'bg-red-50 dark:bg-red-500/10' },
  'BEKLEMEDE': { label: 'Beklemede', color: 'text-metronic-primary', bg: 'bg-metronic-primary-light dark:bg-metronic-primary/10' },
  'İPTAL': { label: 'İptal Edildi', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-white/5' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppointmentReportPage() {
  const [data, setData] = useState<AppointmentReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('2026-05-01');
  const [endDate, setEndDate] = useState('2026-05-31');
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await ReportsService.getAppointmentsReport(startDate, endDate);
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
  }, [startDate, endDate]);

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  };

  // Derived KPI values
  const totalAppointments = data.length;
  const completedCount = data.filter(i => i.status === 'TAMAMLANDI').length;
  const missedOrCancelledCount = data.filter(i => i.status === 'GELMEDİ' || i.status === 'İPTAL').length;

  // Filter → Sort → Paginate
  const filtered = data.filter(item => {
    const ms =
      item.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.doctor.toLowerCase().includes(searchTerm.toLowerCase());
    const mf = statusFilter === 'ALL' || item.status === statusFilter;
    return ms && mf;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av = (a as any)[sortColumn];
    let bv = (b as any)[sortColumn];
    if (sortColumn === 'date') { av = a.date + a.time; bv = b.date + b.time; }
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
    const headers = ['Randevu No', 'Hasta', 'Hekim', 'Tarih', 'Saat', 'İşlem/Hizmet', 'Kaynak', 'Durum'];
    const rows = sorted.map(r => [r.id, r.patient, r.doctor, formatDate(r.date), r.time, r.service, r.source, STATUS_MAP[r.status]?.label ?? r.status]);
    const csv = BOM + [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'randevu_raporu.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const statusOpts = [
    { value: 'ALL', label: 'Tüm Durumlar' },
    { value: 'TAMAMLANDI', label: 'Tamamlananlar' },
    { value: 'GELMEDİ', label: 'Gelmeyenler' },
    { value: 'BEKLEMEDE', label: 'Bekleyenler' },
    { value: 'İPTAL', label: 'İptal Edilenler' },
  ];

  return (
    <MetronicLayout title="Randevu Raporu" breadcrumbs={['Raporlar', 'Randevular']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Toplam Randevu', value: loading ? '—' : formatCurrency(totalAppointments), sub: 'Seçili dönem toplam', icon: <CalendarIcon size={20} />, color: 'text-metronic-primary', bg: 'bg-metronic-primary-light dark:bg-metronic-primary/10' },
          { label: 'Tamamlanan', value: loading ? '—' : formatCurrency(completedCount), sub: totalAppointments > 0 ? `%${Math.round(completedCount / totalAppointments * 100)} başarı oranı` : '—', icon: <UserCheck size={20} />, color: 'text-metronic-success', bg: 'bg-metronic-success-light dark:bg-metronic-success/10' },
          { label: 'Gelmedi / İptal', value: loading ? '—' : formatCurrency(missedOrCancelledCount), sub: totalAppointments > 0 ? `%${Math.round(missedOrCancelledCount / totalAppointments * 100)} kayıp oranı` : '—', icon: <UserX size={20} />, color: 'text-metronic-danger', bg: 'bg-red-50 dark:bg-red-500/10' },
          { label: 'Beklemede', value: loading ? '—' : formatCurrency(data.filter(i => i.status === 'BEKLEMEDE').length), sub: 'Onay bekleyen randevu', icon: <Clock size={20} />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg} ${stat.color}`}>{stat.icon}</div>
              <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md uppercase tracking-wider">Dönem</span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-[1.4rem] font-black text-slate-800 dark:text-white mt-1 leading-none">{stat.value}</h3>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <TrendingUp size={12} className="text-metronic-success" /> {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-metronic-danger text-[13px] font-medium">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-visible">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Hasta veya hekim ara..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-metronic-primary/20 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1">
                <CalendarIcon size={14} className="text-slate-400" />
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} className="bg-transparent border-none outline-none text-[12px] font-bold text-slate-600 dark:text-slate-300 py-1" />
                <ArrowRight size={12} className="text-slate-400" />
                <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} className="bg-transparent border-none outline-none text-[12px] font-bold text-slate-600 dark:text-slate-300 py-1" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Dropdown
                trigger={
                  <button className="flex items-center gap-2 h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-[12px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all">
                    <Filter size={14} /> {statusOpts.find(o => o.value === statusFilter)?.label} <ChevronDown size={12} className="opacity-60" />
                  </button>
                }
              >
                {statusOpts.map(opt => (
                  <DropdownItem
                    key={opt.value}
                    label={opt.label}
                    active={statusFilter === opt.value}
                    onClick={() => { setStatusFilter(opt.value); setCurrentPage(1); }}
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
                <DropdownItem icon={<FileSpreadsheet size={14} className="text-green-600" />} label="CSV / Excel" onClick={exportCSV} />
                <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="PDF (Yazdır)" onClick={() => window.print()} />
              </Dropdown>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50/50 dark:bg-white/[0.02] text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                <SortableHeader label="Sıra &amp; Tarih" column="date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Hasta" column="patient" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Hekim" column="doctor" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="İşlem / Hizmet" column="service" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="px-6 py-4">Kaynak</th>
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
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
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-300"><CalendarIcon size={32} /></div>
                      <h3 className="text-[16px] font-bold text-slate-800 dark:text-white mb-1">Veri Bulunamadı</h3>
                      <p className="text-[13px] text-slate-500 max-w-xs">Seçtiğiniz tarih aralığı veya filtrelere uygun herhangi bir randevu bulunmamaktadır.</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && paginated.map(item => {
                const statusInfo = STATUS_MAP[item.status] ?? { label: item.status, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-white/5' };
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-800 dark:text-white leading-tight">{formatDate(item.date)}</span>
                        <span className="text-[11px] text-slate-400 font-medium mt-0.5">{item.time} • {item.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-metronic-primary-light dark:bg-metronic-primary/15 text-metronic-primary flex items-center justify-center text-[12px] font-black">
                          {item.patient.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 leading-tight">{item.patient}</span>
                          <span className="text-[11px] font-semibold text-slate-400 mt-0.5 tracking-tight">{item.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400">{item.doctor}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{item.service}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded text-[10px] font-black uppercase tracking-tight">{item.source}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider ${statusInfo.bg} ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
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
