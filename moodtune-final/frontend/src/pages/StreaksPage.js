import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { IoFlame, IoCalendar, IoHourglass, IoCheckmarkCircle, IoJournal, IoMusicalNotes } from 'react-icons/io5';

// Ambient focus tracks available in the app or standard nature sounds
const FOCUS_AMBIENT_TRACKS = [
  {
    title: 'Zen Meditation Flute',
    artist: 'Buddhism Relaxation Music',
    cover_url: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=150',
    preview_url: '',
    spotify_id: 'meditation_zen_flute',
    genre: 'Meditation',
    mood: 'neutral'
  },
  {
    title: 'Tibetan Singing Bowls',
    artist: 'Tibetan Healing Sounds',
    cover_url: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=150',
    preview_url: '',
    spotify_id: 'meditation_singing_bowls',
    genre: 'Meditation',
    mood: 'fearful'
  },
  {
    title: 'Cozy Fireplace Crackling',
    artist: 'Fireplace Ambience',
    cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150',
    preview_url: '',
    spotify_id: 'nature_fireplace',
    genre: 'Ambient',
    mood: 'neutral'
  },
  {
    title: 'Gentle Ocean Waves',
    artist: 'Sea Sounds Relaxation',
    cover_url: 'https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=150',
    preview_url: '',
    spotify_id: 'nature_ocean_waves',
    genre: 'Nature',
    mood: 'neutral'
  }
];

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

