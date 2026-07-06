import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { TenantBaseRepository } from '../../common/database/tenant-base.repository';
@Injectable()
export class PatientRepository extends TenantBaseRepository<any, any, any> {
  constructor(tenantPrisma: TenantPrismaService) {
    super(tenantPrisma, 'patient');
  }

  async findByPhone(clinicId: string, phone: string): Promise<any[]> {
    const delegate = await this.getDelegate();
    return delegate.findMany({
      where: { clinicId, phone },
    });
  }

  async anonymize(id: string): Promise<any> {
    const delegate = await this.getDelegate();
    return delegate.update({
      where: { id },
      data: {
        firstName: 'ANONİM',
        lastName: 'HASTA',
        phone: '***',
        nationalId: null,
      },
    });
  }
}
