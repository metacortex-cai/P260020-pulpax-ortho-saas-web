import api from '../api';
import { Tariff } from './treatment.service';

// ── Tipler ──────────────────────────────────────────────────────────────────

export interface OrthoTreatmentItem {
  id: string;
  planId: string;
  tariffId: string;
  doctorId: string;
  status: string;
  price: number;
  tariff?: Tariff;
}

export interface OrthoDiagnosis {
  id: string;
  caseId: string;
  examDate: string;
  doctorId?: string | null;
  skeletalClass?: string | null;
  profileType?: string | null;
  overjet?: number | null;
  overbite?: number | null;
  crowding?: string | null;
  openBite?: string | null;
  deepBite?: string | null;
  crossbite?: string | null;
  midlineDeviation?: string | null;
  tmjAssessment?: string | null;
  cephalometricValues?: Record<string, any> | null;
  boltonAnalysis?: string | null;
  haysNanceAnalysis?: string | null;
  iconScore?: number | null;
  iconDetails?: Record<string, any> | null;
  notes?: string | null;
  createdAt: string;
}

export interface OrthoRecordSet {
  id: string;
  caseId: string;
  recordType: string;
  phase: string;
  name: string;
  fileUrl: string;
  fileType?: string | null;
  description?: string | null;
  takenAt: string;
}

export interface OrthoAdjustmentVisit {
  id: string;
  trackId: string;
  appointmentId?: string | null;
  visitDate: string;
  doctorId?: string | null;
  wireSize?: string | null;
  elasticType?: string | null;
  iprDone: boolean;
  iprNote?: string | null;
  complianceNote?: string | null;
  nextVisitWeeks?: number | null;
  isEmergency: boolean;
  note?: string | null;
}

export interface OrthoActivationLog {
  id: string;
  trackId: string;
  date: string;
  logType: string; // VIDA_TURU | KULLANIM_SURESI | EGZERSIZ
  value?: number | null;
  unit?: string | null; // TUR | SAAT | TEKRAR
  note?: string | null;
}

export interface OrthoAlignerSet {
  id: string;
  trackId: string;
  setNo: number;
  deliveryDate: string;
  isRefinement: boolean;
  wearComplianceNote?: string | null;
}

export interface OrthoTreatmentTrack {
  id: string;
  caseId: string;
  trackType: string;
  treatmentItemId?: string | null;
  treatmentItem?: OrthoTreatmentItem | null;
  status: string;
  startDate: string;
  endDate?: string | null;
  applianceInfo?: string | null;
  notes?: string | null;
  adjustmentVisits: OrthoAdjustmentVisit[];
  activationLogs: OrthoActivationLog[];
  alignerSets: OrthoAlignerSet[];
}

export interface OrthoMiniScrewRecord {
  id: string;
  caseId: string;
  treatmentItemId?: string | null;
  treatmentItem?: OrthoTreatmentItem | null;
  region: string;
  placementDate: string;
  purpose?: string | null;
  removalDate?: string | null;
  followUpDates: string[];
  status: string;
  note?: string | null;
}

export interface OrthoGrowthAssessment {
  id: string;
  caseId: string;
  xrayDate: string;
  skeletalAge?: string | null;
  growthPhase?: string | null;
  note?: string | null;
}

export interface OrthoRetentionPlan {
  id: string;
  caseId: string;
  retainerType: string;
  archCoverage: string;
  deliveryDate?: string | null;
  followUpSchedule?: any;
  usageInstruction?: string | null;
  status: string;
  note?: string | null;
}

export interface OrthoCase {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId?: string | null;
  doctor?: { id: string; firstName: string; lastName: string } | null;
  startDate: string;
  status: string; // AKTIF | TAMAMLANDI | RETANSIYONDA | IPTAL
  complaint?: string | null;
  expectation?: string | null;
  notes?: string | null;
  diagnoses: OrthoDiagnosis[];
  recordSets: OrthoRecordSet[];
  tracks: OrthoTreatmentTrack[];
  miniScrews: OrthoMiniScrewRecord[];
  growthAssessments: OrthoGrowthAssessment[];
  retentionPlans: OrthoRetentionPlan[];
}

// ── Servis ──────────────────────────────────────────────────────────────────

