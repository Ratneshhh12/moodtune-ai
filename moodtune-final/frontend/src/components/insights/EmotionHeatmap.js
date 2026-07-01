import React from 'react';
import { EMOTION_COLORS } from './constants';

export default function EmotionHeatmap({ heatmap }) {
  const hours = [0, 3, 6, 9, 12, 15, 18, 21];
  const hourLabel = h => {
    if (h === 0) return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };

  if (!heatmap || heatmap.length === 0) return null;

  return (
    <div>
      {/* Color legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Low</span>
        <div style={{
          height: 12, width: 200, borderRadius: 6,
          background: 'linear-gradient(90deg, var(--bg-secondary), #5cfcd888, #7c5cfc, #fc5ca0)'
        }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>High</span>
      </div>

      {/* Hour labels */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        <div style={{ width: 36 }} />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} style={{
            flex: 1, fontSize: 9, color: hours.includes(h) ? 'var(--text-muted)' : 'transparent',
            textAlign: 'center', overflow: 'hidden'
          }}>
            {hourLabel(h)}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      {heatmap.map((row, di) => (
        <div key={di} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
          <div style={{ width: 36, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', paddingRight: 6, flexShrink: 0 }}>
            {row.day}
          </div>
          {row.hours.map((cell, hi) => {
            const alpha = Math.round(cell.intensity * 255).toString(16).padStart(2, '0');
            const baseColor = EMOTION_COLORS[cell.emotion] || '#7c5cfc';
            return (
              <div
                key={hi}
                title={`${row.day} ${hourLabel(hi)}: ${cell.emotion} (${Math.round(cell.intensity * 100)}%)`}
                style={{
                  flex: 1, height: 22, borderRadius: 3,
                  background: cell.intensity < 0.05 ? 'var(--bg-secondary)' : `${baseColor}${alpha}`,
                  transition: 'transform 0.15s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              />
            );
          })}
        </div>
      ))}

      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        💡 Hover over any cell to see emotion &amp; intensity details
      </div>
    </div>
  );
}
