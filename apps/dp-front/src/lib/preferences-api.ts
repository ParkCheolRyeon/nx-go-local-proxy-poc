import { apiFetch } from '@/lib/api';

export type Preferences = {
  notifDrawing: boolean;
  notifEvent: boolean;
  notifSystem: boolean;
  notifMarketing: boolean;
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  safeMode: boolean;
  paymentLock: boolean;
  togetherChat: boolean;
};

export type PatchPreferencesInput = Partial<Preferences>;

export function getMyPreferences(): Promise<Preferences> {
  return apiFetch<Preferences>('/me/preferences');
}

export function patchMyPreferences(input: PatchPreferencesInput): Promise<Preferences> {
  return apiFetch<Preferences>('/me/preferences', { method: 'PATCH', json: input });
}
