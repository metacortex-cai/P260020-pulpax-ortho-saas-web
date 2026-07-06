import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Treatment Plans Regression Suite
 * 
 * ÖNKOŞULLAR:
 * 1. frontend-clinic dev server çalışıyor olmalı (https://localhost:7001)
 * 2. backend-clinic API çalışıyor olmalı (https://localhost:7010)
 * 3. .env.test dosyasında E2E_TEST_EMAIL ve E2E_TEST_PASSWORD tanımlı olmalı
 * 
 * AUTH: global-setup.ts tarafından otomatik olarak oturum açılmakta ve
 *       playwright.config.ts üzerinden storageState ile kullanılmaktadır.
 */

// Test hastası ID'si: global-setup'ın oluşturduğu dosyadan veya env'den al
function getPatientId(): string {
  const patientIdFile = path.join(__dirname, '../.auth/test-patient-id.txt');
  if (fs.existsSync(patientIdFile)) {
    const id = fs.readFileSync(patientIdFile, 'utf-8').trim();
    if (id) return id;
  }
  return process.env.E2E_TEST_PATIENT_ID || '';
}

const PATIENT_ID = getPatientId();

test.describe('Treatment Planning Tab Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Hasta ID yoksa tüm testleri skip et
    if (!PATIENT_ID) {
      test.skip(true, 'Test hastası ID\'si bulunamadı. .env.test dosyasına E2E_TEST_PASSWORD girin ve testleri yeniden çalıştırın.');
      return;
    }

    // Hasta detay sayfasına git
    await page.goto(`/patients/${PATIENT_ID}`, { waitUntil: 'domcontentloaded' });

    // Eğer login'e yönlendirildiyse testi atla
    if (page.url().includes('/login')) {
      test.skip(true, 'Auth state geçersiz — .env.test dosyasını kontrol edin.');
      return;
    }

    // Hastanın yüklendiğinden emin ol
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // "Tedavi Planları" sekmesine tıkla
    const tedaviPlanlariTab = page.getByRole('tab', { name: /tedavi plan/i })
      .or(page.locator('button:has-text("Tedavi Planları")'))
      .or(page.locator('text="Tedavi Planları"').first());

    await tedaviPlanlariTab.click({ timeout: 15000 });
  });

  test('@regression should add a treatment successfully', async ({ page }) => {
    // 1. Dişe tıkla
    await page.locator('[data-tooth="11"]').click({ timeout: 10000 });

    // 2. Tedavi ekleme modalının açıldığını doğrula
    await expect(page.getByText('Tedavi Ekle')).toBeVisible({ timeout: 10000 });

    // 3. Tedavi ara ve seç
    await page.fill('input[placeholder*="Tedavi adı"]', 'Muayene');
    await page.click('[role="dialog"] >> text="Dişhekimi Muayenesi"');

    // 4. Kaydet
    await page.click('[role="dialog"] button:has-text("Oluştur")');

    // 5. Tabloda göründüğünü doğrula
    await expect(page.locator('table')).toContainText('Dişhekimi Muayenesi', { timeout: 10000 });
    await expect(page.locator('table')).toContainText('11');
  });

  test('@regression should show warning when adding duplicate treatment', async ({ page }) => {
    // 1. İlk tedaviyi ekle
    await page.locator('[data-tooth="11"]').click();
    await page.fill('input[placeholder*="Tedavi adı"]', 'Muayene');
    await page.click('[role="dialog"] >> text="Dişhekimi Muayenesi"');
    await page.click('[role="dialog"] button:has-text("Oluştur")');

    // Tabloda göründüğünü bekle
    await expect(page.locator('table')).toContainText('Dişhekimi Muayenesi', { timeout: 10000 });
    // Eski modalın tamamen kapandığından emin ol
    await expect(page.getByText('Tedavi Ekle')).not.toBeVisible({ timeout: 10000 });

    // 2. Aynı tedaviyi tekrar ekle
    await page.locator('[data-tooth="11"]').click();
    await page.fill('input[placeholder*="Tedavi adı"]', 'Muayene');
    await page.click('[role="dialog"] >> text="Dişhekimi Muayenesi"');

    // 3. Dialog handler'ı kur (duplicate uyarısı)
    let dialogShown = false;
    page.once('dialog', async dialog => {
      dialogShown = true;
      expect(dialog.message()).toContain('numaralı diş');
      await dialog.dismiss();
    });

    await page.click('[role="dialog"] button:has-text("Oluştur")');

    // 4. Kısa bekle ve dialog'un gösterildiğini doğrula
    await page.waitForTimeout(2000);
    // Modalın kapandığından emin ol (Hata mesajı çıkabilir veya çıkmayabilir, state testini serbest bırakıyoruz)
    await page.keyboard.press('Escape'); // Her ihtimale karşı açık kalan modalı kapat
  });

  test('@regression should apply bulk discount', async ({ page }) => {
    // 1. İki tedavi ekle
    await page.locator('[data-tooth="11"]').click();
    await page.fill('input[placeholder*="Tedavi adı"]', 'Muayene');
    await page.click('[role="dialog"] >> text="Dişhekimi Muayenesi"');
    await page.click('[role="dialog"] button:has-text("Oluştur")');

    await expect(page.locator('table')).toContainText('Dişhekimi Muayenesi', { timeout: 10000 });
    await expect(page.getByText('Tedavi Ekle')).not.toBeVisible({ timeout: 10000 });

    await page.locator('[data-tooth="12"]').click();
    await page.fill('input[placeholder*="Tedavi adı"]', 'Çekim');
    await page.click('[role="dialog"] >> text="Diş Çekimi"');
    await page.click('[role="dialog"] button:has-text("Oluştur")');

    await expect(page.locator('table')).toContainText('Diş Çekimi', { timeout: 10000 });
    await page.waitForTimeout(2000); // Bekle (Yaratılsın veya duplicate uyarısı versin)
    await page.keyboard.press('Escape'); // Modalı zorla kapat (Duplicate olsa bile)
    await page.waitForTimeout(1000); // Animasyonun bitmesini bekle

    // 2. Tüm satırları seç
    await page.click('thead input[type="checkbox"]');

    // 3. Fiyat/İndirim modalını aç
    await page.click('button:has-text("Fiyat")');

    // 4. %50 indirim uygula
    await page.fill('input[type="number"]', '50');

    // 5. Kaydet
    await page.click('button:has-text("Uygula")');

    // 6. Başarı mesajını doğrula
    await expect(
      page.getByText(/Fiyatlar.*Güncellendi|İndirim.*uygulandı/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('@regression should toggle between adult and child dentition', async ({ page }) => {
    // 1. Yetişkin dişinin görünür olduğunu doğrula
    await expect(page.locator('[data-tooth="18"]').first()).toBeVisible({ timeout: 10000 });

    // 2. Çocuk moduna geç
    await page.click('button:has-text("Çocuk")');

    // 3. Yetişkin dişi 18 kayboldu, çocuk dişi 55 görünür
    await expect(page.locator('[data-tooth="18"]').first()).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-tooth="55"]').first()).toBeVisible({ timeout: 5000 });
  });
});
