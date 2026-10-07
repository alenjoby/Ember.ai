// Shared look for the film. Every animation is driven by useCurrentFrame() (Remotion renders
// frame by frame, so CSS keyframe animations would not render smoothly).
import React from 'react';
import { AbsoluteFill, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont as loadSerif } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadSans } from '@remotion/google-fonts/Outfit';

// Fraunces: warm, expressive display serif for the statements. Outfit: clean geometric sans
// for labels and captions.
export const serif = loadSerif('normal', { weights: ['300', '400', '600'], subsets: ['latin'] }).fontFamily;
loadSerif('italic', { weights: ['300', '400'], subsets: ['latin'] });
export const sans = loadSans('normal', { weights: ['300', '400', '500', '600'], subsets: ['latin'] }).fontFamily;

export const C = {
  bg0: '#241611',
  bg1: '#120c09',
  bg2: '#080504',
  ember: '#D66A3E',
  cream: '#F9F3EB',
  muted: '#a89992',
};

export const PALETTES: Record<string, [string, string, string]> = {
  lonely: ['#9DB4FF', '#3B4A8C', '#1A2040'],
  anxious: ['#8FE3D8', '#2A8C88', '#123B3A'],
  grieving: ['#C9A7FF', '#5B3A8C', '#24123D'],
  hopeful: ['#FFE7A3', '#F2B544', '#8A5A12'],
  joyful: ['#FFE08A', '#FF9F43', '#FF6B6B'],
  grateful: ['#D9F2B4', '#8DBF5A', '#3E5A22'],
};

/** Fade a block in at the start and out at the end of its sequence. */
export const Fade: React.FC<{ children: React.ReactNode; inF?: number; outF?: number; dur: number; style?: React.CSSProperties }> = ({
  children, inF = 10, outF = 10, dur, style,
}) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, inF, dur - outF, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity, ...style }}>{children}</AbsoluteFill>;
};

const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const STARS = Array.from({ length: 220 }, (_, i) => ({
  x: rand(i) * 1920, y: rand(i + 500) * 1080, r: rand(i + 900) < 0.15 ? 2.2 : 1.2, p: rand(i + 1300) * Math.PI * 2, s: 0.02 + rand(i + 1700) * 0.05,
}));

/** Warm night sky with slowly twinkling stars. */
export const Sky: React.FC<{ dim?: number }> = ({ dim = 1 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 15%, ${C.bg0} 0%, ${C.bg1} 60%, ${C.bg2} 100%)` }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', opacity: dim }}>
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.25 + 0.6 * (0.5 + 0.5 * Math.sin(s.p + f * s.s))} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

/** Text typed in character by character. */
export const TypeText: React.FC<{ text: string; start?: number; cps?: number; style?: React.CSSProperties }> = ({ text, start = 0, cps = 22, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shown = Math.max(0, Math.floor(((f - start) / fps) * cps));
  const caret = Math.floor(f / 15) % 2 === 0 && shown < text.length + 20;
  return (
    <span style={style}>
      {text.slice(0, shown)}
      <span style={{ opacity: caret ? 0.8 : 0 }}>|</span>
    </span>
  );
};

/** A line that rises and fades in at `at` frames. */
export const Line: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * 18}px)`, ...style }}>{children}</div>;
};

const SHAPES: Record<string, React.ReactNode> = {
  tall: <rect x={22} y={30} width={76} height={120} rx={26} />,
  round: <ellipse cx={60} cy={92} rx={50} ry={56} />,
  paper: <polygon points="60,24 100,56 100,126 60,154 20,126 20,56" />,
  star: <polygon points="60,26 75,70 120,72 84,98 96,144 60,118 24,144 36,98 0,72 45,70" />,
};

