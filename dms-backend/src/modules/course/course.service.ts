import { Types } from 'mongoose';
import { Course, ICourse } from './course.model';
import {
  Lesson,
  ILesson,
  LessonPublicView,
  LessonAdminView,
  toLessonPublicView,
  toLessonAdminView,
} from './lesson.model';
import {
  NotFoundError,
  ConflictError,
  AppError,
  ValidationError,
} from '../../shared/errors';

// ──────────────────────────────────────────
// Input interfaces
// ──────────────────────────────────────────

interface CreateLessonInput {
  courseId?: string;
  title: string;
  description: string;
  sortOrder: number;
  videoUrl: string;
  videoPublicId: string;
  notesUrl: string;
  notesPublicId: string;
  estimatedMinutes?: number;
  isPublished?: boolean;
  memoryVerse?: string | null;
  actionStep?: string | null;
  transcript?: string | null;
  notesMarkdown?: string | null;
}

interface UpdateLessonInput {
  title?: string;
  description?: string;
  videoUrl?: string;
  videoPublicId?: string;
  notesUrl?: string;
  notesPublicId?: string;
  estimatedMinutes?: number | null;
  memoryVerse?: string | null;
  actionStep?: string | null;
  transcript?: string | null;
  notesMarkdown?: string | null;
  isPublished?: boolean;
}

interface ReorderItem {
  lessonId: string;
  sortOrder: number;
}

class CourseService {
  // ════════════════════════════════════════════
  //  COURSE MANAGEMENT
  // ════════════════════════════════════════════

  /**
   * Get or create the single Believers Class course.
   *
   * Phase 1 constraint: only ONE course exists.
   * This method is idempotent — calling it multiple times returns the same course.
   */
  async getOrCreateCourse(): Promise<ICourse> {
    let course = await Course.findOne({ isActive: true });

    if (!course) {
      course = await Course.create({
        title: 'Believers Class',
        description:
          'A foundational discipleship course for new converts to grow in faith, understand core doctrines, and prepare for water baptism and church membership.',
        isActive: true,
        isPrimary: true,
        totalLessons: 0,
      });
    } else if (!course.isPrimary) {
      // Ensure the seeded course is marked primary (idempotent backfill).
      course.isPrimary = true;
      await course.save();
    }

    return course;
  }

  /**
   * The primary (stage-driving) course — the Believers Class.
   */
  async getPrimaryCourse(): Promise<ICourse> {
    let course = await Course.findOne({ isPrimary: true });
    if (!course) course = await Course.findOne({ isActive: true });
    if (!course) throw new NotFoundError('Course');
    return course;
  }

  async getPrimaryCourseId(): Promise<Types.ObjectId> {
    return (await this.getPrimaryCourse())._id;
  }

  /** List courses (active only by default). Primary first. */
  async listCourses(includeInactive = false): Promise<ICourse[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return Course.find(filter).sort({ isPrimary: -1, createdAt: 1 });
  }

  async getCourseById(courseId: string): Promise<ICourse> {
    this.validateObjectId(courseId);
    const c = await Course.findById(courseId);
    if (!c) throw new NotFoundError('Course', courseId);
    return c;
  }

  async createCourse(input: { title: string; description: string }): Promise<ICourse> {
    return Course.create({
      title: input.title.trim(),
      description: input.description.trim(),
      isActive: true,
      isPrimary: false,
      totalLessons: 0,
    });
  }

  /** Resolve a courseId argument to an ObjectId, defaulting to the primary course. */
  async resolveCourseId(courseId?: string): Promise<Types.ObjectId> {
    if (courseId) return (await this.getCourseById(courseId))._id;
    return this.getPrimaryCourseId();
  }

  /**
   * Get the active course.
   * Throws NotFoundError if no course exists (should never happen after seed).
   */
  async getCourse(): Promise<ICourse> {
    const course = await Course.findOne({ isActive: true });
    if (!course) {
      throw new NotFoundError('Course');
    }
    return course;
  }

  /**
   * Get the course ID (convenience for lesson operations).
   */
  async getCourseId(): Promise<Types.ObjectId> {
    const course = await this.getCourse();
    return course._id;
  }

  /**
   * Update course metadata (title, description).
   */
  async updateCourse(
    data: { title?: string; description?: string; isActive?: boolean },
    courseId?: string
  ): Promise<ICourse> {
    const course = courseId ? await this.getCourseById(courseId) : await this.getPrimaryCourse();

    if (data.title !== undefined) course.title = data.title;
    if (data.description !== undefined) course.description = data.description;
    if (data.isActive !== undefined && !course.isPrimary) course.isActive = data.isActive;

    await course.save();
    return course;
  }

  // ════════════════════════════════════════════
  //  LESSON CRUD (Admin)
  // ════════════════════════════════════════════

