'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import Modal from '../../../components/ui/Modal';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight, Settings,
  X, FileText, FileSpreadsheet, ChevronDown, CheckSquare,
  Phone, Eye, Stethoscope, Trash2,
  Percent, ArrowRight, ArrowUp, ArrowDown
} from 'lucide-react';
import { FinanceService } from '../../../lib/services/finance.service';

// Reusable Components matching Patients Page

function DropdownItem({ icon, label, danger = false, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

function FilterItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'text-metronic-primary bg-metronic-primary-light dark:bg-metronic-primary/10 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}{active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-metronic-primary" />}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort, icon }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void; icon?: React.ReactNode }) {
  const isActive = sortColumn === column;
  return (
    <th onClick={() => onSort(column)} className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors">
      <div className="flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={13} className="text-metronic-primary" /> : <ArrowDown size={13} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  'BEKLEMEDE': { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10', label: 'Beklemede' },
  'GÖRÜŞMEDE': { cls: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10', label: 'Görüşmede' },
  'SOĞUK':    { cls: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400', label: 'Soğuk' },
};

function fmt(n: number) { return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺'; }

export default function CandidatesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100];
  const [filterStatus, setFilterStatus] = useState('');

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    setLoading(true);
    setError(null);
    FinanceService.getCandidates()
      .then(data => setRecords(data))
      .catch(() => setError('Aday hastalar yüklenirken bir hata oluştu.'))
      .finally(() => setLoading(false));
  }, [user, router]);

  const filtered = records.filter(r => {
    const matchesSearch = [r.name, r.phone, r.doctor, r.status, r.id, r.tckn, r.dosyaNo].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus ? r.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  const getSortedData = () => {
    let sorted = [...filtered];
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  };

  const sortedData = getSortedData();
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageLimit));
  const paginated = sortedData.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  // Reset pagination to page 1 whenever the filters/search/page size change,
  // without a separate effect (React docs: adjust state during render).
  const [prevFilters, setPrevFilters] = useState({ searchTerm, filterStatus, pageLimit });
  if (searchTerm !== prevFilters.searchTerm || filterStatus !== prevFilters.filterStatus || pageLimit !== prevFilters.pageLimit) {
    setPrevFilters({ searchTerm, filterStatus, pageLimit });
    setCurrentPage(1);
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const BOM = '﻿';
    const headers = ['ID', 'Ad Soyad', 'TC Kimlik', 'Dosya No', 'Telefon', 'Plan Tarihi', 'Plan Tutarı', 'Hekim', 'Durum'];
    const rows = filtered.map(r => [r.id, r.name, r.tckn, r.dosyaNo, r.phone, r.planDate, r.planTotal, r.doctor, r.status]);
    const csv = BOM + [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'aday-hastalar.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const allSelected = paginated.length > 0 && paginated.every(r => selectedIds.has(r.id));
  const someSelected = paginated.some(r => selectedIds.has(r.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(paginated.map(r => r.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <MetronicLayout title="Aday Hastalar" breadcrumbs={['Muhasebe', 'Aday Hastalar']}>
      <style>{`@keyframes fadeInDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      
      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">
        
        {/* Multi-selection Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} kayıt seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-metronic-danger/30 text-metronic-danger text-[12px] font-bold rounded-lg hover:bg-metronic-danger hover:text-white transition-colors">
                <Trash2 size={13} /> Seçilenleri Sil
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors ml-1">
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Aday Hasta Listesi</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[300px] max-w-lg">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Ad, soyad, TC, hekim veya durum ile ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"> <X size={14} /></button>}
            </div>
            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><Filter size={15} /> Filtrele{filterStatus && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-metronic-primary inline-block" />} <ChevronDown size={13} className="text-slate-400" /></button>}>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Durum</p></div>
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />} label="Hepsi" active={filterStatus === ''} onClick={() => setFilterStatus('')} />
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />} label="Beklemede" active={filterStatus === 'BEKLEMEDE'} onClick={() => setFilterStatus(filterStatus === 'BEKLEMEDE' ? '' : 'BEKLEMEDE')} />
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />} label="Görüşmede" active={filterStatus === 'GÖRÜŞMEDE'} onClick={() => setFilterStatus(filterStatus === 'GÖRÜŞMEDE' ? '' : 'GÖRÜŞMEDE')} />
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />} label="Soğuk" active={filterStatus === 'SOĞUK'} onClick={() => setFilterStatus(filterStatus === 'SOĞUK' ? '' : 'SOĞUK')} />
            </Dropdown>
            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" /></button>}>
              <DropdownItem icon={<FileSpreadsheet size={15} className="text-green-600" />} label="CSV / Excel" onClick={exportCSV} />
              <DropdownItem icon={<FileText size={15} className="text-red-500" />} label="PDF Raporu" />
            </Dropdown>
          </div>
        </div>

        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10">
                  <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" />
                </th>
                <SortableHeader label="Hasta" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="TC / Dosya No" column="tckn" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Hekim" column="doctor" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Plan Tutarı" column="planTotal" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Yükleniyor...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="py-12 text-center text-metronic-danger font-medium">{error}</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Eşleşen kayıt bulunamadı.</td></tr>
              ) : paginated.map(r => {
                const isSelected = selectedIds.has(r.id);
                const statusInfo = STATUS_MAP[r.status] || STATUS_MAP['BEKLEMEDE'];
                return (
                  <tr key={r.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                    <td className="py-3 pl-6 pr-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-lg bg-metronic-primary-light dark:bg-metronic-primary/15 text-metronic-primary flex items-center justify-center font-bold text-[14px] flex-shrink-0">{r.name.charAt(0)}</div>
                        <div className="flex flex-col">
                          <button onClick={() => router.push(`/finance/candidates/${r.id}`)} className="text-slate-800 dark:text-slate-100 font-bold text-[13px] hover:text-metronic-primary transition-colors leading-tight text-left">
                            {r.name}
                          </button>
                          <span className="text-slate-400 text-[11px] font-semibold mt-0.5">{r.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-slate-600 dark:text-slate-400 font-mono">{r.tckn}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{r.dosyaNo}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[13px] font-medium text-slate-600">{r.doctor}</td>
                    <td className="py-3 px-4 text-[13px] font-black text-metronic-primary">{fmt(r.planTotal)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${statusInfo.cls}`}><span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />{statusInfo.label}</span>
                    </td>
                    <td className="py-3 pl-4 pr-6 text-right">
                      <Dropdown align="right" trigger={<button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors"><Settings size={16} /></button>}>
                        <DropdownItem icon={<Eye size={14} />} label="Detayları Gör" onClick={() => router.push(`/finance/candidates/${r.id}`)} />
                        <DropdownItem icon={<Phone size={14} />} label="Hastayı Ara" />
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-xl">
          <div className="flex items-center gap-3">
            <select value={pageLimit} onChange={e => setPageLimit(Number(e.target.value))} className="h-7 px-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[12px] font-bold text-slate-600 dark:text-slate-300 outline-none w-20">
              {PAGE_LIMIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
            <div className="w-px h-4 bg-slate-200"></div>
            <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">Toplam <span className="font-bold text-slate-700 dark:text-slate-200">{filtered.length}</span> kayıttan <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min((currentPage - 1) * pageLimit + 1, filtered.length)}–{Math.min(currentPage * pageLimit, filtered.length)}</span> arası</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { 
              let p = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
              return (
                <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${p === currentPage ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>{p}</button>
              ); 
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>
    </MetronicLayout>
  );
}
