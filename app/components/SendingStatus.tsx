import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A glowing ember with calm, changing steps, shown while something is being sent (the safety
 * check takes a few seconds, voice notes longer), so the app never looks stuck.
 */
export function SendingStatus({ steps, className = '' }: { steps: string[]; className?: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 2200);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <div className={`flex items-center justify-center gap-2.5 ${className}`} role="status" aria-live="polite">
      <motion.span
        className="w-2 h-2 rounded-full bg-[#D66A3E] flex-shrink-0"
        animate={{
          scale: [1, 1.5, 1],
          boxShadow: ['0 0 8px 2px rgba(214,106,62,0.5)', '0 0 18px 6px rgba(214,106,62,0.8)', '0 0 8px 2px rgba(214,106,62,0.5)'],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <AnimatePresence mode="wait">
        <motion.span
          key={step}
          className="text-[#f9f3eb]/90 text-[13px] italic"
          style={{ fontFamily: "'Alegreya', serif" }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
        >
          {steps[step]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
