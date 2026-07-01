import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function VerifyEmail() {
  const { token } = useParams();
  const { API, toast } = useApp();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No verification token found.'); return; }
    API.get(`/auth/verify/${token}`)
      .then(r => {
        setStatus('success');
        setMessage(r.data.message || 'Email verified successfully!');
        toast('Email verified! Welcome to MoodTune 🎵', 'success');
        setTimeout(() => navigate('/login'), 3000);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed. The link may have expired.');
      });
  }, [token]);

  const icons = { verifying: '⏳', success: '✅', error: '❌' };
  const titles = { verifying: 'Verifying your email...', success: 'Email Verified!', error: 'Verification Failed' };
  const subtitles = {
    verifying: 'Please wait while we confirm your email address.',
    success: 'Redirecting you to login in a moment...',
    error: ''
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
        width: '100%', maxWidth: 420, textAlign: 'center', position: 'relative'
      }}>
        <div style={{ fontSize: 64, marginBottom: 20, animation: status === 'verifying' ? 'pulse 1.5s ease-in-out infinite' : 'none' }}>
          {icons[status]}
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 10 }}>
          {titles[status]}
        </h1>

        {subtitles[status] && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
            {subtitles[status]}
          </p>
        )}

        {message && status !== 'verifying' && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: status === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${status === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
            fontSize: 14,
            color: status === 'success' ? 'var(--accent-teal)' : 'var(--accent-pink)',
            marginBottom: 24
          }}>
            {message}
          </div>
        )}

        {status === 'verifying' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--accent-primary)',
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
              }} />
            ))}
          </div>
        )}

        {status === 'success' && (
          <Link to="/login" style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: 'var(--gradient-main)',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none'
          }}>
            → Go to Login
          </Link>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Need a new verification link? Log in and check your profile settings.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link to="/login" style={{ color: 'var(--accent-primary)', fontSize: 14, fontWeight: 500 }}>
                ← Back to Login
              </Link>
              <span style={{ color: 'var(--border-color)' }}>|</span>
              <Link to="/register" style={{ color: 'var(--accent-primary)', fontSize: 14, fontWeight: 500 }}>
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
