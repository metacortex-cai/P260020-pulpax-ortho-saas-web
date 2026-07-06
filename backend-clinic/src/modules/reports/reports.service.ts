import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /**
   * Gelir özeti: Günlük, Haftalık, Aylık tahsilatlar ve Giderler
   */
  async getIncomeSummary() {
    const prisma = await this.tenantPrisma.getClient();
    
    const now = new Date();
    const todayStart = new Date(new Date(now).setHours(0,0,0,0));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailyIncome, monthlyIncome, dailyExpense, monthlyExpense] = await Promise.all([
      prisma.payment.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: { expenseDate: { gte: todayStart } },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: { expenseDate: { gte: monthStart } },
        _sum: { amount: true }
      })
    ]);

    // Toplam Borç ve Tahsilat Oranı
    const totalDebt = await prisma.patient.aggregate({
      _sum: { totalDebt: true }
    });

    const totalCollected = await prisma.payment.aggregate({
      _sum: { amount: true }
    });

    return {
      dailyIncome: Number(dailyIncome._sum.amount || 0),
      monthlyIncome: Number(monthlyIncome._sum.amount || 0),
      dailyExpense: Number(dailyExpense._sum.amount || 0),
      monthlyExpense: Number(monthlyExpense._sum.amount || 0),
      netMonthlyProfit: Number(monthlyIncome._sum.amount || 0) - Number(monthlyExpense._sum.amount || 0),
      totalDebt: Number(totalDebt._sum.totalDebt || 0),
      totalCollected: Number(totalCollected._sum.amount || 0),
      collectionRate: totalDebt._sum.totalDebt ? 
        (Number(totalCollected._sum.amount) / Number(totalDebt._sum.totalDebt)) * 100 : 0
    };
  }

  /**
   * Tarih aralığına göre detaylı gelir raporu
   */
  async getIncomeReport(startDate?: string, endDate?: string) {
    const prisma = await this.tenantPrisma.getClient();
    
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    } else {
      // Default son 6 ay
      const defaultStart = new Date();
      defaultStart.setMonth(defaultStart.getMonth() - 6);
      where.createdAt = { gte: defaultStart };
    }

    const payments = await prisma.payment.findMany({
      where,
      select: {
        amount: true,
        createdAt: true,
      }
    });

    // Aylara göre grupla
    const grouped = payments.reduce((acc, curr) => {
      const monthYear = `${curr.createdAt.getFullYear()}-${String(curr.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[monthYear]) acc[monthYear] = 0;
      acc[monthYear] += Number(curr.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(grouped).sort().map(key => ({
      month: key,
      totalIncome: grouped[key]
    }));
  }

  /**
   * En çok yapılan tedaviler ve getirdikleri ciro
   */
  async getTreatmentPerformance() {
    const prisma = await this.tenantPrisma.getClient();
    
    const treatments = await prisma.treatmentItem.findMany({
      select: {
        price: true,
        tariff: {
          select: {
            masterTreatment: {
              select: { name: true }
            }
          }
        }
      }
    });

    const grouped = treatments.reduce((acc, curr) => {
      const name = curr.tariff?.masterTreatment?.name || 'Bilinmeyen İşlem';
      if (!acc[name]) acc[name] = { count: 0, totalRevenue: 0 };
      acc[name].count++;
      acc[name].totalRevenue += Number(curr.price);
      return acc;
    }, {} as Record<string, { count: number, totalRevenue: number }>);

    return Object.keys(grouped)
      .map(name => ({ 
        name, 
        count: grouped[name].count,
        revenue: grouped[name].totalRevenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  /**
   * Hekim bazlı ciro ve prim performansı
   */
  async getDoctorPerformance(startDate?: string, endDate?: string) {
    const prisma = await this.tenantPrisma.getClient();
    
    const where: any = {};
    if (startDate || endDate) {
      where.calculatedAt = {};
      if (startDate) where.calculatedAt.gte = new Date(startDate);
      if (endDate) where.calculatedAt.lte = new Date(endDate);
    }

    // Prim kayıtlarını ve ilişkili tedavileri çek
    const primRecords = await prisma.primRecord.findMany({
      where,
      include: {
        treatmentItem: {
          include: {
            tariff: { include: { masterTreatment: true } },
            labOrders: true
          }
        }
      }
    });

    const performance = primRecords.reduce((acc, curr) => {
      if (!acc[curr.employeeId]) {
        acc[curr.employeeId] = {
          doctorId: curr.employeeId,
          totalRevenue: 0,
          totalCommission: 0,
          totalLabCost: 0,
          treatmentCount: 0,
          treatments: {}
        };
      }
      
      const revenue = Number(curr.treatmentItem.price);
      const commission = Number(curr.amount);
      const treatmentName = curr.treatmentItem.tariff.masterTreatment.name;

      // Bu tedaviye bağlı lab maliyetlerini de çekelim (basitlik adına prim kayıtları üzerinden gidiyoruz)
      // Ancak prim kaydı zaten hesaplanırken lab maliyeti düşülmüştü. 
      // Rapor için tekrar hesaplayalım: Lab Cost = Revenue - (Commission / (Rate/100)) -- Çok karmaşık olabilir.
      // En garantisi treatmentItem içindeki labOrders'ları include etmek.
      
      const labCost = curr.treatmentItem.labOrders?.reduce((sum: number, o: any) => sum + Number(o.cost), 0) || 0;

      acc[curr.employeeId].totalRevenue += revenue;
      acc[curr.employeeId].totalCommission += commission;
      acc[curr.employeeId].totalLabCost += labCost;
      acc[curr.employeeId].treatmentCount += 1;

      if (!acc[curr.employeeId].treatments[treatmentName]) {
        acc[curr.employeeId].treatments[treatmentName] = 0;
      }
      acc[curr.employeeId].treatments[treatmentName] += 1;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(performance).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Laboratuvar bazlı iş yükü ve maliyet raporu (lab.md → Raporlama: Laboratuvar maliyetleri)
   */
  async getLabReport(startDate?: string, endDate?: string) {
    const prisma = await this.tenantPrisma.getClient();

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const [labs, orders] = await Promise.all([
      prisma.lab.findMany({ where: { isActive: true } }),
      prisma.labOrder.findMany({ where, select: { labId: true, status: true, processType: true, cost: true } })
    ]);

    const performance = labs.reduce((acc: Record<string, any>, lab: any) => {
      acc[lab.id] = { id: lab.id, name: lab.name, totalWorks: 0, completed: 0, pending: 0, revisionCount: 0, totalCost: 0 };
      return acc;
    }, {});

    for (const order of orders) {
      if (!order.labId || !performance[order.labId]) continue;
      const bucket = performance[order.labId];
      bucket.totalWorks += 1;
      bucket.totalCost += Number(order.cost);
      if (order.status === 'RECEIVED' || order.status === 'FITTED') bucket.completed += 1;
      if (order.status === 'PENDING' || order.status === 'SENT') bucket.pending += 1;
      if (order.status === 'REVISION' || order.processType === 'REVIZYON') bucket.revisionCount += 1;
    }

    return Object.values(performance)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        totalWorks: item.totalWorks,
        completed: item.completed,
        pending: item.pending,
        revisionRate: item.totalWorks > 0 ? Number(((item.revisionCount / item.totalWorks) * 100).toFixed(1)) : 0,
        totalCost: item.totalCost,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }
}
