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

}
