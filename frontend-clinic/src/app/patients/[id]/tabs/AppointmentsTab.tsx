'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, AlertCircle, Search, X, Trash2, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Filter, Download, FileText, ChevronDown, Check } from 'lucide-react';
import Dropdown from '../../../../components/ui/Dropdown';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import AppointmentModal from '../../../../components/calendar/AppointmentModal';
import { Appointment as CalendarAppointment } from '../../../../components/calendar/AppointmentBlock';
import { AppointmentService, AppointmentWithPatient, AppointmentConflictInfo } from '../../../../lib/services/appointment.service';
import { DoctorService } from '../../../../lib/services/doctor.service';
import { ClinicBranchService, ClinicBranch } from '../../../../lib/services/clinic-branch.service';
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

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PLANNED:    { label: 'Planlandı',    cls: 'bg-amber-50 text-amber-600' },
  CONFIRMED:  { label: 'Onaylandı',    cls: 'bg-metronic-success-light text-metronic-success' },
  CHECKED_IN: { label: 'Geldi',        cls: 'bg-metronic-primary-light text-metronic-primary' },
  COMPLETED:  { label: 'Tamamlandı',   cls: 'bg-slate-100 text-slate-500' },
  NO_SHOW:    { label: 'Gelmedi',      cls: 'bg-metronic-danger-light text-metronic-danger' },
  CANCELLED:  { label: 'İptal',        cls: 'bg-metronic-danger-light text-metronic-danger' },
  POSTPONED:  { label: 'Ertelendi',    cls: 'bg-amber-50 text-amber-600' },
};

