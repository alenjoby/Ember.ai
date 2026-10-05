import { motion } from 'framer-motion';
import { Mic, Play, Square, Brush, Feather } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Thought, ThoughtResponse } from '../App';
import { ScreenGlow } from './ScreenGlow';
import { STICKER_DATA } from './stickersData';

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

function StickerIcon({ nameOrEmoji, size = 24, className }: { nameOrEmoji: string; size?: number; className?: string }) {
  const baseName = nameOrEmoji.split(':')[0];
  const iconName = EMOJI_TO_ICON[baseName] || baseName;
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
  return <span className={className} style={{ fontSize: `${size}px` }}>{baseName}</span>;
}

interface ReplyDetailModalProps {
  reply: ThoughtResponse;
  parentThought: Thought;
  onClose: () => void;
}

export function ReplyDetailModal({ reply, parentThought, onClose }: ReplyDetailModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (reply.type === 'voice' && reply.audioUrl && !audioRef.current) {
      const audio = new Audio(reply.audioUrl);
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [reply]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-[rgba(5,3,8,0.7)] backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        className="relative bg-[rgba(255,255,255,0.08)] backdrop-blur-2xl border border-[rgba(255,255,255,0.2)] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[24px] overflow-hidden w-full max-w-[400px] flex flex-col"
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 15, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
              {reply.type === 'voice' && <Mic size={16} className="text-[#D66A3E]" />}
              {reply.type === 'drawing' && <Brush size={16} className="text-[#D66A3E]" />}
              {reply.type === 'note' && <Feather size={16} className="text-[#D66A3E]" />}
              {reply.type === 'sticker' && <StickerIcon nameOrEmoji={reply.content} size={18} />}
            </div>
            <div>
              <p className="text-[#8a7f79] text-xs font-semibold tracking-wider uppercase">
                {reply.type} Response
              </p>
              <p className="text-[#e2d9d1] text-sm opacity-60 mt-0.5 truncate max-w-[200px]">
                To: {parentThought.text.substring(0, 30)}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#e2d9d1] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D66A3E]"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center justify-center min-h-[160px]">
          {reply.type === 'note' && (
            <p className="text-[#f9f3eb] text-[18px] leading-relaxed text-center font-medium whitespace-pre-wrap break-words [overflow-wrap:anywhere]" style={{ fontFamily: "'Alegreya', serif" }}>
              "{reply.content}"
            </p>
          )}

          {reply.type === 'drawing' && reply.drawingData && (
            <div className="w-full bg-[rgba(255,255,255,0.02)] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.05)]">
              <img src={reply.drawingData} alt="Drawing response" className="w-full h-auto object-contain" />
            </div>
          )}

          {reply.type === 'voice' && (
            <>
            {reply.isAI && <ScreenGlow isPlaying={isPlaying} />}
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <motion.button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-[#D66A3E] text-white flex items-center justify-center shadow-[0_0_20px_rgba(214,106,62,0.4)] hover:scale-105 transition-transform"
                whileTap={{ scale: 0.95 }}
              >
                {isPlaying ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </motion.button>
              <div className="flex gap-1 items-center h-8">
                {Array.from({ length: 15 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-[#D66A3E]/40 rounded-full"
                    animate={{ height: isPlaying ? [8, 24, 8] : 4 }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                  />
                ))}
              </div>
            </div>
            </>
          )}

          {reply.type === 'sticker' && (
            <div className="filter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <StickerIcon nameOrEmoji={reply.content} size={80} />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
