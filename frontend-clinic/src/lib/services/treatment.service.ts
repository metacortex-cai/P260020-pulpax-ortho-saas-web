import api from '../api';

export interface MasterTreatment {
  id: string;
  name: string;
  sutCode?: string;
  category?: string;
}

export interface Tariff {
  id: string;
  price: number;
  taxRate: number;
  status?: string;
  currency?: string;
  masterTreatment: MasterTreatment;
}

export interface TariffGroupInfo {
  id: string;
  name: string;
  type: string;
  validity?: string;
  treatmentCount: number;
  status: string;
}

export interface PlanInstallment {
  id: string;
  planId: string;
  label: string;
  dueDate: string;
  amount: number;
  order: number;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  status: string;
  totalPrice: number;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  items: TreatmentItem[];
  installments?: PlanInstallment[];
}

export interface TreatmentItem {
  id: string;
  planId: string;
  tariffId: string;
  doctorId: string;
  appointmentId?: string;
  toothNo?: number;
  price: number;
  status: string;
  tariff?: Tariff;
  paymentDistributions?: { amount: number }[];
}

export const TreatmentService = {
  async findPlansByPatient(patientId: string): Promise<TreatmentPlan[]> {
    const response = await api.get<TreatmentPlan[]>(`/treatments/plans?patientId=${patientId}`);
    return response.data;
  },

  async createPlan(data: { patientId: string, items: Partial<TreatmentItem>[] }): Promise<TreatmentPlan> {
    const response = await api.post<TreatmentPlan>('/treatments/plans', data);
    return response.data;
  },

  async activatePlan(planId: string, installments?: { label: string; dueDate: string; amount: number }[], description?: string): Promise<TreatmentPlan> {
    const response = await api.post<TreatmentPlan>(`/treatments/plans/${planId}/activate`, { installments, description });
    return response.data;
  },

  async updateContract(planId: string, installments?: { label: string; dueDate: string; amount: number }[], description?: string): Promise<TreatmentPlan> {
    const response = await api.patch<TreatmentPlan>(`/treatments/plans/${planId}/contract`, { installments, description });
    return response.data;
  },

  async cancelPlan(planId: string): Promise<TreatmentPlan> {
    const response = await api.post<TreatmentPlan>(`/treatments/plans/${planId}/cancel`);
    return response.data;
  },

  async addItemsToPlan(planId: string, items: Partial<TreatmentItem>[]): Promise<TreatmentPlan> {
    const response = await api.post<TreatmentPlan>(`/treatments/plans/${planId}/items`, { items });
    return response.data;
  },

  async deletePlan(planId: string): Promise<void> {
    await api.delete(`/treatments/plans/${planId}`);
  },

  async deleteItems(ids: string[], reallocate?: boolean): Promise<{ success: boolean; deletedCount: number; reallocatedToDebt: number; reallocatedToAdvance: number }> {
    const response = await api.delete('/treatments/items', { data: { ids, reallocate } });
    return response.data;
  },

  async updateItemStatus(itemId: string, status: string): Promise<TreatmentItem> {
    const response = await api.patch<TreatmentItem>(`/treatments/items/${itemId}/status`, { status });
    return response.data;
  },

  async updateItemDoctor(itemId: string, doctorId: string): Promise<TreatmentItem> {
    const response = await api.patch<TreatmentItem>(`/treatments/items/${itemId}/doctor`, { doctorId });
    return response.data;
  },

  async getTariffs(groupId?: string): Promise<Tariff[]> {
    const url = groupId ? `/treatments/tariffs?groupId=${groupId}` : '/treatments/tariffs';
    const response = await api.get<Tariff[]>(url);
    return response.data;
  },

  async getTariffGroups(): Promise<TariffGroupInfo[]> {
    const response = await api.get<TariffGroupInfo[]>('/treatments/tariff-groups');
    return response.data;
  },

  async createTariffGroup(data: { name: string; sourceGroupId?: string; validFrom?: string; validTo?: string }): Promise<any> {
    const response = await api.post<any>('/treatments/tariff-groups', data);
    return response.data;
  },

  async updateTariffGroup(id: string, data: { name?: string; isActive?: boolean }): Promise<any> {
    const response = await api.patch<any>(`/treatments/tariff-groups/${id}`, data);
    return response.data;
  },

  async deleteTariffGroup(id: string): Promise<any> {
    const response = await api.delete<any>(`/treatments/tariff-groups/${id}`);
    return response.data;
  },

  async updateTariff(id: string, data: { price?: number; taxRate?: number; status?: string; currency?: string }): Promise<any> {
    const response = await api.patch<any>(`/treatments/tariffs/${id}`, data);
    return response.data;
  },

  async bulkUpdateTariffs(groupId: string, items: any[]): Promise<any> {
    const response = await api.put<any>('/treatments/tariffs/bulk', { groupId, items });
    return response.data;
  },
};
