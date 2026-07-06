import { PrismaClient } from '@prisma/client';
import { PrismaClient as TenantPrismaClient } from '../src/prisma/tenant-client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const TURKISH_MONTHS: Record<string, number> = {
  'Ocak': 1, 'Şubat': 2, 'Mart': 3, 'Nisan': 4, 'Mayıs': 5, 'Haziran': 6,
  'Temmuz': 7, 'Ağustos': 8, 'Eylül': 9, 'Ekim': 10, 'Kasım': 11, 'Aralık': 12,
};

function parseBirthDate(raw: string): Date | null {
  const trimmed = raw.trim();

  let m = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  }

  m = trimmed.match(/^(\d{1,2}) (\S+) (\d{4})$/);
  if (m) {
    const [, dd, monthName, yyyy] = m;
    const mm = TURKISH_MONTHS[monthName];
    if (mm) return new Date(Date.UTC(Number(yyyy), mm - 1, Number(dd)));
  }

  return null;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('90') && local.length === 12) local = local.slice(2);
  if (local.startsWith('0') && local.length === 11) local = local.slice(1);

  if (local.length === 10) {
    return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
  }

  // Malformed source row (too short/long) - keep cleaned digits rather than dropping the record.
  return digits.startsWith('0') ? digits : `0${digits}`;
}

interface ParsedPatient {
  fileNo: number;
  firstName: string;
  lastName: string;
  nationalId: string | null;
  phone: string;
  bloodGroup: string | null;
  birthDate: Date | null;
  gender: string | null;
  nationality: string;
}

async function main() {
  const filePath = path.join(__dirname, '../../Test Data/hastalar.md');
  console.log(`Reading patients from: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');
  const items: ParsedPatient[] = [];

  // Table columns (source): | UYRUK | TCNO | DOSYANO | ADI | SOYADI | CINSIYET | KANGURUBU | DOGUMTARIHI | CEPTELEFONU |
  // Splitting on '|' yields: [0]='' [1]=UYRUK [2]=TCNO [3]=DOSYANO [4]=ADI [5]=SOYADI [6]=CINSIYET [7]=KANGURUBU [8]=DOGUMTARIHI [9]=CEPTELEFONU
  for (const line of lines) {
    if (!line.includes('|')) continue;
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 10) continue;

    const uyruk = parts[1].replace(/\*\*/g, '').trim();
    if (!uyruk || uyruk.startsWith('-') || uyruk === 'UYRUK') continue;

    const fileNoRaw = parts[3];
    const fileNo = parseInt(fileNoRaw, 10);
    if (!Number.isFinite(fileNo)) continue;

    const firstName = parts[4].replace(/\*\*/g, '').trim();
    const lastName = parts[5].replace(/\*\*/g, '').trim();
    if (!firstName || !lastName) continue;

    let nationalId: string | null = parts[2].trim();
    if (nationalId === '0' || nationalId === '') nationalId = null;

    const gender = parts[6].trim() || null;
    const bloodGroup = parts[7].trim() || null;
    const birthDate = parseBirthDate(parts[8]);
    const phone = normalizePhone(parts[9]);

    items.push({
      fileNo,
      firstName,
      lastName,
      nationalId,
      phone,
      bloodGroup,
      birthDate,
      gender,
      nationality: 'Türkiye',
    });
  }

  console.log(`Parsed ${items.length} patients.`);
  if (items.length > 0) {
    console.log('Sample parsed patient:', items[0]);
  } else {
    console.error('No items parsed! Please check markdown table format.');
    process.exit(1);
  }

  const clinics = await prisma.clinic.findMany();
  const BATCH_SIZE = 1000;

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

      let inserted = 0;
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const result = await tenantDb.patient.createMany({
          data: batch.map(item => ({
            clinicId: clinic.id,
            fileNo: item.fileNo,
            firstName: item.firstName,
            lastName: item.lastName,
            nationalId: item.nationalId,
            phone: item.phone,
            bloodGroup: item.bloodGroup,
            birthDate: item.birthDate,
            gender: item.gender,
            nationality: item.nationality,
          })),
          skipDuplicates: true,
        });
        inserted += result.count;
        console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: inserted ${result.count}/${batch.length} (running total: ${inserted})`);
      }

      console.log(`  Done: Patients inserted: ${inserted} (skipped as duplicates: ${items.length - inserted})`);
    } catch (err: any) {
      console.error(`  Error processing clinic tenant DB: ${err.message}`);
    } finally {
      await tenantDb.$disconnect();
    }
  }

  console.log('\nPatients seeding completed successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
