import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import MoodAvatar from '../components/common/MoodAvatar';

const LANGS = [['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],['hi','हिन्दी'],['ja','日本語']];

export default function Profile() {
  const { user, API, toast, logout } = useApp();
  const [form, setForm] = useState({ 
    name: user?.name||'', 
    profile_image: user?.profile_image||'', 
    preferred_language: user?.preferred_language||'en',
    avatar_style: user?.avatar_style||'emoji'
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await API.put('/auth/profile', form);
      // Update local storage/context user object by calling get-me or reloading
      toast('Profile updated!', 'success');
      // Reload page or force reload auth user so layout components reflect changes immediately
      window.location.reload();
    } catch { toast('Failed to save', 'error'); }
    setSaving(false);
  };

  return (
    <div className="page-content animate-fade" style={{ maxWidth:600 }}>
      <h1 style={{ fontSize:28, fontWeight:800, marginBottom:32 }}>Profile</h1>

      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-xl)', padding:32, marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:32 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--border-color)' }}>
            {form.profile_image ? (
              <img src={form.profile_image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            ) : (
              <MoodAvatar user={{ ...user, avatar_style: form.avatar_style }} size={80} />
            )}
          </div>
          <div>
            <h2 style={{ fontSize:20, fontWeight:700 }}>{user?.name}</h2>
            <p style={{ color:'var(--text-muted)', fontSize:14 }}>{user?.email}</p>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', background: user?.is_verified?'rgba(92,252,216,0.15)':'rgba(252,92,160,0.15)', borderRadius:'var(--radius-full)', fontSize:12, marginTop:6 }}>
              <span style={{ color: user?.is_verified?'var(--accent-teal)':'var(--accent-pink)' }}>{user?.is_verified?'✓ Verified':'✕ Unverified'}</span>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Display Name</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Your name" />
          </div>
          <div>
            <label style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Profile Image URL</label>
            <input value={form.profile_image} onChange={e=>setForm(f=>({...f,profile_image:e.target.value}))} placeholder="https://..." />
          </div>
          <div>
            <label style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:6, display:'block' }}>Language</label>
            <select value={form.preferred_language} onChange={e=>setForm(f=>({...f,preferred_language:e.target.value}))}>
              {LANGS.map(([code,label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={save} disabled={saving} style={{ marginTop:8 }}>
            {saving ? '↻ Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>

      {/* Dynamic Emotion Avatar Settings */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-xl)', padding:32, marginBottom:24 }}>
        <h3 style={{ fontSize:18, fontWeight:800, marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
          ✨ Dynamic Emotion Avatar
        </h3>
        <p style={{ color:'var(--text-muted)', fontSize:13, lineHeight:1.6, marginBottom:24 }}>
          Your avatar changes daily and adapts its color theme and facial expressions to match your dominant mood. Choose your visual theme style below!
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:16, marginBottom:8 }}>
          {[
            { id: 'emoji', name: 'Emoji Face', desc: 'Expressive emojis' },
            { id: 'robot', name: 'Retro Robot', desc: 'Cute vector robots' },
            { id: 'shapes', name: 'Abstract Art', desc: 'Sleek geometric flows' }
          ].map(styleOpt => {
            const isSelected = form.avatar_style === styleOpt.id;
            return (
              <button
                key={styleOpt.id}
                onClick={() => setForm(f => ({ ...f, avatar_style: styleOpt.id }))}
                style={{
                  background: isSelected ? 'rgba(124,92,252,0.1)' : 'var(--bg-secondary)',
                  border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px 12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all var(--transition)'
                }}
              >
                <MoodAvatar user={{ ...user, avatar_style: styleOpt.id }} size={56} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'white' : 'var(--text-primary)' }}>{styleOpt.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{styleOpt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={logout} style={{ width:'100%', padding:16, border:'1px solid var(--accent-pink)', borderRadius:'var(--radius-lg)', color:'var(--accent-pink)', background:'transparent', fontSize:15, cursor:'pointer', transition:'all var(--transition)' }}>
        → Sign Out
      </button>
    </div>
  );
}
