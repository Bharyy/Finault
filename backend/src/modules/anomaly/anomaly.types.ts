import { AnomalyType } from '../../generated/prisma/client';

export interface AnomalyResult {
  type: AnomalyType;
  message: string;
  severity: number;
  metadata: Record<string, unknown>;
}

export interface CategoryStats {
  avg: number;
  stddev: number | null;
  count: number;
}
