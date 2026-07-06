'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Stethoscope,
  Edit2,
  Trash2,
  Loader2,
  X,
  Download,
  FileSpreadsheet,
  FileText,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import SaasMetronicLayout from '../../../components/layout/SaasMetronicLayout';
import Modal from '../../../components/ui/Modal';
import { SaasService, MasterTreatment } from '../../../lib/services/saas.service';
import { useToastStore } from '../../../store/toastStore';

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-slate-100 dark:border-white/5">
          <td className="px-5 py-3.5 text-center">
            <div className="h-4 w-6 rounded bg-slate-200 dark:bg-white/10 mx-auto" />
          </td>
          <td className="px-5 py-3.5">
            <div className="h-4 w-48 rounded bg-slate-200 dark:bg-white/10" />
          </td>
          <td className="px-5 py-3.5">
            <div className="h-4 w-24 rounded bg-slate-200 dark:bg-white/10" />
          </td>
          <td className="px-5 py-3.5" />
        </tr>
      ))}
    </>
  );
}

// File-local standard table components (ADR-001: Standart Tablo Bileşen Mimarisi)
function Dropdown({
  trigger,
  children,
  align = 'right',
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'right' | 'left';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-50 bg-white dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl dark:shadow-[0_15px_50px_rgba(0,0,0,0.4)] min-w-[190px] py-1.5`}
          style={{ animation: 'fadeInDown 0.12s ease' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  icon,
  label,
  active = false,
  danger = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${
        danger
          ? 'text-metronic-danger hover:bg-metronic-danger-light'
          : active
          ? 'text-metronic-primary bg-metronic-primary-light font-bold'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  icon,
}: {
  label: string;
  column: string;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (col: string) => void;
  icon?: React.ReactNode;
}) {
  const isActive = sortColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-metronic-primary transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {label}
        {isActive &&
          (sortDirection === 'asc' ? (
            <ArrowUp size={13} className="text-metronic-primary" />
          ) : (
            <ArrowDown size={13} className="text-metronic-primary" />
          ))}
      </div>
    </th>
  );
}

const emptyForm = { name: '', sutCode: '', description: '' };

export default function SaasTreatmentsPage() {
  const { addToast } = useToastStore();

  const [treatments, setTreatments] = useState<MasterTreatment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);

  // Add modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [addSaving, setAddSaving] = useState(false);

  // Edit modal
  const [editingTreatment, setEditingTreatment] = useState<MasterTreatment | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchTreatments = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await SaasService.getMasterTreatments();
      setTreatments(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ana tedavi listesi yüklenemedi.';
      setError(msg);
      addToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchTreatments();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTreatments is redefined every render; adding it would retrigger this effect on every render
  }, []);

  const handleCreate = async () => {
    if (!addForm.name.trim()) {
      addToast({ type: 'warning', message: 'Tedavi adı zorunludur.' });
      return;
    }
    setAddSaving(true);
    try {
      await SaasService.createMasterTreatment({
        name: addForm.name.trim(),
        sutCode: addForm.sutCode.trim() || undefined,
        description: addForm.description.trim() || undefined,
      });
      addToast({ type: 'success', message: 'Ana tedavi başarıyla oluşturuldu.' });
      setIsAddOpen(false);
      setAddForm(emptyForm);
      fetchTreatments();
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Tedavi oluşturulamadı.' });
    } finally {
      setAddSaving(false);
    }
  };

  const openEdit = (t: MasterTreatment) => {
    setEditingTreatment(t);
    setEditForm({ name: t.name, sutCode: t.sutCode || '', description: t.description || '' });
  };

  const handleUpdate = async () => {
    if (!editingTreatment) return;
    if (!editForm.name.trim()) {
      addToast({ type: 'warning', message: 'Tedavi adı zorunludur.' });
      return;
    }
    setEditSaving(true);
    try {
      await SaasService.updateMasterTreatment(editingTreatment.id, {
        name: editForm.name.trim(),
        sutCode: editForm.sutCode.trim() || undefined,
        description: editForm.description.trim() || undefined,
      });
      addToast({ type: 'success', message: 'Tedavi başarıyla güncellendi.' });
      setEditingTreatment(null);
      fetchTreatments();
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Tedavi güncellenemedi.' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await SaasService.deleteMasterTreatment(id);
      addToast({ type: 'success', message: 'Tedavi silindi.' });
      setDeleteConfirmId(null);
      fetchTreatments();
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Tedavi silinemedi.' });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = treatments.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.sutCode?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const getSortedData = () => {
    const sorted = [...filtered];
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aVal: any = a[sortColumn as keyof MasterTreatment];
        let bVal: any = b[sortColumn as keyof MasterTreatment];
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal?.toLowerCase?.() ?? bVal;
        }
        if (aVal == null) return sortDirection === 'asc' ? -1 : 1;
        if (bVal == null) return sortDirection === 'asc' ? 1 : -1;
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

  // Arama değişince sayfayı sıfırla (render sırasında, efekt olmadan)
  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
  if (searchTerm !== prevSearchTerm) {
    setPrevSearchTerm(searchTerm);
    setCurrentPage(1);
  }

  const inputClass =
    'w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white';

  return (
    <SaasMetronicLayout
      title="Ana Tedavi Yönetimi (Master Treatments)"
      breadcrumbs={['Sistem Tanımları', 'Tedaviler']}
      headerAction={
        <button
          onClick={() => {
            setAddForm(emptyForm);
            setIsAddOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors"
        >
          <Plus size={16} /> Yeni Ana Tedavi
        </button>
      }
    >
      <style>{`
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm flex flex-col">

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Tedavi adı veya SUT kodu ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-[13px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all dark:text-white"
              />
            </div>
            <span className="px-3 py-1 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[11px] font-bold rounded-full border border-violet-200 dark:border-violet-500/20 whitespace-nowrap">
              {filtered.length} KAYIT
            </span>
          </div>

          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-1.5 h-9 px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 text-[13px] font-medium shadow-sm transition-colors">
                <Download size={15} /> Dışa Aktar <ChevronDown size={14} className="opacity-50" />
              </button>
            }
          >
            <DropdownItem icon={<FileSpreadsheet size={15} className="text-green-600" />} label="Excel (.xlsx)" />
            <DropdownItem icon={<FileText size={15} className="text-red-500" />} label="PDF Raporu" />
          </Dropdown>
        </div>

        {/* Info banner */}
        <div className="p-4 bg-violet-50/50 dark:bg-violet-500/5 border-b border-slate-100 dark:border-white/5">
          <p className="text-[12px] text-violet-800 dark:text-violet-300 flex items-center gap-2">
            <Stethoscope size={14} />
            <strong>Bilgi:</strong> Burada tanımlanan Master (Ana) tedaviler, platforma yeni kayıt olan her klinik için
            referans listesi olarak yüklenir.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-500 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-200/60 dark:border-white/5">
              <tr>
                <th className="px-5 py-4 w-16 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">#</th>
                <SortableHeader label="Tedavi Adı" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader label="SUT Kodu" column="sutCode" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="px-5 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[13px] font-medium text-slate-700 dark:text-slate-300">
              {loading ? (
                <TableSkeleton />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm">
                    {treatments.length === 0
                      ? 'Henüz kayıtlı ana tedavi yok. Yeni tedavi ekleyin.'
                      : 'Aranan kriterde tedavi bulunamadı.'}
                  </td>
                </tr>
              ) : (
                paginated.map((treatment, i) => (
                  <tr
                    key={treatment.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group"
                  >
                    <td className="px-5 py-3 text-center text-slate-400">{(currentPage - 1) * pageLimit + i + 1}</td>
                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-white">{treatment.name}</td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">{treatment.sutCode || '-'}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(treatment)}
                          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 size={16} />
                        </button>
                        {deleteConfirmId === treatment.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(treatment.id)}
                              disabled={deletingId === treatment.id}
                              className="px-2 py-1 text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors disabled:opacity-60"
                            >
                              {deletingId === treatment.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                'Sil'
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(treatment.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-white/5 flex-shrink-0">
          <span className="text-slate-500 text-[13px]">
            Toplam <span className="font-bold text-slate-800 dark:text-slate-200">{filtered.length}</span> kayıt
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10 text-slate-500 hover:text-violet-600 hover:border-violet-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-[13px] font-bold text-slate-700 dark:text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10 text-slate-500 hover:text-violet-600 hover:border-violet-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ADD MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Yeni Ana Tedavi Oluştur">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Tedavi Adı *</label>
            <input
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className={inputClass}
              placeholder="Diş Çekimi"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">SUT Kodu (Opsiyonel)</label>
            <input
              type="text"
              value={addForm.sutCode}
              onChange={(e) => setAddForm({ ...addForm, sutCode: e.target.value })}
              className={inputClass}
              placeholder="P404010"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Açıklama (Opsiyonel)</label>
            <textarea
              rows={3}
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              className={inputClass + ' resize-none'}
              placeholder="Tedavi hakkında kısa açıklama..."
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 text-[12px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleCreate}
              disabled={addSaving}
              className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {addSaving && <Loader2 size={14} className="animate-spin" />}
              Oluştur
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingTreatment}
        onClose={() => setEditingTreatment(null)}
        title="Ana Tedavi Düzenle"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Tedavi Adı *</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">SUT Kodu (Opsiyonel)</label>
            <input
              type="text"
              value={editForm.sutCode}
              onChange={(e) => setEditForm({ ...editForm, sutCode: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500">Açıklama (Opsiyonel)</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className={inputClass + ' resize-none'}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setEditingTreatment(null)}
              className="px-4 py-2 text-[12px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleUpdate}
              disabled={editSaving}
              className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {editSaving && <Loader2 size={14} className="animate-spin" />}
              Kaydet
            </button>
          </div>
        </div>
      </Modal>
    </SaasMetronicLayout>
  );
}
