import React, { useEffect, useState } from 'react';
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

export default function Favorites() {
  const { API, toast, token, currentSong, detectedEmotion } = useApp();
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  // Lyrics Matcher States
  const [lyricsData, setLyricsData] = useState(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [recentSongs, setRecentSongs] = useState([]);
  const [favSongs, setFavSongs] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const fetchFavorites = () => {
    API.get('/music/favorites')
      .then(r => setFavorites(r.data.favorites || []))
      .catch(() => toast('Could not load favorites', 'error'))
      .finally(() => setLoadingFavorites(false));
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  // Load lyrics analysis
  useEffect(() => {
    if (!currentSong) {
      setLyricsData(null);
      return;
    }

    setLoadingLyrics(true);
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
      setLoadingLyrics(false);
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
      const hist = (histRes.data?.history || []).map(h => h.song).filter(Boolean);
      const favs = (favRes.data?.favorites || []).map(f => f.song).filter(Boolean);
      
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

  const songs = favorites.map(f => f.song).filter(Boolean);

  return (
    <div className="page-content animate-fade" style={{ paddingBottom: 60 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          ◈ Favorites
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Explore songs you love and check real-time emotional matching with lyrics.
        </p>
      </div>

      <div className="responsive-grid-12-1">
        {/* Left Column: Favorites List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>⭐ Favorited Tracks</h3>
            {loadingFavorites ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 70 }} />)}
              </div>
            ) : songs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>♡</div>
                <p style={{ fontSize: 13 }}>No favorites yet. Heart songs while listening!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {songs.map((s, i) => (
                  <SongCard key={i} song={s} queue={songs} index={i} compact />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Lyrics Matcher */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {!currentSong ? (
            /* Placeholder / Empty state */
            <div className="glass-card animate-fade" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎙️</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, fontFamily: 'var(--font-display)' }}>
                No Song is Playing
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.6, marginBottom: 20 }}>
                Play any song, scan your mood, or choose a suggestion below to analyze lyrics &amp; check compatibility.
              </p>

              {loadingSuggestions ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'left' }}>
                  {/* Suggestions from Favorites */}
                  <div>
                    <h4 style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                      ⭐ From Favorites
                    </h4>
                    {favSongs.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {favSongs.map((s, idx) => (
                          <SongCard key={idx} song={s} queue={favSongs} index={idx} compact />
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>No favorites found</p>
                    )}
                  </div>

                  {/* Recently Played */}
                  <div>
                    <h4 style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                      ◷ Recently Played
                    </h4>
                    {recentSongs.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {recentSongs.map((s, idx) => (
                          <SongCard key={idx} song={s} queue={recentSongs} index={idx} compact />
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>No playing history found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Active lyrics analysis */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fade">
              {/* Match Score Card */}
              {lyricsData && (
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Mood Compatibility</span>
                    <span style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: lyricsData.match_results.match_score > 70 ? 'var(--accent-teal)' : lyricsData.match_results.match_score > 50 ? 'var(--accent-amber)' : 'var(--accent-pink)',
                      fontFamily: 'var(--font-display)'
                    }}>
                      {lyricsData.match_results.match_score}% Match
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${lyricsData.match_results.match_score}%`,
                      background: `linear-gradient(90deg, var(--accent-primary), ${lyricsData.match_results.match_score > 70 ? 'var(--accent-teal)' : 'var(--accent-pink)'})`,
                      borderRadius: 3,
                      transition: 'width 1.2s ease'
                    }} />
                  </div>

                  {/* Match Pairs */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', flex: 1, padding: '10px 6px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Your Vibe</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 4 }}>
                        {MOOD_EMOJIS[detectedEmotion || 'neutral']} {detectedEmotion ? detectedEmotion.charAt(0).toUpperCase() + detectedEmotion.slice(1) : 'Neutral'}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>⇄</div>
                    <div style={{ textAlign: 'center', flex: 1, padding: '10px 6px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lyrics Vibe</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 4, color: MOOD_COLORS[lyricsData.lyrics_emotion] || 'var(--text-primary)' }}>
                        {MOOD_EMOJIS[lyricsData.lyrics_emotion] || '😐'} {lyricsData.lyrics_emotion.charAt(0).toUpperCase() + lyricsData.lyrics_emotion.slice(1)}
                      </div>
                    </div>
                  </div>

                  {/* Analysis Description */}
                  <div style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5
                  }}>
                    {lyricsData.match_results.description}
                  </div>
                </div>
              )}

              {/* Sentiment Breakdown Chart */}
              {lyricsData && (
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    📊 Sentiment Breakdown
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(lyricsData.emotion_scores)
                      .filter(([_, score]) => score > 0)
                      .sort(([_, a], [__, b]) => b - a)
                      .map(([emo, score]) => {
                        const color = MOOD_COLORS[emo] || 'var(--accent-primary)';
                        return (
                          <div key={emo}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>
                                {MOOD_EMOJIS[emo]} {emo}
                              </span>
                              <span style={{ fontWeight: 700, color }}>{Math.round(score)}%</span>
                            </div>
                            <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${score}%`,
                                background: color,
                                borderRadius: 2,
                                transition: 'width 1.0s ease'
                              }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Lyrics Transcription Card */}
              <div className="glass-card" style={{ padding: '24px', minHeight: 350, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                  📖 Lyrics Transcription
                </h4>
                
                {loadingLyrics ? (
                  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Analyzing lyrics sentiment...</p>
                  </div>
                ) : lyricsData ? (
                  <div style={{
                    fontSize: 14.5,
                    lineHeight: 1.8,
                    textAlign: 'center',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-line',
                    maxHeight: 350,
                    overflowY: 'auto',
                    padding: '8px 12px',
                    scrollbarWidth: 'thin'
                  }}>
                    {lyricsData.lyrics}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>Lyrics are unavailable.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
