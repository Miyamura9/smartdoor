'use client';

interface DoorControlPanelProps {
  onUnlock: () => void;
  onLock: () => void;
  onPing: () => void;
  isLoading: boolean;
}

function Spinner() {
  return <span className="spinner" />;
}

function UnlockIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 019.9-1" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

function PingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.42 9a16 16 0 0121.16 0" stroke="currentColor" strokeWidth="2" />
      <path d="M5 12.55a11 11 0 0114.08 0" stroke="currentColor" strokeWidth="2" />
      <path d="M10.54 17.09a6 6 0 002.92 0" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

export default function DoorControlPanel({
  onUnlock,
  onLock,
  onPing,
  isLoading,
}: DoorControlPanelProps) {
  return (
    <div className="glass-card" style={{ padding: '1.1rem 1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path
            d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="section-label">Remote Control</span>
      </div>

      <div className="control-grid">
        {/* UNLOCK */}
        <button
          className="btn btn-unlock control-btn-main"
          onClick={onUnlock}
          disabled={isLoading}
          aria-label="Unlock door"
        >
          {isLoading ? <Spinner /> : <UnlockIcon />}
          <span>UNLOCK</span>
        </button>

        {/* LOCK */}
        <button
          className="btn btn-lock control-btn-main"
          onClick={onLock}
          disabled={isLoading}
          aria-label="Lock door"
        >
          {isLoading ? <Spinner /> : <LockIcon />}
          <span>LOCK</span>
        </button>

        {/* PING */}
        <button
          className="btn btn-ping control-btn-ping"
          onClick={onPing}
          disabled={isLoading}
          aria-label="Ping device"
        >
          {isLoading ? <Spinner /> : <PingIcon />}
          <span>Ping Device</span>
        </button>
      </div>
    </div>
  );
}
