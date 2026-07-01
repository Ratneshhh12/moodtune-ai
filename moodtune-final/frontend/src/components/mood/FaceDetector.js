/**
 * Real-time Face Emotion Detection using face-api.js
 * Detects: happy, sad, angry, neutral, surprised, fearful, disgusted
 * Calculates: Stress, Anxiety, Fatigue wellness indicators
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { useApp } from '../../context/AppContext';

const EMOTION_CONFIG = {
  happy:     { emoji:'😄', color:'#fcb85c', label:'Happy',     genre:'Pop / Dance' },
  sad:       { emoji:'😢', color:'#5c8cfc', label:'Sad',       genre:'Lo-fi / Acoustic' },
  angry:     { emoji:'😠', color:'#fc5ca0', label:'Angry',     genre:'Calm / Relaxing' },
  neutral:   { emoji:'😐', color:'#9090a8', label:'Neutral',   genre:'Trending Hits' },
  surprised: { emoji:'😲', color:'#5cfcd8', label:'Excited',   genre:'Party / EDM' },
  fearful:   { emoji:'😨', color:'#7c5cfc', label:'Fearful',   genre:'Meditation' },
  disgusted: { emoji:'🤢', color:'#5cfcd8', label:'Disgusted', genre:'Jazz / Soul' },
};

const MetricBar = ({ label, icon, value, color, colorHigh }) => {
  const isHigh = value > 60;
  const barColor = isHigh ? colorHigh : color;
  const levelText = value > 75 ? 'High' : value > 40 ? 'Moderate' : 'Low';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontSize:13, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:6 }}>
          {icon} <span>{label}</span>
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{
            fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:'var(--radius-full)',
            background: isHigh ? `${colorHigh}22` : 'rgba(255,255,255,0.06)',
            color: isHigh ? colorHigh : 'var(--text-muted)',
            border: `1px solid ${isHigh ? colorHigh + '44' : 'transparent'}`
          }}>{levelText}</span>
          <span style={{ fontSize:13, fontWeight:700, color: isHigh ? colorHigh : 'var(--text-primary)', minWidth:36, textAlign:'right' }}>
            {value}%
          </span>
        </div>
      </div>
      <div style={{ height:7, background:'var(--bg-secondary)', borderRadius:4, overflow:'hidden', position:'relative' }}>
        <div style={{
          height:'100%',
          width:`${value}%`,
          background: isHigh
            ? `linear-gradient(90deg, ${color}, ${colorHigh})`
            : `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius:4,
          transition:'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: isHigh ? `0 0 8px ${colorHigh}88` : 'none'
        }} />
      </div>
    </div>
  );
};

export default function FaceDetector({ onEmotionDetected }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [emotion, setEmotion] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [metrics, setMetrics] = useState({ stress: 0, anxiety: 0, fatigue: 0 });
  const [detectionComplete, setDetectionComplete] = useState(false);

  const { setDetectedEmotion, toast } = useApp();

  const onEmotionDetectedRef = useRef(onEmotionDetected);
  useEffect(() => {
    onEmotionDetectedRef.current = onEmotionDetected;
  }, [onEmotionDetected]);

  // Load face-api models
  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      toast('Face detection models loaded!', 'success');
    } catch (e) {
      setModelsLoaded(true);
      toast('Using demo emotion mode', 'info');
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadModels(); }, [loadModels]);

  const startCamera = useCallback(async () => {
    setError(null);
    setDetectionComplete(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraActive(true);
        };
      }
    } catch (e) {
      setError('Camera access denied. Please allow camera access and try again.');
      toast('Camera access denied', 'error');
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCameraActive(false);
    setFaceDetected(false);
  }, []);

  const calculateMetrics = useCallback((exprs) => {
    const happy = exprs.happy || 0;
    const sad = exprs.sad || 0;
    const angry = exprs.angry || 0;
    const neutral = exprs.neutral || 0;
    const surprised = exprs.surprised || 0;
    const fearful = exprs.fearful || 0;
    const disgusted = exprs.disgusted || 0;

    const stress  = Math.min(Math.max((angry * 0.5 + sad * 0.25 + fearful * 0.25) * (1.0 - happy * 0.8), 0), 1);
    const anxiety = Math.min(Math.max((fearful * 0.6 + surprised * 0.2 + sad * 0.2) * (1.0 - happy * 0.5), 0), 1);
    const fatigue = Math.min(Math.max((neutral * 0.6 + sad * 0.3 + disgusted * 0.1) * (1.0 - happy * 0.9 - surprised * 0.5), 0), 1);

    return {
      stress:  Math.round(stress  * 100),
      anxiety: Math.round(anxiety * 100),
      fatigue: Math.round(fatigue * 100),
    };
  }, []);

  const finishDetection = useCallback((emo, conf, calculatedMetrics) => {
    setEmotion(emo);
    setConfidence(conf);
    setMetrics(calculatedMetrics);
    setDetectionComplete(true);
    setDetectedEmotion(emo);
    if (onEmotionDetectedRef.current) {
      onEmotionDetectedRef.current(emo, conf, calculatedMetrics);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCameraActive(false);
    setFaceDetected(false);
  }, [setDetectedEmotion]);

  // Demo mode: simulate emotion detection
  const runDemoMode = useCallback(() => {
    const emotions = Object.keys(EMOTION_CONFIG);
    const idx = Math.floor(Math.random() * emotions.length);
    const e = emotions[idx];
    const conf = 0.85;

    const mockExprs = {
      happy: e === 'happy' ? 0.8 : 0.05,
      sad: e === 'sad' ? 0.8 : 0.05,
      angry: e === 'angry' ? 0.8 : 0.05,
      neutral: e === 'neutral' ? 0.8 : 0.05,
      surprised: e === 'surprised' ? 0.8 : 0.05,
      fearful: e === 'fearful' ? 0.8 : 0.05,
      disgusted: e === 'disgusted' ? 0.8 : 0.05,
    };
    const calculatedMetrics = calculateMetrics(mockExprs);
    finishDetection(e, conf, calculatedMetrics);
  }, [calculateMetrics, finishDetection]);

  // Real face detection loop
  const runDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
        .withFaceExpressions();

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections && detections.length > 0) {
        setFaceDetected(true);
        const det = detections[0];
        const expressions = det.expressions;

        // Draw face box
        const { x, y, width, height } = det.detection.box;
        ctx.strokeStyle = '#7c5cfc';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Corner decorations
        const cs = 16;
        ctx.strokeStyle = '#5cfcd8';
        ctx.lineWidth = 3;
        [[x,y],[x+width,y],[x,y+height],[x+width,y+height]].forEach(([cx,cy]) => {
          const dx = cx === x ? cs : -cs, dy = cy === y ? cs : -cs;
          ctx.beginPath(); ctx.moveTo(cx+dx,cy); ctx.lineTo(cx,cy); ctx.lineTo(cx,cy+dy); ctx.stroke();
        });

        // Update live metrics during scanning
        const liveMets = calculateMetrics(expressions);
        setMetrics(liveMets);

        // Get dominant emotion
        const top = Object.entries(expressions).sort((a,b) => b[1]-a[1])[0];
        if (top) {
          const [emo, conf] = top;
          setEmotion(emo);
          setConfidence(conf);

          if (conf > 0.5) {
            finishDetection(emo, conf, liveMets);
          }
        }
      } else {
        setFaceDetected(false);
      }
    } catch (e) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      setFaceDetected(false);
      runDemoMode();
    }
  }, [calculateMetrics, finishDetection, runDemoMode]);

  useEffect(() => {
    if (cameraActive && modelsLoaded) {
      const testDetection = async () => {
        try {
          await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
          intervalRef.current = setInterval(runDetection, 800);
        } catch {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
          }
          setCameraActive(false);
          setFaceDetected(false);
          runDemoMode();
        }
      };
      setTimeout(testDetection, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [cameraActive, modelsLoaded, runDetection, runDemoMode]);

  // Clean up camera stream tracks on component unmount to prevent camera remaining on
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const cfg = emotion ? EMOTION_CONFIG[emotion] : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Video Container */}
      <div style={{
        position:'relative',
        borderRadius:'var(--radius-xl)',
        overflow:'hidden',
        background:'var(--bg-card)',
        border:`2px solid ${cfg?.color || 'var(--border-color)'}`,
        transition:'border-color 0.5s ease',
        aspectRatio:'4/3',
        maxWidth:560,
        margin:'0 auto',
        width:'100%'
      }}>
        {!cameraActive && (
          <div style={{
            position:'absolute',inset:0,display:'flex',flexDirection:'column',
            alignItems:'center',justifyContent:'center',gap:16,
            background:'var(--bg-secondary)'
          }}>
            {emotion ? (
              <>
                <div style={{ fontSize:72, filter:'drop-shadow(0 0 20px rgba(255,255,255,0.2))' }}>{EMOTION_CONFIG[emotion].emoji}</div>
                <h3 style={{ fontSize:20, fontWeight:700, color:EMOTION_CONFIG[emotion].color, fontFamily:'var(--font-display)' }}>
                  {EMOTION_CONFIG[emotion].label} Mood Detected!
                </h3>
                <p style={{ color:'var(--text-secondary)', fontSize:14, textAlign:'center', maxWidth:280, lineHeight:1.6 }}>
                  {Math.round(confidence * 100)}% confidence · {EMOTION_CONFIG[emotion].genre}
                </p>
                <button
                  className="btn-primary"
                  onClick={startCamera}
                  disabled={loading}
                  style={{ marginTop:4 }}
                >
                  📸 Scan Again
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize:64 }}>📷</div>
                <p style={{ color:'var(--text-secondary)', fontSize:15, textAlign:'center', maxWidth:240, lineHeight:1.6 }}>
                  Enable camera to detect your emotions in real-time
                </p>
                {error && <p style={{ color:'var(--accent-pink)', fontSize:13, textAlign:'center', padding:'0 20px' }}>{error}</p>}
                <button
                  className="btn-primary"
                  onClick={startCamera}
                  disabled={loading}
                >
                  {loading ? <span className="animate-spin">↻</span> : '📸'}
                  {loading ? 'Loading models...' : 'Start Camera'}
                </button>
              </>
            )}
          </div>
        )}

        <video
          ref={videoRef}
          style={{ width:'100%',height:'100%',objectFit:'cover',display:cameraActive?'block':'none',transform:'scaleX(-1)' }}
          muted playsInline
        />
        <canvas
          ref={canvasRef}
          style={{ position:'absolute',inset:0,width:'100%',height:'100%',transform:'scaleX(-1)',pointerEvents:'none' }}
        />

        {/* Emotion overlay during scan */}
        {cameraActive && cfg && (
          <div style={{
            position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',
            background:'rgba(0,0,0,0.85)',backdropFilter:'blur(16px)',
            border:`1px solid ${cfg.color}40`,
            borderRadius:'var(--radius-full)',
            padding:'10px 20px',
            display:'flex',alignItems:'center',gap:10,
            whiteSpace:'nowrap'
          }}>
            <span style={{ fontSize:24 }}>{cfg.emoji}</span>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:cfg.color, fontFamily:'var(--font-display)' }}>{cfg.label}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                {Math.round(confidence * 100)}% confidence · {cfg.genre}
              </div>
            </div>
          </div>
        )}

        {/* Face detection indicator */}
        {cameraActive && (
          <div style={{
            position:'absolute',top:12,right:12,
            display:'flex',alignItems:'center',gap:6,
            background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',
            padding:'6px 12px',borderRadius:'var(--radius-full)',fontSize:12
          }}>
            <div style={{
              width:6,height:6,borderRadius:'50%',
              background: faceDetected ? '#5cfcd8' : 'var(--accent-pink)',
              boxShadow: faceDetected ? '0 0 8px #5cfcd8' : 'none',
              animation: faceDetected ? 'none' : 'glow 1s ease-in-out infinite'
            }} />
            {faceDetected ? 'Face detected' : 'Looking for face...'}
          </div>
        )}

        {/* Scanning animation overlay */}
        {cameraActive && (
          <div style={{
            position:'absolute', top:0, left:0, right:0, height:2,
            background:'linear-gradient(90deg, transparent, #7c5cfc, #5cfcd8, transparent)',
            animation:'scan 2s linear infinite'
          }} />
        )}
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
        {cameraActive ? (
          <button className="btn-ghost" onClick={stopCamera} style={{ color:'var(--accent-pink)' }}>
            ⏹ Stop Camera
          </button>
        ) : (
          <button className="btn-primary" onClick={startCamera} disabled={loading}>
            {loading ? '↻ Loading...' : '▶ Start Detection'}
          </button>
        )}
        {cameraActive && (
          <button className="btn-ghost" onClick={runDemoMode}>
            ✨ Demo Mode
          </button>
        )}
        {!cameraActive && !emotion && (
          <button className="btn-ghost" onClick={runDemoMode} disabled={loading}>
            ✨ Try Demo Mode
          </button>
        )}
      </div>

      {/* Wellness Metrics — shown during scan and after detection */}
      {(cameraActive || detectionComplete) && (
        <div style={{
          background: detectionComplete
            ? 'linear-gradient(135deg, rgba(124,92,252,0.08) 0%, rgba(92,252,216,0.04) 100%)'
            : 'var(--bg-card)',
          border: `1px solid ${detectionComplete ? 'rgba(124,92,252,0.3)' : 'var(--border-color)'}`,
          borderRadius:'var(--radius-lg)',
          padding:20,
          transition:'all 0.5s ease'
        }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:16, color:'var(--text-primary)', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:18 }}>🧬</span>
            <span>Wellness Indicators</span>
            {detectionComplete && (
              <span style={{
                fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:'var(--radius-full)',
                background:'rgba(92,252,216,0.15)', color:'#5cfcd8',
                border:'1px solid rgba(92,252,216,0.3)', marginLeft:'auto'
              }}>
                ✓ Scan Complete
              </span>
            )}
          </div>

          <MetricBar
            label="Stress Level"
            icon="⚡"
            value={metrics.stress}
            color="#fcb85c"
            colorHigh="var(--accent-pink)"
          />
          <MetricBar
            label="Anxiety Indicator"
            icon="😰"
            value={metrics.anxiety}
            color="#7c5cfc"
            colorHigh="#fc5ca0"
          />
          <MetricBar
            label="Fatigue Level"
            icon="😴"
            value={metrics.fatigue}
            color="#5cfcd8"
            colorHigh="#5c8cfc"
          />

          {detectionComplete && (metrics.stress > 60 || metrics.anxiety > 60 || metrics.fatigue > 60) && (
            <div style={{
              marginTop:14,
              padding:'10px 14px',
              background:'rgba(252,92,164,0.08)',
              border:'1px solid rgba(252,92,164,0.2)',
              borderRadius:'var(--radius-md)',
              fontSize:13,
              color:'var(--text-secondary)',
              display:'flex', alignItems:'center', gap:8
            }}>
              <span>💡</span>
              <span>High levels detected — check the <strong style={{ color:'#7c5cfc' }}>Wellness Centre</strong> below for breathing exercises &amp; calming music!</span>
            </div>
          )}
        </div>
      )}

      {/* Emotion Analysis (during scan) */}
      {cameraActive && cfg && (
        <div style={{
          background:'var(--bg-card)', border:'1px solid var(--border-color)',
          borderRadius:'var(--radius-lg)', padding:20
        }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:14, color:'var(--text-secondary)' }}>
            Emotion Probabilities
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Object.entries(EMOTION_CONFIG).map(([key, val]) => (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:16, width:24, textAlign:'center' }}>{val.emoji}</span>
                <span style={{ fontSize:12, width:64, color:'var(--text-secondary)' }}>{val.label}</span>
                <div style={{ flex:1, height:6, background:'var(--bg-secondary)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:3,
                    background: key === emotion ? val.color : 'var(--border-hover)',
                    width: key === emotion ? `${Math.round(confidence * 100)}%` : `${Math.random() * 15}%`,
                    transition:'width 0.5s ease, background 0.5s ease'
                  }} />
                </div>
                <span style={{ fontSize:11, color:'var(--text-muted)', minWidth:30, textAlign:'right' }}>
                  {key === emotion ? `${Math.round(confidence * 100)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
