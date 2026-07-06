import { create } from 'zustand';

interface UIState {
  isAddPatientModalOpen: boolean;
  isAddAppointmentModalOpen: boolean;
  isAddPaymentModalOpen: boolean;
  
  openAddPatientModal: () => void;
  closeAddPatientModal: () => void;
  
  openAddAppointmentModal: () => void;
  closeAddAppointmentModal: () => void;
  
  openAddPaymentModal: () => void;
  closeAddPaymentModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAddPatientModalOpen: false,
  isAddAppointmentModalOpen: false,
  isAddPaymentModalOpen: false,

  openAddPatientModal: () => set({ isAddPatientModalOpen: true }),
  closeAddPatientModal: () => set({ isAddPatientModalOpen: false }),

  openAddAppointmentModal: () => set({ isAddAppointmentModalOpen: true }),
  closeAddAppointmentModal: () => set({ isAddAppointmentModalOpen: false }),

  openAddPaymentModal: () => set({ isAddPaymentModalOpen: true }),
  closeAddPaymentModal: () => set({ isAddPaymentModalOpen: false }),
}));
