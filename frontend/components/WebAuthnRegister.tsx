'use client';

import { useState } from 'react';
import { getWebAuthnRegisterOptions, verifyWebAuthnRegister } from '@/lib/api';
import { startRegistration } from '@simplewebauthn/browser';

interface WebAuthnRegisterProps {
  isMobile?: boolean;
}

export default function WebAuthnRegister({ isMobile }: WebAuthnRegisterProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleRegister() {
    if (loading) return;
    setLoading(true);
    setMessage('');

    try {
      // 1. Dapatkan opsi registrasi dari server
      const options = await getWebAuthnRegisterOptions();

      // 2. Minta otorisasi biometrik dari browser/OS
      let authResp;
      try {
        authResp = await startRegistration(options);
      } catch (err: any) {
        throw new Error('Registrasi dibatalkan atau tidak didukung perangkat');
      }

      // 3. Verifikasi dengan server
      const verifyResp = await verifyWebAuthnRegister(authResp);
      
      if (verifyResp.verified) {
        setMessage('✅ Sidik jari berhasil didaftarkan!');
      } else {
        throw new Error('Verifikasi server gagal');
      }
    } catch (err: unknown) {
      setMessage(`❌ ${err instanceof Error ? err.message : 'Gagal mendaftar'}`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  return (
    <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
      <button
        onClick={handleRegister}
        disabled={loading}
        className="webauthn-reg-btn"
        title="Daftarkan sidik jari perangkat ini untuk login lebih cepat"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12Z"/>
          <path d="M9 10C9 10 10.5 8.5 12 8.5C13.5 8.5 15 10 15 10"/>
          <path d="M7.5 13.5C7.5 13.5 10 11.5 12 11.5C14 11.5 16.5 13.5 16.5 13.5"/>
          <path d="M8 17C8 17 10 15.5 12 15.5C14 15.5 16 17 16 17"/>
          <path d="M12 2V8.5"/>
        </svg>
        {isMobile ? <span>Daftar Sidik Jari</span> : <span>Daftarkan Perangkat Ini</span>}
      </button>

      {message && (
        <div style={{ fontSize: '0.7rem', color: message.includes('✅') ? '#00ff88' : '#ff3d5a', marginTop: '0.3rem', textAlign: 'center' }}>
          {message}
        </div>
      )}

      <style>{`
        .webauthn-reg-btn {
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          width: 100%; padding: 0.5rem;
          background: rgba(0,212,255,0.1);
          border: 1px solid rgba(0,212,255,0.2);
          border-radius: 8px;
          color: #00d4ff; font-size: 0.75rem; font-family: var(--font);
          cursor: pointer; transition: all 0.2s;
        }
        .webauthn-reg-btn:hover:not(:disabled) {
          background: rgba(0,212,255,0.2);
          border-color: rgba(0,212,255,0.4);
        }
        .webauthn-reg-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