export const OrthodonticsService = {
  async findCasesByPatient(patientId: string): Promise<OrthoCase[]> {
    const response = await api.get<OrthoCase[]>(`/orthodontics/cases?patientId=${patientId}`);
    return response.data;
  },

  async createCase(data: {
    patientId: string;
    doctorId?: string;
    complaint?: string;
    expectation?: string;
    notes?: string;
  }): Promise<OrthoCase> {
    const response = await api.post<OrthoCase>('/orthodontics/cases', data);
    return response.data;
  },

  async updateCase(caseId: string, data: Partial<Pick<OrthoCase, 'status' | 'doctorId' | 'complaint' | 'expectation' | 'notes'>>): Promise<OrthoCase> {
    const response = await api.patch<OrthoCase>(`/orthodontics/cases/${caseId}`, data);
    return response.data;
  },

  async addDiagnosis(caseId: string, data: Partial<OrthoDiagnosis>): Promise<OrthoDiagnosis> {
    const response = await api.post<OrthoDiagnosis>(`/orthodontics/cases/${caseId}/diagnoses`, data);
    return response.data;
  },

  async deleteDiagnosis(diagnosisId: string): Promise<void> {
    await api.delete(`/orthodontics/diagnoses/${diagnosisId}`);
  },

  async addRecord(caseId: string, data: Partial<OrthoRecordSet>): Promise<OrthoRecordSet> {
    const response = await api.post<OrthoRecordSet>(`/orthodontics/cases/${caseId}/records`, data);
    return response.data;
  },

  async uploadRecord(
    caseId: string,
    file: File,
    meta: { recordType: string; phase: string; name?: string; description?: string; takenAt?: string },
  ): Promise<OrthoRecordSet> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('recordType', meta.recordType);
    formData.append('phase', meta.phase);
    if (meta.name) formData.append('name', meta.name);
    if (meta.description) formData.append('description', meta.description);
    if (meta.takenAt) formData.append('takenAt', meta.takenAt);

    const response = await api.post<OrthoRecordSet>(`/orthodontics/cases/${caseId}/records/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteRecord(recordId: string): Promise<void> {
    await api.delete(`/orthodontics/records/${recordId}`);
  },

  async createTrack(caseId: string, data: {
    trackType: string;
    tariffId?: string;
    doctorId?: string;
    price?: number;
    startDate?: string;
    applianceInfo?: string;
    notes?: string;
  }): Promise<OrthoTreatmentTrack> {
    const response = await api.post<OrthoTreatmentTrack>(`/orthodontics/cases/${caseId}/tracks`, data);
    return response.data;
  },

  async updateTrack(trackId: string, data: { status?: string; endDate?: string; applianceInfo?: string; notes?: string }): Promise<OrthoTreatmentTrack> {
    const response = await api.patch<OrthoTreatmentTrack>(`/orthodontics/tracks/${trackId}`, data);
    return response.data;
  },

  // ADR-004 §2/§4: appointmentId doluysa backend bağlı randevuyu COMPLETED yapar
  // (geriye bağlama); scheduleNextAppointment doluysa yeni bir KONTROL randevusu
  // oluşturur (ileriye bağlama).
  async addAdjustmentVisit(
    trackId: string,
    data: Partial<OrthoAdjustmentVisit> & {
      scheduleNextAppointment?: { doctorId: string; chairId?: string; startOn: string; endOn: string };
    },
  ): Promise<OrthoAdjustmentVisit> {
    const response = await api.post<OrthoAdjustmentVisit>(`/orthodontics/tracks/${trackId}/visits`, data);
    return response.data;
  },

  async deleteAdjustmentVisit(visitId: string): Promise<void> {
    await api.delete(`/orthodontics/visits/${visitId}`);
  },

  async addActivationLog(trackId: string, data: Partial<OrthoActivationLog>): Promise<OrthoActivationLog> {
    const response = await api.post<OrthoActivationLog>(`/orthodontics/tracks/${trackId}/activations`, data);
    return response.data;
  },

  async deleteActivationLog(logId: string): Promise<void> {
    await api.delete(`/orthodontics/activations/${logId}`);
  },

  async addAlignerSet(trackId: string, data: Partial<OrthoAlignerSet>): Promise<OrthoAlignerSet> {
    const response = await api.post<OrthoAlignerSet>(`/orthodontics/tracks/${trackId}/aligner-sets`, data);
    return response.data;
  },

  async deleteAlignerSet(setId: string): Promise<void> {
    await api.delete(`/orthodontics/aligner-sets/${setId}`);
  },

  async addMiniScrew(caseId: string, data: Partial<OrthoMiniScrewRecord> & { tariffId?: string; doctorId?: string; price?: number }): Promise<OrthoMiniScrewRecord> {
    const response = await api.post<OrthoMiniScrewRecord>(`/orthodontics/cases/${caseId}/mini-screws`, data);
    return response.data;
  },

  async updateMiniScrew(screwId: string, data: { status?: string; removalDate?: string; followUpDates?: string[]; note?: string }): Promise<OrthoMiniScrewRecord> {
    const response = await api.patch<OrthoMiniScrewRecord>(`/orthodontics/mini-screws/${screwId}`, data);
    return response.data;
  },

  async addGrowthAssessment(caseId: string, data: Partial<OrthoGrowthAssessment>): Promise<OrthoGrowthAssessment> {
    const response = await api.post<OrthoGrowthAssessment>(`/orthodontics/cases/${caseId}/growth-assessments`, data);
    return response.data;
  },

  async updateGrowthAssessment(assessmentId: string, data: Partial<OrthoGrowthAssessment>): Promise<OrthoGrowthAssessment> {
    const response = await api.patch<OrthoGrowthAssessment>(`/orthodontics/growth-assessments/${assessmentId}`, data);
    return response.data;
  },

  async deleteGrowthAssessment(assessmentId: string): Promise<void> {
    await api.delete(`/orthodontics/growth-assessments/${assessmentId}`);
  },

  async addRetentionPlan(caseId: string, data: Partial<OrthoRetentionPlan>): Promise<OrthoRetentionPlan> {
    const response = await api.post<OrthoRetentionPlan>(`/orthodontics/cases/${caseId}/retention-plans`, data);
    return response.data;
  },

  async updateRetentionPlan(planId: string, data: Partial<Pick<OrthoRetentionPlan, 'status' | 'deliveryDate' | 'followUpSchedule' | 'note'>>): Promise<OrthoRetentionPlan> {
    const response = await api.patch<OrthoRetentionPlan>(`/orthodontics/retention-plans/${planId}`, data);
    return response.data;
  },

  async deleteRetentionPlan(planId: string): Promise<void> {
    await api.delete(`/orthodontics/retention-plans/${planId}`);
  },
};
