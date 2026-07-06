# ADR-003: İnsan Kaynakları (Personel) Modülü ve Hekim Prim Sistemi v2

## Bağlam

`~/Desktop/ik.md` ve `~/Desktop/prim sistemi.md` dokümanlarında tanımlanan İK modülü ve Hekim Prim Sistemi, mevcut `backend-clinic/src/modules/employees/` implementasyonundan önemli ölçüde daha kapsamlı. Mevcut durum tespiti:

| Alan | Mevcut Durum | Hedef (ik.md / prim sistemi.md) |
|---|---|---|
| Personel profili | `User` (master DB) sadece ad/soyad/email/telefon/nationalId/title/role | Kişisel + iletişim (çoklu) + eğitim + iş bilgileri + resmi bilgiler + personel tipi |
| İzinler | `EmployeeLeave`: status alanı **yok**, DTO'da `UpdateLeaveStatusDto` var ama persist edilmiyor, onay endpoint'i yok | Onay akışı (PENDING/APPROVED/REJECTED), hak ediş (bakiye), randevu entegrasyonu |
| Dokümanlar | Yok | Dosya yükleme + kategori |
| Prim sözleşmesi | `EmployeeContract.type`: PCT / FIXED / SVC (3 tip, gerçek anlamları belirsiz) | 4 net model (Model-1..4), toplu/kategori bazlı oran, hedef sistemi |
| Prim tetikleyici | `TREATMENT_COMPLETED` event'i → **tam ücret (`fee`)** üzerinden hesap | Ödeme (`PaymentDistribution`) tamamlanan kaleme düştüğünde, **ödenen tutar** üzerinden |
| Lab maliyeti düşümü | Her işlemde otomatik düşülüyor (tüm modeller için) | Sadece Model-2/3'te, **aylık toplam** olarak düşülmeli |
| Tedavi maliyeti (Model-3) | Alan yok | `Tariff.cost` gerekli |
| Hedef bazlı prim | Yok | Aylık ciro hedefi + devir mekanizması |
| İptal/hekim değişikliği yetkisi | Kontrol yok (varsayım: mevcut treatment-plans serviste) | Tamamlandı/ödemesi yapılmış kalemde Superadmin-only, prim dağıtılmışsa değişiklik yasak |
| Raporlama | Yok | Prim raporu (filtre) + hekimin kendi raporu |
| Bug | `GET /employees/:id/commissions` frontend'de çağrılıyor, controller'da yok → 404 | Endpoint eklenmeli |

Mimari ilke (mevcut): Master DB = auth/identity (`User`), Tenant DB = operasyonel/HR veri. Bu ayrım korunacak; yeni personel profili alanları **tenant DB**'ye eklenecek, `User.id` ile zayıf referansla (`employeeId`) bağlanacak (çapraz-DB foreign key yok).

## Karar

### 1. Yeni Prisma Modelleri (`tenant.prisma`)

