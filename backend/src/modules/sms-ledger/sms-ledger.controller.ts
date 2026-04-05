import { Request, Response } from 'express';
import { smsLedgerService } from './sms-ledger.service';
import { sendSuccess, sendError } from '../../shared/utils/apiResponse';
import { env } from '../../config/env';
import crypto from 'crypto';

export class SmsLedgerController {
  async webhook(req: Request, res: Response) {
    // API Key authentication for webhook
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return sendError(res, 401, 'UNAUTHORIZED', 'API key is required');
    }

    // Constant-time comparison to prevent timing attacks
    const expectedHash = crypto.createHash('sha256').update(env.SMS_API_KEY).digest('hex');
    const receivedHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(receivedHash))) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Invalid API key');
    }

    // For SMS webhook, we need a default admin user to associate transactions
    // In production, this would be tied to the API key owner
    const { prisma } = await import('../../config/database');
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (!adminUser) {
      return sendError(res, 500, 'INTERNAL_ERROR', 'No active admin user found');
    }

    const result = await smsLedgerService.processWebhook(req.body, adminUser.id);
    sendSuccess(res, result, result.transactionId ? 201 : 200);
  }

  async getLogs(req: Request, res: Response) {
    const result = await smsLedgerService.getLogs(req.query as Record<string, string>);
    sendSuccess(res, result.logs, 200, result.meta);
  }
}

export const smsLedgerController = new SmsLedgerController();
