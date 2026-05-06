import {
  apiFetch,
  clearStoredTokens,
  getStoredRefreshToken,
  setStoredAccessToken,
  setStoredRefreshToken,
} from '@/lib/api';

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  locale: 'ko' | 'en' | 'ja';
  country: string;
  createdAt: string;
};

export type SignUpRequest = {
  email: string;
  password: string;
  name: string;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
};

export type SignInResponse = {
  accessToken: string;
  expiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
  user: ApiUser;
};

export function signUp(input: SignUpRequest): Promise<ApiUser> {
  return apiFetch<ApiUser>('/auth/signup', {
    method: 'POST',
    json: input,
  });
}

export async function signIn(email: string, password: string): Promise<SignInResponse> {
  const result = await apiFetch<SignInResponse>('/auth/signin', {
    method: 'POST',
    json: { email, password },
  });

  setStoredAccessToken(result.accessToken);
  setStoredRefreshToken(result.refreshToken);
  return result;
}

export function getMe(): Promise<ApiUser> {
  return apiFetch<ApiUser>('/me');
}

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export function changePassword(input: ChangePasswordInput): Promise<void> {
  return apiFetch<void>('/auth/password', { method: 'POST', json: input });
}

// signOut — 서버에 logout 알리고 (best-effort) 로컬 토큰 폐기.
// 네트워크 실패해도 로컬은 무조건 정리.
export async function signOut(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  try {
    await apiFetch<void>('/auth/logout', {
      method: 'POST',
      json: { refreshToken: refreshToken ?? '' },
    });
  } catch {
    // 무시 — 로컬 정리는 어쨌든 진행
  } finally {
    clearStoredTokens();
  }
}

// signOutLocal — 서버 호출 없이 로컬만 정리. 401 분기 등 즉시 폐기 케이스용.
export function signOutLocal(): void {
  clearStoredTokens();
}
