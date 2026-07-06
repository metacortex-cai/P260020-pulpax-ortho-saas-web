import { Module } from '@nestjs/common';
import { SaasController } from './saas.controller';
import { PricingController } from './pricing.controller';
import { SaasService } from './saas.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [SaasController, PricingController],
  providers: [SaasService],
  exports: [SaasService],
})
export class SaasModule {}
