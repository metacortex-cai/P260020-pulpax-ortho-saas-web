import { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import ConfirmModal from '../ui/ConfirmModal';
import { Save, AlertTriangle, User, Plus, Trash2, CheckCircle2, History, Stethoscope, Repeat } from 'lucide-react';
import { Appointment } from './AppointmentBlock';
import { TreatmentService, Tariff, TreatmentItem } from '../../lib/services/treatment.service';
import { AppointmentService } from '../../lib/services/appointment.service';
import { ClinicBranch } from '../../lib/services/clinic-branch.service';
import { AppointmentConflictInfo } from '../../lib/types';
import { useToastStore } from '../../store/toastStore';
import { formatCurrency } from '../../lib/utils/formatCurrency';

interface Doctor {
  id: string;
  name: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface Chair {
  id: string;
  name: string;
  clinicBranchId?: string | null;
}

// Spec §4.2: yalnızca mevcut durumdan ulaşılabilir sonraki durumlar listelenir
const STATUS_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ['PLANNED', 'CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CONFIRMED', 'CHECKED_IN', 'NO_SHOW', 'CANCELLED'],
  CHECKED_IN: ['CHECKED_IN', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['COMPLETED'],
  NO_SHOW: ['NO_SHOW'],
  CANCELLED: ['CANCELLED'],
  POSTPONED: ['POSTPONED'],
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planlandı',
  CONFIRMED: 'Onaylandı',
  CHECKED_IN: 'Hasta Geldi',
  COMPLETED: 'Tamamlandı',
  NO_SHOW: 'Gelmedi',
  CANCELLED: 'İptal Edildi',
  POSTPONED: 'Ertelendi',
};

type AppointmentType = 'MUAYENE' | 'KONTROL' | 'TEDAVI';

const APPOINTMENT_TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: 'MUAYENE', label: 'Muayene' },
  { value: 'KONTROL', label: 'Kontrol' },
  { value: 'TEDAVI', label: 'Tedavi' },
];

const TREATMENT_ITEM_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor',
  IN_PROGRESS: 'Devam Ediyor',
};

type RepeatFreq = 'WEEKLY' | 'MONTHLY';
type RepeatEndMode = 'count' | 'until';

// ADR-004 §5: istemci tarafı önizleme — yalnızca görsel özet, otoriter değil
// (gerçek occurrence üretimi backend'de AppointmentSeriesGenerator'da yapılır,
// ay-sonu clamp / DST gibi ayrıntıları burada bilinçli olarak basitleştiriyoruz).
function addRepeatOccurrence(date: Date, freq: RepeatFreq, interval: number, n: number): Date {
  const d = new Date(date);
  if (freq === 'WEEKLY') {
    d.setDate(d.getDate() + interval * 7 * n);
  } else {
    d.setMonth(d.getMonth() + interval * n);
  }
  return d;
}

function computeRepeatPreview(
  startDate: string,
  startTime: string,
  freq: RepeatFreq,
  interval: number,
  endMode: RepeatEndMode,
  count: number,
  until: string,
): { count: number; firstDate: Date; lastDate: Date } | null {
  if (!startDate || !startTime || !interval || interval < 1) return null;
  const start = new Date(`${startDate}T${startTime}:00`);
  if (Number.isNaN(start.getTime())) return null;

  if (endMode === 'count') {
    if (!count || count < 1) return null;
    const capped = Math.min(count, 52);
    return { count: capped, firstDate: start, lastDate: addRepeatOccurrence(start, freq, interval, capped - 1) };
  }

  if (!until) return null;
  const untilDate = new Date(`${until}T23:59:59`);
  if (Number.isNaN(untilDate.getTime()) || untilDate < start) return null;
  let n = 0;
  let last = start;
  // Güvenlik sınırı — backend SAFETY_CAP'e eş değer, önizlemede sonsuz döngüyü önler.
  while (n < 200) {
    const next = addRepeatOccurrence(start, freq, interval, n + 1);
    if (next > untilDate) break;
    last = next;
    n += 1;
  }
  return { count: n + 1, firstDate: start, lastDate: last };
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Partial<Appointment>, force?: boolean) => Promise<AppointmentConflictInfo | void>;
  initialData?: Partial<Appointment>;
  doctors: Doctor[];
  patients: Patient[];
  chairs?: Chair[];
  clinicBranches?: ClinicBranch[];
}

