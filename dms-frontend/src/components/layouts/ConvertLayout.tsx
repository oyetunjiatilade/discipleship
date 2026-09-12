import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Bell,
  User,
  LogOut,
  MessageSquare,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { STAGE_LABELS, type DiscipleshipStage } from '@/constants/enums';
import apiClient from '@/api/client';
import slcLogo from '@/assets/slc-logo.png';

const bottomNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/lessons', icon: BookOpen, label: 'Lessons' },
  { to: '/community', icon: MessageSquare, label: 'Group' },
  { to: '/sessions', icon: Video, label: 'Live' },
  { to: '/notifications', icon: Bell, label: 'Alerts' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function ConvertLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount(60_000);

  const handleLogout = async () => {
    try {
      await apiClient.post('/v1/auth/logout');
    } catch {
      // Silent
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const stageLabel = user?.currentStage
    ? STAGE_LABELS[user.currentStage as DiscipleshipStage]
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30 border-b bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          {/* Brand */}
          <img src={slcLogo} alt="Supernatural Life Church" className="h-8 w-8 shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-brand-800">
              Hi, {user?.firstName || 'there'}!
            </p>
            {stageLabel && (
              <Badge variant="info" className="mt-0.5 text-[10px]">
                {stageLabel}
              </Badge>
            )}
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Logout */}
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4 pb-20">
        <Outlet />
      </main>

      {/* ── Bottom Navigation (mobile-first) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white safe-area-pb md:static md:mx-auto md:max-w-2xl md:border-t-0">
        <div className="mx-auto flex max-w-2xl items-center justify-around py-1">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon
                      className={cn('h-5 w-5', isActive && 'text-brand-500')}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {item.label === 'Alerts' && unreadCount > 0 && (
                      <span className="absolute -right-2 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
