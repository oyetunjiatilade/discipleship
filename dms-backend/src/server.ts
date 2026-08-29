import { app } from './app';
import { env, connectDatabase, disconnectDatabase, registerConnectionEvents } from './config';
import { startScheduler } from './jobs/scheduler';
import http from 'http';
import { initSocket } from './realtime/socket';

/**
 * Server bootstrap.
 *
 * Responsibilities:
 * 1. Connect to MongoDB
 * 2. Start HTTP server
 * 3. Handle graceful shutdown (SIGTERM, SIGINT)
 * 4. Handle uncaught exceptions and unhandled rejections
 */
async function bootstrap(): Promise<void> {
  // ──────────────────────────────────────────────
  // Register MongoDB event listeners
  // ──────────────────────────────────────────────
  registerConnectionEvents();

  // ──────────────────────────────────────────────
  // Connect to database
  // ──────────────────────────────────────────────
  await connectDatabase();

  // ──────────────────────────────────────────────
  // Start scheduled background jobs (re-engagement nudges)
  // ──────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    startScheduler();
  }

  // ──────────────────────────────────────────────
  // Start HTTP server
  // ──────────────────────────────────────────────
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  const server = httpServer.listen(env.PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║    DMS API Server                            ║
║    Environment: ${env.NODE_ENV.padEnd(28)}║
║    Port:        ${String(env.PORT).padEnd(28)}║
║    Health:      ${(env.API_BASE_URL + '/health').padEnd(28)}║
╚══════════════════════════════════════════════╝
    `);
  });

  // ──────────────────────────────────────────────
  // Graceful shutdown handler
  // ──────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      console.log('🔒 HTTP server closed');

      // Disconnect from database
      await disconnectDatabase();

      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown if graceful takes too long (10s)
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ──────────────────────────────────────────────
  // Global safety nets
  // ──────────────────────────────────────────────
  process.on('uncaughtException', (error: Error) => {
    console.error('💥 Uncaught Exception:', error);
    // Uncaught exceptions leave the process in an undefined state — exit
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('💥 Unhandled Rejection:', reason);
    // In production, unhandled rejections should also exit
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
}

bootstrap().catch((error) => {
  console.error('💀 Failed to bootstrap server:', error);
  process.exit(1);
});
