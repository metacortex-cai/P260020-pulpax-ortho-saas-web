import { Module } from '@nestjs/common';
import { EfaturaController } from './efatura.controller';
import { EfaturaService } from './efatura.service';

@Module({
  controllers: [EfaturaController],
  providers: [EfaturaService],
  exports: [EfaturaService]
})
export class EfaturaModule {}
