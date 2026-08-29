import { Types } from 'mongoose';
import {
  Progress,
  IProgress,
  LessonProgressView,
  ProgressSummary,
  toLessonProgressView,
} from './progress.model';
import { Lesson, ILesson } from '../course/lesson.model';
import { Course, ICourse } from '../course/course.model';
import { stageService } from '../stage/stage.service';
import { notificationService } from '../notification/notification.service';
import { DiscipleshipStage } from '../../shared/constants/stages';
import { NotFoundError, AppError } from '../../shared/errors';

class ProgressService {
  // ════════════════════════════════════════════
  //  LESSON START
  // ════════════════════════════════════════════

  /**
   * Mark a lesson as started for a convert.
   *
   * Side effects:
   * - Creates a progress record if none exists (idempotent on re-start)
   * - If this is the convert's FIRST lesson ever → triggers auto-transition
   *   to IN_CLASS via the Stage Engine
   *
   * Returns the progress record and whether a stage change occurred.
   */
  async startLesson(
    userId: string,
    lessonId: string
  ): Promise<{ progress: LessonProgressView; stageChanged: boolean }> {
    const lesson = await this.findPublishedLessonOrFail(lessonId);
    const courseId = lesson.courseId;

    // ── Upsert progress record ──
    let progress = await Progress.findOne({
      userId: new Types.ObjectId(userId),
      lessonId: new Types.ObjectId(lessonId),
    });

    const primary = await this.getPrimaryCourse();
    const isPrimaryLesson = !!primary && courseId.toString() === primary._id.toString();
    let isFirstPrimaryLesson = false;

    if (!progress) {
      // First lesson in the PRIMARY course triggers the IN_CLASS transition.
      if (isPrimaryLesson && primary) {
        const existingCount = await Progress.countDocuments({
          userId: new Types.ObjectId(userId),
          courseId: primary._id,
        });
        isFirstPrimaryLesson = existingCount === 0;
      }

      progress = await Progress.create({
        userId: new Types.ObjectId(userId),
        lessonId: new Types.ObjectId(lessonId),
        courseId,
        status: 'in_progress',
        startedAt: new Date(),
      });
    } else if (progress.status === 'not_started') {
      // Re-start a previously created but not-started record
      progress.status = 'in_progress';
      progress.startedAt = new Date();
      await progress.save();
    }
    // If already in_progress or completed, this is idempotent — no change

    // ── Auto-transition: first PRIMARY-course lesson → IN_CLASS ──
    let stageChanged = false;
    if (isPrimaryLesson && isFirstPrimaryLesson) {
      const result = await stageService.tryAutoTransition(
        userId,
        DiscipleshipStage.IN_CLASS,
        { firstLessonId: lessonId, firstLessonTitle: lesson.title }
      );
      stageChanged = result !== null;
    }

    return {
      progress: toLessonProgressView(progress),
      stageChanged,
    };
  }

  // ════════════════════════════════════════════
  //  LESSON COMPLETE
  // ════════════════════════════════════════════

