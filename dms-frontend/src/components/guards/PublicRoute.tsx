import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

/**
 * Wraps public-only routes (login pages).
 * If user is already authenticated, redirect to their role's home.
 */
export function PublicRoute() {
  const { isAuthenticated, user, justRegistered } = useAuthStore();

  if (isAuthenticated && user) {
    const homePath =
      user.role === 'admin'
        ? '/admin'
        : user.role === 'mentor'
          ? '/mentor/flock'
          : justRegistered
            ? '/welcome'
            : '/dashboard';
    return <Navigate to={homePath} replace />;
  }

  return <Outlet />;
}
