import React from 'react';

// Emotion color mapping
const EMOTION_THEMES = {
  happy: {
    color: '#fcb85c',
    colorDark: '#d98b1e',
    bgStart: '#ffe3b3',
    bgEnd: '#fcb85c',
    emoji: '😄'
  },
  sad: {
    color: '#5c8cfc',
    colorDark: '#1e54d9',
    bgStart: '#b3cbff',
    bgEnd: '#5c8cfc',
    emoji: '😢'
  },
  angry: {
    color: '#fc5ca0',
    colorDark: '#d91e6b',
    bgStart: '#ffb3d1',
    bgEnd: '#fc5ca0',
    emoji: '😠'
  },
  neutral: {
    color: '#9090a8',
    colorDark: '#5e5e75',
    bgStart: '#d2d2dc',
    bgEnd: '#9090a8',
    emoji: '😐'
  },
  surprised: {
    color: '#5cfcd8',
    colorDark: '#1ed9af',
    bgStart: '#b3fff0',
    bgEnd: '#5cfcd8',
    emoji: '😲'
  },
  fearful: {
    color: '#7c5cfc',
    colorDark: '#441ed9',
    bgStart: '#cbb3ff',
    bgEnd: '#7c5cfc',
    emoji: '😨'
  },
  disgusted: {
    color: '#a3fc5c',
    colorDark: '#75d91e',
    bgStart: '#e3ffb3',
    bgEnd: '#a3fc5c',
    emoji: '🤢'
  }
};

const DEFAULT_THEME = EMOTION_THEMES.neutral;

