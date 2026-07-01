import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import SongCard from '../components/common/SongCard';

const MOODS = ['happy','sad','angry','neutral','surprised','fearful'];
const MOOD_EMOJIS = { happy:'😄',sad:'😢',angry:'😠',neutral:'😐',surprised:'😲',fearful:'😨' };

export default function Recommendations() {
  const { API, detectedEmotion, toast } = useApp();
  const [selectedMood, setSelectedMood] = useState(detectedEmotion || 'happy');
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [similarRecs, setSimilarRecs] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [isPersonalized, setIsPersonalized] = useState(false);

  useEffect(() => { fetchSongs(selectedMood); }, [selectedMood]);
  useEffect(() => { fetchSimilarRecs(); }, []);

  const fetchSongs = async (mood) => {
    setLoading(true);
    try {
      const r = await API.get(`/music/recommend/${mood}?limit=20`);
      setSongs(r.data.recommendations || []);
      setIsPersonalized(r.data.personalized || false);
    } catch { toast('Could not load recommendations', 'error'); }
    setLoading(false);
  };

  const fetchSimilarRecs = async () => {
    setSimilarLoading(true);
    try {
      const r = await API.get('/music/similar-pattern-recommendations');
      setSimilarRecs(r.data.recommendations || []);
    } catch {
      toast('Could not load similar emotional pattern recommendations', 'error');
    }
    setSimilarLoading(false);
  };

  return (
    <div className="page-content animate-fade">
      <h1 style={{ fontSize:28, fontWeight:800, marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
        ✦ Recommendations
        {isPersonalized && (
          <span style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius-full)',
            background: 'rgba(92,252,216,0.15)', border: '1px solid #5cfcd8',
            color: '#5cfcd8', fontWeight: 700
          }}>
            ✨ AI Personalized
          </span>
        )}
      </h1>
      <p style={{ color:'var(--text-secondary)', marginBottom:28 }}>
        {isPersonalized ? 'ML model-ranked playlist tuned to your taste' : 'Curated music for every mood'}
      </p>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:32 }}>
        {MOODS.map(m => (
          <button key={m} onClick={() => setSelectedMood(m)}
            style={{
              padding:'10px 20px', borderRadius:'var(--radius-full)', fontSize:14,
              border:`1px solid ${selectedMood===m ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              background: selectedMood===m ? 'var(--accent-primary)' : 'transparent',
              color: selectedMood===m ? 'white' : 'var(--text-secondary)',
              cursor:'pointer', transition:'all var(--transition)',
              display:'flex', alignItems:'center', gap:6
            }}>
            {MOOD_EMOJIS[m]} {m.charAt(0).toUpperCase()+m.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16, marginBottom:40 }}>
          {[...Array(8)].map((_,i) => <div key={i} className="skeleton" style={{ aspectRatio:'1', borderRadius:20 }} />)}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16, marginBottom:40 }}>
          {songs.map((s,i) => <SongCard key={i} song={s} queue={songs} index={i} />)}
        </div>
      )}

      <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '40px 0' }} />

      <h2 style={{ fontSize:22, fontWeight:700, marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
        👥 Liked by People with Similar Emotional Patterns
      </h2>
      <p style={{ color:'var(--text-secondary)', marginBottom:20 }}>
        Discover what others with matching emotional wellness trends are listening to
      </p>

      {similarLoading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16 }}>
          {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ aspectRatio:'1', borderRadius:20 }} />)}
        </div>
      ) : similarRecs.length === 0 ? (
        <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', textAlign: 'center' }}>
          No custom recommendations yet. Start logging your mood history!
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16 }}>
          {similarRecs.map((s,i) => <SongCard key={i} song={s} queue={similarRecs} index={i} />)}
        </div>
      )}
    </div>
  );
}
