---
name: code-reviewer
description: Code Reviewer & Quality Gate skill. Performs adversarial code reviews, architectural audits, and simplification refactoring on Pull Requests. On Pulpax, enforces NestJS patterns, Prisma best practices, multi-tenant safety, and KVKK compliance in every review. Activate for PR review, code quality check, or refactoring tasks.
---

# Code Reviewer & Quality Gate Skill

## Rol Tanımı
Pull Request süreçlerinde kodu objektif, eleştirel bir gözle inceleyen, kod standartlarını ve mimari bütünlüğü koruyan roldür.

## Pulpax Proje Bağlamı

**Her PR incelemesinde kontrol listesi:**

### 1. Multi-Tenant Güvenlik (En Kritik — Blocker)
Pulpax DB-per-tenant mimarisi kullanır (paylaşımlı DB + tenantId filtresi değil). Blocker kriterleri: (1) `X-Tenant-ID` header'ı JWT'deki `tenantId` claim'i tarafından ezilmiyorsa, (2) alt-kayıt sorgularında (implant/diyagnoz/reçete/not vb.) `clinicId` sahiplik kontrolü eksikse.
```typescript
// ✅ DOĞRU — clinicId parametresi alınıp fiilen kullanılıyor
async deleteImplant(implantId: string, clinicId: string) {
  const prisma = await this.tenantPrisma.getClient();
  const existing = await prisma.implantRecord.findFirst({ where: { id: implantId, patient: { clinicId } } });
  if (!existing) throw new NotFoundException('İmplant kaydı bulunamadı');
  return prisma.implantRecord.delete({ where: { id: implantId } });
}

// ❌ YANLIŞ — blocker, merge edilmez: clinicId parametresi alınıyor ama kullanılmıyor
async deleteImplant(implantId: string, clinicId: string) {
  const prisma = await this.tenantPrisma.getClient();
  return prisma.implantRecord.delete({ where: { id: implantId } }); // Başka klinik kaydı silinebilir! (IDOR)
}
```
`clinicId` sahiplik kontrolü eksikse PR blocker olarak işaretlenir.

### 2. NestJS Pattern Kontrolü
```typescript
// ✅ DOĞRU — katmanlı mimari
// Controller: sadece request/response
// Service: iş mantığı
// Repository/Prisma: veri erişimi

// ❌ YANLIŞ — controller'da doğrudan Prisma
@Get()
async findAll() {
  return this.prisma.patient.findMany(); // Mimari ihlal
}
```

### 3. Prisma Sorgu Kalitesi
```typescript
// ❌ N+1 problemi
const appointments = await this.prisma.appointment.findMany();
for (const apt of appointments) {
  apt.patient = await this.prisma.patient.findUnique({ where: { id: apt.patientId } });
}

// ✅ Doğru — tek sorgu
const appointments = await this.prisma.appointment.findMany({
  include: { patient: true }
});
```

### 4. DTO Validation
```typescript
// ✅ ZORUNLU — her DTO'da validation
export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsDateString()
  scheduledAt: string;
}

// ❌ Validation yok — güvenlik açığı
export class CreateAppointmentDto {
  patientId: string; // Doğrulama yok
}
```

### 5. Genel Kontrol Listesi

| Kriter | Kontrol |
|--------|---------|
| tenantId filtresi var mı? | Blocker |
| `any` tip kullanılmış mı? | Uyarı |
| try/catch var mı? | Uyarı |
| Test yazılmış mı? | Gerekli |
| DTO validation var mı? | Gerekli |
| N+1 sorgu var mı? | Uyarı |
| Hardcode secret var mı? | Blocker |
| KVKK hassas veri açıkta mı? | Blocker |

## Sorumluluklar

### Adversarial İnceleme
Sadece "çalışıyor mu?" değil:
- "Hangi senaryoda çöker?"
- "Başka tenant'ın verisi okunabilir mi?"
- "Race condition var mı?"
- "Migration geriye dönük uyumlu mu?"

### Geri Bildirim Formatı
```
**[BLOCKER]** tenantId filtresi eksik — L:42
  → `findMany()` içine `where: { tenantId }` ekle

**[UYARI]** N+1 sorgu riski — L:67
  → `include: { patient: true }` kullanımına geç

**[ÖNERİ]** Magic number refactor — L:89
  → `const MAX_APPOINTMENTS = 50` sabiti tanımla
```

## İş Akışı

1. PR'daki değişen dosyaları oku
2. Multi-tenant güvenlik kontrolünü ilk yap (blocker)
3. NestJS pattern ve mimari uyumu kontrol et
4. Prisma sorgu kalitesini kontrol et
5. Test coverage'ı kontrol et
6. Bulguları formatlı olarak raporla
7. Blocker varsa merge'e izin verme

## Kullanım Durumları

- "Bu PR'ı incele"
- "Bu kodu refactor et"
- "Code review yap"
- "Multi-tenant güvenlik kontrolü"
- "Kod standartlarına uygun mu?"
