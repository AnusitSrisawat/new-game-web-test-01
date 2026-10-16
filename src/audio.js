// Web Audio API procedural sound engine. Every effect is a synth recipe from sounds.js (editable in Studio).
import { SOUNDS } from './data.js';

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.sfxVolume = this.loadVol('vol_sfx');
    this.musicVolume = this.loadVol('vol_music'); // reserved for BGM (no music track yet)
  }

  loadVol(key) {
    try {
      const v = parseFloat(localStorage.getItem(key));
      if (Number.isFinite(v)) return Math.max(0, Math.min(1, v));
    } catch (e) { /* ignore */ }
    return 1;
  }

  applyGain() {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.25 * this.sfxVolume, this.ctx.currentTime);
    }
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    try { localStorage.setItem('vol_sfx', String(this.sfxVolume)); } catch (e) { /* ignore */ }
    this.applyGain();
  }

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    try { localStorage.setItem('vol_music', String(this.musicVolume)); } catch (e) { /* ignore */ }
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.25 * this.sfxVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    this.applyGain();
    return this.muted;
  }

  // Play a named effect (ids in sounds.js), using the current recipe (defaults + Studio edits)
  play(id) {
    if (this.muted) return;
    const p = SOUNDS[id];
    if (p) this.playParams(p);
  }

  // Play a recipe directly (Studio uses this to preview unsaved edits)
  playParams(p) {
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dur = Math.max(0.03, Number(p.dur) || 0.2);
    const peak = Math.max(0, Math.min(1, (Number(p.vol) || 0) / 100));
    const toneAmt = Math.max(0, Math.min(1, (Number(p.tone) || 0) / 100));
    const noiseAmt = Math.max(0, Math.min(1, (Number(p.noise) || 0) / 100));
    const wobble = 1 + (Math.random() * 2 - 1) * (Number(p.pitchVar) || 0) / 100;
    const fl = (v) => Math.max(20, Number(v) || 20);

    if (toneAmt > 0) {
      const ratios = p.arp === 'chord' ? [1, 1.25, 1.5, 2] : p.arp === 'minor' ? [1, 1.2, 1.5, 2] : [1];
      const step = ratios.length > 1 ? Math.min(0.09, dur / 4) : 0;
      ratios.forEach((r, i) => {
        const t0 = t + i * step;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = ['sine', 'square', 'sawtooth', 'triangle'].includes(p.wave) ? p.wave : 'sine';
        osc.frequency.setValueAtTime(fl(p.freq) * r * wobble, t0);
        // a chord keeps each note steady; a single note glides from freq to freqEnd
        if (ratios.length === 1) osc.frequency.exponentialRampToValueAtTime(fl(p.freqEnd) * wobble, t0 + dur);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(Math.max(0.0002, peak * toneAmt / Math.sqrt(ratios.length)), t0 + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
      });
    }

    if (noiseAmt > 0) {
      const size = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (size * 0.35));
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(3, t);
      filter.frequency.setValueAtTime(fl(p.noiseFreq) * wobble, t);
      filter.frequency.exponentialRampToValueAtTime(fl(p.noiseFreqEnd) * wobble, t + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.0002, peak * noiseAmt), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start(t);
    }
  }

  // Named helpers kept for the existing call sites
  playSlash() { this.play('slash'); }
  playPowerStrike() { this.play('powerStrike'); }
  playWhirlwind() { this.play('whirlwind'); }
  playIronGuard() { this.play('ironGuard'); }
  playBerserk() { this.play('berserk'); }
  playPotion() { this.play('potion'); }
  playDash() { this.play('dash'); }
  playWarCry() { this.play('warCry'); }
  playFirstAid() { this.play('firstAid'); }
  playHolyCross() { this.play('firstAid'); }
  playTownPortal() { this.play('townPortal'); }
  playCritHit() { this.play('critHit'); }
  playLevelUp() { this.play('levelUp'); }
  playBowShoot() { this.play('bowShoot'); }
  playArrowHit() { this.play('arrowHit'); }
  playFalconCry() { this.play('falconCry'); }
  playDragonRoar() { this.play('dragonRoar'); }
}

export const soundEngine = new SoundEngine();
