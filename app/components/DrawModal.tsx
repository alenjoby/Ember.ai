import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, Brush, Eraser, Undo2, Redo2, Trash2, Send, Smile, Shield, Loader2 } from 'lucide-react';
import { SendingStatus } from './SendingStatus';
import { StickerIcon } from './StickerIcon';
import imgStickerSheet from '../../assets/sticker-sheet.webp';

// Sprite: 5 cols × 3 rows
const STICKER_SPRITE_POS: Record<string, [number, number]> = {
  sticker_heart:   [0, 0], sticker_sparkle: [1, 0], sticker_moon: [2, 0],
  sticker_star:    [3, 0], sticker_leaf:    [4, 0], sticker_hand: [0, 1],
  sticker_hug:     [1, 1], sticker_candle:  [2, 1], sticker_shell:[3, 1],
  sticker_drop:    [4, 1], sticker_cloud:   [0, 2], sticker_flower:[1, 2],
  sticker_sun:     [2, 2], sticker_note:    [3, 2], sticker_globe:[4, 2],
};

interface DrawModalProps {
  onClose: () => void;
  onSend: (drawingData: string) => Promise<void> | void;
}

type Tool = 'pen' | 'brush' | 'eraser' | 'sticker';

const COLORS = [
  '#f9f3eb',
  '#D66A3E',
  '#6496ff',
  '#0dffd2',
  '#ff6eb5',
  '#eab308',
  '#10b981',
  '#a855f7',
];

const STICKERS = [
  'sticker_heart', 'sticker_sparkle', 'sticker_moon', 'sticker_star', 
  'sticker_leaf', 'sticker_hand', 'sticker_hug', 'sticker_candle', 
  'sticker_shell', 'sticker_drop', 'sticker_cloud', 'sticker_flower', 
  'sticker_sun', 'sticker_note', 'sticker_globe'
];

interface Point { x: number; y: number; }

interface Stroke {
  points: Point[];
  color: string;
  tool: Tool;
  lineWidth: number;
  stickerName?: string;
}

const TOOL_WIDTHS: Record<Tool, number> = {
  pen: 3,
  brush: 14,
  eraser: 30,
  sticker: 70,
};

