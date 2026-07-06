const KEYS = {
  institutions: 'pulpax_institutions',
  groups: 'pulpax_groups',
  families: 'pulpax_families',
} as const;

const DEFAULTS = {
  institutions: ['SGK', 'Özel Sigorta', 'Anlaşmalı Kurum'],
  groups: ['Standart Hasta', 'VIP Hasta', 'Personel Yakını'],
  families: [] as string[],
};

type Category = keyof typeof KEYS;

function load(category: Category): string[] {
  if (typeof window === 'undefined') return DEFAULTS[category];
  try {
    const raw = localStorage.getItem(KEYS[category]);
    return raw ? JSON.parse(raw) : DEFAULTS[category];
  } catch {
    return DEFAULTS[category];
  }
}

function save(category: Category, items: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS[category], JSON.stringify(items));
}

export const PatientCategories = {
  getInstitutions: () => load('institutions'),
  getGroups: () => load('groups'),
  getFamilies: () => load('families'),

  setInstitutions: (items: string[]) => save('institutions', items),
  setGroups: (items: string[]) => save('groups', items),
  setFamilies: (items: string[]) => save('families', items),

  add(category: Category, value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed) return load(category);
    const current = load(category);
    if (current.includes(trimmed)) return current;
    const updated = [...current, trimmed];
    save(category, updated);
    return updated;
  },

  remove(category: Category, value: string): string[] {
    const updated = load(category).filter(v => v !== value);
    save(category, updated);
    return updated;
  },

  rename(category: Category, oldValue: string, newValue: string): string[] {
    const trimmed = newValue.trim();
    if (!trimmed) return load(category);
    const updated = load(category).map(v => (v === oldValue ? trimmed : v));
    save(category, updated);
    return updated;
  },
};
