import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TreatmentRepository } from './treatment.repository';
import { PrimService } from '../employees/prim.service';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { UpdateTreatmentStatusDto } from './dto/update-treatment-status.dto';
import { UpdateTreatmentDoctorDto } from './dto/update-treatment-doctor.dto';
import {
  TreatmentCompletedEvent,
  EVENTS,
} from '../../common/events/domain-events';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateTariffGroupDto, UpdateTariffGroupDto, BulkUpdateTariffsDto } from './dto/tariff-group.dto';
import { AuditLogService } from '../../common/services/audit-log.service';

@Injectable()
export class TreatmentsService {
  private readonly logger = new Logger(TreatmentsService.name);

  constructor(
    private readonly repo: TreatmentRepository,
    private readonly primService: PrimService,
    private readonly eventEmitter: EventEmitter2,
    private readonly tenantPrisma: TenantPrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * LLD 3.1: Tedavi Planı Oluşturma
   * - Tüm kalemleri transaction içinde oluşturur
   * - Hastanın toplam borcunu atomik olarak artırır
   */
  async createPlan(createDto: CreateTreatmentPlanDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const totalPrice = createDto.items.reduce((sum, item) => sum + item.price, 0);

    return tenantDb.$transaction(async (tx) => {
      const plan = await tx.treatmentPlan.create({
        data: {
          clinicId,
          patientId: createDto.patientId,
          status: 'DRAFT',
          totalPrice,
          items: {
            create: createDto.items.map((item) => ({
              tariffId: item.tariffId,
              doctorId: item.doctorId,
              toothNo: item.toothNo,
              price: item.price,
              appointmentId: item.appointmentId,
              status: 'PENDING',
            })),
          },
        },
        include: { items: true },
      });

      // NOT: Hasta borcu burada artırılmaz.
      // Borç yalnızca 'Sözleşme Oluştur' (activatePlan) ile artırılır.

      this.logger.log(
        `Tedavi planı oluşturuldu (DRAFT): ${plan.id} | Hasta: ${createDto.patientId} | Toplam: ${totalPrice}`,
      );

      return plan;
    });
  }

  /**
   * Mevcut DRAFT plana yeni kalemler ekler.
   */
  async addItemsToPlan(
    planId: string,
    clinicId: string,
    items: Partial<any>[],
  ) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.$transaction(async (tx) => {
      const plan = await tx.treatmentPlan.findFirst({
        where: { id: planId, clinicId },
      });

      if (!plan) {
        throw new BadRequestException('Tedavi planı bulunamadı veya bu kliniğe ait değil.');
      }

      const newItems = await tx.treatmentItem.createMany({
        data: items.map((item: any) => ({
          planId,
          tariffId: item.tariffId,
          doctorId: item.doctorId,
          toothNo: item.toothNo,
          price: item.price,
          appointmentId: item.appointmentId,
          status: 'PENDING',
        })),
      });

      // Planın toplam fiyatını güncelle
      const addedTotal = items.reduce((sum: number, item: any) => sum + item.price, 0);
      await tx.treatmentPlan.update({
        where: { id: planId },
        data: { totalPrice: { increment: addedTotal } },
      });

      this.logger.log(
        `Plana ${newItems.count} yeni kalem eklendi: ${planId}`,
      );

      return tx.treatmentPlan.findFirst({
        where: { id: planId },
        include: { items: { include: { tariff: { include: { masterTreatment: true } } } } },
      });
    });
  }

