import 'dotenv/config';
import { PrismaClient } from '../src/prisma/tenant-client';

const tenantUrl = process.env.DATABASE_URL_TENANT_A;
if (!tenantUrl) throw new Error('DATABASE_URL_TENANT_A not set');

const p = new PrismaClient({
  datasources: { db: { url: tenantUrl } }
});

const PATIENT_ID = 'f4830485-2cf6-4311-b583-8149805aba14';
const CLINIC_ID = '00000000-0000-0000-0000-000000000001';
const DOCTOR_ID = '89d282a0-f3d5-4b10-a4b0-657fdc324c1a';

const TARIFF_IMPLANT = '1bdaa722-023d-4f9e-bf52-5c758636a2b9';  // İmplant - NucleOss (14500)
const TARIFF_ABUTMENT = 'f77905f6-4349-46d9-8b56-36159f938b78'; // Abutment (1818.18)
const TARIFF_EXTRACTION = '3c1f0bf7-e103-45e6-a3f6-c3f81a7c56f5'; // Diş Çekimi (2272.73)

const TEETH = [11, 12, 13, 21];

async function main() {
  console.log('Restoring 2 treatment plans for Zümra DEMİR...');

  // Delete any existing plans first just in case
  await p.treatmentItem.deleteMany({
    where: { plan: { patientId: PATIENT_ID } }
  });
  await p.treatmentPlan.deleteMany({
    where: { patientId: PATIENT_ID }
  });

  const singlePlanPrice = (14500 * 4) + (1818.18 * 4) + (2272.73 * 4);
  const totalPrice = singlePlanPrice * 2;

  // Create Plan 1
  const plan1 = await p.treatmentPlan.create({
    data: {
      clinicId: CLINIC_ID,
      patientId: PATIENT_ID,
      status: 'DRAFT',
      totalPrice: singlePlanPrice,
      items: {
        create: [
          ...TEETH.map(tooth => ({
            tariffId: TARIFF_IMPLANT,
            doctorId: DOCTOR_ID,
            toothNo: tooth,
            price: 14500,
            status: 'PENDING'
          })),
          ...TEETH.map(tooth => ({
            tariffId: TARIFF_ABUTMENT,
            doctorId: DOCTOR_ID,
            toothNo: tooth,
            price: 1818.18,
            status: 'PENDING'
          })),
          ...TEETH.map(tooth => ({
            tariffId: TARIFF_EXTRACTION,
            doctorId: DOCTOR_ID,
            toothNo: tooth,
            price: 2272.73,
            status: 'PENDING'
          }))
        ]
      }
    }
  });

  // Create Plan 2
  const plan2 = await p.treatmentPlan.create({
    data: {
      clinicId: CLINIC_ID,
      patientId: PATIENT_ID,
      status: 'DRAFT',
      totalPrice: singlePlanPrice,
      items: {
        create: [
          ...TEETH.map(tooth => ({
            tariffId: TARIFF_IMPLANT,
            doctorId: DOCTOR_ID,
            toothNo: tooth,
            price: 14500,
            status: 'PENDING'
          })),
          ...TEETH.map(tooth => ({
            tariffId: TARIFF_ABUTMENT,
            doctorId: DOCTOR_ID,
            toothNo: tooth,
            price: 1818.18,
            status: 'PENDING'
          })),
          ...TEETH.map(tooth => ({
            tariffId: TARIFF_EXTRACTION,
            doctorId: DOCTOR_ID,
            toothNo: tooth,
            price: 2272.73,
            status: 'PENDING'
          }))
        ]
      }
    }
  });

  // Update patient total debt
  await p.patient.update({
    where: { id: PATIENT_ID },
    data: { totalDebt: totalPrice }
  });

  console.log('Restoration complete!');
  console.log(`Created Plan 1: ${plan1.id}`);
  console.log(`Created Plan 2: ${plan2.id}`);
  console.log(`Updated patient debt to: ${totalPrice}`);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
