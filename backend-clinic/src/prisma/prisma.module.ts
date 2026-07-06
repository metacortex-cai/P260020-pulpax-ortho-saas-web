import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantPrismaService } from './tenant-prisma.service';
import { CacheModule } from '../common/cache/cache.module';

@Global()
@Module({
  imports: [CacheModule],
  providers: [PrismaService, TenantPrismaService],
  exports: [PrismaService, TenantPrismaService],
})
export class PrismaModule {}

