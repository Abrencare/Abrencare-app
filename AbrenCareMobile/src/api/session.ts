import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { apiBaseUrl } from '@/api/config';

const REFRESH_KEY = 'abrencare.refresh';
const ACCESS_KEY = 'abrencare.access';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let loaded = false;
let generation = 0;
const memory = new Map<string, string>();

async function readKey(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return memory.get(key) ?? null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeKey(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (value) {
      memory.set(key, value);
    } else {
      memory.delete(key);
    }
    return;
  }
  try {
    if (value) {
      await SecureStore.setItemAsync(key, value);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // The in-memory token still covers this process.
  }
}

function jwtExpiry(token: string): number | null {
  const part = token.split('.')[1];
  if (!part || typeof globalThis.atob !== 'function') {
    return null;
  }
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = JSON.parse(globalThis.atob(padded)) as { exp?: unknown };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function accessIsUsable(token: string | null) {
  if (!token) {
    return false;
  }
  const exp = jwtExpiry(token);
  if (!exp) {
    return true;
  }
  return exp - Date.now() > 30_000;
}

async function load() {
  if (loaded) {
    return;
  }
  loaded = true;
  refreshToken = await readKey(REFRESH_KEY);
  const storedAccess = await readKey(ACCESS_KEY);
  if (accessIsUsable(storedAccess)) {
    accessToken = storedAccess;
  }
}

export async function hasSession() {
  await load();
  return Boolean(accessToken || refreshToken);
}

export async function peekRefreshToken() {
  await load();
  return refreshToken;
}

export async function readAccessToken() {
  await load();
  if (accessIsUsable(accessToken)) {
    return accessToken;
  }
  if (refreshToken) {
    return refreshAccessToken();
  }
  return null;
}

export async function saveSession(access: string, refresh: string | null) {
  generation += 1;
  accessToken = access;
  refreshToken = refresh;
  loaded = true;
  await writeKey(REFRESH_KEY, refresh);
  await writeKey(ACCESS_KEY, refresh ? null : access);
}

export async function clearSession() {
  generation += 1;
  accessToken = null;
  refreshToken = null;
  loaded = true;
  await writeKey(REFRESH_KEY, null);
  await writeKey(ACCESS_KEY, null);
}

let refreshing: Promise<string | null> | null = null;

export function refreshAccessToken() {
  if (!refreshing) {
    refreshing = refreshOnce().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function refreshOnce(): Promise<string | null> {
  await load();
  const refresh = refreshToken;
  const base = apiBaseUrl();
  const stamp = generation;
  if (!refresh || !base) {
    return accessIsUsable(accessToken) ? accessToken : null;
  }

  try {
    const response = await fetch(`${base}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh }),
      credentials: 'omit',
      cache: 'no-store',
    });
    if (stamp !== generation) {
      return null;
    }
    if (!response.ok) {
      await clearSession();
      return null;
    }
    const body = (await response.json().catch(() => null)) as {
      access?: unknown;
      refresh?: unknown;
    } | null;
    const access = typeof body?.access === 'string' ? body.access : null;
    const nextRefresh = typeof body?.refresh === 'string' ? body.refresh : refresh;
    if (!access || stamp !== generation) {
      if (!access) {
        await clearSession();
      }
      return null;
    }
    accessToken = access;
    refreshToken = nextRefresh;
    await writeKey(REFRESH_KEY, nextRefresh);
    await writeKey(ACCESS_KEY, null);
    return access;
  } catch {
    return accessIsUsable(accessToken) ? accessToken : null;
  }
}
