import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import SongCard from '../components/common/SongCard';

const SAMPLE_CHIPS = [
  { label: '💻 Late Night Coding', text: 'focused and chill lo-fi ambient tracks for a late night coding session' },
  { label: '🌧️ Rainy Day Lofi', text: 'soft rainy day lofi and acoustic guitar to relax' },
  { label: '🔥 Workout Energy', text: 'high energy pump-up Punjabi and EDM songs for gym workout' },
  { label: '🌅 Sunset Melodies', text: 'melodic Bollywood and romantic tunes for sunset drive' }
];

export default function Playlists() {
  const { API, user, toast, playSong } = useApp();
  const [playlists, setPlaylists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [newName, setNewName] = useState('');
  const [createCollaborative, setCreateCollaborative] = useState(false);
  const [creating, setCreating] = useState(false);

  // Social & Search
  const [friends, setFriends] = useState([]);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [songSearchResults, setSongSearchResults] = useState([]);
  const [loadingSongSearch, setLoadingSongSearch] = useState(false);

  // AI Playlist States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSongs, setAiSongs] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiPlaylistName, setAiPlaylistName] = useState('My AI Vibe');
  const [showAiSaveModal, setShowAiSaveModal] = useState(false);

  useEffect(() => { fetchPlaylists(); }, []);

  useEffect(() => {
    if (selected) {
      fetchPlaylistSongs(selected.id);
      fetchFriends();
    }
  }, [selected]);

  // Debounced song search inside selected playlist view
  useEffect(() => {
    if (!songSearchQuery.trim()) {
      setSongSearchResults([]);
      return;
    }
    setLoadingSongSearch(true);
    const delayDebounce = setTimeout(() => {
      API.get(`/music/search?q=${encodeURIComponent(songSearchQuery)}`)
        .then(res => {
          setSongSearchResults(res.data.results || []);
        })
        .catch(() => {})
        .finally(() => {
          setLoadingSongSearch(false);
        });
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [songSearchQuery, API]);

  const fetchPlaylists = async () => {
    try {
      const r = await API.get('/music/playlists');
      setPlaylists(r.data.playlists || []);
    } catch {
      toast('Could not load playlists', 'error');
    }
  };

  const fetchPlaylistSongs = async (playlistId) => {
    setLoadingSongs(true);
    try {
      const r = await API.get(`/music/playlists/${playlistId}/songs`);
      setSongs(r.data.songs || []);
    } catch {
      toast('Failed to load songs for this playlist', 'error');
    }
    setLoadingSongs(false);
  };

  const fetchFriends = async () => {
    try {
      const r = await API.get('/social/friends');
      setFriends(r.data.friends || []);
    } catch (e) {
      console.error("Failed to load friends", e);
    }
  };

  const refreshSelectedPlaylist = async (playlistId) => {
    try {
      const r = await API.get('/music/playlists');
      const allPl = r.data.playlists || [];
      setPlaylists(allPl);
      const found = allPl.find(p => p.id === playlistId);
      if (found) setSelected(found);
    } catch (e) {
      console.error(e);
    }
  };

  const createPlaylist = async () => {
    if (!newName.trim()) return;
    try {
      await API.post('/music/playlists', {
        playlist_name: newName,
        is_collaborative: createCollaborative
      });
      setNewName('');
      setCreateCollaborative(false);
      setCreating(false);
      toast('Playlist created!', 'success');
      fetchPlaylists();
    } catch {
      toast('Failed to create playlist', 'error');
    }
  };

  const deletePlaylist = async () => {
    if (!window.confirm("Are you sure you want to delete this playlist?")) return;
    try {
      await API.delete(`/music/playlists/${selected.id}`);
      toast('Playlist deleted!', 'success');
      setSelected(null);
      fetchPlaylists();
    } catch {
      toast('Failed to delete playlist', 'error');
    }
  };

  const toggleCollaborative = async (playlist) => {
    const newValue = !playlist.is_collaborative;
    try {
      await API.put(`/music/playlists/${playlist.id}`, { is_collaborative: newValue });
      toast(newValue ? 'Playlist is now collaborative!' : 'Playlist is now private', 'success');
      refreshSelectedPlaylist(playlist.id);
    } catch {
      toast('Failed to update playlist settings', 'error');
    }
  };

  const addCollaborator = async (emailOrName) => {
    try {
      await API.post(`/music/playlists/${selected.id}/collaborators/add`, { email_or_name: emailOrName });
      toast('Collaborator added!', 'success');
      refreshSelectedPlaylist(selected.id);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to add collaborator', 'error');
    }
  };

  const removeCollaborator = async (collaboratorId) => {
    try {
      await API.delete(`/music/playlists/${selected.id}/collaborators/remove?collaborator_id=${collaboratorId}`);
      toast('Collaborator removed!', 'success');
      refreshSelectedPlaylist(selected.id);
    } catch {
      toast('Failed to remove collaborator', 'error');
    }
  };

  const addSongToPlaylist = async (song) => {
    try {
      await API.post(`/music/playlists/${selected.id}/songs`, { song });
      toast('Song added to playlist!', 'success');
      setSongSearchQuery('');
      setSongSearchResults([]);
      fetchPlaylistSongs(selected.id);
      refreshSelectedPlaylist(selected.id);
    } catch {
      toast('Failed to add song', 'error');
    }
  };

  const removeSong = async (songId) => {
    try {
      await API.delete(`/music/playlists/${selected.id}/songs?song_id=${songId}`);
      toast('Song removed from playlist', 'success');
      fetchPlaylistSongs(selected.id);
      refreshSelectedPlaylist(selected.id);
    } catch {
      toast('Failed to remove song', 'error');
    }
  };

  // AI Creator Handlers
  const handleGenerateAI = async (e, customPrompt = '') => {
    if (e) e.preventDefault();
    const activePrompt = customPrompt || aiPrompt.trim();
    if (!activePrompt) {
      toast('Please enter a vibe or prompt first!', 'error');
      return;
    }

    setAiPrompt(activePrompt);
    setAiLoading(true);
    setAiSongs([]);
    try {
      const res = await API.post('/music/generate-playlist', { prompt: activePrompt });
      setAiSongs(res.data.songs || []);
      const capitalizedWords = activePrompt
        .split(' ')
        .slice(0, 3)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setAiPlaylistName(`${capitalizedWords || 'AI Generated'} Vibe 🪄`);
      toast(`Curated ${res.data.songs?.length || 0} songs for you!`, 'success');
    } catch (err) {
      console.error(err);
      toast('Failed to generate AI playlist', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePlayAllAI = () => {
    if (aiSongs.length === 0) return;
    playSong(aiSongs[0], aiSongs, 0);
    toast('Playing generated AI playlist 🎶', 'success');
  };

  const handleSaveAIPlaylist = async () => {
    if (!user) {
      toast('Please log in to save playlists!', 'error');
      return;
    }
    if (aiSongs.length === 0) return;
    setAiSaving(true);
    try {
      const songIds = aiSongs.map(s => s.spotify_id || s.id);
      await API.post('/music/playlists/save-generated', {
        playlist_name: aiPlaylistName,
        song_ids: songIds
      });
      toast(`"${aiPlaylistName}" saved successfully!`, 'success');
      setShowAiSaveModal(false);
      fetchPlaylists(); // Instantly refresh left-side list
    } catch (err) {
      console.error(err);
      toast('Failed to save playlist', 'error');
    } finally {
      setAiSaving(false);
    }
  };

  if (selected) {
    const isOwner = selected.user_id === user?.id;
    return (
      <div className="page-content animate-fade" style={{ maxWidth: 1250 }}>
        <button className="btn-ghost" onClick={() => setSelected(null)} style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
          ← Back to Playlists
        </button>

        <div className="responsive-grid-12-1">
          {/* Left Side: Playlist Information and Songs list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header info */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
              <div style={{ width: 100, height: 100, borderRadius: 'var(--radius-lg)', background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, flexShrink: 0 }}>🎵</div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.playlist_name}</h2>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: selected.is_collaborative ? 'rgba(92,252,216,0.1)' : 'rgba(255,255,255,0.05)',
                    color: selected.is_collaborative ? 'var(--accent-teal)' : 'var(--text-muted)'
                  }}>
                    {selected.is_collaborative ? '👥 Collaborative' : '🔒 Private'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 13 }}>
                  {isOwner ? 'Owned by You' : 'Shared Collaborative Playlist'}
                </p>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: 12 }}>
                  {selected.song_count} songs • {selected.collaborator_count || 0} collaborators
                </p>
              </div>
            </div>

            {/* Toggle Collaborative mode (Owner Only) */}
            {isOwner && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Collaborative Mode</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Allow friends to view and add/remove songs</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selected.is_collaborative}
                    onChange={() => toggleCollaborative(selected)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', inset: 0,
                    background: selected.is_collaborative ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                    borderRadius: 26, transition: '0.3s',
                    border: '1px solid var(--border-color)'
                  }}>
                    <span style={{
                      position: 'absolute', height: 18, width: 18, left: selected.is_collaborative ? 25 : 4, bottom: 3,
                      background: 'white', borderRadius: '50%', transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>
            )}

            {/* Songs Grid List */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Playlist Songs</h3>
              {loadingSongs ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : songs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🎵</div>
                  <p style={{ fontSize: 13 }}>No songs added yet. Add some tracks using the search panel on the right!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {songs.map((song, index) => (
                    <div
                      key={song.id}
                      onClick={() => playSong(song, songs, index)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                        background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all var(--transition)'
                      }}
                    >
                      <img src={song.cover_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${song.title}`} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>
                        {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSong(song.id); }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', fontSize: 16, cursor: 'pointer', padding: 4 }}
                        title="Remove from playlist"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Collaborators lists and Searching tracks to add */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Collaborators Box */}
            {selected.is_collaborative && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>👥 Collaborators</h3>
                
                {/* Active Collaborators */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {selected.collaborators && selected.collaborators.length > 0 ? (
                    selected.collaborators.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                            {c.name[0].toUpperCase()}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                        </div>
                        {isOwner && (
                          <button onClick={() => removeCollaborator(c.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', fontSize: 14 }} title="Remove collaborator">✕</button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>No collaborators added yet.</p>
                  )}
                </div>

                {/* Invite friends */}
                {isOwner && (
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Invite Friends</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                      {friends.filter(f => !(selected.collaborators || []).some(c => c.id === f.id)).length > 0 ? (
                        friends.filter(f => !(selected.collaborators || []).some(c => c.id === f.id)).map(friend => (
                          <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: 12, fontWeight: 500 }}>{friend.name}</span>
                            <button onClick={() => addCollaborator(friend.email)} className="btn-primary" style={{ padding: '4px 12px', fontSize: 11, borderRadius: 6 }}>+ Add</button>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>No additional friends to invite.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Song search inside details */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🔍 Add Songs</h3>
              <input
                type="text"
                placeholder="Search tracks, artists..."
                value={songSearchQuery}
                onChange={e => setSongSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'white',
                  outline: 'none',
                  fontSize: 13,
                  marginBottom: songSearchQuery ? 16 : 0
                }}
              />
              {songSearchQuery && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto', paddingRight: 4, marginTop: 14 }}>
                  {loadingSongSearch ? (
                    <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: 'var(--text-muted)' }}>Searching database...</div>
                  ) : songSearchResults.length > 0 ? (
                    songSearchResults.map((song, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1, marginRight: 8 }}>
                          <img src={song.cover_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${song.title}`} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                          </div>
                        </div>
                        <button onClick={() => addSongToPlaylist(song)} className="btn-primary" style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6 }}>+ Add</button>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: 'var(--text-muted)' }}>No songs found</div>
                  )}
                </div>
              )}
            </div>

            {/* Delete button (Owner only) */}
            {isOwner && (
              <button
                onClick={deletePlaylist}
                className="btn-ghost"
                style={{ color: 'var(--accent-pink)', border: '1px solid rgba(252,92,164,0.2)', padding: '12px', borderRadius: 'var(--radius-xl)', cursor: 'pointer', transition: 'all var(--transition)', fontWeight: 600 }}
              >
                🗑️ Delete Playlist
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 1250 }}>
      {/* Dynamic Header */}
      <div style={{ marginBottom: 28, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-display)', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ background: 'var(--gradient-main)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ▤ Playlists
            </span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Manage your personal playlists and curate fresh collections using the generative AI engine.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>+ New Playlist</button>
      </div>

      <div className="responsive-grid-12-1">
        {/* ========================================================
            LEFT COLUMN: PLAYLIST MANAGEMENT
            ======================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {creating && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Create New Playlist</h3>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Playlist name..."
                onKeyDown={e => e.key === 'Enter' && createPlaylist()}
                style={{ marginBottom: 14 }}
              />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <input
                  type="checkbox"
                  id="collabCheck"
                  checked={createCollaborative}
                  onChange={e => setCreateCollaborative(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="collabCheck" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  Make collaborative (friends can edit and add songs)
                </label>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={createPlaylist} style={{ padding: '6px 18px', fontSize:13 }}>Create</button>
                <button className="btn-ghost" onClick={() => { setCreating(false); setCreateCollaborative(false); setNewName(''); }} style={{ padding: '6px 18px', fontSize:13 }}>Cancel</button>
              </div>
            </div>
          )}

          {playlists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', background:'var(--bg-card)', borderRadius:'var(--radius-xl)', border:'1px solid var(--border-color)' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>▤</div>
              <p style={{ fontSize: 14 }}>No playlists found. Create your first one or use the AI generator!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
              {playlists.map(pl => (
                <div key={pl.id} onClick={() => setSelected(pl)}
                  className="song-card"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all var(--transition)'
                  }}>
                  <div style={{ width: '100%', aspectRatio: '1', background: 'var(--gradient-main)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 12 }}>🎵</div>
                  <div style={{ fontWeight: 600, fontSize:14, marginBottom: 4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {pl.playlist_name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pl.song_count} songs</span>
                    {pl.is_collaborative && (
                      <span style={{ fontSize: 10, color: 'var(--accent-teal)', fontWeight: 700 }}>👥 Shared</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================
            RIGHT COLUMN: AI PLAYLIST CREATOR
            ======================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass-card" style={{ padding: 24, display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, fontFamily:'var(--font-display)' }}>
                <span>🪄</span> AI Playlist Generator
              </h3>
              <p style={{ color:'var(--text-secondary)', fontSize:12, marginTop:4 }}>
                Describe a mood, setting, or vibe and let our AI curate the perfect playlist.
              </p>
            </div>

            <form onSubmit={e => handleGenerateAI(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="What vibe are you feeling? (e.g., focus lofi for coding)"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  disabled={aiLoading}
                  style={{
                    paddingRight: 90,
                    height: 44,
                    borderRadius: 'var(--radius-md)',
                    fontSize: 14,
                    border: '1px solid var(--border-color)'
                  }}
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiPrompt.trim()}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: 6,
                    bottom: 6,
                    background: aiPrompt.trim() && !aiLoading ? 'var(--gradient-main)' : 'var(--border-color)',
                    color: 'white',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: aiPrompt.trim() && !aiLoading ? 'pointer' : 'default',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Generate
                </button>
              </div>

              {/* Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4 }}>
                {SAMPLE_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={e => handleGenerateAI(e, chip.text)}
                    disabled={aiLoading}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 11,
                      fontWeight: 500,
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </form>

            {/* AI Generator Loader */}
            {aiLoading && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{
                  display: 'inline-block', width: 32, height: 32,
                  border: '2.5px solid var(--border-color)', borderTopColor: 'var(--accent-primary)',
                  borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 10
                }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Curating your custom soundtrack...</p>
              </div>
            )}

            {/* Generated Results */}
            {aiSongs.length > 0 && !aiLoading && (
              <div className="animate-fade" style={{ display:'flex', flexDirection:'column', gap:16, borderTop:'1px solid var(--border-color)', paddingTop:18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700 }}>{aiPlaylistName}</h4>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{aiSongs.length} tracks curated</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={handlePlayAllAI} className="btn-primary" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)' }}>
                      ▶ Play
                    </button>
                    <button onClick={() => setShowAiSaveModal(true)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 'var(--radius-sm)' }}>
                      💾 Save
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                  {aiSongs.map((s, i) => (
                    <SongCard key={i} song={s} queue={aiSongs} index={i} compact />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showAiSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 380 }}>
            <h3 style={{ marginBottom: 10, fontSize: 16, fontWeight: 800 }}>Save AI Playlist</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 16 }}>
              Add this generated collection to your personal playlists grid.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Playlist Title</label>
              <input
                type="text"
                value={aiPlaylistName}
                onChange={e => setAiPlaylistName(e.target.value)}
                style={{ height: 40, fontSize:13 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAiSaveModal(false)} className="btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
                Cancel
              </button>
              <button onClick={handleSaveAIPlaylist} disabled={aiSaving || !aiPlaylistName.trim()} className="btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>
                {aiSaving ? 'Saving...' : 'Save Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
