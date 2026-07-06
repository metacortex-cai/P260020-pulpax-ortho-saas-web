'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, ChevronRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setClinics = useAuthStore((state) => state.setClinics);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Modes: 'login' | 'forgot' | 'reset'
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [resetToken, setResetToken] = useState<string | null>(null);

  // URL'deki resetToken'ı render sırasında türet (React docs: bir prop'u state'e
  // kopyalamak için efekt yerine render sırasında ayarla).
  const searchParamsKey = searchParams.toString();
  // `null` ile başlar (gerçek bir query string'e asla eşit olmaz) böylece ilk render
  // sayfa yüklendiğinde URL'de zaten var olan bir resetToken'ı da işler.
  const [prevSearchParamsKey, setPrevSearchParamsKey] = useState<string | null>(null);
  if (searchParamsKey !== prevSearchParamsKey) {
    setPrevSearchParamsKey(searchParamsKey);
    const token = searchParams.get('resetToken');
    if (token) {
      setResetToken(token);
      setMode('reset');
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Email ve şifre alanları zorunludur.');
        setLoading(false);
        return;
      }

      const response = await api.post('/auth/login', { email, password });
      const user = response.data.user;
      const clinics = response.data.clinics || [];
      // Backend'den tenantId root seviyede gelmiyor olabilir, user nesnesi içindekini kullan
      const tenantId = response.data.tenantId || user.clinicId; 

      // Sadece SAAS_ rolü bu porttan giriş yapabilir
      if (!user.role || !user.role.startsWith('SAAS_')) {
        throw new Error('Yetkisiz erişim: Bu panel sadece SaaS yöneticileri içindir. Lütfen klinik panelinden (port 7001) giriş yapın.');
      }

      setClinics(clinics);
      setAuth(tenantId, user);
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Giriş başarısız. Bilgilerinizi kontrol edin.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPassword = async (e: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (!email) {
        setError('E-posta adresi gereklidir.');
        setLoading(false);
        return;
      }

      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message);

      // Geliştirme/test kolaylığı için link loglandıysa ve döndürüldüyse
      if (response.data.link) {
        setMessage(`Şifre sıfırlama linki oluşturuldu! (Test için konsolu veya bu mesajı kullanın): ${response.data.link}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'İşlem başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/reset-password', {
        token: resetToken,
        password: newPassword
      });
      setMessage(response.data.message + ' Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => {
        setMode('login');
        router.replace('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Şifre sıfırlama başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat login-bg"
      />
      <div className="absolute inset-0 bg-black/50" />

      <div 
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden glass-card"
      >
        <div className="p-6">
          {/* Logo */}
          <div className="text-center mb-6 flex flex-col items-center">
            <Image src="/logo.png" alt="Pulpax Logo" width={200} height={51} className="h-9 w-auto object-contain mb-2 drop-shadow-lg" priority />
            <h4 className="text-lg font-bold text-white">Pulpax SaaS</h4>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 text-red-200 text-sm rounded-lg text-center backdrop-blur-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-sm rounded-lg text-center backdrop-blur-sm break-all">
              {message}
            </div>
          )}

          {/* Mode 1: LOGIN */}
          {mode === 'login' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">E-posta Adresi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 rounded-xl outline-none transition-all duration-200 text-white placeholder-white/40 text-sm"
                    placeholder="ornek@klinik.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-white/80">Şifre</label>
                  <button 
                    onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
                    className="text-xs text-blue-300 hover:text-blue-200 hover:underline transition-colors"
                  >
                    Şifremi Unuttum
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e as any); }}
                    className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 rounded-xl outline-none transition-all duration-200 text-white placeholder-white/40 text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? "🔓" : "🔒"}
                  </button>
                </div>
              </div>

              <button 
                onClick={handleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition-all duration-200 disabled:opacity-70 text-sm btn-primary-blue"
              >
                {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                {!loading && <ChevronRight size={18} />}
              </button>
            </div>
          )}

          {/* Mode 2: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button 
                  onClick={() => { setMode('login'); setError(''); setMessage(''); }}
                  className="text-white hover:text-blue-300 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <span className="text-sm font-semibold text-white">Giriş Yapmaya Geri Dön</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">E-posta Adresiniz</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 rounded-xl outline-none transition-all duration-200 text-white placeholder-white/40 text-sm"
                    placeholder="envernehir@gmail.com"
                  />
                </div>
              </div>

              <button 
                onClick={handleForgotPassword}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition-all duration-200 disabled:opacity-70 text-sm btn-primary-blue"
              >
                {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Linki Gönder'}
              </button>
            </div>
          )}

          {/* Mode 3: RESET PASSWORD */}
          {mode === 'reset' && (
            <div className="space-y-4">
              <h5 className="text-white font-semibold text-center mb-2">Yeni Şifrenizi Belirleyin</h5>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Yeni Şifre</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 rounded-xl outline-none transition-all duration-200 text-white placeholder-white/40 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Yeni Şifre (Tekrar)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 rounded-xl outline-none transition-all duration-200 text-white placeholder-white/40 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition-all duration-200 disabled:opacity-70 text-sm btn-success-green"
              >
                {loading ? 'Şifre Güncelleniyor...' : 'Şifreyi Güncelle ve Giriş Yap'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-metronic-body dark:bg-[#0f1117]">
        <div className="text-white font-bold">Yükleniyor...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
