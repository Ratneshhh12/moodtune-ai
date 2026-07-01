import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import MoodAvatar from '../components/common/MoodAvatar';
import { IoShareSocial, IoPeople, IoReader, IoNotifications, IoHeart } from 'react-icons/io5';

const MOOD_EMOJIS = {
  happy: '😄',
  sad: '😢',
  angry: '😠',
  neutral: '😐',
  surprised: '😲',
  fearful: '😨',
  disgusted: '🤢'
};

const MOOD_COLORS = {
  happy: '#fcb85c',
  sad: '#5c8cfc',
  angry: '#fc5ca0',
  neutral: '#9090a8',
  surprised: '#5cfcd8',
  fearful: '#7c5cfc',
  disgusted: '#5cfcd8'
};

function ComparisonBar({ label, userVal, friendVal, color }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <div style={{ display: 'flex', gap: 16, fontWeight: 700 }}>
          <span style={{ color: 'var(--accent-primary)' }}>You: {userVal}%</span>
          <span style={{ color: color }}>Friend: {friendVal}%</span>
        </div>
      </div>
      {/* Side by side comparison bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* User bar */}
        <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${userVal}%`, background: 'var(--accent-primary)', borderRadius: 3 }} />
        </div>
        {/* Friend bar */}
        <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${friendVal}%`, background: color, borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

export default function CirclePage() {
  const { API, toast, user, playSong } = useApp();
  const [activeTab, setActiveTab] = useState('feed');
  const [friends, setFriends] = useState([]);
  const [circle, setCircle] = useState([]);
  const [feed, setFeed] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [socialPlaylists, setSocialPlaylists] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status broadcast form state
  const [mood, setMood] = useState('happy');
  const [content, setContent] = useState('');
  const [sharing, setSharing] = useState(false);

  // Friends Match States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [activeCompareFriend, setActiveCompareFriend] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const fetchAllData = async () => {
    try {
      const [friendsRes, circleRes, feedRes, notifRes, activityRes, playlistsRes] = await Promise.all([
        API.get('/social/friends'),
        API.get('/social/circle'),
        API.get('/social/circle/feed'),
        API.get('/social/notifications'),
        API.get('/social/activity-feed').catch(() => ({ data: { feed: [] } })),
        API.get('/social/playlists').catch(() => ({ data: { playlists: [] } }))
      ]);
      setFriends(friendsRes.data.friends || []);
      setCircle(circleRes.data.circle || []);
      setFeed(feedRes.data.feed || []);
      setNotifications(notifRes.data.notifications || []);
      setActivityFeed(activityRes.data.feed || []);
      setSocialPlaylists(playlistsRes.data.playlists || []);
    } catch (err) {
      console.error(err);
      toast('Failed to load Social Orbit data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handle user search (Friends Match)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoadingSearch(true);
    const delayDebounce = setTimeout(() => {
      API.get(`/social/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => {
          setSearchResults(res.data.users || []);
        })
        .catch(err => {
          console.error("Search users error:", err);
        })
        .finally(() => {
          setLoadingSearch(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, API]);

  const handleShareVibe = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      toast('Please enter a message to share', 'warning');
      return;
    }
    setSharing(true);
    try {
      await API.post('/social/circle/share', { mood, content });
      toast('Your vibe update has been shared with your Circle!', 'success');
      setContent('');
      fetchAllData();
      setActiveTab('feed');
    } catch (err) {
      console.error(err);
      toast('Failed to share your vibe status', 'error');
    } finally {
      setSharing(false);
    }
  };

  const handleAddCircle = async (friendId) => {
    try {
      await API.post('/social/circle/add', { friend_id: friendId });
      toast('Added to Circle of Trust', 'success');
      fetchAllData();
    } catch (err) {
      toast('Failed to add to Circle', 'error');
    }
  };

  const handleRemoveCircle = async (contactId) => {
    try {
      await API.delete(`/social/circle/remove/${contactId}`);
      toast('Removed from Circle of Trust', 'success');
      fetchAllData();
    } catch (err) {
      toast('Failed to remove from Circle', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.post('/social/notifications/read');
      toast('All alerts marked as read', 'success');
      fetchAllData();
    } catch (err) {
      toast('Failed to mark read', 'error');
    }
  };

  const sendLove = (friendName) => {
    toast(`Sent anonymous virtual support love to ${friendName}! 💖`, 'success');
  };

  // Friends Match Handlers
  const handleAddFriend = (friendId) => {
    API.post('/social/friends/add', { friend_id: friendId })
      .then(res => {
        toast(res.data.message || "Friend added!", "success");
        fetchAllData();
        setSearchResults(prev => prev.map(u => u.id === friendId ? { ...u, friendship_status: 'accepted' } : u));
      })
      .catch(err => {
        toast(err.response?.data?.error || "Failed to add friend", "error");
      });
  };

  const handleRemoveFriend = (friendId) => {
    if (!window.confirm("Are you sure you want to remove this friend?")) return;
    API.delete(`/social/friends/${friendId}`)
      .then(() => {
        toast("Friend removed", "success");
        fetchAllData();
        if (activeCompareFriend?.id === friendId) {
          setActiveCompareFriend(null);
          setCompareData(null);
        }
      })
      .catch(err => {
        toast("Failed to remove friend", "error");
      });
  };

  const handleCompareMood = (friend) => {
    setActiveCompareFriend(friend);
    setLoadingCompare(true);
    API.get(`/social/compare-mood/${friend.id}`)
      .then(res => {
        setCompareData(res.data);
      })
      .catch(err => {
        console.error("Compare mood error:", err);
        toast("Failed to load mood comparison", "error");
      })
      .finally(() => {
        setLoadingCompare(false);
      });
  };

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div className="skeleton" style={{ height: 120, marginBottom: 24, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 360, borderRadius: 20 }} />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="page-content animate-fade" style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          🌌 Social Orbit
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Connect with friends, explore their real-time moods, listen to shared playlists, and check live listening activity.
        </p>
      </div>

      <div className="responsive-grid-12-1">
        {/* Left Column: Circle Hub */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', marginBottom: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            {[
              { id: 'feed', label: 'Orbit Feed 🌌', icon: <IoReader /> },
              { id: 'playlists', label: 'Shared Playlists 💿', icon: '💿' },
              { id: 'share', label: 'Share Vibe ⚡', icon: <IoShareSocial /> },
              { id: 'manage', label: 'My Circle 🔒', icon: <IoPeople /> },
              { 
                id: 'alerts', 
                label: `Alerts ${unreadCount > 0 ? `(${unreadCount})` : ''} 🔔`, 
                icon: <IoNotifications /> 
              }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  color: activeTab === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderBottom: activeTab === t.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'all var(--transition)',
                  background: 'none', border: 'none', cursor: 'pointer'
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Orbit Feed */}
          {activeTab === 'feed' && (
            <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="glass-card" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, textAlign: 'left' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>How are you feeling today?</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Let your circle know to share positive vibes.</p>
                </div>
                <button className="btn-primary" onClick={() => setActiveTab('share')}>Share Vibe Update</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                {/* Left Column: Broadcast Vibe Statuses */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, textAlign: 'left', color: 'var(--text-muted)' }}>Vibe Broadcasts</h3>
                  {feed.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '64px 20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)' }}>
                      <div style={{ fontSize: 44, marginBottom: 16 }}>📱</div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No vibe updates yet</h4>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto', lineHeight: 1.6 }}>
                        Once your friends share an update, it will appear here.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {feed.map((status) => {
                        const isMe = status.user_id === user.id;
                        const statusColor = MOOD_COLORS[status.mood] || 'var(--text-primary)';
                        const isLow = ['sad', 'fearful', 'angry', 'disgusted'].includes(status.mood);

                        return (
                          <div
                            key={status.id}
                            style={{
                              background: isLow ? `linear-gradient(135deg, rgba(255,255,255,0.01) 0%, ${MOOD_COLORS[status.mood]}05 100%)` : 'rgba(255,255,255,0.01)',
                              border: `1px solid ${isLow ? `${MOOD_COLORS[status.mood]}40` : 'var(--border-color)'}`,
                              boxShadow: isLow ? `0 4px 16px ${MOOD_COLORS[status.mood]}10` : 'none',
                              borderRadius: 'var(--radius-lg)',
                              padding: 24,
                              transition: 'transform 0.2s ease',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {status.user_profile_image ? (
                                  <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden' }}>
                                    <img src={status.user_profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                ) : (
                                  <MoodAvatar user={{ name: status.user_name, avatar_style: status.user_avatar_style }} mood={status.mood} size={44} />
                                )}
                                <div>
                                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                                    {status.user_name} {isMe && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(You)</span>}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {new Date(status.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>

                              <span style={{
                                fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius-full)',
                                background: `${statusColor}18`, border: `1px solid ${statusColor}44`,
                                color: statusColor, display: 'inline-flex', alignItems: 'center', gap: 4
                              }}>
                                <span>{MOOD_EMOJIS[status.mood]}</span>
                                <span style={{ textTransform: 'capitalize' }}>{status.mood}</span>
                              </span>
                            </div>

                            <p style={{ fontSize: 14.5, color: 'var(--text-primary)', marginTop: 16, marginBottom: 16, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                              {status.content}
                            </p>

                            {!isMe && (
                              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14, display: 'flex', gap: 12 }}>
                                <button 
                                  onClick={() => sendLove(status.user_name)} 
                                  className="btn-ghost" 
                                  style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, color: '#fc5ca0', borderColor: 'rgba(252,92,160,0.2)' }}
                                >
                                  <IoHeart /> Send Support Love
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Live Listening Activities */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, textAlign: 'left', color: 'var(--text-muted)' }}>⚡ Live Listening</h3>
                  {activityFeed.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>No recent listening activity.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {activityFeed.map((act) => (
                        <div
                          key={act.id}
                          style={{
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            textAlign: 'left'
                          }}
                        >
                          {act.user_profile_image ? (
                            <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                              <img src={act.user_profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ) : (
                            <MoodAvatar user={{ name: act.user_name, avatar_style: act.user_avatar_style }} mood={act.emotion} size={32} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{act.user_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                              🎵 {act.song_title}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                              {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <span style={{ fontSize: 14 }} title={`Felt ${act.emotion}`}>{MOOD_EMOJIS[act.emotion] || '😐'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Shared Playlists */}
          {activeTab === 'playlists' && (
            <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="glass-card" style={{ padding: 24, textAlign: 'left' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>💿 Friends' Shared Playlists</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Listen to public or collaborative playlists created by your connections.
                </p>
              </div>

              {socialPlaylists.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>💿</div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No shared playlists found</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto', lineHeight: 1.6 }}>
                    Once your friends make their playlists public or add you as a collaborator, they will appear here!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                  {socialPlaylists.map((pl) => (
                    <div
                      key={pl.id}
                      style={{
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{
                          width: 60, height: 60, borderRadius: 8,
                          background: 'var(--gradient-main)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 24, color: 'white', fontWeight: 800
                        }}>
                          🎵
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {pl.playlist_name}
                          </h4>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            By: <strong>{pl.owner_name}</strong>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {pl.song_count} songs · {pl.is_collaborative ? 'Collaborative 🤝' : 'Public 🌐'}
                          </div>
                        </div>
                      </div>

                      <button
                        className="btn-primary"
                        style={{ marginTop: 8, fontSize: 12, padding: '8px 16px' }}
                        onClick={async () => {
                          try {
                            const res = await API.get(`/music/playlists/${pl.id}/songs`);
                            if (res.data && res.data.songs && res.data.songs.length > 0) {
                              playSong(res.data.songs[0], res.data.songs, 0);
                              toast(`Playing playlist "${pl.playlist_name}"!`, 'success');
                            } else {
                              toast('This playlist is currently empty.', 'info');
                            }
                          } catch (err) {
                            toast('Could not fetch playlist songs', 'error');
                          }
                        }}
                      >
                        ▶ Play Playlist
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Share Vibe */}
          {activeTab === 'share' && (
            <div className="glass-card animate-fade" style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <span style={{ fontSize: 24 }}>⚡</span>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Broadcast Vibe</h2>
              </div>

              <form onSubmit={handleShareVibe} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 12, fontWeight: 600 }}>
                    Select your vibe:
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.keys(MOOD_EMOJIS).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMood(m)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: mood === m ? `${MOOD_COLORS[m]}18` : 'rgba(255,255,255,0.02)',
                          border: mood === m ? `2px solid ${MOOD_COLORS[m]}` : '1px solid var(--border-color)',
                          color: mood === m ? 'white' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 14.5,
                          fontWeight: mood === m ? 700 : 400,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span>{MOOD_EMOJIS[m]}</span>
                        <span style={{ textTransform: 'capitalize' }}>{m}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 12, fontWeight: 600 }}>
                    Vibe message (e.g. "Feeling low today.", "Celebrating a small win!"):
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write a status update..."
                    rows={4}
                    style={{ resize: 'vertical', width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" defaultChecked id="email_notif" style={{ width: 16, height: 16 }} />
                  <label htmlFor="email_notif" style={{ fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer' }}>
                    Also notify trusted contacts via email list alert.
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={sharing}
                  style={{ alignSelf: 'flex-start', padding: '12px 24px' }}
                >
                  {sharing ? 'Broadcasting...' : 'Broadcast to Circle'}
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Manage Circle */}
          {activeTab === 'manage' && (
            <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Active Circle Members */}
              <div className="glass-card" style={{ padding: 28 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>🔒 My Circle of Trust</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                  These close contacts can view your shared statuses and receive alert notifications when you broadcast your vibe.
                </p>

                {circle.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: 13 }}>No close contacts added yet. Add some below from your friends list!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {circle.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)',
                          borderRadius: 12
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {c.contact_profile_image ? (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden' }}>
                              <img src={c.contact_profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ) : (
                            <MoodAvatar user={{ name: c.contact_name, avatar_style: c.contact_avatar_style }} mood={c.mood_info?.mood} size={36} />
                          )}
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{c.contact_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.contact_email}</div>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleRemoveCircle(c.contact_id)} 
                          className="btn-ghost" 
                          style={{ padding: '6px 12px', fontSize: 11, color: 'var(--accent-pink)', borderColor: 'rgba(252,92,160,0.1)' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Circle Members from Friends */}
              <div className="glass-card" style={{ padding: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>➕ Add Trusted Friends</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Add close contacts from your active friendships list.
                </p>

                {friends.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: 12 }}>No friends connected. Add friends in the search panel first!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {friends.map((f) => {
                      const isInCircle = circle.some(c => c.contact_id === f.id);
                      return (
                        <div
                          key={f.id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)',
                            borderRadius: 10
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <MoodAvatar user={f} size={30} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{f.name}</div>
                            </div>
                          </div>

                          {isInCircle ? (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, padding: '4px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                              ✓ Added
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleAddCircle(f.id)} 
                              className="btn-primary" 
                              style={{ padding: '4px 10px', fontSize: 11 }}
                            >
                              + Trust
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: In-App Alerts */}
          {activeTab === 'alerts' && (
            <div className="glass-card animate-fade" style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoNotifications /> Notifications
                </h2>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
                    Mark All as Read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: 13 }}>No alerts logged yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {notifications.map((n) => {
                    const borderMoodColor = MOOD_COLORS[n.mood] || 'var(--border-color)';
                    const isLow = ['sad', 'fearful', 'angry'].includes(n.mood);

                    return (
                      <div
                        key={n.id}
                        style={{
                          background: n.is_read ? 'rgba(255,255,255,0.01)' : 'rgba(124,92,252,0.03)',
                          border: `1px solid ${!n.is_read ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          borderLeft: `4px solid ${borderMoodColor}`,
                          borderRadius: 'var(--radius-md)',
                          padding: 16,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 16
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: 13, color: 'white' }}>{n.sender_name}</strong>
                            <span style={{ fontSize: 12, color: borderMoodColor, fontWeight: 600 }}>
                              shared their mood: {MOOD_EMOJIS[n.mood]} {n.mood}
                            </span>
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0, fontStyle: 'italic' }}>
                            "{n.message}"
                          </p>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(n.created_at).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isLow && (
                            <button 
                              onClick={() => sendLove(n.sender_name)} 
                              className="btn-primary" 
                              style={{ padding: '4px 10px', fontSize: 11, background: '#fc5ca0', borderColor: '#fc5ca0', boxShadow: 'none' }}
                            >
                              💖 Support
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Friends Match */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {activeCompareFriend ? (
            /* Mood Sync Visualizer */
            <div className="glass-card animate-fade" style={{ padding: 24, minHeight: 480, display: 'flex', flexDirection: 'column' }}>
              {loadingCompare ? (
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Calculating emotional alignment...</p>
                </div>
              ) : compareData ? (
                <div className="animate-fade">
                  {/* Back button and header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 20, marginBottom: 24 }}>
                    <div>
                      <button 
                        onClick={() => { setActiveCompareFriend(null); setCompareData(null); }} 
                        className="btn-ghost" 
                        style={{ padding: '6px 12px', fontSize: 11, marginBottom: 12, borderRadius: 'var(--radius-sm)' }}
                      >
                        ← Back to Connections
                      </button>
                      <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>
                        Comparing with {activeCompareFriend.name}
                      </h3>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>NLP &amp; metrics comparison</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: 20, fontWeight: 900, 
                        color: compareData.match_percentage > 70 ? 'var(--accent-teal)' : compareData.match_percentage > 45 ? 'var(--accent-amber)' : 'var(--accent-pink)',
                        fontFamily: 'var(--font-display)'
                      }}>
                        {compareData.match_percentage}% Match
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Mood Harmony Index</div>
                    </div>
                  </div>

                  {/* Side by side state summaries */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <div style={{ padding: '16px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 12, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>You Feel</div>
                      <MoodAvatar user={user} mood={compareData.user_mood.mood} size={48} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-primary)', marginTop: 2 }}>
                        {compareData.user_mood.mood.toUpperCase()}
                      </div>
                    </div>

                    <div style={{ padding: '16px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 12, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeCompareFriend.name} Feels</div>
                      <MoodAvatar user={activeCompareFriend} mood={compareData.friend_mood.mood} size={48} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: MOOD_COLORS[compareData.friend_mood.mood], marginTop: 2 }}>
                        {compareData.friend_mood.mood.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Comparison Bars */}
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Index Analysis</h4>
                    <ComparisonBar
                      label="Happiness / Positive Energy"
                      userVal={compareData.user_mood.happiness}
                      friendVal={compareData.friend_mood.happiness}
                      color={MOOD_COLORS[compareData.friend_mood.mood]}
                    />
                    <ComparisonBar
                      label="Stress Index"
                      userVal={compareData.user_mood.stress}
                      friendVal={compareData.friend_mood.stress}
                      color={MOOD_COLORS[compareData.friend_mood.mood]}
                    />
                    <ComparisonBar
                      label="Anxiety Indicator"
                      userVal={compareData.user_mood.anxiety}
                      friendVal={compareData.friend_mood.anxiety}
                      color={MOOD_COLORS[compareData.friend_mood.mood]}
                    />
                    <ComparisonBar
                      label="Fatigue / Exhaustion"
                      userVal={compareData.user_mood.fatigue}
                      friendVal={compareData.friend_mood.fatigue}
                      color={MOOD_COLORS[compareData.friend_mood.mood]}
                    />
                  </div>

                  {/* Compatibility Match Explanation */}
                  <div style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, rgba(124,92,252,0.08) 0%, rgba(92,252,216,0.04) 100%)',
                    border: '1px solid rgba(124,92,252,0.2)',
                    borderRadius: 12,
                    fontSize: 12.5,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    display: 'flex',
                    gap: 10
                  }}>
                    <span style={{ fontSize: 16 }}>💡</span>
                    <div>
                      <strong style={{ color: 'white', display: 'block', marginBottom: 2 }}>Alignment Insight</strong>
                      {compareData.description}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>Failed to load data</div>
              )}
            </div>
          ) : (
            <>
              {/* Search Card */}
              <div className="glass-card animate-fade" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🔍 Search New Friends</h3>
                <input
                  type="text"
                  placeholder="Enter name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    outline: 'none',
                    fontSize: 14,
                    marginBottom: searchQuery ? 16 : 0
                  }}
                />

                {searchQuery && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto', paddingRight: 4, marginTop: 10 }}>
                    {loadingSearch ? (
                      <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, color: 'var(--text-muted)' }}>Searching users...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map(u => (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {u.profile_image ? (
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden'
                              }}>
                                <img src={u.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ) : (
                              <MoodAvatar user={u} size={32} />
                            )}
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                          
                          {u.friendship_status === 'accepted' ? (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}>Friends</span>
                          ) : (
                            <button onClick={() => handleAddFriend(u.id)} className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>+ Add</button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, color: 'var(--text-muted)' }}>No users found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Active Connections Card */}
              <div className="glass-card animate-fade" style={{ padding: '24px', minHeight: 300 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>👥 Active Connections</h3>
                
                {friends.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {friends.map(f => {
                      const mInfo = f.mood_info || { mood: 'neutral' };
                      return (
                        <div
                          key={f.id}
                          onClick={() => handleCompareMood(f)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 12, cursor: 'pointer',
                            transition: 'all var(--transition)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {f.profile_image ? (
                              <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14, fontWeight: 700, color: 'white', overflow: 'hidden'
                              }}>
                                <img src={f.profile_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ) : (
                              <MoodAvatar user={f} mood={mInfo.mood} size={40} />
                            )}
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700 }}>{f.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <span>Last Mood:</span> 
                                <span style={{ color: MOOD_COLORS[mInfo.mood] || 'var(--text-secondary)', fontWeight: 600 }}>
                                  {MOOD_EMOJIS[mInfo.mood] || '😐'} {(mInfo.mood || 'neutral').charAt(0).toUpperCase() + (mInfo.mood || 'neutral').slice(1)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleCompareMood(f)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>⚡ Match</button>
                            <button onClick={() => handleRemoveFriend(f.id)} style={{ fontSize: 16, color: 'var(--accent-pink)', border: 'none', background: 'none', cursor: 'pointer', padding: 4 }} title="Remove friend">✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 44, marginBottom: 12 }}>👥</div>
                    <p style={{ fontSize: 13, maxWidth: 220, margin: '0 auto', lineHeight: 1.6 }}>No friends added yet. Use search above to build your community!</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
