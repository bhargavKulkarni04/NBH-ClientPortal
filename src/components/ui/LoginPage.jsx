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
                onClick={() => alert('Email: Bhargav.s@nobroker.in\\nPhone: 8618818322')}>
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

            <p className="lp-foot" style={{ marginTop: '24px' }}>
              Don't have an account?{' '}
              <button type="button" className="lp-link"
                onClick={() => alert('Email: Bhargav.s@nobroker.in\\nPhone: 8618818322')}>
                Contact Admin
              </button>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
}
