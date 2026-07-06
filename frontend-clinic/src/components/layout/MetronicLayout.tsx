'use client';

import { ReactNode, useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useI18nStore } from '../../store/i18nStore';
import { useUIStore } from '../../store/uiStore';
import ChatPanel from './ChatPanel';
import NotificationPanel from './NotificationPanel';
import AddPatientModal from '../patients/AddPatientModal';
import IntercomChat from './IntercomChat';
import { useRealtime } from '../../hooks/useRealtime';
import api from '../../lib/api';
import AppointmentModal from '../calendar/AppointmentModal';
import CommandPalette from './CommandPalette';
import Modal from '../ui/Modal';
import { PatientService } from '../../lib/services/patient.service';
import { EmployeeService, Employee } from '../../lib/services/employee.service';
import { Patient } from '../../lib/types';
import { useToastStore } from '../../store/toastStore';
import { 
  Globe,
  LayoutDashboard, 
  Users, 
  Calendar, 
  CreditCard, 
  Settings, 
  ChevronRight,
  Menu,
  Search,
  MessageSquare,
  Bell,
  ChevronDown,
  LifeBuoy,
  Ticket,
  HelpCircle,
  FileText,
  PieChart,
  Activity,
  Layers,
  Wallet,
  Stethoscope,
  TrendingUp,
  BarChart3,
  Package,
  Book,
  Tags,
  FlaskConical,
  UserCircle,
  X,
  UserPlus,
  LogOut,
  Moon,
  Sun,
  Zap,
  User as UserIcon,
  Maximize,
  Minimize,
  Save,
  Radio,
  BellRing
} from 'lucide-react';

interface Props {
  children: ReactNode;
  title?: string;
  breadcrumbs?: string[];
  headerAction?: ReactNode;
  infoTooltip?: ReactNode;
}

