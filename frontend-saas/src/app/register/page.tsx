'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Building2, ChevronRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    institutionName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulating API call
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
    }, 1500);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-metronic-body dark:bg-[#0f1117]">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat login-bg opacity-20" />
        <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#1c1f2e] rounded-3xl shadow-2xl p-8 text-center border border-slate-200 dark:border-white/10">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-4">Harika! Kaydınız Alındı.</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
            <span className="font-bold text-metronic-primary">{formData.email}</span> adresine bir aktivasyon linki gönderdik. Lütfen e-postanızı kontrol edin ve hesabınızı aktifleştirin.
          </p>
          <div className="space-y-3">
             <Link href="/activate?token=demo-token" className="flex items-center justify-center w-full h-12 bg-metronic-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-metronic-primary/20">
                (Simülasyon) Aktivasyon Sayfasına Git
             </Link>
             <Link href="/" className="flex items-center justify-center w-full h-12 text-slate-500 hover:text-metronic-primary font-bold transition-all">
                Anasayfaya Dön
             </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-metronic-body dark:bg-[#0f1117]">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat login-bg opacity-20" />
      
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#1c1f2e] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10">
        <div className="p-8 md:p-10">
          <div className="flex items-center gap-3 mb-8">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-metronic-primary transition-all">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Ücretsiz Hesap Oluştur</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Hemen başlayın, kliniğinizi yönetin.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ad</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    required 
                    type="text" 
                    placeholder="John"
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                    className="w-full pl-10 pr-4 h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-metronic-primary focus:ring-4 focus:ring-metronic-primary/10 transition-all text-sm font-medium" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Soyad</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    required 
                    type="text" 
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                    className="w-full pl-10 pr-4 h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-metronic-primary focus:ring-4 focus:ring-metronic-primary/10 transition-all text-sm font-medium" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kurum / Klinik Adı</label>
              <div className="relative">
                <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  required 
                  type="text" 
                  placeholder="Örn: Pulpax Dental Klinik"
                  value={formData.institutionName}
                  onChange={e => setFormData({...formData, institutionName: e.target.value})}
                  className="w-full pl-10 pr-4 h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-metronic-primary focus:ring-4 focus:ring-metronic-primary/10 transition-all text-sm font-medium" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">E-posta Adresi</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  required 
                  type="email" 
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-10 pr-4 h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-metronic-primary focus:ring-4 focus:ring-metronic-primary/10 transition-all text-sm font-medium" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Telefon Numarası</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  required 
                  type="tel" 
                  placeholder="05XX XXX XX XX"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-10 pr-4 h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-metronic-primary focus:ring-4 focus:ring-metronic-primary/10 transition-all text-sm font-medium" 
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-1">
                  <input required type="checkbox" className="peer sr-only" />
                  <div className="w-5 h-5 border-2 border-slate-200 dark:border-white/10 rounded-md peer-checked:bg-metronic-primary peer-checked:border-metronic-primary transition-all flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                </div>
                <span className="text-[12.5px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                  <Link href="/legal/kvkk" className="text-metronic-primary font-bold hover:underline">KVKK Aydınlatma Metni</Link>&apos;ni okudum ve kabul ediyorum. <span className="text-metronic-danger">*</span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-1">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="w-5 h-5 border-2 border-slate-200 dark:border-white/10 rounded-md peer-checked:bg-metronic-primary peer-checked:border-metronic-primary transition-all flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                </div>
                <span className="text-[12.5px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                  Ürün ve hizmetlerle ilgili bilgilendirme amaçlı ticari elektronik ileti (SMS, E-posta) almayı kabul ediyorum.
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 bg-metronic-primary hover:bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-xl shadow-metronic-primary/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? 'Kaydınız Yapılıyor...' : 'Kayıt Ol'}
                {!loading && <ChevronRight size={20} />}
              </button>
            </div>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400 font-medium pt-2">
              Zaten bir hesabınız var mı? <a href="http://localhost:7001/login" className="text-metronic-primary font-bold hover:underline">Giriş Yap</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
