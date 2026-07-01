import React from 'react';

export default function ScoreGauge({ value, max = 100, color, size = 120, label, icon }) {
  const r = 46;
  const cx = 60, cy = 60;
  const circumference = 2 * Math.PI * r;
  const arc = (value / max) * circumference * 0.75; // 270deg arc

  return (
    <div style={{ textAlign: 'center', position: 'relative', display: 'inline-block' }}>
      <svg width={size + 20} height={size + 10} viewBox="0 0 120 110" style={{ display: 'block', margin: '0 auto' }}>
        {/* Background arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={9}
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={`${circumference * 0.125}`}
          strokeLinecap="round"
          style={{ transform: 'rotate(135deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
        {/* Value arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={9}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeDashoffset={`${circumference * 0.125}`}
          strokeLinecap="round"
          style={{
            transform: 'rotate(135deg)',
            transformOrigin: `${cx}px ${cy}px`,
            filter: `drop-shadow(0 0 6px ${color}88)`,
            transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)'
          }}
        />
        {/* Center text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="900" fill={color} fontFamily="Syne">{value}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="12" fill="var(--text-muted)">{icon}</text>
      </svg>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginTop: -4 }}>{label}</div>
    </div>
  );
}
