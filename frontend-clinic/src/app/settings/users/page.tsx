'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import InfoTooltip from '../../../components/ui/InfoTooltip';
import Dropdown from '../../../components/ui/Dropdown';
import { UserService } from '../../../lib/services/user.service';
import { useToastStore } from '../../../store/toastStore';
import {
  Search, Filter, Plus, Save, CheckCircle2, XCircle, Copy, Edit2, Trash2,
  Users, UserPlus, ShieldCheck, Key, Mail, Phone, Building2, CheckSquare, X, ChevronDown, Check, UserCheck, UserX, UserSquare2,
  ArrowUp, ArrowDown, Download, FileSpreadsheet, ChevronLeft, ChevronRight, Crown
} from 'lucide-react';

const ROLES_LIST: Array<{ id: string; name: string; desc: string }> = [
  { id: 'R-01', name: 'Sistem Yöneticisi (Admin)', desc: 'Tüm modüllere ve hassas verilere tam erişim.' },
  { id: 'R-02', name: 'Sorumlu Hekim', desc: 'Klinik süreçler, randevu ve kendi hastalarına yetkili.' },
  { id: 'R-03', name: 'Resepsiyon & Banko', desc: 'Hasta karşılama, randevu takvimi ve temel tahsilat.' },
  { id: 'R-04', name: 'Stajyer / Asistan', desc: 'Yalnızca temel randevu ve hasta listesi görüntüleme.' },
];

const mapBackendRoleToUI = (role: string): string => {
  switch (role) {
    case 'SUPERADMIN':
    case 'ADMIN':
      return 'Sistem Yöneticisi (Admin)';
    case 'DOCTOR':
      return 'Sorumlu Hekim';
    case 'RECEPTION':
      return 'Resepsiyon & Banko';
    case 'ASSISTANT':
      return 'Stajyer / Asistan';
    default:
      return 'Stajyer / Asistan';
  }
};

const mapUIRoleToBackend = (uiRole: string): string => {
  switch (uiRole) {
    case 'Sistem Yöneticisi (Admin)':
      return 'ADMIN';
    case 'Sorumlu Hekim':
      return 'DOCTOR';
    case 'Resepsiyon & Banko':
      return 'RECEPTION';
    case 'Stajyer / Asistan':
      return 'ASSISTANT';
    default:
      return 'ASSISTANT';
  }
};

// Helper Dropdown

