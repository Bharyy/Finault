import { AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { Anomaly } from '@/api/dashboard.api';

interface Props {
  anomalies: Anomaly[];
  onResolve?: (id: string) => void;
  canResolve: boolean;
}

const severityColor = (s: number) => {
  if (s >= 0.7) return 'bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400';
  if (s >= 0.4) return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400';
  return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
};

const typeLabel: Record<string, string> = {
  CATEGORY_SPIKE: 'Spike',
  DUPLICATE: 'Duplicate',
  UNUSUAL_FREQUENCY: 'Frequency',
  HIGH_AMOUNT: 'High Amount',
};

export default function AnomalyAlerts({ anomalies, onResolve, canResolve }: Props) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-text">Anomaly Alerts</h3>
        {anomalies.length > 0 && (
          <span className="ml-auto bg-red-500/10 text-red-500 text-xs font-medium px-2 py-0.5 rounded-full">
            {anomalies.length}
          </span>
        )}
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {anomalies.length === 0 && (
          <p className="text-sm text-text-muted text-center py-4">No anomalies detected</p>
        )}
        {anomalies.map((a) => (
          <div key={a.id} className={`p-3 rounded-lg border text-sm ${severityColor(a.severity)}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-surface/60 mb-1">
                  {typeLabel[a.type] || a.type}
                </span>
                <p className="font-medium">{a.message}</p>
                <p className="text-xs opacity-70 mt-1">{formatDateTime(a.createdAt)}</p>
              </div>
              {canResolve && onResolve && (
                <button
                  onClick={() => onResolve(a.id)}
                  className="p-1 hover:bg-surface/50 rounded transition-colors shrink-0 cursor-pointer"
                  title="Resolve"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
