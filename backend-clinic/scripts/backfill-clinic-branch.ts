// Çoklu klinik (branch) özelliği için veri geçişi: her tenant veritabanında,
// mevcut clinicId için bir "Ana Klinik" ClinicBranch kaydı oluşturur ve
// clinicBranchId'si boş olan tüm Hasta/Randevu/Ünit kayıtlarını bu şubeye bağlar.
// İdempotenttir: "Ana Klinik" zaten varsa yeniden oluşturmaz, yalnızca eksik
// backfill'leri tamamlar.
//
// Çalıştırma: npx ts-node scripts/backfill-clinic-branch.ts
import 'dotenv/config';
import { PrismaClient as TenantPrismaClient } from '../src/prisma/tenant-client';

const DEFAULT_BRANCH_NAME = 'Ana Klinik';

async function backfillTenant(label: string, databaseUrl: string) {
  console.log(`\n▶ ${label} (${databaseUrl.replace(/:[^:@]+@/, ':***@')})`);

  const tenantDb = new TenantPrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    await tenantDb.$connect();

    const distinctClinicIds = await tenantDb.patient.findMany({
      select: { clinicId: true },
      distinct: ['clinicId'],
    });

    if (distinctClinicIds.length === 0) {
      console.log('  (hasta kaydı yok, atlanıyor)');
      return;
    }

    for (const { clinicId } of distinctClinicIds) {
      let branch = await tenantDb.clinicBranch.findFirst({
        where: { clinicId, name: DEFAULT_BRANCH_NAME },
      });

      if (!branch) {
        branch = await tenantDb.clinicBranch.create({
          data: { clinicId, name: DEFAULT_BRANCH_NAME },
        });
        console.log(`  ✅ "${DEFAULT_BRANCH_NAME}" şubesi oluşturuldu (clinicId=${clinicId})`);
      } else {
        console.log(`  ℹ️  "${DEFAULT_BRANCH_NAME}" şubesi zaten var (clinicId=${clinicId})`);
      }

      const [patients, appointments, chairs] = await Promise.all([
        tenantDb.patient.updateMany({
          where: { clinicId, clinicBranchId: null },
          data: { clinicBranchId: branch.id },
        }),
        tenantDb.appointment.updateMany({
          where: { clinicId, clinicBranchId: null },
          data: { clinicBranchId: branch.id },
        }),
        tenantDb.dentalChair.updateMany({
          where: { clinicId, clinicBranchId: null },
          data: { clinicBranchId: branch.id },
        }),
      ]);

      console.log(`  Backfill: ${patients.count} hasta, ${appointments.count} randevu, ${chairs.count} ünit güncellendi.`);
    }
  } finally {
    await tenantDb.$disconnect();
  }
}

async function main() {
  const tenantAUrl = process.env.DATABASE_URL_TENANT_A;
  const tenantBUrl = process.env.DATABASE_URL_TENANT_B;

  if (!tenantAUrl || !tenantBUrl) {
    throw new Error('DATABASE_URL_TENANT_A and DATABASE_URL_TENANT_B environment variables are required.');
  }

  await backfillTenant('Klinik A', tenantAUrl);
  await backfillTenant('Klinik B', tenantBUrl);

  console.log('\n🌱 Backfill tamamlandı.');
}

main().catch((e) => {
  console.error('❌ Backfill başarısız:', e);
  process.exit(1);
});
