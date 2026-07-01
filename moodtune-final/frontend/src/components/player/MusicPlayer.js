/**
 * Bottom Music Player with full controls & sliding Lyrics panel
 */
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

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

const formatTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export default function MusicPlayer() {
  const {
    currentSong, isPlaying, volume, progress, duration,
    togglePlay, playNext, playPrev, seekTo, setVolume,
    toggleFavorite, detectedEmotion, API,
    shuffle, setShuffle, repeatMode, setRepeatMode, queue, playSong, queueIndex
  } = useApp();
  
  const [showVolume, setShowVolume] = useState(false);
  const [showLyricsPanel, setShowLyricsPanel] = useState(false);
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [lyricsData, setLyricsData] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!currentSong || !showLyricsPanel) return;

    setLyricsLoading(true);
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
      setLyricsLoading(false);
    });
  }, [currentSong, showLyricsPanel, detectedEmotion, API]);

  if (!currentSong) return null;

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const drawerWidth = windowWidth < 600 ? '100%' : '400px';

  const isMobile = windowWidth < 600;

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: isMobile ? 60 : 0, left: windowWidth < 768 ? 0 : 'var(--sidebar-width)', right: 0,
        height: isMobile ? 70 : 'var(--player-height)',
        background: 'rgba(10,10,15,0.95)',
        backdropFilter: 'blur(30px)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '0 12px' : '0 24px',
        gap: isMobile ? 8 : 24,
        zIndex: 990,
      }}>
        {/* Top Edge Progress Bar for Mobile */}
        {isMobile && (
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: 'var(--border-color)', cursor: 'pointer'
            }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekTo(((e.clientX - rect.left) / rect.width) * 100);
            }}
          >
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--gradient-main)' }} />
          </div>
        )}

        {/* Left Section: Song Info */}
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <img
              src={currentSong.cover_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentSong.title}`}
              alt=""
              style={{ width: isMobile ? 40 : 52, height: isMobile ? 40 : 52, borderRadius: 8, objectFit: 'cover' }}
              onError={e => { e.target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${currentSong.title}`; }}
            />
            {isPlaying && (
              <div style={{
                position:'absolute', inset:0, borderRadius: 8,
                background:'rgba(124,92,252,0.3)',
                display:'flex', alignItems:'center', justifyContent:'center'
              }}>
                <div className="waveform" style={{ height: 12 }}>
                  {[1,2,3,4,5].map(i => <span key={i} />)}
                </div>
              </div>
            )}
          </div>
          <div style={{ overflow:'hidden', minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 13 : 14, fontWeight:500, color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {currentSong.title}
            </div>
            <div style={{ fontSize: isMobile ? 11 : 12, color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {currentSong.artist}
            </div>
          </div>
          {!isMobile && (
            <button
              className="btn-icon"
              style={{ flexShrink:0, marginLeft:4 }}
              onClick={() => toggleFavorite(currentSong)}
              title="Add to favorites"
            >
              ♡
            </button>
          )}
        </div>

        {/* Middle Section: Player Controls (Desktop Only) */}
        {!isMobile && (
          <div style={{ flex:2, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <button 
                onClick={() => setShuffle(!shuffle)} 
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 6,
                  color: shuffle ? 'var(--accent-primary)' : 'var(--text-muted)',
                  transition: 'all var(--transition)'
                }} 
                title="Shuffle"
              >
                🔀
              </button>
              <button className="btn-icon" style={{ width:32, height:32 }} onClick={playPrev} title="Previous">⏮</button>
              <button
                onClick={togglePlay}
                style={{
                  width:44, height:44, borderRadius:'50%',
                  background:'var(--gradient-main)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:18, color:'white',
                  boxShadow:'0 4px 20px rgba(124,92,252,0.4)',
                  transition:'all var(--transition)',
                  border:'none', cursor:'pointer'
                }}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button className="btn-icon" style={{ width:32, height:32 }} onClick={playNext} title="Next">⏭</button>
              <button 
                onClick={() => setRepeatMode(r => r === 'none' ? 'queue' : r === 'queue' ? 'one' : 'none')} 
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 6,
                  color: repeatMode !== 'none' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  transition: 'all var(--transition)',
                  display: 'flex', alignItems: 'center', gap: 2
                }} 
                title={`Repeat Mode: ${repeatMode.toUpperCase()}`}
              >
                🔁{repeatMode === 'one' && <span style={{ fontSize: 9, fontWeight: 900 }}>1</span>}
              </button>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:8, width:'100%', maxWidth:500 }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', minWidth:32, textAlign:'right' }}>
                {formatTime(progress)}
              </span>
              <div
                style={{
                  flex:1, height:4, background:'var(--border-color)',
                  borderRadius:2, cursor:'pointer', position:'relative'
                }}
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  seekTo(((e.clientX - rect.left) / rect.width) * 100);
                }}
              >
                <div style={{
                  position:'absolute', left:0, top:0,
                  height:'100%', width:`${progressPct}%`,
                  background:'var(--gradient-main)', borderRadius:2,
                  transition:'width 0.1s linear'
                }} />
                <div style={{
                  position:'absolute', top:'50%', transform:'translate(-50%,-50%)',
                  left:`${progressPct}%`,
                  width:12, height:12, borderRadius:'50%',
                  background:'white',
                  boxShadow:'0 0 8px rgba(124,92,252,0.6)',
                  transition:'left 0.1s linear'
                }} />
              </div>
              <span style={{ fontSize:11, color:'var(--text-muted)', minWidth:32 }}>
                {formatTime(duration || currentSong.duration)}
              </span>
            </div>
          </div>
        )}

        {/* Right Section: Mobile Controls or Volume/Lyrics */}
        <div style={{ display:'flex', alignItems:'center', gap: 10, justifyContent:'flex-end', flexShrink: 0 }}>
          {isMobile ? (
            <>
              <button className="btn-icon" style={{ width: 34, height: 34 }} onClick={playPrev} title="Previous">⏮</button>
              <button
                onClick={togglePlay}
                style={{
                  width: 36, height: 36, borderRadius:'50%',
                  background:'var(--gradient-main)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize: 14, color:'white',
                  boxShadow:'0 4px 12px rgba(124,92,252,0.4)',
                  border:'none', cursor:'pointer'
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button className="btn-icon" style={{ width: 34, height: 34 }} onClick={playNext} title="Next">⏭</button>
              <button
                className="btn-icon"
                style={{
                  width: 34, height: 34,
                  background: showLyricsPanel ? 'var(--accent-primary)' : 'var(--bg-glass)',
                  color: showLyricsPanel ? 'white' : 'var(--text-secondary)',
                  borderColor: showLyricsPanel ? 'var(--accent-primary)' : 'var(--border-color)',
                }}
                onClick={() => setShowLyricsPanel(v => !v)}
              >
                🎙️
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-icon"
                onClick={() => { setShowQueuePanel(v => !v); setShowLyricsPanel(false); }}
                style={{
                  background: showQueuePanel ? 'var(--accent-primary)' : 'var(--bg-glass)',
                  color: showQueuePanel ? 'white' : 'var(--text-secondary)',
                  borderColor: showQueuePanel ? 'var(--accent-primary)' : 'var(--border-color)',
                }}
                title="Play Queue"
              >
                ▤
              </button>
              <button
                className="btn-icon"
                onClick={() => { setShowLyricsPanel(v => !v); setShowQueuePanel(false); }}
                style={{
                  background: showLyricsPanel ? 'var(--accent-primary)' : 'var(--bg-glass)',
                  color: showLyricsPanel ? 'white' : 'var(--text-secondary)',
                  borderColor: showLyricsPanel ? 'var(--accent-primary)' : 'var(--border-color)',
                }}
                title="Lyrics & Mood Match"
              >
                🎙️
              </button>
              
              <div style={{ position: 'relative' }}>
                <button
                  className="btn-icon"
                  onClick={() => setShowDevices(v => !v)}
                  style={{
                    background: showDevices ? 'var(--accent-primary)' : 'var(--bg-glass)',
                    color: showDevices ? 'white' : 'var(--text-secondary)',
                    borderColor: showDevices ? 'var(--accent-primary)' : 'var(--border-color)',
                  }}
                  title="Devices Available"
                >
                  💻
                </button>
                {showDevices && (
                  <div style={{
                    position: 'absolute', bottom: 'calc(var(--player-height) - 10px)', right: 0,
                    background: 'rgba(15,15,22,0.98)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)', padding: '16px', minWidth: '220px',
                    boxShadow: 'var(--shadow-lg)', zIndex: 1000,
                    display: 'flex', flexDirection: 'column', gap: 10
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: 6, textAlign: 'left' }}>
                      Connect to a device
                    </div>
                    {[
                      { name: 'This Computer', active: true, desc: 'Web Player' },
                      { name: 'Living Room TV', active: false, desc: 'Chromecast' },
                      { name: 'Bedroom Echo', active: false, desc: 'Alexa' },
                      { name: 'Aryan\'s iPhone', active: false, desc: 'AirPlay' }
                    ].map((dev, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: dev.active ? 'rgba(124,92,252,0.1)' : 'transparent' }}>
                        <span style={{ fontSize: 16 }}>{dev.name.includes('TV') ? '📺' : dev.name.includes('Echo') ? '🔊' : dev.name.includes('iPhone') ? '📱' : '💻'}</span>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: dev.active ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                            {dev.name}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{dev.desc}</div>
                        </div>
                        {dev.active && <span style={{ color: 'var(--accent-primary)', fontSize: 10 }}>●</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="btn-icon"
                onClick={() => setShowVolume(v => !v)}
                title="Volume"
              >
                {volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
              </button>
              {(showVolume || windowWidth >= 768) && (
                <div style={{
                  display:'flex', alignItems:'center', gap:6,
                  opacity: showVolume || windowWidth > 900 ? 1 : 0,
                  transition:'opacity var(--transition)'
                }}>
                  <input
                    type="range" min="0" max="100" value={volume}
                    onChange={e => setVolume(Number(e.target.value))}
                    style={{
                      width: 80, height: 4,
                      accentColor: 'var(--accent-primary)',
                      background: `linear-gradient(to right, var(--accent-primary) ${volume}%, var(--border-color) ${volume}%)`,
                      borderRadius:2, outline:'none', border:'none',
                      cursor:'pointer', padding:0
                    }}
                  />
                  <span style={{ fontSize:11, color:'var(--text-muted)', minWidth:24 }}>{volume}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lyrics & Emotion Matching Sliding Panel */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0,
        width: drawerWidth,
        height: isMobile ? '100vh' : 'calc(100vh - var(--player-height))',
        background: 'rgba(22, 22, 31, 0.95)',
        backdropFilter: 'blur(40px)',
        borderLeft: '1px solid var(--border-color)',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
        zIndex: 980,
        display: 'flex',
        flexDirection: 'column',
        transform: showLyricsPanel ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>🎙️ Lyrics &amp; Mood Match</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Real-time NLP sentiment analysis</p>
          </div>
          <button 
            onClick={() => setShowLyricsPanel(false)}
            style={{ fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer', border: 'none', background: 'none' }}
          >
            ✕
          </button>
        </div>

        {/* Panel Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24, scrollbarWidth: 'none' }}>
          {lyricsLoading ? (
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: '300px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-main)', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Analyzing song lyrics...</p>
            </div>
          ) : lyricsData ? (
            <>
              {/* Match Card */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Emotional Alignment</span>
                  <span style={{
                    fontSize: 16,
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
                    transition: 'width 0.8s ease'
                  }} />
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                  <div style={{ textAlign: 'center', flex: 1, padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>You Feel</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                      {MOOD_EMOJIS[detectedEmotion || 'neutral']} {detectedEmotion ? detectedEmotion.charAt(0).toUpperCase() + detectedEmotion.slice(1) : 'Neutral'}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>⇄</div>
                  <div style={{ textAlign: 'center', flex: 1, padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Song Vibe</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: MOOD_COLORS[lyricsData.lyrics_emotion] || 'var(--text-primary)' }}>
                      {MOOD_EMOJIS[lyricsData.lyrics_emotion] || '😐'} {lyricsData.lyrics_emotion.charAt(0).toUpperCase() + lyricsData.lyrics_emotion.slice(1)}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {lyricsData.match_results.description}
                </p>
              </div>

              {/* Sentiment Breakdown */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Emotion Breakdown</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(lyricsData.emotion_scores)
                    .filter(([_, score]) => score > 0)
                    .sort(([_, a], [__, b]) => b - a)
                    .slice(0, 4)
                    .map(([emo, score]) => {
                      const c = MOOD_COLORS[emo] || 'var(--accent-primary)';
                      return (
                        <div key={emo}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                              {MOOD_EMOJIS[emo]} {emo}
                            </span>
                            <span style={{ fontWeight: 700, color: c }}>{Math.round(score)}%</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${score}%`, background: c, borderRadius: 2 }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Lyrics View */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16 }}>Lyrics</h4>
                <div style={{
                  fontSize: 14,
                  lineHeight: 1.8,
                  textAlign: 'center',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-line',
                  fontFamily: 'var(--font-body)',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  padding: '0 8px 20px 8px',
                  scrollbarWidth: 'none',
                  maskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)'
                }}>
                  {lyricsData.lyrics}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Lyrics and mood analysis will load when playing a song</p>
            </div>
          )}
        </div>
      </div>

      {/* Queue Drawer Panel */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0,
        width: drawerWidth,
        height: isMobile ? '100vh' : 'calc(100vh - var(--player-height))',
        background: 'rgba(22, 22, 31, 0.95)',
        backdropFilter: 'blur(40px)',
        borderLeft: '1px solid var(--border-color)',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
        zIndex: 980,
        display: 'flex',
        flexDirection: 'column',
        transform: showQueuePanel ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>▤ Play Queue</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{queue.length} songs loaded</p>
          </div>
          <button 
            onClick={() => setShowQueuePanel(false)}
            style={{ fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer', border: 'none', background: 'none' }}
          >
            ✕
          </button>
        </div>

        {/* Panel Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, scrollbarWidth: 'thin' }}>
          {queue.length === 0 ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Queue is empty</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left' }}>Now Playing</div>
              {currentSong && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  background: 'rgba(124,92,252,0.1)', border: '1px solid var(--accent-primary)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <img src={currentSong.cover_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentSong.title}`} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                  <div style={{ flex: 1, overflow: 'hidden', textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSong.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSong.artist}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>Active</span>
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginTop: 12, textAlign: 'left' }}>Next In Queue</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {queue.map((song, idx) => {
                  const isActive = idx === queueIndex;
                  return (
                    <div 
                      key={idx} 
                      onClick={() => { playSong(song, queue, idx); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
                        background: isActive ? 'rgba(124,92,252,0.05)' : 'rgba(255,255,255,0.01)',
                        border: isActive ? '1px solid rgba(124,92,252,0.3)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <img src={song.cover_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${song.title}`} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />
                      <div style={{ flex: 1, overflow: 'hidden', textAlign: 'left' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? 'var(--accent-primary)' : 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                      </div>
                      {isActive && <span style={{ fontSize: 10, color: 'var(--accent-primary)' }}>Playing</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
