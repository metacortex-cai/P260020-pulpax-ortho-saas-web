// Pulpax: TDB 2026 tedavi/tarife katalogunu (frontend'deki tdb_treatments.ts ile ayni veri)
// her klinigin tenant veritabanina MasterTreatment + Tariff olarak yukler.
// Bu, temiz kurulum sonrasi kaybolan TDB verisini geri yuklemek icindir; idempotenttir
// (tekrar calistirilirsa var olan kayitlari atlar/gunceller, kopya olusturmaz).
import { PrismaClient } from '@prisma/client';
import { PrismaClient as TenantPrismaClient } from '../src/prisma/tenant-client';
import { TDB_2026_TREATMENTS } from './tdb-2026-treatments-data';

const masterPrisma = new PrismaClient();

async function main() {
  const clinics = await masterPrisma.clinic.findMany();

  for (const clinic of clinics) {
    console.log(`\nProcessing clinic: ${clinic.name} (${clinic.id})`);
    if (!clinic.databaseUrl) {
      console.log('  Skipping: No databaseUrl.');
      continue;
    }

    const tenantDb = new TenantPrismaClient({
      datasources: { db: { url: clinic.databaseUrl } },
    });

    try {
      await tenantDb.$connect();

      let treatmentsCreated = 0;
      let tariffsCreated = 0;
      let tariffsSkipped = 0;

      for (const t of TDB_2026_TREATMENTS) {
        const existing = await tenantDb.masterTreatment.findUnique({ where: { id: t.id } });
        await tenantDb.masterTreatment.upsert({
          where: { id: t.id },
          update: { name: t.name, sutCode: t.sutCode, category: t.category },
          create: { id: t.id, name: t.name, sutCode: t.sutCode, category: t.category },
        });
        if (!existing) treatmentsCreated++;

        const existingTariff = await tenantDb.tariff.findFirst({
          where: { clinicId: clinic.id, masterTreatmentId: t.id },
        });
        if (!existingTariff) {
          await tenantDb.tariff.create({
            data: {
              clinicId: clinic.id,
              masterTreatmentId: t.id,
              price: t.priceExclVat,
              taxRate: t.vatRate,
              status: 'AKTİF',
              currency: 'TRY',
            },
          });
          tariffsCreated++;
        } else {
          tariffsSkipped++;
        }
      }

      console.log(`  MasterTreatments created: ${treatmentsCreated}/${TDB_2026_TREATMENTS.length}`);
      console.log(`  Tariffs created: ${tariffsCreated}, skipped (already exist): ${tariffsSkipped}`);
    } catch (err: any) {
      console.error(`  Error: ${err.message}`);
    } finally {
      await tenantDb.$disconnect();
    }
  }

  console.log('\nTDB 2026 treatments/tariffs import completed!');
}

main().catch(console.error).finally(() => masterPrisma.$disconnect());
