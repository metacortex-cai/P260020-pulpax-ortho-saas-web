import { useMemo } from 'react';
import AppointmentBlock, { Appointment } from './AppointmentBlock';

interface Doctor {
  id: string;
  name: string;
  color?: string;
}

interface CalendarGridProps {
  view: 'week' | 'day' | 'doctor';
  currentDate: Date;
  appointments: Appointment[];
  doctors: Doctor[];
  onSlotClick: (date: string, time: string, doctorId?: string) => void;
  onAppointmentClick: (app: Appointment) => void;
  onAppointmentMove: (appointmentId: string, newDate: string, newStartTime: string, newDoctorId: string) => void;
}

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_HEIGHT = 24; // px per 15 mins

function generateTimeSlots() {
  const slots = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:15`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
    slots.push(`${h.toString().padStart(2, '0')}:45`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function getDaysOfWeek(date: Date) {
  const curr = new Date(date);
  const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1); // Monday
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(curr.setDate(first + i));
    days.push(d);
  }
  return days;
}

function timeToPixels(time: string) {
  const [h, m] = time.split(':').map(Number);
  const totalMins = (h - START_HOUR) * 60 + m;
  return (totalMins / 15) * SLOT_HEIGHT;
}

function durationToPixels(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diffMins = (eh * 60 + em) - (sh * 60 + sm);
  return (diffMins / 15) * SLOT_HEIGHT;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export default function CalendarGrid({ view, currentDate, appointments, doctors, onSlotClick, onAppointmentClick, onAppointmentMove }: CalendarGridProps) {
  
  const columns = useMemo(() => {
    if (view === 'week') {
      const days = getDaysOfWeek(currentDate);
      return days.map(d => ({
        id: formatDateKey(d),
        title: d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'short' }),
        dateKey: formatDateKey(d),
        doctorId: undefined,
        isToday: formatDateKey(d) === formatDateKey(new Date())
      }));
    } else if (view === 'day') {
      const d = currentDate;
      return [{
        id: formatDateKey(d),
        title: d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        dateKey: formatDateKey(d),
        doctorId: undefined,
        isToday: formatDateKey(d) === formatDateKey(new Date())
      }];
    } else { // doctor view (on current day)
      const d = currentDate;
      return doctors.map(doc => ({
        id: doc.id,
        title: doc.name,
        dateKey: formatDateKey(d),
        doctorId: doc.id,
        isToday: formatDateKey(d) === formatDateKey(new Date())
      }));
    }
  }, [view, currentDate, doctors]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, colDateKey: string, time: string, colDoctorId?: string) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('appointmentId');
    if (appId) {
      const app = appointments.find(a => a.id === appId);
      const targetDoctorId = colDoctorId || (app ? app.doctorId : doctors[0]?.id);
      if (targetDoctorId) {
         onAppointmentMove(appId, colDateKey, time, targetDoctorId);
      }
    }
  };

  return (
    <div className="flex flex-col h-[700px] bg-white dark:bg-[#1c1f2e] border-x border-b border-slate-200/60 dark:border-white/5 rounded-b-xl overflow-hidden">
      {/* Grid Header */}
      <div className="flex border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
        <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-white/5"></div>
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map(col => (
            <div key={col.id} className={`py-3 px-2 text-center border-r border-slate-200 dark:border-white/5 last:border-r-0 ${col.isToday ? 'bg-metronic-primary/5 dark:bg-metronic-primary/10' : ''}`}>
              <span className={`text-[12px] md:text-[13px] font-bold ${col.isToday ? 'text-metronic-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                {col.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Body */}
      <div className="flex-1 overflow-y-auto relative bg-white dark:bg-[#1c1f2e] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10">
        <div className="flex relative" style={{ height: `${TIME_SLOTS.length * SLOT_HEIGHT}px` }}>
          {/* Time Sidebar */}
          <div className="w-16 flex-shrink-0 border-r border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
            {TIME_SLOTS.map((time, idx) => (
              <div key={time} className="text-right pr-2 text-[11px] font-medium text-slate-400 relative" style={{ height: `${SLOT_HEIGHT}px` }}>
                <span className={`absolute -top-2 right-2 ${idx % 4 !== 0 ? 'text-[10px] opacity-50' : ''}`}>{time}</span>
              </div>
            ))}
          </div>

          {/* Columns */}
          <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 pointer-events-none">
              {TIME_SLOTS.map((_, i) => (
                <div key={i} className={`border-b ${i % 4 === 0 ? 'border-slate-200 dark:border-white/5' : 'border-slate-100 dark:border-white/[0.02] border-dashed'}`} style={{ height: `${SLOT_HEIGHT}px` }}></div>
              ))}
            </div>

            {/* Column slots & Appointments */}
            {columns.map(col => {
              // Filter appointments for this column
              const colAppointments = appointments.filter(a => {
                if (a.date !== col.dateKey) return false;
                if (col.doctorId && a.doctorId !== col.doctorId) return false;
                return true;
              });

              return (
                <div key={col.id} className={`relative border-r border-slate-200 dark:border-white/5 last:border-r-0 ${col.isToday ? 'bg-metronic-primary/[0.01] dark:bg-metronic-primary/[0.03]' : ''}`}>
                  {/* Drop Targets (Clickable Empty Slots) */}
                  {TIME_SLOTS.map(time => (
                    <div 
                      key={time}
                      className="absolute w-full hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                      style={{ top: timeToPixels(time), height: SLOT_HEIGHT }}
                      onClick={() => onSlotClick(col.dateKey, time, col.doctorId)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.dateKey, time, col.doctorId)}
                    />
                  ))}

                  {/* Render Appointments */}
                  {colAppointments.map(app => {
                    const docColor = doctors.find(d => d.id === app.doctorId)?.color;
                    return (
                      <AppointmentBlock 
                        key={app.id} 
                        appointment={app} 
                        doctorColor={docColor}
                        onClick={onAppointmentClick}
                        style={{ 
                          top: timeToPixels(app.startTime), 
                          height: durationToPixels(app.startTime, app.endTime) 
                        }} 
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