  /**
   * Mark a lesson as completed for a convert.
   *
   * Preconditions:
   * - Lesson must be started (status = 'in_progress')
   * - If lesson has a quiz, quiz must be passed (quizPassed = true)
   *
   * Side effects:
   * - If ALL published lessons are now completed → triggers auto-transition
   *   to CLASS_COMPLETED via the Stage Engine
   *
   * Returns the progress record, whether all lessons are done,
   * and whether a stage change occurred.
   */
  async completeLesson(
    userId: string,
    lessonId: string
  ): Promise<{
    progress: LessonProgressView;
    allLessonsComplete: boolean;
    stageChanged: boolean;
  }> {
    const lesson = await this.findPublishedLessonOrFail(lessonId);

    // ── Find existing progress record ──
    const progress = await Progress.findOne({
      userId: new Types.ObjectId(userId),
      lessonId: new Types.ObjectId(lessonId),
    });

    if (!progress) {
      throw new AppError(
        'You must start this lesson before completing it.',
        400,
        'LESSON_NOT_STARTED'
      );
    }

    if (progress.status === 'completed') {
      // Already complete — idempotent return
      const allComplete = await this.areAllLessonsComplete(userId, lesson.courseId);
      return {
        progress: toLessonProgressView(progress),
        allLessonsComplete: allComplete,
        stageChanged: false,
      };
    }

    if (progress.status !== 'in_progress') {
      throw new AppError(
        'Lesson must be in progress before it can be completed.',
        400,
        'INVALID_PROGRESS_STATE'
      );
    }

    // ── Check quiz gate ──
    if (lesson.hasQuiz && !progress.quizPassed) {
      throw new AppError(
        'You must pass the quiz before completing this lesson.',
        400,
        'QUIZ_NOT_PASSED'
      );
    }

    // ── Mark complete ──
    progress.status = 'completed';
    progress.completedAt = new Date();
    await progress.save();

    // ── Counts scoped to THIS lesson's course ──
    const lessonCourseId = lesson.courseId;
    const completedCount = await this.getCompletedLessonCount(userId, lessonCourseId);
    const totalPublished = await this.getTotalPublishedLessonCount(lessonCourseId);

    // ── Notify: lesson completed (fire-and-forget) ──
    notificationService.notifyLessonCompleted(
      userId,
      lesson.title,
      lessonId,
      completedCount,
      totalPublished
    );

    // ── Auto-transition to CLASS_COMPLETED only for the PRIMARY course ──
    const primary = await this.getPrimaryCourse();
    const isPrimaryLesson = !!primary && lessonCourseId.toString() === primary._id.toString();
    let allComplete = false;
    let stageChanged = false;
    if (isPrimaryLesson && primary) {
      allComplete = await this.areAllLessonsComplete(userId, primary._id);
      if (allComplete) {
        const result = await stageService.tryAutoTransition(
          userId,
          DiscipleshipStage.CLASS_COMPLETED,
          { lessonsCompleted: completedCount, completedAt: new Date().toISOString() }
        );
        stageChanged = result !== null;
        notificationService.notifyCourseCompleted(userId, completedCount);
      }
    }

    return {
      progress: toLessonProgressView(progress),
      allLessonsComplete: allComplete,
      stageChanged,
    };
  }

  // ════════════════════════════════════════════
  //  PROGRESS QUERIES
  // ════════════════════════════════════════════

  /**
   * Get overall course progress summary for a convert.
   *
   * Calculates percentage based on published lessons only.
   * Lessons the user hasn't touched yet count as 'not_started'.
   */
  async getProgressSummary(userId: string, courseIdArg?: string): Promise<ProgressSummary> {
    const course = await this.resolveCourse(courseIdArg);
    const courseId = course._id;

    // Count published lessons
    const totalLessons = await Lesson.countDocuments({
      courseId,
      isPublished: true,
      isDeleted: false,
    });

    // Count user's progress records by status
    const progressRecords = await Progress.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          courseId,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts: Record<string, number> = {};
    for (const record of progressRecords) {
      statusCounts[record._id] = record.count;
    }

    const completedLessons = statusCounts['completed'] || 0;
    const inProgressLessons = statusCounts['in_progress'] || 0;
    const trackedNotStarted = statusCounts['not_started'] || 0;

    // Lessons with no progress record at all
    const untrackedLessons = totalLessons - completedLessons - inProgressLessons - trackedNotStarted;
    const notStartedLessons = trackedNotStarted + Math.max(0, untrackedLessons);

    const percentComplete =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 1000) / 10
        : 0;

    // Find most recent activity
    const lastActivity = await Progress.findOne({
      userId: new Types.ObjectId(userId),
      courseId,
    })
      .sort({ updatedAt: -1 })
      .select('updatedAt');

