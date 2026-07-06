'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { TreatmentService, TariffGroupInfo } from '../../lib/services/treatment.service';
import Modal from '../../components/ui/Modal';
import Dropdown from '../ui/Dropdown';
import {
  Search, Plus, Filter, Download, Edit2, Trash2,
  ChevronLeft, ChevronRight, ChevronDown, X, Save,
  ArrowUp, ArrowDown, FileText, FileSpreadsheet,
  CheckSquare, TrendingUp, TrendingDown, ToggleLeft, ToggleRight,
  Copy, Settings, FolderPlus, RefreshCw, Layers
} from 'lucide-react';

// ─── ADR-001 File-local components ────────────────────────────────────────


function DropdownItem({ icon, label, danger = false, onClick }: {
  icon?: React.ReactNode; label: string; danger?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left
        ${danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}
    >
      {icon}{label}
    </button>
  );
}

function FilterItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left
        ${active ? 'text-metronic-primary bg-metronic-primary/5 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}
    >
      {label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-metronic-primary flex-shrink-0" />}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: {
  label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (c: string) => void;
}) {
  const active = sortColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      className="py-3 px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors select-none"
    >
      <div className="flex items-center gap-1.5">
        {label}
        {active
          ? sortDirection === 'asc'
            ? <ArrowUp size={11} className="text-metronic-primary" />
            : <ArrowDown size={11} className="text-metronic-primary" />
          : <ArrowUp size={10} className="opacity-20" />}
      </div>
    </th>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface TariffRecord {
  id: string;
  sutCode: string;
  name: string;
  category: string;
  vatRate: number;
  priceExclVat: number;
  priceInclVat: number;
  currency: string;
  status: 'AKTİF' | 'PASİF';
  isModified?: boolean;
  isNew?: boolean;
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function TreatmentsView({
  embedded = false,
  onBack,
}: {
  embedded?: boolean;
  onBack?: () => void;
}) {
  const { user } = useAuthStore();

  // Group state
  const [groups, setGroups] = useState<TariffGroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('default');
  const [selectedGroupName, setSelectedGroupName] = useState('');

  // Table state (ADR-001)
  const [records, setRecords] = useState<TariffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>('sutCode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Save state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Monotonic counter for client-side-only temp ids (avoids calling the
  // impure Date.now() during the add-treatment flow)
  const newRecordIdCounter = useRef(0);

  // Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [addGroupModalOpen, setAddGroupModalOpen] = useState(false);
  const [newTreatment, setNewTreatment] = useState({ sutCode: '', name: '', category: '', vatRate: 10, priceExclVat: 0 });
  const [bulkAction, setBulkAction] = useState<{ type: 'increase' | 'decrease'; value: string }>({ type: 'increase', value: '10' });
  const [newGroup, setNewGroup] = useState({ name: '', sourceGroupId: '' });

  // Load groups
  useEffect(() => {
    if (!user) return;
    TreatmentService.getTariffGroups().then(g => {
      setGroups(g);
      if (g.length > 0) setSelectedGroupName(g[0]?.name || '');
    }).catch(() => {});
  }, [user]);

  // Sync group name when selection changes — pure derivation from selectedGroupId/groups
  // with no async work, so it's computed during render instead of in an effect.
  const [prevGroupSync, setPrevGroupSync] = useState<{ id: string; groups: TariffGroupInfo[] }>({ id: selectedGroupId, groups });
  if (selectedGroupId !== prevGroupSync.id || groups !== prevGroupSync.groups) {
    setPrevGroupSync({ id: selectedGroupId, groups });
    const g = groups.find(x => x.id === selectedGroupId);
    if (g) setSelectedGroupName(g.name);
  }

  // Load tariffs when group changes
  const fetchTariffs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const data = await TreatmentService.getTariffs(selectedGroupId);
      const mapped: TariffRecord[] = data.map((t: any) => {
        const excl = Number(t.price ?? 0);
        const vat = Number(t.taxRate ?? 10);
        return {
          id: t.id,
          sutCode: t.masterTreatment?.sutCode || '',
          name: t.masterTreatment?.name || '',
          category: t.masterTreatment?.category || 'Diğer',
          vatRate: vat,
          priceExclVat: excl,
          priceInclVat: +(excl * (1 + vat / 100)).toFixed(2),
          currency: t.currency || 'TRY',
          status: (t.status === 'PASİF' || t.status === 'Pasif') ? 'PASİF' : 'AKTİF',
        };
      });
      setRecords(mapped);
      setHasUnsavedChanges(false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, selectedGroupId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/dep-change pattern
    fetchTariffs();
  }, [fetchTariffs]);

  // Reset to page 1 whenever the filters or selected group change (pure derivation, no async work).
  const pageFilterKey = `${searchTerm}|${categoryFilter}|${statusFilter}|${selectedGroupId}`;
  const [prevPageFilterKey, setPrevPageFilterKey] = useState(pageFilterKey);
  if (pageFilterKey !== prevPageFilterKey) {
    setPrevPageFilterKey(pageFilterKey);
    setCurrentPage(1);
  }

  // ─── Data Flow: rawData → filtered → sorted → paginated ───────────────

  const categories = Array.from(new Set(records.map(r => r.category))).sort((a, b) => a.localeCompare(b, 'tr'));

  const filtered = records.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || r.name.toLowerCase().includes(q) || r.sutCode.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    const matchCat = !categoryFilter || r.category === categoryFilter;
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    const av = (a as any)[sortColumn];
    const bv = (b as any)[sortColumn];
    const cmp = typeof av === 'string' ? av.localeCompare(bv, 'tr') : Number(av) - Number(bv);
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));
  const paginated = sorted.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  // ─── Selection ─────────────────────────────────────────────────────────

  const allPageSelected = paginated.length > 0 && paginated.every(r => selectedIds.has(r.id));
  const toggleAll = () => {
    const next = new Set(selectedIds);
    if (allPageSelected) paginated.forEach(r => next.delete(r.id));
    else paginated.forEach(r => next.add(r.id));
    setSelectedIds(next);
  };
  const toggleOne = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  // ─── Price & Status Edit ───────────────────────────────────────────────

  const handlePriceChange = (id: string, field: 'priceExclVat' | 'priceInclVat', value: string) => {
    const num = parseFloat(value) || 0;
    setRecords(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (field === 'priceExclVat') {
        return { ...r, priceExclVat: num, priceInclVat: +(num * (1 + r.vatRate / 100)).toFixed(2), isModified: true };
      }
      return { ...r, priceInclVat: num, priceExclVat: +(num / (1 + r.vatRate / 100)).toFixed(2), isModified: true };
    }));
    setHasUnsavedChanges(true);
  };

  const toggleStatus = (id: string) => {
    setRecords(prev => prev.map(r =>
      r.id === id ? { ...r, status: r.status === 'AKTİF' ? 'PASİF' : 'AKTİF', isModified: true } : r
    ));
    setHasUnsavedChanges(true);
  };

  // ─── Bulk Actions ──────────────────────────────────────────────────────

  const handleBulkStatusChange = (status: 'AKTİF' | 'PASİF') => {
    const targets = selectedIds.size > 0 ? selectedIds : new Set(filtered.map(r => r.id));
    setRecords(prev => prev.map(r => targets.has(r.id) ? { ...r, status, isModified: true } : r));
    setHasUnsavedChanges(true);
    setSelectedIds(new Set());
  };

  const handleApplyBulkPrice = () => {
    const targets = selectedIds.size > 0 ? selectedIds : new Set(filtered.map(r => r.id));
    const pct = parseFloat(bulkAction.value) / 100;
    const factor = bulkAction.type === 'increase' ? 1 + pct : 1 - pct;
    setRecords(prev => prev.map(r => {
      if (!targets.has(r.id)) return r;
      const excl = +(r.priceExclVat * factor).toFixed(2);
      return { ...r, priceExclVat: excl, priceInclVat: +(excl * (1 + r.vatRate / 100)).toFixed(2), isModified: true };
    }));
    setBulkModalOpen(false);
    setHasUnsavedChanges(true);
  };

  // ─── Save ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const modified = records.filter(r => r.isModified || r.isNew);
    if (modified.length === 0) { setHasUnsavedChanges(false); return; }
    setIsSaving(true);
    try {
      await TreatmentService.bulkUpdateTariffs(selectedGroupId, modified.map(r => ({
        id: r.id,
        price: r.priceExclVat,
        taxRate: r.vatRate,
        name: r.name,
        sutCode: r.sutCode,
        category: r.category,
        status: r.status,
        currency: r.currency,
      })));
      await fetchTariffs();
    } catch {
      alert('Fiyatlar kaydedilirken hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Add Treatment ────────────────────────────────────────────────────

  const handleAddTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `NEW-${++newRecordIdCounter.current}`;
    const cat = newTreatment.category || categories[0] || 'Diğer';
    const inclVat = +(newTreatment.priceExclVat * (1 + newTreatment.vatRate / 100)).toFixed(2);
    setRecords(prev => [{
      ...newTreatment, id, category: cat,
      priceInclVat: inclVat, currency: 'TRY', status: 'AKTİF' as const, isNew: true,
    }, ...prev]);
    setAddModalOpen(false);
    setNewTreatment({ sutCode: '', name: '', category: '', vatRate: 10, priceExclVat: 0 });
    setHasUnsavedChanges(true);
  };

  // ─── Add Group ────────────────────────────────────────────────────────

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const g = await TreatmentService.createTariffGroup({
        name: newGroup.name,
        sourceGroupId: newGroup.sourceGroupId || undefined,
      });
      const updated = await TreatmentService.getTariffGroups();
      setGroups(updated);
      setSelectedGroupId(g.id);
      setAddGroupModalOpen(false);
      setNewGroup({ name: '', sourceGroupId: '' });
    } catch {
      alert('Tarife grubu oluşturulamadı.');
    }
  };

  // ─── Export CSV ───────────────────────────────────────────────────────

  const exportCSV = () => {
    const BOM = '﻿';
    const headers = ['Kod', 'Tedavi Adı', 'Kategori', 'Tutar', 'KDV%', 'Toplam', 'Para Birimi', 'Durum'];
    const rows = sorted.map(r => [
      r.sutCode, r.name, r.category,
      r.priceExclVat.toFixed(2), r.vatRate, r.priceInclVat.toFixed(2),
      r.currency, r.status,
    ]);
    const csv = BOM + [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${selectedGroupName || 'tarifeler'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col ${embedded ? 'h-[75vh]' : 'h-full'} bg-white dark:bg-[#1c1f2e]`}>
      <style>{`
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none }
        .price-cell:focus-within { background: rgba(0,158,247,0.04) }
      `}</style>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-slate-200/60 dark:border-white/5">

        {/* Row 1: Başlık */}
        <div className="px-6 py-3 flex items-center gap-3 bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
          <div className="w-9 h-9 rounded-xl bg-metronic-primary/10 text-metronic-primary flex items-center justify-center flex-shrink-0">
            <Layers size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-extrabold text-slate-800 dark:text-white tracking-tight leading-tight">
              Tedaviler &amp; Tarifeler
            </h2>
            <p className="text-[11px] text-slate-400 truncate">{selectedGroupName}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-2.5 py-1 bg-metronic-primary/10 text-metronic-primary text-[11px] font-bold rounded-full border border-metronic-primary/20">
              {filtered.length} İŞLEM
            </span>
            {hasUnsavedChanges && (
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full animate-pulse border border-amber-200 dark:border-amber-500/20">
                ● KAYDEDİLMEMİŞ
              </span>
            )}
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Tarife Grubu Tabs */}
        <div className="px-6 py-2 flex items-center gap-2 overflow-x-auto border-b border-slate-100 dark:border-white/[0.04]">
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className={`flex items-center gap-1.5 h-8 px-4 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all flex-shrink-0
                ${selectedGroupId === g.id
                  ? 'bg-metronic-primary text-white shadow-sm shadow-metronic-primary/25'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
            >
              {g.name}
              {g.treatmentCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                  ${selectedGroupId === g.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                  {g.treatmentCount}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => setAddGroupModalOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium text-slate-500 border border-dashed border-slate-300 dark:border-white/20 hover:border-metronic-primary hover:text-metronic-primary transition-all flex-shrink-0"
          >
            <FolderPlus size={13} /> Yeni Grup
          </button>
        </div>

        {/* Row 3: ADR-001 Toolbar — [Arama] [Filtreler] | [Dışa Aktar] [+ Ekle] [Kaydet] */}
        <div className="px-6 py-3 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tedavi adı, kod veya kategori..."
              className="m-input pl-9 h-9 text-[13px]"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <X size={12} />
              </button>
            )}
          </div>

          <Dropdown align="left" trigger={
            <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium transition-all whitespace-nowrap
              ${categoryFilter
                ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary'
                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>
              <Filter size={13} />
              {categoryFilter ? `${categoryFilter.split(' ').slice(0, 2).join(' ')}…` : 'Kategori'}
              <ChevronDown size={11} className="opacity-50" />
            </button>
          }>
            <FilterItem label="Tümü" active={!categoryFilter} onClick={() => setCategoryFilter(null)} />
            {categories.map(c => (
              <FilterItem key={c} label={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)} />
            ))}
          </Dropdown>

          <Dropdown align="left" trigger={
            <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium transition-all whitespace-nowrap
              ${statusFilter
                ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary'
                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>
              {statusFilter === 'AKTİF'
                ? <ToggleRight size={13} className="text-green-500" />
                : statusFilter === 'PASİF'
                  ? <ToggleLeft size={13} className="text-red-400" />
                  : <ToggleRight size={13} />}
              {statusFilter || 'Durum'}
              <ChevronDown size={11} className="opacity-50" />
            </button>
          }>
            <FilterItem label="Tümü" active={!statusFilter} onClick={() => setStatusFilter(null)} />
            <FilterItem label="AKTİF" active={statusFilter === 'AKTİF'} onClick={() => setStatusFilter('AKTİF')} />
            <FilterItem label="PASİF" active={statusFilter === 'PASİF'} onClick={() => setStatusFilter('PASİF')} />
          </Dropdown>

          <div className="flex-1" />

          <Dropdown align="right" trigger={
            <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 whitespace-nowrap">
              <Download size={13} /> Dışa Aktar <ChevronDown size={11} className="opacity-50" />
            </button>
          }>
            <DropdownItem icon={<FileText size={13} className="text-green-600" />} label="CSV İndir" onClick={exportCSV} />
            <DropdownItem icon={<FileSpreadsheet size={13} className="text-blue-600" />} label="Excel (.xlsx)" />
          </Dropdown>

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 border border-metronic-primary text-metronic-primary hover:bg-metronic-primary hover:text-white rounded-lg text-[13px] font-bold transition-all whitespace-nowrap"
          >
            <Plus size={14} /> Yeni Tedavi
          </button>

          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className={`flex items-center gap-1.5 h-9 px-5 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap
              ${hasUnsavedChanges
                ? 'bg-metronic-primary text-white hover:bg-blue-600 shadow-sm shadow-metronic-primary/20 active:scale-95'
                : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed'}`}
          >
            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* ── Seçim Çubuğu ──────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-2.5 bg-metronic-primary/[0.06] border-b border-metronic-primary/15"
          style={{ animation: 'fadeInDown 0.15s ease' }}
        >
          <div className="flex items-center gap-2">
            <CheckSquare size={15} className="text-metronic-primary" />
            <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} kayıt seçildi</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('AKTİF')}
              className="h-7 px-3 bg-white dark:bg-white/5 border border-green-200 text-green-600 text-[11px] font-bold rounded-lg hover:bg-green-50 transition-colors"
            >
              ✓ Aktif Yap
            </button>
            <button
              onClick={() => handleBulkStatusChange('PASİF')}
              className="h-7 px-3 bg-white dark:bg-white/5 border border-red-200 text-red-500 text-[11px] font-bold rounded-lg hover:bg-red-50 transition-colors"
            >
              ✗ Pasif Yap
            </button>
            <button
              onClick={() => setBulkModalOpen(true)}
              className="h-7 px-3 bg-white dark:bg-white/5 border border-metronic-primary/25 text-metronic-primary text-[11px] font-bold rounded-lg hover:bg-metronic-primary/5 transition-colors"
            >
              % Fiyat
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Tablo ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw size={28} className="animate-spin text-metronic-primary/30 mx-auto mb-3" />
              <p className="text-[13px] text-slate-400">Tarifeler yükleniyor...</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#16192a] border-b border-slate-200/60 dark:border-white/5 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
              <tr>
                <th className="py-3 pl-5 pr-2 w-9">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded cursor-pointer accent-metronic-primary"
                  />
                </th>
                <SortableHeader label="Kod" column="sutCode" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Tedavi Adı" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Kategori" column="category" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-3 px-3 text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Tutar
                </th>
                <th className="py-3 px-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  KDV%
                </th>
                <th className="py-3 px-3 text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Toplam
                </th>
                <th className="py-3 px-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Para
                </th>
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-3 pr-5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-[13px] text-slate-400">
                    {searchTerm || categoryFilter || statusFilter
                      ? 'Arama veya filtre sonucu bulunamadı.'
                      : 'Bu tarifede kayıt yok.'}
                  </td>
                </tr>
              ) : paginated.map(r => {
                const isPasif = r.status === 'PASİF';
                const isSelected = selectedIds.has(r.id);
                return (
                  <tr
                    key={r.id}
                    className={`transition-colors group
                      ${isSelected
                        ? 'bg-metronic-primary/[0.04] dark:bg-metronic-primary/[0.08]'
                        : isPasif
                          ? 'bg-red-50/40 dark:bg-red-500/[0.03] hover:bg-red-50/60'
                          : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'}`}
                  >
                    <td className="py-2 pl-5 pr-2">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.id)} className="w-4 h-4 rounded cursor-pointer accent-metronic-primary" />
                    </td>
                    <td className={`py-2 px-3 text-[12px] font-mono font-bold ${isPasif ? 'text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {r.sutCode || '—'}
                    </td>
                    <td className={`py-2 px-3 text-[13px] font-semibold max-w-[280px] ${isPasif ? 'text-red-500 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      <span className="truncate block">{r.name}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold
                        ${isPasif
                          ? 'bg-red-100 dark:bg-red-500/10 text-red-400'
                          : 'bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-300'}`}>
                        {r.category}
                      </span>
                    </td>
                    {/* Tutar — editable */}
                    <td className="p-0 price-cell">
                      <input
                        type="number"
                        value={r.priceExclVat}
                        onChange={e => handlePriceChange(r.id, 'priceExclVat', e.target.value)}
                        className={`w-full h-10 px-3 text-right text-[12px] font-bold bg-transparent outline-none min-w-[88px]
                          ${isPasif ? 'text-red-400' : 'text-slate-700 dark:text-slate-200'}`}
                      />
                    </td>
                    <td className={`py-2 px-3 text-center text-[12px] font-medium ${isPasif ? 'text-red-400/60' : 'text-slate-400'}`}>
                      %{r.vatRate}
                    </td>
                    {/* Toplam — editable */}
                    <td className="p-0 price-cell">
                      <input
                        type="number"
                        value={r.priceInclVat}
                        onChange={e => handlePriceChange(r.id, 'priceInclVat', e.target.value)}
                        className={`w-full h-10 px-3 text-right text-[12px] font-bold bg-transparent outline-none min-w-[88px]
                          ${isPasif ? 'text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                      />
                    </td>
                    <td className={`py-2 px-3 text-center text-[11px] font-semibold ${isPasif ? 'text-red-400/60' : 'text-slate-400'}`}>
                      {r.currency}
                    </td>
                    {/* Durum badge — kliklenerek toggle */}
                    <td className="py-2 px-3">
                      <span
                        onClick={() => toggleStatus(r.id)}
                        title="Durumu değiştir"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors
                          ${isPasif
                            ? 'bg-red-100 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-200'
                            : 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-200'}`}
                      >
                        ● {r.status}
                      </span>
                    </td>
                    {/* Eylemler */}
                    <td className="py-2 pr-5">
                      <Dropdown align="right" trigger={
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-metronic-primary hover:bg-metronic-primary/8 opacity-0 group-hover:opacity-100 transition-all">
                          <Settings size={13} />
                        </button>
                      }>
                        <DropdownItem icon={<Edit2 size={13} />} label="Düzenle" />
                        <DropdownItem
                          icon={isPasif ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                          label={isPasif ? 'Aktif Yap' : 'Pasif Yap'}
                          onClick={() => toggleStatus(r.id)}
                        />
                        <DropdownItem icon={<Copy size={13} />} label="Kopyala" />
                        <DropdownItem icon={<Trash2 size={13} />} label="Sil" danger />
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Sayfalama (ADR-001 Footer) ─────────────────────────────────── */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between px-6 py-3 gap-3 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e]">
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <span>Sayfa başı:</span>
          <select
            value={pageLimit}
            onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
            className="h-7 px-2 text-[12px] border border-slate-200 dark:border-white/10 rounded-md bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 outline-none focus:border-metronic-primary"
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-slate-400">
            {sorted.length === 0 ? '0' : `${(currentPage - 1) * pageLimit + 1}–${Math.min(currentPage * pageLimit, sorted.length)}`}
            <span className="mx-1 text-slate-300">/</span>
            <strong className="text-slate-700 dark:text-slate-200">{sorted.length}</strong> kayıt
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 text-[11px] font-bold">«</button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <button key={p} onClick={() => setCurrentPage(p)}
                className={`w-7 h-7 flex items-center justify-center rounded text-[12px] font-bold transition-colors
                  ${p === currentPage
                    ? 'bg-metronic-primary text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                {p}
              </button>
            );
          })}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 text-[11px] font-bold">»</button>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}

      {/* Yeni Tedavi */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Yeni Tedavi Ekle"
        footer={<button form="add-treatment-form" className="px-5 py-2 bg-metronic-primary text-white rounded-lg font-bold text-[13px]">Kaydet</button>}
      >
        <form id="add-treatment-form" onSubmit={handleAddTreatment} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SUT / Kod</label>
              <input value={newTreatment.sutCode} onChange={e => setNewTreatment({ ...newTreatment, sutCode: e.target.value })} className="m-input mt-1 text-[13px]" placeholder="01-001-001" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">KDV (%)</label>
              <select value={newTreatment.vatRate} onChange={e => setNewTreatment({ ...newTreatment, vatRate: Number(e.target.value) })} className="m-input mt-1 text-[13px]">
                <option value={0}>0</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tedavi Adı</label>
            <input required value={newTreatment.name} onChange={e => setNewTreatment({ ...newTreatment, name: e.target.value })} className="m-input mt-1 text-[13px]" placeholder="Tedavi adını girin" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kategori</label>
            <select value={newTreatment.category || categories[0] || ''} onChange={e => setNewTreatment({ ...newTreatment, category: e.target.value })} className="m-input mt-1 text-[13px]">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tutar (KDV Hariç)</label>
            <input type="number" value={newTreatment.priceExclVat} onChange={e => setNewTreatment({ ...newTreatment, priceExclVat: Number(e.target.value) })} className="m-input mt-1 text-[13px]" placeholder="0.00" />
          </div>
        </form>
      </Modal>

      {/* Toplu Fiyat Güncelleme */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Toplu Fiyat Güncelleme"
        footer={<button onClick={handleApplyBulkPrice} className="px-5 py-2 bg-metronic-primary text-white rounded-lg font-bold text-[13px]">Uygula</button>}
      >
        <div className="space-y-4 py-2">
          <p className="text-[12px] text-slate-500 bg-slate-50 dark:bg-white/5 rounded-lg px-3 py-2">
            {selectedIds.size > 0
              ? <><strong>{selectedIds.size}</strong> seçili kayda uygulanacak.</>
              : <><strong>{filtered.length}</strong> görüntülenen kayıda uygulanacak.</>}
          </p>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">İşlem Türü</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { type: 'increase' as const, icon: <TrendingUp size={14} />, label: '% Artış' },
                { type: 'decrease' as const, icon: <TrendingDown size={14} />, label: '% İndirim' },
              ].map(opt => (
                <button key={opt.type} onClick={() => setBulkAction(a => ({ ...a, type: opt.type }))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 font-semibold text-[13px] transition-all
                    ${bulkAction.type === opt.type
                      ? 'border-metronic-primary bg-metronic-primary/5 text-metronic-primary'
                      : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Oran (%)</label>
            <input type="number" className="m-input mt-1 text-center text-[18px] font-bold" value={bulkAction.value} onChange={e => setBulkAction(a => ({ ...a, value: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Yeni Tarife Grubu */}
      <Modal
        isOpen={addGroupModalOpen}
        onClose={() => setAddGroupModalOpen(false)}
        title="Yeni Tarife Grubu Oluştur"
        footer={<button form="add-group-form" className="px-5 py-2 bg-metronic-primary text-white rounded-lg font-bold text-[13px]">Oluştur</button>}
      >
        <form id="add-group-form" onSubmit={handleAddGroup} className="space-y-4 py-2">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Grup Adı</label>
            <input required value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} className="m-input mt-1 text-[13px]" placeholder="ör: 2027 Özel Tarife" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fiyatları Kopyala</label>
            <select value={newGroup.sourceGroupId} onChange={e => setNewGroup({ ...newGroup, sourceGroupId: e.target.value })} className="m-input mt-1 text-[13px]">
              <option value="">Boş başlat</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5">Seçilen grubun fiyatları yeni gruba kopyalanır.</p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
