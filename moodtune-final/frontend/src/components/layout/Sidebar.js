import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import MoodAvatar from '../common/MoodAvatar';

const navItems = [
  { path: '/dashboard',  icon: '⬡', label: 'Home' },
  { path: '/mood',       icon: '🧠', label: 'Insights' },
  { path: '/streaks',    icon: '🔥', label: 'Streaks' },
  { path: '/circle',     icon: '⭕', label: 'Mood Circle' },
  { path: '/recommendations', icon: '✦', label: 'For You' },
  { path: '/search',     icon: '◯', label: 'Search' },
  { path: '/playlists',  icon: '🪄', label: 'Playlists' },
  { path: '/favorites',  icon: '◈', label: 'Favorites' },
  { path: '/history',    icon: '◷', label: 'History' },
];

export default function Sidebar() {
  const { user, logout, theme, toggleTheme, sidebarOpen, setSidebarOpen } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:998,backdropFilter:'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside 
        className={`sidebar-container ${sidebarOpen ? 'open' : ''}`}
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0, top: 0,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          zIndex: 999,
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 32, paddingLeft: 8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width: 36, height: 36,
              background: 'var(--gradient-main)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
              boxShadow: 'var(--shadow-accent)',
              animation: 'glow 3s ease-in-out infinite'
            }}>🎵</div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, letterSpacing:'-0.01em' }}>
                MoodTune
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:'0.08em' }}>AI</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'var(--gradient-main)' : 'transparent',
                transition: 'all var(--transition)',
                textDecoration: 'none',
                boxShadow: isActive ? '0 4px 16px rgba(124,92,252,0.3)' : 'none',
              })}
            >
              <span style={{ fontSize:18, width:20, textAlign:'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {user?.is_admin && (
            <NavLink
              to="/admin"
              onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 'var(--radius-md)',
                fontSize: 14, fontWeight: isActive ? 500 : 400,
                color: isActive ? 'white' : 'var(--accent-amber)',
                background: isActive ? 'var(--accent-amber)' : 'transparent',
                transition: 'all var(--transition)',
              })}
            >
              <span style={{ fontSize:18 }}>⚙</span>
              Admin Panel
            </NavLink>
          )}
        </nav>

        {/* Bottom actions */}
        <div style={{ borderTop:'1px solid var(--border-color)', paddingTop:16, display:'flex', flexDirection:'column', gap:8 }}>
          <button
            onClick={toggleTheme}
            style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'10px 14px', borderRadius:'var(--radius-md)',
              color:'var(--text-secondary)', fontSize:14,
              transition:'all var(--transition)',
              background:'transparent',
            }}
          >
            <span style={{ fontSize:18 }}>{theme === 'dark' ? '☀' : '◑'}</span>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>

          {user && (
            <NavLink
              to="/profile"
              onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', fontSize:14 }}
            >
              {user.profile_image ? (
                <div style={{
                  width:28, height:28, borderRadius:'50%',
                  background:'var(--gradient-main)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:12, color:'white', fontWeight:700,
                  overflow:'hidden'
                }}>
                  <img src={user.profile_image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
              ) : (
                <MoodAvatar user={user} size={28} />
              )}
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>{user.name}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>Profile</div>
              </div>
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'10px 14px', borderRadius:'var(--radius-md)',
              color:'var(--accent-pink)', fontSize:14, transition:'all var(--transition)',
              background:'transparent',
            }}
          >
            <span style={{ fontSize:18 }}>→</span>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
