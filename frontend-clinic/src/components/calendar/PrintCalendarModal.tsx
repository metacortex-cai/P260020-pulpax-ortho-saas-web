'use client';

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Check, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { AppointmentService } from '../../lib/services/appointment.service';
import { exportDailyCalendarPDF, exportDailyCalendarXLS, DailyCalendarRow } from '../../lib/utils/exportDailyCalendar';
import { useToastStore } from '../../store/toastStore';

const STATUS_LABELS: Record<string, string> = {
  'BEKLİYOR': 'Bekliyor',
  'PLANNED': 'Planlandı',
  'CONFIRMED': 'Onaylandı',
  'CHECKED_IN': 'Geldi',
  'GELDİ': 'Geldi',
  'COMPLETED': 'Tamamlandı',
  'GELMEDİ': 'Gelmedi',
  'NO_SHOW': 'Gelmedi',
  'İPTAL': 'İptal',
  'CANCELLED': 'İptal',
  'POSTPONED': 'Ertelendi',
};

interface Doctor {
  id: string;
  name: string;
  color?: string;
}

interface PrintCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  defaultDate: Date;
}

export default function PrintCalendarModal({ isOpen, onClose, doctors, defaultDate }: PrintCalendarModalProps) {
  const addToast = useToastStore(state => state.addToast);
  const [date, setDate] = useState(() => defaultDate.toISOString().slice(0, 10));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<'pdf' | 'xls' | null>(null);

  // Modal her açıldığında o an görüntülenen tarihi baz alır ve tüm hekimleri ön-seçili getirir.
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional modal-open reset, not a render-derived sync
      setDate(defaultDate.toISOString().slice(0, 10));
      setSelectedIds(new Set(doctors.map(d => d.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca modal açılışında sıfırlanmalı
  }, [isOpen]);

  const toggleDoctor = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(selectedIds.size === doctors.length ? new Set() : new Set(doctors.map(d => d.id)));
  };

  const handleExport = async (format: 'pdf' | 'xls') => {
    if (selectedIds.size === 0) {
      addToast({ title: 'Hata', message: 'Lütfen en az bir hekim seçin.', type: 'error' });
      return;
    }
    if (!date) {
      addToast({ title: 'Hata', message: 'Lütfen bir tarih seçin.', type: 'error' });
      return;
    }

    setExporting(format);
    try {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59`);
      const apps = await AppointmentService.findAll(start.toISOString(), end.toISOString());
      const filtered = apps.filter(a => selectedIds.has(a.doctorId));
      const sorted = [...filtered].sort((a, b) => new Date(a.startOn).getTime() - new Date(b.startOn).getTime());

      const rows: DailyCalendarRow[] = sorted.map(a => {
        const doctor = doctors.find(d => d.id === a.doctorId);
        return {
          startTime: new Date(a.startOn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(a.endOn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          patientName: `${a.patient.firstName} ${a.patient.lastName}`,
          fileNo: a.patient.fileNo ?? null,
          doctorName: doctor?.name || '—',
          chairName: a.dentalChair?.name || null,
          statusLabel: STATUS_LABELS[a.status] || a.status,
          notes: a.notes,
        };
      });

      const dateLabel = start.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
      const doctorNames = doctors.filter(d => selectedIds.has(d.id)).map(d => d.name);

      if (format === 'pdf') {
        await exportDailyCalendarPDF({ dateLabel, doctorNames, rows });
      } else {
        await exportDailyCalendarXLS({ dateLabel, doctorNames, rows });
      }

      addToast({ title: 'Başarılı', message: `${rows.length} randevu ${format === 'pdf' ? 'PDF' : 'Excel'} olarak dışa aktarıldı.`, type: 'success' });
      onClose();
    } catch (err: any) {
      addToast({ title: 'Hata', message: err?.response?.data?.message || 'Randevular yüklenirken bir hata oluştu.', type: 'error' });
    } finally {
      setExporting(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Takvimi Yazdır"
      subtitle="Tarih ve hekim seçerek günlük randevu listesini PDF veya Excel olarak indirin."
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
          <button
            type="button"
            onClick={() => handleExport('xls')}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-metronic-success bg-metronic-success-light border border-metronic-success/30 rounded-lg hover:bg-metronic-success hover:text-white transition-colors disabled:opacity-60"
          >
            {exporting === 'xls' ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />} Excel
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60"
          >
            {exporting === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} PDF
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tarih</label>
          <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="m-input" />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hekimler</label>
            <button type="button" onClick={toggleAll} className="text-[11px] font-bold text-metronic-primary hover:underline">
              {selectedIds.size === doctors.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
            </button>
          </div>
          <div className="border border-slate-200 dark:border-white/10 rounded-lg max-h-[220px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
            {doctors.length === 0 && (
              <p className="px-3 py-4 text-[12px] text-slate-400 text-center">Kayıtlı hekim bulunamadı.</p>
            )}
            {doctors.map(d => {
              const isSelected = selectedIds.has(d.id);
              return (
                <div key={d.id} onClick={() => toggleDoctor(d.id)} className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                  <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center rounded border transition-colors" style={{ backgroundColor: isSelected ? (d.color || '#3699FF') : 'transparent', borderColor: d.color || '#cbd5e1' }}>
                    {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                  </div>
                  <span className="truncate">{d.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
