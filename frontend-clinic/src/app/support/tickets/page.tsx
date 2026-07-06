'use client';

import React, { useState, useEffect, useRef } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import {
  Plus, MessageSquare, Clock, CheckCircle2, AlertCircle,
  Search, ChevronDown, MoreVertical, Send, FileText, LifeBuoy, X,
  Filter, Download, FileSpreadsheet, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import api from '../../../lib/api';
import { useToastStore } from '../../../store/toastStore';


function DropdownItem({ icon, label, danger = false, onClick }: { icon?: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-violet-600'}`}>
      {icon}{label}
    </button>
  );
}

function FilterItem({ icon, label, active = false, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'text-violet-600 bg-violet-50 dark:bg-violet-500/10 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-violet-600'}`}>
      {icon && <span>{icon}</span>}{label}{active && <Check size={13} className="ml-auto text-violet-600" />}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void }) {
  const isActive = sortColumn === column;
  return (
    <th onClick={() => onSort(column)} className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-violet-600 transition-colors select-none">
      <div className="flex items-center gap-1.5">
        {label}
        {isActive ? (sortDirection === 'asc' ? <ArrowUp size={13} className="text-violet-600" /> : <ArrowDown size={13} className="text-violet-600" />) : null}
      </div>
    </th>
  );
}

const STATUS_MAP: Record<string, { label: string, color: string, bg: string }> = {
  'AÇIK': { label: 'Açık', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
  'BEKLEMEDE': { label: 'Cevap Bekliyor', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  'KAPALI': { label: 'Kapalı', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-white/5' },
};

const PRIORITY_MAP: Record<string, { label: string, color: string }> = {
  'Kritik': { label: 'Kritik', color: 'text-red-500 font-bold' },
  'Yüksek': { label: 'Yüksek', color: 'text-orange-500' },
  'Normal': { label: 'Normal', color: 'text-blue-500' },
  'Düşük': { label: 'Düşük', color: 'text-slate-400' },
};

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PASSIVE'>('ACTIVE');
  
  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', category: 'Teknik Destek', priority: 'Normal', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  // Detail Modal / Chat
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // Close Ticket Confirmation
  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100];
  const addToast = useToastStore(state => state.addToast);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get('/support/tickets');
      setTickets(response.data || []);
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
      addToast({ title: 'Hata', message: 'Destek talepleri yüklenemedi.', type: 'error' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once on mount only; fetchTickets is redefined every render so including it would re-trigger this effect on every render
  }, []);

  // Poll for ticket updates (auto replies) when a ticket is actively viewed
  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(() => {
      api.get('/support/tickets').then(res => {
        const list = res.data || [];
        setTickets(list);
        const current = list.find((t: any) => t.id === selectedTicket.id);
        if (current) setSelectedTicket(current);
      }).catch(err => console.error(err));
    }, 3500);

    return () => clearInterval(interval);
  }, [selectedTicket]);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedTicket) {
      scrollToBottom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally scoped to selectedTicket?.comments only, so the chat only auto-scrolls when new messages arrive, not on every ticket-selection re-render
  }, [selectedTicket?.comments]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.description.trim()) return;

    setFormLoading(true);
    try {
      await api.post('/support/tickets', newTicket);
      addToast({ title: 'Başarılı', message: 'Destek talebiniz oluşturuldu.', type: 'success' });
      setCreateModalOpen(false);
      setNewTicket({ subject: '', category: 'Teknik Destek', priority: 'Normal', description: '' });
      fetchTickets();
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Talep gönderilemedi.', type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setReplyLoading(true);
    try {
      const response = await api.post(`/support/tickets/${selectedTicket.id}/reply`, { text: replyText.trim() });
      setReplyText('');
      
      // Instantly load new replies in the UI
      const updatedTickets = tickets.map(t => t.id === selectedTicket.id ? { ...t, comments: JSON.parse(response.data.message) } : t);
      setTickets(updatedTickets);
      setSelectedTicket(updatedTickets.find(t => t.id === selectedTicket.id));
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Mesaj gönderilemedi.', type: 'error' });
    } finally {
      setReplyLoading(false);
    }
  };

  const handleCloseTicket = async (id: string) => {
    try {
      await api.patch(`/support/tickets/${id}/close`);
      addToast({ title: 'Başarılı', message: 'Destek talebi kapatıldı.', type: 'success' });
      fetchTickets();
      if (selectedTicket?.id === id) {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Talep kapatılamadı.', type: 'error' });
    } finally {
      setCloseConfirmId(null);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const isClosed = t.status === 'KAPALI';
    const matchesTab = activeTab === 'ACTIVE' ? !isClosed : isClosed;
    const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority ? t.priority === filterPriority : true;
    return matchesTab && matchesSearch && matchesPriority;
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = (a as any)[sortColumn] ?? '';
    const bVal = (b as any)[sortColumn] ?? '';
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  const totalPages = Math.max(1, Math.ceil(sortedTickets.length / pageLimit));
  const paginatedTickets = sortedTickets.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const handleSort = (column: string) => {
    if (sortColumn === column) { setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortColumn(column); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const BOM = '﻿';
    const headers = ['ID', 'Konu', 'Kategori', 'Öncelik', 'Durum', 'Tarih'];
    const rows = sortedTickets.map(t => [t.id, t.subject, t.category, t.priority, STATUS_MAP[t.status]?.label || t.status, t.date]);
    const csv = BOM + [headers, ...rows].map(r => r.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'destek-talepleri.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Reset to page 1 whenever the filters or page size change (pure derivation, no async work).
  const filterKey = `${searchTerm}|${filterPriority}|${activeTab}|${pageLimit}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  const activeCount = tickets.filter(t => t.status !== 'KAPALI').length;
  const pendingCount = tickets.filter(t => t.status === 'BEKLEMEDE').length;
  const closedCount = tickets.filter(t => t.status === 'KAPALI').length;

  return (
    <MetronicLayout title="Destek Merkezi" breadcrumbs={['Destek', 'Talepler']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Aktif Talepler', value: activeCount, icon: <MessageSquare size={20} />, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-500/10' },
          { label: 'Cevap Bekleyen', value: pendingCount, icon: <Clock size={20} />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Kapatılan Talepler', value: closedCount, icon: <CheckCircle2 size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-slate-200/60 dark:border-white/5 p-6 flex items-center gap-5 shadow-sm">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.bg} ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-[1.5rem] font-black text-slate-800 dark:text-white mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-visible">
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('ACTIVE')}
                className={`px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'ACTIVE' ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Aktif Talepler
              </button>
              <button
                onClick={() => setActiveTab('PASSIVE')}
                className={`px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'PASSIVE' ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Geçmiş Talepler
              </button>
            </div>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filteredTickets.length} Kayıt</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Talep ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-violet-500/20 transition-all text-slate-900 dark:text-white w-52"
              />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-violet-600 transition-colors shadow-sm text-[13px] font-medium">
                <Filter size={15} /> {filterPriority || 'Filtrele'} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Öncelik</p></div>
              <FilterItem label="Tüm Öncelikler" active={filterPriority === ''} onClick={() => setFilterPriority('')} />
              <FilterItem label="Kritik" active={filterPriority === 'Kritik'} onClick={() => setFilterPriority('Kritik')} />
              <FilterItem label="Yüksek" active={filterPriority === 'Yüksek'} onClick={() => setFilterPriority('Yüksek')} />
              <FilterItem label="Normal" active={filterPriority === 'Normal'} onClick={() => setFilterPriority('Normal')} />
              <FilterItem label="Düşük" active={filterPriority === 'Düşük'} onClick={() => setFilterPriority('Düşük')} />
            </Dropdown>
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-violet-600 transition-colors shadow-sm text-[13px] font-medium">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p></div>
              <DropdownItem icon={<FileSpreadsheet size={15} className="text-green-600" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>
            <button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white rounded-xl text-[13px] font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20 whitespace-nowrap">
              <Plus size={18} /> Yeni Destek Talebi
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400"><Clock className="mx-auto animate-spin mb-2" /> Talepler yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                  <SortableHeader label="Konu" column="subject" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Kategori" column="category" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Öncelik" column="priority" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Durum" column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Tarih" column="date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                  <th className="px-6 py-4 w-10 text-[11px] font-black text-slate-400 uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {paginatedTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col" onClick={() => setSelectedTicket(ticket)}>
                        <span className="text-[13px] font-black text-slate-800 dark:text-white group-hover:text-violet-600 transition-colors cursor-pointer">
                          {ticket.subject}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5 tracking-tight">ID: {ticket.id.substring(0, 8).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-lg text-[11px] font-bold">
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`text-[12px] font-bold ${PRIORITY_MAP[ticket.priority]?.color || 'text-slate-400'}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${STATUS_MAP[ticket.status].bg} ${STATUS_MAP[ticket.status].color}`}>
                        {STATUS_MAP[ticket.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-[12px] font-medium text-slate-500">{ticket.date}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {ticket.status !== 'KAPALI' ? (
                        <button
                          onClick={() => setCloseConfirmId(ticket.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          title="Talebi Kapat"
                        >
                          Kapat
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTickets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <LifeBuoy size={32} />
                </div>
                <h3 className="text-[14px] font-bold text-slate-800 dark:text-white mb-1">Kayıt Bulunamadı</h3>
                <p className="text-[11px] text-slate-400 max-w-xs">Herhangi bir destek talebi bulunmamaktadır.</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-2xl">
          <div className="flex items-center gap-3">
            <select value={pageLimit} onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }} className="h-7 px-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-[12px] font-bold text-slate-600 dark:text-slate-300 outline-none focus:border-violet-500 cursor-pointer w-20">
              {PAGE_LIMIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
            <div className="w-px h-4 bg-slate-200 dark:bg-white/10"></div>
            <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">
              <span className="font-bold text-slate-700 dark:text-slate-200">{sortedTickets.length === 0 ? 0 : Math.min((currentPage - 1) * pageLimit + 1, sortedTickets.length)}–{Math.min(currentPage * pageLimit, sortedTickets.length)}</span>{' / '}<span className="font-bold text-slate-700 dark:text-slate-200">{sortedTickets.length}</span> kayıt
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">«</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${page === currentPage ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>{page}</button>
              );
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">»</button>
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      <Modal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        title="Yeni Destek Talebi" 
        size="lg"
      >
        <form onSubmit={handleCreateTicket} className="space-y-5 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Kategori</label>
              <div className="relative mt-1">
                <select 
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-violet-500 transition-all font-bold text-slate-800 dark:text-white appearance-none"
                >
                  <option value="Teknik Destek">Teknik Destek</option>
                  <option value="Muhasebe & Finans">Muhasebe & Finans</option>
                  <option value="Kullanıcı İşlemleri">Kullanıcı İşlemleri</option>
                  <option value="Özellik Talebi">Özellik Talebi</option>
                  <option value="Diğer">Diğer</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Öncelik</label>
              <div className="relative mt-1">
                <select 
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-violet-500 transition-all font-bold text-slate-800 dark:text-white appearance-none"
                >
                  <option value="Düşük">Düşük</option>
                  <option value="Normal">Normal</option>
                  <option value="Yüksek">Yüksek</option>
                  <option value="Kritik">Kritik</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Konu</label>
            <input 
              required
              type="text" 
              placeholder="Sorununuzun kısa özeti"
              value={newTicket.subject}
              onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
              className="w-full mt-1.5 px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-violet-500 transition-all font-bold text-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Açıklama</label>
            <textarea 
              required
              rows={5}
              placeholder="Karşılaştığınız hatayı veya talebinizi detaylı olarak açıklayın..."
              value={newTicket.description}
              onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
              className="w-full mt-1.5 px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-violet-500 transition-all text-slate-800 dark:text-slate-200 resize-none font-sans"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button 
              type="button"
              onClick={() => setCreateModalOpen(false)} 
              className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
            >
              Vazgeç
            </button>
            <button 
              type="submit" 
              disabled={formLoading} 
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-violet-500/20 disabled:opacity-50"
            >
              {formLoading ? 'Gönderiliyor...' : 'Talebi Gönder'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Ticket Details & Chat Panel Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="absolute inset-0" onClick={() => setSelectedTicket(null)}></div>
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1c1f2e] h-screen shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.01]">
              <div className="min-w-0">
                <span className="inline-block px-2 py-0.5 bg-violet-500/10 text-violet-500 rounded text-[9px] font-bold uppercase tracking-wider mb-1">
                  {selectedTicket.category}
                </span>
                <h3 className="text-[13px] font-extrabold text-slate-800 dark:text-white truncate">
                  {selectedTicket.subject}
                </h3>
                <span className="text-[9px] font-bold text-slate-400 mt-1 block">
                  Talep ID: {selectedTicket.id.substring(0, 8).toUpperCase()} • Öncelik: {selectedTicket.priority}
                </span>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conversation Log Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-[#151722] scrollbar-thin">
              {selectedTicket.comments?.map((comment: any) => {
                const isMe = comment.sender === 'user';
                return (
                  <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] font-bold text-slate-400 mb-1 px-1">
                      {comment.senderName} • {new Date(comment.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div 
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[12px] font-medium leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                        isMe 
                          ? 'bg-violet-600 text-white rounded-tr-none' 
                          : 'bg-white dark:bg-[#1c1f2e] text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-white/5 rounded-tl-none'
                      }`}
                    >
                      {comment.text}
                    </div>
                  </div>
                );
              })}
              <div ref={commentsEndRef} />
            </div>

            {/* Reply Form Footer */}
            {selectedTicket.status !== 'KAPALI' ? (
              <form onSubmit={handleSendReply} className="p-3 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-[#1c1f2e] flex items-center gap-2">
                <input 
                  type="text" 
                  value={replyText} 
                  onChange={(e) => setReplyText(e.target.value)} 
                  placeholder="Destek temsilcisine yanıt yazın..."
                  className="flex-grow px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-violet-500 transition-all text-slate-900 dark:text-white"
                />
                <button 
                  type="submit" 
                  disabled={replyLoading || !replyText.trim()} 
                  className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-md shadow-violet-500/20 disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </form>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-[#1a1c29] border-t border-slate-100 dark:border-white/5 text-center text-[11px] font-bold text-slate-400 uppercase">
                Bu destek talebi kapatılmıştır. Yanıt gönderilemez.
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!closeConfirmId}
        onClose={() => setCloseConfirmId(null)}
        onConfirm={() => closeConfirmId && handleCloseTicket(closeConfirmId)}
        title="Destek Talebini Kapat"
        message="Bu destek talebini kapatmak istediğinize emin misiniz?"
        confirmLabel="Evet, Kapat"
        variant="default"
      />
    </MetronicLayout>
  );
}
