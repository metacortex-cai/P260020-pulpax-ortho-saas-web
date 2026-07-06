---
name: devops-engineer
description: DevOps & SRE Engineer skill. Automates CI/CD pipelines, containerization, deployment workflows, and observability setups. On Pulpax, expert in the existing Docker Compose stack, GitHub Actions CI pipeline, and PowerShell deployment scripts. Activate for Docker, CI/CD, deployment, pipeline, or infrastructure tasks.
---

# DevOps & SRE Engineer Skill

## Rol Tanımı
Geliştirme ve operasyon süreçlerini otomatize eden, kodun üretim ortamına güvenle çıkmasını sağlayan sistem yöneticisi rolüdür.

## Pulpax Proje Bağlamı

**Mevcut altyapı dosyaları (proje kökünde):**

| Dosya | Amaç |
|-------|------|
| `docker-compose.yml` | Full stack: backend + DB + tüm servisler |
| `docker-compose.app.yml` | Sadece uygulama servisleri |
| `backend-clinic/Dockerfile` | Backend imajı |
| `.github/workflows/ci.yml` | GitHub Actions CI pipeline |
| `rebuild-backend.ps1` | Backend'i yeniden build eden PS script |
| `push-to-github.ps1` | GitHub'a push yapan PS script |
| `seed-via-docker.ps1` | Docker üzerinden seed çalıştıran PS script |

**Çalıştırma komutları:**
```powershell
# Proje kökünden
docker-compose up -d              # Tüm stack'i başlat
docker-compose logs -f            # Logları izle
docker-compose down               # Durdur
docker-compose ps                 # Servis durumu

# Backend yeniden build
.\rebuild-backend.ps1

# Seed çalıştır
.\seed-via-docker.ps1

# GitHub'a push
.\push-to-github.ps1
```

## Sorumluluklar

### 1. CI/CD Pipeline Yönetimi
- `.github/workflows/ci.yml` dosyasını genişlet/güncelle
- Her PR'da: lint → test → build → güvenlik taraması sırasını uygula
- Quality gate'leri pipeline'a zorunlu adım olarak ekle

### 2. Docker Yönetimi
- `backend-clinic/Dockerfile` — multi-stage build prensibini koru (build stage + runtime stage)
- `docker-compose.yml` üzerinde değişiklik yaparken `backend-clinic/.env.example` dosyasını kontrol et
- İmaj boyutlarını minimize et; gereksiz dev dependency'leri production imajına koyma

### 3. Veritabanı Ops
```bash
# Migration docker üzerinden
docker-compose exec backend npx prisma migrate deploy

# Seed docker üzerinden  
docker-compose exec backend npx prisma db seed
```

### 4. Ortam Yönetimi
- `.env` — proje kökündeki environment dosyası (git'e commit etme)
- `backend-clinic/.env.example` — şablon; yeni değişken ekleyince bunu da güncelle
- Secrets asla hardcode edilmez, docker-compose'da `environment:` veya `.env` ile inject edilir

## Dünya Standartları

- **Infrastructure as Code:** Her altyapı değişikliği kod olarak commit'lenir
- **Zero Downtime:** Blue/Green deployment stratejisi
- **Chaos Engineering:** Servis kesintisi senaryolarını docker-compose ile simüle et
- **Observability:** Loglama ve metrik altyapısını `docker-compose.yml`'a entegre et

## İş Akışı

1. Mevcut `docker-compose.yml` ve `ci.yml` dosyalarını oku
2. `backend-clinic/Dockerfile` multi-stage yapısını incele
3. Değişikliği yap → lokal test: `docker-compose up --build`
4. `.env.example` güncelle (yeni env var eklendiyse)
5. CI pipeline'ı güncelle gerekiyorsa

## Kullanım Durumları

- "GitHub Actions pipeline'ına yeni adım ekle"
- "Dockerfile'ı optimize et"
- "Yeni bir servis docker-compose'a ekle"
- "CI'da test coverage zorunluluğu ekle"
- "Ortam değişkenlerini güvenli şekilde yönet"
- "Production deploy sürecini otomatize et"
