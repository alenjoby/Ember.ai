import { useEffect, useRef } from 'react';
import type { Lantern } from '../types';

/**
 * Pentatonic and meditative chord palettes for soothing soundscapes.
 * Soft, warm, calming intervals tuned to feel like a midnight sanctuary.
 */
const SOOTHING_CHORDS: Record<string, number[]> = {
  // Frequencies in Hz for warm, lush acoustic pads
  'D minor': [146.83, 220.00, 261.63, 329.63, 440.00], // D3, A3, C4, E4, A4 (Dm9)
  'G major': [196.00, 246.94, 293.66, 392.00, 493.88], // G3, B3, D4, G4, B4 (Gmaj7)
  'A minor': [110.00, 164.81, 220.00, 261.63, 329.63], // A2, E3, A3, C4, E4 (Am7)
  'C minor': [130.81, 196.00, 233.08, 311.13, 392.00], // C3, G3, Bb3, Eb4, G4 (Cm9)
  'E major': [164.81, 246.94, 329.63, 415.30, 493.88], // E3, B3, E4, G#4, B4 (Emaj7)
  'F major': [174.61, 220.00, 261.63, 329.63, 440.00], // F3, A3, C4, E4, A4 (Fmaj7)
};

const DEFAULT_CHORD = [174.61, 220.00, 261.63, 329.63, 440.00]; // Fmaj7

/**
 * Creates a soothing, organic ambient soundscape using the Web Audio API.
 * Uses soft sine/triangle oscillators, a gentle 420Hz warm lowpass filter,
 * and slow breathing envelope modulation. Absolutely zero harsh buzzing or mechanical drone.
 */
class CalmAmbientEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private oscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private breezeNode: AudioNode | null = null;
  private rainNode: AudioNode | null = null;
  private rainGainNode: GainNode | null = null;
  private chordTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  public async start(key = 'F major', volume = 0.24) {
    if (this.isRunning) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      this.isRunning = true;

      // Master Gain with very slow, gentle ramp
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(volume, this.ctx.currentTime + 3.0);
      this.masterGain.connect(this.ctx.destination);

      // Warm lowpass filter to remove any harsh highs
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(380, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(1.2, this.ctx.currentTime);
      this.filter.connect(this.masterGain);

      // Start gentle chord pad
      this.playChord(key);

      // Add gentle, soft night breeze (ultra-filtered pink noise)
      this.startGentleBreeze();

      // Add gentle, soothing rain layer in the background (low volume)
      this.startGentleRain();

      // Cycle gently through peaceful chords every 10 seconds
      const chordKeys = Object.keys(SOOTHING_CHORDS);
      let chordIndex = chordKeys.indexOf(key);
      if (chordIndex === -1) chordIndex = 0;

      this.chordTimer = setInterval(() => {
        if (!this.isRunning || !this.ctx) return;
        chordIndex = (chordIndex + 1) % chordKeys.length;
        this.crossfadeChord(chordKeys[chordIndex]);
      }, 10500);

    } catch (e) {
      console.warn('[EmberAudio] Audio engine start deferred:', e);
    }
  }

  public async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn('[EmberAudio] Resume error:', e);
      }
    }
  }

  private playChord(key: string) {
    if (!this.ctx || !this.filter) return;
    const freqs = SOOTHING_CHORDS[key] || DEFAULT_CHORD;

    freqs.forEach((freq, i) => {
      if (!this.ctx || !this.filter) return;
      const osc = this.ctx.createOscillator();
      // Low notes use gentle triangle, higher harmonics use pure sine for silky warmth
      osc.type = i === 0 ? 'triangle' : 'sine';
      // Subtle detune for rich celestial chorus
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.detune.setValueAtTime((i % 2 === 0 ? 3 : -3) * (i + 1), this.ctx.currentTime);

      const gain = this.ctx.createGain();
      const noteGain = i === 0 ? 0.45 : 0.30 / Math.sqrt(i + 1);
      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(noteGain, this.ctx.currentTime + 3.0);

      osc.connect(gain);
      gain.connect(this.filter);
      osc.start();

      this.oscillators.push({ osc, gain });
    });
  }

  private crossfadeChord(newKey: string) {
    if (!this.ctx || !this.filter) return;
    const oldOscs = [...this.oscillators];
    this.oscillators = [];

    // Fade out previous chord over 4 seconds
    oldOscs.forEach(({ osc, gain }) => {
      try {
        if (!this.ctx) return;
        gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 4.0);
        setTimeout(() => {
          try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch {}
        }, 4200);
      } catch {}
    });

    // Fade in new chord
    this.playChord(newKey);
  }

  private startGentleBreeze() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Pink noise filter algorithm
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.035; // very quiet
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const breezeFilter = this.ctx.createBiquadFilter();
      breezeFilter.type = 'lowpass';
      breezeFilter.frequency.setValueAtTime(240, this.ctx.currentTime);

      const breezeGain = this.ctx.createGain();
      breezeGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      breezeGain.gain.exponentialRampToValueAtTime(0.015, this.ctx.currentTime + 3.0);

      whiteNoise.connect(breezeFilter);
      breezeFilter.connect(breezeGain);
      breezeGain.connect(this.masterGain);

      whiteNoise.start();
      this.breezeNode = whiteNoise;
    } catch {}
  }

  private startGentleRain() {
    if (!this.ctx || !this.masterGain) return;
    try {
      // 4 seconds of stereo pink/brown rainfall noise
      const bufferSize = this.ctx.sampleRate * 4;
      const noiseBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
      const left = noiseBuffer.getChannelData(0);
      const right = noiseBuffer.getChannelData(1);

      // Filtered pink noise algorithm for left and right channels to create a soothing stereo field
      let b0L = 0, b1L = 0, b2L = 0;
      let b0R = 0, b1R = 0, b2R = 0;

      for (let i = 0; i < bufferSize; i++) {
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;

        b0L = 0.99886 * b0L + whiteL * 0.0555179;
        b1L = 0.99332 * b1L + whiteL * 0.0750759;
        b2L = 0.96900 * b2L + whiteL * 0.1538520;
        let sL = (b0L + b1L + b2L + whiteL * 0.08) * 0.16;

        b0R = 0.99886 * b0R + whiteR * 0.0555179;
        b1R = 0.99332 * b1R + whiteR * 0.0750759;
        b2R = 0.96900 * b2R + whiteR * 0.1538520;
        let sR = (b0R + b1R + b2R + whiteR * 0.08) * 0.16;

        // Occasional soft droplet patter
        if (Math.random() < 0.002) {
          sL += (Math.random() * 0.25 - 0.125);
        }
        if (Math.random() < 0.002) {
          sR += (Math.random() * 0.25 - 0.125);
        }

        left[i] = sL;
        right[i] = sR;
      }

      const rainSource = this.ctx.createBufferSource();
      rainSource.buffer = noiseBuffer;
      rainSource.loop = true;

      // Bandpass filter centered around 920Hz for realistic rain patter spectrum
      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(920, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(0.75, this.ctx.currentTime);

      // Lowpass filter to ensure zero harsh digital hiss
      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(1700, this.ctx.currentTime);
      lowpass.Q.setValueAtTime(0.6, this.ctx.currentTime);

      // Rain Gain node (low volume: gentle, soothing background drizzle)
      const rainGain = this.ctx.createGain();
      rainGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      rainGain.gain.exponentialRampToValueAtTime(0.065, this.ctx.currentTime + 3.0);

      rainSource.connect(bandpass);
      bandpass.connect(lowpass);
      lowpass.connect(rainGain);
      rainGain.connect(this.masterGain);

      rainSource.start();
      this.rainNode = rainSource;
      this.rainGainNode = rainGain;
    } catch (e) {
      console.warn('[EmberAudio] Gentle rain initialization deferred:', e);
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.chordTimer) {
      clearInterval(this.chordTimer);
      this.chordTimer = null;
    }
    if (this.ctx && this.masterGain) {
      try {
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
        this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);
        setTimeout(() => {
          this.cleanup();
        }, 1300);
        return;
      } catch {}
    }
    this.cleanup();
  }

  private cleanup() {
    this.oscillators.forEach(({ osc, gain }) => {
      try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch {}
    });
    this.oscillators = [];
    if (this.breezeNode) {
      try { (this.breezeNode as any).stop?.(); this.breezeNode.disconnect(); } catch {}
      this.breezeNode = null;
    }
    if (this.rainNode) {
      try { (this.rainNode as any).stop?.(); this.rainNode.disconnect(); } catch {}
      this.rainNode = null;
    }
    if (this.rainGainNode) {
      try { this.rainGainNode.disconnect(); } catch {}
      this.rainGainNode = null;
    }
    if (this.filter) {
      try { this.filter.disconnect(); } catch {}
      this.filter = null;
    }
    if (this.ctx) {
      try { this.ctx.close(); } catch {}
      this.ctx = null;
    }
  }
}

