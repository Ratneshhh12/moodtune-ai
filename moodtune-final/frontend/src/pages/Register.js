import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Register() {
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { register, googleLogin, toast } = useApp();
  const navigate = useNavigate();

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
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || "333069151520-22cuf8o3ghrgrshg7660a927p78r6c6c.apps.googleusercontent.com",
          callback: handleGoogleLogin
        });
        const btn = document.getElementById("google-signup-btn");
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

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast('Passwords do not match', 'error'); return; }
    if (form.password.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
    setLoading(true);
    try {
      const res = await register(form.name, form.email, form.password);
      if (res && res.auto_verified) {
        toast('Account created! Auto-verified in Dev Mode 🎵', 'success');
        navigate('/login');
      } else {
        toast('Account created! Please verify your email.', 'success');
        navigate('/login', { state: { email: form.email, devOtp: res.dev_otp } });
      }
    } catch (err) {
      toast(err.response?.data?.error || 'Registration failed', 'error');
    }
    setLoading(false);
  };

  const strength = form.password.length < 4 ? 0 : form.password.length < 8 ? 1 : form.password.length < 12 ? 2 : 3;
  const strengthColors = ['var(--border-color)','var(--accent-pink)','var(--accent-amber)','var(--accent-teal)'];
  const strengthLabels = ['','Weak','Fair','Strong'];

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div className="animate-fade" style={{ background:'var(--bg-card)',border:'1px solid var(--border-color)',borderRadius:'var(--radius-xl)',padding:'48px 40px',width:'100%',maxWidth:440 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🎵</div>
          <h1 style={{ fontSize:26, fontWeight:800, fontFamily:'var(--font-display)', marginBottom:6 }}>Create account</h1>
          <p style={{ fontSize:14, color:'var(--text-muted)' }}>Start your personalized music journey</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[
            { name:'name', label:'Full Name', type:'text', placeholder:'Your name' },
            { name:'email', label:'Email', type:'email', placeholder:'you@example.com' },
          ].map(f => (
            <div key={f.name}>
              <label style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:6,display:'block' }}>{f.label}</label>
              <input type={f.type} name={f.name} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder} required />
            </div>
          ))}

          <div>
            <label style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:6,display:'block' }}>Password</label>
            <div style={{ position:'relative' }}>
              <input type={showPass?'text':'password'} name="password" value={form.password} onChange={handleChange} placeholder="Min 8 characters" required style={{ paddingRight:44 }} />
              <button type="button" onClick={() => setShowPass(p=>!p)} style={{ position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:18,background:'none',border:'none',cursor:'pointer' }}>
                {showPass?'👁':'🙈'}
              </button>
            </div>
            {form.password && (
              <div style={{ display:'flex', gap:4, marginTop:6, alignItems:'center' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ flex:1,height:3,borderRadius:2,background:i<=strength?strengthColors[strength]:'var(--border-color)',transition:'background 0.3s ease' }} />
                ))}
                <span style={{ fontSize:11, color:strengthColors[strength], marginLeft:6 }}>{strengthLabels[strength]}</span>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize:13,color:'var(--text-secondary)',marginBottom:6,display:'block' }}>Confirm Password</label>
            <input type="password" name="confirm" value={form.confirm} onChange={handleChange} placeholder="Repeat password" required
              style={{ borderColor: form.confirm && form.confirm!==form.password ? 'var(--accent-pink)' : '' }} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width:'100%',justifyContent:'center',padding:'14px',marginTop:8 }}>
            {loading ? <><span className="animate-spin">↻</span> Creating...</> : '✓ Create Account'}
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:10, margin:'16px 0' }}>
            <div style={{ flex:1, height:1, background:'var(--border-color)' }} />
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>OR</span>
            <div style={{ flex:1, height:1, background:'var(--border-color)' }} />
          </div>

          <div style={{ display:'flex', justifyContent:'center' }}>
            <div id="google-signup-btn" style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
          </div>
        </form>

        <p style={{ textAlign:'center',fontSize:14,color:'var(--text-muted)',marginTop:20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--accent-primary)',fontWeight:500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
