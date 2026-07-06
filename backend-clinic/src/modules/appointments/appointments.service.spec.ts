import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentsService } from './appointments.service';
import { AppointmentRepository } from './appointment.repository';

describe('AppointmentsService — Klinik Sahipliği ve Çakışma Kontrolü', () => {
  let service: AppointmentsService;
  let mockRepo: any;
  let workHourRow: any;

  const clinicA = 'clinic-a';
  const clinicB = 'clinic-b';

  let appointments: any[];
  let idCounter: number;

  function makeTxClient() {
    return {
      employeeLeave: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
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

    workHourRow = null;

    mockRepo = {
      findById: jest.fn((id: string) => Promise.resolve(appointments.find((a) => a.id === id) || null)),
      findByIdWithRelations: jest.fn((id: string) => Promise.resolve(appointments.find((a) => a.id === id) || null)),
      runInTransaction: jest.fn((fn: any) => fn(makeTxClient())),
      getTenantDb: jest.fn(() =>
        Promise.resolve({
          employeeWorkHour: { findFirst: jest.fn(() => Promise.resolve(workHourRow)) },
        }),
      ),
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

  describe('Mesai saati kontrolü (yumuşak uyarı)', () => {
    // NOT: Tüm zamanlar burada kasıtlı olarak açık 'Z' (UTC) offset'iyle veriliyor,
    // yerel saat dilimine bağlı ('...T19:00:00' gibi Z'siz) string'ler kullanılmıyor.
    // Sunucu (Docker imajı) UTC'de çalışır ama mesai saatleri klinik saat dilimini
    // (Europe/Istanbul, UTC+3) ifade eder — bkz. appointments.service.ts
    // getClinicDateParts(). Z'siz bir string test makinesinin yerel saatine göre
    // yorumlanacağından, testin hangi makinede çalıştığına bağlı olarak hem hatalı
    // kodu hem düzeltmeyi "yanlışlıkla" yeşil gösterebilirdi.

    it('mesai tanımı yoksa tüm saatler açık kabul edilir, uyarı üretilmez', async () => {
      workHourRow = null;
      const result = await service.checkWorkHours(
        clinicA,
        'doctor-1',
        new Date('2026-08-03T16:00:00Z'), // 19:00 İstanbul
        new Date('2026-08-03T16:30:00Z'),
      );
      expect(result.outsideWorkHours).toBe(false);
    });

    it('tanımlı mesai saatleri dışındaki randevu için uyarı döner (bloke etmez)', async () => {
      workHourRow = { isWorking: true, startTime: '09:00', endTime: '18:00' };
      const result = await service.checkWorkHours(
        clinicA,
        'doctor-1',
        new Date('2026-08-03T16:00:00Z'), // 19:00 İstanbul — 09:00-18:00 mesaisi dışında
        new Date('2026-08-03T16:30:00Z'),
      );
      expect(result.outsideWorkHours).toBe(true);
      expect(result.workStart).toBe('09:00');
    });

    it('mesai saati içindeki randevu için uyarı üretilmez', async () => {
      workHourRow = { isWorking: true, startTime: '09:00', endTime: '18:00' };
      const result = await service.checkWorkHours(
        clinicA,
        'doctor-1',
        new Date('2026-08-03T07:00:00Z'), // 10:00 İstanbul
        new Date('2026-08-03T07:30:00Z'),
      );
      expect(result.outsideWorkHours).toBe(false);
    });

    it('REGRESYON: mesaisi 09:00-22:00 olan hekime tam mesai başlangıcında verilen randevu mesai dışı sayılmamalı', async () => {
      // Bkz. bug raporu: "Ahmet Derdiyok mesai saatleri 09:00-22:00 seçildiği halde
      // bu saatler arasında randevu verildiğinde mesai saatleri dışında uyarısı
      // veriyor" — kök neden, sunucunun (UTC) `Date.getHours()` ile saati okuyup
      // klinik yerel saatiyle (Europe/Istanbul, UTC+3) doğrudan karşılaştırmasıydı;
      // 09:00 İstanbul == 06:00 UTC, ki bu da "09:00" mesai başlangıcından önce
      // görünüp yanlışlıkla mesai dışı işaretleniyordu.
      workHourRow = { isWorking: true, startTime: '09:00', endTime: '22:00' };
      const result = await service.checkWorkHours(
        clinicA,
        'doctor-1',
        new Date('2026-08-03T06:00:00Z'), // 09:00 İstanbul — mesai başlangıcı, dahil
        new Date('2026-08-03T06:30:00Z'), // 09:30 İstanbul
      );
      expect(result.outsideWorkHours).toBe(false);
    });

    it('REGRESYON: aynı hekime mesai bitişine yakın (21:30-22:00 İstanbul) verilen randevu da mesai dışı sayılmamalı', async () => {
      workHourRow = { isWorking: true, startTime: '09:00', endTime: '22:00' };
      const result = await service.checkWorkHours(
        clinicA,
        'doctor-1',
        new Date('2026-08-03T18:30:00Z'), // 21:30 İstanbul
        new Date('2026-08-03T19:00:00Z'), // 22:00 İstanbul — mesai bitişi
      );
      expect(result.outsideWorkHours).toBe(false);
    });

    it('hekimin o gün hiç çalışmadığı durumda uyarı döner', async () => {
      workHourRow = { isWorking: false, startTime: null, endTime: null };
      const result = await service.checkWorkHours(
        clinicA,
        'doctor-1',
        new Date('2026-08-03T07:00:00Z'), // 10:00 İstanbul
        new Date('2026-08-03T07:30:00Z'),
      );
      expect(result.outsideWorkHours).toBe(true);
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
