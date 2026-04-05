import { prisma } from '../../config/database';
import { parseDateRange } from '../../shared/utils/dateUtils';
import { Prisma } from '../../generated/prisma/client';

interface DashboardContext {
  userId: string;
  role: string;
}

function userFilter(ctx: DashboardContext): Prisma.TransactionWhereInput {
  if (ctx.role === 'ADMIN') return {};
  return { userId: ctx.userId };
}

export class DashboardService {
  async getSummary(ctx: DashboardContext, startDate?: string, endDate?: string) {
    const { start, end } = parseDateRange(startDate, endDate);

    const result = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        deletedAt: null,
        date: { gte: start, lte: end },
        ...userFilter(ctx),
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const row of result) {
      const sum = Number(row._sum.amount) || 0;
      const count = row._count.id;
      if (row.type === 'INCOME') {
        totalIncome = sum;
        incomeCount = count;
      } else {
        totalExpenses = sum;
        expenseCount = count;
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      incomeCount,
      expenseCount,
      totalTransactions: incomeCount + expenseCount,
      dateRange: { start, end },
    };
  }

  async getCategoryTotals(ctx: DashboardContext, startDate?: string, endDate?: string) {
    const { start, end } = parseDateRange(startDate, endDate);

    const result = await prisma.transaction.groupBy({
      by: ['category', 'type'],
      where: {
        deletedAt: null,
        date: { gte: start, lte: end },
        ...userFilter(ctx),
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const categories: Record<string, { income: number; expense: number; net: number; count: number }> = {};

    for (const row of result) {
      if (!categories[row.category]) {
        categories[row.category] = { income: 0, expense: 0, net: 0, count: 0 };
      }
      const amount = Number(row._sum.amount) || 0;
      categories[row.category].count += row._count.id;
      if (row.type === 'INCOME') {
        categories[row.category].income = amount;
      } else {
        categories[row.category].expense = amount;
      }
    }

    for (const cat of Object.values(categories)) {
      cat.net = cat.income - cat.expense;
    }

    const sorted = Object.entries(categories)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => (b.income + b.expense) - (a.income + a.expense));

    return { categories: sorted, dateRange: { start, end } };
  }

  async getTrends(ctx: DashboardContext, startDate?: string, endDate?: string, granularity: 'weekly' | 'monthly' = 'monthly') {
    const { start, end } = parseDateRange(startDate, endDate);

    const truncFn = granularity === 'weekly' ? 'week' : 'month';

    const userClause = ctx.role !== 'ADMIN'
      ? Prisma.sql`AND user_id = ${ctx.userId}`
      : Prisma.empty;

    const result: Array<{ period: Date; type: string; total: Prisma.Decimal; count: bigint }> =
      await prisma.$queryRaw`
        SELECT
          DATE_TRUNC(${truncFn}, date) as period,
          type,
          SUM(amount) as total,
          COUNT(*) as count
        FROM transactions
        WHERE deleted_at IS NULL
          AND date >= ${start}
          AND date <= ${end}
          ${userClause}
        GROUP BY period, type
        ORDER BY period ASC
      `;

    const trendsMap = new Map<string, { period: string; income: number; expense: number; net: number }>();

    for (const row of result) {
      const key = new Date(row.period).toISOString().split('T')[0];
      if (!trendsMap.has(key)) {
        trendsMap.set(key, { period: key, income: 0, expense: 0, net: 0 });
      }
      const entry = trendsMap.get(key)!;
      const total = Number(row.total) || 0;
      if (row.type === 'INCOME') {
        entry.income = total;
      } else {
        entry.expense = total;
      }
      entry.net = entry.income - entry.expense;
    }

    return {
      trends: Array.from(trendsMap.values()),
      granularity,
      dateRange: { start, end },
    };
  }

  async getRecentActivity(ctx: DashboardContext, limit = 10) {
    const transactions = await prisma.transaction.findMany({
      where: {
        deletedAt: null,
        ...userFilter(ctx),
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return transactions;
  }
}

export const dashboardService = new DashboardService();
