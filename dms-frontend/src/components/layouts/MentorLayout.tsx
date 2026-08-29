import { Outlet, useNavigate } from 'react-router-dom';
import { HeartHandshake, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/api/client';

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
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-brand-800 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <HeartHandshake className="h-6 w-6 text-accent-400" />
          <div>
            <p className="font-display text-lg font-bold leading-none">My Flock</p>
            <p className="text-xs text-brand-200">{user?.firstName} {user?.lastName}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-brand-200 hover:bg-brand-700 hover:text-white" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </header>
      <main className="mx-auto max-w-3xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
