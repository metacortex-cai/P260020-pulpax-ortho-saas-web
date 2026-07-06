'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportsIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/reports/appointments');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-[#0f1117]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-metronic-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[13px] font-bold text-slate-500 animate-pulse">Raporlar yükleniyor...</p>
      </div>
    </div>
  );
}
