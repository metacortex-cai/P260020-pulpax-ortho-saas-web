# Pulpax Dental OS - Kapsamlı Test ve Kalite Güvence (QA) Yol Haritası

Bu doküman, Pulpax Dental OS platformunun (SaaS ve Klinik panelleri ile backend servisleri) sürdürülebilir kalitesi, SecOps olgunluğu ve üstün kullanıcı deneyimi (UX) için tasarlanmış test stratejisini ve yol haritasını tanımlar.

---

## 🧪 1. Pulpax Test Piramidi ve Stratejisi

Piramit yapımız, geliştirme hızını korurken yüksek sistem güvenilirliği sağlamayı hedefler:
- **Birim Testleri (Unit Tests) (%70-80):** Hızlı, izole fonksiyon testleri (Jest / NestJS Testing).
- **Entegrasyon Testleri (Integration Tests) (%15-20):** Modüller arası veri akışı ve Prisma DB izolasyonunun doğrulanması.
- **Uçtan Uca Testler (E2E) (%5-10):** Playwright ile kritik kullanıcı senaryoları.
- **Güvenlik & Performans Testleri:** Sürekli entegrasyon (CI) hattında ve sızma testlerinde paralel yürütülür.

---

## 📊 2. Mevcut Durum ve Yeni Yol Haritası Matrisi

Aşağıdaki tablo, Pulpax'ta halihazırda bulunan test yapıları ile masaüstü kılavuzundan (`test.md`) hareketle yol haritamıza eklenen yeni özellikleri karşılaştırmalı olarak özetlemektedir:

| Test Kategorisi | Mevcut Altyapı | Yeni Eklenen Yol Haritası Özellikleri | Hedeflenen Araç / Teknoloji |
| :--- | :--- | :--- | :--- |
| **Birim Testleri (Unit)** | Jest altyapısı mevcuttur. | Temel klinik hesaplama algoritmaları için test kapsamının artırılması. | Jest, ts-jest |
| **Entegrasyon Testleri** | DB izolasyon testleri (`tenant-leakage.spec.ts`) aktiftir. | Modüller arası akış testleri (Tedavi Tamamlama $\rightarrow$ Stok Düşüşü $\rightarrow$ Cari Muhasebe Kaydı). | Jest, Prisma Client Mocking |
| **E2E / Regresyon** | Playwright klinik panel testleri mevcuttur. | Randevu oluşturmadan tedavi tamamlamaya ve faturalandırmaya kadar tam kullanıcı döngüsü. | Playwright, Chromium |
| **Performans Testleri** | Autocannon giriş yük testleri bulunur. | **Lighthouse CI** entegrasyonu ile frontend hızı, SEO ve performans analizi. | Lighthouse CI, Autocannon |
| **Güvenlik Testleri (SecOps)** | `npm audit` ve OWASP ZAP Docker baseline mevcuttur. | 1. **Yetkisiz Erişim Testleri:** Süresi geçmiş veya eksik token testleri.<br>2. **Rate Limit Otomasyonu:** Throttler aşım testleri.<br>3. **CSP Audit:** Güvenlik başlığı kontrolleri. | Curl, Postman Newman, OWASP ZAP |
| **Kullanıcı Testleri (User UX)** | Bulunmamaktadır. | 1. **Sentry Entegrasyonu:** Canlı sistem hata yakalama.<br>2. **Microsoft Clarity / Hotjar:** Isı haritaları ve oturum kayıtları.<br>3. **A/B Test Altyapısı:** Arayüz bileşen testi. | Sentry SDK, Clarity, Hotjar |
| **Erişilebilirlik (a11y)** | Manuel ARIA rolleri eklenmiştir. | **Otomatik WCAG Uyumluluk Testleri:** Klavye navigasyonu ve kontrast hatalarının yakalanması. | `@axe-core/playwright`, Axe DevTools |

---

## 🗺️ 3. Yol Haritası Detayları ve Aksiyon Planı

