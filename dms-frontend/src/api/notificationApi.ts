import apiClient from './client';
import type { ApiSuccessResponse, PaginationMeta } from '@/types/api';
import type { Notification } from '@/types/models';
import type { NotificationType } from '@/constants/enums';

/**
 * Notification API — convert-facing notification access.
 *
 * Routes:  GET    /v1/notifications
 *          GET    /v1/notifications/unread-count
 *          PATCH  /v1/notifications/read-all
 *          PATCH  /v1/notifications/:notificationId/read
 *          DELETE /v1/notifications/:notificationId
 *
 * Note: listNotifications returns data as the array at data level,
 * with meta at the top level of the response envelope.
 */

interface ListNotificationsParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
}

interface ListNotificationsResponse {
  notifications: Notification[];
  meta: PaginationMeta;
}

export const notificationApi = {
  /** GET /v1/notifications — paginated, filterable by type and isRead */
  list: async (params: ListNotificationsParams = {}): Promise<ListNotificationsResponse> => {
    const query: Record<string, string> = {};
    if (params.page) query.page = String(params.page);
    if (params.limit) query.limit = String(params.limit);
    if (params.type) query.type = params.type;
    if (params.isRead !== undefined) query.isRead = String(params.isRead);

    const { data } = await apiClient.get<ApiSuccessResponse<Notification[]>>(
      '/v1/notifications',
      { params: query }
    );
    return {
      notifications: data.data,
      meta: data.meta!,
    };
  },

  /** GET /v1/notifications/unread-count */
  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<ApiSuccessResponse<{ unreadCount: number }>>(
      '/v1/notifications/unread-count'
    );
    return data.data.unreadCount;
  },

  /** PATCH /v1/notifications/:notificationId/read */
  markAsRead: async (notificationId: string): Promise<Notification> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<Notification>>(
      `/v1/notifications/${notificationId}/read`
    );
    return data.data;
  },

  /** PATCH /v1/notifications/read-all */
  markAllAsRead: async (): Promise<number> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<{ markedCount: number }>>(
      '/v1/notifications/read-all'
    );
    return data.data.markedCount;
  },

  /** DELETE /v1/notifications/:notificationId — 204 No Content */
  delete: async (notificationId: string): Promise<void> => {
    await apiClient.delete(`/v1/notifications/${notificationId}`);
  },
};
