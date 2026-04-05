import { Request, Response } from 'express';
import { transactionsService } from './transactions.service';
import { sendSuccess } from '../../shared/utils/apiResponse';

export class TransactionsController {
  async findAll(req: Request, res: Response) {
    const result = await transactionsService.findAll(
      req.query as Record<string, string>,
      req.user!.userId,
      req.user!.role
    );
    sendSuccess(res, result.transactions, 200, result.meta);
  }

  async findById(req: Request, res: Response) {
    const transaction = await transactionsService.findById(
      req.params.id as string,
      req.user!.userId,
      req.user!.role
    );
    sendSuccess(res, transaction);
  }

  async create(req: Request, res: Response) {
    const transaction = await transactionsService.create(req.body, req.user!.userId);

    try {
      const { getIO } = await import('../../config/socket');
      getIO().emit('transaction:created', transaction);
    } catch {}

    sendSuccess(res, transaction, 201);
  }

  async update(req: Request, res: Response) {
    const transaction = await transactionsService.update(
      req.params.id as string,
      req.body,
      req.user!.userId
    );

    try {
      const { getIO } = await import('../../config/socket');
      getIO().emit('transaction:updated', transaction);
    } catch {}

    sendSuccess(res, transaction);
  }

  async remove(req: Request, res: Response) {
    const result = await transactionsService.softDelete(req.params.id as string);

    try {
      const { getIO } = await import('../../config/socket');
      getIO().emit('transaction:deleted', { id: req.params.id });
    } catch {}

    sendSuccess(res, result);
  }
}

export const transactionsController = new TransactionsController();
