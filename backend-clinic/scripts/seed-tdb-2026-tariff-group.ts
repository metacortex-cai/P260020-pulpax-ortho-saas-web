// Pulpax SaaS: Her klinikte görünen, silinemeyen/düzenlenemeyen (isDefault=true)
// "TDB 2026 Tarifesi" sistem tarifesini oluşturur ve o klinikteki mevcut
// tüm tedavi/tarife kayıtlarını bu gruba bağlar.
import { PrismaClient } from '@prisma/client';
import { PrismaClient as TenantPrismaClient } from '../src/prisma/tenant-client';

const GROUP_NAME = 'TDB 2026 Tarifesi';
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

      let group = await tenantDb.tariffGroup.findFirst({
        where: { clinicId: clinic.id, name: GROUP_NAME },
      });

      if (!group) {
        group = await tenantDb.tariffGroup.create({
          data: {
            clinicId: clinic.id,
            name: GROUP_NAME,
            isDefault: true,
            isActive: true,
          },
        });
        console.log(`  Created "${GROUP_NAME}" group: ${group.id}`);
      } else {
        if (!group.isDefault) {
          group = await tenantDb.tariffGroup.update({
            where: { id: group.id },
            data: { isDefault: true },
          });
        }
        console.log(`  "${GROUP_NAME}" group already exists: ${group.id}`);
      }

      const tariffs = await tenantDb.tariff.findMany({
        where: { clinicId: clinic.id },
      });
      console.log(`  Found ${tariffs.length} tariffs to link.`);

      let created = 0;
      let skipped = 0;

      for (const tariff of tariffs) {
        const existingEntry = await tenantDb.tariffGroupEntry.findFirst({
          where: { groupId: group.id, tariffId: tariff.id },
        });

        if (!existingEntry) {
          await tenantDb.tariffGroupEntry.create({
            data: {
              groupId: group.id,
              tariffId: tariff.id,
              masterTreatmentId: tariff.masterTreatmentId,
              customPrice: null, // Ana tarife fiyatı kullanılır
            },
          });
          created++;
        } else {
          skipped++;
        }
      }

      console.log(`  Entries created: ${created}, skipped (already exist): ${skipped}`);
    } catch (err: any) {
      console.error(`  Error: ${err.message}`);
    } finally {
      await tenantDb.$disconnect();
    }
  }

  console.log(`\n"${GROUP_NAME}" seeding completed!`);
}

main().catch(console.error).finally(() => masterPrisma.$disconnect());
