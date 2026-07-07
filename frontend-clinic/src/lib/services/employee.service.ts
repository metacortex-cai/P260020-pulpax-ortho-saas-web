import api from '../api';
import { resolveDocumentUrl } from './patient.service';

export { resolveDocumentUrl };

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isDoctor: boolean;
  userId?: string | null;
  // isDoctor=true olduğunda randevu/tedavi doktor seçicilerinin gerçek FK hedefi
  // olan Doctor kaydına bağlar (Doctor.service.ts / DoctorService.findAll() ile
  // eşleştirmek için kullanılır — bkz. HR restorasyon planı).
  doctorId?: string | null;
  phone?: string;
  title?: string;
  nationalId?: string;
  isActive: boolean;
  createdAt: string;
  calendarColor?: string | null;
  photoUrl?: string | null;
  leaves?: EmployeeLeave[];
  contracts?: EmployeeContract[];
  workHours?: any[];
  profile?: EmployeeProfile | null;
  contacts?: EmployeeContact[];
  documents?: EmployeeDocument[];
}

export interface EmployeeProfile {
  id: string;
  employeeId: string;
  personnelType: 'DOCTOR' | 'ASSISTANT' | 'MANAGER' | 'OTHER';
  birthDate?: string | null;
  bloodType?: string | null;
  school?: string | null;
  educationField?: string | null;
  educationLevel?: string | null;
  graduationYear?: number | null;
  diplomaNo?: string | null;
  department?: string | null;
  position?: string | null;
  hireDate?: string | null;
  employmentType?: string | null;
  sgkRegistryNo?: string | null;
  calendarColor?: string | null;
}

export interface EmployeeContact {
  id: string;
  type: 'PHONE' | 'EMAIL' | 'ADDRESS' | 'EMERGENCY_CONTACT';
  value: string;
  label?: string | null;
  emergencyName?: string | null;
  emergencyRelation?: string | null;
  createdAt: string;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  fileType: string;
  category: 'DIPLOMA' | 'SOZLESME' | 'KIMLIK' | 'SERTIFIKA' | 'DIGER';
  fileUrl: string;
  fileSize?: number;
  description?: string;
  createdAt: string;
}

export interface LeavePayload {
  employeeId: string;
  startAt: string;
  endAt: string;
  type: string;
  force?: boolean;
  isFullDay?: boolean;
  description?: string;
}

export interface LeaveConflictError {
  conflict: true;
  appointmentCount: number;
  appointments: { id: string; patientName: string; startOn: string; endOn: string }[];
}

