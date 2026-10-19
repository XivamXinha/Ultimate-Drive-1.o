/**
 * Web Audio API procedural sound engine for Velocity Duel.
 * Zero external audio files, 100% reliable synthesized racing audio.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private isEngineRunning: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startEngine() {
    this.initContext();
    if (!this.ctx || this.isEngineRunning) return;

    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(70, this.ctx.currentTime);

      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.setValueAtTime(35, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      this.engineSubOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
      this.engineSubOsc.start();
      this.isEngineRunning = true;
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public updateEngineRpm(rpm: number, maxRpm: number = 8000, throttle: boolean = false) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc || !this.engineSubOsc || !this.engineGain) {
      return;
    }

    if (this.isMuted) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      return;
    }

    const normalizedRpm = Math.max(0, Math.min(1, (rpm - 1000) / (maxRpm - 1000)));
    // Frequency between 65Hz and 420Hz
    const targetFreq = 65 + normalizedRpm * 355;
    const now = this.ctx.currentTime;

    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.04);
    this.engineSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.04);

    const targetGain = throttle ? 0.12 : 0.06;
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      }
      if (this.engineSubOsc) {
        this.engineSubOsc.stop();
        this.engineSubOsc.disconnect();
      }
      if (this.engineGain) {
        this.engineGain.disconnect();
      }
    } catch {
      // Ignore cleanup error
    }
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineGain = null;
    this.isEngineRunning = false;
  }

  public playCountdownBeep(isGo: boolean = false) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isGo ? 'square' : 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, this.ctx.currentTime);

      const duration = isGo ? 0.45 : 0.22;
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Ignore
    }
  }

  public playShiftPop(isPerfect: boolean = false) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      // Mechanical snap + turbo blowoff sound
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isPerfect ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(isPerfect ? 520 : 340, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // Ignore
    }
  }

  public playNitroSound() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      // Noise buffer for nitro rush
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch {
      // Ignore
    }
  }

  public playTireScreech() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(950, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch {
      // Ignore
    }
  }

  public playVictoryFanfare() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.12);

        gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.12 + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + i * 0.12);
        osc.stop(this.ctx.currentTime + i * 0.12 + 0.5);
      });
    } catch {
      // Ignore
    }
  }
}

export const sound = new SoundEngine();
