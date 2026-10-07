// Ember.ai demo film (~2 min). Motion graphics + real recordings of the app (video/out),
// plus three shots made in Raylight (intro, lantern release, outro) in public/raylight-*.mp4.
// Structure follows the film prompt: hook → problem → turn/logo → features (real app) → crisis →
// fades in 24h → proof → close with helplines.
import React from 'react';
import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, Series, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { AppClip, C, Fade, Lantern, Line, PALETTES, sans, serif, Sky, Title, TypeText } from './ui';
import VO from './voiceover.json';

export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

// ─── narration (ElevenLabs, see voiceover.mjs) ─────────────────────
// voiceover.json holds each line's length in seconds. With it, every scene shows each line as
// its voice line starts and lasts as long as the narration needs; without it (not generated
// yet), the scenes keep their silent timings.
const VO_LEN = VO as Record<string, number>;
const VO_GAP = 0.3; // pause between two lines

// Mix: the voice must be the loudest thing. The ElevenLabs lines come out quiet (about -23 dB)
// while the Raylight whooshes peak near -12 dB, so the narration sounded far too soft. Voices are now normalised; the effects come down.
const VOICE_GAIN = 1;      // narration (files normalised to -16 LUFS by voiceover.mjs)
const EMBER_GAIN = 1;      // Ember's replies (normalised to -16 LUFS too)
const RAYLIGHT_GAIN = 0.4; // Raylight sound effects, -8 dB

function timeline(names: string[], lead: number, silentAt: number[], minDur: number) {
  if (!names.every(n => VO_LEN[n])) return { at: silentAt, dur: minDur, names: [] as string[] };
  const at: number[] = [];
  let t = lead;
  for (const n of names) {
    at.push(t);
    t += VO_LEN[n] + VO_GAP;
  }
  return { at, dur: Math.max(minDur, t + 0.5), names };
}

/** The scene's voice lines, each starting at its time. */
const Narration: React.FC<{ tl: ReturnType<typeof timeline> }> = ({ tl }) => (
  <>
    {tl.names.map((n, i) => (
      <Sequence key={n} from={s(tl.at[i])}>
        <Audio src={staticFile(`vo/${n}.mp3`)} volume={VOICE_GAIN} />
      </Sequence>
    ))}
  </>
);

// Text scene timings (seconds). Kept short and punchy: judges decide in the first seconds.
const T = {
  hook: timeline(['hook'], 0.3, [0.3], 4.5),
  problem: timeline(['problem-1', 'problem-2', 'problem-3'], 0.2, [0.2, 2.5, 4.9], 9),
  turn: timeline(['turn-1', 'turn-2'], 0.2, [0, 2.9], 7.5),
  showcase: timeline(['showcase'], 0.2, [0], 6.5),
  dawn: timeline(['dawn-1', 'dawn-2'], 0.5, [0.6, 1.7], 4.5),
  proof: timeline(['proof'], 0.2, [0], 7),
  close: timeline(['close-1', 'close-2'], 0.3, [0.3, 1.4], 10),
};
const D = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v.dur])) as Record<keyof typeof T, number>;
const HOOK_TEXT = "It's 3 a.m. You can't say it to anyone you know.";

// ─── motion-graphics scenes ─────────────────────────────────────────

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const dur = s(D.hook);
  // Typing finishes with the voice when there is narration.
  const cps = VO_LEN.hook ? HOOK_TEXT.length / (VO_LEN.hook * 0.85) : 40;
  const typed = T.hook.at[0] + HOOK_TEXT.length / cps;
  const ember = interpolate(f, [s(typed + 0.9), s(typed + 1.6)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Fade dur={dur} inF={10}>
      <Narration tl={T.hook} />
      <AbsoluteFill style={{ background: '#050304', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: sans, color: C.muted, fontSize: 30, letterSpacing: 6, marginBottom: 40 }}>3:07 AM</div>
        <TypeText text={HOOK_TEXT} start={s(T.hook.at[0])} cps={cps}
          style={{ fontFamily: serif, color: C.cream, fontSize: 62 }} />
        <div style={{
          marginTop: 70, width: 10, height: 10, borderRadius: '50%', background: C.ember, opacity: ember,
          boxShadow: `0 0 ${30 * ember}px ${12 * ember}px ${C.ember}`,
        }} />
      </AbsoluteFill>
    </Fade>
  );
};

