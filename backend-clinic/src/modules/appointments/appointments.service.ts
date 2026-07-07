import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentRepository } from './appointment.repository';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import {
  CreateAppointmentSeriesDto,
  APPOINTMENT_SERIES_MAX_UNTIL_YEARS,
} from './dto/create-appointment-series.dto';
import {
  AppointmentCreatedEvent,
  AppointmentCompletedEvent,
  AppointmentCancelledEvent,
  AppointmentConfirmedEvent,
  EVENTS,
} from '../../common/events/domain-events';

const CLINIC_TIME_ZONE = 'Europe/Istanbul';

/**
 * Bir randevu anının (Date) klinik saat dilimindeki (Europe/Istanbul) takvim
 * günü ve saat bileşenlerini döner. Sunucu process'i (Docker imajı) TZ ortam
 * değişkeni tanımlanmadığı için UTC'de çalışır; `Date.getHours()`/`getDay()`
 * gibi yerel-saat-dilimi bağımlı metotlar bu yüzden UTC saatini döner, Türkiye
 * saatini değil. Mesai saati/gün karşılaştırması her zaman kliniğin gerçek
 * yerel saatine göre yapılmalıdır — aksi halde 3 saatlik farktan dolayı,
 * örneğin 09:00-22:00 mesaisi tanımlı bir hekime saat 09:00'da verilen bir
 * randevu (06:00 UTC) yanlışlıkla "mesai saatleri dışında" işaretlenir.
 */
function getClinicDateParts(d: Date): { dayOfWeek: number; hhmm: string; ymd: string } {
  const raw = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .formatToParts(d)
    .reduce((acc: Record<string, string>, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});

  const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = raw.hour === '24' ? 0 : Number(raw.hour); // bazı ICU sürümleri gece yarısını "24" olarak döner

  return {
    dayOfWeek: WEEKDAYS[raw.weekday],
    hhmm: `${String(hour).padStart(2, '0')}:${raw.minute}`,
    ymd: `${raw.year}-${raw.month}-${raw.day}`,
  };
}

function formatLocalDate(d: Date): string {
  return getClinicDateParts(d).ymd;
}

/**
 * getClinicDateParts ile aynı Intl dönüşümünü kullanarak klinik yerel
 * saatindeki tarih/saat bileşenlerini sayısal olarak döner (yıl/ay/gün/saat/
 * dakika) — ADR-004 tekrarlı randevu serisi occurrence üretiminde ay
 * ilerletme/gün clamp işlemleri için (bkz. addMonthlyOccurrence).
 */
function getClinicDateFields(d: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const { ymd, hhmm } = getClinicDateParts(d);
  const [year, month, day] = ymd.split('-').map(Number);
  const [hour, minute] = hhmm.split(':').map(Number);
  return { year, month, day, hour, minute };
}

/**
 * Klinik saat diliminin (Europe/Istanbul) verilen an için UTC ofsetini
 * dakika cinsinden döner. Sabit bir sayı hardcode etmek yerine Intl'den
 * türetilir; Türkiye 2016'dan beri DST uygulamıyor (sabit UTC+3) ama bu
 * yaklaşım politika değişse dahi doğru sonuç üretmeye devam eder.
 */
function getClinicUtcOffsetMinutes(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    timeZoneName: 'shortOffset',
  }).formatToParts(d);
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+0';
  const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || 0);
  return sign * (hours * 60 + minutes);
}

/**
 * Klinik yerel saatindeki (Europe/Istanbul) yıl/ay/gün/saat/dakika
 * bileşenlerinden karşılık gelen UTC Date nesnesini üretir — getClinicDateParts'ın
 * tersi yönü; MONTHLY occurrence üretiminde hedef ay/gün'ü somut bir Date'e
 * çevirmek için kullanılır.
 */
function clinicLocalToUtcDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offsetMinutes = getClinicUtcOffsetMinutes(guess);
  return new Date(guess.getTime() - offsetMinutes * 60 * 1000);
}

/**
 * ADR-004 §3: WEEKLY occurrence — önceki occurrence'ın takvim gününe
 * interval*7 gün eklenir, saat/dakika (ve dolayısıyla süre) korunur. Sabit
 * ofsetli (DST'siz) klinik saat dilimi varsayımı altında gün eklemek, UTC
 * milisaniyeye 7*interval gün eklemekle eşdeğerdir.
 */