  /**
   * Create a new lesson in the Believers Class course.
   *
   * Sort order validation:
   * - If sortOrder is provided, it must not conflict with existing lessons.
   * - If a conflict exists, the operation fails (admin must reorder first).
   */
  async createLesson(input: CreateLessonInput): Promise<LessonAdminView> {
    const courseId = await this.resolveCourseId(input.courseId);

    // Check for sort order conflict
    const conflict = await Lesson.findOne({
      courseId,
      sortOrder: input.sortOrder,
      isDeleted: false,
    });

    if (conflict) {
      throw new ConflictError(
        `Sort order ${input.sortOrder} is already taken by lesson "${conflict.title}". Use the reorder endpoint first.`
      );
    }

    const lesson = await Lesson.create({
      courseId,
      title: input.title,
      description: input.description,
      sortOrder: input.sortOrder,
      videoUrl: input.videoUrl,
      videoPublicId: input.videoPublicId,
      notesUrl: input.notesUrl,
      notesPublicId: input.notesPublicId,
      estimatedMinutes: input.estimatedMinutes ?? null,
      memoryVerse: input.memoryVerse ?? null,
      actionStep: input.actionStep ?? null,
      transcript: input.transcript ?? null,
      notesMarkdown: input.notesMarkdown ?? null,
      isPublished: input.isPublished ?? true,
    });

    // Update denormalized lesson count
    await this.syncLessonCount(courseId);

    return toLessonAdminView(lesson);
  }

  /**
   * Update an existing lesson's content or metadata.
   * Does NOT allow changing sortOrder here — use reorderLessons for that.
   */
  async updateLesson(
    lessonId: string,
    input: UpdateLessonInput
  ): Promise<LessonAdminView> {
    const lesson = await this.findActiveLessonOrFail(lessonId);

    // Apply only provided fields
    if (input.title !== undefined) lesson.title = input.title;
    if (input.description !== undefined) lesson.description = input.description;
    if (input.videoUrl !== undefined) lesson.videoUrl = input.videoUrl;
    if (input.videoPublicId !== undefined) lesson.videoPublicId = input.videoPublicId;
    if (input.notesUrl !== undefined) lesson.notesUrl = input.notesUrl;
    if (input.notesPublicId !== undefined) lesson.notesPublicId = input.notesPublicId;
    if (input.isPublished !== undefined) lesson.isPublished = input.isPublished;
    if (input.memoryVerse !== undefined) lesson.memoryVerse = input.memoryVerse;
    if (input.actionStep !== undefined) lesson.actionStep = input.actionStep;
    if (input.transcript !== undefined) lesson.transcript = input.transcript;
    if (input.notesMarkdown !== undefined) lesson.notesMarkdown = input.notesMarkdown;

    // estimatedMinutes can be explicitly set to null
    if (input.estimatedMinutes !== undefined) {
      lesson.estimatedMinutes = input.estimatedMinutes;
    }

    await lesson.save();
    return toLessonAdminView(lesson);
  }

  /**
   * Soft-delete a lesson.
   * Soft delete preserves history (progress records referencing this lesson remain valid).
   * Sort order gap is left intentionally — admin can reorder if needed.
   */
  async deleteLesson(lessonId: string): Promise<void> {
    const lesson = await this.findActiveLessonOrFail(lessonId);

    lesson.isDeleted = true;
    lesson.isPublished = false;
    await lesson.save();

    // Update denormalized lesson count
    await this.syncLessonCount(lesson.courseId);
  }

