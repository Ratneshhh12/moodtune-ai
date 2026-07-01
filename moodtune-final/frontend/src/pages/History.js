import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import SongCard from '../components/common/SongCard';
import { format } from 'date-fns';

const MOOD_COLORS = { happy:'#fcb85c',sad:'#5c8cfc',angry:'#fc5ca0',neutral:'#9090a8',surprised:'#5cfcd8',fearful:'#7c5cfc' };

export default function History() {
  const { API, toast } = useApp();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/music/history')
      .then(r => setHistory(r.data.history || []))
      .catch(() => toast('Could not load history', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Group by date
  const grouped = history.reduce((acc, h) => {
    const date = h.timestamp ? format(new Date(h.timestamp), 'MMM d, yyyy') : 'Today';
    if (!acc[date]) acc[date] = [];
    acc[date].push(h);
    return acc;
  }, {});

  return (
    <div className="page-content animate-fade">
      <h1 style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>◷ History</h1>
      <p style={{ color:'var(--text-secondary)', marginBottom:32 }}>Everything you've played</p>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[...Array(8)].map((_,i) => <div key={i} className="skeleton" style={{ height:70 }} />)}
        </div>
      ) : history.length === 0 ? (
        <div style={{ textAlign:'center', padding:80, color:'var(--text-muted)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>◷</div>
          <p>No listening history yet. Start playing some music!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} style={{ marginBottom:32 }}>
            <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.08em' }}>{date}</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {items.map((h,i) => h.song && (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: MOOD_COLORS[h.emotion_detected] || 'var(--text-muted)', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <SongCard song={h.song} queue={items.map(x=>x.song).filter(Boolean)} index={i} compact />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
