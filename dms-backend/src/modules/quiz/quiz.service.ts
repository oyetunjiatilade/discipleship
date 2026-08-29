import { Types } from 'mongoose';
import {
  Quiz,
  IQuiz,
  QuizAttempt,
  QuizPublicView,
  QuizAdminView,
  AttemptResultView,
  AttemptSummaryView,
  ISubmittedAnswer,
  toQuizPublicView,
  toQuizAdminView,
} from './quiz.model';
import { Lesson } from '../course/lesson.model';
import { Progress } from '../progress/progress.model';
import { Course } from '../course/course.model';
import { notificationService } from '../notification/notification.service';
import {
  NotFoundError,
  ConflictError,
  AppError,
  ValidationError,
} from '../../shared/errors';

// ──────────────────────────────────────────
// Input interfaces
// ──────────────────────────────────────────

interface QuestionInput {
  questionText: string;
  options: Array<{ label: string; text: string }>;
  correctLabel: string;
  sortOrder: number;
}

interface CreateQuizInput {
  lessonId: string;
  title: string;
  description?: string;
  questions: QuestionInput[];
  passingScore?: number;
  maxAttempts?: number;
}

interface UpdateQuizInput {
  title?: string;
  description?: string;
  questions?: QuestionInput[];
  passingScore?: number;
  maxAttempts?: number;
  isActive?: boolean;
}

interface SubmitAnswersInput {
  answers: Array<{
    questionId: string;
    selectedLabel: string;
  }>;
}

class QuizService {
  // ════════════════════════════════════════════
  //  ADMIN — Quiz CRUD
  // ════════════════════════════════════════════

  /**
   * Create a quiz for a lesson.
   *
   * Side effects:
   * - Validates lesson exists and has no quiz yet
   * - Validates each question's correctLabel matches an option
   * - Sets lesson.hasQuiz = true
   */
  async createQuiz(input: CreateQuizInput): Promise<QuizAdminView> {
    const lesson = await this.findActiveLessonOrFail(input.lessonId);

    // ── Check lesson doesn't already have a quiz ──
    const existing = await Quiz.findOne({ lessonId: lesson._id });
    if (existing) {
      throw new ConflictError(
        `Lesson "${lesson.title}" already has a quiz. Delete it first to replace.`
      );
    }

    // ── Validate questions ──
    this.validateQuestions(input.questions);

    const quiz = await Quiz.create({
      lessonId: lesson._id,
      courseId: lesson.courseId,
      title: input.title,
      description: input.description || '',
      questions: input.questions,
      passingScore: input.passingScore ?? 70,
      maxAttempts: input.maxAttempts ?? 0,
    });

    // ── Set lesson.hasQuiz flag ──
    lesson.hasQuiz = true;
    await lesson.save();

    return toQuizAdminView(quiz);
  }

  /**
   * Update a quiz's content or settings.
   *
   * If questions are replaced, all previous attempts remain valid
   * (they reference question IDs that existed at the time of submission).
   */
  async updateQuiz(quizId: string, input: UpdateQuizInput): Promise<QuizAdminView> {
    const quiz = await this.findQuizOrFail(quizId);

    if (input.title !== undefined) quiz.title = input.title;
    if (input.description !== undefined) quiz.description = input.description;
    if (input.passingScore !== undefined) quiz.passingScore = input.passingScore;
    if (input.maxAttempts !== undefined) quiz.maxAttempts = input.maxAttempts;
    if (input.isActive !== undefined) quiz.isActive = input.isActive;

    if (input.questions !== undefined) {
      this.validateQuestions(input.questions);
      quiz.questions = input.questions as any; // Mongoose casts subdocuments
    }

    await quiz.save();
    return toQuizAdminView(quiz);
  }

