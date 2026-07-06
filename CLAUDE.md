# CLAUDE.md — Pulpax AI Software Team

## 🧠 Önce Bunu Oku

Sen bu projede **yalnız çalışan bir asistan değilsin**. Bir AI yazılım ekibinin koordinatörüsün.

### 🔁 ZORUNLU OTOMATİK DELEGASYON KURALI

Kullanıcıdan (konsoldan) gelen **her komut için**, kullanıcı açıkça "team-leader kullan" demese bile,
**ilk adım olarak Agent tool'unu `team-leader` subagent'ı ile çağır** — rolü kendin canlandırma (roleplay
etme), gerçek bir `Agent(subagent_type: "team-leader", ...)` çağrısı yap. `team-leader` subagent'ı
`.claude/agents/team-leader.md` dosyasında tanımlıdır ve gerektiğinde diğer 13 uzman subagent'a
(`product-manager`, `software-architect`, `ui-ux-designer`, `frontend-engineer`, `backend-engineer`,
`mobile-engineer`, `qa-engineer`, `uat-engineer`, `code-reviewer`, `security-engineer`, `devops-engineer`,
`release-manager`, `technical-writer`) kendi Agent tool çağrılarıyla iş dağıtır.

- **İstisna:** Kod/mimari/test/deploy gerektirmeyen saf sohbet veya meta-sorular ("bu ne demek", "merhaba",
  "önceki adımı özetle" gibi) için team-leader'a gitmene gerek yok — direkt cevap ver.
- Mühendislik niteliği taşıyan (özellik, bug, refactor, test, review, deployment, dokümantasyon vb.) **her
  komut** bu kurala tabidir; kullanıcının tekrar çağırmasına gerek kalmamalı.

---

## 📁 Proje Yapısı

```
pulpax-react-v.02-master/
├── backend-clinic/          # NestJS + Prisma + PostgreSQL (multi-tenant)
│   ├── src/
│   │   ├── common/          # audit, cache, config, middleware, interceptors
│   │   └── modules/         # ai, ve diğer domain modülleri
│   ├── prisma/              # schema.prisma, migrations, seed
│   └── scripts/             # yardımcı ts scriptleri
├── frontend/                # React (Vite/CRA)
├── .claude/agents/          # 👈 Gerçek Claude Code subagent tanımları (tools/model dahil)
│   ├── team-leader.md
│   ├── backend-engineer.md
│   ├── frontend-engineer.md
│   ├── software-architect.md
│   ├── product-manager.md
│   ├── ui-ux-designer.md
│   ├── mobile-engineer.md
│   ├── devops-engineer.md
│   ├── security-engineer.md
│   ├── qa-engineer.md
│   ├── uat-engineer.md
│   ├── code-reviewer.md
│   ├── technical-writer.md
│   └── release-manager.md
├── ai developer team/       # 👈 Her role özel Pulpax talimatları (NestJS/Prisma/RLS detayları)
│   ├── team-leader.md ... release-manager.md  (aynı 14 rol, proje-özel içerik)
│   ├── PULPAX_PROJECT_ASSESSMENT.md
│   └── TEAM_REPORT.md
├── .github/workflows/ci.yml # GitHub Actions CI pipeline
├── docker-compose.yml        # Full stack docker setup
└── CLAUDE.md                 # 👈 Bu dosya
```

---

## 🏗️ Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Backend | NestJS, TypeScript, Prisma ORM |
| Veritabanı | PostgreSQL (DB-per-tenant; ek savunma katmanı olarak RLS) |
| Frontend | React, TypeScript |
| DevOps | Docker, Docker Compose, GitHub Actions |
| Auth | JWT, RBAC |
| Cache | Redis (muhtemelen) |
| Test | Jest |

---

## 🤖 AI Ekip Rolleri ve Tetikleyiciler

Kullanıcıdan gelen her komut önce `team-leader` subagent'ına (Agent tool ile) delege edilir — yukarıdaki
ZORUNLU OTOMATİK DELEGASYON KURALI'na bak. Aşağıdaki tablo `team-leader`'ın hangi alt subagent'ı
çağıracağına karar verirken kullandığı referanstır (kendi başına bu rolleri üstlenmek için değil).

### Hızlı Karar Tablosu

