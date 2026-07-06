'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  Download,
  FileSpreadsheet,
  TrendingUp,
  BarChart3,
  Calendar as CalendarIcon,
  Loader2,
  Stethoscope,
  ChevronDown,
  Activity,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Check,
  Filter,
} from 'lucide-react';
import { ReportsService, IncomeSummary, TreatmentPerformance } from '../../../lib/services/reports.service';
import Skeleton from '../../../components/ui/Skeleton';
import { useToastStore } from '../../../store/toastStore';
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
          <ArrowUp size={9} className={active && sortDirection === 'asc' ? 'text-metronic-primary' : 'opacity-25 group-hover/th:opacity-60'} />
          <ArrowDown size={9} className={active && sortDirection === 'desc' ? 'text-metronic-primary' : 'opacity-25 group-hover/th:opacity-60'} />
        </span>
      </div>
    </th>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinancialReportPage() {
  const [summary, setSummary] = useState<IncomeSummary | null>(null);
  const [treatments, setTreatments] = useState<TreatmentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSort, setFilterSort] = useState('ALL');
  const [sortColumn, setSortColumn] = useState('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);
  const addToast = useToastStore(state => state.addToast);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryData, treatmentData] = await Promise.all([
        ReportsService.getIncomeSummary(),
        ReportsService.getTreatmentPerformance()
      ]);
      setSummary(summaryData);
      setTreatments(treatmentData);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Rapor verileri yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchData();
  }, [fetchData]);

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  // Filter → Sort → Paginate pipeline for treatments
  const filteredTreatments = treatments.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedTreatments = [...filteredTreatments].sort((a, b) => {
    const av = (a as any)[sortColumn];
    const bv = (b as any)[sortColumn];
    const as2 = typeof av === 'string' ? av.toLowerCase() : av;
    const bs2 = typeof bv === 'string' ? bv.toLowerCase() : bv;
    if (as2 < bs2) return sortDirection === 'asc' ? -1 : 1;
    if (as2 > bs2) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedTreatments.length / pageLimit));
  const paginatedTreatments = sortedTreatments.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);
  const startEntry = sortedTreatments.length === 0 ? 0 : (currentPage - 1) * pageLimit + 1;
  const endEntry = Math.min(currentPage * pageLimit, sortedTreatments.length);

  const pageWindow = () => {
    const pages: number[] = [];
    let s = Math.max(1, currentPage - 2);
    const e = Math.min(totalPages, s + 4);
    if (e - s < 4) s = Math.max(1, e - 4);
    for (let i = s; i <= e; i++) pages.push(i);
    return pages;
  };

  const exportTreatmentsCSV = () => {
    const BOM = '﻿';
    const headers = ['İşlem Adı', 'Uygulama Sayısı', 'Toplam Ciro (₺)'];
    const rows = sortedTreatments.map(r => [r.name, r.count, r.revenue.toFixed(2)]);
    const csv = BOM + [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tedavi_ciro_analizi.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const sortOpts = [
    { value: 'ALL', label: 'Varsayılan Sıralama' },
    { value: 'TOP_REVENUE', label: 'En Yüksek Ciro' },
    { value: 'TOP_COUNT', label: 'En Çok Uygulanan' },
  ];

  // Apply preset sort filter
  const applyPresetSort = (preset: string) => {
    setFilterSort(preset);
    if (preset === 'TOP_REVENUE') { setSortColumn('revenue'); setSortDirection('desc'); }
    else if (preset === 'TOP_COUNT') { setSortColumn('count'); setSortDirection('desc'); }
    setCurrentPage(1);
  };

  return (
    <MetronicLayout title="Finansal Analiz ve Raporlar" breadcrumbs={['Raporlar', 'Finansal']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : summary && (
          <>
            <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-metronic-success-light text-metronic-success"><ArrowUpCircle size={20} /></div>
                <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">GELİR</div>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aylık Tahsilat</p>
              <h3 className="text-[1.3rem] font-black text-slate-800 dark:text-white mt-1 leading-none">{fmt(summary.monthlyIncome)}</h3>
              <p className="text-[11px] text-slate-500 mt-2">Bu Ay Toplam</p>
            </div>

            <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50 text-red-500"><ArrowDownCircle size={20} /></div>
                <div className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">GİDER</div>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aylık Gider</p>
              <h3 className="text-[1.3rem] font-black text-slate-800 dark:text-white mt-1 leading-none">{fmt(summary.monthlyExpense)}</h3>
              <p className="text-[11px] text-slate-500 mt-2">Klinik Harcamaları</p>
            </div>

            <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-metronic-primary-light text-metronic-primary"><Activity size={20} /></div>
                <div className="text-[10px] font-bold text-metronic-primary bg-metronic-primary-light px-2 py-0.5 rounded-full">NET KAR</div>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aylık Net Kar</p>
              <h3 className={`text-[1.3rem] font-black mt-1 leading-none ${summary.netMonthlyProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fmt(summary.netMonthlyProfit)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-2">Gelir - Gider Dengesi</p>
            </div>

            <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600"><BarChart3 size={20} /></div>
                <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">BAŞARI</div>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tahsilat Oranı</p>
              <h3 className="text-[1.3rem] font-black text-slate-800 dark:text-white mt-1 leading-none">%{summary.collectionRate.toFixed(1)}</h3>
              <p className="text-[11px] text-slate-500 mt-2">Genel Alacak Yönetimi</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Tedavi Performansı (Left Col) */}
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 shadow-sm overflow-hidden h-full flex flex-col">
            {/* Table Toolbar */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-metronic-primary" /> Tedavi Bazlı Ciro Analizi
                </h4>
                <p className="text-[12px] text-slate-500 mt-0.5">En çok gelir getiren işlemler ve uygulama sayıları</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative w-full md:w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="İşlem ara..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] outline-none focus:border-metronic-primary transition-all"
                  />
                </div>

                <Dropdown
                  trigger={
                    <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-[12px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all flex-shrink-0">
                      <Filter size={13} /> <ChevronDown size={11} className="opacity-60" />
                    </button>
                  }
                >
                  {sortOpts.map(opt => (
                    <DropdownItem
                      key={opt.value}
                      label={opt.label}
                      active={filterSort === opt.value}
                      onClick={() => applyPresetSort(opt.value)}
                    />
                  ))}
                </Dropdown>

                <Dropdown
                  trigger={
                    <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-[12px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all flex-shrink-0">
                      <Download size={13} /> <ChevronDown size={11} className="opacity-60" />
                    </button>
                  }
                >
                  <DropdownItem icon={<FileSpreadsheet size={14} className="text-green-600" />} label="CSV / Excel" onClick={exportTreatmentsCSV} />
                </Dropdown>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <SortableHeader label="İşlem Adı" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Uygulama Sayısı" column="count" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="center" />
                    <SortableHeader label="Toplam Ciro (Brüt)" column="revenue" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="right" />
                    <th className="px-6 py-4">Pazar Payı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-12 mx-auto" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-24 ml-auto" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-2 w-32" /></td>
                      </tr>
                    ))
                  ) : paginatedTreatments.length > 0 ? (
                    paginatedTreatments.map((t, idx) => {
                      const maxRevenue = Math.max(...treatments.map(x => x.revenue), 1);
                      const percentage = (t.revenue / maxRevenue) * 100;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-metronic-primary-light group-hover:text-metronic-primary transition-colors">
                                <Stethoscope size={14} />
                              </div>
                              <span className="text-[13px] font-bold text-slate-700">{t.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg">{t.count}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-metronic-primary">{fmt(t.revenue)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 w-40">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-metronic-primary" style={{ width: `${percentage}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">%{percentage.toFixed(0)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">Veri bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!loading && sortedTreatments.length > 0 && (
              <div className="p-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-slate-500">Sayfa başı:</span>
                  <select
                    value={pageLimit}
                    onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
                    className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-bold outline-none cursor-pointer"
                  >
                    {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="text-[12px] text-slate-500">
                    {startEntry}–{endEntry} / <span className="font-bold text-slate-700">{sortedTreatments.length}</span> kayıt
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition-all text-[10px] font-bold">«</button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition-all"><ChevronLeft size={14} /></button>
                  {pageWindow().map(p => (
                    <button key={p} onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12px] font-bold transition-all ${p === currentPage ? 'bg-metronic-primary text-white shadow-lg shadow-metronic-primary/20' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition-all"><ChevronRight size={14} /></button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 transition-all text-[10px] font-bold">»</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Günlük Durum ve Hızlı Linkler (Right Col) */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 p-6 shadow-sm">
            <h4 className="text-[14px] font-bold text-slate-700 mb-6 flex items-center gap-2">
              <Activity size={18} className="text-metronic-primary" /> Bugünün Özeti
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[12px] font-bold text-slate-500 uppercase">Günlük Tahsilat</span>
                <span className="text-[15px] font-black text-emerald-600">{summary ? fmt(summary.dailyIncome) : '...'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[12px] font-bold text-slate-500 uppercase">Günlük Gider</span>
                <span className="text-[15px] font-black text-red-600">{summary ? fmt(summary.dailyExpense) : '...'}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-metronic-primary/5 rounded-xl border border-metronic-primary/10">
                <span className="text-[12px] font-bold text-metronic-primary uppercase">Günlük Net Durum</span>
                <span className={`text-[15px] font-black ${summary && (summary.dailyIncome - summary.dailyExpense >= 0) ? 'text-metronic-primary' : 'text-red-600'}`}>
                  {summary ? fmt(summary.dailyIncome - summary.dailyExpense) : '...'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-metronic-primary to-blue-700 rounded-xl p-6 text-white shadow-lg shadow-blue-500/20">
            <h4 className="text-[15px] font-black mb-2">Hızlı İşlemler</h4>
            <p className="text-[12px] opacity-80 mb-6 font-medium">Finansal kayıtlarınızı güncel tutarak daha sağlıklı raporlar elde edin.</p>
            <div className="space-y-2">
              <button onClick={() => window.location.href = '/finance/expenses'} className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-2">
                <Receipt size={16} /> Gider Kaydı Ekle
              </button>
              <button onClick={() => window.location.href = '/appointments'} className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-2">
                <CalendarIcon size={16} /> Tahsilat Ekranı (Takvim)
              </button>
            </div>
          </div>
        </div>

      </div>
    </MetronicLayout>
  );
}