```prisma
model EmployeeProfile {
  id         String   @id @default(uuid())
  clinicId   String   @map("clinic_id")
  employeeId String   @unique @map("employee_id") // -> master User.id

  personnelType String @map("personnel_type") // DOCTOR | ASSISTANT | MANAGER | OTHER

  birthDate String? @map("birth_date") // encrypted at rest (EncryptionUtil, User.nationalId ile aynı desen)
  bloodType String? @map("blood_type")

  school          String?
  educationField  String? @map("education_field")
  educationLevel  String? @map("education_level")
  graduationYear  Int?    @map("graduation_year")
  diplomaNo       String? @map("diploma_no") // sadece DOCTOR

  department     String?
  position       String?
  hireDate       DateTime? @map("hire_date")
  employmentType String?   @map("employment_type") // TAM_ZAMANLI | YARI_ZAMANLI | ...

  sgkRegistryNo String? @map("sgk_registry_no") // encrypted

  calendarColor String? @map("calendar_color") // sadece DOCTOR, randevu takvimi

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([clinicId])
  @@map("employee_profiles")
}

model EmployeeContact {
  id         String @id @default(uuid())
  clinicId   String @map("clinic_id")
  employeeId String @map("employee_id")

  type  String // PHONE | EMAIL | ADDRESS | EMERGENCY_CONTACT
  value String
  label String? // "İş", "Ev" vb.

  // EMERGENCY_CONTACT için:
  emergencyName     String? @map("emergency_name")
  emergencyRelation String? @map("emergency_relation")

  createdAt DateTime @default(now()) @map("created_at")

  @@index([clinicId, employeeId])
  @@map("employee_contacts")
}

model EmployeeDocument {
  id         String @id @default(uuid())
  clinicId   String @map("clinic_id")
  employeeId String @map("employee_id")

  category   String // DIPLOMA | SOZLESME | KIMLIK | SERTIFIKA | DIGER
  fileName   String @map("file_name")
  storageKey String @map("storage_key") // mevcut dosya depolama servisiyle aynı desen (patient documents varsa onunla uyumlu)

  uploadedBy String   @map("uploaded_by")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([clinicId, employeeId])
  @@map("employee_documents")
}

model EmployeeLeaveEntitlement {
  id         String @id @default(uuid())
  clinicId   String @map("clinic_id")
  employeeId String @map("employee_id")

  year          Int
  totalDays     Decimal @map("total_days")
  carryOverDays Decimal @default(0.00) @map("carry_over_days")

  @@unique([clinicId, employeeId, year])
  @@map("employee_leave_entitlements")
}

model EmployeeContractCategoryRate {
  id         String @id @default(uuid())
  contractId String @map("contract_id")
  contract   EmployeeContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  category String // MasterTreatment.category ile eşleşir
  rate     Decimal

  @@unique([contractId, category])
  @@map("employee_contract_category_rates")
}

model EmployeeContractItemFee {
  id         String @id @default(uuid())
  contractId String @map("contract_id")
  contract   EmployeeContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  masterTreatmentId String  @map("master_treatment_id") // hangi tedavi kalemi
  fixedFee          Decimal @map("fixed_fee")

  @@unique([contractId, masterTreatmentId])
  @@map("employee_contract_item_fees")
}

model DoctorTargetLedger {
  id         String @id @default(uuid())
  clinicId   String @map("clinic_id")
  employeeId String @map("employee_id")

  period          String  @map("period") // "2026-07"
  targetAmount    Decimal @map("target_amount")
  actualRevenue   Decimal @default(0.00) @map("actual_revenue")
  achieved        Boolean @default(false)
  carriedFromPrev Decimal @default(0.00) @map("carried_from_prev")
  carriedToNext   Decimal @default(0.00) @map("carried_to_next")
  reconciledAt    DateTime? @map("reconciled_at")

  @@unique([clinicId, employeeId, period])
  @@map("doctor_target_ledgers")
}
```

### 2. Mevcut Modellerde Değişiklik

- **`EmployeeLeave`**: `status String @default("PENDING")`, `approvedBy String?`, `approvedAt DateTime?`, `rejectionReason String?` eklenir.
- **`EmployeeContract`**: `type` alanı `MODEL_1 | MODEL_2 | MODEL_3 | MODEL_4` değerlerini alacak şekilde yeniden anlamlandırılır (breaking — bkz. Migrasyon). Eklenecek alanlar: `fixedSalary Decimal @default(0.00)`, `rateMode String @default("BULK")` (BULK/CATEGORY), `targetEnabled Boolean @default(false)`, `targetAmount Decimal?`, `targetCarryOver Boolean @default(false)`. İlişkiler: `categoryRates EmployeeContractCategoryRate[]`, `itemFees EmployeeContractItemFee[]`.
- **`PrimRecord`**: `period String` (YYYY-MM), `status String @default("CONFIRMED")` (PROVISIONAL/CONFIRMED/VOID — sadece hedef sistemi aktifse PROVISIONAL başlar), `paymentDistributionId String?` eklenir.
- **`Tariff`**: `cost Decimal?` eklenir (Model-3 için tedavi maliyeti girişi).

### 3. Prim Hesaplama Motoru — Tetikleyici Değişikliği (Kritik Karar)

Mevcut akış (`TREATMENT_COMPLETED` → tam ücret üzerinden hesap) **prim sistemi.md §4**'e aykırı: prim, ödeme yapılmadan tahakkuk etmemeli. Yeni akış:

