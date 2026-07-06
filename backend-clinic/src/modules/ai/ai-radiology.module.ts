import { Module } from '@nestjs/common';
import { AiRadiologyController } from './ai-radiology.controller';
import { AiRadiologyService } from './ai-radiology.service';

@Module({
  controllers: [AiRadiologyController],
  providers: [AiRadiologyService],
  exports: [AiRadiologyService]
})
export class AiRadiologyModule {}
