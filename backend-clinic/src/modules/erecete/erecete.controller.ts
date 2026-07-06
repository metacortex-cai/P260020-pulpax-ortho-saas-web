import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { EreceteService } from './erecete.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEreceteDto } from './dto/erecete.dto';

@ApiTags('e-Reçete / SGK Entegrasyonu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('erecete')
export class EreceteController {
  constructor(private readonly ereceteService: EreceteService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of SGK registered prescriptions' })
  @ApiResponse({ status: 200, description: 'Prescriptions fetched.' })
  getPrescriptions() {
    return this.ereceteService.getPrescriptions();
  }

  @Post()
  @ApiOperation({ summary: 'Register new prescription to SGK Reçetem system' })
  @ApiResponse({ status: 201, description: 'Prescription created successfully.' })
  createPrescription(@Body() body: CreateEreceteDto) {
    return this.ereceteService.createPrescription(body.patientName, body.doctorName, body.medications, body.type);
  }
}
