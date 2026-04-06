import { useAuth } from '@/context/AuthContext';

export default function Header({ title }: { title: string }) {
  const { user } = useAuth();

  return (
    <header className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-text">{title}</h2>
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-secondary">
          Welcome, <span className="font-medium text-text">{user?.name}</span>
        </span>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user?.role === 'ADMIN'
            ? 'bg-purple-500/10 text-purple-400 dark:text-purple-300'
            : user?.role === 'ANALYST'
            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
            : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300'
        }`}>
          {user?.role}
        </span>
      </div>
    </header>
  );
}
