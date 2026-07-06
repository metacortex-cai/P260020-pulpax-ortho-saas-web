'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, X, Filter, Download, FileText, ChevronDown, Check } from 'lucide-react';
import Modal from '../../../../components/ui/Modal';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import Dropdown from '../../../../components/ui/Dropdown';
import api from '../../../../lib/api';


function DropdownItem({ icon, label, active, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'bg-metronic-primary/5 text-metronic-primary font-bold' : 'text-slate-700 hover:bg-slate-50 hover:text-metronic-primary'}`}>
      {icon}{label}{active && <Check size={12} className="ml-auto text-metronic-primary" />}
    </button>
  );
}

interface ImplantRecord {
  id: string;
  toothNo: string;
  brand: string;
  implantDate: string;
  implantLotNo: string;
  implantSerialNo: string;
  abutmentDate: string | null;
  abutmentLotNo: string | null;
  abutmentSerialNo: string | null;
  status: 'BASARILI' | 'BASARISIZ';
}

const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100];

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void; }) {
  const isActive = sortColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors select-none"
    >
      <div className="flex items-center gap-1.5">
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={12} className="text-metronic-primary" /> : <ArrowDown size={12} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

export default function ImplantsTab({ patient }: { patient: any }) {
  const [implants, setImplants] = useState<ImplantRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Arama, filtre, sıralama, sayfalama
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);

  // Marka listesi ve inline ekleme state'leri
  const [availableBrands, setAvailableBrands] = useState<string[]>(['Straumann', 'Osstem', 'Nobel Biocare', 'Medentika', 'Bego', 'Zimmer']);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  const [form, setForm] = useState({
    toothNo: '',
    brand: '',
    implantDate: new Date().toISOString().split('T')[0],
    implantLotNo: '',
    implantSerialNo: '',
    abutmentDate: '',
    abutmentLotNo: '',
    abutmentSerialNo: '',
    status: 'BASARILI' as 'BASARILI' | 'BASARISIZ'
  });

  const fetchImplants = useCallback(async () => {
    if (!patient?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/patients/${patient.id}/implants`);
      if (res.data && Array.isArray(res.data)) {
        setImplants(res.data.map((imp: any) => ({
          ...imp,
          implantDate: imp.implantDate ? imp.implantDate.split('T')[0] : '',
          abutmentDate: imp.abutmentDate ? imp.abutmentDate.split('T')[0] : null,
        })));
      }
    } catch (e) {
      console.warn('İmplant verileri alınamadı', e);
      setImplants([]);
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/patient-change pattern
    fetchImplants();
  }, [patient?.id, fetchImplants]);

  const exportCSV = () => {
    const rows = [
      ['Diş No', 'Marka', 'İmp. Tarih', 'İmp. Lot No', 'İmp. Seri No', 'Abut. Tarih', 'Abut. Lot No', 'Abut. Seri No', 'Durum'],
      ...sortedImplants.map(imp => [
        imp.toothNo, imp.brand, imp.implantDate, imp.implantLotNo || '-', imp.implantSerialNo || '-',
        imp.abutmentDate || '-', imp.abutmentLotNo || '-', imp.abutmentSerialNo || '-',
        imp.status === 'BASARISIZ' ? 'Başarısız' : 'Başarılı',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'implantlar.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Arama + filtre
  const filtered = implants.filter(imp => {
    const matchSearch = [imp.toothNo, imp.brand, imp.implantLotNo, imp.implantSerialNo, imp.abutmentLotNo, imp.abutmentSerialNo]
      .join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchBrand = !filterBrand || imp.brand === filterBrand;
    const matchStatus = !filterStatus || imp.status === filterStatus;
    return matchSearch && matchBrand && matchStatus;
  });

  // Sıralama
  const sortedImplants = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = (a as any)[sortColumn] ?? '';
    const bVal = (b as any)[sortColumn] ?? '';
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Arama/filtre/sayfa boyutu değiştiğinde sayfayı sıfırla (render sırasında, efekt olmadan —
  // böylece bir önceki filtrenin sayfası için hesaplanmış "paginated" hiç ekrana yansımaz).
  const filterKey = `${searchTerm}|${filterBrand}|${filterStatus}|${pageLimit}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  // Sayfalama
  const totalPages = Math.max(1, Math.ceil(sortedImplants.length / pageLimit));
  const paginated = sortedImplants.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const allSelected = paginated.length > 0 && paginated.every(i => selectedIds.includes(i.id));
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : paginated.map(i => i.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    try {
      setBulkDeleting(true);
      await Promise.all(
        selectedIds.map(id => api.delete(`/patients/implants/${id}`))
      );
      setSelectedIds([]);
      await fetchImplants();
    } catch (e) {
      console.error('Silme işlemi başarısız', e);
      alert('Silme işlemi sırasında bir hata oluştu.');
    } finally {
      setBulkDeleting(false);
      setBulkDeleteConfirmOpen(false);
    }
  };

  const handleEdit = (implant: ImplantRecord) => {
    setForm({
      toothNo: implant.toothNo,
      brand: implant.brand,
      implantDate: implant.implantDate,
      implantLotNo: implant.implantLotNo,
      implantSerialNo: implant.implantSerialNo,
      abutmentDate: implant.abutmentDate || '',
      abutmentLotNo: implant.abutmentLotNo || '',
      abutmentSerialNo: implant.abutmentSerialNo || '',
      status: implant.status || 'BASARILI'
    });
    setEditingId(implant.id);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setForm({
      toothNo: '',
      brand: '',
      implantDate: new Date().toISOString().split('T')[0],
      implantLotNo: '',
      implantSerialNo: '',
      abutmentDate: '',
      abutmentLotNo: '',
      abutmentSerialNo: '',
      status: 'BASARILI'
    });
    setEditingId(null);
    setIsAddingBrand(false);
    setNewBrandName('');
    setModalOpen(true);
  };

  const handleSaveNewBrand = () => {
    const brand = newBrandName.trim();
    if (brand) {
      if (!availableBrands.includes(brand)) {
        setAvailableBrands(prev => [...prev, brand]);
      }
      setForm(prev => ({ ...prev, brand }));
    }
    setIsAddingBrand(false);
    setNewBrandName('');
  };

  const handleSave = async () => {
    try {
      const payload = {
        toothNo: form.toothNo,
        brand: form.brand,
        implantDate: form.implantDate,
        implantLotNo: form.implantLotNo || '',
        implantSerialNo: form.implantSerialNo || '',
        abutmentDate: form.abutmentDate || undefined,
        abutmentLotNo: form.abutmentLotNo || undefined,
        abutmentSerialNo: form.abutmentSerialNo || undefined,
        status: form.status,
      };

      if (editingId) {
        await api.put(`/patients/implants/${editingId}`, payload);
      } else {
        await api.post(`/patients/${patient.id}/implants`, payload);
      }

      setModalOpen(false);
      await fetchImplants();
    } catch (e) {
      console.error('Kaydetme işlemi başarısız', e);
      alert('Kaydetme işlemi sırasında bir hata oluştu.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toplu İşlem Çubuğu */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-metronic-primary-light/30 border border-metronic-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.length} implant seçildi</span>
            <div className="h-4 w-px bg-metronic-primary/20" />

            <button
              onClick={() => setBulkDeleteConfirmOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-metronic-danger text-white text-[12px] font-bold rounded-lg hover:opacity-90 transition-all shadow-sm"
            >
              <Trash2 size={14} /> Seçilenleri Sil
            </button>
          </div>

          <button onClick={() => setSelectedIds([])} className="text-[12px] font-bold text-slate-400 hover:text-slate-600">Seçimi Temizle</button>
        </div>
      )}

      {/* İmplant Listesi */}
      <div className="m-card shadow-none border border-slate-200/60 mb-0 overflow-hidden">
        <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <h4 className="text-[1.05rem] font-bold text-slate-800 tracking-tight m-0">İmplant Kayıtları</h4>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="Diş no, marka, lot/seri no ara..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 h-9 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterBrand || filterStatus ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Filter size={15} /> Filtrele {(filterBrand || filterStatus) && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Marka</p></div>
              <DropdownItem label="Tüm Markalar" active={!filterBrand} onClick={() => setFilterBrand('')} />
              {availableBrands.filter(b => implants.some(i => i.brand === b)).map(b => (
                <DropdownItem key={b} label={b} active={filterBrand === b} onClick={() => setFilterBrand(filterBrand === b ? '' : b)} />
              ))}
              <div className="px-4 py-2 border-t border-b border-slate-100 mt-1"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Durum</p></div>
              <DropdownItem label="Tüm Durumlar" active={!filterStatus} onClick={() => setFilterStatus('')} />
              <DropdownItem label="Başarılı" active={filterStatus === 'BASARILI'} onClick={() => setFilterStatus(filterStatus === 'BASARILI' ? '' : 'BASARILI')} />
              <DropdownItem label="Başarısız" active={filterStatus === 'BASARISIZ'} onClick={() => setFilterStatus(filterStatus === 'BASARISIZ' ? '' : 'BASARISIZ')} />
              {(filterBrand || filterStatus) && <div className="border-t border-slate-100 mt-1 px-3 py-2"><button onClick={() => { setFilterBrand(''); setFilterStatus(''); }} className="w-full text-center text-[12px] font-bold text-rose-500">Filtreleri Temizle</button></div>}
            </Dropdown>
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p></div>
              <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>
            <button onClick={handleAddNew}
              className="flex items-center gap-1.5 h-9 px-3 bg-metronic-primary text-white rounded-lg text-[13px] font-bold hover:bg-blue-600 transition-colors whitespace-nowrap">
              <Plus size={14} /> Yeni İmplant
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-[420px] relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-6 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                  />
                </th>
                <SortableHeader label="Diş No" column="toothNo" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Marka" column="brand" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="İmp. Tarih" column="implantDate" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="İmp. Lot No" column="implantLotNo" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="İmp. Seri No" column="implantSerialNo" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Abut. Tarih" column="abutmentDate" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Abut. Lot No" column="abutmentLotNo" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Abut. Seri No" column="abutmentSerialNo" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-3 px-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(11)].map((_, j) => (
                      <td key={j} className="py-4 px-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : implants.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 text-[13px]">Henüz implant kaydı bulunmuyor.</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 text-[13px]">Eşleşen kayıt bulunamadı.</td>
                </tr>
              ) : (
                paginated.map(imp => {
                  const isSelected = selectedIds.includes(imp.id);
                  return (
                    <tr key={imp.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-metronic-primary-light/10' : ''}`}>
                      <td className="py-3 px-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(imp.id)}
                          className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-[13px] font-bold text-slate-700">{imp.toothNo}</td>
                      <td className="py-3 px-4 text-[13px] font-semibold text-slate-600">{imp.brand}</td>
                      <td className="py-3 px-4 text-[12px] text-slate-600">{imp.implantDate}</td>
                      <td className="py-3 px-4 text-[12px] text-slate-600">{imp.implantLotNo || '-'}</td>
                      <td className="py-3 px-4 text-[12px] text-slate-600">{imp.implantSerialNo || '-'}</td>
                      <td className="py-3 px-4 text-[12px] text-slate-600">{imp.abutmentDate || '-'}</td>
                      <td className="py-3 px-4 text-[12px] text-slate-600">{imp.abutmentLotNo || '-'}</td>
                      <td className="py-3 px-4 text-[12px] text-slate-600">{imp.abutmentSerialNo || '-'}</td>
                      <td className="py-3 px-4">
                        {imp.status === 'BASARISIZ' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full border border-red-200 whitespace-nowrap">Başarısız</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 whitespace-nowrap">Başarılı</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleEdit(imp)} className="text-metronic-primary hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-colors">
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        {!loading && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 gap-4">
            <div className="flex items-center gap-3">
              <select value={pageLimit} onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
                className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-md text-[12px] font-bold text-slate-600 outline-none cursor-pointer w-20">
                {PAGE_LIMIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
              <div className="w-px h-4 bg-slate-200" />
              <span className="text-slate-500 text-[13px] font-medium">
                Toplam <span className="font-bold text-slate-700">{sortedImplants.length}</span> kayıttan{' '}
                <span className="font-bold text-slate-700">{sortedImplants.length === 0 ? 0 : Math.min((currentPage - 1) * pageLimit + 1, sortedImplants.length)}–{Math.min(currentPage * pageLimit, sortedImplants.length)}</span> arası
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">«</button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                return <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${page === currentPage ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>{page}</button>;
              })}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">»</button>
            </div>
          </div>
        )}
      </div>

      {/* İmplant CRUD Modalı */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editingId ? "İmplant Düzenle" : "Yeni İmplant Ekle"}
        subtitle="İmplant ve abutment barkod/lot bilgilerini giriniz." size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              İptal
            </button>
            <button onClick={handleSave}
              className="px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600">
              {editingId ? "Güncelle" : "Kaydet"}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Diş No <span className="text-metronic-danger">*</span></label>
              <input type="text" className="m-input" placeholder="Örn: 14, 15"
                value={form.toothNo} onChange={e => setForm(p => ({ ...p, toothNo: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Marka <span className="text-metronic-danger">*</span></label>
              <div className="flex gap-2">
                {isAddingBrand ? (
                  <>
                    <input
                      type="text"
                      className="m-input flex-1"
                      autoFocus
                      placeholder="Yeni marka yazın..."
                      value={newBrandName}
                      onChange={e => setNewBrandName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveNewBrand()}
                    />
                    <button type="button" onClick={handleSaveNewBrand} className="px-3 bg-metronic-success text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors">Ekle</button>
                    <button type="button" onClick={() => setIsAddingBrand(false)} className="px-3 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">İptal</button>
                  </>
                ) : (
                  <>
                    <select
                      className="m-input flex-1"
                      value={form.brand}
                      onChange={e => setForm(p => ({ ...p, brand: e.target.value }))}
                    >
                      <option value="">Seçiniz...</option>
                      {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setIsAddingBrand(true); setNewBrandName(''); }}
                      className="w-10 flex-shrink-0 flex items-center justify-center bg-metronic-primary text-white hover:bg-blue-600 rounded-lg shadow-sm transition-all active:scale-95"
                      title="Yeni Marka Ekle"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
            <h5 className="text-[13px] font-bold text-slate-700">İmplant Bilgileri</h5>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tarih <span className="text-metronic-danger">*</span></label>
                <input type="date" className="m-input" value={form.implantDate}
                  onChange={e => setForm(p => ({ ...p, implantDate: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lot No</label>
                <input type="text" className="m-input" value={form.implantLotNo}
                  onChange={e => setForm(p => ({ ...p, implantLotNo: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Seri No</label>
                <input type="text" className="m-input" value={form.implantSerialNo}
                  onChange={e => setForm(p => ({ ...p, implantSerialNo: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
            <h5 className="text-[13px] font-bold text-slate-700">Abutment Bilgileri <span className="text-[11px] text-slate-400 font-normal">(İsteğe bağlı)</span></h5>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tarih</label>
                <input type="date" className="m-input" value={form.abutmentDate}
                  onChange={e => setForm(p => ({ ...p, abutmentDate: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lot No</label>
                <input type="text" className="m-input" value={form.abutmentLotNo}
                  onChange={e => setForm(p => ({ ...p, abutmentLotNo: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Seri No</label>
                <input type="text" className="m-input" value={form.abutmentSerialNo}
                  onChange={e => setForm(p => ({ ...p, abutmentSerialNo: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Durum <span className="text-metronic-danger">*</span></label>
            <select
              className="m-input"
              value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value as 'BASARILI' | 'BASARISIZ' }))}
            >
              <option value="BASARILI">Başarılı</option>
              <option value="BASARISIZ">Başarısız</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
        title="İmplant Kayıtlarını Sil"
        message={`${selectedIds.length} implant kaydını silmek istediğinize emin misiniz?`}
      />
    </div>
  );
}
