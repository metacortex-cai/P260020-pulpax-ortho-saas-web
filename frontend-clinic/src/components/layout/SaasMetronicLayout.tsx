'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import ChatPanel from './ChatPanel';
import NotificationPanel from './NotificationPanel';
import Modal from '../ui/Modal';
import { 
  LayoutDashboard, 
  Building2,
  Settings, 
  ChevronRight,
  Menu,
  MessageSquare,
  Bell,
  ChevronDown,
  CreditCard,
  UserCircle,
  Stethoscope,
  LogOut,
  Moon,
  Sun,
  Maximize,
  Minimize,
  User as UserIcon,
  ShieldAlert,
  Database,
  Globe
} from 'lucide-react';

import { useI18nStore } from '../../store/i18nStore';

interface Props {
  children: ReactNode;
  title?: string;
  breadcrumbs?: string[];
  headerAction?: ReactNode;
  infoTooltip?: ReactNode;
}

export default function SaasMetronicLayout({ children, title = '', breadcrumbs = [], headerAction, infoTooltip }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { locale, setLocale } = useI18nStore();
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

  useEffect(() => {
    const saved = localStorage.getItem('pulpax-dark-mode');
    if (saved === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard load-on-mount pattern (reads persisted preference from localStorage)
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

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
    try {
      // API call to logout
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      router.push('/login');
    }
  };

  const toggleMenu = (name: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const navItems = [
    { name: locale === 'tr' ? 'SaaS Paneli' : 'SaaS Dashboard', path: '/saas/dashboard', icon: LayoutDashboard },
    { name: locale === 'tr' ? 'Klinik Yönetimi' : 'Clinic Management', path: '/saas/clinics', icon: Building2 },
    { name: locale === 'tr' ? 'Sistem Yöneticileri' : 'System Administrators', path: '/saas/admins', icon: UserCircle },
    { name: locale === 'tr' ? 'Finans & Faturalar' : 'Billing & Invoices', path: '/saas/billing', icon: CreditCard },
    { name: locale === 'tr' ? 'Sistem Tanımları' : 'System Definitions', icon: Database, subItems: [
      { name: locale === 'tr' ? 'Ana Tedaviler (Master)' : 'Master Treatments', path: '/saas/treatments' },
      { name: locale === 'tr' ? 'Platform Ayarları' : 'Platform Settings', path: '/saas/settings' }
    ]},
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
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/20 transition-all duration-300">
              <ShieldAlert size={24} className="text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ShieldAlert size={28} className="text-violet-500" />
              <span className="text-white font-black text-xl tracking-tight">SaaS Admin</span>
            </div>
          )}
        </div>

        {/* SABİT ÜST MENÜ (Anasayfa) */}
        <div className={`flex-shrink-0 pt-4 pb-2 border-b border-white/5 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <Link 
            href="/saas/dashboard"
            title={isCollapsed ? 'SaaS Dashboard' : undefined}
            className={`flex items-center gap-3 py-2.5 rounded-lg transition-colors ${
              pathname === '/saas/dashboard'
                ? 'bg-slate-800 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            } ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
          >
            <LayoutDashboard size={20} className={`flex-shrink-0 ${pathname === '/saas/dashboard' ? 'text-violet-500' : 'text-slate-400'}`} />
            {!isCollapsed && <span className="font-medium text-[13px] whitespace-nowrap">Dashboard</span>}
          </Link>
        </div>

        {/* SCROLL EDİLEBİLİR ORTA ALAN (Diğer Menüler) */}
        <div className="flex-1 flex flex-col overflow-y-auto py-2 overflow-x-hidden custom-scrollbar">
          <ul className={`flex flex-col gap-1 pb-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            {navItems.filter(item => item.name !== 'SaaS Dashboard').map((item) => {
              const isSubActive = item.subItems?.some(sub => pathname.startsWith(sub.path));
              const isActive = item.path ? pathname.startsWith(item.path) : isSubActive;
              const isOpen = openMenus[item.name];

              return (
                <li key={item.name}>
                  {item.path ? (
                    <Link 
                      href={item.path}
                      title={isCollapsed ? item.name : undefined}
                      className={`flex items-center gap-3 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-slate-800 text-white' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      } ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
                    >
                      <item.icon size={20} className={`flex-shrink-0 ${isActive ? 'text-violet-500' : 'text-slate-400'}`} />
                      {!isCollapsed && <span className="font-medium text-[13px] whitespace-nowrap">{item.name}</span>}
                    </Link>
                  ) : (
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
                          <item.icon size={20} className={`flex-shrink-0 ${(isActive || isOpen) ? 'text-violet-500' : 'text-slate-400'}`} />
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
                                <div className={`w-1 h-1 rounded-full ${isSubItemActive ? 'bg-violet-500' : 'bg-slate-600'}`}></div>
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
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-8 h-8 flex items-center justify-center rounded-md bg-metronic-gray-100 dark:bg-white/5 text-metronic-gray-600 dark:text-slate-400 hover:bg-violet-100 dark:hover:bg-violet-500/10 hover:text-violet-600 transition-colors"
            >
              <Menu size={18} />
            </button>
            <span className="font-bold text-slate-800 dark:text-white ml-2">Platform Yönetimi</span>
          </div>

          {/* Sağ Araçlar */}
          <div className="flex items-center gap-2 md:gap-3">
            
            <button 
              onClick={toggleFullscreen}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                isFullscreen 
                  ? 'bg-violet-500/10 text-violet-500' 
                  : 'text-metronic-gray-500 dark:text-slate-400 hover:bg-metronic-gray-100 dark:hover:bg-white/5 hover:text-violet-500'
              }`}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>

            {/* Dil Seçeneği (Language Switcher) */}
            <div className="relative" ref={langRef}>
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  isLangOpen 
                    ? 'bg-violet-600/10 text-violet-600' 
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-violet-600'
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
                        ? 'bg-violet-600/10 text-violet-600' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    Türkçe
                    {locale === 'tr' && <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setLocale('en'); setIsLangOpen(false); }}
                    className={`flex items-center justify-between w-full px-3 py-2 text-[12.5px] font-semibold rounded-md transition-colors ${
                      locale === 'en' 
                        ? 'bg-violet-600/10 text-violet-600' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    English
                    {locale === 'en' && <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>}
                  </button>
                </div>
              )}
            </div>
            
            {/* Profil Avatarı & Dropdown */}
            <div className="relative" ref={profileRef}>
              <div 
                className={`w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center cursor-pointer ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1c1f2e] active:scale-90 hover:shadow-md transition-all duration-200 overflow-hidden ${
                  isProfileOpen ? 'ring-violet-500' : 'ring-violet-400'
                }`}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <span className={`font-bold text-[15px] ${isProfileOpen ? 'text-violet-600' : 'text-violet-500'}`}>
                  {user?.firstName?.charAt(0) || 'S'}
                </span>
              </div>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div 
                  className="absolute right-0 top-full mt-2.5 w-[280px] bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-100 dark:border-white/10 overflow-hidden z-50 shadow-lg"
                  style={{ animation: 'profileDropIn 0.2s ease-out' }}
                >
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center ring-2 ring-violet-500 flex-shrink-0">
                        <span className="text-violet-500 font-bold text-lg">
                          {user?.firstName?.charAt(0) || 'S'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h6 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {user?.firstName || 'SaaS'} {user?.lastName || 'Yöneticisi'}
                          </h6>
                        </div>
                        <span className="text-[10px] font-bold text-violet-600 bg-violet-600/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {user?.role || 'SAAS_ADMIN'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dark Mode Section */}
                  <div className="px-2 pt-2 pb-2">
                    <button
                      onClick={toggleDarkMode}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:text-violet-600 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-all duration-150 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 group-hover:bg-violet-500/10 flex items-center justify-center transition-colors">
                          {isDarkMode ? (
                            <Sun size={16} className="text-amber-500" />
                          ) : (
                            <Moon size={16} className="text-slate-500 group-hover:text-violet-600 transition-colors" />
                          )}
                        </div>
                        Koyu Mod
                      </div>
                      <div className={`w-10 h-[22px] rounded-full relative transition-colors duration-300 ${
                        isDarkMode ? 'bg-violet-600' : 'bg-slate-200 dark:bg-white/10'
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
              <li className="text-metronic-gray-500 dark:text-slate-400 hover:text-violet-600 cursor-pointer transition-colors">SaaS</li>
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-metronic-gray-400 dark:text-slate-500 text-[10px]">●</span>
                  <span className={`${index === breadcrumbs.length - 1 ? 'text-metronic-dark dark:text-white font-medium' : 'text-metronic-gray-500 dark:text-slate-400 hover:text-violet-600 cursor-pointer transition-colors'}`}>
                    {crumb}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          
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

    </div>
  );
}
