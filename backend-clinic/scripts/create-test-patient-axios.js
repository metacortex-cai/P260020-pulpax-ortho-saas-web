require('dotenv').config();
const axios = require('axios');
const https = require('https');

const API_BASE = 'https://localhost:7010/api/v1';
const EMAIL = 'doctor@pulpax.test';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!PASSWORD) {
  console.error('SEED_ADMIN_PASSWORD not set');
  process.exit(1);
}

const agent = new https.Agent({ rejectUnauthorized: false });

(async () => {
  try {
    const loginRes = await axios.post(`${API_BASE}/auth/login`, { email: EMAIL, password: PASSWORD }, { httpsAgent: agent });
    console.log('login status', loginRes.status);
    const setCookie = loginRes.headers['set-cookie'] || [];
    const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
    const tenantId = loginRes.data.tenantId || (loginRes.data.user && loginRes.data.user.clinicId);
    console.log('tenantId', tenantId);

    const createRes = await axios.post(`${API_BASE}/patients`, { firstName: 'API Test', lastName: 'Patient', phone: '05550001122' }, { httpsAgent: agent, headers: { Cookie: cookieHeader, 'X-Tenant-ID': tenantId } });
    console.log('create status', createRes.status);
    console.log('created patient', createRes.data);
    console.log('fileNo:', createRes.data.fileNo || createRes.data.file_no || 'not returned');
  } catch (err) {
    if (err.response) {
      console.error('HTTP error', err.response.status, err.response.data);
    } else {
      console.error('Error', err.message);
    }
    process.exit(1);
  }
})();
