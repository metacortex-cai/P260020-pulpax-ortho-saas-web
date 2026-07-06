import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY is required for seeding.');
}
if (!process.env.SEED_ADMIN_PASSWORD) {
  throw new Error('SEED_ADMIN_PASSWORD is required for seeding.');
}
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 12;

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

async function main() {
  console.log('🌱 Starting database seeding for Master DB...');

  const CLINIC_A_ID = '00000000-0000-0000-0000-000000000001';
  const CLINIC_B_ID = '00000000-0000-0000-0000-000000000002';

  // 1. Create/Upsert Clinics with Tenant Database Connections
  const tenantAUrl = process.env.DATABASE_URL_TENANT_A;
  const tenantBUrl = process.env.DATABASE_URL_TENANT_B;

  if (!tenantAUrl || !tenantBUrl) {
    throw new Error('DATABASE_URL_TENANT_A and DATABASE_URL_TENANT_B environment variables are required for seeding.');
  }

  const clinicA = await prisma.clinic.upsert({
    where: { id: CLINIC_A_ID },
    update: {
      databaseUrl: tenantAUrl,
      status: 'ACTIVE',
      plan: 'ENTERPRISE',
    },
    create: {
      id: CLINIC_A_ID,
      name: 'Pulpax Klinik A',
      taxId: '1111111111',
      databaseUrl: tenantAUrl,
      status: 'ACTIVE',
      plan: 'ENTERPRISE',
      subscriptionEndDate: new Date('2027-12-31'),
    },
  });

  const clinicB = await prisma.clinic.upsert({
    where: { id: CLINIC_B_ID },
    update: {
      databaseUrl: tenantBUrl,
      status: 'ACTIVE',
      plan: 'PRO',
    },
    create: {
      id: CLINIC_B_ID,
      name: 'Pulpax Klinik B',
      taxId: '2222222222',
      databaseUrl: tenantBUrl,
      status: 'ACTIVE',
      plan: 'PRO',
      subscriptionEndDate: new Date('2026-12-31'),
    },
  });

  console.log('✅ Created Clinics A and B in Master DB.');

  const hashPassword = async (password: string) => {
    return bcrypt.hash(password, 10);
  };

  // 2. Create SAAS Master Admin (Enver Nehir - Superadmin with encrypted email)
  const masterEmail = 'envernehir@gmail.com';
  const masterEmailHash = hashEmail(masterEmail);
  const masterEmailEncrypted = encrypt(masterEmail);

  // Clean old master admin to prevent duplicates
  const oldEmailHash = hashEmail('ozgurciftci@gmail.com');
  await prisma.user.deleteMany({
    where: { emailHash: oldEmailHash }
  });

  const saasAdmin = await prisma.user.upsert({
    where: { emailHash: masterEmailHash },
    update: {
      firstName: 'Enver',
      lastName: 'Nehir',
      email: masterEmailEncrypted,
      role: 'SAAS_SUPERADMIN',
      password: await hashPassword(process.env.SEED_ADMIN_PASSWORD),
    },
    create: {
      firstName: 'Enver',
      lastName: 'Nehir',
      email: masterEmailEncrypted,
      emailHash: masterEmailHash,
      password: await hashPassword(process.env.SEED_ADMIN_PASSWORD),
      role: 'SAAS_SUPERADMIN',
      isActive: true,
    },
  });

  console.log(`✅ Created SAAS Master Superadmin: ${saasAdmin.firstName} ${saasAdmin.lastName} (email encrypted & hashed in DB)`);

  // 3. Create normal clinic users mapped in Master DB
  const doctorEmail = 'doctor@pulpax.test';
  const doctor = await prisma.user.upsert({
    where: { emailHash: hashEmail(doctorEmail) },
    update: {
      password: await hashPassword(process.env.SEED_ADMIN_PASSWORD),
    },
    create: {
      clinicId: clinicA.id,
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      email: encrypt(doctorEmail),
      emailHash: hashEmail(doctorEmail),
      password: await hashPassword(process.env.SEED_ADMIN_PASSWORD),
      role: 'DOCTOR',
      isActive: true,
    },
  });

  // Mapped user-clinic
  await prisma.userClinic.upsert({
    where: { userId_clinicId: { userId: doctor.id, clinicId: clinicA.id } },
    update: {},
    create: {
      userId: doctor.id,
      clinicId: clinicA.id,
      role: 'DOCTOR',
    },
  });

  console.log(`✅ Created mapped clinic doctor: ${doctor.firstName} ${doctor.lastName}`);

  console.log('🌱 Master DB Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