  /**
   * Delete a quiz.
   *
   * Side effects:
   * - Sets lesson.hasQuiz = false
   * - Preserves attempt records (for auditing)
   * - Resets quizPassed on any progress records that haven't completed the lesson yet
   */
  async deleteQuiz(quizId: string): Promise<void> {
    const quiz = await this.findQuizOrFail(quizId);

    // Reset hasQuiz flag on the lesson
    await Lesson.updateOne(
      { _id: quiz.lessonId },
      { hasQuiz: false }
    );

    // Reset quizPassed on in-progress records
    // (completed lessons keep their status — they already passed the gate)
    await Progress.updateMany(
      {
        lessonId: quiz.lessonId,
        status: { $ne: 'completed' },
      },
      {
        quizPassed: false,
        bestQuizScore: null,
        quizAttempts: 0,
      }
    );

    // Remove the quiz document
    await Quiz.deleteOne({ _id: quiz._id });
  }

  /**
   * Get a quiz by ID (admin view — includes correct answers).
   */
  async getQuizAdmin(quizId: string): Promise<QuizAdminView> {
    const quiz = await this.findQuizOrFail(quizId);
    return toQuizAdminView(quiz);
  }

  /**
   * Get quiz for a lesson (admin view).
   */
  async getQuizByLessonAdmin(lessonId: string): Promise<QuizAdminView | null> {
    this.validateObjectId(lessonId);
    const quiz = await Quiz.findOne({ lessonId: new Types.ObjectId(lessonId) });
    return quiz ? toQuizAdminView(quiz) : null;
  }

  /**
   * List all quizzes for the course (admin view).
   */
  async listQuizzesAdmin(): Promise<QuizAdminView[]> {
    const course = await Course.findOne({ isActive: true });
    if (!course) throw new NotFoundError('Course');

    const quizzes = await Quiz.find({ courseId: course._id }).sort({ createdAt: 1 });
    return quizzes.map(toQuizAdminView);
  }

  // ════════════════════════════════════════════
  //  CONVERT — Quiz Access & Submission
  // ════════════════════════════════════════════

  /**
   * Get a quiz for a lesson (convert view — no correct answers).
   *
   * Only returns active quizzes for published, non-deleted lessons.
   */
  async getQuizForLesson(lessonId: string): Promise<QuizPublicView> {
    this.validateObjectId(lessonId);

    const quiz = await Quiz.findOne({
      lessonId: new Types.ObjectId(lessonId),
      isActive: true,
    });

    if (!quiz) {
      throw new NotFoundError('Quiz for this lesson');
    }

    // Verify lesson is published
    const lesson = await Lesson.findOne({
      _id: quiz.lessonId,
      isPublished: true,
      isDeleted: false,
    });

    if (!lesson) {
      throw new NotFoundError('Lesson', lessonId);
    }

    return toQuizPublicView(quiz);
  }

