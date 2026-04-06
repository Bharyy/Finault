import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { transactionsApi, type Transaction, type CreateTransactionData } from '@/api/transactions.api';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  'Food & Dining', 'Transport', 'Shopping', 'Utilities', 'Groceries',
  'Salary', 'Freelance', 'Entertainment', 'Healthcare', 'Subscriptions',
  'Travel', 'Office Supplies', 'Investment', 'Rent & Housing', 'Insurance',
  'Education', 'Gifts & Donations', 'Other',
];

export default function TransactionsPage() {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<'' | 'INCOME' | 'EXPENSE'>('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<CreateTransactionData>({
    amount: 0, type: 'EXPENSE', category: CATEGORIES[0], date: new Date().toISOString().split('T')[0],
  });
  const [formError, setFormError] = useState('');

  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 15 };
      if (filterType) params.type = filterType;
      if (filterCategory) params.category = filterCategory;
      if (searchQuery) params.search = searchQuery;
      params.sortBy = 'date';
      params.sortOrder = 'desc';

      const res = await transactionsApi.list(params as Parameters<typeof transactionsApi.list>[0]);
      setTransactions(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterCategory, searchQuery]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      if (editId) {
        await transactionsApi.update(editId, formData);
      } else {
        await transactionsApi.create(formData);
      }
      setShowForm(false);
      setEditId(null);
      fetchTransactions(meta.page);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(axiosErr.response?.data?.error?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await transactionsApi.delete(id);
      fetchTransactions(meta.page);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const openEdit = (t: Transaction) => {
    setFormData({
      amount: Number(t.amount),
      type: t.type,
      category: t.category,
      date: new Date(t.date).toISOString().split('T')[0],
      notes: t.notes || undefined,
    });
    setEditId(t.id);
    setShowForm(true);
  };

  const openCreate = () => {
    setFormData({
      amount: 0, type: 'EXPENSE', category: CATEGORIES[0],
      date: new Date().toISOString().split('T')[0],
    });
    setEditId(null);
    setShowForm(true);
  };

  return (
    <div>
      <Header title="Transactions" />
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="px-3 py-2 border border-border bg-surface rounded-lg text-sm text-text focus:ring-2 focus:ring-primary/50 outline-none transition-colors"
          >
            <option value="">All Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-border bg-surface rounded-lg text-sm text-text focus:ring-2 focus:ring-primary/50 outline-none transition-colors"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {isAdmin && (
            <Button onClick={openCreate} className="ml-auto">
              <Plus className="w-4 h-4" /> Add Transaction
            </Button>
          )}
        </div>

        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-secondary border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Category</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Notes</th>
                  {isAdmin && <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-text-muted">Loading...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-text-muted">No transactions found</td></tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text">{formatDate(t.date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{t.category}</td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right ${
                        t.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted max-w-[200px] truncate">{t.notes || '-'}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(t)} className="p-1.5 text-text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors cursor-pointer">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(t.id)} className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-secondary">
              <span className="text-sm text-text-muted">
                Showing {(meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={() => fetchTransactions(meta.page - 1)} disabled={meta.page <= 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => fetchTransactions(meta.page + 1)} disabled={meta.page >= meta.totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-semibold text-text">{editId ? 'Edit Transaction' : 'New Transaction'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-surface-elevated rounded cursor-pointer">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'INCOME' | 'EXPENSE' })}
                    className="h-10 px-3 border border-border bg-surface rounded-lg text-sm text-text focus:ring-2 focus:ring-primary/50 outline-none"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="h-10 px-3 border border-border bg-surface rounded-lg text-sm text-text focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Notes (optional)</Label>
                <Input
                  type="text"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value || undefined })}
                  maxLength={500}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
