'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Filter, Building2, Edit2, ShieldAlert, Check, X, Calendar, Database, Play, ChevronDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import SaasMetronicLayout from '../../../components/layout/SaasMetronicLayout';
import { SaasService } from '../../../lib/services/saas.service';
import { useToastStore } from '../../../store/toastStore';
import Modal from '../../../components/ui/Modal';

const CLINIC_STATUS_LABELS: Record<string, string> = { ACTIVE: 'Aktif', TRIAL: 'Deneme', SUSPENDED: 'Askıda' };

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

export default function SaasClinicsPage() {
  const { addToast } = useToastStore();
  const [clinics, setClinics] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    plan: 'FREE',
    status: 'ACTIVE',
    databaseUrl: '',
    subscriptionEndDate: '',
  });

  const fetchClinics = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await SaasService.getClinics();
      setClinics(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Klinik listesi yüklenemedi. Sunucu bağlantısını kontrol edin.';
      setError(msg);
      addToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchClinics();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchClinics is redefined every render; adding it would retrigger this effect on every render
  }, []);

  const handleCreateClinic = async () => {
    setError('');
    setSuccess('');
    try {
      if (!formData.name) {
        addToast({ type: 'warning', message: 'Klinik adı zorunludur.' });
        setError('Klinik adı zorunludur.');
        return;
      }
      await SaasService.createClinic(formData);
      const msg = 'Klinik başarıyla oluşturuldu.';
      setSuccess(msg);
      addToast({ type: 'success', message: msg });
      setIsAddModalOpen(false);
      setFormData({ name: '', taxId: '', plan: 'FREE', status: 'ACTIVE', databaseUrl: '', subscriptionEndDate: '' });
      fetchClinics();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Klinik oluşturulamadı.';
      setError(msg);
      addToast({ type: 'error', message: msg });
    }
  };

  const handleUpdateClinic = async () => {
    setError('');
    setSuccess('');
    try {
      await SaasService.updateClinic(selectedClinic.id, formData);
      const msg = 'Klinik başarıyla güncellendi.';
      setSuccess(msg);
      addToast({ type: 'success', message: msg });
      setIsEditModalOpen(false);
      fetchClinics();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Güncelleme başarısız.';
      setError(msg);
      addToast({ type: 'error', message: msg });
    }
  };

  const openEditModal = (clinic: any) => {
    setSelectedClinic(clinic);
    setFormData({
      name: clinic.name,
      taxId: clinic.taxId || '',
      plan: clinic.plan || 'FREE',
      status: clinic.status || 'ACTIVE',
      databaseUrl: clinic.databaseUrl || '',
      subscriptionEndDate: clinic.subscriptionEndDate ? clinic.subscriptionEndDate.split('T')[0] : '',
    });
    setIsEditModalOpen(true);
  };

  const filtered = clinics.filter(c => {
    const matchesSearch = [c.name, c.id, c.taxId].filter(Boolean).join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? c.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const getSortedData = () => {
    const sorted = [...filtered];
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

  // Arama veya durum filtresi değişince sayfayı sıfırla (render sırasında, efekt olmadan)
  const [prevPagingFilters, setPrevPagingFilters] = useState({ searchTerm, statusFilter });
  if (searchTerm !== prevPagingFilters.searchTerm || statusFilter !== prevPagingFilters.statusFilter) {
    setPrevPagingFilters({ searchTerm, statusFilter });
    setCurrentPage(1);
  }

  return (
    <SaasMetronicLayout 
      title="Klinik Yönetimi" 
      breadcrumbs={['Klinikler']}
      headerAction={
        <button 
          onClick={() => {
            setFormData({ name: '', taxId: '', plan: 'FREE', status: 'ACTIVE', databaseUrl: '', subscriptionEndDate: '' });
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors"
        >
          <Plus size={16} /> Yeni Klinik Ekle
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        
        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-xl font-medium">
            {success}
          </div>
        )}

        <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm flex flex-col">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Klinik adı veya ID ara..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-[13px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Dropdown
                align="right"
                trigger={
                  <button className="flex items-center gap-1.5 h-9 px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                    <Filter size={14} /> {statusFilter ? `Durum: ${CLINIC_STATUS_LABELS[statusFilter]}` : 'Durum'} <ChevronDown size={14} className="opacity-50" />
                  </button>
                }
              >
                <DropdownItem icon={<X size={14} />} label="Filtreyi Temizle" onClick={() => setStatusFilter(null)} />
                <DropdownItem icon={<div className="w-2 h-2 rounded-full bg-emerald-400" />} label="Aktif" onClick={() => setStatusFilter('ACTIVE')} />
                <DropdownItem icon={<div className="w-2 h-2 rounded-full bg-amber-400" />} label="Deneme" onClick={() => setStatusFilter('TRIAL')} />
                <DropdownItem icon={<div className="w-2 h-2 rounded-full bg-red-400" />} label="Askıda" onClick={() => setStatusFilter('SUSPENDED')} />
              </Dropdown>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/[0.02] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 dark:border-white/5">
                  <SortableHeader label="Klinik" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Veritabanı URL (Dynamic Routing)" column="databaseUrl" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Paket" column="plan" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Lisans Bitiş Tarihi" column="subscriptionEndDate" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <th className="px-5 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-white/5">
                      <td className="px-5 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex-shrink-0" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-36 rounded bg-slate-200 dark:bg-white/10" />
                          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10" />
                        </div>
                      </td>
                      <td className="px-5 py-3"><div className="h-3.5 w-48 rounded bg-slate-200 dark:bg-white/10" /></td>
                      <td className="px-5 py-3 text-center"><div className="h-5 w-14 rounded bg-slate-200 dark:bg-white/10 mx-auto" /></td>
                      <td className="px-5 py-3 text-center"><div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-white/10 mx-auto" /></td>
                      <td className="px-5 py-3 text-right"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-white/10 ml-auto" /></td>
                      <td className="px-5 py-3" />
                    </tr>
                  ))
                ) : paginated.map((clinic, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-5 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white block">{clinic.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">ID: {clinic.id} &nbsp;•&nbsp; VKN: {clinic.taxId || 'Belirtilmemiş'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={clinic.databaseUrl}>
                      {clinic.databaseUrl || 'Tanımlanmamış'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-md">
                        {clinic.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full ${
                        clinic.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        clinic.status === 'TRIAL' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      }`}>
                        {clinic.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500 text-xs">
                      {clinic.subscriptionEndDate ? new Date(clinic.subscriptionEndDate).toLocaleDateString('tr-TR') : 'Sınırsız / Yok'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(clinic)}
                          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
                          title="Lisans ve Veritabanı Düzenle"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">
                      Kriterlere uygun klinik bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200/60 dark:border-white/5">
            <span className="text-slate-500 text-[13px]">Toplam <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> kayıt</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10"><ChevronLeft size={16} /></button>
              <span className="px-3 text-[13px] font-bold">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD CLINIC */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Yeni Klinik Oluştur"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Klinik Adı</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500"
              placeholder="Gülüş Polikliniği"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Vergi No / VKN (Opsiyonel)</label>
            <input 
              type="text" 
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500"
              placeholder="1234567890"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Paket</label>
              <select 
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
              >
                <option value="FREE">FREE</option>
                <option value="BASIC">BASIC</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Lisans Bitiş Tarihi</label>
              <input 
                type="date" 
                value={formData.subscriptionEndDate}
                onChange={(e) => setFormData({ ...formData, subscriptionEndDate: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Veritabanı URL (İzole Database Connection String)</label>
            <input 
              type="text" 
              value={formData.databaseUrl}
              onChange={(e) => setFormData({ ...formData, databaseUrl: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 font-mono text-xs"
              placeholder="postgresql://user:pass@host:port/db_name?schema=public"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-[12px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button 
              onClick={handleCreateClinic}
              className="px-4 py-2 text-[12px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              Oluştur
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: EDIT CLINIC */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        title={`${selectedClinic?.name} - Lisans & Veritabanı Yönetimi`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">SaaS Paketi</label>
              <select 
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
              >
                <option value="FREE">FREE</option>
                <option value="BASIC">BASIC</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Sistem Durumu</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="TRIAL">TRIAL</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Abonelik Bitiş Tarihi</label>
            <input 
              type="date" 
              value={formData.subscriptionEndDate}
              onChange={(e) => setFormData({ ...formData, subscriptionEndDate: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">İzole Veritabanı Bağlantı Dizesi (databaseUrl)</label>
            <input 
              type="text" 
              value={formData.databaseUrl}
              onChange={(e) => setFormData({ ...formData, databaseUrl: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 font-mono text-xs"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-[12px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button 
              onClick={handleUpdateClinic}
              className="px-4 py-2 text-[12px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              Değişiklikleri Kaydet
            </button>
          </div>
        </div>
      </Modal>
    </SaasMetronicLayout>
  );
}
