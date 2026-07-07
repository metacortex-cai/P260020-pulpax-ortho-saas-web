import { Test, TestingModule } from '@nestjs/testing';
import { PrimService } from './prim.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

/**
 * ADR-003 Faz 3: Hekim Prim Sistemi v2 — 4 model hesaplama, kategori/toplu oran,
 * idempotency ve hedef bazlı prim (PROVISIONAL) davranışını doğrular.
 */
describe('PrimService — Prim Motoru v2 (ADR-003 Faz 3)', () => {
  let service: PrimService;

  const clinicId = 'clinic-a';
  const employeeId = 'doctor-1';

  let contracts: any[];
  let categoryRates: any[];
  let itemFees: any[];
  let treatmentItems: any[];
  let primRecords: any[];
  let targetLedgers: any[];
  let paymentDistributions: any[];
  let idCounter: number;

  function makeMockTenantClient() {
    return {
      employeeContract: {
        findFirst: jest.fn(({ where }: any) =>
          Promise.resolve(contracts.find((c) => c.clinicId === where.clinicId && c.employeeId === where.employeeId) || null),
        ),
      },
      employeeContractCategoryRate: {
        findUnique: jest.fn(({ where }: any) => {
          const key = where.contractId_category;
          return Promise.resolve(
            categoryRates.find((r) => r.contractId === key.contractId && r.category === key.category) || null,
          );
        }),
      },
      employeeContractItemFee: {
        findUnique: jest.fn(({ where }: any) => {
          const key = where.contractId_masterTreatmentId;
          return Promise.resolve(
            itemFees.find((f) => f.contractId === key.contractId && f.masterTreatmentId === key.masterTreatmentId) || null,
          );
        }),
      },
      treatmentItem: {
        findUnique: jest.fn(({ where }: any) => Promise.resolve(treatmentItems.find((t) => t.id === where.id) || null)),
      },
      primRecord: {
        findUnique: jest.fn(({ where }: any) =>
          Promise.resolve(primRecords.find((p) => p.idempotencyKey === where.idempotencyKey) || null),
        ),
        create: jest.fn(({ data }: any) => {
          const rec = { id: `prim-${++idCounter}`, calculatedAt: new Date(), ...data };
          primRecords.push(rec);
          return Promise.resolve(rec);
        }),
      },
      doctorTargetLedger: {
        upsert: jest.fn(({ where, update, create }: any) => {
          const key = where.clinicId_employeeId_period;
          const existing = targetLedgers.find(
            (l) => l.clinicId === key.clinicId && l.employeeId === key.employeeId && l.period === key.period,
          );
          if (existing) {
            if (update.actualRevenue?.increment !== undefined) {
              existing.actualRevenue += update.actualRevenue.increment;
            }
            return Promise.resolve({ ...existing });
          }
          const rec = { id: `ledger-${++idCounter}`, ...create };
          targetLedgers.push(rec);
          return Promise.resolve({ ...rec });
        }),
      },
      paymentDistribution: {
        findMany: jest.fn(({ where }: any) =>
          Promise.resolve(paymentDistributions.filter((d) => d.treatmentItemId === where.treatmentItemId)),
        ),
      },
    };
  }

  beforeEach(async () => {
    idCounter = 0;
    contracts = [
      {
        id: 'contract-1',
        clinicId,
        employeeId,
        type: 'MODEL_1',
        rate: 10,
        rateMode: 'BULK',
        targetEnabled: false,
        targetAmount: null,
        validFrom: new Date('2020-01-01'),
        validUntil: null,
      },
    ];
    categoryRates = [];
    itemFees = [];
    treatmentItems = [
      {
        id: 'item-1',
        status: 'COMPLETED',
        doctorId: employeeId,
        tariff: { masterTreatmentId: 'master-1', masterTreatment: { category: 'Cerrahi' } },
      },
      {
        id: 'item-pending',
        status: 'PENDING',
        doctorId: employeeId,
        tariff: { masterTreatmentId: 'master-2', masterTreatment: { category: 'Cerrahi' } },
      },
    ];
    primRecords = [];
    targetLedgers = [];
    paymentDistributions = [];

    const mockClient = makeMockTenantClient();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [PrimService, { provide: TenantPrismaService, useValue: { getClient: jest.fn().mockResolvedValue(mockClient) } }],
    }).compile();

    service = moduleRef.get(PrimService);
  });

  describe('Model-1 (Yüzde Bazlı — Toplu Oran)', () => {
    it('ödenen tutar üzerinden toplu oranla prim hesaplar', async () => {
      const record = await service.calculateForDistribution({
        clinicId,
        employeeId,
        treatmentItemId: 'item-1',
        distributionId: 'dist-1',
        amount: 1000,
      });
      expect(Number(record.amount)).toBe(100); // 1000 * %10
      expect(record.status).toBe('CONFIRMED');
      expect(record.period).toMatch(/^\d{4}-\d{2}$/);
    });

    it('aynı dağıtım için ikinci kez çağrılınca yeni kayıt OLUŞTURMAZ (idempotency)', async () => {
      await service.calculateForDistribution({ clinicId, employeeId, treatmentItemId: 'item-1', distributionId: 'dist-1', amount: 1000 });
      const second = await service.calculateForDistribution({ clinicId, employeeId, treatmentItemId: 'item-1', distributionId: 'dist-1', amount: 1000 });
      expect(primRecords).toHaveLength(1);
      expect(second.id).toBe(primRecords[0].id);
    });

    it('kalem henüz COMPLETED değilse prim hesaplamaz (avans/bekleyen ödeme)', async () => {
      const record = await service.calculateForDistribution({
        clinicId,
        employeeId,
        treatmentItemId: 'item-pending',
        distributionId: 'dist-2',
        amount: 500,
      });
      expect(record).toBeNull();
      expect(primRecords).toHaveLength(0);
    });

    it('aktif sözleşmesi olmayan çalışan için prim hesaplamaz', async () => {
      const record = await service.calculateForDistribution({
        clinicId,
        employeeId: 'no-contract-employee',
        treatmentItemId: 'item-1',
        distributionId: 'dist-3',
        amount: 1000,
      });
      expect(record).toBeNull();
    });
  });

  describe('Model-1 (Kategori Bazlı Oran)', () => {
    it('rateMode=CATEGORY iken kategoriye özel oranı kullanır', async () => {
      contracts[0].rateMode = 'CATEGORY';
      categoryRates.push({ contractId: 'contract-1', category: 'Cerrahi', rate: 25 });

      const record = await service.calculateForDistribution({
        clinicId,
        employeeId,
        treatmentItemId: 'item-1',
        distributionId: 'dist-cat',
        amount: 1000,
      });
      expect(Number(record.amount)).toBe(250); // 1000 * %25
    });

    it('kategoriye özel oran tanımlı değilse toplu orana düşer (fallback)', async () => {
      contracts[0].rateMode = 'CATEGORY'; // categoryRates boş bırakıldı

      const record = await service.calculateForDistribution({
        clinicId,
        employeeId,
        treatmentItemId: 'item-1',
        distributionId: 'dist-fallback',
        amount: 1000,
      });
      expect(Number(record.amount)).toBe(100); // contract.rate (%10) fallback
    });
  });

  describe('Model-4 (Kalem Başına Sabit Ücret)', () => {
    it('ödenen tutardan bağımsız, tanımlı sabit ücreti kullanır', async () => {
      contracts[0].type = 'MODEL_4';
      itemFees.push({ contractId: 'contract-1', masterTreatmentId: 'master-1', fixedFee: 750 });

      const record = await service.calculateForDistribution({
        clinicId,
        employeeId,
        treatmentItemId: 'item-1',
        distributionId: 'dist-m4-1',
        amount: 50, // kısmi ödeme — tutar önemsiz
      });
      expect(Number(record.amount)).toBe(750);
    });

    it('aynı kalem için farklı dağıtımlarla ikinci kez tetiklenince tekrar ücret YAZMAZ', async () => {
      contracts[0].type = 'MODEL_4';
      itemFees.push({ contractId: 'contract-1', masterTreatmentId: 'master-1', fixedFee: 750 });

      await service.calculateForDistribution({ clinicId, employeeId, treatmentItemId: 'item-1', distributionId: 'dist-m4-a', amount: 300 });
      await service.calculateForDistribution({ clinicId, employeeId, treatmentItemId: 'item-1', distributionId: 'dist-m4-b', amount: 450 });

      expect(primRecords).toHaveLength(1); // kalem bazlı idempotency — sadece bir kez
      expect(Number(primRecords[0].amount)).toBe(750);
    });
  });

  describe('Hedef Bazlı Prim Sistemi', () => {
    it('targetEnabled=true ise kayıt PROVISIONAL durumda oluşur ve ciro ledger\'a işlenir', async () => {
      contracts[0].targetEnabled = true;
      contracts[0].targetAmount = 5000;

      const record = await service.calculateForDistribution({
        clinicId,
        employeeId,
        treatmentItemId: 'item-1',
        distributionId: 'dist-target',
        amount: 1000,
      });

      expect(record.status).toBe('PROVISIONAL');
      expect(targetLedgers).toHaveLength(1);
      expect(targetLedgers[0].actualRevenue).toBe(1000);
      expect(targetLedgers[0].targetAmount).toBe(5000);
    });
  });

  describe('reconcileCompletedItem — Geriye Dönük Mutabakat', () => {
    it('kalem tamamlanmadan önce düşmüş ödeme dağıtımlarını tarayıp primler', async () => {
      paymentDistributions = [
        { id: 'dist-early-1', treatmentItemId: 'item-1', amount: 400 },
        { id: 'dist-early-2', treatmentItemId: 'item-1', amount: 600 },
      ];

      const results = await service.reconcileCompletedItem(clinicId, employeeId, 'item-1');
      expect(results).toHaveLength(2);
      expect(primRecords).toHaveLength(2);
      const total = primRecords.reduce((sum, r) => sum + Number(r.amount), 0);
      expect(total).toBe(100); // (400+600) * %10
    });

    it('zaten primlenmiş dağıtımları tekrar primlemez', async () => {
      paymentDistributions = [{ id: 'dist-once', treatmentItemId: 'item-1', amount: 400 }];

      await service.reconcileCompletedItem(clinicId, employeeId, 'item-1');
      await service.reconcileCompletedItem(clinicId, employeeId, 'item-1');

      expect(primRecords).toHaveLength(1);
    });
  });
});
