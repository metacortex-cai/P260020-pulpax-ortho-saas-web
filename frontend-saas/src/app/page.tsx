'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Shield, Zap, Star, Users, CheckCircle, Building2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-metronic-body dark:bg-[#0f1117] overflow-x-hidden">
      {/* ─── NAV BAR ─── */}
      <nav className="h-[80px] flex items-center justify-between px-8 md:px-16 lg:px-24 bg-white/80 dark:bg-[#1c1f2e]/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Pulpax Logo" width={200} height={51} className="h-9 w-auto object-contain" priority />
          <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Pulpax Dental OS</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="http://localhost:7001/login" className="text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:text-metronic-primary transition-colors">Giriş Yap</a>
          <Link href="/register" className="flex items-center gap-1.5 h-10 px-6 bg-metronic-primary hover:bg-blue-600 text-white rounded-xl text-[13px] font-bold transition-all shadow-lg shadow-metronic-primary/20 active:scale-95">Ücretsiz Başla</Link>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-24 pb-32 px-8 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-metronic-primary/10 blur-[120px] rounded-full -mr-64 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-metronic-primary/10 border border-metronic-primary/20 rounded-full text-metronic-primary text-[11px] font-bold uppercase tracking-wider mb-8 animate-bounce">
            <Star size={12} className="fill-current" /> Yeni Nesil Klinik Yönetimi
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-[1.1] mb-8">
            Kliniğinizi <span className="text-transparent bg-clip-text bg-gradient-to-r from-metronic-primary to-purple-500">Dijital Geleceğe</span> Taşıyın.
          </h1>
          <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
            Pulpax, modern diş klinikleri için tasarlanmış hepsi bir arada yönetim sistemidir. 
            Hasta takibinden finansal analizlere, stok yönetiminden laboratuvar entegrasyonuna kadar her şey elinizin altında.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="flex items-center gap-2 h-14 px-10 bg-metronic-primary hover:bg-blue-600 text-white rounded-2xl text-base font-bold transition-all shadow-xl shadow-metronic-primary/30 active:scale-95 group">
              Hemen Kayıt Ol <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="flex items-center gap-2 h-14 px-10 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 rounded-2xl text-base font-bold hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm">
              Özellikleri Keşfet
            </button>
          </div>

          <div className="mt-20 relative max-w-5xl mx-auto group">
             <div className="absolute -inset-1 bg-gradient-to-r from-metronic-primary to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
             <div className="relative bg-white dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden aspect-video">
                <Image src="/login.jpg" alt="Dashboard Preview" fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex items-end p-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Zap size={24} className="text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-bold text-lg leading-tight">Gelişmiş Dashboard</p>
                      <p className="text-white/60 text-sm font-medium">Verilerinizi gerçek zamanlı izleyin.</p>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section className="py-24 px-8 bg-white dark:bg-[#161925]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white mb-4">Neden Pulpax?</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Kliniğinizin verimliliğini artıran güçlü araçlar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-3xl hover:border-metronic-primary/40 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                <Shield size={28} />
              </div>
              <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Güçlü Güvenlik</h4>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                KVKK uyumlu veri saklama ve AES-256 şifreleme ile hastalarınızın verileri her zaman güvende.
              </p>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-3xl hover:border-metronic-primary/40 transition-all group border-metronic-primary/20 shadow-xl shadow-metronic-primary/5">
              <div className="w-14 h-14 rounded-2xl bg-metronic-primary/10 flex items-center justify-center text-metronic-primary mb-6 group-hover:scale-110 transition-transform">
                <Zap size={28} />
              </div>
              <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Hızlı İşlem</h4>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Modern mimarisi ile randevu ve hasta kayıtlarını saniyeler içinde gerçekleştirin.
              </p>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-3xl hover:border-metronic-primary/40 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform">
                <Users size={28} />
              </div>
              <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Çoklu Şube</h4>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Tüm şubelerinizi tek bir panelden yönetin, verileri konsolide edin ve analiz edin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── REFERENCES SECTION ─── */}
      <section className="py-24 px-8 bg-slate-50/50 dark:bg-white/[0.01] border-y border-slate-200/60 dark:border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h5 className="text-[13px] font-extrabold text-metronic-primary uppercase tracking-[0.3em] mb-4">Güvenle Kullanılıyor</h5>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white">Referanslarımız</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 items-center opacity-80 dark:opacity-60 hover:opacity-100 transition-opacity duration-500">
            {[
              'İstanbul Diş Akademisi', 'Ege Dental Klinik', 'Başkent Ağız Sağlığı', 
              'Mavi Diş Merkezi', 'Anadolu Dental', 'Elite Smile Clinic',
              'Vizyon Diş', 'Modern Dental Grup', 'Kuzey Klinik',
              'Güney Sağlık', 'Batı Dental', 'Doğu Ağız ve Diş'
            ].map((name, i) => (
              <div key={i} className="flex flex-col items-center gap-4 group cursor-default">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-200 dark:bg-white/10 flex items-center justify-center group-hover:bg-metronic-primary/10 group-hover:text-metronic-primary group-hover:rotate-6 transition-all duration-500 shadow-sm group-hover:shadow-xl group-hover:shadow-metronic-primary/10">
                   <Building2 size={40} strokeWidth={1.5} />
                </div>
                <span className="text-[14px] font-extrabold text-slate-500 group-hover:text-metronic-primary transition-colors text-center uppercase tracking-widest">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="py-24 px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-metronic-primary to-purple-600 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-metronic-primary/40">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 blur-2xl rounded-full -ml-24 -mb-24"></div>
           
           <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">Denemeye Hazır mısınız?</h2>
           <p className="text-white/80 text-lg font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
             Hemen ücretsiz hesabınızı oluşturun ve Pulpax&apos;ın sunduğu benzersiz özellikleri keşfetmeye başlayın.
           </p>
           <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="h-14 px-12 bg-white text-metronic-primary hover:bg-slate-50 rounded-2xl text-base font-bold transition-all shadow-xl active:scale-95 flex items-center justify-center">
                Şimdi Kaydol
              </Link>
              <button className="h-14 px-12 bg-transparent border border-white/30 text-white hover:bg-white/10 rounded-2xl text-base font-bold transition-all flex items-center justify-center">
                Bize Ulaşın
              </button>
           </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 px-8 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#0f1117]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Pulpax Logo" width={200} height={51} className="h-7 w-auto" />
            <span className="text-base font-bold text-slate-800 dark:text-white tracking-tight">Pulpax SaaS</span>
          </div>
          <div className="flex items-center gap-8 text-[13px] font-bold text-slate-500 dark:text-slate-400">
            <Link href="/legal/kvkk" className="hover:text-metronic-primary transition-colors">KVKK</Link>
            <Link href="/legal/terms" className="hover:text-metronic-primary transition-colors">Kullanım Şartları</Link>
            <Link href="/legal/privacy" className="hover:text-metronic-primary transition-colors">Gizlilik Politikası</Link>
          </div>
          <div className="text-[13px] font-medium text-slate-400">
            © 2026 Pulpax. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  );
}
