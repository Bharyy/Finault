import client from './client';

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  incomeCount: number;
  expenseCount: number;
  totalTransactions: number;
  dateRange: { start: string; end: string };
}

export interface CategoryTotal {
  category: string;
  income: number;
  expense: number;
  net: number;
  count: number;
}

export interface TrendPoint {
  period: string;
  income: number;
  expense: number;
  net: number;
}

export interface Anomaly {
  id: string;
  transactionId: string;
  type: string;
  message: string;
  severity: number;
  isResolved: boolean;
  createdAt: string;
  transaction?: {
    id: string;
    amount: string | number;
    type: string;
    category: string;
    date: string;
    user?: { id: string; name: string };
  };
}

export const dashboardApi = {
  summary: (startDate?: string, endDate?: string) =>
    client.get<{ success: true; data: DashboardSummary }>('/dashboard/summary', {
      params: { startDate, endDate },
    }),

  categoryTotals: (startDate?: string, endDate?: string) =>
    client.get<{ success: true; data: { categories: CategoryTotal[] } }>('/dashboard/category-totals', {
      params: { startDate, endDate },
    }),

  trends: (startDate?: string, endDate?: string, granularity?: 'weekly' | 'monthly') =>
    client.get<{ success: true; data: { trends: TrendPoint[] } }>('/dashboard/trends', {
      params: { startDate, endDate, granularity },
    }),

  recentActivity: (limit = 10) =>
    client.get<{ success: true; data: Array<{ id: string; amount: string | number; type: string; category: string; date: string; notes: string | null; user?: { id: string; name: string } }> }>(
      '/dashboard/recent-activity',
      { params: { limit } }
    ),

  anomalies: (params?: { isResolved?: string; type?: string; page?: number; limit?: number }) =>
    client.get<{
      success: true;
      data: Anomaly[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>('/anomalies', { params }),
};
