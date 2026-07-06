import api from '../api';

export interface Payment {
  id: string;
  patientId: string;
  amount: number;
  method: string;
  createdAt: string;
  description?: string;
  accountId?: string | null;
  account?: {
    id: string;
    name: string;
    type: string;
  } | null;
  distributions?: {
    amount: number;
    treatmentItem?: {
      toothNo?: number;
      tariff?: {
        masterTreatment?: {
          name: string;
        };
      };
    };
  }[];
  patient?: {
    firstName: string;
    lastName: string;
  };
}

export interface Balance {
  totalDebt: number;
  advanceBalance: number;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'KASA' | 'BANKA' | 'POS';
  currency: string;
  balance: number;
  bankName?: string;
  branch?: string;
  iban?: string;
  isActive: boolean;
}

export interface UnpaidTreatmentItem {
  id: string;
  toothNo?: number;
  name: string;
  doctorId: string;
  doctorName: string;
  price: number;
  paid: number;
  remainingDebt: number;
}

export interface PaidTreatmentItem {
  id: string;
  toothNo?: number;
  name: string;
  doctorId: string;
  doctorName: string;
  price: number;
  paidAmount: number;
}

export interface PaymentAllocation {
  treatmentItemId: string;
  amount: number;
}

export interface StatementItem {
  name: string;
  quantity: number;
  unitPrice: number;
  toothNos: number[];
}

export interface StatementEntry {
  date: string;
  description: string;
  dueDate: string | null;
  debit: number;
  credit: number;
  balance: number;
  items?: StatementItem[];
}

export interface PatientStatement {
  patient: {
    firstName: string;
    lastName: string;
    nationalId?: string | null;
    phone: string;
    address?: string | null;
    city?: string | null;
    district?: string | null;
  };
  entries: StatementEntry[];
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  expenseDate: string;
  paymentMethod: string;
}

export interface Candidate {
  id: string;
  name: string;
  tckn?: string;
  dosyaNo?: string;
  phone?: string;
  birthDate?: string;
  planDate?: string;
  planTotal?: number;
  potentialTotal?: number;
  treatments?: number;
  doctor?: string;
  status: string;
  planItems?: any[];
}

// Backend Decimal alanları JSON üzerinden string olarak gelir (örn. "7000"); sayısal
// toplama/format işlemleri için (toLocaleString, +) gerçek number'a çevrilmesi gerekir.
function normalizePayment(p: any): Payment {
  return {
    ...p,
    amount: Number(p.amount) || 0,
    distributions: p.distributions?.map((d: any) => ({ ...d, amount: Number(d.amount) || 0 })),
  };
}

function normalizeAccount(a: any): FinancialAccount {
  return { ...a, balance: Number(a.balance) || 0 };
}

function normalizeUnpaidItem(i: any): UnpaidTreatmentItem {
  return { ...i, price: Number(i.price) || 0, paid: Number(i.paid) || 0, remainingDebt: Number(i.remainingDebt) || 0 };
}

function normalizePaidItem(i: any): PaidTreatmentItem {
  return { ...i, price: Number(i.price) || 0, paidAmount: Number(i.paidAmount) || 0 };
}

export const FinanceService = {
  async processPayment(data: {
    patientId: string;
    amount: number;
    method: string;
    description?: string;
    accountId?: string;
    distributionType?: 'FIFO' | 'TREATMENT_BASED';
    allocations?: PaymentAllocation[];
  }): Promise<Payment> {
    const response = await api.post<Payment>('/finance/payments', data);
    return normalizePayment(response.data);
  },

  // --- Kasa / Banka Hesapları ---

  async getAccounts(): Promise<FinancialAccount[]> {
    const response = await api.get<FinancialAccount[]>('/finance/accounts');
    return response.data.map(normalizeAccount);
  },

  async createAccount(data: { name: string, type: string, currency?: string, initialBalance?: number, bankName?: string, branch?: string, iban?: string }): Promise<FinancialAccount> {
    const response = await api.post<FinancialAccount>('/finance/accounts', data);
    return normalizeAccount(response.data);
  },

  async getUnpaidTreatmentItems(patientId: string): Promise<UnpaidTreatmentItem[]> {
    const response = await api.get<UnpaidTreatmentItem[]>(`/finance/patients/${patientId}/unpaid-items`);
    return response.data.map(normalizeUnpaidItem);
  },

  async getPaidTreatmentItems(patientId: string): Promise<PaidTreatmentItem[]> {
    const response = await api.get<PaidTreatmentItem[]>(`/finance/patients/${patientId}/paid-items`);
    return response.data.map(normalizePaidItem);
  },

  async getPatientStatement(patientId: string): Promise<PatientStatement> {
    const response = await api.get<PatientStatement>(`/finance/patients/${patientId}/statement`);
    const data = response.data;
    return {
      ...data,
      totalDebit: Number(data.totalDebit) || 0,
      totalCredit: Number(data.totalCredit) || 0,
      balance: Number(data.balance) || 0,
      entries: data.entries.map(e => ({
        ...e,
        debit: Number(e.debit) || 0,
        credit: Number(e.credit) || 0,
        balance: Number(e.balance) || 0,
        items: e.items?.map(i => ({ ...i, unitPrice: Number(i.unitPrice) || 0 })),
      })),
    };
  },

  async processRefund(data: {
    patientId: string;
    amount: number;
    method: string;
    description?: string;
    accountId?: string;
    allocations?: PaymentAllocation[];
    refundFromAdvance?: number;
  }): Promise<Payment> {
    const response = await api.post<Payment>('/finance/refunds', data);
    return normalizePayment(response.data);
  },

  async getRecentPayments(): Promise<Payment[]> {
    const response = await api.get<Payment[]>('/finance/payments/recent');
    return response.data.map(normalizePayment);
  },

  async getPatientBalance(patientId: string): Promise<Balance> {
    const response = await api.get<any>(`/finance/patients/${patientId}/balance`);
    return {
      totalDebt: Number(response.data.totalDebt) || 0,
      advanceBalance: Number(response.data.advance ?? response.data.advanceBalance) || 0,
    };
  },

  async getPatientPayments(patientId: string): Promise<Payment[]> {
    const response = await api.get<Payment[]>(`/finance/patients/${patientId}/payments`);
    return response.data.map(normalizePayment);
  },

  async deletePayments(ids: string[]): Promise<void> {
    await api.delete('/finance/payments', { data: { ids } });
  },

  // --- Expense Management ---

  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    const response = await api.get<ExpenseCategory[]>('/finance/expenses/categories');
    return response.data;
  },

  async createExpenseCategory(data: { name: string, description?: string }): Promise<ExpenseCategory> {
    const response = await api.post<ExpenseCategory>('/finance/expenses/categories', data);
    return response.data;
  },

  async getExpenses(startDate?: string, endDate?: string): Promise<Expense[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get<Expense[]>(`/finance/expenses?${params.toString()}`);
    return response.data;
  },

  async createExpense(data: { categoryId: string, amount: number, description?: string, expenseDate?: string, paymentMethod?: string }): Promise<Expense> {
    const response = await api.post<Expense>('/finance/expenses', data);
    return response.data;
  },

  async getCandidates(): Promise<Candidate[]> {
    const response = await api.get<Candidate[]>('/finance/candidates');
    return response.data;
  },

  async getCandidate(id: string): Promise<Candidate> {
    const response = await api.get<Candidate>(`/finance/candidates/${id}`);
    return response.data;
  }
};
