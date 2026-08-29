import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Connect the realtime socket (idempotent). Authenticates with the JWT access
 * token and invokes `onNotification` for each pushed notification. Degrades
 * silently — the 60s polling fallback keeps the badge correct if this fails.
 */
export function connectSocket(token: string, onNotification: (payload: unknown) => void): void {
  if (socket) return;
  const base = import.meta.env.VITE_API_BASE_URL || '';
  socket = io(base || '/', {
    path: '/socket.io',
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
  });
  socket.on('notification', onNotification);
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
