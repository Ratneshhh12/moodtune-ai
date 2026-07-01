import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import SongCard from '../components/common/SongCard';

const MOOD_COLORS = {
  happy: '#fcb85c',
  sad: '#5c8cfc',
  angry: '#fc5ca0',
  neutral: '#9090a8',
  surprised: '#5cfcd8',
  fearful: '#7c5cfc',
  disgusted: '#5cfcd8',
};

const MOOD_EMOJIS = {
  happy: '😄',
  sad: '😢',
  angry: '😠',
  neutral: '😐',
  surprised: '😲',
  fearful: '😨',
  disgusted: '🤢',
};

const ACTIVITY_EMOJIS = {
  workout: '💪',
  work: '💻',
  sleeping: '😴',
  relaxing: '🧘',
  social: '🎉',
};

export default function EmbeddingSpace() {
  const { API, toast, playSong } = useApp();
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [hoveredItem, setHoveredItem] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });

  // 1. Fetch SVD model coordinates and recommendations
  const fetchData = async (activity = '') => {
    try {
      const [statusRes, recsRes] = await Promise.all([
        API.get(`/music/foundation-status?activity=${activity}`),
        API.get(`/music/recommend-foundation?activity=${activity}&limit=12`),
      ]);
      setModelStatus(statusRes.data);
      setRecommendations(recsRes.data.songs || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load embedding space:', err);
      toast('Failed to load vector database status', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedActivity);
  }, [selectedActivity]);

  // Adjust canvas bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setCanvasSize({ width: Math.max(width, 400), height: 450 });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [modelStatus]);

  // 2. Draw Vector Space Canvas
  useEffect(() => {
    if (!canvasRef.current || !modelStatus || modelStatus.status === 'cold_start') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvasSize.width;
    const height = canvasSize.height;

    ctx.clearRect(0, 0, width, height);

    const songs = modelStatus.songs || [];
    const emotions = modelStatus.emotions || [];
    const activities = modelStatus.activities || [];
    const userDynamic = modelStatus.user_dynamic || [0, 0];

    // Find bounds for mapping values to pixels
    const xs = [...songs.map(s => s.x), ...emotions.map(e => e.x), ...activities.map(a => a.x), userDynamic[0]];
    const ys = [...songs.map(s => s.y), ...emotions.map(e => e.y), ...activities.map(a => a.y), userDynamic[1]];

    const minX = Math.min(...xs) - 0.1;
    const maxX = Math.max(...xs) + 0.1;
    const minY = Math.min(...ys) - 0.1;
    const maxY = Math.max(...ys) + 0.1;

    // Mapping functions
    const margin = 50;
    const scaleX = (x) => margin + ((x - minX) / (maxX - minX || 1)) * (width - margin * 2);
    const scaleY = (y) => margin + ((y - minY) / (maxY - minY || 1)) * (height - margin * 2);

    // A. Draw background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridCols = 8;
    for (let i = 0; i <= gridCols; i++) {
      const gx = margin + (i / gridCols) * (width - margin * 2);
      ctx.beginPath(); ctx.moveTo(gx, margin); ctx.lineTo(gx, height - margin); ctx.stroke();
    }
    const gridRows = 6;
    for (let i = 0; i <= gridRows; i++) {
      const gy = margin + (i / gridRows) * (height - margin * 2);
      ctx.beginPath(); ctx.moveTo(margin, gy); ctx.lineTo(width - margin, gy); ctx.stroke();
    }

    // B. Draw Song dots
    songs.forEach(song => {
      const sx = scaleX(song.x);
      const sy = scaleY(song.y);
      const color = MOOD_COLORS[song.mood] || '#9090a8';

      // If hovered, make it glow
      const isHovered = hoveredItem && hoveredItem.type === 'song' && hoveredItem.id === song.id;

      ctx.beginPath();
      ctx.arc(sx, sy, isHovered ? 8 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(0,0,0,0.4)';
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();

      if (isHovered) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}55`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }
    });

    // C. Draw Emotion anchors
    emotions.forEach(emo => {
      const ex = scaleX(emo.x);
      const ey = scaleY(emo.y);
      const color = MOOD_COLORS[emo.label] || '#7c5cfc';
      const emoji = MOOD_EMOJIS[emo.label] || '🎭';

      // Glowing anchor background
      ctx.shadowBlur = 16;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(ex, ey, 18, 0, Math.PI * 2);
      ctx.fillStyle = `${color}18`;
      ctx.fill();
      ctx.strokeStyle = `${color}44`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Draw Emoji
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, ex, ey);

      // Label
      ctx.font = '10px var(--font-body)';
      ctx.fillStyle = 'var(--text-secondary)';
      ctx.fillText(emo.label.toUpperCase(), ex, ey + 26);
    });

    // D. Draw Activity anchors
    activities.forEach(act => {
      const ax = scaleX(act.x);
      const ay = scaleY(act.y);
      const emoji = ACTIVITY_EMOJIS[act.label] || '🏃';

      ctx.shadowBlur = 10;
      ctx.shadowColor = '#5cfcd8';
      ctx.beginPath();
      ctx.arc(ax, ay, 15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(92,252,216,0.1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(92,252,216,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, ax, ay);

      ctx.font = '10px var(--font-body)';
      ctx.fillStyle = 'var(--text-secondary)';
      ctx.fillText(act.label.toUpperCase(), ax, ay - 24);
    });

    // E. Draw User Dynamic Pulsar
    const ux = scaleX(userDynamic[0]);
    const uy = scaleY(userDynamic[1]);

    // Concentric pulsating rings
    const time = Date.now() * 0.003;
    const wave1 = 14 + Math.sin(time) * 4;
    const wave2 = 24 + Math.cos(time) * 6;

    ctx.shadowBlur = 24;
    ctx.shadowColor = '#7c5cfc';
    ctx.beginPath();
    ctx.arc(ux, uy, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'var(--accent-primary)';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Glowing rings
    ctx.beginPath(); ctx.arc(ux, uy, wave1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(124,92,252,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath(); ctx.arc(ux, uy, wave2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(124,92,252,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // User Label
    ctx.font = 'bold 11px var(--font-display)';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4; ctx.shadowColor = '#000000';
    ctx.fillText('YOU (REAL-TIME STATE)', ux, uy + 42);
    ctx.shadowBlur = 0;

  }, [modelStatus, canvasSize, hoveredItem]);

  // Animation frame request loop for user pulsar wave effects
  useEffect(() => {
    let animId;
    const renderLoop = () => {
      // Re-trigger drawing to update pulsar wave animations
      setCanvasSize(prev => ({ ...prev }));
      animId = requestAnimationFrame(renderLoop);
    };
    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 3. Mouse Interaction (Hover Song Detection)
  const handleMouseMove = (e) => {
    if (!canvasRef.current || !modelStatus || modelStatus.status === 'cold_start') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const songs = modelStatus.songs || [];
    const emotions = modelStatus.emotions || [];
    const userDynamic = modelStatus.user_dynamic || [0, 0];

    const xs = [...songs.map(s => s.x), ...emotions.map(e => e.x), userDynamic[0]];
    const ys = [...songs.map(s => s.y), ...emotions.map(e => e.y), userDynamic[1]];

    const minX = Math.min(...xs) - 0.1;
    const maxX = Math.max(...xs) + 0.1;
    const minY = Math.min(...ys) - 0.1;
    const maxY = Math.max(...ys) + 0.1;

    const margin = 50;
    const scaleX = (x) => margin + ((x - minX) / (maxX - minX || 1)) * (canvasSize.width - margin * 2);
    const scaleY = (y) => margin + ((y - minY) / (maxY - minY || 1)) * (canvasSize.height - margin * 2);

    // Detect closest song dot
    let closestSong = null;
    let minDist = 12; // hover threshold in pixels

    songs.forEach(song => {
      const sx = scaleX(song.x);
      const sy = scaleY(song.y);
      const dist = Math.hypot(mx - sx, my - sy);
      if (dist < minDist) {
        minDist = dist;
        closestSong = song;
      }
    });

    if (closestSong) {
      setHoveredItem({ type: 'song', ...closestSong });
    } else {
      setHoveredItem(null);
    }
  };

  const handleCanvasClick = () => {
    if (hoveredItem && hoveredItem.type === 'song') {
      const songData = recommendations.find(s => s.id === hoveredItem.id) || {
        id: hoveredItem.id,
        title: hoveredItem.title,
        artist: hoveredItem.artist,
        mood: hoveredItem.mood,
        spotify_id: `custom_song_${hoveredItem.id}`,
        cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150',
      };
      playSong(songData, [songData], 0);
      toast(`Playing similar vector: "${songData.title}"`, 'success');
    }
  };

  // Retrain Trigger
  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await API.post('/music/train-foundation-model');
      toast('Foundation Model trained successfully! Vector Database updated.', 'success');
      fetchData(selectedActivity);
    } catch {
      toast('Failed to train foundation model', 'error');
    } finally {
      setRetraining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, animation: 'spin 1s linear infinite' }}>🌐</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Initializing vector database flat index...</p>
      </div>
    );
  }

  const isColdStart = modelStatus?.status === 'cold_start';

  return (
    <div className="page-content animate-fade">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🌐</span> Shared AI Vector Space
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Visualise joint embeddings of Songs, Emotions, and Activities. Retracted via Vector Database indexing.
          </p>
        </div>
        <button
          onClick={handleRetrain}
          disabled={retraining}
          className="btn-ghost"
          style={{
            padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: 13,
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)'
          }}
        >
          {retraining ? '⚡ Indexing...' : '🔄 Retrain Embeddings'}
        </button>
      </div>

      {isColdStart ? (
        <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⚛️</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--accent-teal)' }}>Shared Vector Index Warming Up</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 500, margin: '0 auto 20px', lineHeight: 1.6 }}>
            Our Personalized Foundation Model builds joint embeddings. We need interactions to populate the SVD spaces. Click the button to force initial seed training.
          </p>
          <button className="btn-primary" onClick={handleRetrain} disabled={retraining}>
            {retraining ? '⚡ Seeding Index...' : '🪄 Train Embeddings Now'}
          </button>
        </div>
      ) : (
        <div className="responsive-grid-3-12" style={{ marginBottom: 40 }} ref={containerRef}>
          
          {/* Canvas Card */}
          <div className="glass-card" style={{ padding: 20, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>PCA 2D PROJECTION OF SHARED EMBEDDING SPACE</span>
              {hoveredItem && hoveredItem.type === 'song' && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${MOOD_COLORS[hoveredItem.mood]}20`, color: MOOD_COLORS[hoveredItem.mood], fontWeight: 700 }}>
                  🎵 {hoveredItem.title} - {hoveredItem.artist}
                </span>
              )}
            </div>
            
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onMouseMove={handleMouseMove}
              onClick={handleCanvasClick}
              style={{
                background: '#07070b',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                display: 'block',
                cursor: hoveredItem ? 'pointer' : 'default',
                width: '100%',
              }}
            />
            
            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 16, fontSize: 11, color: 'var(--text-secondary)', justifyContent: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fcb85c' }} /> Happy Songs
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5c8cfc' }} /> Sad Songs
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fc5ca0' }} /> Angry Songs
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9090a8' }} /> Neutral Songs
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>🎭</span> Emotion Anchors
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>⚡</span> User Dynamic Vector
              </span>
            </div>
          </div>

          {/* Activity Overrides & DB stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Vector DB Status */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', color: '#5cfcd8' }}>Vector DB Index Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Index Provider</span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>FAISS / Local</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Search Type</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'capitalize' }}>
                    {modelStatus?.index_type?.replace(/_/g, ' ') || 'numpy cosine'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vector Dimension</span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>{modelStatus?.dimension || 16} Dimensions</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Indexed Items</span>
                  <span style={{ fontWeight: 700, color: '#ffffff' }}>{modelStatus?.total_songs || 0} Songs</span>
                </div>
              </div>
            </div>

            {/* Activity Override Panel */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Activity Override</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.5, marginBottom: 16 }}>
                Simulate different behavioral filters. Changing this shifts your real-time vector coordinate towards target activities:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { id: '', label: 'Default Context', icon: '⚡', desc: 'DMI Real-time state only' },
                  { id: 'workout', label: 'Workout Session', icon: '💪', desc: 'Biasa positive energetic beats' },
                  { id: 'work', label: 'Coding / Study', icon: '💻', desc: 'Focus lo-fi concentration hits' },
                  { id: 'sleeping', label: 'Rest / Sleep', icon: '😴', desc: 'Soothing delta waves & rain' },
                  { id: 'relaxing', label: 'Meditation / Relax', icon: '🧘', desc: 'Deep calm acoustic recovery' },
                  { id: 'social', label: 'Social Gathering', icon: '🎉', desc: 'High upbeat party hits' }
                ].map(act => (
                  <button
                    key={act.id}
                    onClick={() => setSelectedActivity(act.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 'var(--radius-md)',
                      fontSize: 13, textAlign: 'left',
                      background: selectedActivity === act.id ? 'var(--gradient-main)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selectedActivity === act.id ? 'transparent' : 'var(--border-color)'}`,
                      color: selectedActivity === act.id ? '#ffffff' : 'var(--text-primary)',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedActivity === act.id ? '0 4px 12px rgba(124,92,252,0.3)' : 'none'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{act.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{act.label}</div>
                      <div style={{ fontSize: 10, color: selectedActivity === act.id ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{act.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vector recommendations list */}
      {!isColdStart && recommendations.length > 0 && (
        <section className="animate-fade" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                ⚛️ Nearest Neighbor Vector Recommendations
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Loaded from local Vector Index search matching your current context (Cosine similarity score)
              </p>
            </div>
            {selectedActivity && (
              <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(92,252,216,0.12)', border: '1px solid #5cfcd8', color: '#5cfcd8', fontWeight: 600 }}>
                {ACTIVITY_EMOJIS[selectedActivity]} Activity Filter Active: {selectedActivity.toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recommendations.map((song, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <SongCard song={song} queue={recommendations} index={i} compact />
                <span style={{
                  position: 'absolute', right: 90, top: 18,
                  fontSize: 11, fontWeight: 700, color: '#5cfcd8',
                  background: 'rgba(92,252,216,0.1)', border: '1px solid rgba(92,252,216,0.2)',
                  padding: '3px 8px', borderRadius: 4, pointerEvents: 'none'
                }}>
                  Score: +{song.vector_score ? song.vector_score.toFixed(4) : '0.0000'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
