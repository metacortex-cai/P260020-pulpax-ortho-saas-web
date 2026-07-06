import { Clock } from 'lucide-react';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  treatment: string;
  status: 'BEKLİYOR' | 'GELDİ' | 'GELMEDİ' | 'İPTAL' | 'PLANNED' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'POSTPONED';
}

interface AppointmentBlockProps {
  appointment: Appointment;
  doctorColor?: string;
  onClick: (app: Appointment) => void;
  style?: React.CSSProperties;
}

const STATUS_COLORS: Record<string, string> = {
  'BEKLİYOR': 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-300',
  'PLANNED': 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300',
  'CONFIRMED': 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/30 dark:border-indigo-700/50 dark:text-indigo-300',
  'CHECKED_IN': 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700/50 dark:text-amber-300',
  'GELDİ': 'bg-metronic-success-light border-metronic-success/40 text-metronic-success dark:bg-metronic-success/20 dark:border-metronic-success/30',
  'COMPLETED': 'bg-metronic-success-light border-metronic-success/40 text-metronic-success dark:bg-metronic-success/20 dark:border-metronic-success/30',
  'GELMEDİ': 'bg-metronic-danger-light border-metronic-danger/40 text-metronic-danger dark:bg-metronic-danger/20 dark:border-metronic-danger/30',
  'NO_SHOW': 'bg-metronic-danger-light border-metronic-danger/40 text-metronic-danger dark:bg-metronic-danger/20 dark:border-metronic-danger/30',
  'İPTAL': 'bg-slate-100 border-slate-300 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400',
  'CANCELLED': 'bg-slate-100 border-slate-300 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400',
  'POSTPONED': 'bg-slate-100 border-slate-300 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400',
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

export default function AppointmentBlock({ appointment, doctorColor, onClick, style }: AppointmentBlockProps) {
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

  const blockStyle: React.CSSProperties = {
    ...style,
    zIndex: 5,
    ...(doctorColor ? {
      backgroundColor: `${doctorColor}15`,
      borderColor: `${doctorColor}50`,
      color: doctorColor,
    } : {})
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => { e.stopPropagation(); onClick(appointment); }}
      className={`absolute inset-x-1 rounded-md border p-1.5 cursor-pointer overflow-hidden transition-shadow hover:shadow-md hover:z-10 group ${!doctorColor ? colorClass : ''}`}
      style={blockStyle}
    >
      <div className="flex flex-col h-full text-[10px] md:text-[11px] leading-tight font-medium">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-bold truncate flex items-center gap-1.5" title={`${appointment.patientName} (${appointment.patientId})`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} title={`Durum: ${appointment.status}`} />
            {appointment.patientName}
            <span className="text-[9px] opacity-60 font-normal ml-0.5 tracking-tight">{appointment.patientId}</span>
          </span>
          <span className="flex-shrink-0 text-[9px] opacity-80 flex items-center gap-0.5"><Clock size={9}/> {appointment.startTime}</span>
        </div>
        <span className="truncate opacity-90">{appointment.treatment}</span>
      </div>
    </div>
  );
}
