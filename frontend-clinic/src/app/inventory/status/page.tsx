'use client';

import { useState, useEffect, useRef } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import { InventoryService } from '../../../lib/services/inventory.service';
import Skeleton from '../../../components/ui/Skeleton';
import Dropdown from '../../../components/ui/Dropdown';
import { Layers, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCcw, Package, Search, ChevronDown, Download, Filter, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { useToastStore } from '../../../store/toastStore';
import Link from 'next/link';

function DropdownTrigger({ label }: { label: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 h-8 px-3 border border-slate-200 rounded-lg text-[12px] font-medium text-slate-600 hover:border-slate-300 bg-white shadow-sm transition-colors"
    >
      {label}
      <ChevronDown size={13} />
    </button>
  );
}

function DropdownItem({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-[13px] transition-colors ${
        active ? 'bg-metronic-primary/10 text-metronic-primary font-bold' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function SortableHeader({
  column, label, sortColumn, sortDirection, onSort, className,
}: {
  column: string; label: string; sortColumn: string; sortDirection: 'asc' | 'desc';
  onSort: (col: string) => void; className?: string;
}) {
  const active = sortColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      className={`py-3 px-6 text-[11px] font-bold text-slate-400 uppercase cursor-pointer select-none hover:text-slate-600 transition-colors whitespace-nowrap ${className ?? ''}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={active ? 'text-metronic-primary' : 'text-slate-300'}>
          {active ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}

function PgBtn({
  onClick, disabled, active, children,
}: { onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded text-[12px] font-bold transition-colors ${
        active
          ? 'bg-metronic-primary text-white'
          : disabled
          ? 'text-slate-300 cursor-not-allowed'
          : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

export default function InventoryStatusPage() {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);

  const addToast = useToastStore(state => state.addToast);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await InventoryService.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Stok özeti yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchSummary is redefined every render (not memoized); including it would re-run this effect on every render
  }, []);

  const criticalItems = summary.filter(s => s.isCritical);

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const filtered = summary.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q);
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'critical' && s.isCritical) ||
      (filterStatus === 'sufficient' && !s.isCritical);
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    let va: any, vb: any;
    switch (sortColumn) {
      case 'name':          va = a.name;                        vb = b.name;                        break;
      case 'totalQuantity': va = a.totalQuantity;               vb = b.totalQuantity;               break;
      case 'status':        va = a.isCritical ? 0 : 1;         vb = b.isCritical ? 0 : 1;         break;
      default:              va = '';                            vb = '';
    }
    if (va < vb) return sortDirection === 'asc' ? -1 : 1;
    if (va > vb) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));
  const paginated = sorted.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);
  const rangeStart = sorted.length === 0 ? 0 : (currentPage - 1) * pageLimit + 1;
  const rangeEnd = Math.min(currentPage * pageLimit, sorted.length);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const delta = 2;
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) pages.push(i);
    return pages;
  };

  const exportCSV = () => {
    const BOM = '﻿';
    const headers = ['Malzeme Adı', 'Birim', 'Toplam Stok', 'Durum'];
    const rows = filtered.map(s => [
      s.name,
      s.unit ?? '',
      s.totalQuantity,
      s.isCritical ? 'Kritik' : 'Yeterli',
    ]);
    const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'envanter-durumu.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterLabel = filterStatus === 'critical' ? 'Kritik' : filterStatus === 'sufficient' ? 'Yeterli' : 'Tüm Durumlar';

  return (
    <MetronicLayout title="Envanter Durumu" breadcrumbs={['Stok & Depo', 'Envanter Durumu']}>
      <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}.fade-in-down{animation:fadeInDown .22s ease both}`}</style>

      {/* Alert Section (unchanged) */}
      {criticalItems.length > 0 && !loading && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-red-100">
            <AlertTriangle className="text-red-500" size={20} />
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-red-700">Kritik Stok Uyarısı</h4>
            <p className="text-[13px] text-red-600 mt-1">
              <strong>{criticalItems.length}</strong> malzemenin stoğu kritik seviyenin altına düştü. Sipariş vermeyi unutmayın.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {criticalItems.map(item => (
                <span key={item.id} className="px-2.5 py-1 text-[11px] font-bold bg-white text-red-600 rounded border border-red-100 shadow-sm">
                  {item.name}: {item.totalQuantity} {item.unit}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="m-card shadow-sm border border-slate-200/60">
        <div className="m-card-header flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <h4 className="m-card-title text-base font-bold text-slate-700 flex items-center gap-2">
              <Layers size={18} className="text-metronic-primary" /> Mevcut Stok Durumu
            </h4>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[12px] font-bold">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Malzeme ara..."
                className="h-8 pl-8 pr-3 text-[12px] border border-slate-200 rounded-lg bg-white w-44 focus:outline-none focus:border-metronic-primary shadow-sm"
              />
            </div>

            {/* Filter */}
            <Dropdown trigger={<DropdownTrigger label={<><Filter size={13} />&nbsp;{filterLabel}</>} />}>
              <DropdownItem active={filterStatus === 'all'} onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}>Tümü</DropdownItem>
              <DropdownItem active={filterStatus === 'critical'} onClick={() => { setFilterStatus('critical'); setCurrentPage(1); }}>Kritik</DropdownItem>
              <DropdownItem active={filterStatus === 'sufficient'} onClick={() => { setFilterStatus('sufficient'); setCurrentPage(1); }}>Yeterli</DropdownItem>
            </Dropdown>

            {/* Export */}
            <Dropdown trigger={<DropdownTrigger label={<><Download size={13} />&nbsp;Dışa Aktar</>} />}>
              <DropdownItem onClick={exportCSV}>CSV olarak indir</DropdownItem>
            </Dropdown>

            {/* Existing action buttons (unchanged) */}
            <Link href="/inventory/movements" className="flex items-center gap-1.5 h-8 px-3 bg-slate-100 text-slate-600 rounded-lg text-[12px] font-bold hover:bg-slate-200 transition-colors">
              <Package size={14} /> Hareket Kaydet
            </Link>
            <button onClick={fetchSummary} className="p-2 text-slate-400 hover:text-metronic-primary transition-colors bg-slate-50 rounded-lg">
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <SortableHeader column="name"          label="Malzeme Adı"  sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader column="totalQuantity" label="Toplam Stok"  sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-right" />
                <SortableHeader column="status"        label="Durum"        sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="text-center" />
                <th className="py-3 px-6 text-[11px] font-bold text-slate-400 uppercase text-right">Hızlı Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-48 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4 ml-auto" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-6 mx-auto" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-24 h-8 ml-auto" /></td>
                  </tr>
                ))
              ) : paginated.length > 0 ? (
                paginated.map(item => (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${item.isCritical ? 'bg-red-50/30' : ''}`}>
                    <td className="py-3 px-6 text-[14px] font-bold text-slate-700">{item.name}</td>
                    <td className="py-3 px-6 text-[14px] text-right font-extrabold text-metronic-primary">
                      {item.totalQuantity}&nbsp;<span className="text-[11px] font-medium text-slate-400 uppercase">{item.unit}</span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      {item.isCritical ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-100 text-red-600 text-[11px] font-bold">
                          <ArrowDownRight size={12} /> Kritik
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-600 text-[11px] font-bold">
                          <ArrowUpRight size={12} /> Yeterli
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/inventory/movements?itemId=${item.id}&type=IN`}
                          className="px-3 py-1.5 text-[11px] font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                        >
                          Giriş
                        </Link>
                        <Link
                          href={`/inventory/movements?itemId=${item.id}&type=OUT`}
                          className="px-3 py-1.5 text-[11px] font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                        >
                          Çıkış
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-[14px]">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Arama kriterlerine uygun malzeme bulunamadı.'
                      : 'Envanterde malzeme bulunmuyor.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && sorted.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-slate-500">Sayfa başı:</span>
              <select
                value={pageLimit}
                onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
                className="h-8 px-2 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none"
              >
                {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <span className="text-[12px] text-slate-500">{rangeStart}–{rangeEnd} / {sorted.length} kayıt</span>
            <div className="flex items-center gap-1">
              <PgBtn onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft size={14} /></PgBtn>
              <PgBtn onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={14} /></PgBtn>
              {getPageNumbers().map(p => (
                <PgBtn key={p} onClick={() => setCurrentPage(p)} active={p === currentPage}>{p}</PgBtn>
              ))}
              <PgBtn onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={14} /></PgBtn>
              <PgBtn onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight size={14} /></PgBtn>
            </div>
          </div>
        )}
      </div>
    </MetronicLayout>
  );
}
