import Constants from 'expo-constants';

/**
 * Backend origin for the Django API.
 * Set EXPO_PUBLIC_API_URL, or expo.extra.apiUrl, to the HTTPS origin
 * (for example https://api.example.com). No path, no trailing slash.
 * Plain HTTP is accepted only for a local development host.
 */
function rawBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const extra = Constants.expoConfig?.extra?.apiUrl;
  const value =
    (typeof fromEnv === 'string' && fromEnv.trim()) ||
    (typeof extra === 'string' ? extra.trim() : '');
  return value.replace(/\/+$/, '');
}

export function apiBaseUrl(): string | null {
  const value = rawBase();
  if (!value) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2';
  if (url.protocol === 'https:') {
    return url.origin;
  }
  if (url.protocol === 'http:' && local) {
    return url.origin;
  }
  return null;
}

export function isApiConfigured() {
  return apiBaseUrl() !== null;
}
