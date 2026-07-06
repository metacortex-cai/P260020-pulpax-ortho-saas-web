require('dotenv').config();
const https = require('https');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'https://localhost:7010/api/v1';
const EMAIL = 'doctor@pulpax.test';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || '';

(async function main(){
  if(!PASSWORD){
    console.error('SEED_ADMIN_PASSWORD not set'); process.exit(1);
  }
  const agent = new https.Agent({ rejectUnauthorized: false });

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    headers: { 'Content-Type': 'application/json' },
    agent,
  });

  if(!loginRes.ok){
    console.error('Login failed', await loginRes.text()); process.exit(1);
  }

  const cookies = loginRes.headers.raw()['set-cookie'];
  const body = await loginRes.json();
  const tenantId = body.tenantId || (body.user && body.user.clinicId);
  console.log('Logged in tenantId=', tenantId);

  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

  const createRes = await fetch(`${API_BASE}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId,
      'Cookie': cookieHeader,
    },
    body: JSON.stringify({ firstName: 'API Test', lastName: 'Patient', phone: '05550001122' }),
    agent,
  });

  if(!createRes.ok){
    console.error('Create patient failed', createRes.status, await createRes.text()); process.exit(1);
  }

  const newPatient = await createRes.json();
  console.log('Created patient:', newPatient);
  console.log('fileNo:', newPatient.fileNo || newPatient.file_no || 'not returned');
})();
