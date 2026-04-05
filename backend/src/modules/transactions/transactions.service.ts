import { prisma } from '../../config/database';
import { ApiError } from '../../shared/utils/apiError';
import { parsePagination, buildPaginationMeta, getPrismaSkip } from '../../shared/utils/pagination';
import { CreateTransactionInput, UpdateTransactionInput } from './transactions.validation';
import { Prisma, Role } from '../../generated/prisma/client';

export class TransactionsService {
  async findAll(
    query: {
      page?: string;
      limit?: string;
      type?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: string;
    },
    userId: string,
    userRole: Role
  ) {
    const { page, limit } = parsePagination(query);

    const where: Prisma.TransactionWhereInput = {
      deletedAt: null,
    };

    if (userRole !== 'ADMIN') {
      where.userId = userId;
    }

    if (query.type) {
      where.type = query.type as Prisma.EnumTransactionTypeFilter['equals'];
    }

    if (query.category) {
      where.category = { contains: query.category, mode: 'insensitive' };
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        (where.date as Prisma.DateTimeFilter).gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (where.date as Prisma.DateTimeFilter).lte = new Date(query.endDate);
      }
    }

    if (query.search) {
      where.notes = { contains: query.search, mode: 'insensitive' };
    }

    const sortBy = query.sortBy || 'date';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: Prisma.TransactionOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          anomalies: {
            where: { isResolved: false },
            select: { id: true, type: true, message: true, severity: true },
          },
        },
        orderBy,
        skip: getPrismaSkip(page, limit),
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findById(id: string, userId: string, userRole: Role) {
    const where: Prisma.TransactionWhereInput = {
      id,
      deletedAt: null,
    };

    if (userRole !== 'ADMIN') {
      where.userId = userId;
    }

    const transaction = await prisma.transaction.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        anomalies: true,
        smsLog: true,
      },
    });

    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }

    return transaction;
  }

  async create(data: CreateTransactionInput, userId: string) {
    const transaction = await prisma.transaction.create({
      data: {
        amount: data.amount,
        type: data.type,
        category: data.category,
        date: new Date(data.date),
        notes: data.notes,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    this.runAnomalyDetection(transaction.id).catch((err) =>
      console.error('Anomaly detection failed:', err)
    );

    return transaction;
  }

  async update(id: string, data: UpdateTransactionInput, userId: string) {
    const existing = await prisma.transaction.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw ApiError.notFound('Transaction not found');
    }

    const updateData: Prisma.TransactionUpdateInput = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.notes !== undefined) updateData.notes = data.notes;

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    this.runAnomalyDetection(transaction.id).catch((err) =>
      console.error('Anomaly detection failed:', err)
    );

    return transaction;
  }

  async softDelete(id: string) {
    const existing = await prisma.transaction.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw ApiError.notFound('Transaction not found');
    }

    await prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.anomaly.updateMany({
      where: { transactionId: id },
      data: { isResolved: true },
    });

    return { message: 'Transaction deleted successfully' };
  }

  private async runAnomalyDetection(transactionId: string) {
    const { anomalyService } = await import('../anomaly/anomaly.service');
    await anomalyService.analyzeTransaction(transactionId);
  }
}

export const transactionsService = new TransactionsService();
