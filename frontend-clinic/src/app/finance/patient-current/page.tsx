'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Modal from '../../../components/ui/Modal';
import Dropdown from '../../../components/ui/Dropdown';
import api from '../../../lib/api';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight, Settings,
  X, FileText, FileSpreadsheet, ChevronDown, CheckSquare, TrendingUp,
  TrendingDown, Wallet, Eye, Plus, Save, ArrowUp, ArrowDown
} from 'lucide-react';

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

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void }) {
  const isActive = sortColumn === column;
  return (
    <th onClick={() => onSort(column)} className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200/60 dark:border-white/5 cursor-pointer hover:text-metronic-primary transition-colors whitespace-nowrap">
      <div className="flex items-center gap-2">
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={13} className="text-metronic-primary" /> : <ArrowDown size={13} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  'BORÇLU': { cls: 'bg-red-50 text-metronic-danger dark:bg-red-500/10', label: 'Borçlu' },
  'ALACAKLI': { cls: 'bg-metronic-success-light text-metronic-success', label: 'Alacaklı' },
  'KAPALI': { cls: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400', label: 'Kapalı' },
};

const TYPE_MAP: Record<string, { cls: string; label: string }> = {
  'AKTİF': { cls: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10', label: 'Aktif Hasta' },
  'ADAY': { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10', label: 'Aday Hasta' },
};

function fmt(n: number) { return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺'; }

// API'den gelen ham hasta verisini UI formatına dönüştür
function normalizePatient(p: any) {
  const totalDebt = Number(p.totalDebt ?? 0);
  const advance = Number(p.advance ?? 0);
  const balance = totalDebt - advance;
  const status = balance > 0 ? 'BORÇLU' : balance < 0 ? 'ALACAKLI' : 'KAPALI';
  return {
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    phone: p.phone || '-',
    tckn: p.nationalId || '-',
    dosyaNo: p.id.substring(0, 8).toUpperCase(),
    contracts: 0,
    totalDebt,
    totalPaid: advance,
    balance,
    status,
    type: 'AKTİF',
  };
}

export default function PatientCurrentPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100];
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>('balance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ patientId: '', amount: '', method: 'NAKİT', note: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/patients?limit=500');
      const data = resp.data?.data ?? resp.data ?? [];
      // Sadece borçu veya avansı olanları göster (balance != 0)
      const normalized = data
        .map(normalizePatient)
        .filter((p: any) => p.totalDebt > 0 || p.totalPaid > 0);
      setRecords(normalized);
    } catch (err) {
      console.error('Hasta cari verileri alınamadı:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchPatients();
  }, [user, router]);

  const filtered = records.filter(r => {
    const matchesSearch = [r.name, r.phone, r.id, r.status, r.type].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus ? r.status === filterStatus : true;
    const matchesType = filterType ? r.type === filterType : true;
    return matchesSearch && matchesStatus && matchesType;
  });
  
  const getSortedData = () => {
    let sorted = [...filtered];
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal = a[sortColumn as keyof typeof a];
        let bVal = b[sortColumn as keyof typeof b];
        if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal as any).toLowerCase?.() || bVal; }
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  };

  const sortedData = getSortedData();
  const handleSort = (column: string) => {
    if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageLimit));
  const paginated = sortedData.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  // Reset pagination to page 1 whenever the filters/search/page size change,
  // without a separate effect (React docs: adjust state during render).
  const [prevFilters, setPrevFilters] = useState({ searchTerm, filterStatus, filterType, pageLimit });
  if (
    searchTerm !== prevFilters.searchTerm ||
    filterStatus !== prevFilters.filterStatus ||
    filterType !== prevFilters.filterType ||
    pageLimit !== prevFilters.pageLimit
  ) {
    setPrevFilters({ searchTerm, filterStatus, filterType, pageLimit });
    setCurrentPage(1);
  }

  const allSelected = paginated.length > 0 && paginated.every(r => selectedIds.has(r.id));
  const someSelected = paginated.some(r => selectedIds.has(r.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(paginated.map(r => r.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportCSV = () => {
    const BOM = '﻿';
    const headers = ['ID', 'Ad Soyad', 'Telefon', 'TC Kimlik', 'Dosya No', 'Tür', 'Toplam Borç', 'Ödenen', 'Bakiye', 'Durum'];
    const rows = filtered.map(r => [r.id, r.name, r.phone, r.tckn, r.dosyaNo, r.type, r.totalDebt, r.totalPaid, r.balance, r.status]);
    const csv = BOM + [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'hasta-cari.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const totalDebt = records.reduce((s, r) => s + r.balance, 0);
  const debtorCount = records.filter(r => r.status === 'BORÇLU').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setTimeout(() => { setModalOpen(false); setFormData({ patientId: '', amount: '', method: 'NAKİT', note: '' }); setFormLoading(false); }, 500);
  };

  return (
    <MetronicLayout title="Hasta Cari İzleme" breadcrumbs={['Muhasebe', 'Hasta Cari']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Toplam Açık Bakiye', value: fmt(totalDebt), icon: <Wallet size={20} />, color: 'text-metronic-primary', bg: 'bg-metronic-primary-light dark:bg-metronic-primary/10' },
          { label: 'Borçlu Hasta', value: `${debtorCount} kişi`, icon: <TrendingDown size={20} />, color: 'text-metronic-danger', bg: 'bg-red-50 dark:bg-red-500/10' },
          { label: 'Alacaklı Hasta', value: `${records.filter(r => r.status === 'ALACAKLI').length} kişi`, icon: <TrendingUp size={20} />, color: 'text-metronic-success', bg: 'bg-metronic-success-light dark:bg-metronic-success/10' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.color}`}>{c.icon}</div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
              <p className={`text-[1.2rem] font-bold mt-0.5 ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} kayıt seçildi</span>
            </div>
            <button onClick={() => setSelectedIds(new Set())} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"><X size={15} /></button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Cari Hesaplar</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px] max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input type="text" placeholder="Hasta adı, telefon veya durum ile ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><Filter size={15} /> Filtrele{(filterStatus || filterType) && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-metronic-primary inline-block" />} <ChevronDown size={13} className="text-slate-400" /></button>}>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Durum</p></div>
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />} label="Hepsi" active={filterStatus === ''} onClick={() => setFilterStatus('')} />
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-red-500 inline-block" />} label="Borçlular" active={filterStatus === 'BORÇLU'} onClick={() => setFilterStatus(filterStatus === 'BORÇLU' ? '' : 'BORÇLU')} />
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-green-500 inline-block" />} label="Alacaklılar" active={filterStatus === 'ALACAKLI'} onClick={() => setFilterStatus(filterStatus === 'ALACAKLI' ? '' : 'ALACAKLI')} />
              <div className="px-4 py-2 border-y border-slate-100 dark:border-white/5 mt-1"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tür</p></div>
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />} label="Aktif Hastalar" active={filterType === 'AKTİF'} onClick={() => setFilterType(filterType === 'AKTİF' ? '' : 'AKTİF')} />
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />} label="Aday Hastalar" active={filterType === 'ADAY'} onClick={() => setFilterType(filterType === 'ADAY' ? '' : 'ADAY')} />
            </Dropdown>
            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" /></button>}>
              <DropdownItem icon={<FileSpreadsheet size={15} className="text-green-600" />} label="CSV / Excel" onClick={exportCSV} />
              <DropdownItem icon={<FileText size={15} className="text-red-500" />} label="PDF Raporu" />
            </Dropdown>
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm"><Plus size={16} /> Ödeme Ekle</button>
          </div>
        </div>

        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10"><input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></th>
                <SortableHeader label="Hasta" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Tür" column="type" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Dosya No" column="dosyaNo" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Sözleşme" column="contracts" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Toplam Borç" column="totalDebt" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Ödenen" column="totalPaid" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Bakiye" column="balance" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center text-slate-500 font-medium">Yükleniyor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-slate-500 font-medium">Eşleşen kayıt bulunamadı.</td></tr>
              ) : paginated.map(r => {
                const isSelected = selectedIds.has(r.id);
                const typeInfo = TYPE_MAP[r.type] || TYPE_MAP['AKTİF'];
                return (
                  <tr key={r.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                    <td className="py-3 pl-6 pr-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[14px] flex-shrink-0 ${r.type === 'ADAY' ? 'bg-amber-100 text-amber-600' : 'bg-metronic-primary-light text-metronic-primary'}`}>{r.name.charAt(0)}</div>
                        <div className="flex flex-col">
                          <Link href={`/finance/patient-current/${r.id}`} className="text-slate-800 dark:text-slate-100 font-bold text-[13px] hover:text-metronic-primary transition-colors cursor-pointer leading-tight">
                            {r.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-slate-400 text-[11px] font-semibold">{r.dosyaNo}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10"></span>
                            <span className="text-slate-400 text-[11px] font-semibold">{r.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${typeInfo.cls}`}>{typeInfo.label}</span>
                    </td>
                    <td className="py-3 px-4 text-[12px] font-bold text-slate-700 dark:text-slate-200 font-mono">{r.dosyaNo}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                        {r.contracts} Adet
                      </span>
                    </td>
                    <td className="py-3 px-4"><span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{fmt(r.totalDebt)}</span></td>
                    <td className="py-3 px-4"><span className="text-[13px] font-medium text-metronic-success">{fmt(r.totalPaid)}</span></td>
                    <td className="py-3 px-4">
                      <span className={`text-[13px] font-bold ${r.balance > 0 ? 'text-metronic-danger' : r.balance < 0 ? 'text-metronic-success' : 'text-slate-500'}`}>
                        {r.balance > 0 ? fmt(r.balance) : r.balance < 0 ? `(${fmt(Math.abs(r.balance))})` : '—'}
                      </span>
                    </td>
                    <td className="py-3 pl-4 pr-6 text-right">
                      <Dropdown align="right" trigger={<button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors"><Settings size={16} /></button>}>
                        <DropdownItem icon={<Eye size={14} />} label="Cari Detay" onClick={() => router.push(`/finance/patient-current/${r.id}`)} />
                        {r.type === 'AKTİF' && <DropdownItem icon={<Plus size={14} />} label="Ödeme Ekle" onClick={() => setModalOpen(true)} />}
                        <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                        <DropdownItem icon={<FileText size={14} />} label="PDF Ekstresi" />
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Ödeme Ekle" subtitle="Hastadan tahsilat kaydı oluşturun." size="md" footer={
        <><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
        <button form="payment-form" type="submit" disabled={formLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70"><Save size={15} />{formLoading ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}</button></>
      }>
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hasta <span className="text-metronic-danger">*</span></label>
            <select required value={formData.patientId} onChange={e => setFormData({ ...formData, patientId: e.target.value })} className="m-input">
              <option value="">Hasta seçiniz</option>
              {records.filter(r => r.type === 'AKTİF').map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tutar (₺) <span className="text-metronic-danger">*</span></label>
              <input required type="number" min="1" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ödeme Yöntemi <span className="text-metronic-danger">*</span></label>
              <select value={formData.method} onChange={e => setFormData({ ...formData, method: e.target.value })} className="m-input">
                <option value="NAKİT">Nakit</option>
                <option value="KREDİ_KARTI">Kredi Kartı</option>
                <option value="HAVALE">Havale / EFT</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Not</label>
            <input type="text" placeholder="Açıklama (opsiyonel)" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} className="m-input" />
          </div>
        </form>
      </Modal>
    </MetronicLayout>
  );
}
