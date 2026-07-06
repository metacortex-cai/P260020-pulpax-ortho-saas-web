'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '../ui/Modal';
import Tabs from '../ui/Tabs';
import { User, FileText, Plus, AlertCircle } from 'lucide-react';
import { patientSchema, PatientFormData } from '../../lib/schemas/patient.schema';
import { PatientService } from '../../lib/services/patient.service';
import { formatEmail, normalizePhone } from '../../lib/utils/formatContact';
import { COUNTRY_CODES } from '../../lib/utils/countryCodes';
import { TreatmentService } from '../../lib/services/treatment.service';
import { useToastStore } from '../../store/toastStore';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (patient: any) => void;
}

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

export default function AddPatientModal({ isOpen, onClose, onSuccess }: AddPatientModalProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema) as any,
    defaultValues: {
      nationality: 'Türkiye',
      smsConsent: false,
      kvkkConsent: false,
      treatmentConsent: false,
    }
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() is not compiler-memoizable; no low-risk alternative without a broader form-state refactor
  const nationality = watch('nationality');
  const countryCode = watch('countryCode') || '+90';

  // Dynamic Options States
  const [institutions, setInstitutions] = useState(['SGK', 'Özel Sigorta', 'Anlaşmalı Kurum']);
  const [groups, setGroups] = useState(['Standart Hasta', 'VIP Hasta', 'Personel Yakını']);
  const [families, setFamilies] = useState(['Yılmaz Ailesi', 'Demir Ailesi', 'Kaya Ailesi']);

  const [tariffGroups, setTariffGroups] = useState<any[]>([]);
  const [isLoadingTariffs, setIsLoadingTariffs] = useState(false);

  const [quickAdd, setQuickAdd] = useState<{ isOpen: boolean, type: 'institution' | 'group' | 'family' | null, value: string }>({
    isOpen: false,
    type: null,
    value: ''
  });

  const [anamnesis, setAnamnesis] = useState<Record<string, { checked: boolean; notes: string }>>({});

  const handleQuickAddSave = () => {
    if (!quickAdd.value.trim() || !quickAdd.type) return;

    if (quickAdd.type === 'institution') {
      setInstitutions(prev => [...prev, quickAdd.value]);
      setValue('institution', quickAdd.value);
    } else if (quickAdd.type === 'group') {
      setGroups(prev => [...prev, quickAdd.value]);
      setValue('group', quickAdd.value);
    } else if (quickAdd.type === 'family') {
      setFamilies(prev => [...prev, quickAdd.value]);
      setValue('family', quickAdd.value);
    }

    setQuickAdd({ isOpen: false, type: null, value: '' });
  };

  useEffect(() => {
    if (isOpen) {
      reset({
        nationality: 'Türkiye',
        countryCode: '+90',
        smsConsent: false,
        kvkkConsent: false,
        treatmentConsent: false,
      });
      setAnamnesis({});
      setActiveTab('general');
    }
  }, [isOpen, reset]);

  useEffect(() => {
    let mounted = true;
    setIsLoadingTariffs(true);
    TreatmentService.getTariffGroups()
      .then((data) => {
        if (!mounted) return;
        setTariffGroups(data || []);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || 'Tarifeler yüklenirken bir hata oluştu.';
        addToast({ title: 'Hata', message: Array.isArray(msg) ? msg.join(', ') : msg, type: 'error' });
      })
      .finally(() => { if (mounted) setIsLoadingTariffs(false); });

    return () => { mounted = false; };
  }, [addToast]);

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

  const onFormSubmit = async (data: PatientFormData) => {
    setIsSubmitting(true);
    try {
      // Telefonu birleştir: ülke kodu + sadece rakamlar
      const rawPhone = (data.phone || '').replace(/\D/g, '');
      const dialCode = (data.countryCode || '+90').trim();
      const fullPhone = `${dialCode}${rawPhone}`;

      const payload: any = {
        ...data,
        firstName: data.firstName,
        lastName: data.lastName,
        nationality: data.nationality,
        birthDate: data.birthDate ? new Date(data.birthDate).toISOString() : undefined,
        gender: data.gender,
        countryCode: dialCode,
        phone: fullPhone,
        email: data.email ? formatEmail(data.email) : undefined,
        nationalId: data.nationality === 'Türkiye' ? data.tckn : data.passport,
        referral: data.reference,
        emergencyName: data.contactPerson,
        emergencyPhone: data.contactPhone,
        detailedAnamnesis: Object.keys(anamnesis).length > 0 ? anamnesis : undefined,
      };
      // Backend DTO'sunda bulunmayan form-only alanları temizle (whitelist validasyonu bunları reddeder)
      delete payload.tckn;
      delete payload.passport;
      delete payload.reference;
      delete payload.contactPerson;
      delete payload.contactPhone;

      const newPatient = await PatientService.create(payload);

      addToast({
        title: 'Başarılı',
        message: 'Hasta kaydı başarıyla oluşturuldu.',
        type: 'success'
      });

      if (onSuccess) onSuccess(newPatient);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Hasta kaydı oluşturulurken bir hata oluştu.';
      addToast({
        title: 'Hata',
        message: Array.isArray(msg) ? msg.join(', ') : msg,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
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
        disabled={isSubmitting}
        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        İptal
      </button>
      <button
        type="submit"
        form="add-patient-form"
        disabled={isSubmitting}
        className="px-5 py-2 text-sm font-medium text-white bg-metronic-primary rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm disabled:opacity-50"
      >
        {isSubmitting ? 'Kaydediliyor...' : <><Plus size={16} /> Hastayı Kaydet</>}
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

        <form id="add-patient-form" onSubmit={handleSubmit(onFormSubmit as any)} className="min-h-[500px]">
          {/* TAB 1: GENEL BİLGİLER */}
          <div style={{ display: activeTab === 'general' ? 'block' : 'none' }} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Hasta Bilgileri */}
            <div>
              <h4 className="text-sm font-bold text-metronic-primary border-b border-metronic-primary/20 pb-2 mb-4">Hasta Bilgileri</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ad <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    {...register('firstName')} 
                    className={`w-full px-3 py-2 border ${errors.firstName ? 'border-red-500' : 'border-slate-300'} rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none`} 
                  />
                  {errors.firstName && <span className="text-red-500 text-[10px] mt-1">{errors.firstName.message}</span>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Soyad <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    {...register('lastName')} 
                    className={`w-full px-3 py-2 border ${errors.lastName ? 'border-red-500' : 'border-slate-300'} rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none`} 
                  />
                  {errors.lastName && <span className="text-red-500 text-[10px] mt-1">{errors.lastName.message}</span>}
                </div>

                {nationality === 'Türkiye' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">TCKN <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      {...register('tckn')} 
                      maxLength={11} 
                      className={`w-full px-3 py-2 border ${errors.tckn ? 'border-red-500' : 'border-slate-300'} rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none`} 
                    />
                    {errors.tckn && <span className="text-red-500 text-[10px] mt-1">{errors.tckn.message}</span>}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Pasaport No <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      {...register('passport')} 
                      className={`w-full px-3 py-2 border ${errors.passport ? 'border-red-500' : 'border-slate-300'} rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none`} 
                    />
                    {errors.passport && <span className="text-red-500 text-[10px] mt-1">{errors.passport.message}</span>}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Doğum Tarihi <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    {...register('birthDate')} 
                    className={`w-full px-3 py-2 border ${errors.birthDate ? 'border-red-500' : 'border-slate-300'} rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none`} 
                  />
                  {errors.birthDate && <span className="text-red-500 text-[10px] mt-1">{errors.birthDate.message}</span>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cinsiyet <span className="text-red-500">*</span></label>
                  <select 
                    {...register('gender')} 
                    className={`w-full px-3 py-2 border ${errors.gender ? 'border-red-500' : 'border-slate-300'} rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none`}
                  >
                    <option value="">Seçiniz...</option>
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                  {errors.gender && <span className="text-red-500 text-[10px] mt-1">{errors.gender.message}</span>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Uyruk <span className="text-red-500">*</span></label>
                  <select 
                    {...register('nationality')} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none"
                  >
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

              {/* Satır 1: Telefon (geniş) + E-posta */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Telefon - 2 kolon */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Telefon <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <select
                      {...register('countryCode')}
                      defaultValue="+90"
                      className="w-44 flex-shrink-0 px-2 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none bg-white"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.iso} value={c.dial}>{c.name} ({c.dial})</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      {...register('phone')}
                      placeholder="5XX XXX XX XX"
                      className={`flex-1 min-w-0 px-3 py-2 border ${
                        errors.phone ? 'border-red-500' : 'border-slate-300'
                      } rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none`}
                    />
                  </div>
                  {errors.phone && (
                    <span className="text-red-500 text-[10px] mt-1 block">{errors.phone.message}</span>
                  )}
                </div>

                {/* E-posta - 1 kolon */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">E-posta</label>
                  <input
                    type="email"
                    {...register('email')}
                    onBlur={(e) => {
                      const v = e.currentTarget.value;
                      try { setValue('email', formatEmail(v), { shouldValidate: true, shouldDirty: true }); } catch { }
                    }}
                    className={`w-full px-3 py-2 border ${
                      errors.email ? 'border-red-500' : 'border-slate-300'
                    } rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none`}
                  />
                  {errors.email && (
                    <span className="text-red-500 text-[10px] mt-1 block">{errors.email.message}</span>
                  )}
                </div>
              </div>

              {/* Satır 2: İl + İlçe + Posta Kodu */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">İl</label>
                  <input type="text" {...register('city')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">İlçe</label>
                  <input type="text" {...register('district')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Posta Kodu</label>
                  <input type="text" {...register('zipCode')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
              </div>

              {/* Satır 3: Açık Adres */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Açık Adres</label>
                <textarea {...register('address')} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none resize-none" />
              </div>
            </div>

            {/* Diğer Bilgiler */}
            <div>
              <h4 className="text-sm font-bold text-metronic-primary border-b border-metronic-primary/20 pb-2 mb-4">Diğer Bilgiler</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tarife</label>
                  <select {...register('tariff')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none">
                    <option value="">Seçiniz...</option>
                    {isLoadingTariffs ? (
                      <option value="">Yükleniyor...</option>
                    ) : (
                      tariffGroups.map((g: any) => (
                        <option key={g.id || g.name} value={g.id || g.name}>{g.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kurum</label>
                  <div className="flex gap-2">
                    <select {...register('institution')} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none">
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
                    <select {...register('group')} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none">
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
                    <select {...register('family')} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none">
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
                  <input type="text" {...register('reference')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kan Grubu</label>
                  <select {...register('bloodGroup')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none">
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
                  <input type="text" {...register('contactPerson')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">İletişim Kişisi Telefonu</label>
                  <input type="text" {...register('contactPhone')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-metronic-primary/20 focus:border-metronic-primary outline-none" />
                </div>
              </div>
            </div>

            {/* Onay ve İzinler */}
            <div>
              <h4 className="text-sm font-bold text-metronic-primary border-b border-metronic-primary/20 pb-2 mb-4">Onay ve İzinler</h4>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" {...register('smsConsent')} className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30" />
                  <span className="text-[13px] font-medium text-slate-700">SMS ile bilgilendirme mesajları almak istiyorum.</span>
                </label>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register('kvkkConsent')} className={`w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 ${errors.kvkkConsent ? 'border-red-500' : ''}`} />
                    <span className="text-[13px] font-medium text-slate-700">KVKK Aydınlatma Metnini okudum, anladım ve kabul ediyorum. <span className="text-red-500">*</span></span>
                  </label>
                  {errors.kvkkConsent && <span className="text-red-500 text-[10px] ml-7">{errors.kvkkConsent.message}</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" {...register('treatmentConsent')} className={`w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 ${errors.treatmentConsent ? 'border-red-500' : ''}`} />
                    <span className="text-[13px] font-medium text-slate-700">Genel Tıbbi İşlem Onam Metnini okudum ve onaylıyorum. <span className="text-red-500">*</span></span>
                  </label>
                  {errors.treatmentConsent && <span className="text-red-500 text-[10px] ml-7">{errors.treatmentConsent.message}</span>}
                </div>
              </div>
            </div>
            
            {/* Global Error Message if any */}
            {errors.root && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle size={16} />
                <span>{errors.root.message}</span>
              </div>
            )}
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
