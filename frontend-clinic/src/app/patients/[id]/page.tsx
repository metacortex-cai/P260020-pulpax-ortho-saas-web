'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import PatientHeader from '../../../components/patients/PatientHeader';
import { PatientService } from '../../../lib/services/patient.service';
import { useToastStore } from '../../../store/toastStore';
import Skeleton from '../../../components/ui/Skeleton';
import {
  User, HeartPulse, ClipboardList, Stethoscope,
  CreditCard, Calendar, FolderOpen, Scroll, StickyNote, History, Activity, AlertTriangle, Loader2, Smile, Microscope
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';

// Sekme bileşenlerini lazy import
import GeneralTab from './tabs/GeneralTab';
import AnamnesisTab from './tabs/AnamnesisTab';
import TreatmentPlansTab from './tabs/TreatmentPlansTab';
import TreatmentsTab from './tabs/TreatmentsTab';
import PaymentsTab from './tabs/PaymentsTab';
import AppointmentsTab from './tabs/AppointmentsTab';
import DocumentsTab from './tabs/DocumentsTab';
import PrescriptionsTab from './tabs/PrescriptionsTab';
import NotesTab from './tabs/NotesTab';
import LogTab from './tabs/LogTab';
import ImplantsTab from './tabs/ImplantsTab';
import OrthodonticsTab from './tabs/OrthodonticsTab';
import DiagnosisTab from './tabs/DiagnosisTab';
import DicomViewer from '../../../components/patients/DicomViewer';
import AiRadiologyAssistant from '../../../components/patients/AiRadiologyAssistant';
import api from '../../../lib/api';

function XrayTab({ patient }: { patient: any }) {
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const handleAnalyze = (imageUrl: string) => {
    setIsAnalyzing(true);
    api.post('/ai/radiology/analyze', { imageUrl })
      .then(res => {
        setDiagnoses(res.data.diagnoses);
        setNotes(res.data.notes);
        setIsAnalyzing(false);
      })
      .catch(() => {
        setIsAnalyzing(false);
      });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <DicomViewer onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
      </div>
      <div className="lg:col-span-1">
        <AiRadiologyAssistant diagnoses={diagnoses} notes={notes} isAnalyzing={isAnalyzing} />
      </div>
    </div>
  );
}

const TABS = [
  { id: 'general',    label: 'Genel Bilgiler',   icon: <User size={20} /> },
  { id: 'xray',       label: 'Röntgen & AI Analizi', icon: <Activity size={20} /> },
  { id: 'anamnesis',  label: 'Anamnez',           icon: <HeartPulse size={20} /> },
  { id: 'diagnosis',  label: 'Diyagnoz',          icon: <Microscope size={20} /> },
  { id: 'plans',      label: 'Tedavi Planları',   icon: <ClipboardList size={20} /> },
  { id: 'treatments', label: 'Tedaviler',          icon: <Stethoscope size={20} /> },
  { id: 'implants',   label: 'İmplantlar',         icon: <Activity size={20} /> },
  { id: 'orthodontics', label: 'Ortodonti',        icon: <Smile size={20} /> },
  { id: 'payments',   label: 'Ödemeler',           icon: <CreditCard size={20} /> },
  { id: 'appointments',label: 'Randevular',        icon: <Calendar size={20} /> },
  { id: 'documents',  label: 'Dokümanlar',         icon: <FolderOpen size={20} /> },
  { id: 'prescriptions',label: 'Reçeteler',        icon: <Scroll size={20} /> },
  { id: 'notes',      label: 'Notlar',             icon: <StickyNote size={20} /> },
  { id: 'log',        label: 'Log',                icon: <History size={20} />, restricted: true },
];

export default function PatientDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [anamnesisAlertOpen, setAnamnesisAlertOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hasPositiveAnamnesis, setHasPositiveAnamnesis] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore(state => state.addToast);

  const isAdmin = ['ADMIN', 'DOCTOR'].includes(user?.role || '');
  const visibleTabs = TABS.filter(t => !t.restricted || isAdmin);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard client-mount detection flag (SSR-safe pattern)
  useEffect(() => { setMounted(true); }, []);

  const fetchPatient = useCallback(async () => {
    try {
      setLoading(true);
      const data = await PatientService.findOne(id as string);
      setPatient(data);

      // Anamnez kontrolü
      const positiveOld = data.anamnesis
        ? Object.values(data.anamnesis).some((a: any) => a.answer === 'YES')
        : false;
      const positiveNew = data.detailedAnamnesis
        ? Object.values(data.detailedAnamnesis).some((a: any) => a.checked === true)
        : false;
      const positive = positiveOld || positiveNew;
      setHasPositiveAnamnesis(positive);
      if (positive) setAnamnesisAlertOpen(true);
    } catch (err) {
      console.error('Failed to fetch patient:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (mounted && user && id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/patient-change pattern
      fetchPatient();
    }
  }, [user, id, mounted, fetchPatient]);

  useEffect(() => {
    if (mounted && !user) {
      router.push('/login');
    }
  }, [mounted, user, router]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const updated = await PatientService.uploadPhoto(id as string, file);
      setPatient((prev: any) => prev ? { ...prev, photoUrl: updated.photoUrl } : updated);
      addToast({ title: 'Başarılı', message: 'Profil fotoğrafı güncellendi.', type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Hata', message: err.response?.data?.message || 'Fotoğraf yüklenemedi.', type: 'error' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    setUploadingPhoto(true);
    try {
      const updated = await PatientService.deletePhoto(id as string);
      setPatient((prev: any) => prev ? { ...prev, photoUrl: updated.photoUrl } : updated);
      addToast({ title: 'Başarılı', message: 'Profil fotoğrafı kaldırıldı.', type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Hata', message: err.response?.data?.message || 'Fotoğraf kaldırılamadı.', type: 'error' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const positiveAnamnesisItems = patient?.anamnesis ? Object.entries(patient.anamnesis || {})
    .filter(([_, data]: [string, any]) => data.answer === 'YES')
    .map(([key, data]: [string, any]) => {
       const labels: Record<string, string> = {
         cardiovascular: 'Kardiyovasküler',
         blood: 'Kan/Pıhtılaşma Durumu',
         hypertension: 'Hipertansiyon',
         diabetes: 'Diyabet (Şeker)',
         neurological: 'Nörolojik Hastalık',
         psychological: 'Psikolojik Durum',
         medications: 'Düzenli İlaç Kullanımı',
         disabled: 'Engellilik Durumu',
         lowPainThreshold: 'Düşük Ağrı Eşiği',
         difficultPatient: 'Zor Hasta',
         vip: 'VIP Hasta Protokolü',
         other: 'Diğer Notlar/Alerjiler'
       };
       return { label: labels[key] || key, detail: data.detail };
    }) : [];

  const renderTab = () => {
    if (!patient) return null;
    switch (activeTab) {
      case 'general':       return <GeneralTab patient={patient} onUpdate={setPatient} />;
      case 'xray':          return <XrayTab patient={patient} />;
      case 'anamnesis':     return <AnamnesisTab patient={patient} onUpdate={setPatient} />;
      case 'diagnosis':     return <DiagnosisTab patient={patient} />;
      case 'plans':         return <TreatmentPlansTab patient={patient} />;
      case 'treatments':    return <TreatmentsTab patient={patient} />;
      case 'implants':      return <ImplantsTab patient={patient} />;
      case 'orthodontics':  return <OrthodonticsTab patient={patient} />;
      case 'payments':      return <PaymentsTab patient={patient} />;
      case 'appointments':  return <AppointmentsTab patient={patient} />;
      case 'documents':     return <DocumentsTab patient={patient} />;
      case 'prescriptions': return <PrescriptionsTab patient={patient} />;
      case 'notes':         return <NotesTab patient={patient} />;
      case 'log':           return <LogTab patient={patient} />;
      default:              return null;
    }
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-[#EEF0F8] dark:bg-[#0f1117]">
        <Loader2 className="animate-spin text-metronic-primary mr-2" size={24} />
        <span className="text-[13px] font-semibold">Yetkilendirme kontrol ediliyor...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <MetronicLayout title="Hasta Detayı" breadcrumbs={['Hastalar']}>
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1c1f2e] p-6 rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-4">
              <Skeleton variant="circle" className="w-16 h-16" />
              <div className="flex-1 space-y-2">
                <Skeleton className="w-1/4 h-5" />
                <Skeleton className="w-1/3 h-3" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1c1f2e] p-6 rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm h-96">
            <Skeleton variant="rect" className="h-full" />
          </div>
        </div>
      </MetronicLayout>
    );
  }

  if (!patient) return null;

  return (
    <MetronicLayout title="Hasta Detayı" breadcrumbs={['Hastalar']}>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      <div className="flex gap-4 items-start">
        {/* ─── Sol Kenar Çubuğu: Profil + Tabs (1/4) ─── */}
        <div className={`${sidebarCollapsed ? 'w-[68px]' : 'w-[18%] min-w-[200px]'} flex-shrink-0 sticky top-0 self-start transition-all duration-300`}>
          <PatientHeader
            patient={patient}
            tabs={visibleTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onUpdate={setPatient}
            variant="sidebar"
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(c => !c)}
            warningTabIds={hasPositiveAnamnesis ? ['anamnesis'] : []}
            uploadingPhoto={uploadingPhoto}
            onPhotoUploadClick={() => photoInputRef.current?.click()}
            onPhotoDelete={handlePhotoDelete}
          />
        </div>

        {/* ─── Sağ Alan: Tab İçeriği (3/4) ─── */}
        <div className="flex-1 min-w-0 bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="p-6">
            {renderTab()}
          </div>
        </div>
      </div>

      <Modal 
        isOpen={anamnesisAlertOpen} 
        onClose={() => setAnamnesisAlertOpen(false)}
        title="DİKKAT: Önemli Anamnez Bilgisi"
        size="md"
        footer={<button onClick={() => setAnamnesisAlertOpen(false)} className="px-5 py-2 text-[13px] font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Kapat</button>}
      >
        <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
          <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-red-700">Hastanın dikkat edilmesi gereken tıbbi geçmişi bulunmaktadır.</p>
            <p className="text-[12px] text-red-600/80 mt-1">İşlem yapmadan önce lütfen aşağıdaki bilgileri göz önünde bulundurunuz.</p>
          </div>
        </div>

        <ul className="space-y-3">
          {positiveAnamnesisItems.map((item: any, i: number) => (
            <li key={i} className="flex flex-col p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[12px] font-bold text-slate-800 uppercase tracking-wide">{item.label}</span>
              <span className="text-[13px] font-medium text-slate-600 mt-1">{item.detail}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </MetronicLayout>
  );
}
