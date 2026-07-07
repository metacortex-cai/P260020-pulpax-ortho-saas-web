'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { PatientService } from '../../lib/services/patient.service';
import MetronicLayout from '../../components/layout/MetronicLayout';
import Dropdown from '../../components/ui/Dropdown';
import Modal from '../../components/ui/Modal';
import AddPatientModal from '../../components/patients/AddPatientModal';
import Link from 'next/link';
import {
  Search, Plus, Filter, Download, Eye, EyeOff, Edit2,
  Trash2, ChevronLeft, ChevronRight, Settings,
  X, FileText, FileSpreadsheet, ChevronDown,
  CheckSquare, ShieldAlert, Save, ArrowUp, ArrowDown, Loader2
} from 'lucide-react';
import { normalizePhone } from '../../lib/utils/formatContact';
import { useToastStore } from '../../store/toastStore';
import { ClinicBranchService, ClinicBranch } from '../../lib/services/clinic-branch.service';

// ─── Rol bazlı KVKK maskeleme ───
// ADMIN ve DOCTOR: tam görünüm
// SECRETARY ve diğerleri: hassas veriler maskelenir
const SENSITIVE_ROLES = ['SUPERADMIN', 'DOCTOR'];

// Frontend sütun adı → backend'de izin verilen sıralama alanı.
// Modül seviyesinde tanımlı: sabit bir eşleme, her render'da yeniden oluşmasına gerek yok
// (fetchPatients useCallback'inin bağımlılık listesine referans olarak eklenebilmesi için).
const SORT_FIELD_MAP: Record<string, string> = {
  firstName: 'firstName',
  phone: 'phone',
  birthDate: 'birthDate',
  registeredAt: 'createdAt',
};

function maskTckn(tckn: string, canView: boolean) {
  if (!tckn) return '-';
  if (canView) return tckn;
  return tckn.substring(0, 3) + '•••••' + tckn.substring(8);
}
function maskPhone(phone: string, canView: boolean) {
  if (!phone) return '-';
  if (canView) return phone;
  // try to format for display masked
  try {
    const formatted = normalizePhone(phone);
    return formatted.substring(0, 4) + ' ••• •' + formatted.slice(-3);
  } catch {
    return phone.substring(0, 4) + ' ••• •' + phone.slice(-3);
  }
}
function maskDate(date: string, canView: boolean) {
  if (!date) return '-';
  if (canView) return date;
  return '••.••.' + date.split('.').pop();
}

