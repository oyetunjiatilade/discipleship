import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { env } from './config';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { sendSuccess, sendError } from './shared/utils/response';
import { authRoutes } from './modules/auth/auth.routes';
import { courseConvertRoutes, courseAdminRoutes, coursesConvertRoutes, coursesAdminRoutes } from './modules/course/course.routes';
import { progressConvertRoutes, progressAdminRoutes } from './modules/progress/progress.routes';
import { quizConvertRoutes, quizAdminRoutes } from './modules/quiz/quiz.routes';
import { reportAdminRoutes } from './modules/admin/report.routes';
import { notificationConvertRoutes, notificationAdminRoutes } from './modules/notification/notification.routes';
import { uploadAdminRoutes } from './modules/admin/upload.routes';
import { meRoutes } from './modules/me/me.routes';
import { adminStageRoutes } from './modules/admin/stage.routes';
import { adminConvertRoutes } from './modules/admin/convert.routes';
import { mentorAdminRoutes, mentorSelfRoutes } from './modules/mentor/mentor.routes';
import { reflectionConvertRoutes, reflectionMentorRoutes } from './modules/reflection/reflection.routes';
import { cohortAdminRoutes, cohortConvertRoutes } from './modules/cohort/cohort.routes';
import { sessionAdminRoutes, sessionConvertRoutes } from './modules/session/session.routes';
import { certificateConvertRoutes, certificateAdminRoutes } from './modules/certificate/certificate.routes';
import { branchPublicRoutes, branchAdminRoutes } from './modules/branch/branch.routes';
import { authenticate } from './middleware/authenticate';
import { authorize } from './middleware/authorize';

/**
 * Create and configure the Express application.
 *
 * Separated from server.ts so the app can be imported
 * independently for integration testing (without starting the HTTP server).
 */
function createApp(): express.Application {
  const app = express();

  // Behind nginx on the same host (127.0.0.1) in production — trust the
  // loopback proxy so req.ip / X-Forwarded-For / req.protocol are the real
  // client values (correct per-IP rate limiting, accurate logs). Trusting
  // only loopback means an external client can't spoof X-Forwarded-For.
  app.set('trust proxy', 'loopback');

  // ──────────────────────────────────────────────
  // Security middleware
  // ──────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ──────────────────────────────────────────────
  // General middleware
  // ──────────────────────────────────────────────
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  // ──────────────────────────────────────────────
  // Rate limiting
  // ──────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(generalLimiter);
  }

  // ──────────────────────────────────────────────
  // Health check (no auth, no rate limit)
  // ──────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, 200, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // ──────────────────────────────────────────────
  // API routes (v1)
  // ──────────────────────────────────────────────
  app.use('/v1/auth', authRoutes);
  app.use('/v1/branches', branchPublicRoutes);
  app.use('/v1/course', authenticate, courseConvertRoutes);
  app.use('/v1/courses', authenticate, coursesConvertRoutes);
  app.use('/v1/progress', authenticate, progressConvertRoutes);
  app.use('/v1/quizzes', authenticate, quizConvertRoutes);
  app.use('/v1/notifications', authenticate, notificationConvertRoutes);
  app.use('/v1/me', authenticate, meRoutes);
  app.use('/v1/reflections', authenticate, reflectionConvertRoutes);
  app.use('/v1/community', authenticate, cohortConvertRoutes);
  app.use('/v1/sessions', authenticate, sessionConvertRoutes);
  app.use('/v1/certificate', authenticate, certificateConvertRoutes);
  app.use('/v1/admin/lessons', authenticate, authorize('admin'), courseAdminRoutes);
  app.use('/v1/admin/courses', authenticate, authorize('admin'), coursesAdminRoutes);
  app.use('/v1/admin/progress', authenticate, authorize('admin'), progressAdminRoutes);
  app.use('/v1/admin/quizzes', authenticate, authorize('admin'), quizAdminRoutes);
  app.use('/v1/admin/reports', authenticate, authorize('admin'), reportAdminRoutes);
  app.use('/v1/admin/converts', authenticate, authorize('admin'), adminStageRoutes);
  app.use('/v1/admin/converts', authenticate, authorize('super_admin'), adminConvertRoutes);
  app.use('/v1/admin/converts', authenticate, authorize('admin'), certificateAdminRoutes);
  app.use('/v1/admin', authenticate, authorize('admin'), mentorAdminRoutes);
  app.use('/v1/admin', authenticate, authorize('admin'), cohortAdminRoutes);
  app.use('/v1/admin/sessions', authenticate, authorize('admin'), sessionAdminRoutes);
  app.use('/v1/mentor', authenticate, authorize('mentor', 'admin'), mentorSelfRoutes);
  app.use('/v1/mentor', authenticate, authorize('mentor', 'admin'), reflectionMentorRoutes);
  app.use('/v1/admin/notifications', authenticate, authorize('admin'), notificationAdminRoutes);
  app.use('/v1/admin/upload', authenticate, authorize('admin'), uploadAdminRoutes);
  app.use('/v1/admin/branches', authenticate, authorize('super_admin'), branchAdminRoutes);

  // ──────────────────────────────────────────────
  // 404 handler (after all routes)
  // ──────────────────────────────────────────────
  app.all('*', (req: Request, res: Response) => {
    sendError(res, 404, 'ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`);
  });

  // ──────────────────────────────────────────────
  // Global error handler (must be LAST)
  // ──────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}

export const app = createApp();
