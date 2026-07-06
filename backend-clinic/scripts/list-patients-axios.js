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
    const setCookie = loginRes.headers['set-cookie'] || [];
    const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
    const tenantId = loginRes.data.tenantId || (loginRes.data.user && loginRes.data.user.clinicId);

    const res = await axios.get(`${API_BASE}/patients`, { httpsAgent: agent, headers: { Cookie: cookieHeader, 'X-Tenant-ID': tenantId } });
    const patients = res.data && Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.data || []);

    if (!patients.length) {
      console.log('No patients returned or unexpected response shape:');
      console.log(res.data);
      process.exit(0);
    }

    console.log('fileNo  | id                                   | name');
    console.log('-------------------------------------------------------------');
    patients.forEach(p => {
      const fileNo = p.fileNo ?? p.file_no ?? '—';
      const id = p.id;
      const name = `${p.firstName || p.first_name || ''} ${p.lastName || p.last_name || ''}`.trim();
      console.log(String(fileNo).padEnd(7) + ' | ' + id + ' | ' + name);
    });
  } catch (err) {
    if (err.response) {
      console.error('HTTP error', err.response.status, err.response.data);
    } else {
      console.error('Error', err.message);
    }
    process.exit(1);
  }
})();
