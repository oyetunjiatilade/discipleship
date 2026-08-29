import mongoose, { Schema, Document, Types } from 'mongoose';
import { NotificationType, NOTIFICATION_TYPES } from './notification.model';

/**
 * Notification outbox — durability layer for event notifications.
 *
 * When a direct notification write fails (transient DB blip, process restart
 * mid-call), the event is written here instead of being silently lost. A
 * scheduled processor retries delivery with backoff until it succeeds or
 * exhausts its attempts.
 */
export interface INotificationOutbox extends Document {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  expiresAt?: Date | null;
  status: 'pending' | 'done' | 'failed';
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastError?: string | null;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const outboxSchema = new Schema<INotificationOutbox>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: null },
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: ['pending', 'done', 'failed'], default: 'pending', index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    nextAttemptAt: { type: Date, default: () => new Date(), index: true },
    lastError: { type: String, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { transform(_d, r: Record<string, unknown>) { delete r.__v; return r; } } }
);

outboxSchema.index({ status: 1, nextAttemptAt: 1 });

export const NotificationOutbox = mongoose.model<INotificationOutbox>(
  'NotificationOutbox',
  outboxSchema
);
