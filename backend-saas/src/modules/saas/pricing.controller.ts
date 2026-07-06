import { Controller, Get, Post, Body, UseGuards, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SaasRoles } from '../auth/saas-roles.decorator';
import { SaasRolesGuard } from '../auth/saas-roles.guard';
import * as fs from 'fs';
import * as path from 'path';

@Controller('pricing')
@UseGuards(SaasRolesGuard)
export class PricingController {
  private readonly logger = new Logger(PricingController.name);
  private readonly filePath = path.join(__dirname, 'pricing-plans.json');

  private readPlans() {
    try {
      if (!fs.existsSync(this.filePath)) {
        // Fallback if not found in built dist directory (copy from src)
        const srcPath = path.join(process.cwd(), 'src/modules/saas/pricing-plans.json');
        if (fs.existsSync(srcPath)) {
          return JSON.parse(fs.readFileSync(srcPath, 'utf8'));
        }
        throw new Error('Pricing plans file not found');
      }
      return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch (err) {
      this.logger.error(`Fiyatlandırma planları okunamadı: ${err?.message || err}`);
      throw new HttpException('Fiyatlandırma planları okunamadı.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private writePlans(plans: any) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(plans, null, 2), 'utf8');
      // Sync back to src directory to persist edits during development
      const srcPath = path.join(process.cwd(), 'src/modules/saas/pricing-plans.json');
      if (fs.existsSync(path.dirname(srcPath))) {
        fs.writeFileSync(srcPath, JSON.stringify(plans, null, 2), 'utf8');
      }
    } catch (err) {
      this.logger.error(`Fiyatlandırma planları kaydedilemedi: ${err?.message || err}`);
      throw new HttpException('Fiyatlandırma planları kaydedilemedi.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('plans')
  getPlans() {
    return this.readPlans();
  }

  @Post('plans')
  @SaasRoles('SAAS_SUPERADMIN')
  updatePlans(@Body() body: { plans: any[] }) {
    if (!body.plans || !Array.isArray(body.plans)) {
      throw new HttpException('Geçersiz plan verisi.', HttpStatus.BAD_REQUEST);
    }
    this.writePlans(body.plans);
    return { success: true, message: 'Planlar başarıyla güncellendi.' };
  }
}
