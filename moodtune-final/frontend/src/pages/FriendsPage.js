import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import MoodAvatar from '../components/common/MoodAvatar';

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

export default function FriendsPage() {
  const { API, toast, token, user } = useApp();
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [activeCompareFriend, setActiveCompareFriend] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Load friends
  const loadFriends = () => {
    if (!token) return;
    setLoadingFriends(true);
    API.get('/social/friends')
      .then(res => {
        setFriends(res.data.friends || []);
      })
      .catch(err => {
        console.error("Load friends error:", err);
        toast("Failed to load friends list", "error");
      })
      .finally(() => {
        setLoadingFriends(false);
      });
  };

  useEffect(() => {
    loadFriends();
  }, [token]);

  // Handle user search
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

  // Friend actions
  const handleAddFriend = (friendId) => {
    API.post('/social/friends/add', { friend_id: friendId })
      .then(res => {
        toast(res.data.message || "Friend added!", "success");
        loadFriends();
        // Update status in search list
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
        loadFriends();
        if (activeCompareFriend?.id === friendId) {
          setActiveCompareFriend(null);
          setCompareData(null);
        }
      })
      .catch(err => {
        toast("Failed to remove friend", "error");
      });
  };

  // Compare mood
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

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>👥 Friends Match</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Compare real-time moods, create playlists, and explore aligned stats with friends</p>
      </div>

      <div className="responsive-grid-1-12">
        
        {/* Left Column: Search & Friends List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Search Card */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 250, overflowY: 'auto', paddingRight: 4 }}>
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

          {/* Friends List Card */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            minHeight: 300
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>👥 Active Connections</h3>
            
            {loadingFriends ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : friends.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {friends.map(f => {
                  const mInfo = f.mood_info;
                  const isSelected = activeCompareFriend?.id === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => handleCompareMood(f)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: isSelected ? 'rgba(124,92,252,0.06)' : 'rgba(255,255,255,0.01)',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
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
                            <span style={{ color: MOOD_COLORS[mInfo.mood], fontWeight: 600 }}>
                              {MOOD_EMOJIS[mInfo.mood]} {mInfo.mood.charAt(0).toUpperCase() + mInfo.mood.slice(1)}
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
        </div>

        {/* Right Column: Comparative Visualizer */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          minHeight: 480,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {!activeCompareFriend ? (
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>⚡</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'var(--font-display)' }}>Mood Sync Visualizer</h3>
              <p style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.6 }}>Select a friend from active connections to run comparative real-time emotional matching and calculate harmony score.</p>
            </div>
          ) : loadingCompare ? (
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Calculating emotional alignment...</p>
            </div>
          ) : compareData ? (
            <div className="animate-fade">
              {/* Compare Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 20, marginBottom: 24 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>Comparing with {activeCompareFriend.name}</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>NLP &amp; metrics comparison</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: 22, fontWeight: 900, 
                    color: compareData.match_percentage > 70 ? 'var(--accent-teal)' : compareData.match_percentage > 45 ? 'var(--accent-amber)' : 'var(--accent-pink)',
                    fontFamily: 'var(--font-display)'
                  }}>
                    {compareData.match_percentage}% Match
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Mood Harmony Index</div>
                </div>
              </div>

              {/* Side by side state summaries */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                <div style={{ padding: '20px 14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 12, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>You Feel</div>
                  <MoodAvatar user={user} mood={compareData.user_mood.mood} size={56} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-primary)', marginTop: 4 }}>
                    {compareData.user_mood.mood.toUpperCase()}
                  </div>
                </div>

                <div style={{ padding: '20px 14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 12, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeCompareFriend.name} Feels</div>
                  <MoodAvatar user={activeCompareFriend} mood={compareData.friend_mood.mood} size={56} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: MOOD_COLORS[compareData.friend_mood.mood], marginTop: 4 }}>
                    {compareData.friend_mood.mood.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Comparison Bars */}
              <div style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16 }}>Index Analysis</h4>
                
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
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(124,92,252,0.08) 0%, rgba(92,252,216,0.04) 100%)',
                border: '1px solid rgba(124,92,252,0.2)',
                borderRadius: 12,
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                display: 'flex',
                gap: 12
              }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <div>
                  <strong style={{ color: 'white', display: 'block', marginBottom: 4 }}>Alignment Insight</strong>
                  {compareData.description}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>Failed to load data</div>
          )}
        </div>

      </div>
    </div>
  );
}
