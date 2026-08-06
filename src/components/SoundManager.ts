/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import frogAudioUrl from '../data/frog.mp3';
import snakeAudioUrl from '../data/animal-sounds/snake-rattlesnake.ogg';
import batAudioUrl from '../data/animal-sounds/bat-feeding-buzz.wav';
import beeBuzzAudioUrl from '../data/animal-sounds/bee-buzzing.opus';
import scorpionAudioUrl from '../data/animal-sounds/scorpion-night-insects.wav';
import saltoAmbienceAudioUrl from '../data/animal-sounds/wood-frogs-calling-in-spring.ogg';
import raccogliBirdsAmbienceAudioUrl from '../data/animal-sounds/raccogli-birds-spain.wav';
import costruiscoLaughingAmbienceAudioUrl from '../data/animal-sounds/costruisco-laughing-commons.wav';
import trovaPneumaticpickhammerAmbienceAudioUrl from '../data/animal-sounds/trova-pneumaticpickhammer.ogg';

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
  private beeBuzzBuffer: AudioBuffer | null = null;
  private loadingBeeBuzzAudio = false;
  private beeBuzzSource: AudioBufferSourceNode | null = null;
  private beeBuzzGain: GainNode | null = null;
  private raccogliBirdsAmbienceBuffer: AudioBuffer | null = null;
  private loadingRaccogliBirdsAmbienceAudio = false;
  private raccogliBirdsAmbienceSource: AudioBufferSourceNode | null = null;
  private raccogliBirdsAmbienceGain: GainNode | null = null;
  private costruiscoAmbienceBuffer: AudioBuffer | null = null;
  private loadingCostruiscoAmbienceAudio = false;
  private costruiscoAmbienceSource: AudioBufferSourceNode | null = null;
  private costruiscoAmbienceGain: GainNode | null = null;
  private trucchiAmbienceBuffer: AudioBuffer | null = null;
  private loadingTrucchiAmbienceAudio = false;
  private trucchiAmbienceSource: AudioBufferSourceNode | null = null;
  private trucchiAmbienceGain: GainNode | null = null;
  private saltoAmbienceBuffer: AudioBuffer | null = null;
  private loadingSaltoAmbienceAudio = false;
  private saltoAmbienceSource: AudioBufferSourceNode | null = null;
  private saltoAmbienceGain: GainNode | null = null;
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
    if (muted) {
      this.stopBeeBuzz();
      this.stopRaccogliBirdsAmbience();
      this.stopCostruiscoAmbience();
      this.stopTrucchiAmbience();
      this.stopSaltoAmbience();
    }
  }

  isMuted() {
    return !this.effectsEnabled;
  }

  setEffectsEnabled(enabled: boolean) {
    this.effectsEnabled = enabled;
    if (!enabled) {
      this.stopBeeBuzz();
      this.stopRaccogliBirdsAmbience();
      this.stopCostruiscoAmbience();
      this.stopTrucchiAmbience();
      this.stopSaltoAmbience();
    }
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

  playBalloonPop() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const now = this.ctx.currentTime;
    const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
    const channelData = noiseBuffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i += 1) {
      channelData[i] = (Math.random() * 2 - 1) * (1 - (i / channelData.length));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(920, now);
    bandpass.Q.setValueAtTime(0.9, now);

    const popOsc = this.ctx.createOscillator();
    popOsc.type = 'triangle';
    popOsc.frequency.setValueAtTime(240, now);
    popOsc.frequency.exponentialRampToValueAtTime(70, now + 0.1);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.22, now + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    const popGain = this.ctx.createGain();
    popGain.gain.setValueAtTime(0.001, now);
    popGain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noiseSource.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    popOsc.connect(popGain);
    popGain.connect(this.ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.11);
    popOsc.start(now);
    popOsc.stop(now + 0.12);
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

  playBeeFailure() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const now = this.ctx.currentTime;
    const sting = this.ctx.createOscillator();
    const buzz = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    sting.type = 'sawtooth';
    sting.frequency.setValueAtTime(980, now);
    sting.frequency.exponentialRampToValueAtTime(210, now + 0.26);

    buzz.type = 'square';
    buzz.frequency.setValueAtTime(180, now);
    buzz.frequency.linearRampToValueAtTime(110, now + 0.26);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    sting.connect(gain);
    buzz.connect(gain);
    gain.connect(this.ctx.destination);

    sting.start(now);
    buzz.start(now);
    sting.stop(now + 0.35);
    buzz.stop(now + 0.35);
  }

  playBombTrapFailure() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const now = this.ctx.currentTime;
    const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.24), this.ctx.sampleRate);
    const channelData = noiseBuffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i += 1) {
      const decay = 1 - (i / channelData.length);
      channelData[i] = (Math.random() * 2 - 1) * decay;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1400, now);
    lowpass.Q.setValueAtTime(0.8, now);

    const boomOsc = this.ctx.createOscillator();
    boomOsc.type = 'sawtooth';
    boomOsc.frequency.setValueAtTime(180, now);
    boomOsc.frequency.exponentialRampToValueAtTime(48, now + 0.22);

    const hissGain = this.ctx.createGain();
    hissGain.gain.setValueAtTime(0.001, now);
    hissGain.gain.linearRampToValueAtTime(0.28, now + 0.008);
    hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    const boomGain = this.ctx.createGain();
    boomGain.gain.setValueAtTime(0.001, now);
    boomGain.gain.linearRampToValueAtTime(0.18, now + 0.015);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    noiseSource.connect(lowpass);
    lowpass.connect(hissGain);
    hissGain.connect(this.ctx.destination);

    boomOsc.connect(boomGain);
    boomGain.connect(this.ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.24);
    boomOsc.start(now);
    boomOsc.stop(now + 0.26);
  }

  playHammerBrickHit() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    this.ensureBackgroundMusic();

    const now = this.ctx.currentTime;
    const thudOsc = this.ctx.createOscillator();
    const ringOsc = this.ctx.createOscillator();
    const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.09), this.ctx.sampleRate);
    const channelData = noiseBuffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i += 1) {
      const decay = 1 - (i / channelData.length);
      channelData[i] = (Math.random() * 2 - 1) * decay;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1700, now);
    noiseFilter.Q.setValueAtTime(1.2, now);

    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(0.001, now);
    thudGain.gain.linearRampToValueAtTime(0.18, now + 0.008);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    const ringGain = this.ctx.createGain();
    ringGain.gain.setValueAtTime(0.001, now);
    ringGain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.14, now + 0.006);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(210, now);
    thudOsc.frequency.exponentialRampToValueAtTime(92, now + 0.14);

    ringOsc.type = 'square';
    ringOsc.frequency.setValueAtTime(1240, now);
    ringOsc.frequency.exponentialRampToValueAtTime(680, now + 0.13);

    thudOsc.connect(thudGain);
    thudGain.connect(this.ctx.destination);

    ringOsc.connect(ringGain);
    ringGain.connect(this.ctx.destination);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    thudOsc.start(now);
    ringOsc.start(now);
    noiseSource.start(now);

    thudOsc.stop(now + 0.17);
    ringOsc.stop(now + 0.15);
    noiseSource.stop(now + 0.11);
  }

  startBeeBuzz() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx || this.beeBuzzSource || this.beeBuzzGain) return;

    if (!this.beeBuzzBuffer) {
      this.loadBeeBuzzAudio(() => {
        this.startBeeBuzz();
      });
      return;
    }

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    source.buffer = this.beeBuzzBuffer;
    source.loop = true;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.08);

    source.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(now);

    this.beeBuzzSource = source;
    this.beeBuzzGain = gain;
  }

  stopBeeBuzz() {
    if (!this.ctx) {
      this.beeBuzzSource = null;
      this.beeBuzzGain = null;
      return;
    }

    const now = this.ctx.currentTime;
    const source = this.beeBuzzSource;
    const gain = this.beeBuzzGain;

    this.beeBuzzSource = null;
    this.beeBuzzGain = null;

    if (gain) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.001, gain.gain.value), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    }

    if (source) {
      source.stop(now + 0.07);
    }
  }

  startRaccogliBirdsAmbience() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx || this.raccogliBirdsAmbienceSource || this.raccogliBirdsAmbienceGain) return;

    if (!this.raccogliBirdsAmbienceBuffer) {
      this.loadRaccogliBirdsAmbienceAudio(() => {
        this.startRaccogliBirdsAmbience();
      });
      return;
    }

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    source.buffer = this.raccogliBirdsAmbienceBuffer;
    source.loop = true;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.14);

    source.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(now);

    this.raccogliBirdsAmbienceSource = source;
    this.raccogliBirdsAmbienceGain = gain;
  }

  stopRaccogliBirdsAmbience() {
    if (!this.ctx) {
      this.raccogliBirdsAmbienceSource = null;
      this.raccogliBirdsAmbienceGain = null;
      return;
    }

    const now = this.ctx.currentTime;
    const source = this.raccogliBirdsAmbienceSource;
    const gain = this.raccogliBirdsAmbienceGain;

    this.raccogliBirdsAmbienceSource = null;
    this.raccogliBirdsAmbienceGain = null;

    if (gain) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.001, gain.gain.value), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    }

    if (source) {
      source.stop(now + 0.09);
    }
  }

  startCostruiscoAmbience() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx || this.costruiscoAmbienceSource || this.costruiscoAmbienceGain) return;

    if (!this.costruiscoAmbienceBuffer) {
      this.loadCostruiscoAmbienceAudio(() => {
        this.startCostruiscoAmbience();
      });
      return;
    }

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    source.buffer = this.costruiscoAmbienceBuffer;
    source.loop = true;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.14);

    source.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(now);

    this.costruiscoAmbienceSource = source;
    this.costruiscoAmbienceGain = gain;
  }

  stopCostruiscoAmbience() {
    if (!this.ctx) {
      this.costruiscoAmbienceSource = null;
      this.costruiscoAmbienceGain = null;
      return;
    }

    const now = this.ctx.currentTime;
    const source = this.costruiscoAmbienceSource;
    const gain = this.costruiscoAmbienceGain;

    this.costruiscoAmbienceSource = null;
    this.costruiscoAmbienceGain = null;

    if (gain) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.001, gain.gain.value), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    }

    if (source) {
      source.stop(now + 0.09);
    }
  }

  startTrucchiAmbience() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx || this.trucchiAmbienceSource || this.trucchiAmbienceGain) return;

    if (!this.trucchiAmbienceBuffer) {
      this.loadTrucchiAmbienceAudio(() => {
        this.startTrucchiAmbience();
      });
      return;
    }

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    source.buffer = this.trucchiAmbienceBuffer;
    source.loop = true;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.14);

    source.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(now);

    this.trucchiAmbienceSource = source;
    this.trucchiAmbienceGain = gain;
  }

  stopTrucchiAmbience() {
    if (!this.ctx) {
      this.trucchiAmbienceSource = null;
      this.trucchiAmbienceGain = null;
      return;
    }

    const now = this.ctx.currentTime;
    const source = this.trucchiAmbienceSource;
    const gain = this.trucchiAmbienceGain;

    this.trucchiAmbienceSource = null;
    this.trucchiAmbienceGain = null;

    if (gain) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.001, gain.gain.value), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    }

    if (source) {
      source.stop(now + 0.09);
    }
  }

  startSaltoAmbience() {
    if (!this.effectsEnabled) return;
    this.initContext();
    if (!this.ctx || this.saltoAmbienceSource || this.saltoAmbienceGain) return;

    if (!this.saltoAmbienceBuffer) {
      this.loadSaltoAmbienceAudio(() => {
        this.startSaltoAmbience();
      });
      return;
    }

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();

    source.buffer = this.saltoAmbienceBuffer;
    source.loop = true;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.2);

    source.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(now);

    this.saltoAmbienceSource = source;
    this.saltoAmbienceGain = gain;
  }

  stopSaltoAmbience() {
    if (!this.ctx) {
      this.saltoAmbienceSource = null;
      this.saltoAmbienceGain = null;
      return;
    }

    const now = this.ctx.currentTime;
    const source = this.saltoAmbienceSource;
    const gain = this.saltoAmbienceGain;

    this.saltoAmbienceSource = null;
    this.saltoAmbienceGain = null;

    if (gain) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.001, gain.gain.value), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    }

    if (source) {
      source.stop(now + 0.09);
    }
  }

  private loadSaltoAmbienceAudio(onLoaded?: () => void) {
    if (this.saltoAmbienceBuffer) {
      onLoaded?.();
      return;
    }
    if (this.loadingSaltoAmbienceAudio) return;

    this.loadingSaltoAmbienceAudio = true;
    fetch(saltoAmbienceAudioUrl)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => {
        this.initContext();
        if (!this.ctx) throw new Error('AudioContext not available');
        return this.ctx.decodeAudioData(arrayBuffer);
      })
      .then((decodedBuffer) => {
        this.saltoAmbienceBuffer = decodedBuffer;
        onLoaded?.();
      })
      .catch((error) => {
        console.error('Error loading Salto ambience audio:', error);
      })
      .finally(() => {
        this.loadingSaltoAmbienceAudio = false;
      });
  }

  private loadCostruiscoAmbienceAudio(onLoaded?: () => void) {
    if (this.costruiscoAmbienceBuffer) {
      onLoaded?.();
      return;
    }
    if (this.loadingCostruiscoAmbienceAudio) return;

    this.loadingCostruiscoAmbienceAudio = true;
    fetch(costruiscoLaughingAmbienceAudioUrl)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => {
        this.initContext();
        if (!this.ctx) throw new Error('AudioContext not available');
        return this.ctx.decodeAudioData(arrayBuffer);
      })
      .then((decodedBuffer) => {
        this.costruiscoAmbienceBuffer = decodedBuffer;
        onLoaded?.();
      })
      .catch((error) => {
        console.error('Error loading Costruisco ambience audio:', error);
      })
      .finally(() => {
        this.loadingCostruiscoAmbienceAudio = false;
      });
  }

  private loadTrucchiAmbienceAudio(onLoaded?: () => void) {
    if (this.trucchiAmbienceBuffer) {
      onLoaded?.();
      return;
    }
    if (this.loadingTrucchiAmbienceAudio) return;

    this.loadingTrucchiAmbienceAudio = true;
    fetch(trovaPneumaticpickhammerAmbienceAudioUrl)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => {
        this.initContext();
        if (!this.ctx) throw new Error('AudioContext not available');
        return this.ctx.decodeAudioData(arrayBuffer);
      })
      .then((decodedBuffer) => {
        this.trucchiAmbienceBuffer = decodedBuffer;
        onLoaded?.();
      })
      .catch((error) => {
        console.error('Error loading Trova ambience audio:', error);
      })
      .finally(() => {
        this.loadingTrucchiAmbienceAudio = false;
      });
  }

  private loadRaccogliBirdsAmbienceAudio(onLoaded?: () => void) {
    if (this.raccogliBirdsAmbienceBuffer) {
      onLoaded?.();
      return;
    }
    if (this.loadingRaccogliBirdsAmbienceAudio) return;

    this.loadingRaccogliBirdsAmbienceAudio = true;
    fetch(raccogliBirdsAmbienceAudioUrl)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => {
        this.initContext();
        if (!this.ctx) throw new Error('AudioContext not available');
        return this.ctx.decodeAudioData(arrayBuffer);
      })
      .then((decodedBuffer) => {
        this.raccogliBirdsAmbienceBuffer = decodedBuffer;
        onLoaded?.();
      })
      .catch((error) => {
        console.error('Error loading Raccogli birds ambience audio:', error);
      })
      .finally(() => {
        this.loadingRaccogliBirdsAmbienceAudio = false;
      });
  }

  private loadBeeBuzzAudio(onLoaded?: () => void) {
    if (this.beeBuzzBuffer) {
      onLoaded?.();
      return;
    }
    if (this.loadingBeeBuzzAudio) return;

    this.loadingBeeBuzzAudio = true;
    fetch(beeBuzzAudioUrl)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => {
        this.initContext();
        if (!this.ctx) throw new Error('AudioContext not available');
        return this.ctx.decodeAudioData(arrayBuffer);
      })
      .then((decodedBuffer) => {
        this.beeBuzzBuffer = decodedBuffer;
        onLoaded?.();
      })
      .catch((error) => {
        console.error('Error loading bee buzz audio:', error);
      })
      .finally(() => {
        this.loadingBeeBuzzAudio = false;
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
