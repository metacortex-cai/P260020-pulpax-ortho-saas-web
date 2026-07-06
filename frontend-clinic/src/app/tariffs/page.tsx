'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import MetronicLayout from '../../components/layout/MetronicLayout';
import Modal from '../../components/ui/Modal';
import TreatmentsView from '../../components/treatments/TreatmentsView';
import Dropdown from '../../components/ui/Dropdown';
import { TreatmentService, TariffGroupInfo } from '../../lib/services/treatment.service';
import { useToastStore } from '../../store/toastStore';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight, Settings,
  X, FileText, ChevronDown, CheckSquare, Tags, Plus, Save,
  CheckCircle2, XCircle, Copy, Percent, Calendar, ArrowUp, ArrowDown, Edit2, AlertTriangle,
} from 'lucide-react';

function DropdownItem({ icon, label, danger = false, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

function FilterItem({ icon, label, active = false, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'text-metronic-primary bg-metronic-primary-light dark:bg-metronic-primary/10 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}{active && <CheckCircle2 size={12} className="ml-auto text-metronic-primary flex-shrink-0" />}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void }) {
  const isActive = sortColumn === column;
  return (
    <th onClick={() => onSort(column)} className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200/60 dark:border-white/5 cursor-pointer hover:text-metronic-primary transition-colors">
      <div className="flex items-center gap-2">
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={13} className="text-metronic-primary" /> : <ArrowDown size={13} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

const TYPE_MAP: Record<string, { cls: string; label: string }> = {
  'SİSTEM': { cls: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400', label: 'Merkezi (Sistem)' },
  'KLİNİK': { cls: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10', label: 'Klinik Özel' },
};

const STATUS_MAP: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  'AKTİF': { icon: <CheckCircle2 size={13} />, cls: 'bg-metronic-success-light text-metronic-success dark:bg-metronic-success/10', label: 'Aktif' },
  'PASİF': { icon: <XCircle size={13} />, cls: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400', label: 'Pasif' },
};

interface ConfirmState {
  message: string;
  onConfirm: () => Promise<void>;
}

export default function TariffsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { addToast } = useToastStore();
  const [records, setRecords] = useState<TariffGroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [prevPagingFilters, setPrevPagingFilters] = useState({ searchTerm: '', filterType: 'ALL' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', sourceTariff: '', validFrom: '', validTo: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [treatmentsModalOpen, setTreatmentsModalOpen] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<TariffGroupInfo | null>(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const data = await TreatmentService.getTariffGroups();
      setRecords(data);
    } catch {
      addToast({ type: 'error', message: 'Tarife grupları yüklenirken bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchGroups();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchGroups is redefined every render; adding it would retrigger this effect on every render
  }, [user, router]);

  const filtered = records.filter(r => {
    const matchesSearch = [r.name, r.type, r.id].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || r.type === filterType;
    return matchesSearch && matchesType;
  });

  const getSortedData = () => {
    if (!sortColumn) return [...filtered];
    return [...filtered].sort((a, b) => {
      const aVal = String(a[sortColumn as keyof TariffGroupInfo] ?? '').toLowerCase();
      const bVal = String(b[sortColumn as keyof TariffGroupInfo] ?? '').toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
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
  if (searchTerm !== prevPagingFilters.searchTerm || filterType !== prevPagingFilters.filterType) {
    setPrevPagingFilters({ searchTerm, filterType });
    setCurrentPage(1);
  }

  const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));
  const someSelected = filtered.some(r => selectedIds.has(r.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(paginated.map(r => r.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const activeTariffsCount = records.filter(r => r.status === 'AKTİF').length;
  const clinicTariffsCount = records.filter(r => r.type === 'KLİNİK').length;

  const handleConfirm = async () => {
    if (!confirmState) return;
    setConfirmLoading(true);
    try {
      await confirmState.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirmState(null);
    }
  };

  const handleBulkStatusChange = async (isActive: boolean) => {
    try {
      for (const id of selectedIds) {
        if (id !== 'default') await TreatmentService.updateTariffGroup(id, { isActive });
      }
      setSelectedIds(new Set());
      await fetchGroups();
      addToast({ type: 'success', message: `Seçili tarifeler ${isActive ? 'aktif' : 'pasif'} yapıldı.` });
    } catch {
      addToast({ type: 'error', message: 'İşlem sırasında bir hata oluştu.' });
    }
  };

  const handleBulkDelete = () => {
    setConfirmState({
      message: `${selectedIds.size} tarifeyi silmek istediğinize emin misiniz?`,
      onConfirm: async () => {
        try {
          for (const id of selectedIds) {
            if (id !== 'default') await TreatmentService.deleteTariffGroup(id);
          }
          setSelectedIds(new Set());
          await fetchGroups();
          addToast({ type: 'success', message: 'Seçili tarifeler silindi.' });
        } catch {
          addToast({ type: 'error', message: 'Silme işlemi sırasında bir hata oluştu.' });
        }
      },
    });
  };

  const handleDeleteTariff = (r: TariffGroupInfo) => {
    setConfirmState({
      message: `"${r.name}" tarifesini silmek istediğinize emin misiniz?`,
      onConfirm: async () => {
        try {
          await TreatmentService.deleteTariffGroup(r.id);
          await fetchGroups();
          addToast({ type: 'success', message: 'Tarife silindi.' });
        } catch {
          addToast({ type: 'error', message: 'Silme işlemi sırasında bir hata oluştu.' });
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await TreatmentService.createTariffGroup({
        name: formData.name,
        sourceGroupId: formData.sourceTariff || 'default',
        validFrom: formData.validFrom,
        validTo: formData.validTo,
      });
      setModalOpen(false);
      setFormData({ name: '', sourceTariff: '', validFrom: '', validTo: '' });
      await fetchGroups();
      addToast({ type: 'success', message: 'Tarife grubu oluşturuldu.' });
    } catch {
      addToast({ type: 'error', message: 'Tarife grubu oluşturulurken bir hata oluştu.' });
    } finally {
      setFormLoading(false);
    }
  };

  const exportCSV = () => {
    const BOM = '﻿';
    const headers = ['Tarife Kodu', 'Tarife Adı', 'Tür', 'Geçerlilik', 'İşlem Sayısı', 'Durum'];
    const rows = sortedData.map(r => [r.id, r.name, r.type, r.validity ?? '', r.treatmentCount ?? '', r.status]);
    const csv = BOM + [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tarifeler.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MetronicLayout title="Tarife İşlemleri" breadcrumbs={['Tarifeler']}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Toplam Tarife Sayısı', value: `${records.length} Liste`, icon: <Tags size={20} />, color: 'text-metronic-primary', bg: 'bg-metronic-primary-light dark:bg-metronic-primary/10' },
          { label: 'Aktif Tarifeler', value: `${activeTariffsCount} Liste`, icon: <CheckCircle2 size={20} />, color: 'text-metronic-success', bg: 'bg-metronic-success-light dark:bg-metronic-success/10' },
          { label: 'Klinik Özel Tarifeler', value: `${clinicTariffsCount} Liste`, icon: <Copy size={20} />, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' },
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
              <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} tarife seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkStatusChange(true)}
                className="h-8 px-3 bg-white border border-metronic-success/30 text-metronic-success text-[12px] font-bold rounded-lg hover:bg-metronic-success hover:text-white transition-all shadow-sm"
              >
                Aktif Yap
              </button>
              <button
                onClick={() => handleBulkStatusChange(false)}
                className="h-8 px-3 bg-white border border-metronic-danger/30 text-metronic-danger text-[12px] font-bold rounded-lg hover:bg-metronic-danger hover:text-white transition-all shadow-sm"
              >
                Pasif Yap
              </button>
              <button
                onClick={handleBulkDelete}
                className="h-8 px-3 bg-white border border-slate-200 text-slate-600 text-[12px] font-bold rounded-lg hover:bg-slate-50 transition-all shadow-sm"
              >
                Sil
              </button>
              <div className="w-px h-5 bg-metronic-primary/20 mx-1" />
              <button onClick={() => setSelectedIds(new Set())} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors shadow-sm">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Tarife Listeleri</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input
                type="text"
                placeholder="Tarife adı ile ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400"
              />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterType !== 'ALL' ? 'bg-metronic-primary-light border-metronic-primary/30 text-metronic-primary' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary'}`}>
                <Filter size={15} /> Filtrele <ChevronDown size={13} className="opacity-50" />
              </button>
            }>
              <FilterItem icon={<Tags size={14} />} label="Tümü" active={filterType === 'ALL'} onClick={() => setFilterType('ALL')} />
              <FilterItem icon={<Tags size={14} />} label="Sistem Tarifeleri" active={filterType === 'SİSTEM'} onClick={() => setFilterType('SİSTEM')} />
              <FilterItem icon={<Copy size={14} />} label="Klinik Tarifeleri" active={filterType === 'KLİNİK'} onClick={() => setFilterType('KLİNİK')} />
            </Dropdown>
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="opacity-50" />
              </button>
            }>
              <DropdownItem icon={<FileText size={14} className="text-green-600" />} label="CSV Olarak İndir" onClick={exportCSV} />
            </Dropdown>
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm">
              <Plus size={16} /> Yeni Tarife Oluştur
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer"
                  />
                </th>
                <SortableHeader label="Tarife Kodu & Adı" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Tür" column="type" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Geçerlilik" column="validity" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-center">İşlem Sayısı</th>
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Yükleniyor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Eşleşen kayıt bulunamadı.</td></tr>
              ) : paginated.map(r => {
                const isSelected = selectedIds.has(r.id);
                const typeInfo = TYPE_MAP[r.type] ?? TYPE_MAP['SİSTEM'];
                const statusInfo = STATUS_MAP[r.status] ?? STATUS_MAP['PASİF'];
                return (
                  <tr key={r.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                    <td className="py-3 pl-6 pr-3">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-slate-800 dark:text-slate-100 font-bold text-[13px]">{r.name}</span>
                        <span className="text-slate-400 text-[11px] font-semibold mt-0.5 font-mono">{r.id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${typeInfo.cls}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-600 dark:text-slate-300 font-medium text-[12px] flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" /> {r.validity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">{r.treatmentCount}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold ${statusInfo.cls}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-3 pl-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Dropdown align="right" trigger={
                          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10 shadow-sm">
                            <Settings size={18} />
                          </button>
                        }>
                          <DropdownItem icon={<Edit2 size={14} className="text-metronic-primary" />} label="Fiyatları Düzenle" onClick={() => { setSelectedTariff(r); setTreatmentsModalOpen(true); }} />
                          <DropdownItem icon={<Percent size={14} />} label="Toplu Zam / İndirim Uygula" onClick={() => { setSelectedTariff(r); setTreatmentsModalOpen(true); }} />
                          <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                          <DropdownItem icon={<Copy size={14} />} label="Tarifeyi Kopyala" />
                          <DropdownItem icon={<Download size={14} />} label="Excel Olarak İndir" />
                          {r.type === 'KLİNİK' && (
                            <>
                              <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                              <DropdownItem icon={<XCircle size={14} />} danger label="Tarifeyi Sil" onClick={() => handleDeleteTariff(r)} />
                            </>
                          )}
                        </Dropdown>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-xl">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400 text-[13px]">Sayfa başı:</span>
            <select value={pageLimit} onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }} className="h-8 px-2 text-[13px] border border-slate-200 dark:border-white/10 rounded-md bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 outline-none focus:border-metronic-primary">
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">
              {sortedData.length === 0 ? '0' : `${(currentPage - 1) * pageLimit + 1}–${Math.min(currentPage * pageLimit, sortedData.length)}`} / <span className="font-bold text-slate-700 dark:text-slate-200">{sortedData.length}</span> kayıt
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const p = start + i;
              if (p > totalPages) return null;
              return (
                <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${p === currentPage ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>

      {/* NEW TARIFF MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Yeni Tarife Oluştur"
        subtitle="Mevcut bir sistem tarifesini kopyalayarak klinik özel tarifenizi yaratın."
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button form="tariff-form" type="submit" disabled={formLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70">
              <Save size={15} />{formLoading ? 'Oluşturuluyor...' : 'Tarifeyi Oluştur'}
            </button>
          </>
        }
      >
        <form id="tariff-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tarife Adı <span className="text-metronic-danger">*</span></label>
            <input required type="text" placeholder="Örn: 2026 Klinik Özel Fiyat Listesi" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="m-input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kopyalanacak Kaynak Tarife <span className="text-metronic-danger">*</span></label>
            <select required value={formData.sourceTariff} onChange={e => setFormData({ ...formData, sourceTariff: e.target.value })} className="m-input">
              <option value="">Seçiniz...</option>
              {records.map(r => <option key={r.id} value={r.id}>{r.name} ({r.treatmentCount} İşlem)</option>)}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Seçilen tarifedeki tüm SUT kodları ve işlemler bu yeni listeye aktarılacaktır.</p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Geçerlilik Başlangıcı</label>
              <input type="date" value={formData.validFrom} onChange={e => setFormData({ ...formData, validFrom: e.target.value })} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Bitiş (Opsiyonel)</label>
              <input type="date" value={formData.validTo} onChange={e => setFormData({ ...formData, validTo: e.target.value })} className="m-input" />
            </div>
          </div>
        </form>
      </Modal>

      {/* TREATMENTS MANAGEMENT MODAL */}
      <Modal
        isOpen={treatmentsModalOpen}
        onClose={() => setTreatmentsModalOpen(false)}
        title={selectedTariff ? `İşlem Fiyatlarını Düzenle - ${selectedTariff.name}` : 'İşlem Fiyatlarını Düzenle'}
        size="xl"
      >
        <div className="bg-white dark:bg-[#1c1f2e] rounded-xl overflow-hidden">
          <TreatmentsView embedded onBack={() => setTreatmentsModalOpen(false)} />
        </div>
      </Modal>

      {/* CONFIRM MODAL */}
      <Modal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        title="Onay Gerekiyor"
        size="sm"
        footer={
          <>
            <button onClick={() => setConfirmState(null)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button onClick={handleConfirm} disabled={confirmLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-danger text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-70">
              {confirmLoading ? 'İşleniyor...' : 'Evet, Sil'}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-4 py-2">
          <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-metronic-danger" />
          </div>
          <p className="text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed">{confirmState?.message}</p>
        </div>
      </Modal>
    </MetronicLayout>
  );
}
