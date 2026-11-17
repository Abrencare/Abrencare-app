import { apiRequest } from '@/api/client';
import { apiBaseUrl, isApiConfigured } from '@/api/config';
import { ApiError, messageFromBody, parseRetryAfter } from '@/api/errors';
import {
  clearSession,
  hasSession,
  peekRefreshToken,
  saveSession,
} from '@/api/session';
import {
  DEFAULT_MONITORING,
  emptyUser,
  isCareService,
  type AuthUser,
  type CareService,
  type Gender,
  type MonitorFrequency,
  type MonitorMetric,
} from '@/types/auth';

function tokensFrom(body: unknown): { access: string; refresh: string | null } | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const row = body as Record<string, unknown>;
  const nested =
    row.tokens && typeof row.tokens === 'object'
      ? (row.tokens as Record<string, unknown>)
      : null;
  const access =
    (typeof row.access === 'string' && row.access) ||
    (typeof nested?.access === 'string' && nested.access) ||
    (typeof row.access_token === 'string' && row.access_token) ||
    '';
  const refresh =
    (typeof row.refresh === 'string' && row.refresh) ||
    (typeof nested?.refresh === 'string' && nested.refresh) ||
    (typeof row.refresh_token === 'string' && row.refresh_token) ||
    null;
  if (!access) {
    return null;
  }
  return { access, refresh };
}

async function postJson(path: string, body: Record<string, string>) {
  const base = apiBaseUrl();
  if (!base) {
    throw new ApiError(0, 'API is not configured.');
  }
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    credentials: 'omit',
    cache: 'no-store',
  });
}

async function readPayload(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('json')
    ? await response.json().catch(() => null)
    : null;
}

async function raiseIfFailed(response: Response, payload: unknown) {
  if (response.ok) {
    return;
  }
  const parsed = messageFromBody(payload);
  throw new ApiError(
    response.status,
    parsed.message,
    parseRetryAfter(response.headers.get('retry-after')),
    false,
    parsed.fields,
  );
}

/**
 * Exchanges the sign-in form for a Django bearer session.
 * The password is sent once in the JSON body and is not stored.
 */
export async function loginWithPassword(email: string, password: string) {
  if (!isApiConfigured()) {
    return;
  }

  const identity = email.trim();
  let response = await postJson('/api/auth/login/', { email: identity, password });
  if (response.status === 400) {
    const probe = await response.clone().json().catch(() => null);
    if (probe && typeof probe === 'object' && 'username' in probe) {
      response = await postJson('/api/auth/login/', {
        username: identity,
        password,
      });
    }
  }

  const payload = await readPayload(response);
  await raiseIfFailed(response, payload);
  const tokens = tokensFrom(payload);
  if (!tokens) {
    throw new ApiError(401, 'Sign in again to continue.');
  }
  await saveSession(tokens.access, tokens.refresh);
}

export async function registerWithPassword(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  service: CareService;
}) {
  if (!isApiConfigured()) {
    return null;
  }

  const response = await postJson('/api/auth/register/', {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    password: input.password,
    service: input.service,
  });
  const payload = await readPayload(response);
  await raiseIfFailed(response, payload);
  const tokens = tokensFrom(payload);
  if (!tokens) {
    throw new ApiError(401, 'Sign in again to continue.');
  }
  await saveSession(tokens.access, tokens.refresh);
  const userBody =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>).user
      : null;
  return userFromApi(userBody);
}

export async function enrollService(service: CareService) {
  if (!isApiConfigured() || !(await hasSession())) {
    return null;
  }
  return userFromApi(
    await apiRequest('/api/auth/services/enroll/', {
      method: 'POST',
      body: { service },
    }),
  );
}

export async function fetchAuthProfile(): Promise<AuthUser | null> {
  if (!isApiConfigured() || !(await hasSession())) {
    return null;
  }
  try {
    return userFromApi(await apiRequest('/api/auth/profile/'));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearSession();
      return null;
    }
    throw error;
  }
}

export async function logoutRemote() {
  if (!isApiConfigured()) {
    await clearSession();
    return;
  }
  try {
    const refresh = await peekRefreshToken();
    // Best-effort blacklist; local session is cleared either way.
    await apiRequest('/api/auth/logout/', {
      method: 'POST',
      body: refresh ? { refresh } : {},
    });
  } catch {
    // Ignore network / auth failures on logout.
  } finally {
    await clearSession();
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function genderFromApi(value: unknown): Gender | null {
  if (value === 'female' || value === 'male' || value === 'other') {
    return value;
  }
  if (value === 'prefer_not' || value === 'preferNot') {
    return 'preferNot';
  }
  return null;
}

function frequencyFromApi(value: unknown): MonitorFrequency {
  return value === 'weekly' || value === 'twice' || value === 'managed'
    ? value
    : 'managed';
}

function monitoringFromApi(value: unknown): MonitorMetric[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_MONITORING];
  }
  const allowed: MonitorMetric[] = [
    'bp',
    'heartRate',
    'oxygen',
    'weight',
    'glucose',
    'general',
  ];
  const next = value.filter((item): item is MonitorMetric =>
    allowed.includes(item as MonitorMetric),
  );
  return next.length ? next : [...DEFAULT_MONITORING];
}

export function userFromApi(value: unknown): AuthUser | null {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  if (!row) {
    return null;
  }

  const email = text(row.email);
  if (!email) {
    return null;
  }

  const first = text(row.first_name);
  const last = text(row.last_name);
  const full = text(row.full_name) || [first, last].filter(Boolean).join(' ');
  const servicesRaw = Array.isArray(row.services) ? row.services : [];
  const services: CareService[] = [];
  let familyOnboarded = false;
  let executiveOnboarded = false;
  let consultationOnboarded = false;

  for (const item of servicesRaw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const entry = item as Record<string, unknown>;
    const code = text(entry.service);
    if (!isCareService(code)) {
      continue;
    }
    services.push(code);
    if (entry.onboarded === true) {
      if (code === 'family') {
        familyOnboarded = true;
      }
      if (code === 'executive') {
        executiveOnboarded = true;
      }
      if (code === 'consultation') {
        consultationOnboarded = true;
      }
    }
  }

  return emptyUser({
    name: full || email.split('@')[0] || 'Nordic AbrenCare member',
    email,
    phone: text(row.phone) || text(row.phone_number),
    services,
    familyOnboarded,
    executiveOnboarded,
    consultationOnboarded,
    dateOfBirth: text(row.dateOfBirth) || text(row.date_of_birth),
    gender: genderFromApi(row.gender),
    heightCm: text(row.heightCm) || (row.height != null ? String(row.height) : ''),
    weightKg: text(row.weightKg) || (row.weight != null ? String(row.weight) : ''),
    monitoring: monitoringFromApi(row.monitoring),
    frequency: frequencyFromApi(row.frequency),
    emailVerified: true,
  });
}
