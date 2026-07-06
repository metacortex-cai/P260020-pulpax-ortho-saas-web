'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import Modal from '../../../components/ui/Modal';
import { SettingsService, AuditLog } from '../../../lib/services/settings.service';
import {
  Search, Filter, Download, Eye, Check,
  ChevronLeft, ChevronRight, Settings,
  X, FileText, FileSpreadsheet, ChevronDown,
  ArrowUp, ArrowDown, Activity,
  Users, Calendar, CreditCard, LayoutDashboard
} from 'lucide-react';

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

function FilterItem({ icon, label, active = false, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'text-metronic-primary bg-metronic-primary-light font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon && <span>{icon}</span>}{label}{active && <Check size={13} className="ml-auto text-metronic-primary" />}
    </button>
  );
}

// ─── Sıralanabilir Tablo Başlığı ───
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

const MODULE_ICONS: Record<string, any> = {
  'Hasta İşlemleri': Users,
  'Randevu': Calendar,
  'Finans': CreditCard,
  'Ayarlar': Settings,
};

const ACTION_COLORS: Record<string, string> = {
  'CREATE': 'bg-metronic-success-light text-metronic-success',
  'UPDATE': 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  'DELETE': 'bg-metronic-danger-light text-metronic-danger',
  'LOGIN': 'bg-purple-50 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
};

const ACTION_LABELS: Record<string, string> = {
  'CREATE': 'Ekleme',
  'UPDATE': 'Güncelleme',
  'DELETE': 'Silme',
  'LOGIN': 'Giriş/Yetki',
};

