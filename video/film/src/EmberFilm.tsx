// Ember.ai demo film (~2 min). Motion graphics + real recordings of the app (video/out),
// plus three shots made in Raylight (intro, lantern release, outro) in public/raylight-*.mp4.
// Structure follows the film prompt: hook → problem → turn/logo → features (real app) → crisis →
// fades in 24h → proof → close with helplines.
import React from 'react';
import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Series, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { AppClip, C, Fade, Lantern, Line, PALETTES, sans, serif, Sky, Title, TypeText } from './ui';

export const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

// ─── motion-graphics scenes ─────────────────────────────────────────

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const dur = s(6.5);
  const ember = interpolate(f, [s(4.2), s(5.2)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Fade dur={dur} inF={20}>
      <AbsoluteFill style={{ background: '#050304', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: sans, color: C.muted, fontSize: 30, letterSpacing: 6, marginBottom: 40 }}>3:07 AM</div>
        <TypeText text="It's 3 a.m. You can't say it to anyone you know." start={s(0.6)} cps={24}
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
  const dur = s(14);
  return (
    <Fade dur={dur}>
      <Sky dim={0.45} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 36 }}>
        <Line at={s(0.5)}><Title size={60}>1 in 6 people worldwide feel lonely.</Title></Line>
        <Line at={s(4.5)}><Title size={60}>Every year, more than 700,000 people die by suicide.</Title></Line>
        <Line at={s(8.5)}><Title size={60} style={{ color: C.ember }}>Most of them never told anyone how they felt.</Title></Line>
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
  const dur = s(10);
  const rise = interpolate(f, [0, s(3.5)], [380, 0], { extrapolateRight: 'clamp' });
  const lit = interpolate(f, [s(2.5), s(4)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logo = spring({ frame: f - s(4.5), fps, config: { damping: 200 } });
  return (
    <Fade dur={dur}>
      <Sky />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Line at={0} style={{ position: 'absolute', top: 120 }}>
          <Title size={50}>What if you could just… let it out?</Title>
        </Line>
        <div style={{ transform: `translateY(${rise - 40}px)` }}>
          <Lantern id="turn" palette={['#FFD9A8', '#F08A4B', '#7A2E12']} shape="paper" size={1.5} glow={0.8} lit={lit} />
        </div>
        <div style={{ position: 'absolute', bottom: 150, textAlign: 'center', opacity: logo, transform: `translateY(${(1 - logo) * 20}px)` }}>
          <div style={{ fontFamily: serif, fontSize: 120, color: C.cream, textShadow: `0 0 60px ${C.ember}88` }}>
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
  const dur = s(8);
  return (
    <Fade dur={dur}>
      <Sky />
      <AbsoluteFill>
        <Line at={0} style={{ position: 'absolute', top: 70, width: '100%' }}>
          <Title size={50}>Every feeling becomes a lantern of light and sound.</Title>
        </Line>
        {LIGHTS.map((l, i) => {
          const t = interpolate(f, [i * 8, i * 8 + 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const bob = Math.sin((f + i * 20) / 22) * 8;
          return (
            <div key={l.e} style={{ position: 'absolute', left: l.x - 60, top: l.y + bob + (1 - t) * 80, opacity: t, textAlign: 'center' }}>
              <Lantern id={`show-${l.e}`} palette={PALETTES[l.e]} shape={l.shape} glow={0.7} flicker={0.4} seed={i} />
              <div style={{ fontFamily: sans, color: PALETTES[l.e][0], fontSize: 24, marginTop: 6, textTransform: 'capitalize' }}>{l.e}</div>
            </div>
          );
        })}
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 70 }}>
          <Line at={s(2.5)}>
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
  const dur = s(6);
  const fade = interpolate(f, [s(1.5), s(5)], [1, 0.08], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dawn = interpolate(f, [s(1), s(5.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Fade dur={dur}>
      <Sky dim={1 - dawn * 0.7} />
      <AbsoluteFill style={{ background: `linear-gradient(to top, rgba(242,181,68,${0.35 * dawn}) 0%, rgba(214,106,62,${0.15 * dawn}) 35%, transparent 70%)` }} />
      {LIGHTS.map((l, i) => (
        <div key={l.e} style={{ position: 'absolute', left: l.x - 45, top: l.y - 40 - f * 0.4, opacity: fade }}>
          <Lantern id={`dawn-${l.e}`} palette={PALETTES[l.e]} shape={l.shape} size={0.75} glow={0.6} seed={i} />
        </div>
      ))}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Line at={s(1.5)}><Title size={64}>Lanterns fade after 24 hours.</Title></Line>
        <Line at={s(3)}><Title size={44} style={{ color: C.muted, fontStyle: 'italic' }}>Say it. Let it go.</Title></Line>
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
  const dur = s(10);
  return (
    <Fade dur={dur}>
      <Sky dim={0.5} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <Line at={0}><Title size={56} style={{ marginBottom: 20 }}>Real. Safe. Live.</Title></Line>
        {PROOF.map((p, i) => (
          <Line key={p} at={s(0.8 + i * 0.9)}>
            <div style={{ fontFamily: sans, fontSize: 38, color: C.cream }}>
              <span style={{ color: C.ember, marginRight: 18 }}>✦</span>{p}
            </div>
          </Line>
        ))}
        <Line at={s(6)}>
          <div style={{ fontFamily: sans, fontSize: 24, color: C.muted, marginTop: 30 }}>
            React · Supabase · Featherless (Qwen) · Gemini · ElevenLabs
          </div>
        </Line>
      </AbsoluteFill>
    </Fade>
  );
};

const Close: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = s(13);
  const logo = spring({ frame: f - s(4.5), fps, config: { damping: 200 } });
  return (
    <Fade dur={dur} outF={30}>
      <Sky />
      {Array.from({ length: 26 }, (_, i) => {
        const e = Object.keys(PALETTES)[i % 6] as keyof typeof PALETTES;
        const x = ((i * 397) % 1800) + 60;
        const y = 760 - ((i * 211) % 520) - f * (0.15 + (i % 5) * 0.05);
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, opacity: 0.55 }}>
            <Lantern id={`close-${i}`} palette={PALETTES[e]} shape={['round', 'tall', 'paper', 'star'][i % 4]} size={0.38} glow={0.5} seed={i} />
          </div>
        );
      })}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Line at={s(0.5)}><Title size={58}>Tonight, someone is still awake.</Title></Line>
        <Line at={s(2.3)}><Title size={58} style={{ color: C.ember }}>Now, they don't have to be alone with it.</Title></Line>
        <div style={{ marginTop: 50, opacity: logo, textAlign: 'center' }}>
          <div style={{ fontFamily: serif, fontSize: 96, color: C.cream, textShadow: `0 0 60px ${C.ember}88` }}>
            Ember<span style={{ color: C.ember }}>.ai</span>
          </div>
          <div style={{ fontFamily: sans, fontSize: 26, color: C.muted, maxWidth: 1300, margin: '0 auto' }}>
            A candle-lit space where strangers release what they feel, and others answer with words, voice, drawings or stickers.
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 36 }}>
        <div style={{ fontFamily: sans, fontSize: 21, color: C.muted, textAlign: 'center', opacity: logo }}>
          Ember is a place to be heard, not a replacement for professional care.<br />
          If you're in danger, call your local helpline: India 14416 · US 988 · UK 116 123
        </div>
      </AbsoluteFill>
    </Fade>
  );
};

/** A full-frame shot exported from Raylight (public/raylight-*.mp4), with its own sound. */
const RaylightShot: React.FC<{ src: string; dur: number }> = ({ src, dur }) => (
  <Fade dur={dur} inF={8} outF={8}>
    <OffthreadVideo src={staticFile(src)} style={{ width: '100%', height: '100%' }} />
  </Fade>
);

// ─── the film ───────────────────────────────────────────────────────

const SCENES: { dur: number; el: React.ReactNode }[] = [
  { dur: s(3.6), el: <RaylightShot src="raylight-intro.mp4" dur={s(3.6)} /> },
  { dur: s(6.5), el: <Hook /> },
  { dur: s(14), el: <Problem /> },
  { dur: s(10), el: <Turn /> },
  { dur: s(10), el: <RaylightShot src="raylight-lantern.mp4" dur={s(10)} /> },
  { dur: s(8), el: <LanternShowcase /> },
  {
    dur: s(12), el: <AppClip src="03-release.mp4" from={3} dur={s(12)} label="Release a feeling"
      caption="Anonymous. No profiles. No likes. No followers." />,
  },
  {
    dur: s(12), el: <AppClip src="02-sky.mp4" from={1} dur={s(12)} label="Constellations"
      caption="Feelings like yours, connected. Live, in real time." />,
  },
  {
    dur: s(8), el: (
      <>
        <AppClip src="03-release.mp4" from={39.5} dur={s(8)} label="Ember answers"
          caption={<>If no one answers yet, Ember does: warm, spoken, and always labeled <span style={{ color: C.ember }}>✦ Ember (AI)</span></>} />
        <Audio src={staticFile('03-release-ember-voice.mp3')} startFrom={0} />
      </>
    ),
  },
  {
    dur: s(8.5), el: <AppClip src="04-moderation.mp4" from={1} dur={s(8.5)} label="A space that stays safe"
      caption="Hate is blocked: text, voice and drawings, checked on the server. Pain is always welcome." />,
  },
  {
    dur: s(4.5), el: <AppClip src="05-crisis.mp4" from={0.4} dur={s(4.5)} label="When it's more than a bad night"
      caption="Some messages are a cry for help." />,
  },
  {
    dur: s(15), el: (
      <>
        <AppClip src="05-crisis.mp4" from={16.6} dur={s(15)} label="Never silenced"
          caption="Instant warning, the right helpline for your country, and Ember's calming voice." />
        <Audio src={staticFile('05-crisis-ember-voice.mp3')} startFrom={0} />
      </>
    ),
  },
  { dur: s(6), el: <Dawn /> },
  { dur: s(10), el: <Proof /> },
  { dur: s(13), el: <Close /> },
  { dur: s(4), el: <RaylightShot src="raylight-outro.mp4" dur={s(4)} /> },
];

export const FILM_FRAMES = SCENES.reduce((n, sc) => n + sc.dur, 0);

export const EmberFilm: React.FC = () => (
  <AbsoluteFill style={{ background: '#050304' }}>
    <Series>
      {SCENES.map((sc, i) => (
        <Series.Sequence key={i} durationInFrames={sc.dur}>{sc.el}</Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);
