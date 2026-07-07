import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentRepository } from './appointment.repository';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
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

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly repo: AppointmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
   * Mesai saati kontrolü — İK/personel mesai modülü kaldırıldığı için (bkz.
   * scope-reduction kararı) artık hiçbir mesai tanımı yok; her zaman "mesai
   * dışı değil" döner. İmza/endpoint geriye dönük uyumluluk için korunuyor.
   */
  async checkWorkHours(
    _clinicId: string,
    _employeeId: string,
    _startOn: Date,
    _endOn: Date,
  ): Promise<{
    outsideWorkHours: boolean;
    employeeName?: string | null;
    workStart?: string | null;
    workEnd?: string | null;
    message?: string;
  }> {
    return { outsideWorkHours: false };
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

    const appointment = await this.repo.runInTransaction(async (tx) => {
      await this.checkConflict(tx, clinicId, dto.doctorId, startOn, endOn, dto.chairId, undefined, dto.force);

      const created = await tx.appointment.create({
        data: {
          clinicId,
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          chairId: dto.chairId || null,
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

    const updated = await this.repo.update(id, { status: dto.status });

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
   */
  async findByDate(
    clinicId: string,
    startDate: string,
    endDate: string,
    doctorId?: string,
    chairId?: string,
  ) {
    return this.repo.findByDateRange(
      clinicId,
      new Date(startDate),
      new Date(endDate),
      doctorId,
      chairId,
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
   * sayısı. Mesai (kapasite) tanımı İK modülüyle birlikte kaldırıldığı için
   * (bkz. scope-reduction kararı) capacityMinutes her zaman 0 döner —
   * frontend'de doluluk yüzdesi artık hesaplanamaz, yalnızca günlük randevu
   * sayısı gösterilir.
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

    const appointments = await tenantDb.appointment.findMany({ where: appointmentWhere, select: { startOn: true } });

    const totalsByDate = new Map<string, number>();
    for (const a of appointments) {
      const key = formatLocalDate(a.startOn);
      totalsByDate.set(key, (totalsByDate.get(key) || 0) + 1);
    }

    const days: { date: string; total: number; capacityMinutes: number }[] = [];
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const key = formatLocalDate(d);
      days.push({
        date: key,
        total: totalsByDate.get(key) || 0,
        capacityMinutes: 0,
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

  async createChair(clinicId: string, dto: { name: string; color?: string }) {
    const tenantDb = await this.repo.getTenantDb();
    return tenantDb.dentalChair.create({
      data: {
        clinicId,
        name: dto.name,
        color: dto.color || '#3b82f6',
      },
    });
  }
}
