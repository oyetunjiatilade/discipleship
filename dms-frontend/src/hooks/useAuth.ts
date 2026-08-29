import { useAuthStore } from '@/stores/authStore';

/**
 * Convenience hook for accessing auth state in components.
 * Prefer this over importing useAuthStore directly in pages.
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    accessToken,
    refreshToken,
    setAuth,
    setTokens,
    logout,
    getRole,
    isAdmin,
    isConvert,
  } = useAuthStore();

  return {
    user,
    isAuthenticated,
    accessToken,
    refreshToken,
    setAuth,
    setTokens,
    logout,
    role: getRole(),
    isAdmin: isAdmin(),
    isConvert: isConvert(),
  };
}
