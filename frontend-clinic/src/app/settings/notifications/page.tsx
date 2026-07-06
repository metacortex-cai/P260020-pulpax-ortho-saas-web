'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import { 
  Bell, BellOff, Users, Calendar, CreditCard, Settings, Package,
  FlaskConical, UserCircle, Save, CheckCircle2, Info,
  ChevronDown, ChevronRight, Smartphone, Mail, Monitor
} from 'lucide-react';

// ─── Modüller ve Aksiyonları ───
const NOTIFICATION_MODULES = [
  {
    id: 'patients',
    name: 'Hasta İşlemleri',
    icon: Users,
    color: 'text-blue-500',
    actions: [
      { id: 'patient_created', label: 'Yeni hasta kaydı oluşturulduğunda' },
      { id: 'patient_updated', label: 'Hasta bilgileri güncellendiğinde' },
      { id: 'patient_deleted', label: 'Hasta kaydı silindiğinde' },
    ]
  },
  {
    id: 'appointments',
    name: 'Randevu',
    icon: Calendar,
    color: 'text-purple-500',
    actions: [
      { id: 'appointment_created', label: 'Yeni randevu oluşturulduğunda' },
      { id: 'appointment_cancelled', label: 'Randevu iptal edildiğinde' },
      { id: 'appointment_reminder', label: 'Randevu hatırlatması (1 gün önce)' },
      { id: 'appointment_noshow', label: 'Hasta randevuya gelmediğinde' },
    ]
  },
  {
    id: 'finance',
    name: 'Muhasebe',
    icon: CreditCard,
    color: 'text-emerald-500',
    actions: [
      { id: 'payment_received', label: 'Ödeme alındığında' },
      { id: 'payment_overdue', label: 'Ödeme vadesi geçtiğinde' },
      { id: 'invoice_created', label: 'Yeni fatura oluşturulduğunda' },
    ]
  },
  {
    id: 'inventory',
    name: 'Stok/Depo',
    icon: Package,
    color: 'text-amber-500',
    actions: [
      { id: 'stock_low', label: 'Stok kritik seviyeye düştüğünde' },
      { id: 'stock_expired', label: 'Malzeme son kullanma tarihi yaklaştığında' },
      { id: 'stock_in', label: 'Stok girişi yapıldığında' },
      { id: 'stock_out', label: 'Stok çıkışı yapıldığında' },
      { id: 'stock_transfer', label: 'Depolar arası transfer gerçekleştirildiğinde' },
    ]
  },
  {
    id: 'lab',
    name: 'Laboratuvar',
    icon: FlaskConical,
    color: 'text-pink-500',
    actions: [
      { id: 'lab_order_completed', label: 'Laboratuvar siparişi tamamlandığında' },
      { id: 'lab_order_shipped', label: 'Laboratuvar siparişi kargoya verildiğinde' },
    ]
  },
  {
    id: 'hr',
    name: 'İnsan Kaynakları',
    icon: UserCircle,
    color: 'text-indigo-500',
    actions: [
      { id: 'leave_request', label: 'Yeni izin talebi geldiğinde' },
      { id: 'leave_approved', label: 'İzin talebi onaylandığında/reddedildiğinde' },
      { id: 'staff_created', label: 'Yeni personel eklendiğinde' },
      { id: 'staff_deactivated', label: 'Personel pasife alındığında' },
    ]
  },
  {
    id: 'settings',
    name: 'Sistem & Ayarlar',
    icon: Settings,
    color: 'text-slate-500',
    actions: [
      { id: 'user_login', label: 'Yeni kullanıcı girişi yapıldığında' },
      { id: 'role_changed', label: 'Kullanıcı yetkisi değiştirildiğinde' },
      { id: 'support_access', label: 'Destek erişim izni verildiğinde/kaldırıldığında' },
    ]
  },
];

type ChannelKey = 'inApp' | 'email' | 'sms';