const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100];

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void; }) {
  const isActive = sortColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      className="py-3 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors select-none"
    >
      <div className="flex items-center gap-1.5">
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={12} className="text-metronic-primary" /> : <ArrowDown size={12} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

function doctorName(a: AppointmentWithPatient): string {
  return a.doctor ? `Dt. ${a.doctor.firstName} ${a.doctor.lastName}` : '—';
}

export default function AppointmentsTab({ patient }: { patient: any }) {
  const addToast = useToastStore(state => state.addToast);

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [chairs, setChairs] = useState<{ id: string; name: string; clinicBranchId?: string | null }[]>([]);
  const [clinicBranches, setClinicBranches] = useState<ClinicBranch[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Partial<CalendarAppointment> | undefined>();

  // Arama, filtre, sıralama, sayfalama
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);

  const fetchAppointments = useCallback(async () => {
    if (!patient?.id) return;
    try {
      setLoading(true);
      const [apps, staff, chs, branches] = await Promise.all([
        AppointmentService.findByPatient(patient.id),
        DoctorService.findAll(),
        AppointmentService.getChairs(),
        ClinicBranchService.findAll(),
      ]);
      setAppointments(apps);
      setDoctors(staff.filter(s => s.isDoctor && s.isActive).map(s => ({ id: s.id, name: `Dt. ${s.firstName} ${s.lastName}` })));
      setChairs(chs);
      setClinicBranches(branches);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      addToast({ title: 'Hata', message: 'Randevular yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [patient?.id, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/patient-change pattern
    fetchAppointments();
  }, [fetchAppointments]);

  const exportCSV = () => {
    const rows = [
      ['Tarih & Saat', 'Hekim', 'Durum'],
      ...sortedAppointments.map(a => [
        format(new Date(a.startOn), 'dd.MM.yyyy HH:mm', { locale: tr }),
        doctorName(a),
        STATUS_MAP[a.status]?.label || a.status,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'randevular.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Arama + filtre
  const filtered = appointments.filter(a => {
    const statusLabel = STATUS_MAP[a.status]?.label || a.status;
    const matchSearch = [doctorName(a), statusLabel, a.startOn]
      .join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Sıralama
  const sortedAppointments = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = sortColumn === 'status' ? (STATUS_MAP[a.status]?.label || a.status) : sortColumn === 'doctor' ? doctorName(a) : (a as any)[sortColumn] ?? '';
    const bVal = sortColumn === 'status' ? (STATUS_MAP[b.status]?.label || b.status) : sortColumn === 'doctor' ? doctorName(b) : (b as any)[sortColumn] ?? '';
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
  const filterKey = `${searchTerm}|${filterStatus}|${pageLimit}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  // Sayfalama
  const totalPages = Math.max(1, Math.ceil(sortedAppointments.length / pageLimit));
  const paginated = sortedAppointments.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const allSelected = paginated.length > 0 && paginated.every(a => selectedIds.includes(a.id));
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : paginated.map(a => a.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedIds.map(id => AppointmentService.delete(id)));
      addToast({ title: 'Başarılı', message: 'Seçilen randevular silindi.', type: 'success' });
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
      fetchAppointments();
    } catch (err: any) {
      addToast({ title: 'Hata', message: err.response?.data?.message || 'Randevular silinemedi.', type: 'error' });
    }
  };

  const openAddModal = () => {
    setModalData({
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '09:15',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (a: AppointmentWithPatient) => {
    setModalData({
      id: a.id,
      patientId: a.patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      doctorId: a.doctorId,
      chairId: a.chairId || '',
      clinicBranchId: a.clinicBranchId || '',
      date: a.startOn.split('T')[0],
      startTime: new Date(a.startOn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      endTime: new Date(a.endOn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      status: a.status,
      notes: a.notes || '',
      ...(a.type ? { appointmentType: a.type } : {}),
      ...(a.treatmentItems ? { treatmentItems: a.treatmentItems } : {}),
    } as any);
    setIsModalOpen(true);
  };

  // Randevu Ekle modalındaki gerçek AppointmentModal — ADR-004 §5: eski mock modal
  // (setTimeout veri, işlevsiz Kaydet butonu) yerine appointments/page.tsx'in
  // kullandığı gerçek bileşen; seri/senkron desteği bedavaya kazanılır.
  const handleSaveModal = async (data: Partial<CalendarAppointment>, force?: boolean): Promise<AppointmentConflictInfo | void> => {
    try {
      const startOn = new Date(`${data.date}T${data.startTime}:00`).toISOString();
      const endOn = new Date(`${data.date}T${data.endTime}:00`).toISOString();

      const appointmentType = (data as any).appointmentType as string | undefined;
      const treatmentItemIds = (data as any).treatmentItemIds as string[] | undefined;
      const repeat = (data as any).repeat as { freq: 'WEEKLY' | 'MONTHLY'; interval: number; count?: number; until?: string } | undefined;

      if (data.id) {
        await AppointmentService.update(data.id, {
          doctorId: data.doctorId,
          chairId: data.chairId || null,
          clinicBranchId: data.clinicBranchId || undefined,
          patientId: data.patientId,
          startOn,
          endOn,
          status: data.status as any,
          notes: data.notes,
          force,
          ...(appointmentType ? { type: appointmentType } : {}),
        });
        addToast({ title: 'Başarılı', message: 'Randevu güncellendi.', type: 'success' });
      } else if (repeat) {
        const result = await AppointmentService.createSeries({
          patientId: data.patientId!,
          doctorId: data.doctorId!,
          chairId: data.chairId || undefined,
          notes: data.notes,
          startOn,
          endOn,
          freq: repeat.freq,
          interval: repeat.interval,
          count: repeat.count,
          until: repeat.until ? new Date(`${repeat.until}T23:59:59`).toISOString() : undefined,
          force,
          ...(appointmentType ? { type: appointmentType } : {}),
        });
        addToast({ title: 'Başarılı', message: `Randevu serisi oluşturuldu: ${result.occurrences.length} randevu.`, type: 'success' });
        if (result.skipped.length > 0) {
          addToast({ title: 'Uyarı', message: `${result.skipped.length} randevu ünit çakışması nedeniyle atlandı.`, type: 'warning' });
        }
      } else {
        await AppointmentService.create({
          patientId: data.patientId!,
          doctorId: data.doctorId!,
          chairId: data.chairId || undefined,
          clinicBranchId: data.clinicBranchId || undefined,
          startOn,
          endOn,
          notes: data.notes,
          force,
          ...(appointmentType ? { type: appointmentType } : {}),
          ...(treatmentItemIds?.length ? { treatmentItemIds } : {}),
        });
        addToast({ title: 'Başarılı', message: 'Randevu oluşturuldu.', type: 'success' });
      }
      fetchAppointments();
      setIsModalOpen(false);
    } catch (err: any) {
      const respData = err.response?.data;
      if (err.response?.status === 409 && respData?.conflict) {
        return { conflict: true, appointmentCount: respData.appointmentCount, appointments: respData.appointments || [] };
      }
      addToast({ title: 'Hata', message: respData?.message || 'İşlem başarısız.', type: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toplu İşlem Çubuğu */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-metronic-primary-light/30 border border-metronic-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.length} randevu seçildi</span>
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
        <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <h4 className="text-[1.05rem] font-bold text-slate-800 tracking-tight m-0">Randevular</h4>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="Hekim veya durum ara..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 h-9 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterStatus ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Filter size={15} /> Filtrele {filterStatus && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Durum</p></div>
              <DropdownItem label="Tümü" active={!filterStatus} onClick={() => setFilterStatus('')} />
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <DropdownItem key={k} label={v.label} active={filterStatus === k} onClick={() => setFilterStatus(filterStatus === k ? '' : k)} />
              ))}
              {filterStatus && <div className="border-t border-slate-100 mt-1 px-3 py-2"><button onClick={() => setFilterStatus('')} className="w-full text-center text-[12px] font-bold text-rose-500">Filtreyi Temizle</button></div>}
            </Dropdown>
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p></div>
              <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>
            <button onClick={openAddModal}
              className="flex items-center gap-1.5 h-9 px-3 bg-metronic-primary text-white rounded-lg text-[13px] font-bold hover:bg-blue-600 transition-colors whitespace-nowrap">
              <Plus size={14} /> Randevu Ekle
            </button>
          </div>
        </div>
        <div className="overflow-auto max-h-[420px] relative">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-6 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                  />
                </th>
                <SortableHeader label="Tarih & Saat" column="startOn" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Hekim" column="doctor" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-4 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-6" /></td>
                  </tr>
                ))
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={24} className="text-slate-300" />
                      <span className="text-[13px] font-medium">Randevu bulunamadı.</span>
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 text-[13px]">Eşleşen kayıt bulunamadı.</td>
                </tr>
              ) : (
                paginated.map(a => {
                  const isSelected = selectedIds.includes(a.id);
                  return (
                    <tr key={a.id} onClick={() => openEditModal(a)} className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-metronic-primary-light/10' : ''}`}>
                      <td className="py-3 px-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(a.id)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-6 text-[13px] font-semibold text-slate-700">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          {format(new Date(a.startOn), 'dd MMMM yyyy HH:mm', { locale: tr })}
                        </div>
                      </td>
                      <td className="py-3 px-6 text-[13px] text-slate-600">{doctorName(a)}</td>
                      <td className="py-3 px-6">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${STATUS_MAP[a.status]?.cls || 'bg-slate-100 text-slate-600'}`}>
                          {STATUS_MAP[a.status]?.label || a.status}
                        </span>
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
                Toplam <span className="font-bold text-slate-700">{sortedAppointments.length}</span> kayıttan{' '}
                <span className="font-bold text-slate-700">{sortedAppointments.length === 0 ? 0 : Math.min((currentPage - 1) * pageLimit + 1, sortedAppointments.length)}–{Math.min(currentPage * pageLimit, sortedAppointments.length)}</span> arası
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

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        initialData={modalData}
        doctors={doctors}
        patients={[{ id: patient.id, firstName: patient.firstName, lastName: patient.lastName }]}
        chairs={chairs}
        clinicBranches={clinicBranches}
      />

      <ConfirmModal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title="Randevuları Sil"
        message={`${selectedIds.length} randevuyu silmek istediğinize emin misiniz?`}
      />
    </div>
  );
}
