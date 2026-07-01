import React, { useState, useEffect, useRef } from 'react';

const PHASES = [
  { name: 'Inhale',  instruction: 'Breathe in slowly... fill your lungs',  size: 1.8, duration: 4, color: '#5cfcd8', bgColor: 'rgba(92,252,216,0.15)', glow: 'rgba(92,252,216,0.4)' },
  { name: 'Hold',    instruction: 'Hold... relax your shoulders',           size: 1.8, duration: 4, color: '#7c5cfc', bgColor: 'rgba(124,92,252,0.15)', glow: 'rgba(124,92,252,0.4)' },
  { name: 'Exhale',  instruction: 'Breathe out... release all tension',     size: 1.0, duration: 4, color: '#fc5ca0', bgColor: 'rgba(252,92,164,0.10)', glow: 'rgba(252,92,164,0.3)' },
  { name: 'Hold',    instruction: 'Hold... rest in peaceful stillness',     size: 1.0, duration: 4, color: '#5c8cfc', bgColor: 'rgba(92,140,252,0.12)', glow: 'rgba(92,140,252,0.3)' },
];

const CYCLE_BENEFITS = [
  "Activates your parasympathetic nervous system",
  "Lowers cortisol (stress hormone) levels",
  "Reduces heart rate and blood pressure",
  "Clears your mind for better focus",
];

