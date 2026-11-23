import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/api/client';
import slcLogo from '@/assets/slc-logo.png';

export function MentorLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.post('/v1/auth/logout');
    } catch {
      // silent
    } finally {
      logout();
      navigate('/mentor/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={slcLogo} alt="Supernatural Life Church" className="h-10 w-10 shrink-0 object-contain" />
            <div>
              <p className="font-display text-lg font-bold leading-none text-black">My Flock</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-gray-500" onClick={handleLogout} aria-label="Log out">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
