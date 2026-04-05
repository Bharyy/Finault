import { Router } from 'express';
import { anomalyController } from './anomaly.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('anomalies:read'), (req, res, next) => {
  anomalyController.findAll(req, res).catch(next);
});

router.patch('/:id/resolve', requirePermission('anomalies:resolve'), (req, res, next) => {
  anomalyController.resolve(req, res).catch(next);
});

export default router;
