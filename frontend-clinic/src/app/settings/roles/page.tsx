'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import InfoTooltip from '../../../components/ui/InfoTooltip';
import {
  Clock,
  ShieldCheck,
  Users,
  Lock,
  Settings2,
  Copy,
  Eye,
  Edit2,
  Trash2,
  Search,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';

const PLANNED_FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Yetki Grubu Tanımlama',
    description: 'Klinik ihtiyaçlarına göre sınırsız sayıda özel yetki grubu oluşturun ve yönetin.',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    icon: BarChart3,
    title: 'Modül Bazlı Yetki Matrisi',
    description: 'Her modül için görüntüleme, oluşturma, düzenleme ve silme yetkilerini bağımsız olarak yapılandırın.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    icon: AlertTriangle,
    title: 'KVKK Hassas Veri Kontrolü',
    description: 'Hasta T.C., telefon ve finansal verilerine erişimi yetki grubuna göre maskeleyin veya açın.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    icon: Users,
    title: 'Kullanıcı Atama',
    description: 'Çalışanları yetki gruplarına atayın; birden fazla gruba üyelik ve geçici yetki desteği.',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
  },
  {
    icon: Copy,
    title: 'Grup Klonlama',
    description: 'Mevcut bir yetki grubunu klonlayarak benzer roller için hızlıca yeni gruplar oluşturun.',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
  },
  {
    icon: Eye,
    title: 'Dışa Aktarma Yetkileri',
    description: 'Excel/PDF indirme ve özel fiyat/fatura modallarına erişimi ayrı ayrı kontrol edin.',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
  },
  {
    icon: Edit2,
    title: 'Sistem Rolleri (Salt-Okunur)',
    description: 'Sistem tanımlı "Admin" ve "Süper Admin" rolleri görüntülenebilir ancak düzenlenemez.',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
  },
  {
    icon: Search,
    title: 'Yetki Denetimi & Raporlama',
    description: 'Hangi kullanıcının hangi yetkiyle ne yaptığını sistem hareketleri üzerinden izleyin.',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-500/10',
  },
];

export default function RolesPage() {
  const { user } = useAuthStore();
  const router = useRouter();

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
    <MetronicLayout
      title="Yetki Grupları & Roller"
      breadcrumbs={['Ayarlar', 'Yetki Grupları']}
      infoTooltip={
        <InfoTooltip
          title="Esnek Yetki Grubu Yönetimi"
          description="Sistemdeki modüllerin, CRUD işlemlerinin ve özel modalların görüntülenme yetkilerini sınırsız konfigürasyonda tanımlayabilir ve kullanıcılara atayabilirsiniz."
        />
      }
    >
      <div className="space-y-6 p-6">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              Yetki Grupları & Roller
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Kullanıcı erişim yetkilerini ve rol yapılandırmalarını yönetin
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
              Yetki grupları ve roller modülü geliştirme aşamasındadır. Gerçek izin verileri hazır olmadan
              sahte roller göstermek güvenlik açısından yanıltıcı olacağından, API entegrasyonu tamamlandıktan
              sonra bu sayfa devreye alınacaktır. Aşağıda planlanan özellikler hakkında önizleme görebilirsiniz.
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
              <p className="text-xs text-slate-500 dark:text-slate-400">Yakında kullanıma açılacak yetki yönetim kategorileri</p>
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
