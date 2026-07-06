'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import Modal from '../../../components/ui/Modal';
import { FinanceService } from '../../../lib/services/finance.service';
import { useToastStore } from '../../../store/toastStore';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight, Settings,
  X, FileText, FileSpreadsheet, ChevronDown, CheckSquare,
  Wallet, Building2, Plus, Save, ArrowRightLeft, CreditCard,
  Building, CheckCircle2, XCircle, ArrowUp, ArrowDown
} from 'lucide-react';



function DropdownItem({ icon, label, danger = false, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

// Sıralanabilir tablo başlığı
function SortableHeader({ label, column, sortColumn, sortDirection, onSort }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void }) {
  const isActive = sortColumn === column;
  return (
    <th 
      onClick={() => onSort(column)}
      className="py-3 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-metronic-primary transition-colors"
    >
      <div className="flex items-center gap-2">
        {label}
        {isActive && (sortDirection === 'asc' ? <ArrowUp size={13} className="text-metronic-primary" /> : <ArrowDown size={13} className="text-metronic-primary" />)}
      </div>
    </th>
  );
}

const TYPE_MAP: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  'KASA': { icon: <Wallet size={14} />, cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10', label: 'Nakit Kasa' },
  'BANKA': { icon: <Building2 size={14} />, cls: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10', label: 'Banka Hesabı' },
  'POS': { icon: <CreditCard size={14} />, cls: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10', label: 'POS Hesabı' },
};

const STATUS_MAP: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
  'AKTİF': { icon: <CheckCircle2 size={13} />, cls: 'bg-metronic-success-light text-metronic-success dark:bg-metronic-success/10', label: 'Aktif' },
  'PASİF': { icon: <XCircle size={13} />, cls: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400', label: 'Pasif' },
};

function fmt(n: number, currency: string = 'TRY') { 
  const symbol = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ' + symbol; 
}

export default function VaultsBanksPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', type: 'KASA', currency: 'TRY', initialBalance: '0', bankName: '', branch: '', iban: '' });
  const [transferData, setTransferData] = useState({ fromId: '', toId: '', amount: '', note: '' });
  const [formLoading, setFormLoading] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const accounts = await FinanceService.getAccounts();
      setRecords(accounts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        balance: a.balance,
        lastTx: '—',
        status: a.isActive ? 'AKTİF' : 'PASİF',
        bankName: a.bankName || '',
        branch: a.branch || '',
        iban: a.iban || '',
      })));
    } catch (err) {
      console.error('Failed to fetch financial accounts:', err);
      addToast({ title: 'Hata', message: 'Kasa/banka hesapları yüklenemedi.', type: 'error' });
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchAccounts();
  }, [user, router, fetchAccounts]);

  const filtered = records.filter(r => [r.name, r.type, r.bankName, r.iban].join(' ').toLowerCase().includes(searchTerm.toLowerCase()));
  
  const getSortedData = () => {
    let sorted = [...filtered];
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal = a[sortColumn as keyof typeof a];
        let bVal = b[sortColumn as keyof typeof b];
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal as any).toLowerCase?.() || bVal;
        } else if (typeof aVal === 'number') {
          // Keep as is for numeric comparison
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

  // Reset pagination to page 1 whenever the search term changes,
  // without a separate effect (React docs: adjust state during render).
  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
  if (searchTerm !== prevSearchTerm) {
    setPrevSearchTerm(searchTerm);
    setCurrentPage(1);
  }

  const allSelected = filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));
  const someSelected = filtered.some(r => selectedIds.has(r.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(paginated.map(r => r.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Sadece TRY bazındaki toplamı gösterelim (Gerçekte kur çevrimi yapılabilir)
  const tryAccounts = records.filter(r => r.currency === 'TRY' && r.status === 'AKTİF');
  const totalBalanceTry = tryAccounts.reduce((s, r) => s + r.balance, 0);
  const vaultCount = records.filter(r => r.type === 'KASA' && r.status === 'AKTİF').length;
  const bankCount = records.filter(r => (r.type === 'BANKA' || r.type === 'POS') && r.status === 'AKTİF').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await FinanceService.createAccount({
        name: formData.name,
        type: formData.type,
        currency: formData.currency,
        initialBalance: parseFloat(formData.initialBalance) || 0,
        bankName: formData.bankName || undefined,
        branch: formData.branch || undefined,
        iban: formData.iban || undefined,
      });
      addToast({ title: 'Başarılı', message: 'Hesap başarıyla oluşturuldu.', type: 'success' });
      setModalOpen(false);
      setFormData({ name: '', type: 'KASA', currency: 'TRY', initialBalance: '0', bankName: '', branch: '', iban: '' });
      await fetchAccounts();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Hesap oluşturulurken bir hata oluştu.', type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setTimeout(() => {
      setTransferModalOpen(false);
      setTransferData({ fromId: '', toId: '', amount: '', note: '' });
      setFormLoading(false);
    }, 500);
  };

  const exportCSV = () => {
    const rows = [
      ['Hesap Adı', 'Tür', 'Bakiye', 'Durum', 'Banka', 'IBAN'],
      ...sortedData.map(r => [
        r.name,
        TYPE_MAP[r.type]?.label || r.type,
        r.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
        STATUS_MAP[r.status]?.label || r.status,
        r.bankName || '-',
        r.iban || '-',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'kasa_banka.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MetronicLayout title="Kasalar ve Bankalar" breadcrumbs={['Muhasebe', 'Kasa & Banka']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Toplam Bakiye (₺)', value: fmt(totalBalanceTry), icon: <Wallet size={20} />, color: 'text-metronic-primary', bg: 'bg-metronic-primary-light dark:bg-metronic-primary/10' },
          { label: 'Aktif Kasalar', value: `${vaultCount} adet`, icon: <Building size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Banka / POS Hesapları', value: `${bankCount} adet`, icon: <Building2 size={20} />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
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

      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} kayıt seçildi</span>
            </div>
            <button onClick={() => setSelectedIds(new Set())} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"><X size={15} /></button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Hesap Listesi</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input type="text" placeholder="Hesap adı, banka vb. ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><Filter size={15} /> Filtrele <ChevronDown size={13} className="text-slate-400" /></button>}>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tür</p></div>
              <DropdownItem icon={<Wallet size={14} />} label="Kasalar" />
              <DropdownItem icon={<Building2 size={14} />} label="Bankalar" />
              <DropdownItem icon={<CreditCard size={14} />} label="POS" />
            </Dropdown>

            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p></div>
              <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>

            <button onClick={() => setTransferModalOpen(true)} className="flex items-center gap-1.5 h-9 px-4 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm">
              <ArrowRightLeft size={16} /> Virman (Transfer)
            </button>
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm">
              <Plus size={16} /> Yeni Hesap Ekle
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10"><input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></th>
                <SortableHeader label="Hesap Adı & Detay" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Tür" column="type" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">Güncel Bakiye</th>
                <SortableHeader label="Son İşlem" column="lastTx" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Durum</th>
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Yükleniyor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Eşleşen kayıt bulunamadı.</td></tr>
              ) : paginated.map(r => {
                const isSelected = selectedIds.has(r.id);
                const typeInfo = TYPE_MAP[r.type] || TYPE_MAP['KASA'];
                const statusInfo = STATUS_MAP[r.status] || STATUS_MAP['PASİF'];
                
                return (
                  <tr key={r.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                    <td className="py-3 pl-6 pr-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-slate-800 dark:text-slate-100 font-bold text-[13px]">{r.name}</span>
                        {r.type === 'BANKA' && r.iban ? (
                          <span className="text-slate-400 text-[11px] font-semibold mt-0.5">{r.bankName} - {r.iban}</span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-semibold mt-0.5 text-opacity-70">{r.id}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold ${typeInfo.cls}`}>
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-[14px] font-bold tracking-tight ${r.balance < 0 ? 'text-metronic-danger' : r.balance > 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}`}>
                        {fmt(r.balance, r.currency)}
                      </span>
                    </td>
                    <td className="py-3 px-4"><span className="text-slate-500 dark:text-slate-400 font-medium text-[13px]">{r.lastTx}</span></td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold ${statusInfo.cls}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-3 pl-4 pr-6 text-right">
                      <Dropdown align="right" trigger={<button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors ml-auto"><Settings size={16} /></button>}>
                        <DropdownItem icon={<FileText size={14} />} label="Hesap Hareketleri" />
                        {r.status === 'AKTİF' && (
                          <DropdownItem icon={<ArrowRightLeft size={14} />} label="Para Transferi Yap" onClick={() => { setTransferData(p => ({ ...p, fromId: r.id })); setTransferModalOpen(true); }} />
                        )}
                        <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                        <DropdownItem icon={<XCircle size={14} />} danger label={r.status === 'AKTİF' ? 'Hesabı Kapat' : 'Hesabı Aktifleştir'} />
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-xl">
          <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">Toplam <span className="font-bold text-slate-700 dark:text-slate-200">{filtered.length}</span> hesap</span>
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

      {/* NEW ACCOUNT MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Hesap Ekle" subtitle="Sisteme yeni bir kasa veya banka hesabı tanımlayın." size="lg" footer={
        <><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
        <button form="account-form" type="submit" disabled={formLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70"><Save size={15} />{formLoading ? 'Kaydediliyor...' : 'Hesabı Kaydet'}</button></>
      }>
        <form id="account-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hesap Türü <span className="text-metronic-danger">*</span></label>
              <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="m-input">
                <option value="KASA">Kasa Hesabı</option>
                <option value="BANKA">Banka Hesabı</option>
                <option value="POS">POS Cihazı / Hesabı</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hesap Adı <span className="text-metronic-danger">*</span></label>
              <input required type="text" placeholder="Örn: Merkez Kasa" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Para Birimi</label>
              <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} className="m-input">
                <option value="TRY">TRY - Türk Lirası</option>
                <option value="USD">USD - Amerikan Doları</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Açılış Bakiyesi</label>
              <input type="number" step="0.01" placeholder="0.00" value={formData.initialBalance} onChange={e => setFormData({ ...formData, initialBalance: e.target.value })} className="m-input" />
            </div>
          </div>

          {(formData.type === 'BANKA' || formData.type === 'POS') && (
            <>
              <div className="border-t border-slate-200 dark:border-white/10 my-2"></div>
              <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-2">Banka Detayları</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Banka Adı</label>
                  <input type="text" placeholder="Örn: Garanti BBVA" value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} className="m-input" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Şube</label>
                  <input type="text" placeholder="Örn: Kadıköy Şubesi" value={formData.branch} onChange={e => setFormData({ ...formData, branch: e.target.value })} className="m-input" />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">IBAN</label>
                  <input type="text" placeholder="TR..." value={formData.iban} onChange={e => setFormData({ ...formData, iban: e.target.value })} className="m-input font-mono tracking-wider" />
                </div>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* TRANSFER MODAL */}
      <Modal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Virman (Para Transferi)" subtitle="Hesaplar arası para transferi gerçekleştirin." size="md" footer={
        <><button type="button" onClick={() => setTransferModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
        <button form="transfer-form" type="submit" disabled={formLoading || transferData.fromId === transferData.toId} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-70"><ArrowRightLeft size={15} />{formLoading ? 'İşleniyor...' : 'Transferi Tamamla'}</button></>
      }>
        <form id="transfer-form" onSubmit={handleTransfer} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Gönderen Hesap (Çıkış) <span className="text-metronic-danger">*</span></label>
            <select required value={transferData.fromId} onChange={e => setTransferData({ ...transferData, fromId: e.target.value })} className="m-input">
              <option value="">Hesap seçiniz...</option>
              {records.filter(r => r.status === 'AKTİF').map(r => <option key={r.id} value={r.id}>{r.name} ({fmt(r.balance, r.currency)})</option>)}
            </select>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shadow-sm">
              <ArrowRightLeft size={14} className="rotate-90" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Alıcı Hesap (Giriş) <span className="text-metronic-danger">*</span></label>
            <select required value={transferData.toId} onChange={e => setTransferData({ ...transferData, toId: e.target.value })} className="m-input">
              <option value="">Hesap seçiniz...</option>
              {records.filter(r => r.status === 'AKTİF' && r.id !== transferData.fromId).map(r => <option key={r.id} value={r.id}>{r.name} ({fmt(r.balance, r.currency)})</option>)}
            </select>
            {transferData.fromId && transferData.toId && transferData.fromId === transferData.toId && (
              <span className="text-[11px] text-metronic-danger">Gönderen ve alıcı hesap aynı olamaz.</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tutar <span className="text-metronic-danger">*</span></label>
            <div className="relative">
              <input required type="number" min="0.01" step="0.01" placeholder="0.00" value={transferData.amount} onChange={e => setTransferData({ ...transferData, amount: e.target.value })} className="m-input pr-12 text-lg font-bold" />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500 font-bold">₺</div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Açıklama</label>
            <input type="text" placeholder="Transfer nedeni vb." value={transferData.note} onChange={e => setTransferData({ ...transferData, note: e.target.value })} className="m-input" />
          </div>
        </form>
      </Modal>
    </MetronicLayout>
  );
}
