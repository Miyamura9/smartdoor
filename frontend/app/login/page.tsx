'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { login, loginPin, getWebAuthnAuthOptions, verifyWebAuthnAuth } from '@/lib/api';
import { setToken, setUser, isAuthenticated } from '@/lib/auth';
import { startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const router = useRouter();
  
  // Desktop states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Mobile states
  const [pin, setPin] = useState('');
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Common states
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake]   = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if already logged in
    if (isAuthenticated()) {
      router.replace('/');
      return;
    }
    
    // Detect mobile or desktop
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    if (!isMobile) {
      usernameRef.current?.focus();
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [router, isMobile]);

  function triggerError(msg: string) {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
    setPin(''); // clear pin on error
  }

  // --- Desktop Login ---
  async function handleDesktopSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError('');

    try {
      const data = await login(username.trim(), password);
      setToken(data.token);
      setUser(data.user);
      router.replace('/');
    } catch (err: unknown) {
      triggerError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  // --- Mobile PIN Login ---
  async function handlePinSubmit(currentPin: string) {
    if (currentPin.length === 0) return;
    setLoading(true);
    setError('');

    try {
      const data = await loginPin(currentPin);
      setToken(data.token);
      setUser(data.user);
      router.replace('/');
    } catch (err: unknown) {
      triggerError(err instanceof Error ? err.message : 'PIN salah');
    } finally {
      setLoading(false);
    }
  }

  const handlePinClick = (digit: string) => {
    if (loading) return;
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 6) {
        handlePinSubmit(newPin);
      }
    }
  };

  const handlePinDelete = () => {
    if (loading) return;
    setPin(p => p.slice(0, -1));
  };

  // --- Mobile Fingerprint Login ---
  async function handleFingerprint() {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      // 1. Get options from server
      const options = await getWebAuthnAuthOptions();
      
      // 2. Prompt user biometrics
      let authResp;
      try {
        authResp = await startAuthentication(options);
      } catch (err: any) {
        throw new Error('Gagal membaca sidik jari / Dibatalkan');
      }

      // 3. Verify on server
      const data = await verifyWebAuthnAuth(authResp);
      setToken(data.token);
      setUser(data.user);
      router.replace('/');
    } catch (err: unknown) {
      triggerError(err instanceof Error ? err.message : 'Autentikasi biometrik gagal');
    } finally {
      setLoading(false);
    }
  }

  if (isMobile === null) return null; // Wait for hydration

  return (
    <div className="login-page">
      {/* Background ambient glow */}
      <div className="login-bg-glow login-bg-glow-1" />
      <div className="login-bg-glow login-bg-glow-2" />

      <div className={`login-card ${shake ? 'login-shake' : ''} ${isMobile ? 'mobile-card' : ''}`}>

        {/* Logo */}
        <div className="login-logo-wrap" style={{ width: isMobile ? 70 : 88, height: isMobile ? 70 : 88 }}>
          <div className="login-logo-ring" />
          <div className="login-logo-ring login-logo-ring-outer" />
          <div className="login-logo-icon">
            <svg width={isMobile ? "28" : "36"} height={isMobile ? "28" : "36"} viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="3"
                stroke="currentColor" strokeWidth="2"
                fill="rgba(0,212,255,0.08)" />
              <path d="M7 11V7a5 5 0 0110 0v4"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1.8" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="login-heading">
          <h1 className="login-title">Smart Door Lock</h1>
          <p className="login-subtitle">
            {isMobile ? 'Masukkan PIN atau gunakan sidik jari' : 'Masukkan kredensial Anda untuk mengakses dashboard'}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="login-error" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {isMobile ? (
          // --- MOBILE VIEW (PIN & FINGERPRINT) ---
          <div className="pin-container">
            {/* PIN Dots */}
            <div className="pin-dots">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
              ))}
            </div>

            {/* Loading text */}
            {loading && <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#00d4ff', marginBottom: '1rem' }}>Memverifikasi...</div>}

            {/* PIN Pad */}
            <div className={`pin-pad ${loading ? 'disabled' : ''}`}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button key={digit} className="pin-btn" onClick={() => handlePinClick(digit)}>
                  {digit}
                </button>
              ))}
              
              {/* Biometrics / Fingerprint button */}
              <button className="pin-btn pin-btn-special" onClick={handleFingerprint}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12Z"/>
                  <path d="M9 10C9 10 10.5 8.5 12 8.5C13.5 8.5 15 10 15 10"/>
                  <path d="M7.5 13.5C7.5 13.5 10 11.5 12 11.5C14 11.5 16.5 13.5 16.5 13.5"/>
                  <path d="M8 17C8 17 10 15.5 12 15.5C14 15.5 16 17 16 17"/>
                  <path d="M12 2V8.5"/>
                </svg>
              </button>

              <button className="pin-btn" onClick={() => handlePinClick('0')}>0</button>

              {/* Delete button */}
              <button className="pin-btn pin-btn-special" onClick={handlePinDelete}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
                  <line x1="18" y1="9" x2="12" y2="15"></line>
                  <line x1="12" y1="9" x2="18" y2="15"></line>
                </svg>
              </button>
            </div>
            
            <button className="mobile-login-btn" onClick={() => handlePinSubmit(pin)} disabled={loading || pin.length === 0}>
              Masuk
            </button>
          </div>
        ) : (
          // --- DESKTOP VIEW (USERNAME & PASSWORD) ---
          <form onSubmit={handleDesktopSubmit} className="login-form" noValidate>
            {/* Username */}
            <div className="login-field">
              <label htmlFor="login-username" className="login-label">Username</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="login-username"
                  ref={usernameRef}
                  type="text"
                  autoComplete="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  className="login-input"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label htmlFor="login-password" className="login-label">Password</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="login-input login-input-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              className="login-submit"
              disabled={loading || !username.trim() || !password}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 18, height: 18 }} />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <polyline points="10 17 15 12 10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span>Masuk ke Dashboard</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="login-footer">
          🔒 Koneksi aman · IoT Dashboard v1.1
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
        }

        .login-bg-glow {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.4;
        }
        .login-bg-glow-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%);
          top: -150px; left: -100px;
          animation: float 6s ease-in-out infinite;
        }
        .login-bg-glow-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%);
          bottom: -100px; right: -100px;
          animation: float 8s ease-in-out infinite reverse;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(0,212,255,0.18);
          border-radius: 28px;
          padding: 2.5rem 2rem;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 0 0 1px rgba(0,212,255,0.05),
            0 24px 64px rgba(0,0,0,0.4),
            0 0 80px rgba(0,212,255,0.06);
          animation: fade-in-up 0.5s ease both;
        }
        
        .mobile-card {
          padding: 2rem 1.5rem;
          max-width: 380px;
        }

        @keyframes login-shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-8px); }
          30%, 60%, 90% { transform: translateX(8px); }
        }
        .login-shake { animation: login-shake 0.55s ease; }

        /* Logo */
        .login-logo-wrap {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.75rem;
          transition: all 0.3s ease;
        }
        .login-logo-ring {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 1.5px solid rgba(0,212,255,0.3);
          animation: ring-pulse 2.5s ease-in-out infinite;
        }
        .login-logo-ring-outer {
          inset: -12px;
          border-color: rgba(0,212,255,0.12);
          animation-delay: 0.4s;
        }
        .login-logo-icon {
          width: 80%; height: 80%;
          border-radius: 50%;
          background: rgba(0,212,255,0.08);
          border: 2px solid rgba(0,212,255,0.3);
          display: flex; align-items: center; justify-content: center;
          color: #00d4ff;
          box-shadow: 0 0 24px rgba(0,212,255,0.2), inset 0 0 20px rgba(0,212,255,0.05);
          animation: float 3s ease-in-out infinite;
        }

        /* Heading */
        .login-heading { text-align: center; margin-bottom: 1.75rem; }
        .login-title {
          font-size: 1.6rem; font-weight: 700;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #f0f4ff 0%, #00d4ff 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.4rem;
        }
        .login-subtitle {
          font-size: 0.82rem;
          color: rgba(240,244,255,0.5);
          line-height: 1.5;
        }

        /* Error */
        .login-error {
          display: flex; align-items: center; gap: 0.6rem;
          background: rgba(255,61,90,0.12);
          border: 1px solid rgba(255,61,90,0.3);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-size: 0.82rem;
          color: #ff8096;
          margin-bottom: 1rem;
          animation: slide-in-top 0.3s ease both;
        }

        /* Form */
        .login-form { display: flex; flex-direction: column; gap: 1.1rem; }
        .login-field { display: flex; flex-direction: column; gap: 0.45rem; }
        .login-label {
          font-size: 0.75rem; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: rgba(240,244,255,0.5);
        }
        .login-input-wrap { position: relative; }
        .login-input-icon {
          position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%);
          color: rgba(240,244,255,0.35); pointer-events: none;
          display: flex; align-items: center;
        }
        .login-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 0.75rem 0.85rem 0.75rem 2.6rem;
          color: #f0f4ff;
          font-family: var(--font);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .login-input-password { padding-right: 2.8rem; }
        .login-input:focus {
          border-color: rgba(0,212,255,0.5);
          box-shadow: 0 0 0 3px rgba(0,212,255,0.1);
          background: rgba(0,212,255,0.04);
        }
        .login-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .login-input::placeholder { color: rgba(240,244,255,0.25); }

        .login-eye-btn {
          position: absolute; right: 0.85rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(240,244,255,0.35); padding: 0.2rem;
          display: flex; align-items: center;
          transition: color 0.2s;
        }
        .login-eye-btn:hover { color: rgba(240,244,255,0.7); }

        /* Submit */
        .login-submit {
          display: flex; align-items: center; justify-content: center; gap: 0.6rem;
          width: 100%;
          padding: 0.9rem 1.5rem;
          margin-top: 0.5rem;
          background: linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,212,255,0.08) 100%);
          border: 1px solid rgba(0,212,255,0.4);
          border-radius: 14px;
          color: #00d4ff;
          font-family: var(--font);
          font-size: 0.95rem; font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative; overflow: hidden;
        }
        .login-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(0,212,255,0.22) 0%, rgba(0,212,255,0.14) 100%);
          border-color: rgba(0,212,255,0.7);
          box-shadow: 0 0 24px rgba(0,212,255,0.25), 0 4px 16px rgba(0,0,0,0.2);
          transform: translateY(-1px);
        }
        .login-submit:active:not(:disabled) { transform: translateY(0) scale(0.98); }
        .login-submit:disabled { opacity: 0.45; cursor: not-allowed; }
        
        /* PIN & Biometric Specifics */
        .pin-container {
          display: flex; flex-direction: column; align-items: center;
        }
        
        .pin-dots {
          display: flex; gap: 12px; margin-bottom: 2rem;
        }
        .pin-dot {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(0,212,255,0.4);
          background: transparent;
          transition: all 0.2s ease;
        }
        .pin-dot.filled {
          background: #00d4ff;
          border-color: #00d4ff;
          box-shadow: 0 0 10px rgba(0,212,255,0.6);
          transform: scale(1.1);
        }
        
        .pin-pad {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 16px; width: 100%; max-width: 280px; margin: 0 auto;
          transition: opacity 0.3s ease;
        }
        .pin-pad.disabled { opacity: 0.5; pointer-events: none; }
        
        .pin-btn {
          aspect-ratio: 1;
          border-radius: 50%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          color: #f0f4ff; font-size: 1.5rem; font-family: var(--font);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s ease;
        }
        .pin-btn:hover {
          background: rgba(0,212,255,0.1); border-color: rgba(0,212,255,0.3);
          box-shadow: 0 0 15px rgba(0,212,255,0.2);
          transform: scale(1.05);
        }
        .pin-btn:active { transform: scale(0.95); }
        .pin-btn-special {
          background: transparent; border: none; box-shadow: none;
          color: rgba(0,212,255,0.8);
        }
        .pin-btn-special:hover {
          background: rgba(0,212,255,0.05);
        }
        
        .mobile-login-btn {
          margin-top: 1.5rem;
          padding: 0.8rem 2rem;
          border-radius: 20px;
          background: rgba(0,212,255,0.15);
          border: 1px solid rgba(0,212,255,0.4);
          color: #00d4ff; font-weight: 600; cursor: pointer;
          transition: all 0.2s;
        }
        .mobile-login-btn:disabled { opacity: 0; pointer-events: none; }

        /* Footer */
        .login-footer {
          text-align: center;
          font-size: 0.7rem;
          color: rgba(240,244,255,0.2);
          margin-top: 1.5rem;
          letter-spacing: 0.03em;
        }
      `}</style>
    </div>
  );
}
