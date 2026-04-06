import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import SummaryCards from '@/components/dashboard/SummaryCards';
import TrendChart from '@/components/dashboard/TrendChart';
import CategoryPie from '@/components/dashboard/CategoryPie';
import RecentActivity from '@/components/dashboard/RecentActivity';
import AnomalyAlerts from '@/components/dashboard/AnomalyAlerts';
import { dashboardApi, type DashboardSummary, type CategoryTotal, type TrendPoint, type Anomaly } from '@/api/dashboard.api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import client from '@/api/client';

export default function DashboardPage() {
  const { isAnalyst, isAdmin } = useAuth();
  const socket = useSocket();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; amount: string | number; type: string; category: string; date: string; notes: string | null; user?: { id: string; name: string } }>>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const promises = [
        dashboardApi.summary(),
        dashboardApi.categoryTotals(),
        dashboardApi.recentActivity(),
      ];

      if (isAnalyst) {
        promises.push(dashboardApi.trends() as ReturnType<typeof dashboardApi.summary>);
        promises.push(dashboardApi.anomalies({ isResolved: 'false', limit: 20 }) as ReturnType<typeof dashboardApi.summary>);
      }

      const results = await Promise.all(promises);

      setSummary(results[0].data.data as unknown as DashboardSummary);
      setCategories((results[1].data.data as unknown as { categories: CategoryTotal[] }).categories);
      setRecentActivity(results[2].data.data as typeof recentActivity);

      if (isAnalyst && results[3]) {
        setTrends((results[3].data.data as unknown as { trends: TrendPoint[] }).trends);
      }
      if (isAnalyst && results[4]) {
        setAnomalies(results[4].data.data as unknown as Anomaly[]);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAnalyst]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleTransaction = () => {
      fetchData();
    };

    const handleAnomaly = (data: { transactionId: string; anomalies: Array<{ type: string; message: string; severity: number }> }) => {
      fetchData();
    };

    socket.on('transaction:created', handleTransaction);
    socket.on('transaction:updated', handleTransaction);
    socket.on('transaction:deleted', handleTransaction);
    socket.on('anomaly:detected', handleAnomaly);

    return () => {
      socket.off('transaction:created', handleTransaction);
      socket.off('transaction:updated', handleTransaction);
      socket.off('transaction:deleted', handleTransaction);
      socket.off('anomaly:detected', handleAnomaly);
    };
  }, [socket, fetchData]);

  const handleResolveAnomaly = async (id: string) => {
    try {
      await client.patch(`/anomalies/${id}/resolve`);
      setAnomalies((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to resolve anomaly:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {summary && (
          <SummaryCards
            totalIncome={summary.totalIncome}
            totalExpenses={summary.totalExpenses}
            netBalance={summary.netBalance}
            totalTransactions={summary.totalTransactions}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isAnalyst && trends.length > 0 && <TrendChart data={trends} />}
          {categories.length > 0 && <CategoryPie data={categories} />}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity data={recentActivity} />
          {isAnalyst && (
            <AnomalyAlerts
              anomalies={anomalies}
              onResolve={handleResolveAnomaly}
              canResolve={isAdmin}
            />
          )}
        </div>
      </div>
    </div>
  );
}
