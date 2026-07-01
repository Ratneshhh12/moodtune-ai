import React from 'react';

export default function BarChart({ data, valueKey, color, maxVal, height = 140, labelKey = 'day', secondKey }) {
  const max = maxVal || Math.max(...data.map(d => d[valueKey])) || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, paddingTop: 8 }}>
      {data.map((d, i) => {
        const barH = Math.round((d[valueKey] / max) * (height - 28));
        const bar2H = secondKey ? Math.round((d[secondKey] / max) * (height - 28)) : 0;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1 }}>{d[valueKey]}</div>
            <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <div style={{
                flex: 1, height: barH, borderRadius: '4px 4px 0 0',
                background: `linear-gradient(180deg, ${color}, ${color}88)`,
                boxShadow: `0 -2px 8px ${color}44`,
                transition: 'height 0.6s cubic-bezier(0.4,0,0.2,1)',
                minHeight: 3
              }} />
              {secondKey && (
                <div style={{
                  flex: 1, height: bar2H, borderRadius: '4px 4px 0 0',
                  background: 'rgba(252,92,164,0.6)',
                  minHeight: 2
                }} />
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}
