'use client';

import { useState, useEffect, useCallback } from 'react';
import { EmployeeService, Employee, EmployeeProfile, EmployeeContact } from '../../../../../lib/services/employee.service';
import { GraduationCap, Briefcase, ShieldCheck, Phone, Plus, Trash2, Pencil } from 'lucide-react';
import Skeleton from '../../../../../components/ui/Skeleton';
import Modal from '../../../../../components/ui/Modal';
import ConfirmModal from '../../../../../components/ui/ConfirmModal';
import { useToastStore } from '../../../../../store/toastStore';

const PERSONNEL_TYPES: Record<string, string> = {
  DOCTOR: 'Doktor',
  ASSISTANT: 'Asistan',
  MANAGER: 'Yönetici',
  OTHER: 'Diğer',
};

const CONTACT_TYPES: Record<string, string> = {
  PHONE: 'Telefon',
  EMAIL: 'Email',
  ADDRESS: 'Adres',
  EMERGENCY_CONTACT: 'Acil Durum Kişisi',
};

const BLOOD_TYPES = ['A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-'];
const EDUCATION_LEVELS = ['İlköğretim', 'Lise', 'Ön Lisans', 'Lisans', 'Yüksek Lisans', 'Doktora'];
const EMPLOYMENT_TYPES = ['Tam Zamanlı', 'Yarı Zamanlı', 'Sözleşmeli', 'Stajyer'];

function InfoCard({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
      <p className="text-[11px] font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-[14px] font-bold text-slate-700 mt-1">{value || '-'}</p>
    </div>
  );
}

