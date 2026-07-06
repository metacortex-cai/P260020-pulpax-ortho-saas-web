'use client';
import { useState, useEffect, useRef } from 'react';
import { Plus, Printer, X, Trash2, Search, Filter, Download, FileText, ChevronDown, Check, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '../../../../components/ui/Modal';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import Dropdown from '../../../../components/ui/Dropdown';
import { PatientService, PatientPrescription } from '../../../../lib/services/patient.service';
import { useToastStore } from '../../../../store/toastStore';
import Skeleton from '../../../../components/ui/Skeleton';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';



function DropdownItem({ icon, label, active, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'bg-metronic-primary/5 text-metronic-primary font-bold' : 'text-slate-700 hover:bg-slate-50 hover:text-metronic-primary'}`}>
      {icon}{label}{active && <Check size={12} className="ml-auto text-metronic-primary" />}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void }) {
  const isActive = sortColumn === column;
  return (
    <th onClick={() => onSort(column)} className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors">
      <div className="flex items-center gap-1.5">{label}{isActive && (sortDirection === 'asc' ? <ArrowUp size={12} className="text-metronic-primary" /> : <ArrowDown size={12} className="text-metronic-primary" />)}</div>
    </th>
  );
}

export default function PrescriptionsTab({ patient }: { patient: any }) {
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState<PatientPrescription | null>(null);
  const addToast = useToastStore(state => state.addToast);

  // Reçete Form State
  const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [doctorName, setDoctorName] = useState('Dr. Ayşe Kaya');
  const [drugs, setDrugs] = useState([{ name: '', dose: '', freq: '', duration: '', showSuggestions: false }]);

  // Toolbar state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);

  const fetchPrescriptions = async () => {
    if (!patient?.id) return;
    try {
      setLoading(true);
      const data = await PatientService.getPrescriptions(patient.id);
      setPrescriptions(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Reçeteler yüklenirken hata oluştu.';
      addToast({ title: 'Hata', message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!patient?.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern (fetchPrescriptions sets loading state before its async call)
    fetchPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchPrescriptions is recreated every render; including it would re-trigger the fetch on every render and cause an infinite loop
  }, [patient?.id]);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd.MM.yyyy', { locale: tr });
    } catch {
      return dateStr;
    }
  };

  const addDrug = () => setDrugs(d => [...d, { name: '', dose: '', freq: '', duration: '', showSuggestions: false }]);
  const removeDrug = (i: number) => setDrugs(d => d.filter((_, idx) => idx !== i));

  const selectDrug = (index: number, selectedDrug: any) => {
    setDrugs(prev => prev.map((drug, idx) =>
      idx === index ? {
        name: selectedDrug.name,
        dose: selectedDrug.dose,
        freq: selectedDrug.freq,
        duration: selectedDrug.duration,
        showSuggestions: false
      } : drug
    ));
  };

  const handleSubmit = async () => {
    const validDrugs = drugs.filter(d => d.name.trim());
    if (!validDrugs.length) {
      addToast({ title: 'Uyarı', message: 'En az bir ilaç eklemelisiniz.', type: 'error' });
      return;
    }
    try {
      setSubmitting(true);
      const drugStrings = validDrugs.map(d => {
        const parts = [d.name, d.dose, d.freq, d.duration].filter(Boolean);
        return parts.join(' - ');
      });
      const created = await PatientService.createPrescription(patient.id, {
        date: prescriptionDate,
        doctor: doctorName,
        drugs: drugStrings,
      });
      setPrescriptions(prev => [created, ...prev]);
      setModal(false);
      setDrugs([{ name: '', dose: '', freq: '', duration: '', showSuggestions: false }]);
      setPrescriptionDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Reçete kaydedilirken hata oluştu.';
      addToast({ title: 'Hata', message: msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginated.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    try {
      setBulkDeleting(true);
      await Promise.all(selectedIds.map(id => PatientService.deletePrescription(id)));
      setPrescriptions(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Silme işlemi sırasında hata oluştu.';
      addToast({ title: 'Hata', message: msg, type: 'error' });
    } finally {
      setBulkDeleting(false);
      setBulkDeleteConfirmOpen(false);
    }
  };

  // Filtering + sorting logic
  const doctors = Array.from(new Set(prescriptions.map(p => p.doctor)));

  const filtered = prescriptions.filter(p => {
    const matchSearch = !searchTerm || [p.protocolNo, p.date, p.doctor, p.drugs.join(' ')]
      .join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchDoctor = !filterDoctor || p.doctor === filterDoctor;
    return matchSearch && matchDoctor;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = (a as any)[sortColumn] ?? '';
    const bVal = (b as any)[sortColumn] ?? '';
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Arama/filtre/sayfa boyutu değiştiğinde sayfayı 1'e sıfırla (async iş yok, render sırasında ayarlanır).
  const [prevPagingKey, setPrevPagingKey] = useState({ searchTerm, filterDoctor, pageLimit });
  if (searchTerm !== prevPagingKey.searchTerm || filterDoctor !== prevPagingKey.filterDoctor || pageLimit !== prevPagingKey.pageLimit) {
    setPrevPagingKey({ searchTerm, filterDoctor, pageLimit });
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));
  const paginated = sorted.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);
  const allSelected = paginated.length > 0 && paginated.every(p => selectedIds.includes(p.id));

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const rows = [
      ['Protokol No', 'Tarih', 'Hekim', 'İlaçlar'],
      ...sorted.map(p => [p.protocolNo, p.date, p.doctor, p.drugs.join('; ')]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'receteler.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toplu İşlem Çubuğu */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-metronic-primary-light/30 border border-metronic-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.length} reçete seçildi</span>
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

      <div className="m-card shadow-none border border-slate-200/60 mb-0 overflow-hidden">
        {/* Standard Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <h4 className="text-[1.05rem] font-bold text-slate-800 tracking-tight m-0">Reçeteler</h4>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="Protokol no, hekim, ilaç ara..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 h-9 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            {/* Filter */}
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterDoctor ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Filter size={15} /> Filtrele {filterDoctor && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hekim</p></div>
              <DropdownItem label="Tümü" active={!filterDoctor} onClick={() => setFilterDoctor('')} />
              {doctors.map(d => <DropdownItem key={d} label={d} active={filterDoctor === d} onClick={() => setFilterDoctor(filterDoctor === d ? '' : d)} />)}
              {filterDoctor && <div className="border-t border-slate-100 mt-1 px-3 py-2"><button onClick={() => setFilterDoctor('')} className="w-full text-center text-[12px] font-bold text-rose-500">Filtreyi Temizle</button></div>}
            </Dropdown>
            {/* Export */}
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p></div>
              <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>
            {/* New Prescription button */}
            <button
              onClick={() => { setDrugs([{ name: '', dose: '', freq: '', duration: '', showSuggestions: false }]); setPrescriptionDate(new Date().toISOString().split('T')[0]); setModal(true); }}
              className="flex items-center gap-1.5 h-9 px-3 bg-metronic-primary text-white rounded-lg text-[13px] font-bold hover:bg-blue-600 transition-colors"
            >
              <Plus size={14} /> Yeni Reçete
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                  />
                </th>
                <SortableHeader label="Protokol No" column="protocolNo" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Tarih" column="date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Hekim" column="doctor" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">İlaçlar</th>
                <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td className="py-3 px-6"><Skeleton className="w-4 h-4" /></td>
                    <td className="py-3 px-4"><Skeleton className="w-28 h-4" /></td>
                    <td className="py-3 px-4"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-3 px-4"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-3 px-4"><Skeleton className="w-40 h-4" /></td>
                    <td className="py-3 px-6"><Skeleton className="w-14 h-6 ml-auto" /></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-[13px]">Henüz reçete yazılmamış.</td>
                </tr>
              ) : (
                paginated.map(rx => {
                  const isSelected = selectedIds.includes(rx.id);
                  return (
                    <tr key={rx.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-metronic-primary-light/10' : ''}`}>
                      <td className="py-3 px-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(rx.id)}
                          className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-[13px] font-mono font-bold text-metronic-primary">{rx.protocolNo}</td>
                      <td className="py-3 px-4 text-[13px] font-bold text-slate-700">{formatDate(rx.date)}</td>
                      <td className="py-3 px-4 text-[13px] text-slate-500 font-medium">{rx.doctor}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          {rx.drugs.map((d, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded flex items-center gap-1.5 border border-slate-200/60">
                              <span className="w-1 h-1 rounded-full bg-metronic-primary" /> {d}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          onClick={() => setViewModal(rx)}
                          className="px-3 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg hover:bg-metronic-primary hover:text-white transition-colors"
                        >
                          Detay
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <select value={pageLimit} onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-md text-[12px] font-bold text-slate-600 outline-none cursor-pointer w-20">
              {[10, 25, 50, 100].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
            <div className="w-px h-4 bg-slate-200" />
            <span className="text-slate-500 text-[13px] font-medium">
              Toplam <span className="font-bold text-slate-700">{filtered.length}</span> kayıttan <span className="font-bold text-slate-700">{filtered.length === 0 ? 0 : Math.min((currentPage - 1) * pageLimit + 1, filtered.length)}–{Math.min(currentPage * pageLimit, filtered.length)}</span> arası
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
      </div>

      {/* Detay Modalı */}
      <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} title="Reçete Detayı" size="md"
        footer={<button onClick={() => setViewModal(null)} className="px-5 py-2 text-[13px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Kapat</button>}>
        {viewModal && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Protokol No</p>
                <p className="text-[13px] font-bold text-metronic-primary">{viewModal.protocolNo}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tarih</p>
                <p className="text-[13px] font-bold text-slate-700">{formatDate(viewModal.date)}</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Yazan Hekim</p>
              <p className="text-[13px] font-medium text-slate-600">{viewModal.doctor}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">İlaç Listesi</p>
              <ul className="space-y-3">
                {viewModal.drugs.map((d: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-metronic-primary-light flex items-center justify-center text-metronic-primary">
                      <Plus size={16} />
                    </div>
                    <span className="text-[13px] font-bold text-slate-700">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Yeni Reçete Modalı */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Yeni Reçete" size="xl"
        footer={
          <>
            <button onClick={() => setModal(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg">İptal</button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg disabled:opacity-60"
            >
              <Printer size={14} /> {submitting ? 'Kaydediliyor...' : 'Kaydet & Yazdır'}
            </button>
          </>
        }>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reçete Tarihi <span className="text-metronic-danger">*</span></label>
              <input type="date" className="m-input" value={prescriptionDate} onChange={e => setPrescriptionDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hekim Adı <span className="text-metronic-danger">*</span></label>
              <input type="text" className="m-input" value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. Adı Soyadı" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">İlaç Listesi</p>
              <button onClick={addDrug} className="flex items-center gap-1 text-[12px] font-bold text-metronic-primary hover:underline"><Plus size={13} />İlaç Ekle</button>
            </div>

            {drugs.map((d, i) => {
              const suggestions: any[] = [];

              return (
                <div key={i} className="grid grid-cols-[2fr_1fr_2fr_1fr_auto] gap-2 items-start p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {/* İlaç Adı ve Searchable Dropdown */}
                  <div className="relative">
                    <input
                      className="m-input text-[12px] w-full"
                      placeholder="İlaç Adı Ara..."
                      value={d.name}
                      onChange={e => setDrugs(prev => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value, showSuggestions: true } : x))}
                      onFocus={() => setDrugs(prev => prev.map((x, idx) => idx === i ? { ...x, showSuggestions: true } : x))}
                      onBlur={() => setTimeout(() => setDrugs(prev => prev.map((x, idx) => idx === i ? { ...x, showSuggestions: false } : x)), 200)}
                    />
                    {d.showSuggestions && d.name && suggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {suggestions.map((guideDrug, sIdx) => (
                          <div
                            key={sIdx}
                            onClick={() => selectDrug(i, guideDrug)}
                            className="p-2.5 text-[12px] cursor-pointer hover:bg-slate-100 border-b border-slate-50 last:border-0"
                          >
                            <span className="font-bold text-slate-700 block">{guideDrug.name}</span>
                            <span className="text-[10px] text-slate-500">{guideDrug.dose} - {guideDrug.duration}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <input className="m-input text-[12px] w-full" placeholder="Doz" value={d.dose} onChange={e => setDrugs(prev => prev.map((x, idx) => idx === i ? { ...x, dose: e.target.value } : x))} />
                  <input className="m-input text-[12px] w-full" placeholder="Kullanım" value={d.freq} onChange={e => setDrugs(prev => prev.map((x, idx) => idx === i ? { ...x, freq: e.target.value } : x))} />
                  <input className="m-input text-[12px] w-full" placeholder="Süre" value={d.duration} onChange={e => setDrugs(prev => prev.map((x, idx) => idx === i ? { ...x, duration: e.target.value } : x))} />

                  <button onClick={() => removeDrug(i)} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-metronic-danger-light hover:text-metronic-danger transition-colors mt-0.5"><X size={14} /></button>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
        title="Reçeteleri Sil"
        message={`${selectedIds.length} reçeteyi silmek istediğinize emin misiniz?`}
      />
    </div>
  );
}
