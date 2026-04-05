import { Router } from 'express';
import { smsLedgerController } from './sms-ledger.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { smsWebhookLimiter } from '../../middleware/rateLimiter';
import { smsWebhookSchema } from './sms-ledger.validation';

const router = Router();

// Webhook — API key auth (not JWT), rate limited
router.post(
  '/webhook',
  smsWebhookLimiter,
  validate(smsWebhookSchema),
  (req, res, next) => {
    smsLedgerController.webhook(req, res).catch(next);
  }
);

// Logs — Admin only
router.get('/logs', authenticate, requirePermission('sms-ledger:read'), (req, res, next) => {
  smsLedgerController.getLogs(req, res).catch(next);
});

export default router;
