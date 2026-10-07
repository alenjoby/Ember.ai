import { useState, useEffect } from 'react';
import { Phone, ExternalLink, Heart, Globe, X, Sparkles } from 'lucide-react';
import type { Helpline } from '../types';

interface CrisisCardProps {
  helpline?: Helpline;
  countryCode?: string;
  onClose?: () => void;
  inline?: boolean;
}

function BreathingExercise({ onComplete }: { onComplete?: () => void }) {
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(countdown);
          if (onComplete) onComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [onComplete]);

  useEffect(() => {
    let isMounted = true;
    let timer: ReturnType<typeof setTimeout>;

    const runCycle = () => {
      if (!isMounted) return;
      setPhase('inhale');
      timer = setTimeout(() => {
        if (!isMounted) return;
        setPhase('exhale');
        timer = setTimeout(() => {
          if (!isMounted) return;
          runCycle();
        }, 6000);
      }, 4000);
    };

    runCycle();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="mt-4 pt-4 border-t border-white/10 flex flex-col items-center text-center">
      <div className="relative w-32 h-32 flex items-center justify-center my-2">
        <div
          className="absolute rounded-full pointer-events-none transition-all ease-in-out"
          style={{
            width: phase === 'inhale' ? 120 : 64,
            height: phase === 'inhale' ? 120 : 64,
            background: phase === 'inhale' 
              ? 'radial-gradient(circle, rgba(214,106,62,0.85) 0%, rgba(242,138,75,0.4) 45%, transparent 75%)'
              : 'radial-gradient(circle, rgba(214,106,62,0.4) 0%, rgba(242,138,75,0.15) 45%, transparent 75%)',
            transitionDuration: phase === 'inhale' ? '4000ms' : '6000ms',
            filter: 'blur(4px)',
          }}
        />
        <div
          className="relative z-10 w-12 h-12 rounded-full border border-amber-300/40 bg-gradient-to-tr from-[#D66A3E] to-[#F28A4B] shadow-[0_0_25px_rgba(214,106,62,0.6)] flex items-center justify-center transition-transform"
          style={{
            transform: phase === 'inhale' ? 'scale(1.25)' : 'scale(0.9)',
            transitionDuration: phase === 'inhale' ? '4000ms' : '6000ms',
          }}
        >
          <Sparkles size={18} className="text-[#fffcf9] opacity-90 animate-pulse" />
        </div>
      </div>

      <div className="space-y-0.5">
        <p className="text-[14.5px] font-medium text-amber-200" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
          {secondsLeft === 0 
            ? 'You did wonderfully. Take all the time you need.' 
            : phase === 'inhale' ? 'Slow breath in (4s)...' : 'Gently release out (6s)...'}
        </p>
        <span className="text-[11.5px] text-stone-400 font-mono tracking-wider">
          {secondsLeft > 0 ? `${secondsLeft}s remaining` : 'Complete'}
        </span>
      </div>
    </div>
  );
}

// Global emergency helplines directory fallback
const FALLBACK_HELPLINES: Record<string, Helpline> = {
  IN: {
    country: 'India',
    name: 'Tele-MANAS',
    phone: '14416',
    url: 'https://telemanas.mohfw.gov.in',
  },
  US: {
    country: 'United States',
    name: 'Suicide & Crisis Lifeline',
    phone: '988',
    url: 'https://988lifeline.org',
  },
  GB: {
    country: 'United Kingdom',
    name: 'Samaritans',
    phone: '116 123',
    url: 'https://www.samaritans.org',
  },
  CA: {
    country: 'Canada',
    name: 'Talk Suicide Canada',
    phone: '988',
    url: 'https://talksuicide.ca',
  },
  AU: {
    country: 'Australia',
    name: 'Lifeline',
    phone: '13 11 14',
    url: 'https://www.lifeline.org.au',
  },
  GLOBAL: {
    country: 'International',
    name: 'Befrienders Worldwide',
    url: 'https://www.befrienders.org',
  },
};

