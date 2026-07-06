---
name: release-manager
description: Release and GitOps Manager skill. Specializes in version control strategies, semantic versioning, generating professional changelogs, and coordinating smooth production releases. On Pulpax, manages the existing CHANGELOG.md, coordinates backend+frontend versioning, and uses the push-to-github.ps1 script for releases. Activate for release, versioning, changelog, git tag, or deployment coordination tasks.
---

# Release & GitOps Manager Skill

## Rol Tanımı
Yazılan ve test edilen kodların belli bir disiplin altında versiyonlanmasını, paketlenmesini ve kullanıcıya duyurulmasını sağlayan Sürüm Yöneticisi rolüdür.

## Pulpax Proje Bağlamı

**Mevcut release dosyaları:**
- `CHANGELOG.md` — proje kökünde, mevcut versiyon geçmişi
- `push-to-github.ps1` — GitHub push scripti
- `backend-clinic/package.json` — backend versiyon
- `.github/workflows/ci.yml` — CI pipeline

**Release öncesi zorunlu kontroller:**
```bash
# 1. Testler geçiyor mu?
cd backend-clinic && npm test

# 2. Build başarılı mı?
docker-compose build

# 3. Migration var mı?
cd backend-clinic && npx prisma migrate status

# 4. .env.example güncel mi?
# Yeni environment değişkeni eklendiyse güncelle
```

## Sorumluluklar

### 1. Semantic Versioning (SemVer)

| Değişiklik | Versiyon |
|-----------|----------|
| Breaking change (API uyumsuzluğu) | MAJOR (1.0.0 → 2.0.0) |
| Yeni özellik, geriye uyumlu | MINOR (1.0.0 → 1.1.0) |
| Bug fix, küçük düzeltme | PATCH (1.0.0 → 1.0.1) |
| Güvenlik yaması | PATCH + güvenlik notu |

### 2. CHANGELOG.md Formatı (Keep a Changelog)
```markdown
# Changelog

## [1.2.0] - 2025-01-15

### Added
- Randevu modülüne tarih filtresi eklendi
- Hasta portal giriş sayfası

### Changed
- Appointment DTO'ya `status` alanı eklendi

### Fixed
- Multi-tenant sorgusundaki N+1 problemi giderildi

### Security
- JWT expiry süresi 24h'e indirildi

## [1.1.0] - 2025-01-01
...
```

### 3. Release Akışı (PowerShell)
```powershell
# 1. Branch kontrolü
git status
git checkout main
git pull origin main

# 2. Versiyon güncelle (package.json)
# backend-clinic/package.json içinde "version" alanını güncelle

# 3. CHANGELOG.md güncelle
# Unreleased bölümünü yeni versiyon numarasıyla işaretle

# 4. Commit ve tag
git add CHANGELOG.md backend-clinic/package.json
git commit -m "chore: release v1.2.0"
git tag -a v1.2.0 -m "Release v1.2.0"

# 5. Push (mevcut script)
.\push-to-github.ps1
# veya
git push origin main --tags
```

### 4. Conventional Commits Zorunluluğu
```
feat: yeni özellik ekle
fix: hata düzelt
chore: bakım işleri (versiyon, bağımlılık güncelleme)
docs: sadece dokümantasyon
refactor: kodu yeniden düzenle (özellik/hata değişimi yok)
test: test ekle veya güncelle
ci: CI/CD değişiklikleri
```

## İş Akışı

1. `git log --oneline v1.1.0..HEAD` ile son commit'leri oku
2. Conventional commit'lere göre versiyon tipini belirle
3. `CHANGELOG.md` dosyasını güncelle
4. `package.json` versiyonunu güncelle
5. Release commit'i at ve tag bas
6. CI pipeline'ın geçtiğini doğrula
7. GitHub Release oluştur (opsiyonel)

## Kullanım Durumları

- "Yeni versiyon çıkar"
- "CHANGELOG.md güncelle"
- "Versiyon tag'i at"
- "Son commit'leri sürüm notuna çevir"
- "Release branch oluştur"
- "Hotfix release yap"
