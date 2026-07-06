import { Module } from '@nestjs/common';
import { ProtocolsController } from './protocols.controller';
import { ProtocolsService } from './protocols.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UssModule } from '../uss/uss.module';

@Module({
  imports: [PrismaModule, UssModule],
  controllers: [ProtocolsController],
  providers: [ProtocolsService],
  exports: [ProtocolsService],
})
export class ProtocolsModule {}
