import { Controller, Get, Post, Delete, Body, Param, Patch, Query, Req, UseGuards, UseInterceptors, UploadedFile, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmployeesService } from './employees.service';
import { PrimService } from './prim.service';
import { CreateEmployeeDto, DeactivateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { CreateLeaveDto, CreateContractDto, UpdateContractDto, BulkUpdateWorkHoursDto, UpdateLeaveStatusDto, UpsertLeaveEntitlementDto } from './dto/hr.dto';
import { UpsertEmployeeProfileDto } from './dto/employee-profile.dto';
import { CreateEmployeeContactDto } from './dto/employee-contact.dto';
import { UploadEmployeeDocumentDto } from './dto/employee-document.dto';
import { employeeDocumentMulterOptions } from './multer-employee-document.config';
import { employeePhotoMulterOptions } from './multer-employee-photo.config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly primService: PrimService,
  ) {}

  @Post()
  create(@Body() createDto: CreateEmployeeDto, @Req() req: any) {
    const clinicId = req.user.tenantId; 
    return this.employeesService.create(createDto, clinicId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmployeeDto,
    @Req() req: any
  ) {
    const clinicId = req.user.tenantId;
    return this.employeesService.update(id, updateDto, clinicId);
  }

  @Get()
  findAll(@Query('includePassive') includePassive: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.findAll(clinicId, includePassive === 'true');
  }

  @Get('leaves')
  findAllLeaves(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.findAllLeaves(clinicId, startDate, endDate);
  }

  @Patch('leaves/:id/status')
  updateLeaveStatus(@Param('id') id: string, @Body() dto: UpdateLeaveStatusDto, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.updateLeaveStatus(id, clinicId, dto, req.user?.id);
  }

  @Get(':id/leave-entitlement')
  getLeaveEntitlement(@Param('id') id: string, @Query('year') year: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.employeesService.getLeaveEntitlement(id, clinicId, targetYear);
  }

  @Post(':id/leave-entitlement')
  upsertLeaveEntitlement(@Param('id') id: string, @Body() dto: UpsertLeaveEntitlementDto, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.upsertLeaveEntitlement(id, clinicId, dto);
  }

  // Takvim ekranı, seçili hekimlerin mesai saatlerini tek istekte çeker (?employeeIds=a,b,c)
  // NOT: bu route ':id' route'undan ÖNCE tanımlı olmalı, aksi halde "work-hours" bir :id olarak yakalanır.
  @Get('work-hours')
  getWorkHoursBulk(@Query('employeeIds') employeeIds: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    const ids = (employeeIds || '').split(',').map((s) => s.trim()).filter(Boolean);
    return this.employeesService.getWorkHoursBulk(ids, clinicId);
  }

  // --- Prim Raporlama (ADR-003 Faz 3 §11) — ':id' route'undan ÖNCE tanımlı olmalı ---

  @Get('reports/prim')
  getPrimReport(
    @Query('employeeId') employeeId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: any,
  ) {
    if (!['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
      throw new ForbiddenException('Prim raporunu görüntüleme yetkiniz yok.');
    }
    const clinicId = req.user.tenantId;
    return this.primService.getReport(clinicId, { employeeId, from, to });
  }

  @Get('me/prim-report')
  getMyPrimReport(@Query('from') from: string, @Query('to') to: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.primService.getReport(clinicId, { employeeId: req.user.id, from, to });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.findOne(id, clinicId);
  }

  @Get(':id/termination-impact')
  getTerminationImpact(@Param('id') id: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.getTerminationImpact(id, clinicId);
  }

  @Patch(':id/deactivate')
  deactivate(
    @Param('id') id: string,
    @Body() deactivateDto: DeactivateEmployeeDto,
    @Req() req: any
  ) {
    const clinicId = req.user.tenantId;
    return this.employeesService.deactivate(
      id,
      deactivateDto.reason,
      clinicId,
      deactivateDto.deactivatedAt,
      deactivateDto.transferToEmployeeId,
      req.user?.id,
    );
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.reactivate(id, clinicId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.remove(id, clinicId);
  }

  // Var olan bir personele giriş hesabı (User) bağlar — "Kullanıcı Hesabı Oluştur" akışı.
  @Post(':id/invite')
  invite(@Param('id') id: string, @Body() dto: InviteEmployeeDto, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.invite(id, clinicId, dto);
  }

  // --- HR / Tenant Endpoints ---

  @Post('leaves')
  createLeave(@Body() dto: CreateLeaveDto, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.createLeave(dto, clinicId);
  }

  @Post('contracts')
  createContract(@Body() dto: CreateContractDto, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.createContract(dto, clinicId);
  }

  @Patch('contracts/:id')
  updateContract(@Param('id') id: string, @Body() dto: UpdateContractDto, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.updateContract(id, dto, clinicId);
  }

  @Delete('contracts/:id')
  deleteContract(@Param('id') id: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.deleteContract(id, clinicId);
  }

  @Get(':id/commissions')
  getCommissions(@Param('id') id: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.primService.findByEmployee(clinicId, id);
  }

  @Post('work-hours')
  updateWorkHours(@Body() dto: BulkUpdateWorkHoursDto, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.updateWorkHours(dto, clinicId);
  }

  // --- Personel Profili (ADR-003) ---

  @Get(':id/profile')
  getProfile(@Param('id') id: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.getProfile(id, clinicId);
  }

  @Post(':id/profile')
  upsertProfile(@Param('id') id: string, @Body() dto: UpsertEmployeeProfileDto, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.upsertProfile(id, clinicId, dto);
  }

  // --- İletişim Bilgileri (ADR-003) ---

  @Get(':id/contacts')
  listContacts(@Param('id') id: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.listContacts(id, clinicId);
  }

  @Post(':id/contacts')
  createContact(@Param('id') id: string, @Body() dto: CreateEmployeeContactDto, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.createContact(id, clinicId, dto);
  }

  @Delete(':id/contacts/:contactId')
  deleteContact(@Param('id') id: string, @Param('contactId') contactId: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.deleteContact(id, clinicId, contactId);
  }

  // --- Dokümanlar (ADR-003) ---

  @Get(':id/documents')
  listDocuments(@Param('id') id: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.listDocuments(id, clinicId);
  }

  @Post(':id/documents/upload')
  @UseInterceptors(FileInterceptor('file', employeeDocumentMulterOptions))
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body() dto: UploadEmployeeDocumentDto,
    @Req() req: any,
  ) {
    const clinicId = req.user.tenantId;
    return this.employeesService.addDocumentWithFile(id, clinicId, file, dto, req.user?.id);
  }

  @Delete(':id/documents/:documentId')
  deleteDocument(@Param('id') id: string, @Param('documentId') documentId: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.deleteDocument(id, clinicId, documentId);
  }

  // --- Profil Fotoğrafı ---

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file', employeePhotoMulterOptions))
  uploadPhoto(@Param('id') id: string, @UploadedFile() file: any, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.updatePhoto(id, clinicId, file);
  }

  @Delete(':id/photo')
  deletePhoto(@Param('id') id: string, @Req() req: any) {
    const clinicId = req.user.tenantId;
    return this.employeesService.deletePhoto(id, clinicId);
  }
}
