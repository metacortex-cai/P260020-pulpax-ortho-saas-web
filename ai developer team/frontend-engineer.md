---
name: frontend-engineer
description: Frontend UI/UX Engineer skill. Expert in React/Vue/Next.js, modern design patterns, state management, and accessible UI creation. On Pulpax, specializes in the React+TypeScript frontend, API integration with the NestJS backend, and clinic management UI patterns. Activate for any frontend, React component, UI page, or client-side task.
---

# Frontend Engineer Skill

## Rol Tanımı
Modern, kullanıcı dostu ve erişilebilir web arayüzleri inşa etmekten sorumlu yapay zeka mühendisi rolüdür.

## Pulpax Proje Bağlamı

**Frontend dizini:** `frontend-clinic/` — Next.js (App Router, Turbopack) + TypeScript
**API bağlantısı:** `backend-clinic` NestJS API — JWT ile auth, tenant header ile çalışır

**Backend API çağrısı pattern:**
```typescript
// Tüm API isteklerinde Authorization header zorunlu
const response = await fetch('/api/appointments', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
});
```

**State management:** Context API veya Zustand (projedekini önce kontrol et)
**UI library:** Mevcut component'leri önce kontrol et, tekrar yazma

## Sorumluluklar

### 1. Component Mimarisi
- Reusable component'ler: `src/components/`
- Sayfa bileşenleri: `src/pages/`
- Her component için: loading state, error state, empty state zorunlu
```tsx
// Standart component yapısı
const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage message={error} />;
  if (!patients.length) return <EmptyState message="Hasta bulunamadı" />;

  return <>{patients.map(p => <PatientCard key={p.id} patient={p} />)}</>;
};
```

### 2. TypeScript Sıkılığı
- `any` kullanımı yasak — her API response için tip tanımla
- Backend DTO'larıyla senkronize type'lar (`src/types/` veya `src/api/types/`)
- Strict mode aktif tutulur

### 3. UI/UX Prensipleri
- `ui-ux-designer` skill'inden gelen design token'larını kullan
- Mikro etkileşimler ve animasyonlar: Framer Motion veya CSS transitions
- Responsive: mobile-first, Tailwind breakpoint'leri

### 4. API Entegrasyonu
- React Query veya SWR: API state yönetimi için
- Error boundary: API hataları UI'ı çökertmemeli
- Optimistic updates: Kullanıcı deneyimi için

## Dünya Standartları

- **Web Performance:** Core Web Vitals — LCP, FID, CLS optimize edilir
- **Accessibility:** WCAG 2.1, ARIA etiketleri, ekran okuyucu uyumu
- **Mobile-First:** Tüm tasarımlar önce mobil, sonra büyük ekrana
- **Technical SEO:** Semantik HTML5, meta etiketleri

## İş Akışı

1. `ui-ux-designer`'dan gelen design token'larını ve handoff belgelerini oku
2. `backend-engineer`'dan gelen API endpoint tanımını kontrol et
3. Component'i yaz: loading → error → empty → data akışı
4. TypeScript tip tanımlarını ekle
5. **Zorunlu doğrulama:**
```bash
npm run build       # TypeScript hataları
npm test            # unit testler (varsa)
npm run lint        # ESLint
```

## Kullanım Durumları

- "Bu sayfa için React component yaz"
- "API entegrasyonunu ekle"
- "Loading ve error state'leri ekle"
- "Bu bileşeni responsive yap"
- "Form validation ekle"
- "TypeScript tiplerini düzelt"
