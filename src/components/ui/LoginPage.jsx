import React, { useState } from 'react';
import './LoginPage.css';

export function LoginPage({ onLogin, error: externalError }) {
  const [userId, setUserId]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [localErr, setLocalErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalErr('');
    setLoading(true);
    try {
      const ok = await onLogin(userId, password);
      if (!ok) setLocalErr('Invalid User ID or Password. Please try again.');
    } catch {
      setLocalErr('Authentication failed. Check your network or contact admin.');
    } finally {
      setLoading(false);
    }
  };

  const err = localErr || externalError;

  return (
    <div className="lp-bg">
      <div className="lp-container">
        {/* ── LEFT: illustration panel ── */}
        <div className="lp-left">
          <img
            src="/login-illustration.png"
            alt="NoBrokerHood Campaign Intelligence"
            className="lp-illustration"
          />
          <div className="lp-overlay-container">
            <div className="lp-floating-badge lp-floating-badge-1">
              <span className="lp-badge-dot" />
              <span>Sync Status: Live</span>
            </div>
            <div className="lp-floating-badge lp-floating-badge-2">
              <span className="lp-badge-dot orange" />
              <span>Ingested +12%</span>
            </div>
            
            {/* Sparkle SVGs */}
            <div className="lp-sparkle-star lp-sparkle-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z" />
              </svg>
            </div>
            <div className="lp-sparkle-star lp-sparkle-2">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── RIGHT: login form panel ── */}
        <div className="lp-right">

          {/* Avatar */}
          <div className="lp-avatar">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>

          <h1 className="lp-title">Welcome Back!</h1>
          <p className="lp-sub">Please login to your account</p>

          {err && <div className="lp-error">{err}</div>}

          <form className="lp-form" onSubmit={handleSubmit} noValidate>

            {/* User ID */}
            <div className="lp-field">
              <label className="lp-label" htmlFor="lp-uid">User ID</label>
              <div className="lp-iw">
                <span className="lp-ico">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </span>
                <input
                  id="lp-uid" type="text" className="lp-input"
                  placeholder="Enter your user ID"
                  value={userId} onChange={e => setUserId(e.target.value)}
                  required autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="lp-field">
              <label className="lp-label" htmlFor="lp-pw">Password</label>
              <div className="lp-iw">
                <span className="lp-ico">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="lp-pw" type={showPw ? 'text' : 'password'}
                  className="lp-input lp-input-pw"
                  placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                />
                <button type="button" className="lp-eye"
                  onClick={() => setShowPw(v => !v)} aria-label="Toggle password">
                  {showPw
                    ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="lp-row">
              <label className="lp-remember">
                <input type="checkbox" className="lp-check"
                  checked={remember} onChange={e => setRemember(e.target.checked)}/>
                Remember me
              </label>
              <button type="button" className="lp-forgot"
                onClick={() => alert('Contact Admin to recover credentials.')}>
                Forgot Password?
              </button>
            </div>

            {/* Submit */}
            <button type="submit"
              className={`lp-submit${loading ? ' lp-submit--busy' : ''}`}
              disabled={loading}>
              {loading ? 'Logging in…' : 'Login'}
              {!loading && (
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              )}
            </button>

            {/* Divider */}
            <div className="lp-divider">
              <span/><span>or continue with</span><span/>
            </div>

            {/* Social */}
            <div className="lp-social">
              <button type="button" className="lp-soc-btn"
                onClick={() => alert('Google sign-in coming soon.')}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </button>
              <button type="button" className="lp-soc-btn"
                onClick={() => alert('Microsoft sign-in coming soon.')}>
                <svg viewBox="0 0 23 23" width="18" height="18">
                  <rect x="0"    y="0"    width="10.5" height="10.5" fill="#F25022"/>
                  <rect x="12.5" y="0"    width="10.5" height="10.5" fill="#7FBA00"/>
                  <rect x="0"    y="12.5" width="10.5" height="10.5" fill="#00A4EF"/>
                  <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900"/>
                </svg>
              </button>
            </div>

            <p className="lp-foot">
              Don't have an account?{' '}
              <button type="button" className="lp-link"
                onClick={() => alert('Contact Admin to request access.')}>
                Contact Admin
              </button>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
}