const Problem: React.FC = () => {
  const dur = s(D.problem);
  return (
    <Fade dur={dur} inF={10}>
      <Narration tl={T.problem} />
      <Sky dim={0.45} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 36 }}>
        <Line at={s(T.problem.at[0])}><Title size={60}>1 in 6 people worldwide feel lonely.</Title></Line>
        <Line at={s(T.problem.at[1])}><Title size={60}>Every year, more than 700,000 people die by suicide.</Title></Line>
        <Line at={s(T.problem.at[2])}><Title size={60} style={{ color: C.ember }}>Most of them never told anyone how they felt.</Title></Line>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 }}>
        <div style={{ fontFamily: sans, color: C.muted, fontSize: 20 }}>Source: WHO</div>
      </AbsoluteFill>
    </Fade>
  );
};

const Turn: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = s(D.turn);
  const rise = interpolate(f, [0, s(2.4)], [380, 0], { extrapolateRight: 'clamp' });
  const lit = interpolate(f, [s(1.6), s(2.6)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logo = spring({ frame: f - s(T.turn.at[1]), fps, config: { damping: 200 } });
  return (
    <Fade dur={dur}>
      <Narration tl={T.turn} />
      <Sky />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Line at={s(T.turn.at[0])} style={{ position: 'absolute', top: 120 }}>
          <Title size={50}>What if you could just… let it out?</Title>
        </Line>
        <div style={{ transform: `translateY(${rise - 40}px)` }}>
          <Lantern id="turn" palette={['#FFD9A8', '#F08A4B', '#7A2E12']} shape="paper" size={1.5} glow={0.8} lit={lit} />
        </div>
        <div style={{ position: 'absolute', bottom: 150, textAlign: 'center', opacity: logo, transform: `translateY(${(1 - logo) * 20}px)` }}>
          <div style={{ fontFamily: serif, fontWeight: 600, letterSpacing: '-0.02em', fontSize: 120, color: C.cream, textShadow: `0 0 60px ${C.ember}88` }}>
            Ember<span style={{ color: C.ember }}>.ai</span>
          </div>
          <div style={{ fontFamily: serif, fontSize: 38, color: C.muted, fontStyle: 'italic' }}>Release what you feel. Someone will answer.</div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};

const LIGHTS: { e: keyof typeof PALETTES; shape: string; x: number; y: number }[] = [
  { e: 'lonely', shape: 'tall', x: 260, y: 300 }, { e: 'anxious', shape: 'paper', x: 560, y: 520 },
  { e: 'grieving', shape: 'round', x: 860, y: 280 }, { e: 'hopeful', shape: 'tall', x: 1160, y: 540 },
  { e: 'joyful', shape: 'star', x: 1440, y: 300 }, { e: 'grateful', shape: 'round', x: 1660, y: 560 },
];

/** Six emotions, six lanterns: color, shape and sound per feeling. */
const LanternShowcase: React.FC = () => {
  const f = useCurrentFrame();
  const dur = s(D.showcase);
  return (
    <Fade dur={dur}>
      <Narration tl={T.showcase} />
      <Sky />
      <AbsoluteFill>
        <Line at={s(T.showcase.at[0])} style={{ position: 'absolute', top: 70, width: '100%' }}>
          <Title size={50}>Every feeling becomes a lantern of light and sound.</Title>
        </Line>
        {LIGHTS.map((l, i) => {
          const t = interpolate(f, [i * 5, i * 5 + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const bob = Math.sin((f + i * 20) / 22) * 8;
          return (
            <div key={l.e} style={{ position: 'absolute', left: l.x - 60, top: l.y + bob + (1 - t) * 80, opacity: t, textAlign: 'center' }}>
              <Lantern id={`show-${l.e}`} palette={PALETTES[l.e]} shape={l.shape} glow={0.7} flicker={0.4} seed={i} />
              <div style={{ fontFamily: sans, color: PALETTES[l.e][0], fontSize: 24, marginTop: 6, textTransform: 'capitalize' }}>{l.e}</div>
            </div>
          );
        })}
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 70 }}>
          <Line at={s(1.4)}>
            <div style={{ fontFamily: sans, color: C.muted, fontSize: 30 }}>
              AI picks its colors, shape, glow, and an ambient soundscape: rain, wind, chimes, piano.
            </div>
          </Line>
        </AbsoluteFill>
      </AbsoluteFill>
    </Fade>
  );
};

/** Lanterns fade at dawn: nothing stays forever. */
const Dawn: React.FC = () => {
  const f = useCurrentFrame();
  const dur = s(D.dawn);
  const fade = interpolate(f, [s(0.8), dur - s(0.7)], [1, 0.08], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dawn = interpolate(f, [s(0.5), dur - s(0.3)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Fade dur={dur}>
      <Narration tl={T.dawn} />
      <Sky dim={1 - dawn * 0.7} />
      <AbsoluteFill style={{ background: `linear-gradient(to top, rgba(242,181,68,${0.35 * dawn}) 0%, rgba(214,106,62,${0.15 * dawn}) 35%, transparent 70%)` }} />
      {LIGHTS.map((l, i) => (
        <div key={l.e} style={{ position: 'absolute', left: l.x - 45, top: l.y - 40 - f * 0.4, opacity: fade }}>
          <Lantern id={`dawn-${l.e}`} palette={PALETTES[l.e]} shape={l.shape} size={0.75} glow={0.6} seed={i} />
        </div>
      ))}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Line at={s(T.dawn.at[0])}><Title size={64}>Lanterns fade after 24 hours.</Title></Line>
        <Line at={s(T.dawn.at[1])}><Title size={44} style={{ color: C.muted, fontStyle: 'italic' }}>Say it. Let it go.</Title></Line>
      </AbsoluteFill>
    </Fade>
  );
};

const PROOF = [
  'Live and working, built in 5 days',
  'Each lantern lit in ~2 seconds',
  'Moderation on every message, voice note and drawing',
  'Crisis detection with country-specific helplines',
  'Load-tested for 100 people online at once',
];

const Proof: React.FC = () => {
  const dur = s(D.proof);
  return (
    <Fade dur={dur}>
      <Narration tl={T.proof} />
      <Sky dim={0.5} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <Line at={s(T.proof.at[0])}><Title size={56} style={{ marginBottom: 20 }}>Real. Safe. Live.</Title></Line>
        {PROOF.map((p, i) => (
          <Line key={p} at={s(0.4 + i * 0.5)}>
            <div style={{ fontFamily: sans, fontSize: 38, color: C.cream }}>
              <span style={{ color: C.ember, marginRight: 18 }}>✦</span>{p}
            </div>
          </Line>
        ))}
        <Line at={s(3.2)}>
          <div style={{ fontFamily: sans, fontSize: 24, color: C.muted, marginTop: 30 }}>
            React · Supabase · Featherless (Qwen) · Gemini · ElevenLabs
          </div>
        </Line>
      </AbsoluteFill>
    </Fade>
  );
};

// ─── close: the sky fills with lanterns, then the helplines ─────────
// Beat 1: one lantern in the dark, "Tonight, someone is still awake." word by word.
// Beat 2: "...alone with it." while lanterns light up one by one and rise from below, in three
//         depths (near ones keep clear of the text, far ones drift softly behind it).
// Beat 3: the lines lift away; a helpline card. The logo comes in the Raylight outro next.
const CLOSE_RISERS = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => {
    const v = Math.sin((i + 1) * 12.9898 * n + n * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const z = r(1); // depth: 0 far .. 1 near
  let x = 40 + r(2) * 1840;
  if (z > 0.6 && x > 520 && x < 1400) x = x < 960 ? 120 + r(5) * 330 : 1470 + r(5) * 330;
  return {
    i, z, x,
    start: 0.9 + r(4) * 3.4, // seconds: when it appears and lights
    y0: 560 + r(3) * 720, // some bloom mid-sky, some rise in from below
    speed: 70 + z * 95, // px per second
    size: 0.2 + z * 0.62,
    e: Object.keys(PALETTES)[i % 6] as keyof typeof PALETTES,
    shape: ['round', 'tall', 'paper', 'star'][Math.floor(r(6) * 4)],
  };
});

/** Words fade up and un-blur one after another. */
const WordReveal: React.FC<{ text: string; at: number; style?: React.CSSProperties }> = ({ text, at, style }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ fontFamily: serif, fontSize: 64, lineHeight: 1.2, letterSpacing: '-0.015em', textAlign: 'center', ...style }}>
      {text.split(' ').map((w, k) => {
        const t = interpolate(f, [s(at + k * 0.11), s(at + k * 0.11 + 0.4)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <span key={k} style={{
            display: 'inline-block', marginRight: '0.26em', opacity: t,
            transform: `translateY(${(1 - t) * 14}px)`, filter: `blur(${(1 - t) * 6}px)`,
          }}>{w}</span>
        );
      })}
    </div>
  );
};

const HELPLINES = [
  { where: 'India · Tele-MANAS', num: '14416' },
  { where: 'US · 988 Lifeline', num: '988' },
  { where: 'UK · Samaritans', num: '116 123' },
];

const Close: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const dur = s(D.close);
  const voiced = T.close.names.length > 0;
  const helpAt = voiced ? T.close.at[1] + VO_LEN['close-2'] + 0.7 : 3.4;
  const lift = interpolate(f, [s(helpAt), s(helpAt + 0.6)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const help = interpolate(f, [s(helpAt + 0.35), s(helpAt + 1.1)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const push = interpolate(f, [0, dur], [1, 1.07]);
  const heroY = interpolate(t, [0, helpAt + 1], [900, 560], { extrapolateRight: 'clamp' });
  const heroLit = interpolate(t, [0.2, 1.2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Fade dur={dur} outF={24}>
      <Narration tl={T.close} />
      <Sky />
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        {CLOSE_RISERS.map(l => {
          const lt = t - l.start;
          if (lt < -0.2) return null;
          const lit = interpolate(lt, [0.3, 1.1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const appear = interpolate(lt, [-0.2, 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const top = l.y0 - l.speed * Math.max(0, lt);
          // Lanterns sink back while they pass behind the words, so the words stay clear.
          const cx = l.x + 60 * l.size;
          const cy = top + 90 * l.size;
          const out = Math.max(300 - cx, cx - 1620, 330 - cy, cy - 620, 0);
          const behind = interpolate(out, [0, 90], [0.15, 1], { extrapolateRight: 'clamp' });
          const clear = behind + (1 - behind) * lift;
          return (
            <div key={l.i} style={{
              position: 'absolute', left: l.x, top,
              opacity: appear * clear * (0.45 + l.z * 0.55), filter: l.z < 0.3 ? 'blur(1.6px)' : undefined,
            }}>
              <Lantern id={`rise-${l.i}`} palette={PALETTES[l.e]} shape={l.shape} size={l.size} glow={0.55 + l.z * 0.35} seed={l.i} lit={lit} />
            </div>
          );
        })}
        {/* the first lantern of the night, rising slowly under the words */}
        <div style={{ position: 'absolute', left: 960 - 60 * 0.95, top: heroY, opacity: 1 - lift * 0.5 }}>
          <Lantern id="close-hero" palette={['#FFD9A8', '#F08A4B', '#7A2E12']} shape="paper" size={0.95} glow={0.9} lit={heroLit} />
        </div>
      </AbsoluteFill>
      {/* keeps the words readable over the lanterns */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 46% 26% at 50% 40%, rgba(6,4,4,0.6), rgba(6,4,4,0) 100%)' }} />
      <AbsoluteFill style={{
        alignItems: 'center', justifyContent: 'center', paddingBottom: 140, gap: 14,
        opacity: 1 - lift, transform: `translateY(${-lift * 36}px)`,
      }}>
        <WordReveal text="Tonight, someone is still awake." at={T.close.at[0]} style={{ color: C.cream, textShadow: '0 4px 30px rgba(0,0,0,0.7)' }} />
        <WordReveal text="Now, they don't have to be alone with it." at={T.close.at[1]}
          style={{ color: C.ember, fontWeight: 600, textShadow: `0 0 40px ${C.ember}66, 0 4px 30px rgba(0,0,0,0.7)` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{
        alignItems: 'center', justifyContent: 'center', opacity: help, transform: `translateY(${(1 - help) * 24}px)`,
      }}>
        <div style={{
          padding: '40px 64px 36px', borderRadius: 28, textAlign: 'center',
          background: 'rgba(14,9,10,0.78)', border: '1px solid rgba(214,106,62,0.35)',
          boxShadow: `0 30px 100px rgba(0,0,0,0.7), 0 0 80px ${C.ember}22`,
        }}>
          <div style={{ fontFamily: sans, fontWeight: 500, fontSize: 22, letterSpacing: 6, textTransform: 'uppercase', color: C.ember }}>
            If you're in danger right now
          </div>
          <div style={{ fontFamily: serif, fontSize: 46, color: C.cream, margin: '14px 0 30px' }}>
            Please reach out. Someone is there.
          </div>
          <div style={{ display: 'flex', gap: 22, justifyContent: 'center' }}>
            {HELPLINES.map(h => (
              <div key={h.num} style={{
                padding: '16px 30px', borderRadius: 18, minWidth: 220,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
              }}>
                <div style={{ fontFamily: sans, fontSize: 19, color: C.muted, letterSpacing: 1 }}>{h.where}</div>
                <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 44, color: C.cream, marginTop: 4 }}>{h.num}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: sans, fontSize: 20, color: C.muted, marginTop: 26 }}>
            Ember is a place to be heard, not a replacement for professional care.
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
};

/** A full-frame shot exported from Raylight (public/raylight-*.mp4), with its own sound. */
const RaylightShot: React.FC<{ src: string; dur: number }> = ({ src, dur }) => (
  <Fade dur={dur} inF={8} outF={8}>
    <OffthreadVideo src={staticFile(src)} volume={RAYLIGHT_GAIN} style={{ width: '100%', height: '100%' }} />
    {/* Covers the "Made in Raylight" badge (x 1552-1891, y 978-1073) with the shots' own solid
        background colour, measured from the export. */}
    <div style={{ position: 'absolute', left: 1540, top: 966, right: 0, bottom: 0, background: '#110a07' }} />
  </Fade>
);

// ─── the film ───────────────────────────────────────────────────────

// vo: the scene's narration (music dips under each line); speaks: Ember's voice plays (music dips for the scene).
const SCENES: { dur: number; el: React.ReactNode; vo?: keyof typeof T; speaks?: boolean }[] = [
  { dur: s(3.6), el: <RaylightShot src="raylight-intro.mp4" dur={s(3.6)} /> },
  { vo: 'hook', dur: s(D.hook), el: <Hook /> },
  { vo: 'problem', dur: s(D.problem), el: <Problem /> },
  { vo: 'turn', dur: s(D.turn), el: <Turn /> },
  { dur: s(10), el: <RaylightShot src="raylight-lantern.mp4" dur={s(10)} /> },
  { vo: 'showcase', dur: s(D.showcase), el: <LanternShowcase /> },
  // App clips: screen recordings of the real app (public/0*.mp4, recorded Oct 8; silent).
  // 03-release shows the browser bar until 16 s, so it starts at the release.
  {
    dur: s(14), el: <AppClip src="03-release.mp4" from={17.5} dur={s(14)} label="Release a feeling"
      caption="Anonymous. No profiles. No likes. No followers." />,
  },
  {
    dur: s(12), el: <AppClip src="02-sky.mp4" from={0} dur={s(12)} label="Constellations"
      caption="Feelings like yours, connected. Live, in real time." />,
  },
  {
    speaks: true, dur: s(12), el: (
      <>
        <AppClip src="03-release.mp4" from={33.5} dur={s(12)} label="Ember answers"
          caption={<>If no one answers yet, Ember does: warm, spoken, and always labeled <span style={{ color: C.ember }}>✦ Ember (AI)</span></>} />
        {/* The recording is silent: Ember's reply as shown on screen, in Ember's voice (voiceover.mjs). */}
        <Sequence from={s(6.5)}>
          <Audio src={staticFile('vo/ember-reply.mp3')} volume={EMBER_GAIN} />
        </Sequence>
      </>
    ),
  },
  {
    dur: s(9), el: <AppClip src="04-moderation.mp4" from={7} dur={s(9)} label="A space that stays safe"
      caption="Hate is blocked: text, voice and drawings, checked on the server. Pain is always welcome." />,
  },
  {
    dur: s(6.5), el: <AppClip src="05-crisis.mp4" from={1.5} dur={s(6.5)} label="When it's more than a bad night"
      caption="Some messages are a cry for help." />,
  },
  {
    dur: s(9), el: <AppClip src="05-crisis.mp4" from={8} dur={s(9)} label="Never silenced"
      caption="An instant warning, the right helpline for your country, and Ember answers right away." />,
  },
  {
    dur: s(8), el: <AppClip src="05-crisis.mp4" from={34} dur={s(8)} label="Breathe through it"
      caption="A guided breathing exercise, right there on the crisis card." />,
  },
  {
    dur: s(6), el: <AppClip src="05-crisis.mp4" from={49.5} dur={s(6)} label="Help, wherever you are"
      caption="Verified helplines for many countries, one tap away." />,
  },
  { vo: 'dawn', dur: s(D.dawn), el: <Dawn /> },
  { vo: 'proof', dur: s(D.proof), el: <Proof /> },
  { vo: 'close', dur: s(D.close), el: <Close /> },
  { dur: s(4), el: <RaylightShot src="raylight-outro.mp4" dur={s(4)} /> },
];

export const FILM_FRAMES = SCENES.reduce((n, sc) => n + sc.dur, 0);

// ─── music: public/music.mp3 ("Lanterns in Stillness", Eleven Music) ──
// Under the whole film, dipping while someone speaks: each narration line and the scenes where
// Ember's voice plays.
const MUSIC = 0.5;   // normal level (the track itself is quiet, about -26 dB)
const DUCKED = 0.2;  // while a voice speaks
const RAMP = 10;     // frames to dip / come back

const SPEECH: [number, number][] = (() => {
  const out: [number, number][] = [];
  let start = 0;
  for (const sc of SCENES) {
    if (sc.speaks) out.push([start, start + sc.dur]);
    if (sc.vo) {
      const tl = T[sc.vo];
      tl.names.forEach((n, i) => out.push([start + s(tl.at[i]), start + s(tl.at[i] + VO_LEN[n])]));
    }
    start += sc.dur;
  }
  return out;
})();

function musicVolume(f: number) {
  // 1 inside a speech window, easing to 0 over RAMP frames outside it.
  let duck = 0;
  for (const [a, b] of SPEECH) {
    const d = f < a ? a - f : f > b ? f - b : 0;
    duck = Math.max(duck, interpolate(d, [0, RAMP], [1, 0], { extrapolateRight: 'clamp' }));
  }
  const level = MUSIC + (DUCKED - MUSIC) * duck;
  const fade = interpolate(f, [0, s(2), FILM_FRAMES - s(4), FILM_FRAMES], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return level * fade;
}

export const EmberFilm: React.FC = () => (
  <AbsoluteFill style={{ background: '#050304' }}>
    <Audio src={staticFile('music.mp3')} volume={musicVolume} />
    <Series>
      {SCENES.map((sc, i) => (
        <Series.Sequence key={i} durationInFrames={sc.dur}>{sc.el}</Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);
