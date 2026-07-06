import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clinics = await prisma.clinic.findMany();
  console.log(`Total clinics: ${clinics.length}`);
  clinics.forEach(c => {
    console.log(`Clinic: ${c.name}`);
    console.log(`  ID: ${c.id}`);
    console.log(`  Status: ${c.status}`);
    console.log(`  DB URL: ${c.databaseUrl}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
