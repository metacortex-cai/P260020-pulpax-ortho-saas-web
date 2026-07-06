import 'dotenv/config';
import { PrismaClient as TenantPrismaClient } from './src/prisma/tenant-client';

async function migrateAndSeed(tenantUrl: string, clinicId: string, label: string) {
  console.log(`\n🔄 ${label} başlatılıyor...`);
  const db = new TenantPrismaClient({ datasources: { db: { url: tenantUrl } } });

  try {
    // 1. Yeni tabloları oluştur (CREATE TABLE IF NOT EXISTS)
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tariff_groups (
        id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        clinic_id TEXT NOT NULL,
        name TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL,
        CONSTRAINT tariff_groups_pkey PRIMARY KEY (id)
      )
    `);
    console.log('  ✅ tariff_groups tablosu hazır');

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tariff_group_entries (
        id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        group_id TEXT NOT NULL,
        tariff_id TEXT NOT NULL,
        master_treatment_id TEXT NOT NULL,
        custom_price DECIMAL(65,30),
        CONSTRAINT tariff_group_entries_pkey PRIMARY KEY (id),
        CONSTRAINT tariff_group_entries_group_id_fkey FOREIGN KEY (group_id) REFERENCES tariff_groups(id) ON DELETE CASCADE,
        CONSTRAINT tariff_group_entries_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES tariffs(id),
        CONSTRAINT tariff_group_entries_master_treatment_id_fkey FOREIGN KEY (master_treatment_id) REFERENCES master_treatments(id)
      )
    `);
    console.log('  ✅ tariff_group_entries tablosu hazır');

    // Unique constraint
    await db.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'tariff_group_entries_group_id_tariff_id_key'
        ) THEN
          ALTER TABLE tariff_group_entries ADD CONSTRAINT tariff_group_entries_group_id_tariff_id_key UNIQUE (group_id, tariff_id);
        END IF;
      END $$
    `);

    // Index
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS tariff_groups_clinic_id_idx ON tariff_groups(clinic_id)
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS tariff_group_entries_group_id_idx ON tariff_group_entries(group_id)
    `);

    // category column for master_treatments
    await db.$executeRawUnsafe(`
      ALTER TABLE master_treatments ADD COLUMN IF NOT EXISTS category TEXT
    `);
    console.log('  ✅ master_treatments.category sütunu hazır');

    // 2. "Kurumlar" grubu oluştur
    const existingGroup = await db.tariffGroup.findFirst({ where: { clinicId, name: 'Kurumlar' } });
    if (existingGroup) {
      console.log(`  ℹ️  "Kurumlar" grubu zaten mevcut: ${existingGroup.id}`);
      await db.$disconnect();
      return;
    }

    const group = await db.tariffGroup.create({
      data: {
        clinicId,
        name: 'Kurumlar',
        isDefault: false,
        isActive: true,
        updatedAt: new Date(),
      }
    });
    console.log(`  ✅ "Kurumlar" grubu oluşturuldu: ${group.id}`);

    // 3. Tüm tarifeleri gruba ekle (batch)
    const allTariffs = await db.tariff.findMany({ where: { clinicId } });
    console.log(`  📦 ${allTariffs.length} tarife gruba ekleniyor...`);

    const BATCH = 50;
    for (let i = 0; i < allTariffs.length; i += BATCH) {
      const batch = allTariffs.slice(i, i + BATCH);
      await db.tariffGroupEntry.createMany({
        data: batch.map(t => ({
          groupId: group.id,
          tariffId: t.id,
          masterTreatmentId: t.masterTreatmentId,
          customPrice: null, // Varsayılan fiyatı kullan
        })),
        skipDuplicates: true,
      });
    }
    console.log(`  ✅ ${allTariffs.length} kalem "Kurumlar" tarifesine eklendi`);

  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const tenantAUrl = process.env.DATABASE_URL_TENANT_A;
  const tenantBUrl = process.env.DATABASE_URL_TENANT_B;

  if (!tenantAUrl || !tenantBUrl) throw new Error('DATABASE_URL_TENANT_A ve DATABASE_URL_TENANT_B gerekli');

  await migrateAndSeed(tenantAUrl, '00000000-0000-0000-0000-000000000001', 'Tenant A');
  await migrateAndSeed(tenantBUrl, '00000000-0000-0000-0000-000000000002', 'Tenant B');

  console.log('\n🎉 Migration ve seeding tamamlandı!');
}

main().catch(e => { console.error('❌ Hata:', e); process.exit(1); });
