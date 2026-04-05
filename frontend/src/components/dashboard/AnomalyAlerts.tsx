import { AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import type { Anomaly } from '../../api/dashboard.api';

interface Props {
  anomalies: Anomaly[];
  onResolve?: (id: string) => void;
  canResolve: boolean;
}

const severityColor = (s: number) => {
  if (s >= 0.7) return 'bg-red-50 border-red-200 text-red-800';
  if (s >= 0.4) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
  return 'bg-blue-50 border-blue-200 text-blue-800';
};

const typeLabel: Record<string, string> = {
  CATEGORY_SPIKE: 'Spike',
  DUPLICATE: 'Duplicate',
  UNUSUAL_FREQUENCY: 'Frequency',
  HIGH_AMOUNT: 'High Amount',
};

export default function AnomalyAlerts({ anomalies, onResolve, canResolve }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-gray-900">Anomaly Alerts</h3>
        {anomalies.length > 0 && (
          <span className="ml-auto bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {anomalies.length}
          </span>
        )}
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {anomalies.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">No anomalies detected</p>
        )}
        {anomalies.map((a) => (
          <div key={a.id} className={`p-3 rounded-lg border text-sm ${severityColor(a.severity)}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-white/60 mb-1">
                  {typeLabel[a.type] || a.type}
                </span>
                <p className="font-medium">{a.message}</p>
                <p className="text-xs opacity-70 mt-1">{formatDateTime(a.createdAt)}</p>
              </div>
              {canResolve && onResolve && (
                <button
                  onClick={() => onResolve(a.id)}
                  className="p-1 hover:bg-white/50 rounded transition-colors shrink-0"
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