export default function MetronicLayout({ children, title = '', breadcrumbs = [], headerAction, infoTooltip }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, tenantId, logout } = useAuthStore();
  const { locale, setLocale, t } = useI18nStore();
  const { notifications, fetchNotifications, markAsRead, setConnected, addNotification, unreadCount } = useNotificationStore();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatUnreadCount, setChatUnreadCount] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  // Real Data for Modals
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Employee[]>([]);

  // Pager System State
  const [isPagerSenderOpen, setIsPagerSenderOpen] = useState(false);
  const [pagerUnitId, setPagerUnitId] = useState('');
  const [pagerMessage, setPagerMessage] = useState('');
  const [chairs, setChairs] = useState<any[]>([]);
  const pagerRef = useRef<HTMLDivElement>(null);
  const addToast = useToastStore(state => state.addToast);

  const playPagerChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(660, now + 0.15);
      gain2.gain.setValueAtTime(0.35, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.7);
    } catch (err) {
      console.warn('Web Audio API chime error:', err);
    }
  };

  useEffect(() => {
    if (!user || !tenantId) return;
    const loadChairs = async () => {
      try {
        const response = await api.get('/appointments/chairs');
        const data = response.data || [];
        setChairs(data);
        if (data.length > 0) {
          setPagerUnitId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load chairs in layout:', err);
      }
    };
    loadChairs();
  }, [user, tenantId]);

  // Pure derivation from notifications — no need for separate state/effect.
  const activePagers = useMemo(
    () => notifications.filter(n => n.type === 'PAGER' && !n.isRead),
    [notifications]
  );

  const handleSendPagerCall = async () => {
    if (!pagerUnitId) {
      addToast({ title: 'Hata', message: 'Lütfen bir ünit seçiniz.', type: 'error' });
      return;
    }
    const unitName = chairs.find(c => c.id === pagerUnitId)?.name || 'Bilinmeyen Ünit';
    const msgText = pagerMessage.trim() || 'Asistan Desteği';
    try {
      await api.post('/notifications/pager', {
        unit: unitName,
        message: msgText
      });
      addToast({ title: 'Başarılı', message: 'Çağrı gönderildi.', type: 'success' });
      setIsPagerSenderOpen(false);
      setPagerMessage('');
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Çağrı gönderilemedi.', type: 'error' });
    }
  };

  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // UI Store for Global Modals
  const {
    isAddPatientModalOpen, openAddPatientModal, closeAddPatientModal,
    isAddAppointmentModalOpen, openAddAppointmentModal, closeAddAppointmentModal,
    isAddPaymentModalOpen, openAddPaymentModal, closeAddPaymentModal
  } = useUIStore();

  const [paymentForm, setPaymentForm] = useState({ patientName: '', amount: '', method: 'NAKİT' });

  // Fetch data for global modals
  useEffect(() => {
    if (!user || !tenantId) return;
    
    const loadModalData = async () => {
      try {
        const [ptsRes, emps] = await Promise.all([
          PatientService.findAll({ limit: 200, sortBy: 'firstName', sortDir: 'asc' }),
          EmployeeService.findAll()
        ]);
        setPatients(ptsRes.data);
        // Sadece Doktor rolündekileri filtrele
        setDoctors(emps.filter(e => e.isDoctor && e.isActive));
      } catch (err) {
        console.error('Failed to load modal data:', err);
      }
    };

    loadModalData();
  }, [user, tenantId]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  // Dark mode: initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pulpax-dark-mode');
    if (saved === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard load-on-mount pattern (reads persisted preference from localStorage)
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const loadChatHistory = async () => {
      try {
        const response = await api.get('/notifications/chat/history');
        setChatMessages(response.data || []);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    loadChatHistory();
  }, [user, fetchNotifications]);

  useRealtime({
    onChatMessageReceived: (msg) => {
      setChatMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (!isChatOpen) {
        setChatUnreadCount(prev => prev + 1);
      }
    },
    onNotificationReceived: (notif) => {
      addNotification(notif);
      if (notif.type === 'PAGER') {
        playPagerChime();
      }
    }
  });

  const handleSendMessage = async (messageText: string) => {
    try {
      const response = await api.post('/notifications/chat', {
        message: messageText
      });
      const newMsg = response.data;
      setChatMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setIsLangOpen(false);
      if (pagerRef.current && !pagerRef.current.contains(e.target as Node)) setIsPagerSenderOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('pulpax-dark-mode', String(next));
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const toggleMenu = (name: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const navItems = [
    { name: t('home'), path: '/dashboard', icon: LayoutDashboard },
    { name: t('protocolBook'), path: '/protocol', icon: Book },
    { name: t('patientOperations'), icon: Users, subItems: [ { name: t('patients'), path: '/patients' } ]},
    { name: t('appointment'), icon: Calendar, subItems: [ { name: t('appointmentCalendar'), path: '/appointments' }, { name: t('appointmentRequests'), path: '/appointments/requests' } ]},
    { name: t('finance'), icon: CreditCard, subItems: [ { name: t('patientCurrent'), path: '/finance/patient-current' }, { name: t('vaultsAndBanks'), path: '/finance/vaults-banks' } ]},
    { name: t('tariffOperations'), icon: Tags, subItems: [ { name: t('tariffs'), path: '/tariffs' }, { name: t('treatments'), path: '/treatments' } ]},
    { name: t('stockWarehouse'), icon: Package, subItems: [ { name: t('inventories'), path: '/inventory/status' }, { name: t('fixtures'), path: '/inventory/fixtures' }, { name: t('stockMovements'), path: '/inventory/movements' }, { name: t('materials'), path: '/inventory/materials' } ]},
    { name: t('laboratory'), icon: FlaskConical, subItems: [ { name: t('labMovements'), path: '/lab/movements' }, { name: t('laboratories'), path: '/lab/labs' }, { name: t('procedures'), path: '/lab/procedures' }, { name: t('priceTariffs'), path: '/lab/tariffs' } ]},
    { name: t('humanResources'), icon: UserCircle, subItems: [ { name: t('staff'), path: '/hr/staff' }, { name: t('leaves'), path: '/hr/leaves' } ]},
    { name: t('supportCenter'), icon: LifeBuoy, subItems: [ { name: t('supportTickets'), path: '/support/tickets' }, { name: t('helpCenter'), path: '/support/faq' } ]},
    { name: t('reports'), icon: BarChart3, subItems: [ { name: t('appointmentCalendar'), path: '/reports/appointments' }, { name: t('physicianEarningsReport'), path: '/reports/commissions' }, { name: t('collectionsAndPaymentsReport'), path: '/reports/collections' }, { name: t('laboratoryReport'), path: '/reports/labs' }, { name: t('patientAcquisitionReport'), path: '/reports/acquisition' }, { name: t('stockInventoryReport'), path: '/reports/inventory' }, { name: t('treatmentStatisticsReport'), path: '/reports/treatments' }, { name: t('debtorListReport'), path: '/reports/debtors' }, { name: t('cancelledAppointmentAnalysis'), path: '/reports/cancellations' }, { name: t('physicianPerformanceReport'), path: '/reports/doctor-performance' } ]},
    { name: t('settings'), icon: Settings, subItems: [ { name: t('users'), path: '/settings/users' }, { name: t('roles'), path: '/settings/roles' }, { name: t('clinicInfo'), path: '/settings/clinic' }, { name: t('smsTemplates'), path: '/settings/sms' }, { name: t('documentTemplates'), path: '/settings/templates' }, { name: t('notificationSettings'), path: '/settings/notifications' }, { name: t('financeSettings'), path: '/settings/finance' }, { name: t('auditLogs'), path: '/settings/audit-logs' }, { name: t('dataEntry'), path: '/settings/data-entry' }, { name: t('integrations'), path: '/settings/integrations' }, { name: t('patientCategories'), path: '/settings/patient-categories' } ]}
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-metronic-body dark:bg-[#0f1117]">
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      
      <aside className={`bg-slate-900 flex-shrink-0 flex flex-col transition-all duration-300 hidden md:flex ${isCollapsed ? 'w-[80px]' : 'w-64'}`}>
        <div className={`h-[70px] flex items-center bg-slate-900 border-b border-white/5 flex-shrink-0 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
          {isCollapsed ? (
            <div className="w-10 h-10 rounded-xl bg-metronic-primary flex items-center justify-center shadow-lg shadow-metronic-primary/20 transition-all duration-300"><Stethoscope size={24} className="text-white" /></div>
          ) : (
            <Image src="/logo.png" alt="Pulpax Logo" width={200} height={51} className="h-8 w-auto object-contain" />
          )}
        </div>

        <div className={`flex-shrink-0 pt-4 pb-2 border-b border-white/5 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <Link href="/dashboard" className={`flex items-center gap-3 py-2.5 rounded-lg transition-colors ${pathname === '/dashboard' || pathname === '/' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}>
            <LayoutDashboard size={20} className={`flex-shrink-0 ${pathname === '/dashboard' || pathname === '/' ? 'text-metronic-primary' : 'text-slate-400'}`} />
            {!isCollapsed && <span className="font-medium text-[13px] whitespace-nowrap">Anasayfa</span>}
          </Link>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto py-2 overflow-x-hidden custom-scrollbar">
          <ul className={`flex flex-col gap-1 pb-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            {navItems.filter(item => !['Anasayfa', 'Ayarlar', 'Raporlar', 'Destek Merkezi'].includes(item.name)).map((item) => {
              const isActive = item.path ? pathname.startsWith(item.path) : item.subItems?.some(sub => pathname.startsWith(sub.path));
              const isOpen = openMenus[item.name];
              return (
                <li key={item.name}>
                  {item.path ? (
                    <Link href={item.path} className={`flex items-center gap-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}>
                      <item.icon size={20} className={`flex-shrink-0 ${isActive ? 'text-metronic-primary' : 'text-slate-400'}`} />
                      {!isCollapsed && <span className="font-medium text-[13px] whitespace-nowrap">{item.name}</span>}
                    </Link>
                  ) : (
                    <div>
                      <button onClick={() => toggleMenu(item.name)} className={`w-full flex items-center py-2.5 rounded-lg transition-colors ${isActive || isOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'} ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
                        <div className="flex items-center gap-3">
                          <item.icon size={20} className={`flex-shrink-0 ${(isActive || isOpen) ? 'text-metronic-primary' : 'text-slate-400'}`} />
                          {!isCollapsed && <span className="font-medium text-[13px] whitespace-nowrap">{item.name}</span>}
                        </div>
                        {!isCollapsed && <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />}
                      </button>
                      {!isCollapsed && isOpen && item.subItems && (
                        <div className="mt-1 flex flex-col gap-0.5" style={{ animation: 'slideDown 0.2s ease-out' }}>
                          {item.subItems.map(sub => (
                            <Link key={sub.path} href={sub.path} className={`flex items-center gap-2 py-2 pl-[44px] pr-4 rounded-lg transition-colors text-[12.5px] font-medium ${pathname.startsWith(sub.path) ? 'text-white bg-slate-800/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                              <div className={`w-1 h-1 rounded-full ${pathname.startsWith(sub.path) ? 'bg-metronic-primary' : 'bg-slate-600'}`}></div>
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className={`flex-shrink-0 pt-2 pb-4 border-t border-white/5 bg-slate-900 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {navItems.filter(item => item.name === 'Ayarlar').map((item) => {
            const isOpen = openMenus[item.name];
            return (
              <div key={item.name}>
                <button onClick={() => toggleMenu(item.name)} className={`w-full flex items-center py-2.5 rounded-lg transition-colors ${isOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'} ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className={`flex-shrink-0 ${isOpen ? 'text-metronic-primary' : 'text-slate-400'}`} />
                    {!isCollapsed && <span className="font-medium text-[13px] whitespace-nowrap">{item.name}</span>}
                  </div>
                  {!isCollapsed && <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />}
                </button>
                {!isCollapsed && isOpen && item.subItems && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {item.subItems.map(sub => (
                      <Link key={sub.path} href={sub.path} className={`flex items-center gap-2 py-2 pl-[44px] pr-4 rounded-lg transition-colors text-[12.5px] font-medium ${pathname.startsWith(sub.path) ? 'text-white bg-slate-800/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[70px] bg-white dark:bg-[#1c1f2e] flex items-center justify-between px-8 flex-shrink-0 relative z-50 shadow-sm dark:border-b dark:border-white/5">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="w-8 h-8 hidden md:flex items-center justify-center rounded-md bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-metronic-primary transition-colors"><Menu size={18} /></button>
            <button onClick={() => setIsMobileMenuOpen(true)} className="w-8 h-8 flex md:hidden items-center justify-center rounded-md bg-slate-50 dark:bg-white/5 text-slate-500"><Menu size={18} /></button>
          </div>

          <div className="hidden lg:flex flex-1 items-center px-8">
            <ul className="flex items-center gap-4">
              <li className="text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:text-metronic-primary cursor-pointer transition-colors px-3 py-2">Destek</li>
              <li className="text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:text-metronic-primary cursor-pointer transition-colors px-3 py-2">Raporlar</li>
              <li>
                <button onClick={openAddPatientModal} className="flex items-center gap-1.5 text-[13px] font-bold text-metronic-primary bg-metronic-primary/10 hover:bg-metronic-primary/20 transition-colors py-2 px-4 rounded-lg">
                  <Zap size={16} /> Hızlı İşlemler
                </button>
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-3">
             {/* Hekim Çağrı Pager Toggle */}
             <div className="relative" ref={pagerRef}>
               <button 
                 onClick={() => setIsPagerSenderOpen(!isPagerSenderOpen)}
                 className={`w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 relative ${isPagerSenderOpen ? 'text-metronic-primary bg-slate-100 dark:bg-white/10' : ''}`}
                 title="Hekim/Ünit Çağrısı Gönder"
               >
                 <Radio size={18} className={isPagerSenderOpen ? 'animate-pulse' : ''} />
               </button>
               
               {isPagerSenderOpen && (
                 <div 
                   className="absolute right-0 top-full mt-2.5 w-80 bg-white dark:bg-[#1c1f2e] border border-slate-100 dark:border-white/10 p-5 z-50 flex flex-col gap-4 shadow-xl"
                   style={{
                     animation: 'profileDropIn 0.2s ease-out',
                   }}
                 >
                   <div className="border-b border-slate-100 dark:border-white/5 pb-2">
                     <h6 className="text-[14px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <Radio size={16} className="text-metronic-primary animate-pulse" /> Hekim Çağrısı (Pager)
                     </h6>
                     <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Asistan ve resepsiyona anlık çağrı gönderin.</p>
                   </div>
                   
                   <div className="flex flex-col gap-1.5">
                     <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bulunduğunuz Ünit</label>
                     <select 
                       value={pagerUnitId} 
                       onChange={e => setPagerUnitId(e.target.value)}
                       className="m-input text-[13px]"
                     >
                       {chairs.length === 0 ? (
                         <option value="">Ünit Yükleniyor...</option>
                       ) : (
                         chairs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                       )}
                     </select>
                   </div>
                   
                   <div className="flex flex-col gap-1.5">
                     <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hızlı Mesaj / Talep</label>
                     <div className="grid grid-cols-2 gap-2">
                       {['Sterilizasyon Talebi', 'Asistan Desteği', 'Hasta Odası Hazır', 'Hekim Bekliyor'].map(preset => (
                         <button 
                           key={preset}
                           type="button"
                           onClick={() => setPagerMessage(preset)}
                           className={`px-2 py-1.5 text-[11px] font-bold rounded-lg border text-left truncate transition-all ${
                             pagerMessage === preset 
                               ? 'border-metronic-primary bg-metronic-primary/5 text-metronic-primary' 
                               : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                           }`}
                         >
                           {preset}
                         </button>
                       ))}
                     </div>
                   </div>
                   
                   <div className="flex flex-col gap-1.5">
                     <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Özel Mesaj</label>
                     <input 
                       type="text" 
                       value={pagerMessage}
                       onChange={e => setPagerMessage(e.target.value)}
                       placeholder="Çağrı detayını yazın..."
                       className="m-input text-[13px]"
                     />
                   </div>
                   
                   <button 
                     onClick={handleSendPagerCall}
                     className="w-full flex items-center justify-center gap-2 py-2 bg-metronic-primary text-white rounded-lg text-[13px] font-bold hover:bg-blue-600 transition-colors shadow-sm"
                   >
                     <Radio size={15} /> Çağrı Gönder
                   </button>
                 </div>
               )}
             </div>

             {/* Intercom Chat Toggle */}
             <button 
               onClick={() => {
                 setIsChatOpen(true);
                 setChatUnreadCount(0);
               }}
               className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 relative"
               title="Klinik İçi İnterkom"
             >
               <MessageSquare size={18} />
               {chatUnreadCount > 0 && (
                 <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#1c1f2e]">
                   {chatUnreadCount}
                 </span>
               )}
             </button>

             {/* Notifications Toggle & Panel */}
             <div className="relative">
               <button 
                 onClick={() => setIsNotifOpen(!isNotifOpen)}
                 className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 relative"
                 title="Bildirimler"
               >
                 <Bell size={18} />
                 {unreadCount > 0 && (
                   <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-metronic-primary text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#1c1f2e]">
                     {unreadCount}
                   </span>
                 )}
               </button>
               <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
             </div>

              {/* Dil Seçeneği (Language Switcher) */}
              <div className="relative" ref={langRef}>
                <button 
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                    isLangOpen 
                      ? 'bg-metronic-primary/10 text-metronic-primary' 
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-metronic-primary'
                  }`}
                  title="Dil Seçin / Select Language"
                >
                  <Globe size={18} />
                </button>
                
                {isLangOpen && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-[#1c1f2e] border border-slate-100 dark:border-white/10 rounded-lg shadow-lg z-[100] p-1 flex flex-col gap-0.5"
                    style={{ animation: 'profileDropIn 0.2s ease-out' }}
                  >
                    <button 
                      type="button"
                      onClick={() => { setLocale('tr'); setIsLangOpen(false); }}
                      className={`flex items-center justify-between w-full px-3 py-2 text-[12.5px] font-semibold rounded-md transition-colors ${
                        locale === 'tr' 
                          ? 'bg-metronic-primary/10 text-metronic-primary' 
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      Türkçe
                      {locale === 'tr' && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary"></span>}
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setLocale('en'); setIsLangOpen(false); }}
                      className={`flex items-center justify-between w-full px-3 py-2 text-[12.5px] font-semibold rounded-md transition-colors ${
                        locale === 'en' 
                          ? 'bg-metronic-primary/10 text-metronic-primary' 
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      English
                      {locale === 'en' && <span className="w-1.5 h-1.5 rounded-full bg-metronic-primary"></span>}
                    </button>
                  </div>
                )}
              </div>

             <button onClick={toggleFullscreen} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">{isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}</button>
             <button onClick={toggleDarkMode} className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
             <div className="w-9 h-9 rounded-lg bg-metronic-success-light flex items-center justify-center cursor-pointer" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                <span className="font-bold text-metronic-success">{user?.firstName?.charAt(0) || 'D'}</span>
             </div>
             {isProfileOpen && (
               <div className="absolute right-8 top-[60px] w-64 bg-white dark:bg-[#1c1f2e] rounded-xl shadow-xl border border-slate-100 dark:border-white/10 p-2 z-[100]">
                 <button onClick={handleLogout} className="w-full flex items-center gap-2 p-3 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg"><LogOut size={16} /> Çıkış Yap</button>
               </div>
             )}
          </div>
        </header>

        <div className="bg-transparent py-4 px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <h5 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h5>
            <div className="w-px h-5 bg-slate-200 dark:bg-white/10"></div>
            <ul className="flex items-center gap-2 text-[13px] font-medium text-slate-400">
              <li>Ana Sayfa</li>
              {breadcrumbs.map(c => <li key={c} className="flex items-center gap-2"><span>●</span>{c}</li>)}
            </ul>
          </div>
          {headerAction}
        </div>

        <main className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
          {children}
        </main>
      </div>

      <IntercomChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        messages={chatMessages} 
        onSendMessage={handleSendMessage} 
      />

      {/* Pager Alarm Notification Overlay */}
      {activePagers.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full animate-in fade-in duration-300">
          {activePagers.map(pager => (
            <div 
              key={pager.id} 
              className="relative p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-500/10 dark:bg-red-950/20 backdrop-blur-md shadow-xl flex gap-3 overflow-hidden animate-pulse border-t-4 border-t-red-600 dark:border-t-red-500"
            >
              <div className="absolute inset-0 bg-red-600/5 pointer-events-none animate-ping duration-1000" />
              
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center animate-bounce">
                <BellRing size={20} />
              </div>
              
              <div className="flex-1 min-w-0 z-10">
                <h6 className="text-[14px] font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wide">
                  {pager.title} (Acil Çağrı)
                </h6>
                <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                  {pager.message}
                </p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-medium">
                  {new Date(pager.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              
              <div className="flex-shrink-0 flex items-start z-10">
                <button 
                  onClick={() => markAsRead(pager.id)}
                  className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
                >
                  Halledildi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddPatientModal isOpen={isAddPatientModalOpen} onClose={closeAddPatientModal} />
      <AppointmentModal 
        isOpen={isAddAppointmentModalOpen} 
        onClose={closeAddAppointmentModal} 
        onSave={async () => closeAddAppointmentModal()}
        doctors={doctors.map(d => ({ id: d.id, name: `Dt. ${d.firstName} ${d.lastName}` }))}
        patients={patients} 
      />
      <Modal isOpen={isAddPaymentModalOpen} onClose={closeAddPaymentModal} title="Hızlı Ödeme" size="md" footer={<button onClick={closeAddPaymentModal} className="px-5 py-2 bg-metronic-primary text-white rounded-lg">Kapat</button>}>
        <div className="p-4 text-center">Ödeme Modulü Gelecek</div>
      </Modal>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative w-72 bg-slate-900 h-full p-4 flex flex-col">
             <div className="flex justify-between items-center mb-8"><Image src="/logo.png" alt="Pulpax Logo" width={200} height={51} className="h-6 w-auto object-contain" /><button onClick={() => setIsMobileMenuOpen(false)}><X className="text-white"/></button></div>
             <ul className="space-y-2">
               {navItems.map(item => <li key={item.name} className="text-slate-400 font-bold">{item.name}</li>)}
             </ul>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
