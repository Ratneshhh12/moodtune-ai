import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const { login, googleLogin, toast, API } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoogleLogin = async (response) => {
    setLoading(true);
    try {
      await googleLogin(response.credential);
      toast('Signed in with Google! 🎵', 'success');
      navigate('/dashboard');
    } catch (err) {
      toast(err.response?.data?.error || 'Google login failed.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    /* global google */
    let interval;
    const initGoogle = () => {
      if (window.google) {
        google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || "288803437433-123efttbeijfe740upd1dnk6lfrs2f6k.apps.googleusercontent.com",
          callback: handleGoogleLogin
        });
        const btn = document.getElementById("google-signin-btn");
        if (btn) {
          google.accounts.id.renderButton(btn, {
            theme: "outline",
            size: "large",
            width: 340
          });
          clearInterval(interval);
        }
      }
    };

    if (window.google) {
      initGoogle();
    } else {
      interval = setInterval(initGoogle, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
      setUnverifiedEmail(location.state.email);
    }
    if (location.state?.devOtp) {
      setDevOtp(location.state.devOtp);
    }
  }, [location]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setUnverifiedEmail('');
    try {
      await login(email, password);
      toast('Welcome back! 🎵', 'success');
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.unverified) {
        setUnverifiedEmail(email);
        if (err.response.data.dev_otp) {
          setDevOtp(err.response.data.dev_otp);
        }
        toast('Please verify your email address.', 'warning');
      } else {
        toast(err.response?.data?.error || 'Login failed. Check credentials.', 'error');
      }
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const res = await API.post('/auth/resend-verification', { email: unverifiedEmail });
      if (res.data?.dev_otp) {
        setDevOtp(res.data.dev_otp);
      }
      toast('Verification email resent! Check your inbox or terminal log.', 'success');
    } catch {
      toast('Failed to resend verification email.', 'error');
    }
    setResending(false);
  };


  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast('Please enter a valid 6-digit OTP', 'error');
      return;
    }
    setVerifyingOtp(true);
    try {
      await API.post('/auth/verify-otp', { email: unverifiedEmail, otp });
      try {
        await login(unverifiedEmail, password);
        toast('Email verified successfully! Welcome to MoodTune AI! 🎵', 'success');
        navigate('/dashboard');
        setUnverifiedEmail('');
      } catch (loginErr) {
        toast('Email verified successfully! Please enter your password to sign in.', 'success');
        setUnverifiedEmail('');
      }
    } catch (err) {
      toast(err.response?.data?.error || 'OTP verification failed', 'error');
    }
    setVerifyingOtp(false);
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'var(--bg-primary)' }}>
      {/* BG decoration */}
      <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none' }}>
        <div style={{ position:'absolute', width:600, height:600, left:'50%', top:'50%', transform:'translate(-50%,-60%)', borderRadius:'50%', background:'rgba(124,92,252,0.08)', filter:'blur(100px)' }} />
      </div>

      <div className="animate-fade" style={{
        background:'var(--bg-card)', border:'1px solid var(--border-color)',
        borderRadius:'var(--radius-xl)', padding:'48px 40px',
        width:'100%', maxWidth:420, position:'relative'
      }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🎵</div>
          <h1 style={{ fontSize:26, fontWeight:800, fontFamily:'var(--font-display)', marginBottom:6 }}>Welcome back</h1>
          <p style={{ fontSize:14, color:'var(--text-muted)' }}>Sign in to continue to MoodTune AI</p>
        </div>

        {unverifiedEmail && (
          <div style={{
            background: 'rgba(252, 92, 160, 0.08)',
            border: '1px solid rgba(252, 92, 160, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            marginBottom: '24px',
            fontSize: '13px',
            color: 'var(--text-primary)',
            textAlign: 'left'
          }}>
            <p style={{ fontWeight: 600, color: 'var(--accent-pink)', marginBottom: 6 }}>Email Unverified ✕</p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Enter the 6-digit OTP code sent to your email to verify and sign in.
            </p>
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
              <input
                type="text"
                placeholder="6-digit OTP code"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
                style={{
                  letterSpacing: '4px',
                  textAlign: 'center',
                  fontSize: '18px',
                  fontWeight: '700',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  width: '100%',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={verifyingOtp}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
              >
                {verifyingOtp ? 'Verifying...' : '✓ Verify & Sign In'}
              </button>
            </form>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                style={{
                  color: 'var(--accent-primary)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none'
                }}
              >
                {resending ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Email address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <label style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Password</label>
            <div style={{ position:'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{ paddingRight:44 }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:18,background:'none',border:'none',cursor:'pointer' }}>
                {showPass ? '👁' : '🙈'}
              </button>
            </div>
          </div>

          <div style={{ textAlign:'right', marginTop:-8 }}>
            <Link to="/forgot-password" style={{ fontSize:13, color:'var(--accent-primary)' }}>Forgot password?</Link>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'14px', marginTop:4 }}>
            {loading ? <><span className="animate-spin" style={{ fontSize:16 }}>↻</span> Signing in...</> : '→ Sign In'}
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:10, margin:'16px 0' }}>
            <div style={{ flex:1, height:1, background:'var(--border-color)' }} />
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>OR</span>
            <div style={{ flex:1, height:1, background:'var(--border-color)' }} />
          </div>

          <div style={{ display:'flex', justifyContent:'center' }}>
            <div id="google-signin-btn" style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
          </div>
        </form>

        <p style={{ textAlign:'center', fontSize:14, color:'var(--text-muted)', marginTop:24 }}>
          No account?{' '}
          <Link to="/register" style={{ color:'var(--accent-primary)', fontWeight:500 }}>Create account</Link>
        </p>


      </div>
    </div>
  );
}
