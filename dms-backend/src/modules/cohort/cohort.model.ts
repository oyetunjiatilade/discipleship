import mongoose, { Schema, Document, Types } from 'mongoose';

/** A cohort = a class intake that goes through discipleship together. */
export interface ICohort extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  branchId: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PostType = 'prayer' | 'praise' | 'message';

/** A post on a cohort's community/prayer feed. */
export interface IPost extends Document {
  _id: Types.ObjectId;
  cohortId: Types.ObjectId;
  authorId: Types.ObjectId;
  authorName: string; // denormalized for display
  type: PostType;
  text: string;
  amenBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CohortView {
  id: string;
  name: string;
  description: string;
  branchId: string;
  isActive: boolean;
  memberCount?: number;
}

export interface PostView {
  id: string;
  authorId: string;
  authorName: string;
  type: PostType;
  text: string;
  amenCount: number;
  amenedByMe: boolean;
  createdAt: Date;
}

const cohortSchema = new Schema<ICohort>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { transform(_d, r: Record<string, unknown>) { delete r.__v; return r; } } }
);

const postSchema = new Schema<IPost>(
  {
    cohortId: { type: Schema.Types.ObjectId, ref: 'Cohort', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true, trim: true },
    type: { type: String, enum: ['prayer', 'praise', 'message'], default: 'message' },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    amenBy: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: true, toJSON: { transform(_d, r: Record<string, unknown>) { delete r.__v; return r; } } }
);

postSchema.index({ cohortId: 1, createdAt: -1 });

export function toCohortView(c: ICohort, memberCount?: number): CohortView {
  return {
    id: c._id.toString(),
    name: c.name,
    description: c.description,
    branchId: c.branchId.toString(),
    isActive: c.isActive,
    ...(memberCount !== undefined ? { memberCount } : {}),
  };
}

export function toPostView(p: IPost, viewerId: string): PostView {
  return {
    id: p._id.toString(),
    authorId: p.authorId.toString(),
    authorName: p.authorName,
    type: p.type,
    text: p.text,
    amenCount: p.amenBy.length,
    amenedByMe: p.amenBy.some((id) => id.toString() === viewerId),
    createdAt: p.createdAt,
  };
}

export const Cohort = mongoose.model<ICohort>('Cohort', cohortSchema);
export const Post = mongoose.model<IPost>('Post', postSchema);
