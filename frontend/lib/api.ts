import { getToken, logout } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      // Attach JWT if present
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  // Auto-logout on 401 — token expired or invalid
  if (res.status === 401) {
    console.warn('[API] 401 Unauthorized — redirecting to login');
    logout();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(
      `API error ${res.status} on ${path}: ${errorBody || res.statusText}`
    );
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  user: { username: string; role: string };
  message: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Login failed');
  }

  return res.json();
}

export async function loginPin(pin: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'PIN Login failed');
  }
  return res.json();
}

// ─── WebAuthn ──────────────────────────────────────────────────────────────
export async function getWebAuthnRegisterOptions() {
  return apiFetch<any>('/api/auth/webauthn/register-options');
}

export async function verifyWebAuthnRegister(body: any): Promise<{ verified: boolean }> {
  return apiFetch<{ verified: boolean }>('/api/auth/webauthn/register-verify', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getWebAuthnAuthOptions() {
  const res = await fetch(`${BASE_URL}/api/auth/webauthn/auth-options`);
  if (!res.ok) throw new Error('Failed to get auth options');
  return res.json();
}

export async function verifyWebAuthnAuth(body: any): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/webauthn/auth-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Fingerprint login failed');
  }
  return res.json();
}

// ─── Status ────────────────────────────────────────────────────────────────
export interface DoorStatus {
  status: 'LOCKED' | 'UNLOCKED' | 'UNKNOWN';
  updatedAt: string;
}

export async function fetchLatestStatus(): Promise<DoorStatus> {
  return apiFetch<DoorStatus>('/api/status/latest');
}

// ─── Logs ──────────────────────────────────────────────────────────────────
export interface AccessLog {
  id: number;
  method: 'RFID' | 'FINGERPRINT' | 'KEYPAD' | 'REMOTE';
  status: 'SUCCESS' | 'FAILED';
  uid?: string;
  message?: string;
  createdAt: string;
}

export async function fetchLogs(limit = 50): Promise<AccessLog[]> {
  return apiFetch<AccessLog[]>(`/api/logs?limit=${limit}`);
}

// ─── Whitelist ─────────────────────────────────────────────────────────────
export interface RFIDEntry {
  id: number;
  uid: string;
  label?: string;
}

export interface PinEntry {
  id: number;
  pin: string;
  label?: string;
}

export interface Whitelist {
  rfid: RFIDEntry[];
  pins: PinEntry[];
}

export async function fetchWhitelist(): Promise<Whitelist> {
  return apiFetch<Whitelist>('/api/whitelist');
}

// ─── Door Control ──────────────────────────────────────────────────────────
export async function doorUnlock(): Promise<{ success: boolean; message?: string }> {
  return apiFetch('/api/door/unlock', { method: 'POST' });
}

export async function doorLock(): Promise<{ success: boolean; message?: string }> {
  return apiFetch('/api/door/lock', { method: 'POST' });
}

export async function doorPing(): Promise<{ success: boolean; latency?: number }> {
  return apiFetch('/api/door/ping', { method: 'POST' });
}

// ─── RFID Management ───────────────────────────────────────────────────────
export async function addRFID(
  uid: string,
  label?: string
): Promise<{ success: boolean; entry: RFIDEntry }> {
  return apiFetch('/api/whitelist/rfid', {
    method: 'POST',
    body: JSON.stringify({ uid, label }),
  });
}

export async function deleteRFID(uid: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/whitelist/rfid/${encodeURIComponent(uid)}`, {
    method: 'DELETE',
  });
}

// ─── PIN Management ────────────────────────────────────────────────────────
export async function addPin(
  pin: string,
  label?: string
): Promise<{ success: boolean; entry: PinEntry }> {
  return apiFetch('/api/whitelist/pin', {
    method: 'POST',
    body: JSON.stringify({ pin, label }),
  });
}

export async function deletePin(pin: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/whitelist/pin/${encodeURIComponent(pin)}`, {
    method: 'DELETE',
  });
}

// ─── Sync ──────────────────────────────────────────────────────────────────
export async function syncWhitelist(): Promise<{ success: boolean; synced: number }> {
  return apiFetch('/api/whitelist/sync', { method: 'POST' });
}