export default function AuditLogsPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const router = useRouter();

  // Data state — no mock data; always loaded from API
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('Tümü');
  const [selectedDate, setSelectedDate] = useState('Tümü');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100];

  // Sorting (client-side on current page)
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Detail modal
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; log: AuditLog | null }>({ isOpen: false, log: null });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
  }, [user, router]);

  // Debounce search and reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch audit logs from real API whenever filters or page changes
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await SettingsService.getAuditLogs({
          page: currentPage,
          limit: pageLimit,
          search: debouncedSearch,
          module: selectedModule,
          dateRange: selectedDate,
        });
        if (!cancelled) {
          setLogs(result.data);
          setTotal(result.total);
        }
      } catch {
        if (!cancelled) {
          addToast({ type: 'error', title: 'Hata', message: 'Sistem hareketleri yüklenemedi.' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [user, currentPage, pageLimit, debouncedSearch, selectedModule, selectedDate, addToast]);

  // Client-side sort on the current page data returned by the server
  const getSortedData = () => {
    if (!sortColumn) return logs;
    return [...logs].sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      if (sortColumn === 'userName') { aVal = a.user.name; bVal = b.user.name; }
      else if (sortColumn === 'timestamp') { aVal = a.timestamp; bVal = b.timestamp; }
      else if (sortColumn === 'module') { aVal = a.module; bVal = b.module; }
      else if (sortColumn === 'actionType') { aVal = a.actionType; bVal = b.actionType; }
      else if (sortColumn === 'ipAddress') { aVal = a.ipAddress; bVal = b.ipAddress; }
      else { aVal = a[sortColumn]; bVal = b[sortColumn]; }

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
  };

  const handleSetModule = (mod: string) => {
    setSelectedModule(mod);
    setCurrentPage(1);
  };

  const handleSetDate = (date: string) => {
    setSelectedDate(date);
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const BOM = '﻿';
    const headers = ['Log ID', 'Tarih & Saat', 'Kullanıcı', 'Rol', 'Modül', 'İşlem Tipi', 'Açıklama', 'IP Adresi'];
    const rows = sortedData.map(log => [
      log.id, log.timestamp, log.user.name, log.user.role,
      log.module, ACTION_LABELS[log.actionType] || log.actionType,
      log.description, log.ipAddress
    ]);
    const csv = BOM + [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sistem-hareketleri.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Pagination uses total from server
  const totalPages = Math.max(1, Math.ceil(total / pageLimit));

  if (!user) return null;

  return (
    <MetronicLayout title="Sistem Hareketleri" breadcrumbs={['Ayarlar', 'Sistem Hareketleri']}>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">

        {/* ─── HEADER & TOOLBAR ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Sistem Hareketleri</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">
              {loading ? '...' : `${total} Kayıt`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Arama */}
            <div className="relative flex-1 min-w-[300px] max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Kullanıcı, işlem detayı veya log no ile ara..."
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
                <Filter size={15} /> {selectedModule !== 'Tümü' ? selectedModule : 'Filtrele'} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Modül</p>
              </div>
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-metronic-primary inline-block"/>} label="Tüm Modüller" active={selectedModule === 'Tümü'} onClick={() => handleSetModule('Tümü')} />
              <FilterItem icon={<Users size={14} className="text-blue-500" />} label="Hasta İşlemleri" active={selectedModule === 'Hasta İşlemleri'} onClick={() => handleSetModule('Hasta İşlemleri')} />
              <FilterItem icon={<Calendar size={14} className="text-purple-500" />} label="Randevu" active={selectedModule === 'Randevu'} onClick={() => handleSetModule('Randevu')} />
              <FilterItem icon={<CreditCard size={14} className="text-emerald-500" />} label="Finans" active={selectedModule === 'Finans'} onClick={() => handleSetModule('Finans')} />
              <FilterItem icon={<Settings size={14} className="text-slate-500" />} label="Ayarlar" active={selectedModule === 'Ayarlar'} onClick={() => handleSetModule('Ayarlar')} />
              <div className="px-4 py-2 border-t border-b border-slate-100 dark:border-white/5 mt-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tarih Aralığı</p>
              </div>
              <FilterItem icon={<span className="text-slate-400 text-xs">📅</span>} label="Bugün" active={selectedDate === 'Bugün'} onClick={() => handleSetDate('Bugün')} />
              <FilterItem icon={<span className="text-slate-400 text-xs">📅</span>} label="Dün" active={selectedDate === 'Dün'} onClick={() => handleSetDate('Dün')} />
              <FilterItem icon={<span className="text-slate-400 text-xs">📅</span>} label="Son 7 Gün" active={selectedDate === 'Son 7 Gün'} onClick={() => handleSetDate('Son 7 Gün')} />
              <FilterItem icon={<span className="text-slate-400 text-xs">📅</span>} label="Bu Ay" active={selectedDate === 'Bu Ay'} onClick={() => handleSetDate('Bu Ay')} />
            </Dropdown>

            {/* Dışa Aktar Dropdown */}
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p>
              </div>
              <DropdownItem icon={<FileSpreadsheet size={15} className="text-green-600" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>
          </div>
        </div>

        {/* ─── TABLO ─── */}
        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <SortableHeader label="Tarih & Saat" column="timestamp" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Kullanıcı" column="userName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Modül" column="module" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="İşlem Tipi" column="actionType" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Açıklama</th>
                <SortableHeader label="IP Adresi" column="ipAddress" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500 font-medium">
                      <span className="w-5 h-5 border-2 border-metronic-primary border-t-transparent rounded-full animate-spin" />
                      Yükleniyor...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Eşleşen kayıt bulunamadı.</td></tr>
              ) : (
                sortedData.map(log => {
                  const ModuleIcon = MODULE_ICONS[log.module] || LayoutDashboard;
                  return (
                    <tr key={log.id} className="transition-colors group hover:bg-slate-50 dark:hover:bg-white/[0.02]">

                      {/* Tarih & Saat */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-slate-800 dark:text-slate-100 font-bold text-[13px] leading-tight">
                            {log.timestamp.split(' ')[0]}
                          </span>
                          <span className="text-slate-400 text-[11px] font-semibold mt-0.5 font-mono">
                            {log.timestamp.split(' ')[1]}
                          </span>
                        </div>
                      </td>

                      {/* Kullanıcı */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-lg bg-metronic-primary-light dark:bg-metronic-primary/15 text-metronic-primary flex items-center justify-center font-bold text-[14px] flex-shrink-0">
                            {log.user.avatar.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-800 dark:text-slate-100 font-bold text-[13px] leading-tight">
                              {log.user.name}
                            </span>
                            <span className="text-slate-400 text-[11px] font-semibold mt-0.5">
                              {log.user.role}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Modül */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                          <ModuleIcon size={13} className="text-metronic-primary" />
                          {log.module}
                        </span>
                      </td>

                      {/* İşlem Tipi */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${ACTION_COLORS[log.actionType]}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current inline-block"></span>
                          {ACTION_LABELS[log.actionType]}
                        </span>
                      </td>

                      {/* Açıklama */}
                      <td className="py-3 px-4">
                        <span className="text-slate-700 dark:text-slate-300 text-[13px] font-medium line-clamp-2" title={log.description}>
                          {log.description}
                        </span>
                      </td>

                      {/* IP Adresi */}
                      <td className="py-3 px-4">
                        <span className="text-slate-500 dark:text-slate-400 font-mono text-[13px] font-medium">{log.ipAddress}</span>
                      </td>

                      {/* İşlem Dropdown */}
                      <td className="py-3 pl-4 pr-6 text-right">
                        <Dropdown align="right" trigger={
                          <button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors">
                            <Settings size={16} />
                          </button>
                        }>
                          <DropdownItem
                            icon={<Eye size={14} />}
                            label="Detay Görüntüle"
                            onClick={() => setDetailModal({ isOpen: true, log })}
                          />
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
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {total === 0 ? 0 : Math.min((currentPage - 1) * pageLimit + 1, total)}–{Math.min(currentPage * pageLimit, total)}
              </span>
              {' / '}
              <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span> kayıt
            </span>
          </div>

          {/* Sağ: Sayfa Navigasyonu */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || loading}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
            >«</button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            ><ChevronLeft size={16} /></button>

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
                  disabled={loading}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${
                    page === currentPage
                      ? 'bg-metronic-primary text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >{page}</button>
              );
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            ><ChevronRight size={16} /></button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || loading}
              className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold"
            >»</button>
          </div>
        </div>

      </div>

      {/* ─── DETAY MODALİ ─── */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, log: null })}
        title="Log Kayıt Detayı"
        subtitle={detailModal.log ? `${detailModal.log.id} — ${detailModal.log.user.name}` : ''}
        size="md"
        footer={
          <button
            onClick={() => setDetailModal({ isOpen: false, log: null })}
            className="px-5 py-2 text-[13px] font-bold text-white bg-metronic-primary rounded-lg hover:opacity-90 transition-opacity"
          >
            Kapat
          </button>
        }
      >
        {detailModal.log && (
          <div className="space-y-4">
            <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Kullanıcı</span>
              <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                {detailModal.log.user.name} ({detailModal.log.user.role})
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Tarih & Saat</span>
              <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                {detailModal.log.timestamp}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
              <span className="text-[11px] font-bold text-slate-500 uppercase">IP Adresi</span>
              <span className="text-[13px] font-medium font-mono text-slate-800 dark:text-slate-200">
                {detailModal.log.ipAddress}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Açıklama</span>
              <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                {detailModal.log.description}
              </span>
            </div>

            {/* Değişiklik Detayları */}
            {detailModal.log.details && detailModal.log.details.type === 'diff' && (
              <div className="flex flex-col gap-2 p-3 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-lg">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Değişiklik Detayları</span>
                <div className="text-[12px] text-slate-700 dark:text-slate-300">
                  <ul className="list-disc list-inside space-y-1.5">
                    {detailModal.log.details.fields?.map((field, i) => (
                      <li key={i}>
                        <span className="font-semibold">{field.name}</span> alanı{' '}
                        <span className="line-through text-slate-400 mx-1">{field.old}</span>
                        {' '}iken{' '}
                        <span className="font-semibold text-metronic-primary mx-1">{field.new}</span>
                        olarak güncellendi.
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {detailModal.log.details && detailModal.log.details.type === 'info' && (
              <div className="flex flex-col gap-2 p-3 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-lg">
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Ek Bilgi</span>
                <span className="text-[12px] text-slate-700 dark:text-slate-300">
                  {detailModal.log.details.message}
                </span>
              </div>
            )}

            {!detailModal.log.details && (
              <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Değişiklik Detayları</span>
                <span className="text-[12px] text-slate-400 italic">Bu kayıt için ek detay bilgisi bulunmamaktadır.</span>
              </div>
            )}
          </div>
        )}
      </Modal>

    </MetronicLayout>
  );
}
