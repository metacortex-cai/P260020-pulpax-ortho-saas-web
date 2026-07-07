'use client';

import { useState, useEffect } from 'react';
import MetronicLayout from '../../components/layout/MetronicLayout';
import CalendarHeader from '../../components/calendar/CalendarHeader';
import CalendarGrid from '../../components/calendar/CalendarGrid';
import AppointmentModal from '../../components/calendar/AppointmentModal';
import AppointmentPopover from '../../components/calendar/AppointmentPopover';
import PrintCalendarModal from '../../components/calendar/PrintCalendarModal';
import MiniCalendar from '../../components/calendar/MiniCalendar';
import { Check } from 'lucide-react';
import { Appointment } from '../../components/calendar/AppointmentBlock';
import { AppointmentService, AppointmentWithPatient, AppointmentConflictInfo } from '../../lib/services/appointment.service';
import { DoctorService } from '../../lib/services/doctor.service';
import { PatientService } from '../../lib/services/patient.service';
import { useToastStore } from '../../store/toastStore';
import InfoTooltip from '../../components/ui/InfoTooltip';

interface Doctor {
  id: string;
  name: string;
  color?: string;
}

const DOCTOR_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function AppointmentsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day' | 'doctor' | 'chair'>('doctor');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [chairs, setChairs] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Partial<Appointment> | undefined>();
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<Set<string>>(new Set());
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverAppointment, setPopoverAppointment] = useState<AppointmentWithPatient | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [occupancy, setOccupancy] = useState<{ date: string; total: number; capacityMinutes: number }[]>([]);
  const addToast = useToastStore(state => state.addToast);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Doctors & Chairs
      const [staff, chs] = await Promise.all([
        DoctorService.findAll(),
        AppointmentService.getChairs()
      ]);

      const docs = staff
        .filter(s => s.isDoctor)
        .map((s, idx) => ({
          id: s.id,
          name: `Dt. ${s.firstName} ${s.lastName}`,
          // Personel modülü (ve onunla birlikte hekim rengi ayarı) kaldırıldı;
          // sabit paletten sırayla renk atanır.
          color: DOCTOR_COLORS[idx % DOCTOR_COLORS.length]
        }));
      setDoctors(docs);
      setChairs(chs);

      if (selectedDoctorIds.size === 0) {
        setSelectedDoctorIds(new Set(docs.map(d => d.id)));
      }

      // 2. Fetch Appointments for the current view
      let start = new Date(currentDate);
      let end = new Date(currentDate);

      if (view === 'week') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0,0,0,0);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23,59,59,999);
      } else {
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
      }

      const apps = await AppointmentService.findAll(start.toISOString(), end.toISOString());
      
      // Map backend appointments to frontend block format
      const mappedApps: Appointment[] = apps.map(a => ({
        id: a.id,
        patientId: a.patientId,
        patientName: `${a.patient.firstName} ${a.patient.lastName}`,
        doctorId: a.doctorId,
        chairId: a.chairId,
        date: a.startOn.split('T')[0],
        startTime: new Date(a.startOn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        endTime: new Date(a.endOn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        fileNo: a.patient.fileNo ?? null,
        status: a.status as any,
        notes: a.notes || '',
        isOutsideWorkHours: a.isOutsideWorkHours
      }));

      setAppointments(mappedApps);

      // 3. Fetch Patients for modal (randevu modalindeki seçim listesi için sınırlı sayıda kayıt)
      const ptsRes = await PatientService.findAll({ limit: 200, sortBy: 'firstName', sortDir: 'asc' });
      setPatients(ptsRes.data);

      // 4. Mini takvim doluluk özeti (spec §8.3) — görünen ay için. Kapasite
      // (mesai saati) tanımı İK modülüyle birlikte kaldırıldı; backend artık
      // capacityMinutes=0 döner, yalnızca günlük randevu sayısı gösterilir.
      if (docs.length > 0) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        AppointmentService.getOccupancy(monthKey, docs.map(d => d.id)).then(setOccupancy).catch(() => {});
      }

    } catch (err) {
      console.error(err);
      addToast({ title: 'Hata', message: 'Randevular yüklenemedi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-dep-change pattern, setLoading(true) inside fetchData is a synchronous UI reset before the async calls
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchData is redefined every render and reads live state (selectedDoctorIds, currentDate, view); adding it as a dep would refetch on every render
  }, [currentDate, view]);

  const handleNavigate = (dir: 'prev' | 'next' | 'today') => {
    setCurrentDate(prev => {
      const nd = new Date(prev);
      if (dir === 'today') return new Date();
      if (view === 'week') {
        nd.setDate(nd.getDate() + (dir === 'next' ? 7 : -7));
      } else {
        nd.setDate(nd.getDate() + (dir === 'next' ? 1 : -1));
      }
      return nd;
    });
  };

  const handleSlotClick = (date: string, time: string, doctorId?: string, chairId?: string, endTime?: string) => {
    setModalData({
      date,
      startTime: time,
      endTime: endTime || calculateEndTime(time, 15),
      doctorId: doctorId || doctors[0]?.id,
      chairId: chairId || ''
    });
    setIsModalOpen(true);
  };

  // Spec §2.4.3: karta tıklanınca doğrudan düzenleme modalı yerine hızlı-aksiyon popup'ı açılır
  const handleAppointmentClick = async (app: Appointment) => {
    try {
      const fullApp = await AppointmentService.findOne(app.id);
      setPopoverAppointment(fullApp);
      setIsPopoverOpen(true);
    } catch (err) {
      addToast({ title: 'Hata', message: 'Randevu detayları yüklenemedi.', type: 'error' });
    }
  };

  const handleClosePopover = () => {
    setIsPopoverOpen(false);
    setPopoverAppointment(null);
  };

  const handleCheckIn = async (id: string) => {
    try {
      await AppointmentService.updateStatus(id, 'CHECKED_IN');
      addToast({ title: 'Başarılı', message: 'Hasta geldi olarak işaretlendi.', type: 'success' });
      handleClosePopover();
      fetchData();
    } catch (err: any) {
      addToast({ title: 'Hata', message: err.response?.data?.message || 'İşlem başarısız.', type: 'error' });
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      await AppointmentService.updateStatus(id, 'CANCELLED');
      addToast({ title: 'Başarılı', message: 'Randevu iptal edildi.', type: 'success' });
      handleClosePopover();
      fetchData();
    } catch (err: any) {
      addToast({ title: 'Hata', message: err.response?.data?.message || 'İşlem başarısız.', type: 'error' });
    }
  };

  const handlePostponeAppointment = async (id: string, newDate: string, newStartTime: string, newEndTime: string) => {
    try {
      const newStartOn = new Date(`${newDate}T${newStartTime}:00`).toISOString();
      const newEndOn = new Date(`${newDate}T${newEndTime}:00`).toISOString();
      await AppointmentService.postpone(id, newStartOn, newEndOn);
      addToast({ title: 'Başarılı', message: 'Randevu ertelendi, yeni randevu oluşturuldu.', type: 'success' });
      handleClosePopover();
      fetchData();
    } catch (err: any) {
      addToast({ title: 'Hata', message: err.response?.data?.message || 'Randevu ertelenemedi.', type: 'error' });
    }
  };

  const handleEditFromPopover = (fullApp: AppointmentWithPatient) => {
    const mapped: any = {
      id: fullApp.id,
      patientId: fullApp.patientId,
      patientName: `${fullApp.patient.firstName} ${fullApp.patient.lastName}`,
      doctorId: fullApp.doctorId,
      chairId: fullApp.chairId,
      date: fullApp.startOn.split('T')[0],
      startTime: new Date(fullApp.startOn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      endTime: new Date(fullApp.endOn).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      status: fullApp.status,
      notes: fullApp.notes || '',
      appointmentType: fullApp.type || '',
      treatmentItems: fullApp.treatmentItems
    };
    handleClosePopover();
    setModalData(mapped);
    setIsModalOpen(true);
  };

  const handleAppointmentMove = async (appId: string, newDate: string, newStartTime: string, newDoctorId?: string, newChairId?: string | null) => {
    try {
      const app = appointments.find(a => a.id === appId);
      if (!app) return;

      const [sh, sm] = app.startTime.split(':').map(Number);
      const [eh, em] = app.endTime.split(':').map(Number);
      const duration = (eh * 60 + em) - (sh * 60 + sm);

      const startOn = new Date(`${newDate}T${newStartTime}:00`).toISOString();
      const endOn = new Date(`${newDate}T${calculateEndTime(newStartTime, duration)}:00`).toISOString();

      await AppointmentService.update(appId, {
        doctorId: newDoctorId || app.doctorId,
        chairId: newChairId === null ? null : (newChairId || undefined),
        startOn,
        endOn
      });

      addToast({ title: 'Başarılı', message: 'Randevu taşındı.', type: 'success' });
      fetchData();
    } catch (err: any) {
      addToast({ title: 'Hata', message: err.response?.data?.message || 'Randevu taşınamadı.', type: 'error' });
    }
  };

  const handleSaveModal = async (data: Partial<Appointment>, force?: boolean): Promise<AppointmentConflictInfo | void> => {
    try {
      const startOn = new Date(`${data.date}T${data.startTime}:00`).toISOString();
      const endOn = new Date(`${data.date}T${data.endTime}:00`).toISOString();

      const appointmentType = (data as any).appointmentType as string | undefined;
      const treatmentItemIds = (data as any).treatmentItemIds as string[] | undefined;

      if (data.id) {
        await AppointmentService.update(data.id, {
          doctorId: data.doctorId,
          chairId: data.chairId || null,
          patientId: data.patientId,
          startOn,
          endOn,
          status: data.status as any,
          notes: data.notes,
          force,
          ...(appointmentType ? { type: appointmentType } : {})
        });
        addToast({ title: 'Başarılı', message: 'Randevu güncellendi.', type: 'success' });
      } else {
        await AppointmentService.create({
          patientId: data.patientId!,
          doctorId: data.doctorId!,
          chairId: data.chairId || undefined,
          startOn,
          endOn,
          notes: data.notes,
          force,
          ...(appointmentType ? { type: appointmentType } : {}),
          ...(treatmentItemIds?.length ? { treatmentItemIds } : {})
        });
        addToast({ title: 'Başarılı', message: 'Randevu oluşturuldu.', type: 'success' });
      }
      fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      const respData = err.response?.data;
      // Hekimin aynı saat diliminde çakışan randevusu varsa (spec: onay modalı) —
      // modalı kapatmadan, çakışan hasta bilgilerini AppointmentModal'a geri döndür.
      if (err.response?.status === 409 && respData?.conflict) {
        return { conflict: true, appointmentCount: respData.appointmentCount, appointments: respData.appointments || [] };
      }
      addToast({ title: 'Hata', message: respData?.message || 'İşlem başarısız.', type: 'error' });
    }
  };

  const handleToggleDoctor = (id: string) => {
    setSelectedDoctorIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visibleDoctors = doctors.filter(d => selectedDoctorIds.has(d.id));

  function calculateEndTime(startTime: string, durationMins: number = 15) {
    const [h, m] = startTime.split(':').map(Number);
    const totalMins = h * 60 + m + durationMins;
    const newH = Math.floor(totalMins / 60);
    const newM = totalMins % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  }

  return (
    <MetronicLayout
      title="Randevu ve Takvim"
      breadcrumbs={['Randevular']}
      infoTooltip={
        <InfoTooltip
          title="Pulpax İnteraktif Takvim"
          description="Hekim bazlı sütun görünümü (Hekim) ile günlük yoğunluğu yönetebilirsiniz. Randevuları sürükle-bırak ile taşıyabilir, boşluklara tıklayarak hızlı randevu oluşturabilirsiniz."
        />
      }
    >
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sol Panel: Mini Takvim + Hekimler Alanı (spec §2.1) */}
        <div className="lg:w-[260px] flex-shrink-0 space-y-4">
          <MiniCalendar selectedDate={currentDate} onDateSelect={setCurrentDate} occupancy={occupancy} />

          {view !== 'chair' && (
            <div className="p-3 bg-white dark:bg-[#1c1f2e] border border-slate-200/60 dark:border-white/5 rounded-xl">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hekimler</span>
                <button
                  onClick={() => setSelectedDoctorIds(selectedDoctorIds.size === doctors.length ? new Set([doctors[0]?.id].filter(Boolean)) : new Set(doctors.map(d => d.id)))}
                  className="text-[10px] font-bold text-metronic-primary hover:underline"
                >
                  {selectedDoctorIds.size === doctors.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                </button>
              </div>
              <div className="space-y-0.5 max-h-[220px] overflow-y-auto">
                {doctors.map(d => {
                  const isSelected = selectedDoctorIds.has(d.id);
                  return (
                    <div key={d.id} onClick={() => handleToggleDoctor(d.id)} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                      <div className={`w-4 h-4 flex-shrink-0 flex items-center justify-center rounded border transition-colors`} style={{ backgroundColor: isSelected ? d.color : 'transparent', borderColor: d.color || '#cbd5e1' }}>
                        {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                      </div>
                      <span className="truncate">{d.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Ana Takvim */}
        <div className="flex-1 m-card shadow-sm border border-slate-200/60 dark:border-white/5 rounded-xl overflow-hidden bg-white dark:bg-[#1c1f2e] animate-in fade-in duration-200 min-w-0">
          <CalendarHeader
            currentDate={currentDate}
            onNavigate={handleNavigate}
            onDateSelect={setCurrentDate}
            view={view}
            onViewChange={setView}
            onAddAppointment={() => { setModalData(undefined); setIsModalOpen(true); }}
            onPrintCalendar={() => setIsPrintModalOpen(true)}
          />

          <CalendarGrid
            view={view}
            currentDate={currentDate}
            appointments={view === 'chair' ? appointments : appointments.filter(a => selectedDoctorIds.has(a.doctorId))}
            doctors={visibleDoctors}
            chairs={chairs}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
            onAppointmentMove={handleAppointmentMove}
            onMoveBlocked={(message) => addToast({ title: 'Taşınamadı', message, type: 'error' })}
          />
        </div>
      </div>

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        initialData={modalData}
        doctors={doctors}
        patients={patients}
        chairs={chairs}
      />

      <AppointmentPopover
        isOpen={isPopoverOpen}
        onClose={handleClosePopover}
        appointment={popoverAppointment}
        onCheckIn={handleCheckIn}
        onCancel={handleCancelAppointment}
        onPostpone={handlePostponeAppointment}
        onEdit={handleEditFromPopover}
      />

      <PrintCalendarModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        doctors={doctors}
        defaultDate={currentDate}
      />
    </MetronicLayout>
  );
}
