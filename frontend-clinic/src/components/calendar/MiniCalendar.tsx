import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OccupancyDay {
  date: string; // YYYY-MM-DD
  total: number;
  capacityMinutes: number;
}

interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  occupancy: OccupancyDay[];
  avgAppointmentMinutes?: number;
}

const WEEKDAY_LABELS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Spec §8.3 eşikleri: 🟢 %0-50 · 🟡 %50-80 · 🔴 %80+ · ⬜ tatil/kapalı
function occupancyColor(day: OccupancyDay | undefined, avgMinutes: number): string {
  if (!day) return 'bg-slate-200 dark:bg-white/10';
  if (day.capacityMinutes === 0) return 'bg-slate-200 dark:bg-white/10';
  const pct = (day.total * avgMinutes * 100) / day.capacityMinutes;
  if (pct >= 80) return 'bg-metronic-danger';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-metronic-success';
}

export default function MiniCalendar({ selectedDate, onDateSelect, occupancy, avgAppointmentMinutes = 30 }: MiniCalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const occupancyByDate = useMemo(() => {
    const map = new Map<string, OccupancyDay>();
    occupancy.forEach(o => map.set(o.date, o));
    return map;
  }, [occupancy]);

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // Pazartesi=0
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [viewMonth]);

  const todayKey = formatDateKey(new Date());
  const selectedKey = formatDateKey(selectedDate);

  return (
    <div className="p-3 bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-xl">
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
          <ChevronLeft size={14} />
        </button>
        <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200 capitalize">
          {viewMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_LABELS.map(w => (
          <div key={w} className="text-center text-[9px] font-bold text-slate-400 uppercase">{w}</div>
        ))}
      </div>

      <div className="space-y-0.5">
        {weeks.map((row, i) => (
          <div key={i} className="grid grid-cols-7 gap-0.5">
            {row.map((day, j) => {
              if (!day) return <div key={j} className="h-7" />;
              const key = formatDateKey(day);
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              const dot = occupancyColor(occupancyByDate.get(key), avgAppointmentMinutes);
              return (
                <button
                  key={j}
                  onClick={() => { setViewMonth(new Date(day.getFullYear(), day.getMonth(), 1)); onDateSelect(day); }}
                  className={`relative h-7 flex flex-col items-center justify-center rounded-md text-[11px] font-semibold transition-colors ${
                    isSelected ? 'bg-metronic-primary text-white' : isToday ? 'text-metronic-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  {day.getDate()}
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : dot}`} />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
