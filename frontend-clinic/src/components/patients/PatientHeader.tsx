'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Hash, User2, FileText, PanelLeftClose, PanelLeftOpen, Camera, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DoctorService, Doctor } from '../../lib/services/doctor.service';
import { TreatmentService } from '../../lib/services/treatment.service';
import { PatientService, resolveDocumentUrl } from '../../lib/services/patient.service';
import { useToastStore } from '../../store/toastStore';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  restricted?: boolean;
}

interface PatientHeaderProps {
  patient: {
    id: string;
    fileNo?: number;
    firstName: string;
    lastName: string;
    phone: string;
    assignedDoctor?: string;
    tariff?: string;
    totalDebt: number;
    advance: number;
    registeredAt: string;
    status: 'AKTIF' | 'PASIF';
    anamnesis?: Record<string, { answer: 'YES' | 'NO' | 'UNKNOWN'; detail?: string }>;
    detailedAnamnesis?: Record<string, { checked: boolean; notes: string }>;
    photoUrl?: string | null;
  };
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onUpdate?: (data: any) => void;
  variant?: 'sidebar' | 'topbar';
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  warningTabIds?: string[];
  uploadingPhoto?: boolean;
  onPhotoUploadClick?: () => void;
  onPhotoDelete?: () => void;
}

