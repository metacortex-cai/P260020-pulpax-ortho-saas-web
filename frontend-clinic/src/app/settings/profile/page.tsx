'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import InfoTooltip from '../../../components/ui/InfoTooltip';
import { EmployeeService, Commission } from '../../../lib/services/employee.service';
import { UserService, Session } from '../../../lib/services/user.service';
import {
  User, Shield, Save, CheckCircle2, Lock, Monitor, Mail, Phone,
  Clock, Eye, EyeOff, Smartphone, DollarSign, Wallet, Percent,
  TrendingUp, Search, Calendar
} from 'lucide-react';

const AVATAR_COLORS = [
  'bg-blue-500 text-white',
  'bg-emerald-500 text-white',
  'bg-purple-500 text-white',
  'bg-rose-500 text-white',
  'bg-amber-500 text-white',
  'bg-indigo-500 text-white',
];

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const { addToast } = useToastStore();
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'commissions'>('personal');

  // Feedback States
  const [savedPersonal, setSavedPersonal] = useState(false);
  const [savedSecurity, setSavedSecurity] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Avatar State
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

  // Sessions & Commissions from API
  const [sessions, setSessions] = useState<Session[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingCommissions, setLoadingCommissions] = useState(false);

  // Hekim / Doktor rol kontrolü
  const isDoctor = user ? (
    user.role === 'DOCTOR' ||
    user.role === 'SUPERADMIN' ||
    user.role === 'ADMIN'
  ) : false;

  // Commission filter
  const [commissionSearch, setCommissionSearch] = useState('');
  const [commissionStatus, setCommissionStatus] = useState<'all' | 'Ödendi' | 'Ödenecek'>('all');

  const filteredCommissions = commissions.filter(item => {
    const matchesSearch = item.patientName.toLowerCase().includes(commissionSearch.toLowerCase()) ||
                          item.treatmentName.toLowerCase().includes(commissionSearch.toLowerCase());
    const matchesStatus = commissionStatus === 'all' || item.status === commissionStatus;
    return matchesSearch && matchesStatus;
  });

  const totalGross = filteredCommissions.reduce((sum, item) => sum + item.grossAmount, 0);
  const totalLab = filteredCommissions.reduce((sum, item) => sum + item.labCost, 0);
  const totalNet = filteredCommissions.reduce((sum, item) => sum + item.netAmount, 0);
  const totalCommission = filteredCommissions.reduce((sum, item) => sum + item.commission, 0);

  const formatCurrency = (val: number) => val.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';

  // Form State - Personal Info
  const [personalForm, setPersonalForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    role: '',
    tcNo: '',
    address: '',
    workHours: '',
    bio: '',
  });

  // Form State - Security
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [twoFactor, setTwoFactor] = useState({
    email: true,
    sms: false
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Initialise from authStore
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load of form/session/commission data on mount / user-id change, standard fetch-on-mount pattern
    setPersonalForm(prev => ({
      ...prev,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      title: user.role || '',
      role: user.role || '',
    }));

    const charCodeSum = (user.firstName || 'D').charCodeAt(0) + (user.lastName || 'K').charCodeAt(0);
    setSelectedColor(AVATAR_COLORS[charCodeSum % AVATAR_COLORS.length]);

    // Fetch extended employee profile (phone, T.C. Kimlik No, vb.) — hesap bir personel
    // (İK) kaydına bağlı değilse (örn. saf Admin/Resepsiyon) sessizce atlanır.
    EmployeeService.findOne(user.id)
      .then(emp => {
        setPersonalForm(prev => ({
          ...prev,
          phone: emp.phone || '',
          tcNo: emp.nationalId || '',
        }));
      })
      .catch(() => {
        // Non-critical; authStore data is already shown
      });

    // Fetch active sessions
    setLoadingSessions(true);
    UserService.getSessions()
      .then(setSessions)
      .catch(() => addToast({ type: 'warning', title: 'Uyarı', message: 'Aktif oturumlar yüklenemedi.' }))
      .finally(() => setLoadingSessions(false));

    // Fetch commissions if doctor
    if (isDoctor) {
      setLoadingCommissions(true);
      EmployeeService.getCommissions(user.id)
        .then(setCommissions)
        .catch(() => addToast({ type: 'warning', title: 'Uyarı', message: 'Prim bilgileri yüklenemedi.' }))
        .finally(() => setLoadingCommissions(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally scoped to user?.id only: re-running on every `user` object change (e.g. right after handleSavePersonal calls updateUser) would clobber in-progress form edits with stale server data; addToast/router are stable references from their hooks/stores and isDoctor is derived purely from user, so all four are safe to omit here
  }, [user?.id]);

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Zayıf', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score, label: 'Zayıf', color: 'bg-metronic-danger' };
    if (score <= 4) return { score, label: 'Orta', color: 'bg-amber-500' };
    return { score, label: 'Güçlü', color: 'bg-metronic-success' };
  };

  const strength = calculatePasswordStrength(securityForm.newPassword);

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingPersonal(true);
    try {
      await EmployeeService.update(user.id, {
        firstName: personalForm.firstName,
        lastName: personalForm.lastName,
        email: personalForm.email,
        phone: personalForm.phone,
        nationalId: personalForm.tcNo,
      });
      updateUser({
        firstName: personalForm.firstName,
        lastName: personalForm.lastName,
        email: personalForm.email,
      });
      setSavedPersonal(true);
      setTimeout(() => setSavedPersonal(false), 3000);
      addToast({ type: 'success', title: 'Profil Güncellendi', message: 'Kişisel bilgileriniz başarıyla kaydedildi.' });
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Profil güncellenemedi. Lütfen tekrar deneyin.' });
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      addToast({ type: 'error', title: 'Hata', message: 'Yeni şifreler uyuşmuyor!' });
      return;
    }
    setSavingPassword(true);
    try {
      await UserService.changePassword(securityForm.currentPassword, securityForm.newPassword);
      setSavedSecurity(true);
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSavedSecurity(false), 3000);
      addToast({ type: 'success', title: 'Şifre Güncellendi', message: 'Şifreniz başarıyla değiştirildi.' });
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Şifre güncellenemedi. Mevcut şifrenizi kontrol edin.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await UserService.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      addToast({ type: 'success', title: 'Oturum Sonlandırıldı', message: 'Cihaz güvenli bir şekilde çıkış yaptı.' });
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Oturum sonlandırılamadı.' });
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await UserService.revokeAllOtherSessions();
      setSessions(prev => prev.filter(s => s.current));
      addToast({ type: 'success', title: 'Oturumlar Kapatıldı', message: 'Şu an kullandığınız oturum hariç tüm oturumlar sonlandırıldı.' });
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Oturumlar sonlandırılamadı.' });
    }
  };

  if (!user) return null;

  return (
    <MetronicLayout
      title="Kullanıcı Profilim"
      breadcrumbs={['Ayarlar', 'Profilim']}
      infoTooltip={
        <InfoTooltip
          title="Kişisel Profil Ayarları"
          description="Kişisel bilgilerinizi düzenleyebilir, şifrenizi güncelleyebilir, hesap güvenliğinizi kontrol edebilir ve sistemdeki hareket özetinizi takip edebilirsiniz."
        />
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ─── SOL SÜTUN: PROFİL KARTI ─── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-xl shadow-sm overflow-hidden p-6 text-center">

            {/* Avatar */}
            <div className="relative w-28 h-28 mx-auto mb-4 overflow-hidden rounded-2xl shadow-md border-4 border-slate-50 dark:border-[#24283c]">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic backend-hosted avatar URL (arbitrary origin/env), not a static asset next/image can optimize
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center font-bold text-3xl select-none ${selectedColor}`}>
                  {personalForm.firstName.charAt(0)}{personalForm.lastName.charAt(0)}
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight flex items-center justify-center gap-1.5">
              {personalForm.firstName} {personalForm.lastName}
            </h3>
            <p className="text-[13px] font-semibold text-slate-500 mt-0.5">{personalForm.title}</p>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-metronic-primary-light text-metronic-primary dark:bg-metronic-primary/10 text-xs font-bold rounded-full mt-3 border border-metronic-primary/20">
              <Shield size={12} /> {personalForm.role}
            </span>

            <div className="border-t border-slate-100 dark:border-white/5 mt-6 pt-5 space-y-3 text-left">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 text-[13px]">
                <Mail size={16} className="text-slate-400" />
                <span className="truncate no-capitalize">{personalForm.email}</span>
              </div>
              {personalForm.phone && (
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 text-[13px]">
                  <Phone size={16} className="text-slate-400" />
                  <span>{personalForm.phone}</span>
                </div>
              )}
              {personalForm.workHours && (
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 text-[13px]">
                  <Clock size={16} className="text-slate-400" />
                  <span>Mesai: {personalForm.workHours}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── SAĞ SÜTUN: SEKME YAPISI ─── */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Sekme Seçim Çubuğu */}
          <div className="flex items-center border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#1c1f2e] p-2 rounded-xl border shadow-sm gap-2">
            {[
              { id: 'personal', label: 'Kişisel Bilgiler', icon: User },
              { id: 'security', label: 'Güvenlik & Şifre', icon: Lock },
              ...(isDoctor ? [{ id: 'commissions', label: 'Primlerim', icon: DollarSign }] : []),
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                    isActive
                      ? 'bg-metronic-primary text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-metronic-primary'
                  }`}
                >
                  <TabIcon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sekme İçerikleri */}
          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-xl shadow-sm p-6 min-h-[480px]">

            {/* 1. KİŞİSEL BİLGİLER */}
            {activeTab === 'personal' && (
              <form onSubmit={handleSavePersonal} className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                  <div>
                    <h4 className="text-base font-bold text-slate-800 dark:text-white">Kişisel Bilgilerim</h4>
                    <p className="text-[12px] text-slate-400 mt-0.5">Sistem genelinde görüntülenecek olan kişisel bilgilerinizi güncelleyin.</p>
                  </div>
                  {savedPersonal && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-metronic-success-light text-metronic-success dark:bg-metronic-success/10 text-xs font-bold rounded-lg animate-bounce border border-metronic-success/20">
                      <CheckCircle2 size={13} /> Değişiklikler Kaydedildi!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ad</label>
                    <input
                      required
                      type="text"
                      value={personalForm.firstName}
                      onChange={e => setPersonalForm({ ...personalForm, firstName: e.target.value })}
                      className="m-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Soyad</label>
                    <input
                      required
                      type="text"
                      value={personalForm.lastName}
                      onChange={e => setPersonalForm({ ...personalForm, lastName: e.target.value })}
                      className="m-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">E-posta Adresi</label>
                    <input
                      required
                      type="email"
                      value={personalForm.email}
                      onChange={e => setPersonalForm({ ...personalForm, email: e.target.value })}
                      className="m-input bg-slate-50/50 dark:bg-white/[0.02]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Telefon</label>
                    <input
                      type="text"
                      value={personalForm.phone}
                      onChange={e => setPersonalForm({ ...personalForm, phone: e.target.value })}
                      className="m-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unvan / Görev</label>
                    <input
                      type="text"
                      value={personalForm.title}
                      onChange={e => setPersonalForm({ ...personalForm, title: e.target.value })}
                      className="m-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">T.C. Kimlik No</label>
                    <input
                      type="text"
                      value={personalForm.tcNo}
                      onChange={e => setPersonalForm({ ...personalForm, tcNo: e.target.value })}
                      className="m-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mesai Saatleri</label>
                    <input
                      type="text"
                      value={personalForm.workHours}
                      onChange={e => setPersonalForm({ ...personalForm, workHours: e.target.value })}
                      className="m-input"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Adres</label>
                  <textarea
                    rows={2}
                    value={personalForm.address}
                    onChange={e => setPersonalForm({ ...personalForm, address: e.target.value })}
                    className="m-input py-2 resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kısa Biyografi (Hakkımda)</label>
                  <textarea
                    rows={3}
                    value={personalForm.bio}
                    onChange={e => setPersonalForm({ ...personalForm, bio: e.target.value })}
                    className="m-input py-2 resize-none"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="submit"
                    disabled={savingPersonal}
                    className="flex items-center gap-2 px-6 py-2.5 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors active:scale-95 disabled:opacity-70"
                  >
                    {savingPersonal ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {savingPersonal ? 'Kaydediliyor...' : 'Profili Güncelle'}
                  </button>
                </div>
              </form>
            )}

            {/* 2. GÜVENLİK SEKME */}
            {activeTab === 'security' && (
              <div className="space-y-8">

                {/* Şifre Değiştirme Formu */}
                <form onSubmit={handleSaveSecurity} className="space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                    <div>
                      <h4 className="text-base font-bold text-slate-800 dark:text-white">Şifre Değiştir</h4>
                      <p className="text-[12px] text-slate-400 mt-0.5">Düzenli şifre güncellemeleri, hesap güvenliğiniz için kritik öneme sahiptir.</p>
                    </div>
                    {savedSecurity && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-metronic-success-light text-metronic-success dark:bg-metronic-success/10 text-xs font-bold rounded-lg animate-bounce border border-metronic-success/20">
                        <CheckCircle2 size={13} /> Şifre Başarıyla Güncellendi!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Mevcut Şifre */}
                    <div className="flex flex-col gap-1.5 relative">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mevcut Şifre</label>
                      <div className="relative">
                        <input
                          required
                          type={showPassword.current ? 'text' : 'password'}
                          value={securityForm.currentPassword}
                          onChange={e => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                          className="m-input pr-10"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Yeni Şifre */}
                    <div className="flex flex-col gap-1.5 relative">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Yeni Şifre</label>
                      <div className="relative">
                        <input
                          required
                          type={showPassword.new ? 'text' : 'password'}
                          value={securityForm.newPassword}
                          onChange={e => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                          className="m-input pr-10"
                          placeholder="Yeni şifreniz"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Şifre Tekrar */}
                    <div className="flex flex-col gap-1.5 relative">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Yeni Şifre Tekrar</label>
                      <div className="relative">
                        <input
                          required
                          type={showPassword.confirm ? 'text' : 'password'}
                          value={securityForm.confirmPassword}
                          onChange={e => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                          className="m-input pr-10"
                          placeholder="Yeni şifre tekrarı"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Şifre Güç Göstergesi */}
                  {securityForm.newPassword && (
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-lg border border-slate-200/50 dark:border-white/5 animate-fadeIn">
                      <div className="flex-1">
                        <div className="flex justify-between items-center text-[11px] font-bold mb-1">
                          <span className="text-slate-400">Şifre Gücü</span>
                          <span className={`${strength.score <= 2 ? 'text-metronic-danger' : strength.score <= 4 ? 'text-amber-500' : 'text-metronic-success'}`}>{strength.label}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden flex gap-1">
                          {[1, 2, 3, 4, 5].map(step => (
                            <div
                              key={step}
                              className={`h-full flex-1 rounded-full transition-colors duration-300 ${
                                step <= strength.score ? strength.color : 'bg-slate-200 dark:bg-white/5'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 max-w-[300px] leading-snug">
                        Güvenli bir şifre en az 10 karakter olmalı, büyük-küçük harf, rakam ve özel karakter içermelidir.
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="flex items-center gap-2 px-6 py-2.5 bg-metronic-primary hover:bg-blue-600 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors active:scale-95 disabled:opacity-70"
                    >
                      {savingPassword ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Lock size={16} />
                      )}
                      {savingPassword ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                    </button>
                  </div>
                </form>

                {/* İki Aşamalı Doğrulama (2FA) */}
                <div className="border-t border-slate-100 dark:border-white/5 pt-6 space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-slate-800 dark:text-white">İki Aşamalı Doğrulama (2FA)</h4>
                    <p className="text-[12px] text-slate-400 mt-0.5">Giriş denemelerinde ek bir güvenlik katmanı ekleyerek hesabınızı koruyun.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 border border-slate-200/60 dark:border-white/5 rounded-xl bg-slate-50/50 dark:bg-[#1a1d2b]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><Mail size={18} /></div>
                        <div>
                          <span className="text-[13px] font-bold text-slate-800 dark:text-white block">E-Posta Kodu</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Giriş yaparken e-postanıza tek kullanımlık şifre gönderilir.</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setTwoFactor({ ...twoFactor, email: !twoFactor.email })}
                        className={`w-10 h-[22px] rounded-full relative transition-colors duration-300 ${twoFactor.email ? 'bg-metronic-primary' : 'bg-slate-200 dark:bg-white/10'}`}
                      >
                        <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${twoFactor.email ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-slate-200/60 dark:border-white/5 rounded-xl bg-slate-50/50 dark:bg-[#1a1d2b]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><Smartphone size={18} /></div>
                        <div>
                          <span className="text-[13px] font-bold text-slate-800 dark:text-white block">SMS Onay Kodu</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">Kayıtlı cep telefonunuza doğrulama mesajı gönderilir.</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setTwoFactor({ ...twoFactor, sms: !twoFactor.sms })}
                        className={`w-10 h-[22px] rounded-full relative transition-colors duration-300 ${twoFactor.sms ? 'bg-metronic-primary' : 'bg-slate-200 dark:bg-white/10'}`}
                      >
                        <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${twoFactor.sms ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Aktif Oturumlar */}
                <div className="border-t border-slate-100 dark:border-white/5 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-800 dark:text-white">Aktif Oturumlar</h4>
                      <p className="text-[12px] text-slate-400 mt-0.5">Şu anda hesabınızın açık olduğu tarayıcılar ve cihazlar listesi.</p>
                    </div>
                    <button
                      onClick={handleRevokeAllSessions}
                      className="px-3 py-1.5 text-xs font-bold text-metronic-danger bg-metronic-danger-light dark:bg-metronic-danger/10 hover:bg-metronic-danger hover:text-white border border-metronic-danger/10 rounded-lg transition-all"
                    >
                      Diğer Tüm Oturumları Sonlandır
                    </button>
                  </div>

                  {loadingSessions ? (
                    <div className="py-6 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-metronic-primary border-t-transparent rounded-full animate-spin" />
                      Oturumlar yükleniyor...
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-sm">Aktif oturum bulunamadı.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-slate-200/80 dark:border-white/5 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-white/[0.02]">
                            <th className="py-2.5 px-3">Cihaz & Tarayıcı</th>
                            <th className="py-2.5 px-3">IP Adresi</th>
                            <th className="py-2.5 px-3">Konum</th>
                            <th className="py-2.5 px-3">Son Aktivite</th>
                            <th className="py-2.5 px-3 text-right">Eylem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                          {sessions.map(session => (
                            <tr key={session.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                              <td className="py-3 px-3 flex items-center gap-2.5">
                                <Monitor size={15} className="text-slate-400" />
                                <span className="font-bold">{session.device}</span>
                                {session.current && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-metronic-success-light text-metronic-success dark:bg-metronic-success/15 rounded-full">Bu Cihaz</span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-mono text-xs">{session.ip}</td>
                              <td className="py-3 px-3">{session.location}</td>
                              <td className="py-3 px-3 text-slate-500">{session.date}</td>
                              <td className="py-3 px-3 text-right">
                                {!session.current && (
                                  <button
                                    onClick={() => handleRevokeSession(session.id)}
                                    className="text-xs font-bold text-slate-400 hover:text-metronic-danger"
                                  >
                                    Bağlantıyı Kes
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. PRİMLERİM SEKME */}
            {activeTab === 'commissions' && isDoctor && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                  <div>
                    <h4 className="text-base font-bold text-slate-800 dark:text-white">Prim & Hakedişlerim</h4>
                    <p className="text-[12px] text-slate-400 mt-0.5">Hasta ve tedavi bazlı prim kazançlarınızı detaylı olarak inceleyin.</p>
                  </div>
                </div>

                {loadingCommissions ? (
                  <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-metronic-primary border-t-transparent rounded-full animate-spin" />
                    Prim bilgileri yükleniyor...
                  </div>
                ) : commissions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">Henüz prim kaydı bulunmamaktadır.</div>
                ) : (
                  <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Brüt Ciro', value: formatCurrency(totalGross), icon: <DollarSign size={18} />, color: 'text-metronic-primary', bg: 'bg-metronic-primary-light dark:bg-metronic-primary/10' },
                        { label: 'Lab Maliyeti (-)', value: formatCurrency(totalLab), icon: <Wallet size={18} />, color: 'text-metronic-danger', bg: 'bg-red-50 dark:bg-red-500/10' },
                        { label: 'Net Ciro', value: formatCurrency(totalNet), icon: <TrendingUp size={18} />, color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-50 dark:bg-white/5' },
                        { label: 'Net Primim', value: formatCurrency(totalCommission), icon: <Percent size={18} />, color: 'text-metronic-success', bg: 'bg-metronic-success-light dark:bg-metronic-success/10' },
                      ].map((stat, i) => (
                        <div key={i} className="bg-slate-50/50 dark:bg-white/[0.01] rounded-xl border border-slate-200/60 dark:border-white/5 p-4 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bg} ${stat.color}`}>
                              {stat.icon}
                            </div>
                          </div>
                          <h4 className="text-base font-black text-slate-800 dark:text-white mt-1 leading-none">{stat.value}</h4>
                        </div>
                      ))}
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                          type="text"
                          placeholder="Hasta adı veya tedavi ara..."
                          value={commissionSearch}
                          onChange={(e) => setCommissionSearch(e.target.value)}
                          className="m-input pl-9 pr-4 py-2 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {[
                          { id: 'all', label: 'Tümü' },
                          { id: 'Ödendi', label: 'Ödendi' },
                          { id: 'Ödenecek', label: 'Ödenecek' },
                        ].map(btn => (
                          <button
                            key={btn.id}
                            type="button"
                            onClick={() => setCommissionStatus(btn.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                              commissionStatus === btn.id
                                ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Details Table */}
                    <div className="overflow-x-auto border border-slate-200/60 dark:border-white/5 rounded-xl">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-white/[0.02] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 dark:border-white/5">
                            <th className="px-4 py-3">Hasta Bilgisi</th>
                            <th className="px-4 py-3">Tarih</th>
                            <th className="px-4 py-3">Tedavi Adı</th>
                            <th className="px-4 py-3 text-right">Brüt Tutar</th>
                            <th className="px-4 py-3 text-right">Lab Maliyeti</th>
                            <th className="px-4 py-3 text-right">Net Tutar</th>
                            <th className="px-4 py-3 text-center">Prim %</th>
                            <th className="px-4 py-3 text-right">Prim Tutarı</th>
                            <th className="px-4 py-3 text-center">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[12px] font-medium text-slate-700 dark:text-slate-300">
                          {filteredCommissions.length > 0 ? (
                            filteredCommissions.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                <td className="px-4 py-3">
                                  <span className="font-bold text-slate-800 dark:text-white block">{item.patientName}</span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">{item.id}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                  <span className="flex items-center gap-1.5">
                                    <Calendar size={13} className="text-slate-400" />
                                    {item.date}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                                  {item.treatmentName}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                                  {formatCurrency(item.grossAmount)}
                                </td>
                                <td className="px-4 py-3 text-right text-metronic-danger">
                                  {item.labCost > 0 ? `-${formatCurrency(item.labCost)}` : '0,00 ₺'}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200 font-semibold">
                                  {formatCurrency(item.netAmount)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-md text-[10px] font-black">
                                    %{item.rate}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-metronic-success font-black">
                                  {formatCurrency(item.commission)}
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                    item.status === 'Ödendi'
                                      ? 'bg-metronic-success-light text-metronic-success dark:bg-metronic-success/10'
                                      : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                                Eşleşen kayıt bulunamadı.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </MetronicLayout>
  );
}
