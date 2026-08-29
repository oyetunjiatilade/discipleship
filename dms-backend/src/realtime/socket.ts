import { Server as IOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { authConfig, env } from '../config';
import { AuthPayload } from '../shared/types/express.d';

let io: IOServer | null = null;

/**
 * Initialise the realtime layer. Authenticates each socket via the JWT access
 * token and joins it to a per-user room so we can push notifications instantly.
 */
export function initSocket(httpServer: HttpServer): void {
  io = new IOServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth && (socket.handshake.auth as { token?: string }).token) ||
        (socket.handshake.query?.token as string | undefined);
      if (!token) return next(new Error('unauthorized'));
      const decoded = jwt.verify(token, authConfig.jwt.accessSecret) as AuthPayload;
      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (userId) socket.join(`user:${userId}`);
  });

  console.log('🔌 Realtime (socket.io) initialised.');
}

/** Emit an event to a specific user's room. No-op if realtime isn't running. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return;
  try {
    io.to(`user:${userId}`).emit(event, payload);
  } catch (err) {
    console.error('[Realtime] emit failed:', err);
  }
}
