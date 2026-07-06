import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import {
  CreateLabDto,
  UpdateLabDto,
  CreateLabOrderDto,
  UpdateLabOrderStatusDto,
  CreateLabRevisionDto,
  DeliverLabOrderDto,
  CreateLabProcedureDto,
  UpdateLabProcedureDto,
  CreateLabTariffDto,
  UpdateLabTariffDto,
} from './dto/lab.dto';

const ORDER_INCLUDE = {
  lab: true,
  procedure: true,
  parent: true,
  revisions: true,
  patient: true,
  treatmentItem: {
    include: {
      plan: { include: { patient: true } },
      tariff: { include: { masterTreatment: true } }
    }
  }
};

// Kural: sadece "Yeni İşlem" fiyatlandırılır, Prova ve Revizyon ücretsizdir.
function resolveCost(processType: string, cost?: number): number {
  if (processType === 'PROVA' || processType === 'REVIZYON') return 0;
  return cost ?? 0;
}

function todayDatePrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

// Bir işlem numarasının "R" ekinden önceki kök (tarih + günlük sıra no) kısmını döner.
function baseOrderNumber(orderNumber: string): string {
  const idx = orderNumber.indexOf('R');
  return idx === -1 ? orderNumber : orderNumber.slice(0, idx);
}

@Injectable()
export class LabService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // Günlük sıra no: yyyyMMdd + 6 haneli sayaç (örn. 20260704000001). Sayaç her gün 1'den başlar.
  private async generateBaseOrderNumber(prisma: any, clinicId: string): Promise<string> {
    const datePrefix = todayDatePrefix();
    const latest = await prisma.labOrder.findFirst({
      where: { clinicId, orderNumber: { startsWith: datePrefix } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    let seq = 1;
    if (latest?.orderNumber) {
      const seqPart = latest.orderNumber.slice(datePrefix.length, datePrefix.length + 6);
      seq = (parseInt(seqPart, 10) || 0) + 1;
    }
    return `${datePrefix}${String(seq).padStart(6, '0')}`;
  }

  // Revizyon numarası: kök işlem numarasına "R" + sıra eklenir (örn. 20260704000001R1, R2, ...).
  // Sıra, aynı köke ait toplam revizyon sayısına göre belirlenir (hangi seviyenin revize edildiğinden bağımsız).
  private async generateRevisionOrderNumber(prisma: any, clinicId: string, parentOrderNumber: string | null): Promise<string> {
    if (!parentOrderNumber) {
      return this.generateBaseOrderNumber(prisma, clinicId);
    }
    const base = baseOrderNumber(parentOrderNumber);
    const count = await prisma.labOrder.count({
      where: { clinicId, orderNumber: { startsWith: `${base}R` } },
    });
    return `${base}R${count + 1}`;
  }

  async createLab(clinicId: string, dto: CreateLabDto) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.lab.create({
      data: { ...dto, clinicId }
    });
  }

  async findAllLabs(clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.lab.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async updateLab(id: string, clinicId: string, dto: UpdateLabDto) {
    const prisma = await this.tenantPrisma.getClient();
    const { count } = await prisma.lab.updateMany({
      where: { id, clinicId },
      data: dto
    });
    if (!count) throw new NotFoundException('Laboratuvar bulunamadı.');
    return prisma.lab.findUnique({ where: { id } });
  }

  // Fiziksel silme yerine pasif hale getirilir (lab siparişleri labId'ye referans veriyor).
  async deactivateLab(id: string, clinicId: string) {
    const { count } = await (await this.tenantPrisma.getClient()).lab.updateMany({
      where: { id, clinicId },
      data: { isActive: false }
    });
    if (!count) throw new NotFoundException('Laboratuvar bulunamadı.');
    return { success: true };
  }

  async createOrder(clinicId: string, dto: CreateLabOrderDto, createdById?: string) {
    const prisma = await this.tenantPrisma.getClient();
    const processType = dto.processType || 'YENI';
    const orderNumber = await this.generateBaseOrderNumber(prisma, clinicId);

    return prisma.labOrder.create({
      data: {
        labId: dto.labId,
        treatmentItemId: dto.treatmentItemId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        clinicStaffId: dto.clinicStaffId,
        labStaffName: dto.labStaffName,
        procedureId: dto.procedureId,
        orderNumber,
        recordType: dto.recordType || 'GIDEN',
        processType,
        // Yeni bir "Giden" kaydı oluşturulduğu an itibariyle laboratuvara gönderilmiş sayılır.
        status: 'SENT',
        cost: resolveCost(processType, dto.cost),
        description: dto.description,
        colorCode: dto.colorCode,
        clinicId,
        createdById,
        sentDate: dto.sentDate ? new Date(dto.sentDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: ORDER_INCLUDE
    });
  }

  async findAllOrders(clinicId: string, status?: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.labOrder.findMany({
      where: {
        clinicId,
        ...(status ? { status } : {})
      },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateOrderStatus(orderId: string, clinicId: string, dto: UpdateLabOrderStatusDto) {
    const prisma = await this.tenantPrisma.getClient();

    return prisma.labOrder.updateMany({
      where: { id: orderId, clinicId },
      data: {
        status: dto.status,
        receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : undefined,
      }
    });
  }

  // "İşlem Teslim Al" aksiyonu: Giden kaydı otomatik olarak Gelen'e çevirir.
  async deliverOrder(orderId: string, clinicId: string, dto: DeliverLabOrderDto = {}) {
    const prisma = await this.tenantPrisma.getClient();
    const order = await prisma.labOrder.findFirst({ where: { id: orderId, clinicId } });
    if (!order) throw new NotFoundException('Laboratuvar işlemi bulunamadı.');

    const { dueDate, ...rest } = dto;

    return prisma.labOrder.update({
      where: { id: orderId },
      data: {
        ...rest,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        recordType: 'GELEN',
        status: 'RECEIVED',
        receivedDate: new Date(),
      },
      include: ORDER_INCLUDE
    });
  }

  // "Revizyon Ekle" aksiyonu: aynı işleme bağlı (parent_id ile) yeni, ücretsiz bir kayıt açar.
  async addRevision(orderId: string, clinicId: string, dto: CreateLabRevisionDto) {
    const prisma = await this.tenantPrisma.getClient();
    const parent = await prisma.labOrder.findFirst({ where: { id: orderId, clinicId } });
    if (!parent) throw new NotFoundException('Ana laboratuvar işlemi bulunamadı.');

    await prisma.labOrder.update({
      where: { id: orderId },
      data: { status: 'REVISION' }
    });

    const orderNumber = await this.generateRevisionOrderNumber(prisma, clinicId, parent.orderNumber);

    return prisma.labOrder.create({
      data: {
        clinicId,
        parentId: parent.id,
        labId: dto.labId ?? parent.labId,
        treatmentItemId: parent.treatmentItemId,
        patientId: parent.patientId,
        doctorId: dto.doctorId ?? parent.doctorId,
        clinicStaffId: dto.clinicStaffId ?? parent.clinicStaffId,
        procedureId: dto.procedureId ?? parent.procedureId,
        labStaffName: dto.labStaffName ?? parent.labStaffName,
        colorCode: dto.colorCode ?? parent.colorCode,
        orderNumber,
        recordType: 'GIDEN',
        processType: 'REVIZYON',
        cost: 0, // Revizyon ücretsizdir
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: 'SENT',
      },
      include: ORDER_INCLUDE
    });
  }

  async getStats(clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const [pendingCount, sentCount, revisionCount, totalCost] = await Promise.all([
      prisma.labOrder.count({ where: { clinicId, status: 'PENDING' } }),
      prisma.labOrder.count({ where: { clinicId, status: 'SENT' } }),
      prisma.labOrder.count({ where: { clinicId, status: 'REVISION' } }),
      prisma.labOrder.aggregate({
        where: { clinicId },
        _sum: { cost: true }
      })
    ]);

    return {
      pendingCount,
      sentCount,
      revisionCount,
      totalCost: Number(totalCost._sum.cost || 0)
    };
  }

  // ------------------------------------------------------------------
  // İşlem Tanımları (LabProcedure)
  // ------------------------------------------------------------------

  async findAllProcedures(clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.labProcedure.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' }
    });
  }

  async createProcedure(clinicId: string, dto: CreateLabProcedureDto) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.labProcedure.create({
      data: { ...dto, clinicId }
    });
  }

  async updateProcedure(id: string, clinicId: string, dto: UpdateLabProcedureDto) {
    const prisma = await this.tenantPrisma.getClient();
    const { count } = await prisma.labProcedure.updateMany({
      where: { id, clinicId },
      data: dto
    });
    if (!count) throw new NotFoundException('İşlem tanımı bulunamadı.');
    return prisma.labProcedure.findUnique({ where: { id } });
  }

  // Fiziksel silme yerine pasif hale getirilir (lab verisi için soft delete).
  async deactivateProcedure(id: string, clinicId: string) {
    const { count } = await (await this.tenantPrisma.getClient()).labProcedure.updateMany({
      where: { id, clinicId },
      data: { active: false }
    });
    if (!count) throw new NotFoundException('İşlem tanımı bulunamadı.');
    return { success: true };
  }

  // ------------------------------------------------------------------
  // Tarifeler (LabTariff)
  // ------------------------------------------------------------------

  private formatValidity(validFrom?: Date | null, validTo?: Date | null): string {
    const fmt = (d: Date) => d.toLocaleDateString('tr-TR');
    if (validFrom && validTo) return `${fmt(validFrom)} - ${fmt(validTo)}`;
    if (validFrom) return `${fmt(validFrom)} - Süresiz`;
    return 'Süresiz';
  }

  private serializeTariff(t: any) {
    return {
      ...t,
      validity: this.formatValidity(t.validFrom, t.validTo),
    };
  }

  async findAllTariffs(clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const tariffs = await prisma.labTariff.findMany({
      where: { clinicId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    return tariffs.map((t: any) => this.serializeTariff(t));
  }

  async createTariff(clinicId: string, dto: CreateLabTariffDto) {
    const prisma = await this.tenantPrisma.getClient();

    let labName = dto.labName;
    if (dto.labId) {
      const lab = await prisma.lab.findFirst({ where: { id: dto.labId, clinicId } });
      if (!lab) throw new BadRequestException('Belirtilen laboratuvar bulunamadı.');
      labName = lab.name;
    }
    if (!labName) throw new BadRequestException('Laboratuvar adı belirtilmelidir.');

    const tariff = await prisma.labTariff.create({
      data: {
        clinicId,
        name: dto.name,
        labId: dto.labId,
        labName,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        includedProcIds: dto.includedProcIds || [],
        customPrices: dto.customPrices || {},
        status: dto.status || 'AKTİF',
      }
    });
    return this.serializeTariff(tariff);
  }

  async updateTariff(id: string, clinicId: string, dto: UpdateLabTariffDto) {
    const prisma = await this.tenantPrisma.getClient();
    const { count } = await prisma.labTariff.updateMany({
      where: { id, clinicId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.validFrom !== undefined ? { validFrom: new Date(dto.validFrom) } : {}),
        ...(dto.validTo !== undefined ? { validTo: new Date(dto.validTo) } : {}),
        ...(dto.includedProcIds !== undefined ? { includedProcIds: dto.includedProcIds } : {}),
        ...(dto.customPrices !== undefined ? { customPrices: dto.customPrices } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      }
    });
    if (!count) throw new NotFoundException('Tarife bulunamadı.');
    const tariff = await prisma.labTariff.findUnique({ where: { id } });
    return this.serializeTariff(tariff);
  }

  // Fiziksel silme yerine pasif hale getirilir (lab verisi için soft delete).
  async deleteTariff(id: string, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const { count } = await prisma.labTariff.updateMany({
      where: { id, clinicId },
      data: { isActive: false }
    });
    if (!count) throw new NotFoundException('Tarife bulunamadı.');
    return { success: true };
  }
}
