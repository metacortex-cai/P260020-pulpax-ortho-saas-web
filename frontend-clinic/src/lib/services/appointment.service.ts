import api from '../api';
import {
  Appointment,
  CreateAppointmentPayload,
  CreateAppointmentSeriesPayload,
  CreateAppointmentSeriesResult,
  AppointmentSeries,
} from '../types';

export type { AppointmentConflictInfo } from '../types';

export interface AppointmentWithPatient extends Appointment {
  patient: {
    firstName: string;
    lastName: string;
    phone?: string;
    fileNo?: number | null;
  };
  doctor?: {
    firstName: string;
    lastName: string;
  } | null;
  treatmentItems?: any[];
}

export interface AppointmentRequest {
  id: string;
  patientName: string;
  phone?: string;
  requestedDate?: string;
  requestedTime?: string;
  doctorName?: string;
  treatmentType?: string;
  status: 'BEKLEMEDE' | 'ONAYLANDI' | 'REDDEDİLDİ';
  requestDate?: string;
  createdAt?: string;
}

export const AppointmentService = {
  async findAll(startDate?: string, endDate?: string, doctorId?: string, chairId?: string, clinicBranchId?: string): Promise<AppointmentWithPatient[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (doctorId) params.append('doctorId', doctorId);
    if (chairId) params.append('chairId', chairId);
    if (clinicBranchId) params.append('clinicBranchId', clinicBranchId);

    const response = await api.get<AppointmentWithPatient[]>(`/appointments?${params.toString()}`);
    return response.data;
  },

  async getChairs(): Promise<any[]> {
    const response = await api.get<any[]>('/appointments/chairs');
    return response.data;
  },

  // Mini takvim doluluk özeti (spec §8.3) — month: "YYYY-MM"
  async getOccupancy(month: string, doctorIds: string[]): Promise<{ date: string; total: number; capacityMinutes: number }[]> {
    const response = await api.get(`/appointments/occupancy?month=${month}&doctorIds=${doctorIds.join(',')}`);
    return response.data;
  },

  async createChair(payload: { name: string; color?: string; clinicBranchId?: string }): Promise<any> {
    const response = await api.post<any>('/appointments/chairs', payload);
    return response.data;
  },

  async updateChair(id: string, payload: { name?: string; color?: string; clinicBranchId?: string; isActive?: boolean }): Promise<any> {
    const response = await api.patch<any>(`/appointments/chairs/${id}`, payload);
    return response.data;
  },

  // ADR-004: `/patients/:id/appointments` hiç var olmadı (backend'de yok) — bu
  // artık mevcut GET /appointments?patientId=... filtresine yönlendirilir.
  // startDate/endDate opsiyoneldir; verilmezse hastanın TÜM randevuları döner.
  async findByPatient(patientId: string, startDate?: string, endDate?: string): Promise<AppointmentWithPatient[]> {
    const params = new URLSearchParams();
    params.append('patientId', patientId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<AppointmentWithPatient[]>(`/appointments?${params.toString()}`);
    return response.data;
  },

  async findOne(id: string): Promise<AppointmentWithPatient> {
    const response = await api.get<AppointmentWithPatient>(`/appointments/${id}`);
    return response.data;
  },

  async create(payload: CreateAppointmentPayload): Promise<Appointment> {
    const response = await api.post<Appointment>('/appointments', payload);
    return response.data;
  },

  // ADR-004 §3/§4: Google Calendar tarzı tekrarlı randevu serisi oluşturur.
  // 201 → { seriesId, occurrences: Appointment[], skipped: [...] }; 409 → mevcut
  // tekli-randevu çakışma şekliyle birebir (force olmadan hekim çakışması).
  async createSeries(payload: CreateAppointmentSeriesPayload): Promise<CreateAppointmentSeriesResult> {
    const response = await api.post<CreateAppointmentSeriesResult>('/appointments/series', payload);
    return response.data;
  },

  async getSeries(id: string): Promise<AppointmentSeries> {
    const response = await api.get<AppointmentSeries>(`/appointments/series/${id}`);
    return response.data;
  },

  // ADR-004 §3: "Bu ve sonraki etkinlikler" — fromAppointmentId'nin seriesSeq'inden
  // itibaren (dahil) seri içindeki tüm occurrence'ları CANCELLED yapar.
  async cancelSeriesRemaining(seriesId: string, fromAppointmentId: string): Promise<{ cancelledCount: number }> {
    const response = await api.patch<{ cancelledCount: number }>(`/appointments/series/${seriesId}/cancel-remaining`, {
      fromAppointmentId,
    });
    return response.data;
  },

  async updateStatus(id: string, status: string): Promise<Appointment> {
    const response = await api.patch<Appointment>(`/appointments/${id}/status`, { status });
    return response.data;
  },

  // Spec §4.3/§10.3: eski randevu 'postponed' olur, yeni randevu eski bilgilerle oluşturulur
  async postpone(id: string, newStartOn: string, newEndOn: string): Promise<Appointment & { newAppointmentId: string }> {
    const response = await api.patch<Appointment & { newAppointmentId: string }>(`/appointments/${id}/status`, {
      status: 'POSTPONED',
      newStartOn,
      newEndOn,
    });
    return response.data;
  },

  async checkWorkHours(employeeId: string, startOn: string, endOn: string): Promise<{
    outsideWorkHours: boolean;
    employeeName?: string;
    workStart?: string | null;
    workEnd?: string | null;
    message?: string;
  }> {
    const response = await api.post('/appointments/check-work-hours', { employeeId, startOn, endOn });
    return response.data;
  },

  async update(id: string, payload: Partial<Appointment> & { force?: boolean }): Promise<Appointment> {
    const response = await api.patch<Appointment>(`/appointments/${id}`, payload);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/appointments/${id}`);
  },

  async getRequests(status?: string): Promise<AppointmentRequest[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const response = await api.get<AppointmentRequest[]>(`/appointments/requests?${params.toString()}`);
    return response.data;
  },

  async updateRequestStatus(id: string, status: string): Promise<void> {
    await api.patch(`/appointments/requests/${id}/status`, { status });
  }
};