// Guess country code from browser timezone
export function detectBrowserCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.startsWith('Asia/Colombo')) return 'IN';
    if (tz.startsWith('America/New_York') || tz.startsWith('America/Chicago') || tz.startsWith('America/Los_Angeles')) return 'US';
    if (tz.startsWith('Europe/London')) return 'GB';
    if (tz.startsWith('America/Toronto') || tz.startsWith('America/Vancouver')) return 'CA';
    if (tz.startsWith('Australia/')) return 'AU';
  } catch (e) {
    // fallback
  }
  return 'GLOBAL';
}

export function CrisisCard({ helpline, countryCode, onClose, inline = false }: CrisisCardProps) {
  const code = countryCode || detectBrowserCountry();
  const currentHelpline: Helpline = helpline || FALLBACK_HELPLINES[code] || FALLBACK_HELPLINES.GLOBAL;

  const [showOtherCountries, setShowOtherCountries] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);

  return (
    <div
      className={`rounded-2xl p-5 border border-rose-500/30 bg-stone-900/95 text-stone-100 shadow-2xl relative backdrop-blur-xl ${
        inline ? 'w-full my-3' : 'max-w-md w-full'
      }`}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-stone-400 hover:text-stone-200 transition-colors p-1 rounded-lg"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-full bg-rose-500/15 text-rose-300 mt-0.5 flex-shrink-0">
          <Heart size={20} className="fill-rose-400/40" />
        </div>

        <div className="space-y-1.5 flex-1 pr-4">
          <h4 className="font-serif text-[17px] text-rose-100 font-medium leading-snug">
            You don't have to carry this alone tonight.
          </h4>
          <p className="text-[13px] text-stone-300/90 leading-relaxed">
            Talking to someone who cares can help, right now, completely free and confidential.
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2.5">
        {currentHelpline.phone ? (
          <a
            href={`tel:${currentHelpline.phone}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-[13px] shadow-lg shadow-rose-950/40 transition-all active:scale-95"
          >
            <Phone size={14} />
            <span>Call {currentHelpline.name} ({currentHelpline.phone})</span>
          </a>
        ) : (
          <a
            href={currentHelpline.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-[13px] shadow-lg shadow-rose-950/40 transition-all active:scale-95"
          >
            <ExternalLink size={14} />
            <span>Visit {currentHelpline.name}</span>
          </a>
        )}

        {currentHelpline.url && currentHelpline.phone && (
          <a
            href={currentHelpline.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-stone-300 hover:text-white transition-colors"
            title="Helpline Website"
          >
            <ExternalLink size={15} />
          </a>
        )}

        <button
          type="button"
          onClick={() => setShowBreathing(!showBreathing)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[12.5px] text-amber-200/90 transition-all cursor-pointer"
        >
          <Sparkles size={13} className="text-amber-400" />
          <span>{showBreathing ? 'Close exercise' : 'Breathe with lantern (30s)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowOtherCountries(!showOtherCountries)}
          className="text-[12px] text-stone-400 hover:text-stone-200 underline underline-offset-4 ml-auto"
        >
          {showOtherCountries ? 'Hide countries' : 'Other countries'}
        </button>
      </div>

      {/* 30-Second "Breathe with the Lantern" Interactive Guide */}
      {showBreathing && (
        <BreathingExercise onComplete={() => {}} />
      )}

      {showOtherCountries && (
        <div className="mt-3 pt-3 border-t border-white/10 text-[12px] space-y-1.5 text-stone-300">
          <div className="flex items-center gap-1.5 text-stone-400 mb-1">
            <Globe size={13} />
            <span>International Resources:</span>
          </div>
          {Object.entries(FALLBACK_HELPLINES).map(([cCode, item]) => (
            <div key={cCode} className="flex justify-between items-center py-0.5">
              <span>{item.country} ({item.name}):</span>
              {item.phone ? (
                <a href={`tel:${item.phone}`} className="text-rose-300 hover:underline">
                  {item.phone}
                </a>
              ) : (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-rose-300 hover:underline">
                  Website
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
