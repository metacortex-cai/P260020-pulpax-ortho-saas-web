'use client';

import { useState, useEffect, useRef } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import { InventoryService, Supplier } from '../../../lib/services/inventory.service';
import Skeleton from '../../../components/ui/Skeleton';
import Dropdown from '../../../components/ui/Dropdown';
import { Plus, Building2, Phone, Mail, User, Search, ChevronDown, Download, Filter, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToastStore } from '../../../store/toastStore';

const supplierSchema = z.object({
  name: z.string().min(1, 'Firma adı zorunludur'),
  contactPerson: z.string().optional(),
  email: z.string().email('Geçersiz email').or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

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

function PgBtn({
  onClick, disabled, active, children,
}: { onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
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
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);

  const addToast = useToastStore(state => state.addToast);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await InventoryService.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Tedarikçiler yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchSuppliers is redefined every render (not memoized); including it would re-run this effect on every render
  }, []);

  const onSubmit = async (data: SupplierFormData) => {
    try {
      await InventoryService.createSupplier(data as any);
      addToast({ title: 'Başarılı', message: 'Tedarikçi eklendi.', type: 'success' });
      setModalOpen(false);
      reset();
      fetchSuppliers();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Kayıt sırasında hata oluştu.', type: 'error' });
    }
  };

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const filtered = suppliers.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.contactPerson ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      (s.phone ?? '').toLowerCase().includes(q);
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && s.isActive) ||
      (filterStatus === 'inactive' && !s.isActive);
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    let va: any, vb: any;
    switch (sortColumn) {
      case 'name':          va = a.name;                  vb = b.name;                  break;
      case 'contactPerson': va = a.contactPerson ?? '';   vb = b.contactPerson ?? '';   break;
      case 'email':         va = a.email ?? '';           vb = b.email ?? '';           break;
      case 'phone':         va = a.phone ?? '';           vb = b.phone ?? '';           break;
      default:              va = '';                      vb = '';
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
    const headers = ['Firma Adı', 'İlgili Kişi', 'E-Posta', 'Telefon', 'Durum'];
    const rows = filtered.map(s => [
      s.name,
      s.contactPerson ?? '',
      s.email ?? '',
      s.phone ?? '',
      s.isActive ? 'Aktif' : 'Pasif',
    ]);
    const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tedarikciler.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterLabel = filterStatus === 'active' ? 'Aktif' : filterStatus === 'inactive' ? 'Pasif' : 'Tüm Durumlar';

  return (
    <MetronicLayout title="Tedarikçiler" breadcrumbs={['Stok & Depo', 'Tedarikçiler']}>
      <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}.fade-in-down{animation:fadeInDown .22s ease both}`}</style>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <Building2 size={20} className="text-metronic-primary" /> Tedarikçi Firmalar
          </h3>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[12px] font-bold">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Firma veya kişi ara..."
              className="h-9 pl-9 pr-3 text-[13px] border border-slate-200 rounded-lg bg-white w-52 focus:outline-none focus:border-metronic-primary shadow-sm"
            />
          </div>

          <Dropdown trigger={<DropdownTrigger label={<><Filter size={14} />&nbsp;{filterLabel}</>} />}>
            <DropdownItem active={filterStatus === 'all'} onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}>Tümü</DropdownItem>
            <DropdownItem active={filterStatus === 'active'} onClick={() => { setFilterStatus('active'); setCurrentPage(1); }}>Aktif</DropdownItem>
            <DropdownItem active={filterStatus === 'inactive'} onClick={() => { setFilterStatus('inactive'); setCurrentPage(1); }}>Pasif</DropdownItem>
          </Dropdown>

          <Dropdown trigger={<DropdownTrigger label={<><Download size={14} />&nbsp;Dışa Aktar</>} />}>
            <DropdownItem onClick={exportCSV}>CSV olarak indir</DropdownItem>
          </Dropdown>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary text-white rounded-lg text-[13px] font-bold hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Plus size={16} /> Yeni Tedarikçi Ekle
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="m-card shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <SortableHeader column="name"          label="Firma Adı"    sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="pl-6" />
                <SortableHeader column="contactPerson" label="İlgili Kişi"  sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader column="email"         label="E-Posta"      sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader column="phone"         label="Telefon"      sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="py-3 px-5 text-[11px] font-bold text-slate-400 uppercase text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="py-3.5 px-5"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length > 0 ? (
                paginated.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-3 px-5 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-metronic-primary/10 group-hover:text-metronic-primary transition-colors flex-shrink-0">
                          <Building2 size={16} />
                        </div>
                        <span className="text-[14px] font-bold text-slate-700">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-[13px] text-slate-500">
                      {s.contactPerson ? (
                        <span className="flex items-center gap-1.5"><User size={13} className="text-slate-400" />{s.contactPerson}</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-5 text-[13px] text-slate-500">
                      {s.email ? (
                        <span className="flex items-center gap-1.5 no-capitalize"><Mail size={13} className="text-slate-400" />{s.email}</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-5 text-[13px] text-slate-500">
                      {s.phone ? (
                        <span className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" />{s.phone}</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-5 text-center">
                      {s.isActive ? (
                        <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded uppercase">Aktif</span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">Pasif</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-[14px]">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Arama kriterlerine uygun tedarikçi bulunamadı.'
                      : 'Henüz tedarikçi eklenmemiş.'}
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
        title="Yeni Tedarikçi Ekle"
        size="md"
        footer={
          <button
            form="add-supplier"
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600"
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        }
      >
        <form id="add-supplier" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Firma Adı</label>
            <input type="text" {...register('name')} className={`m-input mt-1 ${errors.name ? 'border-red-500' : ''}`} placeholder="Örn: Diş Deposu A.Ş." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">İlgili Kişi</label>
              <input type="text" {...register('contactPerson')} className="m-input mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Telefon</label>
              <input type="text" {...register('phone')} className="m-input mt-1" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">E-Posta</label>
            <input type="email" {...register('email')} className="m-input mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vergi Dairesi</label>
              <input type="text" {...register('taxOffice')} className="m-input mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vergi No</label>
              <input type="text" {...register('taxNumber')} className="m-input mt-1" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Adres</label>
            <textarea {...register('address')} className="m-input mt-1 h-20 resize-none"></textarea>
          </div>
        </form>
      </Modal>
    </MetronicLayout>
  );
}
