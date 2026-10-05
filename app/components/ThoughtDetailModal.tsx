import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Feather, Mic, Brush, Sparkles, Loader2, Heart,
  Moon, Star, Leaf, Smile, Flame, Waves, Droplet, 
  Cloud, Flower2, Sun, Music, Flower, HeartHandshake,
  Trash2, Shield
} from 'lucide-react';
import type { Thought, ThoughtResponse } from '../App';
import { projectId, publicAnonKey } from '../../supabase/info';
import { ScreenGlow } from './ScreenGlow';
import { StickerIcon as BaseStickerIcon } from './StickerIcon';
import { detectNegativity, getVoiceReminder } from '../safeSpace';
import { SafeSpaceGuard, SafeSpaceInline } from './SafeSpaceGuard';
import { AiLabel } from './AiLabel';
import { CrisisCard } from './CrisisCard';
import { useLanternSound } from './useLanternSound';


interface Props {
  thought: Thought;
  onClose: () => void;  
  onAddResponse: (response: Omit<ThoughtResponse, 'id' | 'timestamp'>) => Promise<void> | void;
  onOpenDraw: () => void;
  onDeleteThought?: (id: string) => void;
  onDeleteReply?: (thoughtId: string, replyId: string) => void;
  tutorialStep?: 'none' | 'hud' | 'star' | 'reply' | 'complete';
}

type ResponseMode = 'note' | 'voice' | 'draw' | 'sticker';

const STICKERS = [
  { icon: 'sticker_heart', label: 'Heart' },
  { icon: 'sticker_sparkle', label: 'Sparkle' },
  { icon: 'sticker_moon', label: 'Moon' },
  { icon: 'sticker_star', label: 'Star' },
  { icon: 'sticker_leaf', label: 'Leaf' },
  { icon: 'sticker_hand', label: 'Hand' },
  { icon: 'sticker_hug', label: 'Hug' },
  { icon: 'sticker_candle', label: 'Candle' },
  { icon: 'sticker_shell', label: 'Shell' },
  { icon: 'sticker_drop', label: 'Drop' },
  { icon: 'sticker_cloud', label: 'Cloud' },
  { icon: 'sticker_flower', label: 'Flower' },
  { icon: 'sticker_sun', label: 'Sun' },
  { icon: 'sticker_note', label: 'Note' },
  { icon: 'sticker_globe', label: 'Globe' }
];

const EMOJI_TO_ICON: Record<string, string> = {
  '🤍': 'sticker_heart',
  'Heart': 'sticker_heart',
  '✨': 'sticker_sparkle',
  'Sparkles': 'sticker_sparkle',
  '🌙': 'sticker_moon',
  'Moon': 'sticker_moon',
  '⭐': 'sticker_star',
  'Star': 'sticker_star',
  '🌿': 'sticker_leaf',
  'Leaf': 'sticker_leaf',
  '🤗': 'sticker_hand',
  'Smile': 'sticker_hand',
  '🫂': 'sticker_hug',
  'HeartHandshake': 'sticker_hug',
  '🕯️': 'sticker_candle',
  'Flame': 'sticker_candle',
  '🐚': 'sticker_shell',
  'Waves': 'sticker_shell',
  '💧': 'sticker_drop',
  'Droplet': 'sticker_drop',
  '☁️': 'sticker_cloud',
  'Cloud': 'sticker_cloud',
  '🌸': 'sticker_flower',
  'Flower2': 'sticker_flower',
  '☀️': 'sticker_sun',
  'Sun': 'sticker_sun',
  '🎵': 'sticker_note',
  'Music': 'sticker_note',
  '🌺': 'sticker_flower',
  'Flower': 'sticker_flower',
};

