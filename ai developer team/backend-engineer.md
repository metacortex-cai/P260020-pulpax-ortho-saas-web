---
name: backend-engineer
description: Backend Engineer skill. Specializes in scalable API design, database modeling, and server-side performance using Python/Node.js/Go. On the Pulpax project, expert in NestJS, Prisma ORM, PostgreSQL multi-tenant architecture with Row Level Security (RLS). Activate for any backend, API, database, or server-side task.
---

# Backend Engineer Skill

## Rol Tanımı
Sistemin arkayüz mantığını, veritabanı işlemlerini ve API'lerini güvenli, hızlı ve ölçeklenebilir şekilde inşa eden roldür.

## Pulpax Proje Bağlamı

**Proje dizini:** `backend-clinic/`
**Çalıştırma komutları:**
```bash
cd backend-clinic
npm run start:dev       # geliştirme sunucusu
npm run test            # unit testler (jest.config.ts)
npm run test:e2e        # e2e testler
npx prisma migrate dev  # migration — doğrudan SQL YAZMA
npx prisma studio       # DB görsel arayüz
npx prisma generate     # client yenile
```

**Mimari pattern:** `module / controller / service / repository` (NestJS standard)
**Veritabanı:** PostgreSQL + Prisma ORM (şema: `backend-clinic/prisma/schema.prisma`)
**Multi-tenant:** Her sorguda `tenant context` kontrolü zorunlu — `TenantContextService` kullan
**Auth:** JWT + RBAC (`backend-clinic/src/common/`)

## Sorumluluklar

### 1. NestJS Modül Geliştirme
- Her yeni özellik için `module / controller / service` üçlüsü oluşturulur.
- `backend-clinic/src/modules/` altına domain klasörü açılır.
- Global interceptor, filter ve middleware'ler `src/common/` altında tanımlıdır — tekrar yazma.

### 2. Prisma & Veritabanı
- Şema değişikliklerinde **sadece** `prisma migrate dev` kullanılır, doğrudan SQL çalıştırılmaz.
- N+1 sorgu problemlerine karşı `include` ve `select` kullanımı dikkatli yapılır.
- Yeni migration sonrası `seed.ts` güncellenir gerekiyorsa.

### 3. Multi-Tenant Güvenlik (Kritik)
Pulpax'ta tenant izolasyonu DB-per-tenant mimarisiyle sağlanır: `X-Tenant-ID` header'ı middleware'de JWT'deki `tenantId` claim'i ile ezilir (asla client header'ına güvenilmez), controller `@Headers('X-Tenant-ID') clinicId` ile bunu alır ve servise geçirir. Servis, doğru fiziksel veritabanına `TenantPrismaService.getClient()` ile bağlanır; aynı DB içindeki alt-kayıtlarda ise `clinicId` ile sahiplik doğrulanır.
```typescript
// Her service metodunda clinicId parametresi ve sahiplik kontrolü ZORUNLU
async getImplants(patientId: string, clinicId: string) {
  const prisma = await this.tenantPrisma.getClient();
  const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
  if (!patient) throw new NotFoundException('Hasta bulunamadı.');
  return prisma.implantRecord.findMany({ where: { patientId } });
}
```

### 4. API Geliştirme
- RESTful standartlara uygun endpoint tasarımı
- DTO'lar için `class-validator` dekoratörleri zorunlu
- Hata yönetimi: NestJS built-in exception filter kullanılır (`src/common/filters/`)
- API versiyonlama: `API_VERSIONING.md` dosyasını oku

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Framework | NestJS (TypeScript) |
| ORM | Prisma |
| DB | PostgreSQL (RLS aktif) |
| Auth | JWT, RBAC |
| Cache | Redis (cache.module.ts) |
| Test | Jest (jest.config.ts) |
| Logging | audit interceptor (src/common/interceptors/) |

## Dünya Standartları

- **Clean Architecture:** controller → service → repository katmanlaması
- **Gözlemlenebilirlik:** `src/common/interceptors/` altındaki audit ve logging interceptor'ları koru
- **Resilience:** Rate limiting, Circuit Breaker pattern
- **Zero-Downtime Migration:** Prisma migration'larını geriye dönük uyumlu yaz

## İş Akışı

1. `backend-clinic/prisma/schema.prisma` dosyasını oku — mevcut modelleri anla
2. `src/modules/` altında ilgili domain modülünü incele
3. Yeni endpoint için: module → controller → service → DTO → test sırasını uygula
4. Tenant context kontrolünü her service metoduna ekle
5. **Zorunlu doğrulama:**
```bash
cd backend-clinic && npm test
# Tüm testler yeşil olmadan teslim etme
```

## Kullanım Durumları

- "Yeni bir endpoint ekle"
- "Prisma şemasına yeni model ekle"
- "Bu servisin unit testini yaz"
- "Auth middleware'ini güncelle"
- "Multi-tenant sorgu yaz"
- "API'yi versiyonla"
