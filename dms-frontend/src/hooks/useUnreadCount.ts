import { useState, useEffect, useCallback, useRef } from 'react';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { notificationApi } from '@/api/notificationApi';
import { useAuthStore } from '@/stores/authStore';

/**
 * Hook for notification bell badge.
 * Fetches unread count on mount and polls every `intervalMs`.
 * Returns 0 when not authenticated.
 */
export function useUnreadCount(intervalMs = 60_000) {
  const [count, setCount] = useState(0);
  const { isAuthenticated } = useAuthStore();
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!isAuthenticated) {
      setCount(0);
      return;
    }
    try {
      const n = await notificationApi.getUnreadCount();
      if (mountedRef.current) setCount(n);
    } catch {
      // Silent — badge is non-critical
    }
  }, [isAuthenticated]);

  const fetchRef = useRef(fetch);
  fetchRef.current = fetch;

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    const id = setInterval(fetch, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetch, intervalMs]);

  // Realtime: refetch instantly when a notification is pushed.
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    connectSocket(token, () => fetchRef.current());
    return () => disconnectSocket();
  }, [isAuthenticated]);

  return count;
}
