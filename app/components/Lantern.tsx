import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lantern as LanternType, Emotion } from '../types';
import type { ThoughtResponse } from '../App';
import { Cloud, Flower2, Waves, Sun, Droplet, Sparkles, Mic, Feather, Brush } from 'lucide-react';
import { StickerIcon } from './StickerIcon';

interface LanternProps {
  id: string;
  lantern: LanternType | null;
  text: string;
  emotion?: Emotion;
  aiStatus: 'waiting' | 'replying' | 'done' | 'skipped';
  isExample?: boolean;
  responses: ThoughtResponse[];
  isGlowing?: boolean;
  isHovered?: boolean;
  dimmed?: boolean;
  isNew?: boolean;
  onReplyClick?: (reply: ThoughtResponse) => void;
  width?: number;
}

const EMOTION_ICONS: Record<string, React.ElementType> = {
  lonely: Cloud,
  grateful: Flower2,
  anxious: Waves,
  hopeful: Sun,
  grieving: Droplet,
  joyful: Sparkles,
};

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

// Fallback presets per emotion from lantern-demo.html
const FALLBACK_LANTERNS: Record<string, { palette: [string, string, string]; glow: number; flicker: number; shape: 'round' | 'tall' | 'paper' | 'star'; caption: string }> = {
  lonely: { palette: ['#9DB4FF', '#3B4A8C', '#1A2040'], glow: 0.35, flicker: 0.2, shape: 'tall', caption: 'one window lit at night' },
  anxious: { palette: ['#8FE3D8', '#2A8C88', '#123B3A'], glow: 0.55, flicker: 0.8, shape: 'paper', caption: 'breathing through the wind' },
  grieving: { palette: ['#C9A7FF', '#5B3A8C', '#24123D'], glow: 0.45, flicker: 0.15, shape: 'round', caption: 'a candle for him' },
  hopeful: { palette: ['#FFE7A3', '#F2B544', '#8A5A12'], glow: 0.7, flicker: 0.35, shape: 'tall', caption: 'morning light breaking' },
  joyful: { palette: ['#FFE08A', '#FF9F43', '#FF6B6B'], glow: 0.9, flicker: 0.7, shape: 'star', caption: 'third time lucky' },
  grateful: { palette: ['#D9F2B4', '#8DBF5A', '#3E5A22'], glow: 0.65, flicker: 0.3, shape: 'round', caption: 'soft ripples on water' },
};

/**
 * 4 SVG Lantern Silhouettes matching lantern-demo.html:
 * - round: ellipse with hanger & base
 * - tall: rounded vertical vessel with hanging wire
 * - paper: folded diamond origami lantern
 * - star: 10-point folded star polygon
 * Each SVG contains its own <defs> radialGradient so it renders reliably across all browsers.
 */
