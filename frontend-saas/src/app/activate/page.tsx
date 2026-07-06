'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';

function ActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const token = searchParams.get('token');
  const email = "demo@klinik.com"; // Mocked for design

  const strength = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const strengthCount = Object.values(strength).filter(Boolean).length;
  const isStrong = strengthCount === 4;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrong || password !== confirmPassword) return;
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/pricing');
    }, 1500);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-metronic-body dark:bg-[#0f1117]">
         <div className="max-w-md w-full bg-white dark:bg-[#1c1f2e] p-10 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 text-center">
            <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Geçersiz Bağlantı</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Aktivasyon linki geçersiz veya süresi dolmuş.</p>
            <button onClick={() => router.push('/')} className="w-full h-12 bg-metronic-primary text-white rounded-xl font-bold">Anasayfaya Dön</button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-metronic-body dark:bg-[#0f1117]">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat login-bg opacity-20" />

      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#1c1f2e] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10">
        <div className="p-8 md:p-10">
          <div className="text-center mb-10">
             <div className="w-16 h-16 bg-metronic-primary/10 text-metronic-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} />
             </div>
             <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Hesabınızı Aktifleştirin</h2>
             <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Kullanıcı adınız: <span className="font-bold text-metronic-primary">{email}</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Güçlü Bir Şifre Belirleyin</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  required 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-metronic-primary focus:ring-4 focus:ring-metronic-primary/10 transition-all text-sm font-medium" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* Password Strength Meter */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                 <div className={`h-1.5 rounded-full transition-all ${strengthCount >= 1 ? 'bg-rose-500' : 'bg-slate-200 dark:bg-white/5'}`}></div>
                 <div className={`h-1.5 rounded-full transition-all ${strengthCount >= 2 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-white/5'}`}></div>
                 <div className={`h-1.5 rounded-full transition-all ${strengthCount >= 3 ? 'bg-blue-500' : 'bg-slate-200 dark:bg-white/5'}`}></div>
                 <div className={`h-1.5 rounded-full transition-all ${strengthCount >= 4 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/5'}`}></div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2">
                 <div className={`flex items-center gap-1.5 text-[11px] font-bold ${strength.length ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <CheckCircle2 size={12} /> En az 8 karakter
                 </div>
                 <div className={`flex items-center gap-1.5 text-[11px] font-bold ${strength.uppercase ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <CheckCircle2 size={12} /> Büyük harf
                 </div>
                 <div className={`flex items-center gap-1.5 text-[11px] font-bold ${strength.number ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <CheckCircle2 size={12} /> Rakam
                 </div>
                 <div className={`flex items-center gap-1.5 text-[11px] font-bold ${strength.special ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <CheckCircle2 size={12} /> Sembol
                 </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Şifre Tekrar</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  required 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-12 h-12 bg-slate-50 dark:bg-white/5 border rounded-xl outline-none focus:ring-4 transition-all text-sm font-medium ${
                    confirmPassword && password !== confirmPassword 
                      ? 'border-rose-500 focus:ring-rose-500/10' 
                      : 'border-slate-200 dark:border-white/10 focus:border-metronic-primary focus:ring-metronic-primary/10'
                  }`} 
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[11px] font-bold text-rose-500 mt-1">Şifreler eşleşmiyor.</p>
              )}
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading || !isStrong || password !== confirmPassword}
                className="w-full h-14 bg-metronic-primary hover:bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-xl shadow-metronic-primary/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
              >
                {loading ? 'Aktifleştiriliyor...' : 'Şifreyi Belirle ve Devam Et'}
                {!loading && <ChevronRight size={20} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-metronic-body dark:bg-[#0f1117]">
        <div className="text-slate-500 dark:text-slate-400 font-bold">Lütfen bekleyin...</div>
      </div>
    }>
      <ActivateForm />
    </Suspense>
  );
}
