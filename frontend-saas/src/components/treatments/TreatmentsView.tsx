'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Modal from '../../components/ui/Modal';
import { 
  Search, Plus, Filter, Download, Eye, EyeOff, Edit2, 
  Trash2, ChevronLeft, ChevronRight, Settings,
  X, FileText, FileSpreadsheet, ChevronDown,
  CheckSquare, ShieldAlert, Save, ArrowUp, ArrowDown,
  Stethoscope, Percent, MoreHorizontal, MoreVertical,
  ArrowLeft, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

// Full TDB 2026 Tariff Data (Mock)
const TDB_2026_TREATMENTS = [
  // 1. TEŞHİS VE TEDAVİ PLANLAMASI
  { id: 'TDB-1-1', sutCode: '1-1', name: 'Dişhekimi Muayenesi', category: 'Teşhis ve Planlama', vatRate: 10, priceExclVat: 1500.00, priceInclVat: 1650.00 },
  { id: 'TDB-1-2', sutCode: '1-2', name: 'Uzman Dişhekimi Muayenesi', category: 'Teşhis ve Planlama', vatRate: 10, priceExclVat: 1850.00, priceInclVat: 2035.00 },
  { id: 'TDB-1-3', sutCode: '1-3', name: 'Kontrol Hekim Muayenesi', category: 'Teşhis ve Planlama', vatRate: 10, priceExclVat: 1300.00, priceInclVat: 1430.00 },
  { id: 'TDB-1-4', sutCode: '1-4', name: 'Konsültasyon', category: 'Teşhis ve Planlama', vatRate: 10, priceExclVat: 1009.09, priceInclVat: 1110.00 },
  { id: 'TDB-1-5', sutCode: '1-5', name: 'Uzman Dişhekimi Konsültasyonu', category: 'Teşhis ve Planlama', vatRate: 10, priceExclVat: 1313.64, priceInclVat: 1445.00 },
  { id: 'TDB-2-1', sutCode: '2-1', name: 'Amalgam Dolgu (Bir Yüzlü)', category: 'Tedavi & Endodonti', vatRate: 10, priceExclVat: 2586.36, priceInclVat: 2845.00 },
  { id: 'TDB-4-1', sutCode: '4-1', name: 'Tam Protez (Akrilik - Tek Çene)', category: 'Protez', vatRate: 10, priceExclVat: 29000.00, priceInclVat: 31900.00 },
  { id: 'TDB-5-1', sutCode: '5-1', name: 'Diş Çekimi', category: 'Cerrahi', vatRate: 10, priceExclVat: 2250.00, priceInclVat: 2475.00 },
  { id: 'TDB-6-1', sutCode: '6-1', name: 'Detartraj (Diş Taşı Temizliği - Tek Çene)', category: 'Periodontoloji', vatRate: 10, priceExclVat: 3000.00, priceInclVat: 3300.00 },
  // ... (Sadelik için burada kısa tutuyorum, TreatmentsPage'den tam listeyi alabiliriz ama şimdilik yapısal çalışalım)
];

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

function DropdownItem({ icon, label, danger = false, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
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

export default function TreatmentsView({ tariffName: initialTariffName, embedded = false, onBack }: { tariffName?: string; embedded?: boolean; onBack?: () => void }) {
  const { user } = useAuthStore();
  const router = useRouter();
  
  // Statik mock veriden başlatılıyor (async/harici bir iş yok), bu yüzden lazy
  // initializer ile doğrudan state'e verilir — efekte gerek kalmaz.
  const [records, setRecords] = useState<any[]>(() =>
    JSON.parse(JSON.stringify(TDB_2026_TREATMENTS)).map((r: any) => ({ ...r, status: r.status || 'AKTİF' }))
  );
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const PAGE_LIMIT_OPTIONS = [25, 50, 100, 1000];
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [currentTariffName, setCurrentTariffName] = useState(initialTariffName || 'Tedaviler');
  
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState({ type: 'increase', percentage: '10' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTreatment, setNewTreatment] = useState({ sutCode: '', name: '', category: 'Teşhis ve Planlama', vatRate: 10, priceExclVat: 0 });

  // tariffName prop'u değişince başlığı senkronize et — saf türetim, async iş yok,
  // bu yüzden render sırasında ayarlanır (React docs: prop'u state'e kopyalamak
  // için efekt yerine render sırasında ayarla).
  const [prevInitialTariffName, setPrevInitialTariffName] = useState(initialTariffName);
  if (initialTariffName !== prevInitialTariffName) {
    setPrevInitialTariffName(initialTariffName);
    if (initialTariffName) {
      setCurrentTariffName(initialTariffName);
    }
  }

  const filtered = records.filter(r => {
    const matchesSearch = [r.name, r.sutCode, r.category].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? r.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });
  
  const getSortedData = () => {
    let sorted = [...filtered];
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal = a[sortColumn as keyof typeof a];
        let bVal = b[sortColumn as keyof typeof b];
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal as any).toLowerCase?.() || bVal;
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

  // Arama veya kategori filtresi değişince sayfayı sıfırla (render sırasında, efekt olmadan)
  const [prevPagingFilters, setPrevPagingFilters] = useState({ searchTerm, categoryFilter });
  if (searchTerm !== prevPagingFilters.searchTerm || categoryFilter !== prevPagingFilters.categoryFilter) {
    setPrevPagingFilters({ searchTerm, categoryFilter });
    setCurrentPage(1);
  }

  const allSelected = paginated.length > 0 && paginated.every(r => selectedIds.has(r.id));
  const someSelected = paginated.some(r => selectedIds.has(r.id));
  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selectedIds);
      paginated.forEach(r => next.delete(r.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paginated.forEach(r => next.add(r.id));
      setSelectedIds(next);
    }
  };
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const categories = Array.from(new Set(records.map(r => r.category)));

  const handlePriceChange = (id: string, field: 'priceExclVat' | 'priceInclVat', value: string) => {
    const numValue = parseFloat(value) || 0;
    setRecords(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r };
      if (field === 'priceExclVat') {
        updated.priceExclVat = numValue;
        updated.priceInclVat = numValue * (1 + (updated.vatRate / 100));
      } else {
        updated.priceInclVat = numValue;
        updated.priceExclVat = numValue / (1 + (updated.vatRate / 100));
      }
      return updated;
    }));
    setHasUnsavedChanges(true);
  };

  const handleApplyBulkUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkData.type === 'status') {
      const newStatus = bulkData.percentage === 'active' ? 'AKTİF' : 'PASİF';
      setRecords(prev => prev.map(r => {
        if (selectedIds.size > 0 && !selectedIds.has(r.id)) return r;
        return { ...r, status: newStatus };
      }));
    } else {
      const percent = parseFloat(bulkData.percentage) / 100;
      const factor = bulkData.type === 'increase' ? (1 + percent) : (1 - percent);
      setRecords(prev => prev.map(r => {
        if (selectedIds.size > 0 && !selectedIds.has(r.id)) return r;
        const newExcl = r.priceExclVat * factor;
        return { ...r, priceExclVat: newExcl, priceInclVat: newExcl * (1 + (r.vatRate / 100)) };
      }));
    }
    setBulkModalOpen(false);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setHasUnsavedChanges(false);
    }, 800);
  };

  const handleBulkStatus = (status: 'AKTİF' | 'PASİF') => {
    setRecords(prev => prev.map(r => {
      if (!selectedIds.has(r.id)) return r;
      return { ...r, status };
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `CUSTOM-${Date.now()}`;
    const priceInclVat = newTreatment.priceExclVat * (1 + (newTreatment.vatRate / 100));
    const record = { ...newTreatment, id, priceInclVat, status: 'AKTİF' as const, isCustom: true };
    setRecords(prev => [record, ...prev]);
    setAddModalOpen(false);
    setNewTreatment({ sutCode: '', name: '', category: 'Teşhis ve Planlama', vatRate: 10, priceExclVat: 0 });
    setHasUnsavedChanges(true);
  };

  const handleDelete = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    setHasUnsavedChanges(true);
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map(r => r.id)));
  };

  const isAllFilteredSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));

  return (
    <div className={`flex flex-col ${embedded ? 'h-[75vh]' : 'h-full'}`}>
      <style>{`
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .price-input:focus { background-color: white !important; border-color: #009ef7 !important; box-shadow: inset 0 0 0 1px #009ef7; }
        .dark .price-input:focus { background-color: #1c1f2e !important; }
      `}</style>

      {/* Header Toolbar */}
      <div className="flex flex-col border-b border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] flex-shrink-0">
        {/* Top Row: Tariff Name */}
        <div className="px-6 py-4 flex items-center gap-4 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
          <div className="w-10 h-10 rounded-xl bg-metronic-primary text-white flex items-center justify-center shadow-lg shadow-metronic-primary/20">
            <Stethoscope size={20} />
          </div>
          <div className="flex-1">
            <div className="relative group max-w-2xl">
              <input 
                type="text" 
                value={currentTariffName} 
                onChange={e => { setCurrentTariffName(e.target.value); setHasUnsavedChanges(true); }}
                className="text-[1.3rem] font-extrabold text-slate-800 dark:text-white bg-transparent border-b-2 border-transparent hover:border-slate-300 dark:hover:border-white/10 outline-none focus:border-metronic-primary rounded-t px-1 -ml-1 w-full transition-all tracking-tight"
                placeholder="Tarife Adı Giriniz..."
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Edit2 size={16} className="text-slate-400" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <span className="px-3 py-1 bg-metronic-primary/10 text-metronic-primary text-[11px] font-bold rounded-full border border-metronic-primary/20">
               {filtered.length} İŞLEM
             </span>
             {onBack && (
               <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-metronic-danger hover:bg-metronic-danger/10 transition-all">
                 <X size={20} />
               </button>
             )}
          </div>
        </div>

        {/* Bottom Row: Actions Toolbar */}
        <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="İşlem adı veya kod ile ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="m-input pl-9 h-10 text-[13px] bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10" />
            </div>
            <Dropdown align="left" trigger={<button className="flex items-center gap-1.5 h-10 px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-[13px] font-medium shadow-sm"><Filter size={16} /> Kategori <ChevronDown size={14} className="opacity-50"/></button>}>
              <DropdownItem icon={<X size={14} />} label="Filtreyi Temizle" onClick={() => setCategoryFilter(null)} />
              {categories.map(c => <DropdownItem key={c} label={c} onClick={() => setCategoryFilter(c)} icon={<div className="w-2 h-2 rounded-full bg-slate-300"/>}/>)}
            </Dropdown>
          </div>

          <div className="flex items-center gap-2">
            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-10 px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-[13px] font-medium shadow-sm"><Download size={16} /> Dışa Aktar</button>}>
              <DropdownItem icon={<FileSpreadsheet size={15} className="text-green-600" />} label="Excel (.xlsx)" />
              <DropdownItem icon={<FileText size={15} className="text-red-500" />} label="PDF Raporu" />
            </Dropdown>
            
            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />
            
            <button onClick={() => setAddModalOpen(true)} className="flex items-center gap-1.5 h-10 px-5 bg-white dark:bg-white/5 border border-metronic-primary text-metronic-primary hover:bg-metronic-primary hover:text-white rounded-lg text-[13px] font-bold transition-all active:scale-95">
              <Plus size={18} /> Yeni Tedavi
            </button>
            
            <button onClick={handleSave} disabled={!hasUnsavedChanges || isSaving} className={`flex items-center gap-2 h-10 px-6 rounded-lg text-[13px] font-bold transition-all shadow-md active:scale-95 ${hasUnsavedChanges ? 'bg-metronic-primary text-white hover:bg-blue-600 shadow-metronic-primary/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed shadow-none'}`}>
              <Save size={18} /> {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>

      {/* Selection Bar & Extended Selection Banner */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col flex-shrink-0">
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleBulkStatus('AKTİF')} className="h-8 px-3 bg-white border border-metronic-success/30 text-metronic-success text-[12px] font-bold rounded-lg">Aktif Yap</button>
              <button onClick={() => handleBulkStatus('PASİF')} className="h-8 px-3 bg-white border border-metronic-danger/30 text-metronic-danger text-[12px] font-bold rounded-lg">Pasif Yap</button>
              <button onClick={() => setBulkModalOpen(true)} className="h-8 px-3 bg-white border border-metronic-primary/30 text-metronic-primary text-[12px] font-bold rounded-lg">Toplu İşlem</button>
              <button onClick={() => setSelectedIds(new Set())} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600"><X size={15} /></button>
            </div>
          </div>
          
          {allSelected && !isAllFilteredSelected && filtered.length > paginated.length && (
            <div className="px-6 py-2 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 text-center animate-[fadeInDown_0.2s_ease]">
              <span className="text-[12px] font-medium text-amber-700 dark:text-amber-400">
                Bu sayfadaki tüm <strong>{paginated.length}</strong> kayıt seçildi. 
                <button 
                  onClick={selectAllFiltered}
                  className="ml-2 font-bold text-metronic-primary hover:underline"
                >
                  Listedeki tüm {filtered.length} kaydı seç
                </button>
              </span>
            </div>
          )}
          
          {isAllFilteredSelected && filtered.length > paginated.length && (
            <div className="px-6 py-2 bg-metronic-primary-light/30 border-b border-metronic-primary/10 text-center animate-[fadeInDown_0.2s_ease]">
               <span className="text-[12px] font-bold text-metronic-primary uppercase tracking-wide">
                 Listedeki tüm {filtered.length} kayıt seçildi.
               </span>
               <button 
                onClick={() => setSelectedIds(new Set())}
                className="ml-3 text-[11px] font-bold text-slate-500 hover:text-metronic-danger underline"
               >
                 Seçimi Temizle
               </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto flex-1 relative bg-white dark:bg-[#1c1f2e]">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-white/[0.02] shadow-sm">
            <tr>
              <th className="py-4 pl-6 pr-3 w-10 border-r border-slate-200/60 dark:border-white/5"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded cursor-pointer accent-metronic-primary" /></th>
              <SortableHeader label="Kod" column="sutCode" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Tedavi Adı" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Kategori" column="category" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              <th className="py-4 px-4 text-center border-r border-slate-200/60 dark:border-white/5 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Fiyat (Hariç)</th>
              <th className="py-4 px-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Fiyat (Dahil)</th>
              <th className="py-4 pl-4 pr-6 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {paginated.map(r => (
              <tr key={r.id} className={`transition-colors ${selectedIds.has(r.id) ? 'bg-metronic-primary/5' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                <td className="py-2.5 pl-6 pr-3 border-r border-slate-100 dark:border-white/5"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleOne(r.id)} className="w-4 h-4 rounded cursor-pointer accent-metronic-primary" /></td>
                <td className="py-2.5 px-4 border-r border-slate-100 dark:border-white/5 text-[12px] font-mono font-bold text-slate-500">{r.sutCode}</td>
                <td className="py-2.5 px-4 border-r border-slate-100 dark:border-white/5 font-bold text-slate-800 dark:text-slate-100 text-[13px]">{r.name}</td>
                <td className="py-2.5 px-4 border-r border-slate-100 dark:border-white/5"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold">{r.category}</span></td>
                <td className="py-2.5 px-4 border-r border-slate-100 dark:border-white/5"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'AKTİF' ? 'bg-metronic-success-light text-metronic-success' : 'bg-slate-100 text-slate-400'}`}>{r.status}</span></td>
                <td className="p-0 border-r border-slate-100 dark:border-white/5 bg-metronic-primary/[0.01]">
                  <input type="number" value={r.priceExclVat.toFixed(2)} onChange={e => handlePriceChange(r.id, 'priceExclVat', e.target.value)} className="price-input w-full h-10 px-4 text-right bg-transparent outline-none font-bold text-[13px] transition-all" />
                </td>
                <td className="p-0 bg-metronic-success/[0.01]">
                  <input type="number" value={r.priceInclVat.toFixed(2)} onChange={e => handlePriceChange(r.id, 'priceInclVat', e.target.value)} className="price-input w-full h-10 px-4 text-right bg-transparent outline-none font-bold text-[13px] transition-all" />
                </td>
                <td className="py-2.5 pl-4 pr-6 text-right">
                   <Dropdown align="right" trigger={<button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-metronic-primary"><Settings size={16}/></button>}>
                     <DropdownItem icon={<Edit2 size={14}/>} label="Düzenle" />
                     {r.isCustom && <DropdownItem icon={<Trash2 size={14}/>} label="Sil" danger onClick={() => handleDelete(r.id)} />}
                   </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] flex-shrink-0">
         <span className="text-slate-500 text-[13px]">Toplam <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> kayıt</span>
         <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10"><ChevronLeft size={16}/></button>
            <span className="px-3 text-[13px] font-bold">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10"><ChevronRight size={16}/></button>
         </div>
      </div>

      {/* Modals (Inline for now) */}
      <Modal isOpen={bulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Toplu İşlemler" size="sm" footer={<button onClick={handleApplyBulkUpdate} className="px-5 py-2 bg-metronic-primary text-white rounded-lg font-bold text-[13px]">Uygula</button>}>
         <div className="space-y-4 py-2">
            <div>
               <label className="text-[11px] font-bold text-slate-500 uppercase">İşlem Türü</label>
               <select className="m-input mt-1" value={bulkData.type} onChange={e => setBulkData({...bulkData, type: e.target.value})}>
                  <option value="increase">Fiyat Artışı (%)</option>
                  <option value="decrease">Fiyat İndirimi (%)</option>
                  <option value="status">Durum Güncelle</option>
               </select>
            </div>
            {bulkData.type === 'status' ? (
               <div className="flex gap-2">
                  <button onClick={() => setBulkData({...bulkData, percentage: 'active'})} className={`flex-1 py-2 rounded-lg font-bold border-2 ${bulkData.percentage === 'active' ? 'border-metronic-success bg-metronic-success-light text-metronic-success' : 'border-slate-100'}`}>AKTİF</button>
                  <button onClick={() => setBulkData({...bulkData, percentage: 'passive'})} className={`flex-1 py-2 rounded-lg font-bold border-2 ${bulkData.percentage === 'passive' ? 'border-metronic-danger bg-metronic-danger-light text-metronic-danger' : 'border-slate-100'}`}>PASİF</button>
               </div>
            ) : (
               <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Oran (%)</label>
                  <input type="number" className="m-input mt-1" value={bulkData.percentage} onChange={e => setBulkData({...bulkData, percentage: e.target.value})} />
               </div>
            )}
         </div>
      </Modal>

      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Yeni Tedavi Ekle" footer={<button form="view-add-form" className="px-5 py-2 bg-metronic-primary text-white rounded-lg font-bold">Kaydet</button>}>
         <form id="view-add-form" onSubmit={handleAddTreatment} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
               <div><label className="text-[11px] font-bold text-slate-500 uppercase">SUT Kodu</label><input required className="m-input" value={newTreatment.sutCode} onChange={e => setNewTreatment({...newTreatment, sutCode: e.target.value})} /></div>
               <div><label className="text-[11px] font-bold text-slate-500 uppercase">KDV (%)</label><select className="m-input" value={newTreatment.vatRate} onChange={e => setNewTreatment({...newTreatment, vatRate: Number(e.target.value)})}><option value={10}>10</option><option value={20}>20</option></select></div>
            </div>
            <div><label className="text-[11px] font-bold text-slate-500 uppercase">Tedavi Adı</label><input required className="m-input" value={newTreatment.name} onChange={e => setNewTreatment({...newTreatment, name: e.target.value})} /></div>
            <div><label className="text-[11px] font-bold text-slate-500 uppercase">Kategori</label><select className="m-input" value={newTreatment.category} onChange={e => setNewTreatment({...newTreatment, category: e.target.value})}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-[11px] font-bold text-slate-500 uppercase">Fiyat (Hariç)</label><input type="number" required className="m-input" value={newTreatment.priceExclVat} onChange={e => setNewTreatment({...newTreatment, priceExclVat: Number(e.target.value)})} /></div>
         </form>
      </Modal>
    </div>
  );
}
