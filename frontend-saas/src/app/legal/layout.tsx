'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck, FileText, Lock } from 'lucide-react';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-metronic-body dark:bg-[#0f1117] py-20 px-6 md:px-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-metronic-primary font-bold text-sm mb-12 transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Anasayfaya Dön
        </Link>
        
        <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
          <div className="flex border-b border-slate-100 dark:border-white/5">
             <Link href="/legal/kvkk" className="flex-1 py-6 text-center text-[13px] font-bold border-r border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
               <ShieldCheck size={16} className="text-metronic-primary" /> KVKK Aydınlatma
             </Link>
             <Link href="/legal/terms" className="flex-1 py-6 text-center text-[13px] font-bold border-r border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
               <FileText size={16} className="text-blue-500" /> Kullanım Şartları
             </Link>
             <Link href="/legal/privacy" className="flex-1 py-6 text-center text-[13px] font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
               <Lock size={16} className="text-purple-500" /> Gizlilik Politikası
             </Link>
          </div>
          <div className="p-8 md:p-16 prose prose-slate dark:prose-invert max-w-none">
            {children}
          </div>
          <div className="bg-slate-50 dark:bg-white/5 p-8 border-t border-slate-100 dark:border-white/5 text-center">
             <p className="text-[12px] font-medium text-slate-500">Son Güncelleme: 2 Haziran 2026. Herhangi bir sorunuz için hukuk@pulpax.com adresi üzerinden bizimle iletişime geçebilirsiniz.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
