'use client';

import { ArrowLeft, Mail, Phone, Shield, PanelLeftClose, PanelLeftOpen, Camera, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { resolveDocumentUrl } from '../../lib/services/employee.service';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface EmployeeHeaderProps {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    nationalId?: string;
    isDoctor: boolean;
    isActive: boolean;
    photoUrl?: string | null;
  };
  uploadingPhoto?: boolean;
  onPhotoUploadClick?: () => void;
  onPhotoDelete?: () => void;
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Hasta detay sayfasındaki sol menü (PatientHeader, variant="sidebar") ile aynı
// yapı/davranışı (daraltılabilir kart + dikey sekme menüsü) kullanır — bkz.
// components/patients/PatientHeader.tsx.
export default function EmployeeHeader({
  employee,
  uploadingPhoto = false,
  onPhotoUploadClick,
  onPhotoDelete,
  tabs,
  activeTab,
  onTabChange,
  collapsed = false,
  onToggleCollapse,
}: EmployeeHeaderProps) {
  const router = useRouter();

  /* Daraltılmış: yalnızca ikon sütunu */
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
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                title={tab.label}
                className={`relative flex items-center justify-center w-full h-10 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-metronic-primary text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-600'
                }`}
              >
                {tab.icon}
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  /* Genişletilmiş: iki ayrı kart (Personel Bilgisi + Menü) */
  return (
    <div className="flex flex-col gap-3">

      {/* KART 1: Personel Bilgisi */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden">

        {/* Üst satır: Geri + Daralt */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            onClick={() => router.push('/hr/staff')}
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

        {/* Kimlik bloğu — fotoğraf üstte ortalanmış (2x büyütülmüş profil fotoğrafı alanı) */}
        <div className="px-4 py-4 border-b border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
          <div className="relative w-24 h-24 mb-3 group flex-shrink-0">
            {employee.photoUrl ? (
              <img
                src={resolveDocumentUrl(employee.photoUrl)}
                alt={`${employee.firstName} ${employee.lastName}`}
                className="w-24 h-24 rounded-2xl object-cover shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-metronic-primary-light dark:bg-metronic-primary/15 text-metronic-primary flex items-center justify-center font-extrabold text-2xl shadow-sm">
                {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
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
                {uploadingPhoto ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
              </button>
            )}
            {employee.photoUrl && !uploadingPhoto && onPhotoDelete && (
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
            {employee.firstName} {employee.lastName}
          </h2>
          <div className="flex items-center justify-center flex-wrap gap-1.5 mt-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wide">
              {employee.isDoctor ? 'Hekim' : 'Personel'}
            </span>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
              employee.isActive ? 'bg-metronic-success-light text-metronic-success' : 'bg-slate-100 text-slate-500'
            }`}>
              {employee.isActive ? 'Aktif' : 'Pasif'}
            </span>
          </div>
        </div>

        {/* İletişim bilgileri */}
        <div className="px-4 py-3 flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 text-[12px]">
            <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 flex-shrink-0"><Mail size={13} /></div>
            <span className="flex-1 min-w-0 truncate text-slate-600 dark:text-slate-300 font-semibold no-capitalize">{employee.email}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[12px]">
            <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 flex-shrink-0"><Phone size={13} /></div>
            <span className="flex-1 min-w-0 truncate text-slate-600 dark:text-slate-300 font-semibold">{employee.phone || '-'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[12px]">
            <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 flex-shrink-0"><Shield size={13} /></div>
            <span className="flex-1 min-w-0 truncate text-slate-600 dark:text-slate-300 font-semibold">TC: {employee.nationalId || '-'}</span>
          </div>
        </div>
      </div>

      {/* KART 2: Menü (scroll'lu) */}
      <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden">
        <nav className="flex flex-col gap-1 p-2 overflow-y-auto max-h-[calc(100vh-380px)]">
          {tabs.map(tab => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-[13px] font-medium text-left whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? 'bg-metronic-primary text-white shadow-sm'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                  {tab.icon}
                </span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
