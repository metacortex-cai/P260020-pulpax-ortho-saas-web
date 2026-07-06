'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MetronicLayout from '../../../../components/layout/MetronicLayout';
import {
  User,
  ClipboardList,
  ChevronLeft,
  Calendar,
  Hash,
  Wallet,
  Phone,
  FileText
} from 'lucide-react';

// Tabs
import CandidatePlansTab from './tabs/CandidatePlansTab';
import { FinanceService } from '../../../../lib/services/finance.service';
import { formatCurrency } from '../../../../lib/utils/formatCurrency';

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('plans');
  const [candidate, setCandidate] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount pattern
    setLoading(true);
    setError(null);
    FinanceService.getCandidate(params.id)
      .then(data => setCandidate(data))
      .catch(() => setError('Aday hasta bilgileri yüklenirken bir hata oluştu.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const TABS = [
    { id: 'plans', label: 'Tedavi Planları', icon: <ClipboardList size={16} /> },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case 'plans': return <CandidatePlansTab candidate={candidate} />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <MetronicLayout title="Aday Hasta Detayı" breadcrumbs={['Muhasebe', 'Aday Hastalar', 'Yükleniyor...']}>
        <div className="flex items-center justify-center py-24 text-slate-500 font-medium">Yükleniyor...</div>
      </MetronicLayout>
    );
  }

  if (error || !candidate) {
    return (
      <MetronicLayout title="Aday Hasta Detayı" breadcrumbs={['Muhasebe', 'Aday Hastalar']}>
        <div className="flex items-center justify-center py-24 text-metronic-danger font-medium">{error || 'Kayıt bulunamadı.'}</div>
      </MetronicLayout>
    );
  }

  return (
    <MetronicLayout title="Aday Hasta Detayı" breadcrumbs={['Muhasebe', 'Aday Hastalar', candidate.name]}>
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* LEFT PANEL: Candidate Profile */}
        <div className="w-full lg:w-[320px] flex-shrink-0 space-y-4">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[13px] font-bold text-slate-500 hover:text-metronic-primary transition-colors mb-2"
          >
            <ChevronLeft size={16} /> Geri Dön
          </button>

          <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="p-6 text-center border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="w-20 h-20 rounded-3xl bg-amber-500 text-white flex items-center justify-center font-bold text-3xl mx-auto shadow-xl shadow-amber-500/20 mb-4">
                {candidate.name.charAt(0)}
              </div>
              <h1 className="text-[18px] font-black text-slate-800 dark:text-white leading-tight">{candidate.name}</h1>
              <p className="text-[13px] font-medium text-slate-400 mt-1">{candidate.phone}</p>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TC KİMLİK NO</p>
                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{candidate.tckn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <Hash size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DOSYA NO</p>
                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{candidate.dosyaNo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DOĞUM TARİHİ</p>
                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{candidate.birthDate}</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-white/5" />

              <div className="space-y-3">
                <div className="p-4 bg-metronic-primary/5 dark:bg-metronic-primary/10 rounded-xl border border-metronic-primary/10 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-metronic-primary uppercase">POTANSİYEEL TUTAR</span>
                    <span className="text-[18px] font-black text-metronic-primary">₺{formatCurrency(candidate.potentialTotal ?? candidate.planTotal ?? 0)}</span>
                  </div>
                  <Wallet size={24} className="text-metronic-primary opacity-20" />
                </div>
                
                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">DURUM</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-wider">{candidate.status}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-[12px] font-bold hover:bg-slate-50 transition-all shadow-sm">
                  <Phone size={14} /> Ara
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-[12px] font-bold hover:bg-slate-50 transition-all shadow-sm">
                  <FileText size={14} /> SMS
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Tab Content */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 w-full">
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                  activeTab === tab.id 
                  ? 'bg-white dark:bg-white/10 text-metronic-primary shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-[#1c1f2e] rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden min-h-[600px]">
            <div className="p-8">
              {renderTab()}
            </div>
          </div>
        </div>

      </div>
    </MetronicLayout>
  );
}
