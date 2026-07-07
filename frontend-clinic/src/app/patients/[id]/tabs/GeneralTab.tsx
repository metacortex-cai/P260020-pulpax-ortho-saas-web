'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit2, Save, X, Plus } from 'lucide-react';
import Modal from '../../../../components/ui/Modal';
import { generalPatientSchema, GeneralPatientFormData } from '../../../../lib/schemas/general-patient.schema';
import { PatientService } from '../../../../lib/services/patient.service';
import { DoctorService, Doctor } from '../../../../lib/services/doctor.service';
import { TreatmentService, Tariff } from '../../../../lib/services/treatment.service';
import { ClinicBranchService, ClinicBranch } from '../../../../lib/services/clinic-branch.service';
import { useToastStore } from '../../../../store/toastStore';
import { COUNTRY_CODES } from '../../../../lib/utils/countryCodes';
import { formatEmail } from '../../../../lib/utils/formatContact';
import { PatientCategories } from '../../../../lib/utils/patientCategories';

interface Props { patient: any; onUpdate: (data: any) => void; }

// API'den gelen hasta objesini form alanlarıyla eşleştirir (nationalId -> tckn/passport, ISO tarih -> yyyy-MM-dd).
// DB'deki null alanlar zod'un .optional() şemasını geçemediği için (zod null'u undefined saymaz) undefined'a çevriliyor.
function toFormValues(p: any) {
  if (!p) return p;
  const sanitized: any = {};
  for (const key of Object.keys(p)) {
    sanitized[key] = p[key] === null ? undefined : p[key];
  }
  return {
    ...sanitized,
    birthDate: p.birthDate ? new Date(p.birthDate).toISOString().slice(0, 10) : '',
    tckn: p.nationality === 'Türkiye' ? (p.nationalId || '') : '',
    passport: p.nationality !== 'Türkiye' ? (p.nationalId || '') : '',
  };
}

// YYYY-MM-DD veya ISO string'i DD.MM.YYYY'ye çevirir. Date nesnesine çevirmez — timezone hatası olmaz.
function formatDisplayDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : dateStr;
}

