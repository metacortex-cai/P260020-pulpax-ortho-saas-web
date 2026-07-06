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
}

export interface CreatePatientPayload {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId?: string;
}

// ==================== APPOINTMENT ====================

export type AppointmentStatus = 'PLANNED' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'POSTPONED';

export interface DentalChair {
  id: string;
  name: string;
  color?: string;
  isActive: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  chairId?: string | null;
  status: AppointmentStatus;
  type?: string | null;
  startOn: string;
  endOn: string;
  notes?: string | null;
  postponedFrom?: string | null;
  linkedTo?: string | null;
  isOutsideWorkHours?: boolean;
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
  startOn: string;
  endOn: string;
  notes?: string;
  type?: string;
  treatmentItemIds?: string[];
  // Hekimin bu saat diliminde başka aktif randevusu varsa varsayılan olarak 409
  // (conflict) döner; force:true ile kullanıcı çakışmayı onaylayıp geçer.
  force?: boolean;
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
