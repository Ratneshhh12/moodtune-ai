import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { token } = useParams();
  const { API, toast } = useApp();
  const navigate = useNavigate();

  const strength = password.length < 4 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthColors = ['var(--border-color)', 'var(--accent-pink)', 'var(--accent-amber)', 'var(--accent-teal)'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Strong'];

  const handleSubmit = async e => {
    e.preventDefault();
    if (password !== confirm) { toast('Passwords do not match', 'error'); return; }
    if (password.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { token, password });
      setDone(true);
      toast('Password reset successfully! 🎉', 'success');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      toast(err.response?.data?.error || 'Reset failed. Link may have expired.', 'error');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-primary)' }}>
      {/* BG decoration */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, left: '50%', top: '50%', transform: 'translate(-50%,-60%)', borderRadius: '50%', background: 'rgba(124,92,252,0.08)', filter: 'blur(100px)' }} />
      </div>

      <div className="animate-fade" style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)', padding: '48px 40px',
        width: '100%', maxWidth: 420, position: 'relative'
      }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 10 }}>Password Updated!</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
              Your password has been reset. Redirecting you to login...
            </p>
            <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Go to Login →</Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
              <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 6 }}>Reset Password</h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Choose a strong new password</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showPass ? '👁' : '🙈'}
                  </button>
                </div>
                {password && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, alignItems: 'center' }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColors[strength] : 'var(--border-color)', transition: 'background 0.3s ease' }} />
                    ))}
                    <span style={{ fontSize: 11, color: strengthColors[strength], marginLeft: 6 }}>{strengthLabels[strength]}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  style={{ borderColor: confirm && confirm !== password ? 'var(--accent-pink)' : '' }}
                />
                {confirm && confirm !== password && (
                  <p style={{ fontSize: 12, color: 'var(--accent-pink)', marginTop: 4 }}>Passwords don't match</p>
                )}
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: 4 }}>
                {loading ? <><span className="animate-spin" style={{ fontSize: 16 }}>↻</span> Resetting...</> : '🔑 Reset Password'}
              </button>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                <Link to="/login" style={{ color: 'var(--accent-primary)' }}>← Back to Login</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
