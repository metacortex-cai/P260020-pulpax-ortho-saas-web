'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, ClinicInfo } from '../../store/authStore';
import { Building2, ArrowRight, Activity, LogOut } from 'lucide-react';
import api from '../../lib/api';

export default function SelectClinicPage() {
  const router = useRouter();
  const { user, clinics, selectClinic, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mounted-flag pattern to guard SSR/hydration-sensitive rendering; must run client-side post-mount, not derivable during render
    setMounted(true);
  }, []);

  // Hoisted above the effect that references it (and memoized) so it's not accessed before
  // declaration and can safely be listed as an effect dependency.
  const handleClinicSelect = useCallback((clinic: ClinicInfo) => {
    if (!clinic.isActive || clinic.status === 'SUSPENDED') {
      return; // İnaktif veya askıya alınmış klinik seçilemez
    }

    // Store'da kliniği seç (tenantId ve role güncellenir)
    selectClinic(clinic);

    // X-Tenant-ID header'ını güncelleyerek token yenileme yapabiliriz
    // (Böylece backend'deki token da yeni tenantId'yi içerir)

    if (user?.role === 'SAAS_ADMIN') {
       // SAAS_ADMIN users do not belong in the clinic app.
       // /saas/dashboard does not exist here; redirect them back to login.
       router.push('/login');
    } else {
       router.push('/dashboard');
    }
  }, [selectClinic, user, router]);

  useEffect(() => {
    if (!mounted) return;
    // Kullanıcı giriş yapmamışsa login'e gönder
    if (!user) {
      router.push('/login');
      return;
    }

    // Kullanıcının sadece 1 kliniği varsa (veya yoksa) onu seç ve dashboard'a gönder
    if (clinics.length <= 1) {
      if (clinics.length === 1) {
        handleClinicSelect(clinics[0]);
      } else {
        // Klinik yoksa (teorik olarak olmamalı, fallback var)
        router.push('/dashboard');
      }
    }
  }, [mounted, user, clinics, handleClinicSelect, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!mounted || !user || clinics.length <= 1) {
    return null; // Yönlendirme yapılıyor veya henüz mount edilmedi...
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Arkaplan Fotoğrafı */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/login.jpg')" }}
      />
      {/* Arkaplan üzerine hafif karartma */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Glassmorphism Kartı */}
      <div 
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Başlık ve İkon */}
        <div className="text-center p-6 border-b border-white/10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4 shadow-lg border border-white/30">
            <Building2 size={28} className="text-white drop-shadow-md" />
          </div>
          <h1 className="text-xl font-bold mb-2 text-white">Klinik Seçimi</h1>
          <p className="text-white/70 text-sm max-w-sm mx-auto">
            Birden fazla kayıtlı kliniğiniz bulunuyor. Lütfen oturum açmak istediğiniz kliniği seçin.
          </p>
        </div>

        {/* Klinik Listesi */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-b-2xl overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 flex justify-between items-center px-5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Bağlı Olduğunuz Klinikler</span>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{clinics.length} Kayıt</span>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
            {clinics.map((clinic) => {
              const isDisabled = !clinic.isActive || clinic.status === 'SUSPENDED';
              
              return (
                <div 
                  key={clinic.id}
                  onClick={() => !isDisabled && handleClinicSelect(clinic)}
                  className={`p-5 flex items-center gap-4 transition-all duration-200 group
                    ${isDisabled 
                      ? 'opacity-60 bg-slate-50 dark:bg-white/[0.02] cursor-not-allowed' 
                      : 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-white/5 hover:pl-6 active:bg-blue-50 dark:active:bg-white/10'
                    }
                  `}
                >
                  {/* Status Indicator */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm
                    ${isDisabled ? 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400' : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300'}
                  `}>
                    {isDisabled ? <Activity size={18} /> : <Building2 size={18} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className={`text-base font-bold truncate ${isDisabled ? 'text-slate-400 dark:text-slate-600' : 'text-slate-900 dark:text-slate-100'}`}>
                      {clinic.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{clinic.role}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md
                        ${clinic.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' : 
                          clinic.status === 'TRIAL' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' : 
                          'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'}
                      `}>
                        {clinic.status === 'ACTIVE' ? 'Aktif' : 
                         clinic.status === 'TRIAL' ? 'Deneme Sürümü' : 
                         'Askıya Alındı'}
                      </span>
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <div className={`shrink-0 ${isDisabled ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300'}`}>
                    <ArrowRight className="text-blue-500" size={20} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white py-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
            >
              <LogOut size={16} />
              Giriş Ekranına Dön
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
