import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import SongCard from '../components/common/SongCard';
import BarChart from '../components/insights/BarChart';
import DonutChart from '../components/insights/DonutChart';
import ScoreGauge from '../components/insights/ScoreGauge';
import EmotionHeatmap from '../components/insights/EmotionHeatmap';
import { EMOTION_COLORS, EMOTION_EMOJI } from '../components/insights/constants';
import MoodAvatar from '../components/common/MoodAvatar';

const MOOD_COLORS = { happy:'#fcb85c',sad:'#5c8cfc',angry:'#fc5ca0',neutral:'#9090a8',surprised:'#5cfcd8',fearful:'#7c5cfc',disgusted:'#5cfcd8' };
const MOOD_EMOJIS = { happy:'😄',sad:'😢',angry:'😠',neutral:'😐',surprised:'😲',fearful:'😨',disgusted:'🤢' };

export default function Dashboard() {
  const { user, API, detectedEmotion, toast, playSong } = useApp();
  const [trending, setTrending] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [stats, setStats] = useState({ plays:0, favorites:0, playlists:0 });
  const [insightsData, setInsightsData] = useState(null);
  const [dmiData, setDmiData] = useState(null);
  const [throwbackData, setThrowbackData] = useState(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [loading, setLoading] = useState(true);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const navigate = useNavigate();

  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [weather, setWeather] = useState({ temp: 28, condition: '☀️' });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
          const data = await res.json();
          if (data && data.current) {
            const temp = Math.round(data.current.temperature_2m);
            const code = data.current.weather_code;
            let condition = '☀️';
            if (code >= 1 && code <= 3) condition = '🌤️';
            else if (code >= 45 && code <= 48) condition = '🌫️';
            else if (code >= 51 && code <= 67) condition = '🌧️';
            else if (code >= 71 && code <= 77) condition = '❄️';
            else if (code >= 80 && code <= 82) condition = '🌦️';
            else if (code >= 95) condition = '⛈️';
            setWeather({ temp, condition });
          }
        } catch (e) {
          console.warn('Weather fetch failed:', e);
        }
      });
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    API.get(`/music/dashboard-data?emotion=${detectedEmotion||'neutral'}`)
      .then(res => {
        const d = res.data;
        setTrending(d.trending || []);
        setRecommended(d.recommendations?.recommendations || []);
        setIsPersonalized(d.recommendations?.personalized || false);
        setStats({
          plays: d.history?.length || 0,
          favorites: d.favorites?.length || 0,
          playlists: d.playlists?.length || 0
        });
        setInsightsData(d.insights);
        setDmiData(d.dynamic_mood);
        setThrowbackData(d.throwback);
      })
      .catch(() => toast('Failed to load dashboard', 'error'))
      .finally(() => setLoading(false));
  }, [detectedEmotion]);

  const getMostFrequentMood = (weekData) => {
    if (!weekData || weekData.length === 0) return 'N/A';
    const emotions = weekData.map(d => d.dominantEmotion).filter(Boolean);
    if (emotions.length === 0) return 'N/A';
    const counts = emotions.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  };

  const renderAnalyticsTab = () => {
    if (!insightsData) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No analytics data available yet. Try scanning your mood!</p>
        </div>
      );
    }

    const {
      todayMood = {},
      weekData = [],
      heatmap = [],
      genres = []
    } = insightsData;

    const mostFrequentMood = getMostFrequentMood(weekData);
    const mostFrequentMoodEmoji = MOOD_EMOJIS[mostFrequentMood] || '😐';
    
    const avgHappiness = weekData.length > 0 ? Math.round(weekData.reduce((s,d) => s+d.happiness,0) / weekData.length) : 0;
    const avgStress = weekData.length > 0 ? Math.round(weekData.reduce((s,d) => s+d.stress,0) / weekData.length) : 0;
    const totalMinutes = weekData.reduce((s,d) => s + d.minutesListened, 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} className="animate-fade">
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {/* Today's Mood */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Today's Dominant Mood</span>
              <span style={{ fontSize: 24 }}>{MOOD_EMOJIS[todayMood.emotion] || '😐'}</span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', color: MOOD_COLORS[todayMood.emotion] || 'var(--text-primary)' }}>
              {todayMood.emotion ? todayMood.emotion.charAt(0).toUpperCase() + todayMood.emotion.slice(1) : 'Neutral'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Confidence: {todayMood.confidence || 0}% · Last scan: {todayMood.lastScan || 'N/A'}</p>
          </div>

          {/* Most Frequent Mood */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Most Frequent Mood</span>
              <span style={{ fontSize: 24 }}>{mostFrequentMoodEmoji}</span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', color: MOOD_COLORS[mostFrequentMood] || 'var(--text-primary)' }}>
              {mostFrequentMood !== 'N/A' ? mostFrequentMood.charAt(0).toUpperCase() + mostFrequentMood.slice(1) : 'N/A'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Based on your last 7 days of logs</p>
          </div>

          {/* Average Wellness Index */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Weekly Wellness Index</span>
              <span style={{ fontSize: 24 }}>💯</span>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#fcb85c' }}>{avgHappiness}%</span>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Happiness</div>
              </div>
              <div style={{ width: 1, height: 28, background: 'var(--border-color)' }} />
              <div>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#5cfcd8' }}>{avgStress}%</span>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Stress</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Weekly activity snapshot</p>
          </div>
        </div>

        {/* Emotion Heatmap */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '28px' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>🗺️ Emotion Heatmap</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hourly emotional intensity and mood mapping over the last week</p>
          </div>
          <EmotionHeatmap heatmap={heatmap} />
        </div>

        {/* Trends & Listening Patterns (Grid) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {/* Weekly Report & Chart */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '28px' }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>📈 Weekly Mood Trends</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Happiness vs Stress levels over the week</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>— <span style={{ color: '#fcb85c' }}>■</span> Happiness</span>
                <span>— <span style={{ color: '#fc5ca0' }}>■</span> Stress</span>
              </div>
              <BarChart data={weekData} valueKey="happiness" secondKey="stress" color="#fcb85c" height={160} />
            </div>
          </div>

          {/* Listening Pattern */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '28px' }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>🎧 Listening Patterns</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your top genres and weekly listening minutes</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 24, alignItems: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <DonutChart
                  slices={genres.map(g => ({ value: g.pct, color: g.color }))}
                  size={130} thickness={24}
                />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{totalMinutes}m</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>this week</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {genres.slice(0, 4).map((g, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{g.icon}</span>
                        <span style={{ color: 'var(--text-primary)' }}>{g.genre}</span>
                      </span>
                      <span style={{ fontWeight: 700, color: g.color }}>{g.pct}%</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${g.pct}%`, background: g.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div style={{ padding: 32 }}>
      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, marginBottom: 16, borderRadius: 20 }} />)}
    </div>
  );

  return (
    <div className="page-content animate-fade">
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, marginBottom: 6, flexWrap: 'wrap' }}>
            <span>{greeting} 👋</span>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              🕒 {time}
            </span>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {weather.condition} {weather.temp}°C
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>{user?.name || 'Music Lover'}</h1>
          {detectedEmotion && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 16px', borderRadius: 'var(--radius-full)', background: `${MOOD_COLORS[detectedEmotion]}20`, border: `${MOOD_COLORS[detectedEmotion]}40` }}>
              <span style={{ fontSize: 18 }}>{MOOD_EMOJIS[detectedEmotion]}</span>
              <span style={{ fontSize: 13, color: MOOD_COLORS[detectedEmotion], fontWeight: 500 }}>Feeling {detectedEmotion} · Curating your playlist</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Daily Mood Avatar</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>Adapting to your vibe</div>
          </div>
          <MoodAvatar user={user} size={60} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border-color)', marginBottom: 24, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <button 
          onClick={() => setActiveTab('feed')}
          style={{
            padding: '12px 20px',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: activeTab === 'feed' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'feed' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            marginBottom: -1,
            transition: 'all var(--transition)'
          }}
        >
          🎵 Music Feed
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '12px 20px',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: activeTab === 'analytics' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'analytics' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            marginBottom: -1,
            transition: 'all var(--transition)'
          }}
        >
          📊 Mood &amp; Analytics
        </button>
      </div>

      {activeTab === 'feed' ? (
        <>
          {/* Today's AI Brief Hero Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(124, 92, 252, 0.2) 0%, rgba(252, 184, 92, 0.15) 100%)',
            border: '1px solid rgba(124, 92, 252, 0.3)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 32px',
            marginBottom: 32,
            boxShadow: '0 8px 32px rgba(124, 92, 252, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(124, 92, 252, 0.2)', border: '1px solid rgba(124, 92, 252, 0.4)', color: '#9c8cfc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ✨ Today's AI Brief
                </span>
                <h2 style={{ fontSize: 24, fontWeight: 850, fontFamily: 'var(--font-display)', marginTop: 12, marginBottom: 8, color: 'white' }}>
                  Hey {user?.name || 'Aryan'}, ready for a balanced day?
                </h2>
                
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16 }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Detected Vibe</span>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#5cfcd8', marginTop: 4 }}>
                      🧘 {detectedEmotion ? detectedEmotion.charAt(0).toUpperCase() + detectedEmotion.slice(1) : 'Relaxed'}
                    </div>
                  </div>
                  <div style={{ width: 1, height: 32, background: 'var(--border-color)' }} />
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Best Focus Window</span>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fcb85c', marginTop: 4 }}>
                      🕒 7:00 PM – 9:00 PM
                    </div>
                  </div>
                  <div style={{ width: 1, height: 32, background: 'var(--border-color)' }} />
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Daily Wellness Tip</span>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, maxWidth: 300 }}>
                      {detectedEmotion === 'sad' ? 'Focus on breathing; let soft acoustic strings ground your focus.' :
                       detectedEmotion === 'angry' ? 'Channel elevated energy into productivity or a brisk walk.' :
                       'Stay hydrated and take a 5-minute break every hour of deep work.'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ alignSelf: 'center' }}>
                <button 
                  className="btn-primary"
                  onClick={() => {
                    if (recommended && recommended.length > 0) {
                      playSong(recommended[0], recommended, 0);
                      toast("Playing today's recommended playlist!", "success");
                    } else {
                      toast("No recommended tracks available right now.", "info");
                    }
                  }}
                  style={{ background: 'linear-gradient(135deg, #7c5cfc 0%, #5cfcd8 100%)', boxShadow: '0 4px 14px rgba(124, 92, 252, 0.4)' }}
                >
                  ▶ Play Aligned Playlist
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Mood Intelligence Card */}
          {dmiData && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(124, 92, 252, 0.15) 0%, rgba(92, 252, 216, 0.06) 100%)',
              border: `1px solid ${dmiData.stress_prob > 60 || dmiData.fatigue_prob > 60 || dmiData.anxiety_prob > 60 ? 'rgba(124, 92, 252, 0.45)' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-xl)',
              padding: '24px 32px',
              marginBottom: 32,
              boxShadow: dmiData.stress_prob > 60 || dmiData.fatigue_prob > 60 || dmiData.anxiety_prob > 60 ? '0 8px 32px rgba(124, 92, 252, 0.25)' : 'var(--shadow-card)',
              position: 'relative',
              overflow: 'hidden'
            }} className="animate-fade">
              {/* Decorative background glow */}
              <div style={{
                position: 'absolute', top: -40, right: -40, width: 120, height: 120,
                background: 'rgba(124, 92, 252, 0.2)', filter: 'blur(40px)', borderRadius: '50%',
                pointerEvents: 'none'
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Radar Pulse Icon */}
                  <div style={{ position: 'relative', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#5cfcd8', zIndex: 2 }} />
                    <div className="dmi-radar-ring" style={{ position: 'absolute', width: 28, height: 28, borderRadius: '50%', background: 'rgba(92, 252, 216, 0.4)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5cfcd8', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                      AI Proactive Analysis
                      {dmiData.is_ml_active && (
                        <span style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 'var(--radius-full)',
                          background: 'rgba(124, 92, 252, 0.2)', border: '1px solid rgba(124, 92, 252, 0.4)',
                          color: '#9c8cfc', fontWeight: 700
                        }}>
                          ML Model Active
                        </span>
                      )}
                    </h3>
                    <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 6, marginBottom: 0, fontFamily: 'var(--font-display)', lineHeight: 1.4 }}>
                      {(() => {
                        const { stress_prob, fatigue_prob, anxiety_prob } = dmiData;
                        if (stress_prob >= 70 && fatigue_prob >= 70) {
                          return `User is ${stress_prob}% likely stressed and mentally fatigued after a long work session.`;
                        }
                        if (stress_prob > 60 || fatigue_prob > 60 || anxiety_prob > 60) {
                          const states = [];
                          if (stress_prob > 60) states.push(`stress (${stress_prob}%)`);
                          if (fatigue_prob > 60) states.push(`fatigue (${fatigue_prob}%)`);
                          if (anxiety_prob > 60) states.push(`anxiety (${anxiety_prob}%)`);
                          return `User is likely experiencing elevated ${states.join(' & ')}. Recommended recovery cycle suggested.`;
                        }
                        return `User state is balanced (Stress: ${stress_prob}%, Fatigue: ${fatigue_prob}%). Keep vibing!`;
                      })()}
                    </p>
                  </div>
                </div>

                {dmiData.playlist_recommendation && dmiData.playlist_recommendation.songs?.length > 0 && (
                  <button 
                    className="btn-primary" 
                    onClick={() => {
                      const songs = dmiData.playlist_recommendation.songs;
                      playSong(songs[0], songs, 0);
                      toast(`Playing recovery playlist: ${dmiData.playlist_recommendation.label}`, 'success');
                    }}
                    style={{ 
                      background: `linear-gradient(135deg, ${dmiData.playlist_recommendation.color || '#7c5cfc'} 0%, #5cfcd8 100%)`,
                      alignSelf: 'center',
                      boxShadow: `0 4px 14px ${dmiData.playlist_recommendation.color || '#7c5cfc'}40`
                    }}
                  >
                    <span>{dmiData.playlist_recommendation.emoji}</span> Play Calming Playlist
                  </button>
                )}
              </div>

              {dmiData.factors && dmiData.factors.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 16 }}>
                  {dmiData.factors.map((factor, index) => (
                    <span key={index} style={{
                      fontSize: 12, padding: '4px 12px', borderRadius: 'var(--radius-full)',
                      background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6
                    }}>
                      🎯 {factor}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Throwback Memory Lane */}
          {throwbackData && throwbackData.songs && throwbackData.songs.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(252, 184, 92, 0.15) 0%, rgba(124, 92, 252, 0.08) 100%)',
              border: '1px solid rgba(252, 184, 92, 0.3)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px 32px',
              marginBottom: 32,
              boxShadow: '0 8px 32px rgba(252, 184, 92, 0.15)',
              position: 'relative',
              overflow: 'hidden'
            }} className="animate-fade">
              {/* Decorative warm glow */}
              <div style={{
                position: 'absolute', top: -30, right: -30, width: 100, height: 100,
                background: 'rgba(252, 184, 92, 0.25)', filter: 'blur(35px)', borderRadius: '50%',
                pointerEvents: 'none'
              }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#fcb85c', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    🕰️ Memory Lane
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 'var(--radius-full)',
                      background: 'rgba(252, 184, 92, 0.2)', border: '1px solid rgba(252, 184, 92, 0.4)',
                      color: '#fcb85c', fontWeight: 700
                    }}>
                      Throwback
                    </span>
                  </h3>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, marginBottom: 0, lineHeight: 1.4 }}>
                    Exactly 1 year ago (on {throwbackData.throwback_date}), you were listening to these songs and feeling happy 😄
                  </p>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 4 }}>
                  {throwbackData.songs.map((song, index) => (
                    <div 
                      key={song.id || index}
                      onClick={() => playSong(song, throwbackData.songs, index)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all var(--transition)'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(252, 184, 92, 0.4)'; e.currentTarget.style.background = 'rgba(252, 184, 92, 0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                    >
                      <img src={song.cover_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${song.title}`} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                      </div>
                      <span style={{ fontSize: 14 }}>▶</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 40 }}>
            {[['🎵', 'Songs Played', stats.plays], ['♡', 'Favorites', stats.favorites], ['▤', 'Playlists', stats.playlists]].map(([icon, label, val]) => (
              <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{val}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Mood Detection CTA */}
          {!detectedEmotion && (
            <div style={{ background: 'var(--gradient-card)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: 'var(--radius-xl)', padding: '28px 32px', marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Detect your mood 📷</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Let AI read your face and find the perfect music</p>
              </div>
              <button className="btn-primary" onClick={() => navigate('/mood')}>Open Camera →</button>
            </div>
          )}

          {/* Recommended */}
          {recommended.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                  ✦ Recommended for You
                  {isPersonalized && (
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                      background: 'rgba(92,252,216,0.15)', border: '1px solid #5cfcd8',
                      color: '#5cfcd8', fontWeight: 700
                    }}>
                      ✨ AI Personalized
                    </span>
                  )}
                </h2>
                <button style={{ fontSize: 13, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/recommendations')}>See all →</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 16 }}>
                {recommended.slice(0, 6).map((s, i) => <SongCard key={i} song={s} queue={recommended} index={i} />)}
              </div>
            </section>
          )}

          {/* Trending */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>🔥 Trending Now</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trending.slice(0, 8).map((s, i) => <SongCard key={i} song={s} queue={trending} index={i} compact />)}
            </div>
          </section>
        </>
      ) : (
        renderAnalyticsTab()
      )}
    </div>
  );
}