function StickerIcon({ nameOrEmoji, size = 24, className }: { nameOrEmoji: string; size?: number; className?: string }) {
  const iconName = EMOJI_TO_ICON[nameOrEmoji] || nameOrEmoji;
  return <BaseStickerIcon name={iconName} size={size} className={className} />;
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NoteTab({ onSend }: { onSend: (text: string) => Promise<void> | void }) {
  const [text, setText] = useState('');
  const [showGuard, setShowGuard] = useState(false);
  const [guardMessage, setGuardMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Real-time negativity detection as user types
  const safeCheck = useMemo(() => detectNegativity(text), [text]);

  const handleSend = async () => {
    if (!text.trim() || isSending) return;
    // Check for negativity before sending
    const result = detectNegativity(text);
    if (!result.allowed) {
      setGuardMessage(result.reason);
      setShowGuard(true);
      return;
    }
    setIsSending(true);
    try {
      await onSend(text.trim());
      setText('');
    } catch (err) {
      console.warn("Could not send note, preserving text:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-4">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write something true..."
        maxLength={240}
        className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] focus:border-[rgba(214,106,62,0.45)] focus:shadow-[0_0_15px_rgba(214,106,62,0.15)] rounded-[20px] px-5 py-4 resize-none outline-none text-[#f9f3eb] placeholder-[#8a7f79] text-[16px] leading-[1.5] transition-all duration-200"
        style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 400, minHeight: 110 }}
      />
      {/* Real-time inline SafeSpace warning */}
      <AnimatePresence>
        {!safeCheck.allowed && text.trim() && (
          <SafeSpaceInline severity={safeCheck.severity} message={safeCheck.reason} />
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between">
        <span
          className="text-[#8a7f79] text-[12px]"
          style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 500 }}
        >
          {text.length} / 240
        </span>
        <motion.button
          onClick={handleSend}
          disabled={!text.trim()}
          className={[
            'px-6 h-[44px] rounded-[16px] text-[15px] transition-colors duration-200',
            text.trim()
              ? !safeCheck.allowed
                ? 'bg-[rgba(193,60,60,0.3)] text-[rgba(255,252,249,0.5)] cursor-not-allowed border border-[rgba(193,60,60,0.3)]'
                : 'bg-[#D66A3E] text-[#fffcf9] cursor-pointer'
              : 'bg-[rgba(214,106,62,0.2)] text-[rgba(255,252,249,0.5)] cursor-not-allowed',
          ].join(' ')}
          style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 700 }}
          whileHover={text.trim() && safeCheck.allowed ? { boxShadow: '0 0 18px rgba(214,106,62,0.4)', scale: 1.02 } : {}}
          whileTap={text.trim() && safeCheck.allowed ? { scale: 0.97 } : {}}
          transition={{ duration: 0.15 }}
        >
          {!safeCheck.allowed && text.trim() ? (
            <span className="flex items-center gap-1 justify-center"><Shield size={14} /> Blocked</span>
          ) : 'Send note'}
        </motion.button>
      </div>
      {/* Fullscreen SafeSpace Guard overlay */}
      <SafeSpaceGuard
        visible={showGuard}
        severity={safeCheck.severity}
        message={guardMessage}
        onDismiss={() => setShowGuard(false)}
      />
    </div>
  );
}

type VoiceState = 'idle' | 'recording' | 'recorded';
type Severity = 'mild' | 'severe';