function LanternSvg({
  shape,
  gradientId,
  coreColor,
  glowColor,
  edgeColor,
}: {
  shape: 'round' | 'tall' | 'paper' | 'star';
  gradientId: string;
  coreColor: string;
  glowColor: string;
  edgeColor: string;
}) {
  const defs = (
    <defs>
      <radialGradient id={gradientId} cx="50%" cy="58%" r="62%">
        <stop offset="0%" stopColor="#fff8ec" />
        <stop offset="26%" stopColor={coreColor} />
        <stop offset="70%" stopColor={glowColor} />
        <stop offset="100%" stopColor={edgeColor} />
      </radialGradient>
    </defs>
  );

  switch (shape) {
    case 'tall':
      return (
        <svg viewBox="0 0 120 180" className="w-[110px] h-[165px] drop-shadow-md select-none overflow-visible">
          {defs}
          <line x1="60" y1="0" x2="60" y2="26" stroke="#6b5446" strokeWidth="2.5" strokeLinecap="round" />
          <rect
            x="22"
            y="28"
            width="76"
            height="122"
            rx="24"
            fill={`url(#${gradientId})`}
            stroke={edgeColor}
            strokeWidth="2"
          />
          {/* Subtle paper ribs */}
          <line x1="26" y1="68" x2="94" y2="68" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="26" y1="108" x2="94" y2="108" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 120 180" className="w-[110px] h-[165px] drop-shadow-md select-none overflow-visible">
          {defs}
          <line x1="60" y1="0" x2="60" y2="26" stroke="#6b5446" strokeWidth="2.5" strokeLinecap="round" />
          <polygon
            points="60,26 75,70 120,72 84,98 96,144 60,118 24,144 36,98 0,72 45,70"
            fill={`url(#${gradientId})`}
            stroke={edgeColor}
            strokeWidth="2"
          />
        </svg>
      );
    case 'paper':
      return (
        <svg viewBox="0 0 120 180" className="w-[110px] h-[165px] drop-shadow-md select-none overflow-visible">
          {defs}
          <line x1="60" y1="0" x2="60" y2="24" stroke="#6b5446" strokeWidth="2.5" strokeLinecap="round" />
          <polygon
            points="60,24 100,56 100,126 60,154 20,126 20,56"
            fill={`url(#${gradientId})`}
            stroke={edgeColor}
            strokeWidth="2"
          />
          <line x1="60" y1="24" x2="60" y2="154" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </svg>
      );
    case 'round':
    default:
      return (
        <svg viewBox="0 0 120 180" className="w-[110px] h-[165px] drop-shadow-md select-none overflow-visible">
          {defs}
          <line x1="60" y1="0" x2="60" y2="30" stroke="#6b5446" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse
            cx="60"
            cy="92"
            rx="50"
            ry="56"
            fill={`url(#${gradientId})`}
            stroke={edgeColor}
            strokeWidth="2"
          />
          {/* Subtle wooden cap and base */}
          <rect x="48" y="30" width="24" height="6" rx="2" fill="#523e32" />
          <rect x="50" y="148" width="20" height="5" rx="2" fill="#523e32" />
        </svg>
      );
  }
}

/**
 * Orbiting Replies around the Lantern vessel.
 * Each response orbits smoothly in an elliptical path around the lantern flame,
 * passing behind and in front of the lamp with realistic 3D depth and subtle floating bob.
 */
