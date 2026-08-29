import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { Role } from '@/constants/enums';

interface RouteGuardProps {
  /** If set, only these role(s) can access the child routes. */
  allowedRole?: Role | Role[];
}

function homePathFor(role: Role): string {
  if (role === 'admin' || role === 'super_admin') return '/admin';
  if (role === 'mentor') return '/mentor/flock';
  return '/dashboard';
}

/**
 * RouteGuard wraps protected routes:
 *
 * 1. Not authenticated → redirect to login
 * 2. Authenticated but wrong role → redirect to that role's dashboard
 * 3. Authenticated + correct role → render <Outlet />
 */
export function RouteGuard({ allowedRole }: RouteGuardProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  const allowedRoles = allowedRole ? (Array.isArray(allowedRole) ? allowedRole : [allowedRole]) : null;

  // ── Not logged in → redirect to appropriate login ──
  if (!isAuthenticated || !user) {
    const primaryRole = allowedRoles?.[0];
    const loginPath =
      primaryRole === 'admin' || primaryRole === 'super_admin'
        ? '/admin/login'
        : primaryRole === 'mentor'
          ? '/mentor/login'
          : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // ── Wrong role → redirect to that role's home ──
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }

  return <Outlet />;
}
