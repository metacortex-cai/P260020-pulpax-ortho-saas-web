'use client';

import { useState, useEffect } from 'react';
import { Check, Zap, Crown, Rocket, Star, Heart, Sliders } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { formatCurrency } from '../../lib/utils/formatCurrency';

interface Plan {
  id: string;
  name: string;
  price: number | string;
  yearlyPrice: number | string;
  maxDentists: number;
  features: string[];
  popular: boolean;
}

const FALLBACK_PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter (Solo Hekim)',
    price: 390,
    yearlyPrice: 290,
    maxDentists: 1,
    features: [
      "1 Hekim Desteği",
      "Sınırsız Sekreter/Personel",
      "Temel Diş Şeması",
      "Randevu Takvimi",
      "Gelir-Gider Takibi",
      "E-posta ile Destek"
    ],
    popular: false
  },
  {
    id: 'professional',
    name: 'Professional (Klinik)',
    price: 350,
    yearlyPrice: 260,
    maxDentists: 5,
    features: [
      "2-5 Hekim Desteği",
      "Geliştirilmiş Stok/Depo Kontrolü",
      "Personel Prim/Komisyon Sistemi",
      "Laboratuvar Takip Modülü",
      "Öncelikli Destek"
    ],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Zincir / Enterprise',
    price: "Teklif Alın",
    yearlyPrice: "Teklif Alın",
    maxDentists: 999,
    features: [
      "5+ Hekim Desteği",
      "Çoklu Şube Yönetimi",
      "Custom API Erişimi",
      "Özel SLA ve Destek Hattı",
      "Kişiselleştirilmiş Eğitim"
    ],
    popular: false
  }
];

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [dentistsCount, setDentistsCount] = useState<number>(1);
  const [isAnnual, setIsAnnual] = useState<boolean>(true);

  useEffect(() => {
    // Dynamic fetch from SaaS API
    axios.get('https://localhost:6010/api/v1/pricing/plans')
      .then(response => {
        if (Array.isArray(response.data)) {
          setPlans(response.data);
        }
      })
      .catch(() => {
        // Fallback silently if API is offline
        setPlans(FALLBACK_PLANS);
      });
  }, []);

  // Determine active plan based on dentist slider count
  const activePlanId = dentistsCount === 1 
    ? 'starter' 
    : dentistsCount <= 5 
      ? 'professional' 
      : 'enterprise';

  const getPlanPrice = (plan: Plan) => {
    if (typeof plan.price === 'string') {
      return plan.price;
    }
    const basePrice = isAnnual ? (plan.yearlyPrice as number) : (plan.price as number);
    const total = basePrice * dentistsCount;
    return `${formatCurrency(total)} ₺`;
  };

  const getPlanIcon = (id: string) => {
    switch (id) {
      case 'starter':
        return <Rocket className="text-blue-500" size={24} />;
      case 'professional':
        return <Zap className="text-emerald-500" size={24} />;
      case 'enterprise':
      default:
        return <Crown className="text-amber-500" size={24} />;
    }
  };

  return (
    <div className="min-h-screen bg-metronic-body dark:bg-[#0f1117] py-20 px-8">
      <div className="max-w-6xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-metronic-primary/10 border border-metronic-primary/20 rounded-full text-metronic-primary text-[11px] font-bold uppercase tracking-wider mb-6">
          <Star size={12} className="fill-current" /> Esnek Fiyatlandırma
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white mb-6">İhtiyacınıza Uygun Planı Seçin</h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium mb-12">
          Kliniğinizin büyüklüğü ne olursa olsun, hekim sayısına göre dinamik ölçeklenen adil fiyatlandırma planlarımız.
        </p>

        {/* Dynamic Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-bold ${!isAnnual ? 'text-metronic-primary' : 'text-slate-400'}`}>Aylık Ödeme</span>
          <button 
            onClick={() => setIsAnnual(!isAnnual)}
            className="w-14 h-8 bg-slate-200 dark:bg-white/10 rounded-full p-1 transition-all duration-300 relative"
          >
            <div className={`w-6 h-6 bg-metronic-primary rounded-full transition-all duration-300 absolute ${isAnnual ? 'right-1' : 'left-1'}`} />
          </button>
          <span className={`text-sm font-bold flex items-center gap-1.5 ${isAnnual ? 'text-metronic-primary' : 'text-slate-400'}`}>
            Yıllık Ödeme 
            <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full font-black">%25 Tasarruf</span>
          </span>
        </div>

        {/* Dynamic Dentist Count Slider */}
        <div className="max-w-xl mx-auto bg-white dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl mb-16">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Sliders size={16} /> Aktif Çalışan Hekim Sayısı
            </span>
            <span className="text-2xl font-black text-metronic-primary bg-metronic-primary/10 px-4 py-1.5 rounded-2xl">
              {dentistsCount} Hekim
            </span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={dentistsCount}
            onChange={(e) => setDentistsCount(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-bold mt-2">
            <span>1 (Solo)</span>
            <span>2 Hekim</span>
            <span>3 Hekim</span>
            <span>4 Hekim</span>
            <span>5 (Klinik Limit)</span>
            <span>5+ (Kurumsal)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isActive = plan.id === activePlanId;
          return (
            <div 
              key={plan.id} 
              className={`relative p-8 md:p-10 rounded-[2.5rem] bg-white dark:bg-[#1c1f2e] border transition-all duration-300 flex flex-col ${
                isActive 
                  ? 'border-metronic-primary shadow-2xl shadow-metronic-primary/10 ring-4 ring-metronic-primary/5 scale-105 z-10' 
                  : 'border-slate-200 dark:border-white/10 shadow-xl opacity-60'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-metronic-primary text-white px-4 py-1.5 rounded-full text-[12px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <Heart size={12} className="fill-current animate-pulse" /> Önerilen Paketiniz
                </div>
              )}

              <div className="mb-8">
                 <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-6">
                   {getPlanIcon(plan.id)}
                 </div>
                 <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">{plan.name}</h3>
                 <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">{
                   plan.id === 'starter' 
                     ? 'Tek hekimli muayenehaneler için ideal çözüm.'
                     : plan.id === 'professional'
                       ? 'Büyüyen klinikler için gelişmiş araçlar.'
                       : 'Çok şubeli ve büyük sağlık merkezleri.'
                 }</p>
              </div>

              <div className="mb-8">
                 <div className="flex items-baseline gap-1">
                   <span className="text-4xl font-black text-slate-800 dark:text-white">
                     {getPlanPrice(plan)}
                   </span>
                   {typeof plan.price === 'number' && (
                     <span className="text-slate-400 font-bold">/ay</span>
                   )}
                 </div>
                 {typeof plan.price === 'number' && (
                   <span className="text-[11px] text-slate-400 font-bold block mt-1">
                     (Hekim başına {isAnnual ? plan.yearlyPrice : plan.price} ₺/ay olarak hesaplanır)
                   </span>
                 )}
              </div>

              <div className="space-y-4 mb-10 flex-1">
                 {plan.features.map((feature, j) => (
                   <div key={j} className="flex items-center gap-3">
                     <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                       <Check size={12} strokeWidth={4} />
                     </div>
                     <span className="text-[13px] font-bold text-slate-600 dark:text-slate-300">{feature}</span>
                   </div>
                 ))}
              </div>

              <button className={`w-full h-14 rounded-2xl font-bold transition-all active:scale-95 text-base ${
                isActive 
                  ? 'bg-metronic-primary text-white hover:bg-blue-600 shadow-lg shadow-metronic-primary/20'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}>
                {plan.id === 'enterprise' ? 'Bize Ulaşın' : 'Satın Al'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-20 text-center">
         <p className="text-slate-500 dark:text-slate-400 font-medium">
           Sorularınız mı var? <Link href="#" className="text-metronic-primary font-bold hover:underline">Destek ekibimizle görüşün</Link>
         </p>
      </div>
    </div>
  );
}
