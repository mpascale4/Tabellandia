/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import frogAudioUrl from '../data/frog.mp3';
import snakeAudioUrl from '../data/animal-sounds/snake-rattlesnake.ogg';
import batAudioUrl from '../data/animal-sounds/bat-feeding-buzz.wav';
import scorpionAudioUrl from '../data/animal-sounds/scorpion-night-insects.wav';

type SaltoAntagonistAudioId = 'snake' | 'bat' | 'spider' | 'scorpion';
const MAX_AUDIO_PLAY_SECONDS = 2;

class SoundManager {
  private ctx: AudioContext | null = null;
  private effectsEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private musicTimer: number | null = null;
  private musicStep: number = 0;
  private frogAudioBuffer: AudioBuffer | null = null;
  private loadingFrogAudio = false;
  private readonly antagonistsAudioUrls: Record<SaltoAntagonistAudioId, string> = {
    snake: snakeAudioUrl,
    bat: batAudioUrl,
    // Evita la traccia precedente con cani: per il ragno usiamo una traccia insetti neutra.
    spider: scorpionAudioUrl,
    scorpion: scorpionAudioUrl,
  };
  private readonly antagonistsAudioBuffers: Partial<Record<SaltoAntagonistAudioId, AudioBuffer>> = {};
  private readonly loadingAntagonistsAudio = new Set<SaltoAntagonistAudioId>();
  private readonly musicPattern = [
    // Divertente melodia playful in tonalità maggiore
    392.00, // G4
    392.00, // G4
    392.00, // G4
    349.23, // F4
    392.00, // G4
    466.16, // A#4
    392.00, // G4
    392.00, // G4
    392.00, // G4
    349.23, // F4
    392.00, // G4
    587.33, // D5
    523.25, // C5
    523.25, // C5
    523.25, // C5
    466.16, // A#4
    523.25, // C5
    587.33, // D5
    523.25, // C5
    392.00, // G4 - back to main
  ];

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted: boolean) {
    this.effectsEnabled = !muted;
  }

  isMuted() {
    return !this.effectsEnabled;
  }

  setEffectsEnabled(enabled: boolean) {
    this.effectsEnabled = enabled;
  }

  isEffectsEnabled() {
    return this.effectsEnabled;
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopBackgroundMusic();
    }
  }

  isMusicEnabled() {
    return this.musicEnabled;
  }

  primeAudio() {
    this.initContext();
  }

  private playTone(frequencies: number[], duration: number, volume: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    frequencies.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((Math.random() * 8) - 4, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    });
  }

  private playMusicTone(frequency: number, duration: number, volume: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const base = this.ctx.createOscillator();
    const harmony = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    base.type = 'sine';
    harmony.type = 'sine';
    base.frequency.setValueAtTime(frequency, now);
    harmony.frequency.setValueAtTime(frequency * 1.5, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    base.connect(gain);
    harmony.connect(gain);
    gain.connect(this.ctx.destination);

    base.start(now);
    harmony.start(now);
    base.stop(now + duration + 0.05);
    harmony.stop(now + duration + 0.05);
  }

  private ensureBackgroundMusic() {
    // Background music disabled globally: keep SFX active, never schedule loop.
    return;
  }

  startBackgroundMusic() {
    // Background music disabled globally.
    this.stopBackgroundMusic();
  }

  stopBackgroundMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  playClick() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();
    this.playTone([400], 0.05, 0.1);
  }

  playCorrect() {
    this.playSuccess();
  }

  playWrong() {
    this.playError();
  }

  playSuccess() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }

  playLadybugSuccess() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const now = this.ctx.currentTime;
    // Suono breve e giocoso per la coccinella.
    [880, 1046.5].forEach((freq, idx) => {
      const start = now + idx * 0.055;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.13);
    });
  }

  playButterflySuccess() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const now = this.ctx.currentTime;
    // Suono leggero e ascendente per la farfalla.
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const start = now + idx * 0.07;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  playStarSuccess() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const now = this.ctx.currentTime;
    // Suono brillante a "twinkle" per la stella.
    [659.25, 987.77, 1318.51, 1567.98].forEach((freq, idx) => {
      const start = now + idx * 0.06;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.17);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  }

  playError() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.25);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.25);
  }

  playPowerUp() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.4);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.4);
  }

  playLevelUp() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Triumphant arpeggio
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.35);
    });
  }

  playRewardFanfare() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const now = this.ctx.currentTime;
    const notes = [659.25, 783.99, 987.77, 1318.51];

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.11, now + idx * 0.07 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.19);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.22);
    });
  }

  playTick() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  playFrogCroak() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    // Se il buffer non è stato caricato, avviamo il caricamento
    if (!this.frogAudioBuffer && !this.loadingFrogAudio) {
      this.loadingFrogAudio = true;
      fetch(frogAudioUrl)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => this.ctx!.decodeAudioData(arrayBuffer))
        .then((decodedBuffer) => {
          this.frogAudioBuffer = decodedBuffer;
          this.loadingFrogAudio = false;
          this.playFrogCroakFromBuffer();
        })
        .catch((error) => {
          this.loadingFrogAudio = false;
          console.error('Error loading frog audio:', error);
          this.playFrogCroakFallback();
        });
      return;
    }

    // Se il buffer è caricato, riproducilo
    if (this.frogAudioBuffer) {
      this.playFrogCroakFromBuffer();
    }
  }

  private playFrogCroakFromBuffer() {
    if (!this.ctx || !this.frogAudioBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.frogAudioBuffer;
    source.connect(this.ctx.destination);
    source.start(0, 0, Math.min(MAX_AUDIO_PLAY_SECONDS, this.frogAudioBuffer.duration));
  }

  private playAudioBuffer(buffer: AudioBuffer) {
    if (!this.ctx) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    source.start(0, 0, Math.min(MAX_AUDIO_PLAY_SECONDS, buffer.duration));
  }

  playSaltoAntagonistSound(antagonistId: SaltoAntagonistAudioId) {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const cached = this.antagonistsAudioBuffers[antagonistId];
    if (cached) {
      this.playAudioBuffer(cached);
      return;
    }

    if (this.loadingAntagonistsAudio.has(antagonistId)) {
      this.playClick();
      return;
    }

    const targetUrl = this.antagonistsAudioUrls[antagonistId];
    this.loadingAntagonistsAudio.add(antagonistId);
    fetch(targetUrl)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => this.ctx!.decodeAudioData(arrayBuffer))
      .then((decodedBuffer) => {
        this.antagonistsAudioBuffers[antagonistId] = decodedBuffer;
        this.playAudioBuffer(decodedBuffer);
      })
      .catch((error) => {
        console.error(`Error loading ${antagonistId} audio:`, error);
        this.playClick();
      })
      .finally(() => {
        this.loadingAntagonistsAudio.delete(antagonistId);
      });
  }

  private playFrogCroakFallback() {
    if (!this.ctx) return;
    // Fallback al suono sintetico
    const now = this.ctx.currentTime;
    const frequencies = [150, 120];
    const duration = 0.15;

    frequencies.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * duration * 0.5);

      gain.gain.setValueAtTime(0, now + idx * duration * 0.5);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * duration * 0.5 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * duration * 0.5 + duration);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * duration * 0.5);
      osc.stop(now + idx * duration * 0.5 + duration);
    });
  }

  loadFrogAudio() {
    if (this.loadingFrogAudio || this.frogAudioBuffer) return;
    this.loadingFrogAudio = true;

    fetch(frogAudioUrl)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => {
        this.initContext();
        if (!this.ctx) throw new Error('AudioContext not available');
        return this.ctx.decodeAudioData(arrayBuffer);
      })
      .then((decodedBuffer) => {
        this.frogAudioBuffer = decodedBuffer;
        this.loadingFrogAudio = false;
      })
      .catch((error) => {
        console.error('Error loading frog audio:', error);
        this.loadingFrogAudio = false;
      });
  }
}

export const sound = new SoundManager();
