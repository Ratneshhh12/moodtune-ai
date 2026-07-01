import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

const TAB_STYLES = (active) => ({
  padding:'10px 20px', borderRadius:'var(--radius-full)', fontSize:14, cursor:'pointer', border:'none',
  background: active ? 'var(--accent-primary)' : 'transparent',
  color: active ? 'white' : 'var(--text-secondary)', transition:'all var(--transition)'
});

export default function AdminPanel() {
  const { API, toast } = useApp();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [songs, setSongs] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    API.get('/admin/dashboard').then(r => setStats(r.data)).catch(() => toast('Admin access required', 'error'));
    API.get('/admin/analytics').then(r => setAnalytics(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'users') API.get('/admin/users').then(r => setUsers(r.data.users || [])).catch(() => {});
    if (tab === 'songs') API.get('/admin/songs').then(r => setSongs(r.data.songs || [])).catch(() => {});
  }, [tab]);

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try { await API.delete(`/admin/users/${id}`); setUsers(u => u.filter(x=>x.id!==id)); toast('User deleted', 'success'); }
    catch { toast('Failed', 'error'); }
  };

  const deleteSong = async (id) => {
    if (!window.confirm('Delete this song?')) return;
    try { await API.delete(`/admin/songs/${id}`); setSongs(s => s.filter(x=>x.id!==id)); toast('Song deleted', 'success'); }
    catch { toast('Failed', 'error'); }
  };

  return (
    <div className="page-content animate-fade">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
        <div style={{ padding:'8px 16px', background:'rgba(252,184,92,0.15)', border:'1px solid rgba(252,184,92,0.3)', borderRadius:'var(--radius-full)', fontSize:13, color:'var(--accent-amber)' }}>⚙ Admin Panel</div>
        <h1 style={{ fontSize:28, fontWeight:800 }}>Control Center</h1>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:32, flexWrap:'wrap' }}>
        {['dashboard','users','songs','analytics'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={TAB_STYLES(tab===t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {tab === 'dashboard' && stats && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:16, marginBottom:32 }}>
            {[['👤','Total Users',stats.total_users],['🎵','Total Songs',stats.total_songs],['▶','Total Plays',stats.total_plays],['▤','Playlists',stats.total_playlists],['♡','Favorites',stats.total_favorites]].map(([icon,label,val]) => (
              <div key={label} style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-lg)', padding:'20px' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{icon}</div>
                <div style={{ fontSize:24, fontWeight:700, fontFamily:'var(--font-display)' }}>{val}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-xl)', padding:24 }}>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>🔥 Top Songs</h3>
              {(stats.top_songs||[]).map((s,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-color)' }}>
                  <span style={{ color:'var(--text-muted)', fontSize:12, width:16 }}>{i+1}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{s.title}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{s.artist}</div>
                  </div>
                  <span style={{ fontSize:12, color:'var(--accent-teal)' }}>{s.play_count} plays</span>
                </div>
              ))}
            </div>

            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-xl)', padding:24 }}>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>👤 Recent Users</h3>
              {(stats.recent_users||[]).map((u,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-color)' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--gradient-main)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'white', fontWeight:700 }}>{u.name?.[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{u.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.email}</div>
                  </div>
                  {u.is_admin && <span style={{ fontSize:11, color:'var(--accent-amber)', padding:'2px 8px', border:'1px solid var(--accent-amber)', borderRadius:'var(--radius-full)' }}>Admin</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-xl)', overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border-color)' }}>
                  {['ID','Name','Email','Admin','Verified','Actions'].map(h => (
                    <th key={h} style={{ padding:'14px 20px', textAlign:'left', fontSize:13, color:'var(--text-muted)', fontWeight:500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom:'1px solid var(--border-color)' }}>
                    <td style={{ padding:'12px 20px', fontSize:13, color:'var(--text-muted)' }}>#{u.id}</td>
                    <td style={{ padding:'12px 20px', fontSize:14, fontWeight:500 }}>{u.name}</td>
                    <td style={{ padding:'12px 20px', fontSize:13, color:'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding:'12px 20px' }}><span style={{ fontSize:12, color: u.is_admin?'var(--accent-amber)':'var(--text-muted)' }}>{u.is_admin?'Yes':'No'}</span></td>
                    <td style={{ padding:'12px 20px' }}><span style={{ fontSize:12, color: u.is_verified?'var(--accent-teal)':'var(--accent-pink)' }}>{u.is_verified?'Yes':'No'}</span></td>
                    <td style={{ padding:'12px 20px' }}>
                      <button onClick={() => deleteUser(u.id)} style={{ fontSize:12, color:'var(--accent-pink)', background:'transparent', border:'1px solid var(--accent-pink)', padding:'4px 12px', borderRadius:'var(--radius-full)', cursor:'pointer' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'songs' && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-xl)', overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border-color)' }}>
                  {['ID','Title','Artist','Genre','Mood','Plays','Actions'].map(h => (
                    <th key={h} style={{ padding:'14px 20px', textAlign:'left', fontSize:13, color:'var(--text-muted)', fontWeight:500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {songs.map(s => (
                  <tr key={s.id} style={{ borderBottom:'1px solid var(--border-color)' }}>
                    <td style={{ padding:'12px 20px', fontSize:13, color:'var(--text-muted)' }}>#{s.id}</td>
                    <td style={{ padding:'12px 20px', fontSize:14, fontWeight:500 }}>{s.title}</td>
                    <td style={{ padding:'12px 20px', fontSize:13 }}>{s.artist}</td>
                    <td style={{ padding:'12px 20px', fontSize:13 }}>{s.genre}</td>
                    <td style={{ padding:'12px 20px', fontSize:13 }}>{s.mood}</td>
                    <td style={{ padding:'12px 20px', fontSize:13, color:'var(--accent-teal)' }}>{s.play_count}</td>
                    <td style={{ padding:'12px 20px' }}>
                      <button onClick={() => deleteSong(s.id)} style={{ fontSize:12, color:'var(--accent-pink)', background:'transparent', border:'1px solid var(--accent-pink)', padding:'4px 12px', borderRadius:'var(--radius-full)', cursor:'pointer' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'analytics' && analytics && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          {[['Mood Distribution', analytics.mood_distribution, 'mood'],['Genre Distribution', analytics.genre_distribution, 'genre']].map(([title, data, key]) => (
            <div key={title} style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:'var(--radius-xl)', padding:24 }}>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>{title}</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {(data||[]).sort((a,b)=>b.count-a.count).map(item => {
                  const max = Math.max(...data.map(x=>x.count));
                  return (
                    <div key={item[key]}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:13, textTransform:'capitalize' }}>{item[key]}</span>
                        <span style={{ fontSize:13, color:'var(--text-muted)' }}>{item.count}</span>
                      </div>
                      <div style={{ height:6, background:'var(--bg-secondary)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', background:'var(--gradient-main)', borderRadius:3, width:`${(item.count/max)*100}%`, transition:'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