  /**
   * Reorder lessons by providing a complete or partial mapping of lessonId → new sortOrder.
   *
   * Strategy:
   * 1. Validate all lessonIds exist and are active.
   * 2. Validate no duplicate sortOrder values in the input.
   * 3. Validate no conflicts with lessons NOT in the reorder set.
   * 4. Apply all changes in a single bulkWrite operation.
   */
  async reorderLessons(items: ReorderItem[], courseIdArg?: string): Promise<LessonAdminView[]> {
    if (items.length === 0) {
      throw new ValidationError('At least one lesson must be provided for reordering');
    }

    const courseId = await this.resolveCourseId(courseIdArg);

    // ── Validate no duplicate sort orders in input ──
    const sortOrders = items.map((i) => i.sortOrder);
    const uniqueOrders = new Set(sortOrders);
    if (uniqueOrders.size !== sortOrders.length) {
      throw new ValidationError('Duplicate sort order values are not allowed');
    }

    // ── Validate all sort orders are positive integers ──
    if (sortOrders.some((o) => o < 1 || !Number.isInteger(o))) {
      throw new ValidationError('Sort orders must be positive integers');
    }

    // ── Validate all lessonIds exist and belong to this course ──
    const lessonIds = items.map((i) => new Types.ObjectId(i.lessonId));
    const existingLessons = await Lesson.find({
      _id: { $in: lessonIds },
      courseId,
      isDeleted: false,
    });

    if (existingLessons.length !== items.length) {
      const foundIds = new Set(existingLessons.map((l) => l._id.toString()));
      const missing = items
        .filter((i) => !foundIds.has(i.lessonId))
        .map((i) => i.lessonId);
      throw new NotFoundError('Lesson(s)', missing.join(', '));
    }

    // ── Check for conflicts with lessons NOT being reordered ──
    const conflicting = await Lesson.find({
      courseId,
      isDeleted: false,
      _id: { $nin: lessonIds },
      sortOrder: { $in: sortOrders },
    });

    if (conflicting.length > 0) {
      const conflicts = conflicting.map(
        (l) => `"${l.title}" (order ${l.sortOrder})`
      );
      throw new ConflictError(
        `Sort order conflicts with existing lessons not in this reorder: ${conflicts.join(', ')}. ` +
        `Include those lessons in the reorder request or choose different orders.`
      );
    }

    // ── Apply reorder via bulkWrite ──
    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(item.lessonId) },
        update: { $set: { sortOrder: item.sortOrder } },
      },
    }));

    await Lesson.bulkWrite(bulkOps);

    // ── Return updated lessons in new order ──
    const updated = await Lesson.find({
      courseId,
      isDeleted: false,
    }).sort({ sortOrder: 1 });

    return updated.map(toLessonAdminView);
  }

  // ════════════════════════════════════════════
  //  LESSON READ (Admin view — includes unpublished)
  // ════════════════════════════════════════════

  /**
   * Get all lessons for admin (includes unpublished, excludes soft-deleted).
   */
  async getAdminLessons(courseId?: string): Promise<LessonAdminView[]> {
    const cid = await this.resolveCourseId(courseId);

    const lessons = await Lesson.find({
      courseId: cid,
      isDeleted: false,
    }).sort({ sortOrder: 1 });

    return lessons.map(toLessonAdminView);
  }

  /**
   * Get a single lesson by ID for admin.
   */
  async getAdminLessonById(lessonId: string): Promise<LessonAdminView> {
    const lesson = await this.findActiveLessonOrFail(lessonId);
    return toLessonAdminView(lesson);
  }

  // ════════════════════════════════════════════
  //  LESSON READ (Convert view — published only)
  // ════════════════════════════════════════════

  /**
   * Get all published lessons for converts, sorted by order.
   * Returns the public view (no publicIds, no admin flags).
   */
  async getPublishedLessons(courseId?: string): Promise<LessonPublicView[]> {
    const cid = await this.resolveCourseId(courseId);

    const lessons = await Lesson.find({
      courseId: cid,
      isPublished: true,
      isDeleted: false,
    }).sort({ sortOrder: 1 });

    return lessons.map(toLessonPublicView);
  }

  /**
   * Get a single published lesson by ID for converts.
   * Throws NotFoundError if the lesson is unpublished or deleted.
   */
  async getPublishedLessonById(lessonId: string): Promise<LessonPublicView> {
    this.validateObjectId(lessonId);

    const lesson = await Lesson.findOne({
      _id: new Types.ObjectId(lessonId),
      isPublished: true,
      isDeleted: false,
    });

    if (!lesson) {
      throw new NotFoundError('Lesson', lessonId);
    }

    return toLessonPublicView(lesson);
  }

  /**
   * Get the total count of published lessons.
   * Used by progress module to calculate completion percentage.
   */
  async getPublishedLessonCount(courseId?: string): Promise<number> {
    const cid = await this.resolveCourseId(courseId);

    return Lesson.countDocuments({
      courseId: cid,
      isPublished: true,
      isDeleted: false,
    });
  }

  // ════════════════════════════════════════════
  //  INTERNAL HELPERS
  // ════════════════════════════════════════════

  /**
   * Find a non-deleted lesson by ID or throw NotFoundError.
   */
  private async findActiveLessonOrFail(lessonId: string): Promise<ILesson> {
    this.validateObjectId(lessonId);

    const lesson = await Lesson.findOne({
      _id: new Types.ObjectId(lessonId),
      isDeleted: false,
    });

    if (!lesson) {
      throw new NotFoundError('Lesson', lessonId);
    }

    return lesson;
  }

  /**
   * Sync the denormalized totalLessons count on the course document.
   * Called after lesson create or delete.
   */
  private async syncLessonCount(courseId: Types.ObjectId): Promise<void> {
    const count = await Lesson.countDocuments({
      courseId,
      isDeleted: false,
    });

    await Course.updateOne({ _id: courseId }, { totalLessons: count });
  }

  /**
   * Validate that a string is a valid MongoDB ObjectId.
   */
  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ID format: ${id}`, 400, 'INVALID_ID');
    }
  }
}

export const courseService = new CourseService();
