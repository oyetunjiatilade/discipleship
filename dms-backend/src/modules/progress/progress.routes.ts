import { Router } from 'express';
import { progressController } from './progress.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  lessonIdParamSchema,
  convertIdParamSchema,
} from './progress.validation';

// ══════════════════════════════════════════════
//  CONVERT ROUTES — mounted at /v1/progress
//  (authenticate middleware applied in app.ts)
// ══════════════════════════════════════════════

const convertRouter = Router();

/**
 * GET /v1/progress/summary
 * Get own overall course progress (percentage, breakdown).
 */
convertRouter.get(
  '/summary',
  asyncHandler(progressController.getOwnSummary.bind(progressController))
);

/**
 * GET /v1/progress/lessons
 * Get own per-lesson progress (sorted by lesson order).
 */
convertRouter.get(
  '/lessons',
  asyncHandler(progressController.getOwnLessonProgress.bind(progressController))
);

/**
 * POST /v1/progress/lessons/:lessonId/start
 * Mark a lesson as started.
 * Side effect: first lesson triggers IN_CLASS stage transition.
 */
convertRouter.post(
  '/lessons/:lessonId/start',
  validate(lessonIdParamSchema),
  asyncHandler(progressController.startLesson.bind(progressController))
);

/**
 * POST /v1/progress/lessons/:lessonId/complete
 * Mark a lesson as completed.
 * Side effect: last lesson triggers CLASS_COMPLETED stage transition.
 */
convertRouter.post(
  '/lessons/:lessonId/complete',
  validate(lessonIdParamSchema),
  asyncHandler(progressController.completeLesson.bind(progressController))
);

// ══════════════════════════════════════════════
//  ADMIN ROUTES — mounted at /v1/admin/progress
//  (authenticate + authorize('admin') applied in app.ts)
// ══════════════════════════════════════════════

const adminRouter = Router();

/**
 * GET /v1/admin/progress/:convertId/summary
 * View any convert's overall course progress.
 */
adminRouter.get(
  '/:convertId/summary',
  validate(convertIdParamSchema),
  asyncHandler(progressController.getConvertSummary.bind(progressController))
);

/**
 * GET /v1/admin/progress/:convertId/lessons
 * View any convert's per-lesson progress breakdown.
 */
adminRouter.get(
  '/:convertId/lessons',
  validate(convertIdParamSchema),
  asyncHandler(progressController.getConvertLessonProgress.bind(progressController))
);

export { convertRouter as progressConvertRoutes, adminRouter as progressAdminRoutes };
