import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { doctorPhotoMulterOptions } from './multer-doctor-photo.config';

@Controller('doctors')
@UseGuards(JwtAuthGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  /**
   * GET /api/v1/doctors?includePassive=
   * Randevu/tedavi/ortodonti ekranlarındaki hekim seçim listelerini besler.
   */
  @Get()
  findAll(
    @Headers('X-Tenant-ID') clinicId: string,
    @Query('includePassive') includePassive?: string,
  ) {
    return this.doctorsService.findAll(clinicId, includePassive === 'true');
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.doctorsService.findOne(id, clinicId);
  }

  @Post()
  create(
    @Body() dto: CreateDoctorDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.doctorsService.create(dto, clinicId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDoctorDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.doctorsService.update(id, dto, clinicId);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file', doctorPhotoMulterOptions))
  uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @UploadedFile() file: any,
  ) {
    return this.doctorsService.uploadPhoto(id, clinicId, file);
  }

  @Delete(':id/photo')
  deletePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.doctorsService.deletePhoto(id, clinicId);
  }
}
