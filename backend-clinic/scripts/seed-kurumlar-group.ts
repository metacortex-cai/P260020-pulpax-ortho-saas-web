import { PrismaClient } from '@prisma/client';
import { PrismaClient as TenantPrismaClient } from '../src/prisma/tenant-client';

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

      // Check if "Kurumlar" group already exists
      const existing = await tenantDb.tariffGroup.findFirst({
        where: { clinicId: clinic.id, name: 'Kurumlar' },
      });

      let group = existing;
      if (!group) {
        group = await tenantDb.tariffGroup.create({
          data: {
            clinicId: clinic.id,
            name: 'Kurumlar',
            isDefault: false,
            isActive: true,
          },
        });
        console.log(`  Created "Kurumlar" group: ${group.id}`);
      } else {
        console.log(`  "Kurumlar" group already exists: ${group.id}`);
      }

      // Get all tariffs for this clinic
      const tariffs = await tenantDb.tariff.findMany({
        where: { clinicId: clinic.id },
      });
      console.log(`  Found ${tariffs.length} tariffs to link.`);

      let created = 0;
      let skipped = 0;
      const BATCH = 50;

      for (let i = 0; i < tariffs.length; i += BATCH) {
        const batch = tariffs.slice(i, i + BATCH);
        for (const tariff of batch) {
          const existingEntry = await tenantDb.tariffGroupEntry.findFirst({
            where: { groupId: group.id, tariffId: tariff.id },
          });

          if (!existingEntry) {
            await tenantDb.tariffGroupEntry.create({
              data: {
                groupId: group.id,
                tariffId: tariff.id,
                masterTreatmentId: tariff.masterTreatmentId,
                customPrice: null, // Use base tariff price
              },
            });
            created++;
          } else {
            skipped++;
          }
        }
      }

      console.log(`  Entries created: ${created}, skipped (already exist): ${skipped}`);
    } catch (err: any) {
      console.error(`  Error: ${err.message}`);
    } finally {
      await tenantDb.$disconnect();
    }
  }

  console.log('\n"Kurumlar" group seeding completed!');
}

main().catch(console.error).finally(() => masterPrisma.$disconnect());
