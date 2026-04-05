import client from './client';

export interface Transaction {
  id: string;
  amount: string | number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
  notes: string | null;
  userId: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  anomalies?: Array<{ id: string; type: string; message: string; severity: number }>;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: 'INCOME' | 'EXPENSE';
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: 'date' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTransactionData {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
  notes?: string;
}

export const transactionsApi = {
  list: (filters: TransactionFilters = {}) =>
    client.get<{
      success: true;
      data: Transaction[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>('/transactions', { params: filters }),

  get: (id: string) =>
    client.get<{ success: true; data: Transaction }>(`/transactions/${id}`),

  create: (data: CreateTransactionData) =>
    client.post<{ success: true; data: Transaction }>('/transactions', data),

  update: (id: string, data: Partial<CreateTransactionData>) =>
    client.patch<{ success: true; data: Transaction }>(`/transactions/${id}`, data),

  delete: (id: string) =>
    client.delete(`/transactions/${id}`),
};
