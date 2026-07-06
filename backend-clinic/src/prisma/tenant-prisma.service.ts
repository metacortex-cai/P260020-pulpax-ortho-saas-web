import { Injectable, OnModuleDestroy, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { CacheService } from '../common/cache/cache.service';

@Injectable()
export class TenantPrismaService implements OnModuleDestroy {
  private static clients: Map<string, any> = new Map();
  private static tenantClientCtor: any;
  private static tenantClientCtorPromise: Promise<any> | null = null;
  private readonly logger = new Logger(TenantPrismaService.name);

  constructor(
    private readonly masterPrisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Lazily and dynamically resolves the tenant PrismaClient constructor.
   * Prefers the locally generated per-tenant client and falls back to the
   * default @prisma/client if it's not resolvable (e.g. dev/watch setups).
   */
  private static async loadTenantClientCtor(): Promise<any> {
    if (TenantPrismaService.tenantClientCtor) {
      return TenantPrismaService.tenantClientCtor;
    }
    if (!TenantPrismaService.tenantClientCtorPromise) {
      TenantPrismaService.tenantClientCtorPromise = (async () => {
        try {
          const tenantClientModule = await import('./tenant-client');
          return tenantClientModule.PrismaClient;
        } catch {
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
   * Uses Redis to cache connection strings and prevent DB pressure on every request.
   */
  async getClient(): Promise<any> {
    const clinicId = TenantContext.getClinicId();
    if (!clinicId) {
      throw new NotFoundException('Klinik bağlamı (tenant context) bulunamadı.');
    }

    // 1. Check Redis Cache for connection string
    const cacheKey = `clinic:db:${clinicId}`;
    let databaseUrl = await this.cache.get<string>(cacheKey);

    if (!databaseUrl) {
      this.logger.debug(`Cache miss for clinic ${clinicId}, querying master DB...`);
      const clinic = await this.masterPrisma.clinic.findUnique({
        where: { id: clinicId },
        select: { databaseUrl: true }
      });

      if (!clinic || !clinic.databaseUrl) {
        throw new NotFoundException(`Klinik veritabanı bulunamadı. (${clinicId})`);
      }

      databaseUrl = clinic.databaseUrl;
      // Cache connection string for 10 minutes
      await this.cache.set(cacheKey, databaseUrl, 600);
    }

    // 2. Connection Pool Management (In-Memory)
    let client = TenantPrismaService.clients.get(databaseUrl);
    if (!client) {
      this.logger.log(`Yeni bağlantı havuzu oluşturuluyor: ${clinicId}`);
      const TenantClient = await TenantPrismaService.loadTenantClientCtor();
      client = new TenantClient({
        datasources: { db: { url: databaseUrl } },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
      await client.$connect();
      TenantPrismaService.clients.set(databaseUrl, client);
    }

    return client;
  }

  async onModuleDestroy() {
    this.logger.log('Bağlantı havuzları kapatılıyor...');
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
