'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import { useI18nStore } from '../../../store/i18nStore';
import {
  DollarSign,
  CreditCard,
  FileText,
  Receipt,
  Settings2,
  Clock,
  TrendingUp,
  Building2,
  Wallet,
  BarChart3,
} from 'lucide-react';

const PLANNED_FEATURES = [
  {
    icon: DollarSign,
    title: 'Para Birimi Ayarları',
    description: 'Varsayılan para birimi ve döviz kuru entegrasyon ayarlarını yapılandırın.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    icon: Receipt,
    title: 'Fatura Ayarları',
    description: 'Fatura numaralandırma, fatura şablonları ve otomatik fatura oluşturma kurallarını belirleyin.',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    icon: CreditCard,
    title: 'Ödeme Yöntemleri',
    description: 'Kabul edilen ödeme yöntemlerini, taksit seçeneklerini ve ödeme koşullarını yönetin.',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
  },
  {
    icon: Building2,
    title: 'Muhasebe Hesap Planı',
    description: 'Gelir ve gider kategorilerini, hesap kodlarını ve muhasebe entegrasyonunu yapılandırın.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    icon: TrendingUp,
    title: 'Vergi Ayarları',
    description: 'KDV oranları, vergi muafiyetleri ve vergi raporlama kurallarını düzenleyin.',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
  },
  {
    icon: Wallet,
    title: 'Kasa ve Banka Ayarları',
    description: 'Kasa ve banka hesaplarının varsayılan değerlerini ve işlem limitlerini belirleyin.',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
  },
  {
    icon: FileText,
    title: 'Rapor Şablonları',
    description: 'Mali raporların format ve içerik tercihlerini özelleştirin.',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
  },
  {
    icon: BarChart3,
    title: 'Bütçe ve Hedefler',
    description: 'Aylık ve yıllık gelir hedeflerini, bütçe sınırlarını ve uyarı eşiklerini tanımlayın.',
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-500/10',
  },
];

export default function FinanceSettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { t } = useI18nStore();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return (
      <MetronicLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-slate-500">Yükleniyor...</div>
        </div>
      </MetronicLayout>
    );
  }

  return (
    <MetronicLayout>
      <div className="space-y-6 p-6">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {t('financeSettings')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Muhasebe, ödeme ve fatura ayarlarını yapılandırın
            </p>
          </div>
        </div>

        {/* COMING SOON BANNER */}
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Clock size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">
              Bu modül yakında aktif olacak
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Muhasebe ayarları modülü geliştirme aşamasındadır. Aşağıda planlanan özellikler hakkında
              önizleme görebilirsiniz. Hazır olduğunda bu sayfadan tüm muhasebe ayarlarınızı
              yönetebileceksiniz.
            </p>
          </div>
        </div>

        {/* PLANNED FEATURES GRID */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-metronic-primary/10 flex items-center justify-center text-metronic-primary">
              <Settings2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Planlanan Özellikler</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Yakında kullanıma açılacak muhasebe ayar kategorileri</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANNED_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm p-5 flex flex-col gap-3 opacity-70"
              >
                <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center flex-shrink-0`}>
                  <feature.icon size={20} className={feature.color} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                <div className="mt-auto pt-2 border-t border-slate-100 dark:border-white/5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <Clock size={11} />
                    Yakında
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MetronicLayout>
  );
}
