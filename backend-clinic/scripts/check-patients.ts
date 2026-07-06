import 'dotenv/config';
const { PrismaClient } = require('../src/prisma/tenant-client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const patients = await prisma.patient.findMany({ take: 10, orderBy: { createdAt: 'asc' }, select: { id: true, fileNo: true, firstName: true, lastName: true, createdAt: true } });
    console.log('Sample patients:', patients);
  } catch (err) {
    console.error('Failed to read patients:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
