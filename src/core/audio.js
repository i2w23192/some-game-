// Synthesised sound effects via WebAudio: no audio files to download.
// Each sound is rate-limited so hundreds of hits per second stay cheap.

class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.6;
    this.lastPlay = {};
    this.noiseBuf = null;
  }

  // Must be called from a user gesture (iOS requirement).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.3;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  _ok(name, minGap) {
    if (!this.ctx || this.volume <= 0 || this.ctx.state !== 'running') return false;
    const t = this.ctx.currentTime;
    if (this.lastPlay[name] && t - this.lastPlay[name] < minGap) return false;
    this.lastPlay[name] = t;
    return true;
  }

  _tone(type, f0, f1, dur, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, vol, freq = 1200, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = this.noiseBuf;
    f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur);
  }

  hit() { if (this._ok('hit', 0.045)) this._noise(0.05, 0.12, 2200); }
  kill() { if (this._ok('kill', 0.06)) this._tone('square', 260, 90, 0.07, 0.05); }
  gem(pitch = 0) {
    if (this._ok('gem', 0.035)) this._tone('sine', 880 + pitch * 40, 1320 + pitch * 40, 0.06, 0.06);
  }
  coin() { if (this._ok('coin', 0.05)) { this._tone('square', 1200, 1200, 0.05, 0.03); this._tone('square', 1600, 1600, 0.08, 0.03, 0.05); } }
  shoot() { if (this._ok('shoot', 0.08)) this._tone('triangle', 700, 300, 0.06, 0.03); }
  zap() { if (this._ok('zap', 0.08)) { this._noise(0.12, 0.12, 5000); this._tone('sawtooth', 900, 120, 0.1, 0.04); } }
  boom() { if (this._ok('boom', 0.1)) { this._noise(0.35, 0.3, 500); this._tone('sine', 120, 40, 0.3, 0.2); } }
  dash() { if (this._ok('dash', 0.1)) this._noise(0.15, 0.12, 3000); }
  hurt() { if (this._ok('hurt', 0.2)) this._tone('square', 220, 70, 0.15, 0.08); }
  levelUp() {
    if (!this._ok('lvl', 0.2)) return;
    [523, 659, 784, 1046].forEach((f, i) => this._tone('square', f, f, 0.12, 0.05, i * 0.07));
  }
  chest() {
    if (!this._ok('chest', 0.3)) return;
    [392, 494, 587, 784, 988].forEach((f, i) => this._tone('triangle', f, f, 0.18, 0.07, i * 0.09));
  }
  heal() { if (this._ok('heal', 0.2)) { this._tone('sine', 500, 900, 0.2, 0.08); } }
  roar() { if (this._ok('roar', 1)) { this._noise(0.8, 0.25, 300); this._tone('sawtooth', 90, 45, 0.8, 0.1); } }
  click() { if (this._ok('click', 0.04)) this._tone('square', 600, 600, 0.03, 0.03); }
  buy() { if (this._ok('buy', 0.1)) { this._tone('square', 660, 660, 0.06, 0.04); this._tone('square', 990, 990, 0.1, 0.04, 0.06); } }
  defeat() { if (this._ok('defeat', 1)) [392, 330, 262, 196].forEach((f, i) => this._tone('triangle', f, f * 0.98, 0.3, 0.08, i * 0.2)); }
  victory() { if (this._ok('victory', 1)) [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this._tone('square', f, f, 0.2, 0.05, i * 0.13)); }
}

export const sfx = new Sfx();
