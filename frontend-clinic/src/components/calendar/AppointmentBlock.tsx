import { Clock, AlertTriangle } from 'lucide-react';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  chairId?: string | null;
  clinicBranchId?: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  fileNo?: number | null;
  notes: string;
  isOutsideWorkHours?: boolean;
  status: 'BEKLİYOR' | 'GELDİ' | 'GELMEDİ' | 'İPTAL' | 'PLANNED' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'POSTPONED';
}

interface AppointmentBlockProps {
  appointment: Appointment;
  doctorColor?: string;
  onClick: (app: Appointment) => void;
  style?: React.CSSProperties;
  now?: Date;
}

const STATUS_COLORS: Record<string, string> = {
  'BEKLİYOR': 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700/50',
  'PLANNED': 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700/50',
  'CONFIRMED': 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700/50',
  'CHECKED_IN': 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700/50',
  'GELDİ': 'bg-metronic-success-light border-metronic-success/40 dark:bg-metronic-success/20 dark:border-metronic-success/30',
  'COMPLETED': 'bg-metronic-success-light border-metronic-success/40 dark:bg-metronic-success/20 dark:border-metronic-success/30',
  'GELMEDİ': 'bg-metronic-danger-light border-metronic-danger/40 dark:bg-metronic-danger/20 dark:border-metronic-danger/30',
  'NO_SHOW': 'bg-metronic-danger-light border-metronic-danger/40 dark:bg-metronic-danger/20 dark:border-metronic-danger/30',
  'İPTAL': 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700',
  'CANCELLED': 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700',
  'POSTPONED': 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  'BEKLİYOR': 'bg-amber-500',
  'PLANNED': 'bg-blue-500',
  'CONFIRMED': 'bg-indigo-500',
  'CHECKED_IN': 'bg-amber-500',
  'GELDİ': 'bg-green-500',
  'COMPLETED': 'bg-green-500',
  'GELMEDİ': 'bg-red-500',
  'NO_SHOW': 'bg-red-500',
  'İPTAL': 'bg-slate-400',
  'CANCELLED': 'bg-slate-400',
  'POSTPONED': 'bg-slate-400',
};

export default function AppointmentBlock({ appointment, doctorColor, onClick, style, now }: AppointmentBlockProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('appointmentId', appointment.id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
  };

  const colorClass = STATUS_COLORS[appointment.status] || STATUS_COLORS['BEKLİYOR'];
  const statusDot = STATUS_DOT_COLORS[appointment.status] || STATUS_DOT_COLORS['BEKLİYOR'];

  // Randevu saati geçmiş mi (bitiş saati şu andan önce ise) — geçmiş randevular
  // hekim/durum renginden bağımsız olarak koyu gri + beyaz yazıyla gösterilir.
  const isPast = (() => {
    const end = new Date(`${appointment.date}T${appointment.endTime}:00`);
    return !isNaN(end.getTime()) && end.getTime() < (now ?? new Date()).getTime();
  })();

  const blockStyle: React.CSSProperties = {
    ...style,
    zIndex: 5,
    ...(doctorColor && !isPast ? {
      backgroundColor: `${doctorColor}15`,
      borderColor: `${doctorColor}50`,
    } : {})
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => { e.stopPropagation(); onClick(appointment); }}
      className={`absolute inset-x-1 rounded-md border p-1.5 cursor-pointer overflow-hidden transition-shadow hover:shadow-md hover:z-10 group ${
        isPast
          ? 'bg-slate-500 border-slate-600 text-white dark:bg-slate-600 dark:border-slate-500 dark:text-white'
          : `text-slate-800 dark:text-slate-100 ${!doctorColor ? colorClass : ''}`
      }`}
      style={blockStyle}
    >
      <div className="flex flex-col h-full text-[10px] md:text-[11px] leading-tight font-medium">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-bold truncate flex items-center gap-1.5 text-[12px] md:text-[13px]" title={appointment.patientName}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} title={`Durum: ${appointment.status}`} />
            {appointment.patientName}
            {appointment.fileNo != null && (
              <span className="text-[11px] md:text-[12px] opacity-80 font-semibold ml-0.5 tracking-tight">#{appointment.fileNo}</span>
            )}
          </span>
          <span className="flex-shrink-0 text-[11px] md:text-[12px] font-semibold opacity-90 flex items-center gap-1">
            {appointment.isOutsideWorkHours && (
              <span title="Mesai saatleri dışında"><AlertTriangle size={11} className="text-amber-500" /></span>
            )}
            <Clock size={11}/> {appointment.startTime}-{appointment.endTime}
          </span>
        </div>
        <span className="truncate opacity-90">{appointment.notes}</span>
      </div>
    </div>
  );
}
