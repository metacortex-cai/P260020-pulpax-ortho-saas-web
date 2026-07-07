import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentsService } from './appointments.service';
import { AppointmentRepository } from './appointment.repository';

describe('AppointmentsService — Klinik Sahipliği ve Çakışma Kontrolü', () => {
  let service: AppointmentsService;
  let mockRepo: any;

  const clinicA = 'clinic-a';
  const clinicB = 'clinic-b';

  let appointments: any[];
  let idCounter: number;

  function makeTxClient() {
    return {
      appointment: {
        findFirst: jest.fn(({ where }: any) => {
          const match = appointments.find((a) => {
            if (a.clinicId !== where.clinicId) return false;
            if (where.doctorId && a.doctorId !== where.doctorId) return false;
            if (where.id?.not && a.id === where.id.not) return false;
            return a.startOn < where.startOn.lt && a.endOn > where.endOn.gt;
          });
          return Promise.resolve(match || null);
        }),
        findMany: jest.fn(({ where }: any) => {
          const matches = appointments.filter((a) => {
            if (a.clinicId !== where.clinicId) return false;
            if (where.doctorId && a.doctorId !== where.doctorId) return false;
            if (where.id?.not && a.id === where.id.not) return false;
            return a.startOn < where.startOn.lt && a.endOn > where.endOn.gt;
          });
          return Promise.resolve(matches);
        }),
        create: jest.fn(({ data }: any) => {
          const rec = { id: `appt-${++idCounter}`, status: 'PLANNED', ...data };
          appointments.push(rec);
          return Promise.resolve(rec);
        }),
        update: jest.fn(({ where, data }: any) => {
          const rec = appointments.find((a) => a.id === where.id);
          Object.assign(rec, data);
          return Promise.resolve(rec);
        }),
      },
    };
  }

  beforeEach(async () => {
    idCounter = 0;
    appointments = [
      {
        id: 'appt-existing',
        clinicId: clinicA,
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        patient: { firstName: 'Test', lastName: 'Hasta1' },
        startOn: new Date('2026-08-01T09:00:00Z'),
        endOn: new Date('2026-08-01T10:00:00Z'),
        status: 'PLANNED',
      },
    ];

    mockRepo = {
      findById: jest.fn((id: string) => Promise.resolve(appointments.find((a) => a.id === id) || null)),
      findByIdWithRelations: jest.fn((id: string) => Promise.resolve(appointments.find((a) => a.id === id) || null)),
      runInTransaction: jest.fn((fn: any) => fn(makeTxClient())),
      getTenantDb: jest.fn(() => Promise.resolve({})),
      getDoctorName: jest.fn().mockResolvedValue('Dr. Test Hekim'),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: AppointmentRepository, useValue: mockRepo },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AppointmentsService);
  });

  describe('findOne — klinik sahipliği', () => {
    it('başka klinik bağlamıyla randevu detayına erişilemez (IDOR)', async () => {
      await expect(service.findOne('appt-existing', clinicB)).rejects.toThrow(NotFoundException);
    });

    it('kendi kliniği randevusuna erişebilir', async () => {
      const result = await service.findOne('appt-existing', clinicA);
      expect(result.id).toBe('appt-existing');
    });
  });

  describe('Çakışma kontrolü (transaction içinde)', () => {
    it('aynı doktor/saat aralığına ikinci randevu oluşturulamaz', async () => {
      await expect(
        service.create(
          {
            patientId: 'patient-2',
            doctorId: 'doctor-1',
            startOn: '2026-08-01T09:30:00Z',
            endOn: '2026-08-01T10:30:00Z',
          } as any,
          clinicA,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('çakışmayan saatte randevu başarıyla oluşturulur', async () => {
      const created = await service.create(
        {
          patientId: 'patient-2',
          doctorId: 'doctor-1',
          startOn: '2026-08-01T11:00:00Z',
          endOn: '2026-08-01T12:00:00Z',
        } as any,
        clinicA,
      );
      expect(created.id).toBeDefined();
      expect(appointments).toHaveLength(2);
    });

    it('çakışma 409 yanıtı çakışan hasta bilgilerini içerir (onay modalı için)', async () => {
      try {
        await service.create(
          {
            patientId: 'patient-2',
            doctorId: 'doctor-1',
            startOn: '2026-08-01T09:30:00Z',
            endOn: '2026-08-01T10:30:00Z',
          } as any,
          clinicA,
        );
        fail('ConflictException bekleniyordu');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ConflictException);
        const body = err.getResponse();
        expect(body.conflict).toBe(true);
        expect(body.appointmentCount).toBe(1);
        expect(body.appointments[0].patientName).toBe('Test Hasta1');
      }
    });

    it('REGRESYON: force:true ile hekimin aynı saat dilimine ikinci randevu eklenebilir (yan yana gösterim)', async () => {
      const created = await service.create(
        {
          patientId: 'patient-2',
          doctorId: 'doctor-1',
          startOn: '2026-08-01T09:30:00Z',
          endOn: '2026-08-01T10:30:00Z',
          force: true,
        } as any,
        clinicA,
      );
      expect(created.id).toBeDefined();
      expect(appointments).toHaveLength(2);
    });
  });

  describe('Mesai saati kontrolü (kaldırıldı — İK modülü scope dışı)', () => {
    // Personel mesai saati tanımları (EmployeeWorkHour) İK modülüyle birlikte
    // kaldırıldı (bkz. scope-reduction kararı). checkWorkHours artık her zaman
    // "mesai dışı değil" döner; imza geriye dönük uyumluluk için korunuyor.
    it('her zaman outsideWorkHours=false döner', async () => {
      const result = await service.checkWorkHours(
        clinicA,
        'doctor-1',
        new Date('2026-08-03T16:00:00Z'),
        new Date('2026-08-03T16:30:00Z'),
      );
      expect(result.outsideWorkHours).toBe(false);
    });
  });

  describe('Ertelendi akışı (postpone)', () => {
    it('POSTPONED durumu eski randevuyu postponed yapıp yeni bağlı randevu oluşturur', async () => {
      const result: any = await service.updateStatus('appt-existing', clinicA, {
        status: 'POSTPONED',
        newStartOn: '2026-08-02T09:00:00Z',
        newEndOn: '2026-08-02T10:00:00Z',
      } as any);

      expect(result.newAppointmentId).toBeDefined();
      expect(result.status).toBe('POSTPONED');
      expect(result.linkedTo).toBe(result.newAppointmentId);

      const newAppt = appointments.find((a) => a.id === result.newAppointmentId);
      expect(newAppt).toBeDefined();
      expect(newAppt.status).toBe('PLANNED');
      expect(newAppt.postponedFrom).toBe('appt-existing');
      expect(newAppt.doctorId).toBe('doctor-1');
    });

    it('yeni tarih mevcut başka bir randevuyla çakışıyorsa 409 döner', async () => {
      appointments.push({
        id: 'appt-blocking',
        clinicId: clinicA,
        doctorId: 'doctor-1',
        patientId: 'patient-3',
        patient: { firstName: 'Test', lastName: 'Hasta3' },
        startOn: new Date('2026-08-02T09:00:00Z'),
        endOn: new Date('2026-08-02T10:00:00Z'),
        status: 'PLANNED',
      });

      await expect(
        service.updateStatus('appt-existing', clinicA, {
          status: 'POSTPONED',
          newStartOn: '2026-08-02T09:30:00Z',
          newEndOn: '2026-08-02T10:30:00Z',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });
});
