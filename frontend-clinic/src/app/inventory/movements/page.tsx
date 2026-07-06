'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import { InventoryService, InventoryItem, Warehouse, Supplier, StockMovement } from '../../../lib/services/inventory.service';
import Skeleton from '../../../components/ui/Skeleton';
import Dropdown from '../../../components/ui/Dropdown';
import { Plus, Search, History, ChevronDown, Download, Filter, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToastStore } from '../../../store/toastStore';
import { useSearchParams } from 'next/navigation';

const movementSchema = z.object({
  itemId: z.string().min(1, 'Ürün seçilmelidir'),
  type: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT']),
  quantity: z.string().transform(v => parseFloat(v) || 0),
  fromWarehouseId: z.string().optional(),
  toWarehouseId: z.string().optional(),
  supplierId: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  reason: z.string().optional(),
  note: z.string().optional(),
}).refine(data => {
  if (data.type === 'OUT' && !data.fromWarehouseId) return false;
  if (data.type === 'IN' && !data.toWarehouseId) return false;
  if (data.type === 'TRANSFER' && (!data.fromWarehouseId || !data.toWarehouseId)) return false;
  return true;
}, {
  message: 'Depo seçimi eksik.',
  path: ['fromWarehouseId']
});

type MovementFormData = z.infer<typeof movementSchema>;

const TYPE_LABELS: Record<string, string> = {
  IN: 'Giriş',
  OUT: 'Çıkış',
  TRANSFER: 'Transfer',
  ADJUSTMENT: 'Düzeltme',
};

const TYPE_COLORS: Record<string, string> = {
  IN: 'bg-emerald-100 text-emerald-700',
  OUT: 'bg-red-100 text-red-700',
  TRANSFER: 'bg-blue-100 text-blue-700',
  ADJUSTMENT: 'bg-amber-100 text-amber-700',
};

function DropdownTrigger({ label }: { label: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 h-9 px-3 border border-slate-200 rounded-lg text-[13px] font-medium text-slate-600 hover:border-slate-300 bg-white shadow-sm transition-colors"
    >
      {label}
      <ChevronDown size={14} />
    </button>
  );
}

