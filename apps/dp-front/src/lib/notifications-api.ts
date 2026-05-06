import { apiFetch } from '@/lib/api';
import type { NotificationCategory } from '@/stores/userStore';

export type ApiNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  icon?: string;
  cta?: string;
  readStatus: 'read' | 'unRead';
  createdAt: string;
};

type ListNotificationsResponse = {
  items: ApiNotification[];
  unreadCount: number;
};

export type ListNotificationsParams = {
  category?: NotificationCategory;
  limit?: number;
  offset?: number;
};

function buildQuery(params: ListNotificationsParams): string {
  const sp = new URLSearchParams();
  if (params.category) sp.set('category', params.category);
  if (params.limit !== undefined) sp.set('limit', String(params.limit));
  if (params.offset !== undefined) sp.set('offset', String(params.offset));
  const q = sp.toString();
  return q ? `?${q}` : '';
}

export function listNotifications(params: ListNotificationsParams = {}): Promise<ListNotificationsResponse> {
  return apiFetch<ListNotificationsResponse>(`/notifications${buildQuery(params)}`);
}

export function markNotificationRead(id: string): Promise<void> {
  return apiFetch<void>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<void> {
  return apiFetch<void>('/notifications/read-all', { method: 'PATCH' });
}

export type CreateNotificationRequest = {
  category: NotificationCategory;
  title: string;
  description: string;
  icon?: string;
  cta?: string;
};

export function createNotification(input: CreateNotificationRequest): Promise<ApiNotification> {
  return apiFetch<ApiNotification>('/notifications', { method: 'POST', json: input });
}

// push tokens -----------------------------------------------------------------

export type PushPlatform = 'ios' | 'android' | 'web';

export function registerPushToken(platform: PushPlatform, token: string): Promise<void> {
  return apiFetch<void>('/push-tokens', { method: 'POST', json: { platform, token } });
}

export function unregisterPushToken(token: string): Promise<void> {
  return apiFetch<void>('/push-tokens', { method: 'DELETE', json: { token } });
}
