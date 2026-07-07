'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import Modal from '../../../components/ui/Modal';
import { Search, Plus, Filter, Download, Edit2, Trash2, ChevronLeft, ChevronRight, Settings, X, FileText, ChevronDown, CheckSquare, Save, Calendar, Check, Ban, User, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { EmployeeService } from '../../../lib/services/employee.service';
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

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void }) {
  const isActive = sortColumn === column;
  return (
    <th onClick={() => onSort(column)} className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors select-none">
      <div className="flex items-center gap-1.5">{label}{isActive && (sortDirection === 'asc' ? <ArrowUp size={12} className="text-metronic-primary" /> : <ArrowDown size={12} className="text-metronic-primary" />)}</div>
    </th>
  );
}

const TYPE_COLORS: Record<string, string> = {
  'ANNUAL': 'bg-blue-50 text-blue-600 border-blue-200',
  'EXCUSE': 'bg-amber-50 text-amber-600 border-amber-200',
  'MEDICAL': 'bg-rose-50 text-rose-600 border-rose-200',
  'UNPAID': 'bg-slate-50 text-slate-600 border-slate-200',
  'TRAINING': 'bg-purple-50 text-purple-600 border-purple-200',
};

const STATUS_MAP: Record<string, { cls: string; label: string; icon: any }> = {
  'APPROVED': { cls: 'bg-metronic-success-light text-metronic-success', label: 'Onaylandı', icon: Check },
  'PENDING': { cls: 'bg-amber-50 text-amber-600', label: 'Beklemede', icon: Calendar },
  'REJECTED': { cls: 'bg-metronic-danger-light text-metronic-danger', label: 'Reddedildi', icon: Ban },
};

