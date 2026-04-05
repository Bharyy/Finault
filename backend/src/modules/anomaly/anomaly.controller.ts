import { Request, Response } from 'express';
import { anomalyService } from './anomaly.service';
import { sendSuccess } from '../../shared/utils/apiResponse';

export class AnomalyController {
  async findAll(req: Request, res: Response) {
    const result = await anomalyService.findAll(req.query as Record<string, string>);
    sendSuccess(res, result.anomalies, 200, result.meta);
  }

  async resolve(req: Request, res: Response) {
    const anomaly = await anomalyService.resolve(req.params.id as string);
    sendSuccess(res, anomaly);
  }
}

export const anomalyController = new AnomalyController();