export default function AppointmentModal({ isOpen, onClose, onSave, initialData, doctors, patients = [], chairs = [], clinicBranches = [] }: AppointmentModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'treatments'>('details');
  const [formData, setFormData] = useState<Partial<Appointment>>({
    patientId: '',
    patientName: '',
    doctorId: '',
    chairId: '',
    clinicBranchId: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
    status: 'PLANNED'
  });

  // Treatment State
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [appointmentTreatments, setAppointmentTreatments] = useState<any[]>([]);
  const [selectedTariffId, setSelectedTariffId] = useState('');
  const [selectedTooth, setSelectedTooth] = useState('');
  const [treatmentLoading, setTreatmentLoading] = useState(false);

  // Randevu türü (Muayene / Kontrol / Tedavi — yalnızca biri seçilebilir) ve
  // "Tedavi" seçildiğinde hastanın tamamlanmamış tedavilerinden çoklu seçim
  const [appointmentType, setAppointmentType] = useState<AppointmentType | ''>('');
  const [patientTreatments, setPatientTreatments] = useState<TreatmentItem[]>([]);
  const [selectedTreatmentItemIds, setSelectedTreatmentItemIds] = useState<string[]>([]);
  const [loadingPatientTreatments, setLoadingPatientTreatments] = useState(false);

  // Tekrarla (ADR-004 §5) — yalnızca yeni randevu oluştururken gösterilir.
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState<RepeatFreq>('WEEKLY');
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatEndMode, setRepeatEndMode] = useState<RepeatEndMode>('count');
  const [repeatCount, setRepeatCount] = useState(4);
  const [repeatUntil, setRepeatUntil] = useState('');

  const [error, setError] = useState('');
  const [workHoursWarning, setWorkHoursWarning] = useState<string | null>(null);
  const [checkingWorkHours, setCheckingWorkHours] = useState(false);
  const [saving, setSaving] = useState(false);
  // Spec: hekimin aynı saat diliminde çakışan randevusu bulunursa, çakışan
  // hasta bilgilerini gösteren onay adımı (bkz. LeaveModal'daki eşdeğer akış).
  const [conflict, setConflict] = useState<AppointmentConflictInfo | null>(null);
  const addToast = useToastStore(state => state.addToast);

  const fetchTariffs = useCallback(async () => {
    try {
      const data = await TreatmentService.getTariffs();
      setTariffs(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Reset the form/treatment state whenever the modal transitions to open — either for a
  // fresh appointment or to edit an existing one. Pure derivation from props, no async work,
  // so it's computed during render instead of in an effect.
  const openKey = isOpen ? `open:${initialData?.id || 'new'}` : 'closed';
  const [prevOpenKey, setPrevOpenKey] = useState(openKey);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (initialData?.id) {
      setFormData(initialData);
      // Note: a real appointment fetch would populate this from the backend; for now we
      // derive it directly from initialData.treatmentItems if the caller supplied it.
      setAppointmentTreatments((initialData as any)?.treatmentItems || []);
    } else {
      setFormData({
        patientId: '',
        patientName: '',
        doctorId: initialData?.doctorId || doctors[0]?.id || '',
        chairId: initialData?.chairId || '',
        clinicBranchId: initialData?.clinicBranchId || '',
        date: initialData?.date || new Date().toISOString().split('T')[0],
        startTime: initialData?.startTime || '09:00',
        endTime: initialData?.endTime || '09:15',
        notes: '',
        status: 'PLANNED'
      });
      setAppointmentTreatments([]);
    }
    setAppointmentType(((initialData as any)?.appointmentType as AppointmentType) || '');
    setPatientTreatments([]);
    setSelectedTreatmentItemIds([]);
    setActiveTab('details');
    setError('');
    setConflict(null);
    setSaving(false);
    setRepeatEnabled(false);
    setRepeatFreq('WEEKLY');
    setRepeatInterval(1);
    setRepeatEndMode('count');
    setRepeatCount(4);
    setRepeatUntil('');
  }

  // Fetch the tariff list from the API whenever the modal opens (genuine external call).
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-open pattern
      fetchTariffs();
    }
  }, [isOpen, fetchTariffs]);

  const fetchPatientTreatments = useCallback(async (patientId: string) => {
    setLoadingPatientTreatments(true);
    try {
      const plans = await TreatmentService.findPlansByPatient(patientId);
      const incomplete = plans
        .flatMap(p => p.items || [])
        .filter(item => item.status !== 'COMPLETED' && item.status !== 'CANCELLED');
      setPatientTreatments(incomplete);
    } catch (err) {
      console.error(err);
      setPatientTreatments([]);
    } finally {
      setLoadingPatientTreatments(false);
    }
  }, []);

  // "Tedavi" türü seçiliyken hasta değiştikçe tamamlanmamış tedavileri yeniden çeker;
  // başka bir türe geçilince veya hasta boşalınca listeyi ve seçimleri temizler.
  useEffect(() => {
    setSelectedTreatmentItemIds([]);
    if (appointmentType === 'TEDAVI' && formData.patientId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-dependency-change pattern
      fetchPatientTreatments(formData.patientId);
    } else {
      setPatientTreatments([]);
    }
  }, [appointmentType, formData.patientId, fetchPatientTreatments]);

  function toggleAppointmentType(type: AppointmentType) {
    setAppointmentType(prev => prev === type ? '' : type);
  }

  function toggleTreatmentItem(itemId: string) {
    setSelectedTreatmentItemIds(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  }

  const handleAddTreatment = async () => {
    if (!selectedTariffId) return;
    
    const tariff = tariffs.find(t => t.id === selectedTariffId);
    if (!tariff) return;

    setTreatmentLoading(true);
    try {
      // Create a plan with this single item linked to the appointment
      await TreatmentService.createPlan({
        patientId: formData.patientId!,
        items: [{
          tariffId: selectedTariffId,
          doctorId: formData.doctorId!,
          appointmentId: initialData?.id,
          price: tariff.price,
          toothNo: selectedTooth ? parseInt(selectedTooth) : undefined,
          status: 'COMPLETED' // Mark as completed if done during appointment
        }]
      });

      addToast({ title: 'Başarılı', message: 'Tedavi kaydedildi.', type: 'success' });
      setSelectedTariffId('');
      setSelectedTooth('');
      
      // In a real app, we'd re-fetch appointment details here
      // For this prototype, let's just show it in the list locally
      setAppointmentTreatments(prev => [...prev, {
        id: `temp-${Date.now()}`,
        tariff: tariff,
        toothNo: selectedTooth,
        status: 'COMPLETED',
        price: tariff.price
      }]);

    } catch (err) {
      addToast({ title: 'Hata', message: 'Tedavi kaydedilemedi.', type: 'error' });
    } finally {
      setTreatmentLoading(false);
    }
  };

  const repeatPreview = !initialData?.id && repeatEnabled
    ? computeRepeatPreview(formData.date || '', formData.startTime || '', repeatFreq, repeatInterval, repeatEndMode, repeatCount, repeatUntil)
    : null;

  const buildPayload = (): Partial<Appointment> => ({
    ...formData,
    ...(appointmentType ? { appointmentType } : {}),
    ...(appointmentType === 'TEDAVI' ? { treatmentItemIds: selectedTreatmentItemIds } : {}),
    ...(!initialData?.id && repeatEnabled ? {
      repeat: {
        freq: repeatFreq,
        interval: repeatInterval,
        ...(repeatEndMode === 'count' ? { count: repeatCount } : { until: repeatUntil }),
      },
    } : {}),
  } as any);

  const submit = async (force: boolean) => {
    setSaving(true);
    try {
      const result = await onSave(buildPayload(), force);
      setConflict(result?.conflict ? result : null);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.patientId) {
      setError('Lütfen bir hasta seçiniz.');
      return;
    }

    // Geçmiş tarihlere randevu verilemez — yalnızca yeni randevu oluştururken kontrol edilir,
    // var olan (geçmişte kalmış) bir randevunun düzenlenmesini engellemez.
    if (!initialData?.id && formData.date && formData.startTime) {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      if (startDateTime.getTime() < Date.now()) {
        setError('Geçmiş bir tarih/saat için randevu oluşturulamaz.');
        return;
      }
    }

    // Spec §2.5.2: kaydetmeden önce mesai dışı yumuşak uyarı kontrolü (bloke etmez)
    if (formData.doctorId && formData.date && formData.startTime && formData.endTime) {
      setCheckingWorkHours(true);
      try {
        const startOn = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
        const endOn = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();
        const result = await AppointmentService.checkWorkHours(formData.doctorId, startOn, endOn);
        if (result.outsideWorkHours) {
          setWorkHoursWarning(result.message || 'Bu randevu mesai saatleri dışındadır.');
          setCheckingWorkHours(false);
          return;
        }
      } catch (err) {
        // Kontrol başarısız olsa bile kaydı engelleme — yalnızca bilgilendirme amaçlı bir kontrol
      }
      setCheckingWorkHours(false);
    }

    await submit(false);
  };

  if (conflict) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Mevcut Randevular"
        size="sm"
        footer={
          <>
            <button onClick={() => setConflict(null)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">İptal</button>
            <button onClick={() => submit(true)} disabled={saving} className="px-4 py-2 text-[13px] font-bold bg-metronic-danger text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : 'Yine de Kaydet'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[13px] font-bold">
            <AlertTriangle size={16} /> Hekimin bu saat diliminde {conflict.appointmentCount} randevusu bulunmaktadır.
          </div>
          <div className="max-h-[220px] overflow-y-auto space-y-1.5">
            {conflict.appointments.map(a => (
              <div key={a.id} className="text-[12px] text-slate-600 dark:text-slate-300 px-3 py-2 bg-slate-50 dark:bg-white/5 rounded-lg">
                {a.patientName} — {new Date(a.startOn).toLocaleString('tr-TR')}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={initialData?.id ? "Randevu Detayı" : "Yeni Randevu Kaydı"} size="lg" footer={
      activeTab === 'details' ? (
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
          <button form="appointment-form" type="submit" disabled={checkingWorkHours || saving} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50"><Save size={15} />{checkingWorkHours ? 'Kontrol ediliyor...' : saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </>
      ) : (
        <button onClick={onClose} className="px-6 py-2 text-[13px] font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">Kapat</button>
      )
    }>
      
      {/* Tabs */}
      {initialData?.id && (
        <div className="flex border-b border-slate-100 mb-6 -mt-2">
          <button 
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 text-[13px] font-bold transition-all border-b-2 ${activeTab === 'details' ? 'border-metronic-primary text-metronic-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Randevu Bilgileri
          </button>
          <button 
            onClick={() => setActiveTab('treatments')}
            className={`px-6 py-3 text-[13px] font-bold transition-all border-b-2 ${activeTab === 'treatments' ? 'border-metronic-primary text-metronic-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Uygulanan Tedaviler
          </button>
        </div>
      )}

      {activeTab === 'details' ? (
        <form id="appointment-form" onSubmit={handleSubmit} className="space-y-5 py-2">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-[12px] font-bold flex items-center gap-2 animate-in shake duration-300">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <label className="w-36 flex-shrink-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hasta Seçimi <span className="text-red-500">*</span></label>
              <div className="relative flex-1">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  required
                  disabled={!!initialData?.id}
                  value={formData.patientId || ''}
                  onChange={e => {
                    const pt = patients.find(p => p.id === e.target.value);
                    setFormData({...formData, patientId: e.target.value, patientName: pt ? `${pt.firstName} ${pt.lastName}` : ''});
                  }}
                  className="m-input pl-10"
                >
                  <option value="">Hasta Seçiniz...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="w-36 flex-shrink-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hekim <span className="text-red-500">*</span></label>
              <select required value={formData.doctorId || ''} onChange={e => setFormData({...formData, doctorId: e.target.value})} className="m-input flex-1">
                <option value="">Hekim Seçiniz...</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <label className="w-36 flex-shrink-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tarih <span className="text-red-500">*</span></label>
              <input
                required
                type="date"
                value={formData.date || ''}
                onChange={e => setFormData({...formData, date: e.target.value})}
                min={!initialData?.id ? new Date().toISOString().split('T')[0] : undefined}
                className="m-input flex-1"
              />
            </div>

            <div className="flex items-start gap-4">
              <label className="w-36 flex-shrink-0 pt-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Randevu Türü</label>
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-5">
                  {APPOINTMENT_TYPE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={appointmentType === opt.value}
                        onChange={() => toggleAppointmentType(opt.value)}
                        className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>

                {appointmentType === 'TEDAVI' && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Tamamlanmamış Tedaviler
                    </div>
                    {!formData.patientId ? (
                      <div className="p-4 text-[12px] text-slate-400 text-center">Önce hasta seçiniz.</div>
                    ) : loadingPatientTreatments ? (
                      <div className="p-4 text-[12px] text-slate-400 text-center">Yükleniyor...</div>
                    ) : patientTreatments.length === 0 ? (
                      <div className="p-4 text-[12px] text-slate-400 text-center">Tamamlanmamış tedavi bulunamadı.</div>
                    ) : (
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="bg-white text-slate-400">
                            <th className="w-8 py-2 px-3"></th>
                            <th className="text-left py-2 px-2 font-bold">İşlem</th>
                            <th className="text-left py-2 px-2 font-bold">Diş No</th>
                            <th className="text-left py-2 px-2 font-bold">Durum</th>
                            <th className="text-right py-2 px-3 font-bold">Tutar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientTreatments.map(item => (
                            <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                              <td className="py-2 px-3">
                                <input
                                  type="checkbox"
                                  checked={selectedTreatmentItemIds.includes(item.id)}
                                  onChange={() => toggleTreatmentItem(item.id)}
                                  className="w-4 h-4 rounded border-slate-300 text-metronic-primary focus:ring-metronic-primary"
                                />
                              </td>
                              <td className="py-2 px-2 font-bold text-slate-700">{item.tariff?.masterTreatment?.name || 'İşlem'}</td>
                              <td className="py-2 px-2 text-slate-500">{item.toothNo ?? '-'}</td>
                              <td className="py-2 px-2 text-slate-500">{TREATMENT_ITEM_STATUS_LABELS[item.status] || item.status}</td>
                              <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(Number(item.price))} TL</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="w-36 flex-shrink-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ünit (Diş Koltuğu)</label>
              <select
                value={formData.chairId || ''}
                onChange={e => {
                  const chairId = e.target.value;
                  const chair = chairs.find(ch => ch.id === chairId);
                  setFormData({
                    ...formData,
                    chairId,
                    // Ünit seçilince, ünitin bağlı olduğu şube otomatik önerilir (fiziksel olarak zaten o klinikte bulunur)
                    clinicBranchId: chair?.clinicBranchId || formData.clinicBranchId,
                  });
                }}
                className="m-input flex-1"
              >
                <option value="">Belirtilmemiş</option>
                {chairs.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-36 flex-shrink-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Klinik</label>
              <select value={formData.clinicBranchId || ''} onChange={e => setFormData({...formData, clinicBranchId: e.target.value})} className="m-input flex-1">
                <option value="">Belirtilmemiş</option>
                {clinicBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-36 flex-shrink-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Durum</label>
              <select value={formData.status || 'PLANNED'} onChange={e => setFormData({...formData, status: e.target.value as any})} className="m-input flex-1">
                {(STATUS_TRANSITIONS[formData.status || 'PLANNED'] || [formData.status || 'PLANNED']).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-36 flex-shrink-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Başlangıç <span className="text-red-500">*</span></label>
              <input required type="time" value={formData.startTime || ''} onChange={e => setFormData({...formData, startTime: e.target.value})} className="m-input flex-1" />
            </div>
            <div className="flex items-center gap-4">
              <label className="w-36 flex-shrink-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bitiş <span className="text-red-500">*</span></label>
              <input required type="time" value={formData.endTime || ''} onChange={e => setFormData({...formData, endTime: e.target.value})} className="m-input flex-1" />
            </div>
          </div>

          {!initialData?.id && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setRepeatEnabled(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <span className="flex items-center gap-2 text-[12px] font-bold text-slate-600">
                  <Repeat size={14} /> Tekrarla
                </span>
                <span className={`w-9 h-5 rounded-full transition-colors relative ${repeatEnabled ? 'bg-metronic-primary' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${repeatEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </span>
              </button>
              {repeatEnabled && (
                <div className="p-4 space-y-3 border-t border-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    {(['WEEKLY', 'MONTHLY'] as RepeatFreq[]).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setRepeatFreq(f)}
                        className={`px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-all ${
                          repeatFreq === f
                            ? 'border-metronic-primary bg-metronic-primary/5 text-metronic-primary'
                            : 'border-slate-200 text-slate-500 hover:border-metronic-primary/50'
                        }`}
                      >
                        {f === 'WEEKLY' ? 'Haftalık' : 'Aylık'}
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-[12px] text-slate-500 font-medium">Her</span>
                      <input
                        type="number"
                        min={1}
                        value={repeatInterval}
                        onChange={e => setRepeatInterval(Math.max(1, Number(e.target.value) || 1))}
                        className="m-input !w-16 !h-8 text-center"
                      />
                      <span className="text-[12px] text-slate-500 font-medium">{repeatFreq === 'WEEKLY' ? 'haftada' : 'ayda'} bir</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 cursor-pointer select-none">
                      <input type="radio" name="repeatEndMode" checked={repeatEndMode === 'count'} onChange={() => setRepeatEndMode('count')} />
                      Kaç kez
                    </label>
                    {repeatEndMode === 'count' && (
                      <input
                        type="number"
                        min={1}
                        max={52}
                        value={repeatCount}
                        onChange={e => setRepeatCount(Math.min(52, Math.max(1, Number(e.target.value) || 1)))}
                        className="m-input !w-20 !h-8"
                      />
                    )}
                    <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 cursor-pointer select-none">
                      <input type="radio" name="repeatEndMode" checked={repeatEndMode === 'until'} onChange={() => setRepeatEndMode('until')} />
                      Bitiş tarihi
                    </label>
                    {repeatEndMode === 'until' && (
                      <input type="date" value={repeatUntil} onChange={e => setRepeatUntil(e.target.value)} className="m-input !w-40 !h-8" />
                    )}
                  </div>
                  {repeatPreview && (
                    <p className="text-[12px] text-slate-500 font-medium m-0">
                      {repeatPreview.count} randevu oluşturulacak: {repeatPreview.firstDate.toLocaleDateString('tr-TR')} – {repeatPreview.lastDate.toLocaleDateString('tr-TR')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Not / Ön Bilgi</label>
            <textarea
              value={formData.notes || ''}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="m-input h-24 resize-none"
              placeholder="Randevu ile ilgili notlar..."
            />
          </div>
        </form>
      ) : (
        <div className="space-y-6 py-2 animate-in fade-in duration-300">
          
          {/* Add Treatment Form */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
            <h5 className="text-[13px] font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Stethoscope size={16} className="text-metronic-primary" /> Yapılan İşlem Ekle
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7">
                <select 
                  value={selectedTariffId}
                  onChange={(e) => setSelectedTariffId(e.target.value)}
                  className="m-input text-[13px]"
                >
                  <option value="">İşlem Seçiniz...</option>
                  {tariffs.map(t => (
                    <option key={t.id} value={t.id}>{t.masterTreatment.name} - {formatCurrency(Number(t.price))} TL</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <input 
                  type="number" 
                  placeholder="Diş No"
                  value={selectedTooth}
                  onChange={(e) => setSelectedTooth(e.target.value)}
                  className="m-input text-[13px]" 
                />
              </div>
              <div className="md:col-span-3">
                <button 
                  onClick={handleAddTreatment}
                  disabled={!selectedTariffId || treatmentLoading}
                  className="w-full h-[38px] flex items-center justify-center gap-2 bg-metronic-primary text-white rounded-lg text-[13px] font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
                >
                  {treatmentLoading ? '...' : <Plus size={16} />} Ekle
                </button>
              </div>
            </div>
          </div>

          {/* Treatments List */}
          <div className="space-y-3">
            <h5 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
              <History size={14} /> Bu Randevuda Yapılanlar
            </h5>
            {appointmentTreatments.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
                <p className="text-sm text-slate-400">Henüz bir işlem kaydedilmedi.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appointmentTreatments.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-700">{item.tariff?.masterTreatment?.name || 'İşlem'}</p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {item.toothNo ? `Diş: ${item.toothNo}` : 'Genel'} • {formatCurrency(Number(item.price))} TL
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded-lg uppercase">Tamamlandı</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>

    <ConfirmModal
      isOpen={!!workHoursWarning}
      onClose={() => setWorkHoursWarning(null)}
      onConfirm={() => { setWorkHoursWarning(null); submit(false); }}
      title="Mesai Saati Dışında Randevu"
      message={workHoursWarning}
      confirmLabel="Yine de Kaydet"
      cancelLabel="İptal"
      variant="default"
    />
    </>
  );
}
