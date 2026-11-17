import { apiBaseUrl } from '@/api/config';
import { ApiError, messageFromBody, parseRetryAfter } from '@/api/errors';
import { clearSession, readAccessToken, refreshAccessToken } from '@/api/session';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: Method;
  body?: unknown;
  /** Authenticated family calls send a bearer token. Public invitation calls do not. */
  auth?: boolean;
  retry?: boolean;
};

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const base = apiBaseUrl();
  if (!base) {
    throw new ApiError(0, 'API is not configured.');
  }
  if (!path.startsWith('/api/')) {
    throw new ApiError(0, 'Invalid API path.');
  }

  const method = options.method ?? 'GET';
  const auth = options.auth !== false;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const access = await readAccessToken();
    if (!access) {
      throw new ApiError(401, 'Sign in again to continue.');
    }
    headers.Authorization = `Bearer ${access}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'The care service could not be reached.');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 && auth && options.retry !== false) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest(path, { ...options, retry: false });
    }
    await clearSession();
    throw new ApiError(401, 'Sign in again to continue.');
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('json')
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const parsed = messageFromBody(payload);
    const revoked = response.status === 403 && parsed.revoked;
    if (response.status === 401) {
      await clearSession();
    }
    throw new ApiError(
      response.status,
      response.status === 401 ? 'Sign in again to continue.' : parsed.message,
      parseRetryAfter(response.headers.get('retry-after')),
      revoked,
      parsed.fields,
    );
  }

  return payload as T;
}