### Faz 1: Kod ve Entegrasyon Kalitesinin Artırılması
> [!NOTE]
> Bu faz, klinik mantığındaki kritik iş süreçlerinin (İlaç tüketimi, stok düşümü vb.) ve veritabanı yalıtımının hatasız çalışmasını amaçlar.

- **[ ] Entegrasyon Akış Testleri:**
  - `TreatmentPlans` modülündeki domain event'lerin tetiklediği `Inventory` stok düşüm mekanizması için entegrasyon testlerinin yazılması.
  - Cari ödemelerin FIFO algoritmasıyla tedavilere dağılımını doğrulayan matematiksel doğrulama testleri.
- **[ ] E2E Playwright Senaryolarının Genişletilmesi:**
  - `Randevu Oluşturma` $\rightarrow$ `Tedavi Ekleme` $\rightarrow$ `Tedaviyi Tamamlama` $\rightarrow$ `Ödeme Alma` adımlarını içeren kesintisiz akış test senaryolarının yazılması.

### Faz 2: Otomatik Güvenlik ve Performans Taramaları (SecOps)
> [!IMPORTANT]
> Uygulama güvenliğinin sürekli korunması için CI/CD hattına sızma testi benzeri kontroller entegre edilecektir.

- **[ ] API Yetkilendirme ve Rate Limiting Testleri:**
  - NestJS API endpoint'lerine expired/eksik Bearer token'lar ile istek atıp `401/403` döndüğünü doğrulayan otomatik test betiğinin (`test/security-api.spec.ts`) yazılması.
  - Belirlenen limitin (örneğin 1 dakikada 100 istek) üzerinde istek atarak rate limiting (`ThrottlerGuard`) ve `429 Too Many Requests` hatasının alındığının doğrulanması.
- **[ ] Lighthouse CI Entegrasyonu:**
  - Frontend derleme aşamasında sayfa performans, erişilebilirlik ve SEO metriklerini denetleyen otomatik kontrol hattı kurulması.

### Faz 3: Kullanıcı Deneyimi, Analytics ve Canlı İzleme (UX Testing)
> [!TIP]
> Gerçek kullanıcı deneyiminin ölçülmesi ve arayüz hatalarının canlıya çıkmadan veya anında yakalanması sağlanacaktır.

- **[ ] Sentry Entegrasyonu:**
  - Hem `backend-clinic`/`backend-saas` hem de `frontend-clinic`/`frontend-saas` NextJS uygulamalarına Sentry SDK entegre edilerek tüm istisnaların (exception) canlı ortamda anlık takibi.
- **[ ] Microsoft Clarity / Hotjar Kurulumu:**
  - Klinik asistan ve hekimlerinin ekranı kullanım akışlarını, tıklama ısı haritalarını (heatmaps) analiz edecek arayüz izleme kodlarının eklenmesi.
- **[ ] A/B Test Altyapısı:**
  - `dashboardStore` veya NextJS middleware katmanında basit A/B varyasyon yönlendirme mantığının kurulması.

### Faz 4: Otomatik Erişilebilirlik (Accessibility - a11y)
- **[ ] Axe Entegrasyonu:**
  - Playwright testlerimize `@axe-core/playwright` dahil edilerek, tüm modal pencerelerin, hasta kayıt formlarının ve veri tablolarının WCAG AA erişilebilirlik standartlarına uygunluğunun (renk kontrastı, ekran okuyucu etiketleri) her kod değişiminde otomatik taranması.

---

## 📈 4. Başlangıç ve Takip Planı

Bu yol haritasını sırasıyla uygulamak ve durum takibi yapmak için aşağıdaki komut zincirleri ve test scriptleri projemize entegre edilecektir:

- **Erişilebilirlik ve E2E Kontrolü:** `npx playwright test`
- **Dependency & Sec Check:** `npm run test:security`
- **Rate Limit & API Auth Taraması:** `npm run test:api-security` *(Yol Haritası Kapsamında Yeni Eklenecektir)*
