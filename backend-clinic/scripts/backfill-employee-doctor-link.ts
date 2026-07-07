// İK modülü geri getirilirken eklendi: Employee ile Doctor ayrı modeller olarak
// yaşamaya devam ediyor (bkz. restorasyon planı). Scope-reduction sonrası
// oluşturulmuş (Employee kaydı olmayan) mevcut Doctor satırları için karşılık
// gelen bir Employee (İK) kaydı oluşturur ve Employee.doctorId ile bağlar.
// İdempotenttir: zaten bağlı bir Employee'si olan Doctor'lar atlanır.
//
// Çalıştırma: npx ts-node scripts/backfill-employee-doctor-link.ts
import 'dotenv/config';
import { PrismaClient as TenantPrismaClient } from '../src/prisma/tenant-client';

async function backfillTenant(label: string, databaseUrl: string) {
  console.log(`\n▶ ${label} (${databaseUrl.replace(/:[^:@]+@/, ':***@')})`);

  const tenantDb = new TenantPrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    await tenantDb.$connect();

    const doctors = await tenantDb.doctor.findMany();
    if (doctors.length === 0) {
      console.log('  (Doctor kaydı yok, atlanıyor)');
      return;
    }

    let created = 0;
    let skipped = 0;

    for (const doctor of doctors) {
      const existingLink = await tenantDb.employee.findFirst({ where: { doctorId: doctor.id } });
      if (existingLink) {
        skipped++;
        continue;
      }

      // Employee.emailHash @unique — Doctor ile aynı e-postaya (dolayısıyla aynı
      // hash'e) sahip başka bir Employee zaten varsa (örn. daha önce ayrı
      // oluşturulmuş bir İK kaydı), onu bu Doctor'a bağla; yoksa yeni oluştur.
      const existingByEmail = await tenantDb.employee.findUnique({ where: { emailHash: doctor.emailHash } });

      if (existingByEmail) {
        await tenantDb.employee.update({
          where: { id: existingByEmail.id },
          data: { doctorId: doctor.id },
        });
      } else {
        await tenantDb.employee.create({
          data: {
            clinicId: doctor.clinicId,
            userId: doctor.userId,
            doctorId: doctor.id,
            firstName: doctor.firstName,
            lastName: doctor.lastName,
            email: doctor.email,
            emailHash: doctor.emailHash,
            phone: doctor.phone,
            title: doctor.title,
            photoUrl: doctor.photoUrl,
            isDoctor: true,
            isActive: doctor.isActive,
          },
        });
      }

      created++;
      console.log(`  ✅ Employee bağlandı: ${doctor.firstName} ${doctor.lastName} (doctorId=${doctor.id})`);
    }

    console.log(`  Backfill: ${created} Employee bağlandı/oluşturuldu, ${skipped} zaten bağlıydı.`);
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
