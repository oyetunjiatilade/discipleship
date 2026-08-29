import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Stage transition audit log document.
 * Immutable — records are never updated or deleted.
 */
export interface IStageTransition extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  fromStage: string | null;  // null for initial assignment
  toStage: string;
  trigger: 'auto' | 'admin_manual';
  triggeredBy: Types.ObjectId | null; // admin userId if manual
  reason: string | null;
  metadata: Record<string, unknown> | null;
  transitionedAt: Date;
}

const stageTransitionSchema = new Schema<IStageTransition>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fromStage: {
      type: String,
      default: null,
    },
    toStage: {
      type: String,
      required: true,
    },
    trigger: {
      type: String,
      enum: ['auto', 'admin_manual'],
      required: true,
    },
    triggeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    transitionedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We use transitionedAt, not createdAt/updatedAt
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ──

// Fetch full history for a convert (newest first)
stageTransitionSchema.index({ userId: 1, transitionedAt: -1 });

// Admin reporting: how many baptisms this month, etc.
stageTransitionSchema.index({ toStage: 1, transitionedAt: -1 });

export const StageTransition = mongoose.model<IStageTransition>(
  'StageTransition',
  stageTransitionSchema
);
