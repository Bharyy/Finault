import { prisma } from '../../config/database';
import { Prisma } from '../../generated/prisma/client';
import { AnomalyResult, CategoryStats } from './anomaly.types';
import { parsePagination, buildPaginationMeta, getPrismaSkip } from '../../shared/utils/pagination';
import { ApiError } from '../../shared/utils/apiError';

export class AnomalyService {
  async analyzeTransaction(transactionId: string): Promise<AnomalyResult[]> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.deletedAt) return [];

    // Clear existing unresolved anomalies for this transaction (in case of re-analysis)
    await prisma.anomaly.deleteMany({
      where: { transactionId, isResolved: false },
    });

    const anomalies: AnomalyResult[] = [];

    // Run all three strategies in parallel
    const [spikeResults, duplicateResults, frequencyResults] = await Promise.all([
      this.detectCategorySpike(transaction),
      this.detectDuplicates(transaction),
      this.detectUnusualFrequency(transaction),
    ]);

    anomalies.push(...spikeResults, ...duplicateResults, ...frequencyResults);

    // Persist anomalies
    if (anomalies.length > 0) {
      await prisma.anomaly.createMany({
        data: anomalies.map((a) => ({
          transactionId,
          type: a.type,
          message: a.message,
          severity: a.severity,
          metadata: a.metadata as Prisma.InputJsonValue,
        })),
      });

      // Emit real-time event
      try {
        const { getIO } = await import('../../config/socket');
        const io = getIO();
        io.emit('anomaly:detected', {
          transactionId,
          anomalies: anomalies.map((a) => ({
            type: a.type,
            message: a.message,
            severity: a.severity,
          })),
        });
      } catch {
        // Socket not initialized
      }
    }

    return anomalies;
  }

  /**
   * Strategy 1: Category Spike Detection
   * Flags transactions where the amount exceeds avg + 2*stddev for the category
   */
  private async detectCategorySpike(
    transaction: { id: string; amount: Prisma.Decimal; type: string; category: string }
  ): Promise<AnomalyResult[]> {
    const stats: CategoryStats[] = await prisma.$queryRaw`
      SELECT
        AVG(amount)::float as avg,
        STDDEV(amount)::float as stddev,
        COUNT(*)::int as count
      FROM transactions
      WHERE category = ${transaction.category}
        AND type = ${transaction.type}::"TransactionType"
        AND deleted_at IS NULL
        AND id != ${transaction.id}
    `;

    const stat = stats[0];
    if (!stat || stat.count < 2) return [];

    const amount = Number(transaction.amount);
    const avg = stat.avg;
    const threshold = stat.stddev
      ? avg + 2 * stat.stddev
      : avg * 2.0;

    if (amount > threshold) {
      const ratio = Math.round((amount / avg) * 10) / 10;
      return [
        {
          type: 'CATEGORY_SPIKE',
          message: `${transaction.type === 'EXPENSE' ? 'Expense' : 'Income'} of ₹${amount.toLocaleString('en-IN')} in ${transaction.category} is ${ratio}x the average (₹${Math.round(avg).toLocaleString('en-IN')})`,
          severity: Math.min(1.0, (amount - avg) / avg),
          metadata: {
            average: Math.round(avg * 100) / 100,
            stddev: stat.stddev ? Math.round(stat.stddev * 100) / 100 : null,
            threshold: Math.round(threshold * 100) / 100,
            ratio,
            sampleSize: stat.count,
          },
        },
      ];
    }

    return [];
  }

  /**
   * Strategy 2: Duplicate Detection
   * Flags transactions with same amount, category, and type within 5 minutes
   */
  private async detectDuplicates(
    transaction: { id: string; amount: Prisma.Decimal; type: string; category: string; createdAt: Date }
  ): Promise<AnomalyResult[]> {
    const windowMs = 5 * 60 * 1000; // 5 minutes
    const windowStart = new Date(transaction.createdAt.getTime() - windowMs);
    const windowEnd = new Date(transaction.createdAt.getTime() + windowMs);

    const duplicates = await prisma.transaction.findMany({
      where: {
        id: { not: transaction.id },
        amount: transaction.amount,
        type: transaction.type as Prisma.EnumTransactionTypeFilter['equals'],
        category: transaction.category,
        deletedAt: null,
        createdAt: { gte: windowStart, lte: windowEnd },
      },
      select: { id: true, createdAt: true },
    });

    return duplicates.map((dup: { id: string; createdAt: Date }) => {
      const diffMs = Math.abs(transaction.createdAt.getTime() - dup.createdAt.getTime());
      const diffMins = Math.round(diffMs / 60000);
      return {
        type: 'DUPLICATE' as const,
        message: `Possible duplicate: ₹${Number(transaction.amount).toLocaleString('en-IN')} in ${transaction.category}, ${diffMins} min apart from another entry`,
        severity: 0.7,
        metadata: {
          duplicateOfId: dup.id,
          timeDifferenceSeconds: Math.round(diffMs / 1000),
        },
      };
    });
  }

  /**
   * Strategy 3: Unusual Frequency Detection
   * Flags when daily transaction count in a category exceeds 3x the 30-day average
   */
  private async detectUnusualFrequency(
    transaction: { id: string; category: string; date: Date }
  ): Promise<AnomalyResult[]> {
    const today = new Date(transaction.date);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Count today's transactions in this category
    const todayCount = await prisma.transaction.count({
      where: {
        category: transaction.category,
        deletedAt: null,
        date: { gte: today, lt: tomorrow },
      },
    });

    // Get average daily count over last 30 days
    const dailyAvgResult: Array<{ avg: number }> = await prisma.$queryRaw`
      SELECT AVG(daily_count)::float as avg FROM (
        SELECT COUNT(*)::float as daily_count
        FROM transactions
        WHERE category = ${transaction.category}
          AND deleted_at IS NULL
          AND date >= ${thirtyDaysAgo}
          AND date < ${today}
        GROUP BY date
      ) daily_counts
    `;

    const dailyAvg = dailyAvgResult[0]?.avg || 0;
    const threshold = Math.max(3, dailyAvg * 3);

    if (todayCount > threshold && dailyAvg > 0) {
      return [
        {
          type: 'UNUSUAL_FREQUENCY',
          message: `${todayCount} transactions in ${transaction.category} today vs average of ${Math.round(dailyAvg * 10) / 10}/day`,
          severity: Math.min(1.0, todayCount / dailyAvg / 5),
          metadata: {
            todayCount,
            dailyAverage: Math.round(dailyAvg * 100) / 100,
            threshold: Math.round(threshold * 100) / 100,
          },
        },
      ];
    }

    return [];
  }

  async findAll(query: {
    page?: string;
    limit?: string;
    isResolved?: string;
    type?: string;
  }) {
    const { page, limit } = parsePagination(query);

    const where: Prisma.AnomalyWhereInput = {};

    if (query.isResolved !== undefined) {
      where.isResolved = query.isResolved === 'true';
    }

    if (query.type) {
      where.type = query.type as Prisma.EnumAnomalyTypeFilter['equals'];
    }

    const [anomalies, total] = await Promise.all([
      prisma.anomaly.findMany({
        where,
        include: {
          transaction: {
            select: {
              id: true,
              amount: true,
              type: true,
              category: true,
              date: true,
              notes: true,
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: getPrismaSkip(page, limit),
        take: limit,
      }),
      prisma.anomaly.count({ where }),
    ]);

    return {
      anomalies,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async resolve(id: string) {
    const anomaly = await prisma.anomaly.findUnique({ where: { id } });
    if (!anomaly) {
      throw ApiError.notFound('Anomaly not found');
    }

    const updated = await prisma.anomaly.update({
      where: { id },
      data: { isResolved: true },
    });

    return updated;
  }
}

export const anomalyService = new AnomalyService();
