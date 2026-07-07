/**
 * API Response Types for Frontend
 * Backend ile konsisten kalması için
 */

// ==================== AUTH ====================

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'DOCTOR' | 'ASSISTANT' | 'RECEPTION';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  clinicId: string;
}

export interface AuthResponse {
  user: User;
  tenantId: string;
}

// ==================== PATIENT ====================

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  nationalId?: string;
  totalDebt: number;
  advance: number;
  createdAt: string;
  updatedAt: string;
  photoUrl?: string | null;
  clinicBranchId?: string | null;
}

export interface CreatePatientPayload {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId?: string;
  clinicBranchId?: string;
}

// ==================== CLINIC BRANCH ====================

export interface ClinicBranch {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
}

// ==================== APPOINTMENT ====================

export type AppointmentStatus = 'PLANNED' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'POSTPONED';

export interface DentalChair {
  id: string;
  name: string;
  color?: string;
  isActive: boolean;
  clinicBranchId?: string | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  chairId?: string | null;
  clinicBranchId?: string | null;
  status: AppointmentStatus;
  type?: string | null;
  startOn: string;
  endOn: string;
  notes?: string | null;
  postponedFrom?: string | null;
  linkedTo?: string | null;
  isOutsideWorkHours?: boolean;
  // ADR-004: tekrarlı randevu serisi alanları — occurrence'lar seriesId ile
  // AppointmentSeries'e bağlanır, seriesSeq 1-tabanlı sıra ("3/8"), seriesException
  // occurrence tek başına taşındı/iptal edildi mi (Google Calendar "yalnızca bu etkinlik").
  seriesId?: string | null;
  seriesSeq?: number | null;
  seriesException?: boolean;
  createdAt: string;
  updatedAt: string;
  dentalChair?: {
    id: string;
    name: string;
    color?: string;
  };
}

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  chairId?: string;
  clinicBranchId?: string;
  startOn: string;
  endOn: string;
  notes?: string;
  type?: string;
  treatmentItemIds?: string[];
  // Hekimin bu saat diliminde başka aktif randevusu varsa varsayılan olarak 409
  // (conflict) döner; force:true ile kullanıcı çakışmayı onaylayıp geçer.
  force?: boolean;
}

// ADR-004 §4: POST /appointments/series body — backend CreateAppointmentSeriesDto ile birebir.
export interface CreateAppointmentSeriesPayload {
  patientId: string;
  doctorId: string;
  chairId?: string;
  type?: string;
  notes?: string;
  startOn: string;
  endOn: string;
  freq: 'WEEKLY' | 'MONTHLY';
  interval: number;
  count?: number;
  until?: string;
  force?: boolean;
}

export interface AppointmentSeriesSkipped {
  seq: number;
  startOn: string;
  endOn: string;
  reason: 'CHAIR_CONFLICT';
}

export interface CreateAppointmentSeriesResult {
  seriesId: string;
  occurrences: Appointment[];
  skipped: AppointmentSeriesSkipped[];
}

export interface AppointmentSeries {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  chairId?: string | null;
  type?: string | null;
  notes?: string | null;
  durationMinutes: number;
  freq: 'WEEKLY' | 'MONTHLY';
  interval: number;
  count?: number | null;
  until?: string | null;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  occurrences: Appointment[];
}

export interface AppointmentConflictInfo {
  conflict: true;
  appointmentCount: number;
  appointments: { id: string; patientName: string; startOn: string; endOn: string }[];
}

// ==================== ERROR ====================

export interface ApiError {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  errors?: Record<string, string[]>;
}
