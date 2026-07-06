import { useEffect, useMemo, useRef, useState } from 'react';
import AppointmentBlock, { Appointment } from './AppointmentBlock';

interface Doctor {
  id: string;
  name: string;
  color?: string;
}

interface Chair {
  id: string;
  name: string;
  color?: string;
}

interface LeaveInfo {
  employeeId: string;
  type: string;
  status: string;
  startAt: string;
  endAt: string;
  isFullDay?: boolean;
}

interface WorkHourInfo {
  dayOfWeek: number;
  isWorking: boolean;
  startTime?: string;
  endTime?: string;
}

interface CalendarGridProps {
  view: 'week' | 'day' | 'doctor' | 'chair';
  currentDate: Date;
  appointments: Appointment[];
  doctors: Doctor[];
  chairs?: Chair[];
  leaves?: LeaveInfo[];
  workHours?: Record<string, WorkHourInfo[]>;
  onSlotClick: (date: string, time: string, doctorId?: string, chairId?: string, endTime?: string) => void;
  onAppointmentClick: (app: Appointment) => void;
  onAppointmentMove: (appointmentId: string, newDate: string, newStartTime: string, newDoctorId?: string, newChairId?: string | null) => void;
  onMoveBlocked?: (message: string) => void;
}

const START_HOUR = 0;
const END_HOUR = 24;
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

function nowToPixels(date: Date) {
  const totalMins = (date.getHours() - START_HOUR) * 60 + date.getMinutes() + date.getSeconds() / 60;
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

/**
 * Aynı saat dilimine denk gelen randevuları üst üste binmek yerine yan yana,
 * daraltılmış sütunlarda göstermek için her randevuya bir sütun indeksi ve o
 * anki en geniş çakışma grubunun toplam sütun sayısını atar (Google Calendar
 * benzeri "event collision" yerleşim algoritması — greedy ilk-boş-sütun ataması).
 */
function layoutOverlappingAppointments(items: Appointment[]): Map<string, { col: number; cols: number }> {
  const sorted = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime));
  const result = new Map<string, { col: number; cols: number }>();

  let cluster: Appointment[] = [];
  let clusterEnd = '';

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const colEndTimes: string[] = [];
    const colByAppId = new Map<string, number>();
    for (const ev of cluster) {
      let col = colEndTimes.findIndex(endTime => endTime <= ev.startTime);
      if (col === -1) {
        col = colEndTimes.length;
        colEndTimes.push(ev.endTime);
      } else {
        colEndTimes[col] = ev.endTime;
      }
      colByAppId.set(ev.id, col);
    }
    const cols = colEndTimes.length;
    for (const ev of cluster) {
      result.set(ev.id, { col: colByAppId.get(ev.id)!, cols });
    }
    cluster = [];
    clusterEnd = '';
  };

  for (const ev of sorted) {
    if (cluster.length === 0 || ev.startTime < clusterEnd) {
      cluster.push(ev);
      if (ev.endTime > clusterEnd) clusterEnd = ev.endTime;
    } else {
      flushCluster();
      cluster.push(ev);
      clusterEnd = ev.endTime;
    }
  }
  flushCluster();

  return result;
}

const BLOCKED_MOVE_MESSAGE = 'Randevu yalnızca aynı gün içinde taşınabilir. Hekim veya tarih değişikliği için düzenleme modalını kullanınız.';
const LEAVE_BLOCKED_MESSAGE = 'Hekim bu tarihlerde izinli. Randevu eklenemiyor.';
const PAST_BLOCKED_MESSAGE = 'Geçmiş bir tarih/saat için randevu oluşturulamaz.';

