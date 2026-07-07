'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
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
import { useRealtime } from '../../hooks/useRealtime';
import AppointmentModal from '../calendar/AppointmentModal';
import CommandPalette from './CommandPalette';
import Modal from '../ui/Modal';
import { PatientService } from '../../lib/services/patient.service';
import { DoctorService, Doctor } from '../../lib/services/doctor.service';
import { Patient } from '../../lib/types';
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
  Tags,
  X,
  UserPlus,
  LogOut,
  Moon,
  Sun,
  Zap,
  User as UserIcon,
  UserCircle,
  Maximize,
  Minimize,
  Save
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
  const { fetchNotifications, addNotification, unreadCount } = useNotificationStore();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Real Data for Modals
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

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
        const [ptsRes, docs] = await Promise.all([
          PatientService.findAll({ limit: 200, sortBy: 'firstName', sortDir: 'asc' }),
          DoctorService.findAll()
        ]);
        setPatients(ptsRes.data);
        // Sadece Doktor rolündekileri filtrele
        setDoctors(docs.filter(d => d.isDoctor && d.isActive));
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
  }, [user, fetchNotifications]);

  useRealtime({
    onNotificationReceived: (notif) => {
      addNotification(notif);
    }
  });

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setIsLangOpen(false);
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
    { name: t('patientOperations'), icon: Users, subItems: [ { name: t('patients'), path: '/patients' } ]},
    { name: t('appointment'), icon: Calendar, subItems: [ { name: t('appointmentCalendar'), path: '/appointments' }, { name: t('appointmentRequests'), path: '/appointments/requests' } ]},
    { name: t('finance'), icon: CreditCard, subItems: [ { name: t('patientCurrent'), path: '/finance/patient-current' }, { name: t('vaultsAndBanks'), path: '/finance/vaults-banks' } ]},
    { name: t('tariffOperations'), icon: Tags, subItems: [ { name: t('tariffs'), path: '/tariffs' }, { name: t('treatments'), path: '/treatments' } ]},
    { name: t('humanResources'), icon: UserCircle, subItems: [ { name: t('staff'), path: '/hr/staff' }, { name: t('leaves'), path: '/hr/leaves' } ]},
    { name: t('supportCenter'), icon: LifeBuoy, subItems: [ { name: t('supportTickets'), path: '/support/tickets' }, { name: t('helpCenter'), path: '/support/faq' } ]},
    { name: t('reports'), icon: BarChart3, subItems: [ { name: t('appointmentCalendar'), path: '/reports/appointments' }, { name: t('collectionsAndPaymentsReport'), path: '/reports/collections' }, { name: t('patientAcquisitionReport'), path: '/reports/acquisition' }, { name: t('treatmentStatisticsReport'), path: '/reports/treatments' }, { name: t('debtorListReport'), path: '/reports/debtors' }, { name: t('cancelledAppointmentAnalysis'), path: '/reports/cancellations' }, { name: t('physicianPerformanceReport'), path: '/reports/doctor-performance' } ]},
    { name: t('settings'), icon: Settings, subItems: [ { name: t('users'), path: '/settings/users' }, { name: t('roles'), path: '/settings/roles' }, { name: t('clinicInfo'), path: '/settings/clinic' }, { name: t('clinicBranches'), path: '/settings/branches' }, { name: t('smsTemplates'), path: '/settings/sms' }, { name: t('documentTemplates'), path: '/settings/templates' }, { name: t('notificationSettings'), path: '/settings/notifications' }, { name: t('financeSettings'), path: '/settings/finance' }, { name: t('auditLogs'), path: '/settings/audit-logs' }, { name: t('dataEntry'), path: '/settings/data-entry' }, { name: t('integrations'), path: '/settings/integrations' }, { name: t('patientCategories'), path: '/settings/patient-categories' } ]}
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
