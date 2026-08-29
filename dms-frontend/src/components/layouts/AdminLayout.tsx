import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileBarChart2,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  HeartHandshake,
  LifeBuoy,
  GraduationCap,
  Video,
  Layers,
  Building2,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import apiClient from '@/api/client';

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/lessons', icon: BookOpen, label: 'Lessons' },
  { to: '/admin/courses', icon: Layers, label: 'Courses' },
  { to: '/admin/converts', icon: Users, label: 'Converts' },
  { to: '/admin/reports', icon: FileBarChart2, label: 'Reports' },
  { to: '/admin/care', icon: LifeBuoy, label: 'Follow-up' },
  { to: '/admin/mentors', icon: HeartHandshake, label: 'Mentors' },
  { to: '/admin/cohorts', icon: GraduationCap, label: 'Cohorts' },
  { to: '/admin/sessions', icon: Video, label: 'Sessions' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
];

const superAdminNavItems: NavItem[] = [
  { to: '/admin/branches', icon: Building2, label: 'Branches' },
  { to: '/admin/admins', icon: ShieldCheck, label: 'Admins' },
];

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isSuperAdmin } = useAuthStore();
  const navigate = useNavigate();
  const items = isSuperAdmin() ? [...navItems, ...superAdminNavItems] : navItems;

  const handleLogout = async () => {
    try {
      await apiClient.post('/v1/auth/logout');
    } catch {
      // Silent — logout locally regardless
    } finally {
      logout();
      navigate('/admin/login', { replace: true });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar Overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-800 transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 font-display text-sm font-bold text-white">
            TB
          </div>
          <div>
            <p className="font-display text-sm font-bold text-white">Team Barnabas</p>
            <p className="text-xs text-brand-300">Admin Panel</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-brand-300 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Separator className="bg-brand-700" />

        {/* Nav Links */}
        <nav className="flex-1 space-y-1 px-3 py-4 scrollbar-thin overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-700/60 text-white'
                    : 'text-brand-200 hover:bg-brand-700/40 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-accent-400' : 'text-brand-400')} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="h-4 w-4 text-brand-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="border-t border-brand-700 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-brand-400">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-brand-400 hover:bg-brand-700 hover:text-white" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-white px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1" />
          {/* Placeholder for header actions (search, notifications, etc.) */}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
