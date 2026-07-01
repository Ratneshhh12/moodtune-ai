import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { API, toast } = useApp();

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      setSent(true);
      toast('Reset link sent to your email!', 'success');
    } catch { toast('Something went wrong', 'error'); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'var(--bg-primary)' }}>
      {/* BG decoration */}
      <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        <div style={{ position:'absolute', width:600, height:600, left:'50%', top:'50%', transform:'translate(-50%,-60%)', borderRadius:'50%', background:'rgba(124,92,252,0.08)', filter:'blur(100px)' }} />
      </div>

      <div className="animate-fade" style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-xl)', padding:'48px 40px', width:'100%', maxWidth:420, position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔐</div>
          <h1 style={{ fontSize:24, fontWeight:800, fontFamily:'var(--font-display)', marginBottom:6 }}>Forgot Password</h1>
          <p style={{ fontSize:14, color:'var(--text-muted)' }}>Enter your email to receive a reset link</p>
        </div>
        {sent ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📧</div>
            <h2 style={{ fontSize:20, fontWeight:700, fontFamily:'var(--font-display)', marginBottom:10 }}>Check your inbox!</h2>
            <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:24 }}>
              We've sent a password reset link to <strong style={{ color:'var(--text-primary)' }}>{email}</strong>
            </p>
            <Link to="/login" style={{ color:'var(--accent-primary)', fontWeight:500 }}>← Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'14px' }}>
              {loading ? <><span className="animate-spin" style={{ fontSize:16 }}>↻</span> Sending...</> : '📧 Send Reset Link'}
            </button>
            <p style={{ textAlign:'center', fontSize:13, color:'var(--text-muted)' }}>
              <Link to="/login" style={{ color:'var(--accent-primary)' }}>← Back to Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
