/**
 * Sound Manager — manages all game audio
 * 
 * Categories:
 *  - menu: Background menu music
 *  - match_ambient: Stadium atmosphere during matches
 *  - match_events: Goal cheers, whistle, card sounds
 *  - ui: Button clicks, navigation sounds
 * 
 * All sounds are toggleable per category.
 * Uses Web Audio API for precise timing and HTMLAudioElement for background music.
 */

export type SoundCategory = 'menu' | 'match_ambient' | 'match_events' | 'ui';

export interface SoundSettings {
  masterVolume: number;     // 0-1
  menuEnabled: boolean;
  matchAmbientEnabled: boolean;
  matchEventsEnabled: boolean;
  uiEnabled: boolean;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  masterVolume: 0.5,
  menuEnabled: true,
  matchAmbientEnabled: true,
  matchEventsEnabled: true,
  uiEnabled: true,
};

// Sound effect definitions using Web Audio API (synthesized, no external files needed)
type SynthSoundType = 'whistle' | 'goal_cheer' | 'crowd_boo' | 'card' | 'substitution' | 'halftime' | 'fulltime' | 'click' | 'success' | 'error';

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private settings: SoundSettings = { ...DEFAULT_SOUND_SETTINGS };
  private ambientGain: GainNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;
  private isAmbientPlaying = false;

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      try {
        this.audioCtx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  updateSettings(settings: Partial<SoundSettings>) {
    this.settings = { ...this.settings, ...settings };
    if (this.ambientGain && this.audioCtx) {
      this.ambientGain.gain.setValueAtTime(
        this.settings.matchAmbientEnabled ? this.settings.masterVolume * 0.15 : 0,
        this.audioCtx.currentTime
      );
    }
  }

  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  // ── Synthesized Sounds ──

  private playTone(freq: number, duration: number, volume: number, type: OscillatorType = 'sine') {
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume * this.settings.masterVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private playNoiseBurst(duration: number, volume: number) {
    const ctx = this.getCtx();
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * this.settings.masterVolume, ctx.currentTime);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(0.5, ctx.currentTime);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  playSound(sound: SynthSoundType) {
    const cat = this.getCategoryForSound(sound);
    if (!this.isCategoryEnabled(cat)) return;

    switch (sound) {
      case 'whistle':
        // Short referee whistle
        this.playTone(2800, 0.3, 0.3, 'sine');
        setTimeout(() => this.playTone(3200, 0.15, 0.25, 'sine'), 100);
        break;

      case 'goal_cheer':
        // Crowd roar + horn
        this.playNoiseBurst(1.5, 0.4);
        this.playTone(440, 0.8, 0.2, 'sawtooth');
        setTimeout(() => this.playTone(554, 0.6, 0.15, 'sawtooth'), 200);
        setTimeout(() => this.playTone(659, 0.4, 0.1, 'sawtooth'), 400);
        break;

      case 'crowd_boo':
        // Low crowd groan
        this.playNoiseBurst(0.8, 0.2);
        this.playTone(150, 0.6, 0.15, 'sawtooth');
        break;

      case 'card':
        // Sharp whistle
        this.playTone(3500, 0.5, 0.35, 'sine');
        break;

      case 'substitution':
        // Electronic beep beep
        this.playTone(1000, 0.1, 0.2, 'square');
        setTimeout(() => this.playTone(1200, 0.1, 0.2, 'square'), 150);
        setTimeout(() => this.playTone(1400, 0.15, 0.2, 'square'), 300);
        break;

      case 'halftime':
        // Triple whistle
        this.playTone(2800, 0.2, 0.3, 'sine');
        setTimeout(() => this.playTone(2800, 0.2, 0.3, 'sine'), 300);
        setTimeout(() => this.playTone(2800, 0.4, 0.3, 'sine'), 600);
        break;

      case 'fulltime':
        // Long triple whistle
        this.playTone(2800, 0.3, 0.3, 'sine');
        setTimeout(() => this.playTone(2800, 0.3, 0.3, 'sine'), 400);
        setTimeout(() => this.playTone(2800, 0.6, 0.35, 'sine'), 800);
        break;

      case 'click':
        this.playTone(800, 0.05, 0.1, 'sine');
        break;

      case 'success':
        this.playTone(523, 0.15, 0.15, 'sine');
        setTimeout(() => this.playTone(659, 0.15, 0.15, 'sine'), 100);
        setTimeout(() => this.playTone(784, 0.2, 0.15, 'sine'), 200);
        break;

      case 'error':
        this.playTone(200, 0.2, 0.15, 'sawtooth');
        setTimeout(() => this.playTone(150, 0.3, 0.15, 'sawtooth'), 200);
        break;
    }
  }

  // ── Stadium Ambient ──

  private ambientNodes: AudioNode[] = [];

  startAmbient() {
    if (this.isAmbientPlaying) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    if (!this.settings.matchAmbientEnabled) return;

    // Create a longer noise buffer for less obvious looping
    const bufferLen = ctx.sampleRate * 6;
    const buffer = ctx.createBuffer(2, bufferLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < bufferLen; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.setValueAtTime(this.settings.masterVolume * 0.12, ctx.currentTime);
    this.ambientGain.connect(ctx.destination);

    // Layer 1: Mid-range crowd murmur (250-900 Hz) — the main "crowd talking" sound
    const src1 = ctx.createBufferSource();
    src1.buffer = buffer;
    src1.loop = true;
    const bp1 = ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.setValueAtTime(500, ctx.currentTime);
    bp1.Q.setValueAtTime(0.8, ctx.currentTime);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.7, ctx.currentTime);
    src1.connect(bp1);
    bp1.connect(g1);
    g1.connect(this.ambientGain);
    src1.start();

    // Layer 2: Low rumble (80-200 Hz) — bass presence of a large crowd
    const src2 = ctx.createBufferSource();
    src2.buffer = buffer;
    src2.loop = true;
    src2.loopStart = 0.5; // offset to decorrelate from layer 1
    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.frequency.setValueAtTime(120, ctx.currentTime);
    bp2.Q.setValueAtTime(0.6, ctx.currentTime);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.4, ctx.currentTime);
    src2.connect(bp2);
    bp2.connect(g2);
    g2.connect(this.ambientGain);
    src2.start();

    // Layer 3: Higher chatter shimmer (1200-3000 Hz) — distant voices/clapping, very subtle
    const src3 = ctx.createBufferSource();
    src3.buffer = buffer;
    src3.loop = true;
    src3.loopStart = 1.2;
    const bp3 = ctx.createBiquadFilter();
    bp3.type = 'bandpass';
    bp3.frequency.setValueAtTime(2000, ctx.currentTime);
    bp3.Q.setValueAtTime(1.2, ctx.currentTime);
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.15, ctx.currentTime);
    src3.connect(bp3);
    bp3.connect(g3);
    g3.connect(this.ambientGain);
    src3.start();

    // Slow volume modulation — crowd "breathing" (volume swells every ~4s)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.25, ctx.currentTime); // 0.25 Hz = one swell per 4s
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(this.settings.masterVolume * 0.03, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.ambientGain.gain);
    lfo.start();

    this.ambientNoiseSource = src1; // keep reference for stopping
    this.ambientNodes = [src1, src2, src3, bp1, bp2, bp3, g1, g2, g3, lfo, lfoGain];
    this.isAmbientPlaying = true;
  }

  stopAmbient() {
    if (!this.isAmbientPlaying) return;
    // Stop all source/oscillator nodes
    for (const node of this.ambientNodes) {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch { /* ignore */ }
    }
    this.ambientNodes = [];
    this.ambientNoiseSource = null;
    try { this.ambientGain?.disconnect(); } catch { /* ignore */ }
    this.ambientGain = null;
    this.isAmbientPlaying = false;
  }

  // Boost ambient volume briefly (for goals, crowd reactions)
  boostAmbient(duration: number = 2) {
    if (!this.ambientGain || !this.audioCtx) return;
    if (this.settings.masterVolume <= 0) return; // muted — skip
    const ctx = this.audioCtx;
    const boostVal = Math.max(0.0001, this.settings.masterVolume * 0.35);
    const baseVal = Math.max(0.0001, this.settings.masterVolume * 0.1);
    this.ambientGain.gain.setValueAtTime(boostVal, ctx.currentTime);
    this.ambientGain.gain.exponentialRampToValueAtTime(baseVal, ctx.currentTime + duration);
  }

  // ── Tension buildup sound (neutral — used for ALL splash events) ──
  playTensionBuild() {
    if (!this.settings.matchEventsEnabled) return;
    // Subtle rising tone + quiet crowd murmur — identical for goals and misses
    this.playTone(400, 0.6, 0.12, 'sine');
    setTimeout(() => this.playTone(500, 0.5, 0.1, 'sine'), 200);
    setTimeout(() => this.playTone(600, 0.4, 0.08, 'sine'), 400);
    this.playNoiseBurst(0.6, 0.08);
  }

  // ── Match Event Sound Mapping ──

  playMatchEvent(eventType: string, isMyTeam: boolean) {
    if (!this.settings.matchEventsEnabled) return;

    switch (eventType) {
      case 'kick_off':
        this.playSound('whistle');
        break;
      case 'goal':
      case 'penalty_scored':
      case 'free_kick_goal':
        this.playSound('whistle');
        setTimeout(() => {
          if (isMyTeam) {
            this.playSound('goal_cheer');
            this.boostAmbient(3);
          } else {
            this.playSound('crowd_boo');
          }
        }, 300);
        break;
      case 'penalty_missed':
      case 'penalty_saved':
        this.playSound(isMyTeam ? 'crowd_boo' : 'goal_cheer');
        break;
      case 'yellow_card':
      case 'red_card':
      case 'second_yellow':
        this.playSound('card');
        break;
      case 'substitution':
        this.playSound('substitution');
        break;
      case 'half_time':
        this.playSound('halftime');
        break;
      case 'full_time':
        this.playSound('fulltime');
        break;
    }
  }

  private getCategoryForSound(sound: SynthSoundType): SoundCategory {
    switch (sound) {
      case 'whistle':
      case 'goal_cheer':
      case 'crowd_boo':
      case 'card':
      case 'substitution':
      case 'halftime':
      case 'fulltime':
        return 'match_events';
      case 'click':
      case 'success':
      case 'error':
        return 'ui';
      default:
        return 'ui';
    }
  }

  private isCategoryEnabled(cat: SoundCategory): boolean {
    switch (cat) {
      case 'menu': return this.settings.menuEnabled;
      case 'match_ambient': return this.settings.matchAmbientEnabled;
      case 'match_events': return this.settings.matchEventsEnabled;
      case 'ui': return this.settings.uiEnabled;
    }
  }

  dispose() {
    this.stopAmbient();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

// Singleton instance
export const soundManager = new SoundManager();
