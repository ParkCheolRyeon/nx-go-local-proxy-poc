import { apiFetch } from '@/lib/api';

export type DrawingMode = 'coloring' | 'stepwise' | 'freeform' | 'together';
export type DrawingStatus = 'in_progress' | 'completed';
export type AwardRank = 'grand' | 'gold' | 'silver' | 'bronze' | 'encourage';

export type ApiDrawing = {
  id: string;
  childProfileId: string;
  mode: DrawingMode;
  title: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  timelapseUrl?: string;
  isPublic: boolean;
  status: DrawingStatus;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiAwardEntry = {
  awardId: string;
  rank: AwardRank;
  eventId?: string;
  awardedAt: string;
  drawingId: string;
  mode: DrawingMode;
  title: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  timelapseUrl?: string;
  isPublic: boolean;
  completedAt?: string;
};

type ListDrawingsResponse = { items: ApiDrawing[] };
type ListAwardsResponse = { items: ApiAwardEntry[] };

export type ListDrawingsParams = {
  status?: DrawingStatus;
  visibility?: 'public';
  month?: string; // YYYY-MM
  limit?: number;
  offset?: number;
};

function buildQuery(params: ListDrawingsParams): string {
  const sp = new URLSearchParams();
  if (params.status) sp.set('status', params.status);
  if (params.visibility) sp.set('visibility', params.visibility);
  if (params.month) sp.set('month', params.month);
  if (params.limit !== undefined) sp.set('limit', String(params.limit));
  if (params.offset !== undefined) sp.set('offset', String(params.offset));
  const q = sp.toString();
  return q ? `?${q}` : '';
}

export function listDrawings(childId: string, params: ListDrawingsParams = {}): Promise<ApiDrawing[]> {
  return apiFetch<ListDrawingsResponse>(`/children/${childId}/drawings${buildQuery(params)}`).then(
    (r) => r.items,
  );
}

export function getDrawing(id: string): Promise<ApiDrawing> {
  return apiFetch<ApiDrawing>(`/drawings/${id}`);
}

export type CreateDrawingRequest = {
  childProfileId: string;
  mode: DrawingMode;
  title?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  timelapseUrl?: string;
  isPublic?: boolean;
  status?: DrawingStatus;
};

export function createDrawing(input: CreateDrawingRequest): Promise<ApiDrawing> {
  return apiFetch<ApiDrawing>('/drawings', { method: 'POST', json: input });
}

export type UpdateDrawingRequest = {
  title?: string;
  isPublic?: boolean;
  status?: DrawingStatus;
};

export function updateDrawing(id: string, input: UpdateDrawingRequest): Promise<ApiDrawing> {
  return apiFetch<ApiDrawing>(`/drawings/${id}`, { method: 'PATCH', json: input });
}

export function deleteDrawing(id: string): Promise<void> {
  return apiFetch<void>(`/drawings/${id}`, { method: 'DELETE' });
}

export function listAwards(childId: string): Promise<ApiAwardEntry[]> {
  return apiFetch<ListAwardsResponse>(`/children/${childId}/awards`).then((r) => r.items);
}
