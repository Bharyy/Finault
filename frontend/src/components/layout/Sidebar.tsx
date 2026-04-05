import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, Users, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minRole: 'VIEWER' },
  { to: '/transactions', label: 'Transactions', icon: ArrowRightLeft, minRole: 'VIEWER' },
  { to: '/users', label: 'Users', icon: Users, minRole: 'ADMIN' },
];

const roleOrder = { VIEWER: 1, ANALYST: 2, ADMIN: 3 };

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary-light" />
          Finault
        </h1>
        <p className="text-xs text-gray-400 mt-1">Finance Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems
          .filter((item) => roleOrder[user?.role || 'VIEWER'] >= roleOrder[item.minRole as keyof typeof roleOrder])
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
