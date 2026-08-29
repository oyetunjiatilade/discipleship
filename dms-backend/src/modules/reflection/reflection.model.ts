import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * A convert's personal reflection on a lesson: what they took away and
 * whether they've done the lesson's action step. This turns passive
 * watching into practice and gives mentors real conversation starters.
 * One reflection per convert per lesson (upserted).
 */
export interface IReflection extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  lessonId: Types.ObjectId;
  courseId: Types.ObjectId;
  text: string;
  actionStepDone: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReflectionView {
  lessonId: string;
  text: string;
  actionStepDone: boolean;
  updatedAt: Date;
}

export interface ReflectionWithLessonView extends ReflectionView {
  lessonTitle: string;
}

const reflectionSchema = new Schema<IReflection>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    text: { type: String, trim: true, maxlength: 5000, default: '' },
    actionStepDone: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

reflectionSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
reflectionSchema.index({ userId: 1, updatedAt: -1 });

export function toReflectionView(r: IReflection): ReflectionView {
  return {
    lessonId: r.lessonId.toString(),
    text: r.text,
    actionStepDone: r.actionStepDone,
    updatedAt: r.updatedAt,
  };
}

export const Reflection = mongoose.model<IReflection>('Reflection', reflectionSchema);