  /**
   * Submit quiz answers, grade them, and update progress.
   *
   * Flow:
   * 1. Validate lesson is started (has progress record)
   * 2. Check attempt limit
   * 3. Grade answers against correct labels
   * 4. Create immutable attempt record
   * 5. Update progress: quizAttempts, bestQuizScore, quizPassed
   *
   * Returns detailed results including which answers were correct.
   */
  async submitQuiz(
    userId: string,
    lessonId: string,
    input: SubmitAnswersInput
  ): Promise<AttemptResultView> {
    this.validateObjectId(lessonId);

    // ── 1. Find quiz ──
    const quiz = await Quiz.findOne({
      lessonId: new Types.ObjectId(lessonId),
      isActive: true,
    });

    if (!quiz) {
      throw new NotFoundError('Quiz for this lesson');
    }

    // ── 2. Verify lesson is started ──
    const progress = await Progress.findOne({
      userId: new Types.ObjectId(userId),
      lessonId: new Types.ObjectId(lessonId),
    });

    if (!progress || progress.status === 'not_started') {
      throw new AppError(
        'You must start this lesson before taking the quiz.',
        400,
        'LESSON_NOT_STARTED'
      );
    }

    if (progress.status === 'completed') {
      throw new AppError(
        'This lesson is already completed.',
        400,
        'LESSON_ALREADY_COMPLETED'
      );
    }

    // ── 3. Check attempt limit ──
    const previousAttempts = await QuizAttempt.countDocuments({
      userId: new Types.ObjectId(userId),
      quizId: quiz._id,
    });

    if (quiz.maxAttempts > 0 && previousAttempts >= quiz.maxAttempts) {
      throw new AppError(
        `Maximum attempts (${quiz.maxAttempts}) reached for this quiz.`,
        429,
        'MAX_ATTEMPTS_REACHED'
      );
    }

    // ── 4. Grade answers ──
    const graded = this.gradeAnswers(quiz, input.answers);

    // ── 5. Create attempt record ──
    const attempt = await QuizAttempt.create({
      quizId: quiz._id,
      lessonId: quiz.lessonId,
      userId: new Types.ObjectId(userId),
      answers: graded.answers,
      score: graded.score,
      totalQuestions: graded.totalQuestions,
      correctAnswers: graded.correctAnswers,
      passed: graded.passed,
      attemptNumber: previousAttempts + 1,
      submittedAt: new Date(),
    });

    // ── 6. Update progress record ──
    progress.quizAttempts = previousAttempts + 1;

    // Track best score
    if (progress.bestQuizScore === null || graded.score > progress.bestQuizScore) {
      progress.bestQuizScore = graded.score;
    }

    // Once passed, stays passed (even if later attempts score lower)
    if (graded.passed) {
      progress.quizPassed = true;
    }

    await progress.save();

    // ── 7. Notify: quiz result (fire-and-forget) ──
    const lesson = await Lesson.findById(quiz.lessonId).select('title');
    const lessonTitle = lesson?.title || 'Unknown Lesson';
    notificationService.notifyQuizResult(
      userId,
      lessonTitle,
      lessonId,
      graded.score,
      graded.passed,
      quiz.passingScore
    );

    // ── 8. Build response ──
    return {
      attemptId: attempt._id.toString(),
      score: graded.score,
      totalQuestions: graded.totalQuestions,
      correctAnswers: graded.correctAnswers,
      passed: graded.passed,
      passingScore: quiz.passingScore,
      attemptNumber: previousAttempts + 1,
      answers: graded.detailedAnswers,
      submittedAt: attempt.submittedAt,
    };
  }

  /**
   * Get a convert's attempt history for a lesson's quiz.
   */
  async getMyAttempts(userId: string, lessonId: string): Promise<AttemptSummaryView[]> {
    this.validateObjectId(lessonId);

    const quiz = await Quiz.findOne({
      lessonId: new Types.ObjectId(lessonId),
    });

    if (!quiz) {
      return []; // No quiz exists for this lesson
    }

    const attempts = await QuizAttempt.find({
      userId: new Types.ObjectId(userId),
      quizId: quiz._id,
    }).sort({ submittedAt: -1 });

    return attempts.map((a) => ({
      attemptId: a._id.toString(),
      score: a.score,
      passed: a.passed,
      attemptNumber: a.attemptNumber,
      submittedAt: a.submittedAt,
    }));
  }

