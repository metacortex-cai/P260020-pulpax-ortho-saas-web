import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  console.log('PostgreSQL bağlantısı kuruluyor...');
  await prisma.$connect();
  console.log('Bağlantı başarılı. RLS politikaları uygulanıyor...');

  const tableExists = async (table: string) => {
    const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS "exists";`,
      table,
    );

    return result[0]?.exists === true;
  };

  const tablesWithClinicId = [
    'users',
    'patients',
    'appointments',
    'dental_chairs',
    'tariffs',
    'treatment_plans',
    'employee_leaves',
    'employee_work_hours',
    'consent_logs',
    'audit_logs',
    'sms_purchases',
    'clinic_invoices',
    'employee_contracts',
    'prim_records',
    'clinic_integrations',
    'parasut_sync_logs',
    'notifications',
    'warehouses',
    'inventory_items',
    'inventory_stocks',
    'inventory_batches',
    'stock_movements',
    'patient_documents',
    'labs',
    'expense_categories',
    'expenses',
    'ortho_cases'
  ];

  for (const table of tablesWithClinicId) {
    if (!(await tableExists(table))) {
      console.log(`- ${table} tablosu bulunamadı, atlanıyor...`);
      continue;
    }

    console.log(`- ${table} tablosu için RLS aktif ediliyor...`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON "${table}";`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON "${table}"
      USING (clinic_id = NULLIF(current_setting('app.current_clinic_id', true), ''));
    `);
  }

  // Alt tablolar (Doğrudan clinicId barındırmayan, üst ilişkiye bağlı tablolar)

  // 1. treatment_items -> treatment_plans
  if (await tableExists('treatment_items')) {
    console.log('- treatment_items tablosu için RLS aktif ediliyor...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "treatment_items" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "treatment_items" FORCE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON "treatment_items";`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON "treatment_items"
      USING (EXISTS (
        SELECT 1 FROM "treatment_plans"
        WHERE "treatment_plans".id = plan_id
          AND "treatment_plans".clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')
      ));
    `);
  }

  // 2. payments -> patients
  if (await tableExists('payments')) {
    console.log('- payments tablosu için RLS aktif ediliyor...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON "payments";`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON "payments"
      USING (EXISTS (
        SELECT 1 FROM "patients"
        WHERE "patients".id = patient_id
          AND "patients".clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')
      ));
    `);
  }

  // 3. payment_distributions -> payments
  if (await tableExists('payment_distributions')) {
    console.log('- payment_distributions tablosu için RLS aktif ediliyor...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "payment_distributions" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "payment_distributions" FORCE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON "payment_distributions";`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON "payment_distributions"
      USING (EXISTS (
        SELECT 1 FROM "payments"
        WHERE "payments".id = payment_id
      ));
    `);
  }

  // 4. protocols -> treatment_items
  if (await tableExists('protocols')) {
    console.log('- protocols tablosu için RLS aktif ediliyor...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "protocols" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "protocols" FORCE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON "protocols";`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON "protocols"
      USING (EXISTS (
        SELECT 1 FROM "treatment_items"
        WHERE "treatment_items".id = treatment_item_id
      ));
    `);
  }

  // 5. lab_orders -> treatment_items
  if (await tableExists('lab_orders')) {
    console.log('- lab_orders tablosu için RLS aktif ediliyor...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "lab_orders" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "lab_orders" FORCE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON "lab_orders";`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON "lab_orders"
      USING (EXISTS (
        SELECT 1 FROM "treatment_items"
        WHERE "treatment_items".id = treatment_item_id
      ));
    `);
  }

  // 6. implant_records -> patients
  if (await tableExists('implant_records')) {
    console.log('- implant_records tablosu için RLS aktif ediliyor...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "implant_records" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "implant_records" FORCE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON "implant_records";`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON "implant_records"
      USING (EXISTS (
        SELECT 1 FROM "patients"
        WHERE "patients".id = patient_id
          AND "patients".clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')
      ));
    `);
  }

  // 7. Ortodonti alt tabloları -> ortho_cases (case_id üzerinden)
  const orthoCaseChildTables = [
    'ortho_diagnoses',
    'ortho_record_sets',
    'ortho_treatment_tracks',
    'ortho_mini_screw_records',
    'ortho_growth_assessments',
    'ortho_retention_plans',
  ];

  for (const table of orthoCaseChildTables) {
    if (!(await tableExists(table))) {
      console.log(`- ${table} tablosu bulunamadı, atlanıyor...`);
      continue;
    }

    console.log(`- ${table} tablosu için RLS aktif ediliyor...`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON "${table}";`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON "${table}"
      USING (EXISTS (
        SELECT 1 FROM "ortho_cases"
        WHERE "ortho_cases".id = case_id
          AND "ortho_cases".clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')
      ));
    `);
  }

  // 8. Ortodonti track alt tabloları -> ortho_treatment_tracks (track_id üzerinden)
  const orthoTrackChildTables = [
    'ortho_adjustment_visits',
    'ortho_activation_logs',
    'ortho_aligner_sets',
  ];

  for (const table of orthoTrackChildTables) {
    if (!(await tableExists(table))) {
      console.log(`- ${table} tablosu bulunamadı, atlanıyor...`);
      continue;
    }

    console.log(`- ${table} tablosu için RLS aktif ediliyor...`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON "${table}";`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON "${table}"
      USING (EXISTS (
        SELECT 1 FROM "ortho_treatment_tracks"
        WHERE "ortho_treatment_tracks".id = track_id
      ));
    `);
  }

  await prisma.$disconnect();
  console.log('Tüm RLS politikaları başarıyla uygulandı.');
}

main().catch((err) => {
  console.error('RLS politikaları uygulanırken hata oluştu:', err);
  process.exit(1);
});
