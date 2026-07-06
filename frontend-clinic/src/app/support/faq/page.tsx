'use client';

import React, { useState } from 'react';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Book, 
  CreditCard, 
  Users, 
  Settings, 
  LifeBuoy,
  MessageCircle,
  Mail,
  PhoneCall
} from 'lucide-react';

const FAQ_CATEGORIES = [
  { id: 'general', name: 'Genel Bilgiler', icon: <Book size={20} />, count: 12 },
  { id: 'finance', name: 'Muhasebe & Ödeme', icon: <CreditCard size={20} />, count: 8 },
  { id: 'patients', name: 'Hasta Yönetimi', icon: <Users size={20} />, count: 15 },
  { id: 'settings', name: 'Sistem Ayarları', icon: <Settings size={20} />, count: 6 },
];

const FAQ_DATA = [
  {
    category: 'general',
    question: 'Pulpax şifremi nasıl sıfırlayabilirim?',
    answer: 'Giriş ekranında bulunan "Şifremi Unuttum" linkine tıklayarak sisteme kayıtlı e-posta adresinize bir sıfırlama bağlantısı gönderebilirsiniz. Ayrıca profil ayarlarınızdan şifre değişikliği yapabilirsiniz.'
  },
  {
    category: 'general',
    question: 'Sistemi çevrimdışı (offline) kullanabilir miyim?',
    answer: 'Pulpax bulut tabanlı bir ERP sistemidir ve tüm verileriniz anlık olarak senkronize edilir. Bu nedenle sistemi kullanmak için aktif bir internet bağlantınızın olması gerekmektedir.'
  },
  {
    category: 'finance',
    question: 'Hastadan aldığım ödemeyi nasıl faturaya dönüştürebilirim?',
    answer: 'Hasta Cari Detay sayfasında ilgili ödemenin yanındaki "İşlem" butonuna tıklayıp "Fatura Oluştur" seçeneğini seçebilirsiniz. Sistem otomatik olarak ödeme tutarı kadar fatura taslağı hazırlayacaktır.'
  },
  {
    category: 'finance',
    question: 'Kredi kartı ile yapılan ödemelerde komisyon oranlarını nasıl tanımlarım?',
    answer: 'Ayarlar > Muhasebe Ayarları > POS Tanımları bölümünden bankalarınızın uyguladığı komisyon oranlarını ve taksit seçeneklerini tanımlayabilirsiniz.'
  },
  {
    category: 'patients',
    question: 'Yeni bir hasta kaydı oluştururken hangi alanlar zorunludur?',
    answer: 'Hasta Adı, Soyadı, TCKN (veya Dosya No) ve Telefon Numarası zorunlu alanlardır. Diğer bilgiler (adres, e-posta, anamnesis vb.) opsiyoneldir ancak detaylı takip için doldurulması önerilir.'
  },
  {
    category: 'settings',
    question: 'Klinik çalışma saatlerini nasıl güncelleyebilirim?',
    answer: 'Ayarlar > Klinik Bilgileri sekmesi altındaki "Çalışma Saatleri" bölümünden haftalık çalışma programınızı ve mola saatlerinizi düzenleyebilirsiniz.'
  }
];

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = FAQ_DATA.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <MetronicLayout title="Yardım Merkezi" breadcrumbs={['Destek Merkezi', 'SSS']}>
      {/* Search Section */}
      <div className="relative mb-12 rounded-3xl overflow-hidden bg-slate-900 px-8 py-16 text-center shadow-2xl">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,#3e97ff_0%,transparent_40%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,#3e97ff_0%,transparent_40%)]"></div>
        </div>
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-[2rem] font-black text-white mb-3 tracking-tight">Size Nasıl Yardımcı Olabiliriz?</h2>
          <p className="text-slate-400 mb-8 text-[15px]">Sorularınızın yanıtlarını arayın veya kategorilere göz atın.</p>
          
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Bir soru veya anahtar kelime girin..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4.5 bg-white/10 border border-white/20 rounded-2xl text-white text-[16px] outline-none focus:ring-4 focus:ring-metronic-primary/20 focus:bg-white/20 transition-all placeholder-slate-500 shadow-xl"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Categories */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-[14px] font-black text-slate-800 dark:text-white uppercase tracking-widest px-4">Kategoriler</h3>
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all ${selectedCategory === 'all' ? 'bg-metronic-primary text-white shadow-lg shadow-metronic-primary/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-3">
                <LifeBuoy size={18} />
                <span className="text-[14px] font-bold">Tüm Sorular</span>
              </div>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>{FAQ_DATA.length}</span>
            </button>
            
            {FAQ_CATEGORIES.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all ${selectedCategory === cat.id ? 'bg-metronic-primary text-white shadow-lg shadow-metronic-primary/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  {cat.icon}
                  <span className="text-[14px] font-bold">{cat.name}</span>
                </div>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>{cat.count}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200/60 dark:border-white/5">
            <h4 className="text-[15px] font-black text-slate-800 dark:text-white mb-2">Hala sorunuz mu var?</h4>
            <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">Aradığınız cevabı bulamadıysanız destek ekibimizle iletişime geçin.</p>
            <button className="w-full py-3 bg-white dark:bg-slate-800 text-metronic-primary rounded-xl text-[13px] font-black shadow-sm border border-slate-200 dark:border-white/10 hover:bg-slate-50 transition-all">
              Bize Ulaşın
            </button>
          </div>
        </div>

        {/* FAQ Content */}
        <div className="lg:col-span-3 space-y-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div 
                  key={index} 
                  className={`bg-white dark:bg-[#1c1f2e] border rounded-2xl transition-all ${isOpen ? 'border-metronic-primary shadow-xl shadow-metronic-primary/5' : 'border-slate-200/60 dark:border-white/5 shadow-sm'}`}
                >
                  <button 
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                  >
                    <span className={`text-[15px] font-bold ${isOpen ? 'text-metronic-primary' : 'text-slate-800 dark:text-white'}`}>{faq.question}</span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isOpen ? 'bg-metronic-primary text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-6 pt-0 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="border-t border-slate-100 dark:border-white/5 pt-5">
                        <p className="text-[14px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <Search size={32} />
              </div>
              <h3 className="text-[16px] font-bold text-slate-800 dark:text-white mb-1">Sonuç Bulunamadı</h3>
              <p className="text-[13px] text-slate-500 max-w-xs">“{searchTerm}” araması için herhangi bir yardım içeriği bulunmamaktadır.</p>
            </div>
          )}

          {/* Contact Section */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
            <div className="p-5 bg-white dark:bg-[#1c1f2e] rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm flex flex-col items-center text-center group hover:border-metronic-primary transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MessageCircle size={24} />
              </div>
              <span className="text-[14px] font-bold text-slate-800 dark:text-white">Canlı Destek</span>
              <span className="text-[12px] text-slate-500 mt-1">9:00 - 18:00</span>
            </div>
            <div className="p-5 bg-white dark:bg-[#1c1f2e] rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm flex flex-col items-center text-center group hover:border-metronic-primary transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Mail size={24} />
              </div>
              <span className="text-[14px] font-bold text-slate-800 dark:text-white">E-Posta</span>
              <span className="text-[12px] text-slate-500 mt-1">support@pulpax.com</span>
            </div>
            <div className="p-5 bg-white dark:bg-[#1c1f2e] rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm flex flex-col items-center text-center group hover:border-metronic-primary transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <PhoneCall size={24} />
              </div>
              <span className="text-[14px] font-bold text-slate-800 dark:text-white">Telefon</span>
              <span className="text-[12px] text-slate-500 mt-1">0850 123 45 67</span>
            </div>
          </div>
        </div>
      </div>
    </MetronicLayout>
  );
}