export default function LeavesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ employeeId: '', type: 'ANNUAL', startDate: '', endDate: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const [leavesData, employeesData] = await Promise.all([
        EmployeeService.findAllLeaves(),
        EmployeeService.findAll()
      ]);
      setLeaves(leavesData);
      setEmployees(employeesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/user-change pattern
    if (user) fetchLeaves();
  }, [user]);

  const filtered = leaves.filter(l => {
    const emp = employees.find(e => e.id === l.employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : '';
    const matchSearch = [empName, l.type, l.status, l.id].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || l.type === filterType;
    const matchStatus = !filterStatus || l.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal: any, bVal: any;
    if (sortColumn === 'employee') {
      const aEmp = employees.find(e => e.id === a.employeeId);
      const bEmp = employees.find(e => e.id === b.employeeId);
      aVal = aEmp ? `${aEmp.firstName} ${aEmp.lastName}` : '';
      bVal = bEmp ? `${bEmp.firstName} ${bEmp.lastName}` : '';
    } else if (sortColumn === 'startAt') {
      aVal = new Date(a.startAt).getTime();
      bVal = new Date(b.startAt).getTime();
    } else {
      aVal = (a as any)[sortColumn] ?? '';
      bVal = (b as any)[sortColumn] ?? '';
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Reset to page 1 whenever the active filters change (derived during render, not in an effect).
  const filterSignature = `${searchTerm}|${filterType}|${filterStatus}|${pageLimit}`;
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const rows = [
      ['Personel', 'İzin Türü', 'Başlangıç', 'Bitiş', 'Durum'],
      ...sorted.map(l => {
        const emp = employees.find(e => e.id === l.employeeId);
        return [
          emp ? `${emp.firstName} ${emp.lastName}` : '',
          l.type,
          new Date(l.startAt).toLocaleDateString('tr-TR'),
          new Date(l.endAt).toLocaleDateString('tr-TR'),
          STATUS_MAP[l.status]?.label || l.status,
        ];
      }),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'izinler.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const paginated = sorted.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const allSelected = filtered.length > 0 && filtered.every(l => selectedIds.has(l.id));
  const someSelected = filtered.some(l => selectedIds.has(l.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(paginated.map(l => l.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await EmployeeService.createLeave({
        employeeId: formData.employeeId,
        type: formData.type,
        startAt: formData.startDate,
        endAt: formData.endDate
      });
      await fetchLeaves();
      setModalOpen(false);
      setFormData({ employeeId: '', type: 'ANNUAL', startDate: '', endDate: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-[#EEF0F8]">
        <Loader2 className="animate-spin text-metronic-primary mr-2" size={24} />
        <span>Veriler yükleniyor...</span>
      </div>
    );
  }

  return (
    <MetronicLayout title="İzin Yönetimi" breadcrumbs={['İnsan Kaynakları', 'İzinler']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">

        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">İzin Listesi</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px] max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input type="text" placeholder="Personel, izin türü, durum ile ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
            </div>
            {/* Filter */}
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterType || filterStatus ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}>
                <Filter size={15} /> Filtrele {(filterType || filterStatus) && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase">İzin Türü</p></div>
              <FilterItem label="Tüm Türler" active={!filterType} onClick={() => setFilterType('')} />
              {Object.entries({ ANNUAL: 'Yıllık İzin', EXCUSE: 'Mazeret İzni', MEDICAL: 'Hastalık İzni', UNPAID: 'Ücretsiz İzin', TRAINING: 'Kongre/Eğitim' }).map(([k, v]) => (
                <FilterItem key={k} label={v} active={filterType === k} onClick={() => setFilterType(filterType === k ? '' : k)} />
              ))}
              <div className="px-4 py-2 border-t border-b border-slate-100 mt-1"><p className="text-[11px] font-bold text-slate-400 uppercase">Durum</p></div>
              <FilterItem label="Tüm Durumlar" active={!filterStatus} onClick={() => setFilterStatus('')} />
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <FilterItem key={k} label={v.label} active={filterStatus === k} onClick={() => setFilterStatus(filterStatus === k ? '' : k)} />
              ))}
              {(filterType || filterStatus) && <div className="border-t border-slate-100 mt-1 px-3 py-2"><button onClick={() => { setFilterType(''); setFilterStatus(''); }} className="w-full text-center text-[12px] font-bold text-rose-500">Filtreleri Temizle</button></div>}
            </Dropdown>
            {/* Export */}
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase">Format Seçin</p></div>
              <button onClick={exportCSV} className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-metronic-primary text-left"><FileText size={14} className="text-red-500" />CSV (.csv)</button>
            </Dropdown>
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm"><Plus size={16} /> Yeni İzin Talebi</button>
          </div>
        </div>

        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10"><input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></th>
                <SortableHeader label="Personel" column="employee" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="İzin Türü" column="type" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Tarih Aralığı" column="startAt" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-500 font-medium">Eşleşen kayıt bulunamadı.</td></tr>
              ) : paginated.map(l => {
                const emp = employees.find(e => e.id === l.employeeId);
                const isSelected = selectedIds.has(l.id);
                const typeColor = TYPE_COLORS[l.type] || 'bg-slate-50 text-slate-600 border-slate-200';
                const statusInfo = STATUS_MAP[l.status] || STATUS_MAP['PENDING'];
                const StatusIcon = statusInfo.icon;
                return (
                  <tr key={l.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                    <td className="py-3 pl-6 pr-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(l.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-xs">{emp?.firstName.charAt(0)}</div>
                        <div className="flex flex-col">
                          <Link href={`/hr/staff/${l.employeeId}`} className="text-slate-800 dark:text-slate-100 font-bold text-[13px] hover:text-metronic-primary transition-colors">{emp?.isDoctor ? 'Dt. ' : ''}{emp?.firstName} {emp?.lastName}</Link>
                          <span className="text-slate-400 text-[11px] font-semibold mt-0.5">{emp?.isDoctor ? 'HEKİM' : 'PERSONEL'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold ${typeColor}`}>{l.type}</span></td>
                    <td className="py-3 px-4">
                      <span className="text-slate-700 dark:text-slate-200 text-[13px] font-medium">{new Date(l.startAt).toLocaleDateString('tr-TR')} - {new Date(l.endAt).toLocaleDateString('tr-TR')}</span>
                    </td>
                    <td className="py-3 px-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${statusInfo.cls}`}><StatusIcon size={12} /> {statusInfo.label}</span></td>
                    <td className="py-3 pl-4 pr-6 text-right">
                      <Dropdown align="right" trigger={<button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors"><Settings size={16} /></button>}>
                        <DropdownItem icon={<Check size={14} className="text-metronic-success"/>} label="Onayla" />
                        <DropdownItem icon={<Ban size={14} className="text-metronic-danger"/>} label="Reddet" />
                        <div className="border-t border-slate-100 my-1" />
                        <DropdownItem icon={<Trash2 size={14} />} label="Sil" danger />
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <select value={pageLimit} onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="h-7 px-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[12px] font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer w-20">
              {[10, 25, 50, 100].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
            <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
            <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">
              Toplam <span className="font-bold text-slate-700 dark:text-slate-200">{sorted.length}</span> kayıttan{' '}
              <span className="font-bold text-slate-700 dark:text-slate-200">{sorted.length === 0 ? 0 : Math.min((currentPage-1)*pageLimit+1, sorted.length)}–{Math.min(currentPage*pageLimit, sorted.length)}</span> arası
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage===1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5,totalPages) }, (_,i) => {
              const page = totalPages<=5?i+1:currentPage<=3?i+1:currentPage>=totalPages-2?totalPages-4+i:currentPage-2+i;
              return <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold ${page===currentPage?'bg-metronic-primary text-white shadow-sm':'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>{page}</button>;
            })}
            <button onClick={() => setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage===totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni İzin Talebi" size="md" footer={
        <><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg">İptal</button>
        <button form="new-leave-form" type="submit" disabled={formLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600">{formLoading ? 'Kaydediliyor...' : 'Talebi Oluştur'}</button></>
      }>
        <form id="new-leave-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Personel</label>
            <select required value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="m-input mt-1">
              <option value="">Seçiniz...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.isDoctor ? 'Dt. ' : ''}{e.firstName} {e.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">İzin Türü</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="m-input mt-1">
              <option value="ANNUAL">Yıllık İzin</option>
              <option value="EXCUSE">Mazeret İzni</option>
              <option value="MEDICAL">Hastalık İzni</option>
              <option value="UNPAID">Ücretsiz İzin</option>
              <option value="TRAINING">Kongre/Eğitim</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Başlangıç</label>
              <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="m-input mt-1" />
            </div>
            <div>
              <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Bitiş</label>
              <input required type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="m-input mt-1" />
            </div>
          </div>
        </form>
      </Modal>
    </MetronicLayout>
  );
}
