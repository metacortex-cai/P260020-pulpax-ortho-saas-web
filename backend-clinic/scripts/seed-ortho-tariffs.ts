// Pulpax Ortho: ortodonti prosedur/kademe katalogunu her klinigin tenant
// veritabanina MasterTreatment (category = "Ortodonti") + Tariff olarak yukler.
// Kaynak: dev_documents/ortodonti-tasarim/ortodonti-tedavi-akisi.html
// ("Tarife & Zorluk Seviyeleri" bolumu — gercek klinik fiyat listesinden derlendi).
//
// DIKKAT: Asagidaki fiyatlar PLACEHOLDER'dir. Klinik sahibinin gercek ucret
// tarifesi alindiginda guncellenmelidir (Tarifeler ekranindan veya bu script
// yeniden calistirilarak — script idempotenttir: var olan MasterTreatment'i
// gunceller, var olan Tariff'i ATLAR ki klinik-lokal fiyat degisiklikleri ezilmesin).
//
// Calistirma: npx ts-node scripts/seed-ortho-tariffs.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaClient as TenantPrismaClient } from '../src/prisma/tenant-client';

const masterPrisma = new PrismaClient();

interface OrthoTreatment {
  id: string;
  sutCode: string;
  name: string;
  // Placeholder fiyat (KDV haric, TRY)
  priceExclVat: number;
  vatRate: number;
}

const CATEGORY = 'Ortodonti';

export const ORTHO_TREATMENTS: OrthoTreatment[] = [
  // ── Sabit Tedavi — 5 zorluk seviyesi ────────────────────────────────────
  { id: 'ORT-SABIT-1', sutCode: 'ORT-SABIT-1', name: 'Sabit Ortodontik Tedavi - 1. Seviye (Hafif Çapraşıklık)', priceExclVat: 60000, vatRate: 10 },
  { id: 'ORT-SABIT-2', sutCode: 'ORT-SABIT-2', name: 'Sabit Ortodontik Tedavi - 2. Seviye (Çekimli / Border Lastikle Boşluk Kapatma)', priceExclVat: 75000, vatRate: 10 },
  { id: 'ORT-SABIT-3', sutCode: 'ORT-SABIT-3', name: 'Sabit Ortodontik Tedavi - 3. Seviye (Openbite / Şiddetli Deepbite / Unilateral Gömülü Diş)', priceExclVat: 90000, vatRate: 10 },
  { id: 'ORT-SABIT-4', sutCode: 'ORT-SABIT-4', name: 'Sabit Ortodontik Tedavi - 4. Seviye (Bilateral Gömülü Diş)', priceExclVat: 110000, vatRate: 10 },
  { id: 'ORT-SABIT-5', sutCode: 'ORT-SABIT-5', name: 'Sabit Ortodontik Tedavi - 5. Seviye (Gömülü Diş + Şiddetli Yer Darlığı)', priceExclVat: 130000, vatRate: 10 },

  // ── RME (Üst Çene Genişletme) — 3 zorluk seviyesi ───────────────────────
  { id: 'ORT-RME-1', sutCode: 'ORT-RME-1', name: 'RME (Üst Çene Genişletme) - 1. Seviye', priceExclVat: 25000, vatRate: 10 },
  { id: 'ORT-RME-2', sutCode: 'ORT-RME-2', name: 'RME (Üst Çene Genişletme) - 2. Seviye', priceExclVat: 32000, vatRate: 10 },
  { id: 'ORT-RME-K', sutCode: 'ORT-RME-K', name: 'RME (Üst Çene Genişletme) - Komplike (SARPE / FM ile Birlikte)', priceExclVat: 45000, vatRate: 10 },

  // ── Invisalign — 3 kapsam kademesi ──────────────────────────────────────
  { id: 'ORT-INV-LITE', sutCode: 'ORT-INV-LITE', name: 'Invisalign - Lite', priceExclVat: 85000, vatRate: 10 },
  { id: 'ORT-INV-MOD', sutCode: 'ORT-INV-MOD', name: 'Invisalign - Moderate', priceExclVat: 120000, vatRate: 10 },
  { id: 'ORT-INV-COMP', sutCode: 'ORT-INV-COMP', name: 'Invisalign - Comprehensive', priceExclVat: 160000, vatRate: 10 },

  // ── Fonksiyonel apareyler ───────────────────────────────────────────────
  { id: 'ORT-FM', sutCode: 'ORT-FM', name: 'FM (Yüz Maskesi)', priceExclVat: 30000, vatRate: 10 },
  { id: 'ORT-TWINBLOCK', sutCode: 'ORT-TWINBLOCK', name: 'Twinblock', priceExclVat: 35000, vatRate: 10 },

  // ── Ark kapsamina gore fiyatlanan kalemler ──────────────────────────────
  { id: 'ORT-RET-TEK', sutCode: 'ORT-RET-TEK', name: 'Retainer Teli - Tek Çene', priceExclVat: 6000, vatRate: 10 },
  { id: 'ORT-RET-CIFT', sutCode: 'ORT-RET-CIFT', name: 'Retainer Teli - Çift Çene', priceExclVat: 10000, vatRate: 10 },
  { id: 'ORT-HAP-TEK', sutCode: 'ORT-HAP-TEK', name: 'Hareketli Aparey - Tek Çene', priceExclVat: 12000, vatRate: 10 },
  { id: 'ORT-HAP-CIFT', sutCode: 'ORT-HAP-CIFT', name: 'Hareketli Aparey - Çift Çene', priceExclVat: 20000, vatRate: 10 },

  // ── Ek prosedurler & sinirli tedavi ─────────────────────────────────────
  { id: 'ORT-TAMIR', sutCode: 'ORT-TAMIR', name: 'Aparey Tamiri', priceExclVat: 3000, vatRate: 10 },
  { id: 'ORT-MINIVIDA', sutCode: 'ORT-MINIVIDA', name: 'Mini Vida (Adet)', priceExclVat: 5000, vatRate: 10 },
  { id: 'ORT-KISA', sutCode: 'ORT-KISA', name: 'Kısa Süreli Ortodontik Tedavi', priceExclVat: 45000, vatRate: 10 },
];

