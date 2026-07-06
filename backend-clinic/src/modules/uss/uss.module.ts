import { Module } from '@nestjs/common';
import { UssController } from './uss.controller';
import { UssService } from './uss.service';

@Module({
  controllers: [UssController],
  providers: [UssService],
  exports: [UssService]
})
export class UssModule {}
