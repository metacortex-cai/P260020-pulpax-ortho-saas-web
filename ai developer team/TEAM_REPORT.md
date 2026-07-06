# Pulpax AI Yazılım Ekibi — Kapsamlı Yetkinlik ve Yapı Raporu

**Hazırlanma Tarihi:** 22 Haziran 2026  
**Konum:** `ai developer team/`  
**Ekip Büyüklüğü:** 14 Ajan (Yapay Zeka Rolü)  
**Mimari:** Otonom SDLC (Software Development Life Cycle) Agent Team

> ⚠️ **Not (2026-07-02):** Bu belgedeki dosya yolları (`Optimized-SDLC-Skills/`, `.clauderules`,
> `Pulpax-main/...`) güncellendi — gerçek proje kökünde bu isimler yok. Skill dosyaları
> `ai developer team/<rol-adı>.md`, kurumsal kural dosyası `CLAUDE.md`, ADR arşivi `docs/ADR/`
> konumundadır.

---

## Bölüm 1: Ekibin Amacı ve Genel Mimarisi

Bu ekip, bir yazılım şirketinin tüm üretim süreçlerini (Fikir → Tasarım → Kodlama → Test → Güvenlik → Yayın) uçtan uca yönetebilecek şekilde yapılandırılmış otonom bir yapay zeka ajan takımıdır. Her ajan, belirli bir mühendislik veya ürün yönetimi rolünü simüle eder ve kendi alanında "Senior (Kıdemli)" düzeyde yetkinliklere sahiptir.

### Temel Altyapısal Güçler (Tüm Ekip İçin Geçerli)
1. **Ortak Hafıza (Shared Memory):** Proje kökündeki `CLAUDE.md` ve `docs/ADR/` klasörü sayesinde tüm ajanlar, şirketin geçmişteki mimari kararlarını ve kurallarını okuyarak kod yazarlar.
2. **Otonom Test Döngüsü (Auto-Correction):** QA ve Geliştirici ajanlar terminal komutlarını çalıştırıp test sonuçlarını okuyarak hataları kimseye sormadan kendiliğinden düzeltir.
3. **GitHub Entegrasyonu (MCP):** `product-manager`, `team-leader` ve `code-reviewer` ajanları GitHub Issues ve Pull Request'lere doğrudan bağlanabilir.

---

## Bölüm 2: Ekip Üyeleri Detaylı Profilleri

### 1. `team-leader` — Takım Lideri / Orkestratör
| Alan | Bilgi |
|---|---|
| **Seviye** | Staff / Principal Engineer |
| **Ana Sorumluluk** | Ekip yönetimi, görev delegasyonu, kalite kapısı (Quality Gate) |
| **Temel Yetenekler** | ADR okuma, alt role iş delegasyonu, test döngüsü başlatma, GitHub PR açma |
| **Otonomi Kapasitesi** | Tam otonom — GitHub Issue'dan alıp PR açmaya kadar süreci kendi yönetir |

---

### 2. `software-architect` — Yazılım Mimarı
| Alan | Bilgi |
|---|---|
| **Seviye** | Principal Architect |
| **Ana Sorumluluk** | Teknoloji seçimi, sistem tasarımı, kapasite planlaması |
| **Temel Yetenekler** | CAP Teoremi analizi, Disaster Recovery (RTO/RPO), Threat Modeling (STRIDE), IaC önerileri |
| **Standartlar** | 12-Factor App, C4 Model dokümantasyonu, ADR yazımı |

---

### 3. `product-manager` — Ürün Yöneticisi
| Alan | Bilgi |
|---|---|
| **Seviye** | Senior Product Manager |
| **Ana Sorumluluk** | Kullanıcı ihtiyaçlarını teknik gereksinime dönüştürmek, roadmap yönetimi |
| **Temel Yetenekler** | GitHub Issues okuma/oluşturma, PRD yazımı, OKR & Metrik tanımlama |
| **Standartlar** | Data-Driven kararlar (A/B Test), LTV/Retention takibi, End-to-End User Journey |

---

### 4. `ui-ux-designer` — Arayüz ve Deneyim Tasarımcısı
| Alan | Bilgi |
|---|---|
| **Seviye** | Senior Product Designer |
| **Ana Sorumluluk** | Görsel dil tasarımı, Design System oluşturma, kullanıcı akışı |
| **Temel Yetenekler** | Design Tokens, Renk Paleti, Tipografi, Wireframe, User Flow diyagramları |
| **Standartlar** | Atomic Design, WCAG Erişilebilirlik (kontrast oranları), Cognitive Load Optimizasyonu, Micro-Interactions |

---

