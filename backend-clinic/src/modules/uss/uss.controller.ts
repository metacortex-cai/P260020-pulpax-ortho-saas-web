import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { UssService } from './uss.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SyncVisitDto, SyncTreatmentDto } from './dto/uss.dto';

@ApiTags('USS / e-Nabız Entegrasyonu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uss')
export class UssController {
  constructor(private readonly ussService: UssService) {}

  @Get('transmissions')
  @ApiOperation({ summary: 'Get history of USS e-Nabız transmissions' })
  @ApiResponse({ status: 200, description: 'List of previous transmissions.' })
  getTransmissions() {
    return this.ussService.getTransmissions();
  }

  @Post('sync/visit')
  @ApiOperation({ summary: 'Sync patient visit to USS' })
  @ApiResponse({ status: 201, description: 'Visit successfully synced.' })
  syncVisit(@Body() body: SyncVisitDto) {
    return this.ussService.syncVisit(body.patientId, body.patientName, body.nationalId);
  }

  @Post('sync/treatment')
  @ApiOperation({ summary: 'Sync treatment to USS' })
  @ApiResponse({ status: 201, description: 'Treatment successfully synced.' })
  syncTreatment(@Body() body: SyncTreatmentDto) {
    return this.ussService.syncTreatment(body.patientName, body.toothNumber, body.procedureCode);
  }
}
