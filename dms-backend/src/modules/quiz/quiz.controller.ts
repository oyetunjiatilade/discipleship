import { Request, Response } from 'express';
import { quizService } from './quiz.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response';

/**
 * Quiz controller.
 *
 * Two audiences:
 * - Admin: full CRUD on quizzes, view attempt history
 * - Convert: view quiz (without answers), submit answers, view own results
 *
 * All scoring logic and progress integration lives in the service layer.
 * Zero business logic here.
 */
class QuizController {
  // ════════════════════════════════════════════
  //  Admin — Quiz CRUD
  // ════════════════════════════════════════════

  /**
   * POST /v1/admin/quizzes
   * Create a quiz for a lesson.
   */
  async createQuiz(req: Request, res: Response): Promise<void> {
    const quiz = await quizService.createQuiz(req.body);
    sendCreated(res, quiz);
  }

  /**
   * PATCH /v1/admin/quizzes/:quizId
   * Update a quiz's content or settings.
   */
  async updateQuiz(req: Request, res: Response): Promise<void> {
    const { quizId } = req.params;
    const quiz = await quizService.updateQuiz(quizId, req.body);
    sendSuccess(res, 200, quiz);
  }

  /**
   * DELETE /v1/admin/quizzes/:quizId
   * Delete a quiz. Resets hasQuiz flag on lesson.
   */
  async deleteQuiz(req: Request, res: Response): Promise<void> {
    const { quizId } = req.params;
    await quizService.deleteQuiz(quizId);
    sendNoContent(res);
  }

  /**
   * GET /v1/admin/quizzes/:quizId
   * Get a single quiz with correct answers (admin view).
   */
  async getQuizAdmin(req: Request, res: Response): Promise<void> {
    const { quizId } = req.params;
    const quiz = await quizService.getQuizAdmin(quizId);
    sendSuccess(res, 200, quiz);
  }

  /**
   * GET /v1/admin/quizzes/lesson/:lessonId
   * Get quiz for a specific lesson (admin view).
   */
  async getQuizByLessonAdmin(req: Request, res: Response): Promise<void> {
    const { lessonId } = req.params;
    const quiz = await quizService.getQuizByLessonAdmin(lessonId);
    sendSuccess(res, 200, quiz);
  }

  /**
   * GET /v1/admin/quizzes
   * List all quizzes for the course (admin view).
   */
  async listQuizzesAdmin(_req: Request, res: Response): Promise<void> {
    const quizzes = await quizService.listQuizzesAdmin();
    sendSuccess(res, 200, quizzes);
  }

  /**
   * GET /v1/admin/quizzes/:quizId/attempts
   * Get all attempts for a quiz (admin view).
   */
  async getAttemptsAdmin(req: Request, res: Response): Promise<void> {
    const { quizId } = req.params;
    const attempts = await quizService.getAttemptsForQuizAdmin(quizId);
    sendSuccess(res, 200, attempts);
  }

  // ════════════════════════════════════════════
  //  Convert — Quiz Access & Submission
  // ════════════════════════════════════════════

  /**
   * GET /v1/quizzes/lesson/:lessonId
   * Get quiz for a lesson (convert view — no correct answers).
   */
  async getQuizForLesson(req: Request, res: Response): Promise<void> {
    const { lessonId } = req.params;
    const quiz = await quizService.getQuizForLesson(lessonId);
    sendSuccess(res, 200, quiz);
  }

  /**
   * POST /v1/quizzes/lesson/:lessonId/submit
   * Submit quiz answers. Returns graded results.
   */
  async submitQuiz(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { lessonId } = req.params;
    const { answers } = req.body;

    const result = await quizService.submitQuiz(userId, lessonId, { answers });
    sendSuccess(res, 200, result);
  }

  /**
   * GET /v1/quizzes/lesson/:lessonId/attempts
   * Get own attempt history for a lesson's quiz.
   */
  async getMyAttempts(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { lessonId } = req.params;

    const attempts = await quizService.getMyAttempts(userId, lessonId);
    sendSuccess(res, 200, attempts);
  }

  /**
   * GET /v1/quizzes/attempts/:attemptId
   * Get detailed results for a specific attempt.
   */
  async getAttemptDetail(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { attemptId } = req.params;

    const detail = await quizService.getAttemptDetail(userId, attemptId);
    sendSuccess(res, 200, detail);
  }
}

export const quizController = new QuizController();
