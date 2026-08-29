import { Router } from 'express';
import { quizController } from './quiz.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  createQuizSchema,
  updateQuizSchema,
  quizIdParamSchema,
  lessonIdParamSchema,
  submitQuizSchema,
  attemptIdParamSchema,
} from './quiz.validation';

// ══════════════════════════════════════════════
//  CONVERT ROUTES — mounted at /v1/quizzes
//  (authenticate middleware applied in app.ts)
// ══════════════════════════════════════════════

const convertRouter = Router();

/**
 * GET /v1/quizzes/lesson/:lessonId
 * Get quiz for a lesson (no correct answers exposed).
 */
convertRouter.get(
  '/lesson/:lessonId',
  validate(lessonIdParamSchema),
  asyncHandler(quizController.getQuizForLesson.bind(quizController))
);

/**
 * POST /v1/quizzes/lesson/:lessonId/submit
 * Submit quiz answers. Returns graded results.
 */
convertRouter.post(
  '/lesson/:lessonId/submit',
  validate(submitQuizSchema),
  asyncHandler(quizController.submitQuiz.bind(quizController))
);

/**
 * GET /v1/quizzes/lesson/:lessonId/attempts
 * Get own attempt history for a lesson's quiz.
 */
convertRouter.get(
  '/lesson/:lessonId/attempts',
  validate(lessonIdParamSchema),
  asyncHandler(quizController.getMyAttempts.bind(quizController))
);

/**
 * GET /v1/quizzes/attempts/:attemptId
 * Get detailed results for a specific past attempt.
 */
convertRouter.get(
  '/attempts/:attemptId',
  validate(attemptIdParamSchema),
  asyncHandler(quizController.getAttemptDetail.bind(quizController))
);

// ══════════════════════════════════════════════
//  ADMIN ROUTES — mounted at /v1/admin/quizzes
//  (authenticate + authorize('admin') applied in app.ts)
// ══════════════════════════════════════════════

const adminRouter = Router();

/**
 * GET /v1/admin/quizzes
 * List all quizzes in the course.
 */
adminRouter.get(
  '/',
  asyncHandler(quizController.listQuizzesAdmin.bind(quizController))
);

/**
 * GET /v1/admin/quizzes/lesson/:lessonId
 * Get quiz for a specific lesson (includes correct answers).
 * MUST come before /:quizId to avoid param capture.
 */
adminRouter.get(
  '/lesson/:lessonId',
  validate(lessonIdParamSchema),
  asyncHandler(quizController.getQuizByLessonAdmin.bind(quizController))
);

/**
 * GET /v1/admin/quizzes/:quizId
 * Get a single quiz with correct answers.
 */
adminRouter.get(
  '/:quizId',
  validate(quizIdParamSchema),
  asyncHandler(quizController.getQuizAdmin.bind(quizController))
);

/**
 * POST /v1/admin/quizzes
 * Create a quiz for a lesson.
 */
adminRouter.post(
  '/',
  validate(createQuizSchema),
  asyncHandler(quizController.createQuiz.bind(quizController))
);

/**
 * PATCH /v1/admin/quizzes/:quizId
 * Update a quiz.
 */
adminRouter.patch(
  '/:quizId',
  validate(updateQuizSchema),
  asyncHandler(quizController.updateQuiz.bind(quizController))
);

/**
 * DELETE /v1/admin/quizzes/:quizId
 * Delete a quiz.
 */
adminRouter.delete(
  '/:quizId',
  validate(quizIdParamSchema),
  asyncHandler(quizController.deleteQuiz.bind(quizController))
);

/**
 * GET /v1/admin/quizzes/:quizId/attempts
 * Get all attempts for a quiz.
 */
adminRouter.get(
  '/:quizId/attempts',
  validate(quizIdParamSchema),
  asyncHandler(quizController.getAttemptsAdmin.bind(quizController))
);

export { convertRouter as quizConvertRoutes, adminRouter as quizAdminRoutes };
