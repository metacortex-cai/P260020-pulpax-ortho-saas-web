import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateClinicBranchDto } from './dto/create-clinic-branch.dto';
import { UpdateClinicBranchDto } from './dto/update-clinic-branch.dto';

/**
 * Aynı tenant içindeki fiziksel klinik şubelerinin (Klinikler) yönetimi.
 * Hekim-şube ataması kısıtlaması yoktur; şube bilgisi Hasta/Randevu/Ünite
 * kayıtlarına bağlanarak yalnızca raporlama amaçlı kullanılır.
 */
@Injectable()
export class ClinicBranchesService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(clinicId: string, includePassive = false) {
    const client = await this.tenantPrisma.getClient();
    return client.clinicBranch.findMany({
      where: { clinicId, ...(includePassive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const branch = await client.clinicBranch.findFirst({ where: { id, clinicId } });
    if (!branch) {
      throw new NotFoundException(`Klinik (${id}) bulunamadı.`);
    }
    return branch;
  }

  async create(dto: CreateClinicBranchDto, clinicId: string) {
    const client = await this.tenantPrisma.getClient();

    const existing = await client.clinicBranch.findFirst({ where: { clinicId, name: dto.name } });
    if (existing) {
      throw new BadRequestException('Bu isimde bir klinik zaten kayıtlı.');
    }

    return client.clinicBranch.create({
      data: {
        clinicId,
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
      },
    });
  }

  async update(id: string, dto: UpdateClinicBranchDto, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const existing = await client.clinicBranch.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Klinik (${id}) bulunamadı.`);
    }

    if (dto.name) {
      const duplicate = await client.clinicBranch.findFirst({
        where: { clinicId, name: dto.name, NOT: { id } },
      });
      if (duplicate) {
        throw new BadRequestException('Bu isimde başka bir klinik zaten kayıtlı.');
      }
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return client.clinicBranch.update({ where: { id }, data: updateData });
  }
}