/** Frame-driven lantern (same shapes and palettes as the app). */
export const Lantern: React.FC<{
  palette: [string, string, string]; shape?: string; size?: number; glow?: number; flicker?: number; seed?: number; lit?: number; id: string;
}> = ({ palette, shape = 'round', size = 1, glow = 0.6, flicker = 0.3, seed = 0, lit = 1, id }) => {
  const f = useCurrentFrame();
  const w = 0.55 + 0.45 * Math.sin((f + seed * 37) * (0.06 + flicker * 0.12));
  const halo = (0.3 + glow * 0.45) * (0.85 + 0.15 * w) * lit;
  const [core, mid, edge] = palette;
  const grey: [string, string, string] = ['#716660', '#3d3430', '#1c1715'];
  const p = lit < 1 ? grey.map((g, i) => (lit > 0.5 ? palette[i] : g)) : palette;
  return (
    <div style={{ position: 'relative', width: 120 * size, height: 180 * size }}>
      <div style={{
        position: 'absolute', left: '50%', top: '52%', width: (120 + glow * 140) * size, height: (120 + glow * 140) * size,
        transform: 'translate(-50%,-50%)', borderRadius: '50%', opacity: halo,
        background: `radial-gradient(circle, ${mid}cc 0%, ${mid}44 40%, ${mid}00 70%)`,
      }} />
      <svg viewBox="0 0 120 180" width={120 * size} height={180 * size} style={{ position: 'absolute', overflow: 'visible' }}>
        <defs>
          <radialGradient id={`g-${id}`} cx="50%" cy="58%" r="62%">
            <stop offset="0%" stopColor="#fff8ec" />
            <stop offset="26%" stopColor={lit < 0.5 ? p[0] : core} />
            <stop offset="70%" stopColor={lit < 0.5 ? p[1] : mid} />
            <stop offset="100%" stopColor={lit < 0.5 ? p[2] : edge} />
          </radialGradient>
        </defs>
        <line x1={60} y1={0} x2={60} y2={28} stroke="#6b5446" strokeWidth={2.5} strokeLinecap="round" />
        <g fill={`url(#g-${id})`} stroke={edge} strokeWidth={2} opacity={0.75 + 0.25 * w * lit}>{SHAPES[shape]}</g>
        <circle cx={60} cy={92} r={14 + 3 * w} fill="#fff8ec" opacity={0.55 * lit + 0.25 * w * lit} />
      </svg>
    </div>
  );
};

/** Big serif statement. */
export const Title: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 64, style }) => (
  <div style={{
    fontFamily: serif, fontWeight: 400, letterSpacing: '-0.015em', color: C.cream, fontSize: size, lineHeight: 1.2,
    textAlign: 'center', textShadow: '0 4px 30px rgba(0,0,0,0.6)', ...style,
  }}>
    {children}
  </div>
);

/** A real app recording in a soft-glow window, with a feature label and caption. */
export const AppClip: React.FC<{
  src: string; from: number; dur: number; label: string; caption: React.ReactNode; scale?: number;
}> = ({ src, from, dur, label, caption, scale = 0.8 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f, fps, config: { damping: 200 } });
  const zoom = interpolate(f, [0, dur], [1, 1.04]);
  const W = 1920 * scale;
  const H = 1080 * scale;
  return (
    <Fade dur={dur} inF={12} outF={12}>
      <Sky dim={0.6} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 70 }}>
        <div style={{
          fontFamily: sans, fontWeight: 500, fontSize: 26, letterSpacing: 5, textTransform: 'uppercase', color: C.ember, marginBottom: 18,
          opacity: enter,
        }}>
          {label}
        </div>
        <div style={{
          position: 'relative', width: W, height: H, borderRadius: 22, overflow: 'hidden', transform: `scale(${0.96 + 0.04 * enter})`,
          boxShadow: `0 30px 120px rgba(0,0,0,0.7), 0 0 80px ${C.ember}33`, border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <div style={{ width: '100%', height: '100%', transform: `scale(${zoom})` }}>
            <OffthreadVideo src={staticFile(src)} startFrom={Math.round(from * fps)} muted style={{ width: '100%', height: '100%' }} />
          </div>
          {/* The screen recordings show Windows' "Activate Windows" note (bottom right) and the
              dev-only Demo/Perf buttons (bottom left): soft dark corners hide them over the sky. */}
          <div style={{
            position: 'absolute', right: 0, bottom: 0, width: '38%', height: '24%', pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 100% 100%, rgba(10,7,6,0.98) 62%, rgba(10,7,6,0) 92%)',
          }} />
          <div style={{
            position: 'absolute', left: 0, bottom: 0, width: '18%', height: '17%', pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 0% 100%, rgba(10,7,6,0.98) 62%, rgba(10,7,6,0) 92%)',
          }} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 18 }}>
        <div style={{
          fontFamily: serif, fontSize: 34, color: C.cream, background: 'rgba(10,7,12,0.72)', padding: '12px 28px', borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.1)', maxWidth: 1500, textAlign: 'center',
        }}>
          {caption}
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
