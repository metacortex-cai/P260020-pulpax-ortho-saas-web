import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

async function main() {
  const email = process.env.ADMIN_EMAIL || 'envernehir@gmail.com';
  const newPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!newPassword) {
    throw new Error('[SECURITY] ADMIN_SEED_PASSWORD ortam değişkeni tanımlanmamış.');
  }
  const emailHash = hashEmail(email);
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  const updatedUser = await prisma.user.update({
    where: { emailHash },
    data: { password: hashedPassword }
  });
  
  console.log(`✅ Password updated for user: ${email}`);
  console.log(`User ID: ${updatedUser.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
