import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuditLogService } from '../../common/services/audit-log.service';

/**
 * ADR-003 kapsamında eklenen personel profili / iletişim / doküman
 * uçlarının klinik bazlı sahiplik kontrolünü (IDOR) doğrular — bkz.
 * patients.service.spec.ts ile aynı desen.
 */
describe('EmployeesService — Personel Profili / İletişim / Doküman (ADR-003)', () => {
  let service: EmployeesService;

  const clinicA = 'clinic-a';
  const clinicB = 'clinic-b';
  const employeeA = 'employee-a';

  let users: any[];
  let profiles: any[];
  let contacts: any[];
  let documents: any[];
  let leaves: any[];
  let entitlements: any[];
  let idCounter: number;

  function makeMockTenantClient() {
    return {
      employee: {
        findFirst: jest.fn(({ where }: any) =>
          Promise.resolve(users.find((u) => u.id === where.id && u.clinicId === where.clinicId) || null),
        ),
        findUnique: jest.fn(({ where }: any) =>
          Promise.resolve(users.find((u) => u.id === where.id) || null),
        ),
      },
      employeeProfile: {
        // Gerçek Prisma her sorguda bağımsız bir obje döner; testte "encrypted at rest"i
        // doğru doğrulayabilmek için burada da kopya döndürülür (aynı referans mutasyona açık olmasın).
        findUnique: jest.fn(({ where }: any) => {
          const rec = profiles.find((p) => p.employeeId === where.employeeId);
          return Promise.resolve(rec ? { ...rec } : null);
        }),
        upsert: jest.fn(({ where, update, create }: any) => {
          const existing = profiles.find((p) => p.employeeId === where.employeeId);
          if (existing) {
            Object.assign(existing, update);
            return Promise.resolve({ ...existing });
          }
          const rec = { id: `profile-${++idCounter}`, ...create };
          profiles.push(rec);
          return Promise.resolve({ ...rec });
        }),
      },
      employeeContact: {
        findMany: jest.fn(({ where }: any) =>
          Promise.resolve(contacts.filter((c) => c.employeeId === where.employeeId && c.clinicId === where.clinicId)),
        ),
        findFirst: jest.fn(({ where }: any) =>
          Promise.resolve(
            contacts.find((c) => c.id === where.id && c.employeeId === where.employeeId && c.clinicId === where.clinicId) || null,
          ),
        ),
        create: jest.fn(({ data }: any) => {
          const rec = { id: `contact-${++idCounter}`, ...data };
          contacts.push(rec);
          return Promise.resolve(rec);
        }),
        delete: jest.fn(({ where }: any) => {
          contacts = contacts.filter((c) => c.id !== where.id);
          return Promise.resolve({});
        }),
      },
      employeeDocument: {
        findMany: jest.fn(({ where }: any) =>
          Promise.resolve(documents.filter((d) => d.employeeId === where.employeeId && d.clinicId === where.clinicId)),
        ),
        findFirst: jest.fn(({ where }: any) =>
          Promise.resolve(
            documents.find((d) => d.id === where.id && d.employeeId === where.employeeId && d.clinicId === where.clinicId) || null,
          ),
        ),
        create: jest.fn(({ data }: any) => {
          const rec = { id: `doc-${++idCounter}`, ...data };
          documents.push(rec);
          return Promise.resolve(rec);
        }),
        delete: jest.fn(({ where }: any) => {
          documents = documents.filter((d) => d.id !== where.id);
          return Promise.resolve({});
        }),
      },
      employeeLeave: {
        findFirst: jest.fn(({ where }: any) =>
          Promise.resolve(leaves.find((l) => l.id === where.id && l.clinicId === where.clinicId) || null),
        ),
        findMany: jest.fn(({ where }: any) =>
          Promise.resolve(
            leaves.filter(
              (l) =>
                l.clinicId === where.clinicId &&
                l.employeeId === where.employeeId &&
                (!where.type || l.type === where.type) &&
                (!where.status || l.status === where.status) &&
                l.startAt >= where.startAt.gte &&
                l.startAt <= where.startAt.lte,
            ),
          ),
        ),
        update: jest.fn(({ where, data }: any) => {
          const rec = leaves.find((l) => l.id === where.id);
          Object.assign(rec, data);
          return Promise.resolve({ ...rec });
        }),
      },
      employeeLeaveEntitlement: {
        findUnique: jest.fn(({ where }: any) => {
          const key = where.clinicId_employeeId_year;
          const rec = entitlements.find((e) => e.clinicId === key.clinicId && e.employeeId === key.employeeId && e.year === key.year);
          return Promise.resolve(rec ? { ...rec } : null);
        }),
        upsert: jest.fn(({ where, update, create }: any) => {
          const key = where.clinicId_employeeId_year;
          const existing = entitlements.find((e) => e.clinicId === key.clinicId && e.employeeId === key.employeeId && e.year === key.year);
          if (existing) {
            Object.assign(existing, update);
            return Promise.resolve({ ...existing });
          }
          const rec = { id: `ent-${++idCounter}`, ...create };
          entitlements.push(rec);
          return Promise.resolve({ ...rec });
        }),
      },
    };
  }

  beforeEach(async () => {
    idCounter = 0;
    users = [
      { id: employeeA, clinicId: clinicA, firstName: 'Ayşe' },
      { id: 'employee-b', clinicId: clinicB, firstName: 'Berk' },
    ];
    profiles = [];
    contacts = [{ id: 'contact-1', employeeId: employeeA, clinicId: clinicA, type: 'PHONE', value: '5551112233' }];
    documents = [{ id: 'doc-1', employeeId: employeeA, clinicId: clinicA, name: 'diploma.pdf', category: 'DIPLOMA' }];
    leaves = [
      {
        id: 'leave-1',
        employeeId: employeeA,
        clinicId: clinicA,
        type: 'ANNUAL',
        status: 'PENDING',
        startAt: new Date('2026-06-01'),
        endAt: new Date('2026-06-05'),
      },
    ];
    entitlements = [];

    const mockClient = makeMockTenantClient();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: TenantPrismaService, useValue: { getClient: jest.fn().mockResolvedValue(mockClient) } },
        {
          provide: PrismaService,
          useValue: { user: { findFirst: jest.fn(({ where }: any) => Promise.resolve(users.find((u) => u.id === where.id && u.clinicId === where.clinicId) || null)) } },
        },
        { provide: EmailService, useValue: { sendEmail: jest.fn().mockResolvedValue(true) } },
        { provide: AuditLogService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = moduleRef.get(EmployeesService);
  });

  describe('Personel Profili', () => {
    it('kendi kliniğindeki personel için profil oluşturabilir ve okuyabilir', async () => {
      const created = await service.upsertProfile(employeeA, clinicA, { personnelType: 'DOCTOR', calendarColor: '#ff0000' } as any);
      expect(created.personnelType).toBe('DOCTOR');

      const fetched = await service.getProfile(employeeA, clinicA);
      expect(fetched.calendarColor).toBe('#ff0000');
    });

    it('başka klinik bağlamıyla profil OLUŞTURULAMAZ (IDOR)', async () => {
      await expect(
        service.upsertProfile(employeeA, clinicB, { personnelType: 'DOCTOR' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('hassas alanları (TC/SGK, doğum tarihi) şifreleyip okurken çözer', async () => {
      const created = await service.upsertProfile(employeeA, clinicA, {
        personnelType: 'DOCTOR',
        birthDate: '1990-01-01',
        sgkRegistryNo: '12345678901',
      } as any);

      // Service dönüşü çözülmüş (plaintext) olmalı...
      expect(created.birthDate).toBe('1990-01-01');
      expect(created.sgkRegistryNo).toBe('12345678901');

      // ...ama ham DB kaydı düz metin değil, iv:authTag:cipher formatında saklanmalı.
      const raw = profiles.find((p) => p.employeeId === employeeA);
      expect(raw.birthDate).not.toBe('1990-01-01');
      expect(raw.birthDate.split(':').length).toBe(3);
      expect(raw.sgkRegistryNo).not.toBe('12345678901');

      const fetched = await service.getProfile(employeeA, clinicA);
      expect(fetched.birthDate).toBe('1990-01-01');
      expect(fetched.sgkRegistryNo).toBe('12345678901');
    });
  });

  describe('İletişim Bilgileri', () => {
    it('kendi kliniğinden iletişim kayıtlarını listeleyebilir', async () => {
      const result = await service.listContacts(employeeA, clinicA);
      expect(result).toHaveLength(1);
    });

    it('başka klinik bağlamıyla iletişim kaydı SİLEMEZ (IDOR)', async () => {
      await expect(service.deleteContact(employeeA, clinicB, 'contact-1')).rejects.toThrow(NotFoundException);
      expect(contacts).toHaveLength(1);
    });

    it('kendi kliniği iletişim kaydını silebilir', async () => {
      await service.deleteContact(employeeA, clinicA, 'contact-1');
      expect(contacts).toHaveLength(0);
    });
  });

  describe('Dokümanlar', () => {
    it('dosyasız yükleme isteğini reddeder', async () => {
      await expect(service.addDocumentWithFile(employeeA, clinicA, null, {} as any)).rejects.toThrow(
        'Dosya bulunamadı.',
      );
    });

    it('geçerli dosya ile doküman oluşturur', async () => {
      const file = { originalname: 'ruhsat.pdf', mimetype: 'application/pdf', filename: 'uuid-1.pdf', size: 1024 };
      const result = await service.addDocumentWithFile(employeeA, clinicA, file, { category: 'DIPLOMA' } as any, 'user-1');
      expect(result.fileUrl).toBe('/uploads/employee-documents/uuid-1.pdf');
    });

    it('başka klinik bağlamıyla doküman SİLEMEZ (IDOR)', async () => {
      await expect(service.deleteDocument(employeeA, clinicB, 'doc-1')).rejects.toThrow(NotFoundException);
      expect(documents).toHaveLength(1);
    });
  });

  describe('İzin Onay/Red Akışı (Faz 2)', () => {
    it('izni onaylayınca approvedBy/approvedAt set edilir', async () => {
      const result = await service.updateLeaveStatus('leave-1', clinicA, { status: 'APPROVED' } as any, 'admin-1');
      expect(result.status).toBe('APPROVED');
      expect(result.approvedBy).toBe('admin-1');
      expect(result.approvedAt).not.toBeNull();
      expect(result.rejectionReason).toBeNull();
    });

    it('izni reddedince rejectionReason kaydedilir', async () => {
      const result = await service.updateLeaveStatus('leave-1', clinicA, { status: 'REJECTED', rejectionReason: 'Yoğun dönem' } as any, 'admin-1');
      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe('Yoğun dönem');
    });

    it('başka klinik bağlamıyla izin durumu DEĞİŞTİRİLEMEZ (IDOR)', async () => {
      await expect(
        service.updateLeaveStatus('leave-1', clinicB, { status: 'APPROVED' } as any, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('İzin Hak Edişi (Faz 2)', () => {
    it('hak ediş tanımlanmamışsa sıfır bakiye döner', async () => {
      const result = await service.getLeaveEntitlement(employeeA, clinicA, 2026);
      expect(result.totalDays).toBe(0);
      expect(result.remainingDays).toBe(0);
    });

    it('hak ediş tanımlanabilir ve onaylı izinler kalan günden düşer', async () => {
      await service.upsertLeaveEntitlement(employeeA, clinicA, { year: 2026, totalDays: 14, carryOverDays: 2 } as any);
      await service.updateLeaveStatus('leave-1', clinicA, { status: 'APPROVED' } as any, 'admin-1');

      const result = await service.getLeaveEntitlement(employeeA, clinicA, 2026);
      expect(result.totalDays).toBe(14);
      expect(result.carryOverDays).toBe(2);
      expect(result.usedDays).toBe(5); // 2026-06-01 - 2026-06-05 (dahil) = 5 gün
      expect(result.remainingDays).toBe(11); // 14 + 2 - 5
    });

    it('PENDING/REJECTED izinler kullanılan gün sayısına dahil edilmez', async () => {
      await service.upsertLeaveEntitlement(employeeA, clinicA, { year: 2026, totalDays: 14 } as any);
      const result = await service.getLeaveEntitlement(employeeA, clinicA, 2026);
      expect(result.usedDays).toBe(0);
    });

    it('başka klinik bağlamıyla hak ediş TANIMLANAMAZ (IDOR)', async () => {
      await expect(
        service.upsertLeaveEntitlement(employeeA, clinicB, { year: 2026, totalDays: 14 } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

/**
 * İşten çıkış sırasında hekim devri: bir hekim pasife alınmadan önce kendisine ait
 * süren randevu/hasta/tamamlanmamış tedavi kaydı varsa devralacak bir hekim seçilmesini
 * zorunlu kılar ve seçildiğinde bu kayıtları devreder (bkz. EmployeesService.deactivate).
 */
describe('EmployeesService — İşten Çıkış Hekim Devri', () => {
  let service: EmployeesService;

  const clinicA = 'clinic-a';
  const outgoingDoctor = 'doc-outgoing';
  const replacementDoctor = 'doc-replacement';
  const inactiveDoctor = 'doc-inactive';
  const nonDoctorStaff = 'staff-nondoctor';

  let employees: any[];
  let appointments: any[];
  let patients: any[];
  let treatmentItems: any[];

  function makeMockTenantClient() {
    return {
      employee: {
        findFirst: jest.fn(({ where }: any) =>
          Promise.resolve(
            employees.find(
              (e) =>
                e.id === where.id &&
                e.clinicId === where.clinicId &&
                (where.isDoctor === undefined || e.isDoctor === where.isDoctor) &&
                (where.isActive === undefined || e.isActive === where.isActive),
            ) || null,
          ),
        ),
        update: jest.fn(({ where, data }: any) => {
          const rec = employees.find((e) => e.id === where.id);
          Object.assign(rec, data);
          return Promise.resolve({ ...rec });
        }),
      },
      appointment: {
        count: jest.fn(({ where }: any) =>
          Promise.resolve(
            appointments.filter(
              (a) => a.clinicId === where.clinicId && a.doctorId === where.doctorId && !where.status.notIn.includes(a.status),
            ).length,
          ),
        ),
        updateMany: jest.fn(({ where, data }: any) => {
          let count = 0;
          appointments.forEach((a) => {
            if (a.clinicId === where.clinicId && a.doctorId === where.doctorId && !where.status.notIn.includes(a.status)) {
              Object.assign(a, data);
              count++;
            }
          });
          return Promise.resolve({ count });
        }),
      },
      patient: {
        count: jest.fn(({ where }: any) =>
          Promise.resolve(patients.filter((p) => p.clinicId === where.clinicId && p.assignedDoctor === where.assignedDoctor).length),
        ),
        updateMany: jest.fn(({ where, data }: any) => {
          let count = 0;
          patients.forEach((p) => {
            if (p.clinicId === where.clinicId && p.assignedDoctor === where.assignedDoctor) {
              Object.assign(p, data);
              count++;
            }
          });
          return Promise.resolve({ count });
        }),
      },
      treatmentItem: {
        count: jest.fn(({ where }: any) =>
          Promise.resolve(
            treatmentItems.filter(
              (t) =>
                t.doctorId === where.doctorId &&
                t.clinicId === where.plan.clinicId &&
                !where.status.notIn.includes(t.status),
            ).length,
          ),
        ),
        updateMany: jest.fn(({ where, data }: any) => {
          let count = 0;
          treatmentItems.forEach((t) => {
            if (t.doctorId === where.doctorId && t.clinicId === where.plan.clinicId && !where.status.notIn.includes(t.status)) {
              Object.assign(t, data);
              count++;
            }
          });
          return Promise.resolve({ count });
        }),
      },
      $transaction: jest.fn((ops: Promise<any>[]) => Promise.all(ops)),
    };
  }

  beforeEach(async () => {
    employees = [
      { id: outgoingDoctor, clinicId: clinicA, isDoctor: true, isActive: true },
      { id: replacementDoctor, clinicId: clinicA, isDoctor: true, isActive: true },
      { id: inactiveDoctor, clinicId: clinicA, isDoctor: true, isActive: false },
      { id: nonDoctorStaff, clinicId: clinicA, isDoctor: false, isActive: true },
    ];
    appointments = [];
    patients = [];
    treatmentItems = [];

    const mockClient = makeMockTenantClient();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: TenantPrismaService, useValue: { getClient: jest.fn().mockResolvedValue(mockClient) } },
        { provide: PrismaService, useValue: { user: { update: jest.fn().mockResolvedValue({}) } } },
        { provide: EmailService, useValue: { sendEmail: jest.fn().mockResolvedValue(true) } },
        { provide: AuditLogService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = moduleRef.get(EmployeesService);
  });

  it('hekim olmayan personel için devir gerekmez (etki her zaman sıfır)', async () => {
    const impact = await service.getTerminationImpact(nonDoctorStaff, clinicA);
    expect(impact).toEqual({ appointmentCount: 0, patientCount: 0, incompleteTreatmentCount: 0, requiresTransfer: false });
  });

  it('devredilecek kaydı olmayan hekim, hedef hekim belirtilmeden doğrudan pasife alınabilir', async () => {
    const updated = await service.deactivate(outgoingDoctor, 'İstifa', clinicA);
    expect(updated.isActive).toBe(false);
    expect(updated.deactivationReason).toBe('İstifa');
  });

  it('süren randevusu olan hekim, hedef hekim belirtilmeden pasife alınamaz', async () => {
    appointments.push({ id: 'appt-1', clinicId: clinicA, doctorId: outgoingDoctor, status: 'PLANNED' });

    await expect(service.deactivate(outgoingDoctor, 'İstifa', clinicA)).rejects.toThrow(BadRequestException);
  });

  it('geçerli hedef hekim seçildiğinde randevu, hasta ve tamamlanmamış tedavi kalemleri devredilir', async () => {
    appointments.push(
      { id: 'appt-1', clinicId: clinicA, doctorId: outgoingDoctor, status: 'PLANNED' },
      { id: 'appt-2', clinicId: clinicA, doctorId: outgoingDoctor, status: 'COMPLETED' }, // tamamlanmış — devredilmemeli
    );
    patients.push({ id: 'patient-1', clinicId: clinicA, assignedDoctor: outgoingDoctor });
    treatmentItems.push(
      { id: 'item-1', clinicId: clinicA, doctorId: outgoingDoctor, status: 'PENDING' },
      { id: 'item-2', clinicId: clinicA, doctorId: outgoingDoctor, status: 'COMPLETED' }, // tamamlanmış — devredilmemeli
    );

    const impact = await service.getTerminationImpact(outgoingDoctor, clinicA);
    expect(impact).toEqual({ appointmentCount: 1, patientCount: 1, incompleteTreatmentCount: 1, requiresTransfer: true });

    await service.deactivate(outgoingDoctor, 'Emeklilik', clinicA, undefined, replacementDoctor);

    expect(appointments.find((a) => a.id === 'appt-1')!.doctorId).toBe(replacementDoctor);
    expect(appointments.find((a) => a.id === 'appt-2')!.doctorId).toBe(outgoingDoctor); // tamamlanmış randevu değişmedi
    expect(patients.find((p) => p.id === 'patient-1')!.assignedDoctor).toBe(replacementDoctor);
    expect(treatmentItems.find((t) => t.id === 'item-1')!.doctorId).toBe(replacementDoctor);
    expect(treatmentItems.find((t) => t.id === 'item-2')!.doctorId).toBe(outgoingDoctor); // tamamlanmış kalem değişmedi

    const outgoing = employees.find((e) => e.id === outgoingDoctor);
    expect(outgoing.isActive).toBe(false);
  });

  it('hedef hekim kendisiyle aynı olamaz', async () => {
    appointments.push({ id: 'appt-1', clinicId: clinicA, doctorId: outgoingDoctor, status: 'PLANNED' });

    await expect(
      service.deactivate(outgoingDoctor, 'İstifa', clinicA, undefined, outgoingDoctor),
    ).rejects.toThrow(BadRequestException);
  });

  it('pasif veya hekim olmayan biri hedef olarak seçilemez', async () => {
    appointments.push({ id: 'appt-1', clinicId: clinicA, doctorId: outgoingDoctor, status: 'PLANNED' });

    await expect(
      service.deactivate(outgoingDoctor, 'İstifa', clinicA, undefined, inactiveDoctor),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.deactivate(outgoingDoctor, 'İstifa', clinicA, undefined, nonDoctorStaff),
    ).rejects.toThrow(BadRequestException);
  });
});
