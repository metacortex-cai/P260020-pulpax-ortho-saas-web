import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashEmail(email: string) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

async function main() {
  const email = 'envernehir@gmail.com';
  const emailHash = hashEmail(email);
  const user = await prisma.user.findUnique({ where: { emailHash } });
  
  if (user) {
    console.log(`User found: ${user.id}, Role: ${user.role}`);
    
    if (user.role !== 'SAAS_SUPERADMIN') {
        console.log('Fixing user role to SAAS_SUPERADMIN...');
        await prisma.user.update({
            where: { id: user.id },
            data: { role: 'SAAS_SUPERADMIN' }
        });
        console.log('Role updated successfully.');
    }
  } else {
    console.log('User not found.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