// Deterministic seed generation based on user and date
const getSeed = (userId, dateStr) => {
  const str = `${userId || 0}_${dateStr || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

// Seeded random number generator
const makeRandom = (seed) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

export default function MoodAvatar({ user, mood, size = 40, style = {} }) {
  // Determine active mood/emotion
  const activeMood = (mood || user?.mood_info?.mood || user?.mood || 'neutral').toLowerCase();
  const theme = EMOTION_THEMES[activeMood] || DEFAULT_THEME;
  const avatarStyle = user?.avatar_style || 'emoji'; // 'emoji', 'robot', 'shapes'

  // Seed with user ID and today's date
  const todayStr = new Date().toISOString().split('T')[0];
  const seed = getSeed(user?.id || 99, todayStr);
  const rand = makeRandom(seed);

  // Generate deterministic variations
  const gradientAngle = Math.floor(rand() * 360);
  const accessoryType = Math.floor(rand() * 5); // 0: none, 1: headphones, 2: crown, 3: glasses, 4: sparkle
  const secondaryColorHue = (Math.floor(rand() * 360));
  const shapesRotation = Math.floor(rand() * 360);

  // Style attributes
  const avatarId = `mood-avatar-${user?.id || 'guest'}-${activeMood}`;
  
  // Animation classes embedded in SVG
  const inlineStyles = `
    .ma-float-${avatarId} { animation: maFloat 4s ease-in-out infinite; transform-origin: center; }
    .ma-pulse-${avatarId} { animation: maPulse 2.5s ease-in-out infinite; }
    .ma-blink-${avatarId} { animation: maBlink 5s ease-in-out infinite; transform-origin: 40px 38px; }
    .ma-blink2-${avatarId} { animation: maBlink 5s ease-in-out infinite; transform-origin: 40px 38px; }
    .ma-rotate-${avatarId} { animation: maRotate 12s linear infinite; transform-origin: center; }
    .ma-shake-${avatarId} { animation: maShake 0.5s ease-in-out infinite alternate; transform-origin: center; }
    
    @keyframes maFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-4px); }
    }
    @keyframes maPulse {
      0%, 100% { opacity: 0.65; transform: scale(1); }
      50% { opacity: 0.95; transform: scale(1.03); }
    }
    @keyframes maBlink {
      0%, 90%, 100% { transform: scaleY(1); }
      95% { transform: scaleY(0.05); }
    }
    @keyframes maRotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes maShake {
      0% { transform: translate(1px, 1px) rotate(0deg); }
      100% { transform: translate(-1px, -1px) rotate(1deg); }
    }
  `;

  // Render different SVG contents based on style choice
  const renderAvatarContent = () => {
    switch (avatarStyle) {
      case 'robot':
        return renderRobot();
      case 'shapes':
        return renderShapes();
      case 'emoji':
      default:
        return renderEmoji();
    }
  };

  // EMOJI AVATAR STYLE
  const renderEmoji = () => {
    // Face details by emotion
    let mouthPath = "M 30 52 Q 40 60 50 52"; // default happy smile
    let mouthFill = "none";
    let mouthStroke = "#4a3b2c";
    let eyes = (
      <>
        <circle cx="28" cy="38" r="3.5" fill="#4a3b2c" className={`ma-blink-${avatarId}`} />
        <circle cx="52" cy="38" r="3.5" fill="#4a3b2c" className={`ma-blink-${avatarId}`} />
      </>
    );
    let eyebrows = (
      <>
        <path d="M 24 32 Q 28 29 32 32" stroke="#4a3b2c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M 48 32 Q 52 29 56 32" stroke="#4a3b2c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </>
    );
    let cheeks = <circle cx="20" cy="44" r="4" fill="#ff7da0" opacity="0.4" />;

    if (activeMood === 'happy') {
      mouthPath = "M 28 48 Q 40 62 52 48 Z"; // wide open mouth
      mouthFill = "#e04b72";
      mouthStroke = "none";
      eyes = (
        <>
          <path d="M 23 40 Q 28 32 33 40" stroke="#4a3b2c" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M 47 40 Q 52 32 57 40" stroke="#4a3b2c" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </>
      );
      eyebrows = (
        <>
          <path d="M 22 31 Q 28 26 34 30" stroke="#4a3b2c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 46 30 Q 52 26 58 31" stroke="#4a3b2c" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      );
      cheeks = (
        <>
          <circle cx="21" cy="44" r="5.5" fill="#ff5383" opacity="0.5" />
          <circle cx="59" cy="44" r="5.5" fill="#ff5383" opacity="0.5" />
        </>
      );
    } else if (activeMood === 'sad') {
      mouthPath = "M 32 55 Q 40 47 48 55"; // frown
      mouthFill = "none";
      mouthStroke = "#334155";
      eyes = (
        <>
          <circle cx="28" cy="38" r="3.5" fill="#334155" className={`ma-blink-${avatarId}`} />
          <circle cx="52" cy="38" r="3.5" fill="#334155" className={`ma-blink-${avatarId}`} />
          {/* Tear drop */}
          <path d="M 52 43 C 52 46 50 48 48.5 48 C 47 48 46.5 46 48.5 43 Z" fill="#38bdf8" />
        </>
      );
      eyebrows = (
        <>
          <path d="M 22 35 Q 28 30 34 34" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 46 34 Q 52 30 58 35" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      );
      cheeks = null;
    } else if (activeMood === 'angry') {
      mouthPath = "M 32 54 Q 40 48 48 54"; // angry mouth
      mouthFill = "none";
      mouthStroke = "#581c2f";
      eyes = (
        <>
          <circle cx="28" cy="39" r="3.5" fill="#581c2f" />
          <circle cx="52" cy="39" r="3.5" fill="#581c2f" />
        </>
      );
      eyebrows = (
        <>
          <path d="M 22 30 L 34 37" stroke="#581c2f" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 58 30 L 46 37" stroke="#581c2f" strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
      cheeks = null;
    } else if (activeMood === 'surprised') {
      mouthPath = "M 35 52 A 5 6 0 1 0 45 52 A 5 6 0 1 0 35 52 Z"; // gasp circle
      mouthFill = "#4a0404";
      mouthStroke = "none";
      eyes = (
        <>
          <circle cx="27" cy="38" r="4.5" fill="#1e293b" />
          <circle cx="53" cy="38" r="4.5" fill="#1e293b" />
        </>
      );
      eyebrows = (
        <>
          <path d="M 22 28 Q 28 21 34 28" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 46 28 Q 52 21 58 28" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      );
      cheeks = (
        <>
          <circle cx="21" cy="46" r="4" fill="#fc5ca0" opacity="0.3" />
          <circle cx="59" cy="46" r="4" fill="#fc5ca0" opacity="0.3" />
        </>
      );
    } else if (activeMood === 'fearful') {
      mouthPath = "M 32 54 Q 35 48 40 54 Q 45 48 48 54"; // trembling mouth
      mouthFill = "none";
      mouthStroke = "#1e1b4b";
      eyes = (
        <>
          <circle cx="28" cy="38" r="4.5" fill="#1e1b4b" />
          <circle cx="52" cy="38" r="4.5" fill="#1e1b4b" />
        </>
      );
      eyebrows = (
        <>
          <path d="M 22 31 Q 28 27 34 32" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 46 32 Q 52 27 58 31" stroke="#1e1b4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      );
      cheeks = null;
    } else if (activeMood === 'disgusted') {
      mouthPath = "M 32 52 Q 36 56 40 50 Q 44 54 48 50"; // wavy mouth
      mouthFill = "none";
      mouthStroke = "#1e3a1e";
      eyes = (
        <>
          <path d="M 24 35 L 32 39 M 32 35 L 24 39" stroke="#1e3a1e" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 48 35 L 56 39 M 56 35 L 48 39" stroke="#1e3a1e" strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
      eyebrows = (
        <>
          <path d="M 22 31 L 34 34" stroke="#1e3a1e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 58 31 L 46 34" stroke="#1e3a1e" strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
      cheeks = null;
    }

    return (
      <g className={`ma-float-${avatarId}`}>
        {/* Face circle */}
        <circle cx="40" cy="45" r="24" fill={theme.color} filter="url(#shadow-filter)" />
        <circle cx="40" cy="45" r="23.5" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

        {/* Blush Cheeks */}
        {cheeks}

        {/* Eyebrows */}
        {eyebrows}

        {/* Eyes */}
        {eyes}

        {/* Mouth */}
        <path d={mouthPath} fill={mouthFill} stroke={mouthStroke} strokeWidth="3" strokeLinecap="round" />

        {/* Dynamic accessory */}
        {renderAccessory(accessoryType)}
      </g>
    );
  };

  // RETRO ROBOT AVATAR STYLE
  const renderRobot = () => {
    let screenColor = 'rgba(0,0,0,0.45)';
    let eyeContent = <rect x="25" y="36" width="6" height="6" rx="1" fill="#5cfcd8" className={`ma-pulse-${avatarId}`} />;
    let eyeContent2 = <rect x="49" y="36" width="6" height="6" rx="1" fill="#5cfcd8" className={`ma-pulse-${avatarId}`} />;
    let expression = <path d="M 33 48 L 47 48" stroke="#5cfcd8" strokeWidth="2" strokeLinecap="round" />;
    
    // Customize robot based on emotion
    if (activeMood === 'happy') {
      screenColor = 'rgba(92,252,216,0.1)';
      eyeContent = <path d="M 22 39 L 26 35 L 30 39" fill="none" stroke="#5cfcd8" strokeWidth="3" strokeLinecap="round" />;
      eyeContent2 = <path d="M 50 39 L 54 35 L 58 39" fill="none" stroke="#5cfcd8" strokeWidth="3" strokeLinecap="round" />;
      expression = <path d="M 32 45 Q 40 52 48 45" fill="none" stroke="#5cfcd8" strokeWidth="3" strokeLinecap="round" />;
    } else if (activeMood === 'sad') {
      screenColor = 'rgba(92,140,252,0.1)';
      eyeContent = <rect x="24" y="36" width="6" height="4" fill="#5c8cfc" />;
      eyeContent2 = <rect x="50" y="36" width="6" height="4" fill="#5c8cfc" />;
      expression = <path d="M 34 49 Q 40 45 46 49" fill="none" stroke="#5c8cfc" strokeWidth="2" strokeLinecap="round" />;
    } else if (activeMood === 'angry') {
      screenColor = 'rgba(252,92,160,0.1)';
      eyeContent = <path d="M 24 35 L 29 40" stroke="#fc5ca0" strokeWidth="3" strokeLinecap="round" />;
      eyeContent2 = <path d="M 56 35 L 51 40" stroke="#fc5ca0" strokeWidth="3" strokeLinecap="round" />;
      expression = <path d="M 34 48 L 46 48" stroke="#fc5ca0" strokeWidth="3" strokeLinecap="round" />;
    } else if (activeMood === 'surprised') {
      eyeContent = <circle cx="27" cy="38" r="4.5" fill="#5cfcd8" />;
      eyeContent2 = <circle cx="53" cy="38" r="4.5" fill="#5cfcd8" />;
      expression = <circle cx="40" cy="48" r="4.5" fill="none" stroke="#5cfcd8" strokeWidth="2.5" />;
    } else if (activeMood === 'fearful' || activeMood === 'disgusted') {
      screenColor = 'rgba(124,92,252,0.15)';
      eyeContent = <path d="M 24 35 L 30 41 M 30 35 L 24 41" stroke="#7c5cfc" strokeWidth="2.5" />;
      eyeContent2 = <path d="M 50 35 L 56 41 M 56 35 L 50 41" stroke="#7c5cfc" strokeWidth="2.5" />;
      expression = <path d="M 33 48 Q 40 53 47 48" fill="none" stroke="#7c5cfc" strokeWidth="2" />;
    }

    return (
      <g className={`ma-float-${avatarId}`} style={{ transform: 'translateY(2px)' }}>
        {/* Antenna */}
        <line x1="40" y1="23" x2="40" y2="15" stroke="var(--text-secondary)" strokeWidth="3.5" />
        <circle cx="40" cy="12" r="5" fill={theme.color} className={`ma-pulse-${avatarId}`} filter="url(#shadow-filter)" />
        
        {/* Ears */}
        <rect x="11" y="35" width="5" height="12" rx="2" fill="var(--text-secondary)" />
        <rect x="64" y="35" width="5" height="12" rx="2" fill="var(--text-secondary)" />

        {/* Head */}
        <rect x="15" y="22" width="50" height="38" rx="12" fill="#2d3047" stroke="var(--border-color)" strokeWidth="2" filter="url(#shadow-filter)" />
        
        {/* Screen */}
        <rect x="20" y="27" width="40" height="28" rx="8" fill={screenColor} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        
        {/* Expressions */}
        {eyeContent}
        {eyeContent2}
        {expression}
        
        {/* Neck / Body plate */}
        <path d="M 32 60 L 48 60 L 45 66 L 35 66 Z" fill="var(--text-secondary)" />
      </g>
    );
  };

  // ABSTRACT SHAPES AVATAR STYLE
  const renderShapes = () => {
    // Generates a beautiful glassmorphic visual mapping of abstract shapes
    return (
      <g className={`ma-rotate-${avatarId}`}>
        {/* Base shape */}
        <rect 
          x="18" y="18" width="44" height="44" rx="14" 
          fill={`hsl(${secondaryColorHue}, 75%, 65%)`} 
          opacity="0.3" 
          transform={`rotate(${shapesRotation}, 40, 40)`} 
        />
        
        {/* Middle glassmorphic shape */}
        <circle 
          cx="40" cy="40" r="18" 
          fill={`hsl(${secondaryColorHue + 120 % 360}, 80%, 60%)`} 
          opacity="0.55" 
          className={`ma-float-${avatarId}`}
        />
        
        {/* Core dynamic neon energy center */}
        <polygon 
          points="40,25 53,47 27,47" 
          fill={theme.color} 
          filter="url(#shadow-filter)" 
          transform={`rotate(${shapesRotation * -0.5}, 40, 40)`} 
          className={`ma-pulse-${avatarId}`}
        />

        {/* Overlay glass ring */}
        <circle 
          cx="40" cy="40" r="22" 
          fill="none" 
          stroke="rgba(255,255,255,0.3)" 
          strokeWidth="2" 
          style={{ backdropFilter: 'blur(3px)' }} 
        />
      </g>
    );
  };

  // Rendering deterministic accessories based on the daily seed
  const renderAccessory = (type) => {
    if (avatarStyle !== 'emoji') return null; // Accessories are for Emoji Style

    switch (type) {
      case 1: // Cyber Headphones
        return (
          <g style={{ opacity: 0.95 }} className={`ma-shake-${avatarId}`}>
            {/* Band */}
            <path d="M 17 40 Q 40 12 63 40" fill="none" stroke="#1e293b" strokeWidth="4.5" />
            {/* Left Ear */}
            <rect x="11" y="35" width="7" height="14" rx="3.5" fill={theme.colorDark} stroke="#1e293b" strokeWidth="2" />
            {/* Right Ear */}
            <rect x="62" y="35" width="7" height="14" rx="3.5" fill={theme.colorDark} stroke="#1e293b" strokeWidth="2" />
          </g>
        );
      case 2: // Floating Tiny Crown
        return (
          <g transform="translate(26, 8) scale(0.7)" className={`ma-float-${avatarId}`}>
            <polygon points="10,20 20,5 25,12 30,5 40,20" fill="#fbbf24" stroke="#d97706" strokeWidth="2.5" />
            <circle cx="10" cy="20" r="1.5" fill="#d97706" />
            <circle cx="20" cy="4" r="2.5" fill="#f59e0b" filter="url(#shadow-filter)" />
            <circle cx="30" cy="4" r="2.5" fill="#f59e0b" filter="url(#shadow-filter)" />
            <circle cx="40" cy="20" r="1.5" fill="#d97706" />
          </g>
        );
      case 3: // Cool Glasses
        return (
          <g transform="translate(19, 31) scale(0.95)">
            {/* Frame */}
            <rect x="1" y="3" width="18" height="11" rx="4" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <rect x="23" y="3" width="18" height="11" rx="4" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            {/* Bridge */}
            <rect x="18" y="7" width="6" height="3" fill="rgba(15, 23, 42, 0.9)" />
            {/* Reflective lines */}
            <line x1="4" y1="11" x2="9" y2="6" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            <line x1="26" y1="11" x2="31" y2="6" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          </g>
        );
      case 4: // Star / Sparkle
        return (
          <g transform="translate(56, 16) scale(0.75)" className={`ma-pulse-${avatarId}`}>
            <path d="M 10 0 L 13 7 L 20 10 L 13 13 L 10 20 L 7 13 L 0 10 L 7 7 Z" fill="#fef08a" filter="url(#shadow-filter)" />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ 
      width: size, 
      height: size, 
      borderRadius: '50%', 
      overflow: 'hidden', 
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      background: avatarStyle === 'shapes' 
        ? 'var(--bg-secondary)' 
        : `linear-gradient(${gradientAngle}deg, ${theme.bgStart} 0%, ${theme.bgEnd} 100%)`,
      border: `2px solid ${theme.color}44`,
      boxShadow: `0 4px 12px ${theme.color}25`,
      ...style 
    }}>
      <svg 
        viewBox="0 0 80 80" 
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          {/* Custom style definition inside SVG */}
          <style>{inlineStyles}</style>

          {/* Dropshadow filter */}
          <filter id="shadow-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Dynamic Avatar Layout */}
        {renderAvatarContent()}
      </svg>
    </div>
  );
}
