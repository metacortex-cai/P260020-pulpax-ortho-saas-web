# Pulpax Security Fix Plan

## 1. Amaç
Bu belge, Pulpax projesindeki tespit edilen güvenlik açıklarını, konfigürasyon risklerini ve öncelikli düzeltme adımlarını özetler.

## 2. Tespit edilen güvenlik sorunları

### 2.1. Bağımlılık tabanlı güvenlik açıkları
- `backend` projesinde 25 adet açık tespit edildi:
  - 3 düşük
  - 13 orta
  - 9 yüksek
- `frontend` projesinde 2 adet açık tespit edildi:
  - 1 orta
  - 1 kritik
- En önemli paketler:
  - `next` (frontend)
  - `@nestjs/cli`, `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`, `@nestjs/testing` (backend)
  - `@angular-devkit/*`, `@mapbox/node-pre-gyp`

### 2.2. Konfigürasyon ve gizli bilgi riskleri
- `backend/.env` içinde gösterilen test veritabanı bağlantısı ve JWT secret var.
- Reponun kodunda env yoksa kullanılan fallback secret değerleri bulundu:
  - `PULPAX_DEV_SECRET_CHANGE_IN_PRODUCTION`
  - `pulpax-secure-key-32-chars-long!`
  - `0123456789abcdef0123456789abcdef`
  - `dummy_client_id`
- `backend/prisma/seed.ts` içinde açık test parolaları ve demo DB URL'leri var:
  - `Test123456`
  - `PulpaxSecurePass2026`
- `frontend` tarafında `localStorage` yalnızca tema tercihi için kullanılıyor; auth tokenlar cookie tabanlı tutuluyor.

### 2.3. Uygulama güvenlik mimarisi ve düzeltmeler
- `helmet()` ve `cookie-parser` kullanımı olumlu.
- CORS yapılandırması var ancak üretim ortamına uygun `origin` kontrolü gerektirir.
- Auth cookie değerleri `httpOnly` ve `SameSite=Strict` olarak ayarlanmış.
- `secure: process.env.NODE_ENV === 'production'` doğru ancak prod ortamda HTTPS zorunlu hale getirilmeli.

## 3. Önerilen düzeltme adımları

### 3.1. Paket güncellemeleri
1. `frontend/package.json` içindeki `next` sürümünü en az `14.2.32` veya daha güncel ve güvenli bir sürüme yükseltin.
2. `backend/package.json` içindeki NestJS ve Angular DevKit paketlerini güncelleyin.
3. `npm audit` taramasını CI'da otomatik çalıştırın ve açıklar kapatılana kadar takip edin.

### 3.2. Gizli bilgi yönetimi
1. `backend/.env` dosyasını repoya dahil etmeyin.
2. `.gitignore` içinde `.env` dosyasını ekleyin.
3. Ortam değişkenlerini production ortamında `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` gibi değerler için zorunlu hale getirin.
4. Kodda `||` ile tanımlanan fallback secret değerlerini kaldırın; uygulama secrets olmadan başlamamalı.

### 3.3. Şifre ve veri temizliği
1. `backend/prisma/seed.ts` içindeki gerçek veya demo parolaları ve connection stringleri sabit olarak bırakmayın.
2. Seed verisini kurulum belgelerinde sadece örnek olarak belirtin; gerçek değerleri `.env` üzerinden alacak şekilde değiştirin.

### 3.4. Üretim güvenliği
1. Prod ortam için `cookie secure` ayarını HTTPS ile birlikte zorunlu yapın.
2. CORS `origin` listesini sadece gerçek frontend domainleri ile sınırlayın.
3. `NODE_ENV` kontrolü yaparak debug/log çıktısını azaltın.

## 4. Hızlı öncelik sırası
1. `frontend` `next` paketini güncelleme.
2. `backend` NestJS ve kritik bağımlılıkları güncelleme.
3. `.env` dosyasının repoya eklenmesini engelleme ve fallback secret kullanımını kaldırma.
4. Test parolaları/DB bağlantı bilgilerini koddan çıkartma.
5. CI/DevOps hattına `npm audit` ve secret kontrolü ekleme.

## 5. Notlar
- Bu belge mevcut depo taramasına dayanır.
- Uygulama paketlerinin güncellemesi sonrasında fonksiyonel doğrulama yapılmalıdır.
- Özellikle `next` ve NestJS güncellemeleri major değişiklikler içerebileceği için bakım branch'inde test edilmelidir.
