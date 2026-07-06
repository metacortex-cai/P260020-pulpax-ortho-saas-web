import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SaasService {
  private readonly logger = new Logger(SaasService.name);
  private static tenantClientCtor: any;
  private static tenantClientCtorPromise: Promise<any> | null = null;

  constructor(private prisma: PrismaService) {}

  /**
   * Lazily and dynamically resolves the per-tenant PrismaClient constructor,
   * preferring the generated tenant client and falling back to the default
   * @prisma/client when it's not resolvable (e.g. dev/watch setups).
   */
  private static async loadTenantClientCtor(): Promise<any> {
    if (SaasService.tenantClientCtor) {
      return SaasService.tenantClientCtor;
    }
    if (!SaasService.tenantClientCtorPromise) {
      SaasService.tenantClientCtorPromise = (async () => {
        try {
          const tenantClientModule = await import('../../prisma/tenant-client');
          return tenantClientModule.PrismaClient;
        } catch {
          const prismaClientModule = await import('@prisma/client');
          return prismaClientModule.PrismaClient;
        }
      })();
    }
    SaasService.tenantClientCtor = await SaasService.tenantClientCtorPromise;
    return SaasService.tenantClientCtor;
  }

  // --- Dashboard Stats ---
  async getDashboardStats() {
    const totalClinics = await this.prisma.clinic.count();
    const activeClinics = await this.prisma.clinic.count({ where: { status: 'ACTIVE' } });
    const suspendedClinics = await this.prisma.clinic.count({ where: { status: 'SUSPENDED' } });
    
    // Geçici MRR ve SMS metrikleri
    const mrr = await this.prisma.clinic.aggregate({
      _sum: { currentBalance: true }
    });
    
    const smsQuotaSum = await this.prisma.clinic.aggregate({
      _sum: { smsQuota: true }
    });

    return {
      totalClinics,
      activeClinics,
      suspendedClinics,
      totalMRR: mrr._sum.currentBalance || 0,
      totalSMSQuota: smsQuotaSum._sum.smsQuota || 0,
    };
  }

  // --- Clinic Management ---
  async getClinics() {
    return this.prisma.clinic.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async createClinic(data: { name: string; taxId?: string; plan?: string; databaseUrl?: string; subscriptionEndDate?: string }) {
    if (!data.name) {
      throw new BadRequestException('Klinik adı zorunludur.');
    }

    return this.prisma.clinic.create({
      data: {
        name: data.name,
        taxId: data.taxId,
        plan: data.plan || 'FREE',
        databaseUrl: data.databaseUrl,
        subscriptionEndDate: data.subscriptionEndDate ? new Date(data.subscriptionEndDate) : null,
        status: 'ACTIVE'
      }
    });
  }

  async updateClinic(id: string, data: { status?: string; plan?: string; databaseUrl?: string; subscriptionEndDate?: string; smsQuota?: number }) {
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.plan) updateData.plan = data.plan;
    if (data.databaseUrl) updateData.databaseUrl = data.databaseUrl;
    if (data.subscriptionEndDate) updateData.subscriptionEndDate = new Date(data.subscriptionEndDate);
    if (data.smsQuota !== undefined) updateData.smsQuota = data.smsQuota;

    return this.prisma.clinic.update({
      where: { id },
      data: updateData
    });
  }

  // --- SaaS Admin User Management ---
  async getAdmins() {
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          in: ['SAAS_SUPERADMIN', 'SAAS_BILLING', 'SAAS_SUPPORT']
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Decrypt emails before returning to dashboard!
    return users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: EncryptionUtil.decrypt(user.email) || user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    }));
  }

  async createAdmin(data: { firstName: string; lastName: string; email: string; role: string; password?: string }) {
    if (!data.email || !data.firstName || !data.role || !data.password) {
      throw new BadRequestException('Ad, e-posta, rol ve şifre zorunludur.');
    }

    const emailHash = EncryptionUtil.hashEmail(data.email);
    const existing = await this.prisma.user.findUnique({ where: { emailHash } });
    if (existing) {
      throw new BadRequestException('Bu e-posta adresi zaten kullanımda.');
    }

    const encryptedEmail = EncryptionUtil.encrypt(data.email);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: encryptedEmail,
        emailHash,
        password: hashedPassword,
        role: data.role,
        isActive: true
      }
    });
  }

  async updateAdmin(id: string, data: { firstName?: string; lastName?: string; email?: string; role?: string; password?: string; isActive?: boolean }) {
    const existingAdmin = await this.prisma.user.findUnique({ where: { id } });
    if (!existingAdmin) {
      throw new BadRequestException('Yönetici bulunamadı.');
    }

    // SAAS_SUPERADMIN koruması
    if (existingAdmin.role === 'SAAS_SUPERADMIN') {
      if (data.isActive === false) {
        throw new BadRequestException('Süper Admin hesapları sistemden deaktif edilemez.');
      }
      if (data.role && data.role !== 'SAAS_SUPERADMIN') {
        throw new BadRequestException('Süper Admin yetkisi düşürülemez.');
      }
    }

    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
      if (data.isActive === false) {
        updateData.deactivatedAt = new Date();
        updateData.deactivationReason = 'Sistem Yöneticisi Tarafından Kapatıldı';
      } else {
        updateData.deactivatedAt = null;
        updateData.deactivationReason = null;
      }
    }

    if (data.email) {
      const emailHash = EncryptionUtil.hashEmail(data.email);
      const duplicate = await this.prisma.user.findFirst({
        where: { emailHash, NOT: { id } }
      });
      if (duplicate) {
        throw new BadRequestException('Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.');
      }
      updateData.email = EncryptionUtil.encrypt(data.email);
      updateData.emailHash = emailHash;
    }

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData
    });
  }

  // --- Tariff Package Publishing ---
  async publishTariffPackage(dto: {
    year: number;
    name: string;
    treatments: Array<{
      sutCode: string;
      name: string;
      category: string;
      vatRate: number;
      priceExclVat: number;
      priceInclVat: number;
    }>;
  }) {
    const clinics = await this.prisma.clinic.findMany({
      where: { status: 'ACTIVE' },
    });

    let clinicsUpdated = 0;
    const errors: string[] = [];

    for (const clinic of clinics) {
      if (!clinic.databaseUrl) continue;

      const TenantClient = await SaasService.loadTenantClientCtor();
      const db = new TenantClient({
        datasources: { db: { url: clinic.databaseUrl } },
      });

      try {
        await db.$connect();

        await db.$transaction(async (tx: any) => {
          const tariffIds: string[] = [];
          const masterTreatmentIds: string[] = [];

          for (const t of dto.treatments) {
            // Upsert MasterTreatment by sutCode
            let mt = await tx.masterTreatment.findFirst({
              where: { sutCode: t.sutCode },
            });

            if (!mt) {
              mt = await tx.masterTreatment.create({
                data: { name: t.name, sutCode: t.sutCode, category: t.category },
              });
            } else {
              mt = await tx.masterTreatment.update({
                where: { id: mt.id },
                data: { name: t.name, category: t.category },
              });
            }
            masterTreatmentIds.push(mt.id);

            // Upsert Tariff
            let tariff = await tx.tariff.findFirst({
              where: { clinicId: clinic.id, masterTreatmentId: mt.id },
            });

            if (!tariff) {
              tariff = await tx.tariff.create({
                data: {
                  clinicId: clinic.id,
                  masterTreatmentId: mt.id,
                  price: t.priceInclVat,
                  taxRate: t.vatRate,
                  status: 'AKTİF',
                  currency: 'TRY',
                },
              });
            } else {
              tariff = await tx.tariff.update({
                where: { id: tariff.id },
                data: { price: t.priceInclVat, taxRate: t.vatRate },
              });
            }
            tariffIds.push(tariff.id);
          }

          // Remove existing isDefault TariffGroups for this clinic
          const existing = await tx.tariffGroup.findMany({
            where: { clinicId: clinic.id, isDefault: true },
          });
          for (const eg of existing) {
            await tx.tariffGroup.delete({ where: { id: eg.id } });
          }

          // Create new TariffGroup
          const group = await tx.tariffGroup.create({
            data: {
              clinicId: clinic.id,
              name: dto.name,
              isDefault: true,
              isActive: true,
            },
          });

          // Create TariffGroupEntries in batches
          const BATCH = 50;
          for (let i = 0; i < dto.treatments.length; i += BATCH) {
            const batch = dto.treatments.slice(i, i + BATCH).map((_, j) => ({
              groupId: group.id,
              tariffId: tariffIds[i + j],
              masterTreatmentId: masterTreatmentIds[i + j],
              customPrice: null,
            }));
            await tx.tariffGroupEntry.createMany({ data: batch, skipDuplicates: true });
          }
        });

        clinicsUpdated++;
        this.logger.log(`Tarife yayınlandı: ${clinic.name}`);
      } catch (err: any) {
        this.logger.error(`Hata (${clinic.name}): ${err.message}`);
        errors.push(`${clinic.name}: ${err.message}`);
      } finally {
        await db.$disconnect();
      }
    }

    return {
      publishedAt: new Date().toISOString(),
      clinicsUpdated,
      errors,
    };
  }

  // --- Audit Logging ---
  async logAction(userId: string, action: string, target: string, ipAddress?: string) {
    return this.prisma.masterAuditLog.create({
      data: {
        userId,
        action,
        target,
        ipAddress
      }
    });
  }

  async getAuditLogs() {
    return this.prisma.masterAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }
}
