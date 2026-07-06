'use client';

import { useState, useEffect, useRef } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import { InventoryService, InventoryItem } from '../../../lib/services/inventory.service';
import Skeleton from '../../../components/ui/Skeleton';
import { Plus, Package, Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ChevronDown, Check, Download, FileText, Filter, X } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToastStore } from '../../../store/toastStore';

const itemSchema = z.object({
  name: z.string().min(1, 'Ad zorunludur'),
  category: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  unit: z.string().min(1, 'Birim zorunludur'),
  criticalLevel: z.string().transform(v => parseFloat(v) || 0),
  description: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;


function DropdownItem({ icon, label, active, onClick }: { icon?: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${active ? 'bg-metronic-primary/5 text-metronic-primary font-bold' : 'text-slate-700 hover:bg-slate-50 hover:text-metronic-primary'}`}>
      {icon}{label}{active && <Check size={12} className="ml-auto text-metronic-primary" />}
    </button>
  );
}

function SortableHeader({ label, column, sortColumn, sortDirection, onSort, align = 'left' }: { label: string; column: string; sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (col: string) => void; align?: 'left' | 'right' }) {
  const isActive = sortColumn === column;
  return (
    <th onClick={() => onSort(column)} className={`py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-metronic-primary transition-colors select-none ${align === 'right' ? 'text-right' : ''}`}>
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>{label}{isActive && (sortDirection === 'asc' ? <ArrowUp size={12} className="text-metronic-primary" /> : <ArrowDown size={12} className="text-metronic-primary" />)}</div>
    </th>
  );
}

export default function MaterialsPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const addToast = useToastStore(state => state.addToast);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema) as any,
    defaultValues: { unit: 'ADET', criticalLevel: '10' as any }
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await InventoryService.getItems();
      setItems(data);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Malzemeler yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchItems is redefined every render (not memoized); including it would re-run this effect on every render
  }, []);

  const onSubmit = async (data: ItemFormData) => {
    try {
      await InventoryService.createItem(data);
      addToast({ title: 'Başarılı', message: 'Malzeme eklendi.', type: 'success' });
      setModalOpen(false);
      reset();
      fetchItems();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Kayıt sırasında hata oluştu.', type: 'error' });
    }
  };

  const uniqueCategories = Array.from(new Set(items.map(i => i.category).filter(Boolean)));
  const uniqueUnits = Array.from(new Set(items.map(i => i.unit).filter(Boolean)));

  const filtered = items.filter(item => {
    const matchSearch = !searchTerm || [item.name, item.sku || '', item.barcode || '', item.category || '']
      .join(' ').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || item.category === filterCategory;
    const matchUnit = !filterUnit || item.unit === filterUnit;
    return matchSearch && matchCategory && matchUnit;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = (a as any)[sortColumn] ?? '';
    const bVal = (b as any)[sortColumn] ?? '';
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Reset pagination whenever filters/page size change. Pure derived-state
  // reset (no async/external work), computed during render instead of in an
  // effect to avoid an extra cascading render.
  const filterKey = `${searchTerm}|${filterCategory}|${filterUnit}|${pageLimit}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
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
      ['Malzeme Adı', 'SKU', 'Barkod', 'Kategori', 'Birim', 'Kritik Seviye'],
      ...sorted.map(item => [item.name, item.sku || '-', item.barcode || '-', item.category || '-', item.unit, String(item.criticalLevel)]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'malzemeler.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MetronicLayout title="Malzemeler" breadcrumbs={['Stok & Depo', 'Malzemeler']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div className="m-card shadow-sm border border-slate-200/60 rounded-xl overflow-hidden bg-white">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 gap-4">
          <div className="flex items-center gap-3">
            <Package size={20} className="text-metronic-primary" />
            <h3 className="text-[1.05rem] font-bold text-slate-800 tracking-tight m-0">Malzeme Listesi</h3>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200">{filtered.length} Kayıt</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="Malzeme, SKU, barkod ara..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 h-9 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-metronic-primary text-[13px] font-medium text-slate-700 placeholder-slate-400" />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <Dropdown align="right" trigger={
              <button className={`flex items-center gap-1.5 h-9 px-3 border rounded-lg text-[13px] font-medium shadow-sm transition-colors ${filterCategory || filterUnit ? 'bg-metronic-primary/5 border-metronic-primary/30 text-metronic-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Filter size={15} /> Filtrele {(filterCategory || filterUnit) && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary" />} <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase">Kategori</p></div>
              <DropdownItem label="Tüm Kategoriler" active={!filterCategory} onClick={() => setFilterCategory('')} />
              {uniqueCategories.map(c => <DropdownItem key={c as string} label={c as string} active={filterCategory === c} onClick={() => setFilterCategory(filterCategory === c ? '' : c as string)} />)}
              <div className="px-4 py-2 border-t border-b border-slate-100 mt-1"><p className="text-[11px] font-bold text-slate-400 uppercase">Birim</p></div>
              <DropdownItem label="Tüm Birimler" active={!filterUnit} onClick={() => setFilterUnit('')} />
              {uniqueUnits.map(u => <DropdownItem key={u as string} label={u as string} active={filterUnit === u} onClick={() => setFilterUnit(filterUnit === u ? '' : u as string)} />)}
              {(filterCategory || filterUnit) && <div className="border-t border-slate-100 mt-1 px-3 py-2"><button onClick={() => { setFilterCategory(''); setFilterUnit(''); }} className="w-full text-center text-[12px] font-bold text-rose-500">Filtreleri Temizle</button></div>}
            </Dropdown>
            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase">Format Seçin</p></div>
              <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 h-9 px-3 bg-metronic-primary text-white rounded-lg text-[13px] font-bold hover:bg-blue-600 transition-colors"><Plus size={16} /> Yeni Malzeme</button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <SortableHeader label="Malzeme Adı" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="SKU / Barkod" column="sku" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Kategori" column="category" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Birim" column="unit" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="Kritik Seviye" column="criticalLevel" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => <td key={j} className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>)}
                  </tr>
                ))
              ) : paginated.length > 0 ? (
                paginated.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6 text-[13px] font-semibold text-slate-700">
                      <div className="flex items-center gap-2"><Package size={14} className="text-metronic-primary" /> {item.name}</div>
                    </td>
                    <td className="py-3 px-6 text-[12px] text-slate-500">{item.sku || '-'} / {item.barcode || '-'}</td>
                    <td className="py-3 px-6 text-[13px] text-slate-600">{item.category || '-'}</td>
                    <td className="py-3 px-6 text-[13px] text-slate-600 font-bold">{item.unit}</td>
                    <td className="py-3 px-6 text-[13px] text-orange-600 font-bold">{item.criticalLevel}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400">{searchTerm || filterCategory || filterUnit ? 'Eşleşen kayıt bulunamadı.' : 'Malzeme bulunamadı.'}</td></tr>
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
                return <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-bold ${page === currentPage ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>{page}</button>;
              })}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[11px] font-bold">»</button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Malzeme Ekle" size="md" footer={<button form="add-item" type="submit" disabled={isSubmitting} className="px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600">{isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}</button>}>
        <form id="add-item" onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Malzeme Adı</label>
            <input type="text" {...register('name')} className={`m-input mt-1 ${errors.name ? 'border-red-500' : ''}`} placeholder="Örn: Kompozit Dolgu A2" />
            {errors.name && <span className="text-[11px] text-red-500 mt-1">{errors.name.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SKU</label>
              <input type="text" {...register('sku')} className="m-input mt-1" placeholder="Stok Kodu" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Barkod</label>
              <input type="text" {...register('barcode')} className="m-input mt-1" placeholder="EAN/UPC" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kategori</label>
              <input type="text" {...register('category')} className="m-input mt-1" placeholder="Örn: Sarf Malzeme" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Birim</label>
              <select {...register('unit')} className="m-input mt-1">
                <option value="ADET">Adet</option>
                <option value="KUTU">Kutu</option>
                <option value="PAKET">Paket</option>
                <option value="SET">Set</option>
                <option value="ML">ML</option>
                <option value="GR">Gram</option>
                <option value="KG">KG</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kritik Stok Seviyesi</label>
            <input type="number" {...register('criticalLevel')} className="m-input mt-1" />
            <p className="text-[11px] text-slate-400 mt-1">Stok bu seviyenin altına düştüğünde uyarı verilir.</p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Açıklama</label>
            <textarea {...register('description')} className="m-input mt-1 h-20 resize-none"></textarea>
          </div>
        </form>
      </Modal>
    </MetronicLayout>
  );
}
