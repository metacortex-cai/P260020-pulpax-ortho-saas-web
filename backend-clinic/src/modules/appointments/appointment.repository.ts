import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantBaseRepository } from '../../common/database/tenant-base.repository';
@Injectable()
export class AppointmentRepository extends TenantBaseRepository<any, any, any> {
  constructor(tenantPrisma: TenantPrismaService, private readonly prisma: PrismaService) {
    super(tenantPrisma, 'appointment');
  }

  /**
   * doctorId tenant DB'deki Employee tablosuna işaret eder (bkz. tenant.prisma
   * Appointment.doctor ilişkisi); Prisma bu ilişkiyi include ile çözemiyor çünkü
   * TenantBaseRepository dinamik/çok-tenantlı bir client kullanıyor, bu yüzden
   * hekim bilgisi burada ayrı bir sorgu ile manuel olarak birleştiriliyor.
   */
  private async attachDoctors<T extends { doctorId: string }>(appointments: T[]): Promise<(T & { doctor: { firstName: string; lastName: string } | null })[]> {
    const doctorIds = [...new Set(appointments.map(a => a.doctorId).filter(Boolean))];
    if (doctorIds.length === 0) {
      return appointments.map(a => ({ ...a, doctor: null }));
    }

    const tenantDb = await this.getTenantDb();
    const doctors: { id: string; firstName: string; lastName: string }[] = await tenantDb.employee.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const doctorMap = new Map<string, { firstName: string; lastName: string }>(
      doctors.map(d => [d.id, { firstName: d.firstName, lastName: d.lastName }])
    );

    return appointments.map(a => ({ ...a, doctor: doctorMap.get(a.doctorId) || null }));
  }

  async getTenantDb(): Promise<any> {
    return this.tenantPrisma.getClient();
  }

  async getDoctorName(doctorId: string): Promise<string | null> {
    const tenantDb = await this.getTenantDb();
    const doctor = await tenantDb.employee.findUnique({
      where: { id: doctorId },
      select: { firstName: true, lastName: true },
    });
    return doctor ? `${doctor.firstName} ${doctor.lastName}` : null;
  }

  /**
   * Çakışma kontrolü + yazma işlemini tek bir DB transaction'ı içinde çalıştırır.
   * Aksi halde iki eşzamanlı istek arasında "check-then-act" penceresinde
   * aynı doktor/ünit saatine çift randevu yazılabilir (race condition).
   */
  async runInTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const client = await this.tenantPrisma.getClient();
    return client.$transaction(fn);
  }

  /**
   * LLD 2.3: Çakışma Kontrolü — Hekimin aynı saat diliminde aktif randevusu var mı?
   * İptal/Ertelenmiş randevular hariç tutulur.
   */
  async findConflicting(
    clinicId: string,
    doctorId: string,
    startOn: Date,
    endOn: Date,
    excludeId?: string,
  ): Promise<any | null> {
    const delegate = await this.getDelegate();
    const where: any = {
      clinicId,
      doctorId,
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      startOn: { lt: endOn },
      endOn: { gt: startOn },
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return delegate.findFirst({ where });
  }

  /**
   * Hekimin belirtilen tarih aralığında izni olup olmadığını kontrol eder.
   */
  async findActiveLeave(
    clinicId: string,
    doctorId: string,
    startOn: Date,
    endOn: Date,
  ) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.employeeLeave.findFirst({
      where: {
        clinicId,
        employeeId: doctorId,
        startAt: { lte: startOn },
        endAt: { gte: endOn },
      },
    });
  }

  /**
   * Ünit (koltuk) bazlı çakışan aktif randevu kontrolü yapar.
   */
  async findConflictingOnChair(
    clinicId: string,
    chairId: string,
    startOn: Date,
    endOn: Date,
    excludeId?: string,
  ): Promise<any | null> {
    const delegate = await this.getDelegate();
    const where: any = {
      clinicId,
      chairId,
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      startOn: { lt: endOn },
      endOn: { gt: startOn },
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return delegate.findFirst({ where });
  }

  /**
   * Takvim görünümü için tarih aralığına göre randevuları getirir.
   * Opsiyonel hekim ve ünit filtresi destekler.
   */
  async findByDateRange(
    clinicId: string,
    startDate: Date,
    endDate: Date,
    doctorId?: string,
    chairId?: string,
  ): Promise<any[]> {
    const delegate = await this.getDelegate();
    const where: any = {
      clinicId,
      startOn: { gte: startDate },
      endOn: { lte: endDate },
    };

    if (doctorId) {
      where.doctorId = doctorId;
    }
    if (chairId) {
      where.chairId = chairId;
    }

    const appointments = await delegate.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true, phone: true, fileNo: true } },
        dentalChair: { select: { id: true, name: true, color: true } },
      },
      orderBy: { startOn: 'asc' },
    });

    return this.attachDoctors(appointments);
  }

  /**
   * Tek randevuyu ilişkili hasta, hekim, ünit ve tedavi bilgileriyle birlikte getirir.
   */
  async findByIdWithRelations(id: string): Promise<any | null> {
    const delegate = await this.getDelegate();
    const appointment = await delegate.findUnique({
      where: { id },
      include: {
        patient: { select: { firstName: true, lastName: true, phone: true, fileNo: true } },
        dentalChair: { select: { id: true, name: true, color: true } },
        treatmentItems: {
          include: {
            tariff: {
              include: { masterTreatment: true }
            }
          }
        }
      },
    });

    if (!appointment) return null;

    const [withDoctor] = await this.attachDoctors([appointment]);
    return withDoctor;
  }
}