export default function GeneralInfoTab({ employee, onUpdated }: { employee: Employee; onUpdated?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [contacts, setContacts] = useState<EmployeeContact[]>([]);
  const addToast = useToastStore(state => state.addToast);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [form, setForm] = useState<Partial<EmployeeProfile>>({ personnelType: 'OTHER' });
  const [nameForm, setNameForm] = useState({ firstName: '', lastName: '' });

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [contactForm, setContactForm] = useState<{ type: EmployeeContact['type']; value: string; label?: string; emergencyName?: string; emergencyRelation?: string }>({ type: 'PHONE', value: '' });
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileData, contactsData] = await Promise.all([
        EmployeeService.getProfile(employee.id),
        EmployeeService.listContacts(employee.id),
      ]);
      setProfile(profileData);
      setContacts(contactsData);
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Personel profili yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [employee.id, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/param-change pattern
    fetchData();
  }, [employee.id, fetchData]);

  const openProfileModal = () => {
    // GET /profile fazladan id/clinicId/employeeId/createdAt/updatedAt alanları döner;
    // bunlar UpsertEmployeeProfileDto'da tanımlı değil ve backend'in
    // forbidNonWhitelisted validasyonu bu alanlar geri gönderilirse isteği reddeder.
    // Bu yüzden yalnızca düzenlenebilir alanları forma alıyoruz.
    const {
      personnelType, birthDate, bloodType, school, educationField, educationLevel,
      graduationYear, diplomaNo, department, position, hireDate, employmentType,
      sgkRegistryNo, calendarColor,
    } = profile || { personnelType: 'OTHER' as const };
    setForm({
      personnelType, birthDate, bloodType, school, educationField, educationLevel,
      graduationYear, diplomaNo, department, position, hireDate, employmentType,
      sgkRegistryNo, calendarColor,
    });
    setNameForm({ firstName: employee.firstName, lastName: employee.lastName });
    setProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      if (nameForm.firstName !== employee.firstName || nameForm.lastName !== employee.lastName) {
        await EmployeeService.update(employee.id, { firstName: nameForm.firstName, lastName: nameForm.lastName });
      }
      const saved = await EmployeeService.upsertProfile(employee.id, form);
      setProfile(saved);
      setProfileModalOpen(false);
      onUpdated?.();
      addToast({ title: 'Başarılı', message: 'Personel profili güncellendi.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Hata', message: 'Profil kaydedilemedi.', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.value.trim()) return;
    try {
      setSavingContact(true);
      const created = await EmployeeService.createContact(employee.id, contactForm);
      setContacts(prev => [...prev, created]);
      setContactModalOpen(false);
      setContactForm({ type: 'PHONE', value: '' });
      addToast({ title: 'Başarılı', message: 'İletişim bilgisi eklendi.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Hata', message: 'İletişim bilgisi eklenemedi.', type: 'error' });
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteContactId) return;
    try {
      await EmployeeService.deleteContact(employee.id, deleteContactId);
      setContacts(prev => prev.filter(c => c.id !== deleteContactId));
      addToast({ title: 'Başarılı', message: 'İletişim bilgisi silindi.', type: 'success' });
    } catch (err) {
      addToast({ title: 'Hata', message: 'İletişim bilgisi silinemedi.', type: 'error' });
    } finally {
      setDeleteContactId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  const isDoctor = profile?.personnelType === 'DOCTOR';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">

      {/* Personel Tipi */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Personel Tipi</span>
          <span className="px-3 py-1 bg-metronic-primary-light text-metronic-primary text-[11px] font-bold rounded-full uppercase tracking-wider">
            {profile ? PERSONNEL_TYPES[profile.personnelType] : 'Tanımlanmadı'}
          </span>
        </div>
        <button onClick={openProfileModal} className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[13px] font-bold hover:bg-slate-100 transition-colors">
          <Pencil size={14} /> Genel Bilgileri Düzenle
        </button>
      </div>

      {/* Kişisel Bilgiler */}
      <div>
        <h4 className="text-base font-bold text-slate-700 flex items-center gap-2 mb-4">
          <ShieldCheck size={18} className="text-metronic-primary" /> Kişisel Bilgiler
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard label="Doğum Tarihi" value={profile?.birthDate ? new Date(profile.birthDate).toLocaleDateString('tr-TR') : null} />
          <InfoCard label="TC Kimlik No" value={employee.nationalId} />
          <InfoCard label="Kan Grubu" value={profile?.bloodType} />
        </div>
      </div>

      {/* İletişim Bilgileri (Çoklu) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-bold text-slate-700 flex items-center gap-2">
            <Phone size={18} className="text-metronic-primary" /> İletişim Bilgileri
          </h4>
          <button onClick={() => setContactModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[12px] font-bold hover:bg-emerald-100 transition-colors">
            <Plus size={14} /> Ekle
          </button>
        </div>
        {contacts.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-400">Henüz iletişim bilgisi eklenmedi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.map(contact => (
              <div key={contact.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{CONTACT_TYPES[contact.type]}{contact.label ? ` • ${contact.label}` : ''}</span>
                  <p className="text-[13px] font-bold text-slate-700">{contact.value}</p>
                  {contact.type === 'EMERGENCY_CONTACT' && (
                    <p className="text-[11px] text-slate-400">{contact.emergencyName} ({contact.emergencyRelation})</p>
                  )}
                </div>
                <button onClick={() => setDeleteContactId(contact.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Eğitim / Mesleki Bilgiler */}
      <div>
        <h4 className="text-base font-bold text-slate-700 flex items-center gap-2 mb-4">
          <GraduationCap size={18} className="text-metronic-primary" /> Eğitim / Mesleki Bilgiler
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard label="Okul" value={profile?.school} />
          <InfoCard label="Bölüm" value={profile?.educationField} />
          <InfoCard label="Eğitim Seviyesi" value={profile?.educationLevel} />
          <InfoCard label="Mezuniyet Yılı" value={profile?.graduationYear} />
          {isDoctor && <InfoCard label="Diploma No" value={profile?.diplomaNo} />}
        </div>
      </div>

      {/* İş Bilgileri */}
      <div>
        <h4 className="text-base font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Briefcase size={18} className="text-metronic-primary" /> İş Bilgileri
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard label="Departman" value={profile?.department} />
          <InfoCard label="Pozisyon" value={profile?.position} />
          <InfoCard label="İşe Giriş Tarihi" value={profile?.hireDate ? new Date(profile.hireDate).toLocaleDateString('tr-TR') : new Date(employee.createdAt).toLocaleDateString('tr-TR')} />
          <InfoCard label="Çalışma Tipi" value={profile?.employmentType} />
        </div>
      </div>

      {/* Resmi Bilgiler */}
      <div>
        <h4 className="text-base font-bold text-slate-700 mb-4">Resmi Bilgiler</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCard label="SGK Sicil No" value={profile?.sgkRegistryNo} />
        </div>
      </div>

      {/* Profil Düzenleme Modalı */}
      <Modal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} title="Genel Bilgileri Düzenle" size="lg">
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Ad</label>
              <input required type="text" value={nameForm.firstName} onChange={(e) => setNameForm({ ...nameForm, firstName: e.target.value })} className="m-input mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Soyad</label>
              <input required type="text" value={nameForm.lastName} onChange={(e) => setNameForm({ ...nameForm, lastName: e.target.value })} className="m-input mt-1" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Personel Tipi</label>
            <select
              value={form.personnelType}
              onChange={(e) => setForm({ ...form, personnelType: e.target.value as EmployeeProfile['personnelType'] })}
              className="m-input mt-1"
            >
              {Object.entries(PERSONNEL_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Doğum Tarihi</label>
              <input type="date" value={form.birthDate?.slice(0, 10) || ''} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className="m-input mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Kan Grubu</label>
              <select value={form.bloodType || ''} onChange={(e) => setForm({ ...form, bloodType: e.target.value || undefined })} className="m-input mt-1">
                <option value="">Seçiniz</option>
                {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Okul</label>
              <input type="text" value={form.school || ''} onChange={(e) => setForm({ ...form, school: e.target.value })} className="m-input mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Bölüm</label>
              <input type="text" value={form.educationField || ''} onChange={(e) => setForm({ ...form, educationField: e.target.value })} className="m-input mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Eğitim Seviyesi</label>
              <select value={form.educationLevel || ''} onChange={(e) => setForm({ ...form, educationLevel: e.target.value || undefined })} className="m-input mt-1">
                <option value="">Seçiniz</option>
                {EDUCATION_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Mezuniyet Yılı</label>
              <input type="number" value={form.graduationYear || ''} onChange={(e) => setForm({ ...form, graduationYear: e.target.value ? Number(e.target.value) : undefined })} className="m-input mt-1" />
            </div>
            {form.personnelType === 'DOCTOR' && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Diploma No</label>
                <input type="text" value={form.diplomaNo || ''} onChange={(e) => setForm({ ...form, diplomaNo: e.target.value })} className="m-input mt-1" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Departman</label>
              <input type="text" value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} className="m-input mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Pozisyon</label>
              <input type="text" value={form.position || ''} onChange={(e) => setForm({ ...form, position: e.target.value })} className="m-input mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">İşe Giriş Tarihi</label>
              <input type="date" value={form.hireDate?.slice(0, 10) || ''} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} className="m-input mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">Çalışma Tipi</label>
              <select value={form.employmentType || ''} onChange={(e) => setForm({ ...form, employmentType: e.target.value || undefined })} className="m-input mt-1">
                <option value="">Seçiniz</option>
                {EMPLOYMENT_TYPES.map((et) => <option key={et} value={et}>{et}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">SGK Sicil No</label>
              <input type="text" value={form.sgkRegistryNo || ''} onChange={(e) => setForm({ ...form, sgkRegistryNo: e.target.value })} className="m-input mt-1" />
            </div>
            {form.personnelType === 'DOCTOR' && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Takvim Rengi</label>
                <input type="color" value={form.calendarColor || '#2563eb'} onChange={(e) => setForm({ ...form, calendarColor: e.target.value })} className="m-input mt-1 h-[38px]" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setProfileModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">İptal</button>
            <button type="submit" disabled={savingProfile} className="px-5 py-2 text-[13px] font-bold text-white bg-metronic-primary rounded-lg hover:bg-blue-600 disabled:opacity-50">
              {savingProfile ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* İletişim Ekleme Modalı */}
      <Modal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} title="İletişim Bilgisi Ekle" size="sm">
        <form onSubmit={handleAddContact} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Tür</label>
            <select value={contactForm.type} onChange={(e) => setContactForm({ ...contactForm, type: e.target.value as EmployeeContact['type'] })} className="m-input mt-1">
              {Object.entries(CONTACT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">Değer</label>
            <input required type="text" value={contactForm.value} onChange={(e) => setContactForm({ ...contactForm, value: e.target.value })} className="m-input mt-1" />
          </div>
          {contactForm.type === 'EMERGENCY_CONTACT' && (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Kişi Adı</label>
                <input type="text" value={contactForm.emergencyName || ''} onChange={(e) => setContactForm({ ...contactForm, emergencyName: e.target.value })} className="m-input mt-1" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Yakınlık</label>
                <input type="text" value={contactForm.emergencyRelation || ''} onChange={(e) => setContactForm({ ...contactForm, emergencyRelation: e.target.value })} className="m-input mt-1" />
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setContactModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">İptal</button>
            <button type="submit" disabled={savingContact} className="px-5 py-2 text-[13px] font-bold text-white bg-metronic-primary rounded-lg hover:bg-blue-600 disabled:opacity-50">
              {savingContact ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteContactId}
        onClose={() => setDeleteContactId(null)}
        onConfirm={handleDeleteContact}
        title="İletişim Bilgisini Sil"
        message="Bu iletişim bilgisini silmek istediğinize emin misiniz?"
      />
    </div>
  );
}