  /**
   * Get detailed results for a specific attempt.
   */
  async getAttemptDetail(
    userId: string,
    attemptId: string
  ): Promise<AttemptResultView> {
    this.validateObjectId(attemptId);

    const attempt = await QuizAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
    });

    if (!attempt) {
      throw new NotFoundError('Quiz attempt', attemptId);
    }

    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    // Build question lookup for correct labels
    const questionMap = new Map<string, string>();
    for (const q of quiz.questions) {
      questionMap.set(q._id.toString(), q.correctLabel);
    }

    return {
      attemptId: attempt._id.toString(),
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      correctAnswers: attempt.correctAnswers,
      passed: attempt.passed,
      passingScore: quiz.passingScore,
      attemptNumber: attempt.attemptNumber,
      answers: attempt.answers.map((a) => ({
        questionId: a.questionId,
        selectedLabel: a.selectedLabel,
        correctLabel: questionMap.get(a.questionId) || 'unknown',
        isCorrect: a.isCorrect ?? false,
      })),
      submittedAt: attempt.submittedAt,
    };
  }

  // ════════════════════════════════════════════
  //  ADMIN — Attempt Queries
  // ════════════════════════════════════════════

  /**
   * Get all attempts for a quiz (admin view).
   */
  async getAttemptsForQuizAdmin(
    quizId: string
  ): Promise<Array<AttemptSummaryView & { userId: string }>> {
    this.validateObjectId(quizId);

    const attempts = await QuizAttempt.find({
      quizId: new Types.ObjectId(quizId),
    }).sort({ submittedAt: -1 });

    return attempts.map((a) => ({
      attemptId: a._id.toString(),
      userId: a.userId.toString(),
      score: a.score,
      passed: a.passed,
      attemptNumber: a.attemptNumber,
      submittedAt: a.submittedAt,
    }));
  }

  // ════════════════════════════════════════════
  //  SCORING ENGINE (private)
  // ════════════════════════════════════════════

  /**
   * Grade a set of submitted answers against the quiz's correct answers.
   *
   * Rules:
   * - Each question has exactly one correct label
   * - Missing answers count as incorrect
   * - Unknown questionIds are silently ignored
   * - Score = (correct / total) * 100, rounded to 1 decimal
   * - Passing = score >= quiz.passingScore
   */
  private gradeAnswers(
    quiz: IQuiz,
    submittedAnswers: Array<{ questionId: string; selectedLabel: string }>
  ): {
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    passed: boolean;
    answers: ISubmittedAnswer[];
    detailedAnswers: Array<{
      questionId: string;
      selectedLabel: string;
      correctLabel: string;
      isCorrect: boolean;
    }>;
  } {
    const totalQuestions = quiz.questions.length;

    // Build answer lookup: questionId → selectedLabel
    const answerMap = new Map<string, string>();
    for (const answer of submittedAnswers) {
      answerMap.set(answer.questionId, answer.selectedLabel);
    }

    let correctCount = 0;
    const gradedAnswers: ISubmittedAnswer[] = [];
    const detailedAnswers: Array<{
      questionId: string;
      selectedLabel: string;
      correctLabel: string;
      isCorrect: boolean;
    }> = [];

    for (const question of quiz.questions) {
      const questionId = question._id.toString();
      const selectedLabel = answerMap.get(questionId) || '';
      const isCorrect = selectedLabel === question.correctLabel;

      if (isCorrect) correctCount++;

      gradedAnswers.push({
        questionId,
        selectedLabel,
        isCorrect,
      });

      detailedAnswers.push({
        questionId,
        selectedLabel,
        correctLabel: question.correctLabel,
        isCorrect,
      });
    }

    const score = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 1000) / 10
      : 0;

    return {
      score,
      totalQuestions,
      correctAnswers: correctCount,
      passed: score >= quiz.passingScore,
      answers: gradedAnswers,
      detailedAnswers,
    };
  }

  // ════════════════════════════════════════════
  //  INTERNAL HELPERS
  // ════════════════════════════════════════════

  /**
   * Validate questions: correctLabel must match an option label,
   * no duplicate sort orders, and labels are unique within each question.
   */
  private validateQuestions(questions: QuestionInput[]): void {
    const sortOrders = new Set<number>();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const ctx = `Question ${i + 1}`;

      // Check sort order uniqueness
      if (sortOrders.has(q.sortOrder)) {
        throw new ValidationError(`${ctx}: duplicate sort order ${q.sortOrder}`);
      }
      sortOrders.add(q.sortOrder);

      // Check option labels are unique
      const labels = q.options.map((o) => o.label);
      if (new Set(labels).size !== labels.length) {
        throw new ValidationError(`${ctx}: duplicate option labels`);
      }

      // Check correctLabel exists in options
      if (!labels.includes(q.correctLabel)) {
        throw new ValidationError(
          `${ctx}: correctLabel "${q.correctLabel}" does not match any option label (${labels.join(', ')})`
        );
      }
    }
  }

  private async findQuizOrFail(quizId: string): Promise<IQuiz> {
    this.validateObjectId(quizId);
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz', quizId);
    }
    return quiz;
  }

  private async findActiveLessonOrFail(lessonId: string) {
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

  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ID format: ${id}`, 400, 'INVALID_ID');
    }
  }
}

export const quizService = new QuizService();
