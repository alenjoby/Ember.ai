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

/** Upward / organic arch between two lantern flames. */
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
      if (!a.emotion) continue;

      // Find peers with the same emotion (scale down peer count when density is high)
      const maxPeers = thoughts.length > 20 ? 1 : 2;
      const sameEmotionPeers = thoughts
        .filter(b => b.id !== a.id && b.emotion === a.emotion)
        .map(b => {
          const dx = (a.x || 0) - (b.x || 0);
          const dy = (a.y || 0) - (b.y || 0);
          return { peer: b, distSq: dx * dx + dy * dy };
        })
        .sort((p1, p2) => p1.distSq - p2.distSq)
        .slice(0, maxPeers);

      for (const { peer: b } of sameEmotionPeers) {
        const key = [a.id, b.id].sort().join('__');
        if (map.has(key)) continue;

        // Coordinates center on lantern flame: card width = 250, lamp is centered at x: 125, y: 82
        const ax = (a.x || 0) + 125;
        const ay = (a.y || 0) + 82;
        const bx = (b.x || 0) + 125;
        const by = (b.y || 0) + 82;

        const path = threadPath(ax, ay, bx, by);
        const color = a.lantern?.palette?.[0] || EMOTION_COLORS[a.emotion] || '#d66a3e';

        // Organic duration for traveling pulse between 5s and 9s
        const charSum = (a.id + b.id).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        const sparkDuration = 5 + (charSum % 4);

        map.set(key, {
          key,
          fromId: a.id,
          toId: b.id,
          emotion: a.emotion,
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
        const d = threadPath(
          th.ax + (th.fromId === id ? dx : 0),
          th.ay + (th.fromId === id ? dy : 0),
          th.bx + (th.toId === id ? dx : 0),
          th.by + (th.toId === id ? dy : 0),
        );
        svg.querySelectorAll(`[data-thread="${th.key}"]`).forEach(el => el.setAttribute('d', d));
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
        const isFocused = focusEmotion === th.emotion;
        const isDimmed = focusEmotion !== null && !isFocused;
        const isConnectedToHover = hoveredThoughtId === th.fromId || hoveredThoughtId === th.toId;
        const isConnectedToSelected = selectedThoughtId === th.fromId || selectedThoughtId === th.toId;
        const isHighlighted = isConnectedToHover || isConnectedToSelected || isFocused;
        // Sparks are SVG animations on the main thread: highlighted threads plus a few others.
        const canAnimateSpark = !isDimmed && (isHighlighted || index < 10);

        const strokeOpacity = isDimmed
          ? 0.04
          : isHighlighted
          ? 0.65
          : 0.22;

        const strokeWidth = isHighlighted ? 1.8 : 1.2;

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

            {/* Main thread line */}
            <path
              data-thread={th.key}
              d={th.path}
              fill="none"
              stroke={th.color}
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
              strokeDasharray={isHighlighted ? 'none' : '4 3'}
              strokeLinecap="round"
            />

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
