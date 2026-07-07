'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronLeft, ChevronRight, Edit2, Check, X, Loader2,
  Search, Filter, Download, FileText, FileSpreadsheet, ArrowUp, ArrowDown,
  CheckSquare,
} from 'lucide-react';
import Dropdown from '../../../../components/ui/Dropdown';
import { TreatmentService } from '../../../../lib/services/treatment.service';
import { DoctorService, Doctor } from '../../../../lib/services/doctor.service';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  WAITING:     { label: 'Bekliyor',     cls: 'bg-slate-100 text-slate-500' },
  IN_PROGRESS: { label: 'Devam Ediyor', cls: 'bg-metronic-warning-light text-metronic-warning' },
  COMPLETED:   { label: 'Tamamlandı',   cls: 'bg-metronic-success-light text-metronic-success' },
  CANCELLED:   { label: 'İptal',        cls: 'bg-metronic-danger-light text-metronic-danger' },
};

function DropdownItem({ icon, label, active, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left
        ${active ? 'bg-metronic-primary/5 text-metronic-primary font-bold' : 'text-slate-700 hover:bg-slate-50 hover:text-metronic-primary'}`}>
      {icon}{label}
      {active && <Check size={12} className="ml-auto text-metronic-primary" />}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: {
  label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void;
}) {
  const isActive = sortColumn === column;
  return (
    <th onClick={() => onSort(column)}
      className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors">
      <div className="flex items-center gap-1.5">
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={12} className="text-metronic-primary" /> : <ArrowDown size={12} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100];

export default function TreatmentsTab({ patient }: { patient: any }) {
  const [treatments, setTreatments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkData, setBulkData] = useState({ status: '', doctorId: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);

  const fetchTreatments = async () => {
    try {
      setLoading(true);
      const [plans, fetchedDoctors] = await Promise.all([
        TreatmentService.findPlansByPatient(patient.id),
        DoctorService.findAll(),
      ]);
      setDoctors(fetchedDoctors.filter((d: Doctor) => d.isDoctor));
      const items = plans
        .filter((plan: any) => plan.status === 'ACTIVE')
        .flatMap((plan: any) =>
          (plan.items || []).map((item: any) => ({
            id: item.id,
            tooth: item.toothNo ? String(item.toothNo) : '',
            category: item.tariff?.masterTreatment?.category || 'Teşhis ve Planlama',
            name: item.tariff?.masterTreatment?.name || 'Bilinmeyen Tedavi',
            doctor: item.doctorId,
            status: item.status,
          }))
        );
      setTreatments(items);
    } catch (err) {
      console.error('Failed to fetch treatments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!patient?.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern (fetchTreatments performs async network calls before setting state)
    fetchTreatments();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTreatments is recreated every render; including it would re-trigger the fetch on every render and cause an infinite loop
  }, [patient]);

  // Arama/filtre/sayfa boyutu değiştiğinde sayfayı 1'e sıfırla (async iş yok, render sırasında ayarlanır).
  const [prevPagingKey, setPrevPagingKey] = useState({ searchTerm, filterStatus, filterCategory, pageLimit });
  if (
    searchTerm !== prevPagingKey.searchTerm ||
    filterStatus !== prevPagingKey.filterStatus ||
    filterCategory !== prevPagingKey.filterCategory ||
    pageLimit !== prevPagingKey.pageLimit
  ) {
    setPrevPagingKey({ searchTerm, filterStatus, filterCategory, pageLimit });
    setCurrentPage(1);
  }

  const getDoctorName = (doctorId: string) => {
    const doc = doctors.find(d => d.id === doctorId);
    return doc ? `Dt. ${doc.firstName} ${doc.lastName}` : 'Hekim Belirtilmemiş';
  };

  const categories = Array.from(new Set(treatments.map(t => t.category))).filter(Boolean);

  const filtered = treatments.filter(t => {
    const matchSearch = !searchTerm || [t.tooth, t.name, t.category, getDoctorName(t.doctor)]
      .join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchCategory = !filterCategory || t.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn] ?? '';
    const bVal = b[sortColumn] ?? '';
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));
  const paginated = sorted.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const allSelected = paginated.length > 0 && paginated.every(t => selectedIds.includes(t.id));
  const someSelected = paginated.some(t => selectedIds.includes(t.id)) && !allSelected;
  const toggleAll = () => setSelectedIds(allSelected ? [] : paginated.map(t => t.id));
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selectedCount = selectedIds.length;

  const startBulkEditing = () => {
    const sel = treatments.filter(t => selectedIds.includes(t.id));
    const distinct = new Set(sel.map(t => t.doctor || ''));
    setBulkData({ status: '', doctorId: distinct.size === 1 ? sel[0].doctor || '' : '' });
    setIsBulkEditing(true);
  };

  const handleBulkUpdate = async () => {
    if (!bulkData.status && !bulkData.doctorId) return;
    try {
      setLoading(true);
      const tasks: Promise<any>[] = [];
      if (bulkData.status) tasks.push(...selectedIds.map(id => TreatmentService.updateItemStatus(id, bulkData.status)));
      if (bulkData.doctorId) {
        const eligible = treatments.filter(t => selectedIds.includes(t.id) && t.status !== 'COMPLETED').map(t => t.id);
        tasks.push(...eligible.map(id => TreatmentService.updateItemDoctor(id, bulkData.doctorId)));
      }
      await Promise.all(tasks);
      await fetchTreatments();
      setIsBulkEditing(false);
      setSelectedIds([]);
      setBulkData({ status: '', doctorId: '' });
    } catch (err) {
      console.error('Failed to bulk update:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Diş No', 'Kategori', 'Tedavi Adı', 'Hekim', 'Durum'],
      ...sorted.map(t => [t.tooth || '—', t.category, t.name, getDoctorName(t.doctor), STATUS_META[t.status]?.label || t.status]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tedaviler_${new Date().toLocaleDateString('tr-TR')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="animate-spin text-metronic-primary mr-2" size={20} />
        <span className="text-[13px] font-semibold">Tedaviler yükleniyor...</span>
      </div>
    );
  }

  return (
    <div>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div className="m-card shadow-none border border-slate-200/60 overflow-hidden">

        {/* ─── Çoklu seçim bar ─── */}
        {selectedCount > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedCount} tedavi seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              {isBulkEditing ? (
                <>
                  <select className="px-3 py-1.5 text-[12px] font-medium border border-slate-200 rounded-lg bg-white outline-none"
                    value={bulkData.status} onChange={e => setBulkData(p => ({ ...p, status: e.target.value }))}>
                    <option value="">Durum Güncelle...</option>
                    {Object.entries(STATUS_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                  </select>
                  <select className="px-3 py-1.5 text-[12px] font-medium border border-slate-200 rounded-lg bg-white outline-none"
                    value={bulkData.doctorId} onChange={e => setBulkData(p => ({ ...p, doctorId: e.target.value }))}>
                    <option value="">Doktor Güncelle...</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{`Dt. ${d.firstName} ${d.lastName}`}</option>)}
                  </select>
                  <button onClick={handleBulkUpdate} className="flex items-center gap-1.5 px-4 py-1.5 bg-metronic-primary text-white text-[12px] font-bold rounded-lg hover:opacity-90 shadow-sm">
                    <Check size={14} /> Uygula
                  </button>
                  <button onClick={() => { setIsBulkEditing(false); setBulkData({ status: '', doctorId: '' }); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-metronic-danger-light text-metronic-danger text-[12px] font-bold rounded-lg hover:bg-metronic-danger hover:text-white transition-colors">
                    <X size={14} /> İptal
                  </button>
                </>
              ) : (
                <>
                  <button onClick={startBulkEditing} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-metronic-primary/30 text-metronic-primary text-[12px] font-bold rounded-lg hover:bg-metronic-primary hover:text-white transition-all shadow-sm">
                    <Edit2 size={14} /> Düzenle
                  </button>
                  <button onClick={() => setSelectedIds([])} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors">
                    <X size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── Header & Toolbar ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <h4 className="text-[1.05rem] font-bold text-slate-800 tracking-tight m-0">Aktif Tedavi Kalemleri</h4>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200">
              {filtered.length} Kayıt
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="Diş no, tedavi, hekim ara..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 h-9 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 placeholder-slate-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>
              )}
            </div>

            {/* Filter */}
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterStatus || filterCategory ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Filter size={15} /> Filtrele
                {(filterStatus || filterCategory) && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />}
                <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Durum</p>
              </div>
              <DropdownItem label="Tümü" active={!filterStatus} onClick={() => setFilterStatus('')} />
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <DropdownItem key={key} label={meta.label} active={filterStatus === key} onClick={() => setFilterStatus(filterStatus === key ? '' : key)} />
              ))}
              {categories.length > 0 && (
                <>
                  <div className="px-4 py-2 border-t border-b border-slate-100 mt-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kategori</p>
                  </div>
                  {categories.map(cat => (
                    <DropdownItem key={cat} label={cat} active={filterCategory === cat} onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)} />
                  ))}
                </>
              )}
              {(filterStatus || filterCategory) && (
                <div className="border-t border-slate-100 mt-1 px-3 py-2">
                  <button onClick={() => { setFilterStatus(''); setFilterCategory(''); }} className="w-full text-center text-[12px] font-bold text-rose-500 hover:text-rose-700">
                    Filtreleri Temizle
                  </button>
                </div>
              )}
            </Dropdown>

            {/* Export */}
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-[13px] font-medium shadow-sm transition-colors">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p>
              </div>
              <DropdownItem icon={<FileSpreadsheet size={14} className="text-green-600" />} label="Excel (.xlsx)" onClick={exportCSV} />
              <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>
          </div>
        </div>

        {/* ─── Table ─── */}
        <div className="overflow-auto max-h-[480px] relative">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 bg-slate-50">
                <th className="py-4 pl-6 pr-3 w-10">
                  <input type="checkbox" checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer"
                  />
                </th>
                <SortableHeader label="Diş No" column="tooth" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Kategori / Tedavi" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Hekim" column="doctor" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-[13px] font-medium">
                    {searchTerm || filterStatus || filterCategory ? 'Eşleşen tedavi bulunamadı.' : 'Hastaya ait kayıtlı tedavi bulunmamaktadır.'}
                  </td>
                </tr>
              ) : (
                paginated.map(t => {
                  const statusMeta = STATUS_META[t.status] || { label: t.status, cls: 'bg-slate-100 text-slate-500' };
                  const isSelected = selectedIds.includes(t.id);
                  return (
                    <tr key={t.id} className={`transition-colors ${isSelected ? 'bg-metronic-primary-light/10' : 'hover:bg-slate-50'}`}>
                      <td className="py-3 pl-6 pr-3">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(t.id)}
                          className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-[13px] font-mono font-bold text-slate-600">{t.tooth || '—'}</td>
                      <td className="py-3 px-4">
                        <p className="text-[13px] font-bold text-slate-800">{t.name}</p>
                        <p className="text-[11px] text-slate-400">{t.category}</p>
                      </td>
                      <td className="py-3 px-4 text-[13px] text-slate-500 font-medium">{getDoctorName(t.doctor)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${statusMeta.cls}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Footer & Pagination ─── */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <select value={pageLimit} onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-md text-[12px] font-bold text-slate-600 outline-none focus:border-metronic-primary cursor-pointer w-20">
              {PAGE_LIMIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
            <div className="w-px h-4 bg-slate-200" />
            <span className="text-slate-500 text-[13px] font-medium">
              Toplam <span className="font-bold text-slate-700">{filtered.length}</span> kayıttan{' '}
              <span className="font-bold text-slate-700">
                {filtered.length === 0 ? 0 : Math.min((currentPage - 1) * pageLimit + 1, filtered.length)}–{Math.min(currentPage * pageLimit, filtered.length)}
              </span> arası
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${page === currentPage ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {page}
                </button>
              );
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>
    </div>
  );
}
