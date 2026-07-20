/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private effectsEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private musicTimer: number | null = null;
  private musicStep: number = 0;
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
    if (!this.musicEnabled) return;
    this.initContext();
    if (!this.ctx || this.musicTimer !== null) return;

    const stepDuration = 0.75;
    const playStep = () => {
      if (!this.musicEnabled || !this.ctx) {
        this.stopBackgroundMusic();
        return;
      }

      const note = this.musicPattern[this.musicStep % this.musicPattern.length];
      this.playMusicTone(note, stepDuration * 0.9, 0.012);
      this.musicStep += 1;
    };

    playStep();
    this.musicTimer = window.setInterval(playStep, stepDuration * 1000);
  }

  startBackgroundMusic() {
    this.ensureBackgroundMusic();
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
}

export const sound = new SoundManager();
