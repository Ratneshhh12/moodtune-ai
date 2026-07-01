import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import SongCard from '../components/common/SongCard';

export default function Search() {
  const { API, toast } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true); setSearched(true);
    try {
      const r = await API.get(`/music/search?q=${encodeURIComponent(q)}`);
      setResults(r.data.results || []);
    } catch { toast('Search failed', 'error'); }
    setLoading(false);
  }, [API, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <div className="page-content animate-fade">
      <h1 style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>◯ Search</h1>
      <p style={{ color:'var(--text-secondary)', marginBottom:28 }}>Find any song or artist</p>

      <div style={{ position:'relative', maxWidth:560, marginBottom:40 }}>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search(query)}
          placeholder="Search songs, artists, albums..."
          style={{ paddingLeft:48, paddingRight:100, height:54, fontSize:16, borderRadius:27 }}
        />
        <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', fontSize:20 }}>🔍</span>
        <button className="btn-primary" onClick={() => search(query)}
          style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', padding:'8px 18px', borderRadius:20, fontSize:14 }}>
          Search
        </button>
      </div>

      {loading && <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height:70 }} />)}
      </div>}

      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🎵</div>
          <p>No results found for "{query}"</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:16 }}>{results.length} results for "{query}"</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {results.map((s,i) => <SongCard key={i} song={s} queue={results} index={i} compact />)}
          </div>
        </div>
      )}
    </div>
  );
}