export function DrawModal({ onClose, onSend }: DrawModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [selectedSticker, setSelectedSticker] = useState<string>('sticker_heart');
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const spriteImageRef = useRef<HTMLImageElement | null>(null);

  const getCtx = () => canvasRef.current?.getContext('2d', { willReadFrequently: true }) ?? null;

  const redrawAll = useCallback((strokesList: Stroke[]) => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokesList.forEach(stroke => {
      if (stroke.tool === 'sticker') {
        if (stroke.points.length > 0 && stroke.stickerName) {
          const sprite = spriteImageRef.current;
          const pos = STICKER_SPRITE_POS[stroke.stickerName];
          if (sprite && pos) {
            const [col, row] = pos;
            const cellW = sprite.naturalWidth / 5;
            const cellH = sprite.naturalHeight / 3;
            const pt = stroke.points[0];
            const size = stroke.lineWidth;
            ctx.save();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.drawImage(
              sprite,
              col * cellW, row * cellH, cellW, cellH,
              pt.x - size / 2, pt.y - size / 2, size, size
            );
            ctx.restore();
          }
        }
        return;
      }

      if (stroke.points.length < 2) return;
      ctx.save();
      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color;
      ctx.lineWidth = stroke.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (stroke.tool === 'brush') ctx.globalAlpha = 0.6;
      
      // Strong glow on dark canvas
      if (stroke.tool !== 'eraser') {
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = stroke.tool === 'pen' ? 8 : 15;
      }
      
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const mp = {
          x: (stroke.points[i - 1].x + stroke.points[i].x) / 2,
          y: (stroke.points[i - 1].y + stroke.points[i].y) / 2,
        };
        ctx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, mp.x, mp.y);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = imgStickerSheet;
    img.onload = () => {
      spriteImageRef.current = img;
      redrawAll(strokes);
    };
  }, [redrawAll, strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    redrawAll(strokes);
    
    const handleResize = () => {
       const r = container.getBoundingClientRect();
       canvas.width = r.width;
       canvas.height = r.height;
       redrawAll(strokes);
     };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawAll, strokes]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);

    if (tool === 'sticker') {
      const newStroke: Stroke = {
        points: [point],
        color: 'transparent',
        tool: 'sticker',
        lineWidth: TOOL_WIDTHS[tool],
        stickerName: selectedSticker,
      };
      const newStrokes = [...strokes, newStroke];
      setStrokes(newStrokes);
      redrawAll(newStrokes);
      setRedoStack([]);
      return;
    }

    isDrawingRef.current = true;
    currentStrokeRef.current = {
      points: [point],
      color,
      tool,
      lineWidth: TOOL_WIDTHS[tool],
    };
    setRedoStack([]);
  };

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const point = getCanvasPoint(e);
    currentStrokeRef.current.points.push(point);

    // Draw incrementally
    const ctx = getCtx();
    const stroke = currentStrokeRef.current;
    if (!ctx || stroke.points.length < 2) return;

    const pts = stroke.points;
    ctx.save();
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.tool === 'eraser' ? 'rgba(0,0,0,1)' : stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (stroke.tool === 'brush') ctx.globalAlpha = 0.6;
    
    if (stroke.tool !== 'eraser') {
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = stroke.tool === 'pen' ? 8 : 15;
    }
      
    ctx.beginPath();
    const last = pts[pts.length - 2];
    const curr = pts[pts.length - 1];
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
    ctx.restore();
  };

  const onPointerUp = () => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current.points.length > 1) {
      const newStrokes = [...strokes, currentStrokeRef.current];
      setStrokes(newStrokes);
    }
    currentStrokeRef.current = null;
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const newStrokes = strokes.slice(0, -1);
    setRedoStack(prev => [...prev, [strokes[strokes.length - 1]]]);
    setStrokes(newStrokes);
    redrawAll(newStrokes);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const toRedo = redoStack[redoStack.length - 1];
    const newStrokes = [...strokes, ...toRedo];
    setRedoStack(prev => prev.slice(0, -1));
    setStrokes(newStrokes);
    redrawAll(newStrokes);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    if (strokes.length > 0) setRedoStack(prev => [...prev, strokes]);
    setStrokes([]);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSend = async () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0 || isSending) return;
    const dataUrl = canvas.toDataURL('image/png');
    setIsSending(true);
    try {
      await onSend(dataUrl); // the parent closes this panel once it's sent
    } catch (err) {
      // Refused or failed (the app shows why): keep the drawing so it can be changed and resent.
      console.warn('Could not send drawing, keeping it:', err);
    } finally {
      setIsSending(false);
    }
  };

  const toolButtons: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'pen', icon: <PenTool size={18} />, label: 'Pen' },
    { id: 'brush', icon: <Brush size={18} />, label: 'Brush' },
    { id: 'eraser', icon: <Eraser size={18} />, label: 'Eraser' },
    { id: 'sticker', icon: <Smile size={18} />, label: 'Stickers' },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 lg:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-[rgba(5,3,8,0.85)] backdrop-blur-md" onClick={onClose} />

      <motion.div
        className="relative w-full h-[100dvh] sm:h-[80vh] max-w-5xl bg-[rgba(255,255,255,0.03)] backdrop-blur-3xl border-0 sm:border border-[rgba(255,255,255,0.15)] rounded-none sm:rounded-[32px] shadow-[0px_32px_64px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden flex flex-col"
        initial={{ y: 30, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 20, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Top Header */}
        <div className="absolute top-0 inset-x-0 h-[72px] flex items-center justify-between px-8 z-10 pointer-events-none">
          <div>
             <h2 className="text-[#f9f3eb] text-lg font-medium tracking-wide drop-shadow-md flex items-center gap-2">
                <Brush size={18} className="text-[#D66A3E]" /> Canvas
             </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] text-[#f9f3eb] transition-colors cursor-pointer pointer-events-auto"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* SafeSpace kindness reminder */}
        <div
          className="absolute top-[58px] left-1/2 -translate-x-1/2 z-10 pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background: 'rgba(214,165,62,0.08)', border: '1px solid rgba(214,165,62,0.12)' }}
        >
          <Shield size={12} className="text-[#d6a53e]" />
          <span
            className="text-[11px] text-[#d6a53e] whitespace-nowrap"
            style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 500 }}
          >
            Express freely — with kindness
          </span>
        </div>

        {/* The Glass Drawing Surface */}
        <div 
           ref={canvasContainerRef}
           className="absolute inset-0 z-0 touch-none cursor-crosshair"
        >
          {/* Subtle noise texture */}
          <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/stardust.png')` }} />
          
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ touchAction: 'none' }}
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
          />

          {/* Sending: dim the drawing (and block drawing on it) while it's checked and sent */}
          <AnimatePresence>
            {isSending && (
              <motion.div
                className="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(10,7,12,0.5)] cursor-wait"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <SendingStatus steps={['Looking at your drawing…', 'Sending it with care…', 'Almost there…']} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sticker Picker Popup */}
        <AnimatePresence>
          {showStickerPicker && (
            <motion.div
              className="absolute bottom-[104px] left-1/2 -translate-x-1/2 z-20 flex gap-3 bg-[rgba(20,15,25,0.92)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-[20px] p-3 shadow-2xl overflow-x-auto max-w-[90%] pointer-events-auto"
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {STICKERS.map(name => (
                <button
                  key={name}
                  onClick={() => {
                    setSelectedSticker(name);
                    setTool('sticker');
                  }}
                  className={[
                    "w-[44px] h-[44px] p-1.5 rounded-[12px] flex items-center justify-center transition-all hover:bg-[rgba(255,255,255,0.08)] hover:scale-110 cursor-pointer flex-shrink-0",
                    selectedSticker === name && tool === 'sticker'
                      ? "bg-[rgba(255,255,255,0.15)] shadow-[0_0_12px_rgba(214,106,62,0.4)] border border-[rgba(214,106,62,0.4)]"
                      : "border border-transparent"
                  ].join(" ")}
                >
                  <StickerIcon name={name} size={30} />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Tool Palette */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
           <div className="pointer-events-auto flex items-center gap-4 bg-[rgba(20,15,25,0.85)] backdrop-blur-xl rounded-full h-[64px] px-6 border border-[rgba(255,255,255,0.1)] shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
              
              {/* Tool Selector */}
              <div className="flex items-center gap-1">
                {toolButtons.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTool(t.id);
                      if (t.id === 'sticker') {
                        setShowStickerPicker(prev => !prev);
                      } else {
                        setShowStickerPicker(false);
                      }
                    }}
                    className={[
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer',
                      tool === t.id
                        ? 'bg-[rgba(255,255,255,0.15)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                        : 'text-[#8a7f79] hover:text-[#f9f3eb] hover:bg-[rgba(255,255,255,0.05)]',
                    ].join(' ')}
                    title={t.label}
                  >
                    {t.icon}
                  </button>
                ))}
              </div>

              <div className="w-[1px] h-8 bg-[rgba(255,255,255,0.1)] mx-2" />

              {/* Color Selector */}
              <div className="flex items-center gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      if (tool === 'eraser' || tool === 'sticker') {
                        setTool('pen');
                      }
                      setShowStickerPicker(false);
                    }}
                    className="rounded-full transition-transform hover:scale-110 cursor-pointer relative"
                    style={{ width: 24, height: 24 }}
                  >
                     <div className="absolute inset-0 rounded-full" style={{ background: c, boxShadow: color === c ? `0 0 12px ${c}` : 'none' }} />
                     {color === c && (
                        <div className="absolute inset-[-4px] rounded-full border-2 border-[rgba(255,255,255,0.8)]" />
                     )}
                  </button>
                ))}
              </div>

              <div className="w-[1px] h-8 bg-[rgba(255,255,255,0.1)] mx-2" />

              {/* History Controls */}
              <div className="flex items-center gap-1">
                 <button onClick={handleUndo} disabled={strokes.length === 0} className="w-10 h-10 rounded-full flex items-center justify-center text-[#8a7f79] hover:text-[#f9f3eb] hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-30 transition-colors">
                    <Undo2 size={18} />
                 </button>
                 <button onClick={handleRedo} disabled={redoStack.length === 0} className="w-10 h-10 rounded-full flex items-center justify-center text-[#8a7f79] hover:text-[#f9f3eb] hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-30 transition-colors">
                    <Redo2 size={18} />
                  </button>
                 <button onClick={handleClear} disabled={strokes.length === 0} className="w-10 h-10 rounded-full flex items-center justify-center text-[#8a7f79] hover:text-[#f9f3eb] hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-30 transition-colors">
                    <Trash2 size={18} />
                 </button>
              </div>

              <div className="w-[1px] h-8 bg-[rgba(255,255,255,0.1)] mx-2" />

              {/* Send Button */}
              <motion.button
                onClick={handleSend}
                disabled={strokes.length === 0} // not while sending: that would fade it (handleSend ignores repeat clicks)
                className="flex-shrink-0 bg-gradient-to-r from-[#D66A3E] to-[#E88057] text-[#fffcf9] disabled:opacity-50 disabled:cursor-not-allowed h-10 px-6 rounded-full flex items-center gap-2 font-medium ml-1 shadow-[0_4px_14px_rgba(214,106,62,0.4)]"
                style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
                whileHover={strokes.length > 0 ? { scale: 1.05, boxShadow: '0 6px 20px rgba(214,106,62,0.5)' } : {}}
                whileTap={strokes.length > 0 ? { scale: 0.95 } : {}}
                transition={{ duration: 0.15 }}
              >
                 {isSending ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Send size={16} /> Send</>}
              </motion.button>
           </div>
        </div>

      </motion.div>
    </motion.div>
  );
}
