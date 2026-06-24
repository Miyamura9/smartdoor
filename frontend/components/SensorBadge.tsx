'use client';

interface SensorInfo {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

function RFIDIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="2" />
      <line x1="6" y1="15" x2="10" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FingerprintIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 6c-3.31 0-6 2.69-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 10a2 2 0 00-2 2c0 4 2 7 2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 12c0 2.5-1 5-1.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 11c0-3.31-2.69-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 12c0-5.52-4.48-10-10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function KeypadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="2" width="4" height="4" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="10" y="2" width="4" height="4" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="17" y="2" width="4" height="4" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="3" y="9" width="4" height="4" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="10" y="9" width="4" height="4" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="17" y="9" width="4" height="4" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="3" y="16" width="4" height="4" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="10" y="16" width="4" height="4" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="17" y="16" width="4" height="4" rx="1" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

function SolenoidIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

const SENSORS: SensorInfo[] = [
  {
    name: 'RFID RC522',
    icon: <RFIDIcon />,
    color: '#00d4ff',
    bgColor: 'rgba(0,212,255,0.08)',
    borderColor: 'rgba(0,212,255,0.18)',
  },
  {
    name: 'Fingerprint',
    icon: <FingerprintIcon />,
    color: '#a855f7',
    bgColor: 'rgba(168,85,247,0.08)',
    borderColor: 'rgba(168,85,247,0.18)',
  },
  {
    name: 'Keypad 4x4',
    icon: <KeypadIcon />,
    color: '#ff9500',
    bgColor: 'rgba(255,149,0,0.08)',
    borderColor: 'rgba(255,149,0,0.18)',
  },
  {
    name: 'Solenoid',
    icon: <SolenoidIcon />,
    color: '#00ff88',
    bgColor: 'rgba(0,255,136,0.08)',
    borderColor: 'rgba(0,255,136,0.18)',
  },
];

export default function SensorBadge() {
  return (
    <div>
      <span className="section-label" style={{ display: 'block', marginBottom: '0.6rem', paddingLeft: '0.1rem' }}>
        Sensors
      </span>
      <div className="sensor-row">
        {SENSORS.map((sensor) => (
          <div
            key={sensor.name}
            className="glass-card sensor-badge"
            style={{
              background: sensor.bgColor,
              borderColor: sensor.borderColor,
              color: sensor.color,
            }}
          >
            {/* Icon */}
            <div style={{ color: sensor.color }}>{sensor.icon}</div>

            {/* Name */}
            <div className="sensor-name" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {sensor.name}
            </div>

            {/* Active indicator */}
            <div className="sensor-active">
              <span
                className="dot dot-green"
                style={{ width: '5px', height: '5px' }}
              />
              <span style={{ fontSize: '0.6rem' }}>Active</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
