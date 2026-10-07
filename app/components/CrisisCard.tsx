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
    <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-col items-center text-center">
      <div className="relative w-32 h-32 flex items-center justify-center my-3">
        {/* Soft breathing aura */}
        <div
          className="absolute rounded-full pointer-events-none transition-all ease-in-out"
          style={{
            width: phase === 'inhale' ? 120 : 64,
            height: phase === 'inhale' ? 120 : 64,
            background: phase === 'inhale' 
              ? 'radial-gradient(circle, rgba(214,106,62,0.7) 0%, rgba(242,138,75,0.3) 45%, transparent 75%)'
              : 'radial-gradient(circle, rgba(214,106,62,0.35) 0%, rgba(242,138,75,0.12) 45%, transparent 75%)',
            transitionDuration: phase === 'inhale' ? '4000ms' : '6000ms',
            filter: 'blur(6px)',
          }}
        />
        {/* Glowing center lantern beacon */}
        <div
          className="relative z-10 w-12 h-12 rounded-full border border-amber-300/40 bg-gradient-to-tr from-[#D66A3E] to-[#F28A4B] shadow-[0_0_25px_rgba(214,106,62,0.5)] flex items-center justify-center transition-transform"
          style={{
            transform: phase === 'inhale' ? 'scale(1.22)' : 'scale(0.92)',
            transitionDuration: phase === 'inhale' ? '4000ms' : '6000ms',
          }}
        >
          <Sparkles size={18} className="text-[#fffcf9] opacity-95 animate-pulse" />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[14.5px] font-medium text-[#ffd9c2]" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
          {secondsLeft === 0 
            ? 'You did wonderfully. Take all the time you need.' 
            : phase === 'inhale' ? 'Slow breath in (4s)...' : 'Gently release out (6s)...'}
        </p>
        <span className="text-[11.5px] text-[#9c8e84] font-mono tracking-wider block">
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
      className={`rounded-[26px] p-5 sm:p-6 border border-white/[0.08] bg-[#0d0815]/95 text-[#fdf8f3] shadow-[0_24px_70px_rgba(0,0,0,0.85),_0_0_35px_rgba(214,106,62,0.12)] relative backdrop-blur-2xl overflow-hidden transition-all duration-300 ${
        inline ? 'w-full my-3.5' : 'max-w-md w-full'
      }`}
    >
      {/* Gentle ambient glow in top-right corner */}
      <div
        className="absolute -top-16 -right-16 w-44 h-44 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #D66A3E 0%, transparent 70%)' }}
      />

      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[#9c8e84] hover:text-[#fffcf9] flex items-center justify-center transition-all cursor-pointer z-10"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      )}

      {/* Header Row: Tender Icon + Compassionate Words */}
      <div className="flex items-start gap-3.5 relative z-10">
        <div className="w-10 h-10 rounded-full bg-[#D66A3E]/15 border border-[#D66A3E]/30 text-[#f59a6c] flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(214,106,62,0.2)] mt-0.5">
          <Heart size={18} className="fill-[#D66A3E]/40" />
        </div>

        <div className="space-y-1.5 flex-1 pr-6">
          <h4 
            className="text-[18.5px] sm:text-[20px] text-[#fffcf9] font-medium leading-[1.35] tracking-tight"
            style={{ fontFamily: "'Alegreya', Georgia, serif" }}
          >
            You don't have to carry this alone tonight.
          </h4>
          <p 
            className="text-[13.5px] text-[#c9beb5] leading-relaxed"
            style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
          >
            Talking to someone who cares can help, right now. Completely free, confidential, and safe.
          </p>
        </div>
      </div>

      {/* Action Buttons: Soft Warm Ember Pill + Harmonious Glass Pill */}
      <div className="mt-5 pt-3.5 border-t border-white/[0.07] flex flex-wrap items-center gap-2.5 relative z-10">
        {currentHelpline.phone ? (
          <a
            href={`tel:${currentHelpline.phone}`}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-gradient-to-r from-[#D66A3E] to-[#e67b4b] hover:from-[#c2582d] hover:to-[#d66a3e] text-[#fffcf9] font-medium text-[13.5px] shadow-[0_0_20px_rgba(214,106,62,0.3)] transition-all cursor-pointer active:scale-98"
            style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
          >
            <Phone size={14} />
            <span>Call {currentHelpline.name} ({currentHelpline.phone})</span>
          </a>
        ) : (
          <a
            href={currentHelpline.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-gradient-to-r from-[#D66A3E] to-[#e67b4b] hover:from-[#c2582d] hover:to-[#d66a3e] text-[#fffcf9] font-medium text-[13.5px] shadow-[0_0_20px_rgba(214,106,62,0.3)] transition-all cursor-pointer active:scale-98"
            style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
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
            className="p-2 text-[#b0a399] hover:text-[#fffcf9] transition-colors"
            title="Helpline Website"
          >
            <ExternalLink size={14} />
          </a>
        )}

        <button
          type="button"
          onClick={() => setShowBreathing(!showBreathing)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[13px] text-[#ffd9c2] transition-all cursor-pointer"
          style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
        >
          <Sparkles size={13} className="text-[#FFB347]" />
          <span>{showBreathing ? 'Close exercise' : 'Breathe with lantern (30s)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowOtherCountries(!showOtherCountries)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] text-[#9c8e84] hover:text-[#fdf8f3] hover:bg-white/[0.04] transition-all cursor-pointer ml-auto"
          style={{ fontFamily: "'Alegreya Sans', sans-serif" }}
        >
          <Globe size={13} />
          <span>{showOtherCountries ? 'Hide countries' : 'Other countries'}</span>
        </button>
      </div>

      {/* 30-Second "Breathe with the Lantern" Interactive Guide */}
      {showBreathing && (
        <BreathingExercise onComplete={() => {}} />
      )}

      {/* Other Countries International Directory */}
      {showOtherCountries && (
        <div className="mt-4 pt-3.5 border-t border-white/[0.07] text-[12.5px] space-y-2 text-[#c9beb5] relative z-10">
          <div className="flex items-center gap-1.5 text-[#9c8e84] mb-1 font-medium" style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>
            <Globe size={13} />
            <span>International Resources:</span>
          </div>
          {Object.entries(FALLBACK_HELPLINES).map(([cCode, item]) => (
            <div key={cCode} className="flex justify-between items-center py-1 border-b border-white/[0.03] last:border-0">
              <span style={{ fontFamily: "'Alegreya Sans', sans-serif" }}>{item.country} ({item.name})</span>
              {item.phone ? (
                <a href={`tel:${item.phone}`} className="text-[#FFB347] hover:text-[#ffd9c2] transition-colors font-medium">
                  {item.phone}
                </a>
              ) : (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#FFB347] hover:text-[#ffd9c2] transition-colors font-medium">
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
