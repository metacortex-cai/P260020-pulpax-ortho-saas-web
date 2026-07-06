import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LabService } from './lab.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

describe('LabService — Fiyatlandırma Kuralı ve Revizyon Zinciri', () => {
  let service: LabService;
  let orders: any[];
  let idCounter: number;

  function makeClient() {
    return {
      labOrder: {
        create: jest.fn(({ data }: any) => {
          const rec = { id: `order-${++idCounter}`, status: 'PENDING', ...data };
          orders.push(rec);
          return Promise.resolve(rec);
        }),
        findFirst: jest.fn(({ where }: any) =>
          Promise.resolve(orders.find((o) => o.id === where.id && o.clinicId === where.clinicId) || null)
        ),
        update: jest.fn(({ where, data }: any) => {
          const rec = orders.find((o) => o.id === where.id);
          Object.assign(rec, data);
          return Promise.resolve(rec);
        }),
      },
    };
  }

  beforeEach(async () => {
    idCounter = 0;
    orders = [];

    const mockTenantPrisma = { getClient: jest.fn(() => Promise.resolve(makeClient())) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [LabService, { provide: TenantPrismaService, useValue: mockTenantPrisma }],
    }).compile();

    service = moduleRef.get(LabService);
  });

  it('Yeni işlem için girilen maliyeti korur', async () => {
    const order = await service.createOrder('clinic-a', { processType: 'YENI', cost: 1500 } as any);
    expect(Number(order.cost)).toBe(1500);
  });

  it('Prova işleminin maliyetini her koşulda sıfırlar', async () => {
    const order = await service.createOrder('clinic-a', { processType: 'PROVA', cost: 999 } as any);
    expect(Number(order.cost)).toBe(0);
  });

  it('Revizyon işleminin maliyetini her koşulda sıfırlar', async () => {
    const order = await service.createOrder('clinic-a', { processType: 'REVIZYON', cost: 999 } as any);
    expect(Number(order.cost)).toBe(0);
  });

  it('Revizyon eklerken ana işlemi REVISION durumuna, yeni kaydı parent_id ile zincirler ve ücretsiz açar', async () => {
    const parent = await service.createOrder('clinic-a', { processType: 'YENI', cost: 2000, labId: 'lab-1', patientId: 'patient-1' } as any);

    const revision = await service.addRevision(parent.id, 'clinic-a', { description: 'Renk uyuşmazlığı' });

    expect(revision.parentId).toBe(parent.id);
    expect(revision.processType).toBe('REVIZYON');
    expect(Number(revision.cost)).toBe(0);
    expect(revision.labId).toBe('lab-1');
    expect(revision.patientId).toBe('patient-1');

    const updatedParent = orders.find((o) => o.id === parent.id);
    expect(updatedParent.status).toBe('REVISION');
  });

  it('Bilinmeyen bir işleme revizyon eklenmeye çalışılırsa hata fırlatır', async () => {
    await expect(service.addRevision('missing-order', 'clinic-a', {})).rejects.toThrow(NotFoundException);
  });

  it('İşlem Teslim Al: Giden kaydı otomatik olarak Gelen + RECEIVED yapar', async () => {
    const order = await service.createOrder('clinic-a', { processType: 'YENI', recordType: 'GIDEN' } as any);
    const delivered = await service.deliverOrder(order.id, 'clinic-a');

    expect(delivered.recordType).toBe('GELEN');
    expect(delivered.status).toBe('RECEIVED');
    expect(delivered.receivedDate).toBeInstanceOf(Date);
  });
});
