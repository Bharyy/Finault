import { useAuth } from '../../context/AuthContext';

export default function Header({ title }: { title: string }) {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          Welcome, <span className="font-medium text-gray-700">{user?.name}</span>
        </span>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user?.role === 'ADMIN'
            ? 'bg-purple-100 text-purple-800'
            : user?.role === 'ANALYST'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {user?.role}
        </span>
      </div>
    </header>
  );
}
