'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import { Search, Filter, Settings, X, ChevronLeft, ChevronRight, ChevronDown, CheckSquare, Check, Ban, Phone, Calendar, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { AppointmentService } from '../../../lib/services/appointment.service';
import { useToastStore } from '../../../store/toastStore';



function DropdownItem({ icon, label, active, danger = false, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : active ? 'bg-metronic-primary/5 text-metronic-primary font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}{active && <Check size={12} className="ml-auto text-metronic-primary" />}
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

const STATUS_MAP: Record<string, { cls: string; label: string; icon: any }> = {
  'ONAYLANDI': { cls: 'bg-metronic-success-light text-metronic-success', label: 'Onaylandı', icon: Check },
  'BEKLEMEDE': { cls: 'bg-amber-50 text-amber-600', label: 'Beklemede', icon: Clock },
  'REDDEDİLDİ': { cls: 'bg-metronic-danger-light text-metronic-danger', label: 'Reddedildi', icon: Ban },
};

export default function AppointmentRequestsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { addToast } = useToastStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern, setLoading/setError are synchronous UI resets before the async call
    setLoading(true);
    setError(null);
    AppointmentService.getRequests()
      .then(data => setRequests(data))
      .catch(() => setError('Randevu talepleri yüklenirken bir hata oluştu.'))
      .finally(() => setLoading(false));
  }, [user, router]);

  const filtered = requests.filter(r => {
    const matchSearch = [r.patientName, r.phone, r.doctorName, r.treatmentType, r.status, r.id].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus ? r.status === filterStatus : true;
    return matchSearch && matchStatus;
  });
  
  const getSortedData = () => {
    let sorted = [...filtered];
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

  // Reset to page 1 whenever the search term or status filter changes (React docs: adjust state during render instead of in an effect)
  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
  const [prevFilterStatus, setPrevFilterStatus] = useState(filterStatus);
  if (searchTerm !== prevSearchTerm || filterStatus !== prevFilterStatus) {
    setPrevSearchTerm(searchTerm);
    setPrevFilterStatus(filterStatus);
    setCurrentPage(1);
  }

  const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));
  const someSelected = filtered.some(r => selectedIds.has(r.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(paginated.map(r => r.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleAction = async (id: string, action: 'ONAYLANDI' | 'REDDEDİLDİ') => {
    try {
      await AppointmentService.updateRequestStatus(id, action);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
      addToast({ type: 'success', message: action === 'ONAYLANDI' ? 'Talep onaylandı.' : 'Talep reddedildi.' });
    } catch {
      addToast({ type: 'error', message: 'Talep durumu güncellenemedi.' });
    }
  };

  const handleBulkAction = async (action: 'ONAYLANDI' | 'REDDEDİLDİ') => {
    try {
      await Promise.all(Array.from(selectedIds).map(id => AppointmentService.updateRequestStatus(id, action)));
      setRequests(prev => prev.map(r => selectedIds.has(r.id) ? { ...r, status: action } : r));
      setSelectedIds(new Set());
      addToast({ type: 'success', message: `${selectedIds.size} talep ${action === 'ONAYLANDI' ? 'onaylandı' : 'reddedildi'}.` });
    } catch {
      addToast({ type: 'error', message: 'Toplu güncelleme sırasında bir hata oluştu.' });
    }
  };

  const exportCSV = () => {
    const headers = ['Talep No', 'Hasta Adı', 'Telefon', 'Talep Tarihi', 'Talep Saati', 'Hekim', 'Tedavi', 'Durum', 'İletilme Tarihi'];
    const rows = sortedData.map(r => [r.id, r.patientName, r.phone, r.requestedDate, r.requestedTime, r.doctorName, r.treatmentType, r.status, r.requestDate]);
    const csv = [headers, ...rows].map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `randevu-talepleri-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MetronicLayout title="Randevu Talepleri" breadcrumbs={['Randevular', 'Online Talepler']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} talep seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleBulkAction('ONAYLANDI')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-metronic-success/30 text-metronic-success text-[12px] font-bold rounded-lg hover:bg-metronic-success hover:text-white transition-colors"><Check size={13} /> Onayla</button>
              <button onClick={() => handleBulkAction('REDDEDİLDİ')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-metronic-danger/30 text-metronic-danger text-[12px] font-bold rounded-lg hover:bg-metronic-danger hover:text-white transition-colors"><Ban size={13} /> Reddet</button>
              <button onClick={() => setSelectedIds(new Set())} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"><X size={15} /></button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Gelen Talepler</h3>
            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 text-xs font-bold rounded-md border border-amber-200 dark:border-amber-500/20">{requests.filter(r => r.status === 'BEKLEMEDE').length} Bekleyen</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px] max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input type="text" placeholder="Hasta adı, telefon, hekim veya işlem ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <Dropdown align="right" trigger={<button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg transition-colors shadow-sm text-[13px] font-medium ${filterStatus ? 'bg-metronic-primary text-white border-metronic-primary' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary'}`}><Filter size={15} /> {filterStatus ? STATUS_MAP[filterStatus]?.label ?? 'Filtrele' : 'Filtrele'} <ChevronDown size={13} className="opacity-70" /></button>}>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Durum Filtresi</p></div>
              <DropdownItem icon={<span className="w-2 h-2 rounded-full bg-slate-400 inline-block"/>} label="Tüm Durumlar" active={filterStatus === ''} onClick={() => setFilterStatus('')} />
              <DropdownItem icon={<span className="w-2 h-2 rounded-full bg-amber-500 inline-block"/>} label="Beklemede" active={filterStatus === 'BEKLEMEDE'} onClick={() => setFilterStatus('BEKLEMEDE')} />
              <DropdownItem icon={<span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>} label="Onaylandı" active={filterStatus === 'ONAYLANDI'} onClick={() => setFilterStatus('ONAYLANDI')} />
              <DropdownItem icon={<span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>} label="Reddedildi" active={filterStatus === 'REDDEDİLDİ'} onClick={() => setFilterStatus('REDDEDİLDİ')} />
            </Dropdown>
            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><ChevronDown size={13} className="text-slate-400" /> Dışa Aktar</button>}>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seç</p></div>
              <DropdownItem icon={<Filter size={14} />} label={`CSV İndir (${sortedData.length} kayıt)`} onClick={exportCSV} />
            </Dropdown>
          </div>
        </div>

        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10"><input type="checkbox" checked={allSelected} ref={el => { if (el) { el.indeterminate = someSelected && !allSelected; } }} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></th>
                <SortableHeader label="Talep No" column="id" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Hasta & İletişim" column="patientName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Talep Edilen Zaman" column="requestedDate" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Hekim & Tedavi" column="doctorName" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Yükleniyor...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="py-12 text-center text-metronic-danger font-medium">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Eşleşen talep bulunamadı.</td></tr>
              ) : paginated.map(r => {
                const isSelected = selectedIds.has(r.id);
                const statusInfo = STATUS_MAP[r.status] || STATUS_MAP['BEKLEMEDE'];
                const StatusIcon = statusInfo.icon;
                return (
                  <tr key={r.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                    <td className="py-3 pl-6 pr-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                    <td className="py-3 px-4"><span className="text-slate-500 font-medium text-[13px] font-mono">{r.id}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-slate-800 dark:text-slate-100 font-bold text-[13px]">{r.patientName}</span>
                        <div className="flex items-center gap-1 mt-0.5 text-slate-400">
                          <Phone size={10} />
                          <span className="text-[11px] font-semibold">{r.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                          <Calendar size={13} className="text-metronic-primary" />
                          <span className="text-[13px] font-medium">{r.requestedDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock size={13} />
                          <span className="text-[12px] font-medium">{r.requestedTime}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">İletildi: {r.requestDate}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-slate-700 dark:text-slate-200 text-[13px] font-bold">{r.doctorName}</span>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded text-[11px] text-slate-600 dark:text-slate-400 font-medium w-max">{r.treatmentType}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${statusInfo.cls}`}><StatusIcon size={12} /> {statusInfo.label}</span></td>
                    <td className="py-3 pl-4 pr-6 text-right">
                      <Dropdown align="right" trigger={<button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors inline-flex"><Settings size={16} /></button>}>
                        {r.status === 'BEKLEMEDE' && (
                          <>
                            <DropdownItem onClick={() => handleAction(r.id, 'ONAYLANDI')} icon={<Check size={14} className="text-metronic-success"/>} label="Talebi Onayla" />
                            <DropdownItem onClick={() => handleAction(r.id, 'REDDEDİLDİ')} icon={<Ban size={14} className="text-metronic-danger"/>} label="Talebi Reddet" danger />
                            <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                          </>
                        )}
                        <DropdownItem icon={<Phone size={14} />} label="Hastayı Ara" />
                        <DropdownItem icon={<Calendar size={14} />} label="Takvimde Görüntüle" />
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-xl">
          <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">Toplam <span className="font-bold text-slate-700 dark:text-slate-200">{filtered.length}</span> talep</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { let p = i + 1; return (
              <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${p === currentPage ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>{p}</button>
            ); })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-30 text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>
    </MetronicLayout>
  );
}