interface ActionPrefs {
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

// Varsayılan: Tümü uygulama içi açık, email/sms kapalı
function getDefaultPrefs(): Record<string, ActionPrefs> {
  const prefs: Record<string, ActionPrefs> = {};
  NOTIFICATION_MODULES.forEach(mod => {
    mod.actions.forEach(action => {
      prefs[action.id] = { inApp: true, email: false, sms: false };
    });
  });
  return prefs;
}

export default function NotificationSettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [preferences, setPreferences] = useState<Record<string, ActionPrefs>>(getDefaultPrefs());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(NOTIFICATION_MODULES.map(m => m.id)));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
  }, [user, router]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
  };

  const togglePref = (actionId: string, channel: ChannelKey) => {
    setPreferences(prev => ({
      ...prev,
      [actionId]: { ...prev[actionId], [channel]: !prev[actionId][channel] }
    }));
    setSaved(false);
  };

  // Modül bazlı toplu aç/kapat
  const toggleAllInModule = (moduleId: string, channel: ChannelKey) => {
    const mod = NOTIFICATION_MODULES.find(m => m.id === moduleId);
    if (!mod) return;
    const allOn = mod.actions.every(a => preferences[a.id]?.[channel]);
    setPreferences(prev => {
      const next = { ...prev };
      mod.actions.forEach(a => {
        next[a.id] = { ...next[a.id], [channel]: !allOn };
      });
      return next;
    });
    setSaved(false);
  };

  const handleSave = () => {
    // Mock save — backend bağlantısında API'ye gönderilecek
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const CHANNELS: { key: ChannelKey; label: string; icon: any; color: string }[] = [
    { key: 'inApp', label: 'Uygulama', icon: Monitor, color: 'text-metronic-primary' },
    { key: 'email', label: 'E-Posta', icon: Mail, color: 'text-amber-500' },
    { key: 'sms', label: 'SMS', icon: Smartphone, color: 'text-emerald-500' },
  ];

  if (!user) return null;

  return (
    <MetronicLayout title="Bildirim Ayarları" breadcrumbs={['Ayarlar', 'Bildirim Ayarları']}>

      <div className="m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-visible bg-white dark:bg-[#1c1f2e]">
        
        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-white/5 gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.1rem] font-bold text-slate-800 dark:text-white tracking-tight m-0">Bildirim Tercihleri</h3>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-md border border-slate-200 dark:border-white/10">
              {NOTIFICATION_MODULES.length} Modül
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm"
            >
              {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {saved ? 'Kaydedildi!' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </div>

        {/* ─── BİLGİ BANDI ─── */}
        <div className="flex items-center gap-2 px-6 py-3 bg-blue-50/50 dark:bg-blue-500/5 border-b border-blue-100 dark:border-blue-500/10 text-blue-700 dark:text-blue-400 text-[12px] font-medium">
          <Info size={15} className="flex-shrink-0" />
          Her modül için hangi kanallardan (Uygulama İçi, E-Posta, SMS) bildirim almak istediğinizi aşağıdan yapılandırabilirsiniz. Sadece yetkiniz olan modüller görüntülenir.
        </div>

        {/* ─── KANAL BAŞLIKLARI ─── */}
        <div className="hidden md:flex items-center px-6 py-3 border-b border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Modül / Aksiyon</span>
          </div>
          <div className="flex items-center gap-8 pr-2">
            {CHANNELS.map(ch => {
              const Icon = ch.icon;
              return (
                <div key={ch.key} className="w-20 flex flex-col items-center gap-1">
                  <Icon size={16} className={ch.color} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{ch.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── MODÜLLER & AKSİYONLAR ─── */}
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {NOTIFICATION_MODULES.map(mod => {
            const ModIcon = mod.icon;
            const isExpanded = expandedModules.has(mod.id);

            return (
              <div key={mod.id}>
                {/* Modül Başlığı */}
                <div 
                  className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
                  onClick={() => toggleModule(mod.id)}
                >
                  <div className="flex items-center gap-3">
                    <ChevronRight size={16} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    <div className="w-9 h-9 rounded-lg bg-metronic-primary-light dark:bg-metronic-primary/15 flex items-center justify-center flex-shrink-0">
                      <ModIcon size={18} className={mod.color} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-800 dark:text-slate-100 font-bold text-[13px] leading-tight">{mod.name}</span>
                      <span className="text-slate-400 text-[11px] font-semibold mt-0.5">{mod.actions.length} aksiyon</span>
                    </div>
                  </div>

                  {/* Modül bazlı toplu toggle'lar */}
                  <div className="hidden md:flex items-center gap-8 pr-2" onClick={e => e.stopPropagation()}>
                    {CHANNELS.map(ch => {
                      const allOn = mod.actions.every(a => preferences[a.id]?.[ch.key]);
                      const someOn = mod.actions.some(a => preferences[a.id]?.[ch.key]);
                      return (
                        <div key={ch.key} className="w-20 flex justify-center">
                          <button
                            onClick={() => toggleAllInModule(mod.id, ch.key)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              allOn
                                ? 'bg-metronic-primary border-metronic-primary text-white'
                                : someOn
                                  ? 'border-metronic-primary bg-metronic-primary/20'
                                  : 'border-slate-300 dark:border-slate-600 hover:border-metronic-primary'
                            }`}
                          >
                            {allOn && <CheckCircle2 size={12} />}
                            {someOn && !allOn && <div className="w-2 h-0.5 bg-metronic-primary rounded-full" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Aksiyon Listesi (Genişletilmiş) */}
                {isExpanded && (
                  <div className="bg-slate-50/50 dark:bg-white/[0.01]">
                    {mod.actions.map((action, idx) => (
                      <div 
                        key={action.id} 
                        className={`flex items-center justify-between px-6 py-3 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors ${
                          idx < mod.actions.length - 1 ? 'border-b border-slate-100/60 dark:border-white/[0.03]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 pl-12 flex-1">
                          <Bell size={14} className="text-slate-400 flex-shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300 text-[13px] font-medium">{action.label}</span>
                        </div>

                        {/* Kanal toggle'ları */}
                        <div className="flex items-center gap-8 pr-2">
                          {CHANNELS.map(ch => {
                            const isOn = preferences[action.id]?.[ch.key] ?? false;
                            return (
                              <div key={ch.key} className="w-20 flex justify-center">
                                <button
                                  onClick={() => togglePref(action.id, ch.key)}
                                  className="relative"
                                  title={`${ch.label}: ${isOn ? 'Açık' : 'Kapalı'}`}
                                >
                                  <div className={`w-10 h-[22px] rounded-full transition-colors duration-300 ${
                                    isOn ? 'bg-metronic-primary' : 'bg-slate-200 dark:bg-white/10'
                                  }`}>
                                    <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                                      isOn ? 'translate-x-[22px]' : 'translate-x-[3px]'
                                    }`} />
                                  </div>
                                </button>
                                {/* Mobil label */}
                                <span className="md:hidden text-[10px] text-slate-400 font-bold ml-1.5">{ch.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── FOOTER ─── */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e] gap-4 rounded-b-xl">
          <span className="text-slate-500 dark:text-slate-400 text-[13px] font-medium">
            Toplam <span className="font-bold text-slate-700 dark:text-slate-200">{NOTIFICATION_MODULES.reduce((sum, m) => sum + m.actions.length, 0)}</span> bildirim aksiyonu yapılandırılabilir.
          </span>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 h-9 px-4 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold transition-colors active:scale-95 shadow-sm"
          >
            {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saved ? 'Kaydedildi!' : 'Değişiklikleri Kaydet'}
          </button>
        </div>

      </div>
    </MetronicLayout>
  );
}
