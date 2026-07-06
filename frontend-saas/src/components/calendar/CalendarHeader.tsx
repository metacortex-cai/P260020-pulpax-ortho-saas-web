import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Filter, ChevronDown, Check } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

interface Doctor {
  id: string;
  name: string;
}

function DoctorFilterDropdown({ doctors, selectedDoctorIds, onToggleDoctor }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-9 px-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-metronic-primary transition-colors shadow-sm text-[13px] font-medium"
      >
        <Filter size={15} /> Hekimler <ChevronDown size={13} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-[#1c1f2e] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl min-w-[200px] py-1.5">
          <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5 mb-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hekim Filtresi</p>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {doctors.map((d: any) => {
              const isSelected = selectedDoctorIds.has(d.id);
              return (
                <div key={d.id} onClick={() => onToggleDoctor(d.id)} className="flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                  <div className={`w-4 h-4 flex items-center justify-center rounded border transition-colors ${isSelected ? 'bg-metronic-primary border-metronic-primary text-white' : 'border-slate-300 dark:border-white/20'}`}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                  {d.name}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface CalendarHeaderProps {
  currentDate: Date;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
  onDateSelect: (date: Date) => void;
  view: 'week' | 'day' | 'doctor';
  onViewChange: (view: 'week' | 'day' | 'doctor') => void;
  onAddAppointment: () => void;
  doctors: Doctor[];
  selectedDoctorIds: Set<string>;
  onToggleDoctor: (id: string) => void;
}

export default function CalendarHeader({ currentDate, onNavigate, onDateSelect, view, onViewChange, onAddAppointment, doctors, selectedDoctorIds, onToggleDoctor }: CalendarHeaderProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const monthYear = currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-5 border-b border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#1c1f2e]">
      {/* Left Navigation */}
      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('today')} className="px-3 py-1.5 text-[12px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg border border-slate-200 dark:border-white/10 transition-colors">
          Bugün
        </button>
        
        <div className="relative flex items-center group">
          <input 
            type="date" 
            ref={dateInputRef}
            onChange={(e) => {
              if (e.target.value) {
                onDateSelect(new Date(e.target.value));
              }
            }}
            className="absolute opacity-0 w-0 h-0"
            style={{ pointerEvents: 'none' }}
          />
          <button 
            onClick={() => {
              try {
                dateInputRef.current?.showPicker();
              } catch (err) {
                dateInputRef.current?.focus();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-bold text-metronic-primary bg-metronic-primary/10 hover:bg-metronic-primary/20 rounded-lg border border-metronic-primary/20 transition-colors"
          >
            <CalendarIcon size={16} /> {currentDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </button>
        </div>
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 p-0.5">
          <button onClick={() => onNavigate('prev')} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-all"><ChevronLeft size={16}/></button>
          <button onClick={() => onNavigate('next')} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-all"><ChevronRight size={16}/></button>
        </div>
        <h2 className="text-[1.1rem] font-bold text-slate-800 dark:text-white capitalize ml-2">{monthYear}</h2>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* View Switcher */}
        <div className="flex items-center bg-slate-50 dark:bg-white/5 p-1 rounded-lg border border-slate-200 dark:border-white/10">
          <button onClick={() => onViewChange('week')} className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-all ${view === 'week' ? 'bg-white dark:bg-[#2a2e42] text-metronic-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Hafta
          </button>
          <button onClick={() => onViewChange('day')} className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-all ${view === 'day' ? 'bg-white dark:bg-[#2a2e42] text-metronic-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Gün
          </button>
          <button onClick={() => onViewChange('doctor')} className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-all ${view === 'doctor' ? 'bg-white dark:bg-[#2a2e42] text-metronic-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Hekim
          </button>
        </div>

        {/* Doctor Filter Dropdown */}
        <DoctorFilterDropdown doctors={doctors} selectedDoctorIds={selectedDoctorIds} onToggleDoctor={onToggleDoctor} />

        {/* Add Button */}
        <button onClick={onAddAppointment} className="flex items-center gap-1.5 px-4 py-2 bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm text-[13px] font-bold">
          <Plus size={16} /> Yeni Randevu
        </button>
      </div>
    </div>
  );
}
