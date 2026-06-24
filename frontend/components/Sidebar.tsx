'use client';

import WebAuthnRegister from './WebAuthnRegister';

type Page = 'home' | 'logs' | 'whitelist' | 'monitoring';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isConnected: boolean;
  doorStatus: 'LOCKED' | 'UNLOCKED' | 'UNKNOWN';
  username?: string;
  onLogout?: () => void;
}

/* ── Icons ─────────────────────────────────────────────────── */

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
        stroke="currentColor"
        strokeWidth="2"
        fill={active ? 'rgba(0,212,255,0.15)' : 'none'}
      />
      <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function LogsIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
        stroke="currentColor"
        strokeWidth="2"
        fill={active ? 'rgba(0,212,255,0.1)' : 'none'}
      />
      <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
      <line x1="9" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="9" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function WhitelistIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill={active ? 'rgba(0,212,255,0.15)' : 'none'}
      />
      {active && (
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function MonitoringIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M2 12h4l3-9 5 18 3-9h5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="3" stroke="currentColor" strokeWidth="2" fill="rgba(0,212,255,0.08)" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

function SignalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M1.5 8.5a14 14 0 0121 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 12a10 10 0 0114 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.5 15.5a6 6 0 017 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

/* ── Nav Items Config ────────────────────────────────────────── */

const NAV_ITEMS: { id: Page; label: string; desc: string }[] = [
  { id: 'home',      label: 'Dashboard',  desc: 'Monitor & control' },
  { id: 'logs',      label: 'Access Logs', desc: 'Door activity history' },
  { id: 'whitelist', label: 'Whitelist',   desc: 'Manage RFID & PIN' },
  { id: 'monitoring',label: 'Monitoring',  desc: 'Server & health stats' },
];

/* ── Component ───────────────────────────────────────────────── */

export default function Sidebar({ currentPage, onNavigate, isConnected, doorStatus, username = 'admin', onLogout }: SidebarProps) {
  const statusColor =
    doorStatus === 'UNLOCKED' ? '#00ff88' :
    doorStatus === 'LOCKED'   ? '#00d4ff' :
    'rgba(255,255,255,0.3)';

  const statusGlow =
    doorStatus === 'UNLOCKED' ? '0 0 16px rgba(0,255,136,0.35)' :
    doorStatus === 'LOCKED'   ? '0 0 16px rgba(0,212,255,0.35)' :
    'none';

  return (
    <aside className="sidebar" role="navigation" aria-label="Sidebar navigation">

      {/* ── Brand ──────────────────────────────────────────────── */}
      <div className="sidebar-brand">
        <div className="sidebar-logo" style={{ color: '#00d4ff' }}>
          <LockIcon />
        </div>
        <div>
          <div className="sidebar-brand-name">Smart Door</div>
          <div className="sidebar-brand-sub">Lock System</div>
        </div>
      </div>

      {/* ── Divider ────────────────────────────────────────────── */}
      <div className="sidebar-divider" />

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <p className="sidebar-section-label">Navigation</p>
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="sidebar-nav-icon">
                {item.id === 'home'      && <HomeIcon      active={isActive} />}
                {item.id === 'logs'      && <LogsIcon      active={isActive} />}
                {item.id === 'whitelist' && <WhitelistIcon active={isActive} />}
                {item.id === 'monitoring' && <MonitoringIcon active={isActive} />}
              </span>
              <span className="sidebar-nav-text">
                <span className="sidebar-nav-label">{item.label}</span>
                <span className="sidebar-nav-desc">{item.desc}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Spacer ─────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Status Panels ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {/* Door status */}
        <div
          className="glass-card"
          style={{
            padding: '0.9rem 1rem',
            borderColor: `${statusColor}22`,
            boxShadow: statusGlow,
          }}
        >
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.4rem', fontWeight: 600 }}>
            Door Status
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}`,
                flexShrink: 0,
                animation: doorStatus !== 'UNKNOWN' ? 'pulse-dot 2s ease-in-out infinite' : 'none',
              }}
            />
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: statusColor,
                letterSpacing: '0.05em',
              }}
            >
              {doorStatus}
            </span>
          </div>
        </div>

        {/* MQTT connection */}
        <div
          className="glass-card"
          style={{
            padding: '0.75rem 1rem',
            borderColor: isConnected ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.06)',
          }}
        >
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.4rem', fontWeight: 600 }}>
            MQTT Broker
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: isConnected ? '#00ff88' : 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
              <SignalIcon />
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isConnected ? '#00ff88' : 'rgba(255,255,255,0.4)' }}>
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
        </div>

        {/* User + Logout */}
        <div
          className="glass-card"
          style={{ padding: '0.85rem 1rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,212,255,0.12)',
              border: '1.5px solid rgba(0,212,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#00d4ff', flexShrink: 0, fontSize: '0.7rem', fontWeight: 700,
            }}>
              {username.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {username}
              </p>
              <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)' }}>Administrator</p>
            </div>
          </div>
          
          <div style={{ marginTop: '0.8rem' }}>
            <WebAuthnRegister isMobile={false} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            {onLogout && (
              <button
                id="sidebar-logout-btn"
                onClick={onLogout}
                aria-label="Logout"
                title="Logout"
                style={{
                  background: 'rgba(255,61,90,0.1)',
                  border: '1px solid rgba(255,61,90,0.2)',
                  borderRadius: '8px',
                  padding: '0.35rem 0.75rem',
                  cursor: 'pointer',
                  color: 'var(--red)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  transition: 'all 0.2s',
                  width: '100%',
                  fontSize: '0.75rem', fontWeight: 600
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,61,90,0.2)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,61,90,0.5)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,61,90,0.1)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,61,90,0.2)';
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '0.25rem' }}>
          IoT Dashboard v1.1.0
        </p>
      </div>
    </aside>
  );
}
