/**
 * TA-71: real notifications, wired to the backend built in TA-29 --
 * list, unread-count, and mark-as-read all connect to live backend endpoints.
 */

import { apiFetch } from "./api-client";

export interface BackendNotification {
  id: string;
  document_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type AppNotification = BackendNotification;

export interface UnreadCountResponse {
  unread_count: number;
}

export const notificationsApi = {
  list: (): Promise<AppNotification[]> => apiFetch<AppNotification[]>("/notifications"),

  getUnreadCount: (): Promise<UnreadCountResponse> =>
    apiFetch<UnreadCountResponse>("/notifications/unread-count"),

  markAsRead: (notificationId: string): Promise<AppNotification> =>
    apiFetch<AppNotification>(`/notifications/${notificationId}/read`, {
      method: "POST",
    }),
};