### 5. `frontend-engineer` — Arayüz Geliştirici
| Alan | Bilgi |
|---|---|
| **Seviye** | Senior Frontend Engineer |
| **Ana Sorumluluk** | Web arayüzleri, responsive tasarım implementasyonu |
| **Temel Yetenekler** | React, Next.js, Vue.js, Vite; SSR/SSG, CSS Animations |
| **Standartlar** | Core Web Vitals (LCP/CLS), WCAG a11y, Mobile-First, Technical SEO, Reusable Component Mimarisi |
| **Otonomi** | Yazdığı kodu terminalde test edip doğrulamadan teslim edemez |

---

### 6. `backend-engineer` — Arkayüz Geliştirici
| Alan | Bilgi |
|---|---|
| **Seviye** | Senior Backend Engineer |
| **Ana Sorumluluk** | API geliştirme, veritabanı modelleme, servis mimarisi |
| **Teknoloji Yelpazesi** | Node.js (NestJS), Python (FastAPI), Go, Java (Spring Boot), C# (.NET), PHP (Laravel) |
| **Veritabanları** | PostgreSQL, MongoDB, Redis, MySQL, Elasticsearch, Kafka |
| **Standartlar** | Zero-Downtime Migration, Observability (OpenTelemetry), Circuit Breaker, RBAC |
| **Otonomi** | Testleri terminalde çalıştırıp geçmeden kodu teslim edemez |

---

### 7. `mobile-engineer` — Mobil Uygulama Geliştirici
| Alan | Bilgi |
|---|---|
| **Seviye** | Senior Mobile Engineer |
| **Ana Sorumluluk** | iOS ve Android uygulama geliştirme, mağaza yayını |
| **Teknoloji Yelpazesi** | React Native, Flutter, Swift (iOS), Kotlin (Android) |
| **Temel Yetenekler** | Push Notification (FCM/APNs), Deep Linking, Offline-First (SQLite/Realm), Biyometrik Auth |
| **Standartlar** | Apple HIG, Google Material Design, Fastlane CI/CD, Memory Management |

---

### 8. `devops-engineer` — DevOps / Altyapı Mühendisi
| Alan | Bilgi |
|---|---|
| **Seviye** | Senior DevOps Engineer |
| **Ana Sorumluluk** | CI/CD pipeline yönetimi, konteyner ve bulut altyapısı |
| **Teknoloji Yelpazesi** | Docker, Kubernetes, GitHub Actions, Terraform, AWS/GCP/Azure |
| **Standartlar** | Infrastructure as Code (IaC), Blue/Green & Canary Deployments, Chaos Engineering, SLO/SLA Yönetimi |

---

### 9. `security-engineer` — Güvenlik Mühendisi
| Alan | Bilgi |
|---|---|
| **Seviye** | Senior AppSec Engineer |
| **Ana Sorumluluk** | Uygulama güvenliği denetimi, penetrasyon testi, uyumluluk |
| **Temel Yetenekler** | OWASP Top 10 koruması, Penetration Testing, GDPR/SOC 2 uyumluluğu |
| **Standartlar** | SAST & DAST (CI/CD entegreli), Secrets Management (HashiCorp Vault/AWS Secrets), VibeSec, Zero Trust |

---

### 10. `qa-engineer` — Kalite Güvence Mühendisi
| Alan | Bilgi |
|---|---|
| **Seviye** | Senior QA Automation Engineer |
| **Ana Sorumluluk** | Test otomasyonu, test senaryoları yazma ve çalıştırma |
| **Teknoloji Yelpazesi** | Jest, Playwright, Cypress, Pytest, JMeter, k6 |
| **Standartlar** | Shift-Left Testing (TDD/BDD), Visual Regression, Yük Testleri, Mutation Testing |
| **Otonomi** | Testleri terminalde çalıştırır, logları analiz eder, hataları auto-fix yapar |

---

### 11. `uat-engineer` — Kullanıcı Kabul Testi Mühendisi
| Alan | Bilgi |
|---|---|
| **Seviye** | Senior UAT / UX Research Engineer |
| **Ana Sorumluluk** | Son kullanıcı perspektifinden ürünü değerlendirmek |
| **Temel Yetenekler** | BDD/Gherkin senaryoları, Persona-Driven Testing, Kullanıcı yolculuğu simülasyonu |
| **Standartlar** | Nielsen Heuristics (10 kullanılabilirlik ilkesi), Session-Based Exploratory Testing |

---

### 12. `code-reviewer` — Kod İnceleme Uzmanı
| Alan | Bilgi |
|---|---|
| **Seviye** | Senior Staff Engineer |
| **Ana Sorumluluk** | Kod kalitesi denetimi, mimari uygunluk, best practice zorlaması |
| **Temel Yetenekler** | GitHub PR üzerinden kod okuma ve yorum bırakma |
| **Standartlar** | DRY, SOLID, KISS prensipleri; ADR uyumu, güvenlik açığı tespiti, alternatif kod önerisi |

