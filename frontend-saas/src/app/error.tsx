'use client';

import Link from 'next/link';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-metronic-body dark:bg-[#0f1117] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-rose-500/5">
          <AlertCircle size={48} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">
          İstediğiniz sayfa görüntülenemiyor
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
          Sistemde beklenmeyen bir durum oluştu veya aradığınız sayfaya şu an ulaşılamıyor. 
          Lütfen sayfayı yenilemeyi veya anasayfaya dönmeyi deneyin.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 h-12 flex items-center justify-center gap-2 bg-metronic-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-metronic-primary/20 active:scale-95"
          >
            <RefreshCw size={18} /> Tekrar Dene
          </button>
          <Link
            href="/"
            className="flex-1 h-12 flex items-center justify-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95"
          >
            <Home size={18} /> Anasayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
