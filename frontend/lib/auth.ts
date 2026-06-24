/**
 * Client-side auth utilities — stores JWT in localStorage.
 * All functions are safe to call only in browser context.
 */

const TOKEN_KEY = 'sdl_token';
const USER_KEY  = 'sdl_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): { username: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user: { username: string; role: string }): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Decode JWT payload (without verification — verification is server-side).
 * Used to check expiry on the client.
 */
function decodeJWTPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Returns true if a token exists and hasn't expired yet (client-side check only).
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  const payload = decodeJWTPayload(token);
  if (!payload?.exp) return false;
  // Give 60s buffer before expiry
  return payload.exp > Math.floor(Date.now() / 1000) + 60;
}

/**
 * Clear all auth state and redirect to login.
 * Safe to call from any component.
 */
export function logout(): void {
  removeToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
