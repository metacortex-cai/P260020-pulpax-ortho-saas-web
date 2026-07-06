import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { SaasService } from './saas.service';
import { SaasRoles } from '../auth/saas-roles.decorator';
import { SaasRolesGuard } from '../auth/saas-roles.guard';

@Controller('saas')
@UseGuards(SaasRolesGuard)
export class SaasController {
  constructor(private readonly saasService: SaasService) {}

  // --- Dashboard ---
  @Get('stats')
  @SaasRoles('SAAS_SUPERADMIN', 'SAAS_BILLING', 'SAAS_SUPPORT')
  async getDashboardStats() {
    return this.saasService.getDashboardStats();
  }

  // --- Clinics ---
  @Get('clinics')
  @SaasRoles('SAAS_SUPERADMIN', 'SAAS_BILLING', 'SAAS_SUPPORT')
  async getClinics() {
    return this.saasService.getClinics();
  }

  @Post('clinics')
  @SaasRoles('SAAS_SUPERADMIN', 'SAAS_BILLING')
  async createClinic(@Body() body: any, @Req() req: any) {
    const clinic = await this.saasService.createClinic(body);
    await this.saasService.logAction(req.user.sub, 'CREATE_CLINIC', `Clinic ID: ${clinic.id}`, req.ip);
    return clinic;
  }

  @Put('clinics/:id')
  @SaasRoles('SAAS_SUPERADMIN', 'SAAS_BILLING')
  async updateClinic(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const clinic = await this.saasService.updateClinic(id, body);
    await this.saasService.logAction(req.user.sub, 'UPDATE_CLINIC', `Clinic ID: ${id}, Payload: ${JSON.stringify(body)}`, req.ip);
    return clinic;
  }

  // --- System Admins ---
  @Get('admins')
  @SaasRoles('SAAS_SUPERADMIN')
  async getAdmins() {
    return this.saasService.getAdmins();
  }

  @Post('admins')
  @SaasRoles('SAAS_SUPERADMIN')
  async createAdmin(@Body() body: any, @Req() req: any) {
    const admin = await this.saasService.createAdmin(body);
    await this.saasService.logAction(req.user.sub, 'CREATE_ADMIN', `Admin ID: ${admin.id}, Role: ${admin.role}`, req.ip);
    return admin;
  }

  @Put('admins/:id')
  @SaasRoles('SAAS_SUPERADMIN')
  async updateAdmin(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const admin = await this.saasService.updateAdmin(id, body);
    await this.saasService.logAction(req.user.sub, 'UPDATE_ADMIN', `Admin ID: ${id}, Role: ${admin.role}, Active: ${admin.isActive}`, req.ip);
    return admin;
  }

  // --- Tariff Packages ---
  @Post('tariff-packages/publish')
  @SaasRoles('SAAS_SUPERADMIN')
  async publishTariffPackage(@Body() body: any, @Req() req: any) {
    const result = await this.saasService.publishTariffPackage(body);
    await this.saasService.logAction(
      req.user.sub,
      'PUBLISH_TARIFF_PACKAGE',
      `Year: ${body.year}, Name: ${body.name}, Clinics Updated: ${result.clinicsUpdated}`,
      req.ip,
    );
    return result;
  }

  // --- Audit Logs ---
  @Get('logs')
  @SaasRoles('SAAS_SUPERADMIN')
  async getAuditLogs() {
    return this.saasService.getAuditLogs();
  }
}
