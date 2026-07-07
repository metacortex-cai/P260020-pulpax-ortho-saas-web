'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import Modal from '../../../components/ui/Modal';
import Switch from '../../../components/ui/Switch';
import {
  Search, Plus, Filter, Download, Edit2, Trash2, ChevronLeft, ChevronRight, Settings,
  X, FileText, FileSpreadsheet, ChevronDown, CheckSquare, Save, ArrowUp, ArrowDown, Loader2, Eye, Check, UserX, AlertTriangle, ArrowLeft
} from 'lucide-react';
import { EmployeeService, Employee, TerminationImpact, resolveDocumentUrl } from '../../../lib/services/employee.service';
import { useToastStore } from '../../../store/toastStore';
import Link from 'next/link';


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

const ROLE_COLORS: Record<string, string> = {
  'HEKİM': 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  'PERSONEL': 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
};
const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  'AKTİF': { cls: 'bg-metronic-success-light text-metronic-success', label: 'Aktif' },
  'İZİNLİ': { cls: 'bg-amber-50 text-amber-600', label: 'İzinli' },
  'PASİF': { cls: 'bg-slate-100 text-slate-500', label: 'Pasif' },
};

// Doktor seçildiğinde açılan Branş (uzmanlık alanı) seçenekleri — personelin
// `title` alanında saklanır (bkz. handleSubmit / fetchStaff eşlemesi).
const BRANCHES = ['Diş Hekimi', 'Cerrah', 'Ortodontist', 'Endodontist', 'Pedodontist', 'Periodontist', 'Protez Uzmanı', 'Restoratif'];

const INITIAL_FORM_DATA = { firstName: '', lastName: '', title: '', phone: '', email: '', branch: '', status: 'AKTİF', isDoctor: false, createUserAccount: true };

