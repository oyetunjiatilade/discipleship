import { Types } from 'mongoose';
import {
  Reflection,
  ReflectionView,
  ReflectionWithLessonView,
  toReflectionView,
} from './reflection.model';
import { Lesson } from '../course/lesson.model';
import { NotFoundError, AppError } from '../../shared/errors';

class ReflectionService {
  /** Get a convert's own reflection for a lesson (or null). */
  async getOwn(userId: string, lessonId: string): Promise<ReflectionView | null> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new AppError('Invalid lesson ID', 400, 'INVALID_ID');
    }
    const r = await Reflection.findOne({
      userId: new Types.ObjectId(userId),
      lessonId: new Types.ObjectId(lessonId),
    });
    return r ? toReflectionView(r) : null;
  }

  /** Create or update a convert's reflection for a lesson. */
  async upsert(
    userId: string,
    lessonId: string,
    input: { text?: string; actionStepDone?: boolean }
  ): Promise<ReflectionView> {
    if (!Types.ObjectId.isValid(lessonId)) {
      throw new AppError('Invalid lesson ID', 400, 'INVALID_ID');
    }
    const lesson = await Lesson.findOne({
      _id: new Types.ObjectId(lessonId),
      isDeleted: false,
    });
    if (!lesson) throw new NotFoundError('Lesson', lessonId);

    const set: Record<string, unknown> = {};
    if (input.text !== undefined) set.text = input.text;
    if (input.actionStepDone !== undefined) set.actionStepDone = input.actionStepDone;

    const r = await Reflection.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), lessonId: new Types.ObjectId(lessonId) },
      { $set: set, $setOnInsert: { courseId: lesson.courseId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return toReflectionView(r);
  }

  /** All of a convert's reflections, joined with lesson titles (mentor/admin). */
  async listForConvert(convertId: string): Promise<ReflectionWithLessonView[]> {
    if (!Types.ObjectId.isValid(convertId)) {
      throw new AppError('Invalid convert ID', 400, 'INVALID_ID');
    }
    const reflections = await Reflection.find({
      userId: new Types.ObjectId(convertId),
    }).sort({ updatedAt: -1 });

    if (reflections.length === 0) return [];

    const lessonIds = reflections.map((r) => r.lessonId);
    const lessons = await Lesson.find({ _id: { $in: lessonIds } }).select('title');
    const titleMap = new Map(lessons.map((l) => [l._id.toString(), l.title]));

    return reflections.map((r) => ({
      ...toReflectionView(r),
      lessonTitle: titleMap.get(r.lessonId.toString()) ?? 'Lesson',
    }));
  }
}

export const reflectionService = new ReflectionService();
