'use client';

import { useState } from 'react';
import { Clock, User } from 'lucide-react';
import { PatientService } from '../../../../lib/services/patient.service';
import { useToastStore } from '../../../../store/toastStore';

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

export default function AnamnesisTab({ patient, onUpdate }: { patient: any; onUpdate?: (data: any) => void }) {
  const [anamnesis, setAnamnesis] = useState<Record<string, { checked: boolean; notes: string }>>(
    patient.detailedAnamnesis || {}
  );
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const toggleAnamnesis = (item: string) => {
    if (!isEditing) return;
    setAnamnesis(prev => ({
      ...prev,
      [item]: {
        checked: !prev[item]?.checked,
        notes: prev[item]?.notes || ''
      }
    }));
    setSaved(false);
  };

  const handleAnamnesisNoteChange = (item: string, note: string) => {
    if (!isEditing) return;
    setAnamnesis(prev => ({
      ...prev,
      [item]: {
        ...prev[item],
        notes: note
      }
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await PatientService.update(patient.id, { detailedAnamnesis: anamnesis } as any);
      if (onUpdate) {
        onUpdate(updated);
      }
      setSaved(true);
      setIsEditing(false);
      addToast({
        title: 'Başarılı',
        message: 'Anamnez bilgileri güncellendi.',
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      addToast({
        title: 'Hata',
        message: 'Anamnez kaydedilirken bir hata oluştu.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setAnamnesis(patient.detailedAnamnesis || {});
    setIsEditing(false);
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      {/* Meta bilgi */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
        <div className="flex items-center gap-4 text-[12px] text-slate-400">
          <span className="flex items-center gap-1"><Clock size={13} /> Son güncelleme: 03.05.2026 14:22</span>
          <span className="flex items-center gap-1"><User size={13} /> Dr. Ayşe Kaya</span>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button 
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 text-[13px] font-bold rounded-lg transition-colors bg-metronic-success text-white hover:opacity-90 shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)}
              className="px-5 py-2 text-[13px] font-bold rounded-lg transition-colors bg-metronic-primary text-white hover:opacity-90 shadow-sm"
            >
              {saved ? '✓ Kaydedildi' : 'Düzenle'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {ANAMNESIS_CATEGORIES.map((category) => (
          <div key={category.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-full hover:border-metronic-primary/30 transition-colors">
            <div className="bg-metronic-primary-light/40 border-b border-metronic-primary/20 px-4 py-2.5">
              <h4 className="text-[13px] font-bold text-metronic-primary">{category.title}</h4>
            </div>
            <div className="p-3 space-y-1 overflow-y-auto flex-1 max-h-[300px]">
              {category.items.map((item) => {
                const isChecked = anamnesis[item]?.checked || false;
                const isPregnancy = item === 'Hamile';
                
                return (
                  <div key={item} className={`flex flex-col mb-1.5 p-1.5 rounded-lg transition-colors ${isChecked ? 'bg-metronic-primary-light/40' : (isEditing ? 'hover:bg-slate-50' : 'opacity-90')}`}>
                    <label className={`flex items-center gap-2.5 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
                      <input 
                        type="checkbox" 
                        disabled={!isEditing}
                        className={`w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30 ${isEditing ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
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
                              disabled={!isEditing}
                              className={`w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:border-metronic-primary focus:ring-1 focus:ring-metronic-primary outline-none ${!isEditing ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                              value={anamnesis[item]?.notes || ''}
                              onChange={(e) => handleAnamnesisNoteChange(item, e.target.value)}
                            />
                          </div>
                        ) : (
                          <input 
                            type="text" 
                            disabled={!isEditing}
                            placeholder={isEditing ? "Açıklama / Detay (Opsiyonel)" : ""}
                            className={`w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:border-metronic-primary focus:ring-1 focus:ring-metronic-primary outline-none ${!isEditing ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
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
  );
}
