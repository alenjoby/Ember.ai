import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

export function ScreenGlow({ isPlaying }: { isPlaying: boolean }) {
  const [volume, setVolume] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      setVolume(0);
      return;
    }

    let animationFrameId: number;
    const updateVolume = () => {
      const t = Date.now();
      // Create a complex organic wave that mimics a human voice volume curve
      // Fast flutter (120) + breathing wave (250) + slow swell (400)
      const wave = (Math.sin(t / 120) * 0.3) + (Math.sin(t / 250) * 0.4) + (Math.sin(t / 400) * 0.3);
      // Map to 0 - 1
      const normalized = Math.max(0, Math.min(1, wave + 0.5));
      setVolume(normalized);
      animationFrameId = requestAnimationFrame(updateVolume);
    };

    updateVolume();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  if (!mounted) return null;

  // Derive scales based on "volume"
  const scale1 = 1 + volume * 0.3;
  const scale2 = 1 + volume * 0.5;
  const scale3 = 1 + volume * 0.4;
  const opacity = isPlaying ? 1 : 0;

  return createPortal(
    <motion.div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 35 }} // Puts it above MainSpace (z-0 to z-30) but behind Modals (z-40+)
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      transition={{ duration: 0.8 }}
    >
      {/* Background dim for contrast */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-700" />
      
      {/* Glowing orbs mimicking Ember/Fire full-screen aura */}
      <motion.div
        className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] rounded-full mix-blend-screen filter blur-[120px] opacity-70"
        style={{ background: 'radial-gradient(circle, rgba(214,106,62,0.85) 0%, rgba(189,94,55,0.45) 40%, transparent 70%)' }}
        animate={{ scale: scale1, rotate: isPlaying ? 360 : 0 }}
        transition={{ scale: { type: 'spring', damping: 20, stiffness: 300 }, rotate: { duration: 30, repeat: Infinity, ease: 'linear' } }}
      />
      <motion.div
        className="absolute top-[40%] left-[40%] -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full mix-blend-screen filter blur-[100px] opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.8) 0%, rgba(217,119,6,0.4) 40%, transparent 70%)' }}
        animate={{ scale: scale2, x: isPlaying ? [0, 80, -80, 0] : 0, y: isPlaying ? [0, -80, 80, 0] : 0 }}
        transition={{ scale: { type: 'spring', damping: 20, stiffness: 300 }, x: { duration: 8, repeat: Infinity, ease: 'easeInOut' }, y: { duration: 11, repeat: Infinity, ease: 'easeInOut' } }}
      />
      <motion.div
        className="absolute top-[60%] left-[60%] -translate-x-1/2 -translate-y-1/2 w-[65vw] h-[65vw] max-w-[750px] max-h-[750px] rounded-full mix-blend-screen filter blur-[110px] opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.7) 0%, rgba(225,29,72,0.3) 40%, transparent 70%)' }}
        animate={{ scale: scale3, x: isPlaying ? [0, -70, 70, 0] : 0, y: isPlaying ? [0, 70, -70, 0] : 0 }}
        transition={{ scale: { type: 'spring', damping: 20, stiffness: 300 }, x: { duration: 9, repeat: Infinity, ease: 'easeInOut' }, y: { duration: 12, repeat: Infinity, ease: 'easeInOut' } }}
      />
    </motion.div>,
    document.body
  );
}
