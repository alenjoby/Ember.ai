import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComposeModalProps {
  onClose: () => void;
  onSubmit: (text: string, emotion?: string) => void;
}

import { Cloud, Flower2, Waves, Sun, Droplet, Sparkles, Heart, Shield } from 'lucide-react';
import { detectNegativity, Severity } from '../safeSpace';
import { SafeSpaceGuard, SafeSpaceInline } from './SafeSpaceGuard';
import { projectId, publicAnonKey } from '../../supabase/info';

const MAX_CHARS = 240;
const PAPER_LINE_COUNT = 11;
const PAPER_LINE_SPACING = 34;

function PaperLines() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] sm:rounded-[30px]">
      {Array.from({ length: PAPER_LINE_COUNT }, (_, i) => (
        <div
          key={i}
          className="absolute left-[16px] right-[16px] sm:left-[24px] sm:right-[24px] h-px bg-[rgba(255,255,255,0.06)]"
          style={{ top: 26 + i * PAPER_LINE_SPACING }}
        />
      ))}
    </div>
  );
}

const EMOTIONS = [
  { id: 'lonely', label: 'Lonely', icon: Cloud },
  { id: 'grateful', label: 'Grateful', icon: Flower2 },
  { id: 'anxious', label: 'Anxious', icon: Waves },
  { id: 'hopeful', label: 'Hopeful', icon: Sun },
  { id: 'grieving', label: 'Grieving', icon: Droplet },
  { id: 'joyful', label: 'Joyful', icon: Sparkles },
];

