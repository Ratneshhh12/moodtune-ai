import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import SongCard from '../components/common/SongCard';

const MOOD_COLORS = { 
  happy: '#fcb85c', 
  sad: '#5c8cfc', 
  angry: '#fc5ca0', 
  neutral: '#9090a8', 
  surprised: '#5cfcd8', 
  fearful: '#7c5cfc', 
  disgusted: '#5cfcd8' 
};

const MOOD_EMOJIS = { 
  happy: '😄', 
  sad: '😢', 
  angry: '😠', 
  neutral: '😐', 
  surprised: '😲', 
  fearful: '😨', 
  disgusted: '🤢' 
};

export default function LyricsPage() {
  const { currentSong, detectedEmotion, API, token } = useApp();
  const [lyricsData, setLyricsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentSongs, setRecentSongs] = useState([]);
  const [favSongs, setFavSongs] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Load lyrics analysis
  useEffect(() => {
    if (!currentSong) {
      setLyricsData(null);
      return;
    }

    setLoading(true);
    API.get('/music/lyrics-analysis', {
      params: {
        title: currentSong.title,
        artist: currentSong.artist,
        user_emotion: detectedEmotion || 'neutral'
      }
    })
    .then(res => {
      setLyricsData(res.data);
    })
    .catch(err => {
      console.error("Lyrics analysis error:", err);
      setLyricsData({
        lyrics: "[Lyrics unavailable]\nFailed to load lyrics analysis from server.",
        lyrics_emotion: 'neutral',
        emotion_scores: { neutral: 100 },
        match_results: { match_score: 50, description: "Could not evaluate emotional matching." }
      });
    })
    .finally(() => {
      setLoading(false);
    });
  }, [currentSong, detectedEmotion, API]);

  // Load suggestions if no song is playing
  useEffect(() => {
    if (currentSong || !token) return;

    setLoadingSuggestions(true);
    Promise.all([
      API.get('/music/history').catch(() => ({ data: { history: [] } })),
      API.get('/music/favorites').catch(() => ({ data: { favorites: [] } }))
    ])
    .then(([histRes, favRes]) => {
      // Extract unique song dicts
      const hist = (histRes.data?.history || []).map(h => h.song).filter(Boolean);
      const favs = (favRes.data?.favorites || []).map(f => f.song).filter(Boolean);
      
      // Filter out duplicate songs
      const seenIds = new Set();
      const uniqueHist = [];
      for (const s of hist) {
        if (!seenIds.has(s.spotify_id || s.title)) {
          seenIds.add(s.spotify_id || s.title);
          uniqueHist.push(s);
        }
      }
      
      const uniqueFavs = [];
      for (const s of favs) {
        if (!seenIds.has(s.spotify_id || s.title)) {
          seenIds.add(s.spotify_id || s.title);
          uniqueFavs.push(s);
        }
      }

      setRecentSongs(uniqueHist.slice(0, 5));
      setFavSongs(uniqueFavs.slice(0, 5));
    })
    .catch(err => {
      console.warn("Failed to load suggestions:", err);
    })
    .finally(() => {
      setLoadingSuggestions(false);
    });
  }, [currentSong, token, API]);

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🎙️</span> Lyrics Mood Matcher
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Real-time NLP sentiment analysis matching song lyrics with your facial expressions
        </p>
      </div>

      {!currentSong ? (
        // Placeholder / Empty state
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: '48px 24px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎵</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, fontFamily: 'var(--font-display)' }}>
            No Song is Playing
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 32px', fontSize: 14, lineHeight: 1.6 }}>
            Play any song from the app, scan your mood, or choose one of the suggestions below to analyze lyrics &amp; check your compatibility.
          </p>

          {loadingSuggestions ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, textAlign: 'left' }}>
              {/* Favorites */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                  ⭐ From Your Favorites
                </h3>
                {favSongs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {favSongs.map((s, idx) => (
                      <SongCard key={idx} song={s} queue={favSongs} index={idx} compact />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No favorites found</p>
                )}
              </div>

              {/* History */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                  ◷ Recently Played
                </h3>
                {recentSongs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {recentSongs.map((s, idx) => (
                      <SongCard key={idx} song={s} queue={recentSongs} index={idx} compact />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No playing history found</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Lyrics analysis dashboard layout
        <div className="responsive-grid-12-08">
          
          {/* Column 1: Active Song Info & Lyrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(124,92,252,0.12) 0%, rgba(92,252,216,0.06) 100%)',
              border: '1px solid rgba(124,92,252,0.25)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: 20
            }}>
              <img
                src={currentSong.cover_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentSong.title}`}
                alt=""
                style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                onError={e => { e.target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${currentSong.title}`; }}
              />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: 4 }}>
                  Now Playing &amp; Analyzing
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-display)' }}>
                  {currentSong.title}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  {currentSong.artist}
                </p>
              </div>
            </div>

            {/* Lyrics Board */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px 24px',
              minHeight: 450,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                📖 Lyrics Transcription
              </h3>
              
              {loading ? (
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Fetching lyrics data...</p>
                </div>
              ) : lyricsData ? (
                <div style={{
                  fontSize: 16,
                  lineHeight: 2.0,
                  textAlign: 'center',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-line',
                  fontFamily: 'var(--font-body)',
                  maxHeight: 500,
                  overflowY: 'auto',
                  padding: '10px 16px',
                  scrollbarWidth: 'thin'
                }}>
                  {lyricsData.lyrics}
                </div>
              ) : (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Lyrics are unavailable.</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Emotional Analysis & Matching */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Match Score Card */}
            {lyricsData && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(22, 22, 31, 0.95) 0%, rgba(10, 10, 15, 0.9) 100%)',
                border: '1px solid rgba(124,92,252,0.3)',
                borderRadius: 'var(--radius-xl)',
                padding: '28px 24px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: 20
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Mood Compatibility</span>
                  <span style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: lyricsData.match_results.match_score > 70 ? 'var(--accent-teal)' : lyricsData.match_results.match_score > 50 ? 'var(--accent-amber)' : 'var(--accent-pink)',
                    fontFamily: 'var(--font-display)',
                    textShadow: `0 0 12px ${lyricsData.match_results.match_score > 70 ? 'rgba(92,252,216,0.3)' : 'rgba(252,92,160,0.3)'}`
                  }}>
                    {lyricsData.match_results.match_score}% Match
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${lyricsData.match_results.match_score}%`,
                    background: `linear-gradient(90deg, var(--accent-primary), ${lyricsData.match_results.match_score > 70 ? 'var(--accent-teal)' : 'var(--accent-pink)'})`,
                    borderRadius: 4,
                    transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </div>

                {/* Match Pairs */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                  <div style={{ textAlign: 'center', flex: 1, padding: '12px 8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Vibe</div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
                      {MOOD_EMOJIS[detectedEmotion || 'neutral']} {detectedEmotion ? detectedEmotion.charAt(0).toUpperCase() + detectedEmotion.slice(1) : 'Neutral'}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, color: 'var(--text-muted)', animation: 'pulse 2s infinite' }}>⇄</div>
                  <div style={{ textAlign: 'center', flex: 1, padding: '12px 8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lyrics Vibe</div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: MOOD_COLORS[lyricsData.lyrics_emotion] || 'var(--text-primary)' }}>
                      {MOOD_EMOJIS[lyricsData.lyrics_emotion] || '😐'} {lyricsData.lyrics_emotion.charAt(0).toUpperCase() + lyricsData.lyrics_emotion.slice(1)}
                    </div>
                  </div>
                </div>

                {/* Analysis Description */}
                <div style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 10,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6
                }}>
                  {lyricsData.match_results.description}
                </div>
              </div>
            )}

            {/* Sentiment Breakdown Chart */}
            {lyricsData && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  📊 Sentiment Breakdown
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {Object.entries(lyricsData.emotion_scores)
                    .filter(([_, score]) => score > 0)
                    .sort(([_, a], [__, b]) => b - a)
                    .map(([emo, score]) => {
                      const color = MOOD_COLORS[emo] || 'var(--accent-primary)';
                      return (
                        <div key={emo}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>
                              {MOOD_EMOJIS[emo]} {emo}
                            </span>
                            <span style={{ fontWeight: 700, color }}>{Math.round(score)}%</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${score}%`,
                              background: color,
                              borderRadius: 3,
                              transition: 'width 1.0s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
