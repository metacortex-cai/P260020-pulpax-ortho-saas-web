import { PrismaClient } from '@prisma/client';
import { PrismaClient as TenantPrismaClient } from '../src/prisma/tenant-client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Master DB Users ---');
  const users = await prisma.user.findMany();
  for (const user of users) {
    console.log(`User: ${user.firstName} ${user.lastName} (${user.id}), Role: ${user.role}, ClinicId: ${user.clinicId}`);
  }
  
  console.log('--- Clinic A Mapped Users ---');
  const userClinics = await prisma.userClinic.findMany({ include: { user: true, clinic: true } });
  for (const uc of userClinics) {
    console.log(`UserClinic: User ${uc.user.firstName} ${uc.user.lastName} -> Clinic ${uc.clinic.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
