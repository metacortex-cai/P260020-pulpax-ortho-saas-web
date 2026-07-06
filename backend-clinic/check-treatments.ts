import 'dotenv/config';
import { PrismaClient } from './src/prisma/tenant-client';

const tenantUrl = process.env.DATABASE_URL_TENANT_A;
if (!tenantUrl) throw new Error('DATABASE_URL_TENANT_A not set');

const p = new PrismaClient({
  datasources: { db: { url: tenantUrl } }
});

async function main() {
  const masterCount = await p.masterTreatment.count();
  const tariffCount = await p.tariff.count();
  console.log('MasterTreatment (tedavi) sayısı:', masterCount);
  console.log('Tariff (tarife) sayısı:', tariffCount);
  
  if (masterCount > 0) {
    const samples = await p.masterTreatment.findMany({ take: 3 });
    console.log('\nÖrnek kayıtlar:');
    samples.forEach(t => console.log(' -', t.name, '|', t.sutCode));
  } else {
    console.log('\n⚠️  Veritabanında tedavi kaydı bulunamadı. Seeding gerekiyor!');
  }
}

main()
  .catch(e => { console.error('Hata:', e); process.exit(1); })
  .finally(async () => { await p.$disconnect(); });
