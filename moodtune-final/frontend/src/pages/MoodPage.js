import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FaceDetector from '../components/mood/FaceDetector';
import SongCard from '../components/common/SongCard';
import BreathingGuide from '../components/mood/BreathingGuide';
import { useApp } from '../context/AppContext';
import { IoJournal, IoSparkles, IoCalendar } from 'react-icons/io5';

import BarChart from '../components/insights/BarChart';
import DonutChart from '../components/insights/DonutChart';
import ScoreGauge from '../components/insights/ScoreGauge';
import EmotionHeatmap from '../components/insights/EmotionHeatmap';
import { DAYS, MONTHS, EMOTION_COLORS, EMOTION_EMOJI } from '../components/insights/constants';

const MOOD_CONFIG = {
  happy:    { emoji:'😄', color:'#fcb85c', genre:'Pop & Dance',       bg:'rgba(252,184,92,0.08)' },
  sad:      { emoji:'😢', color:'#5c8cfc', genre:'Lo-fi & Acoustic',  bg:'rgba(92,140,252,0.08)' },
  angry:    { emoji:'😠', color:'#fc5ca0', genre:'Calm & Relaxing',   bg:'rgba(252,92,160,0.08)' },
  neutral:  { emoji:'😐', color:'#9090a8', genre:'Trending Hits',     bg:'rgba(144,144,168,0.08)' },
  surprised:{ emoji:'😲', color:'#5cfcd8', genre:'Party & EDM',       bg:'rgba(92,252,216,0.08)' },
  fearful:  { emoji:'😨', color:'#7c5cfc', genre:'Meditation',        bg:'rgba(124,92,252,0.08)' },
  disgusted:{ emoji:'🤢', color:'#5cfcd8', genre:'Jazz & Soul',       bg:'rgba(92,252,216,0.08)' },
};

const MEDITATION_SONGS = [
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
    title: 'Zen Meditation Flute',
    artist: 'Buddhism Relaxation Music',
    cover_url: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=150',
    preview_url: '',
    spotify_id: 'meditation_zen_flute',
    genre: 'Meditation',
    mood: 'neutral'
  },
  {
    title: 'Deep Sleep Delta Waves',
    artist: 'Lofi Sleep Sounds',
    cover_url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=150',
    preview_url: '',
    spotify_id: 'meditation_deep_sleep',
    genre: 'Sleep',
    mood: 'neutral'
  },
  {
    title: 'Reiki Chakra Healing',
    artist: 'Spiritual Healing Music',
    cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150',
    preview_url: '',
    spotify_id: 'meditation_reiki_healing',
    genre: 'Meditation',
    mood: 'fearful'
  },
  {
    title: '528 Hz Miracle Tone',
    artist: 'Solfeggio Frequencies',
    cover_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=150',
    preview_url: '',
    spotify_id: 'meditation_528hz',
    genre: 'Healing',
    mood: 'neutral'
  },
  {
    title: 'Yoga Nidra Sleep',
    artist: 'Mindfulness Meditation',
    cover_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=150',
    preview_url: '',
    spotify_id: 'meditation_yoga_nidra',
    genre: 'Yoga',
    mood: 'neutral'
  },
];

const NATURE_SOUNDS = [
  {
    title: 'Heavy Rain & Thunderstorm',
    artist: 'Rain Sounds Ambient',
    cover_url: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=150',
    preview_url: '',
    spotify_id: 'nature_rain_sounds',
    genre: 'Nature',
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
  },
  {
    title: 'Forest Birds Chirping',
    artist: 'Natural Sounds Relax',
    cover_url: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=150',
    preview_url: '',
    spotify_id: 'nature_birds_chirping',
    genre: 'Nature',
    mood: 'happy'
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
    title: 'Mountain Stream & Wind',
    artist: 'Nature White Noise',
    cover_url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=150',
    preview_url: '',
    spotify_id: 'nature_mountain_stream',
    genre: 'Nature',
    mood: 'neutral'
  },
  {
    title: 'Night Crickets & Owls',
    artist: 'Night Sounds Relaxation',
    cover_url: 'https://images.unsplash.com/photo-1518655048521-f130df041f66?w=150',
    preview_url: '',
    spotify_id: 'nature_night_sounds',
    genre: 'Nature',
    mood: 'neutral'
  },
];

/* ─────────────────────────────────────────────
   SHARED ANALYTICS COMPONENTS
   ───────────────────────────────────────────── */
