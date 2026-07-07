import api from '../api';
import { Patient, CreatePatientPayload } from '../types';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7010/api/v1').replace(/\/api\/v1\/?$/, '');

/**
 * Backend'in döndürdüğü dosya yolu göreceli ise (örn. /uploads/...), API origin'i ile birleştirir.
 */
export function resolveDocumentUrl(fileUrl: string): string {
  if (!fileUrl) return fileUrl;
  return /^https?:\/\//i.test(fileUrl) ? fileUrl : `${API_ORIGIN}${fileUrl}`;
}

export interface PatientLogEntry {
  id: string;
  at: string;
  user: string;
  op: 'ADD' | 'UPDATE' | 'DELETE';
  module: string;
  changedFields: string[];
}

export interface PatientDocument {
  id: string;
  name: string;
  fileType: string;
  category: 'X-RAY' | 'PHOTO' | 'CONSENT' | 'OTHER';
  fileUrl: string;
  fileSize?: number;
  description?: string;
  createdAt: string;
}

export interface PatientNote {
  id: string;
  type: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface PatientPrescription {
  id: string;
  protocolNo: string;
  date: string;
  doctor: string;
  drugs: string[];
}

export interface PatientListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  clinicBranchId?: string;
}

export interface PatientListResult {
  data: Patient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const PatientService = {
  /**
   * Hastaları sunucu taraflı sayfalama/arama/sıralama ile listeler
   */
  async findAll(params?: PatientListParams): Promise<PatientListResult> {
    const response = await api.get<PatientListResult>('/patients', { params });
    return response.data;
  },

  /**
   * ID ile hasta detayı getirir
   */
  async findOne(id: string): Promise<Patient & { documents?: PatientDocument[]; anamnesis?: any } & Record<string, any>> {
    const response = await api.get<Patient & { documents?: PatientDocument[]; anamnesis?: any } & Record<string, any>>(`/patients/${id}`);
    return response.data;
  },

  /**
   * Yeni hasta oluşturur
   */
  async create(payload: CreatePatientPayload): Promise<Patient> {
    const response = await api.post<Patient>('/patients', payload);
    return response.data;
  },

  /**
   * Hasta bilgilerini günceller
   */
  async update(id: string, payload: Partial<Patient>): Promise<Patient> {
    const response = await api.put<Patient>(`/patients/${id}`, payload);
    return response.data;
  },

  /**
   * Hasta silme
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/patients/${id}`);
  },

  // --- Documents ---

  async uploadDocument(
    patientId: string,
    file: File,
    meta: { name?: string; category?: string; description?: string },
  ): Promise<PatientDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (meta.name) formData.append('name', meta.name);
    if (meta.category) formData.append('category', meta.category);
    if (meta.description) formData.append('description', meta.description);

    const response = await api.post<PatientDocument>(`/patients/${patientId}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteDocument(docId: string): Promise<void> {
    await api.delete(`/patients/documents/${docId}`);
  },

  async uploadPhoto(id: string, file: File): Promise<Patient> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<Patient>(`/patients/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deletePhoto(id: string): Promise<Patient> {
    const response = await api.delete<Patient>(`/patients/${id}/photo`);
    return response.data;
  },

  async ocrConsentForm(patientId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/patients/${patientId}/consent-ocr`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // --- Audit Logs ---

  async getLogs(patientId: string): Promise<PatientLogEntry[]> {
    const response = await api.get<PatientLogEntry[]>(`/patients/${patientId}/logs`);
    return response.data;
  },

  // --- Notes ---

  async getNotes(patientId: string): Promise<PatientNote[]> {
    const response = await api.get<PatientNote[]>(`/patients/${patientId}/notes`);
    return response.data;
  },

  async createNote(patientId: string, payload: { type?: string; content: string }): Promise<PatientNote> {
    const response = await api.post<PatientNote>(`/patients/${patientId}/notes`, payload);
    return response.data;
  },

  async deleteNote(noteId: string): Promise<void> {
    await api.delete(`/patients/notes/${noteId}`);
  },

  // --- Prescriptions ---

  async getPrescriptions(patientId: string): Promise<PatientPrescription[]> {
    const response = await api.get<PatientPrescription[]>(`/patients/${patientId}/prescriptions`);
    return response.data;
  },

  async createPrescription(
    patientId: string,
    payload: { date: string; doctor: string; drugs: string[] },
  ): Promise<PatientPrescription> {
    const response = await api.post<PatientPrescription>(`/patients/${patientId}/prescriptions`, payload);
    return response.data;
  },

  async deletePrescription(id: string): Promise<void> {
    await api.delete(`/patients/prescriptions/${id}`);
  },
};
