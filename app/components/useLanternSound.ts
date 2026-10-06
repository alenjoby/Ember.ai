import { useEffect, useRef } from 'react';
// Tone.js is ~1/3 of the app bundle: load it only when sound is actually turned on.
import type * as ToneTypes from 'tone';
import type { Lantern } from '../types';

// Musical scale degrees for chord construction based on key
const KEY_FREQUENCIES: Record<string, string[]> = {
  'D minor': ['D3', 'F3', 'A3', 'D4'],
  'G major': ['G3', 'B3', 'D4', 'G4'],
  'A minor': ['A2', 'C3', 'E3', 'A3'],
  'C minor': ['C3', 'Eb3', 'G3', 'C4'],
  'E major': ['E3', 'G#3', 'B3', 'E4'],
  'F major': ['F3', 'A3', 'C4', 'F4'],
};

/**
 * Procedural Tone.js generative soundscape for an active Lantern.
 * Fades in soft chords (pad/instrument) + ambient layer (filtered noise or chimes).
 * Adheres strictly to browser autoplay policies and sound toggle state.
 */
export function useLanternSound(lantern: Lantern | null, soundEnabled: boolean) {
  const synthRef = useRef<ToneTypes.PolySynth | null>(null);
  const noiseRef = useRef<ToneTypes.Noise | null>(null);
  const filterRef = useRef<ToneTypes.Filter | null>(null);
  const chimeRef = useRef<{ synth: ToneTypes.MetalSynth; interval: ReturnType<typeof setInterval> } | null>(null);

  useEffect(() => {
    if (!lantern || !soundEnabled) {
      cleanupAudio();
      return;
    }

    let isMounted = true;

    const startSoundscape = async () => {
      try {
        const Tone = await import('tone');
        if (!isMounted) return;
        if (Tone.context.state !== 'running') {
          await Tone.start();
        }

        if (!isMounted) return;

        // Master soft gain
        const gain = new Tone.Gain(0).toDestination();
        gain.gain.rampTo(0.06, 1.5); // -24 dB target gentle volume

        // Synth instrument
        const synth = new Tone.PolySynth(Tone.AMSynth, {
          harmonicity: 1.5,
          oscillator: { type: 'sine' },
          envelope: {
            attack: 2.0,
            decay: 1.5,
            sustain: 0.8,
            release: 3.0,
          },
        }).connect(gain);

        synthRef.current = synth;

        // Key chord selection
        const chord = KEY_FREQUENCIES[lantern.sound.key] || KEY_FREQUENCIES['D minor'];
        synth.triggerAttack(chord);

        // Ambient layer based on mood
        if (['rain', 'wind', 'ocean', 'fire'].includes(lantern.sound.mood)) {
          const filter = new Tone.Filter({
            frequency: lantern.sound.mood === 'rain' ? 800 : lantern.sound.mood === 'fire' ? 400 : 600,
            type: 'lowpass',
          }).connect(gain);

          const noise = new Tone.Noise(lantern.sound.mood === 'rain' ? 'pink' : 'brown').connect(filter);
          noise.start();

          noiseRef.current = noise;
          filterRef.current = filter;
        } else if (lantern.sound.mood === 'chimes') {
          const metal = new Tone.MetalSynth({
            frequency: 200,
            envelope: { attack: 0.001, decay: 1.4, release: 0.2 },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5,
          }).connect(gain);

          const interval = setInterval(() => {
            if (!isMounted) return;
            metal.triggerAttackRelease('C6', '8n');
          }, 3500);
          // Was returned from this async function, where nobody cleared it: one leaked timer per opened lantern.
          chimeRef.current = { synth: metal, interval };
        }
      } catch (err) {
        console.warn('Tone.js audio start deferred or blocked:', err);
      }
    };

    startSoundscape();

    return () => {
      isMounted = false;
      cleanupAudio();
    };
  }, [lantern, soundEnabled]);

  const cleanupAudio = () => {
    try {
      if (synthRef.current) {
        synthRef.current.releaseAll();
        synthRef.current.dispose();
        synthRef.current = null;
      }
      if (noiseRef.current) {
        noiseRef.current.stop();
        noiseRef.current.dispose();
        noiseRef.current = null;
      }
      if (filterRef.current) {
        filterRef.current.dispose();
        filterRef.current = null;
      }
      if (chimeRef.current) {
        clearInterval(chimeRef.current.interval);
        chimeRef.current.synth.dispose();
        chimeRef.current = null;
      }
    } catch (e) {
      // Audio cleanup
    }
  };
}
