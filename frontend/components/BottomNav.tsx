'use client';

type Page = 'home' | 'logs' | 'whitelist' | 'monitoring';

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout?: () => void;
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      className="nav-icon"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
        stroke="currentColor"
        strokeWidth="2"
        fill={active ? 'rgba(0,212,255,0.15)' : 'none'}
      />
      <polyline
        points="9 22 9 12 15 12 15 22"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function LogsIcon({ active }: { active: boolean }) {
  return (
    <svg
      className="nav-icon"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
    <svg
      className="nav-icon"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill={active ? 'rgba(0,212,255,0.15)' : 'none'}
      />
      {active && (
        <path
          d="M9 12l2 2 4-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function MonitoringIcon({ active }: { active: boolean }) {
  return (
    <svg
      className="nav-icon"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M2 12h4l3-9 5 18 3-9h5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'logs', label: 'Logs' },
  { id: 'whitelist', label: 'Whitelist' },
  { id: 'monitoring', label: 'Monitoring' },
];

export default function BottomNav({ currentPage, onNavigate, onLogout }: BottomNavProps) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`Navigate to ${item.label}`}
          >
            {item.id === 'home' && <HomeIcon active={isActive} />}
            {item.id === 'logs' && <LogsIcon active={isActive} />}
            {item.id === 'whitelist' && <WhitelistIcon active={isActive} />}
            {item.id === 'monitoring' && <MonitoringIcon active={isActive} />}
            <span>{item.label}</span>
          </button>
        );
      })}

      {/* Logout button */}
      {onLogout && (
        <button
          id="mobile-logout-btn"
          className="nav-item"
          onClick={onLogout}
          aria-label="Logout"
          style={{ color: 'var(--red)' }}
        >
          <svg className="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" />
            <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>Logout</span>
        </button>
      )}
    </nav>
  );
}
