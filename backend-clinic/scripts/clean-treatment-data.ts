/**
 * Tüm hastalara ait:
 * - TreatmentPlan + TreatmentItem kayıtlarını
 * - Protocol kayıtlarını
 * - PaymentDistribution + Payment kayıtlarını
 * - PrimRecord kayıtlarını
 * siler ve hasta cari borç/avans bakiyelerini sıfırlar.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaClient as TenantPrismaClient } from '../src/prisma/tenant-client';

const masterPrisma = new PrismaClient();

async function cleanTenant(clinicName: string, dbUrl: string) {
  console.log(`\n─────────────────────────────────────────`);
  console.log(`Klinik: ${clinicName}`);
  console.log(`─────────────────────────────────────────`);

  const db = new TenantPrismaClient({ datasources: { db: { url: dbUrl } } });

  try {
    await db.$connect();

    // 1. PrimRecord
    const primCount = await db.primRecord.count();
    await db.primRecord.deleteMany({});
    console.log(`  ✓ PrimRecord silindi: ${primCount} kayıt`);

    // 2. Protocol
    const protocolCount = await db.protocol.count();
    await db.protocol.deleteMany({});
    console.log(`  ✓ Protocol silindi: ${protocolCount} kayıt`);

    // 3. PaymentDistribution
    const distCount = await db.paymentDistribution.count();
    await db.paymentDistribution.deleteMany({});
    console.log(`  ✓ PaymentDistribution silindi: ${distCount} kayıt`);

    // 4. Payment
    const paymentCount = await db.payment.count();
    await db.payment.deleteMany({});
    console.log(`  ✓ Payment silindi: ${paymentCount} kayıt`);

    // 5. TreatmentItem
    const itemCount = await db.treatmentItem.count();
    await db.treatmentItem.deleteMany({});
    console.log(`  ✓ TreatmentItem silindi: ${itemCount} kayıt`);

    // 6. TreatmentPlan
    const planCount = await db.treatmentPlan.count();
    await db.treatmentPlan.deleteMany({});
    console.log(`  ✓ TreatmentPlan silindi: ${planCount} kayıt`);

    // 7. Hasta borçlarını sıfırla
    const updated = await db.patient.updateMany({
      data: { totalDebt: 0, advance: 0 },
    });
    console.log(`  ✓ Hasta cari borç/avans sıfırlandı: ${updated.count} hasta`);

    // Özet
    console.log(`\n  ÖZET:`);
    const remainingPatients = await db.patient.count();
    const remainingDebts = await db.patient.findMany({
      where: { totalDebt: { gt: 0 } },
      select: { id: true, totalDebt: true },
    });
    console.log(`  - Toplam hasta sayısı: ${remainingPatients}`);
    console.log(`  - Hâlâ borçlu hasta: ${remainingDebts.length} (olmamalı)`);

  } catch (err: any) {
    console.error(`  HATA: ${err.message}`);
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const clinics = await masterPrisma.clinic.findMany({
    select: { id: true, name: true, databaseUrl: true },
  });

  if (clinics.length === 0) {
    console.log('Hiç klinik bulunamadı!');
    return;
  }

  for (const clinic of clinics) {
    if (!clinic.databaseUrl) {
      console.log(`\nKlinik "${clinic.name}" için databaseUrl tanımlı değil, atlanıyor.`);
      continue;
    }
    await cleanTenant(clinic.name, clinic.databaseUrl);
  }

  console.log('\n═════════════════════════════════════════');
  console.log('Temizlik tamamlandı!');
  console.log('═════════════════════════════════════════');
}

main()
  .catch(console.error)
  .finally(() => masterPrisma.$disconnect());
