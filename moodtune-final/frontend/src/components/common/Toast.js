import React from 'react';
import { useApp } from '../../context/AppContext';

const icons = { success:'✓', error:'✕', info:'ℹ' };
const colors = { success:'var(--accent-teal)', error:'var(--accent-pink)', info:'var(--accent-primary)' };

export default function ToastContainer() {
  const { toasts } = useApp();
  return (
    <div style={{ position:'fixed',top:20,right:20,zIndex:9999,display:'flex',flexDirection:'column',gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background:'var(--bg-card)',
          border:'1px solid var(--border-color)',
          borderLeft:`3px solid ${colors[t.type] || colors.info}`,
          borderRadius:'var(--radius-md)',
          padding:'12px 16px',
          fontSize:14,
          display:'flex',alignItems:'center',gap:10,
          minWidth:260,
          boxShadow:'var(--shadow-card)',
          animation:'slideIn 0.3s ease',
          backdropFilter:'blur(20px)'
        }}>
          <span style={{ color:colors[t.type],fontWeight:600,fontSize:16 }}>{icons[t.type]}</span>
          <span style={{ color:'var(--text-primary)' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
