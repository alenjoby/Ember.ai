import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Lantern as LanternType, Emotion } from '../types';
import { Cloud, Flower2, Waves, Sun, Droplet, Sparkles } from 'lucide-react';

interface LanternProps {
  lantern: LanternType | null;
  text: string;
  emotion?: Emotion;
  aiStatus: 'waiting' | 'replying' | 'done' | 'skipped';
  isExample?: boolean;
  replyCount: number;
  isSelected?: boolean;
  onClick?: () => void;
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

// Render silhouettes for the 4 shapes
function LanternSilhouette({ shape }: { shape: 'round' | 'tall' | 'paper' | 'star' }) {
  switch (shape) {
    case 'round':
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full absolute inset-0 pointer-events-none opacity-20">
          <ellipse cx="50" cy="62" rx="42" ry="46" fill="currentColor" />
          <rect x="42" y="10" width="16" height="7" rx="3" fill="currentColor" />
          <rect x="40" y="108" width="20" height="6" rx="2" fill="currentColor" />
        </svg>
      );
    case 'tall':
      return (
        <svg viewBox="0 0 100 140" className="w-full h-full absolute inset-0 pointer-events-none opacity-20">
          <rect x="22" y="24" width="56" height="92" rx="14" fill="currentColor" />
          <path d="M 35 24 Q 50 12 65 24" stroke="currentColor" strokeWidth="4" fill="none" />
          <rect x="32" y="116" width="36" height="6" rx="2" fill="currentColor" />
        </svg>
      );
    case 'paper':
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full absolute inset-0 pointer-events-none opacity-20">
          <polygon points="50,15 88,40 88,95 50,112 12,95 12,40" fill="currentColor" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 100 120" className="w-full h-full absolute inset-0 pointer-events-none opacity-20">
          <path
            d="M 50 18 L 60 44 L 88 48 L 68 68 L 73 96 L 50 82 L 27 96 L 32 68 L 12 48 L 40 44 Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}

export function Lantern({
  lantern,
  text,
  emotion,
  aiStatus,
  isExample,
  replyCount,
  isSelected,
  onClick,
  width = 280,
}: LanternProps) {
  const EmotionIcon = emotion ? EMOTION_ICONS[emotion] : null;

  // Palette fallbacks for unlit / lighting lanterns
  const [coreColor, glowColor, edgeColor] = useMemo(() => {
    if (lantern?.palette && lantern.palette.length === 3) {
      return lantern.palette;
    }
    return ['#fef3c7', '#d97706', '#451a03']; // amber default
  }, [lantern]);

  const glowBrightness = lantern?.glow ?? 0.5;
  const flickerRestlessness = lantern?.flicker ?? 0.3;
  const shape = lantern?.shape ?? 'round';

  // Duration between 2s and 6s based on restlessness
  const flickerDuration = Math.max(1.8, 6.0 - flickerRestlessness * 4.2);

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.025, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ width }}
      className={`relative cursor-pointer select-none rounded-3xl p-5 backdrop-blur-md transition-all ${
        isSelected ? 'ring-2 ring-amber-300/80 shadow-2xl' : ''
      }`}
    >
      {/* Outer ambient glow halo */}
      <motion.div
        animate={{
          opacity: [glowBrightness * 0.45, glowBrightness * 0.75, glowBrightness * 0.45],
          scale: [0.97, 1.04, 0.97],
        }}
        transition={{
          duration: flickerDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -inset-4 rounded-3xl pointer-events-none blur-2xl"
        style={{
          background: `radial-gradient(circle, ${glowColor}55 0%, ${edgeColor}22 65%, transparent 100%)`,
        }}
      />

      {/* Main lantern vessel */}
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 shadow-lg text-white/90 p-5 flex flex-col justify-between min-h-[170px]"
        style={{
          background: lantern
            ? `radial-gradient(circle at 50% 35%, ${coreColor}33 0%, ${glowColor}25 50%, ${edgeColor}44 100%)`
            : 'radial-gradient(circle at 50% 35%, rgba(245,158,11,0.18) 0%, rgba(30,20,15,0.85) 100%)',
          backgroundColor: '#0c0a09e0',
        }}
      >
        {/* Silhouette overlay */}
        <div style={{ color: coreColor }}>
          <LanternSilhouette shape={shape} />
        </div>

        {/* Breathing inner flame core */}
        <motion.div
          animate={{
            opacity: [0.7, 1, 0.75, 0.95, 0.7],
            scale: [0.95, 1.08, 0.98, 1.04, 0.95],
          }}
          transition={{
            duration: flickerDuration * 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full pointer-events-none blur-xl"
          style={{ backgroundColor: coreColor }}
        />

        {/* Header: Emotion icon & badges */}
        <div className="flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5">
            {EmotionIcon && (
              <span
                className="p-1.5 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-200"
                title={emotion}
              >
                <EmotionIcon size={14} />
              </span>
            )}
            {lantern?.caption && (
              <span className="text-[11px] font-serif italic text-amber-200/75 truncate max-w-[170px]">
                "{lantern.caption}"
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isExample && (
              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono bg-white/10 text-white/50 border border-white/10">
                example
              </span>
            )}
            {aiStatus === 'replying' && (
              <span className="flex items-center gap-1 text-[11px] text-amber-300 font-serif italic animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                writing…
              </span>
            )}
          </div>
        </div>

        {/* Body: Thought message */}
        <p className="my-3 text-[14px] leading-relaxed font-serif text-stone-100/90 line-clamp-4 z-10">
          {text}
        </p>

        {/* Footer: Responses count & status */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-stone-400 z-10">
          <span>
            {replyCount === 0 ? 'Quiet so far' : `${replyCount} ${replyCount === 1 ? 'answer' : 'answers'}`}
          </span>
          {!lantern && (
            <span className="text-amber-300/80 font-serif italic animate-pulse">
              lighting the lantern…
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
