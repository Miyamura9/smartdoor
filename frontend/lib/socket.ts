import { io, Socket } from 'socket.io-client';
import { getToken, logout } from './auth';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url   = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const token = getToken();

    socket = io(url, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      autoConnect: true,
      // Send JWT token on handshake
      auth: { token: token || '' },
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      // If auth error → logout
      if (err.message.includes('Authentication') || err.message.includes('token')) {
        console.warn('[Socket] Auth error — logging out');
        logout();
      }
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Event types for type safety
export interface DoorStatusEvent {
  status: 'LOCKED' | 'UNLOCKED';
  timestamp: string;
}

export interface DoorLogEvent {
  id: number;
  method: 'RFID' | 'FINGERPRINT' | 'KEYPAD' | 'REMOTE';
  status: 'SUCCESS' | 'FAILED';
  uid?: string;
  message?: string;
  createdAt: string;
}

export interface DoorAlertEvent {
  message: string;
  level: 'warning' | 'danger' | 'info';
}
