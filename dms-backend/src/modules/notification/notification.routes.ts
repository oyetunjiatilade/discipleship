import { Router } from 'express';
import { notificationController } from './notification.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import {
  listNotificationsSchema,
  notificationIdParamSchema,
  sendNotificationSchema,
  broadcastSchema,
} from './notification.validation';

// ══════════════════════════════════════════════
//  CONVERT ROUTES — mounted at /v1/notifications
//  (authenticate middleware applied in app.ts)
// ══════════════════════════════════════════════

const convertRouter = Router();

/**
 * GET /v1/notifications
 * List own notifications (paginated).
 * Query: type, isRead, page, limit
 */
convertRouter.get(
  '/',
  validate(listNotificationsSchema),
  asyncHandler(notificationController.listNotifications.bind(notificationController))
);

/**
 * GET /v1/notifications/unread-count
 * Get unread notification count (for badge).
 */
convertRouter.get(
  '/unread-count',
  asyncHandler(notificationController.getUnreadCount.bind(notificationController))
);

/**
 * PATCH /v1/notifications/read-all
 * Mark all unread notifications as read.
 * MUST come before /:notificationId routes to avoid param capture.
 */
convertRouter.patch(
  '/read-all',
  asyncHandler(notificationController.markAllAsRead.bind(notificationController))
);

/**
 * PATCH /v1/notifications/:notificationId/read
 * Mark a single notification as read.
 */
convertRouter.patch(
  '/:notificationId/read',
  validate(notificationIdParamSchema),
  asyncHandler(notificationController.markAsRead.bind(notificationController))
);

/**
 * DELETE /v1/notifications/:notificationId
 * Dismiss (delete) a single notification.
 */
convertRouter.delete(
  '/:notificationId',
  validate(notificationIdParamSchema),
  asyncHandler(notificationController.deleteNotification.bind(notificationController))
);

// ══════════════════════════════════════════════
//  ADMIN ROUTES — mounted at /v1/admin/notifications
//  (authenticate + authorize('admin') applied in app.ts)
// ══════════════════════════════════════════════

const adminRouter = Router();

/**
 * POST /v1/admin/notifications/send
 * Send a notification to a specific convert.
 */
adminRouter.post(
  '/send',
  validate(sendNotificationSchema),
  asyncHandler(notificationController.sendToConvert.bind(notificationController))
);

/**
 * POST /v1/admin/notifications/broadcast
 * Broadcast a notification to all active converts (or by stage).
 */
adminRouter.post(
  '/broadcast',
  validate(broadcastSchema),
  asyncHandler(notificationController.broadcast.bind(notificationController))
);

export {
  convertRouter as notificationConvertRoutes,
  adminRouter as notificationAdminRoutes,
};
