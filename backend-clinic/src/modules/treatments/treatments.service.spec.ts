import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TreatmentsService } from './treatments.service';
import { TreatmentRepository } from './treatment.repository';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { AuditLogService } from '../../common/services/audit-log.service';

/**
 * Tamamlanmış bir tedavi kaleminin iptali/hekim değişikliği yetkilendirme
 * kurallarını doğrular (prim/komisyon sistemi kaldırıldı — bkz. scope-reduction
 * kararı; bu kalemler artık yalnızca Süper Admin kısıtına tabidir).
 */
describe('TreatmentsService — İptal Yetkilendirme', () => {
  let service: TreatmentsService;

  const clinicId = 'clinic-a';

  let treatmentItems: any[];
  let auditLogs: any[];

  function makeMockTx() {
    return {
      treatmentItem: {
        findFirst: jest.fn(({ where }: any) => {
          if (where.id) return Promise.resolve(treatmentItems.find((i) => i.id === where.id && i.plan.clinicId === where.plan.clinicId) || null);
          return Promise.resolve(
            treatmentItems.find((i) => (where.id?.in || []).includes(i.id) && i.plan.clinicId === where.plan.clinicId) || null,
          );
        }),
        findMany: jest.fn(({ where }: any) =>
          Promise.resolve(treatmentItems.filter((i) => (where.id?.in || []).includes(i.id) && i.plan.clinicId === where.plan.clinicId)),
        ),
        update: jest.fn(({ where, data }: any) => {
          const item = treatmentItems.find((i) => i.id === where.id);
          Object.assign(item, data);
          return Promise.resolve({ ...item });
        }),
        deleteMany: jest.fn(({ where }: any) => {
          const ids: string[] = where.id.in;
          treatmentItems = treatmentItems.filter((i) => !ids.includes(i.id));
          return Promise.resolve({ count: ids.length });
        }),
      },
      treatmentPlan: {
        update: jest.fn(() => Promise.resolve({})),
      },
      patient: {
        update: jest.fn(() => Promise.resolve({})),
      },
      paymentDistribution: {
        createMany: jest.fn(() => Promise.resolve({ count: 0 })),
      },
    };
  }

  beforeEach(async () => {
    treatmentItems = [
      { id: 'item-completed', status: 'COMPLETED', doctorId: 'doctor-1', price: 1000, planId: 'plan-1', plan: { clinicId, patientId: 'patient-1', status: 'ACTIVE' }, paymentDistributions: [] },
      { id: 'item-pending', status: 'PENDING', doctorId: 'doctor-1', price: 500, planId: 'plan-1', plan: { clinicId, patientId: 'patient-1', status: 'ACTIVE' }, paymentDistributions: [] },
    ];
    auditLogs = [];

    const mockTx = makeMockTx();
    const mockTenantClient = {
      $transaction: jest.fn((cb: any) => cb(mockTx)),
      // updateItemDoctor işlemsiz (non-transactional) çalışır — aynı veri kümesine erişir.
      treatmentItem: mockTx.treatmentItem,
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TreatmentsService,
        { provide: TreatmentRepository, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: TenantPrismaService, useValue: { getClient: jest.fn().mockResolvedValue(mockTenantClient) } },
        { provide: AuditLogService, useValue: { log: jest.fn((data: any) => { auditLogs.push(data); return Promise.resolve(); }) } },
      ],
    }).compile();

    service = moduleRef.get(TreatmentsService);
  });

  describe('updateItemStatus — Tamamlandı kalemde iptal/geri alma', () => {
    it('standart kullanıcı (SUPERADMIN olmayan) tamamlanmış kalemi iptal EDEMEZ', async () => {
      await expect(
        service.updateItemStatus('item-completed', clinicId, { status: 'CANCELLED' } as any, 'user-1', 'ADMIN'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Superadmin tamamlanmış kalemi iptal edebilir ve audit log yazılır', async () => {
      const result = await service.updateItemStatus('item-completed', clinicId, { status: 'CANCELLED' } as any, 'superadmin-1', 'SUPERADMIN');
      expect(result.status).toBe('CANCELLED');
      expect(auditLogs.some((l) => l.action === 'TREATMENT_ITEM_STATUS_ROLLBACK')).toBe(true);
    });

    it('tamamlanmamış (PENDING) kalemi standart kullanıcı serbestçe iptal edebilir', async () => {
      const result = await service.updateItemStatus('item-pending', clinicId, { status: 'CANCELLED' } as any, 'user-1', 'ADMIN');
      expect(result.status).toBe('CANCELLED');
      expect(auditLogs.some((l) => l.action === 'TREATMENT_ITEM_CANCELLED')).toBe(true);
    });
  });

  describe('deleteItems — Tamamlanmış kalem silme yetkilendirmesi', () => {
    it('standart kullanıcı tamamlanmış kalemi SİLEMEZ (reallocate=true olsa dahi)', async () => {
      await expect(service.deleteItems(['item-completed'], clinicId, true, 'user-1', 'ADMIN')).rejects.toThrow(ForbiddenException);
    });

    it('Superadmin tamamlanmış kalemi silebilir (reallocate=true)', async () => {
      const result = await service.deleteItems(['item-completed'], clinicId, true, 'superadmin-1', 'SUPERADMIN');
      expect(result.success).toBe(true);
      expect(auditLogs.some((l) => l.action === 'TREATMENT_ITEMS_DELETED')).toBe(true);
    });
  });

  describe('updateItemDoctor — Audit log', () => {
    it('hekim değişikliğinde audit log kaydı oluşturulur', async () => {
      await service.updateItemDoctor('item-pending', clinicId, { doctorId: 'doctor-2' } as any, 'user-1');
      expect(auditLogs.some((l) => l.action === 'TREATMENT_ITEM_DOCTOR_CHANGED')).toBe(true);
    });
  });
});
