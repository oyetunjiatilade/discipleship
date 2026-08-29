import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Course document interface.
 *
 * Phase 1 constraint: only ONE course (Believers Class) exists.
 * The data model supports multiple courses for future-proofing,
 * but the service layer enforces the single-course constraint.
 */
export interface ICourse extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  isActive: boolean;
  isPrimary: boolean; // the Believers Class that drives the discipleship pipeline
  totalLessons: number; // denormalized count — updated on lesson create/delete
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
      index: true,
    },
    totalLessons: {
      type: Number,
      default: 0,
      min: 0,
    },
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

export const Course = mongoose.model<ICourse>('Course', courseSchema);
