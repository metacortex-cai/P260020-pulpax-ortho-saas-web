'use client';

import Link from 'next/link';
import { SearchX, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-metronic-body dark:bg-[#0f1117] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 bg-amber-500/10 text-amber-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-amber-500/5">
          <SearchX size={48} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">
          İstediğiniz sayfa görüntülenemiyor
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
          Aradığınız sayfa silinmiş, ismi değiştirilmiş veya geçici olarak kullanım dışı olabilir. 
          Lütfen adresi kontrol edin veya anasayfaya dönün.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 h-14 px-10 bg-metronic-primary text-white rounded-2xl font-bold hover:bg-blue-600 transition-all shadow-xl shadow-metronic-primary/20 active:scale-95 mx-auto"
        >
          <Home size={20} /> Anasayfaya Dön
        </Link>
      </div>
    </div>
  );
}
