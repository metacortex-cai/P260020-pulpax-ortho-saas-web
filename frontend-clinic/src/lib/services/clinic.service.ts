import api from '../api';

export interface ClinicProfile {
  name: string;
  licenseNo: string;
  taxNo: string;
  taxOffice: string;
  foundingDate: string;
  principalDoctor: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  district: string;
}

export interface ClinicContact {
  mainPhone: string;
  emergencyPhone: string;
  fax: string;
  email: string;
  supportEmail: string;
  website: string;
}

export interface LicenseCurrent {
  packageName: string;
  status: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  totalDays: number;
  users: number;
  maxUsers: number;
  modules: string[];
  price: number;
  currency: string;
  billingCycle: string;
  autoRenew: boolean;
  paymentMethod: string;
  lastPaymentDate: string;
}

export interface LicenseHistoryItem {
  id: string;
  packageName: string;
  startDate: string;
  endDate: string;
  status: string;
  price: number;
  currency: string;
  billingCycle: string;
}

export interface SmsPackage {
  id: string;
  packageName: string;
  purchaseDate: string;
  totalMessages: number;
  usedMessages: number;
  remainingMessages: number;
  expiryDate: string;
  price: number;
  currency: string;
  status: string;
  usagePercent: number;
}

export interface ClinicLicense {
  current: LicenseCurrent;
  history: LicenseHistoryItem[];
  smsPackages: SmsPackage[];
}

export interface ClinicData {
  profile: ClinicProfile;
  contact: ClinicContact;
  license: ClinicLicense;
}

export const ClinicService = {
  async getClinicInfo(): Promise<ClinicData> {
    const response = await api.get<ClinicData>('/clinic/info');
    return response.data;
  },

  async updateProfile(data: Partial<ClinicProfile>): Promise<ClinicProfile> {
    const response = await api.patch<ClinicProfile>('/clinic/profile', data);
    return response.data;
  },

  async grantSupportAccess(): Promise<void> {
    await api.post('/clinic/support-access/grant');
  },

  async revokeSupportAccess(): Promise<void> {
    await api.post('/clinic/support-access/revoke');
  },

  async changeAccountOwner(userId: string): Promise<void> {
    await api.post('/clinic/account-owner', { userId });
  },

  async getAccountOwner(): Promise<{ email: string; name: string; id: string }> {
    const response = await api.get<{ email: string; name: string; id: string }>('/clinic/account-owner');
    return response.data;
  },
};
