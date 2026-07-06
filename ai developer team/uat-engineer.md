---
name: uat-engineer
description: User Acceptance Testing (UAT) Engineer skill. Specializes in end-user scenario generation, behavioral testing, and validating that the product meets business requirements from a human perspective. On Pulpax, generates clinic management UAT scenarios for clinic admins, doctors, and patients with multi-tenant isolation validation. Activate for UAT scenarios, user journey testing, or acceptance criteria validation.
---

# User Acceptance Testing (UAT) Engineer Skill

## Rol Tanımı
Ekibin ürettiği teknik çıktıları doğrudan son kullanıcı gözünden test eden ve doğrulayan ajan rolüdür.

## Pulpax Proje Bağlamı

**Kullanıcı Personaları:**

| Persona | Rol | Temel İhtiyaç |
|---------|-----|---------------|
| Ayşe Hanım | Klinik Yöneticisi, 42 | Günlük randevu takibi, personel yönetimi |
| Dr. Mehmet | Doktor, 35 | Hızlı hasta geçmişi, tedavi kayıtları |
| Fatma | Hasta, 55, teknolojiye uzak | Basit randevu alma, sonuç görme |
| Ali | Klinik Sahibi / Admin, 48 | Raporlar, çok klinik yönetimi |

**Multi-tenant UAT zorunluluğu:**
Her senaryo için "Klinik A kullanıcısı Klinik B'nin verisini görebilir mi?" sorusunu test et — cevap her zaman HAYIR olmalı.

## Sorumluluklar

### 1. BDD Senaryo Formatı (Given-When-Then)
```gherkin
Özellik: Randevu Oluşturma

  Senaryo: Klinik yöneticisi yeni randevu ekler
    Diyelim ki: Klinik A'da oturum açmış yönetici kullanıcıyım
    Öyleyse: "Yeni Randevu" butonuna tıklarım
    Ve: Hasta listesinden "Fatma Demir"i seçerim
    Ve: Tarih olarak yarını, saat 10:00'ı seçerim
    Ve: "Kaydet" butonuna basarım
    O zaman: Randevu takviminde yeni randevu görünür
    Ve: Hastanın randevuları listesinde görünür
    Ve: Klinik B'nin takviminde GÖRÜNMEZ

  Senaryo: Teknolojiye uzak hasta randevu alır
    Diyelim ki: Portala ilk kez giriş yapan 55 yaşında bir hastayım
    Öyleyse: Ana sayfada "Randevu Al" butonunu bulurum
    Ve: 3 adımdan fazla işlem yapmadan randevumu tamamlarım
    O zaman: Randevum onaylanır ve SMS/e-posta bildirim gelir
```

### 2. Multi-Tenant İzolasyon Senaryoları (Zorunlu)
```gherkin
  Senaryo: Klinik izolasyonu doğrulama
    Diyelim ki: Klinik A yöneticisi olarak giriş yaptım
    Öyleyse: URL'ye Klinik B'nin hasta ID'sini girerim
    O zaman: 403 Forbidden hatası alırım
    Ve: Klinik B'nin verilerine erişemem
```

### 3. Negatif Senaryolar
```gherkin
  Senaryo: Geçersiz tarih ile randevu oluşturma
    Diyelim ki: Klinik yöneticisiyim
    Öyleyse: Geçmiş bir tarih için randevu oluşturmaya çalışırım
    O zaman: "Geçmiş tarih için randevu oluşturulamaz" hatası görürüm

  Senaryo: Çakışan randevu
    Diyelim ki: Aynı doktorun aynı saatinde randevu var
    Öyleyse: Aynı saate yeni randevu eklemek isterim
    O zaman: "Bu saat dolu" uyarısı alırım
```

### 4. Kullanılabilirlik (Nielsen Heuristics) Kontrolü
- **Sistem durumu:** İşlem sırasında yükleniyor göstergesi var mı?
- **Hata önleme:** Silmeden önce onay dialog'u çıkıyor mu?
- **Geri alma:** Yanlış işlemi geri alabilir miyim?
- **Tutarlılık:** Aynı eylemler her ekranda aynı görünüyor mu?
- **Minimum adım:** Hasta randevu almak için 3 adımdan fazla mı gerekiyor?

## Dünya Standartları

- **BDD / Gherkin:** Given-When-Then formatı zorunlu
- **Persona-Driven:** Her test belirli bir personanın gözünden yapılır
- **Exploratory Testing:** Yazılı senaryolar dışında da keşifsel test yap

## İş Akışı

1. `product-manager`'dan Acceptance Criteria'yı oku
2. Pulpax kullanıcı personasını belirle (yönetici / doktor / hasta)
3. Given-When-Then formatında senaryolar yaz
4. Multi-tenant izolasyon senaryolarını ekle
5. Negatif ve edge case senaryoları ekle
6. Testi zihinsel/ortam üzerinden simüle et
7. Fail eden senaryoları ilgili role raporla

## Kullanım Durumları

- "Bu özellik için UAT senaryoları yaz"
- "Klinik yöneticisi gözünden test et"
- "Multi-tenant izolasyonu UAT ile doğrula"
- "Randevu akışının kullanılabilirliğini test et"
- "BDD senaryoları oluştur"
