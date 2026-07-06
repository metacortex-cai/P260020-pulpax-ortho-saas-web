import { request, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');
const PATIENT_ID_FILE = path.join(__dirname, '.auth', 'test-patient-id.txt');
const APP_URL = 'https://localhost:7001';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7010/api/v1';

async function globalSetup(config: FullConfig) {
  // Auth dizini oluştur
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const email = process.env.E2E_TEST_EMAIL || '';
  const password = process.env.E2E_TEST_PASSWORD || '';

  if (!email || !password || password.startsWith('BURAYA')) {
    console.warn('\n⚠️  E2E test credentials ayarlanmamış — treatment tests skip edilecek.\n');
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  console.log(`\n🔐 Playwright global auth setup (API yöntemi) — ${email}`);

  // API'ye direkt istek at (browser yerine)
  const apiContext = await request.newContext({
    ignoreHTTPSErrors: true,
    baseURL: 'https://localhost:7010',
  });

  try {
    // Login API çağrısı
    const loginResponse = await apiContext.post('/api/v1/auth/login', {
      data: { email, password },
    });

    if (!loginResponse.ok()) {
      const body = await loginResponse.text();
      throw new Error(`Login failed (${loginResponse.status()}): ${body}`);
    }

    const loginData = await loginResponse.json();
    console.log(`✅ API Login başarılı: ${loginData.user?.firstName} ${loginData.user?.lastName}`);

    // Cookie'leri al (HttpOnly access_token ve refresh_token)
    const cookies = await apiContext.storageState();
    
    // Tenant ID'yi al
    const tenantId = loginData.tenantId;
    
    // Zustand auth store için localStorage data oluştur
    const authStoreData = {
      state: {
        tenantId,
        user: loginData.user,
        clinics: loginData.clinics || [],
        isLoading: false,
      },
      version: 0,
    };

    // Auth state dosyasını oluştur — cookies + localStorage
    const storageState = {
      cookies: cookies.cookies.map((c: any) => ({
        ...c,
        domain: 'localhost',
        path: '/',
        sameSite: 'Lax' as const,
      })),
      origins: [
        {
          origin: APP_URL,
          localStorage: [
            {
              name: 'pulpax-auth-storage',
              value: JSON.stringify(authStoreData),
            },
          ],
        },
      ],
    };

    fs.writeFileSync(AUTH_FILE, JSON.stringify(storageState, null, 2));
    console.log(`✅ Auth state kaydedildi: ${AUTH_FILE}`);

    await apiContext.dispose();

    // Test hastası oluştur (API üzerinden)
    await setupTestPatient(email, password, tenantId);

  } catch (error) {
    console.error('❌ Global auth setup başarısız:', error);
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    await apiContext.dispose();
  }
}

async function setupTestPatient(email: string, password: string, tenantId: string) {
  const configuredPatientId = process.env.E2E_TEST_PATIENT_ID;
  if (configuredPatientId && !configuredPatientId.startsWith('BURAYA') && configuredPatientId.length > 5) {
    const patientIdFile = path.join(__dirname, '.auth', 'test-patient-id.txt');
    fs.writeFileSync(patientIdFile, configuredPatientId);
    console.log(`✅ Test hasta ID'si kullanılıyor: ${configuredPatientId}`);
    return;
  }

  console.log('📋 Test hastası oluşturuluyor (API)...');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7010/api/v1';
  const patientIdFile = path.join(__dirname, '.auth', 'test-patient-id.txt');

  // Yeni bir API context aç ve login yap
  const patientApiCtx = await request.newContext({
    ignoreHTTPSErrors: true,
    baseURL: 'https://localhost:7010',
  });

  try {
    // Login
    await patientApiCtx.post('/api/v1/auth/login', { data: { email, password } });

    // Hasta listesini al
    const patientsRes = await patientApiCtx.get('/api/v1/patients?limit=1', {
      headers: { 'X-Tenant-ID': tenantId },
    });

    if (patientsRes.ok()) {
      const data = await patientsRes.json();
      const patients = data.data || data.patients || data || [];
      if (Array.isArray(patients) && patients.length > 0) {
        const patientId = patients[0].id;
        fs.writeFileSync(patientIdFile, patientId);
        console.log(`✅ Mevcut hasta kullanılıyor: ${patientId}`);
        return;
      }
    }

    // Hasta yoksa yeni oluştur
    const createRes = await patientApiCtx.post('/api/v1/patients', {
      data: {
        firstName: 'E2E Test',
        lastName: 'Hastası',
        phone: '05551234567',
      },
      headers: { 'X-Tenant-ID': tenantId },
    });

    if (createRes.ok()) {
      const newPatient = await createRes.json();
      const patientId = newPatient.id;
      fs.writeFileSync(patientIdFile, patientId);
      console.log(`✅ Test hastası oluşturuldu: ${patientId}`);
    } else {
      const errText = await createRes.text();
      console.warn(`⚠️ Hasta oluşturulamadı (${createRes.status()}): ${errText}`);
      fs.writeFileSync(patientIdFile, '');
    }
  } catch (err) {
    console.warn('⚠️ Test hastası işlemi başarısız:', err);
    fs.writeFileSync(patientIdFile, '');
  } finally {
    await patientApiCtx.dispose();
  }
}

export default globalSetup;
