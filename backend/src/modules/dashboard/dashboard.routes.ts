import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/summary', requirePermission('dashboard:read'), (req, res, next) => {
  dashboardController.getSummary(req, res).catch(next);
});

router.get('/category-totals', requirePermission('dashboard:read'), (req, res, next) => {
  dashboardController.getCategoryTotals(req, res).catch(next);
});

router.get('/trends', requirePermission('dashboard:trends'), (req, res, next) => {
  dashboardController.getTrends(req, res).catch(next);
});

router.get('/recent-activity', requirePermission('dashboard:read'), (req, res, next) => {
  dashboardController.getRecentActivity(req, res).catch(next);
});

export default router;
