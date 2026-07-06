'use client';

import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Tabs from '../ui/Tabs';
import { User, FileText, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Anamnez Kategorileri ve Elemanları
const ANAMNESIS_CATEGORIES = [
  {
    id: 'kardiyovaskuler',
    title: 'Kardiyovasküler S.',
    items: [
      'Angina Pektoris', 'Miyokard Enfarktüs', 'Romatizmal Kalp Hastalığı',
      'Akut Eklem Romatizması', 'Kalp Yetmezliği', 'Kardiyovasküler Operasyon',
      'Aritmi', 'Kalp Pili'
    ]
  },
  {
    id: 'kan_hastaliklari',
    title: 'Kan Hastalıkları',
    items: ['Anemi', 'Hemorrajik Diatez', 'Lösemi', 'Elemansayı Anomalisi']
  },
  {
    id: 'kbb',
    title: 'K.B.B Hastalıkları',
    items: ['Frontal Sinüzit', 'Maxillar Sinüzit', 'Deviasyon', 'Tonsil Hipertrofisi']
  },
  {
    id: 'tansiyon',
    title: 'Tansiyon - Arteriyel',
    items: ['Hipertansiyon', 'Hipotansiyon']
  },
  {
    id: 'akciger',
    title: 'Akciğer Hastalıkları',
    items: ['Geçirilmiş Tüberküloz', 'Aktif Tüberküloz', 'Astım', 'Dispne', 'Koah']
  },
  {
    id: 'aliskanliklar',
    title: 'Alışkanlıklar',
    items: ['Bruxism', 'Diş Sıkma', 'Tırnak Yeme', 'Parmak Emme', 'Sigara', 'Pipo', 'Alkol']
  },
  {
    id: 'endokrin',
    title: 'Endokrin Hastalıkları',
    items: ['Diabet', 'Hipotiroidi', 'Hipertiroidi', 'Paratiroidi', 'Gıda Alerjisi']
  },
  {
    id: 'karaciger',
    title: 'Karaciğer Hastalıkları',
    items: ['Hepatit A', 'Hepatit B', 'Hepatit C', 'Karaciğer Yetmezliği']
  },
  {
    id: 'gastro',
    title: 'Gastro İntestinal',
    items: ['Gastrit', 'Ülser', 'Reflü']
  },
  {
    id: 'ilaclar',
    title: 'Kullanılan İlaçlar',
    items: [
      'Kalp', 'Antikoagülan', 'Antihipertansif', 'Antiepileptik', 'Nöroleptik',
      'Sitostatik', 'Antihistaminik', 'ACTH - Kortizon', 'İnsülin', 'Bifosfonat', 'Diğer'
    ]
  },
  {
    id: 'norolojik',
    title: 'Nörolojik-Psiko. Has.',
    items: ['Epilepsi', 'Paralizi', 'Psikiyatrik Tedavi', 'Sefalji']
  },
  {
    id: 'diger',
    title: 'Diğer Hastalıklar',
    items: [
      'Gelişim Anomalisi', 'Kemoterapi', 'Radyoterapi', 'Böbrek Yetmezliği',
      'Hemodiyaliz', 'Böbrek Transplantasyonu', 'Adrenal Yetmezlik',
      'Romatoid Artrit', 'Sifiliz', 'AIDS', 'Hamile', 'İlaç Alerjisi'
    ]
  }
];

export default function AddPatientModal({ isOpen, onClose }: AddPatientModalProps) {
  const [activeTab, setActiveTab] = useState('general');

  // Form State
  const [formData, setFormData] = useState({
    // Genel Bilgiler
    firstName: '', lastName: '', tckn: '', passport: '', birthDate: '', gender: '', nationality: 'Türkiye',
    // İletişim
    phone: '', email: '', city: '', district: '', address: '', zipCode: '',
    // Diğer
    tariff: '', institution: '', group: '', family: '', reference: '', bloodGroup: '',
    contactPerson: '', contactPhone: '', fileNo: 'Oto-üretilecek',
    // Onaylar
    smsConsent: false, kvkkConsent: false, treatmentConsent: false,
  });

  // Dynamic Options
  const [institutions, setInstitutions] = useState(['SGK', 'Özel Sigorta', 'Anlaşmalı Kurum']);
  const [groups, setGroups] = useState(['Standart Hasta', 'VIP Hasta', 'Personel Yakını']);
  const [families, setFamilies] = useState(['Yılmaz Ailesi', 'Demir Ailesi', 'Kaya Ailesi']);

  // Quick Add Modal State
  const [quickAdd, setQuickAdd] = useState<{ isOpen: boolean, type: 'institution' | 'group' | 'family' | null, value: string }>({
    isOpen: false,
    type: null,
    value: ''
  });

  const handleQuickAddSave = () => {
    if (!quickAdd.value.trim() || !quickAdd.type) return;

    if (quickAdd.type === 'institution') {
      setInstitutions(prev => [...prev, quickAdd.value]);
      setFormData(prev => ({ ...prev, institution: quickAdd.value }));
    } else if (quickAdd.type === 'group') {
      setGroups(prev => [...prev, quickAdd.value]);
      setFormData(prev => ({ ...prev, group: quickAdd.value }));
    } else if (quickAdd.type === 'family') {
      setFamilies(prev => [...prev, quickAdd.value]);
      setFormData(prev => ({ ...prev, family: quickAdd.value }));
    }

    setQuickAdd({ isOpen: false, type: null, value: '' });
  };

  // Anamnez State: { [itemName]: { checked: boolean, notes: string } }
  const [anamnesis, setAnamnesis] = useState<Record<string, { checked: boolean; notes: string }>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleAnamnesis = (item: string) => {
    setAnamnesis(prev => ({
      ...prev,
      [item]: {
        checked: !prev[item]?.checked,
        notes: prev[item]?.notes || ''
      }
    }));
  };

  const handleAnamnesisNoteChange = (item: string, note: string) => {
    setAnamnesis(prev => ({
      ...prev,
      [item]: {
        ...prev[item],
        notes: note
      }
    }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onClose();
  };

  const tabs = [
    { id: 'general', label: 'Genel Bilgiler', icon: <User size={16} /> },
    { id: 'anamnesis', label: 'Anamnez', icon: <FileText size={16} /> },
  ];

  const modalFooter = (
    <div className="flex justify-end gap-3 w-full">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
      >
        İptal
      </button>
      <button
        type="submit"
        form="add-patient-form"
        className="px-5 py-2 text-sm font-medium text-white bg-metronic-primary rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
      >
        <Plus size={16} />
        Hastayı Kaydet
      </button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Yeni Hasta Ekle"
        subtitle="Sisteme yeni bir hasta kaydı oluşturun"
        size="xl"
        footer={modalFooter}
      >
        <div className="-mt-4 -mx-6 mb-6">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <form id="add-patient-form" onSubmit={handleSave} className="min-h-[500px]">
          {/* TAB 1: GENEL BİLGİLER */}
          <div style={{ display: activeTab === 'general' ? 'block' : 'none' }} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Hasta Bilgileri */}
            <div>
              <h4 className="text-sm font-bold text-metronic-primary border-b border-metronic-primary/20 pb-2 mb-4">Hasta Bilgileri</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ad <span className="text-red-500">*</span></label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Soyad <span className="text-red-500">*</span></label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>

                {formData.nationality === 'Türkiye' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">TCKN <span className="text-red-500">*</span></label>
                    <input type="text" name="tckn" value={formData.tckn} onChange={handleInputChange} required maxLength={11} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Pasaport No <span className="text-red-500">*</span></label>
                    <input type="text" name="passport" value={formData.passport} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Doğum Tarihi <span className="text-red-500">*</span></label>
                  <input type="date" name="birthDate" value={formData.birthDate} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cinsiyet <span className="text-red-500">*</span></label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none">
                    <option value="">Seçiniz...</option>
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Uyruk <span className="text-red-500">*</span></label>
                  <select name="nationality" value={formData.nationality} onChange={handleInputChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none">
                    <option value="Türkiye">Türkiye</option>
                    <option value="Almanya">Almanya</option>
                    <option value="Amerika Birleşik Devletleri">Amerika Birleşik Devletleri</option>
                    <option value="Azerbaycan">Azerbaycan</option>
                    <option value="Birleşik Krallık">Birleşik Krallık</option>
                    <option value="Fransa">Fransa</option>
                    <option value="Hollanda">Hollanda</option>
                    <option value="Rusya">Rusya</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* İletişim Bilgileri */}
            <div>
              <h4 className="text-sm font-bold text-metronic-primary border-b border-metronic-primary/20 pb-2 mb-4">İletişim Bilgileri</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Telefon <span className="text-red-500">*</span></label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="+90 5XX XXX XX XX" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">E-posta</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">İl</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">İlçe</label>
                  <input type="text" name="district" value={formData.district} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Posta Kodu</label>
                  <input type="text" name="zipCode" value={formData.zipCode} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Açık Adres</label>
                  <textarea name="address" value={formData.address} onChange={handleInputChange} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none resize-none"></textarea>
                </div>
              </div>
            </div>

            {/* Diğer Bilgiler */}
            <div>
              <h4 className="text-sm font-bold text-metronic-primary border-b border-metronic-primary/20 pb-2 mb-4">Diğer Bilgiler</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tarife</label>
                  <select name="tariff" value={formData.tariff} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none">
                    <option value="">Seçiniz...</option>
                    <option value="2026 Yılı TDB Asgari Ücret Tarifesi">2026 Yılı TDB Asgari Ücret Tarifesi</option>
                    <option value="Klinik Özel Fiyat Listesi (2026 İlk Yarı)">Klinik Özel Fiyat Listesi (2026 İlk Yarı)</option>
                    <option value="VIP Hastalar İndirimli Tarife">VIP Hastalar İndirimli Tarife</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kurum</label>
                  <div className="flex gap-2">
                    <select name="institution" value={formData.institution} onChange={handleInputChange} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none">
                      <option value="">Seçiniz...</option>
                      {institutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                    </select>
                    <button type="button" onClick={() => setQuickAdd({ isOpen: true, type: 'institution', value: '' })} className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors border border-slate-300">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Grup</label>
                  <div className="flex gap-2">
                    <select name="group" value={formData.group} onChange={handleInputChange} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none">
                      <option value="">Seçiniz...</option>
                      {groups.map(grp => <option key={grp} value={grp}>{grp}</option>)}
                    </select>
                    <button type="button" onClick={() => setQuickAdd({ isOpen: true, type: 'group', value: '' })} className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors border border-slate-300">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Aile</label>
                  <div className="flex gap-2">
                    <select name="family" value={formData.family} onChange={handleInputChange} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none">
                      <option value="">Seçiniz...</option>
                      {families.map(fam => <option key={fam} value={fam}>{fam}</option>)}
                    </select>
                    <button type="button" onClick={() => setQuickAdd({ isOpen: true, type: 'family', value: '' })} className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors border border-slate-300">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Referans</label>
                  <input type="text" name="reference" value={formData.reference} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kan Grubu</label>
                  <select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none">
                    <option value="">Seçiniz...</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">0+</option>
                    <option value="O-">0-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">İletişim Kişisi (Yakını)</label>
                  <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">İletişim Kişisi Telefonu</label>
                  <input type="text" name="contactPhone" value={formData.contactPhone} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Dosya No</label>
                  <input type="text" name="fileNo" value={formData.fileNo} disabled className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg text-sm cursor-not-allowed outline-none" />
                </div>
              </div>
            </div>

            {/* Onay ve İzinler */}
            <div>
              <h4 className="text-sm font-bold text-metronic-primary border-b border-metronic-primary/20 pb-2 mb-4">Onay ve İzinler</h4>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="smsConsent" checked={formData.smsConsent} onChange={(e) => setFormData({ ...formData, smsConsent: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30" />
                  <span className="text-[13px] font-medium text-slate-700">SMS ile bilgilendirme mesajları almak istiyorum.</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="kvkkConsent" checked={formData.kvkkConsent} onChange={(e) => setFormData({ ...formData, kvkkConsent: e.target.checked })} required className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30" />
                  <span className="text-[13px] font-medium text-slate-700">KVKK Aydınlatma Metnini okudum, anladım ve kabul ediyorum. <span className="text-red-500">*</span></span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="treatmentConsent" checked={formData.treatmentConsent} onChange={(e) => setFormData({ ...formData, treatmentConsent: e.target.checked })} required className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30" />
                  <span className="text-[13px] font-medium text-slate-700">Genel Tıbbi İşlem Onam Metnini okudum ve onaylıyorum. <span className="text-red-500">*</span></span>
                </label>
              </div>
            </div>
          </div>

          {/* TAB 2: ANAMNEZ */}
          <div style={{ display: activeTab === 'anamnesis' ? 'block' : 'none' }} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ANAMNESIS_CATEGORIES.map((category) => (
                <div key={category.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-full hover:border-metronic-primary/30 transition-colors">
                  <div className="bg-metronic-primary-light/40 border-b border-metronic-primary/20 px-4 py-2.5">
                    <h4 className="text-[13px] font-bold text-metronic-primary">{category.title}</h4>
                  </div>
                  <div className="p-3 space-y-1 overflow-y-auto flex-1">
                    {category.items.map((item) => {
                      const isChecked = anamnesis[item]?.checked || false;
                      const isPregnancy = item === 'Hamile';

                      return (
                        <div key={item} className={`flex flex-col mb-1.5 p-1.5 rounded-lg transition-colors ${isChecked ? 'bg-metronic-primary-light/40' : 'hover:bg-slate-50'}`}>
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 cursor-pointer"
                              checked={isChecked}
                              onChange={() => toggleAnamnesis(item)}
                            />
                            <span className={`text-sm font-medium select-none ${isChecked ? 'text-metronic-primary' : 'text-slate-700'}`}>{item}</span>
                          </label>

                          {/* Seçildiğinde açılan input alanı */}
                          {isChecked && (
                            <div className="mt-2 ml-6 animate-in fade-in slide-in-from-top-1 duration-200">
                              {isPregnancy ? (
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Başlangıç Tarihi</label>
                                  <input
                                    type="date"
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:border-metronic-primary focus:ring-1 focus:ring-metronic-primary outline-none"
                                    value={anamnesis[item]?.notes || ''}
                                    onChange={(e) => handleAnamnesisNoteChange(item, e.target.value)}
                                  />
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Açıklama / Detay (Opsiyonel)"
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:border-metronic-primary focus:ring-1 focus:ring-metronic-primary outline-none"
                                  value={anamnesis[item]?.notes || ''}
                                  onChange={(e) => handleAnamnesisNoteChange(item, e.target.value)}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Quick Add Modal */}
      <Modal
        isOpen={quickAdd.isOpen}
        onClose={() => setQuickAdd({ isOpen: false, type: null, value: '' })}
        title={`Yeni ${quickAdd.type === 'institution' ? 'Kurum' : quickAdd.type === 'group' ? 'Grup' : 'Aile'} Ekle`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button onClick={() => setQuickAdd({ isOpen: false, type: null, value: '' })} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            <button onClick={handleQuickAddSave} className="px-4 py-1.5 text-xs font-medium text-white bg-metronic-primary rounded-lg hover:opacity-90 transition-opacity">Ekle</button>
          </div>
        }
      >
        <div className="py-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">{quickAdd.type === 'institution' ? 'Kurum Adı' : quickAdd.type === 'group' ? 'Grup Adı' : 'Aile Adı'}</label>
          <input
            type="text"
            autoFocus
            value={quickAdd.value}
            onChange={(e) => setQuickAdd(prev => ({ ...prev, value: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddSave(); } }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none"
          />
        </div>
      </Modal>
    </>
  );
}
