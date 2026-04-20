import createClient from 'openapi-fetch';
import type { paths } from './types';

export function createApiClient(baseUrl: string) {
  return createClient<paths>({
    baseUrl,
    credentials: 'include',
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
