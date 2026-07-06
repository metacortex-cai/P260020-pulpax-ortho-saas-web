'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { 
  MessageSquare, Plus, Edit2, Trash2, Smartphone, 
  Settings2, AlignLeft, CheckCircle2, Info, FileText
} from 'lucide-react';

const CATEGORIES = ['Tümü', 'Randevu', 'Kutlama', 'Pazarlama', 'Bilgilendirme'];

const PLACEHOLDERS = [
  { key: '{{hasta_adi}}', label: 'Hasta Adı', mock: 'Ahmet Yılmaz' },
  { key: '{{randevu_tarihi}}', label: 'Randevu Tarihi', mock: '25.05.2026' },
  { key: '{{randevu_saati}}', label: 'Randevu Saati', mock: '14:30' },
  { key: '{{klinik_adi}}', label: 'Klinik Adı', mock: 'Pulpax Dental' },
  { key: '{{hekim_adi}}', label: 'Hekim Adı', mock: 'Dr. Ayşe Kaya' },
  { key: '{{kalan_bakiye}}', label: 'Kalan Bakiye', mock: '1.250 TL' },
  { key: '{{son_odeme_tarihi}}', label: 'Son Ödeme Tarihi', mock: '30.05.2026' },
  { key: '{{toplam_borc}}', label: 'Toplam Borç', mock: '5.000 TL' },
];

const INITIAL_TEMPLATES = [
  {
    id: '1',
    name: 'Randevu Hatırlatma (1 Gün Önce)',
    category: 'Randevu',
    content: 'Sayın {{hasta_adi}}, {{randevu_tarihi}} günü saat {{randevu_saati}}\'de {{hekim_adi}} ile olan randevunuzu hatırlatırız. Sağlıklı günler dileriz. {{klinik_adi}}',
    isActive: true,
  },
  {
    id: '2',
    name: 'Doğum Günü Kutlaması',
    category: 'Kutlama',
    content: 'Sayın {{hasta_adi}}, yeni yaşınızı kutlar, sağlık ve mutluluk dolu nice yıllar dileriz. Gülüşünüz hiç eksik olmasın! {{klinik_adi}}',
    isActive: true,
  },
  {
    id: '3',
    name: 'Hoş Geldiniz Mesajı',
    category: 'Bilgilendirme',
    content: 'Sayın {{hasta_adi}}, {{klinik_adi}} ailemize hoş geldiniz. Size en iyi hizmeti sunmak için buradayız.',
    isActive: false,
  },
  {
    id: '4',
    name: 'Yılbaşı Kampanyası',
    category: 'Pazarlama',
    content: 'Yeni yıla bembeyaz bir gülüşle girin! Yıl sonuna kadar diş beyazlatma işlemlerimizde %20 indirim fırsatını kaçırmayın. {{klinik_adi}}',
    isActive: true,
  }
];

