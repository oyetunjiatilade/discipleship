import { Request, Response } from 'express';
import { notificationService } from './notification.service';
import { NotificationType } from './notification.model';
import { DiscipleshipStage } from '../../shared/constants/stages';
import { sendSuccess, sendNoContent } from '../../shared/utils/response';

class NotificationController {
  // ════════════════════════════════════════════
  //  Convert — Own Notifications
  // ════════════════════════════════════════════

  /**
   * GET /v1/notifications
   * List own notifications (paginated, newest first).
   * Query: type, isRead, page, limit
   */
  async listNotifications(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { page, limit, type, isRead } = req.query as Record<string, string>;

    const result = await notificationService.getNotifications(userId, {
      page,
      limit,
      type: type as NotificationType | undefined,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
    });

    sendSuccess(res, 200, result.notifications, result.meta);
  }

  /**
   * GET /v1/notifications/unread-count
   * Get unread notification count (for badge display).
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const count = await notificationService.getUnreadCount(userId);
    sendSuccess(res, 200, { unreadCount: count });
  }

  /**
   * PATCH /v1/notifications/:notificationId/read
   * Mark a single notification as read.
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { notificationId } = req.params;

    const notification = await notificationService.markAsRead(userId, notificationId);
    sendSuccess(res, 200, notification);
  }

  /**
   * PATCH /v1/notifications/read-all
   * Mark all unread notifications as read.
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const count = await notificationService.markAllAsRead(userId);
    sendSuccess(res, 200, { markedCount: count });
  }

  /**
   * DELETE /v1/notifications/:notificationId
   * Dismiss (delete) a single notification.
   */
  async deleteNotification(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { notificationId } = req.params;

    await notificationService.deleteNotification(userId, notificationId);
    sendNoContent(res);
  }

  // ════════════════════════════════════════════
  //  Admin — Send & Broadcast
  // ════════════════════════════════════════════

  /**
   * POST /v1/admin/notifications/send
   * Send a notification to a specific convert.
   */
  async sendToConvert(req: Request, res: Response): Promise<void> {
    const { convertId, title, message } = req.body;

    const notification = await notificationService.sendToConvert(
      req.user!,
      convertId,
      title,
      message
    );

    sendSuccess(res, 201, notification);
  }

  /**
   * POST /v1/admin/notifications/broadcast
   * Broadcast a notification to all active converts.
   * Optionally filter by discipleship stage.
   */
  async broadcast(req: Request, res: Response): Promise<void> {
    const { title, message, stage } = req.body;

    const count = await notificationService.broadcast(
      req.user!,
      title,
      message,
      stage as DiscipleshipStage | undefined
    );

    sendSuccess(res, 201, {
      sent: count,
      message: `Notification broadcast to ${count} convert(s).`,
    });
  }
}

export const notificationController = new NotificationController();
