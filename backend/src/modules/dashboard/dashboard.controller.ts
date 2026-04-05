import { Request, Response } from 'express';
import { dashboardService } from './dashboard.service';
import { sendSuccess } from '../../shared/utils/apiResponse';

export class DashboardController {
  async getSummary(req: Request, res: Response) {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const summary = await dashboardService.getSummary(
      { userId: req.user!.userId, role: req.user!.role },
      startDate, endDate
    );
    sendSuccess(res, summary);
  }

  async getCategoryTotals(req: Request, res: Response) {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const data = await dashboardService.getCategoryTotals(
      { userId: req.user!.userId, role: req.user!.role },
      startDate, endDate
    );
    sendSuccess(res, data);
  }

  async getTrends(req: Request, res: Response) {
    const { startDate, endDate, granularity } = req.query as {
      startDate?: string;
      endDate?: string;
      granularity?: 'weekly' | 'monthly';
    };
    const data = await dashboardService.getTrends(
      { userId: req.user!.userId, role: req.user!.role },
      startDate, endDate, granularity
    );
    sendSuccess(res, data);
  }

  async getRecentActivity(req: Request, res: Response) {
    const limit = parseInt(req.query.limit as string) || 10;
    const transactions = await dashboardService.getRecentActivity(
      { userId: req.user!.userId, role: req.user!.role },
      Math.min(limit, 50)
    );
    sendSuccess(res, transactions);
  }
}

export const dashboardController = new DashboardController();
