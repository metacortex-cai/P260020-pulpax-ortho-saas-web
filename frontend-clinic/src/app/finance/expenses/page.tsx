'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import { FinanceService, Expense, ExpenseCategory } from '../../../lib/services/finance.service';
import Skeleton from '../../../components/ui/Skeleton';
import { Plus, Receipt, Search, Filter, Trash2, Edit2, Calendar, CreditCard, Banknote, Landmark, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ChevronDown, Check, Download, FileText, X } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToastStore } from '../../../store/toastStore';

const expenseSchema = z.object({
  categoryId: z.string().min(1, 'Kategori seçilmelidir'),
  amount: z.string().transform(v => parseFloat(v) || 0),
  description: z.string().optional(),
  expenseDate: z.string().min(1, 'Tarih zorunludur'),
  paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'TRANSFER']),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;


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
    <th onClick={() => onSort(column)} className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-metronic-primary transition-colors select-none">
      <div className="flex items-center gap-1.5">{label}{isActive && (sortDirection === 'asc' ? <ArrowUp size={12} className="text-metronic-primary" /> : <ArrowDown size={12} className="text-metronic-primary" />)}</div>
    </th>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>('expenseDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const addToast = useToastStore(state => state.addToast);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'CASH'
    }
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [expData, catData] = await Promise.all([
        FinanceService.getExpenses(),
        FinanceService.getExpenseCategories()
      ]);
      setExpenses(expData);
      setCategories(catData);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Giderler yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchData();
  }, [fetchData]);

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      await FinanceService.createExpense(data as any);
      addToast({ title: 'Başarılı', message: 'Gider kaydı eklendi.', type: 'success' });
      setModalOpen(false);
      reset();
      fetchData();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Kayıt sırasında hata oluştu.', type: 'error' });
    }
  };

  const handleCreateCategory = async (e: any) => {
    e.preventDefault();
    const name = e.target.catName.value;
    if (!name) return;
    try {
      await FinanceService.createExpenseCategory({ name });
      addToast({ title: 'Başarılı', message: 'Kategori eklendi.', type: 'success' });
      setCatModalOpen(false);
      fetchData();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Kategori eklenemedi.', type: 'error' });
    }
  };

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

  const PAYMENT_LABELS: Record<string, string> = {
    CASH: 'Nakit',
    CREDIT_CARD: 'Kredi Kartı',
    TRANSFER: 'Havale / EFT',
  };

  const filtered = expenses.filter(exp => {
    const matchSearch = !searchTerm || [
      new Date(exp.expenseDate).toLocaleDateString('tr-TR'),
      exp.category.name,
      exp.description || '',
      PAYMENT_LABELS[exp.paymentMethod] || exp.paymentMethod,
      String(exp.amount),
    ].join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || exp.category.name === filterCategory;
    const matchMethod = !filterMethod || exp.paymentMethod === filterMethod;
    return matchSearch && matchCategory && matchMethod;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal: any, bVal: any;
    if (sortColumn === 'expenseDate') { aVal = new Date(a.expenseDate).getTime(); bVal = new Date(b.expenseDate).getTime(); }
    else if (sortColumn === 'amount') { aVal = Number(a.amount); bVal = Number(b.amount); }
    else if (sortColumn === 'category') { aVal = a.category.name; bVal = b.category.name; }
    else if (sortColumn === 'paymentMethod') { aVal = PAYMENT_LABELS[a.paymentMethod]; bVal = PAYMENT_LABELS[b.paymentMethod]; }
    else { aVal = ''; bVal = ''; }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Reset pagination to page 1 whenever the filters/search/page size change,
  // without a separate effect (React docs: adjust state during render).
  const [prevFilters, setPrevFilters] = useState({ searchTerm, filterCategory, filterMethod, pageLimit });
  if (
    searchTerm !== prevFilters.searchTerm ||
    filterCategory !== prevFilters.filterCategory ||
    filterMethod !== prevFilters.filterMethod ||
    pageLimit !== prevFilters.pageLimit
  ) {
    setPrevFilters({ searchTerm, filterCategory, filterMethod, pageLimit });
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));
  const paginated = sorted.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const uniqueCategories = Array.from(new Set(expenses.map(e => e.category.name)));

  const exportCSV = () => {
    const rows = [
      ['Tarih', 'Kategori', 'Açıklama', 'Ödeme Tipi', 'Tutar'],
      ...sorted.map(exp => [
        new Date(exp.expenseDate).toLocaleDateString('tr-TR'),
        exp.category.name,
        exp.description || '',
        PAYMENT_LABELS[exp.paymentMethod] || exp.paymentMethod,
        String(exp.amount),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'giderler.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MetronicLayout title="Gider Takibi" breadcrumbs={['Finans', 'Giderler']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div className="m-card shadow-sm border border-slate-200/60 rounded-xl overflow-hidden bg-white">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <Receipt size={20} className="text-metronic-primary" />
            <h3 className="text-[1.05rem] font-bold text-slate-800 tracking-tight m-0">Klinik Giderleri</h3>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="Tarih, kategori, açıklama ara..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 h-9 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-metronic-primary text-[13px] font-medium text-slate-700 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            {/* Filter */}
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterCategory || filterMethod ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Filter size={15} /> Filtrele {(filterCategory || filterMethod) && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kategori</p></div>
              <DropdownItem label="Tüm Kategoriler" active={!filterCategory} onClick={() => setFilterCategory('')} />
              {uniqueCategories.map(c => <DropdownItem key={c} label={c} active={filterCategory === c} onClick={() => setFilterCategory(filterCategory === c ? '' : c)} />)}
              <div className="px-4 py-2 border-t border-b border-slate-100 mt-1"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ödeme Tipi</p></div>
              <DropdownItem label="Tüm Tipler" active={!filterMethod} onClick={() => setFilterMethod('')} />
              <DropdownItem icon={<Banknote size={13} className="text-emerald-500" />} label="Nakit" active={filterMethod === 'CASH'} onClick={() => setFilterMethod(filterMethod === 'CASH' ? '' : 'CASH')} />
              <DropdownItem icon={<CreditCard size={13} className="text-blue-500" />} label="Kredi Kartı" active={filterMethod === 'CREDIT_CARD'} onClick={() => setFilterMethod(filterMethod === 'CREDIT_CARD' ? '' : 'CREDIT_CARD')} />
              <DropdownItem icon={<Landmark size={13} className="text-amber-500" />} label="Havale / EFT" active={filterMethod === 'TRANSFER'} onClick={() => setFilterMethod(filterMethod === 'TRANSFER' ? '' : 'TRANSFER')} />
              {(filterCategory || filterMethod) && <div className="border-t border-slate-100 mt-1 px-3 py-2"><button onClick={() => { setFilterCategory(''); setFilterMethod(''); }} className="w-full text-center text-[12px] font-bold text-rose-500">Filtreleri Temizle</button></div>}
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
            {/* Buttons */}
            <button onClick={() => setCatModalOpen(true)} className="flex items-center gap-1.5 h-9 px-3 bg-slate-100 text-slate-600 rounded-lg text-[13px] font-bold hover:bg-slate-200 transition-colors">Kategori Yönetimi</button>
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 h-9 px-3 bg-metronic-primary text-white rounded-lg text-[13px] font-bold hover:bg-blue-600 transition-colors shadow-sm"><Plus size={16} /> Yeni Gider Ekle</button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <SortableHeader label="Tarih" column="expenseDate" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Kategori" column="category" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase">Açıklama</th>
                <SortableHeader label="Ödeme Tipi" column="paymentMethod" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Tutar" column="amount" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-48 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : paginated.length > 0 ? (
                paginated.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6 text-[13px] text-slate-600">{new Date(exp.expenseDate).toLocaleDateString('tr-TR')}</td>
                    <td className="py-3 px-6"><span className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded">{exp.category.name}</span></td>
                    <td className="py-3 px-6 text-[13px] text-slate-700 font-medium">{exp.description || '-'}</td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-bold">
                        {exp.paymentMethod === 'CASH' && <Banknote size={14} className="text-emerald-500" />}
                        {exp.paymentMethod === 'CREDIT_CARD' && <CreditCard size={14} className="text-blue-500" />}
                        {exp.paymentMethod === 'TRANSFER' && <Landmark size={14} className="text-amber-500" />}
                        {PAYMENT_LABELS[exp.paymentMethod] || exp.paymentMethod}
                      </div>
                    </td>
                    <td className="py-3 px-6 text-right text-[14px] font-black text-red-600">{fmt(Number(exp.amount))}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400">{searchTerm || filterCategory || filterMethod ? 'Eşleşen kayıt bulunamadı.' : 'Gider kaydı bulunmuyor.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 gap-4">
            <div className="flex items-center gap-3">
              <select value={pageLimit} onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
                className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-md text-[12px] font-bold text-slate-600 outline-none cursor-pointer w-20">
                {[10, 25, 50, 100].map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <span className="text-slate-400 text-[12px] font-medium">sayfa</span>
              <div className="w-px h-4 bg-slate-200" />
              <span className="text-slate-500 text-[13px] font-medium">
                Toplam <span className="font-bold text-slate-700">{sorted.length}</span> kayıttan{' '}
                <span className="font-bold text-slate-700">{sorted.length === 0 ? 0 : Math.min((currentPage - 1) * pageLimit + 1, sorted.length)}–{Math.min(currentPage * pageLimit, sorted.length)}</span> arası
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">«</button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                return <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold transition-colors ${page === currentPage ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>{page}</button>;
              })}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">»</button>
            </div>
          </div>
        )}
      </div>

      {/* New Expense Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Gider Kaydı" size="md" footer={
        <button form="add-expense" type="submit" disabled={isSubmitting} className="px-6 py-2 bg-metronic-primary text-white rounded-lg font-bold hover:bg-blue-600 transition-all">
          {isSubmitting ? 'Kaydediliyor...' : 'Gideri Kaydet'}
        </button>
      }>
        <form id="add-expense" onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 py-2">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Kategori</label>
            <select {...register('categoryId')} className="m-input mt-1">
              <option value="">Kategori Seçiniz...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className="text-[10px] text-red-500 mt-1">{errors.categoryId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Tutar</label>
              <input type="number" step="0.01" {...register('amount')} className="m-input mt-1" placeholder="0.00" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Tarih</label>
              <input type="date" {...register('expenseDate')} className="m-input mt-1" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Ödeme Yöntemi</label>
            <select {...register('paymentMethod')} className="m-input mt-1">
              <option value="CASH">Nakit</option>
              <option value="CREDIT_CARD">Kredi Kartı</option>
              <option value="TRANSFER">Havale / EFT</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Açıklama</label>
            <textarea {...register('description')} className="m-input mt-1 h-20 resize-none" placeholder="Fatura no, detay vb."></textarea>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={catModalOpen} onClose={() => setCatModalOpen(false)} title="Kategori Yönetimi" size="sm">
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Yeni Kategori Adı</label>
            <div className="flex gap-2 mt-1">
              <input name="catName" type="text" className="m-input" placeholder="Örn: Kira" />
              <button type="submit" className="px-4 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600">Ekle</button>
            </div>
          </div>
          <div className="space-y-1 mt-4">
            <label className="text-[11px] font-bold text-slate-400 uppercase">Mevcut Kategoriler</label>
            <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {categories.map(c => (
                <div key={c.id} className="p-2 text-[13px] font-medium text-slate-600 flex justify-between items-center group">
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </MetronicLayout>
  );
}
