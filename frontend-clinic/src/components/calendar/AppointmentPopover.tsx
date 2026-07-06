import { useState } from 'react';
import Modal from '../ui/Modal';
import { Edit2, Trash2, CheckCircle2, XCircle, CalendarClock, Phone, User, Stethoscope, AlertTriangle, ClipboardList } from 'lucide-react';
import { AppointmentWithPatient } from '../../lib/services/appointment.service';
import { formatCurrency } from '../../lib/utils/formatCurrency';

interface AppointmentPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentWithPatient | null;
  onCheckIn: (id: string) => void;
  onCancel: (id: string) => void;
  onPostpone: (id: string, newDate: string, newStartTime: string, newEndTime: string) => void;
  onEdit: (appointment: AppointmentWithPatient) => void;
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planlandı',
  CONFIRMED: 'Onaylandı',
  CHECKED_IN: 'Hasta Geldi',
  COMPLETED: 'Tamamlandı',
  NO_SHOW: 'Gelmedi',
  CANCELLED: 'İptal Edildi',
  POSTPONED: 'Ertelendi',
};

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  MUAYENE: 'Muayene',
  KONTROL: 'Kontrol',
  TEDAVI: 'Tedavi',
};

export default function AppointmentPopover({ isOpen, onClose, appointment, onCheckIn, onCancel, onPostpone, onEdit }: AppointmentPopoverProps) {
  const [postponing, setPostponing] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');

  if (!appointment) return null;

  const isFinal = ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'POSTPONED'].includes(appointment.status);
  const startTime = new Date(appointment.startOn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(appointment.endOn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date(appointment.startOn).toLocaleDateString('tr-TR');
  const doctorName = appointment.doctor ? `Dt. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` : '—';
  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;

  const startPostpone = () => {
    setNewDate(appointment.startOn.split('T')[0]);
    setNewStartTime(startTime);
    setNewEndTime(endTime);
    setPostponing(true);
  };

  const confirmPostpone = () => {
    if (!newDate || !newStartTime || !newEndTime) return;
    onPostpone(appointment.id, newDate, newStartTime, newEndTime);
    setPostponing(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { setPostponing(false); onClose(); }}
      title={patientName}
      subtitle={`${dateStr} · ${startTime} – ${endTime}`}
      size="sm"
      footer={
        postponing ? (
          <>
            <button onClick={() => setPostponing(false)} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Vazgeç</button>
            <button onClick={confirmPostpone} className="px-4 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors">Ertele</button>
          </>
        ) : (
          <>
            <button onClick={() => onEdit(appointment)} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-colors" title="Düzenle">
              <Edit2 size={15} />
            </button>
            <button onClick={() => onCancel(appointment.id)} className="w-9 h-9 flex items-center justify-center rounded-lg text-red-500 bg-white border border-red-200 hover:bg-red-50 transition-colors" title="İptal Et">
              <Trash2 size={15} />
            </button>
            <div className="flex-1" />
            {!isFinal && (
              <>
                <button onClick={startPostpone} className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                  <CalendarClock size={14} /> Ertele
                </button>
                <button onClick={() => onCancel(appointment.id)} className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                  <XCircle size={14} /> İptal
                </button>
                {appointment.status !== 'CHECKED_IN' && (
                  <button onClick={() => onCheckIn(appointment.id)} className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors">
                    <CheckCircle2 size={14} /> Hasta Geldi
                  </button>
                )}
              </>
            )}
          </>
        )
      }
    >
      {postponing ? (
        <div className="space-y-4 py-2">
          <p className="text-[12px] text-slate-500 font-medium">Yeni randevu tarihi ve saatini seçin. Eski randevu ’Ertelendi’ olarak işaretlenip yeni bir randevu oluşturulacak.</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Yeni Tarih</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="m-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Başlangıç</label>
              <input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} className="m-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bitiş</label>
              <input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="m-input" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 py-1">
          <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
            <Stethoscope size={15} className="text-slate-400" />
            <span className="font-semibold">{doctorName}</span>
            {appointment.dentalChair?.name && <span className="text-slate-400">· {appointment.dentalChair.name}</span>}
          </div>
          {appointment.patient.phone && (
            <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
              <Phone size={15} className="text-slate-400" />
              {appointment.patient.phone}
            </div>
          )}
          {appointment.notes && (
            <div className="flex items-start gap-2 text-[13px] text-slate-600 dark:text-slate-300">
              <User size={15} className="text-slate-400 mt-0.5" />
              <span>{appointment.notes}</span>
            </div>
          )}
          {appointment.isOutsideWorkHours && (
            <div className="flex items-center gap-2 text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> Mesai saatleri dışında
            </div>
          )}
          {!!appointment.treatmentItems?.length && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <ClipboardList size={14} /> Seçilen Tedaviler
              </div>
              <div className="flex flex-col gap-1">
                {appointment.treatmentItems!.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-white/5 rounded-lg text-[12px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {item.tariff?.masterTreatment?.name || 'İşlem'}
                      {item.toothNo != null && <span className="text-slate-400 font-normal"> · Diş {item.toothNo}</span>}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{formatCurrency(Number(item.price))} TL</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="pt-1 flex items-center gap-2">
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded-lg uppercase">
              {STATUS_LABELS[appointment.status] || appointment.status}
            </span>
            {appointment.type && (
              <span className="px-2.5 py-1 bg-metronic-primary-light dark:bg-metronic-primary/10 text-metronic-primary text-[11px] font-bold rounded-lg uppercase">
                {APPOINTMENT_TYPE_LABELS[appointment.type] || appointment.type}
              </span>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
