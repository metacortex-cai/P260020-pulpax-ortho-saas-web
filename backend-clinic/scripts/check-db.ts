import { PrismaClient } from '@prisma/client';
import { PrismaClient as TenantPrismaClient } from '../src/prisma/tenant-client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Master DB Clinics ---');
  const clinics = await prisma.clinic.findMany();
  for (const clinic of clinics) {
    console.log(`Clinic: ${clinic.name} (${clinic.id}) -> DB: ${clinic.databaseUrl}`);
    if (clinic.databaseUrl) {
      try {
        const tenantDb = new TenantPrismaClient({
          datasources: { db: { url: clinic.databaseUrl } },
        });
        const treatmentCount = await tenantDb.masterTreatment.count();
        const tariffCount = await tenantDb.tariff.count();
        console.log(`  Tenant DB contains ${treatmentCount} master treatments and ${tariffCount} tariffs.`);
        await tenantDb.$disconnect();
      } catch (err: any) {
        console.error(`  Error connecting to tenant DB: ${err.message}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
