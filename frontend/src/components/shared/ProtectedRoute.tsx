import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const roleOrder = { VIEWER: 1, ANALYST: 2, ADMIN: 3 };

export default function ProtectedRoute({
  children,
  minRole = 'VIEWER',
}: {
  children: React.ReactNode;
  minRole?: 'VIEWER' | 'ANALYST' | 'ADMIN';
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roleOrder[user.role] < roleOrder[minRole]) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