export interface EmployeeLeave {
  id: string;
  employeeId: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  startAt: string;
  endAt: string;
  isFullDay?: boolean;
  description?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface LeaveEntitlement {
  year: number;
  totalDays: number;
  carryOverDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface ContractCategoryRate {
  category: string;
  rate: number;
}

export interface ContractItemFee {
  masterTreatmentId: string;
  fixedFee: number;
}

export type PrimModel = 'MODEL_1' | 'MODEL_2' | 'MODEL_3' | 'MODEL_4';

export interface ContractPayload {
  employeeId: string;
  type: PrimModel;
  rate: number;
  validFrom: string;
  validUntil?: string;
  conditions?: string;
  fixedSalary?: number;
  rateMode?: 'BULK' | 'CATEGORY';
  targetEnabled?: boolean;
  targetAmount?: number;
  targetCarryOver?: boolean;
  categoryRates?: ContractCategoryRate[];
  itemFees?: ContractItemFee[];
}

export interface EmployeeContract {
  id: string;
  employeeId: string;
  version: number;
  type: PrimModel;
  rate: number;
  conditions?: string | null;
  validFrom: string;
  validUntil?: string | null;
  fixedSalary: number;
  rateMode: 'BULK' | 'CATEGORY';
  targetEnabled: boolean;
  targetAmount?: number | null;
  targetCarryOver: boolean;
  categoryRates: (ContractCategoryRate & { id: string })[];
  itemFees: (ContractItemFee & { id: string })[];
  createdAt: string;
}

export interface WorkHourPayload {
  dayOfWeek: number;
  isWorking: boolean;
  startTime?: string;
  endTime?: string;
}

export interface Commission {
  id: string;
  date: string;
  patientName: string;
  treatmentName: string;
  grossAmount: number;
  labCost: number;
  netAmount: number;
  rate: number;
  commission: number;
  status: string;
}

export interface TerminationImpact {
  appointmentCount: number;
  patientCount: number;
  incompleteTreatmentCount: number;
  requiresTransfer: boolean;
}

export interface Session {
  id: string;
  device: string;
  ip: string;
  location: string;
  current: boolean;
  date: string;
}

export const EmployeeService = {
  async findAll(includePassive = false): Promise<Employee[]> {
    const response = await api.get<Employee[]>(`/employees?includePassive=${includePassive}`);
    return response.data;
  },

  async findOne(id: string): Promise<Employee> {
    const response = await api.get<Employee>(`/employees/${id}`);
    return response.data;
  },

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    const response = await api.patch<Employee>(`/employees/${id}`, data);
    return response.data;
  },

  async create(data: any): Promise<Employee> {
    const response = await api.post<Employee>('/employees', data);
    return response.data;
  },

  async deactivate(id: string, reason: string, deactivatedAt?: string, transferToEmployeeId?: string): Promise<void> {
    await api.patch(`/employees/${id}/deactivate`, { reason, deactivatedAt, transferToEmployeeId });
  },

  async reactivate(id: string): Promise<void> {
    await api.patch(`/employees/${id}/reactivate`);
  },

  // İşten çıkış öncesi bir hekime atanmış devredilmesi gereken randevu/hasta/tedavi
  // kaydı olup olmadığını kontrol eder (hekim değilse her zaman requiresTransfer=false döner).
  async getTerminationImpact(id: string): Promise<TerminationImpact> {
    const response = await api.get<TerminationImpact>(`/employees/${id}/termination-impact`);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/employees/${id}`);
  },

  // Var olan bir personele giriş hesabı (User) bağlar (davet e-postası veya doğrudan şifre).
  async invite(id: string, data?: { role?: string; password?: string }): Promise<{ id: string; invited: boolean }> {
    const response = await api.post(`/employees/${id}/invite`, data || {});
    return response.data;
  },

  async getCommissions(id: string): Promise<Commission[]> {
    const response = await api.get<Commission[]>(`/employees/${id}/commissions`);
    return response.data;
  },

  async getSessions(): Promise<Session[]> {
    const response = await api.get<Session[]>('/auth/sessions');
    return response.data;
  },

  async revokeSession(sessionId: string): Promise<void> {
    await api.delete(`/auth/sessions/${sessionId}`);
  },

  async revokeAllOtherSessions(): Promise<void> {
    await api.delete('/auth/sessions/others');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.patch('/auth/change-password', { currentPassword, newPassword });
  },

  // HR Specific
  async findAllLeaves(startDate?: string, endDate?: string): Promise<EmployeeLeave[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get<EmployeeLeave[]>(`/employees/leaves?${params.toString()}`);
    return response.data;
  },

  async createLeave(data: LeavePayload): Promise<EmployeeLeave> {
    const response = await api.post<EmployeeLeave>('/employees/leaves', data);
    return response.data;
  },

  // Takvim ekranı, seçili hekimlerin mesai saatlerini tek istekte çeker
  async getWorkHoursBulk(employeeIds: string[]): Promise<Record<string, WorkHourPayload[]>> {
    const response = await api.get<Record<string, WorkHourPayload[]>>(`/employees/work-hours?employeeIds=${employeeIds.join(',')}`);
    return response.data;
  },

  async updateLeaveStatus(leaveId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING', rejectionReason?: string): Promise<EmployeeLeave> {
    const response = await api.patch<EmployeeLeave>(`/employees/leaves/${leaveId}/status`, { status, rejectionReason });
    return response.data;
  },

  async getLeaveEntitlement(id: string, year?: number): Promise<LeaveEntitlement> {
    const response = await api.get<LeaveEntitlement>(`/employees/${id}/leave-entitlement`, { params: year ? { year } : undefined });
    return response.data;
  },

  async upsertLeaveEntitlement(id: string, data: { year: number; totalDays: number; carryOverDays?: number }): Promise<LeaveEntitlement> {
    const response = await api.post<LeaveEntitlement>(`/employees/${id}/leave-entitlement`, data);
    return response.data;
  },

  async createContract(data: ContractPayload): Promise<EmployeeContract> {
    const response = await api.post<EmployeeContract>('/employees/contracts', data);
    return response.data;
  },

  async updateContract(contractId: string, data: Partial<ContractPayload>): Promise<EmployeeContract> {
    const response = await api.patch<EmployeeContract>(`/employees/contracts/${contractId}`, data);
    return response.data;
  },

  async deleteContract(contractId: string): Promise<void> {
    await api.delete(`/employees/contracts/${contractId}`);
  },

  async updateWorkHours(employeeId: string, workHours: WorkHourPayload[]): Promise<any> {
    const response = await api.post<any>('/employees/work-hours', { employeeId, workHours });
    return response.data;
  },

  // --- Personel Profili (ADR-003) ---

  async getProfile(id: string): Promise<EmployeeProfile | null> {
    const response = await api.get<EmployeeProfile | null>(`/employees/${id}/profile`);
    return response.data;
  },

  async upsertProfile(id: string, data: Partial<EmployeeProfile>): Promise<EmployeeProfile> {
    const response = await api.post<EmployeeProfile>(`/employees/${id}/profile`, data);
    return response.data;
  },

  // --- İletişim Bilgileri (ADR-003) ---

  async listContacts(id: string): Promise<EmployeeContact[]> {
    const response = await api.get<EmployeeContact[]>(`/employees/${id}/contacts`);
    return response.data;
  },

  async createContact(id: string, data: Partial<EmployeeContact>): Promise<EmployeeContact> {
    const response = await api.post<EmployeeContact>(`/employees/${id}/contacts`, data);
    return response.data;
  },

  async deleteContact(id: string, contactId: string): Promise<void> {
    await api.delete(`/employees/${id}/contacts/${contactId}`);
  },

  // --- Dokümanlar (ADR-003) ---

  async listDocuments(id: string): Promise<EmployeeDocument[]> {
    const response = await api.get<EmployeeDocument[]>(`/employees/${id}/documents`);
    return response.data;
  },

  async uploadDocument(
    id: string,
    file: File,
    meta: { name?: string; category?: string; description?: string },
  ): Promise<EmployeeDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (meta.name) formData.append('name', meta.name);
    if (meta.category) formData.append('category', meta.category);
    if (meta.description) formData.append('description', meta.description);

    const response = await api.post<EmployeeDocument>(`/employees/${id}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteDocument(id: string, documentId: string): Promise<void> {
    await api.delete(`/employees/${id}/documents/${documentId}`);
  },

  async uploadPhoto(id: string, file: File): Promise<Employee> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<Employee>(`/employees/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deletePhoto(id: string): Promise<Employee> {
    const response = await api.delete<Employee>(`/employees/${id}/photo`);
    return response.data;
  },
};
