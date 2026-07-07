import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, TransferSystemAdminDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateUserDto, clinicId: string) {
    const emailHash = EncryptionUtil.hashEmail(dto.email);
    const existing = await this.prisma.user.findUnique({ where: { emailHash } });
    if (existing) {
      throw new BadRequestException('Bu e-posta adresi zaten kullanımda.');
    }

    // NOT: dto.employeeId alan adı geriye dönük uyumluluk için korunuyor;
    // hedef model artık tenant DB'deki Doctor (bkz. tenant.prisma) — Employee/İK
    // modülü kaldırıldı (scope-reduction kararı).
    let doctor: any = null;
    if (dto.employeeId) {
      const tenantClient = await this.tenantPrisma.getClient();
      doctor = await tenantClient.doctor.findFirst({ where: { id: dto.employeeId, clinicId } });
      if (!doctor) {
        throw new NotFoundException(`Hekim (${dto.employeeId}) bulunamadı.`);
      }
      if (doctor.userId) {
        throw new BadRequestException('Bu hekimin zaten bir kullanıcı hesabı var.');
      }
    }

    const hashedPassword = dto.password ? await bcrypt.hash(dto.password, 10) : null;
    const emailEncrypted = EncryptionUtil.encrypt(dto.email);

    const user = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: emailEncrypted,
          emailHash,
          password: hashedPassword,
          phone: dto.phone,
          title: dto.title,
          role: dto.role,
          clinicId,
          isActive: true,
          employeeId: dto.employeeId,
        },
      });

      await tx.userClinic.create({
        data: { userId: user.id, clinicId, role: dto.role, isActive: true },
      });

      return user;
    });

    if (doctor) {
      const tenantClient = await this.tenantPrisma.getClient();
      await tenantClient.doctor.update({ where: { id: doctor.id }, data: { userId: user.id } });
    }

    if (!hashedPassword) {
      await this.sendInviteEmail(user.id, dto.firstName, dto.email);
    }

    return this.decryptUserData(user, clinicId);
  }

  private async sendInviteEmail(userId: string, firstName: string, email: string) {
    const payload = JSON.stringify({
      userId,
      purpose: 'INVITE',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 gün
    });
    const token = EncryptionUtil.encrypt(payload);
    const inviteLink = `https://localhost:7001/login?inviteToken=${encodeURIComponent(token)}`;
    await this.emailService.sendInviteEmail(email, firstName, inviteLink);
  }

  async findAll(clinicId: string, includePassive: boolean = false) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { systemAdminUserId: true } });
    const users = await this.prisma.user.findMany({
      where: { clinicId, ...(includePassive ? {} : { isActive: true }) },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => this.decryptUserData(u, clinicId, clinic?.systemAdminUserId));
  }

  async findOne(id: string, clinicId: string) {
    const [user, clinic] = await Promise.all([
      this.prisma.user.findFirst({ where: { id, clinicId } }),
      this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { systemAdminUserId: true } }),
    ]);
    if (!user) {
      throw new NotFoundException(`Kullanıcı (${id}) bulunamadı.`);
    }
    return this.decryptUserData(user, clinicId, clinic?.systemAdminUserId);
  }

  async update(id: string, dto: UpdateUserDto, clinicId: string) {
    const existing = await this.prisma.user.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Kullanıcı (${id}) bulunamadı.`);
    }

    if (existing.role === 'SUPERADMIN' && dto.role && dto.role !== 'SUPERADMIN') {
      throw new BadRequestException('Süper Admin yetkisi düşürülemez.');
    }

    const updateData: any = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.password) updateData.password = await bcrypt.hash(dto.password, 10);

    if (dto.isActive !== undefined) {
      await this.assertNotSystemAdmin(id, clinicId, 'deaktif edilemez');
      updateData.isActive = dto.isActive;
      updateData.deactivatedAt = dto.isActive ? null : new Date();
      updateData.deactivationReason = dto.isActive ? null : 'Yönetici tarafından kapatıldı';
    }

    if (dto.email) {
      const emailHash = EncryptionUtil.hashEmail(dto.email);
      const duplicate = await this.prisma.user.findFirst({ where: { emailHash, NOT: { id } } });
      if (duplicate) {
        throw new BadRequestException('Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.');
      }
      updateData.email = EncryptionUtil.encrypt(dto.email);
      updateData.emailHash = emailHash;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: updateData });

      if (dto.role !== undefined || dto.isActive !== undefined) {
        const mappingUpdate: any = {};
        if (dto.role !== undefined) mappingUpdate.role = dto.role;
        if (dto.isActive !== undefined) mappingUpdate.isActive = dto.isActive;
        await tx.userClinic.updateMany({ where: { userId: id, clinicId }, data: mappingUpdate });
      }

      return this.decryptUserData(updated, clinicId);
    });
  }

  async deactivate(id: string, clinicId: string, reason?: string) {
    const existing = await this.prisma.user.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Kullanıcı (${id}) bulunamadı.`);
    }
    if (existing.role === 'SUPERADMIN') {
      throw new BadRequestException('Süper Admin hesapları sistemden deaktif edilemez.');
    }
    await this.assertNotSystemAdmin(id, clinicId, 'deaktif edilemez');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false, deactivatedAt: new Date(), deactivationReason: reason || 'Yönetici tarafından kapatıldı' },
    });
  }

  async reactivate(id: string, clinicId: string) {
    const existing = await this.prisma.user.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Kullanıcı (${id}) bulunamadı.`);
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true, deactivatedAt: null, deactivationReason: null },
    });
  }

  // --- Sistem Yöneticisi: silinemez/deaktif edilemez, ama devredilebilir tekil hesap ---

  private async assertNotSystemAdmin(userId: string, clinicId: string, actionWord: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId }, select: { systemAdminUserId: true } });
    if (clinic?.systemAdminUserId === userId) {
      throw new BadRequestException(`Sistem Yöneticisi hesabı ${actionWord}. Önce yetkiyi başka bir hesaba devredin.`);
    }
  }

  async transferSystemAdmin(currentUserId: string, dto: TransferSystemAdminDto, clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) {
      throw new NotFoundException('Klinik bulunamadı.');
    }
    if (clinic.systemAdminUserId !== currentUserId) {
      throw new ForbiddenException('Sistem Yöneticiliğini yalnızca mevcut Sistem Yöneticisi devredebilir.');
    }
    if (dto.toUserId === currentUserId) {
      throw new BadRequestException('Yetki zaten bu hesapta.');
    }

    const target = await this.prisma.user.findFirst({ where: { id: dto.toUserId, clinicId, isActive: true } });
    if (!target) {
      throw new NotFoundException('Hedef kullanıcı bu klinikte bulunamadı veya pasif.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (target.role !== 'ADMIN' && target.role !== 'SUPERADMIN') {
        await tx.user.update({ where: { id: target.id }, data: { role: 'ADMIN' } });
        await tx.userClinic.updateMany({ where: { userId: target.id, clinicId }, data: { role: 'ADMIN' } });
      }
      await tx.clinic.update({ where: { id: clinicId }, data: { systemAdminUserId: target.id } });
      return { systemAdminUserId: target.id };
    });
  }

  private decryptUserData(user: any, clinicId: string, systemAdminUserId?: string | null) {
    const decrypted: any = { ...user };
    if (decrypted.email && decrypted.email.includes(':')) {
      decrypted.email = EncryptionUtil.decrypt(decrypted.email) || decrypted.email;
    }
    if (decrypted.nationalId && decrypted.nationalId.includes(':')) {
      decrypted.nationalId = EncryptionUtil.decrypt(decrypted.nationalId) || decrypted.nationalId;
    }
    delete decrypted.password;
    decrypted.isSystemAdmin = systemAdminUserId != null && systemAdminUserId === user.id;
    return decrypted;
  }
}
