import { Module } from '@nestjs/common';
import { OrthodonticsService } from './orthodontics.service';
import { OrthodonticsController } from './orthodontics.controller';

@Module({
  controllers: [OrthodonticsController],
  providers: [OrthodonticsService],
  exports: [OrthodonticsService],
})
export class OrthodonticsModule {}
