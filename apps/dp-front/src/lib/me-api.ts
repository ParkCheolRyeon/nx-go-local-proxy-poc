import { apiFetch } from '@/lib/api';
import type { ApiUser } from '@/lib/auth-api';

export type PatchMeInput = {
  locale?: 'ko' | 'en' | 'ja';
  country?: string;
};

export function patchMe(input: PatchMeInput): Promise<ApiUser> {
  return apiFetch<ApiUser>('/me', { method: 'PATCH', json: input });
}
