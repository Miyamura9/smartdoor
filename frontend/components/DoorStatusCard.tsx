'use client';

type DoorStatus = 'LOCKED' | 'UNLOCKED' | 'UNKNOWN';

interface DoorStatusCardProps {
  status: DoorStatus;
  isConnected: boolean;
}

function LockClosedIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

function LockOpenIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 019.9-1" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

export default function DoorStatusCard({ status, isConnected }: DoorStatusCardProps) {
  const isLocked = status === 'LOCKED';
  const isUnlocked = status === 'UNLOCKED';

  const color = isLocked ? '#00d4ff' : isUnlocked ? '#00ff88' : 'rgba(255,255,255,0.25)';
  const pulseAnim = isLocked
    ? 'pulse-cyan 2s ease-in-out infinite'
    : isUnlocked
    ? 'pulse-green 2s ease-in-out infinite'
    : 'none';

  const statusLabel = isLocked ? 'LOCKED' : isUnlocked ? 'UNLOCKED' : 'UNKNOWN';
  const statusClass = isLocked
    ? 'status-locked'
    : isUnlocked
    ? 'status-unlocked'
    : 'status-unknown';

  return (
    <div className="glass-card door-status-card">
      {/* Top row: location + connection */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {/* Home icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <path
              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <polyline
              points="9 22 9 12 15 12 15 22"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Front Door
          </span>
        </div>

        {/* Connection badge */}
        <div className="connection-badge">
          <span className={`dot ${isConnected ? 'dot-green' : 'dot-grey'}`} />
          <span>{isConnected ? 'MQTT Connected' : 'Reconnecting...'}</span>
        </div>
      </div>

      {/* Lock icon with rings */}
      <div
        className="door-icon-wrapper"
        style={{ color, animation: pulseAnim }}
      >
        <div
          className="door-icon-ring-outer"
          style={{ borderColor: color, opacity: 0.2 }}
        />
        <div
          className="door-icon-ring"
          style={{ borderColor: color }}
        />
        <div
          className="door-icon-bg"
          style={{
            borderColor: color,
            background: isLocked
              ? 'rgba(0,212,255,0.08)'
              : isUnlocked
              ? 'rgba(0,255,136,0.08)'
              : 'rgba(255,255,255,0.04)',
            boxShadow: isLocked
              ? '0 0 30px rgba(0,212,255,0.2), inset 0 0 20px rgba(0,212,255,0.05)'
              : isUnlocked
              ? '0 0 30px rgba(0,255,136,0.2), inset 0 0 20px rgba(0,255,136,0.05)'
              : 'none',
          }}
        >
          {isUnlocked ? (
            <LockOpenIcon size={36} />
          ) : (
            <LockClosedIcon size={36} />
          )}
        </div>
      </div>

      {/* Status text */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
        <span
          className={statusClass}
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
          }}
        >
          {statusLabel}
        </span>
        <div
          className="status-badge"
          style={{
            background: isLocked
              ? 'rgba(0,212,255,0.1)'
              : isUnlocked
              ? 'rgba(0,255,136,0.1)'
              : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isLocked ? 'rgba(0,212,255,0.25)' : isUnlocked ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.1)'}`,
            color,
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
          }}
        >
          <span
            className="dot"
            style={{
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
          {isLocked
            ? 'Door secured'
            : isUnlocked
            ? 'Door accessible'
            : 'Status unknown'}
        </div>
      </div>
    </div>
  );
}
