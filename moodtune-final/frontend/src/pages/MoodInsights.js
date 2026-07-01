/**
 * MoodInsights — Analytics & Reporting Dashboard
 * Sections: Today's Mood | Weekly/Monthly Reports | Mood Timeline |
 *           Emotion Heatmap | Listening Behaviour | Happiness Score |
 *           Stress Index | AI Recommendations
 */
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import BarChart from '../components/insights/BarChart';
import DonutChart from '../components/insights/DonutChart';
import ScoreGauge from '../components/insights/ScoreGauge';
import EmotionHeatmap from '../components/insights/EmotionHeatmap';
import { DAYS, MONTHS, EMOTION_COLORS, EMOTION_EMOJI } from '../components/insights/constants';

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function generateWeekData() {
  const rng = seededRandom(42);
  return DAYS.map((day, i) => ({
    day,
    happiness: Math.round(40 + rng() * 55),
    stress: Math.round(10 + rng() * 50),
    songs: Math.round(3 + rng() * 22),
    dominantEmotion: ['happy','neutral','sad','happy','surprised','neutral','happy'][i],
    minutesListened: Math.round(15 + rng() * 90),
  }));
}

function generateMonthData() {
  const rng = seededRandom(99);
  return Array.from({ length: 4 }, (_, i) => ({
    week: `Week ${i+1}`,
    happiness: Math.round(45 + rng() * 45),
    stress: Math.round(15 + rng() * 45),
    songs: Math.round(20 + rng() * 80),
    minutesListened: Math.round(120 + rng() * 480),
  }));
}

// 7 days × 24 hours heatmap
function generateHeatmap() {
  const rng = seededRandom(123);
  return DAYS.map(day => ({
    day,
    hours: Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      intensity: h >= 6 && h <= 23 ? rng() : rng() * 0.15,
      emotion: ['happy','neutral','sad','happy','surprised'][Math.floor(rng() * 5)],
    }))
  }));
}

function generateListeningBehaviour() {
  return [
    { genre: 'Pop / Dance', pct: 32, color: '#fcb85c', icon: '🎉' },
    { genre: 'Lo-fi / Chill', pct: 24, color: '#5c8cfc', icon: '🌙' },
    { genre: 'Meditation', pct: 18, color: '#7c5cfc', icon: '🧘' },
    { genre: 'Bollywood', pct: 14, color: '#fc5ca0', icon: '🎬' },
    { genre: 'Nature Sounds', pct: 7, color: '#5cfcd8', icon: '🍃' },
    { genre: 'Other', pct: 5, color: '#9090a8', icon: '🎵' },
  ];
}

const weekData  = generateWeekData();
const monthData = generateMonthData();
const heatmap   = generateHeatmap();
const genres    = generateListeningBehaviour();

const todayMood = {
  emotion: 'happy',
  confidence: 87,
  stress: 28,
  anxiety: 22,
  fatigue: 35,
  happinessScore: 74,
  stressIndex: 28,
  songsToday: 14,
  minutesToday: 52,
  lastScan: '2:34 PM',
};

const AI_RECS = [
  {
    icon: '🎵',
    title: 'Keep the Energy Up',
    body: 'Your happiness is high today. Play more upbeat Pop tracks to maintain this positive state throughout the day.',
    color: '#fcb85c',
    tag: 'Mood Booster'
  },
  {
    icon: '🧘',
    title: 'Evening Wind-Down',
    body: 'Schedule a 10-min guided breathing session tonight. Your evening stress index usually rises after 8 PM.',
    color: '#7c5cfc',
    tag: 'Stress Relief'
  },
  {
    icon: '💤',
    title: 'Sleep Routine',
    body: 'You listen to Lo-fi for 24% of your sessions. Adding Delta Wave tracks 30 min before sleep can improve sleep quality.',
    color: '#5c8cfc',
    tag: 'Sleep Hygiene'
  },
  {
    icon: '📈',
    title: 'Weekend Pattern',
    body: 'Your happiness score peaks on Saturdays (+18 pts). Try recreating Saturday playlists mid-week to lift mood.',
    color: '#5cfcd8',
    tag: 'Behavioural Insight'
  },
];

/* ─────────────────────────────────────────────
   SHARED UI COMPONENTS
   ───────────────────────────────────────────── */
