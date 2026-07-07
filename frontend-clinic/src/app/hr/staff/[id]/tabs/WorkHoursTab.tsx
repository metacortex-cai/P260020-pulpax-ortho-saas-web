'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { EmployeeService, WorkHourPayload } from '../../../../../lib/services/employee.service';
import { useToastStore } from '../../../../../store/toastStore';
import Skeleton from '../../../../../components/ui/Skeleton';

// dayOfWeek, CalendarGrid.tsx'teki `Date.getDay()` ile aynı JS standardını kullanır: 0=Pazar...6=Cumartesi.
const DAYS = [
  { label: 'Pazartesi', value: 1 },
  { label: 'Salı', value: 2 },
  { label: 'Çarşamba', value: 3 },
  { label: 'Perşembe', value: 4 },
  { label: 'Cuma', value: 5 },
  { label: 'Cumartesi', value: 6 },
  { label: 'Pazar', value: 0 },
];

type DayRow = { dayOfWeek: number; isWorking: boolean; startTime: string; endTime: string };

function buildRows(existing: WorkHourPayload[]): DayRow[] {
  return DAYS.map(d => {
    const found = existing.find(w => w.dayOfWeek === d.value);
    return {
      dayOfWeek: d.value,
      isWorking: found?.isWorking ?? false,
      startTime: found?.startTime || '09:00',
      endTime: found?.endTime || '18:00',
    };
  });
}

export default function WorkHoursTab({ employeeId }: { employeeId: string }) {
  const [rows, setRows] = useState<DayRow[]>(buildRows([]));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const bulk = await EmployeeService.getWorkHoursBulk([employeeId]);
      setRows(buildRows(bulk[employeeId] || []));
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Mesai bilgileri yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [employeeId, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/param-change pattern
    fetchData();
  }, [employeeId, fetchData]);

  const updateRow = (dayOfWeek: number, patch: Partial<DayRow>) => {
    setRows(prev => prev.map(r => r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r));
  };

  const handleSave = async () => {
    const invalid = rows.some(r => r.isWorking && r.startTime >= r.endTime);
    if (invalid) {
      addToast({ title: 'Hata', message: 'Bitiş saati başlangıç saatinden sonra olmalıdır.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      await EmployeeService.updateWorkHours(employeeId, rows);
      addToast({ title: 'Başarılı', message: 'Mesai saatleri güncellendi.', type: 'success' });
    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Mesai saatleri kaydedilemedi.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {DAYS.map(d => <Skeleton key={d.value} className="h-14 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-bold text-slate-700">Haftalık Çalışma Planı</h4>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-white bg-metronic-primary rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {DAYS.map(d => {
          const row = rows.find(r => r.dayOfWeek === d.value)!;
          return (
            <div key={d.value} className="flex flex-wrap items-center justify-between gap-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
              <label className="flex items-center gap-2.5 w-32 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.isWorking}
                  onChange={e => updateRow(d.value, { isWorking: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 accent-metronic-primary cursor-pointer"
                />
                <span className="text-[13px] font-bold text-slate-700">{d.label}</span>
              </label>
              {row.isWorking ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={row.startTime}
                    onChange={e => updateRow(d.value, { startTime: e.target.value })}
                    className="h-9 px-2.5 text-[13px] font-bold text-metronic-primary border border-slate-200 rounded-lg outline-none focus:border-metronic-primary bg-white"
                  />
                  <span className="text-slate-300">-</span>
                  <input
                    type="time"
                    value={row.endTime}
                    onChange={e => updateRow(d.value, { endTime: e.target.value })}
                    className="h-9 px-2.5 text-[13px] font-bold text-metronic-primary border border-slate-200 rounded-lg outline-none focus:border-metronic-primary bg-white"
                  />
                </div>
              ) : (
                <span className="text-[12px] font-bold text-slate-400 italic">Tatil / Çalışmıyor</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