export default function BreathingGuide() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [isActive, setIsActive] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [benefitIdx, setBenefitIdx] = useState(0);
  const timerRef = useRef(null);
  const benefitRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setPhaseIdx(curr => {
            const next = (curr + 1) % PHASES.length;
            if (next === 0) setCycleCount(c => c + 1);
            return next;
          });
          return PHASES[(phaseIdx + 1) % PHASES.length].duration;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isActive, phaseIdx]);

  // Rotate benefits text
  useEffect(() => {
    if (!isActive) return;
    benefitRef.current = setInterval(() => {
      setBenefitIdx(i => (i + 1) % CYCLE_BENEFITS.length);
    }, 5000);
    return () => clearInterval(benefitRef.current);
  }, [isActive]);

  const startExercise = () => {
    setPhaseIdx(0);
    setSecondsLeft(4);
    setCycleCount(0);
    setBenefitIdx(0);
    setIsActive(true);
  };

  const stopExercise = () => {
    setIsActive(false);
    clearInterval(timerRef.current);
    clearInterval(benefitRef.current);
  };

  const currentPhase = PHASES[phaseIdx];
  const progress = ((currentPhase.duration - secondsLeft) / currentPhase.duration) * 100;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-xl)',
      padding: '32px 28px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ambient background glow */}
      {isActive && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: currentPhase.bgColor,
          transition: 'background 1s ease',
          pointerEvents: 'none'
        }} />
      )}

      {/* Header */}
      <div style={{ position:'relative', zIndex:2 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, fontFamily: 'var(--font-display)', display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
          🧘 Box Breathing
          {cycleCount > 0 && (
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)',
              background: 'rgba(92,252,216,0.15)', color: '#5cfcd8', border: '1px solid rgba(92,252,216,0.3)'
            }}>
              {cycleCount} {cycleCount === 1 ? 'cycle' : 'cycles'} ✓
            </span>
          )}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 340, margin: '0 auto', lineHeight: 1.6 }}>
          The 4-4-4-4 technique used by Navy SEALs &amp; therapists to reset your nervous system instantly.
        </p>
      </div>

      {isActive ? (
        <>
          {/* Main breathing bubble */}
          <div style={{
            height: 260,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            width: '100%',
            zIndex: 2
          }}>
            {/* Outer pulse ring */}
            <div style={{
              position: 'absolute',
              width: 160,
              height: 160,
              borderRadius: '50%',
              border: `2px solid ${currentPhase.color}33`,
              transform: `scale(${currentPhase.size * 1.2})`,
              transition: `transform ${currentPhase.duration}s linear`,
            }} />

            {/* Main circle */}
            <div style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: `radial-gradient(circle at 40% 35%, ${currentPhase.glow}, ${currentPhase.bgColor} 60%, transparent)`,
              border: `2px solid ${currentPhase.color}66`,
              boxShadow: `0 0 60px ${currentPhase.glow}, 0 0 120px ${currentPhase.glow}55`,
              transform: `scale(${currentPhase.size})`,
              transition: `transform ${currentPhase.duration}s linear, box-shadow 0.8s ease, border-color 0.8s ease`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              position: 'relative'
            }} />

            {/* Text overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              gap: 6
            }}>
              <span style={{
                fontSize: 30, fontWeight: 900,
                color: currentPhase.color,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.02em',
                textShadow: `0 0 20px ${currentPhase.glow}`,
                transition: 'color 0.5s ease'
              }}>
                {currentPhase.name}
              </span>
              <span style={{
                fontSize: 12, color: 'var(--text-secondary)',
                maxWidth: 140, lineHeight: 1.4, textShadow: '0 1px 4px rgba(0,0,0,0.5)'
              }}>
                {currentPhase.instruction}
              </span>
              {/* Countdown */}
              <div style={{
                marginTop: 6,
                fontSize: 22, fontWeight: 800,
                color: 'white',
                background: 'rgba(10,10,15,0.75)',
                padding: '4px 14px',
                borderRadius: 12,
                border: `1px solid ${currentPhase.color}44`,
                fontFamily: 'var(--font-display)',
                backdropFilter: 'blur(8px)'
              }}>
                {secondsLeft}s
              </div>
            </div>
          </div>

          {/* Phase progress bar */}
          <div style={{ width:'100%', height:4, background:'var(--bg-secondary)', borderRadius:2, overflow:'hidden', position:'relative', zIndex:2 }}>
            <div style={{
              height:'100%',
              width:`${progress}%`,
              background: `linear-gradient(90deg, ${currentPhase.color}88, ${currentPhase.color})`,
              borderRadius:2,
              transition:`width 1s linear`
            }} />
          </div>

          {/* Phase steps indicator */}
          <div style={{ display:'flex', gap:8, alignItems:'center', zIndex:2 }}>
            {PHASES.map((p, i) => (
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{
                  width: i === phaseIdx ? 32 : 12,
                  height: 6,
                  borderRadius: 3,
                  background: i === phaseIdx ? p.color : i < phaseIdx || (phaseIdx === 0 && i === 3 && cycleCount > 0) ? 'var(--border-hover)' : 'var(--bg-secondary)',
                  transition: 'all 0.4s ease',
                  boxShadow: i === phaseIdx ? `0 0 8px ${p.color}88` : 'none'
                }} />
                <span style={{ fontSize:10, color: i === phaseIdx ? p.color : 'var(--text-muted)', transition:'color 0.4s ease' }}>
                  {p.name}
                </span>
              </div>
            ))}
          </div>

          {/* Rotating benefit text */}
          <div style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            maxWidth: 320,
            textAlign: 'center',
            zIndex: 2,
            opacity: 0.8,
            transition: 'opacity 0.5s ease'
          }}>
            💚 {CYCLE_BENEFITS[benefitIdx]}
          </div>

          <button
            className="btn-ghost"
            onClick={stopExercise}
            style={{ color:'var(--accent-pink)', fontSize:13, zIndex:2 }}
          >
            ⏹ Stop Exercise
          </button>
        </>
      ) : (
        /* Idle state */
        <div style={{
          height: 280,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          zIndex: 2
        }}>
          {/* Phase preview */}
          <div style={{ display:'flex', gap:20, alignItems:'center', marginBottom:8 }}>
            {PHASES.map((p, i) => (
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius:'50%',
                  background: `${p.bgColor}`,
                  border: `2px solid ${p.color}44`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  margin:'0 auto 6px',
                  fontSize: 10, color: p.color, fontWeight:700
                }}>
                  {p.duration}s
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.name}</div>
              </div>
            ))}
          </div>

          {cycleCount > 0 && (
            <div style={{
              padding:'10px 20px', borderRadius:'var(--radius-lg)',
              background:'rgba(92,252,216,0.08)', border:'1px solid rgba(92,252,216,0.2)',
              fontSize:14, color:'#5cfcd8', fontWeight:600
            }}>
              🎉 Great job! Completed {cycleCount} {cycleCount === 1 ? 'cycle' : 'cycles'}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={startExercise}
            style={{ padding:'14px 32px', fontSize:16 }}
          >
            🌬️ Start Breathing Cycle
          </button>
          <p style={{ fontSize:12, color:'var(--text-muted)', maxWidth:260, lineHeight:1.5 }}>
            Each cycle is 16 seconds. Aim for 4-5 cycles for maximum benefit.
          </p>
        </div>
      )}
    </div>
  );
}
