'use client';

import { useState, ReactNode } from 'react';
import {
  ChevronDown, ChevronLeft, ChevronRight, Check, X, Search, Filter,
  Download, FileText, FileSpreadsheet, ArrowUp, ArrowDown, Plus,
} from 'lucide-react';
import Dropdown from '../../../../components/ui/Dropdown';

function FilterDropdownItem({ icon, label, active, onClick }: { icon?: ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left
        ${active ? 'bg-metronic-primary/5 text-metronic-primary font-bold' : 'text-slate-700 hover:bg-slate-50 hover:text-metronic-primary'}`}>
      {icon}{label}
      {active && <Check size={12} className="ml-auto text-metronic-primary" />}
    </button>
  );
}

const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100];

export interface OrthoTableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortValue?: (row: T) => string | number;
  render: (row: T) => ReactNode;
}

interface OrthoDataTableProps<T> {
  title: string;
  records: T[];
  getId: (row: T) => string;
  columns: OrthoTableColumn<T>[];
  searchText: (row: T) => string;
  filterLabel?: string;
  filterValue?: (row: T) => string;
  onAddNew: () => void;
  addLabel: string;
  exportFilename: string;
  exportHeaders: string[];
  exportRow: (row: T) => string[];
  emptyMessage: string;
}

export default function OrthoDataTable<T>({
  title,
  records,
  getId,
  columns,
  searchText,
  filterLabel,
  filterValue,
  onAddNew,
  addLabel,
  exportFilename,
  exportHeaders,
  exportRow,
  emptyMessage,
}: OrthoDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);

  const filterOptions = filterValue ? Array.from(new Set(records.map(filterValue))).filter(Boolean) : [];

  const filtered = records.filter(r => {
    const matchSearch = !searchTerm || searchText(r).toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = !filter || (filterValue && filterValue(r) === filter);
    return matchSearch && matchFilter;
  });

  const activeColumn = columns.find(c => c.key === sortColumn);
  const sorted = [...filtered].sort((a, b) => {
    if (!activeColumn?.sortValue) return 0;
    const aVal = activeColumn.sortValue(a) ?? '';
    const bVal = activeColumn.sortValue(b) ?? '';
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column: OrthoTableColumn<T>) => {
    if (!column.sortValue) return;
    if (sortColumn === column.key) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column.key); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));
  const page = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((page - 1) * pageLimit, page * pageLimit);

  const exportCSV = () => {
    const rows = [exportHeaders, ...sorted.map(exportRow)];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${exportFilename}_${new Date().toLocaleDateString('tr-TR')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="m-card shadow-none border border-slate-200/60 dark:border-white/10 overflow-hidden">
      {/* ─── Header & Toolbar ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
        <div className="flex items-center gap-3">
          <h4 className="text-[1.05rem] font-bold text-slate-800 dark:text-slate-100 tracking-tight m-0">{title}</h4>
          <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">
            {filtered.length} Kayıt
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" placeholder="Ara..."
              value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-8 h-9 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
            )}
          </div>

          {filterValue && filterOptions.length > 0 && (
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filter ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'}`}>
                <Filter size={15} /> {filterLabel || 'Filtrele'}
                {filter && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />}
                <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{filterLabel || 'Filtrele'}</p>
              </div>
              <FilterDropdownItem label="Tümü" active={!filter} onClick={() => { setFilter(''); setCurrentPage(1); }} />
              {filterOptions.map(opt => (
                <FilterDropdownItem key={opt} label={opt} active={filter === opt} onClick={() => { setFilter(filter === opt ? '' : opt); setCurrentPage(1); }} />
              ))}
            </Dropdown>
          )}

          <Dropdown align="right" trigger={
            <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 text-[13px] font-medium shadow-sm transition-colors">
              <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
            </button>
          }>
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p>
            </div>
            <FilterDropdownItem icon={<FileSpreadsheet size={14} className="text-green-600" />} label="Excel (.xlsx)" onClick={exportCSV} />
            <FilterDropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
          </Dropdown>

          <button
            onClick={onAddNew}
            className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors"
          >
            <Plus size={15} /> {addLabel}
          </button>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="overflow-auto max-h-[480px] relative">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]">
              {columns.map(col => (
                <th key={col.key} onClick={() => handleSort(col)}
                  className={`py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ${col.sortValue ? 'cursor-pointer hover:text-metronic-primary transition-colors' : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                  <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                    {col.label}
                    {sortColumn === col.key && (sortDirection === 'asc' ? <ArrowUp size={12} className="text-metronic-primary" /> : <ArrowDown size={12} className="text-metronic-primary" />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400 dark:text-slate-500 text-[13px] font-medium">
                  {searchTerm || filter ? 'Eşleşen kayıt bulunamadı.' : emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map(row => (
                <tr key={getId(row)} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Footer & Pagination ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 gap-4">
        <div className="flex items-center gap-3">
          <select value={pageLimit} onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
            className="h-7 px-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[12px] font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-metronic-primary cursor-pointer w-20">
            {PAGE_LIMIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
          <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
          <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">
            Toplam <span className="font-bold text-slate-700 dark:text-slate-200">{filtered.length}</span> kayıttan{' '}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {filtered.length === 0 ? 0 : Math.min((page - 1) * pageLimit + 1, filtered.length)}–{Math.min(page * pageLimit, filtered.length)}
            </span> arası
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setCurrentPage(1)} disabled={page === 1}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">«</button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p: number;
            if (totalPages <= 5) p = i + 1;
            else if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
            return (
              <button key={p} onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${p === page ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                {p}
              </button>
            );
          })}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={page === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">»</button>
        </div>
      </div>
    </div>
  );
}
