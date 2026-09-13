/**
 * TA-71: real notifications, wired to the backend built in TA-29 --
 * "depends on the backend notification story" was stale; list,
 * unread-count, and mark-as-read all already existed and worked.
 */

import { apiFetch } from "./api-client";

export interface AppNotification {
  id: string;
  document_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list: (): Promise<AppNotification[]> => apiFetch<AppNotification[]>("/notifications"),

  getUnreadCount: (): Promise<{ unread_count: number }> =>
    apiFetch<{ unread_count: number }>("/notifications/unread-count"),

  markAsRead: (notificationId: string): Promise<AppNotification> =>
    apiFetch<AppNotification>(`/notifications/${notificationId}/read`, { method: "POST" }),
};