function SectionCard({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      boxShadow: 'var(--shadow-card)',
      ...style
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, subtitle, right }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ fontSize:18 }}>{icon}</span>
          <h2 style={{ fontSize:16, fontWeight:850, fontFamily:'var(--font-display)', color:'var(--text-primary)' }}>{title}</h2>
        </div>
        {subtitle && <p style={{ color:'var(--text-secondary)', fontSize:12, paddingLeft:26 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function StatPill({ label, value, color, icon }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'12px 14px', borderRadius:'var(--radius-md)',
      background:`${color}08`, border:`1px solid ${color}18`,
      minWidth:80, textAlign:'center', gap:4, flex:1
    }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <div style={{ fontSize:16, fontWeight:900, color, fontFamily:'var(--font-display)', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:500 }}>{label}</div>
    </div>
  );
}

function MetricCircle({ value, label, icon, color, colorHigh }) {
  const isHigh = value > 60;
  const displayColor = isHigh ? colorHigh : color;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const levelText = value > 75 ? 'High' : value > 40 ? 'Moderate' : 'Low';

  return (
    <div style={{ textAlign:'center', flex:1 }}>
      <div style={{ position:'relative', width:74, height:74, margin:'0 auto 6px' }}>
        <svg width={74} height={74} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={37} cy={37} r={radius} fill="none" stroke="var(--bg-secondary)" strokeWidth={4} />
          <circle
            cx={37}
            cy={37}
            r={radius}
            fill="none"
            stroke={displayColor}
            strokeWidth={4}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition:'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease', filter: isHigh ? `drop-shadow(0 0 4px ${displayColor})` : 'none' }}
          />
        </svg>
        <div style={{
          position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center'
        }}>
          <span style={{ fontSize:12 }}>{icon}</span>
          <span style={{ fontSize:12, fontWeight:800, color:displayColor, lineHeight:1 }}>{value}%</span>
        </div>
      </div>
      <div style={{ fontSize:11, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{label}</div>
      <div style={{
        fontSize:10, padding:'1px 6px', borderRadius:'var(--radius-full)',
        background: isHigh ? `${colorHigh}12` : 'rgba(255,255,255,0.04)',
        color: isHigh ? colorHigh : 'var(--text-muted)',
        border: `1px solid ${isHigh ? colorHigh + '25' : 'transparent'}`,
        display:'inline-block'
      }}>{levelText}</div>
    </div>
  );
}

function getWellnessTip(metrics) {
  if (!metrics) return null;
  const { stress, anxiety, fatigue } = metrics;
  if (stress > 70) return { icon:'⚡', text:'Your stress is high. Try guided breathing to restore calm.', color:'#fc5ca0' };
  if (anxiety > 70) return { icon:'💭', text:'Anxiety detected. Nature sounds can ground you.', color:'#7c5cfc' };
  if (fatigue > 70) return { icon:'😴', text:'You seem fatigued. Try delta wave meditation tracks.', color:'#5c8cfc' };
  if (stress > 40 || anxiety > 40) return { icon:'🌿', text:'Mild tension detected. A breathing cycle will help reset.', color:'#5cfcd8' };
  return { icon:'✨', text:'Your wellness looks balanced! Keep up the great vibe.', color:'#fcb85c' };
}

/* ─────────────────────────────────────────────
   INSIGHTS SUB-SECTIONS
   ───────────────────────────────────────────── */
function TodayMoodSection({ todayMood }) {
  const color = EMOTION_COLORS[todayMood.emotion] || '#9090a8';
  const level = v => v > 60 ? 'High' : v > 35 ? 'Moderate' : 'Low';
  const levelColor = v => v > 60 ? '#fc5ca0' : v > 35 ? '#fcb85c' : '#5cfcd8';

  return (
    <SectionCard style={{ background:`linear-gradient(135deg, ${color}08, var(--bg-card) 60%)`, border:`1px solid ${color}22` }}>
      <SectionTitle icon="🌅" title="Today's Mood Summary" subtitle={`Last scanned at ${todayMood.lastScan || 'N/A'}`}
        right={
          <div style={{
            padding:'4px 10px', borderRadius:'var(--radius-full)',
            background:`${color}12`, border:`1px solid ${color}25`,
            fontSize:11, color, fontWeight:700
          }}>
            {EMOTION_EMOJI[todayMood.emotion]} Live Data
          </div>
        }
      />

      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:24, alignItems:'center', marginBottom:18 }}>
        <div style={{ textAlign:'center', paddingRight:8 }}>
          <div style={{ fontSize:56, lineHeight:1, filter:`drop-shadow(0 0 16px ${color}66)`, marginBottom:6 }}>
            {EMOTION_EMOJI[todayMood.emotion] || '😐'}
          </div>
          <div style={{ fontSize:18, fontWeight:900, color, fontFamily:'var(--font-display)' }}>
            {(todayMood.emotion || 'Neutral').charAt(0).toUpperCase() + (todayMood.emotion || 'Neutral').slice(1)}
          </div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{todayMood.confidence || 0}% confidence</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8 }}>
          {[
            { label:'Happiness', value:`${todayMood.happinessScore || 0}%`, icon:'😊', color:'#fcb85c' },
            { label:'Stress Index', value:`${todayMood.stressIndex || 0}%`, icon:'⚡', color: levelColor(todayMood.stressIndex || 0) },
            { label:'Songs Today', value:todayMood.songsToday || 0, icon:'🎵', color:'#7c5cfc' },
            { label:'Mins Listened', value:`${todayMood.minutesToday || 0}m`, icon:'⏱', color:'#5cfcd8' },
          ].map((s, i) => <StatPill key={i} {...s} />)}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, borderTop:'1px solid var(--border-color)', paddingTop:16 }}>
        {[
          { label:'Stress', value:todayMood.stress || 0, color:'#fc5ca0' },
          { label:'Anxiety', value:todayMood.anxiety || 0, color:'#7c5cfc' },
          { label:'Fatigue', value:todayMood.fatigue || 0, color:'#5c8cfc' },
        ].map((m, i) => (
          <div key={i} style={{ padding:'8px 10px', background:'rgba(0,0,0,0.15)', borderRadius:'var(--radius-md)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
              <span style={{ color:'var(--text-secondary)' }}>{m.label}</span>
              <span style={{ color: m.value > 60 ? '#fc5ca0' : 'var(--text-primary)', fontWeight:700 }}>
                {m.value}%
              </span>
            </div>
            <div style={{ height:4, background:'var(--bg-secondary)', borderRadius:2, overflow:'hidden' }}>
              <div style={{
                height:'100%', width:`${m.value}%`,
                background:`linear-gradient(90deg, ${m.color}88, ${m.color})`,
                borderRadius:2, transition:'width 0.8s ease'
              }} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function MoodTimelineSection({ timelineEvents }) {
  return (
    <SectionCard>
      <SectionTitle icon="⏳" title="Today's Mood Timeline" subtitle="Timeline of scanned emotions" />
      <div style={{ position:'relative', maxHeight:250, overflowY:'auto', paddingRight:6, scrollbarWidth:'thin' }}>
        <div style={{
          position:'absolute', left:35, top:10, bottom:10, width:2,
          background:'linear-gradient(180deg, var(--accent-primary), rgba(124,92,252,0.1))'
        }} />

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {timelineEvents.map((ev, i) => {
            const c = EMOTION_COLORS[ev.emotion] || '#9090a8';
            return (
              <div key={i} style={{ display:'flex', gap:0, alignItems:'flex-start', position:'relative' }}>
                <div style={{ width:28, fontSize:9, color:'var(--text-muted)', paddingTop:10, textAlign:'right', paddingRight:6 }}>
                  {ev.time.split(' ')[0]}
                </div>
                <div style={{
                  width:12, height:12, borderRadius:'50%',
                  background:c, border:`2px solid var(--bg-card)`,
                  boxShadow:`0 0 8px ${c}88`,
                  marginTop:10, zIndex:1, position:'relative'
                }} />
                <div style={{
                  flex:1, marginLeft:12, padding:'10px 12px',
                  background:`${c}08`, border:`1px solid ${c}18`,
                  borderRadius:'var(--radius-md)'
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:14 }}>{EMOTION_EMOJI[ev.emotion] || '😐'}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:c }}>
                      {ev.emotion.charAt(0).toUpperCase() + ev.emotion.slice(1)}
                    </span>
                  </div>
                  <p style={{ fontSize:11, color:'var(--text-secondary)', lineHeight:1.4 }}>{ev.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function WeeklyReportSection({ weekData }) {
  const avgHappiness = weekData.length > 0 ? Math.round(weekData.reduce((s,d) => s+d.happiness,0) / weekData.length) : 0;
  const totalSongs   = weekData.reduce((s,d) => s+d.songs, 0);
  const peakDay      = weekData.length > 0 ? weekData.reduce((a,b) => a.happiness > b.happiness ? a : b) : { day: 'N/A', happiness: 0 };

  return (
    <SectionCard>
      <SectionTitle icon="📅" title="Weekly Report"
        right={
          <div style={{ display:'flex', gap:4 }}>
            {[
              { label:'Avg Happiness', val:`${avgHappiness}%`, color:'#fcb85c' },
              { label:'Best Day', val:peakDay.day, color:'#5cfcd8' },
            ].map((s,i) => (
              <div key={i} style={{
                padding:'4px 8px', borderRadius:'var(--radius-sm)', textAlign:'center',
                background:`${s.color}08`, border:`1px solid ${s.color}18`
              }}>
                <div style={{ fontSize:12, fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:9, color:'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        }
      />
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', gap:10, marginBottom:8, fontSize:11, color:'var(--text-muted)' }}>
          <span>— <span style={{ color:'#fcb85c' }}>■</span> Happiness</span>
          <span>— <span style={{ color:'#fc5ca0' }}>■</span> Stress</span>
        </div>
        <BarChart data={weekData} valueKey="happiness" secondKey="stress" color="#fcb85c" height={130} />
      </div>
    </SectionCard>
  );
}

function MonthlyReportSection({ monthData }) {
  const totalSongs = monthData.reduce((s,d) => s+d.songs, 0);
  const avgH = monthData.length > 0 ? Math.round(monthData.reduce((s,d) => s+d.happiness,0)/monthData.length) : 0;

  return (
    <SectionCard>
      <SectionTitle icon="📊" title="Monthly Performance"
        right={
          <div style={{ display:'flex', gap:6 }}>
            <div style={{ padding:'4px 8px', borderRadius:'var(--radius-sm)', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border-color)', fontSize:11 }}>
              Songs: <strong style={{ color:'#7c5cfc' }}>{totalSongs}</strong> · Avg: <strong style={{ color:'#fcb85c' }}>{avgH}%</strong>
            </div>
          </div>
        }
      />
      <BarChart data={monthData} valueKey="happiness" color="#7c5cfc" height={130} labelKey="week" />
    </SectionCard>
  );
}

function ListeningBehaviourSection({ genres, weekData }) {
  const totalMins = weekData.reduce((s,d) => s + d.minutesListened, 0);
  const peakHour = '8 PM';

  return (
    <SectionCard>
      <SectionTitle icon="🎧" title="Listening Behavior" />
      <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:20, alignItems:'center' }}>
        <div style={{ position:'relative', display:'inline-block', width:120, height:120 }}>
          <DonutChart slices={genres.map(g => ({ value:g.pct, color:g.color }))} size={120} thickness={24} />
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontSize:18, fontWeight:900, color:'var(--text-primary)', fontFamily:'var(--font-display)' }}>{totalMins}m</div>
            <div style={{ fontSize:9, color:'var(--text-muted)' }}>this week</div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {genres.slice(0, 4).map((g, i) => (
            <div key={i}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span>{g.icon}</span>
                  <span style={{ color:'var(--text-primary)' }}>{g.genre}</span>
                </span>
                <span style={{ fontWeight:700, color:g.color }}>{g.pct}%</span>
              </div>
              <div style={{ height:4, background:'var(--bg-secondary)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${g.pct}%`, background:g.color, borderRadius:2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function MLEngineSection({ modelStatus, handleRetrain, retraining }) {
  if (!modelStatus) return null;

  const { status, stats = {}, learned_preferences = {} } = modelStatus;
  const { total_plays = 0, unique_songs_interacted = 0 } = stats;
  const { top_genres = [], top_moods = [] } = learned_preferences;

  let maxWeight = 0.001;
  const findMax = arr => {
    arr.forEach(([_, val]) => {
      if (Math.abs(val) > maxWeight) maxWeight = Math.abs(val);
    });
  };
  if (status === 'active') {
    findMax(top_genres);
    findMax(top_moods);
  }

  const renderPrefBar = (title, items, icon) => (
    <div style={{ flex:1, padding:'12px', background:'rgba(0,0,0,0.15)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-color)' }}>
      <h4 style={{ fontSize:12, fontWeight:700, marginBottom:8, borderBottom:'1px solid var(--border-color)', paddingBottom:4 }}>
        {icon} {title}
      </h4>
      {items.length === 0 ? (
        <p style={{ fontSize:10, color:'var(--text-muted)' }}>Warm up in progress...</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {items.slice(0, 3).map(([name, val]) => {
            const isPositive = val >= 0;
            const barColor = isPositive ? '#5cfcd8' : '#fc5ca0';
            const percent = Math.min(100, Math.round((Math.abs(val) / maxWeight) * 100));
            return (
              <div key={name}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                  <span>{name}</span>
                  <span style={{ fontWeight:700, color:barColor }}>{isPositive ? '+' : ''}{val.toFixed(1)}</span>
                </div>
                <div style={{ height:4, background:'var(--bg-secondary)', borderRadius:2 }}>
                  <div style={{ height:'100%', width:`${percent}%`, background:barColor, borderRadius:2 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <SectionCard>
      <SectionTitle icon="🧠" title="AI Preference Engine"
        right={
          <button onClick={handleRetrain} disabled={retraining || status === 'cold_start'}
            className="btn-ghost" style={{ padding:'4px 10px', fontSize:11, borderRadius:'var(--radius-sm)' }}>
            {retraining ? '⚡ Training...' : '🔄 Retrain'}
          </button>
        }
      />
      {status === 'cold_start' ? (
        <div style={{ background:'rgba(0,0,0,0.2)', padding:12, borderRadius:'var(--radius-md)', fontSize:11, textAlign:'center' }}>
          Pipeline warming up ({unique_songs_interacted}/3 plays).
        </div>
      ) : (
        <div style={{ display:'flex', gap:8, flexDirection:'row', flexWrap:'wrap' }}>
          {renderPrefBar('Favorite Genres', top_genres, '🎉')}
          {renderPrefBar('Loves: Moods', top_moods, '🎭')}
        </div>
      )}
    </SectionCard>
  );
}

function WeeklyEmotionDistribution({ weekData }) {
  const counts = {};
  let total = 0;
  weekData.forEach(d => {
    if (d.dominantEmotion) {
      counts[d.dominantEmotion] = (counts[d.dominantEmotion] || 0) + 1;
      total += 1;
    }
  });

  if (total === 0) {
    return (
      <SectionCard>
        <SectionTitle icon="📊" title="Weekly Emotion Distribution" />
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No logs this week to calculate distribution.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionTitle icon="📊" title="Weekly Emotion Distribution" subtitle="Distribution of dominant vibes detected" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(counts).map(([emo, count]) => {
          const pct = Math.round((count / total) * 100);
          const config = MOOD_CONFIG[emo] || { emoji: '😐', color: '#9090a8' };
          return (
            <div key={emo}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize', fontWeight: 600 }}>
                  {config.emoji} {emo}
                </span>
                <span style={{ fontWeight: 700, color: config.color }}>{pct}% ({count} {count === 1 ? 'day' : 'days'})</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: config.color, borderRadius: 3 }} />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMBINED COMPONENT
   ───────────────────────────────────────────── */
export default function MoodPage() {
  const [pageTab, setPageTab] = useState('tools'); // 'tools' | 'analytics'
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState('breathing');
  const [isPersonalized, setIsPersonalized] = useState(false);

  // Insights State
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsData, setInsightsData] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [retraining, setRetraining] = useState(false);
  const [activeInsightsTab, setActiveInsightsTab] = useState('daily');

  // Reflection Hub States
  const [questions, setQuestions] = useState([
    "What made you happiest this week?",
    "What was a challenge you faced and how did you overcome it?",
    "Who is one person you are grateful for this week and why?",
    "What did you learn about yourself through your emotions this week?",
    "Which song resonated with you the most this week and why?"
  ]);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [journalContent, setJournalContent] = useState('');
  const [journalMood, setJournalMood] = useState('happy');
  const [submitting, setSubmitting] = useState(false);
  const [reflections, setReflections] = useState([]);

  const { API, setDetectedEmotion, detectedEmotion, setDetectedWellness, toast } = useApp();

  const fetchInsights = useCallback(() => {
    Promise.all([
      API.get('/music/insights'),
      API.get('/music/recommendation-model-status').catch(() => ({ data: null })),
      API.get('/wellness/reflection/questions').catch(() => null),
      API.get('/wellness/journal').catch(() => null)
    ])
      .then(([r1, r2, qRes, rRes]) => {
        setInsightsData(r1.data);
        setModelStatus(r2.data);
        if (qRes && qRes.data && qRes.data.questions) {
          setQuestions(qRes.data.questions);
          setSelectedPrompt(prev => prev || qRes.data.questions[0]);
        }
        if (rRes && rRes.data && rRes.data.entries) {
          const allEntries = rRes.data.entries || [];
          const filtered = allEntries.filter(entry => entry.prompt);
          setReflections(filtered);
        }
        setInsightsLoading(false);
      })
      .catch(err => {
        console.error("Error loading insights:", err);
        setInsightsLoading(false);
      });
  }, [API]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleEmotionDetected = async (emotion, confidence, detectedMetrics) => {
    setDetectedEmotion(emotion);
    if (detectedMetrics) {
      setMetrics(detectedMetrics);
      if (setDetectedWellness) setDetectedWellness(detectedMetrics);
    }
    if (loading) return;
    setLoading(true);
    try {
      const r = await API.get(`/music/recommend/${emotion}?limit=12`);
      setSongs(r.data.recommendations || []);
      setIsPersonalized(r.data.personalized || false);
      
      // Auto-refresh analytics charts right after detection
      setTimeout(fetchInsights, 1500);
    } catch {
      toast('Using demo songs', 'info');
    }
    setLoading(false);
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const r = await API.post('/music/recommendation-model-retrain');
      setModelStatus(r.data.status_data);
      toast('Preference engine calibrated successfully! 🧠', 'success');
    } catch (err) {
      console.error(err);
      toast('Calibration failed', 'error');
    }
    setRetraining(false);
  };

  const handleReflectionSubmit = async (e) => {
    e.preventDefault();
    if (!journalContent.trim()) {
      toast('Please write your reflection content', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await API.post('/wellness/journal', {
        content: journalContent,
        mood: journalMood,
        prompt: selectedPrompt
      });
      toast('Deep reflection saved successfully! 📓', 'success');
      setJournalContent('');
      fetchInsights();
    } catch (err) {
      console.error(err);
      toast('Failed to save reflection entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const cfg = detectedEmotion ? MOOD_CONFIG[detectedEmotion] : null;
  const tip = getWellnessTip(metrics);

  const TABS = [
    { id: 'breathing',  label: '🧘 Breathing', sublabel: 'Box cycle' },
    { id: 'nature',     label: '🍃 Nature',    sublabel: 'Ambient sounds' },
    { id: 'meditation', label: '🎹 Meditation', sublabel: 'Healing beats' },
  ];

  const INSIGHTS_TABS = [
    { id: 'daily', label: '🌅 Live & Today', icon: '🌅' },
    { id: 'reports', label: '📅 Trends & Charts', icon: '📊' },
    { id: 'patterns', label: '🗺️ Heatmap & AI', icon: '🤖' },
    { id: 'reflection', label: '📓 Reflection Hub', icon: '📓' },
  ];

  const {
    todayMood = {},
    weekData = [],
    monthData = [],
    heatmap = [],
    genres = [],
    timelineEvents = [],
    scores = {},
    aiRecs = []
  } = insightsData || {};

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 1250 }}>
      {/* Dynamic Header */}
      <div style={{ marginBottom: 24, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-display)', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ background: 'var(--gradient-main)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🧠 Insights Hub
            </span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Scan your face for real-time wellness, and track your historical emotional analytics side-by-side.
          </p>
        </div>
        <button onClick={fetchInsights} className="btn-ghost animate-fade" style={{ padding:'8px 16px', fontSize:12 }}>
          🔄 Refresh Analytics
        </button>
      </div>

      {/* Top-level Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', marginBottom: 20, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <button 
          onClick={() => setPageTab('tools')}
          style={{
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            color: pageTab === 'tools' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: pageTab === 'tools' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            marginBottom: -1,
            transition: 'all var(--transition)',
            background: 'none', border: 'none', cursor: 'pointer'
          }}
        >
          📷 Scanner & Tools
        </button>
        <button 
          onClick={() => setPageTab('analytics')}
          style={{
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            color: pageTab === 'analytics' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: pageTab === 'analytics' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            marginBottom: -1,
            transition: 'all var(--transition)',
            background: 'none', border: 'none', cursor: 'pointer'
          }}
        >
          📊 Analytics & Charts
        </button>
      </div>

      {pageTab === 'tools' ? (
        <div className="responsive-grid-12-1 animate-fade">
          {/* ========================================================
              LEFT COLUMN: FACE DETECTOR & WELLNESS CENTRE
              ======================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Camera Frame */}
            <SectionCard style={{ border: cfg ? `1px solid ${cfg.color}35` : '1px solid var(--border-color)', transition: 'border-color 0.4s ease' }}>
              <FaceDetector onEmotionDetected={handleEmotionDetected} />
            </SectionCard>

            {/* Current Scanned Result & Song Recommendations */}
            {detectedEmotion && (
              <SectionCard style={{ background: cfg ? `${cfg.bg}` : 'var(--bg-glass)', border: cfg ? `1px solid ${cfg.color}35` : '1px solid var(--border-color)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
                  <div style={{ fontSize: 44, filter: cfg ? `drop-shadow(0 0 12px ${cfg.color}50)` : 'none' }}>{cfg?.emoji}</div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: cfg?.color || 'var(--text-primary)', fontFamily:'var(--font-display)' }}>
                      {(detectedEmotion).charAt(0).toUpperCase() + detectedEmotion.slice(1)} Mood Detected
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Recommended genre: {cfg?.genre}</p>
                  </div>
                  {isPersonalized && (
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                      background: 'rgba(92,252,216,0.15)', border: '1px solid #5cfcd8',
                      color: '#5cfcd8', fontWeight: 700, marginLeft: 'auto'
                    }}>
                      ✨ AI Personalized
                    </span>
                  )}
                </div>

                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
                  </div>
                ) : (
                  songs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {songs.slice(0, 4).map((s, i) => <SongCard key={i} song={s} queue={songs} index={i} compact />)}
                    </div>
                  )
                )}
              </SectionCard>
            )}

            {/* Wellness Centre */}
            {detectedEmotion && (
              <SectionCard>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize: 20 }}>🌿</span>
                    <h3 style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)' }}>Mind &amp; Body Wellness</h3>
                  </div>
                  {tip && (
                    <div style={{
                      padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                      background: `${tip.color}08`, border: `1px solid ${tip.color}20`,
                      maxWidth: 240, display: 'flex', gap:6, alignItems: 'center'
                    }}>
                      <span style={{ fontSize: 14 }}>{tip.icon}</span>
                      <p style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{tip.text}</p>
                    </div>
                  )}
                </div>

                {metrics && (
                  <div style={{
                    display:'flex', gap:8, padding:'12px',
                    background:'rgba(0,0,0,0.15)', borderRadius:'var(--radius-md)',
                    border:'1px solid var(--border-color)', marginBottom:16
                  }}>
                    <MetricCircle value={metrics.stress} label="Stress" icon="⚡" color="#fcb85c" colorHigh="#fc5ca0" />
                    <MetricCircle value={metrics.anxiety} label="Anxiety" icon="😰" color="#7c5cfc" colorHigh="#fc5ca0" />
                    <MetricCircle value={metrics.fatigue} label="Fatigue" icon="😴" color="#5cfcd8" colorHigh="#5c8cfc" />
                  </div>
                )}

                {/* Subtabs for exercises */}
                <div style={{ borderBottom:'1px solid var(--border-color)', marginBottom:16 }}>
                  <div style={{ display:'flex', gap:2 }}>
                    {TABS.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                          fontSize: 12,
                          fontWeight: 600,
                          background: activeTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
                          color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                          borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                          transition: 'all var(--transition)',
                          display:'flex', flexDirection:'column', alignItems:'flex-start',
                          border: 'none', cursor: 'pointer'
                        }}
                      >
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  {activeTab === 'breathing' && <BreathingGuide />}
                  {activeTab === 'nature' && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {NATURE_SOUNDS.slice(0, 4).map((s,i) => <SongCard key={i} song={s} queue={NATURE_SOUNDS} index={i} compact />)}
                    </div>
                  )}
                  {activeTab === 'meditation' && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {MEDITATION_SONGS.slice(0, 4).map((s,i) => <SongCard key={i} song={s} queue={MEDITATION_SONGS} index={i} compact />)}
                    </div>
                  )}
                </div>
              </SectionCard>
            )}
          </div>

          {/* ========================================================
              RIGHT COLUMN: REFLECTIONS FORM & HISTORY
              ======================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* New Reflection Form */}
            <SectionCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 22 }}>✍️</span>
                <h2 style={{ fontSize: 16, fontWeight: 850, margin: 0, fontFamily: 'var(--font-display)' }}>New Reflection</h2>
              </div>

              <form onSubmit={handleReflectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Prompt Selector */}
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, fontWeight: 600 }}>
                    Choose a reflection prompt:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {questions.map((q, idx) => {
                      const isSelected = selectedPrompt === q;
                      const isWeeklyMain = idx === 0;
                      return (
                        <div
                          key={q}
                          onClick={() => setSelectedPrompt(q)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                            background: isSelected ? 'rgba(124,92,252,0.08)' : 'rgba(255,255,255,0.01)',
                            border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <IoSparkles size={11} style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                              <span style={{ fontSize: 12.5, fontWeight: isSelected ? 600 : 400, color: isSelected ? 'white' : 'var(--text-primary)', textAlign: 'left' }}>
                                {q}
                              </span>
                            </div>
                            {isWeeklyMain && (
                              <span style={{
                                fontSize: 9,
                                padding: '2px 6px',
                                background: 'var(--gradient-main)',
                                borderRadius: 'var(--radius-full)',
                                color: 'white',
                                fontWeight: 700
                              }}>
                                Weekly Special
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mood selector */}
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, fontWeight: 600 }}>
                    How does this prompt make you feel?
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful', 'disgusted'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setJournalMood(m)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          background: journalMood === m ? `${EMOTION_COLORS[m] || '#9090a8'}18` : 'rgba(255,255,255,0.02)',
                          border: journalMood === m ? `2px solid ${EMOTION_COLORS[m] || '#9090a8'}` : '1px solid var(--border-color)',
                          color: journalMood === m ? 'white' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 13,
                          fontWeight: journalMood === m ? 700 : 400,
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                      >
                        <span>{EMOTION_EMOJI[m]}</span>
                        <span style={{ textTransform: 'capitalize' }}>{m}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note entry */}
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, fontWeight: 600 }}>
                    Write your thoughts:
                  </label>
                  <textarea
                    value={journalContent}
                    onChange={(e) => setJournalContent(e.target.value)}
                    placeholder="Explore your thoughts and feelings here..."
                    rows={4}
                    style={{ resize: 'vertical', width: '100%', lineHeight: 1.5, fontSize: 13.5 }}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={submitting}
                  style={{ alignSelf: 'flex-start', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                >
                  <IoJournal /> {submitting ? 'Saving...' : 'Save Deep Reflection'}
                </button>
              </form>
            </SectionCard>

            {/* Reflections History */}
            <SectionCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <IoCalendar size={18} />
                <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>Deep Reflections History</h2>
              </div>

              {reflections.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📓</div>
                  <p style={{ fontSize: 12.5 }}>No deep reflections saved yet. Select a prompt above to log your first reflection!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 350, overflowY: 'auto', paddingRight: 4 }}>
                  {reflections.map((r) => (
                    <div 
                      key={r.id} 
                      style={{ 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-md)', 
                        padding: 16,
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11.5, color: 'var(--accent-primary)', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IoSparkles size={10} style={{ color: 'var(--accent-primary)' }} /> {r.prompt}
                          </div>
                          <span style={{
                            fontSize: 11, padding: '2px 6px', borderRadius: 'var(--radius-full)',
                            background: `${EMOTION_COLORS[r.mood] || '#9090a8'}12`, border: `1px solid ${EMOTION_COLORS[r.mood] || '#9090a8'}44`,
                            color: EMOTION_COLORS[r.mood] || '#9090a8', display: 'inline-flex', alignItems: 'center', gap: 4
                          }}>
                            <span>{EMOTION_EMOJI[r.mood]}</span>
                            <span style={{ textTransform: 'capitalize' }}>{r.mood}</span>
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(r.timestamp).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>
                        {r.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      ) : (
        /* ========================================================
            ANALYTICS & CHARTS DASHBOARD VIEW
            ======================================================== */
        <div className="responsive-grid-12-1 animate-fade" style={{ textAlign: 'left' }}>
          {/* LEFT COLUMN: PRIMARY CHARTS & METRICS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Today's Dominant Mood Card */}
            <SectionCard style={{ background:'linear-gradient(135deg, rgba(124,92,252,0.05), var(--bg-card))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Today's Dominant Mood</span>
                <span style={{ fontSize: 32 }}>{EMOTION_EMOJI[todayMood.emotion] || '😐'}</span>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', color: EMOTION_COLORS[todayMood.emotion] || 'var(--text-primary)', margin: 0 }}>
                {todayMood.emotion ? todayMood.emotion.toUpperCase() : 'NEUTRAL'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>Confidence: {todayMood.confidence || 0}% · Last scan: {todayMood.lastScan || 'N/A'}</p>
            </SectionCard>

            {/* Happiness & Stress gauges side-by-side */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <SectionCard style={{ background:'linear-gradient(135deg, rgba(252,184,92,0.04), var(--bg-card))' }}>
                <h4 style={{ fontSize:12, fontWeight:700, marginBottom:8, color:'#fcb85c', textAlign:'center' }}>Positivity Score</h4>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
                  <ScoreGauge value={todayMood.happinessScore || 50} color="#fcb85c" size={90} />
                </div>
              </SectionCard>
              <SectionCard style={{ background:'linear-gradient(135deg, rgba(252,92,164,0.04), var(--bg-card))' }}>
                <h4 style={{ fontSize:12, fontWeight:700, marginBottom:8, color:'#fc5ca0', textAlign:'center' }}>Stress Index</h4>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
                  <ScoreGauge value={todayMood.stressIndex || 30} color="#fc5ca0" size={90} />
                </div>
              </SectionCard>
            </div>

            {/* Weekly mood/stress trend */}
            <WeeklyReportSection weekData={weekData} />

            {/* Monthly trend */}
            <MonthlyReportSection monthData={monthData} />

            {/* Weekly Emotion Distribution */}
            <WeeklyEmotionDistribution weekData={weekData} />
          </div>

          {/* RIGHT COLUMN: LISTENING BEHAVIOUR, HEATMAP & TIMELINE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Listening behavior (Genre breakdown) */}
            <ListeningBehaviourSection genres={genres} weekData={weekData} />

            {/* Listening Hours bar chart */}
            <SectionCard>
              <SectionTitle icon="🕒" title="Listening Hours By Day" subtitle="Daily minutes spent listening this week" />
              <div style={{ marginTop: 12 }}>
                <BarChart data={weekData} valueKey="minutesListened" color="#5cfcd8" height={130} />
              </div>
            </SectionCard>

            {/* Heatmap Grid */}
            <SectionCard>
              <SectionTitle icon="🗺️" title="Emotion Heatmap" subtitle="Hourly emotional intensity this week" />
              <EmotionHeatmap heatmap={heatmap} />
            </SectionCard>

            {/* Preference Engine Section */}
            <MLEngineSection modelStatus={modelStatus} handleRetrain={handleRetrain} retraining={retraining} />

            {/* Today's Timeline */}
            <MoodTimelineSection timelineEvents={timelineEvents} />
          </div>
        </div>
      )}
    </div>
  );
}
