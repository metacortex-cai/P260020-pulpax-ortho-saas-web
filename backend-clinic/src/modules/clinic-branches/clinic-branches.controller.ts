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
import { ClinicBranchesService } from './clinic-branches.service';
import { CreateClinicBranchDto } from './dto/create-clinic-branch.dto';
import { UpdateClinicBranchDto } from './dto/update-clinic-branch.dto';

@Controller('clinic-branches')
@UseGuards(JwtAuthGuard)
export class ClinicBranchesController {
  constructor(private readonly clinicBranchesService: ClinicBranchesService) {}

  @Get()
  findAll(
    @Headers('X-Tenant-ID') clinicId: string,
    @Query('includePassive') includePassive?: string,
  ) {
    return this.clinicBranchesService.findAll(clinicId, includePassive === 'true');
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.clinicBranchesService.findOne(id, clinicId);
  }

  @Post()
  create(
    @Body() dto: CreateClinicBranchDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.clinicBranchesService.create(dto, clinicId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicBranchDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.clinicBranchesService.update(id, dto, clinicId);
  }
}
