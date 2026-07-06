'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Modal from '../../../components/ui/Modal';
import { ClinicService, ClinicData } from '../../../lib/services/clinic.service';
import { UserService, User } from '../../../lib/services/user.service';
import { formatCurrency } from '../../../lib/utils/formatCurrency';
import {
  Building2, Phone, Mail, Globe, FileText, AlertCircle, CheckCircle2,
  Package, Zap, TrendingUp, Calendar, DollarSign, RefreshCw, Lock, Edit2, Save, X, Shield
} from 'lucide-react';

export default function ClinicInfoPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const router = useRouter();
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSupportAccessGranted, setIsSupportAccessGranted] = useState(false);
  const [accountOwnerEmail, setAccountOwnerEmail] = useState('');
  const [employees, setEmployees] = useState<User[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ClinicData['profile'] | null>(null);
  const [selectedSection, setSelectedSection] = useState<'profile' | 'contact' | 'license' | 'sms' | 'account'>('profile');
  const [detailModal, setDetailModal] = useState<{isOpen: boolean, section: string, data: any}>({isOpen: false, section: '', data: null});
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, type: string, data: any, title: string, message: string}>({
    isOpen: false, type: '', data: null, title: '', message: ''
  });

  const handleConfirmAction = async () => {
    const type = confirmModal.type;
    setConfirmModal({isOpen: false, type: '', data: null, title: '', message: ''});

    try {
      if (type === 'grantSupport') {
        await ClinicService.grantSupportAccess();
        setIsSupportAccessGranted(true);
        addToast({ type: 'success', title: 'Erişim İzni Verildi', message: 'Destek ekibi 7 gün boyunca verilerinize erişebilecek.' });
      } else if (type === 'revokeSupport') {
        await ClinicService.revokeSupportAccess();
        setIsSupportAccessGranted(false);
        addToast({ type: 'success', title: 'Erişim İzni Kaldırıldı', message: 'Destek ekibinin verilerinize erişimi kapatıldı.' });
      } else if (type === 'changeOwner') {
        await ClinicService.changeAccountOwner(confirmModal.data.userId);
        setAccountOwnerEmail(confirmModal.data.email);
        setDetailModal({isOpen: false, section: '', data: null});
        addToast({ type: 'success', title: 'Hesap Sahibi Değiştirildi', message: `Hesap sahibi ${confirmModal.data.email} olarak güncellendi.` });
      }
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'İşlem gerçekleştirilemedi.' });
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    Promise.all([
      ClinicService.getClinicInfo(),
      ClinicService.getAccountOwner(),
    ])
      .then(([data, owner]) => {
        setClinic(data);
        setFormData(data.profile);
        setAccountOwnerEmail(owner.email);
      })
      .catch(() => {
        addToast({ type: 'error', title: 'Hata', message: 'Klinik bilgileri yüklenemedi.' });
      })
      .finally(() => setLoading(false));

    // Hesap sahibi modalı için kullanıcı listesi (Admin devri gibi, İK personeli değil kullanıcı hesabı kavramı)
    UserService.findAll()
      .then(setEmployees)
      .catch(() => {/* non-critical */});
  }, [user, router, addToast]);

  const handleSave = async () => {
    if (!formData) return;
    setSaving(true);
    try {
      const updated = await ClinicService.updateProfile(formData);
      setClinic(prev => prev ? { ...prev, profile: updated } : prev);
      setIsEditing(false);
      addToast({ type: 'success', title: 'Kaydedildi', message: 'Klinik profili başarıyla güncellendi.' });
    } catch {
      addToast({ type: 'error', title: 'Hata', message: 'Klinik profili kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MetronicLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-slate-500">Yükleniyor...</div>
        </div>
      </MetronicLayout>
    );
  }

  const daysRemaining = (clinic?.license?.current?.daysRemaining ?? 0) || 0;
  const totalDays = clinic?.license?.current?.totalDays || 365;
  const progressPercent = (daysRemaining / totalDays) * 100;

  const getLicenseStatusColor = (days: number) => {
    if (days > 90) return 'text-emerald-600 dark:text-emerald-400';
    if (days > 30) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getLicenseStatusBg = (days: number) => {
    if (days > 90) return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
    if (days > 30) return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
    return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
  };

  const getSMSStatusBg = (status: string) => {
    return status === 'AKTİF' 
      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
      : 'bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20';
  };

  return (
    <MetronicLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f1219] p-6">
        <div className="max-w-7xl mx-auto">
          {/* PAGE HEADER */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Klinik Bilgileri</h1>
            <p className="text-slate-500 dark:text-slate-400">Klinik profilini, iletişim bilgilerini ve lisans yönetimini merkezi bir arayüzden yönetin</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* ─── LEFT SIDEBAR ─── */}
            <div className="lg:col-span-1 space-y-2">
              {[
                { id: 'profile', label: 'KLİNİK PROFİLİ', icon: Building2 },
                { id: 'contact', label: 'İLETİŞİM BİLGİLERİ', icon: Phone },
                { id: 'license', label: 'LİSANS BİLGİLERİ', icon: Lock },
                { id: 'sms', label: 'SMS PAKETLERI', icon: Zap },
                { id: 'account', label: 'HESAP VE GÜVENLİK', icon: Shield },
              ].map(item => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedSection(item.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      selectedSection === item.id
                        ? 'bg-metronic-primary text-white shadow-lg'
                        : 'bg-white dark:bg-[#1c1f2e] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <IconComponent size={18} />
                    <span className="text-sm font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ─── CENTER CONTENT AREA ─── */}
            <div className="lg:col-span-3 space-y-6">
              {/* KLİNİK PROFİLİ */}
              {selectedSection === 'profile' && (
                <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 size={24} className="text-metronic-primary" />
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Klinik Profili</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Temel klinik bilgileri ve detayları</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDetailModal({isOpen: true, section: 'profile', data: clinic?.profile})}
                      className="px-4 py-2 bg-metronic-primary text-white rounded-lg hover:bg-metronic-primary/90 transition-colors text-sm font-bold"
                    >
                      DETAYLARI AÇ
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Klinik Özeti */}
                    <div className="bg-gradient-to-r from-metronic-primary/5 to-metronic-primary/0 rounded-lg p-4 border border-metronic-primary/20">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-2">{clinic?.profile?.name}</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <div><span className="text-slate-500">Lisans No:</span> <span className="font-medium text-slate-900 dark:text-white">{clinic?.profile?.licenseNo}</span></div>
                        <div><span className="text-slate-500">Vergi No:</span> <span className="font-medium text-slate-900 dark:text-white">{clinic?.profile?.taxNo}</span></div>
                        <div><span className="text-slate-500">Kuruluş Tarihi:</span> <span className="font-medium text-slate-900 dark:text-white">{clinic?.profile?.foundingDate}</span></div>
                        <div><span className="text-slate-500">Başhekim:</span> <span className="font-medium text-slate-900 dark:text-white">{clinic?.profile?.principalDoctor}</span></div>
                      </div>
                    </div>

                    {/* İletişim Özeti */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Adres Bilgisi</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{clinic?.profile?.address}</p>
                      <p className="text-xs text-slate-500 mt-2">{clinic?.profile?.city}, {clinic?.profile?.district}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* İLETİŞİM BİLGİLERİ */}
              {selectedSection === 'contact' && (
                <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone size={24} className="text-blue-500" />
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">İletişim Bilgileri</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Klinik iletişim kanalları</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDetailModal({isOpen: true, section: 'contact', data: clinic?.contact})}
                      className="px-4 py-2 bg-metronic-primary text-white rounded-lg hover:bg-metronic-primary/90 transition-colors text-sm font-bold"
                    >
                      DETAYLARI AÇ
                    </button>
                  </div>

                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      {icon: Phone, label: 'ANA TELEFON', value: clinic?.contact?.mainPhone, color: 'text-metronic-primary'},
                      {icon: AlertCircle, label: 'ACİL TEL', value: clinic?.contact?.emergencyPhone, color: 'text-red-500'},
                      {icon: Mail, label: 'ANA E-MAİL', value: clinic?.contact?.email, color: 'text-emerald-500', noCap: true},
                      {icon: Globe, label: 'WEBSİTE', value: clinic?.contact?.website, color: 'text-purple-500'},
                    ].map((item, idx) => {
                      const IconComponent = item.icon;
                      return (
                        <div key={idx} className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <IconComponent size={16} className={item.color} />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.label}</span>
                          </div>
                          <p className={`text-sm font-bold text-slate-900 dark:text-white truncate ${item.noCap ? 'no-capitalize' : ''}`}>{item.value}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LİSANS BİLGİLERİ */}
              {selectedSection === 'license' && (
                <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lock size={24} className="text-emerald-600" />
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Lisans Bilgileri</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Aktif abonelik ve lisans durumu</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDetailModal({isOpen: true, section: 'license', data: clinic?.license})}
                      className="px-4 py-2 bg-metronic-primary text-white rounded-lg hover:bg-metronic-primary/90 transition-colors text-sm font-bold"
                    >
                      DETAYLARI AÇ
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Lisans Durumu Badge */}
                    <div className={`rounded-lg p-4 border ${(clinic?.license?.current?.daysRemaining ?? 0) > 90 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : (clinic?.license?.current?.daysRemaining ?? 0) > 30 ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{clinic?.license?.current?.packageName}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${(clinic?.license?.current?.daysRemaining ?? 0) > 90 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : (clinic?.license?.current?.daysRemaining ?? 0) > 30 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                          {(clinic?.license?.current?.daysRemaining ?? 0)} gün kaldı
                        </span>
                      </div>
                      <div className="h-2 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${(clinic?.license?.current?.daysRemaining ?? 0) > 90 ? 'bg-emerald-500' : (clinic?.license?.current?.daysRemaining ?? 0) > 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, ((clinic?.license?.current?.daysRemaining ?? 0) / 365) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Paket Bilgisi */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">BAŞLAMA TARİHİ</div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{clinic?.license?.current?.startDate}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">BİTİŞ TARİHİ</div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{clinic?.license?.current?.endDate}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SMS PAKETLERI */}
              {selectedSection === 'sms' && (
                <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap size={24} className="text-purple-600" />
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">SMS Paketleri</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Satın alınmış SMS paketleri</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDetailModal({isOpen: true, section: 'sms', data: clinic?.license?.smsPackages})}
                      className="px-4 py-2 bg-metronic-primary text-white rounded-lg hover:bg-metronic-primary/90 transition-colors text-sm font-bold"
                    >
                      DETAYLARI AÇ
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="space-y-3">
                      {clinic?.license?.smsPackages?.slice(0, 2).map((pkg: any) => (
                        <div key={pkg.id} className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">{pkg.packageName}</span>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${pkg.status === 'AKTİF' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                              {pkg.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
                            <span>{formatCurrency(pkg.usedMessages)} / {formatCurrency(pkg.totalMessages)}</span>
                            <span>{pkg.usagePercent.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 bg-white dark:bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${pkg.usagePercent < 50 ? 'bg-emerald-500' : pkg.usagePercent < 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${pkg.usagePercent}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* HESAP VE GÜVENLİK */}
              {selectedSection === 'account' && (
                <div className="space-y-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Hesap ve Güvenlik</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Hesap sahibi bilgileri ve destek ekibi erişim izinleri</p>
                  </div>

                  {/* Hesap Sahibi */}
                  <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col md:flex-row items-start md:items-center p-6 gap-6">
                    <div className="w-48 flex-shrink-0">
                      <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">HESAP SAHİBİ</h2>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Hesap sahibi olarak <span className="font-bold no-capitalize">{accountOwnerEmail}</span> adresi tanımlı. Abonelik bilgileri sadece hesap sahibi tarafından düzenlenebilir.
                      </p>
                      <button 
                        onClick={() => setDetailModal({isOpen: true, section: 'accountOwner', data: null})}
                        className="text-[13px] text-slate-600 dark:text-slate-400 hover:text-metronic-primary dark:hover:text-metronic-primary font-medium mt-1 underline decoration-slate-300 dark:decoration-slate-600 underline-offset-4 transition-colors"
                      >
                        Başka bir kullanıcıyı hesap sahibi olarak atayın
                      </button>
                    </div>
                  </div>

                  {/* Erişim İzni */}
                  <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col md:flex-row items-start md:items-center p-6 gap-6">
                    <div className="w-48 flex-shrink-0 flex items-center gap-2">
                      <Shield size={16} className="text-slate-400" />
                      <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ERİŞİM İZNİ</h2>
                    </div>
                    <div className="flex-1">
                      {isSupportAccessGranted ? (
                        <>
                          <div className="inline-block bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-sm font-semibold px-4 py-2.5 rounded-lg mb-4">
                            Destek ekibi verilerinizi görebiliyor.
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                            Eğer destek ekibi sorununuzu çözdüyse <strong className="font-bold text-slate-800 dark:text-slate-200">ERİŞİM İZNİNİ KALDIR</strong> butonuna tıklayarak verilerinize erişimi kapatabilirsiniz.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="inline-block bg-slate-100 dark:bg-[#262d3d] text-slate-600 dark:text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-lg mb-4">
                            Destek ekibinin firma verilerinize erişimi yok.
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                            Karşılaştığınız problemleri gidermek için destek ekibinin verilerinize erişmesi gerekebilir. <strong className="font-bold text-slate-800 dark:text-slate-200">ERİŞİM İZNİ VER</strong> butonuna tıklayarak destek ekibinin firma verilerinize erişmesine izin verebilirsiniz.
                          </p>
                        </>
                      )}
                      <p className="text-[13px] text-slate-500 dark:text-slate-500 mt-3">
                        Güvenliğiniz için erişim izniniz 7 gün sonra otomatik olarak kapatılır.
                      </p>
                    </div>
                    <div className="flex-shrink-0 mt-4 md:mt-0 md:ml-4">
                      {isSupportAccessGranted ? (
                        <button 
                          onClick={() => setConfirmModal({isOpen: true, type: 'revokeSupport', data: null, title: 'Erişim İznini Kaldır', message: 'Destek ekibinin klinik verilerinize olan erişim iznini kaldırmak istediğinize emin misiniz?'})}
                          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm"
                        >
                          ERİŞİM İZNİNİ KALDIR
                        </button>
                      ) : (
                        <button 
                          onClick={() => setConfirmModal({isOpen: true, type: 'grantSupport', data: null, title: 'Erişim İzni Ver', message: 'Sorunların çözümü için destek ekibine 7 günlük geçici erişim izni vermek istediğinize emin misiniz?'})}
                          className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm"
                        >
                          ERİŞİM İZNİ VER
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── DETAIL MODAL (XL) ─── */}
        <Modal isOpen={detailModal.isOpen} onClose={() => setDetailModal({isOpen: false, section: '', data: null})} size="xl" title="">
          <div className="max-h-[80vh] overflow-y-auto">
            {/* PROFILE DETAIL */}
            {detailModal.section === 'profile' && detailModal.data && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Klinik Profili Detayları</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Klinik Adı</label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{detailModal.data.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Lisans No</label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{detailModal.data.licenseNo}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Vergi No</label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{detailModal.data.taxNo}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Vergi Dairesi</label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{detailModal.data.taxOffice}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Kuruluş Tarihi</label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{detailModal.data.foundingDate}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Başhekim</label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{detailModal.data.principalDoctor}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Adres</label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mt-1 leading-relaxed">{detailModal.data.address}</p>
                </div>
              </div>
            )}

            {/* CONTACT DETAIL */}
            {detailModal.section === 'contact' && detailModal.data && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">İletişim Bilgileri Detayları</h3>
                {[
                  {label: 'Ana Telefon', value: detailModal.data.mainPhone, icon: Phone},
                  {label: 'Acil Telefon', value: detailModal.data.emergencyPhone, icon: AlertCircle},
                  {label: 'Fax', value: detailModal.data.fax, icon: FileText},
                  {label: 'Ana E-Mail', value: detailModal.data.email, icon: Mail, noCap: true},
                  {label: 'Destek E-Mail', value: detailModal.data.supportEmail, icon: Mail, noCap: true},
                  {label: 'Website', value: detailModal.data.website, icon: Globe},
                ].map((item, idx) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                      <IconComponent size={18} className="text-metronic-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.label}</div>
                        <p className={`text-sm font-medium text-slate-900 dark:text-white ${item.noCap ? 'no-capitalize' : ''}`}>{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* LICENSE DETAIL */}
            {detailModal.section === 'license' && detailModal.data && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Mevcut Lisans Detayları</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Paket Adı</label>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{detailModal.data.current.packageName}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Durum</label>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{detailModal.data.current.status}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Başlama</label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{detailModal.data.current.startDate}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Bitiş</label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{detailModal.data.current.endDate}</p>
                    </div>
                  </div>
                </div>

                {/* Modules */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Dahil Edilen Modüller</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {detailModal.data.current.modules.map((module: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-metronic-primary/10 text-metronic-primary rounded-lg text-xs font-medium border border-metronic-primary/20">
                        <CheckCircle2 size={14} />
                        {module}
                      </div>
                    ))}
                  </div>
                </div>

                {/* License History */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Lisans Geçmişi</h4>
                  <div className="space-y-2">
                    {detailModal.data.history.map((item: any) => (
                      <div key={item.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{item.packageName}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{item.startDate} - {item.endDate}</p>
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(item.price)} {item.currency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SMS DETAIL */}
            {detailModal.section === 'sms' && detailModal.data && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">SMS Paketleri Detayları</h3>
                <div className="space-y-3">
                  {detailModal.data.map((pkg: any) => (
                    <div key={pkg.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{pkg.packageName}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Satın Alındı: {pkg.purchaseDate} | Bitiş: {pkg.expiryDate}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${pkg.status === 'AKTİF' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                          {pkg.status}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                          <span>Kullanılan / Toplam</span>
                          <span className="font-medium">{formatCurrency(pkg.usedMessages)} / {formatCurrency(pkg.totalMessages)}</span>
                        </div>
                        <div className="h-2 bg-white dark:bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${pkg.usagePercent < 50 ? 'bg-emerald-500' : pkg.usagePercent < 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${pkg.usagePercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-1">
                          <span>Kalan: {formatCurrency(pkg.remainingMessages)}</span>
                          <span>{pkg.usagePercent.toFixed(1)}%</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Fiyat:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(pkg.price)} {pkg.currency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACCOUNT OWNER DETAIL */}
            {detailModal.section === 'accountOwner' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hesap Sahibini Değiştir</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Mevcut hesap sahibini sistemde tanımlı diğer kullanıcılarla değiştirebilirsiniz.</p>
                {employees.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">Kullanıcılar yükleniyor...</div>
                ) : (
                  <div className="space-y-3">
                    {employees.filter(emp => emp.isActive).map((emp) => {
                      const fullName = `${emp.firstName} ${emp.lastName}`;
                      const isCurrentOwner = accountOwnerEmail === emp.email;
                      return (
                        <div
                          key={emp.id}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                            isCurrentOwner
                              ? 'bg-metronic-primary/5 border-metronic-primary/30 dark:bg-metronic-primary/10 dark:border-metronic-primary/20'
                              : 'bg-white dark:bg-[#1c1f2e] border-slate-200 dark:border-white/5 hover:border-metronic-primary/30'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                              {emp.firstName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-sm">{fullName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="no-capitalize">{emp.email}</span> &bull; {emp.role}</p>
                            </div>
                          </div>
                          {isCurrentOwner ? (
                            <div className="flex items-center gap-2 px-3 py-1 bg-metronic-primary/10 text-metronic-primary rounded-full text-xs font-bold">
                              <CheckCircle2 size={14} />
                              MEVCUT
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmModal({
                                isOpen: true,
                                type: 'changeOwner',
                                data: { email: emp.email, userId: emp.id },
                                title: 'Hesap Sahibini Değiştir',
                                message: `Hesap sahibini ${fullName} (${emp.email}) olarak değiştirmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
                              })}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors"
                            >
                              SEÇ
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>

        {/* CONFIRMATION MODAL */}
        <Modal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({...confirmModal, isOpen: false})} size="md" title={confirmModal.title}>
          <div className="p-4">
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                confirmModal.type === 'revokeSupport' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
              }`}>
                <AlertCircle size={24} />
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium text-[15px] pt-1">{confirmModal.message}</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setConfirmModal({...confirmModal, isOpen: false})}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold text-sm rounded-lg transition-colors"
              >
                İptal
              </button>
              <button 
                onClick={handleConfirmAction}
                className={`px-5 py-2.5 text-white font-bold text-sm rounded-lg transition-colors ${
                  confirmModal.type === 'revokeSupport' ? 'bg-red-600 hover:bg-red-700' : 'bg-metronic-primary hover:bg-metronic-primary/90'
                }`}
              >
                Onayla
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </MetronicLayout>
  );
}

