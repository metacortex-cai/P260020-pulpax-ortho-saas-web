import { Injectable, OnModuleDestroy, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantContext } from '../common/context/tenant-context';

@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
  // Use `any` for the runtime-resolved tenant client type in dev mode.
  private static clients: Map<string, any> = new Map();
  private static tenantClientCtor: any;
  private static tenantClientCtorPromise: Promise<any> | null = null;
  private readonly logger = new Logger(TenantPrismaService.name);

  constructor(private readonly masterPrisma: PrismaService) {}

  /**
   * Attempt to lazily and dynamically load the generated isolated Prisma
   * client for tenants. In some dev setups the generated client may not be
   * resolvable at runtime (watch mode or different paths). Fallback to the
   * default @prisma/client PrismaClient so the app can still run in
   * development environments.
   */
  private static async loadTenantClientCtor(): Promise<any> {
    if (TenantPrismaService.tenantClientCtor) {
      return TenantPrismaService.tenantClientCtor;
    }
    if (!TenantPrismaService.tenantClientCtorPromise) {
      TenantPrismaService.tenantClientCtorPromise = (async () => {
        try {
          // Prefer the local generated client in src/prisma/tenant-client
          const tenantClientModule = await import('./tenant-client');
          return tenantClientModule.PrismaClient;
        } catch {
          // Fallback to the regular Prisma client
          const prismaClientModule = await import('@prisma/client');
          return prismaClientModule.PrismaClient;
        }
      })();
    }
    TenantPrismaService.tenantClientCtor = await TenantPrismaService.tenantClientCtorPromise;
    return TenantPrismaService.tenantClientCtor;
  }

  /**
   * Retrieves the dynamic, physically isolated PrismaClient for the current request's tenant.
   * Leverages caching to prevent database connection pool exhaustion.
   */
  async getClient(): Promise<any> {
    const clinicId = TenantContext.getClinicId();
    if (!clinicId) {
      throw new NotFoundException('Klinik bağlamı (tenant context) bulunamadı. İşlem durduruldu.');
    }

    // 1. Query the Master Database to retrieve the isolated database connection string
    const clinic = await this.masterPrisma.clinic.findUnique({
      where: { id: clinicId }
    });

    if (!clinic) {
      throw new NotFoundException(`Sistemde kayıtlı klinik bulunamadı. (clinicId: ${clinicId})`);
    }

    const databaseUrl = clinic.databaseUrl;
    if (!databaseUrl) {
      throw new NotFoundException(`Klinik veritabanı adresi tanımlanmamış. (clinicId: ${clinicId})`);
    }

    // 2. Fetch from connection pool cache, or instantiate a new Client
    let client = TenantPrismaService.clients.get(databaseUrl);
    if (!client) {
      this.logger.log(`Yeni izole veritabanı bağlantısı kuruluyor: ${clinic.name} (${clinicId})`);
      const TenantClient = await TenantPrismaService.loadTenantClientCtor();
      client = new TenantClient({
        datasources: {
          db: { url: databaseUrl }
        }
      });
      await client.$connect();
      TenantPrismaService.clients.set(databaseUrl, client);
    }

    // Dynamic proxy to allow target operations like `tenantPrisma.patient` directly on the resolved Client
    return client;
  }

  // Gracefully close all cached tenant connection pools on shutdown
  async onModuleDestroy() {
    this.logger.log('Tüm aktif izole veritabanı bağlantı havuzları kapatılıyor...');
    for (const [url, client] of TenantPrismaService.clients.entries()) {
      try {
        await client.$disconnect();
      } catch (err) {
        this.logger.error(`Bağlantı kapatılamadı: ${url}`, err);
      }
    }
    TenantPrismaService.clients.clear();
  }
}
