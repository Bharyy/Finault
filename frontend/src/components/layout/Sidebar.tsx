import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, Users, Shield, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minRole: 'VIEWER' },
  { to: '/transactions', label: 'Transactions', icon: ArrowRightLeft, minRole: 'VIEWER' },
  { to: '/users', label: 'Users', icon: Users, minRole: 'ADMIN' },
];

const roleOrder = { VIEWER: 1, ANALYST: 2, ADMIN: 3 };

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-sidebar text-white flex flex-col min-h-screen border-r border-sidebar-border">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary-light" />
          Finault
        </h1>
        <p className="text-xs text-text-muted mt-1">Finance Dashboard</p>
      </div>

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
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-zinc-500">{user?.role}</p>
          </div>
          <div className="flex items-center gap-1">
            <AnimatedThemeToggler />
            <button
              onClick={logout}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
