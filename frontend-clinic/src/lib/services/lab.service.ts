import api from '../api';

export interface Lab {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxOffice?: string;
  taxNumber?: string;
  invoiceInfo?: string;
  isActive: boolean;
}

export interface LabProcedure {
  id: string;
  code: string;
  name: string;
  category: string;
  defaultCost: number;
  active: boolean;
}

export interface LabTariff {
  id: string;
  name: string;
  labId?: string;
  labName: string;
  validity?: string;
  validFrom?: string;
  validTo?: string;
  includedProcIds: string[];
  customPrices: Record<string, number>;
  status: 'AKTİF' | 'PASİF';
}

export type LabRecordType = 'GIDEN' | 'GELEN';
export type LabProcessType = 'YENI' | 'PROVA' | 'REVIZYON';

export interface LabOrder {
  id: string;
  labId?: string;
  lab?: Lab;
  treatmentItemId?: string;
  treatmentItem?: any;
  patientId?: string;
  patient?: any;
  doctorId?: string;
  clinicStaffId?: string;
  labStaffName?: string;
  procedureId?: string;
  procedure?: LabProcedure;
  orderNumber?: string | null;
  recordType: LabRecordType;
  processType: LabProcessType;
  parentId?: string;
  revisions?: LabOrder[];
  status: 'PENDING' | 'SENT' | 'RECEIVED' | 'FITTED' | 'REVISION' | 'CANCELLED';
  cost: number;
  sentDate?: string;
  dueDate?: string;
  receivedDate?: string;
  description?: string;
  colorCode?: string;
  createdAt: string;
}

export interface CreateLabOrderPayload {
  treatmentItemId?: string;
  patientId?: string;
  doctorId?: string;
  clinicStaffId?: string;
  labStaffName?: string;
  labId?: string;
  procedureId?: string;
  recordType?: LabRecordType;
  processType?: LabProcessType;
  cost?: number;
  sentDate?: string;
  dueDate?: string;
  description?: string;
  colorCode?: string;
}

export const LabService = {
  async getLabs(): Promise<Lab[]> {
    const response = await api.get<Lab[]>('/lab/labs');
    return response.data;
  },

  async createLab(data: Partial<Lab>): Promise<Lab> {
    const response = await api.post<Lab>('/lab/labs', data);
    return response.data;
  },

  async updateLab(id: string, data: Partial<Lab>): Promise<Lab> {
    const response = await api.patch<Lab>(`/lab/labs/${id}`, data);
    return response.data;
  },

  async deactivateLab(id: string): Promise<void> {
    await api.delete(`/lab/labs/${id}`);
  },

  async getOrders(status?: string): Promise<LabOrder[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const response = await api.get<LabOrder[]>(`/lab/orders?${params.toString()}`);
    return response.data;
  },

  async createOrder(data: CreateLabOrderPayload): Promise<LabOrder> {
    const response = await api.post<LabOrder>('/lab/orders', data);
    return response.data;
  },

  async updateOrderStatus(id: string, status: string, receivedDate?: string): Promise<void> {
    await api.patch(`/lab/orders/${id}/status`, { status, receivedDate });
  },

  async deliverOrder(id: string, data?: Partial<CreateLabOrderPayload>): Promise<LabOrder> {
    const response = await api.post<LabOrder>(`/lab/orders/${id}/deliver`, data || {});
    return response.data;
  },

  async addRevision(id: string, data: Partial<CreateLabOrderPayload>): Promise<LabOrder> {
    const response = await api.post<LabOrder>(`/lab/orders/${id}/revision`, data);
    return response.data;
  },

  async getStats(): Promise<any> {
    const response = await api.get<any>('/lab/stats');
    return response.data;
  },

  async getProcedureTypes(): Promise<LabProcedure[]> {
    const response = await api.get<LabProcedure[]>('/lab/procedures');
    return response.data;
  },

  async createProcedureType(data: Partial<LabProcedure>): Promise<LabProcedure> {
    const response = await api.post<LabProcedure>('/lab/procedures', data);
    return response.data;
  },

  async updateProcedureType(id: string, data: Partial<LabProcedure>): Promise<LabProcedure> {
    const response = await api.patch<LabProcedure>(`/lab/procedures/${id}`, data);
    return response.data;
  },

  async deactivateProcedureType(id: string): Promise<void> {
    await api.delete(`/lab/procedures/${id}`);
  },

  async getTariffs(): Promise<LabTariff[]> {
    const response = await api.get<LabTariff[]>('/lab/tariffs');
    return response.data;
  },

  async createTariff(data: Partial<LabTariff>): Promise<LabTariff> {
    const response = await api.post<LabTariff>('/lab/tariffs', data);
    return response.data;
  },

  async updateTariff(id: string, data: Partial<LabTariff>): Promise<LabTariff> {
    const response = await api.patch<LabTariff>(`/lab/tariffs/${id}`, data);
    return response.data;
  },

  async deleteTariff(id: string): Promise<void> {
    await api.delete(`/lab/tariffs/${id}`);
  }
};