1. Yeni domain event: `EVENTS.PAYMENT_DISTRIBUTED` — `PaymentDistribution` kaydı oluşturulduğunda (ödemeler modülünde) fırlatılır: `{ clinicId, treatmentItemId, distributionId, amount }`.
2. `PrimEventListener.handlePaymentDistributed`:
   - `treatmentItem.status !== 'COMPLETED'` ise → prim hesaplanmaz (bu tutar **avans**, mevcut avans mantığı zaten `Payment`/`PaymentDistribution` katmanında var).
   - `status === 'COMPLETED'` ise → `PrimService.calculate()` çağrılır, **`amount` = bu dağıtımın tutarı** (tam ücret değil).
   - Kalem sonradan `COMPLETED` olduğunda, o kaleme daha önce düşmüş (avans) `PaymentDistribution` kayıtları geriye dönük taranıp prim hesaplanır (idempotency key = `distributionId` bazlı, çifte hesap önlenir).
3. `PrimService.calculate()` model bazlı dallanır:
   - **Model-1**: `amount × rate%` (rate: `rateMode=BULK` → `contract.rate`; `CATEGORY` → `EmployeeContractCategoryRate` üzerinden `treatmentItem → tariff → masterTreatment.category` eşleşmesi).
   - **Model-2 / Model-3**: aynı yüzde hesabı **anlık olarak brüt** kaydedilir (`PrimRecord.amount` = brüt). Lab masrafı (Model-2) ve tedavi maliyeti (Model-3) **aylık** ve **kalem başına** kesintiler ayrı kayıtlarla tutulur — tek işlemde anlık düşülmez (yanlış: mevcut kod budur). Ay sonu mutabakat job'ı (`PrimReconciliationService`, `@Cron` — `currency.scheduler.ts` / `medications.scheduler.ts` ile aynı desen) bu ay için toplam lab masrafını (`LabOrder.cost`, employeeId+ay bazlı) ve tedavi maliyetlerini (`Tariff.cost`, kalem bazlı, anlık kaydedilir) toplayıp rapor katmanında netleştirir.
   - **Model-4**: `EmployeeContractItemFee` üzerinden `masterTreatmentId` eşleşen sabit ücret, kalem başına **bir kez** (idempotency key ile), ödeme tutarından bağımsız.
4. Hedef sistemi (`targetEnabled=true`): işlem anında `PrimRecord.status='PROVISIONAL'` yazılır + `DoctorTargetLedger.actualRevenue` güncellenir. Ay sonu `PrimReconciliationService`: `actualRevenue >= targetAmount` → o ayın tüm `PROVISIONAL` kayıtları `CONFIRMED`; değilse `VOID` + (`targetCarryOver=true` ise) fark bir sonraki `DoctorTargetLedger.carriedFromPrev`'e yazılır.

### 4. İptal / Hekim Değişikliği Yetkilendirmesi

`prim sistemi.md §9` kuralları **treatment-plans/treatment-items servisinde** (bu ADR kapsamı dışında ama bağımlılık) uygulanmalı: `TreatmentItem.status==='COMPLETED'` iptalinde `SUPERADMIN` rol kontrolü; `PrimRecord` mevcutsa (prim dağıtılmış) iptal/hekim değişikliği tamamen engellenir. Bu, `employees` modülünün değil ilgili treatment modülünün sorumluluğu — ayrı bir görev olarak backend-engineer'a not düşülecek.

### 5. Yeni/Değişen API Kontratı (`/employees`)

```
GET    /employees/:id/profile              → EmployeeProfile
PUT    /employees/:id/profile              → upsert
GET    /employees/:id/contacts             
POST   /employees/:id/contacts
DELETE /employees/:id/contacts/:contactId

GET    /employees/:id/documents
POST   /employees/:id/documents            (multipart)
DELETE /employees/:id/documents/:docId

PATCH  /employees/leaves/:id/status         → { status: APPROVED|REJECTED, rejectionReason? } (eksikti — eklenir)
GET    /employees/:id/leave-entitlement?year=

POST   /employees/contracts                 → yeni alanlarla genişletilmiş DTO
GET    /employees/:id/commissions           → mevcut 404 bug fix, PrimService.findByEmployee sarar

GET    /employees/reports/prim?from=&to=&employeeId=   → Superadmin/Admin, filtreli prim raporu
GET    /employees/me/prim-report?from=&to=             → req.user.id kendi kaydı, başkasınınkini göremez
```

