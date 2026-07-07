import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PatientsService } from './patients.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OcrService } from './ocr.service';

/**
 * Bu suite, tenant DB *içindeki* kayıtların (diyagnoz/reçete/not/hasta
 * güncelleme) doğru şekilde `clinicId` ile sahiplik kontrolüne tabi tutulduğunu
 * doğrular — fiziksel tenant izolasyonunu değil (bkz. common/tests/tenant-leakage.spec.ts),
 * aynı tenant veritabanı içinde farklı kliniklere ait kayıtların birbirine
 * sızmadığını (IDOR) test eder.
 */
describe('PatientsService — Klinik Bazlı Kayıt Sahipliği (IDOR) Testleri', () => {
  let service: PatientsService;

  const clinicA = 'clinic-a';
  const clinicB = 'clinic-b';

  let patients: any[];
  let diagnoses: any[];
  let prescriptions: any[];
  let notes: any[];
  let idCounter: number;

  function makeMockTenantClient() {
    return {
      patient: {
        findFirst: jest.fn(({ where }: any) =>
          Promise.resolve(patients.find((p) => p.id === where.id && p.clinicId === where.clinicId) || null),
        ),
        updateMany: jest.fn(({ where, data }: any) => {
          const matches = patients.filter((p) => p.id === where.id && p.clinicId === where.clinicId);
          matches.forEach((p) => Object.assign(p, data));
          return Promise.resolve({ count: matches.length });
        }),
      },
      toothDiagnosis: {
        findFirst: jest.fn(({ where }: any) => Promise.resolve(findOwned(diagnoses, where))),
        findMany: jest.fn(({ where }: any) => Promise.resolve(diagnoses.filter((d) => d.patientId === where.patientId))),
        createMany: jest.fn(({ data }: any) => {
          (Array.isArray(data) ? data : [data]).forEach((d: any) => diagnoses.push({ id: `diag-${++idCounter}`, ...d }));
          return Promise.resolve({ count: 1 });
        }),
        delete: jest.fn(({ where }: any) => {
          diagnoses = diagnoses.filter((d) => d.id !== where.id);
          return Promise.resolve({});
        }),
      },
      patientPrescription: {
        findFirst: jest.fn(({ where }: any) => Promise.resolve(findOwned(prescriptions, where))),
        findMany: jest.fn(({ where }: any) => Promise.resolve(prescriptions.filter((p) => p.patientId === where.patientId))),
        create: jest.fn(({ data }: any) => {
          const rec = { id: `presc-${++idCounter}`, ...data };
          prescriptions.push(rec);
          return Promise.resolve(rec);
        }),
        delete: jest.fn(({ where }: any) => {
          prescriptions = prescriptions.filter((p) => p.id !== where.id);
          return Promise.resolve({});
        }),
      },
      patientNote: {
        findFirst: jest.fn(({ where }: any) => Promise.resolve(findOwned(notes, where))),
        findMany: jest.fn(({ where }: any) => Promise.resolve(notes.filter((n) => n.patientId === where.patientId))),
        delete: jest.fn(({ where }: any) => {
          notes = notes.filter((n) => n.id !== where.id);
          return Promise.resolve({});
        }),
      },
    };

    // "patient: { clinicId }" nested-relation filtresini simüle eder.
    function findOwned(list: any[], where: any) {
      const rec = list.find((r) => r.id === where.id);
      if (!rec) return null;
      const owner = patients.find((p) => p.id === rec.patientId);
      const requiredClinicId = where.patient?.clinicId;
      if (requiredClinicId && (!owner || owner.clinicId !== requiredClinicId)) return null;
      return rec;
    }
  }

  beforeEach(async () => {
    idCounter = 0;
    patients = [
      { id: 'patient-a', clinicId: clinicA, firstName: 'Ayşe' },
      { id: 'patient-b', clinicId: clinicB, firstName: 'Berk' },
    ];
    diagnoses = [{ id: 'diag-1', patientId: 'patient-a', toothNum: 11 }];
    prescriptions = [{ id: 'presc-1', patientId: 'patient-a', protocolNo: 'X' }];
    notes = [{ id: 'note-1', patientId: 'patient-a', content: 'gizli not' }];

    const mockClient = makeMockTenantClient();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: TenantPrismaService, useValue: { getClient: jest.fn().mockResolvedValue(mockClient) } },
        { provide: PrismaService, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: OcrService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(PatientsService);
  });

  describe('Diyagnoz kayıtları', () => {
    it('başka klinik bağlamıyla diyagnoz oluşturamaz', async () => {
      await expect(
        service.createDiagnoses('patient-a', { toothNums: [12], diagId: 'x', diagName: 'x', diagCategory: 'x' } as any, clinicB),
      ).rejects.toThrow(NotFoundException);
    });

    it('başka klinik bağlamıyla diyagnoz SİLEMEZ (IDOR)', async () => {
      await expect(service.deleteDiagnosis('diag-1', clinicB)).rejects.toThrow(NotFoundException);
      expect(diagnoses).toHaveLength(1);
    });
  });

  describe('Reçete kayıtları', () => {
    it('başka klinik bağlamıyla reçete SİLEMEZ (IDOR)', async () => {
      await expect(service.deletePrescription('presc-1', clinicB)).rejects.toThrow(NotFoundException);
      expect(prescriptions).toHaveLength(1);
    });
  });

  describe('Not kayıtları', () => {
    it('başka klinik bağlamıyla not SİLEMEZ (IDOR)', async () => {
      await expect(service.deleteNote('note-1', clinicB)).rejects.toThrow(NotFoundException);
      expect(notes).toHaveLength(1);
    });
  });

  describe('Hasta güncelleme (update DTO)', () => {
    it('başka klinik bağlamıyla hasta GÜNCELLEYEMEZ', async () => {
      await expect(service.update('patient-a', { firstName: 'Hacklendi' } as any, clinicB)).rejects.toThrow(
        NotFoundException,
      );
      expect(patients.find((p) => p.id === 'patient-a').firstName).toBe('Ayşe');
    });

    it('kendi kliniği hastasını güncelleyebilir', async () => {
      const updated = await service.update('patient-a', { firstName: 'Ayşe Yeni' } as any, clinicA);
      expect(updated.firstName).toBe('Ayşe Yeni');
    });
  });
});
