import { motion, useMotionValue, AnimatePresence, useTransform, animate } from 'framer-motion';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  ZoomIn, ZoomOut, Focus, Mic, Feather, Brush, Sparkles, Cloud, Flower2, Waves, Sun, Droplet, Heart, Info, Volume2, VolumeX
} from 'lucide-react';
import type { Thought, ThoughtResponse } from '../App';
import { Lantern } from './Lantern';
import { projectId, publicAnonKey } from '../../supabase/info';

const ambientAudioUrl = "https://media.vocaroo.com/mp3/12t9rzFa7Lt4";

const EMOTION_ICONS: Record<string, React.ElementType> = {
  lonely: Cloud,
  grateful: Flower2,
  anxious: Waves,
  hopeful: Sun,
  grieving: Droplet,
  joyful: Sparkles,
};
import { STICKER_DATA } from './stickersData';

interface MainSpaceProps {
  thoughts: Thought[];
  onInputClick: () => void;
  onThoughtClick: (thought: Thought) => void;
  onReplyClick: (thought: Thought, reply: ThoughtResponse) => void;
  onHistoryClick: () => void;
  onThoughtMove: (id: string, x: number, y: number) => void;
  aiGlowThoughtId: string | null;
  voiceCount: number;
  panToTarget: { x: number; y: number } | null;
  onPanComplete: () => void;
  tutorialStep?: 'none' | 'hud' | 'star' | 'reply' | 'complete';
  setTutorialStep?: (step: 'none' | 'hud' | 'star' | 'reply' | 'complete') => void;
  onTriggerPanToStar?: () => void;
}

// Ambient glows for dark theme - deep colors, static for max performance
const AMBIENT_GLOWS = [
  { left: '15%', top: '20%', width: 800, height: 700, color: 'rgba(100, 50, 150, 0.08)' },
  { left: '75%', top: '65%', width: 900, height: 800, color: 'rgba(214, 106, 62, 0.06)' },
  { left: '80%', top: '15%', width: 600, height: 550, color: 'rgba(50, 100, 200, 0.05)' },
  { left: '22%', top: '76%', width: 700, height: 600, color: 'rgba(214, 106, 62, 0.07)' },
];

const EMOJI_TO_ICON: Record<string, string> = {
  '🤍': 'sticker_heart',
  'Heart': 'sticker_heart',
  '✨': 'sticker_sparkle',
  'Sparkles': 'sticker_sparkle',
  '🌙': 'sticker_moon',
  'Moon': 'sticker_moon',
  '⭐': 'sticker_star',
  'Star': 'sticker_star',
  '🌿': 'sticker_leaf',
  'Leaf': 'sticker_leaf',
  '🤗': 'sticker_hand',
  'Smile': 'sticker_hand',
  '🫂': 'sticker_hug',
  'HeartHandshake': 'sticker_hug',
  '🕯️': 'sticker_candle',
  'Flame': 'sticker_candle',
  '🐚': 'sticker_shell',
  'Waves': 'sticker_shell',
  '💧': 'sticker_drop',
  'Droplet': 'sticker_drop',
  '☁️': 'sticker_cloud',
  'Cloud': 'sticker_cloud',
  '🌸': 'sticker_flower',
  'Flower2': 'sticker_flower',
  '☀️': 'sticker_sun',
  'Sun': 'sticker_sun',
  '🎵': 'sticker_note',
  'Music': 'sticker_note',
  '🌺': 'sticker_flower',
  'Flower': 'sticker_flower',
};

function StickerIcon({ nameOrEmoji, size = 16, className }: { nameOrEmoji: string; size?: number; className?: string }) {
  const iconName = EMOJI_TO_ICON[nameOrEmoji] || nameOrEmoji;
  
  if (STICKER_DATA[iconName]) {
    return (
      <img
        src={STICKER_DATA[iconName]}
        alt={iconName}
        className={className}
        style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }}
      />
    );
  }
  return <span className={className} style={{ fontSize: `${size}px` }}>{nameOrEmoji}</span>;
}

const floatAnimationStyles = `
  @keyframes float-bob {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  .animate-float-bob {
    animation: float-bob var(--float-duration, 5s) ease-in-out infinite;
    animation-delay: var(--float-delay, 0s);
    will-change: transform;
  }
  @keyframes nebula-flow-1 {
    0%, 100% { transform: translate(-30%, -35%) scale(1) rotate(0deg); opacity: 0.65; }
    50% { transform: translate(-20%, -25%) scale(1.12) rotate(180deg); opacity: 0.85; }
  }
  @keyframes nebula-flow-2 {
    0%, 100% { transform: translate(-65%, -60%) scale(1.1) rotate(0deg); opacity: 0.55; }
    50% { transform: translate(-75%, -70%) scale(0.95) rotate(-180deg); opacity: 0.75; }
  }
  @keyframes nebula-flow-3 {
    0%, 100% { transform: translate(-40%, -50%) scale(0.9) rotate(0deg); opacity: 0.5; }
    50% { transform: translate(-50%, -40%) scale(1.12) rotate(180deg); opacity: 0.7; }
  }
  .animate-nebula-1 {
    animation: nebula-flow-1 32s ease-in-out infinite;
    will-change: transform, opacity;
  }
  .animate-nebula-2 {
    animation: nebula-flow-2 40s ease-in-out infinite;
    will-change: transform, opacity;
  }
  .animate-nebula-3 {
    animation: nebula-flow-3 26s ease-in-out infinite;
    will-change: transform, opacity;
  }
  @keyframes star-twinkle {
    0%, 100% { opacity: 0.25; transform: scale(0.8) rotate(0deg); }
    50% { opacity: 1; transform: scale(1.15) rotate(45deg); }
  }
  .animate-twinkle {
    animation: star-twinkle var(--twinkle-duration, 4s) ease-in-out infinite;
    animation-delay: var(--twinkle-delay, 0s);
    will-change: opacity, transform;
  }
  @keyframes shooting-star-flow {
    0% { transform: translate(0, 0) rotate(-35deg) scaleX(0); opacity: 0; }
    1% { opacity: 1; }
    4% { transform: translate(-300px, 210px) rotate(-35deg) scaleX(1); opacity: 1; }
    8% { transform: translate(-600px, 420px) rotate(-35deg) scaleX(0.5); opacity: 0; }
    100% { transform: translate(-600px, 420px) rotate(-35deg) scaleX(0); opacity: 0; }
  }
  .animate-shooting-star {
    position: absolute;
    height: 1.5px;
    background: linear-gradient(90deg, #ffffff 0%, rgba(255,252,245,0.6) 40%, rgba(255,255,255,0) 100%);
    opacity: 0;
    animation: shooting-star-flow var(--duration, 16s) cubic-bezier(0.16, 1, 0.3, 1) infinite;
    animation-delay: var(--delay, 0s);
    will-change: transform, opacity;
  }
  @keyframes beam-flow {
    to {
      stroke-dashoffset: -24;
    }
  }
  .animate-beam {
    stroke-dasharray: 8 4;
    animation: beam-flow 1.2s linear infinite;
    stroke-linecap: round;
  }
`;

