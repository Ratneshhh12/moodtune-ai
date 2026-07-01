/**
 * MoodTune AI — Conversational Chatbot
 * Understands Hindi / English / Hinglish mood
 * Returns empathetic replies + clickable song playlist cards
 */
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

/* ─── Quick mood suggestions ─────────────────────────────────────────────── */
const QUICK_MOODS = [
  { label: '😴 Thak gaya kaam se', text: 'Bahut thak gaya hoon kaam se aaj' },
  { label: '💔 Breakup ho gaya', text: 'Mera breakup ho gaya hai, bahut sad hoon' },
  { label: '🎉 Party mood!', text: 'Party mood mein hoon! Kuch energetic baja do' },
  { label: '💪 Gym ke liye', text: 'Gym ke liye kuch pump-up songs bata do' },
  { label: '🧘 Relax karna hai', text: 'Bahut anxious hoon, kuch soothing sunna chahta hoon' },
  { label: '💕 Romantic mood', text: 'Aaj romantic mood mein hoon, pyaar ke gaane sunao' },
];

/* ─── Helper: render markdown bold/italic ─────────────────────────────────── */
function RenderText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} style={{ color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i} style={{ color: 'var(--text-secondary)' }}>{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

/* ─── Playlist message card ───────────────────────────────────────────────── */
function PlaylistMessage({ playlist, onPlay }) {
  const { color, emoji, label, songs = [] } = playlist;
  return (
    <div style={{
      background: `${color}08`,
      border: `1px solid ${color}25`,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      maxWidth: 290,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        background: `${color}15`,
        borderBottom: `1px solid ${color}20`,
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{songs.length} songs · Tap to play</div>
        </div>
      </div>

      {/* Song rows */}
      <div style={{ padding: '8px 0' }}>
        {songs.slice(0, 5).map((song, i) => (
          <div
            key={i}
            onClick={() => onPlay(song, songs, i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 14px', cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${color}10`}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Cover / Number */}
            <div style={{
              width: 32, height: 32, borderRadius: 6, flexShrink: 0,
              background: song.cover_url
                ? `url(${song.cover_url}) center/cover`
                : `${color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color, fontWeight: 700,
              overflow: 'hidden',
              border: `1px solid ${color}20`
            }}>
              {!song.cover_url && (i + 1)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {song.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {song.artist}
              </div>
            </div>
            <span style={{ fontSize: 14, color, opacity: 0.7 }}>▶</span>
          </div>
        ))}
      </div>

      {/* Play all */}
      <div style={{ padding: '8px 14px 12px' }}>
        <button
          onClick={() => onPlay(songs[0], songs, 0)}
          style={{
            width: '100%', padding: '9px', borderRadius: 'var(--radius-md)',
            background: `linear-gradient(135deg, ${color}, ${color}bb)`,
            color: 'white', fontSize: 13, fontWeight: 700, border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6,
            boxShadow: `0 4px 12px ${color}44`
          }}
        >
          ▶ Play All Songs
        </button>
      </div>
    </div>
  );
}

/* ─── Individual message bubble ───────────────────────────────────────────── */
function MessageBubble({ msg, onPlay }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '80%', padding: '10px 14px',
          borderRadius: '18px 18px 4px 18px',
          background: 'var(--accent-primary)',
          color: 'white', fontSize: 13, lineHeight: 1.5
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 8, alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'var(--gradient-main)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, marginTop: 2
      }}>🤖</div>

      <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Text bubble */}
        {msg.content && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '4px 18px 18px 18px',
            background: 'var(--bg-secondary)',
            fontSize: 13, lineHeight: 1.7,
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-line'
          }}>
            {msg.content.split('\n').map((line, i) => (
              <div key={i}><RenderText text={line} /></div>
            ))}
          </div>
        )}

        {/* Playlist card */}
        {msg.playlist && (
          <PlaylistMessage playlist={msg.playlist} onPlay={onPlay} />
        )}
      </div>
    </div>
  );
}

/* ─── Typing indicator ────────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--gradient-main)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13
      }}>🤖</div>
      <div style={{
        padding: '10px 16px', background: 'var(--bg-secondary)',
        borderRadius: '4px 18px 18px 18px',
        border: '1px solid var(--border-color)',
        display: 'flex', gap: 5, alignItems: 'center'
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent-primary)',
            animation: `waveform 0.9s ease-in-out ${i * 0.18}s infinite`
          }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main ChatBot component ──────────────────────────────────────────────── */
export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Heyy! Main hoon MoodTune AI 🎵\n\nBato mujhe — aaj kaisa feel kar rahe ho?\n\nMain tumhare mood ke hisaab se perfect playlist bana dunga! Koi bhi baat karo — Hindi mein bhi, English mein bhi 🎶',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const { detectedEmotion, currentSong, API, playSong } = useApp();

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Track unread when closed
  useEffect(() => {
    if (!open && messages.length > 1) {
      setUnread(prev => prev + 1);
    }
  }, [messages]);

  // Clear unread when opened
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = async (text) => {
    const msgText = text || input.trim();
    if (!msgText || loading) return;

    setInput('');
    setShowQuick(false);
    setMessages(prev => [...prev, { role: 'user', content: msgText }]);
    setLoading(true);

    try {
      const resp = await API.post('/music/chatbot', {
        message: msgText,
        history: messages
          .filter(m => m.role !== 'system' && m.content && m.content.trim())
          .map(m => ({ role: m.role, content: m.content })),
        emotion: detectedEmotion || 'unknown',
        current_song: currentSong ? {
          title: currentSong.title,
          artist: currentSong.artist,
          mood: currentSong.mood,
          genre: currentSong.genre,
        } : null
      });

      const data = resp.data;
      const newMsg = {
        role: 'assistant',
        content: data.reply || '',
        playlist: data.type === 'playlist' ? data.playlist : null,
      };
      setMessages(prev => [...prev, newMsg]);
    } catch (err) {
      console.error('ChatBot error:', err?.response?.data || err.message);
      const errMsg = err?.response?.status === 401
        ? 'Login session expire ho gayi. Please refresh the page. 🔄'
        : err?.response?.status === 500
        ? 'Server mein kuch gadbad hai 😅 Thodi der mein try karo.'
        : 'Network issue! Internet connection check karo aur retry karo. 📶';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    }
    setLoading(false);
  };

  const handlePlay = (song, queue, index) => {
    playSong(song, queue, index);
  };

  const handleClear = () => {
    setMessages([{
      role: 'assistant',
      content: 'Chat reset kar diya! 🔄\n\nFir se batao — aaj kaisa feel ho raha hai?',
    }]);
    setShowQuick(true);
  };

  const isMobileChat = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <>
      {/* Floating toggle button */}
      <button
        id="chatbot-toggle-btn"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: isMobileChat ? 140 : 104, right: isMobileChat ? 16 : 24, zIndex: 991,
          width: isMobileChat ? 46 : 52, height: isMobileChat ? 46 : 52, borderRadius: '50%',
          background: 'var(--gradient-main)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isMobileChat ? 18 : 22, boxShadow: '0 8px 32px rgba(124,92,252,0.5)',
          transition: 'all var(--transition)',
          animation: 'glow 3s ease-in-out infinite',
        }}
        title="MoodTune AI Chat"
      >
        {open ? '✕' : '🤖'}
        {/* Unread badge */}
        {!open && unread > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: '#fc5ca0', color: 'white',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-primary)'
          }}>{unread > 9 ? '9+' : unread}</div>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed',
          ...(isMobileChat
            ? { top: 0, left: 0, right: 0, bottom: 0, borderRadius: 0, width: '100%', height: '100%' }
            : { bottom: 168, right: 24, width: 360, height: 520, borderRadius: 'var(--radius-xl)' }
          ),
          zIndex: 991,
          background: 'var(--bg-card)',
          border: isMobileChat ? 'none' : '1px solid var(--border-color)',
          boxShadow: isMobileChat ? 'none' : '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,92,252,0.1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'fadeIn 0.25s ease',
        }}>

          {/* ── Header ── */}
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, rgba(124,92,252,0.15), rgba(92,252,216,0.05))',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'var(--gradient-main)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, boxShadow: '0 4px 12px rgba(124,92,252,0.4)'
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)' }}>MoodTune AI</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5cfcd8', animation: 'pulse 2s infinite' }} />
                Online · Samajhta hoon Hindi & English
              </div>
            </div>
            <button
              onClick={handleClear}
              title="Clear chat"
              style={{
                background: 'transparent', border: '1px solid var(--border-color)',
                borderRadius: 6, padding: '4px 8px', fontSize: 11,
                color: 'var(--text-muted)', cursor: 'pointer'
              }}
            >↺ Reset</button>
          </div>

          {/* ── Messages ── */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px 4px',
            display: 'flex', flexDirection: 'column', gap: 12,
            scrollbarWidth: 'thin'
          }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} onPlay={handlePlay} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* ── Quick mood chips ── */}
          {showQuick && messages.length <= 1 && (
            <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                Quick moods 👇
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {QUICK_MOODS.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(m.text)}
                    style={{
                      padding: '5px 10px', borderRadius: 'var(--radius-full)',
                      fontSize: 11, fontWeight: 500, cursor: 'pointer',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={e => {
                      e.target.style.background = 'rgba(124,92,252,0.15)';
                      e.target.style.borderColor = 'rgba(124,92,252,0.4)';
                      e.target.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={e => {
                      e.target.style.background = 'var(--bg-secondary)';
                      e.target.style.borderColor = 'var(--border-color)';
                      e.target.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Input ── */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex', gap: 8, alignItems: 'flex-end',
            background: 'var(--bg-secondary)'
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Apna mood batao... (Hindi/English/Hinglish)"
              rows={1}
              style={{
                flex: 1, fontSize: 13, padding: '9px 12px',
                borderRadius: 20, resize: 'none', lineHeight: 1.4,
                maxHeight: 80, overflowY: 'auto',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: input.trim() && !loading
                  ? 'var(--gradient-main)' : 'var(--border-color)',
                border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: 'white',
                transition: 'all 0.2s ease',
                boxShadow: input.trim() ? '0 4px 12px rgba(124,92,252,0.4)' : 'none'
              }}
            >
              {loading ? (
                <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : '↑'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
