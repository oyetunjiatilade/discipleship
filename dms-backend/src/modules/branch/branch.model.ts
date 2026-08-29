import mongoose, { Schema, Document, Types } from 'mongoose';

/** A church branch (Lagos, Abuja, Ibadan, ...) — the tenant boundary for converts/staff/data. */
export interface IBranch extends Document {
  _id: Types.ObjectId;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BranchView {
  id: string;
  name: string;
  isActive: boolean;
}

const branchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, unique: true },
    isActive: { type: Boolean, default: true, index: true },
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

export function toBranchView(branch: IBranch): BranchView {
  return {
    id: branch._id.toString(),
    name: branch.name,
    isActive: branch.isActive,
  };
}

export const Branch = mongoose.model<IBranch>('Branch', branchSchema);
