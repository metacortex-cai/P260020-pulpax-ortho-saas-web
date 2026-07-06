import 'dotenv/config';
import { PrismaClient as TenantPrismaClient } from './src/prisma/tenant-client';

const CATEGORY_MAP: Record<string, string> = {
  '01': 'Teşhis ve Planlama',
  '02': 'Tedavi & Endodonti',
  '03': 'Pedodonti',
  '04': 'Protez',
  '05': 'Cerrahi',
  '06': 'Periodontoloji',
  '07': 'Ortodonti',
  '08': 'Restoratif',
};

function getCategoryFromSut(sutCode: string | null): string {
  if (!sutCode) return 'Diğer';
  const prefix = sutCode.substring(0, 2);
  return CATEGORY_MAP[prefix] || 'Diğer';
}

async function updateCategories(tenantUrl: string, label: string) {
  console.log(`🔄 Updating categories for ${label}...`);
  const db = new TenantPrismaClient({ datasources: { db: { url: tenantUrl } } });

  try {
    const treatments = await db.masterTreatment.findMany();
    console.log(`  Parsed ${treatments.length} treatments.`);

    let updatedCount = 0;
    for (const t of treatments) {
      const category = getCategoryFromSut(t.sutCode);
      if (t.category !== category) {
        await db.masterTreatment.update({
          where: { id: t.id },
          data: { category },
        });
        updatedCount++;
      }
    }
    console.log(`  ✅ Updated category for ${updatedCount} master treatments.`);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const tenantAUrl = process.env.DATABASE_URL_TENANT_A;
  const tenantBUrl = process.env.DATABASE_URL_TENANT_B;

  if (!tenantAUrl || !tenantBUrl) throw new Error('DATABASE_URL_TENANT_A ve DATABASE_URL_TENANT_B gerekli');

  await updateCategories(tenantAUrl, 'Tenant A');
  await updateCategories(tenantBUrl, 'Tenant B');

  console.log('\n🎉 Category updates completed!');
}

main().catch(console.error);
