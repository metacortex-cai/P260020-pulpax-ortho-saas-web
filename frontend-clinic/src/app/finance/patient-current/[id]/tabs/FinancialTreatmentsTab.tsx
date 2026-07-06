'use client';

import { useState, useRef } from 'react';
import { Stethoscope, CheckCircle2, Clock, Search, Filter, Download, FileText, ChevronDown, Check, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatCurrency } from '../../../../../lib/utils/formatCurrency';
import Dropdown from '../../../../../components/ui/Dropdown';

function DropdownItem({ icon, label, active, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'bg-metronic-primary/5 text-metronic-primary font-bold' : 'text-slate-700 hover:bg-slate-50 hover:text-metronic-primary'}`}>
      {icon}{label}{active && <Check size={12} className="ml-auto text-metronic-primary" />}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort, align = 'left' }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void; align?: 'left' | 'right' }) {
  const isActive = sortColumn === column;
  return (
    <th onClick={() => onSort(column)} className={`py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-metronic-primary transition-colors select-none ${align === 'right' ? 'text-right' : ''}`}>
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>{label}{isActive && (sortDirection === 'asc' ? <ArrowUp size={12} className="text-metronic-primary" /> : <ArrowDown size={12} className="text-metronic-primary" />)}</div>
    </th>
  );
}

export default function FinancialTreatmentsTab({ patient }: { patient: any }) {
  const [treatments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);

  const categories = Array.from(new Set(treatments.map(t => t.category)));
  const statuses = Array.from(new Set(treatments.map(t => t.status)));

  const filtered = treatments.filter(t => {
    const matchSearch = !searchTerm || [t.name, t.category, t.doctor, t.date]
      .join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchCategory = !filterCategory || t.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = (a as any)[sortColumn] ?? '';
    const bVal = (b as any)[sortColumn] ?? '';
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Reset pagination to page 1 whenever the filters/search/page size change,
  // without a separate effect (React docs: adjust state during render).
  const [prevFilters, setPrevFilters] = useState({ searchTerm, filterStatus, filterCategory, pageLimit });
  if (
    searchTerm !== prevFilters.searchTerm ||
    filterStatus !== prevFilters.filterStatus ||
    filterCategory !== prevFilters.filterCategory ||
    pageLimit !== prevFilters.pageLimit
  ) {
    setPrevFilters({ searchTerm, filterStatus, filterCategory, pageLimit });
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));
  const paginated = sorted.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
    const rows = [
      ['Tarih', 'Tedavi', 'Kategori', 'Doktor', 'Birim Fiyat', 'Ödenen', 'Kalan', 'Durum'],
      ...sorted.map(t => [t.date, t.name, t.category, t.doctor, fmt(t.price), fmt(t.paid), fmt(t.balance), t.status]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tedavi_kalemleri.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Summary stats - KEEP EXACTLY AS IS */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tedavi Kalemleri ve Ücret Durumu</h3>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[11px] font-bold text-slate-400 uppercase">TOPLAM TUTAR</p>
            <p className="text-lg font-black text-slate-700 dark:text-white">₺{formatCurrency(treatments.reduce((s,t) => s+t.price, 0))}</p>
          </div>
          <div className="w-px h-10 bg-slate-200 dark:bg-white/10" />
          <div className="text-right">
            <p className="text-[11px] font-bold text-slate-400 uppercase text-metronic-danger">KALAN BORÇ</p>
            <p className="text-lg font-black text-metronic-danger">₺{formatCurrency(treatments.reduce((s,t) => s+t.balance, 0))}</p>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="m-card shadow-none border border-slate-200/60 dark:border-white/5 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <h4 className="text-[1.05rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Tedavi Listesi</h4>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="Tedavi, hekim, tarih ara..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 h-9 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-metronic-primary text-[13px] font-medium text-slate-700 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterStatus || filterCategory ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Filter size={15} /> Filtrele {(filterStatus || filterCategory) && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase">Durum</p></div>
              <DropdownItem label="Tüm Durumlar" active={!filterStatus} onClick={() => setFilterStatus('')} />
              {statuses.map(s => <DropdownItem key={s} label={s} active={filterStatus === s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)} />)}
              <div className="px-4 py-2 border-t border-b border-slate-100 mt-1"><p className="text-[11px] font-bold text-slate-400 uppercase">Kategori</p></div>
              <DropdownItem label="Tüm Kategoriler" active={!filterCategory} onClick={() => setFilterCategory('')} />
              {categories.map(c => <DropdownItem key={c} label={c} active={filterCategory === c} onClick={() => setFilterCategory(filterCategory === c ? '' : c)} />)}
              {(filterStatus || filterCategory) && <div className="border-t border-slate-100 mt-1 px-3 py-2"><button onClick={() => { setFilterStatus(''); setFilterCategory(''); }} className="w-full text-center text-[12px] font-bold text-rose-500">Filtreleri Temizle</button></div>}
            </Dropdown>
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase">Format Seçin</p></div>
              <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-[480px] relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <SortableHeader label="İşlem Tarihi" column="date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Tedavi / İşlem" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Doktor" column="doctor" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Birim Fiyat" column="price" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="right" />
                <SortableHeader label="Ödenen" column="paid" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="right" />
                <SortableHeader label="Kalan" column="balance" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} align="right" />
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.02]">
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400 text-[13px]">{searchTerm || filterStatus || filterCategory ? 'Eşleşen kayıt bulunamadı.' : 'Tedavi kalemi bulunmuyor.'}</td></tr>
              ) : paginated.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                  <td className="py-4 px-4 text-[13px] font-medium text-slate-500">{t.date}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-metronic-primary transition-colors">
                        <Stethoscope size={16} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 leading-tight">{t.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{t.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-[13px] font-medium text-slate-600 dark:text-slate-400">{t.doctor}</td>
                  <td className="py-4 px-4 text-right text-[13px] font-bold text-slate-700 dark:text-slate-200">₺{formatCurrency(t.price)}</td>
                  <td className="py-4 px-4 text-right text-[13px] font-bold text-metronic-success">₺{formatCurrency(t.paid)}</td>
                  <td className="py-4 px-4 text-right text-[13px] font-bold text-metronic-danger">₺{formatCurrency(t.balance)}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${t.status === 'TAMAMLANDI' ? 'bg-metronic-success-light text-metronic-success' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                      {t.status === 'TAMAMLANDI' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <select value={pageLimit} onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-md text-[12px] font-bold text-slate-600 outline-none cursor-pointer w-20">
              {[10, 25, 50, 100].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
            <div className="w-px h-4 bg-slate-200" />
            <span className="text-slate-500 text-[13px] font-medium">
              Toplam <span className="font-bold text-slate-700">{filtered.length}</span> kayıttan{' '}
              <span className="font-bold text-slate-700">{filtered.length === 0 ? 0 : Math.min((currentPage-1)*pageLimit+1, filtered.length)}–{Math.min(currentPage*pageLimit, filtered.length)}</span> arası
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage===1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5,totalPages) }, (_,i) => {
              const page = totalPages<=5?i+1:currentPage<=3?i+1:currentPage>=totalPages-2?totalPages-4+i:currentPage-2+i;
              return <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold ${page===currentPage?'bg-metronic-primary text-white shadow-sm':'text-slate-600 hover:bg-slate-100'}`}>{page}</button>;
            })}
            <button onClick={() => setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage===totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>
    </div>
  );
}
