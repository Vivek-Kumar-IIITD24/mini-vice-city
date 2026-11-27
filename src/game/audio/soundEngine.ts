import { GameSettings } from '../types';

/**
 * 100% procedural Web Audio API sound engine.
 * Synthesizes engine RPM, braking screech, footsteps, coastal/city ambience,
 * rain noise, police sirens, UI interaction clicks, checkpoint chimes,
 * mission complete fanfare, and an original mellow sunset synthwave pulse.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Continuous engine synth
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Continuous rain + city ambience noise
  private rainGain: GainNode | null = null;
  private cityGain: GainNode | null = null;

  // Continuous police siren
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenPhase = 0;

  // Ambient sunset synth pad timer
  private musicStep = 0;
  private musicAccum = 0;
  private initialized = false;
  private suspended = false;
  private settings: GameSettings;

  constructor(settings: GameSettings) {
    this.settings = { ...settings };
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (this.initialized && this.ctx && this.ctx.state === 'running' && !this.suspended) {
      return;
    }
    if (!this.initialized) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      try {
        this.ctx = new AudioCtx();
        this.setupGraph();
        this.initialized = true;
      } catch {
        return;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.suspended = false;
    this.applyVolumes();
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = { ...settings };
    this.applyVolumes();
  }

  public setPaused(paused: boolean): void {
    this.suspended = paused;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const target = paused || this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(target, now, 0.05);
  }

  private setupGraph(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.connect(ctx.destination);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = this.settings.effectsVolume;
    this.sfxGain.connect(this.masterGain);

    this.ambienceGain = ctx.createGain();
    this.ambienceGain.gain.value = this.settings.ambienceVolume;
    this.ambienceGain.connect(this.masterGain);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.settings.musicVolume;
    this.musicGain.connect(this.masterGain);

    // 1. Engine oscillators
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 260;
    this.engineFilter.Q.value = 1.6;

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc1 = ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 58;

    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 116;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);
    this.engineOsc1.start();
    this.engineOsc2.start();

    // 2. Shared pink-ish noise buffer for rain + coastal city ambience
    const bufferLen = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.02) * 0.45;
    }

    // Coastal city wind/surf bed
    const citySrc = ctx.createBufferSource();
    citySrc.buffer = noiseBuf;
    citySrc.loop = true;
    const cityFilter = ctx.createBiquadFilter();
    cityFilter.type = 'lowpass';
    cityFilter.frequency.value = 420;
    this.cityGain = ctx.createGain();
    this.cityGain.gain.value = 0.14;
    citySrc.connect(cityFilter);
    cityFilter.connect(this.cityGain);
    this.cityGain.connect(this.ambienceGain);
    citySrc.start();

    // Rain bed
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = noiseBuf;
    rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1850;
    rainFilter.Q.value = 0.7;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rainSrc.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.ambienceGain);
    rainSrc.start();

    // 3. Police siren oscillator
    const sirenFilter = ctx.createBiquadFilter();
    sirenFilter.type = 'bandpass';
    sirenFilter.frequency.value = 950;
    sirenFilter.Q.value = 2.0;

    this.sirenGain = ctx.createGain();
    this.sirenGain.gain.value = 0;

    this.sirenOsc = ctx.createOscillator();
    this.sirenOsc.type = 'sawtooth';
    this.sirenOsc.frequency.value = 660;
    this.sirenOsc.connect(sirenFilter);
    sirenFilter.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxGain);
    this.sirenOsc.start();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.ambienceGain || !this.musicGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const master = this.settings.muted || this.suspended ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(master, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(this.settings.effectsVolume, now, 0.04);
    this.ambienceGain.gain.setTargetAtTime(this.settings.ambienceVolume, now, 0.04);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume, now, 0.04);
  }

  public updateContinuous(params: {
    dt: number;
    inVehicle: boolean;
    speedRatio: number; // 0..1
    throttle: boolean;
    braking: boolean;
    rainAmount: number; // 0..1
    sirenProximity: number; // 0..1
    playing: boolean;
  }): void {
    if (!this.initialized || !this.ctx || this.suspended) return;
    const now = this.ctx.currentTime;

    // Engine update
    if (this.engineOsc1 && this.engineOsc2 && this.engineFilter && this.engineGain) {
      if (params.inVehicle && params.playing) {
        const rpmBase = 52 + params.speedRatio * 145 + (params.throttle ? 18 : 0);
        this.engineOsc1.frequency.setTargetAtTime(rpmBase, now, 0.05);
        this.engineOsc2.frequency.setTargetAtTime(rpmBase * 1.99, now, 0.05);
        this.engineFilter.frequency.setTargetAtTime(
          220 + params.speedRatio * 780 + (params.throttle ? 180 : 0),
          now,
          0.06,
        );
        const vol = 0.075 + params.speedRatio * 0.075 + (params.throttle ? 0.025 : 0);
        this.engineGain.gain.setTargetAtTime(vol, now, 0.06);
      } else {
        this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      }
    }

    // Rain ambience
    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(params.rainAmount * 0.28, now, 0.25);
    }

    // Police siren two-tone yelp
    if (this.sirenOsc && this.sirenGain) {
      if (params.sirenProximity > 0.02 && params.playing) {
        this.sirenPhase += params.dt * 3.8;
        const freq = 670 + Math.sin(this.sirenPhase) * 230;
        this.sirenOsc.frequency.setTargetAtTime(freq, now, 0.03);
        this.sirenGain.gain.setTargetAtTime(params.sirenProximity * 0.095, now, 0.06);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, now, 0.08);
      }
    }

    // Gentle original coastal synthwave pulse while driving or exploring
    if (params.playing && this.settings.musicVolume > 0.02 && !this.settings.muted) {
      this.musicAccum += params.dt;
      const stepDuration = 0.34;
      if (this.musicAccum >= stepDuration) {
        this.musicAccum -= stepDuration;
        this.triggerMusicNote(this.musicStep++);
      }
    }
  }

  private triggerMusicNote(step: number): void {
    if (!this.ctx || !this.musicGain) return;
    // Original mellow coastal sunset arpeggio in D minor 9 / F major 7
    const bassNotes = [73.42, 73.42, 87.31, 65.41]; // D2, D2, F2, C2
    const arpNotes = [
      293.66, 349.23, 440.0, 523.25, 440.0, 349.23, 329.63, 440.0,
      261.63, 329.63, 392.0, 493.88, 392.0, 329.63, 293.66, 349.23,
    ];
    const now = this.ctx.currentTime;

    // Soft warm bass pulse on every 2nd step
    if (step % 2 === 0) {
      const bassIdx = Math.floor(step / 8) % bassNotes.length;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.value = bassNotes[bassIdx];
      filter.type = 'lowpass';
      filter.frequency.value = 240;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.085, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.34);
    }

    // Soft synth bell pluck
    const freq = arpNotes[step % arpNotes.length];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.042, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playFootstep(sprinting: boolean): void {
    if (!this.ctx || !this.sfxGain || this.suspended) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pitchJitter = 0.92 + Math.random() * 0.16;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime((sprinting ? 145 : 115) * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.06);
    gain.gain.setValueAtTime(sprinting ? 0.075 : 0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playJump(): void {
    if (!this.ctx || !this.sfxGain || this.suspended) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.11);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playDoorLatch(entering: boolean): void {
    if (!this.ctx || !this.sfxGain || this.suspended) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(entering ? 190 : 140, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.09);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playImpact(intensity: number): void {
    if (!this.ctx || !this.sfxGain || this.suspended) return;
    const clamped = Math.min(1, Math.max(0.15, intensity));
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120 * clamped + 55, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.18);
    gain.gain.setValueAtTime(0.22 * clamped, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playBrakeScreech(): void {
    if (!this.ctx || !this.sfxGain || this.suspended) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(920 + Math.random() * 90, now);
    osc.frequency.linearRampToValueAtTime(760, now + 0.14);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playUiClick(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.045);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playCheckpoint(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  public playMissionComplete(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const chord = [293.66, 369.99, 440.0, 587.33, 739.99];
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.58);
    });
  }

  public dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.initialized = false;
  }
}
