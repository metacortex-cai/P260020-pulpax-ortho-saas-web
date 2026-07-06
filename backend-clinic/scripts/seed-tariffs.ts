import { PrismaClient } from '@prisma/client';
import { PrismaClient as TenantPrismaClient } from '../src/prisma/tenant-client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '../../Test Data/tdb-2026.md');
  console.log(`Reading tariffs from: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');
  const items: Array<{
    sutCode: string;
    name: string;
    price: number;
    taxRate: number;
    currency: string;
    status: string;
  }> = [];

  for (const line of lines) {
    if (!line.trim().startsWith('|')) continue;
    const parts = line.split('|').map(p => p.trim());

    // Header check
    const rawKod = parts[1];
    if (!rawKod || rawKod.startsWith('**') || rawKod.startsWith('-') || rawKod === 'Kod') continue;

    const name = parts[2].replace(/\*\*/g, '').trim();
    const priceStr = parts[3].trim();
    const vatStr = parts[4].trim();
    const totalStr = parts[5].trim();
    const currency = parts[6].trim();
    const status = parts[7].trim();

    const price = parseFloat(priceStr) || 0;
    const vat = parseFloat(vatStr) || 0;
    
    let taxRate = 10;
    if (price > 0) {
      taxRate = Math.round((vat / price) * 100);
    }

    items.push({
      sutCode: rawKod,
      name,
      price,
      taxRate,
      currency,
      status
    });
  }

  console.log(`Parsed ${items.length} treatments/tariffs.`);
  if (items.length === 0) {
    console.error('No items parsed! Please check markdown table format.');
    process.exit(1);
  }

  // Fetch all clinics
  const clinics = await prisma.clinic.findMany();
  for (const clinic of clinics) {
    console.log(`\nProcessing clinic: ${clinic.name} (${clinic.id})`);
    if (!clinic.databaseUrl) {
      console.log(`  Skipping: No databaseUrl defined.`);
      continue;
    }

    const tenantDb = new TenantPrismaClient({
      datasources: { db: { url: clinic.databaseUrl } },
    });

    try {
      console.log(`  Connecting to tenant DB...`);
      await tenantDb.$connect();
      
      let createdMTCount = 0;
      let updatedMTCount = 0;
      let createdTCount = 0;
      let updatedTCount = 0;

      for (const item of items) {
        // 1. Find or create MasterTreatment
        let masterTreatment = await tenantDb.masterTreatment.findFirst({
          where: { sutCode: item.sutCode }
        });

        if (!masterTreatment) {
          masterTreatment = await tenantDb.masterTreatment.findFirst({
            where: { name: item.name }
          });
        }

        if (masterTreatment) {
          masterTreatment = await tenantDb.masterTreatment.update({
            where: { id: masterTreatment.id },
            data: { name: item.name, sutCode: item.sutCode }
          });
          updatedMTCount++;
        } else {
          masterTreatment = await tenantDb.masterTreatment.create({
            data: { name: item.name, sutCode: item.sutCode }
          });
          createdMTCount++;
        }

        // 2. Find or create Tariff
        let tariff = await tenantDb.tariff.findFirst({
          where: {
            clinicId: clinic.id,
            masterTreatmentId: masterTreatment.id
          }
        });

        if (tariff) {
          await tenantDb.tariff.update({
            where: { id: tariff.id },
            data: {
              price: item.price,
              taxRate: item.taxRate
            }
          });
          updatedTCount++;
        } else {
          await tenantDb.tariff.create({
            data: {
              clinicId: clinic.id,
              masterTreatmentId: masterTreatment.id,
              price: item.price,
              taxRate: item.taxRate
            }
          });
          createdTCount++;
        }
      }

      console.log(`  Done:`);
      console.log(`    MasterTreatments - Created: ${createdMTCount}, Updated: ${updatedMTCount}`);
      console.log(`    Tariffs - Created: ${createdTCount}, Updated: ${updatedTCount}`);
    } catch (err: any) {
      console.error(`  Error processing clinic tenant DB: ${err.message}`);
    } finally {
      await tenantDb.$disconnect();
    }
  }

  console.log('\nTariffs seeding completed successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
