'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Building2, Save, ArrowLeft, ShieldAlert, CreditCard, MessageSquare, Plus, Clock, Loader2 } from 'lucide-react';
import SaasMetronicLayout from '../../../../components/layout/SaasMetronicLayout';
import { SaasService, Clinic } from '../../../../lib/services/saas.service';
import { useToastStore } from '../../../../store/toastStore';

export default function ClinicDetailsPage() {
  const { addToast } = useToastStore();
  const { id } = useParams();
  const router = useRouter();
  const clinicId = Array.isArray(id) ? id[0] : id;

  const [activeTab, setActiveTab] = useState('GENERAL');
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // GENERAL tab state
  const [generalForm, setGeneralForm] = useState({
    name: '',
    taxId: '',
    email: '',
    phone: '',
    address: '',
  });
  const [savingGeneral, setSavingGeneral] = useState(false);

  // SUBSCRIPTION tab state
  const [subForm, setSubForm] = useState({
    plan: '',
    status: '',
    subscriptionEndDate: '',
  });
  const [savingSub, setSavingSub] = useState(false);

  // SMS tab state
  const [smsAmount, setSmsAmount] = useState('');
  const [savingSms, setSavingSms] = useState(false);

  const fetchClinic = async () => {
    if (!clinicId) return;
    setLoading(true);
    setError('');
    try {
      const data = await SaasService.getClinicById(clinicId);
      setClinic(data);
      setGeneralForm({
        name: data.name || '',
        taxId: data.taxId || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
      });
      setSubForm({
        plan: data.plan || '',
        status: data.status || '',
        subscriptionEndDate: data.subscriptionEndDate ? data.subscriptionEndDate.split('T')[0] : '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Klinik bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clinicId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/dep-change pattern
      fetchClinic();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchClinic is redefined every render; adding it would retrigger this effect on every render
  }, [clinicId]);

  const handleSaveGeneral = async () => {
    if (!clinicId) return;
    setSavingGeneral(true);
    setError('');
    setSuccess('');
    try {
      const updated = await SaasService.updateClinic(clinicId, generalForm);
      setClinic(updated);
      const msg = 'Genel bilgiler başarıyla güncellendi.';
      setSuccess(msg);
      addToast({ type: 'success', message: msg });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Güncelleme başarısız.';
      setError(msg);
      addToast({ type: 'error', message: msg });
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveSubscription = async () => {
    if (!clinicId) return;
    setSavingSub(true);
    setError('');
    setSuccess('');
    try {
      const updated = await SaasService.updateClinic(clinicId, subForm);
      setClinic(updated);
      const msg = 'Abonelik bilgileri başarıyla güncellendi.';
      setSuccess(msg);
      addToast({ type: 'success', message: msg });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Abonelik güncellenemedi.';
      setError(msg);
      addToast({ type: 'error', message: msg });
    } finally {
      setSavingSub(false);
    }
  };

  const handleAdjustSms = async () => {
    if (!clinicId) return;
    const amount = parseInt(smsAmount, 10);
    if (isNaN(amount) || amount === 0) {
      setError('Geçerli bir kredi miktarı girin (pozitif veya negatif).');
      return;
    }
    setSavingSms(true);
    setError('');
    setSuccess('');
    try {
      await SaasService.adjustSmsQuota(clinicId, amount);
      const msg = `SMS kotası ${amount > 0 ? '+' : ''}${amount} olarak güncellendi.`;
      setSuccess(msg);
      addToast({ type: 'success', message: msg });
      setSmsAmount('');
      await fetchClinic();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'SMS kotası güncellenemedi.';
      setError(msg);
      addToast({ type: 'error', message: msg });
    } finally {
      setSavingSms(false);
    }
  };

  if (loading) {
    return (
      <SaasMetronicLayout
        title="Klinik Yönetimi"
        breadcrumbs={['Klinikler', 'Yükleniyor...']}
        headerAction={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-[13px] font-bold transition-colors"
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>
        }
      >
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 size={32} className="animate-spin" />
            <span className="text-sm font-medium">Klinik bilgileri yükleniyor...</span>
          </div>
        </div>
      </SaasMetronicLayout>
    );
  }

  if (!clinic) {
    return (
      <SaasMetronicLayout
        title="Klinik Bulunamadı"
        breadcrumbs={['Klinikler', 'Hata']}
        headerAction={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-[13px] font-bold transition-colors"
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>
        }
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 font-semibold">{error || 'Klinik bulunamadı.'}</p>
          </div>
        </div>
      </SaasMetronicLayout>
    );
  }

  return (
    <SaasMetronicLayout
      title={`Klinik Yönetimi: ${clinic.name}`}
      breadcrumbs={['Klinikler', clinic.name]}
      headerAction={
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-[13px] font-bold transition-colors"
        >
          <ArrowLeft size={16} /> Geri Dön
        </button>
      }
    >
      {/* Global feedback */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-xl font-medium">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Sol Kolon - Klinik Özeti & Menü */}
        <div className="flex flex-col gap-6">

          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 mb-4 ring-4 ring-slate-50 dark:ring-white/5">
              <Building2 size={36} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{clinic.name}</h2>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-md mb-4">
              ID: {clinic.id}
            </span>

            <div className="flex gap-2 mb-6">
              <span className={`px-3 py-1 text-[11px] font-bold rounded-full ${
                clinic.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : clinic.status === 'TRIAL'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
              }`}>
                {clinic.status}
              </span>
              <span className="px-3 py-1 text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-full">
                {clinic.plan} Paket
              </span>
            </div>

            <div className="w-full text-left space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
              {clinic.email && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">E-Posta</p>
                  <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{clinic.email}</p>
                </div>
              )}
              {clinic.phone && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Telefon</p>
                  <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{clinic.phone}</p>
                </div>
              )}
              {clinic.taxId && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">VKN / TCKN</p>
                  <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{clinic.taxId}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
            <ul className="flex flex-col text-[13px] font-medium">
              {[
                { id: 'GENERAL', label: 'Genel Bilgiler', icon: Building2 },
                { id: 'SUBSCRIPTION', label: 'Lisans & Abonelik', icon: ShieldAlert },
                { id: 'SMS', label: 'SMS Yönetimi', icon: MessageSquare },
                { id: 'BILLING', label: 'Faturalar & Cari', icon: CreditCard },
              ].map((tab) => (
                <li key={tab.id}>
                  <button
                    onClick={() => {
                      setActiveTab(tab.id);
                      setError('');
                      setSuccess('');
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 border-l-2 border-violet-600'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 border-l-2 border-transparent'
                    }`}
                  >
                    <tab.icon size={18} className={activeTab === tab.id ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'} />
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Sağ Kolon - Detaylar */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm h-full flex flex-col">

            {/* GENERAL TAB */}
            {activeTab === 'GENERAL' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Genel Klinik Bilgileri</h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Klinik Adı</label>
                      <input
                        type="text"
                        value={generalForm.name}
                        onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                        className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Vergi / TCKN</label>
                      <input
                        type="text"
                        value={generalForm.taxId}
                        onChange={(e) => setGeneralForm({ ...generalForm, taxId: e.target.value })}
                        className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">E-posta</label>
                      <input
                        type="text"
                        value={generalForm.email}
                        onChange={(e) => setGeneralForm({ ...generalForm, email: e.target.value })}
                        className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Telefon</label>
                      <input
                        type="text"
                        value={generalForm.phone}
                        onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })}
                        className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Adres</label>
                    <textarea
                      rows={3}
                      value={generalForm.address}
                      onChange={(e) => setGeneralForm({ ...generalForm, address: e.target.value })}
                      className="w-full px-3 py-2 text-[13px] bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white resize-none"
                    />
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleSaveGeneral}
                    disabled={savingGeneral}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors"
                  >
                    {savingGeneral ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Kaydet
                  </button>
                </div>
              </div>
            )}

            {/* SUBSCRIPTION TAB */}
            {activeTab === 'SUBSCRIPTION' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Lisans ve Abonelik</h3>

                <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">Mevcut Plan</p>
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-bold text-slate-800 dark:text-white">{clinic.plan}</h4>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        clinic.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                      }`}>
                        {clinic.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-500 mb-1">Bitiş Tarihi</p>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Clock size={16} className="text-slate-400" />
                      {clinic.subscriptionEndDate
                        ? new Date(clinic.subscriptionEndDate).toLocaleDateString('tr-TR')
                        : 'Belirsiz'}
                    </h4>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">SaaS Paketi</label>
                      <select
                        value={subForm.plan}
                        onChange={(e) => setSubForm({ ...subForm, plan: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                      >
                        <option value="FREE">FREE</option>
                        <option value="BASIC">BASIC</option>
                        <option value="PRO">PRO</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Sistem Durumu</label>
                      <select
                        value={subForm.status}
                        onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="TRIAL">TRIAL</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Abonelik Bitiş Tarihi</label>
                    <input
                      type="date"
                      value={subForm.subscriptionEndDate}
                      onChange={(e) => setSubForm({ ...subForm, subscriptionEndDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleSaveSubscription}
                    disabled={savingSub}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors"
                  >
                    {savingSub ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </div>
            )}

            {/* SMS TAB */}
            {activeTab === 'SMS' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">SMS Kredi Yönetimi</h3>

                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10 mb-6">
                  <MessageSquare size={32} className="text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-500 mb-1">Mevcut SMS Kotası</p>
                  <h4 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                    {(clinic.smsQuota ?? 0).toLocaleString('tr-TR')}
                  </h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">
                      Manuel Kredi Yükle / Düş (Adet)
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder="Örn: 1000 veya -500"
                        value={smsAmount}
                        onChange={(e) => setSmsAmount(e.target.value)}
                        className="flex-1 px-3 py-2 text-[13px] bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                      />
                      <button
                        onClick={handleAdjustSms}
                        disabled={savingSms || !smsAmount}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white rounded-lg text-[13px] font-bold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {savingSms ? <Loader2 size={14} className="animate-spin" /> : null}
                        Uygula
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Sisteme manuel kredi eklemek veya hata durumunda silmek için (+) veya (-) değer girin.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* BILLING TAB */}
            {activeTab === 'BILLING' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Faturalar ve Cari</h3>
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-lg text-[12px] font-bold transition-colors">
                    <Plus size={14} /> Yeni Fatura Kes
                  </button>
                </div>

                <div className="text-center py-10 border-2 border-dashed border-slate-200/60 dark:border-white/10 rounded-xl">
                  <CreditCard size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <h5 className="text-sm font-bold text-slate-600 dark:text-slate-300">Henüz fatura kaydı yok</h5>
                  <p className="text-xs text-slate-400 mt-1">Bu kliniğe ait kesilmiş bir abonelik veya SMS faturası bulunmuyor.</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </SaasMetronicLayout>
  );
}
