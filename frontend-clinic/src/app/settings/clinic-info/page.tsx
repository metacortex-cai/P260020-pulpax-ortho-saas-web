'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import { ClinicService, ClinicData } from '../../../lib/services/clinic.service';
import { formatCurrency } from '../../../lib/utils/formatCurrency';
import {
  Building2, Phone, Mail, Globe, FileText, AlertCircle, CheckCircle2,
  Package, Zap, TrendingUp, Calendar, DollarSign, RefreshCw, Lock, Edit2, Save, Shield
} from 'lucide-react';

export default function ClinicInfoPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const router = useRouter();
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ClinicData['profile'] | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    ClinicService.getClinicInfo()
      .then((data) => {
        setClinic(data);
        setFormData(data.profile);
      })
      .catch(() => {
        addToast({ type: 'error', title: 'Hata', message: 'Klinik bilgileri yüklenemedi.' });
      })
      .finally(() => setLoading(false));
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

  if (!clinic) {
    return (
      <MetronicLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-slate-500">Klinik bilgileri bulunamadı.</div>
        </div>
      </MetronicLayout>
    );
  }

  const daysRemaining = clinic.license?.current?.daysRemaining || 0;
  const totalDays = clinic.license?.current?.totalDays || 365;
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
      <div className="space-y-6 p-6">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Klinik Bilgileri</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Klinik profili, iletişim bilgileri ve lisans yönetimi</p>
          </div>
          <button
            onClick={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-metronic-primary text-white rounded-lg hover:bg-metronic-primary/90 transition-colors disabled:opacity-70"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isEditing ? (
              <Save size={18} />
            ) : (
              <Edit2 size={18} />
            )}
            {saving ? 'Kaydediliyor...' : isEditing ? 'Kaydet' : 'Düzenle'}
          </button>
        </div>

        {/* ─── 1. KLİNİK PROFİLİ ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol: Ana Bilgiler */}
          <div className="lg:col-span-2 bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-metronic-primary/10 flex items-center justify-center text-metronic-primary">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Klinik Profili</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Temel klinik bilgileri</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Klinik Adı</label>
                <input
                  type="text"
                  value={formData?.name || ''}
                  onChange={(e) => setFormData(f => f ? { ...f, name: e.target.value } : f)}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#262d3d] text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-metronic-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Lisans No</label>
                  <input
                    type="text"
                    value={formData?.licenseNo || ''}
                    onChange={(e) => setFormData(f => f ? { ...f, licenseNo: e.target.value } : f)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#262d3d] text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-metronic-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Vergi No</label>
                  <input
                    type="text"
                    value={formData?.taxNo || ''}
                    onChange={(e) => setFormData(f => f ? { ...f, taxNo: e.target.value } : f)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#262d3d] text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-metronic-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={formData?.taxOffice || ''}
                    onChange={(e) => setFormData(f => f ? { ...f, taxOffice: e.target.value } : f)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#262d3d] text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-metronic-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Kuruluş Tarihi</label>
                  <input
                    type="text"
                    value={formData?.foundingDate || ''}
                    onChange={(e) => setFormData(f => f ? { ...f, foundingDate: e.target.value } : f)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#262d3d] text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-metronic-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Sorumlu/Başhekim</label>
                <input
                  type="text"
                  value={formData?.principalDoctor || ''}
                  onChange={(e) => setFormData(f => f ? { ...f, principalDoctor: e.target.value } : f)}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#262d3d] text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-metronic-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Adres</label>
                <textarea
                  value={formData?.address || ''}
                  onChange={(e) => setFormData(f => f ? { ...f, address: e.target.value } : f)}
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#262d3d] text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-metronic-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Şehir</label>
                  <input
                    type="text"
                    value={formData?.city || ''}
                    onChange={(e) => setFormData(f => f ? { ...f, city: e.target.value } : f)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#262d3d] text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-metronic-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">İlçe</label>
                  <input
                    type="text"
                    value={formData?.district || ''}
                    onChange={(e) => setFormData(f => f ? { ...f, district: e.target.value } : f)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#262d3d] text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-metronic-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Website</label>
                <input
                  type="text"
                  value={formData?.website || ''}
                  onChange={(e) => setFormData(f => f ? { ...f, website: e.target.value } : f)}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#262d3d] text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-metronic-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Sağ: Hızlı İstatistikler */}
          <div className="space-y-4">
            {/* Aktif Lisans Kartı */}
            <div className={`rounded-xl border p-4 ${getLicenseStatusBg(daysRemaining)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lock size={18} className={getLicenseStatusColor(daysRemaining)} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">LİSANS DURUMU</span>
                </div>
                {daysRemaining > 90 && <CheckCircle2 size={16} className="text-emerald-600" />}
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{daysRemaining} gün</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Son kullanma: {clinic.license?.current?.endDate}</p>

              <div className="h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    daysRemaining > 90 ? 'bg-emerald-500' :
                    daysRemaining > 30 ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                />
              </div>
            </div>

            {/* Paket Bilgisi */}
            <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package size={18} className="text-metronic-primary" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">AKTİF PAKET</span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">{clinic.license?.current?.packageName}</p>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Faturalama Döngüsü:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{clinic.license?.current?.billingCycle}</span>
                </div>
                <div className="flex justify-between">
                  <span>Aylık Ücret:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(clinic.license?.current?.price ?? 0)} {clinic.license?.current?.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sonraki Ödeme:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{clinic.license?.current?.endDate}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Otomatik Yenileme</span>
                <div className={`w-8 h-5 rounded-full flex items-center ${clinic.license?.current?.autoRenew ? 'bg-emerald-500 justify-end pr-1' : 'bg-slate-300 dark:bg-slate-600 justify-start pl-1'}`}>
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>

            {/* Kullanıcı Sayısı */}
            <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={18} className="text-amber-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">KULLANIMLARI</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="font-medium text-slate-900 dark:text-white">Kullanıcı Sayısı</span>
                    <span className="text-slate-600 dark:text-slate-400">{clinic.license?.current?.users}/{clinic.license?.current?.maxUsers}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-metronic-primary"
                      style={{ width: `${((clinic.license?.current?.users || 0) / (clinic.license?.current?.maxUsers || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 2. İLETİŞİM BİLGİLERİ ─── */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-metronic-primary/10 flex items-center justify-center text-metronic-primary">
              <Phone size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">İletişim Bilgileri</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Klinik iletişim kanalları</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Phone size={16} className="text-metronic-primary" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">ANA TELEFON</span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{clinic.contact?.mainPhone || '—'}</p>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">ACİL TELEFON</span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{clinic.contact?.emergencyPhone || '—'}</p>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">FAX</span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{clinic.contact?.fax || '—'}</p>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Mail size={16} className="text-emerald-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">ANA E-MAİL</span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white break-all no-capitalize">{clinic.contact?.email || '—'}</p>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Mail size={16} className="text-blue-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">DESTEK E-MAİL</span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white break-all no-capitalize">{clinic.contact?.supportEmail || '—'}</p>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Globe size={16} className="text-purple-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">WEBSİTE</span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{clinic.contact?.website || '—'}</p>
            </div>
          </div>
        </div>

        {/* ─── 3. LİSANS BİLGİLERİ ─── */}
        <div className="space-y-6">
          {/* Mevcut Lisans */}
          <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mevcut Lisans</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Aktif abonelik bilgisi</p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">PAKET ADI</div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{clinic.license?.current?.packageName}</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">BAŞLAMA TARİHİ</div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{clinic.license?.current?.startDate}</p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">SON KULLANMA TARİHİ</div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{clinic.license?.current?.endDate}</p>
              </div>
              <div className={`rounded-lg p-4 border ${getLicenseStatusBg(daysRemaining)}`}>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">KALAN GÜN</div>
                <p className={`text-lg font-bold ${getLicenseStatusColor(daysRemaining)}`}>{daysRemaining} gün</p>
              </div>
            </div>

            {/* Modüller */}
            {clinic.license?.current?.modules?.length > 0 && (
              <div className="px-6 pb-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Dahil Edilen Modüller</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {clinic.license.current.modules.map((module, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-metronic-primary/10 text-metronic-primary rounded-lg text-xs font-medium border border-metronic-primary/20">
                      <CheckCircle2 size={14} />
                      {module}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ödeme Bilgisi */}
            <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <DollarSign size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">AYLIK ÜCRETİ</div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(clinic.license?.current?.price ?? 0)} {clinic.license?.current?.currency}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">SON ÖDEME TARİHİ</div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{clinic.license?.current?.lastPaymentDate}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RefreshCw size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">ÖDEME YÖNTEMİ</div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{clinic.license?.current?.paymentMethod}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lisans Geçmişi */}
          {clinic.license?.history?.length > 0 && (
            <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lisans Geçmişi</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Önceki abonelik kayıtları</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Paket Adı</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Başlama Tarihi</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Bitiş Tarihi</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Durum</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Ücret</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Döngü</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clinic.license.history.map((item) => (
                      <tr key={item.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{item.packageName}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{item.startDate}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{item.endDate}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.price)} {item.currency}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{item.billingCycle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SMS Paketleri */}
          {clinic.license?.smsPackages?.length > 0 && (
            <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                  <Zap size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">SMS Paketleri</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Satın alınan SMS paketleri ve kullanım durumu</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Paket Adı</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Satın Alma Tarihi</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Toplam Mesaj</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Kullanılan</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Kalan</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Kullanım %</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Son Kullanma</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clinic.license.smsPackages.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{pkg.packageName}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{pkg.purchaseDate}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(pkg.totalMessages)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(pkg.usedMessages)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(pkg.remainingMessages)}</td>
                        <td className="px-6 py-4">
                          <div className="w-20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{pkg.usagePercent.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  pkg.usagePercent < 50 ? 'bg-emerald-500' :
                                  pkg.usagePercent < 80 ? 'bg-amber-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${pkg.usagePercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{pkg.expiryDate}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSMSStatusBg(pkg.status)} ${
                            pkg.status === 'AKTİF'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}>
                            {pkg.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── 4. HESAP VE GÜVENLİK ─── */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col md:flex-row items-start md:items-center p-6 gap-6">
            <div className="w-48 flex-shrink-0">
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">HESAP SAHİBİ</h2>
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Hesap sahibi olarak <span className="font-bold no-capitalize">{clinic.contact?.email}</span> adresi tanımlı. Abonelik bilgileri sadece hesap sahibi tarafından düzenlenebilir.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col md:flex-row items-start md:items-center p-6 gap-6">
            <div className="w-48 flex-shrink-0 flex items-center gap-2">
              <Shield size={16} className="text-slate-400" />
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ERİŞİM İZNİ</h2>
            </div>
            <div className="flex-1">
              <div className="inline-block bg-slate-100 dark:bg-[#262d3d] text-slate-600 dark:text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-lg mb-4">
                Destek ekibinin firma verilerinize erişimi yok.
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                Karşılaştığınız problemleri gidermek için destek ekibinin verilerinize erişmesi gerekebilir.
              </p>
              <p className="text-[13px] text-slate-500 dark:text-slate-500 mt-3">
                Güvenliğiniz için erişim izniniz 7 gün sonra otomatik olarak kapatılır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MetronicLayout>
  );
}
