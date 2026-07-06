'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, UserCheck, Shield, Mail, Edit2, ShieldAlert, Key, Check, X, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Filter, ChevronDown } from 'lucide-react';
import SaasMetronicLayout from '../../../components/layout/SaasMetronicLayout';
import { SaasService } from '../../../lib/services/saas.service';
import { useToastStore } from '../../../store/toastStore';
import Modal from '../../../components/ui/Modal';

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

function DropdownItem({ icon, label, active = false, danger = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${
      danger ? 'text-metronic-danger hover:bg-metronic-danger-light' :
      active ? 'text-metronic-primary bg-metronic-primary-light font-bold' :
      'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'
    }`}>
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

export default function SaasAdminsPage() {
  const { addToast } = useToastStore();
  const [admins, setAdmins] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'SAAS_SUPPORT',
    password: '',
  });

  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'SAAS_SUPPORT',
    password: '',
    isActive: true,
  });

  const fetchAdmins = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await SaasService.getAdmins();
      setAdmins(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Yönetici listesi yüklenemedi.';
      setError(msg);
      addToast({ type: 'error', message: msg });
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchAdmins();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAdmins is redefined every render; adding it would retrigger this effect on every render
  }, []);

  const handleCreateAdmin = async () => {
    setError('');
    setSuccess('');
    try {
      if (!formData.firstName || !formData.email || !formData.password) {
        addToast({ type: 'warning', message: 'Tüm zorunlu alanları doldurun.' });
        setError('Tüm zorunlu alanları doldurun.');
        return;
      }
      await SaasService.createAdmin(formData);
      const msg = 'Sistem yöneticisi başarıyla eklendi.';
      setSuccess(msg);
      addToast({ type: 'success', message: msg });
      setIsAddModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', role: 'SAAS_SUPPORT', password: '' });
      fetchAdmins();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Yönetici eklenemedi.';
      setError(msg);
      addToast({ type: 'error', message: msg });
    }
  };

  const handleOpenEditModal = (admin: any) => {
    setEditingAdminId(admin.id);
    setEditFormData({
      firstName: admin.firstName,
      lastName: admin.lastName || '',
      email: admin.email,
      role: admin.role,
      password: '',
      isActive: admin.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAdmin = async () => {
    setError('');
    setSuccess('');
    try {
      if (!editFormData.firstName || !editFormData.email) {
        addToast({ type: 'warning', message: 'Tüm zorunlu alanları doldurun.' });
        setError('Tüm zorunlu alanları doldurun.');
        return;
      }

      const payload: any = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        email: editFormData.email,
        role: editFormData.role,
        isActive: editFormData.isActive,
      };

      if (editFormData.password) {
        payload.password = editFormData.password;
      }

      await SaasService.updateAdmin(editingAdminId!, payload);
      const msg = 'Sistem yöneticisi başarıyla güncellendi.';
      setSuccess(msg);
      addToast({ type: 'success', message: msg });
      setIsEditModalOpen(false);
      fetchAdmins();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Yönetici güncellenemedi.';
      setError(msg);
      addToast({ type: 'error', message: msg });
    }
  };

  const handleToggleAdminStatus = async (admin: any) => {
    setError('');
    setSuccess('');
    try {
      await SaasService.updateAdmin(admin.id, { isActive: !admin.isActive });
      const msg = `Yönetici başarıyla ${!admin.isActive ? 'aktif' : 'pasif'} yapıldı.`;
      setSuccess(msg);
      addToast({ type: 'success', message: msg });
      fetchAdmins();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Yönetici durumu değiştirilemedi.';
      setError(msg);
      addToast({ type: 'error', message: msg });
    }
  };

  const filtered = admins.filter(a => {
    const matchesSearch =
      a.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.lastName && a.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter ? a.role === roleFilter : true;
    return matchesSearch && matchesRole;
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

  // Arama veya rol filtresi değişince sayfayı sıfırla (render sırasında, efekt olmadan)
  const [prevPagingFilters, setPrevPagingFilters] = useState({ searchTerm, roleFilter });
  if (searchTerm !== prevPagingFilters.searchTerm || roleFilter !== prevPagingFilters.roleFilter) {
    setPrevPagingFilters({ searchTerm, roleFilter });
    setCurrentPage(1);
  }

  return (
    <SaasMetronicLayout
      title="Sistem Yöneticileri"
      breadcrumbs={['Yöneticiler']}
      headerAction={
        <button
          onClick={() => {
            setFormData({ firstName: '', lastName: '', email: '', role: 'SAAS_SUPPORT', password: '' });
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors"
        >
          <Plus size={16} /> Yeni Yönetici Ekle
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
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Yönetici adı veya e-posta ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-[13px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all dark:text-white"
                />
              </div>
              <Dropdown
                align="left"
                trigger={
                  <button className="flex items-center gap-1.5 h-[38px] px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 text-[13px] font-medium shadow-sm">
                    <Filter size={15} /> Rol <ChevronDown size={14} className="opacity-50" />
                  </button>
                }
              >
                <DropdownItem icon={<X size={14} />} label="Filtreyi Temizle" active={!roleFilter} onClick={() => setRoleFilter(null)} />
                <DropdownItem icon={<div className="w-2 h-2 rounded-full bg-red-500" />} label="SUPERADMIN" active={roleFilter === 'SAAS_SUPERADMIN'} onClick={() => setRoleFilter('SAAS_SUPERADMIN')} />
                <DropdownItem icon={<div className="w-2 h-2 rounded-full bg-amber-500" />} label="BILLING" active={roleFilter === 'SAAS_BILLING'} onClick={() => setRoleFilter('SAAS_BILLING')} />
                <DropdownItem icon={<div className="w-2 h-2 rounded-full bg-blue-500" />} label="SUPPORT" active={roleFilter === 'SAAS_SUPPORT'} onClick={() => setRoleFilter('SAAS_SUPPORT')} />
              </Dropdown>
            </div>
            <span className="px-2.5 py-1 bg-violet-50 dark:bg-violet-500/10 text-violet-600 text-[11px] font-bold rounded-full border border-violet-500/20 whitespace-nowrap">
              {filtered.length} Yönetici
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-200/60 dark:border-white/5">
                <tr>
                  <SortableHeader label="Ad Soyad" column="firstName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Şifreli E-posta (Encrypted in DB)" column="email" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Hiyerarşik SaaS Rolü" column="role" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Durum" column="isActive" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Katılım Tarihi" column="createdAt" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <th className="py-4 px-5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-white/5">
                      <td className="px-5 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex-shrink-0" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-white/10" />
                          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/10" />
                        </div>
                      </td>
                      <td className="px-5 py-3"><div className="h-4 w-40 rounded bg-slate-200 dark:bg-white/10" /></td>
                      <td className="px-5 py-3 text-center"><div className="h-5 w-16 rounded bg-slate-200 dark:bg-white/10 mx-auto" /></td>
                      <td className="px-5 py-3 text-center"><div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-white/10 mx-auto" /></td>
                      <td className="px-5 py-3 text-right"><div className="h-4 w-16 rounded bg-slate-200 dark:bg-white/10 ml-auto" /></td>
                      <td className="px-5 py-3" />
                    </tr>
                  ))
                ) : paginated.map((admin, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-5 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 font-bold">
                        {admin.firstName.charAt(0) + (admin.lastName ? admin.lastName.charAt(0) : '')}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white block">{admin.firstName} {admin.lastName || ''}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">SaaS Administrator</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{admin.email}</span>
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">AES-256-GCM Secure</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${
                        admin.role === 'SAAS_SUPERADMIN' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                        admin.role === 'SAAS_BILLING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                      }`}>
                        {admin.role === 'SAAS_SUPERADMIN' ? 'SUPERADMIN' : admin.role === 'SAAS_BILLING' ? 'BILLING' : 'SUPPORT'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full ${
                        admin.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                      }`}>
                        {admin.isActive ? 'ACTIVE' : 'PASSIVE'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500 text-xs">
                      {new Date(admin.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(admin)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-violet-600 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleAdminStatus(admin)}
                          disabled={admin.role === 'SAAS_SUPERADMIN'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            admin.role === 'SAAS_SUPERADMIN'
                              ? 'opacity-40 cursor-not-allowed text-slate-300'
                              : admin.isActive
                                ? 'hover:bg-red-50 text-slate-400 hover:text-red-600'
                                : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
                          }`}
                          title={admin.role === 'SAAS_SUPERADMIN' ? 'Süper Admin deaktif edilemez' : admin.isActive ? 'Deaktife Et' : 'Aktife Et'}
                        >
                          {admin.isActive ? <X size={14} /> : <Check size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                      {admins.length === 0
                        ? 'Kayıtlı yönetici bulunamadı.'
                        : 'Arama veya filtre kriterlerinde yönetici bulunamadı.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-white/5">
            <span className="text-slate-500 text-[13px]">Toplam <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> kayıt</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10"><ChevronLeft size={16} /></button>
              <span className="px-3 text-[13px] font-bold">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD ADMIN */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Yeni Sistem Yöneticisi Yetkilendir"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Ad</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500"
                placeholder="Özgür"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Soyad</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500"
                placeholder="Çiftçi"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">E-posta (Veritabanında Şifreli Tutulacaktır)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500"
              placeholder="admin@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Hiyerarşik Rol Tanımı</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
              >
                <option value="SAAS_SUPERADMIN">SAAS SUPERADMIN</option>
                <option value="SAAS_BILLING">SAAS BILLING ADMIN</option>
                <option value="SAAS_SUPPORT">SAAS SUPPORT ADMIN</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Giriş Şifresi</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-[12px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleCreateAdmin}
              className="px-4 py-2 text-[12px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              Oluştur ve Yetkilendir
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: EDIT ADMIN */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Sistem Yöneticisini Düzenle"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Ad</label>
              <input
                type="text"
                value={editFormData.firstName}
                onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500"
                placeholder="Özgür"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Soyad</label>
              <input
                type="text"
                value={editFormData.lastName}
                onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500"
                placeholder="Çiftçi"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">E-posta</label>
            <input
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500"
              placeholder="admin@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Hiyerarşik Rol Tanımı</label>
              <select
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                disabled={admins.find(a => a.id === editingAdminId)?.role === 'SAAS_SUPERADMIN'}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="SAAS_SUPERADMIN">SAAS SUPERADMIN</option>
                <option value="SAAS_BILLING">SAAS BILLING ADMIN</option>
                <option value="SAAS_SUPPORT">SAAS SUPPORT ADMIN</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Giriş Şifresi (Değiştirmek istemiyorsanız boş bırakın)</label>
              <input
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={editFormData.isActive}
                disabled={admins.find(a => a.id === editingAdminId)?.role === 'SAAS_SUPERADMIN'}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 accent-violet-600 disabled:opacity-60"
              />
              Aktif Kullanıcı {admins.find(a => a.id === editingAdminId)?.role === 'SAAS_SUPERADMIN' && '(Süper Admin deaktif edilemez)'}
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-[12px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleUpdateAdmin}
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
