'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/authStore';
import MetronicLayout from '../../../components/layout/MetronicLayout';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import {
  FileText, Plus, Edit2, Trash2, Smartphone,
  Settings2, AlignLeft, CheckCircle2, Info, Eye,
  Printer, Download, ShieldCheck
} from 'lucide-react';

const CATEGORIES = ['Tümü', 'Onam Formu', 'Vezne Makbuzu', 'Reçete'];

const PLACEHOLDERS = [
  { key: '{{hasta_adi}}', label: 'Hasta Adı', mock: 'Enver Nehir' },
  { key: '{{tckn}}', label: 'T.C. Kimlik No', mock: '12345678901' },
  { key: '{{tarih}}', label: 'İşlem Tarihi', mock: new Date().toLocaleDateString('tr-TR') },
  { key: '{{klinik_adi}}', label: 'Klinik Adı', mock: 'Pulpax Dental Klinik' },
  { key: '{{hekim_adi}}', label: 'Hekim Adı', mock: 'Dr. Ahmet Yılmaz' },
  { key: '{{tedaviler}}', label: 'Uygulanan Tedaviler', mock: 'İmplant Cerrahisi, Kompozit Dolgu' },
  { key: '{{toplam_tutar}}', label: 'Toplam Tutar', mock: '15.500 TL' },
];

const DEFAULT_TEMPLATES = [
  {
    id: '1',
    name: 'İmplant Cerrahisi Aydınlatılmış Onam Formu',
    category: 'Onam Formu',
    content: `AYDINLATILMIŞ ONAM FORMU\n\nKlinik Adı: {{klinik_adi}}\nTarih: {{tarih}}\n\nSayın {{hasta_adi}} (TCKN: {{tckn}}),\n\nHekiminiz {{hekim_adi}} tarafından size önerilen cerrahi tedavi: {{tedaviler}}.\n\nBu işlem, eksik dişlerinizin tamamlanması amacıyla çene kemiğine titanyum vida yerleştirilmesini içermektedir. Riskler, alternatifler ve tedavi sonrası bakım adımları tarafınıza açıklanmıştır. Bu tedaviyi özgür iradenizle onayladığınızı beyan edersiniz.\n\nHasta İmza: _________________             Hekim İmza: _________________`,
    isActive: true,
  },
  {
    id: '2',
    name: 'Klinik Tahsilat Makbuzu',
    category: 'Vezne Makbuzu',
    content: `DİŞ KLİNİĞİ TAHSİLAT MAKBUZU\n\nKlinik: {{klinik_adi}}\nMakbuz Tarihi: {{tarih}}\n\nSayın {{hasta_adi}} tarafından gerçekleştirilen tedavi planı ödemesi:\n\nDetaylı Tedaviler: {{tedaviler}}\n\nToplam Tahsil Edilen Tutar: {{toplam_tutar}}\n\nYapılan tahsilat ilgili tedavilere FIFO esasına göre dağıtılmıştır. Kayıtlarımız yasal mevzuata uygundur.\n\nVezne Yetkilisi İmza: _________________`,
    isActive: true,
  },
  {
    id: '3',
    name: 'Hasta Reçete Formu',
    category: 'Reçete',
    content: `T.C. SAĞLIK BAKANLIĞI ÖZEL DİŞ HEKİMLİĞİ REÇETESİ\n\nKlinik Adı: {{klinik_adi}}\nTarih: {{tarih}}\n\nHasta Adı: {{hasta_adi}}\nTCKN: {{tckn}}\nHekim: {{hekim_adi}}\n\nRx:\n1. Augmentin BID 1000mg Tab (S: 2x1)\n2. Majezik 100mg Tab (S: 2x1 - Tok)\n3. Kloroben Oral Gargara (S: 3x1)\n\nTeşhis/Tedavi: {{tedaviler}}\n\n\nDiploma No / İmza: _________________`,
    isActive: true,
  }
];

