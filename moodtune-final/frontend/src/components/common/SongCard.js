import React from 'react';
import { useApp } from '../../context/AppContext';

export default function SongCard({ song, queue = [], index = 0, compact = false }) {
  const { currentSong, isPlaying, playSong, toggleFavorite } = useApp();
  const isActive = currentSong?.spotify_id === song.spotify_id || currentSong?.title === song.title;

  const formatDuration = s => {
    if (!s) return '';
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };

  if (compact) {
    return (
      <div
        className={`song-card ${isActive ? 'playing' : ''}`}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px' }}
        onClick={() => playSong(song, queue, index)}
      >
        <div style={{ position:'relative', flexShrink:0 }}>
          <img
            src={song.cover_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${song.title}`}
            alt=""
            style={{ width:44, height:44, borderRadius:8, objectFit:'cover' }}
            onError={e => { e.target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${song.title}`; }}
          />
          {isActive && isPlaying && (
            <div style={{ position:'absolute',inset:0,borderRadius:8,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <div className="waveform" style={{ height:14 }}>{[1,2,3,4,5].map(i => <span key={i} />)}</div>
            </div>
          )}
        </div>
        <div style={{ flex:1, overflow:'hidden' }}>
          <div style={{ fontSize:14, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{song.title}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{song.artist}</div>
        </div>
        <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>{formatDuration(song.duration)}</span>
        <button className="btn-icon" style={{ width:32,height:32,flexShrink:0 }} onClick={e => { e.stopPropagation(); toggleFavorite(song); }}>♡</button>
      </div>
    );
  }

  return (
    <div
      className={`song-card ${isActive ? 'playing' : ''}`}
      onClick={() => playSong(song, queue, index)}
    >
      <div style={{ position:'relative', marginBottom:10 }}>
        <img
          src={song.cover_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${song.title}`}
          alt=""
          style={{ width:'100%', aspectRatio:'1', borderRadius:12, objectFit:'cover', display:'block' }}
          onError={e => { e.target.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${song.title}`; }}
        />
        {/* Play overlay */}
        <div style={{
          position:'absolute', inset:0, borderRadius:12,
          background:'rgba(0,0,0,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          opacity: isActive ? 1 : 0,
          transition:'opacity var(--transition)'
        }}>
          {isActive && isPlaying
            ? <div className="waveform">{[1,2,3,4,5].map(i => <span key={i} />)}</div>
            : <div style={{ width:40,height:40,borderRadius:'50%',background:'var(--accent-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16 }}>▶</div>
          }
        </div>
        {/* Mood tag */}
        <div style={{
          position:'absolute', top:8, left:8,
          background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)',
          border:'1px solid var(--border-color)',
          padding:'3px 8px', borderRadius:'var(--radius-full)',
          fontSize:11, color:'var(--text-secondary)'
        }}>{song.mood || song.genre}</div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ overflow:'hidden', flex:1 }}>
          <div style={{ fontSize:13, fontWeight:500, color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{song.title}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{song.artist}</div>
        </div>
        <button className="btn-icon" style={{ width:28,height:28,flexShrink:0,marginLeft:6 }} onClick={e => { e.stopPropagation(); toggleFavorite(song); }}>♡</button>
      </div>
    </div>
  );
}
