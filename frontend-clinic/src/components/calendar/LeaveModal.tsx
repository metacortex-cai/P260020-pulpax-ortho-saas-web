import { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { Save, AlertTriangle, Search } from 'lucide-react';
import { EmployeeService, LeavePayload } from '../../lib/services/employee.service';
import { useToastStore } from '../../store/toastStore';

interface LeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface EmployeeOption {
  id: string;
  name: string;
  isDoctor: boolean;
  position?: string;
}

const LEAVE_TYPES = [
  { value: 'ANNUAL', label: 'Yıllık İzin' },
  { value: 'EXCUSE', label: 'Mazeret İzni' },
  { value: 'MEDICAL', label: 'Hastalık İzni' },
  { value: 'MATERNITY', label: 'Doğum / Ebeveyn İzni' },
  { value: 'UNPAID', label: 'Ücretsiz İzin' },
  { value: 'MILITARY', label: 'Askerlik İzni' },
  { value: 'FORCE_MAJEURE', label: 'Zorlayıcı Sebep İzni' },
  { value: 'OTHER', label: 'Diğer' },
];

export default function LeaveModal({ isOpen, onClose, onSaved }: LeaveModalProps) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [search, setSearch] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('ANNUAL');
  const [isFullDay, setIsFullDay] = useState(true);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Spec §6.3: mevcut randevu çakışması tespit edilirse gösterilen uyarı
  const [conflict, setConflict] = useState<{ appointmentCount: number; appointments: any[] } | null>(null);

  const addToast = useToastStore(state => state.addToast);

  // Fetch the employee list from the API whenever the modal opens (genuine external call).
  useEffect(() => {
    if (isOpen) {
      EmployeeService.findAll().then(list => {
        setEmployees(list.map(e => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          isDoctor: e.isDoctor,
          position: e.isDoctor ? 'HEKİM' : 'PERSONEL',
        })));
      }).catch(() => {});
    }
  }, [isOpen]);

  // Reset the form whenever the modal is (re)opened — pure derivation from the `isOpen`
  // prop with no async work, so it's computed during render instead of in an effect.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setEmployeeId('');
      setSearch('');
      setLeaveType('ANNUAL');
      setIsFullDay(true);
      setStartAt(today);
      setEndAt(today);
      setDescription('');
      setError('');
      setConflict(null);
    }
  }

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(e => e.name.toLowerCase().includes(q) || e.position?.toLowerCase().includes(q));
  }, [employees, search]);

  const buildPayload = (force: boolean): LeavePayload => {
    const startIso = isFullDay ? `${startAt}T00:00:00` : startAt;
    const endIso = isFullDay ? `${endAt}T23:59:59` : endAt;
    return {
      employeeId,
      type: leaveType,
      startAt: new Date(startIso).toISOString(),
      endAt: new Date(endIso).toISOString(),
      force,
      isFullDay,
      description: description || undefined,
    };
  };

  const submit = async (force: boolean) => {
    if (!employeeId) {
      setError('Lütfen bir personel seçiniz.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await EmployeeService.createLeave(buildPayload(force));
      // Takvimden doğrudan eklenen izin anında etkili olmalı (spec §6 — onay adımı yok);
      // ADR-003'teki genel izin-talebi akışının varsayılan 'PENDING' durumunu burada geçersiz kılar.
      await EmployeeService.updateLeaveStatus(created.id, 'APPROVED');
      addToast({ title: 'Başarılı', message: 'İzin kaydedildi.', type: 'success' });
      setConflict(null);
      onSaved();
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      if (err.response?.status === 409 && data?.conflict) {
        setConflict({ appointmentCount: data.appointmentCount, appointments: data.appointments || [] });
      } else {
        addToast({ title: 'Hata', message: data?.message || 'İzin kaydedilemedi.', type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(false);
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
            <AlertTriangle size={16} /> Bu tarihler arasında {conflict.appointmentCount} randevu bulunmaktadır.
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="İzin Ekle"
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">İptal</button>
          <button form="leave-form" type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
            <Save size={15} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </>
      }
    >
      <form id="leave-form" onSubmit={handleSubmit} className="space-y-5 py-2">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-[12px] font-bold flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Personel Adı Soyadı <span className="text-red-500">*</span></label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Personel ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="m-input pl-10"
            />
          </div>
          <div className="max-h-[160px] overflow-y-auto border border-slate-200 dark:border-white/10 rounded-lg mt-1">
            {filteredEmployees.map(e => (
              <div
                key={e.id}
                onClick={() => setEmployeeId(e.id)}
                className={`flex items-center gap-2 px-3 py-2 text-[13px] cursor-pointer transition-colors ${employeeId === e.id ? 'bg-metronic-primary/10 text-metronic-primary font-bold' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'}`}
              >
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${e.isDoctor ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {e.isDoctor ? 'H' : 'P'}
                </span>
                {e.name}
                <span className="text-slate-400 font-normal ml-auto">{e.position}</span>
              </div>
            ))}
            {filteredEmployees.length === 0 && (
              <div className="px-3 py-3 text-[12px] text-slate-400 text-center">Personel bulunamadı.</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">İzin Tipi <span className="text-red-500">*</span></label>
            <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="m-input">
              {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 justify-end">
            <label className="flex items-center gap-2 text-[13px] font-medium text-slate-600 dark:text-slate-300 h-[38px]">
              <input type="checkbox" checked={isFullDay} onChange={e => setIsFullDay(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
              Tam Gün
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Başlangıç <span className="text-red-500">*</span></label>
            <input required type={isFullDay ? 'date' : 'datetime-local'} value={startAt} onChange={e => setStartAt(e.target.value)} className="m-input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bitiş <span className="text-red-500">*</span></label>
            <input required type={isFullDay ? 'date' : 'datetime-local'} value={endAt} onChange={e => setEndAt(e.target.value)} className="m-input" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Açıklama</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="m-input h-20 resize-none" placeholder="Opsiyonel..." maxLength={500} />
        </div>
      </form>
    </Modal>
  );
}
