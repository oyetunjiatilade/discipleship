import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Notification categories — determines icon, color, and grouping on frontend.
 */
export type NotificationType =
  | 'stage_transition'
  | 'lesson_completed'
  | 'course_completed'
  | 'quiz_passed'
  | 'quiz_failed'
  | 'welcome'
  | 'admin_message'
  | 'reminder'
  | 'system';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'stage_transition',
  'lesson_completed',
  'course_completed',
  'quiz_passed',
  'quiz_failed',
  'welcome',
  'admin_message',
  'reminder',
  'system',
];

/**
 * Notification document interface.
 */
export interface INotification extends Document {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: Date | null;
  metadata: Record<string, unknown> | null; // e.g., { lessonId, quizId, stage }
  expiresAt: Date | null;  // TTL — auto-delete stale notifications
  createdAt: Date;
}

/**
 * Notification view returned to the client.
 */
export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ──

// Primary query: user's notifications (newest first)
notificationSchema.index({ recipientId: 1, createdAt: -1 });

// Unread count: fast unread badge query
notificationSchema.index({ recipientId: 1, isRead: 1 });

// TTL index: auto-delete expired notifications (MongoDB handles this)
notificationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $ne: null } } }
);

/**
 * Transform a notification document into the API view.
 */
export function toNotificationView(notification: INotification): NotificationView {
  return {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    readAt: notification.readAt,
    metadata: notification.metadata,
    createdAt: notification.createdAt,
  };
}

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