function DropdownItem({ icon, label, danger = false, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

function FilterItem({ icon, label, active = false, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'text-metronic-primary bg-metronic-primary-light font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon && <span>{icon}</span>}{label}{active && <Check size={13} className="ml-auto text-metronic-primary" />}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void }) {
  const isActive = sortColumn === column;
  return (
    <th onClick={() => onSort(column)} className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors select-none">
      <div className="flex items-center gap-1.5">
        {label}
        {isActive ? (sortDirection === 'asc' ? <ArrowUp size={13} className="text-metronic-primary" /> : <ArrowDown size={13} className="text-metronic-primary" />) : null}
      </div>
    </th>
  );
}

const ROLE_BADGE_MAP: Record<string, { cls: string; icon: React.ReactNode }> = {
  'Sistem Yöneticisi (Admin)': { cls: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20', icon: <ShieldCheck size={13} /> },
  'Sorumlu Hekim': { cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', icon: <UserCheck size={13} /> },
  'Resepsiyon & Banko': { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20', icon: <Users size={13} /> },
  'Muhasebe Uzmanı': { cls: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20', icon: <Building2 size={13} /> },
  'Stajyer / Asistan': { cls: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 border-slate-200 dark:border-white/10', icon: <UserSquare2 size={13} /> },
};

export default function UsersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100];

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Bulk Role Modal State
  const [bulkRoleModalOpen, setBulkRoleModalOpen] = useState(false);
  const [selectedBulkRole, setSelectedBulkRole] = useState('');

  // Delete Confirmation State
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ id: string; name: string } | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Sistem Yöneticiliği Devretme State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const { addToast } = useToastStore();

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Sorumlu Hekim',
    title: '',
    status: 'AKTİF',
    password: '',
    sendEmail: true
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const apiUsers = (await UserService.findAll(true)).map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone || '',
        role: mapBackendRoleToUI(u.role),
        rawRole: u.role,
        title: u.title || (u.role === 'DOCTOR' ? 'Diş Hekimi' : 'Klinik Personeli'),
        status: u.isActive ? 'AKTİF' : 'PASİF',
        isSystemAdmin: u.isSystemAdmin,
        lastLogin: 'Giriş bilgisi yok',
        avatar: u.firstName.charAt(0).toUpperCase(),
        color: 'bg-metronic-primary/10 text-metronic-primary border-metronic-primary/20'
      }));
      setUsers(apiUsers);
    } catch (err) {
      console.error('Failed to fetch users', err);
      // Fallback
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard client-mount detection flag (avoids SSR/hydration mismatch)
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchUsers();
  }, [mounted, user, router]);

  // Reset to page 1 whenever the filters or page size change (pure derivation, no async work).
  const filterKey = `${searchTerm}|${filterRole}|${filterStatus}|${pageLimit}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  const filteredUsers = users.filter(u => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const matchSearch = fullName.includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()) || u.phone.includes(searchTerm);
    const matchRole = filterRole ? u.role === filterRole : true;
    const matchStatus = filterStatus ? u.status === filterStatus : true;
    return matchSearch && matchRole && matchStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal: string, bVal: string;
    if (sortColumn === 'fullName') { aVal = `${a.firstName} ${a.lastName}`; bVal = `${b.firstName} ${b.lastName}`; }
    else { aVal = (a as any)[sortColumn] ?? ''; bVal = (b as any)[sortColumn] ?? ''; }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageLimit));
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));
  const someSelected = filteredUsers.some(u => selectedIds.has(u.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(filteredUsers.map(u => u.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const activeUsersCount = users.filter(u => u.status === 'AKTİF').length;
  const adminUsersCount = users.filter(u => u.role === 'Sistem Yöneticisi (Admin)').length;

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingUserId(null);
    setFormData({
      firstName: '', lastName: '', email: '', phone: '', role: ROLES_LIST[1]?.name ?? '', title: '', status: 'AKTİF', password: Math.random().toString(36).slice(-8), sendEmail: true
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (uObj: any) => {
    setModalMode('edit');
    setEditingUserId(uObj.id);
    setFormData({
      firstName: uObj.firstName, lastName: uObj.lastName, email: uObj.email, phone: uObj.phone, role: uObj.role, title: uObj.title, status: uObj.status, password: '', sendEmail: false
    });
    setModalOpen(true);
  };

  // Save User
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: mapUIRoleToBackend(formData.role),
        title: formData.title,
      };

      if (modalMode === 'create') {
        await UserService.create({
          ...payload,
          password: formData.password || 'TemporaryPass123!',
        });
      } else if (editingUserId) {
        await UserService.update(editingUserId, {
          ...payload,
          isActive: formData.status === 'AKTİF'
        });
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'İşlem başarısız oldu.');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (id: string, name: string) => {
    try {
      await UserService.deactivate(id, 'Yönetici Silme İşlemi');
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Silme işlemi başarısız.');
    } finally {
      setDeleteUserTarget(null);
    }
  };

  // Toggle Single Status
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      if (currentStatus === 'AKTİF') {
        await UserService.deactivate(id, 'Yönetici Pasif Hale Getirdi');
      } else {
        await UserService.reactivate(id);
      }
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Durum güncellenemedi.');
    }
  };

  // Bulk Actions
  const handleBulkActivate = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map(id => UserService.reactivate(id)));
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err) {
      alert('Bazı kullanıcılar güncellenemedi.');
    }
  };

  const handleBulkDeactivate = async () => {
    const hasProtected = Array.from(selectedIds).some(id => {
      const u = users.find(u => u.id === id);
      return u?.rawRole === 'SUPERADMIN' || u?.isSystemAdmin;
    });
    if (hasProtected) {
      alert('Toplu seçim içerisinde Süper Admin veya Sistem Yöneticisi bulunmaktadır. Bu hesaplar deaktif edilemez.');
      return;
    }
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => UserService.deactivate(id, 'Toplu Pasif Yapma'))
      );
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err) {
      alert('Bazı kullanıcılar güncellenemedi.');
    }
  };

  const handleBulkDelete = async () => {
    const hasProtected = Array.from(selectedIds).some(id => {
      const u = users.find(u => u.id === id);
      return u?.rawRole === 'SUPERADMIN' || u?.isSystemAdmin;
    });
    if (hasProtected) {
      alert('Toplu seçim içerisinde Süper Admin veya Sistem Yöneticisi bulunmaktadır. Bu hesaplar silinemez.');
      return;
    }
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => UserService.deactivate(id, 'Toplu Silme'))
      );
      setSelectedIds(new Set());
      fetchUsers();
    } catch (err) {
      alert('Bazı kullanıcılar silinemedi.');
    } finally {
      setBulkDeleteConfirmOpen(false);
    }
  };

  const handleSaveBulkRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBulkRole) return;
    const hasSuperadmin = Array.from(selectedIds).some(id => users.find(u => u.id === id)?.rawRole === 'SUPERADMIN');
    if (hasSuperadmin) {
      alert('Toplu seçim içerisinde Süper Admin bulunmaktadır. Süper Admin yetki grubu toplu olarak değiştirilemez.');
      return;
    }
    try {
      const backendRole = mapUIRoleToBackend(selectedBulkRole);
      await Promise.all(
        Array.from(selectedIds).map(id => UserService.update(id, { role: backendRole }))
      );
      setBulkRoleModalOpen(false);
      setSelectedIds(new Set());
      fetchUsers();
      alert(`Seçili kullanıcıların yetki grubu "${selectedBulkRole}" olarak güncellendi.`);
    } catch (err) {
      alert('Yetkiler güncellenirken hata oluştu.');
    }
  };

  const handleResetPassword = (email: string) => {
    alert(`"${email}" adresine şifre sıfırlama bağlantısı gönderildi.`);
  };

  const handleTransferSystemAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetId) return;
    setTransferLoading(true);
    try {
      await UserService.transferSystemAdmin(transferTargetId);
      setTransferModalOpen(false);
      setTransferTargetId('');
      await fetchUsers();
      addToast({ type: 'success', message: 'Sistem Yöneticiliği başarıyla devredildi.' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Devir işlemi başarısız oldu.' });
    } finally {
      setTransferLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) { setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortColumn(column); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const BOM = '﻿';
    const headers = ['ID', 'Ad', 'Soyad', 'E-posta', 'Telefon', 'Unvan', 'Rol', 'Durum', 'Son Giriş'];
    const rows = sortedUsers.map(u => [u.id, u.firstName, u.lastName, u.email, u.phone, u.title, u.role, u.status, u.lastLogin]);
    const csv = BOM + [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'kullanicilar.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedRoleObj = ROLES_LIST.find(r => r.name === formData.role);
  const isEditingSuperadmin = modalMode === 'edit' && users.find(u => u.id === editingUserId)?.rawRole === 'SUPERADMIN';

  return (
    <MetronicLayout
      title="Kullanıcılar & Personel Erişim Yönetimi"
      breadcrumbs={['Ayarlar', 'Kullanıcılar']}
      infoTooltip={
        <InfoTooltip 
          title="Kullanıcı ve Yetki Atama"
          description="Sistemdeki tüm kullanıcıları listeyebilir, unvanlarını belirleyebilir og tanımlı yetki gruplarını atayarak hangi modüllere erişebileceklerini kontrol edebilirsiniz."
        />
      }
    >
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Toplam Kullanıcı', value: `${users.length} Kullanıcı`, icon: <Users size={20} />, color: 'text-metronic-primary', bg: 'bg-metronic-primary-light dark:bg-metronic-primary/10' },
          { label: 'Aktif Kullanıcılar', value: `${activeUsersCount} Kullanıcı`, icon: <CheckCircle2 size={20} />, color: 'text-metronic-success', bg: 'bg-metronic-success-light dark:bg-metronic-success/10' },
          { label: 'Sistem Yöneticileri', value: `${adminUsersCount} Yönetici`, icon: <ShieldCheck size={20} />, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' },
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

      {/* Main Card */}
      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">
        
        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20 animate-[fadeInDown_0.2s_ease]">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} kullanıcı seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setBulkRoleModalOpen(true)} className="h-8 px-3 bg-white border border-metronic-primary/30 text-metronic-primary text-[12px] font-bold rounded-lg hover:bg-metronic-primary hover:text-white transition-all shadow-sm flex items-center gap-1.5">
                <ShieldCheck size={14} /> Yetki Grubunu Değiştir
              </button>
              <button onClick={handleBulkActivate} className="h-8 px-3 bg-white border border-metronic-success/30 text-metronic-success text-[12px] font-bold rounded-lg hover:bg-metronic-success hover:text-white transition-all shadow-sm flex items-center gap-1.5">
                <UserCheck size={14} /> Aktif Yap
              </button>
              <button onClick={handleBulkDeactivate} className="h-8 px-3 bg-white border border-metronic-danger/30 text-metronic-danger text-[12px] font-bold rounded-lg hover:bg-metronic-danger hover:text-white transition-all shadow-sm flex items-center gap-1.5">
                <UserX size={14} /> Pasif Yap
              </button>
              <button onClick={() => setBulkDeleteConfirmOpen(true)} className="h-8 px-3 bg-white border border-slate-200 text-slate-600 text-[12px] font-bold rounded-lg hover:bg-slate-50 transition-all shadow-sm">
                Sil
              </button>
              <div className="w-px h-5 bg-metronic-primary/20 mx-1" />
              <button onClick={() => setSelectedIds(new Set())} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors shadow-sm"><X size={16} /></button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Sistem Kullanıcıları</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filteredUsers.length} Kayıt</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input type="text" placeholder="Ad, e-posta veya telefon ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>

            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><Filter size={15} /> {filterRole || 'Tüm Roller'} <ChevronDown size={13} className="text-slate-400" /></button>}>
              <FilterItem icon={<ShieldCheck size={14} />} label="Tüm Roller" active={filterRole === ''} onClick={() => setFilterRole('')} />
              <div className="border-t border-slate-100 dark:border-white/5 my-1" />
              {ROLES_LIST.map(r => <FilterItem key={r.id} icon={<ShieldCheck size={14} className="text-metronic-primary" />} label={r.name} active={filterRole === r.name} onClick={() => setFilterRole(r.name)} />)}
            </Dropdown>

            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><Filter size={15} /> {filterStatus || 'Tüm Durumlar'} <ChevronDown size={13} className="text-slate-400" /></button>}>
              <FilterItem icon={<CheckCircle2 size={14} />} label="Tüm Durumlar" active={filterStatus === ''} onClick={() => setFilterStatus('')} />
              <FilterItem icon={<CheckCircle2 size={14} className="text-metronic-success" />} label="Aktif Kullanıcılar" active={filterStatus === 'AKTİF'} onClick={() => setFilterStatus('AKTİF')} />
              <FilterItem icon={<XCircle size={14} className="text-slate-400" />} label="Pasif Kullanıcılar" active={filterStatus === 'PASİF'} onClick={() => setFilterStatus('PASİF')} />
            </Dropdown>

            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" /></button>}>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p></div>
              <DropdownItem icon={<FileSpreadsheet size={15} className="text-green-600" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>

            <button onClick={handleOpenCreate} className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm">
              <UserPlus size={16} /> Yeni Kullanıcı Ekle
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10"><input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></th>
                <SortableHeader label="Kullanıcı & İletişim" column="fullName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Unvan / Görev" column="title" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Atanan Yetki Grubu" column="role" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Son Giriş" column="lastLogin" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Yükleniyor...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Eşleşen kullanıcı bulunamadı.</td></tr>
              ) : paginatedUsers.map((u, i) => {
                const isSelected = selectedIds.has(u.id);
                const roleBadge = ROLE_BADGE_MAP[u.role] || { cls: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 border-slate-200 dark:border-white/10', icon: <ShieldCheck size={13} /> };
                const isBottom = i >= paginatedUsers.length - 2 && paginatedUsers.length > 3;

                return (
                  <tr key={u.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                    <td className="py-3.5 pl-6 pr-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(u.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[15px] border flex-shrink-0 ${u.color || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {u.avatar}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-slate-800 dark:text-slate-100 font-bold text-[14px] truncate">{u.firstName} {u.lastName}</span>
                          <span className="text-slate-400 text-[12px] flex items-center gap-3 mt-0.5 truncate font-medium">
                            <span className="flex items-center gap-1 no-capitalize"><Mail size={12} /> {u.email}</span>
                            <span className="flex items-center gap-1"><Phone size={12} /> {u.phone}</span>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-700 dark:text-slate-200 font-bold text-[13px] block">{u.title}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-bold border ${roleBadge.cls}`}>
                          {roleBadge.icon} {u.role}
                        </span>
                        {u.isSystemAdmin && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20">
                            <Crown size={12} /> Sistem Yöneticisi
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-500 dark:text-slate-400 text-[12px] font-medium">{u.lastLogin}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${u.status === 'AKTİF' ? 'bg-metronic-success-light text-metronic-success dark:bg-metronic-success/10' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'}`}>
                        {u.status === 'AKTİF' ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 pr-6 text-right">
                      <Dropdown align="right" openUp={isBottom} trigger={<button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10 shadow-sm"><Edit2 size={16} /></button>}>
                        <DropdownItem icon={<Edit2 size={14} className="text-metronic-primary" />} label="Kullanıcıyı Düzenle" onClick={() => handleOpenEdit(u)} />
                        {u.isSystemAdmin && u.id === user?.id && (
                          <DropdownItem icon={<Crown size={14} className="text-amber-500" />} label="Sistem Yöneticiliğini Devret" onClick={() => setTransferModalOpen(true)} />
                        )}
                        {u.rawRole !== 'SUPERADMIN' && !u.isSystemAdmin && (
                          <>
                            {u.status === 'PASİF' ? (
                              <DropdownItem icon={<CheckCircle2 size={14} className="text-metronic-success" />} label="Aktif Yap" onClick={() => handleToggleStatus(u.id, u.status)} />
                            ) : (
                              <DropdownItem icon={<XCircle size={14} className="text-slate-400" />} label="Pasif Yap" onClick={() => handleToggleStatus(u.id, u.status)} />
                            )}
                            <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                          </>
                        )}
                        <DropdownItem icon={<Key size={14} />} label="Şifre Sıfırlama Bağlantısı Gönder" onClick={() => handleResetPassword(u.email)} />
                        {u.rawRole !== 'SUPERADMIN' && !u.isSystemAdmin && (
                          <>
                            <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                            <DropdownItem icon={<Trash2 size={14} />} danger label="Kullanıcıyı Sil" onClick={() => setDeleteUserTarget({ id: u.id, name: `${u.firstName} ${u.lastName}` })} />
                          </>
                        )}
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-xl">
          <div className="flex items-center gap-3">
            <select value={pageLimit} onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }} className="h-7 px-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[12px] font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-metronic-primary cursor-pointer w-20">
              {PAGE_LIMIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
            <div className="w-px h-4 bg-slate-200 dark:bg-white/10"></div>
            <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">
              <span className="font-bold text-slate-700 dark:text-slate-200">{sortedUsers.length === 0 ? 0 : Math.min((currentPage - 1) * pageLimit + 1, sortedUsers.length)}–{Math.min(currentPage * pageLimit, sortedUsers.length)}</span>{' / '}<span className="font-bold text-slate-700 dark:text-slate-200">{sortedUsers.length}</span> kayıt
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${page === currentPage ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>{page}</button>
              );
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>

      {/* USER CREATE / EDIT MODAL */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={modalMode === 'create' ? 'Yeni Sistem Kullanıcısı Ekle' : `Kullanıcı Düzenle — ${formData.firstName} ${formData.lastName}`}
        subtitle="Kullanıcının kişisel bilgilerini, unvanını ve erişim yetki grubunu belirleyin."
        size="lg"
        footer={
          <div className="w-full flex items-center justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button form="user-form" type="submit" disabled={formLoading} className="flex items-center gap-2 px-6 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70 shadow-sm">
              {formLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
              {formLoading ? 'Kaydediliyor...' : 'Kullanıcıyı Kaydet'}
            </button>
          </div>
        }
      >
        <form id="user-form" onSubmit={handleSaveUser} className="space-y-5 py-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ad <span className="text-metronic-danger">*</span></label>
              <input required type="text" placeholder="Örn: Ahmet" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Soyad <span className="text-metronic-danger">*</span></label>
              <input required type="text" placeholder="Örn: Yılmaz" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="m-input" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">E-posta Adresi <span className="text-metronic-danger">*</span></label>
              <input required type="email" placeholder="Örn: ahmet.yilmaz@pulpax.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Telefon Numarası</label>
              <input type="text" placeholder="Örn: +90 532 111 2233" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="m-input" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Unvan / Görev Tanımı <span className="text-metronic-danger">*</span></label>
              <input required type="text" placeholder="Örn: Uzman Diş Hekimi, Finans Uzmanı" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kullanıcı Durumu</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({ ...formData, status: e.target.value })} 
                disabled={isEditingSuperadmin}
                className="m-input disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="AKTİF">AKTİF</option>
                <option value="PASİF">PASİF</option>
              </select>
            </div>
          </div>

          {/* Role Selection & Description Box */}
          <div className="flex flex-col gap-1.5 border border-slate-200 dark:border-white/10 rounded-xl p-4 bg-slate-50 dark:bg-white/[0.02]">
            <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-metronic-primary" /> Atanacak Yetki Grubu (Rol) <span className="text-metronic-danger">*</span>
            </label>
            <select 
              required 
              value={formData.role} 
              onChange={e => setFormData({ ...formData, role: e.target.value })} 
              disabled={isEditingSuperadmin}
              className="m-input bg-white dark:bg-[#1c1f2e] mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {ROLES_LIST.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
            {selectedRoleObj && (
              <p className="text-[11.5px] text-slate-500 mt-2 leading-relaxed flex items-center gap-1.5 bg-white dark:bg-white/5 p-2.5 rounded-lg border border-slate-200/60 dark:border-white/5">
                <span className="font-bold text-metronic-primary flex-shrink-0">Yetki Özeti:</span> {selectedRoleObj.desc}
              </p>
            )}
          </div>

          {/* Password & Notification Settings (Only for Create Mode) */}
          {modalMode === 'create' && (
            <div className="border border-slate-200 dark:border-white/10 rounded-xl p-4 bg-slate-50 dark:bg-white/[0.02] space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={16} className="text-metronic-primary" /> Geçici Şifre Belirleme
                </label>
                <input type="text" placeholder="Geçici şifre" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="m-input bg-white dark:bg-[#1c1f2e] font-mono text-metronic-primary font-bold" />
                <span className="text-[11px] text-slate-400">Sistem otomatik olarak güvenli bir geçici şifre oluşturdu, dilerseniz değiştirebilirsiniz.</span>
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
                <input id="send-email" type="checkbox" checked={formData.sendEmail} onChange={e => setFormData({ ...formData, sendEmail: e.target.checked })} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" />
                <label htmlFor="send-email" className="text-[12.5px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Kullanıcıya hoş geldin e-postası ve giriş bilgileri gönderilsin
                </label>
              </div>
            </div>
          )}

        </form>
      </Modal>

      {/* BULK ROLE ASSIGNMENT MODAL */}
      <Modal 
        isOpen={bulkRoleModalOpen} 
        onClose={() => setBulkRoleModalOpen(false)} 
        title="Toplu Yetki Grubu Ataması" 
        subtitle={`Seçili ${selectedIds.size} kullanıcının yetki grubunu tek seferde güncelleyin.`}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setBulkRoleModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button form="bulk-role-form" type="submit" className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"><Save size={15} />Yetkileri Güncelle</button>
          </>
        }
      >
        <form id="bulk-role-form" onSubmit={handleSaveBulkRole} className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Atanacak Yeni Yetki Grubu <span className="text-metronic-danger">*</span></label>
            <select required value={selectedBulkRole} onChange={e => setSelectedBulkRole(e.target.value)} className="m-input mt-1">
              <option value="">Yetki Grubu Seçiniz...</option>
              {ROLES_LIST.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>
          <p className="text-[11.5px] text-slate-500 leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-200 dark:border-white/10">
            Seçtiğiniz yetki grubu, işaretlenen tüm kullanıcıların mevcut rollerinin yerine geçecektir. Kullanıcılar bir sonraki girişlerinde yeni yetkileriyle sisteme erişeceklerdir.
          </p>
        </form>
      </Modal>

      {/* SİSTEM YÖNETİCİLİĞİNİ DEVRET MODAL */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Sistem Yöneticiliğini Devret"
        subtitle="Sistem Yöneticisi hesabı silinemez/deaktif edilemez; yetkiyi başka bir kullanıcıya devredebilirsiniz."
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setTransferModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button form="transfer-admin-form" type="submit" disabled={transferLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70 shadow-sm">
              <Crown size={15} />{transferLoading ? 'Devrediliyor...' : 'Yetkiyi Devret'}
            </button>
          </>
        }
      >
        <form id="transfer-admin-form" onSubmit={handleTransferSystemAdmin} className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Yeni Sistem Yöneticisi <span className="text-metronic-danger">*</span></label>
            <select required value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)} className="m-input mt-1">
              <option value="">Kullanıcı Seçiniz...</option>
              {users.filter(u => u.status === 'AKTİF' && !u.isSystemAdmin).map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
              ))}
            </select>
          </div>
          <p className="text-[11.5px] text-slate-500 leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-200 dark:border-white/10">
            Seçtiğiniz kullanıcı henüz Admin değilse otomatik olarak Admin rolüne yükseltilecek ve Sistem Yöneticisi yetkisi bu hesaba taşınacaktır. Bu işlemden sonra mevcut hesabınız normal şekilde deaktif edilebilir hale gelir.
          </p>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteUserTarget}
        onClose={() => setDeleteUserTarget(null)}
        onConfirm={() => deleteUserTarget && handleDeleteUser(deleteUserTarget.id, deleteUserTarget.name)}
        title="Kullanıcıyı Sil"
        message={`"${deleteUserTarget?.name}" adlı kullanıcıyı silmek (pasif hale getirmek) istediğinize emin misiniz?`}
      />

      <ConfirmModal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title="Kullanıcıları Sil"
        message={`Seçili ${selectedIds.size} kullanıcıyı pasif hale getirmek istediğinize emin misiniz?`}
      />
    </MetronicLayout>
  );
}