function DropdownItem({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-[13px] transition-colors ${
        active ? 'bg-metronic-primary/10 text-metronic-primary font-bold' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function SortableHeader({
  column, label, sortColumn, sortDirection, onSort, className,
}: {
  column: string; label: string; sortColumn: string; sortDirection: 'asc' | 'desc';
  onSort: (col: string) => void; className?: string;
}) {
  const active = sortColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      className={`py-3 px-5 text-[11px] font-bold text-slate-400 uppercase cursor-pointer select-none hover:text-slate-600 transition-colors whitespace-nowrap ${className ?? ''}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={active ? 'text-metronic-primary' : 'text-slate-300'}>
          {active ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}

function MovementsContent() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortColumn, setSortColumn] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);

  const addToast = useToastStore(state => state.addToast);
  const searchParams = useSearchParams();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: (searchParams.get('type') as any) || 'IN',
      itemId: searchParams.get('itemId') || '',
    }
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() returns a function that cannot be safely memoized by the compiler
  const movementType = watch('type');

  const fetchMovements = async () => {
    try {
      const data = await InventoryService.getMovements();
      setMovements(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [itemsData, warehousesData, suppliersData, movementsData] = await Promise.all([
          InventoryService.getItems(),
          InventoryService.getWarehouses(),
          InventoryService.getSuppliers(),
          InventoryService.getMovements(),
        ]);
        setItems(itemsData);
        setWarehouses(warehousesData);
        setSuppliers(suppliersData);
        setMovements(movementsData);
      } catch (err) {
        console.error(err);
        addToast({ title: 'Hata', message: 'Veriler yüklenemedi.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [addToast]);

  const onSubmit = async (data: any) => {
    try {
      await InventoryService.createMovement(data as any);
      addToast({ title: 'Başarılı', message: 'Stok hareketi kaydedildi.', type: 'success' });
      setModalOpen(false);
      reset();
      await fetchMovements();
    } catch (err: any) {
      addToast({
        title: 'Hata',
        message: err.response?.data?.message || 'Kayıt sırasında hata oluştu.',
        type: 'error'
      });
    }
  };

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const filtered = movements.filter(m => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      (m.item?.name ?? '').toLowerCase().includes(q) ||
      (m.note ?? '').toLowerCase().includes(q) ||
      (m.batchNumber ?? '').toLowerCase().includes(q);
    const matchType = filterType === 'all' || m.type === filterType;
    return matchSearch && matchType;
  });

  const sorted = [...filtered].sort((a, b) => {
    let va: any, vb: any;
    switch (sortColumn) {
      case 'createdAt':   va = a.createdAt;          vb = b.createdAt;          break;
      case 'type':        va = a.type;               vb = b.type;               break;
      case 'itemName':    va = a.item?.name ?? '';   vb = b.item?.name ?? '';   break;
      case 'quantity':    va = a.quantity;            vb = b.quantity;           break;
      default:            va = '';                   vb = '';
    }
    if (va < vb) return sortDirection === 'asc' ? -1 : 1;
    if (va > vb) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageLimit));
  const paginated = sorted.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);
  const rangeStart = sorted.length === 0 ? 0 : (currentPage - 1) * pageLimit + 1;
  const rangeEnd = Math.min(currentPage * pageLimit, sorted.length);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const delta = 2;
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) pages.push(i);
    return pages;
  };

  const exportCSV = () => {
    const BOM = '﻿';
    const headers = ['Tarih', 'Tip', 'Malzeme', 'Miktar', 'Birim', 'Kaynak Depo', 'Hedef Depo', 'Not'];
    const rows = filtered.map(m => [
      new Date(m.createdAt).toLocaleDateString('tr-TR'),
      TYPE_LABELS[m.type] ?? m.type,
      m.item?.name ?? '',
      m.quantity,
      m.item?.unit ?? '',
      m.fromWarehouse?.name ?? '',
      m.toWarehouse?.name ?? '',
      m.note ?? '',
    ]);
    const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stok-hareketleri.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const PgBtn = ({
    onClick, disabled, active, children,
  }: { onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded text-[12px] font-bold transition-colors ${
        active
          ? 'bg-metronic-primary text-white'
          : disabled
          ? 'text-slate-300 cursor-not-allowed'
          : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );

  return (
    <MetronicLayout title="Stok Hareketleri" breadcrumbs={['Stok & Depo', 'Stok Hareketleri']}>
      <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}.fade-in-down{animation:fadeInDown .22s ease both}`}</style>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <History size={20} className="text-metronic-primary" /> Stok Hareketleri
          </h3>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[12px] font-bold">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Malzeme ara..."
              className="h-9 pl-9 pr-3 text-[13px] border border-slate-200 rounded-lg bg-white w-52 focus:outline-none focus:border-metronic-primary shadow-sm"
            />
          </div>

          <Dropdown trigger={<DropdownTrigger label={<><Filter size={14} />&nbsp;{filterType === 'all' ? 'Tüm Tipler' : TYPE_LABELS[filterType]}</>} />}>
            <DropdownItem active={filterType === 'all'} onClick={() => { setFilterType('all'); setCurrentPage(1); }}>Tümü</DropdownItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <DropdownItem key={k} active={filterType === k} onClick={() => { setFilterType(k); setCurrentPage(1); }}>{v}</DropdownItem>
            ))}
          </Dropdown>

          <Dropdown trigger={<DropdownTrigger label={<><Download size={14} />&nbsp;Dışa Aktar</>} />}>
            <DropdownItem onClick={exportCSV}>CSV olarak indir</DropdownItem>
          </Dropdown>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary text-white rounded-lg text-[13px] font-bold hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus size={16} /> Yeni Hareket Kaydet
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="m-card shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <SortableHeader column="createdAt" label="Tarih"    sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="pl-6" />
                <SortableHeader column="type"      label="Tip"      sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader column="itemName"  label="Malzeme"  sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader column="quantity"  label="Miktar"   sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-3 px-5 text-[11px] font-bold text-slate-400 uppercase">Kaynak Depo</th>
                <th className="py-3 px-5 text-[11px] font-bold text-slate-400 uppercase">Hedef Depo</th>
                <th className="py-3 px-5 text-[11px] font-bold text-slate-400 uppercase">Not</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="py-3.5 px-5"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length > 0 ? (
                paginated.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-5 pl-6 text-[13px] text-slate-500 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-5">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${TYPE_COLORS[m.type] ?? 'bg-slate-100 text-slate-600'}`}>
                        {TYPE_LABELS[m.type] ?? m.type}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-[13px] font-bold text-slate-700">{m.item?.name ?? '-'}</td>
                    <td className="py-3 px-5 text-[13px] font-extrabold text-metronic-primary">
                      {m.quantity}&nbsp;<span className="text-[11px] font-medium text-slate-400">{m.item?.unit ?? ''}</span>
                    </td>
                    <td className="py-3 px-5 text-[13px] text-slate-500">{m.fromWarehouse?.name ?? '-'}</td>
                    <td className="py-3 px-5 text-[13px] text-slate-500">{m.toWarehouse?.name ?? '-'}</td>
                    <td className="py-3 px-5 text-[13px] text-slate-400 max-w-[200px] truncate">{m.note ?? '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-[14px]">
                    {searchTerm || filterType !== 'all'
                      ? 'Arama kriterlerine uygun hareket bulunamadı.'
                      : 'Henüz stok hareketi bulunmuyor.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && sorted.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-slate-500">Sayfa başı:</span>
              <select
                value={pageLimit}
                onChange={e => { setPageLimit(Number(e.target.value)); setCurrentPage(1); }}
                className="h-8 px-2 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none"
              >
                {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <span className="text-[12px] text-slate-500">{rangeStart}–{rangeEnd} / {sorted.length} kayıt</span>
            <div className="flex items-center gap-1">
              <PgBtn onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft size={14} /></PgBtn>
              <PgBtn onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={14} /></PgBtn>
              {getPageNumbers().map(p => (
                <PgBtn key={p} onClick={() => setCurrentPage(p)} active={p === currentPage}>{p}</PgBtn>
              ))}
              <PgBtn onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={14} /></PgBtn>
              <PgBtn onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight size={14} /></PgBtn>
            </div>
          </div>
        )}
      </div>

      {/* Modal (unchanged) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Yeni Stok Hareketi Kaydet"
        size="lg"
        footer={
          <button
            form="add-movement"
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 shadow-md transition-all"
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Hareketi Onayla'}
          </button>
        }
      >
        <form id="add-movement" onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-2">

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hareket Tipi</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValue('type', type as any)}
                    className={`py-2 text-[12px] font-bold rounded-lg border transition-all ${
                      movementType === type
                        ? 'bg-metronic-primary/10 border-metronic-primary text-metronic-primary'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {type === 'IN' ? 'Giriş' : type === 'OUT' ? 'Çıkış' : type === 'TRANSFER' ? 'Transfer' : 'Düzeltme'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Malzeme / Ürün</label>
              <select {...register('itemId')} className={`m-input mt-1.5 ${errors.itemId ? 'border-red-500' : ''}`}>
                <option value="">Ürün Seçiniz...</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Miktar</label>
              <input type="number" {...register('quantity')} className={`m-input mt-1.5 ${errors.quantity ? 'border-red-500' : ''}`} placeholder="0.00" />
            </div>

            {(movementType === 'OUT' || movementType === 'TRANSFER') && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kaynak Depo</label>
                <select {...register('fromWarehouseId')} className="m-input mt-1.5">
                  <option value="">Depo Seçiniz...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(movementType === 'IN' || movementType === 'TRANSFER' || movementType === 'ADJUSTMENT') && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hedef Depo</label>
                <select {...register('toWarehouseId')} className="m-input mt-1.5">
                  <option value="">Depo Seçiniz...</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {movementType === 'IN' && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h5 className="text-[12px] font-bold text-slate-600 flex items-center gap-2">
                <Plus size={14} className="text-emerald-500" /> Giriş Detayları (Opsiyonel)
              </h5>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tedarikçi</label>
                  <select {...register('supplierId')} className="m-input mt-1 text-[13px]">
                    <option value="">Seçiniz...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Batch / Parti No</label>
                  <input type="text" {...register('batchNumber')} className="m-input mt-1 text-[13px]" placeholder="Örn: B-123" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">S.K.T.</label>
                  <input type="date" {...register('expiryDate')} className="m-input mt-1 text-[13px]" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Notlar / Sebep</label>
            <textarea {...register('note')} className="m-input mt-1.5 h-20 resize-none" placeholder="Bu işlemle ilgili ek açıklama..."></textarea>
          </div>
        </form>
      </Modal>
    </MetronicLayout>
  );
}

export default function MovementsPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <MovementsContent />
    </Suspense>
  );
}