async function main() {
  const clinics = await masterPrisma.clinic.findMany();

  for (const clinic of clinics) {
    console.log(`\nProcessing clinic: ${clinic.name} (${clinic.id})`);
    if (!clinic.databaseUrl) {
      console.log('  Skipping: No databaseUrl.');
      continue;
    }

    const tenantDb = new TenantPrismaClient({
      datasources: { db: { url: clinic.databaseUrl } },
    });

    try {
      await tenantDb.$connect();

      let treatmentsCreated = 0;
      let tariffsCreated = 0;
      let tariffsSkipped = 0;

      for (const t of ORTHO_TREATMENTS) {
        const existing = await tenantDb.masterTreatment.findUnique({ where: { id: t.id } });
        await tenantDb.masterTreatment.upsert({
          where: { id: t.id },
          update: { name: t.name, sutCode: t.sutCode, category: CATEGORY },
          create: { id: t.id, name: t.name, sutCode: t.sutCode, category: CATEGORY },
        });
        if (!existing) treatmentsCreated++;

        const existingTariff = await tenantDb.tariff.findFirst({
          where: { clinicId: clinic.id, masterTreatmentId: t.id },
        });
        if (!existingTariff) {
          await tenantDb.tariff.create({
            data: {
              clinicId: clinic.id,
              masterTreatmentId: t.id,
              price: t.priceExclVat,
              taxRate: t.vatRate,
              status: 'AKTİF',
              currency: 'TRY',
            },
          });
          tariffsCreated++;
        } else {
          tariffsSkipped++;
        }
      }

      console.log(`  MasterTreatments created: ${treatmentsCreated}/${ORTHO_TREATMENTS.length}`);
      console.log(`  Tariffs created: ${tariffsCreated}, skipped (already exist): ${tariffsSkipped}`);
    } catch (err: any) {
      console.error(`  Error: ${err.message}`);
    } finally {
      await tenantDb.$disconnect();
    }
  }

  console.log('\nOrtodonti katalogu yükleme tamamlandı!');
}

main().catch(console.error).finally(() => masterPrisma.$disconnect());