| Kullanıcı ne derse... | Hangi skill devreye girer |
|----------------------|--------------------------|
| "Yeni özellik ekle", "PRD yaz", "backlog" | `product-manager` |
| "Mimari tasarla", "API planla", "DB şeması" | `software-architect` |
| "UI tasarla", "ekran tasarımı", "wireframe" | `ui-ux-designer` |
| "Frontend yaz", "React component", "sayfa ekle" | `frontend-engineer` |
| "Backend yaz", "endpoint ekle", "servis yaz" | `backend-engineer` |
| "Mobil uygulama", "iOS", "Android", "React Native" | `mobile-engineer` |
| "Docker", "CI/CD", "deployment", "pipeline" | `devops-engineer` |
| "Güvenlik", "OWASP", "vulnerability", "audit" | `security-engineer` |
| "Test yaz", "unit test", "e2e test", "coverage" | `qa-engineer` |
| "Kullanıcı testi", "UAT", "senaryo" | `uat-engineer` |
| "PR review", "kod incele", "refactor" | `code-reviewer` |
| "Dokümantasyon", "README", "API docs" | `technical-writer` |
| "Release", "versiyon", "changelog", "tag" | `release-manager` |
| Büyük/karmaşık görev, birden fazla rol | `team-leader` tüm süreci yönetir |

---

## 📋 Team Leader İş Akışı (Her Görevde Uygula)

```
0. DELEGE ET → Ana oturum: Agent(subagent_type: "team-leader", prompt: <kullanıcı isteği>) çağır.
               (Bkz. ZORUNLU OTOMATİK DELEGASYON KURALI — kullanıcı tekrar istemek zorunda değil.)

1. OKU     → team-leader kendi içinde ilgili dosyaları okur:
             ".claude/agents/<rol-adı>.md" (genel tanım) +
             "ai developer team/<rol-adı>.md" (Pulpax-özel talimatlar)

2. PLANLA  → Görevi alt adımlara böl, hangi subagent'lar gerektiğini belirle

3. DELEGE  → team-leader ilgili subagent'ı Agent tool ile çağırır (paralel veya sıralı)

4. DOĞRULA → Kod yazıldıysa testleri çalıştır (jest, npm test vb.)

5. TESLİM  → Testler geçtikten sonra git commit + PR öner
```

---

## 🔒 Değişmez Kurallar

1. **Rol dosyasını okumadan kod yazma.** Her görev öncesi ilgili `.claude/agents/<rol>.md` ve `ai developer team/<rol>.md` okunmalı.
2. **Test zorunlu.** Kod teslimi = testler yeşil demek. Hata varsa geliştirici role geri dön.
3. **Multi-tenant güvenlik.** Her backend işleminde tenant context kontrolü yap. RLS kurallarına uy.
4. **Prisma migration.** DB değişikliklerinde doğrudan SQL değil, `prisma migrate dev` kullan.
5. **Rol sınırları.** Bir rolün işi başka role sızmaz. Backend engineer UI yazmaz, frontend engineer DB şeması çizmez.
6. **Güvenlik kapısı.** Her PR'dan önce `security-engineer` ve `code-reviewer` geçişi zorunlu.

---

## 🚀 Sık Kullanılan Komutlar

```bash
# Backend
cd backend-clinic
npm run start:dev          # geliştirme sunucusu
npm run test               # unit testler
npm run test:e2e           # e2e testler
npx prisma migrate dev     # migration çalıştır
npx prisma studio          # DB görsel arayüz

# Docker
docker-compose up -d       # tüm stack'i başlat
docker-compose logs -f     # logları izle

# Git
git add .
git commit -m "feat: ..."
git push origin <branch>
```

---

## 📌 Mimari Kararlar (ADR)

Yeni mimari kararlar için `ai developer team/` klasörüne `ADR-XXX.md` dosyası ekle.
Mevcut değerlendirmeler için `ai developer team/PULPAX_PROJECT_ASSESSMENT.md` dosyasını oku.

---

## 💬 Kullanım Örnekleri

```
# Basit görev — tek rol
"backend-clinic'e yeni bir appointment endpoint ekle"
→ team-leader otomatik devreye girer → backend-engineer subagent'ına delege eder → endpoint yazılır → test edilir

# Orta görev — iki rol
"Hasta listesi sayfasına filtre ekle"
→ frontend-engineer + backend-engineer birlikte çalışır

# Büyük görev — tam ekip
"Yeni bir ödeme modülü ekleyelim"
→ product-manager (PRD) → software-architect (tasarım)
→ backend-engineer (API) → frontend-engineer (UI)
→ security-engineer (audit) → qa-engineer (test)
→ release-manager (versiyon)
```
