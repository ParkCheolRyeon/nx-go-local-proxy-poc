import { apiFetch } from '@/lib/api';
import type { ChildDrawingLevel, ChildProfile, ChildProfileEmoji } from '@/stores/userStore';

export type ApiChild = {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  profileEmoji: ChildProfileEmoji;
  drawingLevel: ChildDrawingLevel;
  createdAt: string; // RFC3339
  updatedAt: string;
};

type ListChildrenResponse = {
  items: ApiChild[];
};

export type CreateChildRequest = {
  name: string;
  birthDate: string;
  profileEmoji: ChildProfileEmoji;
  drawingLevel: ChildDrawingLevel;
};

export type UpdateChildRequest = Partial<CreateChildRequest>;

export function listChildren(): Promise<ApiChild[]> {
  return apiFetch<ListChildrenResponse>('/children').then((r) => r.items);
}

export function getChild(id: string): Promise<ApiChild> {
  return apiFetch<ApiChild>(`/children/${id}`);
}

export function createChild(input: CreateChildRequest): Promise<ApiChild> {
  return apiFetch<ApiChild>('/children', { method: 'POST', json: input });
}

export function updateChild(id: string, input: UpdateChildRequest): Promise<ApiChild> {
  return apiFetch<ApiChild>(`/children/${id}`, { method: 'PATCH', json: input });
}

export function deleteChild(id: string): Promise<void> {
  return apiFetch<void>(`/children/${id}`, { method: 'DELETE' });
}

export function apiChildToStoreChild(c: ApiChild): ChildProfile {
  return {
    id: c.id,
    name: c.name,
    birthDate: c.birthDate,
    profileEmoji: c.profileEmoji,
    drawingLevel: c.drawingLevel,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}
