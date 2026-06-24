'use client';

import { useState } from 'react';
import { Whitelist, addRFID, deleteRFID, addPin, deletePin, syncWhitelist } from '@/lib/api';

interface WhitelistManagerProps {
  whitelist: Whitelist;
  onRefresh: () => void;
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function SyncIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: spinning ? 'spin-slow 0.8s linear infinite' : 'none' }}
    >
      <polyline points="23 4 23 10 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="1 20 1 14 7 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function WhitelistManager({ whitelist, onRefresh }: WhitelistManagerProps) {
  // RFID form state
  const [rfidUid, setRfidUid] = useState('');
  const [rfidLabel, setRfidLabel] = useState('');
  const [rfidLoading, setRfidLoading] = useState(false);
  const [rfidError, setRfidError] = useState('');

  // PIN form state
  const [pinValue, setPinValue] = useState('');
  const [pinLabel, setPinLabel] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const handleAddRFID = async () => {
    if (!rfidUid.trim()) {
      setRfidError('UID is required');
      return;
    }
    setRfidError('');
    setRfidLoading(true);
    try {
      await addRFID(rfidUid.trim(), rfidLabel.trim() || undefined);
      setRfidUid('');
      setRfidLabel('');
      onRefresh();
    } catch (e: unknown) {
      setRfidError(e instanceof Error ? e.message : 'Failed to add RFID');
    } finally {
      setRfidLoading(false);
    }
  };

  const handleDeleteRFID = async (uid: string) => {
    try {
      await deleteRFID(uid);
      onRefresh();
    } catch (e) {
      console.error('Delete RFID failed:', e);
    }
  };

  const handleAddPin = async () => {
    if (!pinValue.trim() || pinValue.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (!/^\d+$/.test(pinValue)) {
      setPinError('PIN must contain digits only');
      return;
    }
    setPinError('');
    setPinLoading(true);
    try {
      await addPin(pinValue.trim(), pinLabel.trim() || undefined);
      setPinValue('');
      setPinLabel('');
      onRefresh();
    } catch (e: unknown) {
      setPinError(e instanceof Error ? e.message : 'Failed to add PIN');
    } finally {
      setPinLoading(false);
    }
  };

  const handleDeletePin = async (pin: string) => {
    try {
      await deletePin(pin);
      onRefresh();
    } catch (e) {
      console.error('Delete PIN failed:', e);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await syncWhitelist();
      setSyncMsg(`Synced ${res.synced} entries to device`);
      setTimeout(() => setSyncMsg(''), 4000);
    } catch (e: unknown) {
      setSyncMsg(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Side-by-side on desktop, stacked on mobile */}
      <div className="whitelist-desktop-grid">

      {/* ── RFID Section ── */}
      <div className="glass-card" style={{ padding: '1.1rem' }}>

        <div className="whitelist-section">
          <div className="whitelist-section-title">
            <span style={{ color: '#00d4ff' }}>
              <CardIcon />
            </span>
            RFID Cards
            <span
              style={{
                marginLeft: 'auto',
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: '99px',
                padding: '0.1rem 0.55rem',
                fontSize: '0.65rem',
                color: '#00d4ff',
              }}
            >
              {whitelist.rfid.length}
            </span>
          </div>

          {/* RFID list */}
          {whitelist.rfid.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '1rem',
                color: 'rgba(255,255,255,0.25)',
                fontSize: '0.78rem',
              }}
            >
              No RFID cards registered
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {whitelist.rfid.map((entry) => (
                <div key={entry.id} className="whitelist-item glass-card" style={{ borderColor: 'rgba(0,212,255,0.1)' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(0,212,255,0.1)',
                      border: '1px solid rgba(0,212,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00d4ff',
                      flexShrink: 0,
                    }}
                  >
                    <CardIcon />
                  </div>
                  <div className="whitelist-item-info">
                    <div className="whitelist-uid">{entry.uid}</div>
                    <div className="whitelist-label">{entry.label || 'No label'}</div>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', minWidth: 'auto' }}
                    onClick={() => handleDeleteRFID(entry.uid)}
                    aria-label="Delete RFID"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add RFID form */}
          <div className="add-form">
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Add New Card
            </span>
            <input
              className="input-field"
              type="text"
              placeholder="UID (e.g. A1:B2:C3:D4)"
              value={rfidUid}
              onChange={(e) => setRfidUid(e.target.value)}
              maxLength={30}
            />
            <input
              className="input-field"
              type="text"
              placeholder="Label (optional)"
              value={rfidLabel}
              onChange={(e) => setRfidLabel(e.target.value)}
              maxLength={50}
            />
            {rfidError && (
              <span style={{ fontSize: '0.72rem', color: '#ff3d5a' }}>{rfidError}</span>
            )}
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleAddRFID}
              disabled={rfidLoading}
            >
              {rfidLoading ? <span className="spinner" /> : <PlusIcon />}
              Add Card
            </button>
          </div>
        </div>
      </div>

      {/* ── PIN Section ── */}
      <div className="glass-card" style={{ padding: '1.1rem' }}>
        <div className="whitelist-section">
          <div className="whitelist-section-title">
            <span style={{ color: '#ff9500' }}>
              <ShieldIcon />
            </span>
            PIN Codes
            <span
              style={{
                marginLeft: 'auto',
                background: 'rgba(255,149,0,0.1)',
                border: '1px solid rgba(255,149,0,0.2)',
                borderRadius: '99px',
                padding: '0.1rem 0.55rem',
                fontSize: '0.65rem',
                color: '#ff9500',
              }}
            >
              {whitelist.pins.length}
            </span>
          </div>

          {/* PIN list */}
          {whitelist.pins.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '1rem',
                color: 'rgba(255,255,255,0.25)',
                fontSize: '0.78rem',
              }}
            >
              No PIN codes registered
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {whitelist.pins.map((entry) => (
                <div key={entry.id} className="whitelist-item glass-card" style={{ borderColor: 'rgba(255,149,0,0.1)' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(255,149,0,0.1)',
                      border: '1px solid rgba(255,149,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ff9500',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    #
                  </div>
                  <div className="whitelist-item-info">
                    <div className="whitelist-uid">{'•'.repeat(Math.min(entry.pin.length, 6))}</div>
                    <div className="whitelist-label">{entry.label || 'No label'}</div>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', minWidth: 'auto' }}
                    onClick={() => handleDeletePin(entry.pin)}
                    aria-label="Delete PIN"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add PIN form */}
          <div className="add-form">
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Add New PIN
            </span>
            <input
              className="input-field"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="PIN (4–8 digits)"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 8))}
              maxLength={8}
            />
            <input
              className="input-field"
              type="text"
              placeholder="Label (optional)"
              value={pinLabel}
              onChange={(e) => setPinLabel(e.target.value)}
              maxLength={50}
            />
            {pinError && (
              <span style={{ fontSize: '0.72rem', color: '#ff3d5a' }}>{pinError}</span>
            )}
            <button
              className="btn btn-primary"
              style={{ width: '100%', borderColor: 'rgba(255,149,0,0.35)', color: '#ff9500', background: 'rgba(255,149,0,0.1)' }}
              onClick={handleAddPin}
              disabled={pinLoading}
            >
              {pinLoading ? <span className="spinner" /> : <PlusIcon />}
              Add PIN
            </button>
          </div>
        </div>
      </div>
      </div>{/* end whitelist-desktop-grid */}

      {/* ── Sync Button ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <button
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '0.9rem',
            fontSize: '0.9rem',
            borderRadius: 'var(--radius-lg)',
          }}
          onClick={handleSync}
          disabled={syncing}
        >
          <SyncIcon spinning={syncing} />
          {syncing ? 'Syncing...' : 'Sync to Device'}
        </button>
        {syncMsg && (
          <div
            style={{
              textAlign: 'center',
              fontSize: '0.78rem',
              color: syncMsg.toLowerCase().includes('fail') ? '#ff3d5a' : '#00ff88',
              animation: 'fade-in-up 0.3s ease',
            }}
          >
            {syncMsg}
          </div>
        )}
      </div>
    </div>
  );
}
