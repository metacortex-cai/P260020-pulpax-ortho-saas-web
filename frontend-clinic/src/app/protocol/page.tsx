'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { ProtocolService, Protocol } from '../../lib/services/protocol.service';
import MetronicLayout from '../../components/layout/MetronicLayout';
import Dropdown from '../../components/ui/Dropdown';
import { Search, Filter, Download, ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, Clock, AlertCircle, CheckSquare, X, Send, ArrowUp, ArrowDown, ShieldAlert, Eye, FileText, FileSpreadsheet } from 'lucide-react';

function DropdownItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary">
      {icon}{label}
    </button>
  );
}

function FilterItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'text-metronic-primary bg-metronic-primary-light dark:bg-metronic-primary/10 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}{active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-metronic-primary" />}
    </button>
  );
}

// Sıralanabilir tablo başlığı
function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void }) {
  const isActive = sortColumn === column;
  return (
    <th 
      onClick={() => onSort(column)}
      className="py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200/60 dark:border-white/5 cursor-pointer hover:text-metronic-primary transition-colors"
    >
      <div className="flex items-center gap-2">
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={13} className="text-metronic-primary" /> : <ArrowDown size={13} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

// ─── KVKK Maskeleme ───
const SENSITIVE_ROLES = ['ADMIN', 'DOCTOR'];
function maskText(text: string, canView: boolean) {
  if (!text) return '-';
  if (canView) return text;
  return text.substring(0, 1) + '***';
}
function maskTckn(tckn: string, canView: boolean) {
  if (!tckn) return '-';
  if (canView) return tckn;
  return tckn.substring(0, 3) + '•••••' + tckn.substring(8);
}

const USS_STATUS_MAP: Record<string, { cls: string; label: string; icon: any }> = {
  'SUCCESS': { cls: 'bg-metronic-success-light text-metronic-success', label: 'USS\'ye Gönderildi', icon: CheckCircle2 },
  'PENDING': { cls: 'bg-amber-50 text-amber-600', label: 'Aktarım Bekliyor', icon: Clock },
  'ERROR': { cls: 'bg-metronic-danger-light text-metronic-danger', label: 'USS Hatası', icon: AlertCircle },
};

export default function ProtocolPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100];
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [prevPagingFilters, setPrevPagingFilters] = useState({ searchTerm: '', statusFilter: null as string | null, pageLimit: 25 });
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [kvkkRevealed, setKvkkRevealed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const canViewSensitive = SENSITIVE_ROLES.includes(user?.role || '');
  const showSensitive = canViewSensitive && kvkkRevealed;

  const fetchProtocols = async () => {
    setLoading(true);
    try {
      const data = await ProtocolService.findAll();
      setProtocols(data);
    } catch (err: any) {
      addToast({ title: 'Hata', message: 'Protokoller yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag used to gate client-only fetching until after hydration
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/dep-change pattern
    fetchProtocols();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchProtocols is redefined every render; adding it would retrigger this effect on every render
  }, [user, router, mounted]);

  const handleBulkSync = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    addToast({ title: 'Bilgi', message: `${ids.length} protokol USS'ye gönderiliyor...`, type: 'info' });
    
    let successCount = 0;
    let errorCount = 0;

    for (const id of ids) {
      try {
        const result = await ProtocolService.sync(id);
        if (result.ussStatus === 'SUCCESS') {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }

    if (successCount > 0) {
      addToast({ title: 'Başarılı', message: `${successCount} protokol başarıyla USS'ye aktarıldı.`, type: 'success' });
    }
    if (errorCount > 0) {
      addToast({ title: 'Hata', message: `${errorCount} protokol aktarımı başarısız oldu.`, type: 'error' });
    }

    setSelectedIds(new Set());
    fetchProtocols();
  };

  const filtered = protocols.filter(p => {
    const matchesSearch = [p.patientName, p.protocolNo, p.doctorName, p.treatmentName, p.ussStatus, p.patientNationalId]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter ? p.ussStatus === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });
  
  const getSortedData = () => {
    let sorted = [...filtered];
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal: any = a[sortColumn as keyof Protocol];
        let bVal: any = b[sortColumn as keyof Protocol];
        
        if (sortColumn === 'id') {
          aVal = a.protocolNo;
          bVal = b.protocolNo;
        } else if (sortColumn === 'date') {
          aVal = a.createdAt;
          bVal = b.createdAt;
        } else if (sortColumn === 'doctor') {
          aVal = a.doctorName;
          bVal = b.doctorName;
        } else if (sortColumn === 'treatment') {
          aVal = a.treatmentName;
          bVal = b.treatmentName;
        }
        
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

  if (searchTerm !== prevPagingFilters.searchTerm || statusFilter !== prevPagingFilters.statusFilter || pageLimit !== prevPagingFilters.pageLimit) {
    setPrevPagingFilters({ searchTerm, statusFilter, pageLimit });
    setCurrentPage(1);
  }

  const exportCSV = () => {
    const BOM = '﻿';
    const headers = ['Protokol No', 'Tarih', 'Hasta', 'TC Kimlik', 'Hekim', 'Tedavi', 'SUT Kodu', 'Diş No', 'Tutar', 'USS Durumu'];
    const rows = filtered.map(p => [p.protocolNo, new Date(p.createdAt).toLocaleDateString('tr-TR'), p.patientName, maskTckn(p.patientNationalId, showSensitive), p.doctorName, p.treatmentName, p.sutCode || '', p.toothNo || '', p.price, p.ussStatus]);
    const csv = BOM + [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'protokol-defteri.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const allSelected = paginated.length > 0 && paginated.every(p => selectedIds.has(p.id));
  const someSelected = paginated.some(p => selectedIds.has(p.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(paginated.map(p => p.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (!mounted) return null;
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <MetronicLayout title="Protokol Defteri" breadcrumbs={['Protokol Defteri']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Uyarı Bandı */}
      <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-4 flex items-start gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-800/40 rounded-lg text-blue-600 dark:text-blue-400">
          <Clock size={20} />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-blue-800 dark:text-blue-300">Protokol Defteri (USS Entegrasyonu)</h4>
          <p className="text-[12px] text-blue-600/80 dark:text-blue-400/80 mt-1 leading-relaxed">
            Bu liste, hastalar modülünde “Tamamlandı” olarak işaretlenen tedavilerden <strong>otomatik</strong> olarak oluşturulur. Resmi nitelik taşıdığı için bu alandan manuel veri eklenemez, değiştirilemez veya silinemez. Bekleyen kayıtlar periyodik olarak Ulusal Sağlık Sistemi’ne (USS) aktarılmaktadır.
          </p>
        </div>
      </div>

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
              Gizle
            </button>
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} protokol seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleBulkSync}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-metronic-primary text-white text-[12px] font-bold rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Send size={13} /> USS’ye Aktar
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"><X size={15} /></button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Kayıt Listesi</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filtered.length} Kayıt</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px] max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input type="text" placeholder="Protokol no, hasta, hekim ile ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            
            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><Filter size={15} /> Filtrele{statusFilter && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-metronic-primary inline-block" />} <ChevronDown size={13} className="text-slate-400" /></button>}>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">USS Durumu</p></div>
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-slate-400 inline-block"/>} label="Hepsi" active={statusFilter === null} onClick={() => setStatusFilter(null)} />
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>} label="Gönderilenler" active={statusFilter === 'SUCCESS'} onClick={() => setStatusFilter(statusFilter === 'SUCCESS' ? null : 'SUCCESS')} />
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>} label="Bekleyenler" active={statusFilter === 'PENDING'} onClick={() => setStatusFilter(statusFilter === 'PENDING' ? null : 'PENDING')} />
              <FilterItem icon={<span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>} label="Hatalı Olanlar" active={statusFilter === 'ERROR'} onClick={() => setStatusFilter(statusFilter === 'ERROR' ? null : 'ERROR')} />
            </Dropdown>

            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" /></button>}>
              <DropdownItem icon={<FileSpreadsheet size={15} className="text-green-600" />} label="CSV / Excel" onClick={exportCSV} />
              <DropdownItem icon={<FileText size={15} className="text-red-500" />} label="PDF Raporu" />
            </Dropdown>
          </div>
        </div>

        {/* Tablo */}
        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10"><input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></th>
                <SortableHeader label="Protokol No" column="id" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Tarih / Saat" column="date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Hasta / TCKN" column="patientName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Hekim" column="doctor" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Tedavi / İşlem" column="treatment" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="USS Durumu" column="ussStatus" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Yükleniyor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Eşleşen kayıt bulunamadı.</td></tr>
              ) : paginated.map(p => {
                const isSelected = selectedIds.has(p.id);
                const statusInfo = USS_STATUS_MAP[p.ussStatus] || USS_STATUS_MAP['PENDING'];
                const StatusIcon = statusInfo.icon;
                
                // Maskeleme
                const patientNameParts = p.patientName.split(' ');
                const maskedFirstName = maskText(patientNameParts[0], showSensitive);
                const maskedLastName = patientNameParts.length > 1 ? maskText(patientNameParts.slice(1).join(' '), showSensitive) : '';
                const maskedName = `${maskedFirstName} ${maskedLastName}`.trim();

                const createdAtDate = new Date(p.createdAt);
                const dateString = createdAtDate.toLocaleDateString('tr-TR');
                const timeString = createdAtDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr key={p.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                    <td className="py-3 pl-6 pr-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(p.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                    <td className="py-3 px-4">
                      <span className="text-slate-800 dark:text-slate-200 font-mono font-bold text-[13px]">{p.protocolNo}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-slate-700 dark:text-slate-300 font-bold text-[13px]">{dateString}</span>
                        <span className="text-slate-400 text-[11px] font-medium mt-0.5">{timeString}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        {p.patientId ? (
                          <Link href={`/patients/${p.patientId}`} className="text-metronic-primary hover:text-blue-600 font-bold text-[13px] hover:underline transition-colors">{maskedName}</Link>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300 font-bold text-[13px]">{maskedName}</span>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-slate-400 text-[11px] font-medium font-mono">{maskTckn(p.patientNationalId, showSensitive)}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10"></span>
                          <span className="text-slate-400 text-[11px] font-bold">#{p.patientId ? p.patientId.substring(0, 8) : 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400">{p.doctorName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{p.treatmentName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.sutCode && <span className="text-slate-400 text-[11px] font-mono font-medium">{p.sutCode}</span>}
                          {p.toothNo && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10"></span>
                              <span className="text-slate-400 text-[11px] font-bold">Diş: {p.toothNo}</span>
                            </>
                          )}
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10"></span>
                          <span className="text-slate-400 text-[11px] font-bold">{p.price} TL</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pl-4 pr-6 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${statusInfo.cls}`}>
                        <StatusIcon size={12} /> {statusInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-xl">
          <div className="flex items-center gap-3">
            <select value={pageLimit} onChange={e => setPageLimit(Number(e.target.value))} className="h-7 px-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[12px] font-bold text-slate-600 dark:text-slate-300 outline-none w-20">
              {PAGE_LIMIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
            <div className="w-px h-4 bg-slate-200"></div>
            <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">Toplam <span className="font-bold text-slate-700 dark:text-slate-200">{filtered.length}</span> kayıttan <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min((currentPage - 1) * pageLimit + 1, filtered.length)}–{Math.min(currentPage * pageLimit, filtered.length)}</span> arası</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i));
              return (
                <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${p === currentPage ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>{p}</button>
              );
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>
    </MetronicLayout>
  );
}
