import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DashboardState {
  activeWidgets: string[];
  toggleWidget: (widgetId: string) => void;
  setWidgets: (widgets: string[]) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      // Varsayılan olarak 3 ana widget açık gelsin
      activeWidgets: ['appointments', 'cash', 'critical_stock'],
      
      toggleWidget: (widgetId: string) => set((state) => {
        if (state.activeWidgets.includes(widgetId)) {
          return { activeWidgets: state.activeWidgets.filter(id => id !== widgetId) };
        } else {
          return { activeWidgets: [...state.activeWidgets, widgetId] };
        }
      }),
      
      setWidgets: (widgets: string[]) => set({ activeWidgets: widgets }),
    }),
    {
      name: 'pulpax-dashboard-storage', // Tarayıcıda saklanacak isim
    }
  )
);
