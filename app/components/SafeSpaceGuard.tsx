/**
 * SafeSpaceGuard — Beautiful animated rejection overlay
 * 
 * Shows a warm, compassionate message when negativity is detected.
 * Uses glassmorphism, ember glow, and gentle animations.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldBan, Sparkles, Feather } from 'lucide-react';
import type { Severity } from '../safeSpace';
interface SafeSpaceGuardProps {
  visible: boolean;
  severity: Severity;
  message: string;
  onDismiss: () => void;
}

const SEVERITY_CONFIG = {
  mild: {
    icon: <Feather size={32} />,
    title: 'Gentle reminder',
    gradient: 'radial-gradient(ellipse at 50% 50%, rgba(214,165,62,0.25) 0%, transparent 70%)',
    borderColor: 'rgba(214,165,62,0.4)',
    glowColor: 'rgba(214,165,62,0.15)',
    iconBg: 'rgba(214,165,62,0.12)',
  },
  moderate: {
    icon: <ShieldAlert size={32} />,
    title: 'SafeSpace activated',
    gradient: 'radial-gradient(ellipse at 50% 50%, rgba(214,106,62,0.3) 0%, transparent 70%)',
    borderColor: 'rgba(214,106,62,0.5)',
    glowColor: 'rgba(214,106,62,0.2)',
    iconBg: 'rgba(214,106,62,0.15)',
  },
  severe: {
    icon: <ShieldBan size={32} />,
    title: 'This can\'t be sent',
    gradient: 'radial-gradient(ellipse at 50% 50%, rgba(193,60,60,0.3) 0%, transparent 70%)',
    borderColor: 'rgba(193,60,60,0.5)',
    glowColor: 'rgba(193,60,60,0.2)',
    iconBg: 'rgba(193,60,60,0.15)',
  },
  clean: {
    icon: '',
    title: '',
    gradient: '',
    borderColor: '',
    glowColor: '',
    iconBg: '',
  },
};

export function SafeSpaceGuard({ visible, severity, message, onDismiss }: SafeSpaceGuardProps) {
  if (severity === 'clean') return null;
  const config = SEVERITY_CONFIG[severity];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-50 flex items-center justify-center p-6"
          style={{ backdropFilter: 'blur(8px)', background: 'rgba(5,3,8,0.6)' }}
          onClick={onDismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-[380px] w-full rounded-[28px] overflow-hidden"
            style={{
              background: 'rgba(20,15,25,0.92)',
              border: `1px solid ${config.borderColor}`,
              boxShadow: `0 24px 48px rgba(0,0,0,0.6), 0 0 40px ${config.glowColor}, inset 0 1px 1px rgba(255,255,255,0.05)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: config.gradient }}
            />

            {/* Shield pulse animation */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: `linear-gradient(90deg, transparent, ${config.borderColor}, transparent)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative z-10 p-7 flex flex-col items-center text-center gap-4">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, duration: 0.4, type: 'spring', stiffness: 200 }}
                className="w-[64px] h-[64px] rounded-full flex items-center justify-center text-[32px]"
                style={{ background: config.iconBg, boxShadow: `0 0 24px ${config.glowColor}` }}
              >
                {config.icon}
              </motion.div>

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[#f9f3eb] text-[20px] leading-tight"
                style={{ fontFamily: "'Alegreya', serif", fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
              >
                {config.title}
              </motion.h3>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[#b8ada5] text-[15px] leading-[1.6]"
                style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 400 }}
              >
                {message}
              </motion.p>

              {/* Divider */}
              <div className="w-12 h-px bg-[rgba(255,255,255,0.08)] my-1" />

              {/* Encouragement */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-[#8a7f79] text-[13px] leading-[1.5] italic"
                style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
              >
                Your feelings are valid. Try expressing what's underneath — the hurt, the loneliness, the need. That's always welcome here.
              </motion.p>

              {/* Try Again button */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={onDismiss}
                className="mt-1 px-7 h-[44px] rounded-[16px] text-[15px] cursor-pointer transition-all duration-200"
                style={{
                  fontFamily: "'Alegreya Sans', sans-serif",
                  fontWeight: 700,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#f9f3eb',
                }}
                whileHover={{
                  background: 'rgba(255,255,255,0.1)',
                  boxShadow: '0 0 16px rgba(255,255,255,0.05)',
                  scale: 1.02,
                }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="flex items-center gap-2 justify-center">
                  Try again with warmth <Sparkles size={16} />
                </div>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline SafeSpace indicator — shows a subtle warning BELOW the input
 * as the user types (real-time feedback before they even try to send)
 */
interface SafeSpaceInlineProps {
  severity: Severity;
  message: string;
}

export function SafeSpaceInline({ severity, message }: SafeSpaceInlineProps) {
  if (severity === 'clean') return null;

  const colors: Record<string, { text: string; bg: string; border: string }> = {
    mild: { text: '#d6a53e', bg: 'rgba(214,165,62,0.08)', border: 'rgba(214,165,62,0.2)' },
    moderate: { text: '#d66a3e', bg: 'rgba(214,106,62,0.08)', border: 'rgba(214,106,62,0.2)' },
    severe: { text: '#c13c3c', bg: 'rgba(193,60,60,0.08)', border: 'rgba(193,60,60,0.2)' },
  };

  const c = colors[severity] || colors.mild;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-[12px] px-4 py-2.5 flex items-center gap-2.5 overflow-hidden"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <span className="flex-shrink-0 text-inherit opacity-80" style={{ color: c.text }}><Shield size={16} /></span>
      <span
        className="text-[13px] leading-[1.4]"
        style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 500, color: c.text }}
      >
        {message}
      </span>
    </motion.div>
  );
}
