import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.test dosyasını yükle (varsa)
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const useSystemChromium = process.env.PLAYWRIGHT_USE_SYSTEM_CHROMIUM === '1';
const AUTH_FILE = 'tests/.auth/user.json';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  // Global setup: testlerden önce auth state oluştur
  globalSetup: require.resolve('./tests/global-setup'),

  use: {
    baseURL: 'https://localhost:7001',
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15000,
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      ...(useSystemChromium && { executablePath: '/snap/bin/chromium' }),
    },
  },

  webServer: {
    command: 'npm run dev',
    url: 'https://localhost:7001',
    reuseExistingServer: true,
    timeout: 120000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    // Auth gerektirmeyen testler (login sayfası vb.)
    {
      name: 'no-auth',
      testMatch: ['**/login.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        // storageState kullanma — yeni boş context
      },
    },
    // Auth gerektiren testler (kaydedilmiş session ile)
    {
      name: 'authenticated',
      testIgnore: ['**/login.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },
  ],
});
