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
}

export interface CreatePatientPayload {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId?: string;
}

// ==================== APPOINTMENT ====================

export type AppointmentStatus = 'PLANNED' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'POSTPONED';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  status: AppointmentStatus;
  startOn: string;
  endOn: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  startOn: string;
  endOn: string;
}

// ==================== ERROR ====================

export interface ApiError {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  errors?: Record<string, string[]>;
}
