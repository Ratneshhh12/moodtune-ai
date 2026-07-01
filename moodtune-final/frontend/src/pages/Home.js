import React from 'react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  { icon:'📷', title:'Real-Time Face Detection', desc:'AI detects your emotions instantly via webcam using advanced neural networks' },
  { icon:'🎵', title:'Mood-Matched Music', desc:'Get instant music recommendations perfectly tuned to your emotional state' },
  { icon:'✨', title:'Personalized Learning', desc:'Adapts to your taste over time for ever-improving recommendations' },
  { icon:'🎧', title:'Full Music Player', desc:'Play, queue, favorite and organize your music library with ease' },
];

const EMOTIONS = [
  { emoji:'😄', mood:'Happy', genre:'Pop & Dance', color:'#fcb85c' },
  { emoji:'😢', mood:'Sad', genre:'Lo-fi & Acoustic', color:'#5c8cfc' },
  { emoji:'😠', mood:'Angry', genre:'Calm & Relaxing', color:'#fc5ca0' },
  { emoji:'😐', mood:'Neutral', genre:'Trending', color:'#9090a8' },
  { emoji:'😲', mood:'Excited', genre:'Party & EDM', color:'#5cfcd8' },
  { emoji:'😨', mood:'Fearful', genre:'Meditation', color:'#7c5cfc' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight:'100vh', overflowX:'hidden' }}>
      {/* Hero */}
      <section style={{
        minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'80px 24px', textAlign:'center', position:'relative', overflow:'hidden'
      }}>
        {/* Background orbs */}
        <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
          {[
            { w:600, h:600, x:'10%', y:'10%', c:'rgba(124,92,252,0.15)' },
            { w:400, h:400, x:'70%', y:'60%', c:'rgba(92,140,252,0.12)' },
            { w:300, h:300, x:'50%', y:'20%', c:'rgba(92,252,216,0.08)' },
          ].map((o, i) => (
            <div key={i} style={{
              position:'absolute', width:o.w, height:o.h,
              left:o.x, top:o.y, borderRadius:'50%',
              background:o.c, filter:'blur(80px)',
              animation:`float ${4+i}s ease-in-out ${i*0.5}s infinite`
            }} />
          ))}
        </div>

        {/* Nav */}
        <nav style={{
          position:'fixed', top:0, left:0, right:0,
          padding:'20px 40px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'rgba(10,10,15,0.8)', backdropFilter:'blur(20px)',
          borderBottom:'1px solid var(--border-color)',
          zIndex:100
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, fontFamily:'var(--font-display)' }}>
            <div style={{ fontSize:24 }}>🎵</div>
            <span style={{ fontSize:20, fontWeight:700, background:'var(--gradient-main)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              MoodTune AI
            </span>
          </div>
          <div style={{ display:'flex', gap:12 }}>
            <button className="btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
            <button className="btn-primary" onClick={() => navigate('/register')}>Get Started</button>
          </div>
        </nav>

        <div className="animate-fade" style={{ position:'relative', zIndex:1, maxWidth:800 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'8px 20px', borderRadius:'var(--radius-full)',
            background:'rgba(124,92,252,0.15)', border:'1px solid rgba(124,92,252,0.3)',
            fontSize:13, color:'var(--accent-primary)', marginBottom:28,
            fontFamily:'var(--font-display)', letterSpacing:'0.04em'
          }}>
            ✦ AI-Powered Music Recommendation
          </div>

          <h1 style={{ fontSize:'clamp(42px, 8vw, 80px)', fontWeight:800, lineHeight:1.05, marginBottom:24, letterSpacing:'-0.03em' }}>
            Music that Feels{' '}
            <span style={{ background:'var(--gradient-main)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', display:'inline-block', animation:'gradientShift 3s ease infinite', backgroundSize:'200% 200%' }}>
              Like You
            </span>
          </h1>

          <p style={{ fontSize:'clamp(17px, 2.5vw, 20px)', color:'var(--text-secondary)', lineHeight:1.7, marginBottom:40, maxWidth:600, margin:'0 auto 40px' }}>
            MoodTune AI reads your face, understands your emotions, and curates the perfect soundtrack for every moment of your life.
          </p>

          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/register')} style={{ fontSize:17, padding:'15px 36px' }}>
              🎵 Start Free
            </button>
            <button className="btn-ghost" onClick={() => navigate('/mood')} style={{ fontSize:17, padding:'14px 36px' }}>
              📷 Try Demo
            </button>
          </div>

          {/* Stats */}
          <div style={{ display:'flex', gap:40, justifyContent:'center', marginTop:60, flexWrap:'wrap' }}>
            {[['7+','Emotions Detected'],['1M+','Songs Available'],['99%','Accuracy']].map(([n,l]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:28, fontWeight:800, fontFamily:'var(--font-display)', background:'var(--gradient-main)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{n}</div>
                <div style={{ fontSize:13, color:'var(--text-muted)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mood mapping section */}
      <section style={{ padding:'80px 24px', background:'var(--bg-secondary)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontSize:36, fontWeight:700, marginBottom:12 }}>Emotion → Music Mapping</h2>
          <p style={{ color:'var(--text-secondary)', marginBottom:48 }}>Every emotion gets its perfect soundtrack</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:16 }}>
            {EMOTIONS.map(e => (
              <div key={e.mood} style={{
                background:'var(--bg-card)',
                border:`1px solid ${e.color}30`,
                borderRadius:'var(--radius-lg)',
                padding:'24px 16px',
                textAlign:'center',
                transition:'all var(--transition)',
                cursor:'default'
              }}
              onMouseEnter={el => { el.currentTarget.style.borderColor = e.color; el.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={el => { el.currentTarget.style.borderColor = `${e.color}30`; el.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ fontSize:36, marginBottom:10 }}>{e.emoji}</div>
                <div style={{ fontSize:14, fontWeight:600, color:e.color, fontFamily:'var(--font-display)', marginBottom:4 }}>{e.mood}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{e.genre}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding:'80px 24px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <h2 style={{ fontSize:36, fontWeight:700, textAlign:'center', marginBottom:12 }}>Everything you need</h2>
          <p style={{ color:'var(--text-secondary)', textAlign:'center', marginBottom:48 }}>Powerful features, beautifully simple</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:24 }}>
            {FEATURES.map((f,i) => (
              <div key={i} style={{
                background:'var(--bg-card)', border:'1px solid var(--border-color)',
                borderRadius:'var(--radius-xl)', padding:28,
                transition:'all var(--transition)',
              }}
              onMouseEnter={el => { el.currentTarget.style.borderColor='var(--accent-primary)'; el.currentTarget.style.transform='translateY(-6px)'; }}
              onMouseLeave={el => { el.currentTarget.style.borderColor='var(--border-color)'; el.currentTarget.style.transform='none'; }}
              >
                <div style={{ fontSize:36, marginBottom:16 }}>{f.icon}</div>
                <h3 style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>{f.title}</h3>
                <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'80px 24px', textAlign:'center', background:'var(--bg-secondary)' }}>
        <h2 style={{ fontSize:40, fontWeight:800, marginBottom:16 }}>
          Ready to tune into your <span className="gradient-text">mood?</span>
        </h2>
        <p style={{ color:'var(--text-secondary)', fontSize:18, marginBottom:36 }}>Join thousands of music lovers</p>
        <button className="btn-primary" onClick={() => navigate('/register')} style={{ fontSize:18, padding:'16px 48px' }}>
          🚀 Get Started — It's Free
        </button>
      </section>
    </div>
  );
}
