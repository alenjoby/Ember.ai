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
 * Option 1: Firefly Embers surrounding the lantern flame.
 * Each response hovers gently like an ember caught on rising warm air.
 */
function FireflyEmbers({
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

  // Pre-calculated organic hover positions around the lantern vessel
  const emberOffsets = [
    { x: -68, y: -25, bobDur: 3.2, delay: 0 },
    { x: 68, y: -15, bobDur: 3.7, delay: 0.4 },
    { x: -74, y: 35, bobDur: 4.1, delay: 0.8 },
    { x: 74, y: 45, bobDur: 3.5, delay: 0.2 },
    { x: -52, y: 85, bobDur: 3.9, delay: 1.1 },
    { x: 52, y: 95, bobDur: 4.4, delay: 0.6 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {visibleReplies.map((reply, index) => {
        const offset = emberOffsets[index % emberOffsets.length];
        const expandFactor = isHovered ? 1.25 : 1.0;
        const targetX = offset.x * expandFactor;
        const targetY = offset.y * expandFactor;

        return (
          <motion.div
            key={reply.id}
            className="absolute left-1/2 top-1/2 pointer-events-auto cursor-pointer"
            style={{ x: '-50%', y: '-50%' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              x: `calc(-50% + ${targetX}px)`,
              y: [
                `calc(-50% + ${targetY}px)`,
                `calc(-50% + ${targetY - 8}px)`,
                `calc(-50% + ${targetY}px)`,
              ],
              scale: isHovered ? 1.12 : 1,
              opacity: 1,
            }}
            transition={{
              y: {
                duration: offset.bobDur,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: offset.delay,
              },
              x: { duration: 0.35, ease: 'easeOut' },
              scale: { duration: 0.25 },
              opacity: { duration: 0.4 },
            }}
            onClick={(e) => {
              e.stopPropagation();
              onReplyClick?.(reply);
            }}
            title={reply.type === 'note' ? reply.content : `${reply.type} reply`}
          >
            <div
              className="relative flex items-center justify-center rounded-full bg-[rgba(15,10,18,0.92)] border border-[rgba(255,255,255,0.25)] backdrop-blur-md p-1.5 transition-all duration-200 hover:scale-125 shadow-lg"
              style={{
                boxShadow: isHovered
                  ? `0 0 16px ${glowColor}, inset 0 0 8px ${glowColor}`
                  : `0 0 8px rgba(0,0,0,0.6)`,
              }}
            >
              {/* Mini ember core */}
              <div
                className="absolute inset-0 rounded-full blur-[3px] pointer-events-none opacity-60"
                style={{ backgroundColor: glowColor }}
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
            </div>
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
      style={{ width }}
      className="relative flex flex-col items-center select-none group focus:outline-none pointer-events-none"
    >
      {/* Atmospheric Halo Glow behind the Lantern */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 170,
          height: 170,
          top: 15,
          left: '50%',
          x: '-50%',
          backgroundColor: glowColor,
          filter: `blur(${Math.max(22, glow * 40)}px)`,
        }}
        animate={{
          opacity: [glow * 0.45, glow * 0.75, glow * 0.45],
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
            width: 220,
            height: 220,
            top: -10,
            left: '50%',
            x: '-50%',
            backgroundColor: glowColor,
            filter: 'blur(45px)',
          }}
          animate={{
            opacity: [0.35, 0.75, 0.35],
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
          animate={{
            scale: [0.985, 1.015, 0.985],
            filter: [
              `drop-shadow(0 4px 14px ${glowColor}66)`,
              `drop-shadow(0 6px 24px ${glowColor}aa)`,
              `drop-shadow(0 4px 14px ${glowColor}66)`,
            ],
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
            className="absolute w-10 h-10 rounded-full pointer-events-none blur-md"
            style={{ backgroundColor: '#fff8ec', top: 75, left: '50%', x: '-50%' }}
            animate={{
              opacity: [0.7, 1.0, 0.7],
              scale: [0.9, 1.15, 0.9],
            }}
            transition={{
              duration: flickerDuration * 0.7,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>

        {/* Firefly Embers (Option 1 Responses) floating around the lamp */}
        {responses.length > 0 && (
          <FireflyEmbers
            responses={responses}
            isHovered={isHovered ?? false}
            glowColor={glowColor}
            onReplyClick={onReplyClick}
          />
        )}
      </div>

      {/* Lantern Card Content & Message */}
      <div className="relative z-20 mt-2 flex flex-col items-center text-center max-w-[240px] pointer-events-auto">
        {/* Badges: Example & Emotion */}
        <div className="flex items-center gap-1.5 mb-1">
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

        {/* Poetic caption */}
        {resolved.caption && (
          <span
            className="mt-1 text-[11px] text-[#e8cdb8]/80 italic tracking-wide transition-opacity duration-300"
            style={{ fontFamily: "'Alegreya', serif", textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}
          >
            "{resolved.caption}"
          </span>
        )}

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
