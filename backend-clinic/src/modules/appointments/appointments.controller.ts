import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CheckWorkHoursDto } from './dto/check-work-hours.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * POST /api/v1/appointments
   * Yeni randevu oluşturur. Çakışma varsa 409 döner.
   */
  @Post()
  create(
    @Body() createDto: CreateAppointmentDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.appointmentsService.create(createDto, clinicId);
  }

  /**
   * PATCH /api/v1/appointments/:id/status
   * Randevu durumunu günceller (COMPLETED → prim tetikler, CANCELLED → event fırlatır).
   */
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateAppointmentStatusDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.appointmentsService.updateStatus(id, clinicId, updateDto);
  }

  /**
   * POST /api/v1/appointments/check-work-hours
   * Hekimin mesai saatleri dışında olup olmadığını kontrol eder (bloke etmez, yumuşak uyarı).
   */
  @Post('check-work-hours')
  checkWorkHours(
    @Body() body: CheckWorkHoursDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.appointmentsService.checkWorkHours(
      clinicId,
      body.employeeId,
      new Date(body.startOn),
      new Date(body.endOn),
    );
  }

  /**
   * GET /api/v1/appointments/chairs
   * Kliniğe ait aktif ünitleri (diş koltuklarını) listeler.
   */
  @Get('chairs')
  getChairs(@Headers('X-Tenant-ID') clinicId: string) {
    return this.appointmentsService.getChairs(clinicId);
  }

  /**
   * POST /api/v1/appointments/chairs
   * Kliniğe yeni ünit (diş koltuğu) ekler.
   */
  @Post('chairs')
  createChair(
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() body: { name: string; color?: string },
  ) {
    return this.appointmentsService.createChair(clinicId, body);
  }

  /**
   * GET /api/v1/appointments?startDate=...&endDate=...&doctorId=...&chairId=...
   * Takvim görünümü: Tarih aralığına göre randevuları listeler.
   */
  @Get()
  findByDate(
    @Headers('X-Tenant-ID') clinicId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('doctorId') doctorId?: string,
    @Query('chairId') chairId?: string,
  ) {
    return this.appointmentsService.findByDate(
      clinicId,
      startDate,
      endDate,
      doctorId,
      chairId,
    );
  }

  /**
   * GET /api/v1/appointments/occupancy?month=2026-07&doctorIds=a,b
   * Mini takvim doluluk özeti (spec §8.3). ':id' route'undan ÖNCE tanımlı olmalı.
   */
  @Get('occupancy')
  getOccupancy(
    @Headers('X-Tenant-ID') clinicId: string,
    @Query('month') month: string,
    @Query('doctorIds') doctorIds?: string,
  ) {
    const ids = (doctorIds || '').split(',').map((s) => s.trim()).filter(Boolean);
    return this.appointmentsService.getOccupancy(clinicId, month, ids);
  }

  /**
   * GET /api/v1/appointments/:id
   * Tekil randevu detayı (hasta + hekim bilgileri dahil).
   */
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.appointmentsService.findOne(id, clinicId);
  }

  /**
   * PATCH /api/v1/appointments/:id
   * Randevu bilgilerini günceller (tarih, saat, hekim, ünit vb.).
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateAppointmentDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.appointmentsService.update(id, clinicId, body);
  }
}