function OrbitingReplies({
  responses,
  isHovered,
  glowColor,
  onReplyClick,
}: {
  responses: ThoughtResponse[];
  isHovered: boolean;
  glowColor: string;
  onReplyClick?: (reply: ThoughtResponse) => void;
}) {
  const visibleReplies = responses.slice(0, 6);
  const total = visibleReplies.length;

  // Semi-major and semi-minor axes of the elliptical orbit around the lantern
  const rx = isHovered ? 92 : 76;
  const ry = isHovered ? 48 : 38;

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {visibleReplies.map((reply, index) => {
        const startPhase = (index / total) * (2 * Math.PI);
        const orbitDuration = 18 + (index % 3) * 3; // 18s - 24s graceful serene orbit

        // 8 keyframes for smooth circular/elliptical interpolation with low CPU overhead
        const STEPS = 8;
        const xKeyframes: number[] = [];
        const yKeyframes: number[] = [];
        const scaleKeyframes: number[] = [];
        const opacityKeyframes: number[] = [];
        const zIndexKeyframes: number[] = [];

        for (let s = 0; s <= STEPS; s++) {
          const angle = startPhase + (s / STEPS) * (2 * Math.PI);
          const x = Math.round(Math.cos(angle) * rx);
          const y = Math.round(Math.sin(angle) * ry);
          const inFront = Math.sin(angle) >= 0;

          xKeyframes.push(x);
          yKeyframes.push(y);
          scaleKeyframes.push(inFront ? (isHovered ? 1.2 : 1.05) : (isHovered ? 0.95 : 0.82));
          opacityKeyframes.push(inFront ? 1.0 : 0.72);
          zIndexKeyframes.push(inFront ? 35 : 5);
        }

        return (
          <motion.div
            key={reply.id}
            className="absolute left-1/2 top-1/2 pointer-events-auto cursor-pointer"
            style={{ x: '-50%', y: '-50%', willChange: 'transform' }}
            animate={{
              x: xKeyframes.map(x => `calc(-50% + ${x}px)`),
              y: yKeyframes.map(y => `calc(-50% + ${y}px)`),
              scale: scaleKeyframes,
              opacity: opacityKeyframes,
              zIndex: zIndexKeyframes,
            }}
            transition={{
              duration: orbitDuration,
              repeat: Infinity,
              ease: 'linear',
            }}
            onPointerDown={(e) => {
              // Stop propagation so clicking a reply does not trigger lantern drag or canvas pan
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onReplyClick?.(reply);
            }}
            title={reply.type === 'note' ? reply.content : `${reply.type} reply`}
          >
            <motion.div
              className="relative flex items-center justify-center rounded-full bg-[rgba(15,10,18,0.92)] border border-[rgba(255,255,255,0.25)] backdrop-blur-md p-1.5 transition-all duration-200 shadow-lg"
              whileHover={{ scale: 1.3 }}
              style={{
                boxShadow: isHovered
                  ? `0 0 16px ${glowColor}, inset 0 0 8px ${glowColor}`
                  : `0 0 8px rgba(0,0,0,0.6)`,
              }}
            >
              {/* Mini ember core */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none opacity-70"
                style={{
                  background: `radial-gradient(circle, ${glowColor}ee 0%, ${glowColor}66 50%, transparent 80%)`,
                }}
              />

              <div className="relative z-10 flex items-center justify-center text-[#f9f3eb]">
                {reply.type === 'sticker' ? (
                  (() => {
                    const rawName = reply.content.split(':')[0];
                    const iconName = EMOJI_TO_ICON[rawName] || rawName;
                    return <StickerIcon name={iconName} size={15} />;
                  })()
                ) : reply.type === 'voice' ? (
                  <Mic size={12} className="text-amber-200" />
                ) : reply.type === 'drawing' ? (
                  <Brush size={12} className="text-amber-200" />
                ) : (
                  <Feather size={12} className="text-amber-200" />
                )}
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function Lantern({
  id,
  lantern,
  text,
  emotion,
  aiStatus,
  isExample,
  responses,
  isGlowing,
  isHovered,
  dimmed,
  isNew,
  onReplyClick,
  width = 250,
}: LanternProps) {
  const gradientId = useMemo(() => `lantern-grad-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`, [id]);
  const EmotionIcon = emotion ? EMOTION_ICONS[emotion] : null;

  // Resolve lantern data, with fallback to emotion presets or lonely default
  // If lantern === null, show dim unlit grey state until generated data arrives
  const isLighting = !lantern;
  const resolved = useMemo(() => {
    if (lantern && lantern.palette && lantern.palette.length === 3) {
      return lantern;
    }
    if (!lantern) {
      const presetShape = (emotion && FALLBACK_LANTERNS[emotion]?.shape) || 'round';
      return {
        palette: ['#716660', '#3d3430', '#1c1715'] as [string, string, string],
        glow: 0.18,
        flicker: 0.1,
        shape: presetShape,
        sound: { mood: 'night' as const, instrument: 'pad' as const, key: 'D minor', tempo: 50 },
        caption: 'lighting…',
      };
    }
    const preset = (emotion && FALLBACK_LANTERNS[emotion]) || FALLBACK_LANTERNS.lonely;
    return {
      palette: preset.palette,
      glow: preset.glow,
      flicker: preset.flicker,
      shape: preset.shape,
      sound: { mood: 'night' as const, instrument: 'pad' as const, key: 'D minor', tempo: 50 },
      caption: preset.caption,
    };
  }, [lantern, emotion]);

  const [coreColor, glowColor, edgeColor] = resolved.palette;
  const glow = resolved.glow ?? 0.5;
  const flicker = resolved.flicker ?? 0.3;
  const shape = resolved.shape ?? 'round';

  // Flicker animation speed formula from lantern-demo.html: 5 - 4.1 * flicker
  const flickerDuration = Math.max(1.0, 5.0 - 4.1 * flicker);

  const isReplying = aiStatus === 'replying';

  return (
    <div
      style={{ width, opacity: dimmed ? 0.18 : 1 }}
      className="relative flex flex-col items-center select-none group focus:outline-none pointer-events-none transition-all duration-500"
    >
      {/* Atmospheric Halo Glow behind the Lantern */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 190,
          height: 190,
          top: 5,
          left: '50%',
          x: '-50%',
          background: `radial-gradient(circle, ${glowColor}c0 0%, ${glowColor}4d 38%, ${glowColor}00 70%)`,
          willChange: 'transform, opacity',
        }}
        animate={{
          opacity: [glow * 0.5, glow * 0.85, glow * 0.5],
          scale: [0.95, 1.08, 0.95],
        }}
        transition={{
          duration: flickerDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Extra glow if AI is replying or highlighted */}
      {(isGlowing || isReplying) && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 240,
            height: 240,
            top: -20,
            left: '50%',
            x: '-50%',
            background: `radial-gradient(circle, ${glowColor}d0 0%, ${glowColor}60 38%, ${glowColor}00 75%)`,
            willChange: 'transform, opacity',
          }}
          animate={{
            opacity: [0.4, 0.85, 0.4],
            scale: [0.95, 1.15, 0.95],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Lantern Lamp Vessel & Surrounding Firefly Embers */}
      <div className="relative w-[110px] h-[165px] flex items-center justify-center">
        {/* Lamp Silhouette Vessel */}
        <motion.div
          className="relative z-10 flex items-center justify-center w-full h-full pointer-events-auto"
          style={{
            filter: `drop-shadow(0 6px 18px ${glowColor}70)`,
            willChange: 'transform',
          }}
          animate={{
            scale: [0.985, 1.015, 0.985],
          }}
          transition={{
            duration: flickerDuration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
        >
          <LanternSvg
            shape={shape}
            gradientId={gradientId}
            coreColor={coreColor}
            glowColor={glowColor}
            edgeColor={edgeColor}
          />

          {/* Inner Flame Glow Core */}
          <motion.div
            className="absolute w-12 h-12 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, #ffffff 0%, #fff8ec 45%, rgba(255, 248, 236, 0) 75%)',
              top: 72,
              left: '50%',
              x: '-50%',
              willChange: 'transform, opacity',
            }}
            animate={{
              opacity: [0.75, 1.0, 0.75],
              scale: [0.92, 1.12, 0.92],
            }}
            transition={{
              duration: flickerDuration * 0.7,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>

        {/* Orbiting Replies floating around the lamp */}
        {responses.length > 0 && (
          <OrbitingReplies
            responses={responses}
            isHovered={isHovered ?? false}
            glowColor={glowColor}
            onReplyClick={onReplyClick}
          />
        )}
      </div>

      {/* Lantern Card Content & Message */}
      <div className="relative z-20 mt-2 flex flex-col items-center text-center max-w-[240px] pointer-events-auto">
        <div className="flex items-center gap-1.5 mb-1">
          {isNew && (
            <span
              className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold bg-[rgba(214,106,62,0.35)] text-[#ffd9c2] border border-[rgba(214,106,62,0.5)] backdrop-blur-md animate-pulse shadow-[0_0_8px_rgba(214,106,62,0.4)]"
              style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
            >
              your lantern
            </span>
          )}
          {isExample && (
            <span
              className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold bg-white/10 text-[#d8cfc7] border border-white/15 backdrop-blur-md"
              style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
            >
              example
            </span>
          )}
          {EmotionIcon && (
            <span
              className="text-[#f9f3eb]/70 p-1 rounded-full bg-white/5 backdrop-blur-sm"
              title={emotion}
            >
              <EmotionIcon size={12} />
            </span>
          )}
        </div>

        {/* Thought text excerpt */}
        <p
          className="text-[#f9f3eb] text-[15px] leading-[1.5] font-normal select-none line-clamp-3 px-2 py-1 rounded-lg backdrop-blur-sm bg-[rgba(10,7,12,0.4)] border border-[rgba(255,255,255,0.06)]"
          style={{
            fontFamily: "'Alegreya', serif",
            textShadow: '0 2px 8px rgba(0,0,0,0.85)',
          }}
        >
          {text}
        </p>

        {/* AI Replying Whisper */}
        <AnimatePresence>
          {isReplying && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: [0.6, 1, 0.6], y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-1 flex items-center gap-1 text-[11px] text-[#FFB347] font-serif italic"
            >
              <span>✦ Ember is writing…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unlit / Loading indicator if lantern is being generated */}
        {isLighting && (
          <span className="mt-1 text-[10px] text-amber-300/70 font-serif italic animate-pulse">
            lighting…
          </span>
        )}
      </div>
    </div>
  );
}
