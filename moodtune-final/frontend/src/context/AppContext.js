/**
 * Global App Context - manages auth, player, theme, toasts
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const API_BASE = process.env.REACT_APP_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api'
);
const API = axios.create({ baseURL: API_BASE });

// Rewrite external URLs through our backend proxy to avoid CORS
const proxyAudioUrl = (url) => {
  if (!url) return url;
  if (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('invidious') ||
    url.includes('yewtu.be') ||
    url.includes('nadeko.net')
  ) {
    return url;
  }
  if (url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    return `${API_BASE}/music/proxy-audio?url=${encodeURIComponent(url)}`;
  }
  return url;
};

// Attach JWT token to every request
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('mt_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export function AppProvider({ children }) {
  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('mt_token'));
  const [authLoading, setAuthLoading] = useState(true);

  // Theme
  const [theme, setTheme] = useState(localStorage.getItem('mt_theme') || 'dark');

  // Player state
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none' | 'queue' | 'one'
  const audioRef = useRef(new Audio());
  const playNextRef = useRef(null); // ref so audio event listeners never have stale closure

  // Toasts
  const [toasts, setToasts] = useState([]);

  // Detected emotion
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  const [detectedWellness, setDetectedWellness] = useState(null);

  // Sidebar mobile toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Theme ----
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mt_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // ---- Auth ----
  useEffect(() => {
    if (token) {
      API.get('/auth/me')
        .then(r => setUser(r.data))
        .catch(() => { localStorage.removeItem('mt_token'); setToken(null); })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const r = await API.post('/auth/login', { email, password });
    localStorage.setItem('mt_token', r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data;
  };

  const googleLogin = async (credential) => {
    const r = await API.post('/auth/google', { credential });
    localStorage.setItem('mt_token', r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data;
  };

  const register = async (name, email, password) => {
    const r = await API.post('/auth/register', { name, email, password });
    return r.data;
  };

  const logout = () => {
    localStorage.removeItem('mt_token');
    setToken(null);
    setUser(null);
    setCurrentSong(null);
    setIsPlaying(false);
  };

  // ---- Audio Player ----
  const audio = audioRef.current;

  // Register audio event listeners once on mount — use refs to avoid stale closures
  useEffect(() => {
    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => { if (playNextRef.current) playNextRef.current(); };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e) => {
      console.warn('Audio error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  // eslint-disable-next-line
  }, []);

  useEffect(() => { audio.volume = volume / 100; }, [volume]);

  const playSong = useCallback(async (song, songQueue = [], index = 0) => {
    setCurrentSong(song);
    setProgress(0);
    setDuration(0);
    if (songQueue.length > 0) { setQueue(songQueue); setQueueIndex(index); }

    let audioUrl = song.preview_url;

    // Only resolve YouTube stream via yt-dlp when the song is a YouTube watch URL
    // or has no audio URL at all. Archive.org / local URLs play directly via proxy.
    const isDirectPlayable = audioUrl && (
      audioUrl.includes('archive.org') ||
      audioUrl.includes('samplesongs.netlify.app') ||
      audioUrl.includes('localhost') ||
      audioUrl.includes('127.0.0.1')
    );
    const isYouTubeWatch = audioUrl && (
      audioUrl.includes('youtube.com/watch') ||
      audioUrl.includes('youtu.be/')
    );
    const needsYtResolution = !isDirectPlayable && (isYouTubeWatch || !audioUrl);

    if (needsYtResolution) {
      try {
        const res = await API.get(`/music/resolve-yt-audio?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}&video_id=${encodeURIComponent(song.spotify_id || '')}`);
        if (res.data && res.data.url) {
          audioUrl = res.data.url;
          if (res.data.thumbnail) {
            song.cover_url = res.data.thumbnail;
            setCurrentSong(prev => prev ? { ...prev, cover_url: res.data.thumbnail } : { ...song, cover_url: res.data.thumbnail });
          }
        }
      } catch (err) {
        console.warn('Failed to resolve YT audio:', err);
        // Fall back to the original preview_url if yt-dlp resolution failed
        if (song.preview_url) audioUrl = song.preview_url;
      }
    }

    if (audioUrl) {
      audio.pause();
      // Proxy external URLs to avoid CORS
      audio.src = proxyAudioUrl(audioUrl);
      audio.load();
      audio.play().catch((err) => {
        console.warn('Playback failed:', err);
        setToasts(prev => {
          const id = Date.now();
          setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
          return [...prev, { id, message: `Cannot play "${song.title}" – try again or check your connection.`, type: 'error' }];
        });
      });
    } else {
      // No preview URL available
      setToasts(prev => {
        const id = Date.now();
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
        return [...prev, { id, message: `No audio preview available for "${song.title}"`, type: 'info' }];
      });
    }
    // Record history
    if (token) {
      API.post('/music/history', {
        song,
        emotion: detectedEmotion || 'neutral',
        stress: detectedWellness?.stress || 0,
        anxiety: detectedWellness?.anxiety || 0,
        fatigue: detectedWellness?.fatigue || 0
      }).catch(() => {});
    }
  }, [token, detectedEmotion, detectedWellness]);

  const togglePlay = useCallback(() => {
    if (!currentSong) return;
    if (audio.src && !audio.paused) {
      audio.pause();
    } else if (audio.src) {
      audio.play().catch((err) => {
        console.warn('Playback failed:', err);
      });
    }
  }, [currentSong]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    if (repeatMode === 'one' && currentSong) {
      playSong(currentSong, queue, queueIndex);
      return;
    }
    let nextIdx;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = (queueIndex + 1) % queue.length;
    }
    setQueueIndex(nextIdx);
    playSong(queue[nextIdx], queue, nextIdx);
  }, [queue, queueIndex, shuffle, repeatMode, currentSong, playSong]);

  // Keep ref in sync so the audio 'ended' listener always calls the latest version
  useEffect(() => { playNextRef.current = playNext; }, [playNext]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    let prevIdx;
    if (shuffle) {
      prevIdx = Math.floor(Math.random() * queue.length);
    } else {
      prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    }
    setQueueIndex(prevIdx);
    playSong(queue[prevIdx], queue, prevIdx);
  }, [queue, queueIndex, shuffle, playSong]);

  const seekTo = useCallback((pct) => {
    if (audio.duration) {
      audio.currentTime = (pct / 100) * audio.duration;
      setProgress(audio.currentTime);
    }
  }, []);

  // ---- Toasts ----
  const toast = useCallback((message, type = 'info') => {
    let msgStr = '';
    if (message && typeof message === 'object') {
      msgStr = message.message || message.error || JSON.stringify(message);
    } else {
      msgStr = String(message || '');
    }
    const id = Date.now();
    setToasts(prev => [...prev, { id, message: msgStr, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ---- Favorites ----
  const toggleFavorite = useCallback(async (song) => {
    if (!user) { toast('Please login to favorite songs', 'error'); return; }
    try {
      await API.post('/music/favorites', { song });
      toast(`Added "${song.title}" to favorites`, 'success');
    } catch (e) {
      toast('Could not update favorites', 'error');
    }
  }, [user]);

  const value = {
    user, token, authLoading, login, googleLogin, register, logout,
    theme, toggleTheme,
    currentSong, isPlaying, volume, progress, duration, queue, queueIndex,
    shuffle, setShuffle, repeatMode, setRepeatMode,
    playSong, togglePlay, playNext, playPrev, seekTo, setVolume,
    detectedEmotion, setDetectedEmotion,
    detectedWellness, setDetectedWellness,
    toasts, toast,
    sidebarOpen, setSidebarOpen,
    toggleFavorite,
    API
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
