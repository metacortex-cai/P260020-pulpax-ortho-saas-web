# ADR-002: Ortodonti ICON Skoru Modülü

**Tarih:** 2026-06-29
**Durum:** Kabul Edildi
**Etiketler:** feature, clinical, orthodontics

## Bağlam

Klinik hekimler ortodontik tedavi ihtiyacını değerlendirmek için standart bir araca ihtiyaç duymaktadır. Referans uygulama olarak Dr.DENTES incelenmiş, ICON (Index of Complexity, Outcome and Need) skoru klinik pratikte en yaygın kullanılan uluslararası standart olarak belirlenmiştir.

## Karar

Hasta detay sayfasına (`/patients/[id]`) yeni **"Ortodonti"** sekmesi eklendi (`OrthodonticsTab.tsx`).

## ICON Skoru Bileşenleri

| Bölüm | Seçenekler | Ağırlık |
|---|---|---|
| Estetik Komponent | 1–10 | ×7 |
| Üst Ark Çapraşıklığı | 0–5 (mm aralıkları) | ×5 |
| Üst Ark Boşluğu | 0–3 (mm aralıkları) | ×5 |
| Çapraz Kapanış | 0–1 (Yok/Var) | ×5 |
| Ön Açık Kapanış | 0–4 (mm aralıkları) | ×4 |
| Ön Derin Kapanış | 0–3 (örtme derecesi) | ×4 |
| Bukkal İlişki (Sol) | 0–2 (Sınıf tipi) | ×3 |
| Bukkal İlişki (Sağ) | 0–2 (Sınıf tipi) | ×3 |

### Formül

```
ICON Toplam = Σ (bölüm_skoru × ağırlık)
```

### Değerlendirme Skalası

| Puan Aralığı | Değerlendirme | Renk |
|---|---|---|
| ≤ 29 | Tedavi Gerekmez | Yeşil |
| 30 – 43 | Az Tedavi İhtiyacı | Mavi |
| 44 – 67 | Orta Tedavi İhtiyacı | Amber |
| ≥ 68 | Yüksek Tedavi İhtiyacı | Kırmızı |

## Uygulama Detayları

- **Bileşen:** `frontend-clinic/src/app/patients/[id]/tabs/OrthodonticsTab.tsx`
- **Sekmeler:** "Skorlar" (geçmiş) + "Yeni" (yeni giriş formu)
- **Hesaplama:** Gerçek zamanlı, her seçim değişikliğinde anlık güncelleme
- **Kalıcılık:** v1.1.0'da in-memory state (sayfa yenilenmesinde sıfırlanır)

## Backend Durumu

Şu anda ICON skorları backend'de kaydedilmemektedir. Planlanan endpoint:

```
POST /patients/:id/orthodontic-scores
GET  /patients/:id/orthodontic-scores
```

Bu endpoint'ler v1.2.0 backlog'una alınmıştır.

## Sonuçlar

**Olumlu:**
- Klinisyenler standart ICON skalasıyla ortodontik değerlendirme yapabilir
- Gerçek zamanlı hesaplama hızlı ve kullanıcı dostu
- Referans uygulama (Dr.DENTES) ile arayüz uyumlu

**Olumsuz / Açık Konular:**
- Skorlar kalıcı değil (backend entegrasyonu bekliyor)
- Estetik Komponent için referans görsel gösterilmiyor (ilerleyen versiyonda eklenebilir)

## İlgili

- [ADR-001: Standart Tablo Bileşen Mimarisi](ADR-001-standard-table-pattern.md)
- Referans: [ICON Scoring System — BOS Journal 2000](https://doi.org/10.1093/ejo/22.6.645)