function VoiceTab({ onSend }: { onSend: (text: string, url: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [showGuard, setShowGuard] = useState(false);
  const [guardMessage, setGuardMessage] = useState('');
  const [guardSeverity, setGuardSeverity] = useState<Severity>('severe');

  const [recordState, setRecordState] = useState<VoiceState>('idle');
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string>('');

  useEffect(() => {
    if (recordState === 'recording') {
      intervalRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [recordState]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setRecordedAudioUrl(base64Audio);
          setRecordState('recorded');
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordState('recording');
      setDuration(0);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check permissions.');
      setRecordState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSendRecorded = async () => {
    if (!recordedAudioUrl) return;
    
    setLoading(true);
    try {
      const finalTranscript = `Voice message (${formatTime(duration)})`;
      onSend(finalTranscript, recordedAudioUrl);
      setRecordState('idle');
      setDuration(0);
      setRecordedAudioUrl('');
    } catch (err) {
      console.error('Audio send error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-[24px] p-5">
        <p
          className="text-[#f9f3eb] text-[15px] mb-0.5"
          style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 700 }}
        >
          Record Voice note
        </p>
        <p
          className="text-[#8a7f79] text-[12.5px] mb-2"
          style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 400 }}
        >
          {recordState === 'idle'
            ? 'Speak naturally, when typing feels too heavy'
            : recordState === 'recording'
            ? 'Recording... speak from the heart'
            : 'Ready to send your voice note'}
        </p>
        {/* SafeSpace voice reminder */}
        <div
          className="rounded-[10px] px-3 py-1.5 mb-3 flex items-center gap-2"
          style={{ background: 'rgba(214,165,62,0.06)', border: '1px solid rgba(214,165,62,0.12)' }}
        >
          <Shield size={13} className="text-[#d6a53e] flex-shrink-0" />
          <span
            className="text-[11.5px] text-[#d6a53e] leading-[1.3]"
            style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 500 }}
          >
            {getVoiceReminder()}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3.5 mb-4">
          <div className="relative w-[80px] h-[80px] flex items-center justify-center">
            <motion.div
              className="absolute rounded-full border"
              style={{ width: '70px', height: '70px', borderColor: 'rgba(214,106,62,0.4)' }}
              animate={{
                scale: recordState === 'recording' ? [1, 1.12, 1] : 1,
                opacity: recordState === 'recording' ? [0.4, 0.7, 0.4] : 0.15,
              }}
              transition={{
                duration: 1.8,
                repeat: recordState === 'recording' ? Infinity : 0,
                ease: 'easeInOut',
                delay: 0.3,
              }}
            />
            <motion.div
              className="absolute rounded-full border"
              style={{
                width: '54px',
                height: '54px',
                borderColor:
                  recordState === 'recording' ? 'rgba(214,106,62,0.8)' : 'rgba(255,255,255,0.2)',
              }}
              animate={{
                scale: recordState === 'recording' ? [1, 1.18, 1] : recordState === 'recorded' ? 1.08 : 1,
                opacity:
                  recordState === 'recording' ? [0.6, 1, 0.6] : recordState === 'recorded' ? 0.7 : 0.4,
              }}
              transition={{
                duration: 1.8,
                repeat: recordState === 'recording' ? Infinity : 0,
                ease: 'easeInOut',
              }}
            />
            <div className="relative z-10">
              <Mic size={22} color={recordState === 'recording' ? '#D66A3E' : '#8a7f79'} />
            </div>
          </div>
          {recordState !== 'idle' && (
            <span
              className="text-[#D66A3E] text-[12px] font-bold"
              style={{ fontFamily: "'Alegreya Sans', sans-serif", textShadow: '0 0 8px rgba(214,106,62,0.5)' }}
            >
              {formatTime(duration)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 justify-center">
          {recordState === 'idle' && (
            <button
              onClick={startRecording}
              className="bg-[rgba(255,255,255,0.1)] text-[#fffcf9] rounded-[16px] px-5 h-[40px] flex items-center gap-2 hover:bg-[rgba(255,255,255,0.15)] transition-colors cursor-pointer"
              style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 700, fontSize: 13 }}
            >
              <div className="w-[8px] h-[8px] rounded-full bg-[#D66A3E] shadow-[0_0_8px_#D66A3E]" />
              Record
            </button>
          )}
          {recordState === 'recording' && (
            <button
              onClick={stopRecording}
              className="bg-[#D66A3E] text-[#fffcf9] rounded-[16px] px-5 h-[40px] flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(214,106,62,0.5)]"
              style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 700, fontSize: 13 }}
            >
              <div className="w-[8px] h-[8px] rounded-sm bg-white" />
              Stop
            </button>
          )}
          {recordState === 'recorded' && (
            <>
              <button
                onClick={() => { setRecordState('idle'); setDuration(0); setRecordedAudioUrl(''); }}
                className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[#e8e2dd] rounded-[16px] px-4 h-[40px] hover:bg-[rgba(255,255,255,0.1)] transition-colors cursor-pointer"
                style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 500, fontSize: 13 }}
              >
                Re-record
              </button>
              <motion.button
                onClick={handleSendRecorded}
                disabled={loading}
                className={['bg-[#D66A3E] text-[#fffcf9] rounded-[16px] px-5 h-[40px] cursor-pointer flex items-center justify-center gap-2', loading ? 'opacity-50 cursor-not-allowed' : ''].join(' ')}
                style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 700, fontSize: 13 }}
                whileHover={!loading ? { boxShadow: '0 0 20px rgba(214,106,62,0.4)', scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.97 } : {}}
                transition={{ duration: 0.15 }}
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : 'Send voice'}
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Fullscreen SafeSpace Guard overlay */}
      <SafeSpaceGuard
        visible={showGuard}
        severity={guardSeverity}
        message={guardMessage}
        onDismiss={() => setShowGuard(false)}
      />
    </div>
  );
}

