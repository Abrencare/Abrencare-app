export class ApiError extends Error {
  status: number;
  retryAfter: number | null;
  fields: Record<string, string>;
  /** True when the family membership itself was revoked. */
  accessRevoked: boolean;

  constructor(
    status: number,
    message: string,
    retryAfter: number | null = null,
    accessRevoked = false,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
    this.accessRevoked = accessRevoked;
    this.fields = fields;
  }
}

export function parseRetryAfter(header: string | null): number | null {
  if (!header) {
    return null;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds);
  }
  const date = Date.parse(header);
  if (Number.isNaN(date)) {
    return null;
  }
  return Math.max(0, Math.round((date - Date.now()) / 1000));
}

export function messageFromBody(body: unknown): {
  message: string;
  fields: Record<string, string>;
  revoked: boolean;
} {
  const fields: Record<string, string> = {};
  let message = 'The request could not be completed.';
  let revoked = false;

  if (body && typeof body === 'object') {
    const row = body as Record<string, unknown>;
    if (typeof row.detail === 'string') {
      message = row.detail.slice(0, 180);
      revoked = /revok/i.test(row.detail);
    }
    for (const [key, value] of Object.entries(row)) {
      if (key === 'detail' || key === 'access' || key === 'refresh') {
        continue;
      }
      const text = Array.isArray(value)
        ? value.find((item) => typeof item === 'string')
        : typeof value === 'string'
          ? value
          : null;
      if (typeof text === 'string' && text.trim()) {
        fields[key] = text.trim().slice(0, 180);
      }
    }
    const first = Object.values(fields)[0];
    if (first && message === 'The request could not be completed.') {
      message = first;
    }
  }

  return { message, fields, revoked };
}
