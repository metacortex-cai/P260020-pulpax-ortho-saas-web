import 'dotenv/config';
const { PrismaClient } = require('../src/prisma/tenant-client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Ensuring file_no column exists...');
    await prisma.$executeRawUnsafe(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS file_no integer;`);
    await prisma.$executeRawUnsafe(`UPDATE patients SET file_no = 0 WHERE file_no IS NULL;`);

    console.log('Assigning sequential file numbers (file_no) for patients per clinic...');
    await prisma.$executeRawUnsafe(`
      WITH numbered AS (
        SELECT id, clinic_id, ROW_NUMBER() OVER (PARTITION BY clinic_id ORDER BY created_at) as rn
        FROM patients
      )
      UPDATE patients p
      SET file_no = numbered.rn
      FROM numbered
      WHERE p.id = numbered.id;
    `);

    console.log('Attempting to add unique constraint patients_clinic_file_no_unique (if not exists)...');
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_clinic_file_no_unique') THEN
          ALTER TABLE patients ADD CONSTRAINT patients_clinic_file_no_unique UNIQUE (clinic_id, file_no);
        END IF;
      END
      $$;
    `);

    console.log('✅ File numbers assigned and constraint ensured.');
  } catch (err) {
    console.error('Failed to assign file numbers or add constraint:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