export default function SmsTemplatesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [activeCategory, setActiveCategory] = useState('Tümü');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', category: 'Randevu', content: '', isActive: true });
  
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Handle Modal Open
  const handleOpenModal = (template: any = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({ ...template });
    } else {
      setEditingTemplate(null);
      setFormData({ name: '', category: 'Randevu', content: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  // Handle Save
  const handleSave = () => {
    if (!formData.name || !formData.content) return;
    
    if (editingTemplate) {
      setTemplates(templates.map(t => t.id === editingTemplate.id ? { ...formData, id: t.id } : t));
    } else {
      setTemplates([...templates, { ...formData, id: Date.now().toString() }]);
    }
    setIsModalOpen(false);
  };

  // Handle Delete
  const handleDelete = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    setDeleteConfirm(null);
  };

  // Insert Placeholder
  const insertPlaceholder = (placeholderKey: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Fallback if ref fails
      setFormData({ ...formData, content: formData.content + placeholderKey });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const newText = text.substring(0, start) + placeholderKey + text.substring(end);
    
    setFormData({ ...formData, content: newText });
    
    // Set cursor position after insertion (need timeout to let React update state first)
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholderKey.length, start + placeholderKey.length);
    }, 0);
  };

  // Preview Generation
  const generatePreview = (text: string) => {
    let preview = text;
    PLACEHOLDERS.forEach(p => {
      // Replace all occurrences
      preview = preview.split(p.key).join(p.mock);
    });
    return preview;
  };

  // SMS Calculation Logic
  // Using standard 160 GSM chars. If TR characters exist, it drops to 155 (Turkish shift table) or 70 (Unicode).
  // For simplicity, we assume standard GSM here with 160 chars per SMS.
  const smsLength = formData.content.length;
  const smsCount = smsLength === 0 ? 0 : Math.max(1, Math.ceil(smsLength / 160));

  const filteredTemplates = activeCategory === 'Tümü' 
    ? templates 
    : templates.filter(t => t.category === activeCategory);

  if (!user) return null;

  return (
    <MetronicLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f1219] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">SMS Şablonları</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Sistemden otomatik veya manuel gönderilecek kısa mesaj şablonlarını yönetin.</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-metronic-primary hover:bg-metronic-primary/90 text-white rounded-lg transition-colors font-bold text-sm shadow-sm"
            >
              <Plus size={18} />
              YENİ ŞABLON OLUŞTUR
            </button>
          </div>

          {/* FILTERS & STATS */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 p-2 flex flex-wrap gap-2 shadow-sm">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeCategory === category 
                      ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 p-4 flex items-center gap-4 shadow-sm min-w-[160px]">
                <div className="w-10 h-10 rounded-full bg-metronic-primary/10 flex items-center justify-center text-metronic-primary">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Toplam Şablon</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{templates.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* TEMPLATES GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <div key={template.id} className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-md hover:border-metronic-primary/30">
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-md text-xs font-bold mb-3">
                        {template.category}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{template.name}</h3>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${template.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} title={template.isActive ? 'Aktif' : 'Pasif'} />
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-[#262d3d] rounded-lg p-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-4 relative">
                    {template.content}
                  </div>
                </div>
                
                <div className="px-5 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {template.content.length} Karakter ({Math.ceil(template.content.length / 160)} SMS)
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenModal(template)}
                      className="p-1.5 text-slate-500 hover:text-metronic-primary dark:text-slate-400 dark:hover:text-metronic-primary transition-colors"
                      title="Düzenle"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm(template.id)}
                      className="p-1.5 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* OLUŞTUR KARTI */}
            <button 
              onClick={() => handleOpenModal()}
              className="bg-slate-50 dark:bg-white/5 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-metronic-primary hover:bg-metronic-primary/5 transition-all flex flex-col items-center justify-center p-8 min-h-[220px] text-slate-500 hover:text-metronic-primary"
            >
              <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-3">
                <Plus size={24} />
              </div>
              <span className="font-bold">Yeni Şablon Oluştur</span>
              <span className="text-sm mt-1 opacity-75">Baştan yeni bir mesaj kurgulayın</span>
            </button>
          </div>
        </div>

        {/* EDITOR MODAL (XL for split view) */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl" title={editingTemplate ? 'Şablonu Düzenle' : 'Yeni SMS Şablonu'}>
          <div className="flex flex-col lg:flex-row h-full max-h-[80vh] overflow-hidden">
            
            {/* SOL: FORM ALANI */}
            <div className="flex-1 p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/5">
              <div className="space-y-5">
                
                {/* Şablon Adı */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Şablon Adı <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Örn: Randevu Hatırlatıcı (1 Gün Kala)"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary transition-all outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Kategori */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Kategori</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary transition-all outline-none text-slate-900 dark:text-white"
                    >
                      {CATEGORIES.filter(c => c !== 'Tümü').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Durum */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Durum</label>
                    <div className="flex items-center h-10 px-4 bg-slate-50 dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-lg">
                      <label className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input type="checkbox" className="sr-only" checked={formData.isActive} onChange={() => setFormData({...formData, isActive: !formData.isActive})} />
                          <div className={`block w-10 h-6 rounded-full transition-colors ${formData.isActive ? 'bg-metronic-primary' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                          <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isActive ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                          {formData.isActive ? 'Aktif' : 'Pasif'}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Dinamik Değişkenler */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Settings2 size={16} className="text-metronic-primary" />
                      Değişken Ekle
                    </label>
                    <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">İmlecin Bulunduğu Yere Ekler</span>
                  </div>
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-lg">
                    {PLACEHOLDERS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => insertPlaceholder(p.key)}
                        className="px-2.5 py-1.5 bg-white dark:bg-[#262d3d] border border-slate-200 dark:border-white/10 rounded-md text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-metronic-primary hover:text-metronic-primary transition-colors shadow-sm"
                        title={p.key}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mesaj İçeriği */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <AlignLeft size={16} className="text-metronic-primary" />
                      Mesaj İçeriği <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      placeholder="Sayın {{hasta_adi}}, randevunuz..."
                      rows={6}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary transition-all outline-none text-slate-900 dark:text-white resize-none"
                    />
                    
                    {/* Karakter Sayacı */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-3">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-[#262d3d] px-2 py-1 rounded-md shadow-sm border border-slate-200 dark:border-white/5">
                        <span className={smsLength > 160 ? 'text-amber-500 font-bold' : ''}>{smsLength}</span> kar.
                      </div>
                      <div className="text-xs font-bold text-white bg-slate-800 dark:bg-metronic-primary px-2 py-1 rounded-md shadow-sm">
                        {smsCount} SMS
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5">
                    <Info size={14} className="flex-shrink-0 mt-0.5 text-blue-500" />
                    <span>Standart SMS boyutu 160 karakterdir. Türkçe karakterler (ş, ı, ğ, ç vb.) kullanıldığında sistem otomatik olarak bu karakterleri standart harflere dönüştürerek SMS tasarrufu sağlar.</span>
                  </p>
                </div>

              </div>
            </div>

            {/* SAĞ: ÖNİZLEME ALANI (PHONE MOCKUP) */}
            <div className="w-full lg:w-80 bg-slate-100 dark:bg-[#0f1219] p-6 flex flex-col items-center justify-center flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Smartphone size={16} /> Canlı Önizleme
              </h3>
              
              <div className="w-[280px] h-[560px] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border-[8px] border-slate-800 dark:border-slate-950 relative overflow-hidden flex flex-col">
                {/* Phone Notch */}
                <div className="absolute top-0 inset-x-0 h-6 flex justify-center">
                  <div className="w-32 h-5 bg-slate-800 dark:bg-slate-950 rounded-b-xl"></div>
                </div>

                {/* Phone Header */}
                <div className="h-16 border-b border-slate-100 dark:border-white/5 flex items-end justify-center pb-3 px-4 bg-slate-50 dark:bg-slate-900">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">DentPol Klinik</span>
                </div>

                {/* Phone Body (Chat Area) */}
                <div className="flex-1 p-4 bg-[#e5ddd5] dark:bg-[#0b141a] overflow-y-auto flex flex-col justify-end pb-8">
                  {/* SMS Bubble */}
                  <div className="bg-white dark:bg-[#202c33] p-3 rounded-2xl rounded-tl-sm shadow-sm relative max-w-[90%]">
                    <p className="text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words font-sans">
                      {formData.content ? generatePreview(formData.content) : <span className="text-slate-400 italic">Mesaj içeriği burada görünecektir...</span>}
                    </p>
                    <span className="text-[10px] text-slate-400 block text-right mt-1.5">Şimdi</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#1c1f2e] flex justify-end gap-3 rounded-b-xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button 
              onClick={handleSave}
              disabled={!formData.name || !formData.content}
              className="px-6 py-2.5 text-sm font-bold text-white bg-metronic-primary hover:bg-metronic-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCircle2 size={18} />
              {editingTemplate ? 'Değişiklikleri Kaydet' : 'Şablonu Oluştur'}
            </button>
          </div>
        </Modal>

        {/* DELETE CONFIRMATION MODAL */}
        <ConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
          title="Şablonu Sil"
          message="Bu SMS şablonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        />

      </div>
    </MetronicLayout>
  );
}