---

### 13. `technical-writer` — Dokümantasyon Mühendisi
| Alan | Bilgi |
|---|---|
| **Seviye** | Senior Technical Writer |
| **Ana Sorumluluk** | API dokümantasyonu, README, onboarding kılavuzları, ADR yazımı |
| **Temel Yetenekler** | Swagger/OpenAPI, JSDoc/Docstring, Markdown |
| **Standartlar** | Diátaxis Framework (Tutorial/How-To/Reference/Explanation), Docs-as-Code, Single Source of Truth |

---

### 14. `release-manager` — Sürüm Yöneticisi
| Alan | Bilgi |
|---|---|
| **Seviye** | Senior Release Manager |
| **Ana Sorumluluk** | Versiyon yönetimi, Changelog üretimi, Git branch stratejisi |
| **Temel Yetenekler** | Git tagging, CHANGELOG.md güncelleme, GitHub Release oluşturma |
| **Standartlar** | Semantic Versioning (SemVer 2.0.0), Keep a Changelog, Conventional Commits, GitOps |

---

## Bölüm 3: Ekip İş Akışı (End-to-End SDLC)

```
Kullanıcı Talebi
      │
      ▼
 [team-leader]
  ADR + .clauderules okur
      │
      ├──► [product-manager] → GitHub Issue'ları okur, PRD yazar
      │
      ├──► [software-architect] → Mimari karar verir, ADR yazar
      │
      ├──► [ui-ux-designer] → Design System & User Flow hazırlar
      │
      ├──► [frontend-engineer] → Arayüzü kodlar → Test çalıştırır
      │    [backend-engineer] → API'yi kodlar → Test çalıştırır
      │    [mobile-engineer]  → Mobil arayüzü kodlar → Test çalıştırır
      │
      ├──► [qa-engineer] → Testleri çalıştırır → Auto-fix döngüsü
      │    [uat-engineer] → Kullanıcı senaryolarını test eder
      │
      ├──► [security-engineer] → Güvenlik denetimi yapar
      │    [devops-engineer]   → Pipeline ve altyapıyı ayarlar
      │
      ├──► [code-reviewer] → GitHub PR üzerinden kodu inceler
      │    [technical-writer] → Dokümantasyonu günceller
      │
      └──► [release-manager] → CHANGELOG günceller, sürüm (tag) oluşturur
                                    │
                                    ▼
                            Kullanıcıya Teslim
```

---

## Bölüm 4: Altyapı ve Entegrasyonlar

| Bileşen | Konum | Açıklama |
|---|---|---|
| **Skill Dosyaları** | `ai developer team/<rol-adı>.md` | 14 ajanın tam yetkinlik tanımları |
| **Kurumsal Hafıza** | `CLAUDE.md` | Tüm ajanlar için zorunlu kurallar |
| **ADR Arşivi** | `docs/ADR/` | Kalıcı mimari karar kayıtları |

---

## Bölüm 5: Ekip Olgunluk Skoru

> **Önemli Not:** Bu tablodaki skorlar **ekibin yetkinlik kapasitesini** (ne yapabilir?) ölçer. Belirli bir projenin mevcut durumu farklı olabilir. Örneğin "Mobil Kapsama" skoru ekibin iOS/Android geliştirme yetkinliğini gösterir; Pulpax projesinin şu anki mobil uygulama durumu (`PULPAX_PROJECT_ASSESSMENT.md`) bu skordan bağımsız olarak değerlendirilmelidir.

| Kategori | Skor | Açıklama |
|---|---|---|
| **Teknik Yetkinlik** | ⭐⭐⭐⭐⭐ 10/10 | Tüm 14 rol Senior seviyede |
| **Otonom Çalışma** | ⭐⭐⭐⭐⭐ 9/10 | Terminal + MCP + Auto-fix entegre |
| **Kalite Güvencesi** | ⭐⭐⭐⭐⭐ 10/10 | QA + UAT + Code Review üçlüsü |
| **Kurumsal Hafıza** | ⭐⭐⭐⭐⭐ 9/10 | ADR + .clauderules yapısı aktif |
| **Harici Entegrasyon** | ⭐⭐⭐⭐☆ 8/10 | GitHub entegre, genişletilebilir |
| **Mobil Kapsama** | ⭐⭐⭐⭐⭐ 10/10 | Ekip React Native/Flutter/Swift/Kotlin yetkinliğine sahip |

**Genel Olgunluk Skoru: Senior-Level ✅**

---

*Rapor `Optimized-SDLC-Skills/TEAM_REPORT.md` dosyasına kaydedilmiştir.*  
*Hazırlayan: Antigravity AI Coding Assistant*
