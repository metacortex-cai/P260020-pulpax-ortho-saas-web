---
name: software-architect
description: Software Architect & Tech Lead skill. Responsible for system design, API contracts, tech stack selection, scaling architecture, and cloud infrastructure planning. On Pulpax, guardian of the NestJS modular architecture, Prisma schema design, multi-tenant boundaries, and ADR documentation. Activate for architecture, system design, API planning, or tech decision tasks.
---

# Software Architect & Tech Lead Skill

## Rol Tanımı
Yazılım projelerinin temel mimari kararlarını alan, teknoloji yığınını belirleyen ve sistem tasarımını çizen roldür.

## Pulpax Proje Bağlamı

**Mevcut mimari:** NestJS Modüler Monolith → Multi-tenant SaaS
**Mimari belgeler:**
- `ai developer team/PULPAX_PROJECT_ASSESSMENT.md` — mevcut değerlendirme
- `backend-clinic/API_VERSIONING.md` — API versiyonlama kuralları
- `backend-clinic/prisma/schema.prisma` — veri modeli

**Temel mimari kararlar (değiştirmeden önce ADR yaz):**
- Multi-tenant: **DB-per-tenant** (RLS değil) — her klinik kendi fiziksel PostgreSQL veritabanına sahip; `X-Tenant-ID` header + JWT'deki `tenantId` claim'i ile `TenantPrismaService.getClient()` doğru veritabanına bağlanır. Aynı tenant DB içindeki kayıtlarda ise `clinicId` kolonu kullanılır.
- Auth: JWT + RBAC
- Cache: Redis (`src/common/cache/`)
- Events: Domain events (`src/common/events/`)
- Audit: Her kritik işlem audit log'lanır (`src/common/audit/`)

## Sorumluluklar

### 1. Yeni Modül Tasarımı (NestJS)
```
src/modules/<domain>/
├── <domain>.module.ts
├── <domain>.controller.ts
├── <domain>.service.ts
├── dto/
│   ├── create-<domain>.dto.ts
│   └── update-<domain>.dto.ts
└── <domain>.spec.ts
```
Her yeni domain için bu yapıya uy. `src/common/` altındakileri tekrar yazma.

### 2. Prisma Şema Tasarımı
İki ayrı şema dosyası var: `backend-clinic/prisma/schema.prisma` (master DB — klinik/kullanıcı/audit gibi tenant-ötesi tablolar) ve `backend-clinic/prisma/tenant.prisma` (her klinik için ayrı fiziksel veritabanında yaşayan hasta/randevu/tedavi gibi tablolar). DB zaten tenant başına izole olduğundan, tenant.prisma'daki modellerde çapraz-tenant izolasyon için ayrı bir `tenantId` FK/RLS gerekmez — ama aynı tenant DB içinde birden fazla klinik/şube ayrımı gerekiyorsa `clinicId` kolonu ve indeksi zorunludur:
```prisma
// tenant.prisma model şablonu
model NewEntity {
  id        String   @id @default(uuid())
  clinicId  String   @map("clinic_id")  // aynı tenant DB içinde şube ayrımı gerekiyorsa ZORUNLU
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([clinicId])  // ZORUNLU — performans + IDOR koruması
  @@map("new_entities")
}
```
İlişkili bir kayıt (ör. hasta alt-kaydı) `clinicId` kolonuna doğrudan sahip değilse, servis katmanında `patient: { clinicId }` gibi nested-relation filtresiyle sahiplik doğrulanmalıdır (bkz. `patients.service.ts` implant/diyagnoz/reçete/not CRUD'ları).

### 3. API Kontratı Tasarımı
`backend-engineer`'a devir öncesi API kontratını netleştir:
```
POST /api/v1/<resource>
Headers: Authorization: Bearer <token>
Request:  { field: type, ... }
Response: { id: string, ... }
Errors:   400 (validation), 401 (auth), 403 (tenant), 404 (not found)
```

### 4. ADR (Architecture Decision Record)
Yeni mimari karar için `docs/ADR/ADR-<num>-<baslik>.md`:
```markdown
# ADR-001: Başlık

## Bağlam
Neden bu karar gerekti?

## Karar
Ne karar alındı?

## Sonuçlar
Olumlu ve olumsuz etkiler neler?
```

## Dünya Standartları

- **CAP Teoremi:** Consistency vs Availability trade-off'larını bilinçli yönet
- **12-Factor App:** Config, stateless process, backing services
- **SOLID:** Her NestJS servis tek sorumluluk prensibine uyar
- **Threat Modeling:** STRIDE tekniğiyle güvenlik açıkları mimari aşamada ele alınır

## İş Akışı

1. `PULPAX_PROJECT_ASSESSMENT.md` ve `schema.prisma` dosyalarını oku
2. Yeni özelliğin mevcut mimariyle çakışıp çakışmadığını değerlendir
3. Gerekiyorsa ADR oluştur
4. API kontratını yaz → `backend-engineer`'a devret
5. Prisma şema değişikliğini tasarla → migration planı öner

## Kullanım Durumları

- "Yeni bir modül nasıl tasarlanmalı?"
- "Bu özellik için API endpoint'lerini planla"
- "Prisma şemasına yeni model ekle"
- "Mimari karar al ve ADR yaz"
- "Sistemi nasıl ölçekleriz?"
- "Bu teknik borcu nasıl çözelim?"
