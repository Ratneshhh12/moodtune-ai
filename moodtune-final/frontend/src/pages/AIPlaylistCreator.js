import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import SongCard from '../components/common/SongCard';

const SAMPLE_CHIPS = [
  { label: '💻 Late Night Coding', text: 'focused and chill lo-fi ambient tracks for a late night coding session' },
  { label: '🌧️ Rainy Day Lofi', text: 'soft rainy day lofi and acoustic guitar to relax' },
  { label: '🔥 Workout Energy', text: 'high energy pump-up Punjabi and EDM songs for gym workout' },
  { label: '🌅 Sunset Melodies', text: 'melodic Bollywood and romantic tunes for sunset drive' }
];

export default function AIPlaylistCreator() {
  const { API, toast, playSong, user } = useApp();
  const [prompt, setPrompt] = useState('');
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playlistName, setPlaylistName] = useState('My AI Vibe');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleGenerate = async (e, customPrompt = '') => {
    if (e) e.preventDefault();
    const activePrompt = customPrompt || prompt.trim();
    if (!activePrompt) {
      toast('Please enter a prompt first!', 'error');
      return;
    }

    setPrompt(activePrompt);
    setLoading(true);
    setSongs([]);
    try {
      const res = await API.post('/music/generate-playlist', { prompt: activePrompt });
      setSongs(res.data.songs || []);
      // Pre-fill playlist name based on input
      const capitalizedWords = activePrompt
        .split(' ')
        .slice(0, 3)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setPlaylistName(`${capitalizedWords || 'AI Generated'} Vibe 🪄`);
      toast(`Curated ${res.data.songs?.length || 0} songs for you!`, 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to generate AI playlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    playSong(songs[0], songs, 0);
    toast('Playing generated AI playlist 🎶', 'success');
  };

  const handleSavePlaylist = async () => {
    if (!user) {
      toast('Please log in to save playlists!', 'error');
      return;
    }
    if (songs.length === 0) return;
    setSaving(true);
    try {
      const songIds = songs.map(s => s.spotify_id || s.id);
      await API.post('/music/playlists/save-generated', {
        playlist_name: playlistName,
        song_ids: songIds
      });
      toast(`"${playlistName}" saved to your playlists!`, 'success');
      setShowSaveModal(false);
    } catch (err) {
      console.error(err);
      toast('Failed to save playlist', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-content animate-fade">
      {/* Header */}
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ background: 'var(--gradient-main)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🪄 AI Playlist Creator</span>
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
        Enter any vibe or topic, and our AI will curate a personalized playlist matching your mood.
      </p>

      {/* Input section */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
        <form onSubmit={e => handleGenerate(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="What vibe are you feeling? (e.g. focused songs for late night coding session)"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={loading}
              style={{
                paddingRight: 100,
                height: 52,
                borderRadius: 'var(--radius-lg)',
                fontSize: 16,
                border: '1px solid var(--border-color)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              style={{
                position: 'absolute',
                right: 8,
                top: 8,
                bottom: 8,
                background: prompt.trim() && !loading ? 'var(--gradient-main)' : 'var(--border-color)',
                color: 'white',
                padding: '0 20px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: 14,
                boxShadow: prompt.trim() && !loading ? '0 4px 12px rgba(124,92,252,0.3)' : 'none',
                transition: 'all 0.2s ease',
                cursor: prompt.trim() && !loading ? 'pointer' : 'default'
              }}
            >
              Generate
            </button>
          </div>

          {/* Preset Vibe Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 4 }}>Try these:</span>
            {SAMPLE_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={e => handleGenerate(e, chip.text)}
                disabled={loading}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12,
                  fontWeight: 500,
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.target.style.borderColor = 'var(--accent-primary)';
                  e.target.style.color = 'var(--text-primary)';
                  e.target.style.background = 'rgba(124,92,252,0.1)';
                }}
                onMouseLeave={e => {
                  e.target.style.borderColor = 'var(--border-color)';
                  e.target.style.color = 'var(--text-secondary)';
                  e.target.style.background = 'var(--bg-glass)';
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{
            display: 'inline-block',
            width: 40, height: 40,
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: 16
          }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Analyzing vibes and curating your AI tracklist...</p>
        </div>
      )}

      {/* Playlist results */}
      {songs.length > 0 && !loading && (
        <div className="animate-fade">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Curated AI Soundtrack</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{songs.length} tracks matched for your vibe</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handlePlayAll}
                className="btn-primary"
                style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: 14 }}
              >
                ▶ Play All
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className="btn-ghost"
                style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: 14 }}
              >
                💾 Save Playlist
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {songs.map((s, i) => (
              <SongCard key={i} song={s} queue={songs} index={i} compact />
            ))}
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <h3 style={{ marginBottom: 12, fontSize: 18, fontWeight: 700 }}>Save AI Playlist</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
              Save this curated collection to your personal playlists.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Playlist Name</label>
              <input
                type="text"
                value={playlistName}
                onChange={e => setPlaylistName(e.target.value)}
                style={{ height: 44 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveModal(false)}
                className="btn-ghost"
                style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlaylist}
                disabled={saving || !playlistName.trim()}
                className="btn-primary"
                style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', fontSize: 14 }}
              >
                {saving ? 'Saving...' : 'Save Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
