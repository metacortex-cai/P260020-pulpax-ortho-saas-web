'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Dropdown from '../../../components/ui/Dropdown';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { Search, Plus, Filter, ChevronDown, CheckSquare, X, Trash2, Edit2, CheckCircle2, Phone, MapPin, ChevronLeft, ChevronRight, Settings, Save, Loader2, Download, FileText } from 'lucide-react';
import { LabService, Lab } from '../../../lib/services/lab.service';
import { useToastStore } from '../../../store/toastStore';


function DropdownItem({ icon, label, danger = false, onClick }: { icon?: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors text-left ${danger ? 'text-metronic-danger hover:bg-metronic-danger-light' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'}`}>
      {icon}{label}
    </button>
  );
}

export default function LabsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit] = useState(25);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', taxOffice: '', taxNumber: '', invoiceInfo: '' });
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lab | null>(null);
  const [deleting, setDeleting] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const fetchLabs = async () => {
    try {
      setLoading(true);
      const data = await LabService.getLabs();
      setLabs(data);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Laboratuvarlar yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    if (user) fetchLabs();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchLabs is redefined every render; adding it would retrigger this effect on every render
  }, [user]);

  const filtered = labs.filter(l =>
    [l.name, l.contactPerson, l.address, l.phone]
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

  const openCreateModal = () => {
    setEditingLab(null);
    setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', taxOffice: '', taxNumber: '', invoiceInfo: '' });
    setModalOpen(true);
  };

  const openEditModal = (lab: Lab) => {
    setEditingLab(lab);
    setFormData({
      name: lab.name,
      contactPerson: lab.contactPerson || '',
      phone: lab.phone || '',
      email: lab.email || '',
      address: lab.address || '',
      taxOffice: lab.taxOffice || '',
      taxNumber: lab.taxNumber || '',
      invoiceInfo: lab.invoiceInfo || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingLab) {
        await LabService.updateLab(editingLab.id, formData);
        addToast({ title: 'Başarılı', message: 'Laboratuvar güncellendi.', type: 'success' });
      } else {
        await LabService.createLab(formData);
        addToast({ title: 'Başarılı', message: 'Laboratuvar eklendi.', type: 'success' });
      }
      setModalOpen(false);
      setEditingLab(null);
      setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', taxOffice: '', taxNumber: '', invoiceInfo: '' });
      fetchLabs();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Kayıt başarısız.', type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await LabService.deactivateLab(deleteTarget.id);
      addToast({ title: 'Başarılı', message: 'Laboratuvar pasif hale getirildi.', type: 'success' });
      setDeleteTarget(null);
      fetchLabs();
    } catch (err) {
      addToast({ title: 'Hata', message: 'Laboratuvar silinemedi.', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Ad', 'Yetkili Kişi', 'Telefon', 'E-posta', 'Adres'];
    const rows = filtered.map(l => [
      l.name,
      l.contactPerson || '',
      l.phone || '',
      l.email || '',
      l.address || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'laboratuvarlar.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MetronicLayout title="Laboratuvarlar" breadcrumbs={['Laboratuvar', 'Laboratuvar Listesi']}>
      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
      
      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Laboratuvar Listesi</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">{filtered.length} Kayıt</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px] max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
              <input type="text" placeholder="Laboratuvar, yetkili, adres ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:bg-white dark:focus:bg-white/10 focus:border-metronic-primary focus:ring-2 focus:ring-metronic-primary/20 transition-all text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400" />
            </div>
            
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
              <Plus size={16} /> Yeni Laboratuvar
            </button>
          </div>
        </div>

        {/* Tablo */}
        <div className="overflow-auto max-h-[520px] relative">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-3 w-10"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Laboratuvar Bilgileri</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">İletişim & Adres</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-center">Durum</th>
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-500 font-medium"><Loader2 className="animate-spin inline mr-2" size={18} /> Yükleniyor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-500 font-medium">Eşleşen kayıt bulunamadı.</td></tr>
              ) : paginated.map(lab => {
                const isSelected = selectedIds.has(lab.id);
                return (
                  <tr key={lab.id} className={`transition-colors group ${isSelected ? 'bg-metronic-primary-light/40 dark:bg-metronic-primary/10' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
                    <td className="py-3 pl-6 pr-3"><input type="checkbox" checked={isSelected} onChange={() => toggleOne(lab.id)} className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer" /></td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-slate-800 dark:text-white">{lab.name}</span>
                        <span className="text-slate-400 text-[12px] font-medium mt-0.5">{lab.contactPerson || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 text-[12px] text-slate-600 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" /> {lab.phone || '-'}</span>
                        <span className="flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" /> {lab.address || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold ${lab.isActive ? 'bg-metronic-success-light text-metronic-success' : 'bg-slate-100 text-slate-500'}`}>
                        {lab.isActive ? 'AKTİF' : 'PASİF'}
                      </span>
                    </td>
                    <td className="py-3 pl-4 pr-6 text-right">
                      <Dropdown align="right" trigger={<button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors"><Settings size={16} /></button>}>
                        <DropdownItem icon={<Edit2 size={14} />} label="Düzenle" onClick={() => openEditModal(lab)} />
                        <div className="border-t border-slate-100 my-1" />
                        <DropdownItem icon={<Trash2 size={14} />} label="Sil" danger onClick={() => setDeleteTarget(lab)} />
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingLab ? 'Laboratuvarı Düzenle' : 'Yeni Laboratuvar Ekle'} subtitle={editingLab ? 'Laboratuvar bilgilerini güncelleyin.' : 'Sisteme yeni bir laboratuvar tanımlayın.'} size="lg" footer={
        <><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
        <button form="new-lab-form" type="submit" disabled={formLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70"><Save size={15} />{formLoading ? 'Kaydediliyor...' : (editingLab ? 'Değişiklikleri Kaydet' : 'Laboratuvarı Kaydet')}</button></>
      }>
        <form id="new-lab-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Laboratuvar Adı <span className="text-metronic-danger">*</span></label>
              <input required type="text" placeholder="Laboratuvar Adı" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Yetkili Kişi</label>
              <input type="text" placeholder="Ad Soyad" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Telefon</label>
              <input type="tel" placeholder="05XX XXX XX XX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">E-posta</label>
              <input type="email" placeholder="ornek@lab.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Adres</label>
              <textarea placeholder="Açık Adres" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="m-input min-h-[80px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Vergi Dairesi</label>
              <input type="text" placeholder="Örn: Kadıköy V.D." value={formData.taxOffice} onChange={e => setFormData({...formData, taxOffice: e.target.value})} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Vergi Numarası</label>
              <input type="text" placeholder="Vergi No" value={formData.taxNumber} onChange={e => setFormData({...formData, taxNumber: e.target.value})} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Fatura Bilgileri</label>
              <textarea placeholder="Fatura unvanı / adresi vb." value={formData.invoiceInfo} onChange={e => setFormData({...formData, invoiceInfo: e.target.value})} className="m-input min-h-[60px]" />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Laboratuvarı Sil"
        message={`"${deleteTarget?.name}" adlı laboratuvarı pasif hale getirmek istediğinize emin misiniz?`}
      />

    </MetronicLayout>
  );
}
