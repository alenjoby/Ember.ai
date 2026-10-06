import imgStickerSheet from '../../assets/sticker-sheet.webp';

// Sprite grid: 5 columns × 3 rows, each cell is 1/5 width and 1/3 height
// Position expressed as [col, row] (0-indexed)
const STICKER_POSITIONS: Record<string, [number, number]> = {
  sticker_heart:   [0, 0],
  sticker_sparkle: [1, 0],
  sticker_moon:    [2, 0],
  sticker_star:    [3, 0],
  sticker_leaf:    [4, 0],
  sticker_hand:    [0, 1],
  sticker_hug:     [1, 1],
  sticker_candle:  [2, 1],
  sticker_shell:   [3, 1],
  sticker_drop:    [4, 1],
  sticker_cloud:   [0, 2],
  sticker_flower:  [1, 2],
  sticker_sun:     [2, 2],
  sticker_note:    [3, 2],
  sticker_globe:   [4, 2],
};

export function StickerIcon({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  // Strip coordinates if present (e.g. sticker_sparkle:55.6:55.6)
  const baseName = name.split(':')[0];
  const pos = STICKER_POSITIONS[baseName];
  if (!pos) return null;

  const [col, row] = pos;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <img
        alt=""
        src={imgStickerSheet}
        style={{
          position: 'absolute',
          width: `${5 * 100}%`,
          height: `${3 * 100}%`,
          left: `${-col * 100}%`,
          top: `${-row * 100}%`,
          maxWidth: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

