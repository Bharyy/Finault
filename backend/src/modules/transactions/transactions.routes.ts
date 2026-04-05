import { Router } from 'express';
import { transactionsController } from './transactions.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
} from './transactions.validation';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('transactions:read'),
  validate(transactionQuerySchema, 'query'),
  (req, res, next) => {
    transactionsController.findAll(req, res).catch(next);
  }
);

router.get('/:id', requirePermission('transactions:read'), (req, res, next) => {
  transactionsController.findById(req, res).catch(next);
});

router.post(
  '/',
  requirePermission('transactions:create'),
  validate(createTransactionSchema),
  (req, res, next) => {
    transactionsController.create(req, res).catch(next);
  }
);

router.patch(
  '/:id',
  requirePermission('transactions:update'),
  validate(updateTransactionSchema),
  (req, res, next) => {
    transactionsController.update(req, res).catch(next);
  }
);

router.delete('/:id', requirePermission('transactions:delete'), (req, res, next) => {
  transactionsController.remove(req, res).catch(next);
});

export default router;
