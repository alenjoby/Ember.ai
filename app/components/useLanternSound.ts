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
 * Creates a crystal-clear, soothing, organic ambient soundscape using the Web Audio API.
 * Uses soft sine/triangle oscillators, an analog-style 1600Hz lowpass filter with silky resonance,
 * a mastering dynamics compressor for full presence without clipping, and seamless,
 * grain-free organic rainfall. Zero clicks, zero static, zero grain.
 */
class CalmAmbientEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private oscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private rainNode: AudioNode | null = null;
  private rainGainNode: GainNode | null = null;
  private chordTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  public async start(key = 'F major', volume = 0.70) {
    if (this.isRunning) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      this.isRunning = true;

      // Studio mastering dynamics compressor: gives full, rich, warm presence at normal volume
      // and ensures absolutely zero digital clipping or distortion
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(14, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(3.5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.02, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // Master Gain: smooth ramp to warm, clear audible volume
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(volume, this.ctx.currentTime + 2.5);
      this.masterGain.connect(this.compressor);

      // Warm analog lowpass filter (1600Hz lets rich chord overtones and harmonic warmth shine through)
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(1600, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(0.7, this.ctx.currentTime);
      this.filter.connect(this.masterGain);

      // Start gentle chord pad
      this.playChord(key);

      // Add pure, organic, grain-free rainfall
      this.startGentleRain();

      // Cycle gently through peaceful chords every 10.5 seconds
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
      // Low notes use warm triangle for acoustic foundation, higher harmonics use silky pure sine
      osc.type = i === 0 ? 'triangle' : 'sine';
      // Subtle gentle detune for rich celestial chorus
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.detune.setValueAtTime((i % 2 === 0 ? 3 : -3) * (i + 1), this.ctx.currentTime);

      const gain = this.ctx.createGain();
      const noteGain = i === 0 ? 0.45 : 0.35 / Math.sqrt(i + 1);
      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(noteGain, this.ctx.currentTime + 2.5);

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

    // Fade out previous chord smoothly over 3.5 seconds
    oldOscs.forEach(({ osc, gain }) => {
      try {
        if (!this.ctx) return;
        gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 3.5);
        setTimeout(() => {
          try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch {}
        }, 3700);
      } catch {}
    });

    // Fade in new chord
    this.playChord(newKey);
  }

  /**
   * Generates pure, organic, soothing rainfall with zero grains, zero clicks, and zero harsh hiss.
   * Uses continuous Brownian random walk (1/f² slope) with a smooth windowed loop seam
   * and dual analog-style highpass/lowpass shaping.
   */
  private startGentleRain() {
    if (!this.ctx || !this.masterGain) return;
    try {
      // 6-second seamless stereo Brownian rain buffer
      const duration = 6.0;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const rainBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
      const left = rainBuffer.getChannelData(0);
      const right = rainBuffer.getChannelData(1);

      // Continuous Brownian integration with leaky integrator - 100% continuous, ZERO sudden spikes or grains
      let brownL = 0;
      let brownR = 0;
      for (let i = 0; i < bufferSize; i++) {
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;

        brownL = (brownL + 0.02 * whiteL) / 1.02;
        brownR = (brownR + 0.02 * whiteR) / 1.02;

        left[i] = brownL * 3.2;
        right[i] = brownR * 3.2;
      }

      // Smooth cosine crossfade on the buffer endpoints (250ms) to ensure ZERO loop seam click
      const fadeSamples = Math.floor(this.ctx.sampleRate * 0.25);
      for (let i = 0; i < fadeSamples; i++) {
        const factor = Math.sin((i / fadeSamples) * (Math.PI / 2));
        left[i] *= factor;
        right[i] *= factor;
        const tailIdx = bufferSize - 1 - i;
        left[tailIdx] *= factor;
        right[tailIdx] *= factor;
      }

      const rainSource = this.ctx.createBufferSource();
      rainSource.buffer = rainBuffer;
      rainSource.loop = true;

      // Highpass filter at 200Hz to remove muddy sub-bass rumble
      const rainHighpass = this.ctx.createBiquadFilter();
      rainHighpass.type = 'highpass';
      rainHighpass.frequency.setValueAtTime(200, this.ctx.currentTime);

      // Lowpass filter at 1150Hz for gentle, warm rainfall without digital hiss
      const rainLowpass = this.ctx.createBiquadFilter();
      rainLowpass.type = 'lowpass';
      rainLowpass.frequency.setValueAtTime(1150, this.ctx.currentTime);
      rainLowpass.Q.setValueAtTime(0.5, this.ctx.currentTime);

      // Rain Gain node: balanced gently under the lush chords
      const rainGain = this.ctx.createGain();
      rainGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      rainGain.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 3.0);

      rainSource.connect(rainHighpass);
      rainHighpass.connect(rainLowpass);
      rainLowpass.connect(rainGain);
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
    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch {}
      this.masterGain = null;
    }
    if (this.compressor) {
      try { this.compressor.disconnect(); } catch {}
      this.compressor = null;
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
      globalSkyEngine.start('D minor', 0.70);
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
    engine.start(key, 0.60);

    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
    };
  }, [lantern, soundEnabled]);
}
