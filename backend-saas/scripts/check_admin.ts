import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

async function main() {
  const email = 'envernehir@gmail.com';
  const emailHash = hashEmail(email);
  
  console.log(`Checking for email: ${email}`);
  console.log(`Expected hash: ${emailHash}`);
  
  const user = await prisma.user.findUnique({
    where: { emailHash }
  });
  
  if (user) {
    console.log('✅ User found!');
    console.log(`ID: ${user.id}`);
    console.log(`Role: ${user.role}`);
    console.log(`IsActive: ${user.isActive}`);
  } else {
    console.log('❌ User NOT found in database.');
    const allUsers = await prisma.user.findMany({
      select: { emailHash: true, role: true }
    });
    console.log(`Total users in DB: ${allUsers.length}`);
    allUsers.forEach(u => console.log(` - ${u.emailHash} (${u.role})`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
