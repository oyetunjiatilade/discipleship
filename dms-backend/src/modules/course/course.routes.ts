import { Router } from 'express';
import { courseController } from './course.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  createLessonSchema,
  updateLessonSchema,
  lessonIdParamSchema,
  reorderLessonsSchema,
  updateCourseSchema,
  createCourseSchema,
  updateCourseByIdSchema,
} from './course.validation';

// ══════════════════════════════════════════════
//  CONVERT ROUTES — mounted at /v1/course
//  (authenticate middleware applied in app.ts)
// ══════════════════════════════════════════════

const convertRouter = Router();

/**
 * GET /v1/course
 * Get course details (Believers Class).
 */
convertRouter.get(
  '/',
  asyncHandler(courseController.getCourse.bind(courseController))
);

/**
 * GET /v1/course/lessons
 * List all published lessons sorted by order.
 */
convertRouter.get(
  '/lessons',
  asyncHandler(courseController.getPublishedLessons.bind(courseController))
);

/**
 * GET /v1/course/lessons/:lessonId
 * Get a single published lesson by ID.
 */
convertRouter.get(
  '/lessons/:lessonId',
  validate(lessonIdParamSchema),
  asyncHandler(courseController.getPublishedLesson.bind(courseController))
);

// ══════════════════════════════════════════════
//  ADMIN ROUTES — mounted at /v1/admin/lessons
//  (authenticate + authorize('admin') applied in app.ts)
// ══════════════════════════════════════════════

const adminRouter = Router();

/**
 * PATCH /v1/admin/lessons/course
 * Update course metadata (title, description).
 */
adminRouter.patch(
  '/course',
  validate(updateCourseSchema),
  asyncHandler(courseController.updateCourse.bind(courseController))
);

/**
 * GET /v1/admin/lessons
 * List all lessons (includes unpublished, excludes soft-deleted).
 */
adminRouter.get(
  '/',
  asyncHandler(courseController.adminGetLessons.bind(courseController))
);

/**
 * PATCH /v1/admin/lessons/reorder
 * Reorder lessons (must be BEFORE /:lessonId to avoid param capture).
 */
adminRouter.patch(
  '/reorder',
  validate(reorderLessonsSchema),
  asyncHandler(courseController.reorderLessons.bind(courseController))
);

/**
 * GET /v1/admin/lessons/:lessonId
 * Get a single lesson with full admin detail.
 */
adminRouter.get(
  '/:lessonId',
  validate(lessonIdParamSchema),
  asyncHandler(courseController.adminGetLesson.bind(courseController))
);

/**
 * POST /v1/admin/lessons
 * Create a new lesson.
 */
adminRouter.post(
  '/',
  validate(createLessonSchema),
  asyncHandler(courseController.createLesson.bind(courseController))
);

/**
 * PATCH /v1/admin/lessons/:lessonId
 * Update a lesson's content or metadata.
 */
adminRouter.patch(
  '/:lessonId',
  validate(updateLessonSchema),
  asyncHandler(courseController.updateLesson.bind(courseController))
);

/**
 * DELETE /v1/admin/lessons/:lessonId
 * Soft-delete a lesson.
 */
adminRouter.delete(
  '/:lessonId',
  validate(lessonIdParamSchema),
  asyncHandler(courseController.deleteLesson.bind(courseController))
);

// ══════════════════════════════════════════════
//  MULTI-COURSE ROUTES
// ══════════════════════════════════════════════

/** Convert: list active courses with progress — mounted at /v1/courses. */
const coursesConvertRouter = Router();
coursesConvertRouter.get(
  '/',
  asyncHandler(courseController.listCoursesForConvert.bind(courseController))
);

/** Admin: course management — mounted at /v1/admin/courses. */
const coursesAdminRouter = Router();
coursesAdminRouter.get(
  '/',
  asyncHandler(courseController.adminListCourses.bind(courseController))
);
coursesAdminRouter.post(
  '/',
  validate(createCourseSchema),
  asyncHandler(courseController.adminCreateCourse.bind(courseController))
);
coursesAdminRouter.patch(
  '/:courseId',
  validate(updateCourseByIdSchema),
  asyncHandler(courseController.adminUpdateCourse.bind(courseController))
);

export {
  convertRouter as courseConvertRoutes,
  adminRouter as courseAdminRoutes,
  coursesConvertRouter as coursesConvertRoutes,
  coursesAdminRouter as coursesAdminRoutes,
};