export default function DocumentTemplatesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('Tümü');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', category: 'Onam Formu', content: '', isActive: true });
  
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Load templates from LocalStorage
    const stored = localStorage.getItem('pulpax-doc-templates');
    if (stored) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- loading persisted templates from localStorage on mount, standard load-on-mount pattern
        setTemplates(JSON.parse(stored));
      } catch {
        setTemplates(DEFAULT_TEMPLATES);
      }
    } else {
      setTemplates(DEFAULT_TEMPLATES);
      localStorage.setItem('pulpax-doc-templates', JSON.stringify(DEFAULT_TEMPLATES));
    }
  }, [user, router]);

  const saveToStorage = (updatedList: any[]) => {
    setTemplates(updatedList);
    localStorage.setItem('pulpax-doc-templates', JSON.stringify(updatedList));
  };

  const handleOpenModal = (template: any = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({ ...template });
    } else {
      setEditingTemplate(null);
      setFormData({ name: '', category: 'Onam Formu', content: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.content) return;
    
    let updatedList;
    if (editingTemplate) {
      updatedList = templates.map(t => t.id === editingTemplate.id ? { ...formData, id: t.id } : t);
    } else {
      updatedList = [...templates, { ...formData, id: Date.now().toString() }];
    }
    saveToStorage(updatedList);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const updatedList = templates.filter(t => t.id !== id);
    saveToStorage(updatedList);
    setDeleteConfirm(null);
  };

  const insertPlaceholder = (placeholderKey: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormData({ ...formData, content: formData.content + placeholderKey });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const newText = text.substring(0, start) + placeholderKey + text.substring(end);
    
    setFormData({ ...formData, content: newText });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholderKey.length, start + placeholderKey.length);
    }, 0);
  };

  const generatePreview = (text: string) => {
    let preview = text;
    PLACEHOLDERS.forEach(p => {
      preview = preview.split(p.key).join(p.mock);
    });
    return preview;
  };

  const filteredTemplates = activeCategory === 'Tümü' 
    ? templates 
    : templates.filter(t => t.category === activeCategory);

  if (!user) return null;

  return (
    <MetronicLayout title="Belge ve Baskı Şablonları" breadcrumbs={['Ayarlar', 'Şablonlar']}>
      <div className="space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Şablon Tasarım Merkezi</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Klinikte basılacak olan onam formları, makbuzlar ve hekim reçetelerinin A4 şablonlarını yönetin.
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-metronic-primary hover:bg-blue-600 text-white rounded-xl transition-all font-bold text-xs shadow-md shadow-blue-500/20"
          >
            <Plus size={16} />
            YENİ ŞABLON OLUŞTUR
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#1c1f2e] rounded-xl border border-slate-100 dark:border-white/5 p-2 flex flex-wrap gap-2 shadow-sm">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeCategory === category 
                  ? 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <div 
              key={template.id} 
              className="bg-white dark:bg-[#1c1f2e] border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:border-metronic-primary/20 transition-all duration-300"
            >
              <div className="p-5 flex-grow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2">
                      {template.category}
                    </span>
                    <h3 className="text-[13px] font-bold text-slate-800 dark:text-white leading-snug truncate max-w-[200px]">
                      {template.name}
                    </h3>
                  </div>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${template.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
                
                <div className="bg-slate-50 dark:bg-[#151722] rounded-xl p-3.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-5 whitespace-pre-line leading-relaxed font-mono">
                  {template.content}
                </div>
              </div>
              
              <div className="px-5 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  {template.content.length} Karakter
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleOpenModal(template)}
                    className="p-1.5 text-slate-400 hover:text-metronic-primary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    title="Düzenle"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm(template.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Create Button Card */}
          <button 
            onClick={() => handleOpenModal()}
            className="bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-metronic-primary hover:bg-metronic-primary/5 transition-all flex flex-col items-center justify-center p-8 min-h-[220px] text-slate-400 hover:text-metronic-primary"
          >
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-3">
              <Plus size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Yeni Şablon Tasarla</span>
            <span className="text-[10px] mt-1 opacity-70">A4 form veya makbuz şablonu</span>
          </button>
        </div>
      </div>

      {/* Editor Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl" title={editingTemplate ? 'Şablonu Düzenle' : 'Yeni Belge Şablonu'}>
        <div className="flex flex-col lg:flex-row h-[70vh] overflow-hidden">
          
          {/* Left Panel: Form */}
          <div className="flex-grow p-6 overflow-y-auto border-r border-slate-100 dark:border-white/5 space-y-4 max-w-xl">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Şablon Adı</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Örn: Cerrahi İşlem Onam Formu"
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-metronic-primary transition-all text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full mt-1.5 px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-metronic-primary transition-all text-slate-900 dark:text-white font-bold"
                >
                  <option value="Onam Formu">Onam Formu</option>
                  <option value="Vezne Makbuzu">Vezne Makbuzu</option>
                  <option value="Reçete">Reçete</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Şablon Durumu</label>
                <div className="flex items-center h-[38px] mt-1.5 px-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl">
                  <label className="flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="form-checkbox h-4 w-4 text-metronic-primary rounded border-slate-200 focus:ring-0 mr-2 cursor-pointer"
                      checked={formData.isActive} 
                      onChange={() => setFormData({...formData, isActive: !formData.isActive})} 
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Aktif Şablon</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Variable Placeholders */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Settings2 size={13} className="text-metronic-primary" />
                  Değişkenler
                </label>
                <span className="text-[9px] text-slate-400 font-bold uppercase">Tıklandığında İmlece Eklenir</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-xl">
                {PLACEHOLDERS.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => insertPlaceholder(p.key)}
                    className="px-2.5 py-1.5 bg-white dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-metronic-primary hover:border-metronic-primary transition-all shadow-sm"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor Textarea */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <AlignLeft size={13} className="text-metronic-primary" />
                Şablon Metni
              </label>
              <textarea
                ref={textareaRef}
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Form metnini ve değişkenlerini yazın..."
                rows={10}
                className="w-full mt-1.5 px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl text-xs outline-none focus:border-metronic-primary transition-all text-slate-800 dark:text-slate-200 resize-none font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* Right Panel: Simulated A4 Page Mockup */}
          <div className="hidden lg:flex w-[480px] bg-slate-100 dark:bg-[#0f1219] p-6 flex-col overflow-y-auto scrollbar-thin select-none">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Eye size={14} className="text-metronic-primary" /> A4 Baskı Önizlemesi
            </h4>

            {/* A4 Paper Sheet */}
            <div className="w-[390px] min-h-[550px] bg-white border border-slate-200/50 rounded-xl shadow-2xl p-8 flex flex-col font-serif text-[11px] text-slate-800 leading-relaxed relative mx-auto">
              
              {/* Clinical Header Shield */}
              <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-3 mb-4 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-metronic-primary flex items-center justify-center text-white font-bold"><ShieldCheck size={20} /></div>
                <div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 leading-none">PULPAX DENTAL KLİNİK</h4>
                  <span className="text-[7px] font-bold text-slate-400 uppercase leading-none">Ağız ve Diş Sağlığı Merkezi</span>
                </div>
              </div>

              {/* Document Title */}
              <h3 className="text-center font-bold text-[12px] uppercase text-slate-900 mb-6 tracking-wide underline underline-offset-4">
                {formData.name || 'Belge Başlığı'}
              </h3>

              {/* Rendered Text Body */}
              <div className="flex-grow whitespace-pre-line text-justify text-[9.5px]">
                {formData.content ? generatePreview(formData.content) : <span className="text-slate-400 italic">Lütfen içerik girin...</span>}
              </div>

              {/* Document Footer Note */}
              <div className="border-t border-slate-100 pt-3 mt-6 text-[7px] text-slate-400 text-center uppercase tracking-wide">
                Bu belge Pulpax Klinik Yönetim Sistemi ile dijital olarak oluşturulmuştur.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#1c1f2e] flex justify-end gap-3 rounded-b-xl">
          <button 
            onClick={() => setIsModalOpen(false)}
            className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
          >
            İptal
          </button>
          <button 
            onClick={handleSave}
            disabled={!formData.name || !formData.content}
            className="px-6 py-2.5 text-xs font-bold text-white bg-metronic-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-blue-500/20"
          >
            {editingTemplate ? 'Güncelle ve Kaydet' : 'Şablonu Oluştur'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Şablonu Sil"
        message="Bu belge şablonunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      />
    </MetronicLayout>
  );
}