// Global ambient engine singleton
let globalSkyEngine: CalmAmbientEngine | null = null;

/**
 * Plays peaceful, soothing celestial ambient music across the sky
 * whenever the sound toggle in the bottom HUD dock is active.
 */
export function useSkyAmbientSound(soundEnabled: boolean) {
  useEffect(() => {
    if (!soundEnabled) {
      if (globalSkyEngine) {
        globalSkyEngine.stop();
        globalSkyEngine = null;
      }
      return;
    }

    if (!globalSkyEngine) {
      globalSkyEngine = new CalmAmbientEngine();
      globalSkyEngine.start('D minor', 0.24);
    } else {
      globalSkyEngine.resume();
    }

    // Modern browsers start AudioContext in 'suspended' state until the user makes any gesture.
    // Listen for the first touch or click anywhere in the window to resume smoothly.
    const handleGesture = () => {
      if (globalSkyEngine) {
        globalSkyEngine.resume();
      }
    };

    window.addEventListener('pointerdown', handleGesture, { passive: true, once: true });
    window.addEventListener('keydown', handleGesture, { passive: true, once: true });
    window.addEventListener('touchstart', handleGesture, { passive: true, once: true });

    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [soundEnabled]);
}

/**
 * Procedural gentle ambient sound for an opened lantern.
 * Harmonizes with the sky with gentle warm resonant harmonics.
 */
export function useLanternSound(lantern: Lantern | null, soundEnabled: boolean) {
  const engineRef = useRef<CalmAmbientEngine | null>(null);

  useEffect(() => {
    if (!lantern || !soundEnabled) {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      return;
    }

    const key = lantern.sound?.key || 'D minor';
    const engine = new CalmAmbientEngine();
    engineRef.current = engine;
    engine.start(key, 0.20);

    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
    };
  }, [lantern, soundEnabled]);
}
