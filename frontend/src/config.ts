/**
 * Application environment configuration for REST API and WebSocket communication.
 *
 * Supports:
 * - Local development: VITE_API_BASE_URL and VITE_WS_BASE_URL can be omitted or empty,
 *   preserving relative URLs for REST (proxied by Vite or Nginx) and window.location for WebSockets.
 * - Production: VITE_API_BASE_URL and VITE_WS_BASE_URL point to the remote backend (e.g. Render).
 */

export function sanitizeBaseUrl(url?: string | null): string {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
}

function getRawApiBase(): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.VITE_API_BASE_URL;
}

function getRawWsBase(): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.VITE_WS_BASE_URL;
}

export function resolveApiBaseUrl(envValue?: string): string {
  if (envValue !== undefined) {
    return sanitizeBaseUrl(envValue);
  }
  return sanitizeBaseUrl(getRawApiBase() ?? '');
}

export function resolveWsBaseUrl(
  envValue?: string,
  mockLocation?: { protocol: string; host: string }
): string {
  if (envValue !== undefined && envValue.trim() !== '') {
    return sanitizeBaseUrl(envValue);
  }

  const envVal = getRawWsBase();
  const resolved = sanitizeBaseUrl(envVal ?? '');
  if (resolved) {
    return resolved;
  }

  // Fallback to local host/protocol logic
  const loc = mockLocation ?? (typeof window !== 'undefined' ? window.location : undefined);
  if (loc && loc.host) {
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${loc.host}`;
  }

  return 'ws://localhost:8080';
}

export const API_BASE_URL = resolveApiBaseUrl();
export const WS_BASE_URL = resolveWsBaseUrl();
export const getWsBaseUrl = resolveWsBaseUrl;

/**
 * Builds a normalized REST API endpoint URL without double slashes.
 * e.g. buildApiUrl('/api/game/state') -> 'https://claimgrid-m3af.onrender.com/api/game/state'
 * or (local) -> '/api/game/state'
 */
export function buildApiUrl(path: string, baseUrl: string = API_BASE_URL): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}

/**
 * Builds a normalized WebSocket URL with query parameters without double slashes.
 * e.g. buildWsUrl('/ws/game', { playerId: '123' })
 * -> 'wss://claimgrid-m3af.onrender.com/ws/game?playerId=123'
 * or (local) -> 'ws://localhost:3000/ws/game?playerId=123'
 */
export function buildWsUrl(
  path: string = '/ws/game',
  params?: Record<string, string | number | undefined | null>,
  wsBase: string = resolveWsBaseUrl()
): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const query = new URLSearchParams();

  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && String(val).length > 0) {
        query.set(key, String(val));
      }
    }
  }

  const queryString = query.toString() ? `?${query.toString()}` : '';
  return `${wsBase}${cleanPath}${queryString}`;
}