function addWeeklyOccurrence(prev: Date, interval: number): Date {
  return new Date(prev.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
}

/**
 * ADR-004 §3: MONTHLY occurrence — ay `interval` kadar ilerletilir. Hedef
 * gün HER ZAMAN dizinin ilk occurrence'ının (firstStart) gün-of-ay
 * değeridir — occurrence'lar birbirinden değil, her zaman ilk occurrence'tan
 * türetilir (cascading yapılmaz), böylece ör. 31 Ocak + aylık: Şub 28, Mar
 * 31, Nis 30... elde edilir (Şubat'ın clamp edilmiş 28'inden Mart'a
 * geçildiğinde 31'e "geri dönebilir"). Hedef ayın son gününden büyükse o
 * ayın son gününe clamp edilir (ör. 31 Ocak + 1 ay → 28/29 Şubat).
 */
function addMonthlyOccurrence(firstStart: Date, occurrenceIndex: number, interval: number): Date {
  const { year, month, day, hour, minute } = getClinicDateFields(firstStart);
  const totalMonths = month - 1 + occurrenceIndex * interval;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDayOfTargetMonth);
  return clinicLocalToUtcDate(targetYear, targetMonthIndex + 1, targetDay, hour, minute);
}

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly repo: AppointmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private formatTimeOfDay(d: Date): string {
    return getClinicDateParts(d).hhmm;
  }

  /**
   * LLD 2.3: Çakışma Kontrolü
   * 1. Hekimin aynı saatte başka aktif randevusu var mı? (yumuşak — onayla geçilebilir)
   * 2. Seçili ünit aynı saatte başka bir randevuda mı? (sert engel — fiziksel kısıt)
   */
  /**
   * @param tx Transaction içindeki Prisma client'ı — çağıran taraf bir
   *   `runInTransaction` bloğu içinden geçirmelidir, böylece bu kontrol ile
   *   ardından gelen create/update aynı transaction'da atomik çalışır.
   * @param force true ise hekimin aynı saat dilimindeki çakışan randevusu
   *   engellenmez — kullanıcı takvimdeki onay modalından bilerek geçmiştir
   *   (spec: aynı saatte birden fazla randevu yan yana daraltılarak gösterilir).
   */
  private async checkConflict(
    tx: any,
    clinicId: string,
    doctorId: string,
    startOn: Date,
    endOn: Date,
    chairId?: string,
    excludeId?: string,
    force = false,
  ): Promise<void> {
    // 0. İzin kontrolü — yalnızca ONAYLANMIŞ izinler randevuyu engeller (ADR-003 Faz 2),
    // aralık kesişimi (overlap) mantığıyla, force ile atlanamaz. doctorId bir Doctor.id
    // olduğu için (Employee.doctorId köprüsü üzerinden) önce bağlı Employee bulunur —
    // hekimin bir Employee (İK) kaydı yoksa izin kontrolü yapılmaz.
    const employee = await tx.employee.findFirst({ where: { doctorId }, select: { id: true } });
    if (employee) {
      const activeLeave = await tx.employeeLeave.findFirst({
        where: {
          clinicId,
          employeeId: employee.id,
          status: 'APPROVED',
          startAt: { lt: endOn },
          endAt: { gt: startOn },
        },
      });

      if (activeLeave) {
        throw new ConflictException('Seçtiğiniz tarihte hekim izinlidir. Randevu oluşturulamaz.');
      }
    }

    // 1. Çakışan randevu kontrolü (Doktor) — artık sert engel değil: kullanıcı
    // çakışan hasta bilgilerini görüp onaylarsa (force:true) aynı saat dilimine
    // ikinci bir randevu eklenebilir.
    if (!force) {
      const doctorWhere: any = {
        clinicId,
        doctorId,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        startOn: { lt: endOn },
        endOn: { gt: startOn },
      };
      if (excludeId) doctorWhere.id = { not: excludeId };

      const overlapping = await tx.appointment.findMany({
        where: doctorWhere,
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { startOn: 'asc' },
      });

      if (overlapping.length > 0) {
        throw new ConflictException({
          conflict: true,
          message: 'Hekimin bu saat diliminde çakışan başka bir randevusu bulunmaktadır.',
          appointmentCount: overlapping.length,
          appointments: overlapping.map((a: any) => ({
            id: a.id,
            patientName: `${a.patient.firstName} ${a.patient.lastName}`,
            startOn: a.startOn,
            endOn: a.endOn,
          })),
        });
      }
    }

    // 2. Çakışan randevu kontrolü (Ünit) — fiziksel kısıt olduğu için sert engel, force ile atlanamaz
    if (chairId) {
      const chairWhere: any = {
        clinicId,
        chairId,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
        startOn: { lt: endOn },
        endOn: { gt: startOn },
      };
      if (excludeId) chairWhere.id = { not: excludeId };

      const overlappingChair = await tx.appointment.findFirst({ where: chairWhere });

      if (overlappingChair) {
        throw new ConflictException(
          'Seçtiğiniz ünitte (diş koltuğunda) bu saat diliminde çakışan başka bir randevu bulunmaktadır.',
        );
      }
    }
  }

  /**
   * Mesai saati kontrolü (LLD spec §2.5.2). doctorId bir Doctor.id olduğu için
   * (Employee.doctorId köprüsü üzerinden) önce bağlı Employee bulunur — hekimin
   * bir Employee (İK) kaydı yoksa mesai tanımı da yoktur, "mesai dışı değil" döner.
   */
  async checkWorkHours(
    clinicId: string,
    doctorId: string,
    startOn: Date,
    endOn: Date,
  ): Promise<{
    outsideWorkHours: boolean;
    employeeName?: string | null;
    workStart?: string | null;
    workEnd?: string | null;
    message?: string;
  }> {
    const tenantDb = await this.repo.getTenantDb();
    const employee = await tenantDb.employee.findFirst({ where: { doctorId }, select: { id: true } });
    if (!employee) {
      return { outsideWorkHours: false };
    }

    const dayOfWeek = getClinicDateParts(startOn).dayOfWeek;
    const wh = await tenantDb.employeeWorkHour.findFirst({
      where: { clinicId, employeeId: employee.id, dayOfWeek },
    });

    if (!wh) {
      return { outsideWorkHours: false };
    }

    const startTime = this.formatTimeOfDay(startOn);
    const endTime = this.formatTimeOfDay(endOn);
    const isOutside =
      !wh.isWorking ||
      !wh.startTime ||
      !wh.endTime ||
      startTime < wh.startTime ||
      endTime > wh.endTime;

    if (!isOutside) {
      return { outsideWorkHours: false };
    }

    const employeeName = await this.repo.getDoctorName(doctorId);
    const who = employeeName || 'Hekim';
    return {
      outsideWorkHours: true,
      employeeName,
      workStart: wh.isWorking ? wh.startTime : null,
      workEnd: wh.isWorking ? wh.endTime : null,
      message: wh.isWorking
        ? `${who} mesai saatleri dışında randevu.`
        : `${who} bu gün çalışmıyor.`,
    };
  }

  /**
   * Yeni randevu oluşturur.
   * Çakışma kontrolü yapılır, ardından event fırlatılır.
   */
  async create(dto: CreateAppointmentDto & { chairId?: string }, clinicId: string) {
    const startOn = new Date(dto.startOn);
    const endOn = new Date(dto.endOn);

    // Mesai dışı kontrolü bloke etmez, yalnızca kart üzerinde gösterilecek bilgiyi hesaplar (spec §2.5.2)
    const workHours = await this.checkWorkHours(clinicId, dto.doctorId, startOn, endOn);

    // Şube açıkça belirtilmemişse, seçilen ünitin bağlı olduğu şube miras alınır
    // (ünit fiziksel olarak zaten belirli bir klinikte bulunur).
    let clinicBranchId = dto.clinicBranchId;
    if (!clinicBranchId && dto.chairId) {
      const tenantDb = await this.repo.getTenantDb();
      const chair = await tenantDb.dentalChair.findFirst({
        where: { id: dto.chairId, clinicId },
        select: { clinicBranchId: true },
      });
      clinicBranchId = chair?.clinicBranchId || undefined;
    }

    const appointment = await this.repo.runInTransaction(async (tx) => {
      await this.checkConflict(tx, clinicId, dto.doctorId, startOn, endOn, dto.chairId, undefined, dto.force);

      const created = await tx.appointment.create({
        data: {
          clinicId,
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          chairId: dto.chairId || null,
          clinicBranchId: clinicBranchId || null,
          startOn,
          endOn,
          status: 'PLANNED',
          type: dto.type,
          notes: dto.notes,
          isOutsideWorkHours: workHours.outsideWorkHours,
        },
      });

      // "Tedavi" türü için seçilen, hastanın tamamlanmamış tedavi kalemlerini
      // yeni oluşturulan randevuya bağlar (spec: randevu tipi Tedavi seçimi).
      if (dto.treatmentItemIds?.length) {
        await tx.treatmentItem.updateMany({
          where: {
            id: { in: dto.treatmentItemIds },
            plan: { patientId: dto.patientId, clinicId },
          },
          data: { appointmentId: created.id },
        });
      }

      return created;
    });

    // Domain Event: Randevu oluşturuldu
    this.eventEmitter.emit(
      EVENTS.APPOINTMENT_CREATED,
      new AppointmentCreatedEvent(
        appointment.id,
        clinicId,
        dto.patientId,
        dto.doctorId,
        startOn,
        endOn,
      ),
    );

    this.logger.log(
      `Randevu oluşturuldu: ${appointment.id} | Klinik: ${clinicId}`,
    );

    return appointment;
  }

  /**
   * ADR-004 §3: Google Calendar tarzı tekrarlı randevu serisi oluşturur.
   * Occurrence tarihleri klinik yerel saatine göre üretilir (WEEKLY: önceki
   * occurrence + interval*7 gün; MONTHLY: ilk occurrence'ın gün-of-ay değeri
   * hedef ayın son gününe clamp edilerek korunur). Tüm occurrence'lar tek bir
   * transaction'da üretilir; mevcut checkConflict tekrar kullanılır:
   *  - Ünit çakışması (sert engel) → o occurrence atlanır, seri devam eder.
   *  - Hekim çakışması (force:false) → 409 ile tüm-veya-hiç rollback.
   */
  async createSeries(dto: CreateAppointmentSeriesDto, clinicId: string) {
    const hasCount = dto.count !== undefined && dto.count !== null;
    const hasUntil = dto.until !== undefined && dto.until !== null;
    if (hasCount === hasUntil) {
      throw new BadRequestException('count veya until alanlarından tam olarak biri gönderilmelidir.');
    }

    const startOn = new Date(dto.startOn);
    const endOn = new Date(dto.endOn);
    if (Number.isNaN(startOn.getTime()) || Number.isNaN(endOn.getTime()) || endOn <= startOn) {
      throw new BadRequestException('Geçersiz başlangıç/bitiş tarihi: endOn, startOn tarihinden sonra olmalıdır.');
    }
    const durationMinutes = Math.round((endOn.getTime() - startOn.getTime()) / 60000);

    // ADR-004 §3: kötüye kullanım/kaza koruması — until en fazla startOn + 2 yıl olabilir.
    const maxUntil = new Date(startOn);
    maxUntil.setUTCFullYear(maxUntil.getUTCFullYear() + APPOINTMENT_SERIES_MAX_UNTIL_YEARS);

    let untilDate: Date | undefined;
    if (hasUntil) {
      untilDate = new Date(dto.until!);
      if (Number.isNaN(untilDate.getTime()) || untilDate < startOn) {
        throw new BadRequestException('until tarihi startOn tarihinden önce olamaz.');
      }
      if (untilDate > maxUntil) {
        throw new BadRequestException(
          `until tarihi başlangıçtan itibaren en fazla ${APPOINTMENT_SERIES_MAX_UNTIL_YEARS} yıl sonrasına kadar olabilir.`,
        );
      }
    }

    // Occurrence başlangıç tarihlerini üret (count veya until sınırına kadar).
    const occurrenceStarts: Date[] = [startOn];
    if (hasCount) {
      for (let i = 1; i < dto.count!; i++) {
        occurrenceStarts.push(
          dto.freq === 'WEEKLY'
            ? addWeeklyOccurrence(occurrenceStarts[i - 1], dto.interval)
            : addMonthlyOccurrence(startOn, i, dto.interval),
        );
      }
    } else {
      // until bazlı üretim — 2 yıl/haftalık kadans üst sınırında dahi makul
      // kalan bir güvenlik sınırı (kötüye kullanım koruması, normalde asla ulaşılmaz).
      const SAFETY_CAP = 500;
      for (let i = 1; i < SAFETY_CAP; i++) {
        const next =
          dto.freq === 'WEEKLY'
            ? addWeeklyOccurrence(occurrenceStarts[i - 1], dto.interval)
            : addMonthlyOccurrence(startOn, i, dto.interval);
        if (next > untilDate!) break;
        occurrenceStarts.push(next);
      }
    }

    const { series, occurrences, skipped } = await this.repo.runInTransaction(async (tx) => {
      const seriesRow = await tx.appointmentSeries.create({
        data: {
          clinicId,
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          chairId: dto.chairId || null,
          type: dto.type,
          notes: dto.notes,
          durationMinutes,
          freq: dto.freq,
          interval: dto.interval,
          count: hasCount ? dto.count : null,
          until: hasUntil ? untilDate : null,
        },
      });

      const createdOccurrences: any[] = [];
      const skippedOccurrences: { seq: number; startOn: Date; endOn: Date; reason: string }[] = [];
      let seq = 0;

      for (const occStart of occurrenceStarts) {
        seq += 1;
        const occEnd = new Date(occStart.getTime() + durationMinutes * 60000);

        try {
          await this.checkConflict(tx, clinicId, dto.doctorId, occStart, occEnd, dto.chairId, undefined, dto.force);
        } catch (err) {
          if (err instanceof ConflictException) {
            const body: any = err.getResponse();
            if (body && typeof body === 'object' && body.conflict === true) {
              // Hekim çakışması (yumuşak, force verilmemiş) — tüm seri geri alınır.
              throw err;
            }
            // Ünit çakışması (sert engel) — bu occurrence atlanır, seri devam eder.
            skippedOccurrences.push({ seq, startOn: occStart, endOn: occEnd, reason: 'CHAIR_CONFLICT' });
            continue;
          }
          throw err;
        }

        const created = await tx.appointment.create({
          data: {
            clinicId,
            patientId: dto.patientId,
            doctorId: dto.doctorId,
            chairId: dto.chairId || null,
            startOn: occStart,
            endOn: occEnd,
            status: 'PLANNED',
            type: dto.type,
            notes: dto.notes,
            seriesId: seriesRow.id,
            seriesSeq: seq,
          },
        });
        createdOccurrences.push(created);
      }

      return { series: seriesRow, occurrences: createdOccurrences, skipped: skippedOccurrences };
    });

    for (const appt of occurrences) {
      this.eventEmitter.emit(
        EVENTS.APPOINTMENT_CREATED,
        new AppointmentCreatedEvent(appt.id, clinicId, dto.patientId, dto.doctorId, appt.startOn, appt.endOn),
      );
    }

    this.logger.log(
      `Randevu serisi oluşturuldu: ${series.id} | ${occurrences.length} occurrence, ${skipped.length} atlandı | Klinik: ${clinicId}`,
    );

    return { seriesId: series.id, occurrences, skipped };
  }

  /**
   * Seri detayını (meta veriler + tüm occurrence'lar) getirir.
   */
  async getSeries(id: string, clinicId: string) {
    const tenantDb = await this.repo.getTenantDb();
    const series = await tenantDb.appointmentSeries.findFirst({ where: { id, clinicId } });
    if (!series) {
      throw new NotFoundException(`Randevu serisi bulunamadı: ${id}`);
    }

    const occurrences = await tenantDb.appointment.findMany({
      where: { seriesId: id, clinicId },
      orderBy: { seriesSeq: 'asc' },
    });

    return { ...series, occurrences };
  }

  /**
   * ADR-004 §3: "Bu ve sonraki etkinlikler" — Google Calendar'ın toplu iptal
   * karşılığı. fromAppointmentId'nin seriesSeq'inden itibaren (dahil) seri
   * içindeki tüm occurrence'ları CANCELLED yapar.
   */
  async cancelRemaining(seriesId: string, clinicId: string, fromAppointmentId: string) {
    const tenantDb = await this.repo.getTenantDb();

    const series = await tenantDb.appointmentSeries.findFirst({ where: { id: seriesId, clinicId } });
    if (!series) {
      throw new NotFoundException(`Randevu serisi bulunamadı: ${seriesId}`);
    }

    const fromAppointment = await tenantDb.appointment.findFirst({
      where: { id: fromAppointmentId, clinicId, seriesId },
    });
    if (!fromAppointment) {
      throw new NotFoundException(`Seri içinde randevu bulunamadı: ${fromAppointmentId}`);
    }

    const result = await tenantDb.appointment.updateMany({
      where: {
        seriesId,
        clinicId,
        seriesSeq: { gte: fromAppointment.seriesSeq },
        status: { not: 'CANCELLED' },
      },
      data: { status: 'CANCELLED' },
    });

    this.logger.log(
      `Seri ileriye dönük iptal edildi: ${seriesId} | seq>=${fromAppointment.seriesSeq} | ${result.count} randevu | Klinik: ${clinicId}`,
    );

    return { cancelledCount: result.count };
  }

  /**
   * Randevuyu genel olarak günceller (tarih, saat, hekim, ünit vb.).
   * Çakışma kontrollerini yapar ve gerekirse durum eventlerini tetikler.
   */
  async update(id: string, clinicId: string, dto: UpdateAppointmentDto) {
    const existing = await this.repo.findById(id);

    if (!existing || existing.clinicId !== clinicId) {
      throw new NotFoundException(`Randevu bulunamadı: ${id}`);
    }

    const doctorId = dto.doctorId !== undefined ? dto.doctorId : existing.doctorId;
    const chairId = dto.chairId !== undefined ? dto.chairId : existing.chairId;
    const startOn = dto.startOn ? new Date(dto.startOn) : new Date(existing.startOn);
    const endOn = dto.endOn ? new Date(dto.endOn) : new Date(existing.endOn);

    const needsConflictCheck =
      dto.doctorId !== undefined ||
      dto.chairId !== undefined ||
      dto.startOn !== undefined ||
      dto.endOn !== undefined;

    const updateData: any = {};
    if (dto.doctorId !== undefined) updateData.doctorId = dto.doctorId;
    if (dto.patientId !== undefined) updateData.patientId = dto.patientId;
    if (dto.chairId !== undefined) updateData.chairId = dto.chairId || null;
    if (dto.startOn !== undefined) updateData.startOn = startOn;
    if (dto.endOn !== undefined) updateData.endOn = endOn;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.type !== undefined) updateData.type = dto.type;

    if (dto.clinicBranchId !== undefined) {
      updateData.clinicBranchId = dto.clinicBranchId || null;
    } else if (dto.chairId) {
      // Şube açıkça belirtilmemiş ama ünit değiştirilmişse, yeni ünitin şubesi miras alınır.
      const tenantDb = await this.repo.getTenantDb();
      const chair = await tenantDb.dentalChair.findFirst({
        where: { id: dto.chairId, clinicId },
        select: { clinicBranchId: true },
      });
      if (chair?.clinicBranchId) updateData.clinicBranchId = chair.clinicBranchId;
    }

    // ADR-004 §3: seri üyesi bir occurrence tek başına düzenlenirse, seriden
    // ayrıştığını işaretlemek için seriesException=true set edilir (Google
    // Calendar'daki "yalnızca bu etkinlik" davranışı).
    if (existing.seriesId) {
      updateData.seriesException = true;
    }

    if (needsConflictCheck) {
      const workHours = await this.checkWorkHours(clinicId, doctorId, startOn, endOn);
      updateData.isOutsideWorkHours = workHours.outsideWorkHours;
    }

    const updated = await this.repo.runInTransaction(async (tx) => {
      if (needsConflictCheck) {
        await this.checkConflict(tx, clinicId, doctorId, startOn, endOn, chairId, id, dto.force);
      }
      return tx.appointment.update({ where: { id }, data: updateData });
    });

    // Domain Events
    if (dto.status && dto.status !== existing.status) {
      if (dto.status === 'COMPLETED') {
        this.eventEmitter.emit(
          EVENTS.APPOINTMENT_COMPLETED,
          new AppointmentCompletedEvent(
            id,
            clinicId,
            updated.patientId,
            updated.doctorId,
          ),
        );
        this.logger.log(`Randevu tamamlandı: ${id}`);
      } else if (dto.status === 'CANCELLED') {
        this.eventEmitter.emit(
          EVENTS.APPOINTMENT_CANCELLED,
          new AppointmentCancelledEvent(
            id,
            clinicId,
            updated.patientId,
            updated.doctorId,
          ),
        );
        this.logger.log(`Randevu iptal edildi: ${id}`);
      } else if (dto.status === 'CONFIRMED') {
        this.eventEmitter.emit(
          EVENTS.APPOINTMENT_CONFIRMED,
          new AppointmentConfirmedEvent(
            id,
            clinicId,
            updated.patientId,
            updated.doctorId,
            updated.endOn,
          ),
        );
      }
    }

    return updated;
  }

  /**
   * Ertelendi akışı (spec §4.3/§10.3): eski randevu 'postponed' olur ve yeni
   * randevuya linklenir; yeni randevu eski bilgilerle 'planned' olarak oluşturulur.
   */
  private async postpone(
    id: string,
    clinicId: string,
    existing: any,
    newStartOnStr: string,
    newEndOnStr: string,
  ) {
    const newStartOn = new Date(newStartOnStr);
    const newEndOn = new Date(newEndOnStr);

    const { updatedOld, newAppointment } = await this.repo.runInTransaction(async (tx) => {
      await this.checkConflict(tx, clinicId, existing.doctorId, newStartOn, newEndOn, existing.chairId);

      const newAppointment = await tx.appointment.create({
        data: {
          clinicId,
          patientId: existing.patientId,
          doctorId: existing.doctorId,
          chairId: existing.chairId,
          startOn: newStartOn,
          endOn: newEndOn,
          status: 'PLANNED',
          notes: existing.notes,
          postponedFrom: id,
        },
      });

      const updatedOld = await tx.appointment.update({
        where: { id },
        data: { status: 'POSTPONED', linkedTo: newAppointment.id },
      });

      return { updatedOld, newAppointment };
    });

    this.eventEmitter.emit(
      EVENTS.APPOINTMENT_CANCELLED,
      new AppointmentCancelledEvent(id, clinicId, existing.patientId, existing.doctorId, 'postponed'),
    );
    this.eventEmitter.emit(
      EVENTS.APPOINTMENT_CREATED,
      new AppointmentCreatedEvent(
        newAppointment.id,
        clinicId,
        existing.patientId,
        existing.doctorId,
        newStartOn,
        newEndOn,
      ),
    );

    this.logger.log(`Randevu ertelendi: ${id} -> ${newAppointment.id}`);

    return { ...updatedOld, newAppointmentId: newAppointment.id };
  }

  /**
   * Randevu durumunu günceller.
   * COMPLETED → AppointmentCompletedEvent fırlatır
   * CANCELLED → AppointmentCancelledEvent fırlatır
   * CONFIRMED → AppointmentConfirmedEvent fırlatır (RemindersService gelmedi kontrolü zamanlar)
   * POSTPONED → yeni randevu oluşturan ayrı bir akış (bkz. postpone())
   */
  async updateStatus(
    id: string,
    clinicId: string,
    dto: UpdateAppointmentStatusDto,
  ) {
    const existing = await this.repo.findById(id);

    if (!existing) {
      throw new NotFoundException(`Randevu bulunamadı: ${id}`);
    }

    if (dto.status === 'POSTPONED') {
      return this.postpone(id, clinicId, existing, dto.newStartOn!, dto.newEndOn!);
    }

    // ADR-004 §3: seri üyesi bir occurrence'ın durumu tek başına değiştirilirse
    // seriden ayrıştığını işaretlemek için seriesException=true set edilir.
    const statusUpdateData: any = { status: dto.status };
    if (existing.seriesId) {
      statusUpdateData.seriesException = true;
    }
    const updated = await this.repo.update(id, statusUpdateData);

    // Domain Events
    if (dto.status === 'COMPLETED') {
      this.eventEmitter.emit(
        EVENTS.APPOINTMENT_COMPLETED,
        new AppointmentCompletedEvent(
          id,
          clinicId,
          existing.patientId,
          existing.doctorId,
        ),
      );
      this.logger.log(`Randevu tamamlandı: ${id}`);
    }

    if (dto.status === 'CONFIRMED') {
      this.eventEmitter.emit(
        EVENTS.APPOINTMENT_CONFIRMED,
        new AppointmentConfirmedEvent(
          id,
          clinicId,
          existing.patientId,
          existing.doctorId,
          updated.endOn,
        ),
      );
    }

    if (dto.status === 'CANCELLED') {
      this.eventEmitter.emit(
        EVENTS.APPOINTMENT_CANCELLED,
        new AppointmentCancelledEvent(
          id,
          clinicId,
          existing.patientId,
          existing.doctorId,
        ),
      );
      this.logger.log(`Randevu iptal edildi: ${id}`);
    }

    return updated;
  }

  /**
   * Takvim görünümü: Tarih aralığına göre randevuları getirir.
   * startDate/endDate opsiyoneldir — verilmezse tarih aralığı filtresi
   * uygulanmaz (ör. bir hastanın TÜM randevularını tarih penceresi olmadan
   * çekmek için, bkz. GET /appointments?patientId=...).
   */
  async findByDate(
    clinicId: string,
    startDate?: string,
    endDate?: string,
    doctorId?: string,
    chairId?: string,
    clinicBranchId?: string,
    patientId?: string,
  ) {
    return this.repo.findByDateRange(
      clinicId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      doctorId,
      chairId,
      clinicBranchId,
      patientId,
    );
  }

  /**
   * Tek randevu detay görünümü.
   */
  async findOne(id: string, clinicId: string) {
    const appointment = await this.repo.findByIdWithRelations(id);

    if (!appointment || appointment.clinicId !== clinicId) {
      throw new NotFoundException(`Randevu bulunamadı: ${id}`);
    }

    return appointment;
  }

  /**
   * Mini takvim doluluk özeti (spec §8.3): ay içindeki her gün için randevu
   * sayısı ve toplam mesai kapasitesi (dakika). doctorIds bir Doctor.id listesi
   * olduğu için (Employee.doctorId köprüsü üzerinden) önce bağlı Employee'ler
   * bulunur — Employee (İK) kaydı olmayan hekimler kapasite hesabına girmez.
   */
  async getOccupancy(clinicId: string, month: string, doctorIds: string[]) {
    const [year, monthNum] = month.split('-').map(Number);
    const monthStart = new Date(year, monthNum - 1, 1);
    const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);

    const tenantDb = await this.repo.getTenantDb();

    const appointmentWhere: any = {
      clinicId,
      startOn: { gte: monthStart, lte: monthEnd },
      status: { not: 'CANCELLED' },
    };
    if (doctorIds.length > 0) appointmentWhere.doctorId = { in: doctorIds };

    const [appointments, employeeIds] = await Promise.all([
      tenantDb.appointment.findMany({ where: appointmentWhere, select: { startOn: true } }),
      doctorIds.length > 0
        ? tenantDb.employee.findMany({ where: { doctorId: { in: doctorIds } }, select: { id: true } })
        : Promise.resolve([]),
    ]);

    const workHours = employeeIds.length > 0
      ? await tenantDb.employeeWorkHour.findMany({
          where: { clinicId, employeeId: { in: employeeIds.map((e: any) => e.id) } },
        })
      : [];

    const totalsByDate = new Map<string, number>();
    for (const a of appointments) {
      const key = formatLocalDate(a.startOn);
      totalsByDate.set(key, (totalsByDate.get(key) || 0) + 1);
    }

    const capacityByDayOfWeek = new Map<number, number>();
    for (const wh of workHours) {
      if (!wh.isWorking || !wh.startTime || !wh.endTime) continue;
      const [sh, sm] = wh.startTime.split(':').map(Number);
      const [eh, em] = wh.endTime.split(':').map(Number);
      const minutes = (eh * 60 + em) - (sh * 60 + sm);
      capacityByDayOfWeek.set(wh.dayOfWeek, (capacityByDayOfWeek.get(wh.dayOfWeek) || 0) + Math.max(minutes, 0));
    }

    const days: { date: string; total: number; capacityMinutes: number }[] = [];
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const key = formatLocalDate(d);
      days.push({
        date: key,
        total: totalsByDate.get(key) || 0,
        capacityMinutes: capacityByDayOfWeek.get(d.getDay()) || 0,
      });
    }

    return days;
  }

  // ==========================================
  // DENTAL CHAIR METHODS
  // ==========================================

  async getChairs(clinicId: string) {
    const tenantDb = await this.repo.getTenantDb();
    let chairs = await tenantDb.dentalChair.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: 'asc' },
    });

    if (chairs.length === 0) {
      await tenantDb.dentalChair.createMany({
        data: [
          { clinicId, name: 'Ünit 1', color: '#3b82f6' },
          { clinicId, name: 'Ünit 2', color: '#10b981' },
          { clinicId, name: 'Ünit 3', color: '#8b5cf6' },
        ],
      });
      chairs = await tenantDb.dentalChair.findMany({
        where: { clinicId, isActive: true },
        orderBy: { name: 'asc' },
      });
    }

    return chairs;
  }

  async createChair(clinicId: string, dto: { name: string; color?: string; clinicBranchId?: string }) {
    const tenantDb = await this.repo.getTenantDb();
    return tenantDb.dentalChair.create({
      data: {
        clinicId,
        name: dto.name,
        color: dto.color || '#3b82f6',
        clinicBranchId: dto.clinicBranchId || null,
      },
    });
  }

  async updateChair(
    id: string,
    clinicId: string,
    dto: { name?: string; color?: string; clinicBranchId?: string; isActive?: boolean },
  ) {
    const tenantDb = await this.repo.getTenantDb();
    const existing = await tenantDb.dentalChair.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Ünit (${id}) bulunamadı.`);
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.clinicBranchId !== undefined) updateData.clinicBranchId = dto.clinicBranchId || null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return tenantDb.dentalChair.update({ where: { id }, data: updateData });
  }
}