export default function StreaksPage() {
  const { API, toast, playSong } = useApp();
  const [stats, setStats] = useState(null);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Journal form state
  const [journalContent, setJournalContent] = useState('');
  const [journalMood, setJournalMood] = useState('happy');
  const [submittingJournal, setSubmittingJournal] = useState(false);

  // Focus Timer state
  const [timerDuration, setTimerDuration] = useState(25); // Minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Seconds
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerCategory, setTimerCategory] = useState('Work');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [devMode, setDevMode] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    fetchWellnessData();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Sync time left if duration changes and timer is not running
    if (!timerRunning) {
      setTimeLeft(devMode ? 10 : timerDuration * 60);
    }
  }, [timerDuration, devMode, timerRunning]);

  const fetchWellnessData = async () => {
    setLoading(true);
    try {
      const tzOffset = new Date().getTimezoneOffset();
      const [statsRes, journalRes] = await Promise.all([
        API.get(`/wellness/stats?tz_offset=${tzOffset}`),
        API.get(`/wellness/journal?tz_offset=${tzOffset}`)
      ]);
      setStats(statsRes.data);
      setJournals(journalRes.data.entries || []);
    } catch (err) {
      console.error(err);
      toast('Failed to load wellness statistics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJournalSubmit = async (e) => {
    e.preventDefault();
    if (!journalContent.trim()) {
      toast('Reflection content cannot be empty', 'warning');
      return;
    }
    setSubmittingJournal(true);
    try {
      const tzOffset = new Date().getTimezoneOffset();
      const res = await API.post('/wellness/journal', {
        content: journalContent,
        mood: journalMood,
        tz_offset: tzOffset
      });
      toast(res.data.message, 'success');
      setJournalContent('');
      fetchWellnessData();
    } catch (err) {
      toast('Failed to save reflection entry', 'error');
    } finally {
      setSubmittingJournal(false);
    }
  };

  // Focus Timer Controls
  const startTimer = () => {
    if (timerRunning) return;
    setTimerRunning(true);
    
    // Play focus track if selected
    if (selectedTrack) {
      playSong(selectedTrack, FOCUS_AMBIENT_TRACKS, FOCUS_AMBIENT_TRACKS.indexOf(selectedTrack));
      toast(`Playing ambient track: ${selectedTrack.title}`, 'info');
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFocusCompleted();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    setTimerRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const resetTimer = () => {
    pauseTimer();
    setTimeLeft(devMode ? 10 : timerDuration * 60);
  };

  const handleFocusCompleted = async () => {
    setTimerRunning(false);
    // Audio chime or alert
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}

    toast('🎉 Focus session completed! Excellent job!', 'success');
    
    try {
      await API.post('/wellness/focus', {
        duration_minutes: devMode ? 1 : timerDuration,
        category: timerCategory
      });
      fetchWellnessData();
    } catch (err) {
      toast('Failed to log completed focus session', 'error');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render Streak calendars / trackers
  const renderWeeklyTracker = () => {
    const today = new Date();
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekDots = [];
    
    // Find journal entries logged this week
    const loggedDates = new Set(
      journals.map(j => new Date(j.timestamp).toDateString())
    );

    // Render past 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const isLogged = loggedDates.has(d.toDateString());
      const isToday = d.toDateString() === today.toDateString();
      
      weekDots.push(
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: isLogged ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
            border: isToday ? '2px solid var(--accent-teal)' : '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
            color: isLogged ? 'white' : 'var(--text-muted)',
            boxShadow: isLogged ? '0 0 12px var(--accent-primary)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            {isLogged ? '🔥' : daysOfWeek[d.getDay()][0]}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {isToday ? 'Today' : daysOfWeek[d.getDay()]}
          </span>
        </div>
      );
    }
    return weekDots;
  };

  // Last 30 days grid layout
  const render30DaysGrid = () => {
    if (!stats || !stats.mood) return null;
    const trackedDates = new Set(stats.mood.tracked_dates);
    
    const dots = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const isoStr = `${year}-${month}-${day}`;
      const isTracked = trackedDates.has(isoStr);

      dots.push(
        <div 
          key={i} 
          title={isoStr + (isTracked ? ' (Mood Tracked)' : ' (No Vibe Logged)')}
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: isTracked ? 'var(--accent-teal)' : 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-color)',
            boxShadow: isTracked ? '0 0 8px var(--accent-teal)' : 'none',
            cursor: 'help',
            transition: 'all 0.2s ease'
          }}
        />
      );
    }
    return dots;
  };

  // SVG Render helper for locked vs unlocked badges
  const renderBadgeSVG = (badge) => {
    const size = 68;
    const strokeColor = badge.unlocked ? '#7c5cfc' : '#5a5a72';
    const fillColor = badge.unlocked ? 'url(#badgeGrad)' : 'rgba(255,255,255,0.02)';
    const emoji = badge.type === 'journal' ? '✍️' : badge.type === 'mood' ? '🔮' : '🧘';

    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: badge.unlocked ? 'drop-shadow(0 4px 12px rgba(124,92,252,0.4))' : 'none' }}>
        <defs>
          <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c5cfc" />
            <stop offset="50%" stopColor="#5c8cfc" />
            <stop offset="100%" stopColor="#5cfcd8" />
          </linearGradient>
        </defs>
        {/* Hexagon shape */}
        <polygon 
          points="50,5 90,25 90,75 50,95 10,75 10,25" 
          fill={fillColor} 
          stroke={strokeColor} 
          strokeWidth="4"
          className={badge.unlocked ? 'animate-float' : ''}
          style={{ transformOrigin: 'center center', animationDuration: badge.unlocked ? '3s' : '0s' }}
        />
        {/* Emoji in the middle */}
        <text 
          x="50" 
          y="58" 
          fontSize="36" 
          textAnchor="middle"
          style={{ opacity: badge.unlocked ? 1 : 0.25 }}
        >
          {emoji}
        </text>
      </svg>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div className="skeleton" style={{ height: 160, marginBottom: 24, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 20 }} />
      </div>
    );
  }

  // Calculate percentage of timer complete
  const totalSeconds = devMode ? 10 : timerDuration * 60;
  const timerPercentage = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;
  const strokeDashoffset = 2 * Math.PI * 90 * (timerPercentage / 100);

  return (
    <div className="page-content animate-fade">
      {/* Title */}
      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6 }}>🔥 Streaks</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Build daily wellness habits, reflect on your thoughts, and level up focus</p>

      {/* Main Stats Header Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
        {/* Card 1: 7-Day Journal Streak */}
        <div className="glass-card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Daily Journal Streak</span>
              <h3 style={{ fontSize: 28, fontWeight: 900, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                {stats?.journal?.current_streak} Days
                <IoFlame style={{ color: stats?.journal?.current_streak > 0 ? '#fc5ca0' : 'var(--text-muted)', filter: stats?.journal?.current_streak > 0 ? 'drop-shadow(0 0 8px #fc5ca0)' : 'none', animation: stats?.journal?.current_streak > 0 ? 'float 2s ease-in-out infinite' : 'none' }} />
              </h3>
            </div>
            <div style={{ background: 'rgba(252,92,160,0.1)', padding: 10, borderRadius: 12, color: '#fc5ca0' }}>
              <IoJournal size={22} />
            </div>
          </div>
          
          {/* Weekly progress grid */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            {renderWeeklyTracker()}
          </div>
          
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
            Longest Streak: {stats?.journal?.longest_streak} days · Total posts: {stats?.journal?.total_reflections}
          </div>
        </div>

        {/* Card 2: 30-Day Mood Tracking */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>30-Day Mood Tracker</span>
              <h3 style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>
                {stats?.mood?.total_days_tracked} / 30 <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>Days</span>
              </h3>
            </div>
            <div style={{ background: 'rgba(92,252,216,0.1)', padding: 10, borderRadius: 12, color: '#5cfcd8' }}>
              <IoCalendar size={22} />
            </div>
          </div>

          {/* Dots layout of 30 days mood log */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 8, marginTop: 20 }}>
            {render30DaysGrid()}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center' }}>
            Earn 30-Day Tracker badge by logging mood daily
          </div>
        </div>

        {/* Card 3: Focus Session Stats */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Focus Session Stats</span>
              <h3 style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>
                {stats?.focus?.total_sessions} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>Sessions</span>
              </h3>
            </div>
            <div style={{ background: 'rgba(124,92,252,0.1)', padding: 10, borderRadius: 12, color: '#7c5cfc' }}>
              <IoHourglass size={22} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Focus Minutes:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{stats?.focus?.total_minutes} mins</span>
            </div>
            {/* simple milestone indicator */}
            <div style={{ height: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 3, overflow: 'hidden', marginTop: 12 }}>
              <div style={{ height: '100%', width: `${Math.min((stats?.focus?.total_sessions / 25) * 100, 100)}%`, background: 'var(--gradient-main)', borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>0 sessions</span>
              <span>25 sessions milestone</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section Grid: Reflections (Left) + Focus Timer (Right) */}
      <div className="responsive-grid-12-08" style={{ gap: 24, marginBottom: 32 }}>
        
        {/* Left Side: Daily reflection journal */}
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 22 }}>✍️</span>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Reflection Journal</h2>
          </div>

          <form onSubmit={handleJournalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Mood selector */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 10, fontWeight: 600 }}>
                How is your state of mind right now?
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(MOOD_EMOJIS).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setJournalMood(m)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: journalMood === m ? `${MOOD_COLORS[m]}18` : 'rgba(255,255,255,0.02)',
                      border: journalMood === m ? `2px solid ${MOOD_COLORS[m]}` : '1px solid var(--border-color)',
                      color: journalMood === m ? 'white' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      fontWeight: journalMood === m ? 700 : 400,
                      transition: 'all 0.2s ease',
                      boxShadow: journalMood === m ? `0 0 12px ${MOOD_COLORS[m]}33` : 'none'
                    }}
                  >
                    <span>{MOOD_EMOJIS[m]}</span>
                    <span style={{ textTransform: 'capitalize' }}>{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note entry */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 10, fontWeight: 600 }}>
                Write your daily reflection
              </label>
              <textarea
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                placeholder="Write down how your day is going, what was a success, or what is stressing you out. Let your thoughts flow..."
                rows={4}
                style={{ resize: 'vertical', width: '100%' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={submittingJournal}
              style={{ alignSelf: 'flex-start' }}
            >
              {submittingJournal ? 'Saving...' : 'Save Reflection Entry'}
            </button>
          </form>

          {/* Reflections list history */}
          <div style={{ marginTop: 32, borderTop: '1px solid var(--border-color)', paddingTop: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
              Recent Reflections
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
              {journals.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                  No journal logs logged yet. Reflect to start your streak!
                </div>
              ) : (
                journals.map((j) => (
                  <div key={j.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{
                        fontSize: 12, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                        background: `${MOOD_COLORS[j.mood]}12`, border: `1px solid ${MOOD_COLORS[j.mood]}44`,
                        color: MOOD_COLORS[j.mood], display: 'inline-flex', alignItems: 'center', gap: 4
                      }}>
                        <span>{MOOD_EMOJIS[j.mood]}</span>
                        <span style={{ textTransform: 'capitalize' }}>{j.mood}</span>
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(j.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {j.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Focus Timer */}
        <div className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              🧘 Focus Center
            </h2>
            {/* Dev Mode toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={devMode}
                onChange={(e) => setDevMode(e.target.checked)}
                style={{ width: 14, height: 14 }}
              />
              Dev Mode (10s)
            </label>
          </div>

          {/* Visual Timer Circle */}
          <div style={{ position: 'relative', width: 200, height: 200, margin: '20px 0' }}>
            <svg width="200" height="200">
              {/* Background circle */}
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
              {/* Glowing active timer ring */}
              <circle
                cx="100" cy="100" r="90"
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 90}
                strokeDashoffset={2 * Math.PI * 90 - strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%',
                  transition: timerRunning ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.3s ease',
                  filter: 'drop-shadow(0 0 6px var(--accent-primary))'
                }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ fontSize: 36, fontWeight: 900, fontFamily: 'var(--font-display)', color: 'white' }}>
                {formatTime(timeLeft)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {timerCategory}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            {!timerRunning ? (
              <button className="btn-primary" onClick={startTimer} style={{ padding: '10px 24px' }}>
                Start Focus
              </button>
            ) : (
              <button className="btn-ghost" onClick={pauseTimer} style={{ padding: '10px 24px', borderColor: 'var(--accent-pink)' }}>
                Pause
              </button>
            )}
            <button className="btn-ghost" onClick={resetTimer} style={{ padding: '10px 24px' }}>
              Reset
            </button>
          </div>

          {/* Config Controls */}
          <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Category selection */}
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Focus Vibe
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['Work 💻', 'Study 📚', 'Meditate 🧘', 'Relax 🍃'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTimerCategory(cat.split(' ')[0])}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: timerCategory === cat.split(' ')[0] ? 'rgba(124,92,252,0.1)' : 'rgba(255,255,255,0.01)',
                      border: timerCategory === cat.split(' ')[0] ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      color: timerCategory === cat.split(' ')[0] ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontSize: 12,
                      fontWeight: 600,
                      textAlign: 'center'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider Duration */}
            {!timerRunning && !devMode && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
                  <span>Session Length</span>
                  <span>{timerDuration} minutes</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={timerDuration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setTimerDuration(val);
                  }}
                  style={{ width: '100%', height: 4, background: 'var(--border-color)', outline: 'none' }}
                />
              </div>
            )}

            {/* Select Ambient Track */}
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, fontWeight: 600 }}>
                🎵 Ambient Focus Audio
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {FOCUS_AMBIENT_TRACKS.map((track) => (
                  <div
                    key={track.spotify_id}
                    onClick={() => setSelectedTrack(selectedTrack?.spotify_id === track.spotify_id ? null : track)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: 8,
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      border: selectedTrack?.spotify_id === track.spotify_id ? '1px solid var(--accent-teal)' : '1px solid transparent',
                      background: selectedTrack?.spotify_id === track.spotify_id ? 'rgba(92,252,216,0.05)' : 'rgba(255,255,255,0.01)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <img src={track.cover_url} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: selectedTrack?.spotify_id === track.spotify_id ? '#5cfcd8' : 'var(--text-primary)' }}>{track.title}</div>
                      <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{track.artist}</div>
                    </div>
                    {selectedTrack?.spotify_id === track.spotify_id && (
                      <span style={{ color: '#5cfcd8', fontSize: 12 }}>🔊 Active</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="glass-card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 24 }}>🏆</span>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Habit Milestones &amp; Badges</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {stats?.badges?.map((badge) => (
            <div
              key={badge.id}
              style={{
                background: badge.unlocked ? 'rgba(124,92,252,0.03)' : 'rgba(255,255,255,0.01)',
                border: badge.unlocked ? '1px solid rgba(124,92,252,0.2)' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
            >
              {/* Badge SVG representation */}
              <div>{renderBadgeSVG(badge)}</div>

              {/* Badge info */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: badge.unlocked ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {badge.title}
                  {badge.unlocked && <IoCheckmarkCircle style={{ color: '#5cfcd8' }} />}
                </h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                  {badge.description}
                </p>

                {/* Progress bar */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                    <span>Progress:</span>
                    <span>{badge.current} / {badge.target}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.02)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min((badge.current / badge.target) * 100, 100)}%`,
                      background: badge.unlocked ? 'var(--gradient-main)' : 'var(--text-muted)',
                      borderRadius: 2
                    }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
