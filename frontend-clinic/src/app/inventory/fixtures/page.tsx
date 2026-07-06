'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import Modal from '../../../components/ui/Modal';
import {
  Search, Plus, Filter, Download, Edit2, Trash2, ChevronLeft, ChevronRight, Settings,
  X, FileText, FileSpreadsheet, ChevronDown, CheckSquare, Save, ArrowUp, ArrowDown, Check, Monitor, Cpu, Wrench, AlertCircle, MapPin, Calendar, Tag, ShieldCheck
} from 'lucide-react';
import { InventoryService } from '../../../lib/services/inventory.service';
import { useToastStore } from '../../../store/toastStore';


function DropdownItem({ icon, label, danger = false, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

function FilterItem({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'bg-metronic-primary/5 text-metronic-primary font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {label}{active && <Check size={12} className="ml-auto text-metronic-primary" />}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void }) {
  const isActive = sortColumn === column;
  return (
    <th onClick={() => onSort(column)} className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-metronic-primary transition-colors select-none">
      <div className="flex items-center gap-2">{label}{isActive && (sortDirection === 'asc' ? <ArrowUp size={12} className="text-metronic-primary" /> : <ArrowDown size={12} className="text-metronic-primary" />)}</div>
    </th>
  );
}

const STATUS_MAP: Record<string, { cls: string; label: string; dot: string }> = {
  'AKTİF': { cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10', label: 'Aktif', dot: 'bg-emerald-500' },
  'BAKIMDA': { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10', label: 'Bakımda', dot: 'bg-amber-500' },
  'ARIZALI': { cls: 'bg-red-50 text-red-600 dark:bg-red-500/10', label: 'Arızalı', dot: 'bg-red-500' },
  'PASİF': { cls: 'bg-slate-50 text-slate-600 dark:bg-white/5', label: 'Pasif', dot: 'bg-slate-400' },
};

function fmt(n: number) { return n.toLocaleString('tr-TR', { minimumFractionDigits: 0 }) + ' ₺'; }

export default function FixturesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { addToast } = useToastStore();
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const PAGE_LIMIT_OPTIONS = [25, 50, 100, 1000];
  const [logModal, setLogModal] = useState<{isOpen: boolean, data: any | null}>({isOpen: false, data: null});
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', brand: '', model: '', serialNo: '', category: 'Cihaz', status: 'AKTİF', location: '', value: 0 });
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    setLoading(true);
    setError(null);
    InventoryService.getFixtures()
      .then(data => setFixtures(data))
      .catch(() => setError('Demirbaşlar yüklenirken bir hata oluştu.'))
      .finally(() => setLoading(false));
  }, [user, router]);

  // Reset pagination whenever the active filters change. This is a pure
  // derived-state reset (no async/external work), so it's computed during
  // render instead of in an effect to avoid an extra cascading render.
  const filterKey = `${searchTerm}|${filterCategory}|${filterStatus}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  const filtered = fixtures.filter(f => {
    const matchSearch = [f.name, f.brand, f.model, f.serialNo, f.category, f.location]
      .join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || f.category === filterCategory;
    const matchStatus = !filterStatus || f.status === filterStatus;
    return matchSearch && matchCategory && matchStatus;
  });

  const uniqueCategories = Array.from(new Set(fixtures.map(f => f.category)));

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal = (a as any)[sortColumn] ?? '';
    let bVal = (b as any)[sortColumn] ?? '';
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));
  const paginated = sorted.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const allSelected = sorted.length > 0 && sorted.every(f => selectedIds.has(f.id));
  const someSelected = sorted.some(f => selectedIds.has(f.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(paginated.map(f => f.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportCSV = () => {
    const rows = [
      ['Demirbaş', 'Marka', 'Model', 'Seri No', 'Kategori', 'Durum', 'Konum', 'Alım Tarihi', 'Maliyet (₺)'],
      ...sorted.map(f => [f.name, f.brand, f.model, f.serialNo, f.category, STATUS_MAP[f.status]?.label || f.status, f.location, f.purchaseDate, String(f.value)]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'demirbaslar.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if ((formData as any).id) {
        const { id, ...rest } = formData as any;
        const updated = await InventoryService.updateFixture(id, rest);
        setFixtures(prev => prev.map(f => f.id === id ? updated : f));
        addToast({ type: 'success', message: 'Demirbaş güncellendi.' });
      } else {
        const created = await InventoryService.createFixture(formData as any);
        setFixtures(prev => [created, ...prev]);
        addToast({ type: 'success', message: 'Demirbaş eklendi.' });
      }
      setModalOpen(false);
    } catch {
      addToast({ type: 'error', message: 'Demirbaş kaydedilemedi.' });
    }
  };

  return (
    <MetronicLayout title="Demirbaş Yönetimi" breadcrumbs={['Stok/Depo', 'Demirbaşlar']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Toplam Demirbaş', value: `${fixtures.length} Adet`, icon: <Monitor size={20} />, color: 'text-metronic-primary', bg: 'bg-metronic-primary-light dark:bg-metronic-primary/10' },
          { label: 'Aktif Cihazlar', value: `${fixtures.filter(f => f.status === 'AKTİF').length} Adet`, icon: <Cpu size={20} />, color: 'text-metronic-success', bg: 'bg-metronic-success-light dark:bg-metronic-success/10' },
          { label: 'Arıza/Bakım', value: `${fixtures.filter(f => ['BAKIMDA', 'ARIZALI'].includes(f.status)).length} Adet`, icon: <Wrench size={20} />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Toplam Varlık Değeri', value: fmt(fixtures.reduce((acc, f) => acc + f.value, 0)), icon: <Save size={20} />, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
        ].map((c, i) => (
          <div key={i} className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.color}`}>{c.icon}</div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
              <p className={`text-[1.1rem] font-bold mt-0.5 ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-xl shadow-sm overflow-visible">
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} demirbaş seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-white text-metronic-danger border border-metronic-danger/30 text-[12px] font-bold rounded-lg hover:bg-metronic-danger hover:text-white transition-colors">Sil</button>
              <button onClick={() => setSelectedIds(new Set())} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"><X size={15} /></button>
            </div>
          </div>
        )}

        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Demirbaş ve Cihazlar</h3>
            <span className="px-2.5 py-1 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{sorted.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Demirbaş, marka, seri no veya konum ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-metronic-primary/20 transition-all font-medium" />
            </div>
            {/* Filter dropdown */}
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-10 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterCategory || filterStatus ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>
                <Filter size={15} /> Filtrele {(filterCategory || filterStatus) && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase">Kategori</p></div>
              <FilterItem label="Tüm Kategoriler" active={!filterCategory} onClick={() => setFilterCategory('')} />
              {uniqueCategories.map(c => <FilterItem key={c} label={c} active={filterCategory === c} onClick={() => setFilterCategory(filterCategory === c ? '' : c)} />)}
              <div className="px-4 py-2 border-t border-b border-slate-100 dark:border-white/5 mt-1"><p className="text-[11px] font-bold text-slate-400 uppercase">Durum</p></div>
              <FilterItem label="Tüm Durumlar" active={!filterStatus} onClick={() => setFilterStatus('')} />
              {Object.entries(STATUS_MAP).map(([k, v]) => <FilterItem key={k} label={v.label} active={filterStatus === k} onClick={() => setFilterStatus(filterStatus === k ? '' : k)} />)}
              {(filterCategory || filterStatus) && <div className="border-t border-slate-100 mt-1 px-3 py-2"><button onClick={() => { setFilterCategory(''); setFilterStatus(''); }} className="w-full text-center text-[12px] font-bold text-rose-500">Filtreleri Temizle</button></div>}
            </Dropdown>

            {/* Export dropdown */}
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-10 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase">Format Seçin</p></div>
              <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>

            <button onClick={() => { setFormData({ name: '', brand: '', model: '', serialNo: '', category: 'Cihaz', status: 'AKTİF', location: '', value: 0 } as any); setModalOpen(true); }} className="flex items-center gap-1.5 h-10 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-all shadow-lg shadow-metronic-primary/20"><Plus size={18} /> Yeni Demirbaş Ekle</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/[0.02] text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                <th className="px-6 py-4 w-10"><input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></th>
                <SortableHeader label="Demirbaş & Marka" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Kategori" column="category" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Konum" column="location" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Alım Tarihi" column="purchaseDate" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Maliyet" column="value" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="px-6 py-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-500 font-medium">Yükleniyor...</td></tr>
              ) : error ? (
                <tr><td colSpan={8} className="py-12 text-center text-metronic-danger font-medium">{error}</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-500 font-medium">Eşleşen demirbaş bulunamadı.</td></tr>
              ) : paginated.map((f) => {
                const st = STATUS_MAP[f.status];
                return (
                  <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(f.id)} onChange={() => toggleOne(f.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-metronic-primary transition-colors"><Monitor size={20} /></div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-slate-800 dark:text-white leading-tight">{f.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-metronic-primary font-bold uppercase">{f.brand}</span>
                            <span className="text-[11px] text-slate-400 font-medium">| {f.model}</span>
                            <span className="text-[11px] text-slate-300 font-mono">({f.serialNo})</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded text-[10px] font-black uppercase tracking-tighter"><Tag size={11} /> {f.category}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold ${st.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5"><MapPin size={13} className="text-slate-300" /> {f.location}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                         <span className="text-[12px] text-slate-600 dark:text-slate-300 font-medium">{f.purchaseDate}</span>
                         <span className="text-[10px] text-slate-400 flex items-center gap-1"><ShieldCheck size={10} /> Garanti Aktif</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-[13px] font-bold text-slate-800 dark:text-slate-100">{fmt(f.value)}</td>
                    <td className="px-6 py-4 text-right">
                      <Dropdown align="right" trigger={<button className="p-2 text-slate-300 hover:text-metronic-primary transition-colors"><Settings size={16} /></button>}>
                        <DropdownItem icon={<Edit2 size={14} />} label="Düzenle" onClick={() => { setFormData(f); setModalOpen(true); }} />
                        <DropdownItem icon={<FileText size={14} />} label="Log Kayıtları" onClick={() => setLogModal({ isOpen: true, data: f })} />
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ─── FOOTER & PAGINATION ─── */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-xl">
          
          {/* Sol Alt: Limit seçici + Toplam bilgisi */}
          <div className="flex items-center gap-3">
            <select
              value={pageLimit}
              onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="h-7 px-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[12px] font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-metronic-primary cursor-pointer w-20"
            >
              {PAGE_LIMIT_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt === 1000 ? '1000' : opt}</option>
              ))}
            </select>
            <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
            <div className="w-px h-4 bg-slate-200"></div>
            <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">
              Toplam <span className="font-bold text-slate-700 dark:text-slate-200">{sorted.length}</span> kayıttan{' '}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {Math.min((currentPage - 1) * pageLimit + 1, sorted.length)}–{Math.min(currentPage * pageLimit, sorted.length)}
              </span> arası
            </span>
          </div>

          {/* Sağ: Sayfa Navigasyonu */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
            >«</button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            ><ChevronLeft size={16} /></button>

            {/* Sayfa Numaraları */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${
                    page === currentPage
                      ? 'bg-metronic-primary text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >{page}</button>
              );
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            ><ChevronRight size={16} /></button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
            >»</button>
          </div>
        </div>
      </div>

      {/* MODAL: ADD FIXTURE */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Demirbaş Kaydı" size="md" footer={
        <><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors font-bold">İptal</button>
        <button form="fixture-form" type="submit" className="flex items-center gap-2 px-6 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-all shadow-lg shadow-metronic-primary/20"><Save size={16} /> Demirbaşı Kaydet</button></>
      }>
        <form id="fixture-form" onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col gap-1.5"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Demirbaş / Cihaz Adı</label><input required className="m-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Marka</label><input required className="m-input" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Model</label><input required className="m-input" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Seri No</label><input required className="m-input" value={formData.serialNo} onChange={e => setFormData({...formData, serialNo: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Kategori</label><select className="m-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option>Ünit</option><option>Görüntüleme</option><option>Sterilizasyon</option><option>Cihaz</option><option>El Aleti</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bulunduğu Yer</label><input required className="m-input" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
            <div className="flex flex-col gap-1.5"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Maliyet (₺)</label><input type="number" className="m-input" value={formData.value} onChange={e => setFormData({...formData, value: parseInt(e.target.value) || 0})} /></div>
          </div>
        </form>
      </Modal>

      {/* ─── LOG KAYITLARI MODALİ ─── */}
      <Modal
        isOpen={logModal.isOpen}
        onClose={() => setLogModal({ isOpen: false, data: null })}
        title="Log Kayıtları"
        subtitle={`${logModal.data?.name || ''} demirbaşına ait sistem kayıtları.`}
        size="md"
        footer={
          <button
            onClick={() => setLogModal({ isOpen: false, data: null })}
            className="px-5 py-2 text-[13px] font-bold text-white bg-metronic-primary rounded-lg hover:opacity-90 transition-opacity"
          >
            Kapat
          </button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Oluşturan</span>
            <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
              {logModal.data?.createdBy || 'Sistem Yöneticisi'}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Oluşturulma Tarihi</span>
            <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
              {logModal.data?.purchaseDate || new Date().toLocaleDateString('tr-TR')}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Son Düzenleyen</span>
            <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
              {logModal.data?.lastEditedBy || 'Sistem Yöneticisi'}
            </span>
          </div>
          
          <div className="flex flex-col gap-2 p-3 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-lg">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Sistem Notları</span>
            <div className="text-[12px] text-slate-700 dark:text-slate-300">
              <ul className="list-disc list-inside space-y-1.5">
                <li>Demirbaş sisteme eklendi.</li>
                <li>Son güncelleme yapıldı.</li>
              </ul>
            </div>
          </div>
        </div>
      </Modal>

    </MetronicLayout>
  );
}
