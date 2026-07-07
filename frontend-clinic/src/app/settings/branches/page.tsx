'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Modal from '../../../components/ui/Modal';
import { ClinicBranchService, ClinicBranch } from '../../../lib/services/clinic-branch.service';
import { AppointmentService } from '../../../lib/services/appointment.service';
import {
  Building2, Plus, Save, Edit2, CheckCircle2, XCircle, MapPin, Phone, Armchair,
} from 'lucide-react';

interface Chair {
  id: string;
  name: string;
  color?: string;
  clinicBranchId?: string | null;
}

export default function ClinicBranchesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { addToast } = useToastStore();

  const [branches, setBranches] = useState<ClinicBranch[]>([]);
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<ClinicBranch | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [branchList, chairList] = await Promise.all([
        ClinicBranchService.findAll(true),
        AppointmentService.getChairs(),
      ]);
      setBranches(branchList);
      setChairs(chairList);
    } catch {
      addToast({ type: 'error', message: 'Klinikler yüklenirken bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchData is redefined every render; adding it would retrigger this effect on every render
  }, [user, router]);

  const openCreateModal = () => {
    setEditingBranch(null);
    setFormData({ name: '', address: '', phone: '' });
    setModalOpen(true);
  };

  const openEditModal = (branch: ClinicBranch) => {
    setEditingBranch(branch);
    setFormData({ name: branch.name, address: branch.address || '', phone: branch.phone || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingBranch) {
        await ClinicBranchService.update(editingBranch.id, formData);
        addToast({ type: 'success', message: 'Klinik güncellendi.' });
      } else {
        await ClinicBranchService.create(formData);
        addToast({ type: 'success', message: 'Klinik oluşturuldu.' });
      }
      setModalOpen(false);
      await fetchData();
    } catch {
      addToast({ type: 'error', message: 'Klinik kaydedilirken bir hata oluştu.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (branch: ClinicBranch) => {
    try {
      await ClinicBranchService.update(branch.id, { isActive: !branch.isActive });
      await fetchData();
      addToast({ type: 'success', message: branch.isActive ? 'Klinik pasif yapıldı.' : 'Klinik aktif yapıldı.' });
    } catch {
      addToast({ type: 'error', message: 'İşlem sırasında bir hata oluştu.' });
    }
  };

  const handleChairBranchChange = async (chairId: string, clinicBranchId: string) => {
    try {
      await AppointmentService.updateChair(chairId, { clinicBranchId: clinicBranchId || undefined });
      setChairs(prev => prev.map(c => c.id === chairId ? { ...c, clinicBranchId } : c));
      addToast({ type: 'success', message: 'Ünitin şubesi güncellendi.' });
    } catch {
      addToast({ type: 'error', message: 'Ünit güncellenirken bir hata oluştu.' });
    }
  };

  const activeCount = branches.filter(b => b.isActive).length;

  return (
    <MetronicLayout title="Klinikler" breadcrumbs={['Ayarlar', 'Klinikler']}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 px-5 py-4 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-metronic-primary-light dark:bg-metronic-primary/10 text-metronic-primary">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toplam Klinik</p>
            <p className="text-[1.2rem] font-bold mt-0.5 text-metronic-primary">{branches.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 px-5 py-4 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-metronic-success-light dark:bg-metronic-success/10 text-metronic-success">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aktif Klinik</p>
            <p className="text-[1.2rem] font-bold mt-0.5 text-metronic-success">{activeCount}</p>
          </div>
        </div>
      </div>

      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e] mb-6">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5">
          <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Klinik Şubeleri</h3>
          <button onClick={openCreateModal} className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm">
            <Plus size={16} /> Yeni Klinik Ekle
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Klinik Adı</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Adres</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Telefon</th>
                <th className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Durum</th>
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-500 font-medium">Yükleniyor...</td></tr>
              ) : branches.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-500 font-medium">Henüz klinik eklenmemiş.</td></tr>
              ) : branches.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pl-6 pr-4">
                    <span className="text-slate-800 dark:text-slate-100 font-bold text-[13px]">{b.name}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-600 dark:text-slate-300 text-[12px] flex items-center gap-1.5">
                      {b.address && <MapPin size={13} className="text-slate-400" />} {b.address || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-600 dark:text-slate-300 text-[12px] flex items-center gap-1.5">
                      {b.phone && <Phone size={13} className="text-slate-400" />} {b.phone || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleActive(b)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${b.isActive ? 'bg-metronic-success-light text-metronic-success dark:bg-metronic-success/10' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'}`}
                    >
                      {b.isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {b.isActive ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="py-3 pl-4 pr-6 text-right">
                    <button onClick={() => openEditModal(b)} className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10 shadow-sm">
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200/60 dark:border-white/5">
          <Armchair size={18} className="text-slate-400" />
          <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Ünitelerin Klinik Ataması</h3>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <th className="py-4 pl-6 pr-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ünit</th>
                <th className="py-4 pl-4 pr-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Klinik</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {chairs.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pl-6 pr-4">
                    <span className="inline-flex items-center gap-2 text-[13px] font-bold text-slate-700 dark:text-slate-200">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color || '#3b82f6' }} />
                      {c.name}
                    </span>
                  </td>
                  <td className="py-3 pl-4 pr-6">
                    <select
                      value={c.clinicBranchId || ''}
                      onChange={e => handleChairBranchChange(c.id, e.target.value)}
                      className="m-input h-9 text-[13px]"
                    >
                      <option value="">Atanmamış</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBranch ? 'Klinik Bilgilerini Düzenle' : 'Yeni Klinik Ekle'}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button form="branch-form" type="submit" disabled={formLoading} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-70">
              <Save size={15} />{formLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </>
        }
      >
        <form id="branch-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Klinik Adı <span className="text-metronic-danger">*</span></label>
            <input required type="text" placeholder="Örn: Merkez Şube" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="m-input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Adres</label>
            <input type="text" placeholder="Adres" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="m-input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Telefon</label>
            <input type="text" placeholder="Telefon" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="m-input" />
          </div>
        </form>
      </Modal>
    </MetronicLayout>
  );
}