export default function StaffPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { addToast } = useToastStore();
  const [mounted, setMounted] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const PAGE_LIMIT_OPTIONS = [25, 50, 100];
  
  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [formLoading, setFormLoading] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // İşten Çıkış (toplu pasife alma) modalı
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [terminateStep, setTerminateStep] = useState<'form' | 'transfer'>('form');
  const [terminateDate, setTerminateDate] = useState('');
  const [terminateReason, setTerminateReason] = useState('');
  const [terminateLoading, setTerminateLoading] = useState(false);
  const [checkingImpact, setCheckingImpact] = useState(false);
  const [transferItems, setTransferItems] = useState<{ employeeId: string; name: string; impact: TerminationImpact }[]>([]);
  const [transferSelections, setTransferSelections] = useState<Record<string, string>>({});
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-mount guard: `mounted` must only flip to true after hydration, which can't be derived during render
  useEffect(() => { setMounted(true); }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await EmployeeService.findAll(true);
      const mapped = data.map((s: any) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        title: s.isDoctor ? 'Dt.' : '',
        rawTitle: s.title || '',
        isDoctor: s.isDoctor,
        role: s.isDoctor ? 'HEKİM' : 'PERSONEL',
        phone: s.phone || '',
        email: s.email,
        photoUrl: s.photoUrl,
        branch: s.isDoctor ? (s.title || 'Genel') : 'Genel',
        status: s.isActive ? 'AKTİF' : 'PASİF',
        startDate: new Date(s.createdAt).toLocaleDateString('tr-TR')
      }));
      setStaff(mapped);
    } catch (e) {
      console.error("Staff fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/user-change pattern
    if (mounted && user) fetchStaff();
  }, [mounted, user]);

  const filtered = staff.filter(s =>
    [s.firstName, s.lastName, s.role, s.phone, s.id, s.branch, s.email]
      .join(' ').toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!filterRole || s.role === filterRole) &&
    (!filterStatus || s.status === filterStatus)
  );

  // Reset to page 1 whenever the active filters change (derived during render, not in an effect).
  const filterSignature = `${searchTerm}|${filterRole}|${filterStatus}`;
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setCurrentPage(1);
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedData = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageLimit));
  const paginated = sortedData.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const allSelected = paginated.length > 0 && paginated.every(s => selectedIds.has(s.id));
  const someSelected = paginated.some(s => selectedIds.has(s.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(paginated.map(s => s.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const openTerminateModal = () => {
    setTerminateStep('form');
    setTerminateDate(new Date().toISOString().slice(0, 10));
    setTerminateReason('');
    setTransferItems([]);
    setTransferSelections({});
    setTerminateModalOpen(true);
  };

  const finalizeTermination = async (ids: string[], transferMap: Record<string, string>) => {
    setTerminateLoading(true);
    try {
      await Promise.all(ids.map(id => EmployeeService.deactivate(id, terminateReason, terminateDate, transferMap[id])));
      await fetchStaff();
      setSelectedIds(new Set());
      setTerminateModalOpen(false);
      addToast({ type: 'success', message: `${ids.length} personel için işten çıkış işlendi.` });
    } catch (e: any) {
      addToast({ type: 'error', message: e?.response?.data?.message || 'İşten çıkış işlenirken bir hata oluştu.' });
    } finally {
      setTerminateLoading(false);
    }
  };

  // Adım 1: tarih + açıklama onaylandığında, seçili hekimlerin devredilmesi gereken
  // randevu/hasta/tedavi kaydı olup olmadığı kontrol edilir. Yoksa doğrudan pasife alınır.
  const handleTerminateFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = Array.from(selectedIds);
    const doctorIds = ids.filter(id => staff.find(s => s.id === id)?.isDoctor);

    if (doctorIds.length === 0) {
      await finalizeTermination(ids, {});
      return;
    }

    setCheckingImpact(true);
    try {
      const impacts = await Promise.all(doctorIds.map(async id => ({ id, impact: await EmployeeService.getTerminationImpact(id) })));
      const needsTransfer = impacts.filter(x => x.impact.requiresTransfer);

      if (needsTransfer.length === 0) {
        await finalizeTermination(ids, {});
        return;
      }

      setTransferItems(needsTransfer.map(x => {
        const s = staff.find(st => st.id === x.id)!;
        return { employeeId: x.id, name: `${s.title ? s.title + ' ' : ''}${s.firstName} ${s.lastName}`, impact: x.impact };
      }));
      setTransferSelections({});
      setTerminateStep('transfer');
    } catch (e: any) {
      addToast({ type: 'error', message: e?.response?.data?.message || 'Devir kontrolü sırasında bir hata oluştu.' });
    } finally {
      setCheckingImpact(false);
    }
  };

  // Adım 2: her devir gerektiren hekim için bir devralan hekim seçilmiş olmalı.
  const handleTransferConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = transferItems.some(t => !transferSelections[t.employeeId]);
    if (missing) {
      addToast({ type: 'error', message: 'Lütfen listedeki her hekim için devralacak bir hekim seçin.' });
      return;
    }
    await finalizeTermination(Array.from(selectedIds), transferSelections);
  };

  const eligibleReplacementDoctors = (excludeId: string) =>
    staff.filter(s => s.isDoctor && s.status === 'AKTİF' && s.id !== excludeId && !selectedIds.has(s.id));

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    setBulkDeleteLoading(true);
    try {
      const results = await Promise.allSettled(ids.map(id => EmployeeService.remove(id)));
      const failed = results.filter(r => r.status === 'rejected').length;
      const succeeded = results.length - failed;
      await fetchStaff();
      setSelectedIds(new Set());
      if (failed > 0) {
        addToast({
          type: succeeded > 0 ? 'warning' : 'error',
          message: succeeded > 0
            ? `${succeeded} personel silindi, ${failed} personel ilişkili kayıtları (randevu/tedavi/prim vb.) olduğu için silinemedi. Bu personeli işten çıkış olarak işaretleyebilirsiniz.`
            : `${failed} personel ilişkili kayıtları (randevu/tedavi/prim vb.) olduğu için silinemedi. Bu personeli işten çıkış olarak işaretleyebilirsiniz.`,
        });
      } else {
        addToast({ type: 'success', message: `${succeeded} personel silindi.` });
      }
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    // Branş, doktor için seçilen uzmanlık alanıdır ve personelin `title` alanında saklanır.
    const resolvedTitle = formData.isDoctor && formData.branch ? formData.branch : undefined;

    try {
      if (editingStaff) {
        await EmployeeService.update(editingStaff.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          title: resolvedTitle,
          isDoctor: formData.isDoctor,
        });
      } else {
        const created = await EmployeeService.create({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          isDoctor: formData.isDoctor,
          title: resolvedTitle,
        });
        if (formData.createUserAccount) {
          await EmployeeService.invite(created.id);
        }
      }
      await fetchStaff();
      setModalOpen(false);
      setEditingStaff(null);
      setFormData(INITIAL_FORM_DATA);
      addToast({
        type: 'success',
        message: editingStaff
          ? 'Personel güncellendi.'
          : formData.createUserAccount
            ? 'Personel kaydedildi. Hesabını aktifleştirmesi için davet e-postası gönderildi.'
            : 'Personel başarıyla kaydedildi.',
      });
    } catch (e: any) {
      console.error("Save failed", e);
      addToast({ type: 'error', message: e?.response?.data?.message || 'Personel kaydedilirken bir hata oluştu.' });
    } finally {
      setFormLoading(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Ad', 'Soyad', 'Rol', 'Telefon', 'E-posta', 'Durum'],
      ...sortedData.map(s => [s.firstName, s.lastName, s.role, s.phone || '-', s.email || '-', STATUS_MAP[s.status]?.label || s.status]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'personeller.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-[#EEF0F8] dark:bg-[#0f1117]">
        <Loader2 className="animate-spin text-metronic-primary mr-2" size={24} />
        <span className="text-[13px] font-semibold">Yetkilendirme kontrol ediliyor...</span>
      </div>
    );
  }

  return (
    <MetronicLayout title="Personel Yönetimi" breadcrumbs={['İnsan Kaynakları', 'Personeller']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20 animate-[fadeInDown_0.2s_ease]">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} personel seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openTerminateModal} className="h-8 px-3 bg-white border border-amber-300 text-amber-600 text-[12px] font-bold rounded-lg hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-sm flex items-center gap-1.5">
                <UserX size={14} /> İşten Çıkış
              </button>
              <button onClick={handleBulkDelete} disabled={bulkDeleteLoading} className="h-8 px-3 bg-white border border-metronic-danger/30 text-metronic-danger text-[12px] font-bold rounded-lg hover:bg-metronic-danger hover:text-white transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-60">
                <Trash2 size={14} /> {bulkDeleteLoading ? 'Siliniyor...' : 'Sil'}
              </button>
              <div className="w-px h-5 bg-metronic-primary/20 mx-1" />
              <button onClick={() => setSelectedIds(new Set())} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors shadow-sm"><X size={16} /></button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Personel Listesi</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px] max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input type="text" placeholder="Ad, soyad, rol, branş ile ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
            </div>
            
            {/* Filter */}
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterRole || filterStatus ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>
                <Filter size={15} /> Filtrele {(filterRole || filterStatus) && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase">Rol</p></div>
              <FilterItem label="Tüm Roller" active={!filterRole} onClick={() => setFilterRole('')} />
              {['HEKİM', 'PERSONEL'].map(r => <FilterItem key={r} label={r} active={filterRole === r} onClick={() => setFilterRole(filterRole === r ? '' : r)} />)}
              <div className="px-4 py-2 border-t border-b border-slate-100 dark:border-white/5 mt-1"><p className="text-[11px] font-bold text-slate-400 uppercase">Durum</p></div>
              <FilterItem label="Tüm Durumlar" active={!filterStatus} onClick={() => setFilterStatus('')} />
              {Object.entries(STATUS_MAP).map(([k, v]) => <FilterItem key={k} label={v.label} active={filterStatus === k} onClick={() => setFilterStatus(filterStatus === k ? '' : k)} />)}
              {(filterRole || filterStatus) && <div className="border-t border-slate-100 mt-1 px-3 py-2"><button onClick={() => { setFilterRole(''); setFilterStatus(''); }} className="w-full text-center text-[12px] font-bold text-rose-500">Filtreleri Temizle</button></div>}
            </Dropdown>

            {/* Export */}
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase">Format Seçin</p></div>
              <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>

            <button onClick={() => { setEditingStaff(null); setFormData(INITIAL_FORM_DATA); setModalOpen(true); }} className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors shadow-sm"><Plus size={16} /> Yeni Personel</button>
          </div>
        </div>

        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10"><input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></th>
                <SortableHeader label="Ad Soyad" column="firstName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Rol" column="role" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Branş" column="branch" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Telefon" column="phone" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="E-posta" column="email" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Başlangıç" column="startDate" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center text-slate-500 font-medium">Yükleniyor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-slate-500 font-medium">Eşleşen kayıt bulunamadı.</td></tr>
              ) : paginated.map(s => {
                const isSelected = selectedIds.has(s.id);
                const roleColor = ROLE_COLORS[s.role] || 'bg-slate-50 text-slate-600';
                const statusInfo = STATUS_MAP[s.status] || STATUS_MAP['AKTİF'];
                return (
                  <tr key={s.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                    <td className="py-3 pl-6 pr-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(s.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3.5">
                        {s.photoUrl ? (
                          <img src={resolveDocumentUrl(s.photoUrl)} alt={`${s.firstName} ${s.lastName}`} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-metronic-primary-light dark:bg-metronic-primary/15 text-metronic-primary flex items-center justify-center font-bold text-[14px] flex-shrink-0">{s.firstName.charAt(0)}</div>
                        )}
                        <div className="flex flex-col">
                          <Link href={`/hr/staff/${s.id}`} className="text-slate-800 dark:text-slate-100 font-bold text-[13px] hover:text-metronic-primary transition-colors">{s.title ? `${s.title} ` : ''}{s.firstName} {s.lastName}</Link>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${roleColor}`}>{s.role}</span></td>
                    <td className="py-3 px-4"><span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">{s.branch}</span></td>
                    <td className="py-3 px-4"><span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">{s.phone}</span></td>
                    <td className="py-3 px-4"><span className="text-[13px] font-medium text-slate-500 dark:text-slate-400 no-capitalize">{s.email}</span></td>
                    <td className="py-3 px-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${statusInfo.cls}`}>{statusInfo.label}</span></td>
                    <td className="py-3 px-4"><span className="text-slate-500 dark:text-slate-400 font-medium text-[13px]">{s.startDate}</span></td>
                    <td className="py-3 pl-4 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/hr/staff/${s.id}`} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-metronic-primary transition-colors shadow-sm"><Eye size={16} /></Link>
                        <button onClick={() => { setEditingStaff(s); setFormData({ firstName: s.firstName, lastName: s.lastName, title: s.rawTitle, phone: s.phone, email: s.email, branch: BRANCHES.includes(s.rawTitle) ? s.rawTitle : '', status: s.status, isDoctor: s.isDoctor, createUserAccount: true }); setModalOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-metronic-primary transition-colors shadow-sm"><Settings size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingStaff(null); setFormData(INITIAL_FORM_DATA); }} title={editingStaff ? "Personel Düzenle" : "Yeni Personel Kaydı"} subtitle={editingStaff ? "Personel bilgilerini güncelleyin." : "Kliniğe yeni personel ekleyin."} size="lg" footer={
        <><button type="button" onClick={() => { setModalOpen(false); setEditingStaff(null); setFormData(INITIAL_FORM_DATA); }} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
        <button form="new-staff-form" type="submit" disabled={formLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70"><Save size={15} />{formLoading ? 'Kaydediliyor...' : (editingStaff ? 'Güncelle' : 'Personeli Kaydet')}</button></>
      }>
        <form id="new-staff-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ad <span className="text-metronic-danger">*</span></label>
              <input required type="text" placeholder="Ad" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Soyad <span className="text-metronic-danger">*</span></label>
              <input required type="text" placeholder="Soyad" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Telefon <span className="text-metronic-danger">*</span></label>
              <input required type="tel" placeholder="05XX XXX XX XX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">E-posta <span className="text-metronic-danger">*</span></label>
              <input required type="email" placeholder="ornek@pulpax.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="m-input" />
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl space-y-4">
            <Switch
              checked={formData.isDoctor}
              onChange={(v) => setFormData({ ...formData, isDoctor: v, branch: v ? formData.branch : '' })}
              label="Doktor mu?"
              description="Açıksa Mesai Ayarları ve Prim Ayarları sekmeleri bu personel için açılır."
            />
            {formData.isDoctor && (
              <div className="flex flex-col gap-1.5 pl-1">
                <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Branş <span className="text-metronic-danger">*</span></label>
                <select required value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} className="m-input">
                  <option value="" disabled>Branş Seçiniz...</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}
            <div className="border-t border-slate-200 dark:border-white/10" />
            <Switch
              checked={formData.createUserAccount}
              onChange={(v) => setFormData({ ...formData, createUserAccount: v })}
              label="Kullanıcı Hesabı Oluştur"
              description="Açıksa personelin e-postasına davet linki gönderilir; kişi daveti kabul edip kendi şifresini belirler."
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={terminateModalOpen}
        onClose={() => setTerminateModalOpen(false)}
        title={terminateStep === 'form' ? 'İşten Çıkış' : 'Hekim Devri Gerekli'}
        subtitle={
          terminateStep === 'form'
            ? `${selectedIds.size} personel için işten çıkış tarihi ve açıklama girin.`
            : 'Aşağıdaki hekimlere ait süren randevu, hasta veya tamamlanmamış tedavi kayıtları devralacak hekime aktarılacak.'
        }
        size={terminateStep === 'form' ? 'md' : 'lg'}
        footer={
          terminateStep === 'form' ? (
            <>
              <button type="button" onClick={() => setTerminateModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
              <button form="terminate-staff-form" type="submit" disabled={checkingImpact} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-70"><UserX size={15} />{checkingImpact ? 'Kontrol ediliyor...' : 'İleri'}</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setTerminateStep('form')} className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"><ArrowLeft size={15} /> Geri</button>
              <button form="terminate-transfer-form" type="submit" disabled={terminateLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-70"><UserX size={15} />{terminateLoading ? 'İşleniyor...' : 'Tamam'}</button>
            </>
          )
        }
      >
        {terminateStep === 'form' ? (
          <form id="terminate-staff-form" onSubmit={handleTerminateFormSubmit} className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İşten Çıkış Tarihi <span className="text-metronic-danger">*</span></label>
              <input required type="date" value={terminateDate} onChange={e => setTerminateDate(e.target.value)} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Açıklama <span className="text-metronic-danger">*</span></label>
              <textarea required rows={3} placeholder="İşten çıkış nedeni / açıklaması" value={terminateReason} onChange={e => setTerminateReason(e.target.value)} className="m-input resize-none" />
            </div>
          </form>
        ) : (
          <form id="terminate-transfer-form" onSubmit={handleTransferConfirm} className="space-y-4">
            {transferItems.map(t => (
              <div key={t.employeeId} className="p-4 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{t.name}</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.impact.appointmentCount} süren randevu, {t.impact.patientCount} atanmış hasta, {t.impact.incompleteTreatmentCount} tamamlanmamış tedavi kalemi devredilecek.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Devralacak Hekim <span className="text-metronic-danger">*</span></label>
                  <select
                    required
                    value={transferSelections[t.employeeId] || ''}
                    onChange={e => setTransferSelections(prev => ({ ...prev, [t.employeeId]: e.target.value }))}
                    className="m-input"
                  >
                    <option value="" disabled>Hekim seçin...</option>
                    {eligibleReplacementDoctors(t.employeeId).map(d => (
                      <option key={d.id} value={d.id}>{d.title ? `${d.title} ` : ''}{d.firstName} {d.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </form>
        )}
      </Modal>
    </MetronicLayout>
  );
}
