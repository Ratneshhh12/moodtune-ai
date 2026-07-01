import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import MusicPlayer from './components/player/MusicPlayer';
import ChatBot from './components/common/ChatBot';
import ToastContainer from './components/common/Toast';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import MoodPage from './pages/MoodPage';
import Recommendations from './pages/Recommendations';
import Search from './pages/Search';
import Playlists from './pages/Playlists';
import Favorites from './pages/Favorites';
import History from './pages/History';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import MoodInsights from './pages/MoodInsights';
import AIPlaylistCreator from './pages/AIPlaylistCreator';
import LyricsPage from './pages/LyricsPage';
import FriendsPage from './pages/FriendsPage';
import EmbeddingSpace from './pages/EmbeddingSpace';
import StreaksPage from './pages/StreaksPage';
import ReflectionHub from './pages/ReflectionHub';
import CirclePage from './pages/CirclePage';

function ProtectedRoute({ children }) {
  const { user, authLoading } = useApp();
  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, animation: 'spin 1s linear infinite' }}>🎵</div>
      <p style={{ color: 'var(--text-muted)' }}>Loading MoodTune...</p>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

/* Mobile Bottom Navigation */
const MOBILE_NAV_ITEMS = [
  { path: '/dashboard', icon: '⬡', label: 'Home' },
  { path: '/search', icon: '🔍', label: 'Search' },
  { path: '/mood', icon: '🧠', label: 'Insights' },
  { path: '/circle', icon: '🌌', label: 'Orbit' },
  { path: '/profile', icon: '👤', label: 'Profile' },
];

function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav">
      {MOBILE_NAV_ITEMS.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function AppLayout({ children }) {
  const { setSidebarOpen } = useApp();
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Mobile header */}
        <div className="mobile-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', alignItems: 'center', gap: 12, position: 'sticky', top: 0, background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)', zIndex: 50 }}
          id="mobile-header">
          <button className="btn-icon" onClick={() => setSidebarOpen(true)}>☰</button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>MoodTune AI</span>
        </div>
        {children}
      </main>
      <MusicPlayer />
      <MobileBottomNav />
      <ChatBot />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify/:token" element={<VerifyEmail />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/mood" element={<ProtectedRoute><AppLayout><MoodPage /></AppLayout></ProtectedRoute>} />
      <Route path="/recommendations" element={<ProtectedRoute><AppLayout><Recommendations /></AppLayout></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><AppLayout><Search /></AppLayout></ProtectedRoute>} />
      <Route path="/playlists" element={<ProtectedRoute><AppLayout><Playlists /></AppLayout></ProtectedRoute>} />
      <Route path="/favorites" element={<ProtectedRoute><AppLayout><Favorites /></AppLayout></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><AppLayout><History /></AppLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
      <Route path="/insights" element={<Navigate to="/mood" replace />} />
      <Route path="/ai-creator" element={<Navigate to="/playlists" replace />} />
      <Route path="/lyrics" element={<Navigate to="/favorites" replace />} />
      <Route path="/friends" element={<Navigate to="/circle" replace />} />
      <Route path="/circle" element={<ProtectedRoute><AppLayout><CirclePage /></AppLayout></ProtectedRoute>} />
      <Route path="/reflection-hub" element={<Navigate to="/mood" replace />} />
      <Route path="/embedding-space" element={<Navigate to="/dashboard" replace />} />
      <Route path="/streaks" element={<ProtectedRoute><AppLayout><StreaksPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AppLayout><AdminPanel /></AppLayout></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}
