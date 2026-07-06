/**
 * API Response Types
 * Frontend ve Backend tarafından paylaşılan türler
 */

// ==================== AUTH TYPES ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'SUPERADMIN' | 'DOCTOR' | 'ASSISTANT' | 'RECEPTION';
  clinicId: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  user: AuthUser;
}

// ==================== PATIENT TYPES ====================

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

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId?: string;
}

export interface PatientResponse {
  data: Patient;
  message?: string;
}

export interface PatientsListResponse {
  data: Patient[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== APPOINTMENT TYPES ====================

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

export interface CreateAppointmentRequest {
  patientId: string;
  doctorId: string;
  startOn: string; // ISO 8601
  endOn: string;   // ISO 8601
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
}

export interface AppointmentResponse {
  data: Appointment;
  message?: string;
}

// ==================== API ERROR TYPES ====================

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
  errors?: Record<string, string[]>;
  stack?: string; // Yalnızca development'da
}

// ==================== GENERIC TYPES ====================

export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== AUDIT LOG TYPES ====================

export interface AuditLog {
  id: string;
  userId: string;
  clinicId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