export default function PatientHeader({
  patient,
  tabs,
  activeTab,
  onTabChange,
  onUpdate,
  variant = 'topbar',
  collapsed = false,
  onToggleCollapse,
  warningTabIds = [],
  uploadingPhoto = false,
  onPhotoUploadClick,
  onPhotoDelete,
}: PatientHeaderProps) {
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [tariffGroups, setTariffGroups] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([DoctorService.findAll(), TreatmentService.getTariffGroups()])
      .then(([docs, groups]) => {
        if (!mounted) return;
        setDoctors(docs.filter((d: Doctor) => d.isDoctor && d.isActive));
        setTariffGroups(groups || []);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleFieldChange = async (field: string, value: string) => {
    setIsSaving(true);
    try {
      await PatientService.update(patient.id, { [field]: value });
      onUpdate?.({ ...patient, [field]: value });
      addToast({
        title: 'Güncellendi',
        message: field === 'assignedDoctor' ? 'Atanan hekim güncellendi.' : 'Tarife güncellendi.',
        type: 'success',
      });
    } catch {
      addToast({ title: 'Hata', message: 'Güncelleme başarısız.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;

  const selectCls = "w-full text-[13px] font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-metronic-primary/30 focus:border-metronic-primary transition-colors appearance-none cursor-pointer disabled:opacity-50";

  /* ─── SIDEBAR VARIANT ─── */
  if (variant === 'sidebar') {

    /* Collapsed: sadece ikon sütunu */
    if (collapsed) {
      return (
        <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm flex flex-col overflow-hidden">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center py-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors border-b border-slate-100 dark:border-white/5"
              title="Genişlet"
            >
              <PanelLeftOpen size={15} />
            </button>
          )}
          <nav className="flex flex-col gap-0.5 p-2">
            {tabs.map(tab => {
              const isActive = tab.id === activeTab;
              const isWarning = warningTabIds.includes(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  title={tab.label}
                  className={`relative flex items-center justify-center w-full h-10 rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-metronic-primary text-white shadow-sm'
                      : isWarning
                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 animate-pulse'
                      : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600'
                  }`}
                >
                  {tab.icon}
                  {isWarning && !isActive && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      );
    }

    /* Expanded: iki ayrı kart */
    return (
      <div className="flex flex-col gap-3">

        {/* ══ KART 1: Hasta Bilgisi ══ */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden">

          {/* Üst satır: Geri + Daralt */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
            <button
              onClick={() => router.push('/patients')}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Listeye Dön"
            >
              <ArrowLeft size={13} />
              <span>Geri</span>
            </button>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Daralt"
              >
                <PanelLeftClose size={14} />
              </button>
            )}
          </div>

          {/* Hasta kimlik bloğu — fotoğraf üstte ortalanmış (2x büyütülmüş profil fotoğrafı alanı) */}
          <div className="px-4 py-4 border-b border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
            <div className="relative w-[72px] h-[72px] mb-3 group flex-shrink-0">
              {patient.photoUrl ? (
                <img
                  src={resolveDocumentUrl(patient.photoUrl)}
                  alt={`${patient.firstName} ${patient.lastName}`}
                  className="w-[72px] h-[72px] rounded-2xl object-cover shadow-sm"
                />
              ) : (
                <div className="w-[72px] h-[72px] rounded-2xl bg-metronic-primary-light dark:bg-metronic-primary/15 text-metronic-primary flex items-center justify-center font-extrabold text-xl shadow-sm">
                  {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
                </div>
              )}
              {onPhotoUploadClick && (
                <button
                  type="button"
                  onClick={onPhotoUploadClick}
                  disabled={uploadingPhoto}
                  title="Fotoğraf yükle"
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                >
                  {uploadingPhoto ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                </button>
              )}
              {patient.photoUrl && !uploadingPhoto && onPhotoDelete && (
                <button
                  type="button"
                  onClick={onPhotoDelete}
                  title="Fotoğrafı kaldır"
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 shadow-sm hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <h2 className="text-[14px] font-extrabold text-slate-800 dark:text-white leading-tight tracking-tight truncate max-w-full">
              {patient.firstName} {patient.lastName}
            </h2>
            <div className="flex items-center justify-center flex-wrap gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-metronic-primary text-white text-[10px] font-extrabold font-mono tracking-wide shadow-sm">
                <Hash size={8} strokeWidth={3} />
                {patient.fileNo ?? patient.id}
              </span>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                patient.status === 'AKTIF'
                  ? 'bg-metronic-success-light text-metronic-success'
                  : patient.status === 'PASIF'
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-metronic-warning-light text-metronic-warning'
              }`}>
                {patient.status === 'AKTIF' ? 'Aktif Hasta' : patient.status === 'PASIF' ? 'Pasif Hasta' : 'Aday Hasta'}
              </span>
            </div>
          </div>

          {/* Dropdownlar */}
          <div className="px-4 py-3 flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <User2 size={11} /> Atanan Hekim
              </label>
              <select
                value={patient.assignedDoctor || ''}
                onChange={e => handleFieldChange('assignedDoctor', e.target.value)}
                disabled={isSaving}
                className={selectCls}
                style={{ backgroundImage: chevronSvg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
              >
                <option value="">— Hekim Seçilmedi —</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>Dt. {d.firstName} {d.lastName}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <FileText size={11} /> Tarife
              </label>
              <select
                value={patient.tariff || ''}
                onChange={e => handleFieldChange('tariff', e.target.value)}
                disabled={isSaving}
                className={selectCls}
                style={{ backgroundImage: chevronSvg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
              >
                <option value="">— Tarife Seçilmedi —</option>
                {tariffGroups.map((g: any) => (
                  <option key={g.id || g.name} value={g.id || g.name}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ══ KART 2: Menü (scroll'lu) ══ */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden">
          <nav className="flex flex-col gap-1 p-2 overflow-y-auto max-h-[calc(100vh-380px)]">
            {tabs.map(tab => {
              const isActive = tab.id === activeTab;
              const isWarning = warningTabIds.includes(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-[13px] font-medium text-left whitespace-nowrap transition-colors duration-150 ${
                    isActive
                      ? 'bg-metronic-primary text-white shadow-sm'
                      : isWarning
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 animate-pulse'
                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`flex-shrink-0 ${isActive ? 'text-white' : isWarning ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>
                    {tab.icon}
                  </span>
                  <span className="truncate">{tab.label}</span>
                  {tab.badge != null && tab.badge > 0 && (
                    <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold leading-none flex-shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                    }`}>{tab.badge}</span>
                  )}
                  {isWarning && !isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

      </div>
    );
  }

  /* ─── TOPBAR VARIANT ─── */
  return (
    <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm mb-4">
      <div className="px-5 py-4 flex items-start gap-4">
        <button
          onClick={() => router.push('/patients')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0 border border-slate-200/60 dark:border-white/10 mt-0.5"
          title="Listeye Dön"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="w-12 h-12 rounded-xl bg-metronic-primary-light dark:bg-metronic-primary/15 text-metronic-primary flex items-center justify-center font-extrabold text-lg flex-shrink-0 shadow-sm mt-0.5">
          {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
        </div>

        <div className="flex-1 min-w-0 border border-slate-200/60 dark:border-white/5 rounded-xl overflow-hidden">
          <div className="px-4 py-3 flex flex-col gap-1.5 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[20px] font-extrabold text-slate-800 dark:text-white leading-tight tracking-tight">
                {patient.firstName} {patient.lastName}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-metronic-primary text-white text-[12px] font-extrabold shadow-sm font-mono tracking-wide flex-shrink-0">
                <Hash size={10} strokeWidth={3} />
                {patient.fileNo ?? patient.id}
              </span>
            </div>
            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold w-fit ${
              patient.status === 'AKTIF'
                ? 'bg-metronic-success-light text-metronic-success'
                : patient.status === 'PASIF'
                ? 'bg-slate-100 text-slate-500'
                : 'bg-metronic-warning-light text-metronic-warning'
            }`}>{patient.status === 'AKTIF' ? 'Aktif Hasta' : patient.status === 'PASIF' ? 'Pasif Hasta' : 'Aday Hasta'}</span>
          </div>

          <div className="px-4 py-3 flex flex-wrap gap-4 bg-white dark:bg-[#1c1f2e]">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><User2 size={10} />Atanan Hekim</label>
              <select value={patient.assignedDoctor || ''} onChange={e => handleFieldChange('assignedDoctor', e.target.value)} disabled={isSaving}
                className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 pr-8 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-metronic-primary/30 focus:border-metronic-primary transition-colors appearance-none cursor-pointer disabled:opacity-50"
                style={{ backgroundImage: chevronSvg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                <option value="">— Hekim Seçilmedi —</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><FileText size={10} />Tarife</label>
              <select value={patient.tariff || ''} onChange={e => handleFieldChange('tariff', e.target.value)} disabled={isSaving}
                className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 pr-8 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-metronic-primary/30 focus:border-metronic-primary transition-colors appearance-none cursor-pointer disabled:opacity-50"
                style={{ backgroundImage: chevronSvg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                <option value="">— Tarife Seçilmedi —</option>
                {tariffGroups.map((g: any) => <option key={g.id || g.name} value={g.id || g.name}>{g.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Yatay tab bar */}
      <div className="relative border-t border-slate-100 dark:border-white/5">
        <button onClick={() => {}} className="absolute left-0 top-0 bottom-0 w-7 flex items-center justify-center bg-gradient-to-r from-white dark:from-[#1c1f2e] to-transparent z-10 text-slate-400 opacity-0 hover:opacity-100">
          <ChevronLeft size={14} />
        </button>
        <div className="flex items-center gap-1 px-5 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(tab => {
            const isActive = tab.id === activeTab;
            return (
              <button key={tab.id} onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive ? 'bg-metronic-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}>
                <span className={isActive ? 'text-white/80' : 'text-slate-400'}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
        <button onClick={() => {}} className="absolute right-0 top-0 bottom-0 w-7 flex items-center justify-center bg-gradient-to-l from-white dark:from-[#1c1f2e] to-transparent z-10 text-slate-400 opacity-0 hover:opacity-100">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
