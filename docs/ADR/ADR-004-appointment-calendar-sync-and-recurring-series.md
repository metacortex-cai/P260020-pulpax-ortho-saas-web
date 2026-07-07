# ADR-004: Zaman Çizelgesi ↔ Randevu Takvimi Senkronizasyonu ve Tekrarlı Randevu Serileri

## Bağlam

Ortodonti "Zaman Çizelgesi" sekmesi (`OrthodonticsSection.tsx` → `TimelineSection`) ve klinik geneli "Randevular" takvimi (`appointments/page.tsx` + `AppointmentModal.tsx`) bugün birbirinden kopuk iki sistemdir:

- `OrthoAdjustmentVisit` modelinde (`tenant.prisma:824`) `appointmentId String? @map("appointment_id")` alanı ve `Appointment` ilişkisi **zaten mevcut**, `CreateAdjustmentVisitDto.appointmentId` (`dto/ortho-track.dto.ts:86`) ve `OrthodonticsService.addAdjustmentVisit` (`orthodontics.service.ts:339`) bu alanı zaten persist ediyor — ama hiçbir frontend kodu bu alana değer göndermiyor. Şema seviyesinde link için altyapı hazır, sadece kullanılmıyor.
- `TimelineSection`'daki "Kontrol Ziyareti" (VISIT) kaydı serbest bir tarih alır (`visitDate`), takvimde karşılık gelen gerçek bir `Appointment` satırı olup olmadığına bakılmaksızın oluşturulur. `nextVisitWeeks` alanı "kaç hafta sonra" bilgisini tutar ama hiçbir yeni randevu üretmez.
- Klinik geneli takvim (`appointments/page.tsx` → `AppointmentModal.tsx`, 596 satır) tam işlevsel tek-randevu oluşturma/güncelleme/erteleme/çakışma-kontrolü akışına sahiptir (`AppointmentsService.create/update/updateStatus/postpone`, `checkConflict` — hekim çakışması yumuşak/force ile geçilebilir, ünit çakışması sert engel).
- `AppointmentsTab.tsx` (hasta detay sayfasındaki "Randevular" sekmesi) ise **çalışmayan bir mock**: veriler `setTimeout` ile sabit kodlanmış, "Randevu Ekle" modalının Kaydet butonunun `onClick`'i yok, hiçbir API çağrısı yapmıyor.
- `Appointment` modelinde tekrarlı seri kavramı yok; her randevu tek tek oluşturuluyor.
- Randevu-hekim çakışma kontrolü klinik yerel saatine göre yapılıyor (`getClinicDateParts`, `appointments.service.ts:32` — sunucu UTC'de çalıştığı için bilinçli olarak `Europe/Istanbul` timezone dönüşümü uygulanıyor); yeni seri üretim mantığı da aynı deseni izlemek zorunda, aksi halde gün sınırı hataları oluşur.

Bu ADR iki talebi ele alır: (1) Zaman Çizelgesi ↔ Randevular senkronizasyonu, (2) Google Calendar tarzı tekrarlı randevu serisi.

## Karar

### 1. Veri Modeli Değişiklikleri (`backend-clinic/prisma/tenant.prisma`)

`OrthoAdjustmentVisit.appointmentId` için **şema değişikliği gerekmiyor** — mevcut alan aktive edilecek.

**Yeni model — `AppointmentSeries`:**

```prisma
model AppointmentSeries {
  id       String @id @default(uuid())
  clinicId String @map("clinic_id")

  patientId String  @map("patient_id")
  patient   Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)

  doctorId String @map("doctor_id")
  doctor   Doctor @relation(fields: [doctorId], references: [id])

  chairId     String?      @map("chair_id")
  dentalChair DentalChair? @relation(fields: [chairId], references: [id], onDelete: SetNull)

  type            String? // MUAYENE | KONTROL | TEDAVI — her occurrence'a kopyalanır
  notes           String? @db.Text
  durationMinutes Int     @map("duration_minutes") // ilk occurrence'tan türetilir, her occurrence'a uygulanır

  freq     String    @map("freq") // WEEKLY | MONTHLY
  interval Int       @default(1)  // "N haftada/ayda bir"
  count    Int?                    // count XOR until zorunlu
  until    DateTime? @map("until")

  status String @default("ACTIVE") // ACTIVE | CANCELLED

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  appointments Appointment[]

  @@index([clinicId, patientId])
  @@map("appointment_series")
}
```

**`Appointment` modeline eklenecek alanlar:**

```prisma
  seriesId        String?             @map("series_id")
  series          AppointmentSeries?  @relation(fields: [seriesId], references: [id], onDelete: SetNull)
  seriesSeq       Int?                @map("series_seq")       // 1-tabanlı sıra, "3/8" gösterimi için
  seriesException Boolean             @default(false) @map("series_exception") // taşındı/tek başına iptal edildi
```

`@@index([seriesId])` eklenir. `onDelete: SetNull` seçildi (Appointment, tarihsel kayıt olduğu için seri silinse bile randevu satırları kalmalı — projedeki `postponedFrom`/`linkedTo` desenindeki "geçmişi koru" ilkesiyle tutarlı).

### 2. Senkronizasyon Yönü ve Mekanizması (Karar + Reddedilen Alternatif)

**Seçilen yön: Zaman Çizelgesi → Randevu (ortho modalinden tetiklenir), iki alt-mekanizma ile:**

**(a) Geriye bağlama (mevcut randevuyu tamamla):** `TimelineSection`'daki VISIT formuna, hastanın `visitDate` civarındaki (±7 gün, `CANCELLED` hariç) randevularını listeleyen bir "Bu ziyaret hangi randevuya karşılık geliyor?" seçici eklenir. Tam olarak `visitDate` ile eşleşen tek bir `PLANNED/CONFIRMED/CHECKED_IN` randevu varsa otomatik ön-seçilir. Kaydedilince: (i) zaten var olan `appointmentId` alanı dolar (şema/servis zaten hazır), (ii) `OrthodonticsService.addAdjustmentVisit` artık `AppointmentsModule`'den enjekte edilen `AppointmentsService.updateStatus(appointmentId, clinicId, {status:'COMPLETED'})` çağırır (randevu zaten COMPLETED/CANCELLED değilse) — takvim ve zaman çizelgesi tek işlemle senkron kalır, çift veri girişi yok.

**(b) İleriye bağlama (sonraki ziyareti takvime düş):** Mevcut `nextVisitWeeks` alanı dolduğunda, formda açılan "Sonraki kontrolü takvime ekle" paneli (hekim — varsayılan `orthoCase.doctorId`, ünit, saat) ile, kayıt sırasında `AppointmentsService.create()` çağrılarak `visitDate + nextVisitWeeks hafta` tarihinde `type:'KONTROL'` bir randevu oluşturulur. Bu randevu bir sonraki ziyarette (a) mekanizması tarafından otomatik eşleştirilecek adaydır.

**Reddedilen alternatif:** "Takvimde KONTROL etiketli bir randevu COMPLETED yapıldığında otomatik taslak zaman-çizelgesi kaydı oluştur." Bu, jenerik `AppointmentsService.updateStatus`'a (tüm branşlar/tüm randevu tipleri için kullanılan, 558 satırlık, zaten karmaşık bir servis) ortodonti-özel dallanma sokmayı gerektirir — modüler monolith sınırını ihlal eder (persona kuralı: `src/modules/<domain>` bağımsızlığı). Ayrıca otomatik taslak kayıt, tel boyutu/IPR/uyum notu gibi asıl klinik veriyi içermez; hekim yine de zaman çizelgesine girip dolduracaktır — zaman kazandırmaz, üstelik doldurulmazsa yanıltıcı/boş bir klinik kayıt zincirde asılı kalır. Seçilen yön (a) sıfır jenerik `AppointmentsService` mantık değişikliği gerektirir (sadece ek bir servis çağrısı), ortodonti mantığını `OrthodonticsModule` içinde tutar ve hekimin klinik veriyi zaten elinde tuttuğu (koltuk başı) ana ile örtüşür.

### 3. Tekrarlı Randevu Serisi Tasarımı

- `freq`: v1 kapsamı `WEEKLY | MONTHLY` (ortodonti kadansı — "4 haftada bir", "aylık kontrol" — için yeterli; `DAILY` ihtiyaç doğarsa v2).
- `count` **veya** `until` zorunlu, ikisi birden **veya** hiçbiri → 400. Kötüye kullanım/kaza koruması: `count <= 52`, `until <= startOn + 2 yıl` (aksi 400 — güvenlik/qa incelemesi gerektiren bir sınır, aşağıda bayraklandı).
- Occurrence üretimi **klinik yerel saatine göre** yapılır (mevcut `getClinicDateParts` deseninin genişletilmiş hali `appointments.service.ts`'den bir yardımcıya taşınır, `AppointmentSeriesGenerator` içinde tekrar kullanılır): WEEKLY → önceki occurrence'ın takvim gününe `interval * 7` gün eklenir, saat/dakika ve süre (`durationMinutes`) korunur. MONTHLY → ay `interval` kadar ilerletilir, gün-of-ay hedef ayın son gününe **clamp** edilir (ör. 31 Ocak + 1 ay → 28/29 Şubat) — Google Calendar'ın "aynı gün" davranışıyla tutarlı.
- Tüm occurrence'lar **tek bir DB transaction'ında** (`AppointmentRepository.runInTransaction` deseni) üretilir; her occurrence için mevcut `checkConflict` çağrılır:
  - **Ünit çakışması (sert engel):** o occurrence atlanır, `skipped[]` içinde `{seq, startOn, endOn, reason:'CHAIR_CONFLICT'}` olarak raporlanır, seri kalan occurrence'larla devam eder.
  - **Hekim çakışması (yumuşak):** `force:true` tüm seri için tek bayraktır (v1'de occurrence-bazlı ayrı onay yok — bu bilinçli bir kapsam sınırlaması, Sonuçlar/Riskler'de not edilmiştir); `force:false` ise ilk çakışan occurrence'ta 409 döner ve **hiçbir occurrence kaydedilmez** (tüm-veya-hiç, mevcut tekli-randevu 409 davranışıyla tutarlı kullanıcı deneyimi).
- **Tek occurrence'ı taşı/iptal et, seriyi bozma:** Mevcut `PATCH /appointments/:id` ve `PATCH /appointments/:id/status` endpoint'leri **değişmeden** kullanılır; `AppointmentsService.update`/`updateStatus` içine, güncellenen kayıt `seriesId` doluysa `seriesException=true` set eden tek satırlık bir ek konur (Google Calendar'daki "yalnızca bu etkinlik" davranışı).
- **Seriyi ileriye dönük iptal et:** Yeni `PATCH /appointments/series/:id/cancel-remaining` — Google Calendar'ın "bu ve sonraki etkinlikler" seçeneğinin minimal karşılığı. "Tüm gelecekteki occurrence'ları tek tek düzenle" (ör. hepsini saat değiştir) v1 kapsamı dışıdır — her occurrence için ayrı çakışma kontrolü gerektiren karmaşık bir akış; Sonuçlar bölümünde gelecek işi olarak not edilmiştir.

### 4. API Kontratı

```
POST /api/v1/appointments/series
Headers: Authorization: Bearer <jwt>, X-Tenant-ID (JWT tenantId her zaman geçerli olanı ezer — mevcut TenantMiddleware davranışı)
Body:
{
  patientId: uuid, doctorId: uuid, chairId?: uuid,
  type?: 'MUAYENE'|'KONTROL'|'TEDAVI', notes?: string,
  startOn: ISO8601, endOn: ISO8601,        // ilk occurrence; süre buradan türetilir
  freq: 'WEEKLY'|'MONTHLY', interval: int (>=1),
  count?: int (1-52), until?: ISO8601,      // tam olarak biri zorunlu
  force?: boolean
}
201 →
{
  seriesId: uuid,
  occurrences: Appointment[]  // her biri seriesSeq ile
  skipped: [{ seq: int, startOn, endOn, reason: 'CHAIR_CONFLICT' }]
}
400 → validasyon (freq/count/until/interval/tarih aralığı hataları)
404 → patientId/doctorId/chairId bu klinikte yok
409 → { conflict:true, appointments:[...] } (force olmadan hekim çakışması, mevcut tekli-randevu 409 şekliyle birebir)

GET /api/v1/appointments/series/:id
200 → { id, ...seri alanları, occurrences: Appointment[] }
404 → seri bulunamadı / başka kliniğe ait

PATCH /api/v1/appointments/series/:id/cancel-remaining
Body: { fromAppointmentId: uuid }
200 → { cancelledCount: int }
404 → seri veya occurrence bulunamadı / başka kliniğe ait

GET /api/v1/appointments?...&patientId=uuid   (mevcut findByDate'e YENİ opsiyonel filtre)
```

Ortho tarafında **yeni endpoint yok** — mevcut `POST /orthodontics/tracks/:id/visits` genişletilir:

```
CreateAdjustmentVisitDto'ya eklenen alan:
  scheduleNextAppointment?: { doctorId: uuid, chairId?: uuid, startOn: ISO8601, endOn: ISO8601 }
```

`appointmentId` alanı zaten DTO'da var — frontend artık gerçekten dolduracak.

### 5. Frontend UX Planı

**`frontend-clinic/src/components/calendar/AppointmentModal.tsx`** (gerçek, çalışan tek-randevu formu): tarih/saat alanlarının yanına Google Calendar'daki "Tekrarla" dropdown'ının karşılığı eklenir — kapalıyken mevcut davranış (tek randevu) korunur; açılınca `freq` (Haftalık/Aylık) chip, `interval` sayı girişi, "Kaç kez" / "Bitiş tarihi" radio seçimi gösterilir, altında istemci tarafında (sadece önizleme, otoriter değil) hesaplanan "8 randevu oluşturulacak: 04.07.2026 – 29.08.2026" özeti gösterilir. Sadece **yeni** randevu oluştururken görünür (`initialData?.id` yokken) — mevcut randevuyu düzenlerken seri paneli gizlenir. `onSave` çağrısı, tekrar aktifse `AppointmentService.createSeries(...)`, değilse mevcut `AppointmentService.create(...)` çağırır.

**`frontend-clinic/src/app/appointments/page.tsx`**: `handleSaveModal` (satır 255-301), tekrar bilgisi varsa `AppointmentService.createSeries` dalına yönlendirilir, sonuç `fetchData()` ile yenilenir; `skipped` varsa toast ile bildirilir. `AppointmentPopover.tsx`'e seri rozet ("Seri 3/8") + `seriesId` doluysa "Bu ve sonraki randevuları iptal et" aksiyonu eklenir (yeni `onCancelRemaining` prop, `handleCancelRemaining` → `AppointmentService.cancelSeriesRemaining`).

**`frontend-clinic/src/app/patients/[id]/tabs/AppointmentsTab.tsx`**: Satır 328-339'daki ölü/mock inline `<Modal>` bloğu (kayıt yapmayan, sahte `setTimeout` verisiyle çalışan) **silinir**, yerine `appointments/page.tsx`'in kullandığı gerçek `AppointmentModal` bileşeni `patientId={patient.id}` ile önceden doldurulmuş şekilde eklenir; satır 64-89'daki mock `useEffect` gerçek `AppointmentService.findAll({patientId: patient.id, ...})` çağrısına bağlanır. Bu hem mevcut bozuk özelliği düzeltir hem de seri/senkron desteğini bedavaya kazandırır (yeni bileşen kodu yazılmaz, mevcut çalışan bileşen yeniden kullanılır).

**`frontend-clinic/src/app/patients/[id]/tabs/OrthodonticsSection.tsx` → `TimelineSection`**: `visitForm` state'ine `linkedAppointmentId: string` ve `scheduleNext: {enabled:boolean, doctorId, chairId, time}` eklenir. Modal açıldığında (`entryKind==='VISIT'`), `visitForm.visitDate` değiştikçe hastanın o tarih civarındaki randevuları `AppointmentService.findAll({patientId, startDate, endDate})` ile çekilip bir `<select>`'e doldurulur (tam eşleşen tek aday varsa otomatik seçilir). `nextVisitWeeks` doluyken "Sonraki kontrolü takvime ekle" paneli açılır (hekim/ünit/saat alanları). `handleSave`'deki `OrthodonticsService.addAdjustmentVisit` çağrısına `appointmentId: visitForm.linkedAppointmentId || undefined` ve `scheduleNextAppointment` eklenir. `timeline` useMemo'daki VISIT satır render'ına, `v.appointmentId` doluysa küçük bir takvim ikonu/rozet ("Randevu ile eşleşti") eklenir — `TimelineEntry` tipine `appointmentId?: string` alanı eklenir.

### 6. Migration Planı

`backend-clinic/prisma/migrations_sql/021_add_appointment_series.sql`:

```sql
-- Tekrarlı randevu serisi (Google Calendar tarzı) + tek-occurrence istisna izleme.
-- OrthoAdjustmentVisit.appointment_id zaten mevcuttu (kullanılmıyordu), şema değişikliği gerekmez.

CREATE TABLE IF NOT EXISTS appointment_series (
  id                 text PRIMARY KEY,
  clinic_id          text NOT NULL,
  patient_id         text NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id          text NOT NULL REFERENCES doctors(id),
  chair_id           text REFERENCES dental_chairs(id) ON DELETE SET NULL,
  type               text,
  notes              text,
  duration_minutes   integer NOT NULL,
  freq               text NOT NULL,
  interval           integer NOT NULL DEFAULT 1,
  count              integer,
  until              timestamp,
  status             text NOT NULL DEFAULT 'ACTIVE',
  created_at         timestamp NOT NULL DEFAULT now(),
  updated_at         timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointment_series_clinic_patient_idx ON appointment_series (clinic_id, patient_id);

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS series_id text REFERENCES appointment_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_seq integer,
  ADD COLUMN IF NOT EXISTS series_exception boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS appointments_series_id_idx ON appointments (series_id);
```

## Sonuçlar

**Olumlu:**
- Zaman çizelgesi ↔ takvim senkronu, zaten var olan ama kullanılmayan `appointmentId` alanını aktive ederek gerçekleşiyor — yeni tablo/kolon gerektirmiyor, minimal risk.
- Seçilen senkron yönü, jenerik `AppointmentsService`'e ortodonti-özel dallanma sokmuyor; `OrthodonticsModule`, `AppointmentsModule`'ü import edip `AppointmentsService`'i enjekte ediyor (tek yönlü bağımlılık, döngüsel değil).
- `AppointmentModal.tsx`'in tekrar kullanılması (`AppointmentsTab.tsx` içinde de) hem mevcut bozuk mock'u düzeltiyor hem de kod tekrarını önlüyor.
- Tekli occurrence taşıma/iptali mevcut `PATCH /appointments/:id(/status)` üzerinden çalışmaya devam ediyor — `seriesException` bayrağı dışında davranış değişmiyor.

**Olumsuz / Riskler:**
- Seri oluşturmada `force` tüm seri için tek bayrak — occurrence-bazlı ayrı onay yok (v2'de ele alınabilir).
- "Bu ve sonraki tüm occurrence'ları toplu düzenle" (saat/hekim değiştirme) kapsam dışı; yalnızca toplu iptal (`cancel-remaining`) var.
- `count<=52` / `until<=+2 yıl` sınırları keyfi seçildi — **security-engineer** kaynak tüketimi (DB şişirme, çok sayıda occurrence ile takvim/occupancy sorgularını yavaşlatma) açısından gözden geçirmeli.
- Yeni `POST /appointments/series` ve `PATCH .../cancel-remaining` mevcut `POST /appointments` ile aynı `JwtAuthGuard`+`clinicId`-filtre desenini kullanıyor ama **rol bazlı kısıt yok** (mevcut appointments controller'da da yok) — **security-engineer** IDOR/yetki kontrolü (ör. hangi rol seri oluşturabilir/iptal edebilir) için mevcut boşluğun bu ADR kapsamında büyütülüp büyütülmediğini teyit etmeli.
- Occurrence üretimi timezone-hassas (MONTHLY clamp, WEEKLY gün sınırı) — **qa-engineer** ay sonu (31→Şubat), yıl dönümü ve `Europe/Istanbul` sabit UTC+3 (DST yok) varsayımını test etmeli.
- `AppointmentsService.create/update`'e patientId/doctorId var olma kontrolü halihazırda yok (Prisma FK hatasına güveniliyor) — bu ADR bu mevcut boşluğu büyütmüyor ama seri endpoint'i aynı deseni miras alıyor; **qa-engineer** geçersiz ID ile 500 yerine 404 beklentisini test etmeli (mevcut davranışla tutarlı olduğu için bu ADR'de zorunlu düzeltme değil, ayrı bir iyileştirme önerisi).

## Uygulama Sırası (Handoff — backend-engineer / frontend-engineer)

1. **Faz 1 — Şema**: `021_add_appointment_series.sql` migration'ı + `tenant.prisma`'ya `AppointmentSeries` modeli ve `Appointment.seriesId/seriesSeq/seriesException` alanları.
2. **Faz 2 — Backend seri motoru**: `AppointmentsModule` içine `AppointmentSeriesService` (occurrence üretim algoritması, `checkConflict` tekrar kullanımı), `POST/GET /appointments/series`, `PATCH /appointments/series/:id/cancel-remaining`, `GET /appointments?patientId=` filtresi, `update`/`updateStatus`'a `seriesException` set eden satır.
3. **Faz 3 — Backend ortho senkron**: `OrthodonticsModule` → `AppointmentsModule` import, `CreateAdjustmentVisitDto.scheduleNextAppointment`, `OrthodonticsService.addAdjustmentVisit` içinde linked-appointment auto-complete + next-appointment auto-create.
4. **Faz 4 — Frontend seri UI**: `AppointmentModal.tsx`'e "Tekrarla" paneli, `appointment.service.ts`'e `createSeries/getSeries/cancelSeriesRemaining`, `appointments/page.tsx` `handleSaveModal` dallanması, `AppointmentPopover.tsx` seri rozeti/aksiyonu.
5. **Faz 5 — Frontend ortho senkron + AppointmentsTab düzeltmesi**: `TimelineSection` linked-appointment seçici + "sonraki kontrolü takvime ekle" paneli + rozet; `AppointmentsTab.tsx`'in mock modalının gerçek `AppointmentModal` ile değiştirilmesi.
6. Her faz sonunda `code-reviewer` → `security-engineer` → `qa-engineer` zinciri (yukarıdaki risk maddeleri özellikle Faz 2/3'te).
