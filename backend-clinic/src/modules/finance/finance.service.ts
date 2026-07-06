import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceRepository } from './finance.repository';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { CreateExpenseCategoryDto, CreateExpenseDto } from './dto/expense.dto';
import { CreateFinancialAccountDto } from './dto/create-financial-account.dto';
import { EVENTS, PaymentDistributedEvent } from '../../common/events/domain-events';

export interface StatementItem {
  name: string;
  quantity: number;
  unitPrice: number;
  toothNos: number[];
}

export interface StatementEntry {
  date: Date;
  description: string;
  dueDate: Date | null;
  debit: number;
  credit: number;
  items?: StatementItem[];
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private readonly repo: FinanceRepository,
    private readonly tenantPrisma: TenantPrismaService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Muhasebe modülünde tanımlı kasa/banka hesaplarını listeler.
   */
  async getAccounts(clinicId: string, includeInactive = false) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.financialAccount.findMany({
      where: { clinicId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Yeni kasa/banka hesabı oluşturur.
   */
  async createAccount(dto: CreateFinancialAccountDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.financialAccount.create({
      data: {
        clinicId,
        name: dto.name,
        type: dto.type,
        currency: dto.currency || 'TRY',
        balance: dto.initialBalance || 0,
        bankName: dto.bankName,
        branch: dto.branch,
        iban: dto.iban,
      },
    });
  }

  /**
   * Tedavi bazlı (manuel) dağıtım için: hastanın sözleşme ile kabul ettiği
   * (planı ACTIVE olan), henüz tam ödenmemiş tedavi kalemlerini hekim adıyla
   * birlikte listeler. Tedavinin fiilen tamamlanmış olması şart değildir —
   * plan aktifleştiğinde borç zaten oluşur (bkz. activatePlan).
   */
  async getUnpaidTreatmentItems(clinicId: string, patientId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const items = await tenantDb.treatmentItem.findMany({
      where: {
        plan: { patientId, clinicId, status: 'ACTIVE' },
        status: { not: 'CANCELLED' },
      },
      include: {
        tariff: { include: { masterTreatment: true } },
        paymentDistributions: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const doctorIds = Array.from(new Set(items.map(i => i.doctorId).filter(Boolean))) as string[];
    const doctors = doctorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: doctorIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const doctorMap = new Map(doctors.map(d => [d.id, `${d.firstName} ${d.lastName}`]));

    return items
      .map(item => {
        const price = Number(item.price);
        const paid = item.paymentDistributions.reduce((sum, d) => sum + Number(d.amount), 0);
        const remainingDebt = Math.max(0, price - paid);
        return {
          id: item.id,
          toothNo: item.toothNo,
          name: item.tariff?.masterTreatment?.name || 'Bilinmeyen Tedavi',
          doctorId: item.doctorId,
          doctorName: doctorMap.get(item.doctorId) || 'Belirtilmemiş',
          price,
          paid,
          remainingDebt,
        };
      })
      .filter(item => item.remainingDebt > 0);
  }

  /**
   * İade akışı için: hastanın sözleşme ile kabul ettiği (planı ACTIVE olan)
   * tedavi kalemlerinden, üzerine en az bir ödeme dağıtılmış olanları
   * (paidAmount > 0) hekim adıyla birlikte listeler.
   */
  async getPaidTreatmentItems(clinicId: string, patientId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const items = await tenantDb.treatmentItem.findMany({
      where: {
        plan: { patientId, clinicId, status: 'ACTIVE' },
        status: { not: 'CANCELLED' },
      },
      include: {
        tariff: { include: { masterTreatment: true } },
        paymentDistributions: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const doctorIds = Array.from(new Set(items.map(i => i.doctorId).filter(Boolean))) as string[];
    const doctors = doctorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: doctorIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const doctorMap = new Map(doctors.map(d => [d.id, `${d.firstName} ${d.lastName}`]));

    return items
      .map(item => {
        const price = Number(item.price);
        const paidAmount = item.paymentDistributions.reduce((sum, d) => sum + Number(d.amount), 0);
        return {
          id: item.id,
          toothNo: item.toothNo,
          name: item.tariff?.masterTreatment?.name || 'Bilinmeyen Tedavi',
          doctorId: item.doctorId,
          doctorName: doctorMap.get(item.doctorId) || 'Belirtilmemiş',
          price,
          paidAmount,
        };
      })
      .filter(item => item.paidAmount > 0.01);
  }

  /**
   * Hasta Ekstresi (İşlem Dökümü): sözleşme (plan aktivasyonu), ödemeler ve
   * iadeler dahil tüm finansal hareketleri kronolojik sırada, kümülatif
   * bakiye ile birlikte döner. Bakiye pozitifse hasta borçlu, negatifse
   * hastanın avans/kredi bakiyesi vardır.
   *
   * Not: TreatmentPlan modelinde ayrı bir "aktivasyon tarihi" alanı
   * bulunmadığından, sözleşme tarihi olarak planın son güncellenme tarihi
   * (activatePlan bu alanı günceller) kullanılır.
   */
  async getPatientStatement(clinicId: string, patientId: string) {
    const tenantDb = await this.tenantPrisma.getClient();

    const patient = await tenantDb.patient.findFirst({
      where: { id: patientId, clinicId },
    });
    if (!patient) {
      throw new NotFoundException(`Hasta bulunamadı: ${patientId}`);
    }

    const plans = await tenantDb.treatmentPlan.findMany({
      where: { patientId, clinicId, status: 'ACTIVE' },
      include: {
        items: {
          where: { status: { not: 'CANCELLED' } },
          include: { tariff: { include: { masterTreatment: true } } },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    const payments = await tenantDb.payment.findMany({
      where: { patientId },
      include: { account: true },
      orderBy: { createdAt: 'asc' },
    });

    const entries: StatementEntry[] = [];

    for (const plan of plans) {
      const groups = new Map<string, StatementItem>();
      for (const item of plan.items) {
        const name = item.tariff?.masterTreatment?.name || 'Tedavi';
        const unitPrice = Number(item.price);
        const key = `${name}__${unitPrice}`;
        const g = groups.get(key) || { name, unitPrice, quantity: 0, toothNos: [] };
        g.quantity += 1;
        if (item.toothNo) g.toothNos.push(item.toothNo);
        groups.set(key, g);
      }

      entries.push({
        date: plan.updatedAt,
        description: `Tedavi Planı Sözleşmesi — ${plan.name || 'Plan'}`,
        dueDate: plan.updatedAt,
        debit: Number(plan.totalPrice),
        credit: 0,
        items: Array.from(groups.values()),
      });
    }

    for (const payment of payments) {
      const amount = Number(payment.amount);
      const accountSuffix = payment.account ? ` — ${payment.account.name}` : '';
      if (amount > 0.01) {
        entries.push({
          date: payment.createdAt,
          description: `Müşteriden Tahsilat${accountSuffix}`,
          dueDate: null,
          debit: 0,
          credit: amount,
        });
      } else if (amount < -0.01) {
        entries.push({
          date: payment.createdAt,
          description: `Tahsilat İadesi${accountSuffix}`,
          dueDate: null,
          debit: -amount,
          credit: 0,
        });
      }
    }

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    const withBalance = entries.map(e => {
      runningBalance += e.debit - e.credit;
      return { ...e, balance: runningBalance };
    });

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    return {
      patient: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        nationalId: patient.nationalId,
        phone: patient.phone,
        address: patient.address,
        city: patient.city,
        district: patient.district,
      },
      entries: withBalance,
      totalDebit,
      totalCredit,
      balance: runningBalance,
    };
  }

  // ... rest of processPayment, getPatientBalance, etc.

  /**
   * Gider kategorisi oluşturur
   */
  async createExpenseCategory(dto: CreateExpenseCategoryDto, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.expenseCategory.create({
      data: { ...dto, clinicId }
    });
  }

  /**
   * Tüm gider kategorilerini getirir
   */
  async getExpenseCategories(clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.expenseCategory.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Yeni gider kaydı oluşturur
   */
  async createExpense(dto: CreateExpenseDto, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.expense.create({
      data: {
        clinicId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        description: dto.description,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        paymentMethod: dto.paymentMethod || 'CASH',
      },
      include: { category: true }
    });
  }

  /**
   * Giderleri listeler
   */
  async getExpenses(clinicId: string, startDate?: string, endDate?: string) {
    const prisma = await this.tenantPrisma.getClient();
    const where: any = { clinicId };
    
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    return prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { expenseDate: 'desc' }
    });
  }

  /**
   * LLD 5.1: Ödeme İşleme — FIFO Dağıtım Algoritması
   * 1. Hasta doğrulama + tenant izolasyonu
   * 2. Tahsilat kaydı (Payment)
   * 3. FIFO: Sözleşmesi aktif olan tedavi kalemleri eski→yeni sırayla ödenir
   * 4. Optimistic Locking ile bakiye güncelleme (race condition koruması)
   */
  async processPayment(createDto: CreatePaymentDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.$transaction(async (tx) => {
      // 1. Hasta doğrulama — transaction içinde (ghost read koruması)
      const patient = await tx.patient.findFirst({
        where: { id: createDto.patientId, clinicId },
      });

      if (!patient) {
        throw new NotFoundException(
          `Klinik sisteminde bu hasta bulunamadı. (patientId: ${createDto.patientId})`,
        );
      }

      // 1b. Kasa/banka hesabı doğrulaması (opsiyonel)
      if (createDto.accountId) {
        const account = await tx.financialAccount.findFirst({
          where: { id: createDto.accountId, clinicId, isActive: true },
        });
        if (!account) {
          throw new BadRequestException('Seçilen kasa/banka hesabı bulunamadı veya pasif.');
        }
      }

      const distributionType = createDto.distributionType || 'FIFO';

      // 2. Tahsilat kaydı
      const payment = await tx.payment.create({
        data: {
          patientId: createDto.patientId,
          amount: createDto.amount,
          method: createDto.method,
          accountId: createDto.accountId,
          distributionType,
        },
      });

      let remainingAmount = Number(createDto.amount);
      // ADR-003 Faz 3: PAYMENT_DISTRIBUTED event'i için oluşturulan dağıtımların izi
      const createdDistributions: { id: string; treatmentItemId: string; doctorId: string; amount: number; itemStatus: string }[] = [];

      if (distributionType === 'TREATMENT_BASED') {
        // 3a. Tedavi Bazlı (Manuel) Dağıtım: kullanıcının seçtiği kalemlere girdiği tutarlar
        const allocations = createDto.allocations || [];
        if (allocations.length === 0) {
          throw new BadRequestException(
            'Tedavi bazlı dağıtım için en az bir tedavi kalemine tutar girilmelidir.',
          );
        }

        const allocationsTotal = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
        if (Math.abs(allocationsTotal - Number(createDto.amount)) > 0.01) {
          throw new BadRequestException(
            'Tedavi kalemlerine dağıtılan toplam tutar, ödeme tutarına eşit olmalıdır.',
          );
        }

        const allocatedItems = await tx.treatmentItem.findMany({
          where: {
            id: { in: allocations.map((a) => a.treatmentItemId) },
            plan: { patientId: createDto.patientId, clinicId },
          },
          include: { paymentDistributions: true },
        });
        const allocatedItemMap = new Map<string, any>(allocatedItems.map((item) => [item.id, item]));

        for (const alloc of allocations) {
          const item = allocatedItemMap.get(alloc.treatmentItemId);
          if (!item) {
            throw new BadRequestException(`Tedavi kalemi bulunamadı veya bu hastaya ait değil: ${alloc.treatmentItemId}`);
          }

          const alreadyPaid = item.paymentDistributions.reduce((sum, d) => sum + Number(d.amount), 0);
          const remainingDebt = Number(item.price) - alreadyPaid;
          if (Number(alloc.amount) > remainingDebt + 0.01) {
            throw new BadRequestException(
              `Girilen tutar (₺${Number(alloc.amount).toFixed(2)}), tedavi kaleminin kalan borcundan (₺${remainingDebt.toFixed(2)}) fazla olamaz.`,
            );
          }

          const created = await tx.paymentDistribution.create({
            data: { paymentId: payment.id, treatmentItemId: alloc.treatmentItemId, amount: alloc.amount },
          });
          createdDistributions.push({
            id: created.id,
            treatmentItemId: item.id,
            doctorId: item.doctorId,
            amount: Number(alloc.amount),
            itemStatus: item.status,
          });
        }

        remainingAmount = 0; // Toplam tam eşleşme zorunlu olduğundan avansa kalan tutar olmaz.
      } else {
        // 3b. FIFO Dağıtım: Sözleşme ile kabul edilen (planı ACTIVE olan), henüz
        // tam ödenmemiş tedavi kalemlerini eskiden yeniye dağıt. Tedavinin fiilen
        // tamamlanmış olması şart değildir — plan aktifleştiğinde borç zaten oluşur.
        const treatments = await tx.treatmentItem.findMany({
          where: {
            plan: { patientId: createDto.patientId, clinicId, status: 'ACTIVE' },
            status: { not: 'CANCELLED' },
          },
          include: { paymentDistributions: true },
          orderBy: { createdAt: 'asc' },
        });

        for (const item of treatments) {
          if (remainingAmount <= 0) break;

          const itemPrice = Number(item.price);
          const alreadyPaid = item.paymentDistributions.reduce(
            (sum, dist) => sum + Number(dist.amount),
            0,
          );
          const itemDebt = itemPrice - alreadyPaid;

          if (itemDebt > 0) {
            const distributionAmount = Math.min(itemDebt, remainingAmount);

            const created = await tx.paymentDistribution.create({
              data: { paymentId: payment.id, treatmentItemId: item.id, amount: distributionAmount },
            });
            createdDistributions.push({
              id: created.id,
              treatmentItemId: item.id,
              doctorId: item.doctorId,
              amount: distributionAmount,
              itemStatus: item.status,
            });

            remainingAmount -= distributionAmount;
          }
        }
      }

      // 4. Bakiye güncellemesi — Optimistic Locking
      const advanceToAdd = remainingAmount > 0 ? remainingAmount : 0;
      const debtToReduce = Number(createDto.amount) - advanceToAdd;

      const updated = await tx.patient.updateMany({
        where: {
          id: createDto.patientId,
          clinicId,
          version: patient.version, // Eşzamanlılık kilidi
        },
        data: {
          totalDebt: { decrement: debtToReduce },
          advance: { increment: advanceToAdd },
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new BadRequestException(
          'Bu hasta kaydı üzerinde aynı anda başka bir işlem yapıldı. ' +
            'Veriler güncel hale getirildi, lütfen işlemi tekrar deneyiniz.',
        );
      }

      // 5. Kasa/banka bakiyesini tahsilat tutarı kadar artır
      if (createDto.accountId) {
        await tx.financialAccount.update({
          where: { id: createDto.accountId },
          data: { balance: { increment: createDto.amount } },
        });
      }

      this.logger.log(
        `Ödeme işlendi: ${payment.id} | Hasta: ${createDto.patientId} | ` +
          `Tutar: ${createDto.amount} | Avans: ${advanceToAdd}`,
      );

      // Dış entegrasyonlar için event fırlat (Örn: Paraşüt fatura oluşturma)
      this.eventEmitter.emit(EVENTS.INVOICE_CREATED, {
        paymentId: payment.id,
        patientId: createDto.patientId,
        clinicId,
        amount: createDto.amount,
        data: payment,
      });

      // ADR-003 Faz 3: her tedavi kalemine düşen dağıtım için prim motorunu tetikle.
      // Kalem henüz COMPLETED değilse dinleyici bu tutarı primlemeden atlar — kalem
      // sonradan tamamlandığında treatments modülü TREATMENT_COMPLETED üzerinden
      // bu bekleyen dağıtımları geriye dönük tarayıp primler.
      for (const dist of createdDistributions) {
        this.eventEmitter.emit(
          EVENTS.PAYMENT_DISTRIBUTED,
          new PaymentDistributedEvent(dist.id, dist.treatmentItemId, clinicId, dist.doctorId, dist.amount, dist.itemStatus),
        );
      }

      return payment;
    });
  }

  /**
   * Tahsilat İadesi: Kullanıcının seçtiği, üzerine daha önce ödeme dağıtılmış
   * tedavi kalemlerinden ve/veya hastanın avans bakiyesinden belirlenen
   * tutarları geri alır. Negatif tutarlı bir Payment + PaymentDistribution
   * kaydı oluşturularak modellenir (avans kısmı için distribution oluşmaz);
   * böylece FIFO/kalan borç hesaplamaları (paymentDistributions toplamı) ve
   * ödeme silme/geri alma akışı (deletePayments) hiçbir özel durum
   * gerektirmeden doğru şekilde çalışmaya devam eder.
   */
  async processRefund(dto: CreateRefundDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { id: dto.patientId, clinicId },
      });

      if (!patient) {
        throw new NotFoundException(
          `Klinik sisteminde bu hasta bulunamadı. (patientId: ${dto.patientId})`,
        );
      }

      if (dto.accountId) {
        const account = await tx.financialAccount.findFirst({
          where: { id: dto.accountId, clinicId, isActive: true },
        });
        if (!account) {
          throw new BadRequestException('Seçilen kasa/banka hesabı bulunamadı veya pasif.');
        }
      }

      const allocations = dto.allocations || [];
      const refundFromAdvance = Number(dto.refundFromAdvance) || 0;

      if (allocations.length === 0 && refundFromAdvance <= 0) {
        throw new BadRequestException(
          'İade için en az bir tedavi kalemi veya avans bakiyesi seçilmelidir.',
        );
      }

      const allocationsTotal = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
      const grandTotal = allocationsTotal + refundFromAdvance;
      if (Math.abs(grandTotal - Number(dto.amount)) > 0.01) {
        throw new BadRequestException(
          'Tedavi kalemlerine ve avans bakiyesine dağıtılan toplam iade tutarı, iade tutarına eşit olmalıdır.',
        );
      }

      if (refundFromAdvance > Number(patient.advance) + 0.01) {
        throw new BadRequestException(
          `Avanstan iade tutarı (₺${refundFromAdvance.toFixed(2)}), mevcut avans bakiyesinden (₺${Number(patient.advance).toFixed(2)}) fazla olamaz.`,
        );
      }

      const refund = await tx.payment.create({
        data: {
          patientId: dto.patientId,
          amount: -Number(dto.amount),
          method: dto.method,
          accountId: dto.accountId,
          distributionType: 'TREATMENT_BASED',
        },
      });

      for (const alloc of allocations) {
        const item = await tx.treatmentItem.findFirst({
          where: { id: alloc.treatmentItemId, plan: { patientId: dto.patientId, clinicId } },
          include: { paymentDistributions: true },
        });
        if (!item) {
          throw new BadRequestException(`Tedavi kalemi bulunamadı veya bu hastaya ait değil: ${alloc.treatmentItemId}`);
        }

        const paidAmount = item.paymentDistributions.reduce((sum, d) => sum + Number(d.amount), 0);
        if (Number(alloc.amount) > paidAmount + 0.01) {
          throw new BadRequestException(
            `İade tutarı (₺${Number(alloc.amount).toFixed(2)}), bu tedavi kalemi için ödenen tutardan (₺${paidAmount.toFixed(2)}) fazla olamaz.`,
          );
        }

        await tx.paymentDistribution.create({
          data: {
            paymentId: refund.id,
            treatmentItemId: alloc.treatmentItemId,
            amount: -Number(alloc.amount),
          },
        });
      }

      const updated = await tx.patient.updateMany({
        where: {
          id: dto.patientId,
          clinicId,
          version: patient.version,
        },
        data: {
          totalDebt: { increment: allocationsTotal },
          advance: { decrement: refundFromAdvance },
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new BadRequestException(
          'Bu hasta kaydı üzerinde aynı anda başka bir işlem yapıldı. ' +
            'Veriler güncel hale getirildi, lütfen işlemi tekrar deneyiniz.',
        );
      }

      if (dto.accountId) {
        await tx.financialAccount.update({
          where: { id: dto.accountId },
          data: { balance: { decrement: grandTotal } },
        });
      }

      this.logger.log(
        `İade işlendi: ${refund.id} | Hasta: ${dto.patientId} | Tutar: ${grandTotal} | Avanstan: ${refundFromAdvance}`,
      );

      return refund;
    });
  }

  /**
   * LLD 5.2: Hasta Bakiye Özeti
   */
  async getPatientBalance(clinicId: string, patientId: string) {
    const balance = await this.repo.getPatientBalance(clinicId, patientId);

    if (!balance) {
      throw new NotFoundException(`Hasta bulunamadı: ${patientId}`);
    }

    return balance;
  }

  /**
   * Hasta ödeme geçmişi (dağılım detaylarıyla birlikte)
   */
  async getPaymentHistory(clinicId: string, patientId: string) {
    return this.repo.findByPatient(clinicId, patientId);
  }

  /**
   * Tekli/çoklu ödeme silme: silinen ödemenin tedavi kalemlerine dağıtılan
   * kısmını hastanın borcuna geri ekler, avans kısmını avans bakiyesinden
   * düşer ve kasa/banka hesabının bakiyesini geri alır. Tüm işlem tek bir
   * transaction içinde atomik olarak yürütülür.
   */
  async deletePayments(paymentIds: string[], clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();

    return tenantDb.$transaction(async (tx) => {
      const payments = await tx.payment.findMany({
        where: { id: { in: paymentIds }, patient: { clinicId } },
        include: { distributions: true },
      });

      if (payments.length !== paymentIds.length) {
        throw new NotFoundException(
          'Bazı ödemeler bulunamadı veya bu kliniğe ait değil.',
        );
      }

      for (const payment of payments) {
        const distributedTotal = payment.distributions.reduce(
          (sum, d) => sum + Number(d.amount),
          0,
        );
        const advancePortion = Number(payment.amount) - distributedTotal;

        await tx.patient.update({
          where: { id: payment.patientId },
          data: {
            totalDebt: { increment: distributedTotal },
            // advancePortion negatifse (örn. avanstan yapılan bir iade siliniyorsa) bu
            // aynı zamanda avansı doğru yönde (artırarak) geri alır.
            advance: { decrement: advancePortion },
          },
        });

        if (payment.accountId) {
          await tx.financialAccount.update({
            where: { id: payment.accountId },
            data: { balance: { decrement: Number(payment.amount) } },
          });
        }
      }

      await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });

      this.logger.log(
        `Ödeme(ler) silindi: ${paymentIds.join(', ')} | Klinik: ${clinicId}`,
      );

      return { deletedCount: payments.length };
    });
  }

  /**
   * Son tahsilatları listeler
   */
  async getRecentPayments(clinicId: string, limit = 10) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.payment.findMany({
      where: {
        patient: { clinicId },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Günlük kasa ve genel finansal istatistikleri döner
   */
  async getStats(clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const payments = await tenantDb.payment.findMany({
      where: {
        patient: { clinicId },
        createdAt: { gte: today },
      },
    });

    const dailyCash = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      dailyCash,
      paymentCount: payments.length,
    };
  }
}
