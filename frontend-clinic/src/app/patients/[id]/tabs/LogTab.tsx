'use client';
import { useEffect, useState, useRef } from 'react';
import { Search, X, Filter, Download, FileText, ChevronDown, Check, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { PatientService, PatientLogEntry } from '@/lib/services/patient.service';
import Dropdown from '@/components/ui/Dropdown';

const OP_META: Record<string, { label: string; cls: string }> = {
  ADD:    { label: 'Ekleme',     cls: 'bg-metronic-success-light text-metronic-success' },
  UPDATE: { label: 'Güncelleme', cls: 'bg-metronic-primary-light text-metronic-primary' },
  DELETE: { label: 'Silme',      cls: 'bg-metronic-danger-light text-metronic-danger' },
};


function DropdownItem({ icon, label, active, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'bg-metronic-primary/5 text-metronic-primary font-bold' : 'text-slate-700 hover:bg-slate-50 hover:text-metronic-primary'}`}>
      {icon}{label}{active && <Check size={12} className="ml-auto text-metronic-primary" />}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void }) {
  const isActive = sortColumn === column;
  return (
    <th onClick={() => onSort(column)} className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors">
      <div className="flex items-center gap-1.5">{label}{isActive && (sortDirection === 'asc' ? <ArrowUp size={12} className="text-metronic-primary" /> : <ArrowDown size={12} className="text-metronic-primary" />)}</div>
    </th>
  );
}

export default function LogTab({ patient }: { patient: any }) {
  const [logs, setLogs] = useState<PatientLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOperation, setFilterOperation] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>('at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);

  useEffect(() => {
    if (!patient?.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    setLoading(true);
    PatientService.getLogs(patient.id)
      .then(setLogs)
      .catch((err) => {
        console.error('Failed to fetch patient logs:', err);
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, [patient?.id]);

  const filtered = logs.filter(log => {
    const matchSearch = !searchTerm || [log.module || '', log.changedFields?.join(' ') || '', log.user || '', log.op || '']
      .join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchOp = !filterOperation || log.op === filterOperation;
    return matchSearch && matchOp;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = (a as any)[sortColumn] ?? '';
    const bVal = (b as any)[sortColumn] ?? '';
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Arama/filtre/sayfa boyutu değiştiğinde sayfayı 1'e sıfırla (async iş yok, render sırasında ayarlanır).
  const [prevPagingKey, setPrevPagingKey] = useState({ searchTerm, filterOperation, pageLimit });
  if (searchTerm !== prevPagingKey.searchTerm || filterOperation !== prevPagingKey.filterOperation || pageLimit !== prevPagingKey.pageLimit) {
    setPrevPagingKey({ searchTerm, filterOperation, pageLimit });
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));
  const paginated = sorted.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const rows = [
      ['Tarih', 'Kullanıcı', 'İşlem Tipi', 'Modül', 'Alanlar'],
      ...sorted.map(log => [
        log.at ? new Date(log.at).toLocaleString('tr-TR') : '',
        log.user || '',
        OP_META[log.op]?.label || log.op || '',
        log.module || '',
        log.changedFields?.join(', ') || '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'log_kayitlari.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div className="m-card shadow-none border border-slate-200/60 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <h4 className="text-[1.05rem] font-bold text-slate-800 tracking-tight m-0">Denetim Günlüğü</h4>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="Modül, kullanıcı, alan ara..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 h-9 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            {/* Filter */}
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterOperation ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Filter size={15} /> Filtrele {filterOperation && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">İşlem Tipi</p></div>
              <DropdownItem label="Tüm İşlemler" active={!filterOperation} onClick={() => setFilterOperation('')} />
              {Object.entries(OP_META).map(([k, v]) => (
                <DropdownItem key={k} label={v.label} active={filterOperation === k} onClick={() => setFilterOperation(filterOperation === k ? '' : k)} />
              ))}
              {filterOperation && <div className="border-t border-slate-100 mt-1 px-3 py-2"><button onClick={() => setFilterOperation('')} className="w-full text-center text-[12px] font-bold text-rose-500">Filtreyi Temizle</button></div>}
            </Dropdown>
            {/* Export */}
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p></div>
              <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-[480px] relative">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 bg-slate-50">
                <SortableHeader label="Tarih & Saat" column="at" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Kullanıcı" column="user" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="İşlem Tipi" column="op" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Modül" column="module" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Değişen Alanlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-6 px-4 text-center text-[13px] text-slate-400">Yükleniyor...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-[13px]">{searchTerm || filterOperation ? 'Eşleşen kayıt bulunamadı.' : 'Henüz log kaydı bulunmuyor.'}</td></tr>
              ) : (
                paginated.map((log, i) => (
                  <tr key={log.id ?? i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-[12px] font-mono text-slate-600 whitespace-nowrap">
                      {log.at ? new Date(log.at).toLocaleString('tr-TR') : '—'}
                    </td>
                    <td className="py-3 px-4 text-[13px] font-semibold text-slate-700">{log.user || '—'}</td>
                    <td className="py-3 px-4">
                      {log.op && (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${OP_META[log.op]?.cls || 'bg-slate-100 text-slate-500'}`}>
                          {OP_META[log.op]?.label || log.op}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[13px] text-slate-600 font-medium">{log.module || '—'}</td>
                    <td className="py-3 px-4 text-[12px] text-slate-500">{log.changedFields?.length ? log.changedFields.join(', ') : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <select value={pageLimit} onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
              className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-md text-[12px] font-bold text-slate-600 outline-none cursor-pointer w-20">
              {[10, 25, 50, 100].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
            <div className="w-px h-4 bg-slate-200" />
            <span className="text-slate-500 text-[13px] font-medium">
              Toplam <span className="font-bold text-slate-700">{filtered.length}</span> kayıttan{' '}
              <span className="font-bold text-slate-700">{filtered.length === 0 ? 0 : Math.min((currentPage-1)*pageLimit+1, filtered.length)}–{Math.min(currentPage*pageLimit, filtered.length)}</span> arası
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage===1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page = totalPages <= 5 ? i+1 : currentPage <= 3 ? i+1 : currentPage >= totalPages-2 ? totalPages-4+i : currentPage-2+i;
              return <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${page===currentPage ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>{page}</button>;
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage===totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>
    </div>
  );
}
