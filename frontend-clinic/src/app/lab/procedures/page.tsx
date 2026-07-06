'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import InfoTooltip from '../../../components/ui/InfoTooltip';
import { Search, Plus, Filter, ChevronDown, ListTree, CheckSquare, X, CheckCircle2, Trash2, Edit2, Settings, ChevronLeft, ChevronRight, Save, Download, FileText } from 'lucide-react';
import { LabService } from '../../../lib/services/lab.service';
import { useToastStore } from '../../../store/toastStore';


function DropdownItem({ icon, label, danger = false, onClick }: { icon?: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

export default function LabProceduresPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [procedures, setProcedures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', category: 'Protez', defaultCost: 0, active: true });
  const [editingProcedure, setEditingProcedure] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    setLoading(true);
    setError(null);
    LabService.getProcedureTypes()
      .then(data => setProcedures(data))
      .catch(() => setError('İşlem tanımları yüklenirken bir hata oluştu.'))
      .finally(() => setLoading(false));
  }, [user, router]);

  const filtered = procedures.filter(p => 
    [p.name, p.code, p.category]
    .join(' ').toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageLimit));
  const paginated = filtered.slice((currentPage - 1) * pageLimit, currentPage * pageLimit);

  if (searchTerm !== prevSearchTerm) {
    setPrevSearchTerm(searchTerm);
    setCurrentPage(1);
  }

  const allSelected = paginated.length > 0 && paginated.every(p => selectedIds.has(p.id));
  const someSelected = paginated.some(p => selectedIds.has(p.id));
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(paginated.map(p => p.id)));
  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportCSV = () => {
    const headers = ['Ad', 'Kategori', 'Varsayılan Maliyet', 'Durum'];
    const rows = filtered.map(p => [
      p.name,
      p.category,
      String(p.defaultCost),
      p.active ? 'Aktif' : 'Pasif',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lab-islemler.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openCreateModal = () => {
    setEditingProcedure(null);
    setFormData({ code: '', name: '', category: 'Protez', defaultCost: 0, active: true });
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProcedure(p);
    setFormData({
      code: p.code || '',
      name: p.name || '',
      category: p.category || 'Protez',
      defaultCost: Number(p.defaultCost) || 0,
      active: !!p.active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingProcedure) {
        const updated = await LabService.updateProcedureType(editingProcedure.id, formData);
        setProcedures(prev => prev.map(p => p.id === editingProcedure.id ? updated : p));
        addToast({ title: 'Başarılı', message: 'İşlem tanımı güncellendi.', type: 'success' });
      } else {
        const created = await LabService.createProcedureType(formData);
        setProcedures(prev => [...prev, created]);
        addToast({ title: 'Başarılı', message: 'İşlem tanımı eklendi.', type: 'success' });
      }
      setModalOpen(false);
      setEditingProcedure(null);
      setFormData({ code: '', name: '', category: 'Protez', defaultCost: 0, active: true });
    } catch {
      addToast({ title: 'Hata', message: 'İşlem kaydedilirken bir hata oluştu.', type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await LabService.deactivateProcedureType(deleteTarget.id);
      setProcedures(prev => prev.map(p => p.id === deleteTarget.id ? { ...p, active: false } : p));
      addToast({ title: 'Başarılı', message: 'İşlem tanımı pasif hale getirildi.', type: 'success' });
      setDeleteTarget(null);
    } catch {
      addToast({ title: 'Hata', message: 'İşlem tanımı silinemedi.', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <MetronicLayout 
      title="Laboratuvar İşlem Tanımları" 
      breadcrumbs={['Laboratuvar', 'İşlemler']}
      infoTooltip={
        <InfoTooltip 
          title="Merkezi İşlem Tanımları"
          description={
            <>
              Burada tanımladığınız işlemler laboratuvar hareketlerinde seçilebilir hale gelir. Aynı işlemin farklı laboratuvarlarda farklı maliyetleri olabileceği için, her laboratuvar için özel fiyatlandırmayı <strong>“Fiyat Tarifeleri”</strong> bölümünden yönetebilirsiniz. Buradaki “Varsayılan Maliyet” referans amaçlıdır.
            </>
          }
        />
      }
    >
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">
        
        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-metronic-primary-light border-b border-metronic-primary/20">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-metronic-primary" />
              <span className="text-[13px] font-bold text-metronic-primary">{selectedIds.size} işlem seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-metronic-primary text-white text-[12px] font-bold rounded-lg hover:bg-blue-600 transition-colors">
                <CheckCircle2 size={13} /> Aktif Yap
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-metronic-danger border border-white/20 text-[12px] font-bold rounded-lg hover:bg-metronic-danger-light transition-colors">
                <Trash2 size={13} /> Sil
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"><X size={15} /></button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Kayıtlı İşlemler</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filtered.length} Kayıt</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input type="text" placeholder="İşlem adı, kod veya kategori ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
            </div>
            
            <Dropdown align="right" trigger={<button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"><Filter size={15} /> Kategori <ChevronDown size={13} className="text-slate-400" /></button>}>
              <DropdownItem label="Protez" />
              <DropdownItem label="Ortodonti" />
              <DropdownItem label="İmplant" />
            </Dropdown>

            <Dropdown align="right" trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-[13px] font-medium shadow-sm">
                <Download size={15} /> Dışa Aktar <ChevronDown size={13} className="text-slate-400" />
              </button>
            }>
              <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Format Seçin</p>
              </div>
              <DropdownItem icon={<FileText size={14} className="text-red-500" />} label="CSV (.csv)" onClick={exportCSV} />
            </Dropdown>

            <button onClick={openCreateModal} className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm ml-1">
              <Plus size={16} /> Yeni İşlem Tanımı
            </button>
          </div>
        </div>

        {/* Tablo */}
        <div className="overflow-auto max-h-[500px] relative">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10"><input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Kod</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">İşlem Adı</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Kategori</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">Varsayılan Maliyet</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-center">Durum</th>
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Yükleniyor...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="py-12 text-center text-metronic-danger font-medium">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500 font-medium">Eşleşen kayıt bulunamadı.</td></tr>
              ) : paginated.map(p => {
                const isSelected = selectedIds.has(p.id);
                return (
                  <tr key={p.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                    <td className="py-3 pl-6 pr-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(p.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                    <td className="py-3 px-4">
                      <span className="text-slate-500 dark:text-slate-400 font-mono font-bold text-[13px] bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">{p.code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[14px] font-bold text-slate-800 dark:text-slate-100">{p.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400">{p.category}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{Number(p.defaultCost).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold ${p.active ? 'bg-metronic-success-light text-metronic-success' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'}`}>
                        {p.active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="py-3 pl-4 pr-6 text-right">
                      <Dropdown align="right" trigger={<button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors"><Settings size={16} /></button>}>
                        <DropdownItem icon={<Edit2 size={14} />} label="Düzenle" onClick={() => openEditModal(p)} />
                        <div className="border-t border-slate-100 my-1" />
                        <DropdownItem icon={<Trash2 size={14} />} label="Sil" danger onClick={() => setDeleteTarget(p)} />
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-xl">
          <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">Toplam <span className="font-bold text-slate-700 dark:text-slate-200">{filtered.length}</span> kayıt</span>
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProcedure ? 'İşlem Tanımını Düzenle' : 'Yeni İşlem Tanımı Ekle'} subtitle="Laboratuvarlar için işlem şablonu oluşturun." size="md" footer={
        <><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
        <button form="new-procedure-form" type="submit" disabled={formLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70"><Save size={15} />{formLoading ? 'Kaydediliyor...' : (editingProcedure ? 'Değişiklikleri Kaydet' : 'İşlemi Kaydet')}</button></>
      }>
        <form id="new-procedure-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İşlem Kodu <span className="text-metronic-danger">*</span></label>
              <input required type="text" placeholder="Örn: ZRK-01" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İşlem Adı <span className="text-metronic-danger">*</span></label>
              <input required type="text" placeholder="Zirkonyum Altyapı" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="m-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kategori</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="m-input"><option value="Protez">Protez</option><option value="Ortodonti">Ortodonti</option><option value="İmplant">İmplant</option></select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Varsayılan Maliyet (₺)</label>
                <input type="number" min={0} step={0.01} placeholder="0.00" value={formData.defaultCost} onChange={e => setFormData({...formData, defaultCost: parseFloat(e.target.value) || 0})} className="m-input" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Durum</label>
              <select value={formData.active ? 'AKTİF' : 'PASİF'} onChange={e => setFormData({...formData, active: e.target.value === 'AKTİF'})} className="m-input"><option value="AKTİF">Aktif</option><option value="PASİF">Pasif</option></select>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="İşlem Tanımını Sil"
        message={`"${deleteTarget?.name}" adlı işlem tanımını pasif hale getirmek istediğinize emin misiniz?`}
      />

    </MetronicLayout>
  );
}
