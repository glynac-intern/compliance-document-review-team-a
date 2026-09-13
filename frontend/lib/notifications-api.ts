import { apiFetch } from "./api-client";

export interface BackendNotification {
  id: string;
  document_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export const notificationsApi = {
  list: (): Promise<BackendNotification[]> => apiFetch<BackendNotification[]>("/notifications"),

  getUnreadCount: (): Promise<UnreadCountResponse> =>
    apiFetch<UnreadCountResponse>("/notifications/unread-count"),

  markAsRead: (notificationId: string): Promise<BackendNotification> =>
    apiFetch<BackendNotification>(`/notifications/${notificationId}/read`, {
      method: "POST",
    }),
};
