import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Locale, translations } from '../lib/i18n';

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof typeof translations['tr']) => string;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: 'tr',
      setLocale: (locale: Locale) => set({ locale }),
      t: (key) => {
        const currentLocale = get().locale || 'tr';
        const dict = translations[currentLocale];
        return dict[key] || translations['tr'][key] || String(key);
      }
    }),
    {
      name: 'pulpax-locale-store',
    }
  )
);
