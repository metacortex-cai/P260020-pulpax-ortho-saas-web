<div align="center">

# 🦷 Pulpax Ortho — Ortodonti Uzmanlaşmış Klinik Yönetim Sistemi

**Multi-tenant, ortodonti kliniklerine özel diş kliniği yönetim yazılımı**

[![Version](https://img.shields.io/badge/version-1.1.1-blue.svg)](https://github.com/metacortex-cai/P260020-pulpax-ortho-saas-web/releases/tag/v1.1.1)
[![Changelog](https://img.shields.io/badge/changelog-CHANGELOG.md-orange.svg)](CHANGELOG.md)
[![Stack](https://img.shields.io/badge/stack-NestJS%20%2B%20Next.js-green.svg)]()
[![Docker](https://img.shields.io/badge/docker-compose-2496ED.svg)](docker-compose.yml)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)]()

</div>

---

## 📋 İçindekiler

- [Bu Proje Hakkında](#-bu-proje-hakkında)
- [Özellikler](#-özellikler)
- [Mimari](#-mimari)
- [Teknoloji Stack](#️-teknoloji-stack)
- [Hızlı Başlangıç](#-hızlı-başlangıç)
- [Servis Portları](#-servis-portları)
- [Proje Yapısı](#-proje-yapısı)
- [Ortam Değişkenleri](#-ortam-değişkenleri)
- [Geliştirici Kılavuzu](#-geliştirici-kılavuzu)
- [Sürüm Geçmişi](#-sürüm-geçmişi)
- [Katkıda Bulunma](#-katkıda-bulunma)

---

## 🎯 Bu Proje Hakkında

Pulpax Ortho, genel amaçlı Pulpax klinik yönetim yazılımının **ortodonti kliniklerine özelleştirilmiş** bir türevidir. Genel diş kliniklerinde bulunan Laboratuvar ve Stok/Depo modülleri bu ürün kapsamında bilinçli olarak kaldırılmış; onların yerine tam kapsamlı bir **ortodonti vaka takip sistemi** (diyagnoz, tedavi takibi, mini-vida/TAD kayıtları, büyüme değerlendirmesi, retensiyon planı, aligner seti takibi) eklenmiştir.

---

## ✨ Özellikler

| Modül | Açıklama |
|-------|----------|
| 🦷 **Hasta Yönetimi** | Hasta kartları, anamnez, fotoğraf, belge yönetimi, reçeteler, kategoriler |
| 📅 **Randevu Takvimi** | Sürükle-bırak takvim, tekrarlı randevu serileri, durum takibi, koltuk yönetimi, SMS hatırlatma |
| 🔬 **Tedavi** | Diş haritası (dental chart), tedavi planları, tarifeler |
| 🦴 **Ortodonti Vaka Takibi** | Diyagnoz, tedavi rotası (aligner/apareyli), aktivasyon logları, mini-vida (TAD) kayıtları, büyüme değerlendirmesi, retensiyon planı |
| 💰 **Finans Modülü** | Tahsilatlar, giderler, kasa/banka, hasta cari, ödeme/iade/ekstre yönetimi |
| 👥 **İnsan Kaynakları / Personel** | Personel profili, izin yönetimi, mesai takibi, sözleşme/prim sistemi, davet akışı (invite) — Doctor modeliyle köprülenmiş İK kaydı |
| 🩺 **Hekim Yönetimi** | Randevu/tedavi ekranlarındaki hekim seçim listelerinin FK hedefi olan minimal Doctor kaydı |
| 🏢 **Çoklu Klinik Şubesi** | Tek klinik altında birden fazla şube (clinic branch) yönetimi |
| 🔑 **Kullanıcı Yönetimi** | Sistem kullanıcıları, rol/yetki bazlı erişim |
| 🏥 **Resmi Entegrasyonlar** | e-Fatura/e-Arşiv (GİB), e-Reçete, ÜTS (Ürün Takip Sistemi) veri iletimi, Paraşüt muhasebe entegrasyonu |
| 📊 **Raporlar** | Gelir, tedavi performansı, hekim performans/prim raporu, tahsilat analizi |
| 🔔 **Bildirimler** | Gerçek zamanlı SSE bildirimleri, SMS entegrasyonu |
| 🏛️ **Multi-Tenant** | Klinik başına ayrı PostgreSQL veritabanı (DB-per-tenant); veritabanı içinde ek savunma katmanı olarak Row-Level Security (RLS) |
| 🔐 **Güvenlik** | AES-256-GCM şifreleme, JWT (HttpOnly cookie), HTTPS, CSP nonce |

> **Kapsam dışı:** Laboratuvar (Lab) ve Stok/Depo (Inventory/Warehouse) modülleri, ortodonti odaklı kapsam kararı gereği bu üründe bulunmaz.

---

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                            │
│   https://localhost:7101 (Klinik)                       │
│   https://localhost:6101 (SaaS Admin)                   │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
    ┌──────────▼──────────┐ ┌─────────▼──────────┐
    │  frontend-clinic    │ │   frontend-saas    │
    │  Next.js  :7101     │ │   Next.js  :6101   │
    └──────────┬──────────┘ └─────────┬──────────┘
               │ HTTPS + HttpOnly JWT  │
    ┌──────────▼──────────┐ ┌─────────▼──────────┐
    │  backend-clinic     │ │   backend-saas      │
    │  NestJS API  :7110  │ │   NestJS API :6110  │
    └──────┬──────┬───────┘ └──────────┬──────────┘
           │      │                    │
    ┌──────▼──┐ ┌─▼────────┐   ┌──────▼──────┐
    │ Redis 7 │ │Tenant DB │   │  Master DB  │
    │ :6481   │ │(per klinik)│  │ pulpax_db  │
    └─────────┘ └──────────┘   └─────────────┘
           PostgreSQL (host) → localhost:5533
```

**Multi-Tenant Yaklaşımı:** Her klinik ayrı bir PostgreSQL veritabanına sahiptir. `TenantPrismaService`, her istek için `X-Tenant-ID` header'ına göre doğru bağlantı havuzunu dinamik olarak seçer. `Employee` (İK) ve `Doctor` (klinik FK hedefi) ayrı modeller olarak tutulur; `Employee.doctorId` alanı ikisini birbirine bağlar.

---

## 🛠️ Teknoloji Stack

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| **Frontend Klinik** | Next.js, TypeScript, Tailwind CSS | 14+ |
| **Frontend SaaS** | Next.js, TypeScript | 14+ |
| **Backend Klinik** | NestJS, Prisma ORM | 10+ / 5.x |
| **Backend SaaS** | NestJS, Prisma ORM | 10+ / 5.x |
| **Veritabanı** | PostgreSQL | 15 |
| **Cache / Queue** | Redis, BullMQ | 7 |
| **Container** | Docker, Docker Compose | 24+ |
| **Auth** | JWT (HttpOnly cookie), Passport | — |
| **Şifreleme** | AES-256-GCM | — |

---

## 🚀 Hızlı Başlangıç

### Önkoşullar

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) v24+
- Git

### Kurulum

```bash
# 1. Repoyu klonla
git clone https://github.com/metacortex-cai/P260020-pulpax-ortho-saas-web.git
cd P260020-pulpax-ortho-saas-web

# 2. backend-clinic/.env dosyasını backend-clinic/.env.example'dan oluştur ve
#    JWT_SECRET / ENCRYPTION_KEY / SEED_ADMIN_PASSWORD gibi zorunlu değerleri doldur
#    (SEED_ADMIN_PASSWORD seed script'i için zorunludur, repo'da örnek bir değeri yoktur)

# 3. Tüm servisleri başlat
docker compose up -d

# 4. Servislerin ayağa kalkmasını bekle (~30 sn)
docker compose ps

# 5. Master + tenant veritabanlarını seed et (ilk kurulumda)
docker compose exec backend-clinic npx ts-node prisma/seed.ts

# 6. Row-Level Security politikalarını her tenant veritabanına uygula
docker compose exec -e TENANT_DATABASE_URL=postgresql://pulpax_user:<POSTGRES_PASSWORD>@postgres:5432/pulpax_tenant_a backend-clinic npx ts-node prisma/apply-rls.ts
docker compose exec -e TENANT_DATABASE_URL=postgresql://pulpax_user:<POSTGRES_PASSWORD>@postgres:5432/pulpax_tenant_b backend-clinic npx ts-node prisma/apply-rls.ts
```

### İlk Giriş

| Alan | Değer |
|------|-------|
| **URL** | https://localhost:7101 |
| **E-posta** | `doctor@pulpax.test` |
| **Şifre** | `seed.ts` çalıştırılırken kullanılan `SEED_ADMIN_PASSWORD` değeri |

> **Not:** Self-signed SSL sertifikası nedeniyle tarayıcı uyarısı görebilirsiniz — "Yine de devam et" seçeneğini kullanın.

---

## 🌐 Servis Portları

| Servis | URL | Açıklama |
|--------|-----|----------|
| **Klinik Paneli** | https://localhost:7101 | Doktor/klinik kullanıcı arayüzü |
| **SaaS Admin** | https://localhost:6101 | Master yönetici paneli |
| **Klinik API** | https://localhost:7110 | NestJS REST API |
| **SaaS API** | https://localhost:6110 | NestJS REST API |
| **Swagger (Klinik)** | https://localhost:7110/api/v1/docs | API dokümantasyonu |
| **Health Check** | https://localhost:7110/api/v1/health | Servis durumu |
| **PostgreSQL** | localhost:5533 | Host'tan erişim (Docker: `postgres:5432`) |
| **Redis** | localhost:6481 | Host'tan erişim (Docker: `redis:6379`) |

---

## 📁 Proje Yapısı

```
P260020-pulpax-ortho-saas-web/
├── frontend-clinic/              # Next.js klinik kullanıcı paneli
│   └── src/
│       ├── app/
│       │   ├── dashboard/        # Ana panel (KPI, widget'lar)
│       │   ├── patients/         # Hasta yönetimi + sekme sistemi (Ortodonti bölümü dahil)
│       │   ├── appointments/     # Randevu takvimi + tekrarlı seriler
│       │   ├── finance/          # Finans modülü
│       │   ├── hr/               # Personel yönetimi (staff, izin)
│       │   ├── reports/          # Raporlar (hekim performansı dahil)
│       │   ├── support/          # Destek (FAQ, talepler)
│       │   ├── tariffs/          # Tarifeler
│       │   ├── select-clinic/    # Çoklu klinik seçimi
│       │   └── settings/         # Sistem ayarları (şubeler dahil)
│       ├── components/           # Yeniden kullanılabilir bileşenler
│       ├── hooks/                # Custom React hook'lar
│       ├── lib/services/         # API servis katmanı
│       └── store/                # Zustand state yönetimi
│
├── frontend-saas/                # Next.js SaaS admin paneli
│   └── src/app/(saas)/           # clinics, billing, admins, multi-branch, tariffs, treatments
│
├── backend-clinic/               # NestJS klinik API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/             # JWT kimlik doğrulama
│   │   │   ├── patients/         # Hasta CRUD + RLS
│   │   │   ├── appointments/     # Randevu servisi (izin/mesai çakışma kontrolü dahil)
│   │   │   ├── treatments/       # Tedavi servisi
│   │   │   ├── orthodontics/     # Ortodonti vaka/diyagnoz/tedavi rotası servisi
│   │   │   ├── finance/          # Finans servisi
│   │   │   ├── doctors/          # Minimal hekim CRUD'u (klinik FK hedefi)
│   │   │   ├── employees/        # Personel/İK servisi (izin, mesai, sözleşme, prim)
│   │   │   ├── clinic-branches/  # Çoklu şube yönetimi
│   │   │   ├── users/            # Sistem kullanıcıları
│   │   │   ├── medications/      # İlaç/reçete kalemleri
│   │   │   ├── reminders/        # Hatırlatma servisi
│   │   │   ├── support/          # Destek/talep servisi
│   │   │   ├── currency/         # Döviz kuru senkronizasyonu
│   │   │   ├── email/            # E-posta gönderimi
│   │   │   ├── sms/              # SMS entegrasyonu
│   │   │   ├── efatura/          # e-Fatura / e-Arşiv (GİB) entegrasyonu
│   │   │   ├── erecete/          # e-Reçete entegrasyonu
│   │   │   ├── uss/              # ÜTS (Ürün Takip Sistemi) veri iletimi
│   │   │   ├── parasut/          # Paraşüt muhasebe entegrasyonu
│   │   │   ├── notifications/    # SSE bildirimler
│   │   │   ├── health/           # Health check endpoint'i
│   │   │   └── reports/          # Raporlama
│   │   ├── prisma/               # Prisma servis + tenant client
│   │   └── common/               # Guards, filters, interceptors, audit
│   └── prisma/
│       ├── schema.prisma         # Master DB şeması
│       ├── tenant.prisma         # Tenant DB şeması (Employee/Doctor köprüsü dahil)
│       ├── apply-rls.ts          # Row-Level Security politika script'i
│       ├── migrations_sql/       # Elle yönetilen SQL migration'ları
│       └── seed.ts               # Seed verisi
│
├── backend-saas/                 # NestJS master admin API (auth, saas, email, notifications, health)
├── docs/ADR/                     # Mimari karar kayıtları (ADR)
├── docker-compose.yml            # Geliştirme ortamı
├── docker-compose.app.yml        # Prodüksiyon ortamı
├── CHANGELOG.md                  # Sürüm notları
└── README.md                     # Bu dosya
```

---

## ⚙️ Ortam Değişkenleri

Servis bazlı `.env` dosyaları (`backend-clinic/.env`, `backend-saas/.env`) ve kök dizindeki `.env` (Docker Compose için `POSTGRES_PASSWORD` gibi paylaşılan değerler) kullanılır. Kritik değişkenler:

| Değişken | Servis | Açıklama |
|----------|--------|----------|
| `DATABASE_URL` | backend-clinic, backend-saas | Master PostgreSQL bağlantısı |
| `TENANT_DATABASE_URL` / `DATABASE_URL_TENANT_A` / `DATABASE_URL_TENANT_B` | backend-clinic | Klinik başına tenant PostgreSQL bağlantıları (docker-compose üzerinden enjekte edilir) |
| `JWT_SECRET` | backend-clinic, backend-saas | JWT imzalama anahtarı |
| `ENCRYPTION_KEY` | backend-clinic | AES-256 şifreleme anahtarı |
| `SEED_ADMIN_PASSWORD` | backend-clinic | `seed.ts` çalıştırılırken oluşturulan test kullanıcılarının şifresi (zorunlu, varsayılanı yoktur) |
| `REDIS_HOST` / `REDIS_PORT` | backend-clinic | Redis bağlantı host/port bilgisi |
| `CORS_ORIGIN` | backend-clinic | İzin verilen frontend adresleri |
| `POSTGRES_PASSWORD` | (root `.env`) | Docker Compose'daki PostgreSQL servis şifresi |

> ⚠️ Üretim ortamında tüm gizli anahtarları (`JWT_SECRET`, `ENCRYPTION_KEY`, `SEED_ADMIN_PASSWORD` vb.) güçlü, rastgele değerlerle değiştirin.

---

## 💻 Geliştirici Kılavuzu

### Servis Loglarını İzleme

```bash
# Tüm servisler
docker compose logs -f

# Sadece backend
docker compose logs -f backend-clinic

# Sadece frontend
docker compose logs -f frontend-clinic
```

### Frontend Cache Temizleme (Değişiklik Sonrası)

Turbopack/watcher bazen Windows'ta dosya değişikliklerini yakalamayabilir; bu durumda:

```bash
docker compose restart frontend-clinic
```

### Veritabanı Şeması Güncelleme

```bash
# Tenant DB (schema push + client generate) — container yeniden başladığında otomatik de çalışır
docker compose exec backend-clinic npx prisma db push --schema=prisma/tenant.prisma

# Master DB
docker compose exec backend-clinic npx prisma db push --schema=prisma/schema.prisma
```

> Prisma client'ı yeniden üretmek container'ı yeniden başlatmayı gerektirebilir (bkz. `docker-compose.yml`'deki anonymous volume'lar: `dist` ve `src/prisma/tenant-client`). Şema değişikliği container'a yansımıyorsa `docker compose up -d --force-recreate --renew-anon-volumes backend-clinic` deneyin.

### Lint & Format

```bash
# Backend (auto-fix ile)
cd backend-clinic && npm run lint

# Frontend
cd frontend-clinic && npm run lint
```

### Testleri Çalıştırma

```bash
# Backend unit testleri
cd backend-clinic
npm test                  # tüm testler
npm test -- --coverage    # coverage raporu ile
npm test -- --testPathPattern=employees   # belirli modül

# Frontend tip kontrolü
cd ../frontend-clinic
npx tsc --noEmit
```

---

## 📋 Sürüm Geçmişi

Bu proje, Pulpax'in genel klinik yönetim ürününden (v1.1.6) **ortodonti kliniklerine özelleştirilerek** çatallandı (forked) ve kendi sürüm numaralandırmasıyla ayrı bir repoda (`P260020-pulpax-ortho-saas-web`) devam ediyor.

| Versiyon | Özet |
|----------|------|
| [v1.1.1](https://github.com/metacortex-cai/P260020-pulpax-ortho-saas-web/releases/tag/v1.1.1) | 👥 İnsan Kaynakları (Employee/Doctor köprüsü) modülünün geri getirilmesi, randevu tekrarlı serileri (ADR-004), çoklu klinik şubesi; AI Radyoloji/DICOM/Protokoller modüllerinin kapsam dışına alınması |

Bu forktan önceki genel Pulpax ürün geçmişi için [CHANGELOG.md](CHANGELOG.md) dosyasına bakın.

---

## 🤝 Katkıda Bulunma

```bash
# 1. Feature branch oluştur
git checkout -b feat/yeni-ozellik

# 2. Değişiklikleri commit et (Conventional Commits formatında)
git commit -m "feat: yeni özellik açıklaması"

# 3. Branch'i push et
git push origin feat/yeni-ozellik

# 4. Pull Request aç
```

**Commit Formatı:**
| Prefix | Kullanım |
|--------|----------|
| `feat:` | Yeni özellik |
| `fix:` | Hata düzeltme |
| `chore:` | Yapılandırma / araç değişiklikleri |
| `docs:` | Dokümantasyon |
| `refactor:` | Yeniden yapılandırma |
| `perf:` | Performans iyileştirmesi |

---

## 📄 Lisans

Bu proje tescilli (proprietary) lisans altındadır.
© 2026 **Pulpax Ortho / Metacortex CAI**. Tüm hakları saklıdır.