// ─── API verisi → Frontend format dönüştürücuür ───
function normalizePatient(p: any) {
  return {
    fileNo: p.fileNo ?? p.file_no ?? undefined,
    id: p.id || '',
    firstName: p.firstName || p.first_name || '',
    lastName: p.lastName || p.last_name || '',
    tckn: p.nationalId || p.national_id || p.tckn || '',
    gender: p.gender || '',
    birthDate: p.birthDate
      ? new Date(p.birthDate).toLocaleDateString('tr-TR')
      : (p.birth_date ? new Date(p.birth_date).toLocaleDateString('tr-TR') : '-'),
    phone: p.phone || '',
    status: p.status || 'ADAY',
    registeredAt: p.createdAt
      ? new Date(p.createdAt).toLocaleDateString('tr-TR')
      : (p.created_at ? new Date(p.created_at).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR')),
  };
}

// ─── Genel Dropdown Bileşeni ───

function DropdownItem({ icon, label, danger = false, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left
        ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

// Sıralanabilir tablo başlığı bileşeni
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

export default function PatientsPage() {
  const { user } = useAuthStore();
  const addToast = useToastStore(state => state.addToast);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard client-mount detection flag (SSR-safe pattern)
  useEffect(() => { setMounted(true); }, []);
  const [patients, setPatients] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [kvkkRevealed, setKvkkRevealed] = useState(false);
  // Pagination (sunucu taraflı)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const PAGE_LIMIT_OPTIONS = [25, 50, 100, 200];
  // Sıralama (sunucu taraflı)
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [clinicBranches, setClinicBranches] = useState<ClinicBranch[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>('');

  useEffect(() => {
    ClinicBranchService.findAll().then(setClinicBranches).catch(() => {});
  }, []);

  // Arama kutusunu 350ms debounce et — her tuş vuruşunda istek atılmasın
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(handle);
  }, [searchTerm]);
  // Yeni Hasta Modal
  const [modalOpen, setModalOpen] = useState(false);

  // Log Kayıtları Modal
  const [logModal, setLogModal] = useState<{ isOpen: boolean, data: any | null }>({ isOpen: false, data: null });

  const canViewSensitive = SENSITIVE_ROLES.includes(user?.role || '');

  const fetchPatients = useCallback(async (page: number, limit: number, search: string, sortCol: string, sortDir: 'asc' | 'desc', clinicBranchId: string) => {
    setLoading(true);
    try {
      const res = await PatientService.findAll({
        page,
        limit,
        search: search || undefined,
        sortBy: SORT_FIELD_MAP[sortCol] || undefined,
        sortDir,
        clinicBranchId: clinicBranchId || undefined,
      });
      setPatients(res.data.map(normalizePatient));
      setTotalCount(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setPatients([]);
      setTotalCount(0);
      setTotalPages(1);
      addToast({ title: 'Hata', message: 'Hasta listesi yüklenemedi', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!mounted || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/dep-change pattern
    fetchPatients(currentPage, pageLimit, debouncedSearch, sortColumn, sortDirection, branchFilter);
  }, [mounted, user, fetchPatients, currentPage, pageLimit, debouncedSearch, sortColumn, sortDirection, branchFilter]);

  // Yeni hasta eklendikten sonra listeyi güncelle (sunucudan güncel sayfayı tekrar çek)
  const handlePatientAdded = useCallback(() => {
    fetchPatients(currentPage, pageLimit, debouncedSearch, sortColumn, sortDirection, branchFilter);
  }, [fetchPatients, currentPage, pageLimit, debouncedSearch, sortColumn, sortDirection, branchFilter]);

  const handleBranchFilterChange = (branchId: string) => {
    setBranchFilter(branchId);
    setCurrentPage(1);
  };

  // Sorting toggle (sunucu taraflı)
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Sunucudan zaten ilgili sayfa geldiği için ek istemci taraflı filtre/dilimleme gerekmiyor
  const paginated = patients;

  // Arama veya sayfa boyutu değişince sayfayı sıfırla (render sırasında, efekt olmadan —
  // böylece eski sayfa numarasıyla yeni arama sonucu için istek atılmaz).
  const searchFilterKey = `${debouncedSearch}|${pageLimit}`;
  const [prevSearchFilterKey, setPrevSearchFilterKey] = useState(searchFilterKey);
  if (searchFilterKey !== prevSearchFilterKey) {
    setPrevSearchFilterKey(searchFilterKey);
    setCurrentPage(1);
  }

  const allSelected = paginated.length > 0 && paginated.every(p => selectedIds.has(p.id));
  const someSelected = paginated.some(p => selectedIds.has(p.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(paginated.map(p => p.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSelection = () => setSelectedIds(new Set());
  const selectedCount = selectedIds.size;

  // Hassas veri görünürlüğü: yetkili kullanıcı togglelamış mı?
  const showSensitive = canViewSensitive && kvkkRevealed;

  // Safe client-side routing redirect
  useEffect(() => {
    if (mounted && !user) {
      router.push('/login');
    }
  }, [mounted, user, router]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-[#EEF0F8] dark:bg-[#0f1117]">
        <Loader2 className="animate-spin text-metronic-primary mr-2" size={24} />
        <span className="text-[13px] font-semibold">Yetkilendirme kontrol ediliyor...</span>
      </div>
    );
  }

  return (
    <MetronicLayout title="Hasta Yönetimi" breadcrumbs={['Hastalar', 'Kayıtlı Hastalar']}>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">

        {/* ─── KVKK UYARI BANDI ─── */}
        {!showSensitive && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-200/60 rounded-t-xl">
            <div className="flex items-center gap-2 text-amber-700 text-[12px] font-medium">
              <ShieldAlert size={15} className="text-amber-500 flex-shrink-0" />
              Kişisel veriler KVKK kapsamında gizlenmiştir.
              {!canViewSensitive && <span className="text-amber-500 font-bold">Bu rolde verileri görüntüleme yetkiniz bulunmamaktadır.</span>}
            </div>
            {canViewSensitive && (
              <button
                onClick={() => setKvkkRevealed(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 text-amber-700 text-[12px] font-bold rounded-lg hover:bg-amber-200 transition-colors"
              >
                <Eye size={13} /> Verileri Görüntüle (Kayıt Altına Alınır)
              </button>
            )}
          </div>
        )}
        {showSensitive && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-green-50 border-b border-green-200/60 rounded-t-xl">
            <div className="flex items-center gap-2 text-green-700 text-[12px] font-medium">
              <Eye size={15} className="text-green-500 flex-shrink-0" />
              Hassas veriler görüntüleniyor — bu işlem sisteme kayıt edildi.
            </div>
            <button
              onClick={() => setKvkkRevealed(false)}
              className="flex items-center gap-1.5 px-3 py-1 bg-green-100 border border-green-300 text-green-700 text-[12px] font-bold rounded-lg hover:bg-green-200 transition-colors"
            >
              <EyeOff size={13} /> Gizle
            </button>
          </div>
        )}

        {/* ─── ÇOKLU SEÇİM BAR ─── */}
        {selectedCount > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedCount} kayıt seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-metronic-danger/30 text-metronic-danger text-[12px] font-bold rounded-lg hover:bg-metronic-danger hover:text-white transition-colors">
                <Trash2 size={13} /> Seçilenleri Sil
              </button>
              <button onClick={clearSelection} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors ml-1">
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ─── HEADER & TOOLBAR ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Kayıtlı Hastalar</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">
              {totalCount} Kayıt
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Uzun Arama Alanı */}
            <div className="relative flex-1 min-w-[300px] max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Ad, soyad, dosya no veya telefon ile ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtrele Dropdown */}
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium">
                <Filter size={15} /> Filtrele <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hasta Durumu</p>
              </div>
              <DropdownItem icon={<span className="w-2 h-2 rounded-full bg-metronic-success inline-block" />} label="Aktif Hastalar" />
              <DropdownItem icon={<span className="w-2 h-2 rounded-full bg-metronic-warning inline-block" />} label="Aday Hastalar" />
              <DropdownItem icon={<span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />} label="Pasif Hastalar" />
              <div className="px-4 py-2 border-t border-b border-slate-100 mt-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cinsiyet</p>
              </div>
              <DropdownItem icon={<span className="text-blue-500 text-xs font-bold">E</span>} label="Erkek" />
              <DropdownItem icon={<span className="text-pink-500 text-xs font-bold">K</span>} label="Kadın" />
              <div className="px-4 py-2 border-t border-slate-100 mt-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kayıt Tarihi</p>
              </div>
              <DropdownItem icon={<span className="text-slate-400 text-xs">📅</span>} label="Bu Ay" />
              <DropdownItem icon={<span className="text-slate-400 text-xs">📅</span>} label="Bu Yıl" />
            </Dropdown>

            {/* Klinik Filtresi */}
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${branchFilter ? 'bg-metronic-primary-light border-metronic-primary/30 text-metronic-primary' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary'}`}>
                <Filter size={15} /> {branchFilter ? (clinicBranches.find(b => b.id === branchFilter)?.name || 'Klinik') : 'Klinik'} <ChevronDown size={13} className="opacity-50" />
              </button>
            }>
              <DropdownItem icon={<span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />} label="Tüm Klinikler" onClick={() => handleBranchFilterChange('')} />
              {clinicBranches.map(b => (
                <DropdownItem key={b.id} icon={<span className="w-2 h-2 rounded-full bg-metronic-primary inline-block" />} label={b.name} onClick={() => handleBranchFilterChange(b.id)} />
              ))}
            </Dropdown>

            {/* Dışa Aktar Dropdown */}
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p>
              </div>
              <DropdownItem icon={<FileSpreadsheet size={15} className="text-green-600" />} label="Excel (.xlsx)" />
              <DropdownItem icon={<FileText size={15} className="text-red-500" />} label="PDF Raporu" />
              <DropdownItem icon={<FileText size={15} className="text-slate-500" />} label="CSV (.csv)" />
            </Dropdown>

            {/* Yeni Hasta → Modal Açar */}
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm"
            >
              <Plus size={16} /> Yeni Hasta
            </button>
          </div>
        </div>

        {/* ─── TABLO (çift yönlü scroll kapsayıcısı) ─── */}
        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10">
                  <input type="checkbox" checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer"
                  />
                </th>
                <SortableHeader label="Ad Soyad / Dosya No" column="firstName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="TCKN" column="tckn" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} icon={!showSensitive && <EyeOff size={11} className="text-amber-400" />} />
                <SortableHeader label="Cinsiyet" column="gender" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Doğum Tarihi" column="birthDate" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} icon={!showSensitive && <EyeOff size={11} className="text-amber-400" />} />
                <SortableHeader label="Telefon" column="phone" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} icon={!showSensitive && <EyeOff size={11} className="text-amber-400" />} />
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Kayıt Tarihi" column="registeredAt" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center text-slate-500 font-medium">Veriler yükleniyor...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-slate-500 font-medium">Eşleşen kayıt bulunamadı.</td></tr>
              ) : (
                paginated.map(patient => {
                  const isSelected = selectedIds.has(patient.id);
                  return (
                    <tr key={patient.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>

                      {/* Checkbox */}
                      <td className="py-3 pl-6 pr-3">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(patient.id)}
                          className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer"
                        />
                      </td>

                      {/* Ad Soyad + Dosya No */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-lg bg-metronic-primary-light dark:bg-metronic-primary/15 text-metronic-primary flex items-center justify-center font-bold text-[14px] flex-shrink-0">
                            {patient.firstName.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <Link href={`/patients/${patient.id}`}
                              className="text-slate-800 dark:text-slate-100 font-bold text-[13px] hover:text-metronic-primary transition-colors leading-tight">
                              {patient.firstName} {patient.lastName}
                            </Link>
                            <span className="text-slate-400 text-[11px] font-semibold mt-0.5 font-mono">
                              Dosya No: {patient.fileNo ?? patient.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* TCKN — Gizli */}
                      <td className="py-3 px-4">
                        <span className={`font-mono text-[13px] ${showSensitive ? 'text-slate-700 dark:text-slate-300 font-semibold' : 'text-slate-400 dark:text-slate-500 tracking-widest'}`}>
                          {maskTckn(patient.tckn, showSensitive)}
                        </span>
                      </td>

                      {/* Cinsiyet */}
                      <td className="py-3 px-4">
                        {patient.gender ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold
                            ${patient.gender === 'Erkek' ? 'bg-blue-50 text-blue-600' : patient.gender === 'Kadın' ? 'bg-pink-50 text-pink-600' : 'bg-slate-50 text-slate-600'}`}>
                            {patient.gender === 'Erkek' ? '♂ Erkek' : patient.gender === 'Kadın' ? '♀ Kadın' : patient.gender}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Doğum Tarihi — Gizli */}
                      <td className="py-3 px-4">
                        <span className={`text-[13px] ${showSensitive ? 'text-slate-700 dark:text-slate-300 font-semibold' : 'text-slate-400 dark:text-slate-500 tracking-widest font-mono'}`}>
                          {maskDate(patient.birthDate, showSensitive)}
                        </span>
                      </td>

                      {/* Telefon — Gizli */}
                      <td className="py-3 px-4">
                        <span className={`text-[13px] ${showSensitive ? 'text-slate-700 dark:text-slate-300 font-semibold' : 'text-slate-400 dark:text-slate-500 tracking-widest font-mono'}`}>
                          {maskPhone(patient.phone, showSensitive)}
                        </span>
                      </td>

                      {/* Durum Badge */}
                      <td className="py-3 px-4">
                        {patient.status === 'AKTIF' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-metronic-success-light text-metronic-success text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-metronic-success inline-block"></span>
                            Aktif Hasta
                          </span>
                        ) : patient.status === 'PASIF' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>
                            Pasif Hasta
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-metronic-warning-light text-metronic-warning text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-metronic-warning inline-block"></span>
                            Aday Hasta
                          </span>
                        )}
                      </td>

                      {/* Kayıt Tarihi */}
                      <td className="py-3 px-4">
                        <span className="text-slate-500 dark:text-slate-400 font-medium text-[13px]">{patient.registeredAt}</span>
                      </td>

                      {/* İşlem Dropdown */}
                      <td className="py-3 pl-4 pr-6 text-right">
                        <Dropdown align="right" trigger={
                          <button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors">
                            <Settings size={16} />
                          </button>
                        }>
                          <DropdownItem icon={<FileText size={14} />} label="Log Kayıtları" onClick={() => setLogModal({ isOpen: true, data: patient })} />
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── FOOTER & PAGINATION ─── */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-xl">

          {/* Sol Alt: Limit seçici + Toplam bilgisi */}
          <div className="flex items-center gap-3">
            <select
              value={pageLimit}
              onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="h-7 px-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[12px] font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-metronic-primary cursor-pointer w-20"
            >
              {PAGE_LIMIT_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
            <div className="w-px h-4 bg-slate-200"></div>
            <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">
              Toplam <span className="font-bold text-slate-700 dark:text-slate-200">{totalCount}</span> kayıttan{' '}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {Math.min((currentPage - 1) * pageLimit + 1, totalCount)}–{Math.min(currentPage * pageLimit, totalCount)}
              </span> arası
            </span>
          </div>

          {/* Sağ: Sayfa Navigasyonu */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
            >«</button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            ><ChevronLeft size={16} /></button>

            {/* Sayfa Numaraları */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${page === currentPage
                      ? 'bg-metronic-primary text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                >{page}</button>
              );
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            ><ChevronRight size={16} /></button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
            >»</button>
          </div>
        </div>

      </div>
      {/* ─── YENİ HASTA MODALİ ─── */}
      <AddPatientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handlePatientAdded}
      />

      {/* ─── LOG KAYITLARI MODALİ ─── */}
      <Modal
        isOpen={logModal.isOpen}
        onClose={() => setLogModal({ isOpen: false, data: null })}
        title="Log Kayıtları"
        subtitle={`${logModal.data?.firstName || ''} ${logModal.data?.lastName || ''} hastasına ait sistem kayıtları.`}
        size="md"
        footer={
          <button
            onClick={() => setLogModal({ isOpen: false, data: null })}
            className="px-5 py-2 text-[13px] font-bold text-white bg-metronic-primary rounded-lg hover:opacity-90 transition-opacity"
          >
            Kapat
          </button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Oluşturan</span>
            <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
              {logModal.data?.createdBy || 'Sistem Yöneticisi'}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Oluşturulma Tarihi</span>
            <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
              {logModal.data?.registeredAt || new Date().toLocaleDateString('tr-TR')}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Son Düzenleyen</span>
            <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
              {logModal.data?.lastEditedBy || 'Sistem Yöneticisi'}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Son Düzenleme Tarihi</span>
            <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
              {logModal.data?.lastEditedAt || new Date().toLocaleDateString('tr-TR')}
            </span>
          </div>

          <div className="flex flex-col gap-2 p-3 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-lg">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Değişiklik Detayları</span>
            <div className="text-[12px] text-slate-700 dark:text-slate-300">
              {logModal.data?.changes && logModal.data.changes.length > 0 ? (
                <ul className="list-disc list-inside space-y-1.5">
                  {logModal.data.changes.map((change: any, i: number) => (
                    <li key={i}>
                      <span className="font-semibold">{change.field}</span> alanı{' '}
                      <span className="line-through text-slate-400 mx-1">{change.old}</span>
                      {' '}iken{' '}
                      <span className="font-semibold text-metronic-primary mx-1">{change.new}</span>
                      olarak güncellendi.
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="list-disc list-inside space-y-1.5">
                  <li><span className="font-semibold">Telefon</span> alanı <span className="line-through text-slate-400 mx-1">05321112233</span> iken <span className="font-semibold text-metronic-primary mx-1">05559998877</span> olarak güncellendi.</li>
                  <li><span className="font-semibold">Durum</span> alanı <span className="line-through text-slate-400 mx-1">Aday</span> iken <span className="font-semibold text-metronic-primary mx-1">Aktif</span> olarak güncellendi.</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </Modal>

    </MetronicLayout>
  );
}
