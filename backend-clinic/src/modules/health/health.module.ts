import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
