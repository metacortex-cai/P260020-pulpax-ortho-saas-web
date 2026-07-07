import api from '../api';

export interface IncomeSummary {
  dailyIncome: number;
  monthlyIncome: number;
  dailyExpense: number;
  monthlyExpense: number;
  netMonthlyProfit: number;
  totalDebt: number;
  totalCollected: number;
  collectionRate: number;
}

export interface IncomeDetail {
  month: string;
  totalIncome: number;
}

export interface TreatmentPerformance {
  name: string;
  count: number;
  revenue: number;
}

export type IncomeReportItem = IncomeDetail;

export interface PopularTreatmentItem {
  name: string;
  count: number;
}

export interface AcquisitionReportItem {
  id: string;
  name: string;
  count: number;
  conversion: number;
  activeTreatments: number;
  revenue: number;
}

export interface CancellationReportItem {
  id: string;
  reason: string;
  count: number;
  percentage: number;
  trend: string;
  impact: number;
}

export interface CollectionReportItem {
  id: string;
  method: string;
  count: number;
  total: number;
  percentage: number;
}

export interface AppointmentReportItem {
  id: string;
  patient: string;
  doctor: string;
  date: string;
  time: string;
  service: string;
  status: string;
  source: string;
}

export interface DebtorReportItem {
  id: string;
  name: string;
  phone: string;
  totalDebt: number;
  lastPayment: string;
  delayDays: number;
  status: string;
}

export const ReportsService = {
  async getIncomeSummary(clinicBranchId?: string): Promise<IncomeSummary> {
    const params = new URLSearchParams();
    if (clinicBranchId) params.append('clinicBranchId', clinicBranchId);
    const response = await api.get<IncomeSummary>(`/reports/income/summary?${params.toString()}`);
    return response.data;
  },

  async getIncomeDetails(startDate?: string, endDate?: string, clinicBranchId?: string): Promise<IncomeDetail[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (clinicBranchId) params.append('clinicBranchId', clinicBranchId);
    const response = await api.get<IncomeDetail[]>(`/reports/income/details?${params.toString()}`);
    return response.data;
  },

  async getTreatmentPerformance(): Promise<TreatmentPerformance[]> {
    const response = await api.get<TreatmentPerformance[]>('/reports/treatments/performance');
    return response.data;
  },

  async getDoctorPerformance(startDate?: string, endDate?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get<any[]>(`/reports/doctors/performance?${params.toString()}`);
    return response.data;
  },

  async getAcquisitionReport(startDate?: string, endDate?: string): Promise<AcquisitionReportItem[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get<AcquisitionReportItem[]>(`/reports/acquisition?${params.toString()}`);
    return response.data;
  },

  async getCancellationsReport(startDate?: string, endDate?: string): Promise<CancellationReportItem[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get<CancellationReportItem[]>(`/reports/cancellations?${params.toString()}`);
    return response.data;
  },

  async getCollectionsReport(startDate?: string, endDate?: string): Promise<CollectionReportItem[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get<CollectionReportItem[]>(`/reports/collections?${params.toString()}`);
    return response.data;
  },

  async getAppointmentsReport(startDate?: string, endDate?: string): Promise<AppointmentReportItem[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get<AppointmentReportItem[]>(`/reports/appointments?${params.toString()}`);
    return response.data;
  },

  async getDebtorsReport(): Promise<DebtorReportItem[]> {
    const response = await api.get<DebtorReportItem[]>('/reports/debtors');
    return response.data;
  },
};
