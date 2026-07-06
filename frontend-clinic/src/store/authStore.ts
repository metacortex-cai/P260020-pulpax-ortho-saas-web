import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  clinicId: string;
  avatarUrl?: string;
}

export interface ClinicInfo {
  id: string;
  name: string;
  status: string; // TRIAL, ACTIVE, SUSPENDED, CANCELLED
  plan: string;   // FREE, BASIC, PRO, ENTERPRISE
  role: string;   // Kullanıcının bu kliniğe özel rolü
  isActive: boolean;
}

interface AuthState {
  tenantId: string | null;
  user: User | null;
  clinics: ClinicInfo[]; // Multi-Tenant: Bağlı kliniklerin listesi
  isLoading: boolean;
  setAuth: (tenantId: string, user: User) => void;
  setClinics: (clinics: ClinicInfo[]) => void;
  selectClinic: (clinic: ClinicInfo) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      tenantId: null,
      user: null,
      clinics: [],
      isLoading: false,

      setAuth: (tenantId, user) =>
        set({
          tenantId,
          user,
          isLoading: false,
        }),

      setClinics: (clinics) =>
        set({ clinics }),

      selectClinic: (clinic) =>
        set((state) => ({
          tenantId: clinic.id,
          user: state.user
            ? { ...state.user, role: clinic.role, clinicId: clinic.id }
            : null,
        })),

      updateUser: (updatedFields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : null,
        })),

      logout: () =>
        set({
          tenantId: null,
          user: null,
          clinics: [],
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'pulpax-clinic-auth-storage',
    }
  )
);
