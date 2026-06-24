'use client';

import { AccessLog } from '@/lib/api';

interface AccessLogTableProps {
  logs: AccessLog[];
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return 'just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

type Method = 'RFID' | 'FINGERPRINT' | 'KEYPAD' | 'REMOTE';

function MethodIcon({ method }: { method: Method }) {
  if (method === 'RFID') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="2" />
        <line x1="6" y1="15" x2="10" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (method === 'FINGERPRINT') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 6c-3.31 0-6 2.69-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 10a2 2 0 00-2 2c0 4 2 7 2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 12c0 2.5-1 5-1.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M18 11c0-3.31-2.69-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 12c0-5.52-4.48-10-10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (method === 'KEYPAD') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="2" width="4" height="4" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="10" y="2" width="4" height="4" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="16" y="2" width="4" height="4" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="4" y="8" width="4" height="4" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="10" y="8" width="4" height="4" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="16" y="8" width="4" height="4" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="4" y="14" width="4" height="4" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="10" y="14" width="4" height="4" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="16" y="14" width="4" height="4" rx="1" fill="currentColor" opacity="0.8" />
        <rect x="10" y="20" width="4" height="4" rx="1" fill="currentColor" opacity="0.8" />
      </svg>
    );
  }
  // REMOTE
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M1.42 9a16 16 0 0121.16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 12.55a11 11 0 0114.08 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.54 17.09a6 6 0 002.92 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

const METHOD_COLORS: Record<Method, { bg: string; color: string; border: string }> = {
  RFID: {
    bg: 'rgba(0,212,255,0.1)',
    color: '#00d4ff',
    border: 'rgba(0,212,255,0.2)',
  },
  FINGERPRINT: {
    bg: 'rgba(168,85,247,0.1)',
    color: '#a855f7',
    border: 'rgba(168,85,247,0.2)',
  },
  KEYPAD: {
    bg: 'rgba(255,149,0,0.1)',
    color: '#ff9500',
    border: 'rgba(255,149,0,0.2)',
  },
  REMOTE: {
    bg: 'rgba(59,130,246,0.1)',
    color: '#3b82f6',
    border: 'rgba(59,130,246,0.2)',
  },
};

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
          />
          <rect
            x="9"
            y="3"
            width="6"
            height="4"
            rx="1"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2"
          />
        </svg>
      </div>
      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>
        No access logs yet
      </span>
      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)' }}>
        Logs will appear here when the door is accessed
      </span>
    </div>
  );
}

export default function AccessLogTable({ logs }: AccessLogTableProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0.25rem',
        }}
      >
        <span className="section-label" style={{ marginBottom: 0 }}>
          Access History
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '99px',
            padding: '0.15rem 0.6rem',
          }}
        >
          {logs.length} entries
        </span>
      </div>

      {/* Log list */}
      <div className="log-list">
        {logs.length === 0 ? (
          <EmptyState />
        ) : (
          logs.map((log, idx) => {
            const mc = METHOD_COLORS[log.method] || METHOD_COLORS.REMOTE;
            const displayText = log.uid
              ? `UID: ${log.uid}`
              : log.message || 'Access attempt';

            return (
              <div
                key={log.id}
                className="log-entry glass-card"
                style={{
                  animationDelay: `${Math.min(idx, 10) * 0.04}s`,
                  borderColor: idx === 0 ? mc.border : undefined,
                }}
              >
                {/* Method icon badge */}
                <div
                  className="log-method-badge"
                  style={{
                    background: mc.bg,
                    border: `1px solid ${mc.border}`,
                    color: mc.color,
                  }}
                >
                  <MethodIcon method={log.method} />
                </div>

                {/* Content */}
                <div className="log-content">
                  <div
                    className="log-method-name"
                    style={{ color: mc.color }}
                  >
                    {log.method}
                  </div>
                  <div className="log-message" title={displayText}>
                    {displayText}
                  </div>
                  <div className="log-time">
                    {formatRelativeTime(log.createdAt)}
                  </div>
                </div>

                {/* Status badge */}
                <div
                  className={`log-status-badge ${
                    log.status === 'SUCCESS' ? 'log-success' : 'log-failed'
                  }`}
                >
                  {log.status}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
