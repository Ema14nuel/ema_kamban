import { useAuthStore } from '../store/authStore';
import { sessionEpoch, assertCurrentSession } from './session';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const epoch = sessionEpoch();
  const access = useAuthStore.getState().accessToken;
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (access) headers.set('Authorization', `Bearer ${access}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  assertCurrentSession(epoch);
  if (res.status === 401 && retry) {
    const refreshed = await useAuthStore.getState().refreshAccessToken();
    assertCurrentSession(epoch);
    if (refreshed) return request<T>(path, options, false);
    useAuthStore.getState().logout();
    throw new ApiError(401, null);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    assertCurrentSession(epoch);
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json();
  assertCurrentSession(epoch);
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  del: (path: string) => request<void>(path, { method: 'DELETE' }),
};
