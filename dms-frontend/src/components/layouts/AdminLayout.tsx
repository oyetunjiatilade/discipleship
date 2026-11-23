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
import slcLogo from '@/assets/slc-logo.png';

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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar Overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar: anchored left rail on desktop, drawer on mobile ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0 shadow-lg lg:shadow-none' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-5">
          <img src={slcLogo} alt="Supernatural Life Church" className="h-10 w-10 shrink-0 object-contain" />
          <div>
            <p className="font-display text-sm font-bold text-black">Team Barnabas</p>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="-mr-2 ml-auto flex h-11 w-11 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Separator className="bg-gray-200" />

        {/* Nav Links */}
        <nav className="flex-1 space-y-0.5 px-3 py-4 scrollbar-thin overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group relative flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-brand-50 font-semibold text-black'
                    : 'font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-400" aria-hidden />
                  )}
                  <item.icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      isActive ? 'text-brand-500' : 'text-gray-400 group-hover:text-gray-600'
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-400 text-xs font-bold text-black">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-gray-500">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" className="text-gray-500" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar (desktop uses the anchored rail) */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <img src={slcLogo} alt="" className="h-8 w-8 object-contain" />
          <p className="font-display text-sm font-bold text-black">Team Barnabas</p>
        </header>

        {/* Page content — 1280px max container per the guide */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
