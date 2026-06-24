'use client';

import { useState, useEffect } from 'react';

interface MonitoringDashboardProps {
  isConnected: boolean;
  doorStatus: string;
}

export default function MonitoringDashboard({ isConnected, doorStatus }: MonitoringDashboardProps) {
  const [uptime, setUptime] = useState(0);
  
  useEffect(() => {
    // Simulate uptime counting up
    const interval = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#00d4ff' }}>System Health Overview</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>MQTT Broker</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: isConnected ? '#00ff88' : 'var(--red)', marginTop: '0.5rem' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Door Status</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: doorStatus === 'UNLOCKED' ? '#00ff88' : '#00d4ff', marginTop: '0.5rem' }}>
              {doorStatus}
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>Dashboard Uptime</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', marginTop: '0.5rem' }}>
              {formatUptime(uptime)}
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#00d4ff' }}>Server Metrics (Simulated)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
           <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>CPU Usage</p>
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', marginTop: '0.5rem', overflow: 'hidden' }}>
                <div style={{ width: '12%', background: '#00d4ff', height: '100%' }} />
            </div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.3rem', color: 'rgba(255,255,255,0.7)' }}>12%</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Memory Usage</p>
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px', marginTop: '0.5rem', overflow: 'hidden' }}>
                <div style={{ width: '45%', background: '#00ff88', height: '100%' }} />
            </div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.3rem', color: 'rgba(255,255,255,0.7)' }}>45% (4.1GB / 8GB)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
