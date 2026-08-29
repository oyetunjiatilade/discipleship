import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserPublicProfile, TokenPair } from '@/types/auth';
import type { Role } from '@/constants/enums';

// ──────────────────────────────────────────────
// Storage keys
// ──────────────────────────────────────────────
const STORAGE_KEY = 'dms-auth';

// ──────────────────────────────────────────────
// Store interface
// ──────────────────────────────────────────────
interface AuthState {
  user: UserPublicProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  justRegistered: boolean;

  // Actions
  setAuth: (user: UserPublicProfile, tokens: TokenPair) => void;
  setUser: (user: UserPublicProfile) => void;
  setJustRegistered: (v: boolean) => void;
  setTokens: (tokens: { accessToken: string; refreshToken?: string; expiresIn?: string }) => void;
  logout: () => void;

  // Derived helpers
  getRole: () => Role | null;
  isAdmin: () => boolean;
  isConvert: () => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      justRegistered: false,

      setAuth: (user, tokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
          isAuthenticated: true,
        }),

      setUser: (user) => set({ user }),

      setJustRegistered: (v) => set({ justRegistered: v }),

      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      getRole: () => get().user?.role ?? null,
      isAdmin: () => get().user?.role === 'admin',
      isConvert: () => get().user?.role === 'convert',
      isSuperAdmin: () => get().user?.role === 'super_admin',
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Do NOT persist tokens. The refresh token lives in an httpOnly cookie;
        // the short-lived access token is re-minted from it on load via the
        // 401 refresh interceptor. This removes the XSS token-theft surface.
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