export function ComposeModal({ onClose, onSubmit }: ComposeModalProps) {
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState<string | undefined>();
  const [isReleasing, setIsReleasing] = useState(false);
  const [showGuard, setShowGuard] = useState(false);
  const [guardMessage, setGuardMessage] = useState('');
  const [guardSeverity, setGuardSeverity] = useState<Severity>('clean');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const safeCheck = useMemo(() => detectNegativity(text), [text]);

  const handleSubmit = async () => {
    if (text.trim().length === 0 || isReleasing) return;
    const result = detectNegativity(text);
    if (!result.allowed) {
      setGuardMessage(result.reason);
      setGuardSeverity(result.severity);
      setShowGuard(true);
      return;
    }
    setIsReleasing(true);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/server/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const serverResult = await response.json();
      if (serverResult && !serverResult.allowed) {
        setGuardMessage(serverResult.reason || "Let's keep this space warm and safe.");
        setGuardSeverity(serverResult.isCrisis ? 'mild' : 'severe');
        setShowGuard(true);
        setIsReleasing(false);
        return;
      }
    } catch (err) {
      console.error("Gemini safety check failed, falling back to local client filter:", err);
    }

    setTimeout(() => {
      onSubmit(text.trim(), emotion);
      setText('');
      setEmotion(undefined);
      setIsReleasing(false);
    }, 450);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  const progress = (text.length / MAX_CHARS) * 100;
  const canSubmit = text.trim().length > 0 && text.length <= MAX_CHARS && !isReleasing && safeCheck.allowed;

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(5,3,8,0.75)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-[900px] bg-[rgba(255,255,255,0.03)] backdrop-blur-3xl border border-[rgba(255,255,255,0.15)] rounded-[24px] sm:rounded-[36px] shadow-[0px_32px_64px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        {/* Release ceremony */}
        <AnimatePresence>
          {isReleasing && (
            <motion.div
              className="absolute inset-0 rounded-[24px] sm:rounded-[36px] pointer-events-none z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ background: 'radial-gradient(ellipse at 88% 92%, rgba(214,106,62,0.4) 0%, transparent 62%)' }}
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="px-5 pt-6 pb-0 sm:px-8 sm:pt-8 md:px-11 md:pt-10">
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <h1
                className="text-[#f9f3eb] leading-none"
                style={{
                  fontFamily: "'Alegreya', serif",
                  fontWeight: 700,
                  fontSize: 'clamp(22px, 5vw, 38px)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                }}
              >
                Share a thought
              </h1>
              <p
                className="text-[#8a7f79] leading-[1.48] mt-1.5 max-w-[480px]"
                style={{
                  fontFamily: "'Alegreya Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: 'clamp(13px, 2.5vw, 17px)',
                }}
              >
                Short, honest, and anonymous is enough. The room will do the rest.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="w-[32px] h-[32px] rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#f9f3eb] hover:bg-[rgba(255,255,255,0.15)] transition-colors flex-shrink-0 mt-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D66A3E]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="#f9f3eb" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Composer */}
        <div className="px-5 pt-4 pb-5 sm:px-8 sm:pt-6 sm:pb-8 md:px-11 md:pt-7 md:pb-10">
          <div
            className="relative bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-[20px] sm:rounded-[30px] overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.4)] flex flex-col"
            style={{ minHeight: 'clamp(240px, 45vw, 340px)' }}
          >
            <PaperLines />

            {/* Corner fold */}
            <div className="absolute top-[16px] right-[18px] sm:top-[19px] sm:right-[24px] pointer-events-none opacity-50 z-10">
              <svg width="20" height="18" viewBox="0 0 24.25 21" fill="none" className="hidden sm:block">
                <path d="M12.1244 1L1 20H23.2487L12.1244 1Z" fill="#D66A3E" fillOpacity="0.4" />
              </svg>
            </div>

            {/* Emotion Tags */}
            <div className="relative z-20 px-4 pt-4 pb-2 sm:px-7 sm:pt-6 flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
              {EMOTIONS.map(emo => {
                const isSelected = emotion === emo.id;
                const Icon = emo.icon;
                return (
                  <button
                    key={emo.id}
                    onClick={() => setEmotion(isSelected ? undefined : emo.id)}
                    className={[
                      'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer',
                      isSelected
                        ? 'bg-[rgba(214,106,62,0.2)] text-[#D66A3E] border border-[rgba(214,106,62,0.4)] shadow-[0_0_10px_rgba(214,106,62,0.15)]'
                        : 'bg-[rgba(255,255,255,0.03)] text-[#8a7f79] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)]'
                    ].join(' ')}
                    style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 500, fontSize: 'clamp(11px, 2vw, 13px)' }}
                  >
                    <Icon size={12} />
                    {emo.label}
                  </button>
                );
              })}
            </div>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Whisper into the void..."
              maxLength={MAX_CHARS + 20}
              autoFocus
              className="relative z-10 w-full bg-transparent px-4 sm:px-7 pt-3 sm:pt-4 pb-3 resize-none outline-none text-[#e8e2dd] placeholder-[rgba(138,127,121,0.6)] flex-1 break-words [overflow-wrap:anywhere]"
              style={{
                fontFamily: "'Alegreya Sans', sans-serif",
                fontWeight: 400,
                fontSize: 'clamp(16px, 3.5vw, 24px)',
                lineHeight: '1.4',
                minHeight: 'clamp(120px, 25vw, 180px)',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            />

            {/* Paper mode badge — in flow, above inline warning */}
            <div className="relative z-10 px-4 sm:px-7 pb-3 flex items-center">
              <div className="bg-[rgba(214,106,62,0.15)] border border-[rgba(214,106,62,0.3)] rounded-[999px] px-2.5 py-[4px] sm:px-3 sm:py-[5px]">
                <span
                  className="text-[#D66A3E] text-[11px] sm:text-[13px]"
                  style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 700 }}
                >
                  Paper mode
                </span>
              </div>
            </div>

            {/* Real-time SafeSpace inline warning */}
            <AnimatePresence>
              {text.trim() && (safeCheck.isCrisis || !safeCheck.allowed) && (
                <div className="relative z-10 px-4 sm:px-7 pb-4">
                  {safeCheck.isCrisis ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-[14px] sm:rounded-[16px] px-4 py-3 sm:py-4 border border-[rgba(255,255,255,0.1)] bg-[rgba(20,15,25,0.85)] backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <Heart className="text-[#D66A3E] animate-pulse flex-shrink-0" size={15} />
                        <span className="text-[#f9f3eb] font-bold text-[13px] sm:text-[15px]" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>We're here for you.</span>
                      </div>
                      <p className="text-[#b8ada5] text-[12px] sm:text-[14px] leading-relaxed" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
                        {safeCheck.reason}
                      </p>
                    </motion.div>
                  ) : (
                    <SafeSpaceInline severity={safeCheck.severity} message={safeCheck.reason} />
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 mt-4 sm:mt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span
                className="text-[#8a7f79] text-[12px] sm:text-[13px]"
                style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 500 }}
              >
                {text.length} / {MAX_CHARS}
              </span>
              <div className="w-[120px] sm:w-[160px] h-[5px] sm:h-[6px] bg-[rgba(255,255,255,0.1)] rounded-[999px] overflow-hidden">
                <div
                  className="h-full bg-[#D66A3E] rounded-[999px] transition-all duration-200 shadow-[0_0_8px_#D66A3E]"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
              <p
                className="text-[#8a7f79] text-[11px] sm:text-[13px]"
                style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 400 }}
              >
                Anonymous by default.
              </p>
              <motion.button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={[
                  'px-5 sm:px-8 rounded-[14px] sm:rounded-[18px] transition-colors duration-200 cursor-pointer flex items-center gap-2 flex-shrink-0',
                  canSubmit
                    ? 'bg-[#D66A3E] text-[#fffcf9] shadow-[0_0_15px_rgba(214,106,62,0.4)]'
                    : !safeCheck.allowed && text.trim() && !safeCheck.isCrisis
                      ? 'bg-[rgba(193,60,60,0.25)] text-[rgba(255,255,255,0.4)] cursor-not-allowed border border-[rgba(193,60,60,0.3)]'
                      : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.3)] cursor-not-allowed border border-[rgba(255,255,255,0.05)]',
                ].join(' ')}
                style={{
                  fontFamily: "'Alegreya Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(13px, 2.5vw, 16px)',
                  height: 'clamp(40px, 7vw, 52px)',
                }}
                whileHover={canSubmit ? { boxShadow: '0 0 24px rgba(214,106,62,0.6)', scale: 1.02, backgroundColor: '#bd5e37' } : {}}
                whileTap={canSubmit ? { scale: 0.97 } : {}}
                transition={{ duration: 0.18 }}
              >
                {isReleasing ? 'Releasing...' : !safeCheck.allowed && text.trim() && !safeCheck.isCrisis ? (
                  <span className="flex items-center gap-1 justify-center"><Shield size={14} /> Blocked</span>
                ) : 'Release into the sky'}
              </motion.button>
            </div>
          </div>
        </div>

        {/* SafeSpace Guard Overlay */}
        <SafeSpaceGuard
          visible={showGuard}
          severity={guardSeverity}
          message={guardMessage}
          onDismiss={() => {
            setShowGuard(false);
            setGuardSeverity('clean');
          }}
        />
      </motion.div>
    </motion.div>
  );
}
