import { useEffect } from 'react';
import type { Lantern } from '../types';
import ambientMusicUrl from '../../assets/ember_ambient_music.mp3';

/**
 * Ambient background music manager for Ember.
 * Plays the soothing Ember soundtrack (assets/ember_ambient_music.mp3) with
 * seamless looping, smooth fading, and persistent audio state.
 */
class AmbientMusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private targetVolume = 0.75;
  private isEnabled = false;

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio(ambientMusicUrl);
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = 0;
    }
    return this.audio;
  }

  public play() {
    this.isEnabled = true;
    const audio = this.getAudio();

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.fadeIn();
        })
        .catch(() => {
          // Autoplay policy prevented playback without prior user gesture.
          // Will smoothly resume upon first interaction.
        });
    }
  }

  public pause() {
    this.isEnabled = false;
    if (!this.audio) return;

    this.fadeOut(() => {
      if (!this.isEnabled && this.audio) {
        this.audio.pause();
      }
    });
  }

  public resumeIfEnabled() {
    if (this.isEnabled && this.audio && this.audio.paused) {
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.fadeIn();
          })
          .catch(() => {});
      }
    }
  }

  private fadeIn() {
    if (!this.audio) return;
    if (this.fadeInterval) clearInterval(this.fadeInterval);

    const step = 0.04;
    this.fadeInterval = setInterval(() => {
      if (!this.audio) {
        clearInterval(this.fadeInterval!);
        return;
      }
      if (this.audio.volume < this.targetVolume) {
        this.audio.volume = Math.min(this.targetVolume, this.audio.volume + step);
      } else {
        clearInterval(this.fadeInterval!);
        this.fadeInterval = null;
      }
    }, 40);
  }

  private fadeOut(onComplete?: () => void) {
    if (!this.audio) return;
    if (this.fadeInterval) clearInterval(this.fadeInterval);

    const step = 0.05;
    this.fadeInterval = setInterval(() => {
      if (!this.audio) {
        clearInterval(this.fadeInterval!);
        return;
      }
      if (this.audio.volume > 0.03) {
        this.audio.volume = Math.max(0, this.audio.volume - step);
      } else {
        this.audio.volume = 0;
        clearInterval(this.fadeInterval!);
        this.fadeInterval = null;
        onComplete?.();
      }
    }, 40);
  }
}

// Global background music player singleton
const globalMusicPlayer = new AmbientMusicPlayer();

/**
 * Plays the soothing background ambient music across the sky
 * whenever the sound toggle in the bottom HUD dock is active.
 */
export function useSkyAmbientSound(soundEnabled: boolean) {
  useEffect(() => {
    if (!soundEnabled) {
      globalMusicPlayer.pause();
      return;
    }

    globalMusicPlayer.play();

    // Modern browsers require a user gesture before allowing audio playback.
    // Listen for the first touch or click to smoothly unlock and resume playback.
    const handleGesture = () => {
      if (localStorage.getItem('ember_sound') !== 'off') {
        globalMusicPlayer.resumeIfEnabled();
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
 * Lantern detail modal sound hook.
 * The Ember ambient soundtrack plays seamlessly across the whole sanctuary.
 */
export function useLanternSound(_lantern: Lantern | null, _soundEnabled: boolean) {
  // Ambient soundtrack plays seamlessly across the sanctuary
}