    return {
      courseId: courseId.toString(),
      totalLessons,
      completedLessons,
      inProgressLessons,
      notStartedLessons,
      percentComplete,
      isComplete: totalLessons > 0 && completedLessons >= totalLessons,
      lastActivityAt: lastActivity?.updatedAt || null,
    };
  }

  /**
   * Get per-lesson progress breakdown for a convert.
   *
   * Returns progress for every published lesson (sorted by lesson order),
   * including lessons the user hasn't started yet (synthetic not_started records).
   */
  async getLessonProgress(userId: string, courseIdArg?: string): Promise<LessonProgressView[]> {
    const course = await this.resolveCourse(courseIdArg);

    // Get all published lessons in order
    const lessons = await Lesson.find({
      courseId: course._id,
      isPublished: true,
      isDeleted: false,
    })
      .sort({ sortOrder: 1 })
      .select('_id');

    const lessonIds = lessons.map((l) => l._id);

    // Get existing progress records
    const progressRecords = await Progress.find({
      userId: new Types.ObjectId(userId),
      lessonId: { $in: lessonIds },
    });

    // Build a map for O(1) lookup
    const progressMap = new Map<string, IProgress>();
    for (const record of progressRecords) {
      progressMap.set(record.lessonId.toString(), record);
    }

    // Merge: real progress or synthetic not_started
    return lessonIds.map((lessonId) => {
      const existing = progressMap.get(lessonId.toString());
      if (existing) {
        return toLessonProgressView(existing);
      }

      // No progress record → synthetic not_started
      return {
        lessonId: lessonId.toString(),
        status: 'not_started' as const,
        startedAt: null,
        completedAt: null,
        quizAttempts: 0,
        bestQuizScore: null,
        quizPassed: false,
      };
    });
  }

  // ════════════════════════════════════════════
  //  INTERNAL HELPERS
  // ════════════════════════════════════════════

  /**
   * Check if all published lessons are completed by a user.
   */
  private async areAllLessonsComplete(
    userId: string,
    courseId: Types.ObjectId
  ): Promise<boolean> {
    const totalPublished = await Lesson.countDocuments({
      courseId,
      isPublished: true,
      isDeleted: false,
    });

    if (totalPublished === 0) return false;

    // Get IDs of all published lessons
    const publishedLessons = await Lesson.find({
      courseId,
      isPublished: true,
      isDeleted: false,
    }).select('_id');

    const publishedIds = publishedLessons.map((l) => l._id);

    const completedCount = await Progress.countDocuments({
      userId: new Types.ObjectId(userId),
      lessonId: { $in: publishedIds },
      status: 'completed',
    });

    return completedCount >= totalPublished;
  }

  /**
   * Get count of completed lessons for a user.
   */
  private async getCompletedLessonCount(
    userId: string,
    courseId?: Types.ObjectId
  ): Promise<number> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      status: 'completed',
    };
    if (courseId) filter.courseId = courseId;
    return Progress.countDocuments(filter);
  }

  /**
   * Get total count of published lessons in the active course.
   * Used for notification context (e.g., "3/12 lessons done").
   */
  private async getTotalPublishedLessonCount(courseId: Types.ObjectId): Promise<number> {
    return Lesson.countDocuments({
      courseId,
      isPublished: true,
      isDeleted: false,
    });
  }

  /**
   * Resolve a courseId argument to a course doc, defaulting to the primary course.
   */
  private async resolveCourse(courseId?: string): Promise<ICourse> {
    if (courseId) {
      const c = await Course.findOne({ _id: courseId, isActive: true });
      if (!c) throw new NotFoundError('Course', courseId);
      return c;
    }
    const primary = await this.getPrimaryCourse();
    if (!primary) throw new NotFoundError('Course');
    return primary;
  }

  /**
   * The primary (stage-driving) course.
   */
  private async getPrimaryCourse(): Promise<ICourse | null> {
    return (
      (await Course.findOne({ isPrimary: true })) ||
      (await Course.findOne({ isActive: true }))
    );
  }

  /**
   * Find a published, non-deleted lesson or throw NotFoundError.
   */
  private async findPublishedLessonOrFail(lessonId: string): Promise<ILesson> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new AppError(`Invalid lesson ID: ${lessonId}`, 400, 'INVALID_ID');
    }

    const lesson = await Lesson.findOne({
      _id: new Types.ObjectId(lessonId),
      isPublished: true,
      isDeleted: false,
    });

    if (!lesson) {
      throw new NotFoundError('Lesson', lessonId);
    }

    return lesson;
  }
}

export const progressService = new ProgressService();
