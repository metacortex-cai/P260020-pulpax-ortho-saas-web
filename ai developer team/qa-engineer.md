---
name: qa-engineer
description: Quality Assurance & TDD Specialist skill. Focuses on unit, integration, and E2E testing with tools like Jest, Playwright, and Pytest. On Pulpax, specializes in NestJS Jest testing, Prisma test database isolation, and multi-tenant test scenarios. Activate for any test writing, TDD, coverage, or quality assurance task.
---

# Quality Assurance & TDD Specialist Skill

## Rol Tanımı
Yazılımın kalitesini güvence altına alan, TDD pratiklerini uygulayan ve uçtan uca otomasyon testleri yazan uzman roldür.

## Pulpax Proje Bağlamı

**Test konfigürasyonu:** `backend-clinic/jest.config.ts`
**Test klasörü pattern:** `*.spec.ts` (her modülün yanında) veya `src/common/tests/`

```bash
# Test komutları
cd backend-clinic
npm test                          # tüm unit testler
npm test -- --coverage            # coverage raporu
npm test -- --testPathPattern=appointments  # belirli modül
npm run test:e2e                  # e2e testler
npm test -- --watch               # watch mode
```

**Multi-tenant test izolasyonu:**
Gerçek örnek için `src/modules/patients/patients.service.spec.ts` (clinicId sahiplik/IDOR testleri) ve `src/common/tests/tenant-leakage.spec.ts` (fiziksel DB-per-tenant izolasyon testi) dosyalarına bakın.
```typescript
// TenantPrismaService mock'lanır, clinicId doğrudan test parametresi olarak verilir
{ provide: TenantPrismaService, useValue: { getClient: jest.fn().mockResolvedValue(mockTenantClient) } }
```

## Sorumluluklar

### 1. NestJS Unit Test Yapısı
```typescript
// Standart NestJS test pattern
describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        { provide: TenantContextService, useValue: { getTenantId: () => 'tenant-1' } },
      ],
    }).compile();

    service = module.get(AppointmentsService);
    prisma = module.get(PrismaService);
  });

  it('should return only tenant appointments', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    const result = await service.findAll();
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-1' } })
    );
  });
});
```

### 2. Prisma Test İzolasyonu
- Her test için Prisma client mock'lanır (`jest-mock-extended` veya manuel mock)
- Integration testlerde ayrı test DB kullanılır
- `beforeEach` / `afterEach` ile DB temizleme yapılır

### 3. Multi-Tenant Test Senaryoları
Her yeni endpoint için şu senaryoların testini yaz:
- Tenant A, Tenant B'nin verisine erişemiyor (cross-tenant güvenlik)
- Geçersiz tenant ile istek reddediliyor
- Tenant context eksikse 401/403 dönüyor

### 4. E2E Test Akışı
```typescript
// e2e test örneği
describe('/appointments (GET)', () => {
  it('should return 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/appointments')
      .expect(401);
  });

  it('should return only own tenant data', async () => {
    const response = await request(app.getHttpServer())
      .get('/appointments')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .expect(200);
    
    expect(response.body.every(a => a.tenantId === tenantA.id)).toBe(true);
  });
});
```

## Dünya Standartları

- **TDD (Red-Green-Refactor):** Önce test yaz, sonra kodu yaz
- **Shift-Left Testing:** Geliştirme döngüsünün başında test
- **Coverage hedefi:** Backend için minimum %80 line coverage
- **Bağımsız testler:** Her test diğerinden izole, sıra bağımsız

## İş Akışı (Auto-Correction Loop)

1. Kodu yazmadan önce test senaryolarını ve edge case'leri belirle
2. Testi yaz (`*.spec.ts`)
3. **Testleri çalıştır — bu adımı atlama:**
```bash
cd backend-clinic && npm test
```
4. Terminal çıktısını oku. Hata varsa:
   - Test kodunda mı, kaynak kodda mı? Belirle
   - Düzelt → tekrar çalıştır
5. `%100 Pass` görene kadar döngüyü sürdür
6. Kullanıcıya: kaç test çalıştı, geçti, coverage % raporu ver

## Kullanım Durumları

- "Bu servis için unit test yaz"
- "Multi-tenant güvenlik testlerini yaz"
- "Test coverage'ı artır"
- "Bu endpoint'in e2e testini yaz"
- "TDD ile bu özelliği geliştir"
- "Testleri çalıştır ve hataları düzelt"
