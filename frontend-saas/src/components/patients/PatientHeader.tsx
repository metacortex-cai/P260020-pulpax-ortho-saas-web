'use client';

import { useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, HeartPulse, Droplet, Activity, Droplets, Brain, Pill, AlertCircle, Accessibility, Zap, AlertOctagon, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
    firstName: string;
    lastName: string;
    phone: string;
    assignedDoctor?: string;
    totalDebt: number;
    advance: number;
    registeredAt: string;
    status: 'AKTIF' | 'PASIF';
    anamnesis?: Record<string, { answer: 'YES' | 'NO' | 'UNKNOWN'; detail?: string }>;
  };
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function PatientHeader({ patient, tabs, activeTab, onTabChange }: PatientHeaderProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const ANAMNESIS_LABELS: Record<string, { label: string, colorClass: string, icon: React.ReactNode }> = {
    cardiovascular: { label: 'Kardiyovasküler Hastalık', colorClass: 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200', icon: <HeartPulse size={16} strokeWidth={2} /> },
    blood: { label: 'Kan Hastalıkları', colorClass: 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200', icon: <Droplet size={16} strokeWidth={2} /> },
    hypertension: { label: 'Tansiyon', colorClass: 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200', icon: <Activity size={16} strokeWidth={2} /> },
    diabetes: { label: 'Diyabet', colorClass: 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200', icon: <Droplets size={16} strokeWidth={2} /> },
    neurological: { label: 'Nörolojik Hastalık', colorClass: 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200', icon: <Brain size={16} strokeWidth={2} /> },
    psychological: { label: 'Psikolojik Durum', colorClass: 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200', icon: <Brain size={16} strokeWidth={2} /> },
    medications: { label: 'İlaç Kullanımı', colorClass: 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200', icon: <Pill size={16} strokeWidth={2} /> },
    disabled: { label: 'Engelli Hasta', colorClass: 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300', icon: <Accessibility size={16} strokeWidth={2} /> },
    lowPainThreshold: { label: 'Düşük Ağrı Eşiği', colorClass: 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200', icon: <Zap size={16} strokeWidth={2} /> },
    difficultPatient: { label: 'Zor Hasta', colorClass: 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-red-100 hover:text-red-700 hover:border-red-300', icon: <AlertOctagon size={16} strokeWidth={2} /> },
    vip: { label: 'VIP Hasta', colorClass: 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-yellow-100 hover:text-yellow-700 hover:border-yellow-300', icon: <Crown size={16} strokeWidth={2} /> },
    other: { label: 'Diğer / Alerji', colorClass: 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600 hover:border-slate-300', icon: <AlertCircle size={16} strokeWidth={2} /> },
  };

  const positiveAnamnesis = patient.anamnesis 
    ? Object.entries(patient.anamnesis).filter(([_, data]) => data.answer === 'YES')
    : [];

  return (
    <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200/60 dark:border-white/5 shadow-sm mb-4">
      {/* ─── Üst Satır: Hasta Kimliği ─── */}
      <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Geri Butonu */}
          <button
            onClick={() => router.push('/patients')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0 border border-slate-200/60 dark:border-white/10"
            title="Listeye Dön"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-metronic-primary-light dark:bg-metronic-primary/15 text-metronic-primary flex items-center justify-center font-extrabold text-lg flex-shrink-0 shadow-sm">
            {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
          </div>

          {/* İsim + Durum + Dosya No */}
          <div className="flex flex-col min-w-0">
            <h2 className="text-[17px] font-extrabold text-slate-800 dark:text-white truncate leading-tight">
              {patient.firstName} {patient.lastName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0
                ${patient.status === 'AKTIF'
                  ? 'bg-metronic-success-light text-metronic-success'
                  : 'bg-slate-100 text-slate-500'}`}>
                {patient.status}
              </span>
              <span className="text-slate-400 text-[12px] font-medium font-mono flex-shrink-0">#{patient.id}</span>
            </div>
          </div>
        </div>

        {/* Anamnez Uyarı Badgeleri (SAĞ TARAFTA) */}
        {positiveAnamnesis.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap md:pl-5 md:border-l border-slate-200/70">
            {positiveAnamnesis.map(([key, data]) => {
              const badgeInfo = ANAMNESIS_LABELS[key] || ANAMNESIS_LABELS.other;
              return (
                <div key={key} title={`${badgeInfo.label}${data.detail ? `\n• ${data.detail}` : ''}`}
                  className={`flex items-center justify-center w-8 h-8 rounded-xl border border-transparent cursor-help transition-all hover:scale-110 shadow-sm ${badgeInfo.colorClass} hover:shadow-md`}>
                  {badgeInfo.icon}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Alt Satır: Sekme Navigasyonu (Pill Bar) ─── */}
      <div className="relative border-t border-slate-100 dark:border-white/5">
        {/* Sol ok */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 w-7 flex items-center justify-center bg-gradient-to-r from-white dark:from-[#1c1f2e] via-white/90 dark:via-[#1c1f2e]/90 to-transparent z-10 text-slate-400 hover:text-slate-600 opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Kaydırılabilir Tab Alanı */}
        <div
          ref={scrollRef}
          className="flex items-center gap-1 px-5 py-2 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map(tab => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                  isActive
                    ? 'bg-metronic-primary text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/30'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <span className={isActive ? 'text-white/80' : 'text-slate-400'}>{tab.icon}</span>
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold leading-none ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-500'
                  }`}>{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sağ ok */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 w-7 flex items-center justify-center bg-gradient-to-l from-white dark:from-[#1c1f2e] via-white/90 dark:via-[#1c1f2e]/90 to-transparent z-10 text-slate-400 hover:text-slate-600 opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