function PinIcon({ rotation = -10 }: { rotation?: number }) {
  return (
    <div
      className="absolute flex items-center justify-center pointer-events-none"
      style={{ top: '-4px', right: '5px', width: '30px', height: '32px', transform: `rotate(${rotation}deg)` }}
    >
      <div className="relative w-[26px] h-[28px]">
        <svg className="block absolute inset-0 size-full drop-shadow-md" fill="none" viewBox="0 0 20 23">
          <ellipse cx="10.5" cy="18" fill="#000" fillOpacity="0.4" rx="4.5" ry="2" />
          <circle cx="10" cy="5" fill="#e6a47a" r="4" />
          <rect fill="#1a1a1a" fillOpacity="0.9" height="10" rx="1" width="2" x="9" y="7" />
          <circle cx="8" cy="3.5" fill="#fff" fillOpacity="0.9" r="1" />
        </svg>
      </div>
    </div>
  );
}

const ThoughtCard = React.memo(function ThoughtCard({
  thought, onClick, onReplyClick, onDragEnd, isGlowing, isHovered, scale, onHoverStart, onHoverEnd, tutorialStep = 'none'
}: {
  thought: Thought; onClick: () => void; onReplyClick: (reply: ThoughtResponse) => void; onDragEnd: (x: number, y: number) => void;
  isGlowing: boolean; isHovered: boolean; scale: number; onHoverStart: () => void; onHoverEnd: () => void;
  tutorialStep?: 'none' | 'hud' | 'star' | 'reply' | 'complete';
}) {
  const isWarm = thought.variant === 'warm';
  const isLight = thought.variant === 'light';
  const isTeal = thought.variant === 'teal';
  const isRose = thought.variant === 'rose';

  const hasResponses = thought.responses.length > 0;
  const maxResponses = thought.responses.slice(0, 8);

  const ageInHours = (new Date().getTime() - new Date(thought.timestamp).getTime()) / (1000 * 60 * 60);
  const targetOpacity = ageInHours > 20 ? Math.max(0.2, 1 - (ageInHours - 20) / 4) : 1;

  const charSum = thought.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const duration = 4 + (charSum % 3);
  const delay = -(charSum % 5);

  const cardRadius = "16px 4px 16px 4px";

  // Determine colors based on variant
  let cardClass = '';
  let hoverStyle = {};
  let radialGlowStyle = {};
  let starClass = '';
  let starFilter = '';
  let glowColor = '';

  if (isWarm) {
    cardClass = 'bg-[rgba(26,17,14,0.75)] border border-[rgba(214,106,62,0.25)] shadow-[0_16px_45px_-12px_rgba(214,106,62,0.2),_inset_0_1px_1px_rgba(255,255,255,0.06)]';
    hoverStyle = {
      boxShadow: '0 24px 60px -10px rgba(214,106,62,0.45), inset 0 1px 2px rgba(255,255,255,0.15)',
      background: 'rgba(38, 24, 20, 0.85)',
      borderColor: 'rgba(214,106,62,0.65)',
    };
    radialGlowStyle = { background: 'radial-gradient(circle at 30% 30%, rgba(214,106,62,0.12) 0%, transparent 60%)' };
    starClass = 'text-[#D66A3E]';
    starFilter = 'drop-shadow(0 0 4px rgba(214,106,62,0.8))';
    glowColor = 'rgba(214,106,62,0.6)';
  } else if (isLight) {
    cardClass = 'bg-[rgba(16,21,32,0.65)] border border-[rgba(100,150,255,0.2)] shadow-[0_16px_45px_-12px_rgba(100,150,255,0.15),_inset_0_1px_1px_rgba(255,255,255,0.06)]';
    hoverStyle = {
      boxShadow: '0 24px 60px -10px rgba(100,150,255,0.35), inset 0 1px 2px rgba(255,255,255,0.15)',
      background: 'rgba(23, 29, 43, 0.8)',
      borderColor: 'rgba(100,150,255,0.55)',
    };
    radialGlowStyle = { background: 'radial-gradient(circle at 30% 30%, rgba(100,150,255,0.08) 0%, transparent 60%)' };
    starClass = 'text-[#6496ff]';
    starFilter = 'drop-shadow(0 0 4px rgba(100,150,255,0.8))';
    glowColor = 'rgba(100,150,255,0.5)';
  } else if (isTeal) {
    cardClass = 'bg-[rgba(12,25,24,0.7)] border border-[rgba(13,255,210,0.2)] shadow-[0_16px_45px_-12px_rgba(13,255,210,0.15),_inset_0_1px_1px_rgba(255,255,255,0.06)]';
    hoverStyle = {
      boxShadow: '0 24px 60px -10px rgba(13,255,210,0.35), inset 0 1px 2px rgba(255,255,255,0.15)',
      background: 'rgba(17, 35, 33, 0.8)',
      borderColor: 'rgba(13,255,210,0.55)',
    };
    radialGlowStyle = { background: 'radial-gradient(circle at 30% 30%, rgba(13,255,210,0.08) 0%, transparent 60%)' };
    starClass = 'text-[#0dffd2]';
    starFilter = 'drop-shadow(0 0 4px rgba(13,255,210,0.8))';
    glowColor = 'rgba(13,255,210,0.5)';
  } else { // rose
    cardClass = 'bg-[rgba(26,15,22,0.7)] border border-[rgba(255,110,181,0.2)] shadow-[0_16px_45px_-12px_rgba(255,110,181,0.15),_inset_0_1px_1px_rgba(255,255,255,0.06)]';
    hoverStyle = {
      boxShadow: '0 24px 60px -10px rgba(255,110,181,0.35), inset 0 1px 2px rgba(255,255,255,0.15)',
      background: 'rgba(38, 20, 31, 0.8)',
      borderColor: 'rgba(255,110,181,0.55)',
    };
    radialGlowStyle = { background: 'radial-gradient(circle at 30% 30%, rgba(255,110,181,0.08) 0%, transparent 60%)' };
    starClass = 'text-[#ff6eb5]';
    starFilter = 'drop-shadow(0 0 4px rgba(255,110,181,0.8))';
    glowColor = 'rgba(255,110,181,0.5)';
  }

  const isTutorial = thought.id === 'thought-tutorial-1';

  return (
    <motion.div
      drag={!isTutorial}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        onDragEnd(thought.x + info.offset.x / scale, thought.y + info.offset.y / scale);
      }}
      className="absolute cursor-grab active:cursor-grabbing z-20"
      whileDrag={{ scale: 1.05, zIndex: 50 }}
      style={{ left: thought.x, top: thought.y, width: thought.width, rotate: thought.rotation }}
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      animate={{ opacity: targetOpacity, scale: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      onClick={(e) => {
        if (e.defaultPrevented) return;
        onClick();
      }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
    >
      {isTutorial && tutorialStep === 'star' && (
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[240px]">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[rgba(20,15,25,0.98)] backdrop-blur-xl border border-[rgba(214,106,62,0.4)] rounded-[16px] px-4 py-3 text-center shadow-[0_12px_40px_rgba(0,0,0,0.6),_0_0_20px_rgba(214,106,62,0.15)] relative animate-pulse"
          >
            <p className="text-[#f9f3eb] text-[13px] font-medium leading-relaxed" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
              Look, a floating ember. Click on the star to read it.
            </p>
            {/* Subtle arrow pointing down */}
            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[rgba(20,15,25,0.98)] border-r border-b border-[rgba(214,106,62,0.4)]" />
          </motion.div>
        </div>
      )}
      <div 
        className="relative w-full h-full animate-float-bob"
        style={{ '--float-duration': `${duration}s`, '--float-delay': `${delay}s` } as React.CSSProperties}
      >
        {hasResponses && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" style={{ width: 280, height: 280 }}>
            {/* Orbit Rings */}
            <motion.svg 
                className="absolute inset-0 size-full" 
                style={{ 
                  overflow: 'visible', 
                  filter: isHovered ? `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 20px ${glowColor})` : `drop-shadow(0 0 4px ${glowColor})` 
                }}
            >
                <motion.circle cx="140" cy="140" r="140" fill="none" stroke={glowColor} strokeWidth="1.5" strokeDasharray="4 8" opacity={isHovered ? 0.6 : 0.25} 
                  animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} style={{ originX: '140px', originY: '140px' }}
                />
                <circle cx="140" cy="140" r="115" fill="none" stroke={glowColor} strokeWidth="0.5" opacity={isHovered ? 0.3 : 0.1} />
                
                <AnimatePresence>
                  {isHovered && (
                    <motion.circle 
                      cx="140" cy="140" r="140" fill="none" stroke={glowColor} strokeWidth="2.5" 
                      strokeDasharray="20 40" strokeLinecap="round"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1, rotate: -360 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ rotate: { duration: 15, repeat: Infinity, ease: 'linear' }, default: { duration: 0.4 } }}
                      style={{ originX: '140px', originY: '140px' }}
                    />
                  )}
                </AnimatePresence>
            </motion.svg>

            {/* Orbiting Satellites */}
            <motion.div 
                className="absolute inset-0 size-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                style={{ originX: '140px', originY: '140px' }}
            >
                {maxResponses.map((res, i) => {
                  const angle = (i / maxResponses.length) * Math.PI * 2;
                  const radius = 140; // Orbit radius
                  const x = 140 + Math.cos(angle) * radius;
                  const y = 140 + Math.sin(angle) * radius;
                  
                  return (
                    <motion.div
                      key={res.id}
                      className="absolute flex items-center justify-center rounded-full bg-[rgba(10,5,15,0.85)] border border-[rgba(255,255,255,0.2)] backdrop-blur-md cursor-pointer pointer-events-auto"
                      style={{ 
                        left: x - 18, top: y - 18, width: 36, height: 36,
                        boxShadow: isHovered ? `0 0 15px ${glowColor}, inset 0 0 10px ${glowColor}` : `0 0 5px rgba(0,0,0,0.5)`,
                        transformOrigin: 'center center'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReplyClick(res);
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1, rotate: -360 }}
                      transition={{ 
                        scale: { type: 'spring', bounce: 0.5, duration: 0.6 },
                        opacity: { duration: 0.3 },
                        rotate: { duration: 30, repeat: Infinity, ease: 'linear' }
                      }}
                    >
                      {res.type === 'sticker' ? (
                        <StickerIcon nameOrEmoji={res.content} size={18} className="drop-shadow-md" />
                      ) : res.type === 'voice' ? (
                        <Mic size={16} className="text-[#f9f3eb] drop-shadow-md" />
                      ) : res.type === 'note' ? (
                        <Feather size={16} className="text-[#f9f3eb] drop-shadow-md" />
                      ) : res.type === 'drawing' ? (
                        <Brush size={16} className="text-[#f9f3eb] drop-shadow-md" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: glowColor, boxShadow: `0 0 8px ${glowColor}` }} />
                      )}
                    </motion.div>
                  );
                })}
            </motion.div>
          </div>
        )}
        {isGlowing && (
          <motion.div
            className="absolute inset-[-4px] pointer-events-none"
            style={{ borderRadius: cardRadius, skewX: -8 }}
            animate={{ 
              boxShadow: [
                `0 0 15px rgba(255,255,255,0)`, 
                `0 0 30px ${glowColor}`, 
                `0 0 15px rgba(255,255,255,0)`
              ] 
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        
        {isGlowing && (
          <motion.div
            className="absolute inset-[-20px] pointer-events-none"
            style={{ 
              borderRadius: cardRadius,
              skewX: -8,
              background: `radial-gradient(circle, ${glowColor.replace('0.5', '0.15').replace('0.6', '0.15')} 0%, transparent 70%)`
            }}
            animate={{
              background: [
                `radial-gradient(circle, ${glowColor.replace('0.5', '0.15').replace('0.6', '0.15')} 0%, transparent 70%)`,
                `radial-gradient(circle, ${glowColor.replace('0.5', '0.3').replace('0.6', '0.3')} 0%, transparent 70%)`,
                `radial-gradient(circle, ${glowColor.replace('0.5', '0.15').replace('0.6', '0.15')} 0%, transparent 70%)`,
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />
        )}

        <motion.div
          className={[
            'relative overflow-hidden px-6 py-6 pr-10 transition-all duration-300 backdrop-blur-md',
            cardClass
          ].join(' ')}
          style={{ 
            borderRadius: cardRadius,
            skewX: -8,
          }}
          whileHover={{
            scale: 1.025,
            y: -6,
            ...hoverStyle
          }}
        >
          {/* Radial Core Glow inside card */}
          <div 
            className="absolute inset-0 pointer-events-none z-0" 
            style={radialGlowStyle}
          />

            {/* Unskew Content wrapper to keep text/star upright */}
            <div style={{ skewX: 8 } as React.CSSProperties} className="relative z-10 flex flex-col items-center text-center max-w-[280px]">
              {/* Star Anchor (Vertex) */}
              <div className="absolute top-[-10px] right-[-10px] w-4 h-4 pointer-events-none">
                <svg viewBox="0 0 24 24" className={`${starClass} fill-current`} style={{ filter: starFilter }}>
                  <path d="M12,2 L14.5,9.5 L22,12 L14.5,14.5 L12,22 L9.5,14.5 L2,12 L9.5,9.5 Z" />
                </svg>
              </div>
              
              {thought.isExample && (
                <div className="mb-1.5 flex justify-center">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-[#a89e96]"
                    style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 600 }}
                  >
                    example
                  </span>
                </div>
              )}

              {thought.emotion && EMOTION_ICONS[thought.emotion] && (() => {
                const Icon = EMOTION_ICONS[thought.emotion];
                return (
                  <div className="text-[#8a7f79] opacity-60 mb-2 flex justify-center">
                    <Icon size={18} />
                  </div>
                );
              })()}
              
              <p className="text-[#f9f3eb] text-[18px] leading-[1.48] not-italic select-none whitespace-pre-wrap break-words [overflow-wrap:anywhere] line-clamp-5" style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 400, letterSpacing: '0.01em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {thought.text}
              </p>

            {thought.aiStatus === 'replying' && (
              <motion.div
                className="flex items-center justify-center gap-1.5 mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span
                  className="text-[#D66A3E] text-[11px] tracking-wide italic"
                  style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 500, textShadow: '0 0 8px rgba(214,106,62,0.4)' }}
                >
                  ✦ Ember is writing…
                </span>
              </motion.div>
            )}

            {isGlowing && thought.aiStatus !== 'replying' && (
              <motion.div className="flex justify-center mt-3" initial={{ opacity: 0 }} animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}>
                <span className="text-[#D66A3E]" style={{ fontFamily: "'Alegreya', serif", fontWeight: 700, fontSize: '10px', letterSpacing: '0.15em', textShadow: '0 0 10px rgba(214,106,62,0.5)' }}>
                  ✦ Ember
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
});


const STARS = Array.from({ length: 600 }, (_, i) => {
  // Simple seeded pseudo-random layout to keep it consistent
  const seed = i * 67.89;
  const random = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  const size = random(seed) < 0.12 ? 3 : random(seed + 1) < 0.45 ? 1 : 2; // 1px, 2px, or 3px
  return {
    id: i,
    left: `${random(seed + 2) * 12000 - 6000}px`, // Distribute widely from -6000px to 6000px
    top: `${random(seed + 3) * 12000 - 6000}px`,
    size,
    twinkleDuration: `${4 + random(seed + 4) * 5}s`,
    twinkleDelay: `${-random(seed + 5) * 6}s`,
  };
});


export function MainSpace({ thoughts, onInputClick, onThoughtClick, onReplyClick, onHistoryClick, onThoughtMove, aiGlowThoughtId, voiceCount, panToTarget, onPanComplete, tutorialStep = 'none', setTutorialStep, onTriggerPanToStar }: MainSpaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const [showHint, setShowHint] = useState(true);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [hoveredThoughtId, setHoveredThoughtId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'warm' | 'light'>('all');
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(true);
  const [ambientPlaying, setAmbientPlaying] = useState(true);
  const ambientPlayingRef = useRef(true);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync ref with state to avoid stale closures in window event handlers
  useEffect(() => {
    ambientPlayingRef.current = ambientPlaying;
  }, [ambientPlaying]);

  useEffect(() => {
    const audio = new Audio(ambientAudioUrl);
    audio.loop = true;
    audio.volume = 0.1; // Maximum lowest - 10% volume
    ambientAudioRef.current = audio;

    // Autoplay on mount
    audio.play().catch((err) => {
      console.warn("Autoplay blocked. Audio will play on first user interaction.", err);
    });

    // Fallback: resume playing on first user click or keypress if blocked
    const handleFirstInteraction = () => {
      // Only play if the user hasn't explicitly toggled it off
      if (ambientPlayingRef.current && ambientAudioRef.current && ambientAudioRef.current.paused) {
        ambientAudioRef.current.play().catch((e) => console.warn("Failed to resume audio:", e));
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      audio.pause();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Sync ambientPlaying state with the actual audio element
  useEffect(() => {
    const audio = ambientAudioRef.current;
    if (!audio) return;
    if (ambientPlaying) {
      if (audio.paused) {
        audio.play().catch((err) => console.warn("Audio play error:", err));
      }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
    }
  }, [ambientPlaying]);

  const toggleAmbient = async () => {
    const nextState = !ambientPlaying;
    setAmbientPlaying(nextState);
    localStorage.setItem('ember_sound', nextState ? 'on' : 'off');
    if (nextState) {
      try {
        const Tone = await import('tone');
        if (Tone.context.state !== 'running') {
          await Tone.start();
        }
      } catch (err) {
        console.warn('Tone.start failed on user toggle:', err);
      }
    }
  };
  const handleLogoDoubleClick = async () => {
    if (localStorage.getItem("ember_admin") === "true") {
      const deactivate = window.confirm("Deactivate Admin mode?");
      if (deactivate) {
        localStorage.removeItem("ember_admin");
        alert("Admin mode deactivated.");
        window.location.reload();
      }
      return;
    }
    const code = prompt("Enter admin passcode:");
    if (code) {
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/server/verify-admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ passcode: code })
        });
        const result = await response.json();
        if (result.success) {
          localStorage.setItem("ember_admin", "true");
          alert("Admin mode activated. Trash icons are now visible next to all thoughts and replies.");
          window.location.reload();
        } else {
          alert("Incorrect passcode.");
        }
      } catch (err) {
        alert("Failed to verify passcode: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowEmptyState(false);
    }, 12000); // Hide placeholder after 12 seconds
    return () => clearTimeout(timer);
  }, []);

  const filteredThoughts = useMemo(() => {
    if (activeFilter === 'all') return thoughts;
    return thoughts.filter(t => t.variant === activeFilter);
  }, [thoughts, activeFilter]);

  const bgX = useTransform(panX, x => x * 0.12);
  const bgY = useTransform(panY, y => y * 0.12);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      const newScale = Math.min(Math.max(scale + delta * 0.001, 0.2), 3);
      setScale(newScale);
    } else {
      panX.set(panX.get() - e.deltaX);
      panY.set(panY.get() - e.deltaY);
    }
  }, [scale, panX, panY]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (panToTarget) {
      animate(panX, -panToTarget.x, { 
        duration: 1.2, 
        ease: [0.16, 1, 0.3, 1],
        onComplete: () => {
          if (onPanComplete) onPanComplete();
        }
      });
      animate(panY, -panToTarget.y, { duration: 1.2, ease: [0.16, 1, 0.3, 1] });
      setScale(1.15); // zoom in slightly to focus the thought card
    }
  }, [panToTarget, onPanComplete, panX, panY]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'DIV' && (e.target as HTMLElement).className.includes('origin-center')) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newRipple = { id: Date.now(), x, y };
      setRipples(prev => [...prev, newRipple]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== newRipple.id)), 2000);
    }
  };

  const centerPan = () => {
    panX.set(0);
    panY.set(0);
    setScale(1);
  };



  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="w-full h-[100dvh] relative overflow-hidden cursor-grab active:cursor-grabbing"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #1a1525 0%, #0a0812 60%, #030206 100%)'
      }}
    >
      <style>{floatAnimationStyles}</style>

      {/* Static repeating stardust texture */}
      <div
        className="absolute inset-0 opacity-[0.25] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/stardust.png')` }}
      />

      {/* Twinkling Star Field with Parallax */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          x: bgX,
          y: bgY,
          left: '50%',
          top: '50%',
        }}
      >
        {STARS.map(star => {
          if (star.size === 3) {
            return (
              <div
                key={star.id}
                className="absolute animate-twinkle pointer-events-none"
                style={{
                  left: star.left,
                  top: star.top,
                  width: '10px',
                  height: '10px',
                  marginLeft: '-5px',
                  marginTop: '-5px',
                  '--twinkle-duration': star.twinkleDuration,
                  '--twinkle-delay': star.twinkleDelay,
                } as React.CSSProperties}
              >
                <svg viewBox="0 0 24 24" className="w-full h-full text-white fill-current" style={{ filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))' }}>
                  <path d="M12,2 L14.5,9.5 L22,12 L14.5,14.5 L12,22 L9.5,14.5 L2,12 L9.5,9.5 Z" />
                </svg>
              </div>
            );
          }
          return (
            <div
              key={star.id}
              className="absolute rounded-full bg-white animate-twinkle pointer-events-none"
              style={{
                left: star.left,
                top: star.top,
                width: `${star.size}px`,
                height: `${star.size}px`,
                boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, 0.9)`,
                '--twinkle-duration': star.twinkleDuration,
                '--twinkle-delay': star.twinkleDelay,
              } as React.CSSProperties}
            />
          );
        })}
      </motion.div>

      {/* Shooting Stars (Viewport relative) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="animate-shooting-star" style={{ top: '15%', left: '85%', '--duration': '14s', '--delay': '0s' } as React.CSSProperties} />
        <div className="animate-shooting-star" style={{ top: '30%', left: '70%', '--duration': '20s', '--delay': '5s' } as React.CSSProperties} />
        <div className="animate-shooting-star" style={{ top: '5%', left: '95%', '--duration': '25s', '--delay': '12s' } as React.CSSProperties} />
      </div>

      {/* Ripples Layer */}
      {ripples.map(r => (
        <motion.div
          key={r.id}
          className="absolute rounded-full border border-[rgba(214,106,62,0.4)] pointer-events-none z-10"
          style={{ left: r.x, top: r.y, x: '-50%', y: '-50%' }}
          initial={{ width: 0, height: 0, opacity: 0.8 }}
          animate={{ width: 300, height: 300, opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      ))}

      {/* Infinite canvas */}
      <motion.div
        drag={tutorialStep !== 'hud'}
        dragElastic={0} dragMomentum={false}
        className={[
          "absolute inset-0 origin-center flex items-center justify-center transition-[filter,opacity] duration-500",
          tutorialStep === 'hud' ? "blur-[3px] opacity-40 pointer-events-none" : ""
        ].join(" ")}
        style={{ x: panX, y: panY, scale }}
      >
        {/* Massive Flowing Nebulae Background */}
        <div className="absolute pointer-events-none w-[3000px] h-[3000px] flex items-center justify-center">
          {/* Nebula 1: Warm Amber / Orange (Center-Right) */}
          <div
            className="absolute rounded-full pointer-events-none animate-nebula-1"
            style={{
              width: '1800px',
              height: '1800px',
              background: 'radial-gradient(circle, rgba(214,106,62,0.18) 0%, rgba(214,106,62,0.06) 40%, rgba(214,106,62,0) 70%)',
              left: '30%',
              top: '20%',
            }}
          />
          {/* Nebula 2: Deep Purple / Indigo (Center-Left) */}
          <div
            className="absolute rounded-full pointer-events-none animate-nebula-2"
            style={{
              width: '2000px',
              height: '2000px',
              background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, rgba(139,92,246,0.04) 45%, rgba(139,92,246,0) 70%)',
              left: '-20%',
              top: '-10%',
            }}
          />
          {/* Nebula 3: Ethereal Teal / Blue (Bottom-Right) */}
          <div
            className="absolute rounded-full pointer-events-none animate-nebula-3"
            style={{
              width: '1600px',
              height: '1600px',
              background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.03) 40%, rgba(6,182,212,0) 70%)',
              left: '40%',
              top: '50%',
            }}
          />
        </div>



        {/* Thoughts */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <AnimatePresence>
            {filteredThoughts.length === 0 && showEmptyState && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 1.5 } }}
                transition={{ delay: 0.5, duration: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" 
                style={{ width: 400, height: 200, left: -200, top: -100 }}
              >
                <Sparkles size={32} className="text-[#D66A3E] opacity-50 mb-4" />
                <p className="text-[#f9f3eb] text-[22px] text-center" style={{ fontFamily: "'Alegreya', serif", fontWeight: 700 }}>
                  Be the first light tonight.
                </p>
                <p className="text-[#8a7f79] text-[15px] mt-1.5 text-center" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
                  The sky is quiet. Share a thought or whisper into the dark.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {filteredThoughts.length > 0 && filteredThoughts.map(thought => (
            <ThoughtCard
              key={thought.id}
              thought={thought}
              scale={scale}
              onClick={() => onThoughtClick(thought)}
              onReplyClick={(reply) => onReplyClick(thought, reply)}
              onDragEnd={(x, y) => onThoughtMove(thought.id, x, y)}
              isGlowing={thought.aiStatus === 'replying' || aiGlowThoughtId === thought.id || (thought.id === 'thought-tutorial-1' && tutorialStep === 'star')}
              isHovered={hoveredThoughtId === thought.id}
              onHoverStart={() => setHoveredThoughtId(thought.id)}
              onHoverEnd={() => setHoveredThoughtId(null)}
              tutorialStep={tutorialStep}
            />
          ))}
        </div>
      </motion.div>

      {/* Top Left Logo */}
      <div
        className={[
          "absolute top-[-5px] left-2 sm:top-[-10px] sm:left-6 z-30 flex items-center pointer-events-auto select-none transition-all duration-300",
          (tutorialStep === 'hud' || tutorialStep === 'star') ? "blur-[2px] opacity-40 pointer-events-none" : ""
        ].join(" ")}
      >
        <img
          src="https://i.imgur.com/5nagvWz.png"
          alt="Ember Logo"
          onDoubleClick={handleLogoDoubleClick}
          className="h-14 sm:h-20 w-auto object-contain relative z-10 drop-shadow-[0_0_20px_rgba(214,106,62,0.25)] cursor-pointer"
        />
      </div>

      {/* Top Right History Button */}
      <div
        className={[
          "absolute top-3 right-4 sm:top-8 sm:right-10 z-30 pointer-events-auto transition-all duration-300",
          (tutorialStep === 'hud' || tutorialStep === 'star') ? "blur-[2px] opacity-40 pointer-events-none" : ""
        ].join(" ")}
      >
        <motion.button
          onClick={onHistoryClick}
          className="bg-[rgba(20,15,25,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] text-[#f9f3eb] rounded-full px-3 h-[36px] sm:px-5 sm:h-[40px] flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D66A3E]"
          whileHover={{
            scale: 1.05,
            boxShadow: '0 0 20px rgba(214,106,62,0.4)',
            borderColor: 'rgba(214,106,62,0.5)',
            backgroundColor: 'rgba(214,106,62,0.08)'
          }}
          whileTap={{ scale: 0.95 }}
          aria-label="View History"
        >
          <span className="text-[11px] sm:text-[13px] font-bold tracking-wide" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>HISTORY</span>
        </motion.button>
      </div>

      {/* Top Centered Instruction — hidden on mobile to avoid overlap */}
      <div
        className={[
          "absolute top-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center w-[90%] max-w-[600px] transition-all duration-300 hidden sm:block",
          (tutorialStep === 'hud' || tutorialStep === 'star') ? "blur-[2px] opacity-40 pointer-events-none" : ""
        ].join(" ")}
      >
        <p className="text-[#f9f3eb]/95 text-[17px] pointer-events-auto tracking-wide font-normal leading-relaxed italic" style={{ fontFamily: "'Alegreya', serif", textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>
          "Share your thoughts anonymously. Watch them drift and connect as stars in the night sky."
        </p>
      </div>

      {/* Gesture hint */}
      <AnimatePresence>
        {showHint && tutorialStep === 'none' && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 bottom-[88px] sm:bottom-[104px] pointer-events-none z-30 whitespace-nowrap bg-[rgba(0,0,0,0.7)] px-4 py-1.5 rounded-full border border-[rgba(255,255,255,0.1)]"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.8 }}
          >
            <span className="text-[13px] text-[#bda89f] tracking-wide" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
              scroll to explore · drag to move
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating HUD Dock */}
      <div
        className={[
          "absolute left-1/2 -translate-x-1/2 bottom-4 sm:bottom-8 flex items-center justify-center pointer-events-none z-30 transition-all duration-300 w-[calc(100%-2rem)] sm:w-auto",
          tutorialStep === 'star' ? "blur-[2px] opacity-40 pointer-events-none" : ""
        ].join(" ")}
      >
        <motion.div
          className="pointer-events-auto flex items-center gap-1.5 sm:gap-4 bg-[rgba(20,15,25,0.85)] backdrop-blur-md rounded-full h-[52px] sm:h-[60px] px-3 sm:px-6 border border-[rgba(255,255,255,0.1)] transition-all duration-300 w-full sm:w-auto justify-between sm:justify-start overflow-x-auto scrollbar-hide"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.05)' }}
          whileHover={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 25px rgba(214,106,62,0.15), inset 0 1px 1px rgba(255,255,255,0.1)',
            borderColor: 'rgba(214,106,62,0.3)'
          }}
        >
          {/* Ambient Audio Toggle */}
          <motion.button
            onClick={toggleAmbient}
            className={`w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] rounded-full border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D66A3E] flex-shrink-0 cursor-pointer ${
              ambientPlaying
                ? 'bg-[rgba(214,106,62,0.15)] border-[rgba(214,106,62,0.4)] text-[#D66A3E]'
                : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-[#a89992] hover:text-[#f9f3eb] hover:bg-[rgba(255,255,255,0.1)]'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle Ambient Sound"
          >
            {ambientPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </motion.button>

          {/* About Button */}
          <motion.button
            onClick={() => setShowAboutModal(true)}
            className="w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#a89992] hover:text-[#f9f3eb] hover:bg-[rgba(255,255,255,0.1)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D66A3E] flex-shrink-0 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="About Ember"
          >
            <Info size={16} />
          </motion.button>
          
          <div className="w-[1px] h-6 sm:h-8 bg-white/10 mx-1 flex-shrink-0" />

          {/* Category Filters — desktop/tablet landscape only */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <motion.button
              onClick={() => setActiveFilter('all')}
              className="font-medium text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D66A3E] rounded px-1 cursor-pointer transition-colors whitespace-nowrap flex-shrink-0"
              style={{ color: activeFilter === 'all' ? '#f9f3eb' : '#a89992', textShadow: activeFilter === 'all' ? '0 0 10px rgba(249,243,235,0.6)' : 'none' }}
              whileHover={{ scale: 1.05, color: '#f9f3eb', textShadow: '0 0 10px rgba(249,243,235,0.6)' }}
              whileTap={{ scale: 0.95 }}
            >All</motion.button>
            <div className="w-[1px] h-4 bg-white/10 flex-shrink-0" />
            <motion.button
              onClick={() => setActiveFilter('warm')}
              className="font-medium text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D66A3E] rounded px-1 cursor-pointer transition-colors whitespace-nowrap flex-shrink-0"
              style={{ color: activeFilter === 'warm' ? '#f9f3eb' : '#a89992', textShadow: activeFilter === 'warm' ? '0 0 10px rgba(214,106,62,0.7)' : 'none' }}
              whileHover={{ scale: 1.05, color: '#D66A3E', textShadow: '0 0 10px rgba(214,106,62,0.7)' }}
              whileTap={{ scale: 0.95 }}
            >Warm</motion.button>
            <div className="w-[1px] h-4 bg-white/10 flex-shrink-0" />
            <motion.button
              onClick={() => setActiveFilter('light')}
              className="font-medium text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D66A3E] rounded px-1 cursor-pointer transition-colors whitespace-nowrap flex-shrink-0"
              style={{ color: activeFilter === 'light' ? '#f9f3eb' : '#a89992', textShadow: activeFilter === 'light' ? '0 0 10px rgba(100,150,255,0.7)' : 'none' }}
              whileHover={{ scale: 1.05, color: '#6496ff', textShadow: '0 0 10px rgba(100,150,255,0.7)' }}
              whileTap={{ scale: 0.95 }}
            >Light</motion.button>
          </div>

          <div className="hidden md:block w-[1px] h-8 bg-white/10 mx-2 flex-shrink-0" />

          {/* Main share action */}
          <motion.button
            className="bg-[rgba(214,106,62,0.15)] border border-[rgba(214,106,62,0.3)] text-[#D66A3E] rounded-full px-4 sm:px-5 h-[38px] sm:h-[40px] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D66A3E] flex-shrink-0 whitespace-nowrap"
            whileHover={{ backgroundColor: 'rgba(214,106,62,0.25)', scale: 1.05, boxShadow: '0 0 20px rgba(214,106,62,0.6)', borderColor: 'rgba(214,106,62,0.6)' }}
            whileTap={{ scale: 0.95 }}
            onClick={onInputClick}
            aria-label="Share a thought"
          >
            <Sparkles size={15} className="flex-shrink-0" />
            <span className="text-[13px] sm:text-sm font-medium whitespace-nowrap">Share</span>
          </motion.button>

          <div className="w-[1px] h-8 bg-white/10 mx-1 sm:mx-2 flex-shrink-0" />

          {/* Zoom controls — desktop/tablet landscape only */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <motion.button
              onClick={() => setScale(s => Math.max(0.2, s - 0.1))}
              className="text-[#a89992] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded flex-shrink-0"
              aria-label="Zoom out"
              whileHover={{ scale: 1.2, color: '#f9f3eb', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.6))' }}
              whileTap={{ scale: 0.9 }}
            ><ZoomOut size={16} /></motion.button>
            <motion.button
              onClick={centerPan}
              className="text-[#a89992] text-xs w-10 text-center hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded flex-shrink-0 whitespace-nowrap"
              whileHover={{ scale: 1.1, color: '#f9f3eb', textShadow: '0 0 8px rgba(255,255,255,0.6)' }}
              whileTap={{ scale: 0.95 }}
            >{Math.round(scale * 100)}%</motion.button>
            <motion.button
              onClick={() => setScale(s => Math.min(3, s + 0.1))}
              className="text-[#a89992] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded flex-shrink-0"
              aria-label="Zoom in"
              whileHover={{ scale: 1.2, color: '#f9f3eb', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.6))' }}
              whileTap={{ scale: 0.9 }}
            ><ZoomIn size={16} /></motion.button>
          </div>

          <div className="hidden md:block w-[1px] h-8 bg-white/10 mx-2 flex-shrink-0" />

          {/* Aura Indicator */}
          <div className="flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
            <motion.div
              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#D66A3E] flex-shrink-0"
              style={{ boxShadow: '0 0 8px #D66A3E' }}
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-[#e2d9d1] text-[12px] sm:text-[13px] font-medium whitespace-nowrap">
              <span className="hidden sm:inline">{voiceCount} online</span>
              <span className="sm:hidden">{voiceCount}</span>
            </span>
          </div>

          <div className="w-[1px] h-6 bg-white/10 mx-1 flex-shrink-0" />

          {/* Embers Count Indicator */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 whitespace-nowrap">
            <span className="text-[#D66A3E] text-[11px] sm:text-[13px] leading-none select-none">✦</span>
            <span className="text-[#e2d9d1] text-[12px] sm:text-[13px] font-medium whitespace-nowrap">
              <span className="hidden sm:inline">{thoughts.length} {thoughts.length === 1 ? 'ember' : 'embers'}</span>
              <span className="sm:hidden">{thoughts.length}</span>
            </span>
          </div>
        </motion.div>
      </div>

      {/* HUD Tutorial Tooltip Overlay */}
      {tutorialStep === 'hud' && setTutorialStep && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[88px] sm:bottom-[104px] z-50 pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[rgba(20,15,25,0.95)] backdrop-blur-xl border border-[rgba(214,106,62,0.4)] rounded-[20px] px-5 py-4 text-center max-w-[340px] shadow-[0_12px_40px_rgba(0,0,0,0.6),_0_0_20px_rgba(214,106,62,0.15)] flex flex-col items-center"
          >
            <p className="text-[#f9f3eb] text-[15px] font-medium leading-relaxed" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
              This is your Hearth control dock. Filter thoughts by mood, zoom the sky, or share an anonymous whisper.
            </p>
            <motion.button
              onClick={() => {
                setTutorialStep('star');
                if (onTriggerPanToStar) onTriggerPanToStar();
              }}
              className="mt-3 px-5 py-1.5 bg-[#D66A3E] text-white rounded-full text-xs font-bold shadow-[0_0_10px_rgba(214,106,62,0.3)] cursor-pointer"
              whileHover={{ scale: 1.05, backgroundColor: '#bd5e37' }}
              whileTap={{ scale: 0.95 }}
            >
              Continue
            </motion.button>
          </motion.div>
        </div>
      )}



      {/* About Ember Modal */}
      <AnimatePresence>
        {showAboutModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-[rgba(5,3,8,0.75)] backdrop-blur-sm" onClick={() => setShowAboutModal(false)} />
            
            <motion.div
              className="relative w-full max-w-[440px] bg-[rgba(255,255,255,0.03)] backdrop-blur-3xl border border-[rgba(255,255,255,0.15)] shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-[28px] p-6 flex flex-col items-center text-center overflow-hidden"
              initial={{ y: 20, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Top Close Button */}
              <button
                onClick={() => setShowAboutModal(false)}
                className="absolute top-4 right-4 w-[28px] h-[28px] rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.15)] cursor-pointer"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1L11 11M11 1L1 11" stroke="#f9f3eb" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              <div className="w-12 h-12 rounded-full bg-[rgba(214,106,62,0.1)] border border-[rgba(214,106,62,0.2)] flex items-center justify-center text-[#D66A3E] mb-4 mt-2">
                <Info size={24} />
              </div>

              <h3 className="text-[#f9f3eb] text-[22px] font-bold tracking-wide mb-3" style={{ fontFamily: "'Alegreya', serif" }}>
                About Ember
              </h3>

              <p className="text-[#e2d9d1] text-[15px] leading-relaxed mb-6 opacity-90" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
                Ember is an anonymous emotional sanctuary for those moments when feelings are hard to put into words. It provides a peaceful night sky where you can release your thoughts as glowing stars, connect with others through voice, drawing, or stickers, and know that you are never screaming into a silent void.
              </p>

              <div className="w-full h-[1px] bg-white/10 mb-5" />

              <p className="text-[#8a7f79] text-[12px] font-medium tracking-wider uppercase" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
                Developed by Alen Joby
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
