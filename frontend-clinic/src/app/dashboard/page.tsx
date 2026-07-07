'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { useDashboardStore } from '../../store/dashboardStore';
import MetronicLayout from '../../components/layout/MetronicLayout';
import {
  Settings, Loader2, Calendar as CalendarIcon, Wallet, Layers,
  ArrowUpCircle, ArrowDownCircle, Activity, TrendingUp,
  Stethoscope, Users, Receipt, Clock, GripVertical
} from 'lucide-react';
import api from '../../lib/api';
import { ReportsService, IncomeSummary, TreatmentPerformance } from '../../lib/services/reports.service';
import Skeleton from '../../components/ui/Skeleton';
import { formatCurrency } from '../../lib/utils/formatCurrency';

const AVAILABLE_WIDGETS = [
  { id: 'financial_kpis', label: 'Finansal KPI Özetleri' },
  { id: 'appointments', label: 'Bugünün Randevuları' },
  { id: 'recent_cash', label: 'Son Tahsilatlar' },
  { id: 'treatment_perf', label: 'Tedavi Performansı' },
  { id: 'quick_actions', label: 'Hızlı Erişim Paneli' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, tenantId } = useAuthStore();
  const { activeWidgets, toggleWidget, setWidgets } = useDashboardStore();
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  
  // Data States
  const [summary, setSummary] = useState<IncomeSummary | null>(null);
  const [treatments, setTreatments] = useState<TreatmentPerformance[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  const fetchData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // 1. Fetch Today's Appointments
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [summaryData, treatmentData, appRes] = await Promise.all([
        ReportsService.getIncomeSummary(),
        ReportsService.getTreatmentPerformance(),
        api.get('/appointments', { params: { startDate: todayStart.toISOString(), endDate: todayEnd.toISOString() } }),
      ]);

      setSummary(summaryData);
      setTreatments(treatmentData.slice(0, 5)); // Top 5
      setAppointments(appRes.data || []);

      // Fetch 5 most recent payments
      const paymentsRes = await api.get('/finance/payments/recent');
      setRecentPayments((paymentsRes.data || []).slice(0, 5));

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mounted-flag pattern to guard SSR/hydration-sensitive rendering; must run client-side post-mount, not derivable during render
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !user) router.push('/login');
  }, [mounted, user, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-dep-change pattern, setLoading(true) inside fetchData is a synchronous UI reset before the async calls
    if (mounted && tenantId && user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchData is redefined every render and reads live tenantId; adding it as a dep would refetch on every render
  }, [mounted, tenantId, user]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-[#EEF0F8]">
        <Loader2 className="animate-spin text-metronic-primary mr-2" size={24} />
        <span className="text-[13px] font-semibold">Yükleniyor...</span>
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    setTargetIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (targetIndex === index) {
      setTargetIndex(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setTargetIndex(null);
      return;
    }
    
    const updatedWidgets = [...activeWidgets];
    const draggedWidget = updatedWidgets[draggedIndex];
    updatedWidgets.splice(draggedIndex, 1);
    updatedWidgets.splice(index, 0, draggedWidget);
    
    setWidgets(updatedWidgets);
    setDraggedIndex(null);
    setTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setTargetIndex(null);
  };

  // Render Functions for Widgets
  const renderFinancialKpis = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
        {loading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />) : summary && (
          <>
            <KPICard title="Aylık Tahsilat" val={fmt(summary.monthlyIncome)} sub="Gelir" icon={ArrowUpCircle} color="emerald" />
            <KPICard title="Aylık Gider" val={fmt(summary.monthlyExpense)} sub="Gider" icon={ArrowDownCircle} color="red" />
            <KPICard title="Net Kar" val={fmt(summary.netMonthlyProfit)} sub="Denge" icon={Activity} color="blue" trend={summary.netMonthlyProfit >= 0} />
            <KPICard title="Tahsilat Oranı" val={`%${(summary.collectionRate ?? 0).toFixed(1)}`} sub="Başarı" icon={TrendingUp} color="amber" />
          </>
        )}
      </div>
    );
  };

  const renderAppointments = () => {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden h-full flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h4 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon size={18} className="text-metronic-primary" /> Bugünün Randevuları
          </h4>
          <Link href="/appointments" className="text-[11px] font-bold text-metronic-primary hover:underline">Tümünü Gör</Link>
        </div>
        <div className="p-2 flex-grow min-h-[300px] flex flex-col justify-between">
          {loading ? <Skeleton className="h-48 w-full" /> : appointments.length > 0 ? (
            <div className="space-y-1">
              {appointments.map(app => (
                <div key={app.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {app.patient?.firstName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-700">{app.patient?.firstName} {app.patient?.lastName}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{app.doctor?.firstName} {app.doctor?.lastName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                     <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-lg">{formatTime(app.startOn)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={CalendarIcon} msg="Bugün için randevu bulunmuyor." />
          )}
        </div>
      </div>
    );
  };

  const renderTreatmentPerformance = () => {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden h-full flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h4 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
            <Stethoscope size={18} className="text-metronic-primary" /> Popüler Tedaviler
          </h4>
        </div>
        <div className="p-5 flex-grow">
           {loading ? <Skeleton className="h-48 w-full" /> : (
             <div className="space-y-4">
                {treatments.map((t, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-[12px] font-bold">
                      <span className="text-slate-600">{t.name}</span>
                      <span className="text-metronic-primary">{t.count} İşlem</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-metronic-primary rounded-full" style={{ width: `${(t.revenue / (treatments[0]?.revenue || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderRecentCash = () => {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden h-full flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50/30">
          <h4 className="text-[14px] font-bold text-emerald-800 flex items-center gap-2"><Wallet size={18} /> Son Tahsilatlar</h4>
        </div>
        <div className="p-2 flex-grow min-h-[250px]">
          {loading ? <Skeleton className="h-40 w-full" /> : recentPayments.length > 0 ? (
            <div className="space-y-1">
              {recentPayments.map(p => (
                <div key={p.id} className="p-3 flex items-center justify-between border-b border-slate-50 last:border-0">
                   <div className="flex flex-col">
                     <span className="text-[13px] font-bold text-slate-700">{p.patient?.firstName} {p.patient?.lastName}</span>
                     <span className="text-[10px] text-slate-400 font-bold uppercase">{p.method}</span>
                   </div>
                   <span className="text-[14px] font-black text-emerald-600">+{formatCurrency(Number(p.amount))} ₺</span>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Wallet} msg="Tahsilat kaydı yok." />}
        </div>
      </div>
    );
  };

  const renderQuickActions = () => {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl h-full flex flex-col justify-between">
         <h5 className="text-[15px] font-black mb-4">Hızlı Erişim</h5>
         <div className="grid grid-cols-2 gap-3">
            <QuickBtn label="Yeni Hasta" href="/patients" icon={Users} />
            <QuickBtn label="Yeni Randevu" href="/appointments" icon={Clock} />
            <QuickBtn label="Gider Ekle" href="/finance/expenses" icon={Receipt} />
            <QuickBtn label="Raporlar" href="/reports/financials" icon={TrendingUp} />
         </div>
      </div>
    );
  };

  const renderWidget = (id: string) => {
    switch (id) {
      case 'financial_kpis':
        return renderFinancialKpis();
      case 'appointments':
        return renderAppointments();
      case 'treatment_perf':
        return renderTreatmentPerformance();
      case 'recent_cash':
        return renderRecentCash();
      case 'quick_actions':
        return renderQuickActions();
      default:
        return null;
    }
  };

  const WIDGET_SIZES: Record<string, string> = {
    financial_kpis: 'col-span-1 lg:col-span-3',
    appointments: 'col-span-1 lg:col-span-2',
    treatment_perf: 'col-span-1 lg:col-span-2',
    recent_cash: 'col-span-1',
    quick_actions: 'col-span-1',
  };

  const headerAction = (
    <div className="flex items-center gap-2.5">
      <button 
        onClick={() => setIsEditing(!isEditing)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-all duration-200 shadow-sm border ${
          isEditing 
            ? 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600' 
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <Settings size={16} className={isEditing ? 'animate-spin' : ''} />
        {isEditing ? 'Düzeni Kilitle' : 'Yerleşimi Düzenle'}
      </button>

      <div className="relative group">
        <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-slate-600 font-medium text-[13px] hover:bg-slate-50 transition-colors shadow-sm">
          <Layers size={16} /> Göster/Gizle
        </button>
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-2">
          {AVAILABLE_WIDGETS.map(w => (
            <label key={w.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input 
                type="checkbox" 
                checked={activeWidgets.includes(w.id)} 
                onChange={() => toggleWidget(w.id)} 
                className="w-4 h-4 rounded text-metronic-primary" 
              />
              <span className="text-[13px] font-semibold text-slate-700">{w.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <MetronicLayout title="Klinik Özet Paneli" breadcrumbs={['Kontrol Paneli']} headerAction={headerAction}>
      
      <div className="space-y-6 pb-8">
        
        {isEditing && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between text-amber-800 animate-pulse">
            <div className="flex items-center gap-3">
              <Settings size={20} className="animate-spin text-amber-600" />
              <div>
                <p className="text-[13px] font-bold">Panel Yerleşim Düzenleme Modu Aktif</p>
                <p className="text-[11px] font-medium text-amber-700">Kartları üstlerindeki taşıma butonlarından tutarak yerlerini değiştirebilirsiniz.</p>
              </div>
            </div>
            <button 
              onClick={() => setIsEditing(false)} 
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Düzeni Kaydet
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {activeWidgets.map((widgetId, index) => {
            const sizeClass = WIDGET_SIZES[widgetId] || 'col-span-1';
            const isDraggingThis = draggedIndex === index;
            const isTargetThis = targetIndex === index && draggedIndex !== index;
            
            return (
              <div 
                key={widgetId} 
                className={`${sizeClass} relative transition-all duration-300 ${
                  isEditing 
                    ? isDraggingThis 
                      ? 'opacity-40 scale-[0.98] border-2 border-dashed border-slate-300 rounded-2xl p-1 bg-slate-50'
                      : isTargetThis
                        ? 'border-2 border-dashed border-violet-500 rounded-2xl p-1 bg-violet-500/10 scale-[1.02] shadow-lg z-10'
                        : 'border-2 border-dashed border-amber-400/40 rounded-2xl p-1 bg-amber-50/10 hover:border-amber-400/70 hover:bg-amber-50/20'
                    : ''
                }`}
                draggable={isEditing}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragLeave={(e) => handleDragLeave(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                {isEditing && (
                  <div className="absolute top-3 left-3 z-30 bg-slate-800 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] font-bold shadow-md cursor-grab active:cursor-grabbing select-none hover:bg-slate-700 transition-colors">
                    <GripVertical size={12} />
                    <span>Taşı</span>
                  </div>
                )}
                {renderWidget(widgetId)}
              </div>
            );
          })}
        </div>

      </div>
    </MetronicLayout>
  );
}

function KPICard({ title, val, sub, icon: Icon, color, trend }: any) {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}><Icon size={20} /></div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[color]}`}>{sub}</span>
      </div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <h3 className={`text-[1.3rem] font-black mt-1 leading-none ${trend === false ? 'text-red-600' : 'text-slate-800'}`}>{val}</h3>
    </div>
  );
}

function EmptyState({ icon: Icon, msg, color = 'slate' }: any) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
      <Icon size={32} className={`mb-2 text-${color}-400`} />
      <p className="text-[12px] font-bold">{msg}</p>
    </div>
  );
}

function QuickBtn({ label, href, icon: Icon }: any) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-2 p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/5">
       <Icon size={20} />
       <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </Link>
  );
}
