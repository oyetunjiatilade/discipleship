import { Request, Response } from 'express';
import { courseService } from './course.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response';
import { progressService } from '../progress/progress.service';

/**
 * Course controller.
 *
 * Handles two audiences through separate methods:
 * - Admin: full CRUD on lessons, course metadata updates
 * - Convert: read-only access to published course + lessons
 *
 * Every method is a thin HTTP adapter — no business logic here.
 */
class CourseController {
  // ════════════════════════════════════════════
  //  COURSE (shared)
  // ════════════════════════════════════════════

  /**
   * GET /v1/course
   * Get course details. Works for both converts and admins.
   */
  async getCourse(_req: Request, res: Response): Promise<void> {
    const course = await courseService.getOrCreateCourse();
    sendSuccess(res, 200, course);
  }

  /**
   * PATCH /v1/admin/lessons/course
   * Update course metadata (admin only).
   */
  async updateCourse(req: Request, res: Response): Promise<void> {
    const { title, description } = req.body;
    const course = await courseService.updateCourse({ title, description });
    sendSuccess(res, 200, course);
  }

  // ════════════════════════════════════════════
  //  LESSONS — Admin CRUD
  // ════════════════════════════════════════════

  /**
   * GET /v1/admin/lessons
   * List all lessons (includes unpublished, excludes soft-deleted).
   */
  async adminGetLessons(req: Request, res: Response): Promise<void> {
    const courseId = (req.query.courseId as string) || undefined;
    const lessons = await courseService.getAdminLessons(courseId);
    sendSuccess(res, 200, lessons);
  }

  /**
   * GET /v1/admin/lessons/:lessonId
   * Get a single lesson with full admin detail.
   */
  async adminGetLesson(req: Request, res: Response): Promise<void> {
    const { lessonId } = req.params;
    const lesson = await courseService.getAdminLessonById(lessonId);
    sendSuccess(res, 200, lesson);
  }

  /**
   * POST /v1/admin/lessons
   * Create a new lesson.
   */
  async createLesson(req: Request, res: Response): Promise<void> {
    const lesson = await courseService.createLesson(req.body);
    sendCreated(res, lesson);
  }

  /**
   * PATCH /v1/admin/lessons/:lessonId
   * Update a lesson's content or metadata.
   */
  async updateLesson(req: Request, res: Response): Promise<void> {
    const { lessonId } = req.params;
    const lesson = await courseService.updateLesson(lessonId, req.body);
    sendSuccess(res, 200, lesson);
  }

  /**
   * DELETE /v1/admin/lessons/:lessonId
   * Soft-delete a lesson.
   */
  async deleteLesson(req: Request, res: Response): Promise<void> {
    const { lessonId } = req.params;
    await courseService.deleteLesson(lessonId);
    sendNoContent(res);
  }

  /**
   * PATCH /v1/admin/lessons/reorder
   * Reorder lessons by providing lessonId → new sortOrder mappings.
   */
  async reorderLessons(req: Request, res: Response): Promise<void> {
    const { lessons, courseId } = req.body;
    const result = await courseService.reorderLessons(lessons, courseId);
    sendSuccess(res, 200, result);
  }

  // ════════════════════════════════════════════
  //  LESSONS — Convert (public, read-only)
  // ════════════════════════════════════════════

  /**
   * GET /v1/course/lessons
   * List all published lessons sorted by order.
   */
  async getPublishedLessons(req: Request, res: Response): Promise<void> {
    const courseId = (req.query.courseId as string) || undefined;
    const lessons = await courseService.getPublishedLessons(courseId);
    sendSuccess(res, 200, lessons);
  }

  /**
   * GET /v1/course/lessons/:lessonId
   * Get a single published lesson by ID.
   */
  async getPublishedLesson(req: Request, res: Response): Promise<void> {
    const { lessonId } = req.params;
    const lesson = await courseService.getPublishedLessonById(lessonId);
    sendSuccess(res, 200, lesson);
  }

  // ════════════════════════════════════════════
  //  COURSES (multi-course)
  // ════════════════════════════════════════════

  /** GET /v1/courses — active courses with the convert's progress each. */
  async listCoursesForConvert(req: Request, res: Response): Promise<void> {
    const courses = await courseService.listCourses(false);
    const userId = req.user!.userId;
    const withProgress = await Promise.all(
      courses.map(async (c) => {
        const summary = await progressService.getProgressSummary(userId, c._id.toString());
        return {
          id: c._id.toString(),
          title: c.title,
          description: c.description,
          isPrimary: c.isPrimary,
          totalLessons: summary.totalLessons,
          completedLessons: summary.completedLessons,
          percentComplete: summary.percentComplete,
          isComplete: summary.isComplete,
        };
      })
    );
    sendSuccess(res, 200, { courses: withProgress });
  }

  /** GET /v1/admin/courses — all courses (admin). */
  async adminListCourses(_req: Request, res: Response): Promise<void> {
    const courses = await courseService.listCourses(true);
    sendSuccess(res, 200, { courses });
  }

  /** POST /v1/admin/courses */
  async adminCreateCourse(req: Request, res: Response): Promise<void> {
    const course = await courseService.createCourse(req.body);
    sendCreated(res, { course });
  }

  /** PATCH /v1/admin/courses/:courseId */
  async adminUpdateCourse(req: Request, res: Response): Promise<void> {
    const course = await courseService.updateCourse(req.body, req.params.courseId);
    sendSuccess(res, 200, { course });
  }
}

export const courseController = new CourseController();