  /**
   * LLD 3.0: Tedavi Planı Aktifleştirme ("Sözleşme Oluştur")
   * - Planın statüsünü DRAFT → ACTIVE olarak değiştirir
   * - Tüm kalemlerin statüsünü PENDING → WAITING olarak değiştirir
   * - Hastanın toplam borcunu plan tutarı kadar artırır (atomik)
   * - Sözleşme modalında tanımlanan ödeme planını (peşinat + taksitler) kaydeder
   */
  async activatePlan(
    planId: string,
    clinicId: string,
    installments?: { label: string; dueDate: string; amount: number }[],
    description?: string,
  ) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.$transaction(async (tx) => {
      const plan = await tx.treatmentPlan.findFirst({
        where: { id: planId, clinicId },
        include: { items: true },
      });

      if (!plan) {
        throw new BadRequestException('Tedavi planı bulunamadı veya bu kliniğe ait değil.');
      }

      if (plan.status !== 'DRAFT') {
        throw new BadRequestException('Yalnızca DRAFT statüsündeki planlar aktifleştirilebilir.');
      }

      if (plan.items.length === 0) {
        throw new BadRequestException('Boş plan aktifleştirilemez.');
      }

      const totalPrice = Number(plan.totalPrice);

      const finalInstallments = installments && installments.length > 0
        ? installments
        : [{ label: 'Peşinat', dueDate: new Date().toISOString(), amount: totalPrice }];

      const installmentsTotal = finalInstallments.reduce((sum, i) => sum + Number(i.amount), 0);
      if (Math.abs(installmentsTotal - totalPrice) > 0.01) {
        throw new BadRequestException(
          `Ödeme planına dağıtılan toplam tutar (₺${installmentsTotal.toFixed(2)}), sözleşme tutarına (₺${totalPrice.toFixed(2)}) eşit olmalıdır.`,
        );
      }

      // 1. Plan statüsünü ACTIVE yap
      await tx.treatmentPlan.update({
        where: { id: planId },
        data: { status: 'ACTIVE', description: description ?? plan.description },
      });

      // 2. Tüm kalemleri PENDING → WAITING olarak güncelle
      await tx.treatmentItem.updateMany({
        where: { planId, status: 'PENDING' },
        data: { status: 'WAITING' },
      });

      // 3. Hastanın toplam borcunu atomik olarak artır
      await tx.patient.update({
        where: { id: plan.patientId },
        data: { totalDebt: { increment: totalPrice } },
      });

      // 4. Ödeme planını (peşinat + taksitler) kaydet
      await tx.planInstallment.deleteMany({ where: { planId } });
      await tx.planInstallment.createMany({
        data: finalInstallments.map((inst, idx) => ({
          planId,
          label: inst.label,
          dueDate: new Date(inst.dueDate),
          amount: inst.amount,
          order: idx,
        })),
      });

      this.logger.log(
        `Tedavi planı aktifleştirildi: ${planId} | Hasta: ${plan.patientId} | Toplam Borç Artışı: ${totalPrice} | Taksit Sayısı: ${finalInstallments.length}`,
      );

      return tx.treatmentPlan.findFirst({
        where: { id: planId },
        include: {
          items: { include: { tariff: { include: { masterTreatment: true } } } },
          installments: { orderBy: { order: 'asc' } },
        },
      });
    });
  }

  /**
   * Sözleşme Düzenleme: ACTIVE bir planın ödeme planını (peşinat/taksitler)
   * ve açıklamasını günceller. Plan statüsü, kalem durumları ve hasta borcu
   * değişmez — sadece ödeme planı yeniden dağıtılır.
   */
  async updateContract(
    planId: string,
    clinicId: string,
    installments?: { label: string; dueDate: string; amount: number }[],
    description?: string,
  ) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.$transaction(async (tx) => {
      const plan = await tx.treatmentPlan.findFirst({
        where: { id: planId, clinicId },
      });

      if (!plan) {
        throw new BadRequestException('Tedavi planı bulunamadı veya bu kliniğe ait değil.');
      }

      if (plan.status !== 'ACTIVE') {
        throw new BadRequestException('Yalnızca sözleşmesi oluşturulmuş (ACTIVE) planların ödeme planı düzenlenebilir.');
      }

      const totalPrice = Number(plan.totalPrice);

      if (installments && installments.length > 0) {
        const installmentsTotal = installments.reduce((sum, i) => sum + Number(i.amount), 0);
        if (Math.abs(installmentsTotal - totalPrice) > 0.01) {
          throw new BadRequestException(
            `Ödeme planına dağıtılan toplam tutar (₺${installmentsTotal.toFixed(2)}), sözleşme tutarına (₺${totalPrice.toFixed(2)}) eşit olmalıdır.`,
          );
        }

        await tx.planInstallment.deleteMany({ where: { planId } });
        await tx.planInstallment.createMany({
          data: installments.map((inst, idx) => ({
            planId,
            label: inst.label,
            dueDate: new Date(inst.dueDate),
            amount: inst.amount,
            order: idx,
          })),
        });
      }

      await tx.treatmentPlan.update({
        where: { id: planId },
        data: { description: description ?? plan.description },
      });

      this.logger.log(`Sözleşme düzenlendi: ${planId} | Hasta: ${plan.patientId}`);

      return tx.treatmentPlan.findFirst({
        where: { id: planId },
        include: {
          items: { include: { tariff: { include: { masterTreatment: true } } } },
          installments: { orderBy: { order: 'asc' } },
        },
      });
    });
  }

  /**
   * Sözleşme İptali:
   * - Planın statüsünü ACTIVE → DRAFT olarak değiştirir
   * - Tamamlanan (COMPLETED) kalem varsa hata fırlatır
   * - Tüm kalemlerin statüsünü WAITING veya diğer durumlar → PENDING olarak değiştirir
   * - Hastanın toplam borcunu plan tutarı kadar azaltır (atomik)
   */
  async cancelPlan(planId: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.$transaction(async (tx) => {
      const plan = await tx.treatmentPlan.findFirst({
        where: { id: planId, clinicId },
        include: { items: true },
      });

      if (!plan) {
        throw new BadRequestException('Tedavi planı bulunamadı veya bu kliniğe ait değil.');
      }

      if (plan.status !== 'ACTIVE') {
        throw new BadRequestException('Yalnızca sözleşmesi oluşturulmuş (ACTIVE) planlar iptal edilebilir.');
      }

      const completedItems = plan.items.filter(item => item.status === 'COMPLETED');
      if (completedItems.length > 0) {
        throw new BadRequestException(
          'Sözleşme iptal edilemez. Plana ait tamamlanmış tedaviler bulunmaktadır. Lütfen önce tamamlanan tedavileri silin/iptal edin.'
        );
      }

      // 1. Plan statüsünü DRAFT yap
      await tx.treatmentPlan.update({
        where: { id: planId },
        data: { status: 'DRAFT' },
      });

      // 2. Tüm kalemleri WAITING veya diğer durumlar → PENDING olarak güncelle
      await tx.treatmentItem.updateMany({
        where: { planId, NOT: { status: 'PENDING' } },
        data: { status: 'PENDING' },
      });

      // 3. Hastanın toplam borcunu atomik olarak azalt
      const totalPrice = Number(plan.totalPrice);
      await tx.patient.update({
        where: { id: plan.patientId },
        data: { totalDebt: { decrement: totalPrice } },
      });

      // 4. Ödeme planını (peşinat + taksitler) temizle — yeniden aktifleştirilirse yeni plan girilir
      await tx.planInstallment.deleteMany({ where: { planId } });

      this.logger.log(
        `Tedavi planı sözleşmesi iptal edildi: ${planId} | Hasta: ${plan.patientId} | Toplam Borç Düşüşü: ${totalPrice}`,
      );

      return tx.treatmentPlan.findFirst({
        where: { id: planId },
        include: { items: { include: { tariff: { include: { masterTreatment: true } } } } },
      });
    });
  }

  /**
   * Tedavi Planı Silme: yalnızca DRAFT statüsündeki (sözleşmesiz) planlar
   * silinebilir; ACTIVE bir plan önce iptal edilmelidir. Ayrıca üzerine
   * ödeme/iade dağıtılmış kalem varsa (finansal iz bırakır) silme engellenir.
   * Kalemler ve ödeme planı (plan_installments) cascade ile birlikte silinir.
   */
  async deletePlan(planId: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const plan = await tenantDb.treatmentPlan.findFirst({
      where: { id: planId, clinicId },
      include: { items: { include: { paymentDistributions: true } } },
    });

    if (!plan) {
      throw new BadRequestException('Tedavi planı bulunamadı veya bu kliniğe ait değil.');
    }

    if (plan.status === 'ACTIVE') {
      throw new BadRequestException(
        'Sözleşmesi oluşturulmuş bir plan silinemez. Önce "Sözleşmeyi İptal Et" ile sözleşmeyi iptal edin.',
      );
    }

    const hasPayments = plan.items.some(item => item.paymentDistributions.length > 0);
    if (hasPayments) {
      throw new BadRequestException(
        'Bu plana ait tedavi kalemlerine ödeme/iade dağıtılmış olduğundan plan silinemez.',
      );
    }

    await tenantDb.treatmentPlan.delete({ where: { id: planId } });

    this.logger.log(`Tedavi planı silindi: ${planId} | Hasta: ${plan.patientId}`);

    return { success: true };
  }

  /**
   * Tedavi Kalemi(leri) Silme: varsayılan olarak yalnızca DRAFT (sözleşmesiz)
   * plana ait, üzerine ödeme dağıtılmamış kalemler silinebilir.
   *
   * `reallocate: true` verilirse, ACTIVE (sözleşmeli) plandaki ve/veya
   * üzerine ödeme dağıtılmış kalemler de silinebilir: kalemin üzerindeki
   * ödeme dağılımları (orijinal payment kaydı korunarak) hastanın diğer
   * bekleyen tedavilerine FIFO sırayla yeniden dağıtılır; artan tutar avans
   * bakiyesine aktarılır. Kasa/banka bakiyesi bu işlemden etkilenmez —
   * gerçek bir nakit hareketi olmadığı için yalnızca dahili defter
   * (totalDebt/advance) düzeltmesi yapılır.
   */
  async deleteItems(itemIds: string[], clinicId: string, reallocate = false, userId?: string, userRole?: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.$transaction(async (tx) => {
      const items = await tx.treatmentItem.findMany({
        where: { id: { in: itemIds }, plan: { clinicId } },
        include: { plan: true, paymentDistributions: true },
      });

      if (items.length !== itemIds.length) {
        throw new BadRequestException('Bazı tedavi kalemleri bulunamadı veya bu kliniğe ait değil.');
      }

      const activeItem = items.find(item => item.plan.status === 'ACTIVE');
      if (activeItem && !reallocate) {
        throw new BadRequestException(
          'Sözleşmesi oluşturulmuş bir plandaki tedavi silinemez. Önce "Sözleşmeyi İptal Et" ile sözleşmeyi iptal edin.',
        );
      }

      const paidItem = items.find(item => item.paymentDistributions.length > 0);
      if (paidItem && !reallocate) {
        throw new BadRequestException(
          'Ödeme/iade dağıtılmış bir tedavi kalemi silinemez.',
        );
      }

      // ADR-003 Faz 4 (prim sistemi.md §9.1): primi zaten dağıtılmış (tamamlanmış +
      // ödemesi yapılmış) bir kalem, `reallocate=true` olsa dahi silinemez; prim
      // dağıtılmamış ama tamamlanmış bir kalem içinse yalnızca Süper Admin silebilir.
      const completedItemIds = items.filter(item => item.status === 'COMPLETED').map(item => item.id);
      if (completedItemIds.length > 0) {
        const primmedItem = await tx.primRecord.findFirst({ where: { treatmentItemId: { in: completedItemIds } } });
        if (primmedItem) {
          throw new BadRequestException(
            'Ödemesi yapılmış ve primi dağıtılmış bir tedavi kalemi silinemez.',
          );
        }
        if (userRole !== 'SUPERADMIN') {
          throw new ForbiddenException(
            'Tamamlanmış bir tedavi kalemini yalnızca Süper Admin silebilir.',
          );
        }
      }

      const patientId = items[0].plan.patientId;

      // Silinen kalemlere dağıtılmış ödemeleri, borç/avans bakiyesini bozmadan
      // diğer bekleyen tedavilere (FIFO) yeniden dağıtır; kalan varsa avansa aktarır.
      let reallocatedToDebt = 0;
      let reallocatedToAdvance = 0;

      if (reallocate) {
        const absorbers = await tx.treatmentItem.findMany({
          where: {
            plan: { patientId, clinicId, status: 'ACTIVE' },
            status: { not: 'CANCELLED' },
            id: { notIn: itemIds },
          },
          include: { paymentDistributions: true },
          orderBy: { createdAt: 'asc' },
        });

        const capacity = new Map<string, number>(
          absorbers.map(a => [a.id, Number(a.price) - a.paymentDistributions.reduce((s, d) => s + Number(d.amount), 0)]),
        );

        // Her silinen kalemin kendi dağılım satırlarını (kaynak ödeme bazında) sırayla
        // bekleyen kalemlere aktarır; hiçbiri kalmadıysa avansa yazar.
        const reallocationsToCreate: { paymentId: string; treatmentItemId: string; amount: number }[] = [];
        for (const item of items) {
          for (const dist of item.paymentDistributions) {
            let remaining = Number(dist.amount);
            for (const absorber of absorbers) {
              if (remaining <= 0) break;
              const cap = capacity.get(absorber.id) || 0;
              if (cap <= 0) continue;
              const chunk = Math.min(remaining, cap);
              if (chunk > 0.01) {
                reallocationsToCreate.push({ paymentId: dist.paymentId, treatmentItemId: absorber.id, amount: chunk });
                capacity.set(absorber.id, cap - chunk);
                remaining -= chunk;
                reallocatedToDebt += chunk;
              }
            }
            if (remaining > 0.01) {
              reallocatedToAdvance += remaining;
            }
          }
        }
        if (reallocationsToCreate.length > 0) {
          await tx.paymentDistribution.createMany({ data: reallocationsToCreate });
        }
      }

      const totalsByPlan = new Map<string, number>();
      let totalDebtDelta = 0;
      for (const item of items) {
        totalsByPlan.set(item.planId, (totalsByPlan.get(item.planId) || 0) + Number(item.price));
        const paid = item.paymentDistributions.reduce((s, d) => s + Number(d.amount), 0);
        totalDebtDelta += Number(item.price) - paid;
      }

      await tx.treatmentItem.deleteMany({ where: { id: { in: itemIds } } });

      for (const [planId, amount] of totalsByPlan.entries()) {
        await tx.treatmentPlan.update({
          where: { id: planId },
          data: { totalPrice: { decrement: amount } },
        });
      }

      if (totalDebtDelta !== 0 || reallocatedToAdvance !== 0) {
        await tx.patient.update({
          where: { id: patientId },
          data: {
            totalDebt: { decrement: totalDebtDelta },
            advance: { increment: reallocatedToAdvance },
          },
        });
      }

      this.logger.log(
        `Tedavi kalemleri silindi: ${itemIds.join(', ')}${reallocate ? ` | Yeniden dağıtım - Borç: ${reallocatedToDebt}, Avans: ${reallocatedToAdvance}` : ''}`,
      );

      await this.auditLog.log({
        userId,
        clinicId,
        action: 'TREATMENT_ITEMS_DELETED',
        entity: 'TreatmentItem',
        entityId: itemIds.join(','),
        details: { itemIds, reallocate, reallocatedToDebt, reallocatedToAdvance, completedItemCount: completedItemIds.length },
      });

      return { success: true, deletedCount: items.length, reallocatedToDebt, reallocatedToAdvance };
    });
  }

  /**
   * LLD 3.2: Tedavi Kalemi Durum Güncelleme
   * COMPLETED durumuna geçince:
   *   1. Protokol numarası üretilir (değişmez kural)
   *   2. TreatmentCompletedEvent fırlatılır → PrimService dinler
   */
  async updateItemStatus(
    itemId: string,
    clinicId: string,
    updateDto: UpdateTreatmentStatusDto,
    userId?: string,
    userRole?: string,
  ) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.$transaction(async (tx) => {
      // 1. Güvenlik: Kalem bu kliniğe ait mi?
      const item = await tx.treatmentItem.findFirst({
        where: { id: itemId, plan: { clinicId } },
        include: { plan: true, tariff: true },
      });

      if (!item) {
        throw new BadRequestException('Tedavi kalemi bulunamadı veya bu kliniğe ait değil.');
      }
      if (item.status === 'COMPLETED' && updateDto.status === 'COMPLETED') {
        throw new BadRequestException('Tamamlanmış bir tedavi kalemi tekrar tamamlanamaz.');
      }

      // ADR-003 Faz 4 (prim sistemi.md §9.1): Tamamlanmış bir kalemin durumu
      // (iptal dahil) değiştiriliyorsa yetki kontrolü uygulanır.
      if (item.status === 'COMPLETED' && updateDto.status !== 'COMPLETED') {
        const existingPrimRecord = await tx.primRecord.findFirst({ where: { treatmentItemId: itemId } });
        if (existingPrimRecord) {
          throw new BadRequestException(
            'Ödemesi yapılmış ve primi dağıtılmış bir tedavi kaleminde değişiklik yapılamaz.',
          );
        }
        if (userRole !== 'SUPERADMIN') {
          throw new ForbiddenException(
            'Tamamlanmış bir tedavi kaleminin durumunu yalnızca Süper Admin değiştirebilir.',
          );
        }

        // Tamamlandı → başka bir statüye geri alınıyorsa: daha önce üretilen protokol
        // numarası geçersiz hale geldiği için iptal edilir (prim kaydı zaten yok).
        await tx.protocol.deleteMany({ where: { treatmentItemId: itemId } });
        this.logger.log(
          `Tedavi geri alındı: ${itemId} | COMPLETED → ${updateDto.status} | Protokol iptal edildi | Superadmin: ${userId}`,
        );

        await this.auditLog.log({
          userId,
          clinicId,
          action: 'TREATMENT_ITEM_STATUS_ROLLBACK',
          entity: 'TreatmentItem',
          entityId: itemId,
          details: { from: 'COMPLETED', to: updateDto.status },
        });
      } else if (updateDto.status === 'CANCELLED') {
        // Tamamlanmamış (Bekliyor/Devam Ediyor) bir kalemin standart kullanıcı
        // tarafından iptali — prim sistemi.md §9.1'e göre kısıtlama gerektirmez.
        await this.auditLog.log({
          userId,
          clinicId,
          action: 'TREATMENT_ITEM_CANCELLED',
          entity: 'TreatmentItem',
          entityId: itemId,
          details: { from: item.status, to: 'CANCELLED' },
        });
      }

      // 2. Durumu güncelle
      const updatedItem = await tx.treatmentItem.update({
        where: { id: itemId },
        data: { status: updateDto.status },
      });

      // 3. COMPLETED → Protokol üret + Event fırlat
      if (updateDto.status === 'COMPLETED') {
        // 3a. Protokol numarası üretimi (yıl + hasta prefix + UUID hash)
        const year = new Date().getFullYear();
        const uniqueId = crypto.randomBytes(3).toString('hex').toUpperCase();
        const protocolNo = `${year}-${item.plan.patientId.substring(0, 4).toUpperCase()}-${uniqueId}`;

        await tx.protocol.create({
          data: {
            treatmentItemId: itemId,
            protocolNo,
            ussStatus: 'PENDING', // BullMQ worker → Sağlık Bakanlığı entegrasyonu
          },
        });

        // 3b. Domain Event → PrimService idempotency key ile hesaplar
        const idempotencyKey = `treatment_completed_${itemId}_${item.doctorId}`;
        const fee = Number(item.price);

        // Event senkron fırlatılır; PrimService'in calculate() idempotent'tir
        this.eventEmitter.emit(
          EVENTS.TREATMENT_COMPLETED,
          new TreatmentCompletedEvent(
            itemId,
            clinicId,
            item.doctorId,
            fee,
            idempotencyKey,
          ),
        );

        this.logger.log(
          `Tedavi tamamlandı: ${itemId} | Protokol: ${protocolNo} | Hekim: ${item.doctorId}`,
        );
      }

      return updatedItem;
    });
  }

  /**
   * Tedavi kalemine atanan hekimi değiştirir.
   * COMPLETED statüsündeki kalemlerde hekim değişikliğine izin verilmez,
   * çünkü protokol numarası ve prim kaydı zaten ilk hekime göre üretilmiştir.
   */
  async updateItemDoctor(
    itemId: string,
    clinicId: string,
    updateDto: UpdateTreatmentDoctorDto,
    userId?: string,
  ) {
    const tenantDb = await this.tenantPrisma.getClient();

    const item = await tenantDb.treatmentItem.findFirst({
      where: { id: itemId, plan: { clinicId } },
    });

    if (!item) {
      throw new BadRequestException('Tedavi kalemi bulunamadı veya bu kliniğe ait değil.');
    }

    if (item.status === 'COMPLETED') {
      throw new BadRequestException('Tamamlanmış bir tedavi kaleminin hekimi değiştirilemez.');
    }

    const updated = await tenantDb.treatmentItem.update({
      where: { id: itemId },
      data: { doctorId: updateDto.doctorId },
    });

    await this.auditLog.log({
      userId,
      clinicId,
      action: 'TREATMENT_ITEM_DOCTOR_CHANGED',
      entity: 'TreatmentItem',
      entityId: itemId,
      details: { from: item.doctorId, to: updateDto.doctorId },
    });

    return updated;
  }

  /**
   * Kliniğe tanımlı tüm tarifeleri getirir (opsiyonel tarife grubu ile).
   */
  async findAllTariffs(clinicId: string, groupId?: string) {
    const tenantDb = await this.tenantPrisma.getClient();

    const baseTariffs = await tenantDb.tariff.findMany({
      where: { clinicId },
      include: { masterTreatment: true },
      orderBy: { masterTreatment: { sutCode: 'asc' } }
    });

    if (groupId && groupId !== 'default') {
      const entries = await tenantDb.tariffGroupEntry.findMany({
        where: { groupId }
      });
      const entryMap = new Map<string, any>(entries.map(e => [e.tariffId, e]));

      return baseTariffs.map(t => {
        const entry = entryMap.get(t.id);
        return {
          id: t.id,
          groupEntryId: entry?.id,
          price: entry && entry.customPrice !== null ? Number(entry.customPrice) : Number(t.price),
          taxRate: Number(t.taxRate),
          status: (t as any).status || 'AKTİF',
          currency: (t as any).currency || 'TRY',
          masterTreatmentId: t.masterTreatmentId,
          masterTreatment: {
            id: t.masterTreatment.id,
            name: t.masterTreatment.name,
            sutCode: t.masterTreatment.sutCode,
            category: t.masterTreatment.category || 'Diğer'
          },
          isCustomPrice: entry ? entry.customPrice !== null : false,
        };
      });
    }

    return baseTariffs.map(t => ({
      id: t.id,
      price: Number(t.price),
      taxRate: Number(t.taxRate),
      status: (t as any).status || 'AKTİF',
      currency: (t as any).currency || 'TRY',
      masterTreatmentId: t.masterTreatmentId,
      masterTreatment: {
        id: t.masterTreatment.id,
        name: t.masterTreatment.name,
        sutCode: t.masterTreatment.sutCode,
        category: t.masterTreatment.category || 'Diğer'
      },
      isCustomPrice: false,
    }));
  }

  /**
   * Tek tarife kaydını günceller (fiyat, durum, para birimi).
   */
  async updateTariff(id: string, clinicId: string, data: { price?: number; taxRate?: number; status?: string; currency?: string }) {
    const db = await this.tenantPrisma.getClient();
    const updateData: any = {};
    if (data.price !== undefined) updateData.price = data.price;
    if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.currency !== undefined) updateData.currency = data.currency;
    return db.tariff.update({ where: { id, clinicId }, data: updateData });
  }

  /**
   * Kliniğe ait tüm tarife gruplarını listeler.
   */
  async findAllGroups(clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const dbGroups = await tenantDb.tariffGroup.findMany({
      where: { clinicId },
      include: {
        _count: {
          select: { entries: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return dbGroups.map(g => ({
      id: g.id,
      name: g.name,
      type: g.isDefault ? 'SİSTEM' : 'KLİNİK',
      validity: 'Süresiz',
      treatmentCount: g._count.entries,
      status: g.isActive ? 'AKTİF' : 'PASİF'
    }));
  }

  /**
   * Yeni tarife grubu oluşturur.
   */
  async createGroup(clinicId: string, dto: CreateTariffGroupDto) {
    const tenantDb = await this.tenantPrisma.getClient();

    return tenantDb.$transaction(async (tx) => {
      const group = await tx.tariffGroup.create({
        data: {
          clinicId,
          name: dto.name,
          isDefault: false,
          isActive: true,
        }
      });

      // Fetch all base tariffs
      const baseTariffs = await tx.tariff.findMany({
        where: { clinicId }
      });

      let sourceEntriesMap = new Map<string, any>();
      if (dto.sourceGroupId && dto.sourceGroupId !== 'default') {
        const sourceEntries = await tx.tariffGroupEntry.findMany({
          where: { groupId: dto.sourceGroupId }
        });
        sourceEntriesMap = new Map(sourceEntries.map(e => [e.tariffId, e]));
      }

      // Batch insert entries
      const entriesData = baseTariffs.map(t => {
        const sourceEntry = sourceEntriesMap.get(t.id);
        return {
          groupId: group.id,
          tariffId: t.id,
          masterTreatmentId: t.masterTreatmentId,
          customPrice: sourceEntry ? sourceEntry.customPrice : null
        };
      });

      const BATCH = 50;
      for (let i = 0; i < entriesData.length; i += BATCH) {
        const batch = entriesData.slice(i, i + BATCH);
        await tx.tariffGroupEntry.createMany({
          data: batch,
          skipDuplicates: true
        });
      }

      return group;
    });
  }

  /**
   * Tarife grubunu günceller.
   */
  async updateGroup(clinicId: string, id: string, dto: UpdateTariffGroupDto) {
    const tenantDb = await this.tenantPrisma.getClient();
    const group = await tenantDb.tariffGroup.findFirst({ where: { id, clinicId } });
    if (!group) {
      throw new BadRequestException('Tarife grubu bulunamadı.');
    }

    // Sistem tarifeleri (SaaS tarafından tanımlanan, ör. TDB 2026 Tarifesi) yeniden
    // adlandırılamaz; sadece aktif/pasif durumu değiştirilebilir.
    if (group.isDefault && dto.name !== undefined && dto.name !== group.name) {
      throw new BadRequestException('Sistem tarifeleri düzenlenemez.');
    }

    return tenantDb.tariffGroup.update({
      where: { id, clinicId },
      data: {
        name: group.isDefault ? group.name : dto.name,
        isActive: dto.isActive
      }
    });
  }

  /**
   * Tarife grubunu siler.
   */
  async deleteGroup(clinicId: string, id: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const group = await tenantDb.tariffGroup.findFirst({ where: { id, clinicId } });
    if (!group) {
      throw new BadRequestException('Tarife grubu bulunamadı.');
    }
    if (group.isDefault) {
      throw new BadRequestException('Sistem tarifeleri silinemez.');
    }

    return tenantDb.tariffGroup.delete({
      where: { id, clinicId }
    });
  }

  /**
   * Toplu fiyat güncellemesi.
   */
  async bulkUpdateTariffs(clinicId: string, dto: BulkUpdateTariffsDto) {
    const tenantDb = await this.tenantPrisma.getClient();

    return tenantDb.$transaction(async (tx) => {
      for (const item of dto.items) {
        let tariffId = item.id;

        // 1. Yeni tedavi ise oluştur
        if (item.id.startsWith('CUSTOM-')) {
          const mt = await tx.masterTreatment.create({
            data: {
              name: item.name || 'Yeni Tedavi',
              sutCode: item.sutCode || null,
              category: item.category || 'Teşhis ve Planlama'
            }
          });

          const tariff = await tx.tariff.create({
            data: {
              clinicId,
              masterTreatmentId: mt.id,
              price: item.price,
              taxRate: item.taxRate !== undefined ? item.taxRate : 10
            }
          });

          tariffId = tariff.id;
        }

        // 2. Fiyat + durum güncellemesi
        if (dto.groupId === 'default') {
          const updateData: any = { price: item.price };
          if (item.taxRate !== undefined) updateData.taxRate = item.taxRate;
          if (item.status !== undefined) updateData.status = item.status;
          if ((item as any).currency !== undefined) updateData.currency = (item as any).currency;
          await tx.tariff.update({ where: { id: tariffId }, data: updateData });
        } else {
          const existingEntry = await tx.tariffGroupEntry.findFirst({
            where: { groupId: dto.groupId, tariffId }
          });

          if (existingEntry) {
            await tx.tariffGroupEntry.update({
              where: { id: existingEntry.id },
              data: { customPrice: item.price }
            });
          } else {
            const tariff = await tx.tariff.findUnique({
              where: { id: tariffId }
            });
            if (tariff) {
              await tx.tariffGroupEntry.create({
                data: {
                  groupId: dto.groupId,
                  tariffId,
                  masterTreatmentId: tariff.masterTreatmentId,
                  customPrice: item.price
                }
              });
            }
          }
        }
      }

      return { success: true };
    });
  }

  /**
   * Hasta bazlı tedavi planlarını getirir.
   */
  async findByPatient(clinicId: string, patientId: string) {
    return this.repo.findByPatient(clinicId, patientId);
  }
}
