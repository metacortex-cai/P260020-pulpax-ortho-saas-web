import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentsService } from './appointments.service';
import { AppointmentRepository } from './appointment.repository';

describe('AppointmentsService — Klinik Sahipliği ve Çakışma Kontrolü', () => {
  let service: AppointmentsService;
  let mockRepo: any;

  const clinicA = 'clinic-a';
  const clinicB = 'clinic-b';

  let appointments: any[];
  let series: any[];
  let idCounter: number;
  let seriesIdCounter: number;

  function makeTxClient() {
    return {
      // Bu test paketi HR/Employee'yi seed etmiyor — checkConflict'in izin kontrolü
      // adımı "eşleşen Employee yok" (null) dönüşle sessizce atlanmalı.
      employee: {
        findFirst: jest.fn(() => Promise.resolve(null)),
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
      appointmentSeries: {
        create: jest.fn(({ data }: any) => {
          const rec = { id: `series-${++seriesIdCounter}`, status: 'ACTIVE', ...data };
          series.push(rec);
          return Promise.resolve(rec);
        }),
      },
    };
  }

  beforeEach(async () => {
    idCounter = 0;
    seriesIdCounter = 0;
    series = [];
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
      getTenantDb: jest.fn(() => Promise.resolve({ employee: { findFirst: jest.fn(() => Promise.resolve(null)) } })),
      getDoctorName: jest.fn().mockResolvedValue('Dr. Test Hekim'),
      update: jest.fn((id: string, data: any) => {
        const rec = appointments.find((a) => a.id === id);
        Object.assign(rec, data);
        return Promise.resolve(rec);
      }),
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

  describe('ADR-004 — Tekrarlı randevu serisi (createSeries)', () => {
    it('WEEKLY: occurrence tarihleri önceki occurrence + interval*7 gün olarak üretilir', async () => {
      const result = await service.createSeries(
        {
          patientId: 'patient-2',
          doctorId: 'doctor-2',
          startOn: '2026-08-04T09:00:00Z',
          endOn: '2026-08-04T09:30:00Z',
          freq: 'WEEKLY',
          interval: 1,
          count: 3,
        } as any,
        clinicA,
      );

      expect(result.occurrences).toHaveLength(3);
      expect(result.skipped).toHaveLength(0);
      expect(result.occurrences.map((o: any) => o.startOn.toISOString())).toEqual([
        '2026-08-04T09:00:00.000Z',
        '2026-08-11T09:00:00.000Z',
        '2026-08-18T09:00:00.000Z',
      ]);
      expect(result.occurrences.map((o: any) => o.endOn.toISOString())).toEqual([
        '2026-08-04T09:30:00.000Z',
        '2026-08-11T09:30:00.000Z',
        '2026-08-18T09:30:00.000Z',
      ]);
      expect(result.occurrences.map((o: any) => o.seriesSeq)).toEqual([1, 2, 3]);
      expect(result.occurrences.every((o: any) => o.seriesId === result.seriesId)).toBe(true);
    });

    it('MONTHLY: ay sonu clamp edilir (31 Ocak + aylık → 28 Şubat, artık yıl olmayan 2026), sonraki ay ilk gün-of-ay değerine geri döner', async () => {
      const result = await service.createSeries(
        {
          patientId: 'patient-2',
          doctorId: 'doctor-2',
          startOn: '2026-01-31T09:00:00Z',
          endOn: '2026-01-31T09:30:00Z',
          freq: 'MONTHLY',
          interval: 1,
          count: 3,
        } as any,
        clinicA,
      );

      expect(result.occurrences).toHaveLength(3);
      expect(result.occurrences.map((o: any) => o.startOn.toISOString())).toEqual([
        '2026-01-31T09:00:00.000Z',
        '2026-02-28T09:00:00.000Z', // 2026 artık yıl değil → Şubat 28 gün
        '2026-03-31T09:00:00.000Z', // cascading yok: Mart'ta tekrar 31'e döner
      ]);
    });

    it('ünit çakışması olan occurrence atlanır, seri kalan occurrence\'larla devam eder', async () => {
      appointments.push({
        id: 'appt-chair-blocker',
        clinicId: clinicA,
        doctorId: 'doctor-99', // farklı hekim — sadece ünit çakışması tetiklenir
        patientId: 'patient-9',
        patient: { firstName: 'Blok', lastName: 'Eden' },
        chairId: 'chair-1',
        startOn: new Date('2026-08-11T09:00:00Z'),
        endOn: new Date('2026-08-11T09:30:00Z'),
        status: 'PLANNED',
      });

      const result = await service.createSeries(
        {
          patientId: 'patient-2',
          doctorId: 'doctor-2',
          chairId: 'chair-1',
          startOn: '2026-08-04T09:00:00Z',
          endOn: '2026-08-04T09:30:00Z',
          freq: 'WEEKLY',
          interval: 1,
          count: 3,
        } as any,
        clinicA,
      );

      expect(result.occurrences).toHaveLength(2);
      expect(result.skipped).toEqual([
        {
          seq: 2,
          startOn: new Date('2026-08-11T09:00:00Z'),
          endOn: new Date('2026-08-11T09:30:00Z'),
          reason: 'CHAIR_CONFLICT',
        },
      ]);
      expect(result.occurrences.map((o: any) => o.seriesSeq)).toEqual([1, 3]);
    });

    it('force olmadan hekim çakışması tüm seriyi 409 ile geri alır (hiçbir occurrence oluşturulmaz)', async () => {
      appointments.push({
        id: 'appt-doctor-blocker',
        clinicId: clinicA,
        doctorId: 'doctor-2', // seri ile AYNI hekim — ilk occurrence'ta çakışır
        patientId: 'patient-9',
        patient: { firstName: 'Blok', lastName: 'Eden' },
        startOn: new Date('2026-08-04T09:00:00Z'),
        endOn: new Date('2026-08-04T09:30:00Z'),
        status: 'PLANNED',
      });

      const beforeCount = appointments.length;

      await expect(
        service.createSeries(
          {
            patientId: 'patient-2',
            doctorId: 'doctor-2',
            startOn: '2026-08-04T09:00:00Z',
            endOn: '2026-08-04T09:30:00Z',
            freq: 'WEEKLY',
            interval: 1,
            count: 3,
          } as any,
          clinicA,
        ),
      ).rejects.toThrow(ConflictException);

      // Tüm-veya-hiç: ilk occurrence'ta çakışma bulunduğu için hiçbir occurrence
      // (appointment satırı) oluşturulmamış olmalı.
      expect(appointments.length).toBe(beforeCount);
    });

    it('count ve until birlikte gönderilirse 400 döner', async () => {
      await expect(
        service.createSeries(
          {
            patientId: 'patient-2',
            doctorId: 'doctor-2',
            startOn: '2026-08-04T09:00:00Z',
            endOn: '2026-08-04T09:30:00Z',
            freq: 'WEEKLY',
            interval: 1,
            count: 3,
            until: '2026-12-01T00:00:00Z',
          } as any,
          clinicA,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('count ve until ikisi de gönderilmezse 400 döner', async () => {
      await expect(
        service.createSeries(
          {
            patientId: 'patient-2',
            doctorId: 'doctor-2',
            startOn: '2026-08-04T09:00:00Z',
            endOn: '2026-08-04T09:30:00Z',
            freq: 'WEEKLY',
            interval: 1,
          } as any,
          clinicA,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('until, startOn + 2 yıldan sonraysa 400 döner', async () => {
      await expect(
        service.createSeries(
          {
            patientId: 'patient-2',
            doctorId: 'doctor-2',
            startOn: '2026-08-04T09:00:00Z',
            endOn: '2026-08-04T09:30:00Z',
            freq: 'WEEKLY',
            interval: 1,
            until: '2029-01-01T00:00:00Z',
          } as any,
          clinicA,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ADR-004 — seriesException (tekil occurrence taşı/iptal et, seriyi bozma)', () => {
    beforeEach(() => {
      appointments.push({
        id: 'appt-series-member',
        clinicId: clinicA,
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        patient: { firstName: 'Test', lastName: 'Hasta1' },
        seriesId: 'series-1',
        seriesSeq: 2,
        seriesException: false,
        startOn: new Date('2026-09-01T09:00:00Z'),
        endOn: new Date('2026-09-01T09:30:00Z'),
        status: 'PLANNED',
      });
    });

    it('update() ile seri üyesi bir occurrence düzenlenince seriesException=true set edilir', async () => {
      const updated: any = await service.update('appt-series-member', clinicA, {
        notes: 'Hasta talebiyle not eklendi',
      } as any);

      expect(updated.seriesException).toBe(true);
    });

    it('updateStatus() ile seri üyesi bir occurrence\'ın durumu değiştirilince seriesException=true set edilir', async () => {
      const updated: any = await service.updateStatus('appt-series-member', clinicA, {
        status: 'CONFIRMED',
      } as any);

      expect(updated.seriesException).toBe(true);
      expect(updated.status).toBe('CONFIRMED');
    });

    it('seri üyesi OLMAYAN bir occurrence güncellenince seriesException dokunulmaz', async () => {
      const updated: any = await service.update('appt-existing', clinicA, {
        notes: 'seri dışı not',
      } as any);

      expect(updated.seriesException).toBeUndefined();
    });
  });
});
