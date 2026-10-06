// Performance test mode: N synthetic lanterns that exist only in this browser (never sent to
// the server, no AI calls), plus an FPS meter. Turn on with ?perf=100 (any number) or the
// dev-only "Perf" button. Lets us measure the canvas with a crowd, e.g. "100 people online".
import { useEffect, useRef, useState } from 'react';
import type { Thought, ThoughtResponse } from './App';

export const PERF_PREFIX = 'perf-';

export function isPerfThought(id: string): boolean {
  return id.startsWith(PERF_PREFIX);
}

/** Lantern count from ?perf=N (?perf alone = 100), or 0 when the URL doesn't ask for it. */
export function perfCountFromUrl(): number {
  const raw = new URLSearchParams(window.location.search).get('perf');
  if (raw === null) return 0;
  const n = raw === '' ? 100 : Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.min(500, Math.round(n))) : 100;
}

const EMOTIONS = ['lonely', 'anxious', 'grieving', 'hopeful', 'joyful', 'grateful'] as const;
const VARIANTS = ['warm', 'light', 'teal', 'rose'] as const;
const SHAPES = ['round', 'tall', 'paper', 'star'] as const;
// Same palettes as the spec presets, so test lanterns look like real ones.
const PALETTES: Record<string, [string, string, string]> = {
  lonely: ['#9DB4FF', '#3B4A8C', '#1A2040'],
  anxious: ['#8FE3D8', '#2A8C88', '#123B3A'],
  grieving: ['#C9A7FF', '#5B3A8C', '#24123D'],
  hopeful: ['#FFE7A3', '#F2B544', '#8A5A12'],
  joyful: ['#FFE08A', '#FF9F43', '#FF6B6B'],
  grateful: ['#D9F2B4', '#8DBF5A', '#3E5A22'],
};
const TEXTS = [
  'performance test lantern: a quiet evening',
  'performance test lantern: thinking about tomorrow',
  'performance test lantern: missing someone today',
  'performance test lantern: small good news',
  'performance test lantern: cannot sleep again',
  'performance test lantern: grateful for tea',
];
const STICKERS = ['sticker_heart', 'sticker_hug', 'sticker_candle', 'sticker_moon', 'sticker_star', 'sticker_leaf'];

// Deterministic pseudo-random so the layout is the same on every load.
function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function makePerfThoughts(count: number): Thought[] {
  const now = Date.now();
  const out: Thought[] = [];
  // Spread over a square that grows with the count (~320 px per lantern cell).
  const side = Math.ceil(Math.sqrt(count)) * 320;
  for (let i = 0; i < count; i++) {
    const emotion = EMOTIONS[i % EMOTIONS.length];
    const x = Math.round(rand(i + 1) * side - side / 2);
    const y = Math.round(rand(i + 1001) * side - side / 2);
    const replyCount = Math.floor(rand(i + 2001) * 4); // 0–3 orbiting replies
    const responses: ThoughtResponse[] = Array.from({ length: replyCount }, (_, r) => ({
      id: `${PERF_PREFIX}${i}-r${r}`,
      type: r % 2 === 0 ? 'sticker' : 'note',
      content: r % 2 === 0 ? STICKERS[(i + r) % STICKERS.length] : 'test reply',
      timestamp: new Date(now - 60_000),
      isAI: r === 2,
    }));
    out.push({
      id: `${PERF_PREFIX}${i}`,
      text: TEXTS[i % TEXTS.length],
      timestamp: new Date(now - 60_000),
      rotation: Math.round((rand(i + 3001) * 10 - 5) * 10) / 10,
      x,
      y,
      homeX: x,
      homeY: y,
      variant: VARIANTS[i % VARIANTS.length],
      width: 280,
      emotion,
      responses,
      aiStatus: 'done',
      showHelp: false,
      isExample: false,
      lantern: {
        palette: PALETTES[emotion],
        glow: 0.4 + rand(i + 4001) * 0.5,
        flicker: rand(i + 5001),
        shape: SHAPES[i % SHAPES.length],
        sound: { mood: 'night', instrument: 'pad', key: 'D minor', tempo: 50 },
        caption: 'performance test',
      },
    });
  }
  return out;
}

/** Small FPS meter (frames per second over the last second, plus the worst frame time). */
export function PerfOverlay({ count }: { count: number }) {
  const [stats, setStats] = useState({ fps: 0, worstMs: 0 });
  const frames = useRef<number[]>([]);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastReport = last;
    const tick = (now: number) => {
      frames.current.push(now - last);
      last = now;
      if (now - lastReport >= 1000) {
        const f = frames.current;
        setStats({ fps: Math.round((f.length * 1000) / (now - lastReport)), worstMs: Math.round(Math.max(...f)) });
        frames.current = [];
        lastReport = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const color = stats.fps >= 50 ? '#7ee787' : stats.fps >= 30 ? '#f2cc60' : '#ff7b72';
  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] rounded-full px-3 py-1 text-xs font-mono pointer-events-none"
      style={{ background: 'rgba(0,0,0,0.75)', color: '#f9f3eb', border: '1px solid rgba(255,255,255,0.15)' }}
    >
      perf mode · {count} test lanterns · <span style={{ color }}>{stats.fps} fps</span> · worst frame {stats.worstMs} ms
    </div>
  );
}
