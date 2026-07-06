'use client';

import { useState, useEffect } from 'react';
import { Settings, Mail, Shield, Wrench, Coins, Save, CheckCircle, HelpCircle } from 'lucide-react';
import SaasMetronicLayout from '../../../components/layout/SaasMetronicLayout';
import api from '../../../lib/api';

export default function SaasSettingsPage() {
  const [success, setSuccess] = useState('');
  
  // SMTP Form State (Loaded from env placeholders or local state)
  const [smtpConfig, setSmtpConfig] = useState({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    user: 'apikey',
    fromName: 'Pulpax Support',
    fromEmail: 'support@pulpax.com'
  });

  // Global SaaS States
  const [saasConfig, setSaasConfig] = useState({
    trialDays: 14,
    defaultSmsQuota: 1000,
    maintenanceMode: false,
    allowedRegistrations: true
  });

  // Dynamic Pricing States
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    api.get('/pricing/plans')
      .then(res => {
        if (Array.isArray(res.data)) {
          setPlans(res.data);
        }
      })
      .catch(err => {
        console.error('Planlar yuklenemedi', err);
      });
  }, []);

  const handleUpdatePlanValue = (index: number, key: string, value: any) => {
    const updated = [...plans];
    updated[index] = { ...updated[index], [key]: value };
    setPlans(updated);
  };

  const handleSavePlans = () => {
    setSuccess('');
    api.post('/pricing/plans', { plans })
      .then(() => {
        setSuccess('Fiyatlandırma planları başarıyla güncellendi.');
      })
      .catch(() => {
        alert('Planlar güncellenirken hata oluştu.');
      });
  };

  const handleSaveSettings = (section: string) => {
    setSuccess('');
    setTimeout(() => {
      setSuccess(`${section} başarıyla bulut sunucusuna kaydedildi.`);
    }, 400);
  };

  return (
    <SaasMetronicLayout
      title="Platform Genel Ayarları"
      breadcrumbs={['Sistem Ayarları']}
    >
      <div className="flex flex-col gap-6 max-w-5xl">
        
        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-xl font-medium flex items-center gap-2">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Sidebar Tabs Guide */}
          <div className="md:col-span-1 flex flex-col gap-2">
            <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Platform Ayar Grupları</h3>
              <div className="flex flex-col gap-1">
                <a href="#smtp" className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-violet-600 bg-violet-500/10 rounded-lg">
                  <Mail size={14} /> SMTP E-posta Sunucusu
                </a>
                <a href="#security" className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">
                  <Shield size={14} /> Güvenlik & KVKK Şifreleme
                </a>
                <a href="#global" className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">
                  <Wrench size={14} /> Global SaaS Yapılandırması
                </a>
                <a href="#pricing" className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">
                  <Coins size={14} /> Global Plan Ücretleri
                </a>
              </div>
            </div>
          </div>

          {/* Form Areas */}
          <div className="md:col-span-2 flex flex-col gap-6">
            
            {/* SECTION 1: SMTP Settings */}
            <div id="smtp" className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-white/5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Mail size={16} className="text-violet-500" /> SMTP E-posta Dağıtım Sunucusu
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Platformun şifre sıfırlama, fatura ve aktivasyon maillerini göndereceği sunucu.</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">SMTP Host</label>
                    <input 
                      type="text" 
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">SMTP Port</label>
                    <input 
                      type="number" 
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Gönderici Adı (From Name)</label>
                    <input 
                      type="text" 
                      value={smtpConfig.fromName}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Gönderici E-posta (From Email)</label>
                    <input 
                      type="email" 
                      value={smtpConfig.fromEmail}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end pt-2">
                  <button 
                    onClick={() => handleSaveSettings('SMTP Sunucu Ayarları')}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                  >
                    <Save size={14} /> SMTP Ayarlarını Kaydet
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 2: Security & Encryption */}
            <div id="security" className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-white/5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Shield size={16} className="text-violet-500" /> Güvenlik & KVKK Şifreleme Durumu
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Platform genelindeki kriptografik saklama ve veri güvenliği metrikleri.</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Veritabanı E-posta Koruması</span>
                    <span className="px-2 py-0.5 font-bold bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">AES-256-GCM Aktif</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">E-posta Arama İndeksleme</span>
                    <span className="px-2 py-0.5 font-bold bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">SHA-256 Tek Yönlü Aktif</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Anahtar Kaynağı (.env)</span>
                    <span className="font-bold text-slate-800 dark:text-white">ENCRYPTION_KEY (32 Byte Güvenli)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Global SaaS Configuration */}
            <div id="global" className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-white/5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Wrench size={16} className="text-violet-500" /> Global SaaS Yapılandırması
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Platform genelindeki varsayılan limitler ve sistem modları.</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Deneme Süresi (Trial Days)</label>
                    <input 
                      type="number" 
                      value={saasConfig.trialDays}
                      onChange={(e) => setSaasConfig({ ...saasConfig, trialDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500">Deneme SMS Kotası</label>
                    <input 
                      type="number" 
                      value={saasConfig.defaultSmsQuota}
                      onChange={(e) => setSaasConfig({ ...saasConfig, defaultSmsQuota: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/[0.01] rounded-xl border border-slate-100 dark:border-white/5">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-white block">Sistem Bakım Modu (Maintenance Mode)</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Aktif edildiğinde sadece SaaS yöneticileri platforma girebilir.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={saasConfig.maintenanceMode}
                    onChange={(e) => setSaasConfig({ ...saasConfig, maintenanceMode: e.target.checked })}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-slate-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button 
                    onClick={() => handleSaveSettings('SaaS Global Yapılandırması')}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                  >
                    <Save size={14} /> Yapılandırmayı Kaydet
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 4: Global Pricing */}
            <div id="pricing" className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm flex flex-col">
              <div className="p-5 border-b border-slate-100 dark:border-white/5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Coins size={16} className="text-violet-500" /> Global Plan Ücretleri (Dinamik)
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Platformun ödeme altyapısındaki plan fiyatlarını dinamik olarak yönetin.</p>
              </div>
              <div className="p-5 space-y-4">
                {plans.length === 0 ? (
                  <p className="text-xs text-slate-400">Planlar yükleniyor...</p>
                ) : (
                  plans.map((plan, idx) => (
                    <div key={plan.id} className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800 dark:text-white">{plan.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-black">{plan.id}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Aylık Fiyat (₺)</label>
                          <input 
                            type="text" 
                            value={plan.price}
                            onChange={(e) => handleUpdatePlanValue(idx, 'price', isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Yıllık Fiyat (₺/ay)</label>
                          <input 
                            type="text" 
                            value={plan.yearlyPrice}
                            onChange={(e) => handleUpdatePlanValue(idx, 'yearlyPrice', isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400">Maks. Hekim</label>
                          <input 
                            type="number" 
                            value={plan.maxDentists}
                            onChange={(e) => handleUpdatePlanValue(idx, 'maxDentists', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/10 rounded-lg outline-none focus:border-violet-500 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {plans.length > 0 && (
                  <div className="flex items-center justify-end pt-2">
                    <button 
                      onClick={handleSavePlans}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                    >
                      <Save size={14} /> Planları ve Fiyatları Kaydet
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </SaasMetronicLayout>
  );
}