function clampToGrid(time: string) {
  const [h, m] = time.split(':').map(Number);
  if (h < START_HOUR) return `${START_HOUR.toString().padStart(2, '0')}:00`;
  if (h >= END_HOUR) return `${END_HOUR.toString().padStart(2, '0')}:00`;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export default function CalendarGrid({ view, currentDate, appointments, doctors, chairs = [], leaves = [], workHours = {}, onSlotClick, onAppointmentClick, onAppointmentMove, onMoveBlocked }: CalendarGridProps) {

  // Mouse ile aşağı sürükleyerek randevu süresini seçme (drdentes.com benzeri davranış).
  // startIdx/endIdx TIME_SLOTS dizisindeki 15 dakikalık dilim indeksleridir.
  const [dragSelect, setDragSelect] = useState<{ colId: string; startIdx: number; endIdx: number } | null>(null);
  const dragSelectRef = useRef(dragSelect);
  dragSelectRef.current = dragSelect;
  const isDraggingRef = useRef(false);

  // Güncel saat çizgisi (spec: bugünkü sütunda anlık saati kırmızı çizgiyle göster)
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // İlk açılışta görünümü şu anki saate kaydır
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = Math.max(0, nowToPixels(new Date()) - 120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca ilk mount'ta kaydırılmalı
  }, []);

  // Spec §6.4/§2.5.4: hekim sütununda o gün geçerli izin (onaylı) var mı?
  function getColumnLeave(col: { dateKey: string; doctorId?: string }): LeaveInfo | null {
    if (!col.doctorId) return null;
    const dayStart = new Date(`${col.dateKey}T00:00:00`);
    const dayEnd = new Date(`${col.dateKey}T23:59:59`);
    return leaves.find(l =>
      l.employeeId === col.doctorId &&
      l.status === 'APPROVED' &&
      new Date(l.startAt) <= dayEnd &&
      new Date(l.endAt) >= dayStart
    ) || null;
  }

  // Spec §2.5.1: hekimin o günkü tanımlı mesai saatleri
  function getColumnWorkHour(col: { dateKey: string; doctorId?: string }): WorkHourInfo | null {
    if (!col.doctorId) return null;
    const dayOfWeek = new Date(`${col.dateKey}T00:00:00`).getDay();
    return (workHours[col.doctorId] || []).find(w => w.dayOfWeek === dayOfWeek) || null;
  }

  // Sütunun tamamı pasif mi (izinli tam gün veya o gün hiç çalışmıyor)
  function isColumnFullyBlocked(col: { dateKey: string; doctorId?: string }): boolean {
    const leave = getColumnLeave(col);
    if (leave && leave.isFullDay !== false) return true;
    const wh = getColumnWorkHour(col);
    if (wh && !wh.isWorking) return true;
    return false;
  }

  // Kısmi (tam gün olmayan) izin aralığı — yalnızca bu saat aralığı bloke edilir
  function getPartialLeaveRange(col: { dateKey: string; doctorId?: string }): { startTime: string; endTime: string } | null {
    const leave = getColumnLeave(col);
    if (!leave || leave.isFullDay === undefined || leave.isFullDay) return null;
    const dayStart = new Date(`${col.dateKey}T00:00:00`);
    const dayEnd = new Date(`${col.dateKey}T23:59:59`);
    const s = new Date(Math.max(new Date(leave.startAt).getTime(), dayStart.getTime()));
    const e = new Date(Math.min(new Date(leave.endAt).getTime(), dayEnd.getTime()));
    const startTime = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`;
    const endTime = `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;
    return { startTime, endTime };
  }

  function isSlotBlocked(col: { dateKey: string; doctorId?: string }, time: string): boolean {
    if (isColumnFullyBlocked(col)) return true;
    const partial = getPartialLeaveRange(col);
    if (partial && time >= partial.startTime && time < partial.endTime) return true;
    return false;
  }

  // Geçmiş tarihlere/saatlere randevu verilemez kuralı.
  function isSlotInPast(col: { dateKey: string }, time: string): boolean {
    const slotDateTime = new Date(`${col.dateKey}T${time}:00`);
    return slotDateTime.getTime() < now.getTime();
  }

  // Sürükleme bitince (mouseup) seçilen aralığı doğrular ve randevu modalını süresi dolu şekilde açar.
  function commitDragSelect(col: { id: string; dateKey: string; doctorId?: string; chairId?: string }) {
    const sel = dragSelectRef.current;
    setDragSelect(null);
    if (!sel || sel.colId !== col.id) return;
    const lo = Math.min(sel.startIdx, sel.endIdx);
    const hi = Math.max(sel.startIdx, sel.endIdx);
    for (let i = lo; i <= hi; i++) {
      if (isSlotInPast(col, TIME_SLOTS[i])) {
        onMoveBlocked?.(PAST_BLOCKED_MESSAGE);
        return;
      }
      if (isSlotBlocked(col, TIME_SLOTS[i])) {
        onMoveBlocked?.(LEAVE_BLOCKED_MESSAGE);
        return;
      }
    }
    const startTime = TIME_SLOTS[lo];
    const endTime = hi + 1 < TIME_SLOTS.length ? TIME_SLOTS[hi + 1] : `${END_HOUR.toString().padStart(2, '0')}:00`;
    onSlotClick(col.dateKey, startTime, col.doctorId, col.chairId, endTime);
  }

  function handleSlotMouseDown(col: { id: string; dateKey: string; doctorId?: string; chairId?: string }, idx: number) {
    const time = TIME_SLOTS[idx];
    if (isSlotInPast(col, time)) {
      onMoveBlocked?.(PAST_BLOCKED_MESSAGE);
      return;
    }
    if (isSlotBlocked(col, time)) {
      onMoveBlocked?.(LEAVE_BLOCKED_MESSAGE);
      return;
    }
    isDraggingRef.current = true;
    setDragSelect({ colId: col.id, startIdx: idx, endIdx: idx });

    const handleWindowMouseUp = () => {
      window.removeEventListener('mouseup', handleWindowMouseUp);
      isDraggingRef.current = false;
      commitDragSelect(col);
    };
    window.addEventListener('mouseup', handleWindowMouseUp);
  }

  function handleSlotMouseEnter(col: { id: string }, idx: number) {
    if (!isDraggingRef.current) return;
    setDragSelect(prev => (prev && prev.colId === col.id ? { ...prev, endIdx: idx } : prev));
  }

  const columns = useMemo(() => {
    if (view === 'week') {
      const days = getDaysOfWeek(currentDate);
      return days.map(d => ({
        id: formatDateKey(d),
        title: d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'short' }),
        dateKey: formatDateKey(d),
        doctorId: undefined,
        chairId: undefined,
        isToday: formatDateKey(d) === formatDateKey(new Date())
      }));
    } else if (view === 'day') {
      const d = currentDate;
      return [{
        id: formatDateKey(d),
        title: d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        dateKey: formatDateKey(d),
        doctorId: undefined,
        chairId: undefined,
        isToday: formatDateKey(d) === formatDateKey(new Date())
      }];
    } else if (view === 'chair') {
      const d = currentDate;
      return chairs.map(ch => ({
        id: ch.id,
        title: ch.name,
        dateKey: formatDateKey(d),
        doctorId: undefined,
        chairId: ch.id,
        isToday: formatDateKey(d) === formatDateKey(new Date())
      }));
    } else { // doctor view (on current day)
      const d = currentDate;
      return doctors.map(doc => ({
        id: doc.id,
        title: doc.name,
        dateKey: formatDateKey(d),
        doctorId: doc.id,
        chairId: undefined,
        isToday: formatDateKey(d) === formatDateKey(new Date())
      }));
    }
  }, [view, currentDate, doctors, chairs]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, colDateKey: string, time: string, colDoctorId?: string, colChairId?: string) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('appointmentId');
    if (!appId) return;

    const app = appointments.find(a => a.id === appId);
    if (!app) return;

    // Spec §3.1: yalnızca aynı gün içinde saat değişimine izin verilir;
    // farklı güne, farklı hekime veya farklı ünite taşıma engellenir.
    const dayChanged = app.date !== colDateKey;
    const doctorChanged = view === 'doctor' && colDoctorId !== undefined && app.doctorId !== colDoctorId;
    const chairChanged = view === 'chair' && colChairId !== undefined && app.chairId !== colChairId;

    if (dayChanged || doctorChanged || chairChanged) {
      onMoveBlocked?.(BLOCKED_MOVE_MESSAGE);
      return;
    }

    if (isSlotInPast({ dateKey: colDateKey }, time)) {
      onMoveBlocked?.(PAST_BLOCKED_MESSAGE);
      return;
    }

    if (isSlotBlocked({ dateKey: colDateKey, doctorId: colDoctorId }, time)) {
      onMoveBlocked?.(LEAVE_BLOCKED_MESSAGE);
      return;
    }

    onAppointmentMove(appId, colDateKey, time, app.doctorId, app.chairId);
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
      <div ref={bodyRef} className="flex-1 overflow-y-auto relative bg-white dark:bg-[#1c1f2e] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10">
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
                if (col.chairId && a.chairId !== col.chairId) return false;
                return true;
              });

              const fullyBlocked = isColumnFullyBlocked(col);
              const partialLeave = !fullyBlocked ? getPartialLeaveRange(col) : null;
              const workHour = getColumnWorkHour(col);
              const leave = getColumnLeave(col);
              const overlapLayout = layoutOverlappingAppointments(colAppointments);

              return (
                <div key={col.id} className={`relative border-r border-slate-200 dark:border-white/5 last:border-r-0 ${col.isToday ? 'bg-metronic-primary/[0.01] dark:bg-metronic-primary/[0.03]' : ''}`}>
                  {/* Mesai dışı yumuşak overlay (spec §2.5.1) — bloke etmez, yalnızca görsel */}
                  {!fullyBlocked && workHour?.isWorking && workHour.startTime && workHour.endTime && (
                    <>
                      <div className="absolute w-full bg-red-50/50 dark:bg-red-500/[0.06] pointer-events-none bg-[repeating-linear-gradient(45deg,rgba(239,68,68,0.18),rgba(239,68,68,0.18)_4px,transparent_4px,transparent_8px)]" style={{ top: 0, height: timeToPixels(clampToGrid(workHour.startTime)) }} />
                      <div className="absolute w-full bg-red-50/50 dark:bg-red-500/[0.06] pointer-events-none bg-[repeating-linear-gradient(45deg,rgba(239,68,68,0.18),rgba(239,68,68,0.18)_4px,transparent_4px,transparent_8px)]" style={{ top: timeToPixels(clampToGrid(workHour.endTime)), bottom: 0 }} />
                    </>
                  )}

                  {/* İzin / kapalı gün bandı (SERT ENGEL, spec §6.4/§2.5.4) */}
                  {fullyBlocked && (
                    <div className="absolute inset-0 bg-slate-200/60 dark:bg-white/10 pointer-events-none z-[6] flex items-start justify-center pt-4">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 bg-white/80 dark:bg-black/40 px-2 py-1 rounded-md">
                        {leave ? `İzinli${leave.type ? ` — ${leave.type}` : ''}` : 'Bu gün çalışmıyor'}
                      </span>
                    </div>
                  )}
                  {!fullyBlocked && partialLeave && (
                    <div
                      className="absolute w-full bg-slate-200/60 dark:bg-white/10 pointer-events-none z-[6] flex items-center justify-center"
                      style={{ top: timeToPixels(clampToGrid(partialLeave.startTime)), height: durationToPixels(clampToGrid(partialLeave.startTime), clampToGrid(partialLeave.endTime)) }}
                    >
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300">İzinli</span>
                    </div>
                  )}

                  {/* Bugünkü sütunda anlık saati gösteren kırmızı çizgi */}
                  {col.isToday && (
                    <div
                      className="absolute w-full flex items-center z-[8] pointer-events-none"
                      style={{ top: nowToPixels(now) }}
                    >
                      <div className="w-2 h-2 -ml-1 rounded-full bg-red-500 flex-shrink-0" />
                      <div className="flex-1 h-[2px] bg-red-500" />
                    </div>
                  )}

                  {/* Sürükleyerek süre seçimi (mousedown -> mouseenter -> mouseup), tek tık eski 15dk davranışını korur */}
                  {dragSelect && dragSelect.colId === col.id && (
                    <div
                      className="absolute w-full bg-metronic-primary/15 border-y-2 border-metronic-primary/60 pointer-events-none z-[4]"
                      style={{
                        top: timeToPixels(TIME_SLOTS[Math.min(dragSelect.startIdx, dragSelect.endIdx)]),
                        height: (Math.abs(dragSelect.endIdx - dragSelect.startIdx) + 1) * SLOT_HEIGHT
                      }}
                    />
                  )}

                  {/* Drop Targets (Clickable / Draggable Empty Slots) */}
                  {TIME_SLOTS.map((time, idx) => {
                    const blocked = isSlotBlocked(col, time) || isSlotInPast(col, time);
                    return (
                      <div
                        key={time}
                        className={`absolute w-full transition-colors select-none ${blocked ? 'cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer'}`}
                        style={{ top: timeToPixels(time), height: SLOT_HEIGHT }}
                        onMouseDown={() => handleSlotMouseDown(col, idx)}
                        onMouseEnter={() => handleSlotMouseEnter(col, idx)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.dateKey, time, col.doctorId, col.chairId)}
                      />
                    );
                  })}

                  {/* Render Appointments — aynı saat dilimine denk gelenler daraltılarak yan yana gösterilir */}
                  {colAppointments.map(app => {
                    const docColor = doctors.find(d => d.id === app.doctorId)?.color;
                    const pos = overlapLayout.get(app.id) || { col: 0, cols: 1 };
                    const widthPct = 100 / pos.cols;
                    const leftPct = pos.col * widthPct;
                    return (
                      <AppointmentBlock
                        key={app.id}
                        appointment={app}
                        doctorColor={docColor}
                        onClick={onAppointmentClick}
                        now={now}
                        style={{
                          top: timeToPixels(app.startTime),
                          height: durationToPixels(app.startTime, app.endTime),
                          ...(pos.cols > 1 ? {
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            right: 'auto',
                          } : {})
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
