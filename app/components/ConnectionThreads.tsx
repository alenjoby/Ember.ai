import React, { useMemo } from 'react';
import type { Thought, Emotion } from '../types';

interface Thread {
  key: string;
  fromId: string;
  toId: string;
  emotion: string;
  color: string;
  path: string;
  sparkDuration: number;
}

const EMOTION_COLORS: Record<string, string> = {
  lonely: '#9DB4FF',
  anxious: '#8FE3D8',
  grieving: '#C9A7FF',
  hopeful: '#FFE7A3',
  joyful: '#FFE08A',
  grateful: '#D9F2B4',
};

interface ConnectionThreadsProps {
  thoughts: Thought[];
  hoveredThoughtId: string | null;
  selectedThoughtId: string | null;
  focusEmotion: string | null;
}

export const ConnectionThreads = React.memo(function ConnectionThreads({
  thoughts,
  hoveredThoughtId,
  selectedThoughtId,
  focusEmotion,
}: ConnectionThreadsProps) {
  const threads = useMemo<Thread[]>(() => {
    if (thoughts.length < 2) return [];

    const map = new Map<string, Thread>();

    for (let i = 0; i < thoughts.length; i++) {
      const a = thoughts[i];
      if (!a.emotion) continue;

      // Find peers with the same emotion
      const sameEmotionPeers = thoughts
        .filter(b => b.id !== a.id && b.emotion === a.emotion)
        .map(b => {
          const dx = (a.x || 0) - (b.x || 0);
          const dy = (a.y || 0) - (b.y || 0);
          return { peer: b, distSq: dx * dx + dy * dy };
        })
        .sort((p1, p2) => p1.distSq - p2.distSq)
        .slice(0, 2); // Connect to 2 nearest peers

      for (const { peer: b } of sameEmotionPeers) {
        const key = [a.id, b.id].sort().join('__');
        if (map.has(key)) continue;

        // Coordinates center on lantern flame: card width = 250, lamp is centered at x: 125, y: 82
        const ax = (a.x || 0) + 125;
        const ay = (a.y || 0) + 82;
        const bx = (b.x || 0) + 125;
        const by = (b.y || 0) + 82;

        const dist = Math.hypot(bx - ax, by - ay);
        const arcHeight = Math.min(80, Math.max(25, dist * 0.12));

        // Midpoint with upward / organic arch
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2 - arcHeight;

        const path = `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`;
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
        });
      }
    }

    return Array.from(map.values());
  }, [thoughts]);

  if (threads.length === 0) return null;

  return (
    <svg
      width={1}
      height={1}
      className="absolute left-0 top-0 pointer-events-none overflow-visible z-10"
      style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.4))' }}
    >
      <defs>
        {threads.map(th => (
          <path key={`path-def-${th.key}`} id={`p-${th.key}`} d={th.path} />
        ))}
      </defs>

      {threads.map(th => {
        const isFocused = focusEmotion === th.emotion;
        const isDimmed = focusEmotion !== null && !isFocused;
        const isConnectedToHover = hoveredThoughtId === th.fromId || hoveredThoughtId === th.toId;
        const isConnectedToSelected = selectedThoughtId === th.fromId || selectedThoughtId === th.toId;
        const isHighlighted = isConnectedToHover || isConnectedToSelected || isFocused;

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
              d={th.path}
              fill="none"
              stroke={th.color}
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
              strokeDasharray={isHighlighted ? 'none' : '4 3'}
              strokeLinecap="round"
            />

            {/* Traveling warm spark along thread */}
            {!isDimmed && (
              <g>
                {/* Glow aura of spark */}
                <circle r={isHighlighted ? 4 : 2.5} fill={th.color} opacity={isHighlighted ? 0.9 : 0.65}>
                  <animateMotion
                    dur={`${th.sparkDuration}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                  >
                    <mpath href={`#p-${th.key}`} />
                  </animateMotion>
                </circle>

                {/* Bright white-hot spark center */}
                <circle r={isHighlighted ? 1.8 : 1.2} fill="#ffffff" opacity={0.95}>
                  <animateMotion
                    dur={`${th.sparkDuration}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                  >
                    <mpath href={`#p-${th.key}`} />
                  </animateMotion>
                </circle>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
});