function StickerTab({ onSend }: { onSend: (iconName: string) => void }) {
  return (
    <div className="max-w-full overflow-x-hidden">
      <p
        className="text-[#8a7f79] text-[13px] mb-4"
        style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 400 }}
      >
        Tap to send warmth anonymously
      </p>
      <div className="grid grid-cols-5 sm:grid-cols-5 gap-1.5 sm:gap-2">
        {STICKERS.map(s => (
          <motion.button
            key={s.icon}
            onClick={() => onSend(s.icon)}
            className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] rounded-[14px] h-[56px] sm:h-[68px] flex flex-col items-center justify-center gap-0.5 sm:gap-1 cursor-pointer"
            whileHover={{
              scale: 1.06,
              backgroundColor: 'rgba(214,106,62,0.1)',
              borderColor: 'rgba(214,106,62,0.4)',
              boxShadow: '0 0 15px rgba(214,106,62,0.2)'
            }}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.14 }}
          >
            <StickerIcon nameOrEmoji={s.icon} size={24} />
            <span
              className="text-[#8a7f79] text-[10px]"
              style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 500 }}
            >
              {s.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function VoicePlayer({ response, isAI, timeStr, onDeleteReply }: { response: ThoughtResponse; isAI?: boolean; timeStr: string; onDeleteReply?: (replyId: string) => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = () => {
    if (!response.audioUrl) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(response.audioUrl);
        audioRef.current.onended = () => {
          setIsPlaying(false);
        };
      }
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.error("Error playing audio:", e));
    }
  };

  return (
    <>
      {isAI && <ScreenGlow isPlaying={isPlaying} />}
      <div 
        className={[
          'rounded-[20px] px-5 py-4.5 flex flex-col gap-3 transition-all duration-300',
          isAI 
            ? 'bg-[rgba(214,106,62,0.08)] border border-[rgba(214,106,62,0.25)] shadow-[0_4px_20px_rgba(214,106,62,0.05),inset_0_1px_0_rgba(255,255,255,0.05)]' 
            : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
        ].join(' ')}
      >
        {/* Transcript text on top */}
        <p 
          className="text-[#f9f3eb] text-[14.5px] leading-[1.6] whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
          style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 400 }}
        >
          {response.content}
        </p>

        {/* Player controls row */}
        <div className="flex items-center gap-3 bg-[rgba(0,0,0,0.18)] rounded-[14px] px-3.5 py-2.5 border border-[rgba(255,255,255,0.02)]">
          <button 
            onClick={togglePlay}
            className="w-[34px] h-[34px] rounded-full bg-[rgba(214,106,62,0.18)] flex items-center justify-center hover:bg-[rgba(214,106,62,0.3)] transition-all duration-200 cursor-pointer border border-[rgba(214,106,62,0.35)] shadow-[0_2px_8px_rgba(214,106,62,0.15)] flex-shrink-0"
          >
            {isPlaying ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="2" y="1" width="2" height="8" rx="0.5" fill="#D66A3E" />
                <rect x="6" y="1" width="2" height="8" rx="0.5" fill="#D66A3E" />
              </svg>
            ) : (
              <svg width="10" height="13" viewBox="0 0 12 14" fill="none" className="ml-0.5">
                <path d="M2 1L10 7L2 13V1Z" fill="#D66A3E" />
              </svg>
            )}
          </button>

          {/* Waveform container with more bars and glowing colors */}
          <div className="flex items-end gap-[3px] h-[24px] flex-1 min-w-0 px-1 select-none">
            {Array.from({ length: 30 }, (_, i) => {
              // Create a nicer pseudo-random wave shape that looks like audio
              const h = 4 + (Math.sin(i * 0.4) * 8) + ((i * 3) % 6);
              return (
                <motion.div
                  key={i}
                  className={[
                    'w-[3px] rounded-[999px]',
                    isAI ? 'bg-[#D66A3E]' : 'bg-[rgba(255,255,255,0.35)]'
                  ].join(' ')}
                  style={{ minHeight: '4px' }}
                  animate={isPlaying ? {
                    height: [h, Math.max(3, h * 0.25), h * 1.35, h],
                    opacity: [0.8, 0.4, 1, 0.8],
                    boxShadow: isAI 
                      ? ['0 0 0px transparent', '0 0 8px rgba(214,106,62,0.6)', '0 0 0px transparent']
                      : ['0 0 0px transparent', '0 0 4px rgba(255,255,255,0.4)', '0 0 0px transparent']
                  } : { height: h, opacity: 0.6 }}
                  transition={isPlaying ? {
                    duration: 0.9,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.025,
                  } : { duration: 0.2 }}
                />
              );
            })}
          </div>
        </div>

        {/* Footer info row */}
        <div className="flex items-center justify-between text-[11.5px] text-[#8a7f79] relative">
          <span className="flex items-center gap-1 font-bold" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
            {isAI ? (
              <AiLabel />
            ) : (
              'someone'
            )}
          </span>
          <div className="flex items-center gap-3">
            {localStorage.getItem('ember_admin') === 'true' && onDeleteReply && (
              <button
                onClick={() => onDeleteReply(response.id)}
                className="text-red-400 hover:text-red-300 transition-colors focus:outline-none cursor-pointer"
                title="Delete voice message"
              >
                <Trash2 size={12} />
              </button>
            )}
            <span style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
              {timeStr}
            </span>
            {!isAI && (
              <button
                onClick={() => {}}
                className="flex items-center gap-1 text-[#D66A3E] hover:text-[#bd5e37] transition-colors focus:outline-none pointer-events-none opacity-0"
              >
                <Heart size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ResponseItem({ response, index, onDeleteReply }: { response: ThoughtResponse; index: number; onDeleteReply?: (replyId: string) => void }) {
  const timeStr = relativeTime(response.timestamp);
  const isAI = response.isAI;
  const [showThanks, setShowThanks] = useState(false);

  const handleThank = () => {
    setShowThanks(true);
    setTimeout(() => setShowThanks(false), 2000);
  };

  const wrapper = (children: React.ReactNode) => (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {children}
    </motion.div>
  );

  if (response.type === 'sticker') {
    return wrapper(
      <div className="flex items-center gap-3">
        <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)] rounded-[14px] w-[54px] h-[54px] flex items-center justify-center shadow-lg">
          <StickerIcon nameOrEmoji={response.content} size={30} className="drop-shadow-md" />
        </div>
        <div className="flex items-center justify-between w-full relative">
          <span
            className="text-[#8a7f79] text-[12px] flex items-center gap-1.5"
            style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
          >
            {isAI ? <AiLabel /> : 'someone'} sent a sticker · {timeStr}
          </span>
          {localStorage.getItem('ember_admin') === 'true' && onDeleteReply && (
            <button
              onClick={() => onDeleteReply(response.id)}
              className="text-red-400 hover:text-red-300 transition-colors focus:outline-none cursor-pointer mr-2"
              title="Delete reply"
            >
              <Trash2 size={12} />
            </button>
          )}
          {!isAI && (
            <button
              onClick={handleThank}
              className="flex items-center gap-1 text-[#D66A3E] hover:text-[#bd5e37] transition-colors focus:outline-none cursor-pointer"
              title="Send Thanks"
            >
              <Heart size={14} fill={showThanks ? "#D66A3E" : "none"} />
            </button>
          )}
          {/* Floating Heart Animation */}
          <AnimatePresence>
            {showThanks && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 0], y: -30, scale: 1.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute right-0 bottom-4 pointer-events-none text-[#D66A3E]"
              >
                <Heart size={16} fill="#D66A3E" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (response.type === 'drawing' && response.drawingData) {
    return wrapper(
      <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[18px] overflow-hidden">
        <img
          src={response.drawingData}
          alt="A drawing reply"
          className="w-full max-h-[200px] object-contain invert-[0.85] hue-rotate-180" // Quick invert hack to make drawings look better on dark
        />
        <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
          <span
            className="text-[#8a7f79] text-[12px]"
            style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
          >
            {isAI ? '✦ Ember' : 'someone'} drew this · {timeStr}
          </span>
          {localStorage.getItem('ember_admin') === 'true' && onDeleteReply && (
            <button
              onClick={() => onDeleteReply(response.id)}
              className="text-red-400 hover:text-red-300 transition-colors focus:outline-none cursor-pointer"
              title="Delete reply"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (response.type === 'voice') {
    return wrapper(
      <VoicePlayer response={response} isAI={isAI} timeStr={timeStr} onDeleteReply={onDeleteReply} />
    );
  }

  // Note
  return wrapper(
    <div
      className={[
        'rounded-[20px] px-5 py-4.5 transition-all duration-300',
        isAI
          ? 'bg-[rgba(214,106,62,0.08)] border border-[rgba(214,106,62,0.25)] shadow-[0_4px_20px_rgba(214,106,62,0.05),inset_0_1px_0_rgba(255,255,255,0.05)]'
          : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
      ].join(' ')}
    >
      <p
        className="text-[#f9f3eb] text-[14.5px] leading-[1.6] whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
        style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 400 }}
      >
        {response.content}
      </p>
      <div className="flex items-center justify-between text-[11.5px] text-[#8a7f79] mt-3.5 relative">
        <span className="flex items-center gap-1 font-bold" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
          {isAI ? (
            <AiLabel />
          ) : (
            'someone'
          )}
        </span>
        <div className="flex items-center gap-3">
          {localStorage.getItem('ember_admin') === 'true' && onDeleteReply && (
            <button
              onClick={() => onDeleteReply(response.id)}
              className="text-red-400 hover:text-red-300 transition-colors focus:outline-none cursor-pointer"
              title="Delete reply"
            >
              <Trash2 size={12} />
            </button>
          )}
          <span style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
            {timeStr}
          </span>
          {!isAI && (
            <button
              onClick={handleThank}
              className="flex items-center gap-1 text-[#D66A3E] hover:text-[#bd5e37] transition-colors focus:outline-none cursor-pointer"
              title="Send Thanks"
            >
              <Heart size={12} fill={showThanks ? "#D66A3E" : "none"} />
            </button>
          )}
        </div>
        {/* Floating Heart Animation */}
        <AnimatePresence>
          {showThanks && (
            <motion.div
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 0], y: -30, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute right-0 bottom-4 pointer-events-none text-[#D66A3E]"
            >
              <Heart size={16} fill="#D66A3E" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function ThoughtDetailModal({ thought, onClose, onAddResponse, onOpenDraw, onDeleteThought, onDeleteReply, tutorialStep = 'none' }: Props) {
  const [mode, setMode] = useState<ResponseMode>(tutorialStep === 'reply' ? 'sticker' : 'note');
  const [sentSticker, setSentSticker] = useState<string | null>(null);
  const responsesEndRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [showHugPulse, setShowHugPulse] = useState(false);

  // Hook up Tone.js soundscape for opened thought
  const soundEnabled = localStorage.getItem('ember_sound') === 'on';
  useLanternSound(thought.lantern || null, soundEnabled);

  useEffect(() => {
    responsesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thought.responses.length]);

  const handleSendNote = useCallback((text: string) => {
    onAddResponse({ type: 'note', content: text });
  }, [onAddResponse]);

  const handleSendVoice = useCallback((text: string, url: string) => {
    onAddResponse({ type: 'voice', content: text, audioUrl: url });
  }, [onAddResponse]);

  const handleSendSticker = useCallback((emoji: string) => {
    onAddResponse({ type: 'sticker', content: emoji });
    setSentSticker(emoji);
    setTimeout(() => setSentSticker(null), 1600);
  }, [onAddResponse]);

  const handleHug = useCallback(() => {
    setShowHugPulse(true);
    setTimeout(() => setShowHugPulse(false), 2000);
    onAddResponse({ type: 'sticker', content: 'sticker_hug' });
  }, [onAddResponse]);

  const VARIANT_GLOWS = {
    warm: 'border-[rgba(214,106,62,0.35)] shadow-[0_8px_32px_rgba(214,106,62,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(38,24,20,0.75),rgba(20,13,11,0.75))]',
    light: 'border-[rgba(235,190,100,0.22)] shadow-[0_8px_32px_rgba(235,190,100,0.1),inset_0_1px_0_rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(26,24,18,0.75),rgba(15,14,11,0.75))]',
    teal: 'border-[rgba(20,184,166,0.25)] shadow-[0_8px_32px_rgba(20,184,166,0.1),inset_0_1px_0_rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(15,26,26,0.75),rgba(9,15,15,0.75))]',
    rose: 'border-[rgba(244,63,94,0.25)] shadow-[0_8px_32px_rgba(244,63,94,0.1),inset_0_1px_0_rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(28,16,20,0.75),rgba(16,9,12,0.75))]'
  };

  const tabs: { id: ResponseMode; label: string; icon: React.ReactNode }[] = [
    { id: 'note', label: 'Note', icon: <Feather size={12} /> },
    { id: 'voice', label: 'Voice', icon: <Mic size={12} /> },
    { id: 'draw', label: 'Draw', icon: <Brush size={12} /> },
    { id: 'sticker', label: 'Sticker', icon: <Sparkles size={12} /> },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-40 flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Dark Backdrop (No blur for performance) */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(5,3,8,0.5)' }}
        onClick={onClose}
      />

      {/* Side Sheet */}
      <motion.div
        className="relative w-full sm:max-w-[460px] h-[100dvh] bg-[radial-gradient(ellipse_at_top_right,rgba(32,18,48,0.96),rgba(14,10,20,0.98))] backdrop-blur-3xl border-l border-[rgba(255,255,255,0.08)] shadow-[-15px_0_50px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
        initial={{ x: "100%" }}
        animate={{ x: "0%" }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Close button */}
        <motion.button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 w-[32px] h-[32px] rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#e8e2dd] hover:text-[#fffcf9] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D66A3E] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.08)]"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </motion.button>

        {/* Delete thought button (visible to author OR admin) */}
        {(thought.authorId === localStorage.getItem('anon_user_id') || localStorage.getItem('ember_admin') === 'true') && onDeleteThought && (
          <motion.button
            onClick={() => onDeleteThought(thought.id)}
            aria-label="Return thought to ash"
            className="absolute top-4 right-13 z-20 w-[32px] h-[32px] rounded-full bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.35)] flex items-center justify-center text-red-400 hover:text-red-300 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:border-[rgba(239,68,68,0.6)] hover:bg-[rgba(239,68,68,0.12)]"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
            <Trash2 size={15} />
          </motion.button>
        )}

        {/* Main content wrapper (blurred during tutorial reply step) */}
        <div className={tutorialStep === 'reply' ? 'flex-1 flex flex-col min-h-0 blur-[3px] opacity-40 pointer-events-none transition-all duration-300' : 'flex-1 flex flex-col min-h-0 transition-all duration-300'}>
          {/* Crisis Help Card if flagged */}
          {thought.showHelp && (
            <div className="px-4 pt-4 sm:px-6">
              <CrisisCard inline />
            </div>
          )}

          {/* Thought display — Deep Card */}
          <div className="px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-5">
            <div
              ref={cardRef}
              className={[
                'rounded-[18px] sm:rounded-[22px] px-4 py-4 sm:px-6 sm:py-5 relative overflow-hidden transition-all duration-300 border',
                VARIANT_GLOWS[thought.variant] || VARIANT_GLOWS.warm
              ].join(' ')}
              style={thought.lantern ? {
                borderColor: `${thought.lantern.palette[1]}66`,
                boxShadow: `0 8px 32px ${thought.lantern.palette[1]}28, inset 0 1px 0 rgba(255,255,255,0.08)`,
              } : undefined}
            >
              {/* Hug pulse animation */}
              <AnimatePresence>
                {showHugPulse && (
                  <motion.div
                    className="absolute inset-0 z-0 bg-[#D66A3E]"
                    initial={{ opacity: 0.5, scale: 0.9 }}
                    animate={{ opacity: 0, scale: 1.1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>

              {/* Lantern Poetic Mood Bar */}
              {thought.lantern && (
                <div className="flex items-center gap-2 mb-3 relative z-10 pr-20">
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0"
                    style={{
                      backgroundColor: thought.lantern.palette[0] || '#FFB347',
                      boxShadow: `0 0 10px ${thought.lantern.palette[1] || '#D66A3E'}`
                    }}
                  />
                  {thought.emotion && (
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-[#f9f3eb]/70 whitespace-nowrap" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
                      {thought.emotion} · {thought.lantern.shape}
                    </span>
                  )}
                  {thought.lantern.caption && (
                    <span className="text-[12px] text-[#e8cdb8]/90 italic truncate" style={{ fontFamily: "'Alegreya', serif" }}>
                      "{thought.lantern.caption}"
                    </span>
                  )}
                </div>
              )}

              {/* Hug Button */}
              <div className="absolute top-4 right-14 z-10">
                <motion.button
                  onClick={handleHug}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(214,106,62,0.15)] hover:bg-[rgba(214,106,62,0.3)] text-[#D66A3E] border border-[rgba(214,106,62,0.3)] transition-colors cursor-pointer"
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Heart size={14} fill={showHugPulse ? "#D66A3E" : "none"} /> 
                  <span className="text-[12px] font-bold" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>Hug</span>
                </motion.button>
              </div>

              <p
                className="text-[#f9f3eb] pr-[76px] sm:pr-[110px] select-none relative z-10 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                style={{
                  fontFamily: "'Alegreya', serif",
                  fontWeight: 400,
                  fontSize: 'clamp(14px, 3.5vw, 18px)',
                  lineHeight: '1.6',
                  textShadow: '0 2px 4px rgba(0,0,0,0.4)'
                }}
              >
                {thought.text}
              </p>
              {/* Amber divider */}
              <div
                className="my-3 relative z-10"
                style={{ height: '1px', background: 'rgba(214,106,62,0.3)', width: '72px', boxShadow: '0 0 8px rgba(214,106,62,0.5)' }}
              />
              <p
                className="text-[#e2d9d1] text-[12px] relative z-10"
                style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
              >
                released {relativeTime(thought.timestamp)} · {thought.responses.length}{' '}
                {thought.responses.length === 1 ? 'response' : 'responses'}
              </p>
            </div>
          </div>

          {/* Responses */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 sm:px-6 min-h-0 max-w-full"
            aria-live="polite"
            role="log"
            aria-label="Responses"
          >
            {thought.responses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center opacity-80">
                <Leaf size={34} className="mb-3 text-[#10b981] drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
                <p
                  className="text-[#e8e2dd] text-[15px]"
                  style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
                >
                  Be the first to respond
                </p>
                <p
                  className="text-[#8a7f79] text-[13px] mt-1 max-w-[260px]"
                  style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
                >
                  A note, a sticker, a drawing — any warmth counts.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-w-full">
                {thought.responses.map((r, i) => (
                  <ResponseItem key={r.id} response={r} index={i} onDeleteReply={(replyId) => onDeleteReply && onDeleteReply(thought.id, replyId)} />
                ))}
                <div ref={responsesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Sticker sent celebration */}
        <AnimatePresence>
          {sentSticker && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1.15 }}
              exit={{ opacity: 0, scale: 0.85, y: -24 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <StickerIcon nameOrEmoji={sentSticker} size={120} className="drop-shadow-[0_0_40px_rgba(214,106,62,0.6)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Response area */}
        <div 
          className={[
            "border-t px-4 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6 transition-all duration-300 relative",
            tutorialStep === 'reply' 
              ? "border-[#D66A3E] bg-[rgba(214,106,62,0.05)] shadow-[0_0_30px_rgba(214,106,62,0.15)] z-30" 
              : "border-[rgba(255,255,255,0.06)] bg-[rgba(10,5,15,0.4)]"
          ].join(" ")}
        >
          {tutorialStep === 'reply' && (
            <div className="absolute top-[-96px] left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[320px] pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[rgba(20,15,25,0.98)] backdrop-blur-xl border border-[rgba(214,106,62,0.4)] rounded-[20px] px-5 py-4 text-center shadow-[0_12px_40px_rgba(0,0,0,0.6),_0_0_20px_rgba(214,106,62,0.15)] relative"
              >
                <p className="text-[#f9f3eb] text-[14px] font-medium leading-relaxed" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
                  Ember is about quiet support. Tap a sticker to send it and complete the tour!
                </p>
                {/* Arrow pointing down */}
                <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[rgba(20,15,25,0.98)] border-r border-b border-[rgba(214,106,62,0.4)]" />
              </motion.div>
            </div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {/* Tab pills */}
            <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-5">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setMode(tab.id);
                    if (tab.id === 'draw') onOpenDraw();
                  }}
                  className="relative flex-1 h-[38px] sm:h-[44px] rounded-[19px] sm:rounded-[22px] overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                >
                  {/* Sliding active pill */}
                  {mode === tab.id && (
                    <motion.div
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-[22px] bg-[rgba(214,106,62,0.2)] border border-[rgba(214,106,62,0.4)]"
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.38 }}
                    />
                  )}
                  <span
                    className={[
                      'relative z-10 flex items-center justify-center gap-1 sm:gap-1.5 h-full text-[11px] sm:text-[13px] transition-colors duration-200',
                      mode === tab.id ? 'text-[#fffcf9] drop-shadow-md' : 'text-[#8a7f79]',
                    ].join(' ')}
                    style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 700 }}
                  >
                    {tab.icon}
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {mode === 'note' && (
                <motion.div
                  key="note"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <NoteTab onSend={handleSendNote} />
                </motion.div>
              )}
              {mode === 'voice' && (
                <motion.div
                  key="voice"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <VoiceTab onSend={handleSendVoice} />
                </motion.div>
              )}
              {mode === 'sticker' && (
                <motion.div
                  key="sticker"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <StickerTab onSend={handleSendSticker} />
                </motion.div>
              )}
              {mode === 'draw' && (
                <motion.div
                  key="draw"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col items-center py-5"
                >
                  <p
                    className="text-[#8a7f79] text-[14px] mb-5 text-center"
                    style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
                  >
                    A quick mark or sketch when words are too much.
                  </p>
                  <motion.button
                    onClick={onOpenDraw}
                    className="bg-[rgba(214,106,62,0.2)] border border-[rgba(214,106,62,0.4)] text-[#fffcf9] rounded-[18px] px-8 h-[52px]"
                    style={{ fontFamily: "'Alegreya Sans', sans-serif", fontWeight: 700, fontSize: 16 }}
                    whileHover={{ boxShadow: '0 0 25px rgba(214,106,62,0.4)', scale: 1.02, backgroundColor: 'rgba(214,106,62,0.3)' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                  >
                    Open drawing canvas
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