function SectionCard({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-xl)',
      padding: '28px',
      ...style
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, subtitle, right }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          <span style={{ fontSize:20 }}>{icon}</span>
          <h2 style={{ fontSize:18, fontWeight:800, fontFamily:'var(--font-display)' }}>{title}</h2>
        </div>
        {subtitle && <p style={{ color:'var(--text-secondary)', fontSize:13, paddingLeft:28 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function StatPill({ label, value, color, icon }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'16px 20px', borderRadius:'var(--radius-lg)',
      background:`${color}10`, border:`1px solid ${color}25`,
      minWidth:100, textAlign:'center', gap:6
    }}>
      <span style={{ fontSize:22 }}>{icon}</span>
      <div style={{ fontSize:22, fontWeight:900, color, fontFamily:'var(--font-display)', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:500 }}>{label}</div>
    </div>
  );
}


/* ─────────────────────────────────────────────
   SECTION: TODAY'S MOOD
   ───────────────────────────────────────────── */
function TodayMoodSection({ todayMood }) {
  const color = EMOTION_COLORS[todayMood.emotion] || '#9090a8';
  const level = v => v > 60 ? 'High' : v > 35 ? 'Moderate' : 'Low';
  const levelColor = v => v > 60 ? '#fc5ca0' : v > 35 ? '#fcb85c' : '#5cfcd8';

  return (
    <SectionCard style={{ background:`linear-gradient(135deg, ${color}08, var(--bg-card) 60%)`, border:`1px solid ${color}30` }}>
      <SectionTitle icon="🌅" title="Today's Mood" subtitle={`Last scanned at ${todayMood.lastScan}`}
        right={
          <div style={{
            padding:'6px 14px', borderRadius:'var(--radius-full)',
            background:`${color}18`, border:`1px solid ${color}33`,
            fontSize:12, color, fontWeight:700
          }}>
            {EMOTION_EMOJI[todayMood.emotion]} Live Data
          </div>
        }
      />

      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:32, alignItems:'center' }}>
        {/* Big Emotion */}
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:72, lineHeight:1, filter:`drop-shadow(0 0 24px ${color}88)`, marginBottom:8 }}>
            {EMOTION_EMOJI[todayMood.emotion]}
          </div>
          <div style={{ fontSize:22, fontWeight:900, color, fontFamily:'var(--font-display)' }}>
            {todayMood.emotion.charAt(0).toUpperCase() + todayMood.emotion.slice(1)}
          </div>
          <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{todayMood.confidence}% confidence</div>
        </div>

        {/* Stats Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 }}>
          {[
            { label:'Happiness', value:`${todayMood.happinessScore}%`, icon:'😊', color:'#fcb85c' },
            { label:'Stress Index', value:`${todayMood.stressIndex}%`, icon:'⚡', color: levelColor(todayMood.stressIndex) },
            { label:'Songs Played', value:todayMood.songsToday, icon:'🎵', color:'#7c5cfc' },
            { label:'Mins Listened', value:`${todayMood.minutesToday}m`, icon:'⏱', color:'#5cfcd8' },
          ].map((s, i) => <StatPill key={i} {...s} />)}
        </div>
      </div>

      {/* Today's Wellness Bars */}
      <div style={{ marginTop:24, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { label:'Stress', value:todayMood.stress, color:'#fc5ca0' },
          { label:'Anxiety', value:todayMood.anxiety, color:'#7c5cfc' },
          { label:'Fatigue', value:todayMood.fatigue, color:'#5c8cfc' },
        ].map((m, i) => (
          <div key={i} style={{ padding:'12px', background:'rgba(0,0,0,0.2)', borderRadius:'var(--radius-md)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:8 }}>
              <span style={{ color:'var(--text-secondary)' }}>{m.label}</span>
              <span style={{ color: m.value > 60 ? '#fc5ca0' : 'var(--text-primary)', fontWeight:700 }}>
                {m.value}% <span style={{ fontWeight:400, color:'var(--text-muted)' }}>({level(m.value)})</span>
              </span>
            </div>
            <div style={{ height:6, background:'var(--bg-secondary)', borderRadius:3, overflow:'hidden' }}>
              <div style={{
                height:'100%', width:`${m.value}%`,
                background:`linear-gradient(90deg, ${m.color}88, ${m.color})`,
                borderRadius:3,
                boxShadow: m.value > 60 ? `0 0 6px ${m.color}88` : 'none',
                transition:'width 0.8s ease'
              }} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   SECTION: WEEKLY REPORT
   ───────────────────────────────────────────── */
function WeeklyReportSection({ weekData }) {
  const avgHappiness = weekData.length > 0 ? Math.round(weekData.reduce((s,d) => s+d.happiness,0) / weekData.length) : 0;
  const totalSongs   = weekData.reduce((s,d) => s+d.songs, 0);
  const peakDay      = weekData.length > 0 ? weekData.reduce((a,b) => a.happiness > b.happiness ? a : b) : { day: 'N/A', happiness: 0 };

  return (
    <SectionCard>
      <SectionTitle icon="📅" title="Weekly Report"
        subtitle="Your 7-day emotional & listening snapshot"
        right={
          <div style={{ display:'flex', gap:8 }}>
            {[
              { label:'Avg Happiness', val:`${avgHappiness}%`, color:'#fcb85c' },
              { label:'Songs Played', val:totalSongs, color:'#7c5cfc' },
              { label:'Best Day', val:peakDay.day, color:'#5cfcd8' },
            ].map((s,i) => (
              <div key={i} style={{
                padding:'8px 14px', borderRadius:'var(--radius-md)', textAlign:'center',
                background:`${s.color}10`, border:`1px solid ${s.color}25`
              }}>
                <div style={{ fontSize:15, fontWeight:800, color:s.color, fontFamily:'var(--font-display)' }}>{s.val}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        }
      />

      {/* Happiness + Stress bars */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', gap:16, marginBottom:12, fontSize:12, color:'var(--text-muted)' }}>
          <span>— <span style={{ color:'#fcb85c' }}>■</span> Happiness</span>
          <span>— <span style={{ color:'#fc5ca0' }}>■</span> Stress</span>
        </div>
        <BarChart data={weekData} valueKey="happiness" secondKey="stress" color="#fcb85c" height={160} />
      </div>

      {/* Day cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8, marginTop:20 }}>
        {weekData.map((d,i) => {
          const ec = EMOTION_COLORS[d.dominantEmotion];
          return (
            <div key={i} style={{
              textAlign:'center', padding:'12px 6px', borderRadius:'var(--radius-md)',
              background:`${ec}10`, border:`1px solid ${ec}25`
            }}>
              <div style={{ fontSize:18 }}>{EMOTION_EMOJI[d.dominantEmotion]}</div>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-primary)', marginTop:4 }}>{d.day}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{d.songs} songs</div>
              <div style={{ fontSize:10, color:ec, marginTop:2, fontWeight:600 }}>{d.happiness}% 😊</div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   SECTION: MONTHLY REPORT
   ───────────────────────────────────────────── */
function MonthlyReportSection({ monthData }) {
  const now = new Date();
  const monthName = MONTHS[now.getMonth()];
  const totalSongs = monthData.reduce((s,d) => s+d.songs, 0);
  const totalMins  = monthData.reduce((s,d) => s+d.minutesListened, 0);
  const avgH = monthData.length > 0 ? Math.round(monthData.reduce((s,d) => s+d.happiness,0)/monthData.length) : 0;

  return (
    <SectionCard>
      <SectionTitle icon="📊" title={`Monthly Report — ${monthName}`}
        subtitle="4-week breakdown of your emotional wellness & music habits"
        right={
          <div style={{ display:'flex', gap:8 }}>
            {[
              { label:'Total Songs', val:totalSongs, color:'#7c5cfc' },
              { label:'Hours Listened', val:`${Math.round(totalMins/60)}h`, color:'#5cfcd8' },
              { label:'Avg Happiness', val:`${avgH}%`, color:'#fcb85c' },
            ].map((s,i) => (
              <div key={i} style={{
                padding:'8px 14px', borderRadius:'var(--radius-md)', textAlign:'center',
                background:`${s.color}10`, border:`1px solid ${s.color}25`
              }}>
                <div style={{ fontSize:15, fontWeight:800, color:s.color, fontFamily:'var(--font-display)' }}>{s.val}</div>
                <div style={{ fontSize:10, color:'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        }
      />

      <BarChart data={monthData} valueKey="happiness" color="#7c5cfc" height={160} labelKey="week" />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:20 }}>
        {monthData.map((d,i) => (
          <div key={i} style={{
            padding:'16px', borderRadius:'var(--radius-md)',
            background:'rgba(124,92,252,0.06)', border:'1px solid rgba(124,92,252,0.15)'
          }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--accent-primary)', marginBottom:12 }}>{d.week}</div>
            {[
              ['😊 Happiness', d.happiness+'%', '#fcb85c'],
              ['⚡ Stress', d.stress+'%', '#fc5ca0'],
              ['🎵 Songs', d.songs, '#7c5cfc'],
              ['⏱ Minutes', d.minutesListened+'m', '#5cfcd8'],
            ].map(([l,v,c], j) => (
              <div key={j} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
                <span style={{ color:'var(--text-muted)' }}>{l}</span>
                <span style={{ fontWeight:700, color:c }}>{v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   SECTION: MOOD TIMELINE
   ───────────────────────────────────────────── */
const timelineEvents = [
  { time:'09:12 AM', emotion:'neutral', note:'Morning scan — started day calmly', songs:2 },
  { time:'11:34 AM', emotion:'happy',   note:'After playlist — mood boosted significantly', songs:5 },
  { time:'01:05 PM', emotion:'neutral', note:'Post-lunch scan — energy dipped slightly', songs:3 },
  { time:'03:22 PM', emotion:'surprised',note:'Discovered new track — felt energised', songs:7 },
  { time:'05:49 PM', emotion:'sad',     note:'Stressed before deadline — needed calm music', songs:4 },
  { time:'08:15 PM', emotion:'happy',   note:'Evening relaxation — mood recovered', songs:6 },
];

function MoodTimelineSection({ timelineEvents }) {
  return (
    <SectionCard>
      <SectionTitle icon="⏳" title="Mood Timeline"
        subtitle="Today's emotional journey mapped across time"
      />
      <div style={{ position:'relative' }}>
        {/* Vertical line */}
        <div style={{
          position:'absolute', left:60, top:0, bottom:0, width:2,
          background:'linear-gradient(180deg, var(--accent-primary), rgba(124,92,252,0.1))',
          borderRadius:1
        }} />

        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {timelineEvents.map((ev, i) => {
            const c = EMOTION_COLORS[ev.emotion];
            return (
              <div key={i} style={{ display:'flex', gap:0, alignItems:'flex-start', position:'relative' }}>
                {/* Time */}
                <div style={{ width:55, fontSize:10, color:'var(--text-muted)', paddingTop:18, textAlign:'right', flexShrink:0, paddingRight:12 }}>
                  {ev.time.split(' ')[0]}<br /><span style={{ color:'var(--text-muted)', opacity:0.6 }}>{ev.time.split(' ')[1]}</span>
                </div>

                {/* Dot */}
                <div style={{
                  width:16, height:16, borderRadius:'50%', flexShrink:0,
                  background:c, border:`3px solid var(--bg-card)`,
                  boxShadow:`0 0 12px ${c}88`,
                  marginTop:16, zIndex:1, position:'relative'
                }} />

                {/* Content */}
                <div style={{
                  flex:1, marginLeft:16, padding:'12px 16px', marginBottom:12,
                  background:`${c}08`, border:`1px solid ${c}20`,
                  borderRadius:'var(--radius-md)'
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:18 }}>{EMOTION_EMOJI[ev.emotion]}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:c }}>
                      {ev.emotion.charAt(0).toUpperCase()+ev.emotion.slice(1)}
                    </span>
                    <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-muted)' }}>
                      {ev.songs} songs played
                    </span>
                  </div>
                  <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.5 }}>{ev.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   SECTION: EMOTION HEATMAP
   ───────────────────────────────────────────── */
function EmotionHeatmapSection({ heatmap }) {
  return (
    <SectionCard>
      <SectionTitle icon="🗺️" title="Emotion Heatmap"
        subtitle="When are you happiest? Hourly emotional intensity map this week"
      />
      <EmotionHeatmap heatmap={heatmap} />
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   SECTION: LISTENING BEHAVIOUR
   ───────────────────────────────────────────── */
function ListeningBehaviourSection({ genres, weekData }) {
  const totalMins = weekData.reduce((s,d) => s + d.minutesListened, 0);
  const peakHour = '8 PM';

  return (
    <SectionCard>
      <SectionTitle icon="🎧" title="Listening Behaviour"
        subtitle="Genre breakdown & session patterns this week"
        right={
          <div style={{ display:'flex', gap:8 }}>
            <StatPill label="Total This Week" value={`${Math.round(totalMins/60)}h ${totalMins%60}m`} color="#7c5cfc" icon="⏱" />
            <StatPill label="Peak Listening" value={peakHour} color="#5cfcd8" icon="📈" />
          </div>
        }
      />

      <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:32, alignItems:'center' }}>
        {/* Donut Chart */}
        <div style={{ position:'relative', display:'inline-block' }}>
          <DonutChart
            slices={genres.map(g => ({ value:g.pct, color:g.color }))}
            size={160} thickness={32}
          />
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontSize:22, fontWeight:900, color:'var(--text-primary)', fontFamily:'var(--font-display)' }}>{totalMins}m</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>this week</div>
          </div>
        </div>

        {/* Genre bars */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {genres.map((g, i) => (
            <div key={i}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:5 }}>
                <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span>{g.icon}</span>
                  <span style={{ color:'var(--text-primary)', fontWeight:500 }}>{g.genre}</span>
                </span>
                <span style={{ fontWeight:700, color:g.color }}>{g.pct}%</span>
              </div>
              <div style={{ height:7, background:'var(--bg-secondary)', borderRadius:4, overflow:'hidden' }}>
                <div style={{
                  height:'100%', width:`${g.pct}%`,
                  background:`linear-gradient(90deg, ${g.color}88, ${g.color})`,
                  borderRadius:4, transition:'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow:`0 0 6px ${g.color}44`
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Listening sessions heat */}
      <div style={{ marginTop:24, padding:'16px', background:'rgba(0,0,0,0.2)', borderRadius:'var(--radius-md)' }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:12, color:'var(--text-secondary)' }}>Peak Listening Hours Today</div>
        <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:60 }}>
          {Array.from({length:24}, (_,h) => {
            const rng = seededRandom(h * 7 + 13);
            const intensity = h >= 7 && h <= 23 ? (0.1 + rng() * 0.9) : rng() * 0.1;
            return (
              <div
                key={h}
                title={`${h}:00 — ${Math.round(intensity * 60)}min listened`}
                style={{
                  flex:1, borderRadius:'2px 2px 0 0',
                  height:`${Math.round(intensity * 100)}%`,
                  background: h >= 19 && h <= 22
                    ? 'linear-gradient(180deg, #7c5cfc, #5cfcd8)'
                    : 'linear-gradient(180deg, rgba(124,92,252,0.4), rgba(92,252,216,0.2))',
                  minHeight:2, transition:'height 0.5s ease'
                }}
              />
            );
          })}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:4 }}>
          <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
        </div>
      </div>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   SECTION: HAPPINESS SCORE + STRESS INDEX (combined)
   ───────────────────────────────────────────── */
function ScoresSection({ scores }) {
  const { happinessHistory = [], stressHistory = [] } = scores || {};
  const maxH = 100;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
      {/* Happiness Score */}
      <SectionCard style={{ background:'linear-gradient(135deg, rgba(252,184,92,0.06), var(--bg-card))' }}>
        <SectionTitle icon="😊" title="Happiness Score"
          subtitle="AI-calculated positivity score based on facial expressions"
        />
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
          <ScoreGauge value={74} color="#fcb85c" label="Today's Score" icon="😊" />

          {/* 7-day trend */}
          <div style={{ width:'100%' }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>7-Day Trend</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:60 }}>
              {happinessHistory.map((v,i) => (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <div style={{
                    width:'100%',
                    height:`${(v / maxH) * 52}px`,
                    borderRadius:'4px 4px 0 0',
                    background: i === 6 ? '#fcb85c' : 'rgba(252,184,92,0.3)',
                    boxShadow: i === 6 ? '0 0 12px rgba(252,184,92,0.6)' : 'none'
                  }} />
                  <span style={{ fontSize:9, color: i===6?'#fcb85c':'var(--text-muted)' }}>{DAYS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown */}
          <div style={{ width:'100%', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { label:'Joy Factor', val:'82%', color:'#fcb85c' },
              { label:'Calm Score', val:'71%', color:'#5cfcd8' },
              { label:'Energy', val:'65%', color:'#fc5ca0' },
              { label:'Social', val:'58%', color:'#7c5cfc' },
            ].map((s,i) => (
              <div key={i} style={{
                padding:'10px 12px', borderRadius:'var(--radius-md)',
                background:`${s.color}10`, border:`1px solid ${s.color}22`
              }}>
                <div style={{ fontSize:14, fontWeight:800, color:s.color, fontFamily:'var(--font-display)' }}>{s.val}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Stress Index */}
      <SectionCard style={{ background:'linear-gradient(135deg, rgba(252,92,164,0.06), var(--bg-card))' }}>
        <SectionTitle icon="⚡" title="Stress Index"
          subtitle="Real-time stress detection from micro-expressions"
        />
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
          <ScoreGauge value={28} color="#5cfcd8" label="Today's Index" icon="⚡" />

          {/* 7-day stress trend */}
          <div style={{ width:'100%' }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>7-Day Trend</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:60 }}>
              {stressHistory.map((v,i) => {
                const c = v > 45 ? '#fc5ca0' : v > 30 ? '#fcb85c' : '#5cfcd8';
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <div style={{
                      width:'100%',
                      height:`${(v / 100) * 52}px`,
                      borderRadius:'4px 4px 0 0',
                      background: i === 6 ? c : `${c}44`,
                      boxShadow: i === 6 ? `0 0 12px ${c}88` : 'none'
                    }} />
                    <span style={{ fontSize:9, color: i===6?c:'var(--text-muted)' }}>{DAYS[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stress triggers */}
          <div style={{ width:'100%' }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>Stress Triggers This Week</div>
            {[
              { trigger:'Pre-deadline afternoons', pct:65, color:'#fc5ca0' },
              { trigger:'Early mornings (before 9AM)', pct:48, color:'#fcb85c' },
              { trigger:'After long listening sessions', pct:32, color:'#7c5cfc' },
            ].map((t,i) => (
              <div key={i} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                  <span style={{ color:'var(--text-secondary)' }}>{t.trigger}</span>
                  <span style={{ color:t.color, fontWeight:700 }}>{t.pct}%</span>
                </div>
                <div style={{ height:5, background:'var(--bg-secondary)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${t.pct}%`, background:t.color, borderRadius:3, transition:'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION: AI RECOMMENDATIONS
   ───────────────────────────────────────────── */
function AIRecommendationsSection({ aiRecs }) {
  const [selected, setSelected] = useState(null);
  return (
    <SectionCard style={{ background:'linear-gradient(135deg, rgba(124,92,252,0.08), rgba(92,252,216,0.04))' }}>
      <SectionTitle icon="🤖" title="AI Recommendations"
        subtitle="Personalised insights generated from your mood patterns, listening history & wellness data"
        right={
          <div style={{
            padding:'6px 14px', borderRadius:'var(--radius-full)',
            background:'linear-gradient(135deg, rgba(124,92,252,0.2), rgba(92,252,216,0.1))',
            border:'1px solid rgba(124,92,252,0.3)',
            fontSize:12, fontWeight:700, color:'var(--accent-teal)'
          }}>
            ✨ Powered by MoodTune AI
          </div>
        }
      />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16 }}>
        {aiRecs.map((rec, i) => (
          <div
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            style={{
              padding:'20px',
              borderRadius:'var(--radius-lg)',
              background: selected === i ? `${rec.color}12` : 'rgba(255,255,255,0.02)',
              border:`1px solid ${selected === i ? rec.color+'44' : 'var(--border-color)'}`,
              cursor:'pointer',
              transition:'all 0.25s ease',
              transform: selected === i ? 'translateY(-2px)' : 'none',
              boxShadow: selected === i ? `0 8px 32px ${rec.color}22` : 'none'
            }}
          >
            <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
              <div style={{
                width:42, height:42, borderRadius:'var(--radius-md)', flexShrink:0,
                background:`${rec.color}18`, border:`1px solid ${rec.color}33`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:20
              }}>
                {rec.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>
                  {rec.title}
                </div>
                <div style={{
                  fontSize:11, padding:'2px 8px', borderRadius:'var(--radius-full)',
                  background:`${rec.color}18`, color:rec.color, fontWeight:700,
                  border:`1px solid ${rec.color}33`, display:'inline-block'
                }}>
                  {rec.tag}
                </div>
              </div>
              <div style={{
                fontSize:18,
                color: selected === i ? rec.color : 'var(--text-muted)',
                transition:'transform 0.25s ease',
                transform: selected === i ? 'rotate(180deg)' : 'none'
              }}>⌄</div>
            </div>

            {selected === i && (
              <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, paddingLeft:54 }}>
                {rec.body}
              </p>
            )}
            {selected !== i && (
              <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5, paddingLeft:54, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {rec.body}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Call to action */}
      <div style={{
        marginTop:24, padding:'16px 20px', borderRadius:'var(--radius-lg)',
        background:'rgba(0,0,0,0.3)', border:'1px solid var(--border-color)',
        display:'flex', alignItems:'center', gap:16, flexWrap:'wrap'
      }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🎯 Want more personalised insights?</div>
          <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
            Scan your mood daily for 7 days to unlock deeper AI pattern analysis and trend predictions.
          </div>
        </div>
        <a href="/mood" style={{
          padding:'10px 20px', borderRadius:'var(--radius-full)',
          background:'var(--gradient-main)', color:'white',
          fontSize:13, fontWeight:600, textDecoration:'none',
          boxShadow:'0 4px 16px rgba(124,92,252,0.4)',
          whiteSpace:'nowrap', display:'inline-block'
        }}>
          📷 Scan Mood Now
        </a>
      </div>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   SECTION: AI PREFERENCE ENGINE (ML MODEL)
   ───────────────────────────────────────────── */
function MLEngineSection({ modelStatus, handleRetrain, retraining }) {
  if (!modelStatus) return null;

  const { status, stats = {}, learned_preferences = {} } = modelStatus;
  const { total_plays = 0, total_favorites = 0, unique_songs_interacted = 0 } = stats;
  const { top_genres = [], top_artists = [], top_moods = [] } = learned_preferences;

  // Find max absolute value to scale the coefficients visually
  let maxWeight = 0.001;
  const findMax = arr => {
    arr.forEach(([_, val]) => {
      if (Math.abs(val) > maxWeight) maxWeight = Math.abs(val);
    });
  };
  if (status === 'active') {
    findMax(top_genres);
    findMax(top_artists);
    findMax(top_moods);
  }

  const renderPrefList = (title, items, icon) => {
    return (
      <div style={{ flex: '1 1 280px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
          <span>{icon}</span> {title}
        </h3>
        {items.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No preference learned yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(([name, val]) => {
              const absVal = Math.abs(val);
              const percent = Math.min(100, Math.round((absVal / maxWeight) * 100));
              const isPositive = val >= 0;
              const barColor = isPositive ? '#5cfcd8' : '#fc5ca0'; // Teal for like, Pink for dislike
              return (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{name}</span>
                    <span style={{ fontWeight: 700, color: barColor }}>
                      {isPositive ? '+' : ''}{val.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                    <div style={{
                      height: '100%',
                      width: `${percent}%`,
                      background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
                      borderRadius: 3,
                      boxShadow: `0 0 6px ${barColor}44`,
                      transition: 'width 0.5s ease-out'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <SectionCard style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.06), var(--bg-card))' }}>
      <SectionTitle
        icon="🧠"
        title="AI Preference Engine"
        subtitle="Ridge regression model analyzing your listens and likes to personalize recommendations"
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              padding: '6px 14px', borderRadius: 'var(--radius-full)',
              background: status === 'active' ? 'rgba(92,252,216,0.15)' : 'rgba(252,184,92,0.15)',
              border: `1px solid ${status === 'active' ? '#5cfcd8' : '#fcb85c'}`,
              fontSize: 12, color: status === 'active' ? '#5cfcd8' : '#fcb85c', fontWeight: 700
            }}>
              {status === 'active' ? 'Calibrated & Active' : 'Warming Up'}
            </span>
            <button
              onClick={handleRetrain}
              disabled={retraining || status === 'cold_start'}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                fontWeight: 600,
                cursor: retraining || status === 'cold_start' ? 'not-allowed' : 'pointer',
                opacity: retraining || status === 'cold_start' ? 0.5 : 1,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s ease'
              }}
            >
              {retraining ? '⚡ Retraining...' : '🔄 Retrain'}
            </button>
          </div>
        }
      />

      {status === 'cold_start' ? (
        <div style={{ padding: '24px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-lg)', textAlign: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--accent-primary)' }}>Personalization Pipeline Warming Up ⏳</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 16px' }}>
            Our recommendation model uses scikit-learn Ridge regression to learn your preferences.
            We need at least <strong>3 unique song interactions</strong> (plays or favorites) to activate your AI engine.
          </p>
          
          {/* Progress bar */}
          <div style={{ maxWidth: 400, margin: '0 auto 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>Unique Interactions</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{unique_songs_interacted} / 3</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (unique_songs_interacted / 3) * 100)}%`,
                background: 'var(--gradient-main)',
                borderRadius: 4,
                transition: 'width 0.5s ease-out'
              }} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          {renderPrefList('Loves & Avoids: Genres', top_genres, '🎉')}
          {renderPrefList('Loves & Avoids: Artists', top_artists, '🎤')}
          {renderPrefList('Loves & Avoids: Moods', top_moods, '🎭')}
        </div>
      )}

      {/* Model Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 16 }}>
        {[
          { label: 'Total Plays Logged', value: total_plays, icon: '🎵', color: '#7c5cfc' },
          { label: 'Favorited Songs', value: total_favorites, icon: '♡', color: '#fc5ca0' },
          { label: 'Unique Songs Logged', value: unique_songs_interacted, icon: '💿', color: '#5cfcd8' },
          { label: 'Regularization Penalty', value: 'α = 1.0 (L2)', icon: '⚖️', color: '#fcb85c' }
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────── */
const SECTION_NAV = [
  { id:'today',     label:"Today's Mood",      icon:'🌅' },
  { id:'weekly',    label:'Weekly Report',      icon:'📅' },
  { id:'monthly',   label:'Monthly Report',     icon:'📊' },
  { id:'timeline',  label:'Mood Timeline',      icon:'⏳' },
  { id:'heatmap',   label:'Emotion Heatmap',    icon:'🗺️' },
  { id:'listening', label:'Listening Behaviour',icon:'🎧' },
  { id:'scores',    label:'Happiness & Stress', icon:'💯' },
  { id:'ai',        label:'AI Recommendations', icon:'🤖' },
  { id:'ml_engine', label:'AI Preference Engine',icon:'🧠' },
];

export default function MoodInsights() {
  const [activeSection, setActiveSection] = useState('today');
  const sectionRefs = useRef({});
  const { user, API, toast } = useApp();

  const [loading, setLoading] = useState(true);
  const [insightsData, setInsightsData] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [retraining, setRetraining] = useState(false);

  useEffect(() => {
    Promise.all([
      API.get('/music/insights'),
      API.get('/music/recommendation-model-status').catch(() => ({ data: null }))
    ])
      .then(([r1, r2]) => {
        setInsightsData(r1.data);
        setModelStatus(r2.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching insights:", err);
        setLoading(false);
      });
  }, [API]);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const r = await API.post('/music/recommendation-model-retrain');
      setModelStatus(r.data.status_data);
      if (toast) toast('AI recommendation model retrained successfully! 🧠', 'success');
    } catch (err) {
      console.error("Failed to retrain model:", err);
      if (toast) toast('Failed to retrain recommendation model', 'error');
    }
    setRetraining(false);
  };

  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); });
      },
      { rootMargin:'-20% 0px -60% 0px', threshold:0 }
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [loading]);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, animation: 'spin 1s linear infinite' }}>🧠</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>Analyzing mood history & generating insights...</p>
      </div>
    );
  }

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

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  };

  return (
    <div className="page-content animate-fade" style={{ maxWidth:1100 }}>
      {/* Page Header */}
      <div style={{ marginBottom:32 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
          <div style={{
            width:44, height:44, borderRadius:'var(--radius-md)',
            background:'linear-gradient(135deg, #7c5cfc, #5cfcd8)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:22, boxShadow:'0 4px 16px rgba(124,92,252,0.4)'
          }}>🧠</div>
          <div>
            <h1 style={{ fontSize:28, fontWeight:900, fontFamily:'var(--font-display)', lineHeight:1 }}>
              Mood Insights
            </h1>
            <p style={{ color:'var(--text-secondary)', fontSize:13, marginTop:2 }}>
              {greeting}, {user?.name?.split(' ')[0] || 'there'}! Here's your complete wellness & listening analytics.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Section Nav */}
      <div style={{
        display:'flex', gap:6, overflowX:'auto', paddingBottom:4,
        marginBottom:32, scrollbarWidth:'none',
        position:'sticky', top:0, zIndex:10,
        background:'var(--bg-primary)', paddingTop:8
      }}>
        {SECTION_NAV.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            style={{
              padding:'8px 14px', borderRadius:'var(--radius-full)',
              fontSize:12, fontWeight:600, border:'none', cursor:'pointer',
              whiteSpace:'nowrap',
              background: activeSection === s.id ? 'var(--gradient-main)' : 'var(--bg-card)',
              color: activeSection === s.id ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${activeSection === s.id ? 'transparent' : 'var(--border-color)'}`,
              boxShadow: activeSection === s.id ? '0 4px 14px rgba(124,92,252,0.35)' : 'none',
              transition:'all 0.2s ease',
              display:'flex', alignItems:'center', gap:5
            }}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* Sections */}
      <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
        <div id="today" ref={el => sectionRefs.current.today = el}><TodayMoodSection todayMood={todayMood} /></div>
        <div id="weekly" ref={el => sectionRefs.current.weekly = el}><WeeklyReportSection weekData={weekData} /></div>
        <div id="monthly" ref={el => sectionRefs.current.monthly = el}><MonthlyReportSection monthData={monthData} /></div>
        <div id="timeline" ref={el => sectionRefs.current.timeline = el}><MoodTimelineSection timelineEvents={timelineEvents} /></div>
        <div id="heatmap" ref={el => sectionRefs.current.heatmap = el}><EmotionHeatmapSection heatmap={heatmap} /></div>
        <div id="listening" ref={el => sectionRefs.current.listening = el}><ListeningBehaviourSection genres={genres} weekData={weekData} /></div>
        <div id="scores" ref={el => sectionRefs.current.scores = el}><ScoresSection scores={scores} /></div>
        <div id="ai" ref={el => sectionRefs.current.ai = el}><AIRecommendationsSection aiRecs={aiRecs} /></div>
        <div id="ml_engine" ref={el => sectionRefs.current.ml_engine = el}><MLEngineSection modelStatus={modelStatus} handleRetrain={handleRetrain} retraining={retraining} /></div>
      </div>
    </div>
  );
}
