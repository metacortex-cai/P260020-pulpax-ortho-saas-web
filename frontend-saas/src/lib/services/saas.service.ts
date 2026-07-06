import api from '../api';
import { Treatment } from '../tdb_treatments';

export interface TariffPackagePublishResult {
  publishedAt: string;
  clinicsUpdated: number;
}

export interface DashboardStats {
  totalClinics: number;
  activeClinics: number;
  suspendedClinics: number;
  totalMRR: number;
  totalSMSQuota: number;
}

export interface Clinic {
  id: string;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  plan: string;
  status: string;
  databaseUrl?: string;
  subscriptionEndDate?: string;
  smsQuota?: number;
  currentBalance?: number;
  createdAt?: string;
  joinedAt?: string;
}

export interface Admin {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface MasterTreatment {
  id: string;
  name: string;
  sutCode?: string;
  description?: string;
}

export const SaasService = {
  // ---- Dashboard ----
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/saas/stats');
    return response.data;
  },

  // ---- Clinics ----
  async getClinics(): Promise<Clinic[]> {
    const response = await api.get<Clinic[]>('/saas/clinics');
    return response.data;
  },

  async getClinicById(id: string): Promise<Clinic> {
    const response = await api.get<Clinic>(`/saas/clinics/${id}`);
    return response.data;
  },

  async createClinic(data: Partial<Clinic>): Promise<Clinic> {
    const response = await api.post<Clinic>('/saas/clinics', data);
    return response.data;
  },

  async updateClinic(id: string, data: Partial<Clinic>): Promise<Clinic> {
    const response = await api.put<Clinic>(`/saas/clinics/${id}`, data);
    return response.data;
  },

  async adjustSmsQuota(clinicId: string, amount: number): Promise<void> {
    await api.post(`/saas/clinics/${clinicId}/sms-quota`, { amount });
  },

  // ---- Admins ----
  async getAdmins(): Promise<Admin[]> {
    const response = await api.get<Admin[]>('/saas/admins');
    return response.data;
  },

  async createAdmin(data: Partial<Admin> & { password: string }): Promise<Admin> {
    const response = await api.post<Admin>('/saas/admins', data);
    return response.data;
  },

  async updateAdmin(id: string, data: Partial<Admin> & { password?: string }): Promise<Admin> {
    const response = await api.put<Admin>(`/saas/admins/${id}`, data);
    return response.data;
  },

  // ---- Master Treatments ----
  async getMasterTreatments(): Promise<MasterTreatment[]> {
    const response = await api.get<MasterTreatment[]>('/saas/treatments');
    return response.data;
  },

  async createMasterTreatment(data: Pick<MasterTreatment, 'name' | 'sutCode' | 'description'>): Promise<MasterTreatment> {
    const response = await api.post<MasterTreatment>('/saas/treatments', data);
    return response.data;
  },

  async updateMasterTreatment(id: string, data: Partial<MasterTreatment>): Promise<MasterTreatment> {
    const response = await api.put<MasterTreatment>(`/saas/treatments/${id}`, data);
    return response.data;
  },

  async deleteMasterTreatment(id: string): Promise<void> {
    await api.delete(`/saas/treatments/${id}`);
  },

  // ---- Tariff Packages ----
  async publishTariffPackage(year: number, treatments: Treatment[]): Promise<TariffPackagePublishResult> {
    const response = await api.post<TariffPackagePublishResult>('/saas/tariff-packages/publish', {
      year,
      name: `TDB ${year} Yılı Asgari Ücret Tarifesi`,
      treatments: treatments.map(t => ({
        sutCode: t.sutCode,
        name: t.name,
        category: t.category,
        vatRate: t.vatRate,
        priceExclVat: t.priceExclVat,
        priceInclVat: t.priceInclVat,
      })),
    });
    return response.data;
  },
};
