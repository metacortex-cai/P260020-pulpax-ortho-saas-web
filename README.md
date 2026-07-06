<div align="center">

# 🦷 Pulpax — Klinik Yönetim Sistemi

**Multi-tenant, tam özellikli diş kliniği yönetim yazılımı**

[![Version](https://img.shields.io/badge/version-1.1.6-blue.svg)](https://github.com/metacortex-cai/pulpax-react-v.02/releases/tag/v1.1.6)
[![Changelog](https://img.shields.io/badge/changelog-CHANGELOG.md-orange.svg)](CHANGELOG.md)
[![Stack](https://img.shields.io/badge/stack-NestJS%20%2B%20Next.js-green.svg)]()
[![Docker](https://img.shields.io/badge/docker-compose-2496ED.svg)](docker-compose.yml)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)]()

</div>

---

## 📋 İçindekiler

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

## ✨ Özellikler

| Modül | Açıklama |
|-------|----------|
| 🦷 **Hasta Yönetimi** | Hasta kartları, anamnez, fotoğraf, belge yönetimi, reçeteler, kategoriler |
| 📅 **Randevu Takvimi** | Sürükle-bırak takvim, durum takibi, koltuk yönetimi, SMS hatırlatma |
| 🔬 **Tedavi & İmplant** | Diş haritası (dental chart), tedavi planları, ICON ortodonti skoru |
| 💰 **Finans Modülü** | Tahsilatlar, giderler, kasa/banka, hasta cari, aday hastalar |
| 👥 **HR / Personel Modülü** | Personel profili, davet akışı (invite), izin yönetimi, mesai takibi (work hours), prim hesaplama |
| 🔑 **Kullanıcı Yönetimi** | Sistem kullanıcıları, rol/yetki bazlı erişim (users modülü) |
| 📦 **Stok Yönetimi** | Malzemeler, demirbaşlar, tedarikçiler, ambar hareketleri |
| 🧪 **Lab Yönetimi** | Laboratuvar iş akışı, tarifeler, hareket takibi |
| 🏥 **Resmi Entegrasyonlar** | e-Fatura/e-Arşiv (GİB), e-Reçete, ÜTS (Ürün Takip Sistemi) veri iletimi |
| 🩻 **AI Radyoloji** | Yapay zeka destekli radyografi analizi |
| 📊 **Raporlar** | Gelir, tedavi performansı, doktor komisyonları, tahsilat analizi |
| 🔔 **Bildirimler** | Gerçek zamanlı SSE bildirimleri, dahili mesajlaşma, SMS entegrasyonu |
| 🏛️ **Multi-Tenant** | Klinik başına ayrı PostgreSQL veritabanı (DB-per-tenant); veritabanı içinde ek savunma katmanı olarak Row-Level Security (RLS) |
| 🔐 **Güvenlik** | AES-256-GCM şifreleme, JWT (HttpOnly cookie), HTTPS, CSP nonce |

---

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                            │
│   https://localhost:7001 (Klinik)                       │
│   https://localhost:6001 (SaaS Admin)                   │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
    ┌──────────▼──────────┐ ┌─────────▼──────────┐
    │  frontend-clinic    │ │   frontend-saas    │
    │  Next.js 14 :7001   │ │   Next.js 14 :6001 │
    └──────────┬──────────┘ └─────────┬──────────┘
               │ HTTPS + HttpOnly JWT  │
    ┌──────────▼──────────┐ ┌─────────▼──────────┐
    │  backend-clinic     │ │   backend-saas     │
    │  NestJS API  :7010  │ │   NestJS API :6010 │
    └──────┬──────┬───────┘ └──────────┬─────────┘
           │      │                    │
    ┌──────▼──┐ ┌─▼────────┐   ┌──────▼──────┐
    │ Redis 7 │ │Tenant DB │   │  Master DB  │
    │  :6379  │ │(per klinik)│  │ pulpax_db  │
    └─────────┘ └──────────┘   └─────────────┘
```

**Multi-Tenant Yaklaşımı:** Her klinik ayrı bir PostgreSQL veritabanına sahiptir. `TenantPrismaService`, her istek için `X-Tenant-ID` header'ına göre doğru bağlantı havuzunu Redis cache üzerinden dinamik olarak seçer.

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
git clone https://github.com/metacortex-cai/pulpax-react-v.02.git
cd pulpax-react-v.02

# 2. Tüm servisleri başlat
docker compose up -d

# 3. Servislerin ayağa kalkmasını bekle (~30 sn)
docker compose ps

# 4. Master veritabanını seed et (ilk kurulumda)
docker exec pulpax-backend-clinic npx ts-node -r tsconfig-paths/register prisma/seed.ts
```

### İlk Giriş

| Alan | Değer |
|------|-------|
| **URL** | https://localhost:7001 |
| **E-posta** | `doctor@pulpax.test` |
| **Şifre** | `PulpaxDoctor2026!` |

> **Not:** Self-signed SSL sertifikası nedeniyle tarayıcı uyarısı görebilirsiniz — "Yine de devam et" seçeneğini kullanın.

---

## 🌐 Servis Portları

| Servis | URL | Açıklama |
|--------|-----|----------|
| **Klinik Paneli** | https://localhost:7001 | Doktor/klinik kullanıcı arayüzü |
| **SaaS Admin** | https://localhost:6001 | Master yönetici paneli |
| **Klinik API** | https://localhost:7010 | NestJS REST API |
| **SaaS API** | https://localhost:6010 | NestJS REST API |
| **Swagger (Klinik)** | https://localhost:7010/api/v1/docs | API dokümantasyonu |
| **PostgreSQL** | localhost:5433 | Host'tan erişim (Docker: `postgres:5432`) |
| **Redis** | localhost:6381 | Host'tan erişim (Docker: `redis:6379`) |

---

## 📁 Proje Yapısı

```
pulpax-react-v.02/
├── frontend-clinic/              # Next.js klinik kullanıcı paneli
│   └── src/
│       ├── app/
│       │   ├── dashboard/        # Ana panel (KPI, widget'lar)
│       │   ├── patients/         # Hasta yönetimi + sekme sistemi
│       │   ├── appointments/     # Randevu takvimi
│       │   ├── finance/          # Finans modülü
│       │   ├── hr/               # Personel yönetimi (staff, izin, mesai)
│       │   ├── inventory/        # Stok yönetimi
│       │   ├── lab/              # Laboratuvar
│       │   ├── protocol/         # Protokol yönetimi
│       │   ├── marketing/        # Pazarlama kampanyaları
│       │   ├── reports/          # Raporlar
│       │   ├── support/          # Destek (FAQ, talepler)
│       │   ├── tariffs/          # Tarifeler
│       │   ├── select-clinic/    # Çoklu klinik seçimi
│       │   └── settings/         # Sistem ayarları
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
│   │   │   ├── appointments/     # Randevu servisi
│   │   │   ├── treatments/       # Tedavi servisi
│   │   │   ├── finance/          # Finans servisi
│   │   │   ├── inventory/        # Stok servisi
│   │   │   ├── lab/              # Laboratuvar servisi
│   │   │   ├── employees/        # Personel/HR servisi (davet akışı dahil)
│   │   │   ├── users/            # Sistem kullanıcıları
│   │   │   ├── medications/      # İlaç/reçete kalemleri
│   │   │   ├── protocols/        # Protokol yönetimi
│   │   │   ├── reminders/        # Hatırlatma servisi
│   │   │   ├── support/          # Destek/talep servisi
│   │   │   ├── currency/         # Döviz kuru senkronizasyonu
│   │   │   ├── email/            # E-posta gönderimi
│   │   │   ├── sms/              # SMS entegrasyonu
│   │   │   ├── ai/               # AI radyoloji analizi
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
│       ├── tenant.prisma         # Tenant DB şeması
│       ├── migrations_sql/       # Elle yönetilen SQL migration'ları
│       └── seed.ts               # Seed verisi
│
├── backend-saas/                 # NestJS master admin API (auth, saas, email, notifications, health)
├── docker-compose.yml            # Geliştirme ortamı
├── docker-compose.app.yml        # Prodüksiyon ortamı
├── CHANGELOG.md                  # Sürüm notları
└── README.md                     # Bu dosya
```

---

## ⚙️ Ortam Değişkenleri

Her servis için `.env` dosyası `docker-compose.yml` içindeki `environment` blokunda tanımlanmıştır. Kritik değişkenler:

| Değişken | Servis | Açıklama |
|----------|--------|----------|
| `DATABASE_URL` | backend-clinic, backend-saas | Master PostgreSQL bağlantısı |
| `TENANT_DATABASE_URL` / `DATABASE_URL_TENANT_*` | backend-clinic | Klinik başına tenant PostgreSQL bağlantıları |
| `JWT_SECRET` | backend-clinic, backend-saas | JWT imzalama anahtarı |
| `REDIS_HOST` / `REDIS_PORT` | backend-clinic | Redis bağlantı host/port bilgisi |
| `CORS_ORIGIN` | backend-clinic | İzin verilen frontend adresleri |
| `NEXT_PUBLIC_API_URL` | frontend-clinic | Backend API adresi |
| `ENCRYPTION_KEY` | backend-clinic | AES-256 şifreleme anahtarı |

> ⚠️ Üretim ortamında tüm gizli anahtarları (`JWT_SECRET`, `ENCRYPTION_KEY`, vb.) güçlü, rastgele değerlerle değiştirin.

---

## 💻 Geliştirici Kılavuzu

### Servis Loglarını İzleme

```bash
# Tüm servisler
docker compose logs -f

# Sadece backend
docker logs -f pulpax-backend-clinic

# Sadece frontend
docker logs -f pulpax-frontend-clinic
```

### Frontend Cache Temizleme (Değişiklik Sonrası)

```bash
docker exec pulpax-frontend-clinic sh -c \
  'rm -rf /app/frontend-clinic/.next/server /app/frontend-clinic/.next/static /app/frontend-clinic/.next/cache'
docker restart pulpax-frontend-clinic
```

### Veritabanı Migration

```bash
# Tenant DB migration
docker exec pulpax-backend-clinic npx prisma migrate deploy \
  --schema prisma/tenant.prisma

# Master DB migration
docker exec pulpax-backend-clinic npx prisma migrate deploy
```

### Redis Cache Temizleme

```bash
docker exec pulpax-redis-saas redis-cli FLUSHALL
```

### Lint & Format

```bash
# Backend (auto-fix ile)
cd backend-clinic && npm run lint

# Frontend
cd frontend-clinic && npm run lint
```

> Her dört serviste de (`backend-clinic`, `backend-saas`, `frontend-clinic`, `frontend-saas`) ESLint + Prettier yapılandırması mevcuttur.

### Testleri Çalıştırma

```bash
# Backend unit testleri
cd backend-clinic
npm test                  # tüm testler
npm test -- --coverage    # coverage raporu ile
npm test -- --testPathPattern=patients   # belirli modül

# Backend e2e testleri
npm run test:e2e

# Frontend tip kontrolü ve Playwright e2e testleri
cd ../frontend-clinic
npx tsc --noEmit
npm run test:e2e:local
```

### Tenant DB Bağlantı Sorunları (P1001 Hatası)

```bash
# Tenant URL'lerini güncelle (localhost → docker servis adı)
docker exec -it pulpax-postgres-saas psql -U pulpax_user -d pulpax_db \
  -c "UPDATE \"Clinic\" SET \"databaseUrl\" = REPLACE(\"databaseUrl\", 'localhost:5433', 'postgres:5432');"

# Redis cache temizle
docker exec pulpax-redis-saas redis-cli FLUSHALL

# Backend'i yeniden başlat
docker restart pulpax-backend-clinic
```

---

## 📋 Sürüm Geçmişi

| Versiyon | Tarih | Özet |
|----------|-------|------|
| [v1.1.6](https://github.com/metacortex-cai/pulpax-react-v.02/releases/tag/v1.1.6) | 2026-07-06 | 📅 Randevu çakışma onayı + takvimde yan yana gösterim, personel işten çıkış devri, profil fotoğrafı |
| [v1.1.5](https://github.com/metacortex-cai/pulpax-react-v.02/releases/tag/v1.1.5) | 2026-07-05 | ✨ Kullanıcılar modülü, personel davet akışı, work-hours tab, docker/CI tooling güncellemeleri |
| [v1.1.4](https://github.com/metacortex-cai/pulpax-react-v.02/releases/tag/v1.1.4) | 2026-07-03 | 👥 IK/Prim modülü v2, izin yönetimi, lab genişlemeleri |
| [v1.1.3](https://github.com/metacortex-cai/pulpax-react-v.02/releases/tag/v1.1.3) | 2026-07-03 | 🔒 Kritik tenant izolasyon ve IDOR düzeltmeleri, CI/Docker sertleştirme, test kapsamı |
| [v1.1.2](https://github.com/metacortex-cai/pulpax-react-v.02/releases/tag/v1.1.2) | 2026-07-02 | 💰 Ödeme/iade/ekstre yönetimi, sözleşme ödeme planı, sunucu taraflı hasta listesi, diyagnoz kalıcılığı |
| [v1.1.1](https://github.com/metacortex-cai/pulpax-react-v.02/releases/tag/v1.1.1) | 2026-06-30 | 🐛 Docker tenant DB bağlantı fix, seed.ts TS hatası fix |
| [v1.1.0](https://github.com/metacortex-cai/pulpax-react-v.02/releases/tag/v1.1.0) | 2026-06-29 | ✨ Tablo standardizasyonu, ICON skoru, modül iyileştirmeleri |
| [v1.0.0](https://github.com/metacortex-cai/pulpax-react-v.02/releases/tag/v1.0.0) | 2026-06-24 | 🎉 İlk sürüm |

Tüm değişiklikler için [CHANGELOG.md](CHANGELOG.md) dosyasına bakın.

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
© 2026 **Pulpax / Metacortex CAI**. Tüm hakları saklıdır.