// Görüntüleme modunda kişi/personel detay sayfasındaki InfoCard ile aynı kutulu
// stili kullanır (bkz. hr/staff/[id]/tabs/GeneralInfoTab.tsx) — alanların net bir
// arka plan/çerçeve ile ayrışması için.
const FIELD = ({ label, value, name, type = 'text', editing, register, errors, disabled = false, options = [], rows = 3, showQuickAdd = false, onQuickAdd = undefined }: any) => {
  const isEditable = editing && !disabled;

  if (!isEditable) {
    return (
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        {type === 'checkbox' ? (
          <div className="flex items-center gap-2 mt-1.5">
            <div className={`w-2 h-2 rounded-full ${value ? 'bg-metronic-success' : 'bg-slate-300'}`} />
            <span className="text-[14px] font-bold text-slate-700">{value ? 'Evet' : 'Hayır'}</span>
          </div>
        ) : (
          <p className={`text-[14px] font-bold mt-1 ${disabled && editing ? 'text-slate-400 italic' : 'text-slate-700'} ${type === 'email' ? 'no-capitalize' : ''}`}>
            {value || <span className="text-slate-300 font-medium">—</span>}
            {disabled && editing && <span className="ml-2 text-[11px] text-amber-500 font-semibold">(Değiştirilemez)</span>}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      {type === 'select' ? (
        showQuickAdd ? (
          <div className="flex items-center gap-2">
            <select
              {...register(name)}
              className={`m-input text-[13px] bg-white flex-1 ${errors?.[name] ? 'border-red-500' : ''}`}
            >
              <option value="">Seçiniz...</option>
              {options.map((opt: any) => (
                <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                  {typeof opt === 'string' ? opt : opt.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={onQuickAdd} className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-sky-100 text-sky-600 rounded-lg hover:bg-sky-200 transition-colors border border-slate-300">
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <select
            {...register(name)}
            className={`m-input text-[13px] bg-white ${errors?.[name] ? 'border-red-500' : ''}`}
          >
            <option value="">Seçiniz...</option>
            {options.map((opt: any) => (
              <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                {typeof opt === 'string' ? opt : opt.label}
              </option>
            ))}
          </select>
        )
      ) : type === 'textarea' ? (
        <textarea
          {...register(name)}
          rows={rows}
          className={`m-input resize-none text-[13px] bg-white ${errors?.[name] ? 'border-red-500' : ''}`}
        />
      ) : type === 'checkbox' ? (
        <label className="flex items-center gap-2 cursor-pointer py-2">
          <input
            type="checkbox"
            {...register(name)}
            className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary/30"
          />
          <span className="text-[13px] font-medium text-slate-600">Onaylandı</span>
        </label>
      ) : (
        <input
          type={type}
          {...register(name)}
          className={`m-input text-[13px] bg-white ${errors?.[name] ? 'border-red-500' : ''}`}
        />
      )}
      {errors?.[name] && <span className="text-red-500 text-[10px] mt-1">{errors[name].message}</span>}
    </div>
  );
};

const NATIONALITIES = ['Türkiye', 'Almanya', 'Amerika Birleşik Devletleri', 'Azerbaycan', 'Birleşik Krallık', 'Fransa', 'Hollanda', 'Rusya', 'Diğer'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const TARIFFS: string[] = [];
const GENDERS = ['Erkek', 'Kadın', 'Diğer'];

export default function GeneralTab({ patient, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore(state => state.addToast);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinicBranches, setClinicBranches] = useState<ClinicBranch[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [tariffGroups, setTariffGroups] = useState<any[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [institutions, setInstitutions] = useState<string[]>(() => PatientCategories.getInstitutions());
  const [groups, setGroups] = useState<string[]>(() => PatientCategories.getGroups());
  const [families, setFamilies] = useState<string[]>(() => PatientCategories.getFamilies());
  const [quickAdd, setQuickAdd] = useState<{ isOpen: boolean; type: 'institution' | 'group' | 'family' | null; value: string }>({ isOpen: false, type: null, value: '' });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
    setValue
  } = useForm<GeneralPatientFormData>({
    resolver: zodResolver(generalPatientSchema) as any,
    defaultValues: toFormValues(patient)
  });

  useEffect(() => {
    reset(toFormValues(patient));
  }, [patient, reset]);

  useEffect(() => {
    let mounted = true;
    setIsLoadingMeta(true);
    Promise.all([DoctorService.findAll(), TreatmentService.getTariffGroups(), ClinicBranchService.findAll(true)])
      .then(([docs, groups, branches]) => {
        if (!mounted) return;
        setDoctors(docs.filter((d: Doctor) => d.isDoctor && d.isActive));
        setTariffGroups(groups || []);
        setClinicBranches(branches || []);
      }).catch((err) => {
      console.error('Failed to load meta:', err);
      addToast({ title: 'Hata', message: 'Veriler yüklenirken hata oluştu.', type: 'error' });
    }).finally(() => { if (mounted) setIsLoadingMeta(false); });

    return () => { mounted = false; };
  }, [addToast]);

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() intentionally returns a live, non-memoizable value; safe here since it's only read for conditional field rendering, not passed to memoized children.
  const currentNationality = watch('nationality');
  const watchedTckn       = watch('tckn');
  const watchedPassport   = watch('passport');
  const watchedBirthDate  = watch('birthDate');

  const onFormSubmit = async (data: GeneralPatientFormData) => {
    setIsSaving(true);
    try {
      // Telefonu birleştir: ülke kodu + numara (sadece rakamlar)
      const rawPhone = (data.phone || '').replace(/\D/g, '');
      const dialCode = (data.countryCode || '+90').trim();
      const fullPhone = `${dialCode}${rawPhone}`;

      const payload: any = {
        ...data,
        countryCode: dialCode,
        phone: fullPhone,
        email: data.email ? formatEmail(data.email) : undefined,
        nationalId: data.nationality === 'Türkiye' ? data.tckn : data.passport,
        clinicBranchId: data.clinicBranchId || undefined,
      };
      // Backend DTO'sunda bulunmayan form-only alanları temizle (whitelist validasyonu bunları reddeder)
      delete payload.tckn;
      delete payload.passport;

      const updated = await PatientService.update(patient.id, payload);
      onUpdate(updated);
      setEditing(false);
      addToast({
        title: 'Başarılı',
        message: 'Hasta bilgileri güncellendi.',
        type: 'success'
      });
    } catch (err) {
      addToast({
        title: 'Hata',
        message: 'Güncelleme sırasında bir hata oluştu.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAddSave = () => {
    const val = quickAdd.value?.trim();
    if (!val || !quickAdd.type) return;

    if (quickAdd.type === 'institution') {
      const updated = PatientCategories.add('institutions', val);
      setInstitutions(updated);
      setValue('institution', val);
    } else if (quickAdd.type === 'group') {
      const updated = PatientCategories.add('groups', val);
      setGroups(updated);
      setValue('group', val);
    } else if (quickAdd.type === 'family') {
      const updated = PatientCategories.add('families', val);
      setFamilies(updated);
      setValue('family', val);
    }

    setQuickAdd({ isOpen: false, type: null, value: '' });
  };

  return (
    <>
      <form onSubmit={handleSubmit(onFormSubmit as any)} className="space-y-6">
      {/* Kişisel Bilgiler */}
      <div className="m-card shadow-none border border-slate-200/60 mb-0">
        <div className="m-card-header">
          <h4 className="m-card-title text-base font-bold text-slate-700">Kişisel Bilgiler</h4>
          <div className="m-card-toolbar gap-2">
            {editing ? (
              <>
                <button 
                  type="button"
                  onClick={() => { setEditing(false); reset(toFormValues(patient)); }}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <X size={13} /> İptal
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-metronic-primary rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <Save size={13} /> {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </>
            ) : (
              <button 
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-metronic-primary bg-metronic-primary-light rounded-lg hover:bg-metronic-primary hover:text-white transition-colors"
              >
                <Edit2 size={13} /> Düzenle
              </button>
            )}
          </div>
        </div>
        <div className="m-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FIELD label="Ad" name="firstName" editing={editing} register={register} errors={errors} value={patient.firstName} />
            <FIELD label="Soyad" name="lastName" editing={editing} register={register} errors={errors} value={patient.lastName} />
            <FIELD label="Uyruk" name="nationality" type="select" options={NATIONALITIES} editing={editing} register={register} errors={errors} value={patient.nationality} />
            
            {currentNationality === 'Türkiye' ? (
              <FIELD label="T.C. Kimlik No" name="tckn" editing={editing} register={register} errors={errors} value={watchedTckn} />
            ) : (
              <FIELD label="Pasaport No" name="passport" editing={editing} register={register} errors={errors} value={watchedPassport} />
            )}

            <FIELD label="Doğum Tarihi" name="birthDate" type="date" editing={editing} register={register} errors={errors} value={formatDisplayDate(watchedBirthDate)} />
            <FIELD label="Cinsiyet" name="gender" type="select" options={GENDERS} editing={editing} register={register} errors={errors} value={patient.gender} />
          </div>
        </div>
      </div>

      {/* İletişim Bilgileri */}
      <div className="m-card shadow-none border border-slate-200/60 mb-0">
        <div className="m-card-header">
          <h4 className="m-card-title text-base font-bold text-slate-700">İletişim Bilgileri</h4>
        </div>
        <div className="m-card-body">
          {/* Satır 1: Telefon (geniş) + E-posta */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {editing ? (
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Telefon</label>
                <div className="flex gap-2">
                  <select
                    {...register('countryCode')}
                    className={`w-32 flex-shrink-0 m-input text-[13px] bg-white ${errors.countryCode ? 'border-red-500' : ''}`}
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.iso} value={c.dial}>{c.name} ({c.dial})</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    {...register('phone')}
                    className={`flex-1 min-w-0 m-input text-[13px] bg-white ${errors.phone ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.phone && <span className="text-red-500 text-[10px] mt-1">{errors.phone.message}</span>}
              </div>
            ) : (
              <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Telefon</p>
                <p className="text-[14px] font-bold text-slate-700 mt-1">
                  {patient.phone || <span className="text-slate-300 font-medium">—</span>}
                </p>
              </div>
            )}

            <FIELD label="E-posta" name="email" type="email" editing={editing} register={register} errors={errors} value={patient.email} />
          </div>

          {/* Satır 2: İl + İlçe + Posta Kodu */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <FIELD label="İl" name="city" editing={editing} register={register} errors={errors} value={patient.city} />
            <FIELD label="İlçe" name="district" editing={editing} register={register} errors={errors} value={patient.district} />
            <FIELD label="Posta Kodu" name="zipCode" editing={editing} register={register} errors={errors} value={patient.zipCode} />
          </div>

          {/* Satır 3: Açık Adres */}
          <div className="grid grid-cols-1 gap-6">
            <FIELD label="Açık Adres" name="address" type="textarea" rows={2} editing={editing} register={register} errors={errors} value={patient.address} />
          </div>
        </div>
      </div>

      {/* Yakın Bilgisi */}
      <div className="m-card shadow-none border border-slate-200/60 mb-0">
        <div className="m-card-header">
          <h4 className="m-card-title text-base font-bold text-slate-700">Yakın Bilgisi (Acil Durum)</h4>
        </div>
        <div className="m-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FIELD label="Ad Soyad" name="emergencyName" editing={editing} register={register} errors={errors} value={patient.emergencyName} />
            <FIELD label="Telefon" name="emergencyPhone" editing={editing} register={register} errors={errors} value={patient.emergencyPhone} />
            <FIELD label="Yakınlık Derecesi" name="emergencyRelation" editing={editing} register={register} errors={errors} value={patient.emergencyRelation} />
          </div>
        </div>
      </div>

      {/* Finansal ve Grup Bilgileri */}
      <div className="m-card shadow-none border border-slate-200/60 mb-0">
        <div className="m-card-header">
          <h4 className="m-card-title text-base font-bold text-slate-700">Diğer Bilgiler</h4>
        </div>
        <div className="m-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FIELD
              label="Tarife"
              name="tariff"
              type="select"
              options={tariffGroups.length ? tariffGroups.map((g: any) => ({ value: g.id || g.name, label: g.name })) : TARIFFS}
              editing={editing}
              register={register}
              errors={errors}
              value={patient.tariff}
            />
            <FIELD label="Kurum" name="institution" type="select" options={institutions} editing={editing} register={register} errors={errors} value={patient.institution} showQuickAdd={editing} onQuickAdd={() => setQuickAdd({ isOpen: true, type: 'institution', value: '' })} />
            <FIELD label="Grup" name="group" type="select" options={groups} editing={editing} register={register} errors={errors} value={patient.group} showQuickAdd={editing} onQuickAdd={() => setQuickAdd({ isOpen: true, type: 'group', value: '' })} />
            <FIELD label="Aile" name="family" type="select" options={families} editing={editing} register={register} errors={errors} value={patient.family} showQuickAdd={editing} onQuickAdd={() => setQuickAdd({ isOpen: true, type: 'family', value: '' })} />
            <FIELD label="Referans Kaynağı" name="referral" editing={editing} register={register} errors={errors} value={patient.referral} />
            <FIELD label="Kan Grubu" name="bloodGroup" type="select" options={BLOOD_GROUPS} editing={editing} register={register} errors={errors} value={patient.bloodGroup} />
            <FIELD
              label="Atanan Hekim"
              name="assignedDoctor"
              type="select"
              options={doctors.map(d => ({ value: d.id, label: `Dt. ${d.firstName} ${d.lastName}` }))}
              editing={editing}
              register={register}
              errors={errors}
              value={(() => {
                // show doctor name when not editing
                if (!editing) {
                  const doc = doctors.find(d => d.id === patient.assignedDoctor);
                  return doc ? `Dt. ${doc.firstName} ${doc.lastName}` : patient.assignedDoctor;
                }
                return patient.assignedDoctor;
              })()}
            />
            <FIELD
              label="Klinik"
              name="clinicBranchId"
              type="select"
              options={clinicBranches.map(b => ({ value: b.id, label: b.name }))}
              editing={editing}
              register={register}
              errors={errors}
              value={(() => {
                if (!editing) {
                  const branch = clinicBranches.find(b => b.id === patient.clinicBranchId);
                  return branch ? branch.name : patient.clinicBranchId;
                }
                return patient.clinicBranchId;
              })()}
            />
            <FIELD label="Dosya No" name="fileNo" editing={editing} register={register} errors={errors} value={patient.fileNo ?? patient.id} disabled />
          </div>
          <div className="mt-6">
            <FIELD label="Notlar" name="notes" type="textarea" rows={3} editing={editing} register={register} errors={errors} value={patient.notes} />
          </div>
        </div>
      </div>

      {/* Onay ve İzinler */}
      <div className="m-card shadow-none border border-slate-200/60 mb-0">
        <div className="m-card-header">
          <h4 className="m-card-title text-base font-bold text-slate-700">Onay ve İzinler</h4>
        </div>
        <div className="m-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FIELD label="SMS Onayı" name="smsConsent" type="checkbox" editing={editing} register={register} errors={errors} value={patient.smsConsent} />
            <FIELD label="KVKK Onayı" name="kvkkConsent" type="checkbox" editing={editing} register={register} errors={errors} value={patient.kvkkConsent} />
            <FIELD label="Tedavi Onayı" name="treatmentConsent" type="checkbox" editing={editing} register={register} errors={errors} value={patient.treatmentConsent} />
          </div>
        </div>
      </div>
      </form>

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
