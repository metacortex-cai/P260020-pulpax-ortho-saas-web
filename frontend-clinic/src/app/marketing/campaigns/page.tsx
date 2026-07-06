'use client';

import { useState } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import { Mail, MessageSquare, Send, CheckCircle2, Users, BarChart3, Star, Sparkles, Plus } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  triggerType: string;
  template: string;
  recipientsCount: number;
  status: 'ACTIVE' | 'DRAFT' | 'COMPLETED';
  deliveredCount: number;
  conversionRate: string;
}

export default function MarketingCampaignsPage() {
  const [success, setSuccess] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: 'c-01',
      name: 'Doğum Günü Kutlama Kampanyası',
      triggerType: 'Hasta Doğum Günü',
      template: 'Sevgili [HastaAdı], Pulpax Ailesi olarak doğum gününüzü en içten dileklerimizle kutlar, sağlıklı gülüşler dileriz!',
      recipientsCount: 245,
      status: 'ACTIVE',
      deliveredCount: 240,
      conversionRate: '8.4%'
    },
    {
      id: 'c-02',
      name: '6 Ay Rutin Diş Kontrol Hatırlatması',
      triggerType: 'Son Tedaviden 6 Ay Sonra',
      template: 'Merhaba [HastaAdı], sağlıklı ve güzel gülüşünüzü korumak için 6 aylık rutin diş kontrolü zamanınız gelmiştir. Randevu için linke tıklayın: [Link]',
      recipientsCount: 412,
      status: 'ACTIVE',
      deliveredCount: 395,
      conversionRate: '24.1%'
    }
  ]);

  const [form, setForm] = useState({
    name: '',
    triggerType: 'Hasta Doğum Günü',
    template: 'Merhaba [HastaAdı], '
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.template) return;

    const newCampaign: Campaign = {
      id: `c-${Math.floor(Math.random() * 90) + 10}`,
      name: form.name,
      triggerType: form.triggerType,
      template: form.template,
      recipientsCount: 0,
      status: 'DRAFT',
      deliveredCount: 0,
      conversionRate: '0%'
    };

    setCampaigns(prev => [...prev, newCampaign]);
    setForm({ name: '', triggerType: 'Hasta Doğum Günü', template: 'Merhaba [HastaAdı], ' });
    setSuccess('Kampanya taslağı başarıyla oluşturuldu.');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <MetronicLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f1219] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* HEADER */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1.5">Hasta Sadakat & Pazarlama Modülü</h1>
            <p className="text-slate-500 dark:text-slate-400">Doğum günleri ve periyodik rutin diş kontrolleri için otomatik SMS kampanyaları oluşturun.</p>
          </div>

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-xl font-medium flex items-center gap-2">
              <CheckCircle2 size={16} /> {success}
            </div>
          )}

          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#1c1f2e] p-6 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Erişilen Toplam Hasta</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">657</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1c1f2e] p-6 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <MessageSquare size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">İletilen Toplam SMS</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">635</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#1c1f2e] p-6 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                <BarChart3 size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Ortalama Dönüş Oranı</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">16.2%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CAMPAIGN CREATOR */}
            <div className="lg:col-span-1 bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-violet-500" /> Yeni SMS Kampanyası Oluştur
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-500">
                  <div className="space-y-1">
                    <label>Kampanya İsmi</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none text-slate-800 dark:text-white"
                      placeholder="Örn: Yılbaşı Kontrol Hatırlatması"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Tetikleyici Türü (Trigger)</label>
                    <select
                      value={form.triggerType}
                      onChange={e => setForm({ ...form, triggerType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none text-slate-800 dark:text-white"
                    >
                      <option>Hasta Doğum Günü</option>
                      <option>Son Tedaviden 6 Ay Sonra</option>
                      <option>Hekim Muayene Hatırlatma</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label>SMS Şablonu</label>
                    <textarea
                      required
                      value={form.template}
                      onChange={e => setForm({ ...form, template: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg outline-none text-slate-800 dark:text-white font-medium"
                      placeholder="Dinamiği eklemek için [HastaAdı] kullanabilirsiniz."
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/10">
                    <Plus size={16} /> Kampanya Taslağı Oluştur
                  </button>
                </form>
              </div>
            </div>

            {/* LIST OF CAMPAIGNS */}
            <div className="lg:col-span-2 bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Mevcut Kampanyalar ve Performansları</h3>
              <div className="space-y-4">
                {campaigns.map((camp) => (
                  <div key={camp.id} className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col justify-between gap-4 text-xs font-semibold text-slate-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{camp.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-1">Tetikleyici: {camp.triggerType}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        camp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {camp.status}
                      </span>
                    </div>
                    <p className="p-3 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl font-mono text-[11px] text-slate-600 dark:text-slate-400 italic">
                      “{camp.template}”
                    </p>
                    <div className="flex justify-between items-center text-[11px] border-t border-slate-100 dark:border-white/5 pt-3">
                      <span>Gönderilen: <strong>{camp.deliveredCount}</strong></span>
                      <span>Dönüş Oranı: <strong className="text-violet-600">{camp.conversionRate}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MetronicLayout>
  );
}
