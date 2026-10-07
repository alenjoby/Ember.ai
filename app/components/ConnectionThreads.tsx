import React, { useImperativeHandle, useMemo, useRef } from 'react';
import type { Thought, Emotion } from '../types';

interface Thread {
  key: string;
  fromId: string;
  toId: string;
  emotion: string;
  color: string;
  path: string;
  sparkDuration: number;
  // Endpoint (flame) coordinates, so a drag can redraw the thread live.
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

const EMOTION_COLORS: Record<string, string> = {
  lonely: '#9DB4FF',
  anxious: '#8FE3D8',
  grieving: '#C9A7FF',
  hopeful: '#FFE7A3',
  joyful: '#FFE08A',
  grateful: '#D9F2B4',
};

const STICK_KNOT_Y = 7;

/** Upward / organic arch between two lantern sticks. */
function threadPath(ax: number, ay: number, bx: number, by: number): string {
  const dist = Math.hypot(bx - ax, by - ay);
  const arcHeight = Math.min(80, Math.max(25, dist * 0.12));
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2 - arcHeight;
  return `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
}

export interface ConnectionThreadsHandle {
  /** Redraw the threads touching a lantern that is being dragged by (dx, dy), without a React render. */
  moveNode: (id: string, dx: number, dy: number) => void;
}

interface ConnectionThreadsProps {
  thoughts: Thought[];
  hoveredThoughtId: string | null;
  selectedThoughtId: string | null;
  focusEmotion: string | null;
}

export const ConnectionThreads = React.memo(React.forwardRef<ConnectionThreadsHandle, ConnectionThreadsProps>(function ConnectionThreads({
  thoughts,
  hoveredThoughtId,
  selectedThoughtId,
  focusEmotion,
}, ref) {
  const svgRef = useRef<SVGSVGElement>(null);

  const threads = useMemo<Thread[]>(() => {
    if (thoughts.length < 2) return [];

    const map = new Map<string, Thread>();

    for (let i = 0; i < thoughts.length; i++) {
      const a = thoughts[i];

      // Find peers: if 'a' has an emotion, connect to peers with the same emotion.
      // If 'a' has no emotion (unnamed / crisis post), connect to other lanterns without a feeling.
      const maxPeers = thoughts.length > 20 ? 1 : 2;
      const home = (t: Thought) => ({
        x: (t as Thought & { homeX?: number }).homeX ?? t.x ?? 0,
        y: (t as Thought & { homeY?: number }).homeY ?? t.y ?? 0,
      });
      const ah = home(a);
      const peers = thoughts
        .filter(b => b.id !== a.id && (a.emotion ? b.emotion === a.emotion : !b.emotion))
        .map(b => {
          const bh = home(b);
          const dx = ah.x - bh.x;
          const dy = ah.y - bh.y;
          return { peer: b, distSq: dx * dx + dy * dy };
        })
        .sort((p1, p2) => p1.distSq - p2.distSq)
        .slice(0, maxPeers);

      for (const { peer: b } of peers) {
        const key = [a.id, b.id].sort().join('__');
        if (map.has(key)) continue;

        // Threads are tied to each lantern's stick: card width = 250, so the stick is at x: 125.
        // The stick runs from y: 0 to ~24 and lanterns bob up to 8 px, so the knot sits at y: 7,
        // which stays on the stick through the whole bob (the tip itself would drift off it).
        const ax = (a.x || 0) + 125;
        const ay = (a.y || 0) + STICK_KNOT_Y;
        const bx = (b.x || 0) + 125;
        const by = (b.y || 0) + STICK_KNOT_Y;

        const path = threadPath(ax, ay, bx, by);
        // Lanterns without a feeling connect with a warm ember-coloured thread (#D66A3E)
        const color = a.emotion
          ? (a.lantern?.palette?.[0] || EMOTION_COLORS[a.emotion] || '#D66A3E')
          : (a.lantern?.palette?.[0] || '#D66A3E');

        // Organic duration for traveling pulse between 5s and 9s
        const charSum = (a.id + b.id).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        const sparkDuration = 5 + (charSum % 4);

        map.set(key, {
          key,
          fromId: a.id,
          toId: b.id,
          emotion: a.emotion || '',
          color,
          path,
          sparkDuration,
          ax,
          ay,
          bx,
          by,
        });
      }
    }

    return Array.from(map.values());
  }, [thoughts]);

  // Live drag: rewrite the `d` of the affected paths directly (called once per animation frame).
  const threadsRef = useRef(threads);
  threadsRef.current = threads;
  useImperativeHandle(ref, () => ({
    moveNode(id, dx, dy) {
      const svg = svgRef.current;
      if (!svg) return;
      for (const th of threadsRef.current) {
        if (th.fromId !== id && th.toId !== id) continue;
        const ax = th.ax + (th.fromId === id ? dx : 0);
        const ay = th.ay + (th.fromId === id ? dy : 0);
        const bx = th.bx + (th.toId === id ? dx : 0);
        const by = th.by + (th.toId === id ? dy : 0);
        const d = threadPath(ax, ay, bx, by);
        svg.querySelectorAll(`[data-thread="${th.key}"]`).forEach(el => el.setAttribute('d', d));
        // The knots ride along with the dragged lantern's stick.
        svg.querySelectorAll(`[data-knot="${th.key}"]`).forEach(el => {
          const end = el.getAttribute('data-end') === 'a';
          el.setAttribute('cx', String(end ? ax : bx));
          el.setAttribute('cy', String(end ? ay : by));
        });
      }
    },
  }), []);

  if (threads.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      width={1}
      height={1}
      // No CSS filter on this SVG: a filter re-rasterized every thread on each frame while sparks moved.
      className="absolute left-0 top-0 pointer-events-none overflow-visible z-10"
    >
      <defs>
        {threads.map(th => (
          <path key={`path-def-${th.key}`} id={`p-${th.key}`} data-thread={th.key} d={th.path} />
        ))}
      </defs>

      {threads.map((th, index) => {
        const isFocused = focusEmotion !== null && th.emotion !== '' && focusEmotion === th.emotion;
        const isDimmed = focusEmotion !== null && !isFocused;
        const isConnectedToHover = hoveredThoughtId === th.fromId || hoveredThoughtId === th.toId;
        const isConnectedToSelected = selectedThoughtId === th.fromId || selectedThoughtId === th.toId;
        const isHighlighted = isConnectedToHover || isConnectedToSelected || isFocused;
        // Sparks are SVG animations on the main thread: highlighted threads plus a few others.
        const canAnimateSpark = !isDimmed && (isHighlighted || index < 10);

        const strokeOpacity = isDimmed
          ? 0.04
          : isHighlighted
          ? 0.7
          : 0.26;

        const strokeWidth = isHighlighted ? 1.8 : 1.1;
        // Knot where the thread is tied to each stick: a small bead with a soft halo.
        const knotOpacity = isDimmed ? 0.08 : isHighlighted ? 1 : 0.6;
        const knots = (['a', 'b'] as const).map(end => (
          <React.Fragment key={end}>
            <circle
              data-knot={th.key}
              data-end={end}
              cx={end === 'a' ? th.ax : th.bx}
              cy={end === 'a' ? th.ay : th.by}
              r={isHighlighted ? 6 : 4.5}
              fill={th.color}
              opacity={knotOpacity * 0.22}
            />
            <circle
              data-knot={th.key}
              data-end={end}
              cx={end === 'a' ? th.ax : th.bx}
              cy={end === 'a' ? th.ay : th.by}
              r={isHighlighted ? 2.4 : 1.9}
              fill={isHighlighted ? '#fff3e0' : th.color}
              opacity={knotOpacity}
            />
          </React.Fragment>
        ));

        return (
          <g key={th.key} className="transition-opacity duration-500">
            {/* Soft background glow line */}
            {isHighlighted && (
              <path
                data-thread={th.key}
                d={th.path}
                fill="none"
                stroke={th.color}
                strokeWidth={strokeWidth * 3.5}
                strokeOpacity={strokeOpacity * 0.35}
                strokeLinecap="round"
              />
            )}

            {/* Main thread line: solid, so it always reaches the knots (a dash pattern could end
                on a gap and leave the thread short of the stick) */}
            <path
              data-thread={th.key}
              d={th.path}
              fill="none"
              stroke={th.color}
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
              strokeLinecap="round"
            />

            {knots}

            {/* Traveling warm spark along thread (one circle; the white core doubled the work) */}
            {canAnimateSpark && (
              <circle r={isHighlighted ? 3.5 : 2.2} fill={isHighlighted ? '#fff3e0' : th.color} opacity={isHighlighted ? 0.95 : 0.7}>
                <animateMotion
                  dur={`${th.sparkDuration}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                >
                  <mpath href={`#p-${th.key}`} />
                </animateMotion>
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}));
