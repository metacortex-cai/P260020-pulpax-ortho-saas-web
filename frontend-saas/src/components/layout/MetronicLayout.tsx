'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useI18nStore } from '../../store/i18nStore';
import ChatPanel from './ChatPanel';
import NotificationPanel from './NotificationPanel';
import AddPatientModal from '../patients/AddPatientModal';
import AppointmentModal from '../calendar/AppointmentModal';
import Modal from '../ui/Modal';
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
  Save
} from 'lucide-react';

interface Props {
  children: ReactNode;
  title?: string;
  breadcrumbs?: string[];
  headerAction?: ReactNode; // Sayfa başlığının sağına özel buton/menü eklemek için
  infoTooltip?: ReactNode; // Sayfa başlığının yanına info butonu eklemek için
}

export default function MetronicLayout({ children, title = '', breadcrumbs = [], headerAction, infoTooltip }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { locale, setLocale, t } = useI18nStore();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  // Quick Action States
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ patientName: '', amount: '', method: 'NAKİT' });


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

  const { fetchNotifications, setConnected, addNotification, unreadCount } = useNotificationStore();

  useEffect(() => {
    if (!user) return;
    
    // Fetch initial unread
    fetchNotifications();

    // Connect to SSE
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6010/api/v1';
    const eventSource = new EventSource(`${apiUrl}/notifications/stream`, {
      withCredentials: true,
    });

    eventSource.onopen = () => setConnected(true);
    
    eventSource.onmessage = (event) => {
      try {
        const notif = JSON.parse(event.data);
        addNotification(notif);
      } catch (err) {
        console.error('SSE parsing error', err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [user, fetchNotifications, setConnected, addNotification]);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  // Click outside to close language dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };
    if (isLangOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLangOpen]);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('pulpax-dark-mode', String(next));
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = async () => {
    // try {
    //   await api.post('/auth/logout');
    // } catch (error) {
    //   console.error('Logout error:', error);
    // } finally {
      logout();
      router.push('/login');
    // }
  };

  const toggleMenu = (name: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const navItems = [
    { name: t('home'), path: '/dashboard', icon: LayoutDashboard },
    { name: t('protocolBook'), path: '/protocol', icon: Book },
    { name: t('patientOperations'), icon: Users, subItems: [
      { name: t('patients'), path: '/patients' }
    ]},
    { name: t('appointment'), icon: Calendar, subItems: [
      { name: t('appointmentCalendar'), path: '/appointments' },
      { name: t('appointmentRequests'), path: '/appointments/requests' }
    ]},
    { name: t('finance'), icon: CreditCard, subItems: [
      { name: t('patientCurrent'), path: '/finance/patient-current' },
      { name: t('vaultsAndBanks'), path: '/finance/vaults-banks' }
    ]},
    { name: t('tariffOperations'), icon: Tags, subItems: [
      { name: t('tariffs'), path: '/tariffs' },
      { name: t('treatments'), path: '/treatments' }
    ]},
    { name: t('stockWarehouse'), icon: Package, subItems: [
      { name: t('inventories'), path: '/inventory/status' },
      { name: t('fixtures'), path: '/inventory/fixtures' },
      { name: t('stockMovements'), path: '/inventory/movements' },
      { name: t('materials'), path: '/inventory/materials' }
    ]},
    { name: t('laboratory'), icon: FlaskConical, subItems: [
      { name: t('labMovements'), path: '/lab/movements' },
      { name: t('laboratories'), path: '/lab/labs' },
      { name: t('procedures'), path: '/lab/procedures' },
      { name: t('priceTariffs'), path: '/lab/tariffs' }
    ]},
    { name: t('humanResources'), icon: UserCircle, subItems: [
      { name: t('staff'), path: '/hr/staff' },
      { name: t('leaves'), path: '/hr/leaves' }
    ]},
    { name: t('supportCenter'), icon: LifeBuoy, subItems: [
      { name: t('supportTickets'), path: '/support/tickets' },
      { name: t('helpCenter'), path: '/support/faq' }
    ]},
    { name: t('reports'), icon: BarChart3, subItems: [
      { name: t('appointmentCalendar'), path: '/reports/appointments' },
      { name: 'Hekim Hakediş Raporu', path: '/reports/commissions' },
      { name: 'Tahsilat ve Ödeme Raporu', path: '/reports/collections' },
      { name: 'Laboratuvar Raporu', path: '/reports/labs' },
      { name: 'Hasta Kazanım Raporu', path: '/reports/acquisition' },
      { name: 'Stok Envanter Raporu', path: '/reports/inventory' },
      { name: 'Tedavi İstatistikleri Raporu', path: '/reports/treatments' },
      { name: 'Borçlu Listesi Raporu', path: '/reports/debtors' },
      { name: 'İptal Randevu Analizi', path: '/reports/cancellations' },
      { name: 'Hekim Performans Raporu', path: '/reports/doctor-performance' }
    ]},
    { name: t('settings'), icon: Settings, subItems: [
      { name: t('users'), path: '/settings/users' },
      { name: t('roles'), path: '/settings/roles' },
      { name: t('clinicInfo'), path: '/settings/clinic' },
      { name: t('smsTemplates'), path: '/settings/sms' },
      { name: t('notificationSettings'), path: '/settings/notifications' },
      { name: t('financeSettings'), path: '/settings/finance' },
      { name: t('auditLogs'), path: '/settings/audit-logs' },
      { name: t('dataEntry'), path: '/settings/data-entry' },
      { name: t('integrations'), path: '/settings/integrations' }
    ]}
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-metronic-body dark:bg-[#0f1117]">
      {/* 1. ASIDE (Sol Menü) */}
      <aside 
        className={`bg-slate-900 flex-shrink-0 flex flex-col transition-all duration-300 hidden md:flex ${
          isCollapsed ? 'w-[80px]' : 'w-64'
        }`}
      >
        {/* Brand / Logo Area */}
        <div className={`h-[70px] flex items-center bg-slate-900 border-b border-white/5 flex-shrink-0 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
          {isCollapsed ? (
            <div className="w-10 h-10 rounded-xl bg-metronic-primary flex items-center justify-center shadow-lg shadow-metronic-primary/20 transition-all duration-300">
              <Stethoscope size={24} className="text-white" />
            </div>
          ) : (
            <Image src="/logo.png" alt="Pulpax Logo" width={200} height={51} className="h-8 w-auto object-contain" />
          )}
        </div>

        {/* SABİT ÜST MENÜ (Anasayfa) */}
        <div className={`flex-shrink-0 pt-4 pb-2 border-b border-white/5 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <Link 
            href="/dashboard"
            title={isCollapsed ? 'Anasayfa' : undefined}
            className={`flex items-center gap-3 py-2.5 rounded-lg transition-colors ${
              pathname === '/dashboard' || pathname === '/'
                ? 'bg-slate-800 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            } ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
          >
            <LayoutDashboard size={20} className={`flex-shrink-0 ${pathname === '/dashboard' || pathname === '/' ? 'text-metronic-primary' : 'text-slate-400'}`} />
            {!isCollapsed && <span className="font-medium text-[13px] whitespace-nowrap">Anasayfa</span>}
          </Link>
        </div>

        {/* SCROLL EDİLEBİLİR ORTA ALAN (Diğer Menüler) */}
        <div className="flex-1 flex flex-col overflow-y-auto py-2 overflow-x-hidden custom-scrollbar">
          <ul className={`flex flex-col gap-1 pb-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            {navItems.filter(item => item.name !== 'Anasayfa' && item.name !== 'Ayarlar' && item.name !== 'Raporlar' && item.name !== 'Destek Merkezi').map((item) => {
              const isSubActive = item.subItems?.some(sub => pathname.startsWith(sub.path));
              const isActive = item.path ? pathname.startsWith(item.path) : isSubActive;
              const isOpen = openMenus[item.name];

              return (
                <li key={item.name}>
                  {item.path ? (
                    // Düz Link (Alt menüsü yoksa)
                    <Link 
                      href={item.path}
                      title={isCollapsed ? item.name : undefined}
                      className={`flex items-center gap-3 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-slate-800 text-white' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      } ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
                    >
                      <item.icon size={20} className={`flex-shrink-0 ${isActive ? 'text-metronic-primary' : 'text-slate-400'}`} />
                      {!isCollapsed && <span className="font-medium text-[13px] whitespace-nowrap">{item.name}</span>}
                    </Link>
                  ) : (
                    // Alt menüsü olan Açılır Menü (Accordion)
                    <div>
                      <button
                        onClick={() => toggleMenu(item.name)}
                        title={isCollapsed ? item.name : undefined}
                        className={`w-full flex items-center py-2.5 rounded-lg transition-colors ${
                          isActive || isOpen
                            ? 'bg-slate-800 text-white' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        } ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={20} className={`flex-shrink-0 ${(isActive || isOpen) ? 'text-metronic-primary' : 'text-slate-400'}`} />
                          {!isCollapsed && <span className="font-medium text-[13px] whitespace-nowrap">{item.name}</span>}
                        </div>
                        {!isCollapsed && (
                          <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                      
                      {/* Sub Items */}
                      {(!isCollapsed && isOpen && item.subItems) && (
                        <div className="mt-1 flex flex-col gap-0.5 overflow-hidden" style={{ animation: 'slideDown 0.2s ease-out' }}>
                          {item.subItems.map(sub => {
                            const isSubItemActive = pathname.startsWith(sub.path);
                            return (
                              <Link 
                                key={sub.path}
                                href={sub.path}
                                className={`flex items-center gap-2 py-2 pl-[44px] pr-4 rounded-lg transition-colors text-[12.5px] font-medium ${
                                  isSubItemActive 
                                    ? 'text-white bg-slate-800/50' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                }`}
                              >
                                <div className={`w-1 h-1 rounded-full ${isSubItemActive ? 'bg-metronic-primary' : 'bg-slate-600'}`}></div>
                                {sub.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* SABİT ALT MENÜ (Ayarlar) */}
        <div className={`flex-shrink-0 pt-2 pb-4 border-t border-white/5 bg-slate-900 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {navItems.filter(item => item.name === 'Ayarlar').map((item) => {
            const isSubActive = item.subItems?.some(sub => pathname.startsWith(sub.path));
            const isActive = isSubActive;
            const isOpen = openMenus[item.name];

            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleMenu(item.name)}
                  title={isCollapsed ? item.name : undefined}
                  className={`w-full flex items-center py-2.5 rounded-lg transition-colors ${
                    isActive || isOpen
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  } ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className={`flex-shrink-0 ${(isActive || isOpen) ? 'text-metronic-primary' : 'text-slate-400'}`} />
                    {!isCollapsed && <span className="font-medium text-[13px] whitespace-nowrap">{item.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>
                
                {/* Sub Items (Ayarlar) - Yukarı doğru açılması daha iyi olabilir ama şimdilik standart aşağı doğru */}
                {(!isCollapsed && isOpen && item.subItems) && (
                  <div className="mt-1 flex flex-col gap-0.5 overflow-hidden" style={{ animation: 'slideDown 0.2s ease-out' }}>
                    {item.subItems.map(sub => {
                      const isSubItemActive = pathname.startsWith(sub.path);
                      return (
                        <Link 
                          key={sub.path}
                          href={sub.path}
                          className={`flex items-center gap-2 py-2 pl-[44px] pr-4 rounded-lg transition-colors text-[12.5px] font-medium ${
                            isSubItemActive 
                              ? 'text-white bg-slate-800/50' 
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                          }`}
                        >
                          <div className={`w-1 h-1 rounded-full ${isSubItemActive ? 'bg-metronic-primary' : 'bg-slate-600'}`}></div>
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes profileDropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* 2. WRAPPER (Sağ İçerik Alanı) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER (Üst Bar) */}
        <header className="h-[70px] bg-white dark:bg-[#1c1f2e] flex items-center justify-between px-8 flex-shrink-0 relative z-50 shadow-[0_0_40px_0_rgba(82,63,105,0.05)] dark:shadow-[0_0_40px_0_rgba(0,0,0,0.2)] dark:border-b dark:border-white/5">
          
          {/* Sol Araçlar (Toggle Button) */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-metronic-gray-100 dark:bg-white/5 text-metronic-gray-600 dark:text-slate-400 hover:bg-metronic-primary-light dark:hover:bg-metronic-primary/10 hover:text-metronic-primary transition-colors"
            >
              <Menu size={18} />
            </button>
          </div>

          {/* Orta Araçlar (Üst Menü - Kullanıcıdan gelecek yapıya göre şekillenecek) */}
          <div className="hidden lg:flex flex-1 items-center px-8 z-50">
            <ul className="flex items-center gap-2 h-full">
              
              {/* 1. DESTEK MENÜSÜ (Normal Dropdown) */}
              <li className="group relative h-full flex items-center">
                <button className="flex items-center gap-1.5 text-[13px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-metronic-primary transition-colors py-4 px-3 border-b-2 border-transparent group-hover:border-metronic-primary">
                  <LifeBuoy size={16} />
                  Destek
                  <ChevronDown size={14} className="opacity-50 group-hover:rotate-180 transition-transform duration-300" />
                </button>
                
                {/* Dropdown Content */}
                <div className="absolute z-50 top-full left-0 mt-0 w-48 bg-white dark:bg-[#1c1f2e] border border-slate-100 dark:border-white/10 rounded-b-xl shadow-lg dark:shadow-[0_15px_50px_0_rgba(0,0,0,0.3)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-left -translate-y-2 group-hover:translate-y-0">
                  <div className="p-2 flex flex-col gap-1">
                    <Link href="/support/faq" className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                      <HelpCircle size={15} className="text-slate-400" /> Sıkça Sorulan Sorular
                    </Link>
                    <Link href="/support/tickets" className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                      <Ticket size={15} className="text-slate-400" /> Destek Taleplerim
                    </Link>
                  </div>
                </div>
              </li>

              {/* 2. RAPORLAR MENÜSÜ (Mega Menu - 2 Sütunlu) */}
              <li className="group relative h-full flex items-center">
                <button className="flex items-center gap-1.5 text-[13px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-metronic-primary transition-colors py-4 px-3 border-b-2 border-transparent group-hover:border-metronic-primary">
                  <PieChart size={16} />
                  Raporlar
                  <ChevronDown size={14} className="opacity-50 group-hover:rotate-180 transition-transform duration-300" />
                </button>
                
                {/* Mega Menu Content (Geniş Panel) */}
                <div className="absolute z-50 top-full left-0 mt-0 w-[600px] bg-white dark:bg-[#1c1f2e] border border-slate-100 dark:border-white/10 rounded-b-xl shadow-[0_15px_50px_0_rgba(82,63,105,0.15)] dark:shadow-[0_15px_50px_0_rgba(0,0,0,0.4)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-left -translate-y-2 group-hover:translate-y-0">
                  <div className="flex p-5">
                    
                    {/* Sütun 1: Finans ve Randevu Raporları */}
                    <div className="flex-1 pr-4 border-r border-slate-100">
                      <h6 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Finans & Randevu</h6>
                      <ul className="flex flex-col gap-0.5">
                        <Link href="/reports/appointments" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Calendar size={14} className="text-blue-500" /> Randevu Raporu
                        </Link>
                        <Link href="/reports/collections" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Wallet size={14} className="text-emerald-500" /> Tahsilat ve Ödeme Raporu
                        </Link>
                        <Link href="/reports/labs" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Activity size={14} className="text-teal-500" /> Laboratuvar Raporu
                        </Link>
                        <Link href="/reports/acquisition" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Users size={14} className="text-orange-500" /> Hasta Kazanım Raporu
                        </Link>
                        <Link href="/reports/cancellations" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Activity size={14} className="text-red-500" /> İptal Randevu Analizi
                        </Link>
                      </ul>
                    </div>

                    {/* Sütun 2: Stok, Klinik ve İK Raporları */}
                    <div className="flex-1 pl-4">
                      <h6 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Klinik, Stok & İK</h6>
                      <ul className="flex flex-col gap-0.5">
                        <Link href="/reports/stock-items" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Package size={14} className="text-orange-500" /> Stoktaki Ürünler Raporu
                        </Link>
                        <Link href="/reports/inventory" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Layers size={14} className="text-slate-500" /> Envanter Raporu
                        </Link>
                        <Link href="/reports/stock-in" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <TrendingUp size={14} className="text-green-500" /> Stok Giriş Raporu
                        </Link>
                        <Link href="/reports/stock-out" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <TrendingUp size={14} className="text-red-500 transform rotate-180" /> Stok Çıkış Raporu
                        </Link>
                        <div className="my-1 border-t border-slate-100/50"></div>
                        <Link href="/reports/lab" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Activity size={14} className="text-blue-500" /> Laboratuvar İşlem Raporu
                        </Link>
                        <Link href="/reports/treatments" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Stethoscope size={14} className="text-rose-500" /> Tedavi Raporu
                        </Link>
                        <div className="my-1 border-t border-slate-100/50"></div>
                        <Link href="/reports/doctor-performance" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Activity size={14} className="text-violet-500" /> Hekim Performans Raporu
                        </Link>
                        <Link href="/reports/commissions" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <Wallet size={14} className="text-indigo-500" /> Hakediş Raporu
                        </Link>
                        <Link href="/reports/collections" className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <CreditCard size={14} className="text-pink-500" /> Tahsilat Raporu
                        </Link>
                      </ul>
                    </div>

                  </div>
                  
                  {/* Mega Menu Footer */}
                  <div className="bg-slate-50/50 p-3 border-t border-slate-100 rounded-b-xl text-center">
                    <span className="text-[11px] font-medium text-slate-500">Tüm raporlar PDF ve Excel olarak dışa aktarılabilir.</span>
                  </div>
                </div>
              </li>

              {/* 3. HIZLI İŞLEMLER MENÜSÜ */}
              <li className="group relative h-full flex items-center ml-2">
                <button className="flex items-center gap-1.5 text-[13px] font-bold text-metronic-primary bg-metronic-primary/10 hover:bg-metronic-primary/20 dark:bg-metronic-primary/15 dark:hover:bg-metronic-primary/25 transition-colors py-2 px-4 rounded-lg">
                  <Zap size={16} />
                  Hızlı İşlemler
                  <ChevronDown size={14} className="opacity-70 group-hover:rotate-180 transition-transform duration-300" />
                </button>
                
                {/* Dropdown Content */}
                <div className="absolute top-full left-0 mt-0 w-56 bg-white dark:bg-[#1c1f2e] border border-slate-100 dark:border-white/10 rounded-b-xl shadow-lg dark:shadow-[0_15px_50px_0_rgba(0,0,0,0.3)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-left -translate-y-2 group-hover:translate-y-0 z-50">
                  <div className="p-2 flex flex-col gap-1">
                    <button onClick={() => setIsAddPatientOpen(true)} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                      <UserPlus size={15} className="text-blue-500" /> Hasta Ekle
                    </button>
                    <button onClick={() => setIsAddAppointmentOpen(true)} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                      <Calendar size={15} className="text-metronic-primary" /> Randevu Oluştur
                    </button>
                    <button onClick={() => setIsAddPaymentOpen(true)} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                      <CreditCard size={15} className="text-green-500" /> Ödeme Al
                    </button>
                    <div className="h-[1px] bg-slate-100 dark:bg-white/5 my-1 mx-2" />
                    <Link href="/hr/staff" className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors text-left">
                      <Users size={15} className="text-amber-500" /> Personel Yönetimi
                    </Link>
                  </div>
                </div>
              </li>
              
            </ul>
          </div>

          {/* Sağ Araçlar (Tam Ekran, Mesaj, Bildirim, Profil) */}
          <div className="flex items-center gap-2 md:gap-3">
            
            {/* Dil Seçeneği (Language Switcher) */}
            <div className="relative" ref={langRef}>
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  isLangOpen 
                    ? 'bg-metronic-primary/10 text-metronic-primary' 
                    : 'text-metronic-gray-500 dark:text-slate-400 hover:bg-metronic-gray-100 dark:hover:bg-white/5 hover:text-metronic-primary'
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

            {/* Tam Ekran Toggle */}
            <button 
              onClick={toggleFullscreen}
              title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                isFullscreen 
                  ? 'bg-metronic-primary/10 text-metronic-primary' 
                  : 'text-metronic-gray-500 dark:text-slate-400 hover:bg-metronic-gray-100 dark:hover:bg-white/5 hover:text-metronic-primary'
              }`}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            
            {/* Sohbet / Mesaj */}
            <div className="relative">
              <button
                onClick={() => setIsChatOpen(o => !o)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors relative ${
                  isChatOpen
                    ? 'bg-metronic-primary/10 text-metronic-primary'
                    : 'text-metronic-gray-500 dark:text-slate-400 hover:bg-metronic-gray-100 dark:hover:bg-white/5 hover:text-metronic-primary'
                }`}
              >
                <MessageSquare size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full border border-white dark:border-[#1c1f2e]"></span>
              </button>
              <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
            </div>

            {/* Bildirim Merkezi */}
            <div className="relative mr-2">
              <button
                onClick={() => setIsNotifOpen(o => !o)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors relative ${
                  isNotifOpen
                    ? 'bg-metronic-primary/10 text-metronic-primary'
                    : 'text-metronic-gray-500 dark:text-slate-400 hover:bg-metronic-gray-100 dark:hover:bg-white/5 hover:text-metronic-primary'
                }`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-metronic-danger text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white dark:border-[#1c1f2e]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
            </div>
            
            {/* Profil Avatarı & Dropdown */}
            <div className="relative" ref={profileRef}>
              <div 
                className={`w-9 h-9 rounded-lg bg-metronic-success-light dark:bg-metronic-success/15 flex items-center justify-center cursor-pointer ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1c1f2e] active:scale-90 hover:shadow-md transition-all duration-200 overflow-hidden ${
                  isProfileOpen ? 'ring-metronic-primary' : 'ring-metronic-success'
                }`}
                title={`${user?.firstName} ${user?.lastName} - ${user?.role}`}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic backend-hosted avatar URL (arbitrary origin/env), not a static asset next/image can optimize
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className={`font-bold text-[15px] ${isProfileOpen ? 'text-metronic-primary' : 'text-metronic-success'}`}>
                    {user?.firstName?.charAt(0) || 'D'}
                  </span>
                )}
              </div>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div 
                  className="absolute right-0 top-full mt-2.5 w-[280px] bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-100 dark:border-white/10 overflow-hidden z-50"
                  style={{ 
                    boxShadow: isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.02)',
                    animation: 'profileDropIn 0.2s ease-out'
                  }}
                >
                  {/* User Info Section */}
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-metronic-success/20 to-metronic-success/5 flex items-center justify-center ring-2 ring-metronic-success ring-offset-2 ring-offset-white dark:ring-offset-[#1c1f2e] flex-shrink-0 overflow-hidden">
                        {user?.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- dynamic backend-hosted avatar URL (arbitrary origin/env), not a static asset next/image can optimize
                          <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-metronic-success font-bold text-lg">
                            {user?.firstName?.charAt(0) || 'D'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h6 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {user?.firstName || 'Demo'} {user?.lastName || 'Kullanıcı'}
                          </h6>
                          <span className="text-[10px] font-bold text-metronic-primary bg-metronic-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                            {user?.role || 'Admin'}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-400 mt-0.5 truncate">{user?.email || 'demo@pulpax.com'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2 px-2">
                    {/* Profilim */}
                    <Link
                      href="/settings/profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-all duration-150 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-metronic-primary/10 flex items-center justify-center transition-colors">
                        <UserIcon size={16} className="text-slate-500 group-hover:text-metronic-primary transition-colors" />
                      </div>
                      Profilim
                    </Link>
                    <Link
                      href="/settings/notifications"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-all duration-150 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-metronic-primary/10 flex items-center justify-center transition-colors">
                        <Bell size={16} className="text-slate-500 group-hover:text-metronic-primary transition-colors" />
                      </div>
                      Bildirim Ayarlarım
                    </Link>
                  </div>

                  {/* Dark Mode Section */}
                  <div className="px-2 pb-2">
                    <button
                      onClick={toggleDarkMode}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-all duration-150 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 group-hover:bg-metronic-primary/10 flex items-center justify-center transition-colors">
                          {isDarkMode ? (
                            <Sun size={16} className="text-amber-500" />
                          ) : (
                            <Moon size={16} className="text-slate-500 group-hover:text-metronic-primary transition-colors" />
                          )}
                        </div>
                        Koyu Mod
                      </div>
                      {/* Toggle Switch */}
                      <div className={`w-10 h-[22px] rounded-full relative transition-colors duration-300 ${
                        isDarkMode ? 'bg-metronic-primary' : 'bg-slate-200 dark:bg-white/10'
                      }`}>
                        <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                          isDarkMode ? 'translate-x-[22px]' : 'translate-x-[3px]'
                        }`} />
                      </div>
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-white/5">
                    <button
                      onClick={handleLogout}
                      className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 hover:bg-metronic-danger/10 hover:text-metronic-danger rounded-lg transition-all duration-200"
                    >
                      <LogOut size={15} />
                      Çıkış
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* SUBHEADER (Sayfa Başlığı ve Breadcrumb) */}
        <div className="bg-transparent py-4 px-8 flex items-center justify-between flex-shrink-0 dark:border-b dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <h5 className="text-metronic-dark dark:text-white text-lg font-medium m-0">{title}</h5>
              {infoTooltip}
            </div>
            
            <div className="w-[1px] h-[20px] bg-metronic-gray-300 dark:bg-white/10"></div>
            
            <ul className="flex items-center gap-2 text-[13px] font-medium">
              <li className="text-metronic-gray-500 dark:text-slate-400 hover:text-metronic-primary cursor-pointer transition-colors">Ana Sayfa</li>
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-metronic-gray-400 dark:text-slate-500 text-[10px]">●</span>
                  <span className={`${index === breadcrumbs.length - 1 ? 'text-metronic-dark dark:text-white font-medium' : 'text-metronic-gray-500 dark:text-slate-400 hover:text-metronic-primary cursor-pointer transition-colors'}`}>
                    {crumb}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Sağa Hizalı Sayfaya Özel Aksiyon Alanı (Örn: Widget Ekle Butonu) */}
          {headerAction && (
            <div className="flex items-center">
              {headerAction}
            </div>
          )}
        </div>

        {/* MAIN CONTENT (Ana Çalışma Alanı) */}
        <main className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
          {children}
        </main>
      </div>

      <AddPatientModal 
        isOpen={isAddPatientOpen} 
        onClose={() => setIsAddPatientOpen(false)} 
      />

      <AppointmentModal 
        isOpen={isAddAppointmentOpen} 
        onClose={() => setIsAddAppointmentOpen(false)} 
        onSave={(data) => {
          setIsAddAppointmentOpen(false);
        }}
        doctors={[]}
        leaves={{}}
      />

      <Modal 
        isOpen={isAddPaymentOpen} 
        onClose={() => setIsAddPaymentOpen(false)} 
        title="Hızlı Ödeme Tahsilatı" 
        size="md"
        footer={
          <>
            <button onClick={() => setIsAddPaymentOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button onClick={() => setIsAddPaymentOpen(false)} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors"><Save size={15} />Tahsil Et</button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Hasta Seçin</label>
            <input type="text" placeholder="Hasta adı veya Dosya No" className="m-input" value={paymentForm.patientName} onChange={e => setPaymentForm({...paymentForm, patientName: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Tutar (₺)</label>
              <input type="number" placeholder="0.00" className="m-input" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Ödeme Yöntemi</label>
              <select className="m-input" value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}>
                <option value="NAKİT">Nakit</option>
                <option value="KREDI_KARTI">Kredi Kartı</option>
                <option value="HAVALE">Banka Havalesi</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
