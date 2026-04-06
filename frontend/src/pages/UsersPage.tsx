import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { usersApi, type UserWithCount, type CreateUserData } from '@/api/users.api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, X, Search } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateUserData>({
    email: '', password: '', name: '', role: 'VIEWER',
  });
  const [formError, setFormError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ search: searchQuery || undefined, limit: 50 });
      setUsers(res.data.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await usersApi.create(formData);
      setShowForm(false);
      setFormData({ email: '', password: '', name: '', role: 'VIEWER' });
      fetchUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setFormError(axiosErr.response?.data?.error?.message || 'Failed to create user');
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await usersApi.update(id, { role: role as CreateUserData['role'] });
      fetchUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosErr.response?.data?.error?.message || 'Failed to update role');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await usersApi.update(id, { isActive: !currentActive });
      fetchUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosErr.response?.data?.error?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await usersApi.delete(id);
      fetchUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosErr.response?.data?.error?.message || 'Failed to delete user');
    }
  };

  return (
    <div>
      <Header title="User Management" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowForm(true)} className="ml-auto">
            <Plus className="w-4 h-4" /> Add User
          </Button>
        </div>

        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-secondary border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Role</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase">Txns</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Created</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-text-muted">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-text-muted">No users found</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-text">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="text-xs px-2 py-1 border border-border bg-surface rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-text"
                      >
                        <option value="VIEWER">VIEWER</option>
                        <option value="ANALYST">ANALYST</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(u.id, u.isActive)}
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          u.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-text-muted">{u.transactionCount}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-semibold text-text">Create User</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-surface-elevated rounded cursor-pointer">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {formError && <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">{formError}</div>}
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <p className="text-xs text-text-muted">Min 8 chars, uppercase, number, special char</p>
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as CreateUserData['role'] })}
                  className="h-10 px-3 border border-border bg-surface rounded-lg text-sm text-text focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
