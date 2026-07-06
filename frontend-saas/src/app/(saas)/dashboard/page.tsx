'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, TrendingUp, DollarSign, Users, AlertCircle, MessageSquare, ShieldAlert } from 'lucide-react';
import SaasMetronicLayout from '../../../components/layout/SaasMetronicLayout';
import { SaasService, DashboardStats, Clinic } from '../../../lib/services/saas.service';
import { formatCurrency } from '../../../lib/utils/formatCurrency';

// Skeleton card for loading state
function StatSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl p-5 shadow-sm flex flex-col justify-between animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-white/10" />
        <div className="w-24 h-6 rounded-lg bg-slate-200 dark:bg-white/10" />
      </div>
      <div>
        <div className="w-28 h-4 rounded bg-slate-200 dark:bg-white/10 mb-2" />
        <div className="w-20 h-8 rounded bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
  );
}

export default function SaasDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentClinics, setRecentClinics] = useState<Clinic[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [errorStats, setErrorStats] = useState('');
  const [errorClinics, setErrorClinics] = useState('');

  useEffect(() => {
    // Fetch dashboard stats
    SaasService.getDashboardStats()
      .then(setStats)
      .catch(() => setErrorStats('Dashboard istatistikleri yüklenemedi.'))
      .finally(() => setLoadingStats(false));

    // Fetch recent clinics (latest 5)
    SaasService.getClinics()
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          const dateA = a.joinedAt || a.createdAt || '';
          const dateB = b.joinedAt || b.createdAt || '';
          return dateB.localeCompare(dateA);
        });
        setRecentClinics(sorted.slice(0, 5));
      })
      .catch(() => setErrorClinics('Klinik listesi yüklenemedi.'))
      .finally(() => setLoadingClinics(false));
  }, []);

  const trialClinics = stats
    ? Math.max(0, stats.totalClinics - stats.activeClinics - stats.suspendedClinics)
    : 0;

  const statCards = stats
    ? [
        {
          label: 'Toplam Klinik',
          value: stats.totalClinics.toString(),
          trend: `${stats.activeClinics} aktif`,
          icon: Building2,
          color: 'text-blue-500',
          bg: 'bg-blue-50 dark:bg-blue-500/10',
        },
        {
          label: 'Aktif Klinik',
          value: stats.activeClinics.toString(),
          trend: `${stats.suspendedClinics} askıda`,
          icon: ShieldAlert,
          color: 'text-amber-500',
          bg: 'bg-amber-50 dark:bg-amber-500/10',
        },
        {
          label: 'Aylık MRR',
          value: `${formatCurrency(stats.totalMRR)} ₺`,
          trend: 'Canlı veri',
          icon: TrendingUp,
          color: 'text-emerald-500',
          bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        },
        {
          label: 'Toplam SMS Kotası',
          value: stats.totalSMSQuota.toLocaleString('tr-TR'),
          trend: 'Sistem genelinde',
          icon: MessageSquare,
          color: 'text-indigo-500',
          bg: 'bg-indigo-50 dark:bg-indigo-500/10',
        },
      ]
    : [];

  return (
    <SaasMetronicLayout
      title="SaaS Dashboard"
      breadcrumbs={['Genel Bakış']}
    >
      <div className="flex flex-col gap-6">

        {/* Error banners */}
        {errorStats && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl font-medium">
            {errorStats}
          </div>
        )}

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingStats
            ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
            : statCards.map((stat, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                      <stat.icon size={24} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">
                      {stat.trend}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">{stat.label}</p>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{stat.value}</h3>
                  </div>
                </div>
              ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* RECENT CLINICS LIST */}
          <div className="lg:col-span-2 bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Son Eklenen Klinikler</h3>
                <p className="text-xs text-slate-400 mt-0.5">Platforma en son kayıt olan veya deneme süresi başlayan klinikler.</p>
              </div>
              <Link
                href="/clinics"
                className="text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                Tümünü Gör
              </Link>
            </div>
            <div className="overflow-x-auto">
              {errorClinics ? (
                <div className="px-5 py-8 text-center text-red-400 text-sm">{errorClinics}</div>
              ) : loadingClinics ? (
                <div className="px-5 py-8 text-center">
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-40 rounded bg-slate-200 dark:bg-white/10" />
                          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10" />
                        </div>
                        <div className="h-5 w-14 rounded bg-slate-200 dark:bg-white/10" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : recentClinics.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">Henüz kayıtlı klinik yok.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-white/[0.02] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 dark:border-white/5">
                      <th className="px-5 py-4">Klinik Adı</th>
                      <th className="px-5 py-4">Paket</th>
                      <th className="px-5 py-4">Durum</th>
                      <th className="px-5 py-4">Kalan SMS</th>
                      <th className="px-5 py-4">Kayıt Tarihi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                    {recentClinics.map((clinic, i) => (
                      <tr
                        key={clinic.id || i}
                        className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center font-bold text-slate-500 text-xs">
                            {clinic.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-white block">{clinic.name}</span>
                            <span className="text-[10px] text-slate-400 block">{clinic.id}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-md">
                            {clinic.plan}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            clinic.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : clinic.status === 'TRIAL'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                          }`}>
                            {clinic.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs">
                          {(clinic.smsQuota ?? 0).toLocaleString('tr-TR')}
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-xs">
                          {clinic.joinedAt || clinic.createdAt
                            ? new Date(clinic.joinedAt || clinic.createdAt!).toLocaleDateString('tr-TR')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ACTION PANEL */}
          <div className="bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden flex flex-col p-5">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Hızlı Eylemler & Bildirimler</h3>

            <div className="space-y-3">
              {!loadingStats && stats && trialClinics > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-100 dark:border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
                    <div>
                      <h5 className="text-sm font-bold text-amber-800 dark:text-amber-400">Deneme Sürümü Klinikler</h5>
                      <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                        Sistemde {trialClinics} adet deneme lisanslı klinik bulunuyor.
                      </p>
                      <Link
                        href="/clinics"
                        className="mt-2 inline-block text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Klinikleri Görüntüle
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {!loadingStats && stats && stats.suspendedClinics > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20">
                  <div className="flex items-start gap-3">
                    <DollarSign className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
                    <div>
                      <h5 className="text-sm font-bold text-red-800 dark:text-red-400">Askıya Alınan Klinikler</h5>
                      <p className="text-xs text-red-700 dark:text-red-500 mt-1">
                        {stats.suspendedClinics} klinik askıya alınmış durumda.
                      </p>
                      <Link
                        href="/clinics"
                        className="mt-2 inline-block text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        İncele
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {!loadingStats && stats && trialClinics === 0 && stats.suspendedClinics === 0 && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 text-center">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    Sistem normal çalışıyor.
                  </p>
                </div>
              )}

              {loadingStats && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-24 rounded-xl bg-slate-100 dark:bg-white/5" />
                  <div className="h-20 rounded-xl bg-slate-100 dark:bg-white/5" />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </SaasMetronicLayout>
  );
}
