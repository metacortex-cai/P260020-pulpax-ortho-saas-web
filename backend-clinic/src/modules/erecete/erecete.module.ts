import { Module } from '@nestjs/common';
import { EreceteController } from './erecete.controller';
import { EreceteService } from './erecete.service';

@Module({
  controllers: [EreceteController],
  providers: [EreceteService],
  exports: [EreceteService]
})
export class EreceteModule {}
