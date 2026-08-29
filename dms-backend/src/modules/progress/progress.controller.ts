import { Request, Response } from 'express';
import { progressService } from './progress.service';
import { sendSuccess } from '../../shared/utils/response';
import { User } from '../user/user.model';
import { Role } from '../../shared/constants/roles';
import { NotFoundError } from '../../shared/errors';
import { assertBranchAccess } from '../../shared/access/branch-scope';

/**
 * Progress controller.
 *
 * Two audiences:
 * - Convert: start/complete lessons, view own progress
 * - Admin: view any convert's progress (read-only)
 *
 * Stage transitions are handled entirely by the service layer
 * via the centralized Stage Engine. Zero stage logic here.
 */
class ProgressController {
  // ════════════════════════════════════════════
  //  Convert — Lesson Actions
  // ════════════════════════════════════════════

  /**
   * POST /v1/progress/lessons/:lessonId/start
   *
   * Mark a lesson as started. If this is the convert's first lesson,
   * the service auto-transitions them to IN_CLASS via Stage Engine.
   */
  async startLesson(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { lessonId } = req.params;

    const result = await progressService.startLesson(userId, lessonId);

    sendSuccess(res, 200, result);
  }

  /**
   * POST /v1/progress/lessons/:lessonId/complete
   *
   * Mark a lesson as completed. If ALL published lessons are now done,
   * the service auto-transitions to CLASS_COMPLETED via Stage Engine.
   */
  async completeLesson(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { lessonId } = req.params;

    const result = await progressService.completeLesson(userId, lessonId);

    sendSuccess(res, 200, result);
  }

  // ════════════════════════════════════════════
  //  Convert — Progress Queries (own data)
  // ════════════════════════════════════════════

  /**
   * GET /v1/progress/summary
   *
   * Overall course completion percentage and breakdown.
   */
  async getOwnSummary(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const courseId = (req.query.courseId as string) || undefined;

    const summary = await progressService.getProgressSummary(userId, courseId);

    sendSuccess(res, 200, summary);
  }

  /**
   * GET /v1/progress/lessons
   *
   * Per-lesson progress for every published lesson (sorted by order).
   * Includes lessons the convert hasn't touched yet (status: not_started).
   */
  async getOwnLessonProgress(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const courseId = (req.query.courseId as string) || undefined;

    const lessons = await progressService.getLessonProgress(userId, courseId);

    sendSuccess(res, 200, lessons);
  }

  // ════════════════════════════════════════════
  //  Admin — Progress Queries (any convert)
  // ════════════════════════════════════════════

  /**
   * GET /v1/admin/progress/:convertId/summary
   *
   * View any convert's overall course progress (within the admin's branch).
   */
  async getConvertSummary(req: Request, res: Response): Promise<void> {
    const { convertId } = req.params;
    await this.assertConvertAccess(req, convertId);

    const summary = await progressService.getProgressSummary(convertId);

    sendSuccess(res, 200, summary);
  }

  /**
   * GET /v1/admin/progress/:convertId/lessons
   *
   * View any convert's per-lesson progress breakdown (within the admin's branch).
   */
  async getConvertLessonProgress(req: Request, res: Response): Promise<void> {
    const { convertId } = req.params;
    await this.assertConvertAccess(req, convertId);

    const lessons = await progressService.getLessonProgress(convertId);

    sendSuccess(res, 200, lessons);
  }

  /** These admin endpoints take a raw convertId from the URL — verify branch access first. */
  private async assertConvertAccess(req: Request, convertId: string): Promise<void> {
    const convert = await User.findOne({
      _id: convertId,
      role: Role.CONVERT,
      isActive: true,
    }).select('branchId');
    if (!convert) throw new NotFoundError('Convert', convertId);
    assertBranchAccess(req.user!, convert.branchId?.toString());
  }
}

export const progressController = new ProgressController();
