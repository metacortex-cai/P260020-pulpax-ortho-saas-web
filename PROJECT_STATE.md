# Pulpax Proje Durum ve Hafıza Kaydı (Haziran 2026)

Bu doküman, projenin başka bir cihazda veya yeni bir oturumda kaldığı yerden devam edebilmesi için teknik detayları ve güncel durumu içerir.

## 🏁 Son Durum Özeti (8 Haziran 2026)
Bugün sistem genelinde klinik içi anlık intercom mesajlaşması (SSE), tedavi tamamlandığında otomatik stok düşüm mantığı (FEFO sarf), split-screen canlı önizlemeli A4 belge/form şablonları editörü ve simüle müşteri temsilcisi yanıtı içeren kapsamlı bir Destek Talebi (Ticket) sistemi entegre edildi. Tüm kod tabanı tip güvenliği denetiminden başarıyla geçti.

## 🛠️ Port Konfigürasyonu (Kalıcı)
Sistem bileşenleri aşağıdaki portlar üzerinden çalışacak şekilde sabitlenmiştir:

| Bileşen | Backend Port | Frontend Port |
| :--- | :--- | :--- |
| **SaaS (Superadmin)** | 6010 | 6001 |
| **Clinic (Klinik)** | 7010 | 7001 |

---
## 🛠️ Modül Bazlı Teknik Detaylar

### 1. Paraşüt Entegrasyonu
*   **Durum:** ✅ Tamamlandı (Gerçek API Bağlantısı Yapıldı)
*   **Özellikler:** 
    *   OAuth 2.0 Authorization Code Flow (Gerçek token değişimi).
    *   Otomatik Token Yenileme (Refresh Token) mantığı.
    *   Şifreli token saklama (AES-256-GCM).
    *   BullMQ ile asenkron Hasta ve Fatura senkronizasyonu.
*   **Teknik:** `ParasutController` ve `ParasutOAuthService` güncellendi. `ParasutProcessor` hem hasta hem fatura senkronizasyonunu destekliyor.

### 2. Envanter ve Stok (Inventory)
*   **Durum:** ✅ Tamamlandı
*   **Özellikler:** Tedarikçi yönetimi, Parti/Lot takibi (Batch), S.K.T. takibi, Kritik Stok uyarıları.
*   **Teknik:** `InventoryService` ve `StockMovement` (IN, OUT, TRANSFER, ADJUSTMENT) mantığı kuruldu. RLS politikaları uygulandı.

### 3. İnsan Kaynakları (HR)
*   **Durum:** ✅ Tamamlandı
*   **Özellikler:** Personel kartları, İzin yönetimi (Onay/Red), Maaş/Prim sözleşmeleri, Haftalık çalışma saatleri (Mesai).
*   **Teknik:** Master DB (Auth) ve Tenant DB (HR Data) entegrasyonu sağlandı.

### 4. Randevu ve Takvim (Calendar)
*   **Durum:** ✅ Tamamlandı
*   **Özellikler:** İnteraktif takvim, Hekim bazlı sütunlar, Sürükle-Bırak randevu taşıma, Randevu içinden anlık tedavi girişi.
*   **Teknik:** `Appointment` ve `TreatmentItem` ilişkisi kuruldu. Randevu detayında "Uygulanan Tedaviler" sekmesi aktif.

### 5. Finans ve Raporlama (Finance)
*   **Durum:** ✅ Tamamlandı
*   **Özellikler:** Gelir/Gider takibi, Net Kar analizi, Hekim bazlı performans ve prim raporları.
*   **Teknik:** `PrimService` güncellenerek **Net Kar Analizi** (İşlem Ücreti - Lab Maliyeti) üzerinden prim hesaplama mantığına geçildi.

### 6. Laboratuvar Takibi (Lab)
*   **Durum:** ✅ Tamamlandı
*   **Özellikler:** Laboratuvar firma yönetimi, İş emri takibi, Teslim tarihi ve renk kodu yönetimi, Teknik maliyetlerin hakedişlere yansıması.

### 7. Hatırlatma Sistemi (Reminders)
*   **Durum:** ✅ Tamamlandı
*   **Özellikler:** Randevu hatırlatmaları (SMS ve E-Posta), BullMQ ile gecikmeli işleme.
*   **Teknik:** `RemindersModule` kuruldu. `APPOINTMENT_CREATED` event'i ile randevudan 24 saat öncesi için BullMQ'ya görev eklenir. `CANCELLED` veya `COMPLETED` durumunda görev silinir. `SmsService` simülasyon moduyla eklendi.

### 8. Güvenlik ve Altyapı (Security & HTTPS)
*   **Durum:** ✅ Hardening ve HTTPS Tamamlandı
*   **Özellikler:** 
    *   PostgreSQL RLS (Row Level Security) ile %100 klinik izolasyonu.
    *   AES-256-GCM veri şifreleme.
    *   **HTTPS:** Tüm backend ve frontend'ler uçtan uca HTTPS protokolüne geçirildi.
    *   **Secure Cookies:** Auth token'ları sadece HTTPS üzerinden iletilecek şekilde (secure:true) sabitlendi.
*   **Kritik:** `JWT_SECRET` ve `ENCRYPTION_KEY` artık `.env` üzerinden zorunludur.

## 📋 Sıradaki Adımlar (Öneri)
1.  **Doküman OCR:** Yüklenen onam formlarından veri okuma (Tesseract.js entegrasyonu).
2.  **USS Entegrasyon Modülü:** Ulusal Sağlık Sistemi gönderim durumlarının izlenmesi ve hata kodları analiz paneli.

## 🚀 Yeni Cihazda Başlatma Talimatı
1.  Projeyi yeni bilgisayara kopyalayın.
2.  `backend-clinic/.env` ve `backend-saas/.env` dosyalarının varlığından emin olun.
3.  `npm run install:all` komutu ile tüm bağımlılıkları yükleyin.
4.  **HTTPS Kurulumu:** `npm run setup:https` komutunu çalıştırarak yerel SSL sertifikalarını oluşturun (OpenSSL yüklü olmalıdır).
5.  Veritabanı migrationlarını kontrol edin: `npx prisma migrate dev --name tenant_update`.
6.  RLS politikalarını tekrar uygulayın: `npx ts-node prisma/apply-rls.ts`.
7.  Sistemi başlatın: `npm run dev`.

---
### 🖥️ İşletim Sistemi Notları (Windows/Linux/Mac)
*   **Linux/Mac:** `npm run setup:https` sorunsuz çalışacaktır.
*   **Windows:** `OpenSSL` yüklü olmalı veya `Git Bash` üzerinden komutlar çalıştırılmalıdır. Alternatif olarak sertifikalar manuel olarak `certs/` altına `localhost.key` ve `localhost.crt` olarak kopyalanabilir.
*   **Next.js:** HTTPS modu `--experimental-https` bayrağı ile çalışır, tarayıcıda sertifika uyarısı çıktığında "Gelişmiş -> Devam Et" seçilmelidir.

---
*Bu dosya Gemini CLI tarafından "Handover" amacıyla oluşturulmuştur.*
