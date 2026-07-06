import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Save, AlertTriangle } from 'lucide-react';
import { Appointment } from './AppointmentBlock';

interface Doctor {
  id: string;
  name: string;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Partial<Appointment>) => void;
  initialData?: Partial<Appointment>;
  doctors: Doctor[];
  leaves: Record<string, string[]>;
}

export default function AppointmentModal({ isOpen, onClose, onSave, initialData, doctors, leaves }: AppointmentModalProps) {
  const [formData, setFormData] = useState<Partial<Appointment>>({
    patientId: '',
    patientName: '',
    doctorId: '',
    date: '',
    startTime: '',
    endTime: '',
    treatment: '',
    status: 'BEKLİYOR'
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        patientId: '', patientName: '', doctorId: doctors[0]?.id || '',
        date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '09:15',
        treatment: '', status: 'BEKLİYOR'
      });
      setError('');
    }
  }, [isOpen, initialData, doctors]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Check Leave Conflict
    if (formData.doctorId && formData.date) {
      const doctorLeaves = leaves[formData.doctorId] || [];
      if (doctorLeaves.includes(formData.date)) {
        setError('Seçili hekim bu tarihte izinlidir. Randevu oluşturulamaz.');
        return;
      }
    }

    if (!formData.patientName) {
      setFormData(prev => ({ ...prev, patientName: 'Bilinmeyen Hasta' }));
    }

    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData?.id ? "Randevu Düzenle" : "Yeni Randevu"} size="md" footer={
      <>
        <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
        <button form="appointment-form" type="submit" className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold bg-metronic-primary text-white rounded-lg hover:bg-blue-600 transition-colors"><Save size={15} />Kaydet</button>
      </>
    }>
      <form id="appointment-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-metronic-danger-light border border-metronic-danger/20 text-metronic-danger p-3 rounded-lg text-[12px] font-bold flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hasta Adı <span className="text-metronic-danger">*</span></label>
          <input required type="text" value={formData.patientName || ''} onChange={e => setFormData({...formData, patientName: e.target.value})} className="m-input" placeholder="Örn: Ahmet Yılmaz" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hekim <span className="text-metronic-danger">*</span></label>
          <select required value={formData.doctorId || ''} onChange={e => setFormData({...formData, doctorId: e.target.value})} className="m-input">
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tarih <span className="text-metronic-danger">*</span></label>
            <input required type="date" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} className="m-input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Durum</label>
            <select value={formData.status || 'BEKLİYOR'} onChange={e => setFormData({...formData, status: e.target.value as any})} className="m-input">
              <option value="BEKLİYOR">Bekliyor</option>
              <option value="GELDİ">Geldi</option>
              <option value="GELMEDİ">Gelmedi</option>
              <option value="İPTAL">İptal Edildi</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Başlangıç Saati <span className="text-metronic-danger">*</span></label>
            <input required type="time" value={formData.startTime || ''} onChange={e => setFormData({...formData, startTime: e.target.value})} className="m-input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Bitiş Saati <span className="text-metronic-danger">*</span></label>
            <input required type="time" value={formData.endTime || ''} onChange={e => setFormData({...formData, endTime: e.target.value})} className="m-input" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">İşlem / Tedavi</label>
          <input type="text" value={formData.treatment || ''} onChange={e => setFormData({...formData, treatment: e.target.value})} className="m-input" placeholder="Örn: Muayene, Dolgu" />
        </div>
      </form>
    </Modal>
  );
}
