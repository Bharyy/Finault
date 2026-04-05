import { prisma } from '../../config/database';
import { parseSms } from './sms-ledger.parser';
import { SmsWebhookInput } from './sms-ledger.validation';
import { anomalyService } from '../anomaly/anomaly.service';
import { parsePagination, buildPaginationMeta, getPrismaSkip } from '../../shared/utils/pagination';
import { Prisma } from '../../generated/prisma/client';

export class SmsLedgerService {
  async processWebhook(data: SmsWebhookInput, userId: string) {
    const parseResult = parseSms(data.message);

    const smsLog = await prisma.smsLog.create({
      data: {
        rawMessage: data.message,
        sender: data.sender || null,
        parseStatus: parseResult.status,
        parsedData: parseResult.data as unknown as Prisma.InputJsonValue,
        errorReason: parseResult.errorReason,
      },
    });

    if (parseResult.data.amount && parseResult.data.type) {
      const transaction = await prisma.transaction.create({
        data: {
          amount: parseResult.data.amount,
          type: parseResult.data.type,
          category: parseResult.data.category,
          date: parseResult.data.date || new Date(),
          notes: parseResult.data.merchant
            ? `SMS Auto: ${parseResult.data.merchant}`
            : 'SMS Auto: Unknown merchant',
          userId,
          smsLogId: smsLog.id,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      const anomalies = await anomalyService.analyzeTransaction(transaction.id).catch((err) => {
        console.error('Anomaly detection failed for SMS transaction:', err);
        return [];
      });

      try {
        const { getIO } = await import('../../config/socket');
        const io = getIO();
        io.emit('transaction:created', transaction);
        io.emit('sms:processed', {
          smsLogId: smsLog.id,
          status: parseResult.status,
          transactionId: transaction.id,
        });
      } catch {}

      return {
        status: parseResult.status,
        smsLogId: smsLog.id,
        transactionId: transaction.id,
        transaction,
        anomalies,
        parsedData: parseResult.data,
      };
    }

    return {
      status: parseResult.status,
      smsLogId: smsLog.id,
      transactionId: null,
      transaction: null,
      anomalies: [],
      parsedData: parseResult.data,
      errorReason: parseResult.errorReason,
    };
  }

  async getLogs(query: { page?: string; limit?: string; status?: string }) {
    const { page, limit } = parsePagination(query);

    const where: Prisma.SmsLogWhereInput = {};
    if (query.status) {
      where.parseStatus = query.status as Prisma.EnumSmsParseStatusFilter['equals'];
    }

    const [logs, total] = await Promise.all([
      prisma.smsLog.findMany({
        where,
        include: {
          transaction: {
            select: { id: true, amount: true, type: true, category: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: getPrismaSkip(page, limit),
        take: limit,
      }),
      prisma.smsLog.count({ where }),
    ]);

    return {
      logs,
      meta: buildPaginationMeta(page, limit, total),
    };
  }
}

export const smsLedgerService = new SmsLedgerService();
