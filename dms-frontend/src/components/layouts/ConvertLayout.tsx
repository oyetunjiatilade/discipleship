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
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          {/* Brand */}
          <img src={slcLogo} alt="Supernatural Life Church" className="h-8 w-8 shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-black">
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
            className="relative flex h-11 w-11 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-critical px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Logout */}
          <Button variant="ghost" size="icon" className="text-gray-500" onClick={handleLogout} aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4 pb-20">
        <Outlet />
      </main>

      {/* ── Bottom Navigation (mobile-first) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white safe-area-pb md:static md:mx-auto md:max-w-2xl md:border-t-0">
        <div className="mx-auto flex max-w-2xl items-center justify-around py-1">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-[11px] font-semibold tracking-[0.02em] transition-colors',
                  isActive ? 'text-brand-500' : 'text-gray-500 hover:text-gray-900'
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
                      <span className="absolute -right-2 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-critical px-0.5 text-[9px] font-bold leading-none text-white">
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