Hepsi mevcut `JwtAuthGuard` + `req.user.tenantId` (clinicId) desenini takip eder.

### 6. Frontend Tab Yapısı (`frontend-clinic/src/app/hr/staff/[id]/page.tsx`)

`ik.md §2` menü yapısına birebir uyum:

```
Personel Detay
├── Genel Bilgiler   (Kişisel / İletişim-çoklu / Eğitim / İş Bilgileri / Resmi Bilgiler / Personel Tipi)
├── Mesai Ayarları   (yalnız personnelType===DOCTOR görünür — mevcut "Çalışma Saatleri" tabı)
├── Prim Ayarları    (yalnız DOCTOR — mevcut placeholder modal SİLİNİR, gerçek form: model seçici 1-4,
│                     rateMode toggle, kategori-oran tablosu, kalem-ücret tablosu (Model-4), hedef alanları)
├── Dokümanlar       (YENİ tab)
└── İzinler          (mevcut placeholder modal SİLİNİR, gerçek create + onay/red aksiyonları + hak ediş info panel)
```

Liste sayfası (`hr/staff/page.tsx`) `ik.md §3` gereği: Export (PDF/Excel) ve toplu işlemler eksikse eklenir (ADR-001 standart tablo deseni korunur).

## Sonuçlar

**Olumlu:**
- Prim hesaplama artık dokümandaki iş kurallarıyla birebir örtüşüyor (ödeme bazlı, model bazlı, hedefli).
- Master/Tenant DB ayrımı korunuyor, mevcut mimariyle tutarlı.
- Mevcut 404 bug'ı ve placeholder UI'lar bu kapsamda çözülüyor.

**Olumsuz / Riskler:**
- `EmployeeContract.type` anlamının PCT/FIXED/SVC'den MODEL_1-4'e değişmesi **breaking migration** — mevcut prod verisi varsa manuel veri dönüşüm scripti gerekir (kaç kayıt olduğu kontrol edilmeli).
- Prim tetikleyicisinin `TREATMENT_COMPLETED`'dan `PAYMENT_DISTRIBUTED`'a taşınması, ödemeler modülünde yeni event fırlatma noktası gerektirir — bu modülün kapsamı dışında, bağımlılık olarak işaretlenir.
- Hedef sistemi ay-sonu mutabakatı asenkron bir cron job'a bağlı; job çalışmazsa PROVISIONAL kayıtlar asılı kalır — job health-check/alerting eklenmeli (devops-engineer).
- Tamamlandı+ödemesi yapılmış+primi dağıtılmış kalemde iptal/hekim değişikliği engeli bu modülün dışında (treatment-plans) implemente edilmeli; bu ADR sadece bağımlılığı belgeliyor.

## Uygulama Sırası (Handoff — backend-engineer / frontend-engineer)

1. **Faz 1 — Profil & İletişim & Dokümanlar**: `EmployeeProfile`, `EmployeeContact`, `EmployeeDocument` migration + CRUD + Genel Bilgiler/Dokümanlar tabları.
2. **Faz 2 — İzin Akışı**: `EmployeeLeave.status` + `EmployeeLeaveEntitlement` + onay/red endpoint + frontend wire-up + randevu modülüyle entegrasyon (onaylı izin tarihinde randevu engeli).
3. **Faz 3 — Prim Motoru v2**: Contract redesign, `PAYMENT_DISTRIBUTED` event, model 1-4 hesaplama, `DoctorTargetLedger` + reconciliation cron, raporlama endpoint'leri, 404 bug fix, frontend Prim Ayarları tabı.
4. **Faz 4 — İptal Yetkilendirme & Audit**: treatment-plans serviste superadmin-only iptal kuralı, audit log tab UI, qa-engineer regresyon.

Her faz sonunda `code-reviewer` → `security-engineer` → `qa-engineer` zinciri (CLAUDE.md §Değişmez Kurallar) uygulanır.
