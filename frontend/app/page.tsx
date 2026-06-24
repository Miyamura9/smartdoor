'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchLatestStatus,
  fetchLogs,
  fetchWhitelist,
  doorUnlock,
  doorLock,
  doorPing,
  AccessLog,
  Whitelist,
} from '@/lib/api';
import { getSocket, DoorStatusEvent, DoorLogEvent, DoorAlertEvent } from '@/lib/socket';
import { isAuthenticated, getUser, logout } from '@/lib/auth';

import AlertBanner from '@/components/AlertBanner';
import DoorStatusCard from '@/components/DoorStatusCard';
import DoorControlPanel from '@/components/DoorControlPanel';
import SensorBadge from '@/components/SensorBadge';
import AccessLogTable from '@/components/AccessLogTable';
import WhitelistManager from '@/components/WhitelistManager';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import WebAuthnRegister from '@/components/WebAuthnRegister';
import MonitoringDashboard from '@/components/MonitoringDashboard';

type Page = 'home' | 'logs' | 'whitelist' | 'monitoring';
type DoorStatus = 'LOCKED' | 'UNLOCKED' | 'UNKNOWN';

const EMPTY_WHITELIST: Whitelist = { rfid: [], pins: [] };

export default function HomePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [doorStatus, setDoorStatus] = useState<DoorStatus>('UNKNOWN');
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [whitelist, setWhitelist] = useState<Whitelist>(EMPTY_WHITELIST);
  const [alert, setAlert] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated()) {
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        window.location.href = '/login';
      } else {
        router.replace('/login');
      }
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  // ── Register service worker ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  // ── Show alert helper ────────────────────────────────────────────────────
  const showAlert = useCallback((message: string) => {
    setAlert(message);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => setAlert(null), 5000);
  }, []);

  // ── Initial data fetch ───────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    try {
      const [statusRes, logsRes] = await Promise.allSettled([
        fetchLatestStatus(),
        fetchLogs(50),
      ]);

      if (statusRes.status === 'fulfilled') {
        setDoorStatus(statusRes.value.status ?? 'UNKNOWN');
      }
      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value);
      }
    } catch (err) {
      console.error('[Page] Failed to load initial data:', err);
    }
  }, []);

  const loadWhitelist = useCallback(async () => {
    try {
      const data = await fetchWhitelist();
      setWhitelist(data);
    } catch (err) {
      console.error('[Page] Failed to load whitelist:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load whitelist when navigating to whitelist page
  useEffect(() => {
    if (currentPage === 'whitelist') {
      loadWhitelist();
    }
  }, [currentPage, loadWhitelist]);

  // ── Socket.IO setup ──────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handleDoorStatus = (data: DoorStatusEvent) => {
      setDoorStatus(data.status);
    };

    const handleDoorLog = (data: DoorLogEvent) => {
      setLogs((prev) => [data, ...prev].slice(0, 100));
    };

    const handleDoorAlert = (data: DoorAlertEvent) => {
      showAlert(data.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('door:status', handleDoorStatus);
    socket.on('door:log', handleDoorLog);
    socket.on('door:alert', handleDoorAlert);

    // Set initial connection state
    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('door:status', handleDoorStatus);
      socket.off('door:log', handleDoorLog);
      socket.off('door:alert', handleDoorAlert);
    };
  }, [showAlert]);

  // ── Door control handlers ────────────────────────────────────────────────
  const handleUnlock = async () => {
    setIsLoading(true);
    try {
      await doorUnlock();
    } catch (err: unknown) {
      showAlert(err instanceof Error ? err.message : 'Failed to unlock door');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLock = async () => {
    setIsLoading(true);
    try {
      await doorLock();
    } catch (err: unknown) {
      showAlert(err instanceof Error ? err.message : 'Failed to lock door');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePing = async () => {
    setIsLoading(true);
    try {
      const res = await doorPing();
      if (res.latency !== undefined) {
        showAlert(`Device responded in ${res.latency}ms ✓`);
      }
    } catch (err: unknown) {
      showAlert(err instanceof Error ? err.message : 'Ping failed — device offline?');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Page headers ─────────────────────────────────────────────────────────
  const PAGE_HEADERS: Record<Page, { title: string; subtitle: string }> = {
    home: { title: 'Smart Door Lock', subtitle: 'Monitor & control your door' },
    logs: { title: 'Access Logs', subtitle: 'Recent door activity' },
    whitelist: { title: 'Whitelist', subtitle: 'Manage RFID cards & PIN codes' },
    monitoring: { title: 'Monitoring', subtitle: 'System health & metrics' },
  };

  const header = PAGE_HEADERS[currentPage];
  const currentUser = getUser();

  // Show nothing while checking auth (prevents flash)
  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-base)',
      }}>
        <div className="spinner" style={{ width: 32, height: 32, borderColor: 'rgba(0,212,255,0.3)', borderTopColor: '#00d4ff' }} />
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* ── Desktop Sidebar (hidden on mobile via CSS) ── */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isConnected={isConnected}
        doorStatus={doorStatus}
        username={currentUser?.username || 'admin'}
        onLogout={logout}
      />

      {/* ── Main area: has margin-left on desktop ── */}
      <div className="main-area">
        {/* Alert Banner */}
        <AlertBanner message={alert} onClose={() => setAlert(null)} />

        {/* Page Header */}
        <header className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {/* Lock brand icon (mobile only — desktop shows sidebar logo) */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'rgba(0,212,255,0.12)',
                  border: '1px solid rgba(0,212,255,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00d4ff',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="page-title">{header.title}</h1>
            </div>
            <p className="page-subtitle">{header.subtitle}</p>
            {/* Show register fingerprint on mobile home only */}
            <div className="mobile-only-block" style={{ marginTop: '0.8rem', maxWidth: '280px' }}>
              <WebAuthnRegister isMobile={true} />
            </div>
          </div>
          <TimeDisplay />
        </header>

        {/* Main content */}
        <main className="page-content">

          {/* ── HOME PAGE ─────────────────────────────────── */}
          {currentPage === 'home' && (
            <div className="desktop-home-grid">

              {/* Left column: status card + sensors */}
              <div className="desktop-col-left">
                <div className="home-item-status">
                  <DoorStatusCard status={doorStatus} isConnected={isConnected} />
                </div>
                <div className="home-item-sensors">
                  <SensorBadge />
                </div>
              </div>

              {/* Right column: controls + mini recent-activity log (desktop only) */}
              <div className="desktop-col-right">
                <div className="home-item-controls">
                  <DoorControlPanel
                    onUnlock={handleUnlock}
                    onLock={handleLock}
                    onPing={handlePing}
                    isLoading={isLoading}
                  />
                </div>

                {/* Mini log — only visible on desktop (CSS .home-item-log) */}
                <div className="home-item-log glass-card" style={{ padding: '1.1rem' }}>
                  <div style={{ marginBottom: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p
                      style={{
                        fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: 'rgba(240,244,255,0.4)',
                      }}
                    >
                      Recent Activity
                    </p>
                    <button
                      onClick={() => setCurrentPage('logs')}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.72rem', color: '#00d4ff', fontFamily: 'inherit',
                        fontWeight: 600, letterSpacing: '0.02em',
                      }}
                    >
                      View all →
                    </button>
                  </div>
                  <AccessLogTable logs={logs.slice(0, 8)} />
                </div>
              </div>
            </div>
          )}

          {/* ── LOGS PAGE ─────────────────────────────────── */}
          {currentPage === 'logs' && <AccessLogTable logs={logs} />}

          {/* ── WHITELIST PAGE ───────────────────────────── */}
          {currentPage === 'whitelist' && (
            <WhitelistManager whitelist={whitelist} onRefresh={loadWhitelist} />
          )}

          {/* ── MONITORING PAGE ───────────────────────────── */}
          {currentPage === 'monitoring' && (
            <MonitoringDashboard isConnected={isConnected} doorStatus={doorStatus} />
          )}
        </main>
      </div>

      {/* Mobile bottom nav (hidden on desktop via CSS) */}
      <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} onLogout={logout} />
    </div>
  );
}

// ── Live clock component ──────────────────────────────────────────────────
function TimeDisplay() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
      setDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  return (
    <div style={{ textAlign: 'right' }}>
      <div
        style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          color: '#00d4ff',
          letterSpacing: '0.05em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {time}
      </div>
      <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.05rem' }}>
        {date}
      </div>
    </div>
  );
}
