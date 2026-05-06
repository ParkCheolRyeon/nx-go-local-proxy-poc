const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

const ACCESS_TOKEN_KEY = 'igallery:accessToken';
const REFRESH_TOKEN_KEY = 'igallery:refreshToken';

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
  }
}

// access token storage --------------------------------------------------------

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token === null) window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  else window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

// refresh token storage -------------------------------------------------------

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token === null) window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  else window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearStoredTokens(): void {
  setStoredAccessToken(null);
  setStoredRefreshToken(null);
}

// refresh logic (single-flight) -----------------------------------------------

type RefreshResponse = {
  accessToken: string;
  expiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
};

let refreshInFlight: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) throw new ApiError(401, 'no refresh token');

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearStoredTokens();
    throw new ApiError(res.status, 'refresh failed');
  }

  const text = await res.text().catch(() => '');
  if (!text) {
    clearStoredTokens();
    throw new ApiError(500, 'empty refresh response');
  }
  const body = JSON.parse(text) as RefreshResponse;
  setStoredAccessToken(body.accessToken);
  setStoredRefreshToken(body.refreshToken);
  return body.accessToken;
}

function refreshAccess(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// apiFetch --------------------------------------------------------------------

type RequestOptions = RequestInit & {
  json?: unknown;
  /** 내부 재시도 표시 — 외부 사용자 호출에는 쓰지 말 것. */
  _retriedAfterRefresh?: boolean;
  /** /auth/refresh 같이 refresh 인터셉터를 우회해야 하는 호출용. */
  _skipRefresh?: boolean;
};

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, headers, _retriedAfterRefresh, _skipRefresh, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    ...((headers as Record<string, string>) ?? {}),
  };

  let body = rest.body;
  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  const token = getStoredAccessToken();
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...rest, body, headers: finalHeaders });

  // 401 + refresh 토큰 보유 + 아직 재시도 안 함 + skip 플래그 없음 → refresh 후 1회 재시도
  if (
    res.status === 401 &&
    !_retriedAfterRefresh &&
    !_skipRefresh &&
    getStoredRefreshToken()
  ) {
    try {
      await refreshAccess();
    } catch {
      clearStoredTokens();
      throw new ApiError(401, '세션이 만료되었습니다.');
    }
    return apiFetch<T>(path, { ...options, _retriedAfterRefresh: true });
  }

  if (!res.ok) {
    let detail = res.statusText;
    // res.json() 은 빈 바디 / non-JSON 응답에서 SyntaxError 를 던짐.
    // text() 로 먼저 받은 뒤 JSON.parse 시도.
    const text = await res.text().catch(() => '');
    if (text) {
      try {
        const errBody = JSON.parse(text);
        detail = errBody.detail ?? errBody.title ?? detail;
      } catch {
        // body 가 JSON 아님 — statusText 유지
      }
    }

    if (res.status === 401) clearStoredTokens();
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
