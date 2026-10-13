// Cheap pooled visual effects: square particles, floating damage numbers and
// short-lived shapes (lightning bolts, slashes, rings). Hard caps keep the
// cost bounded no matter how chaotic the fight gets.

const MAX_PARTICLES = 220;
const MAX_NUMBERS = 36;
const MAX_FX = 64;

export class Effects {
  constructor() {
    this.particles = [];
    this.numbers = [];
    this.fx = [];
    this.particleScale = 1; // set from quality setting
    this.showNumbers = true;
  }

  clear() {
    this.particles.length = 0;
    this.numbers.length = 0;
    this.fx.length = 0;
  }

  burst(x, y, color, count = 4, speed = 50) {
    count = Math.round(count * this.particleScale);
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, life: 0.25 + Math.random() * 0.25, color, size: Math.random() < 0.3 ? 2 : 1 });
    }
  }

  number(x, y, value, crit) {
    if (!this.showNumbers) return;
    if (this.numbers.length >= MAX_NUMBERS) this.numbers.shift();
    this.numbers.push({ x: x + (Math.random() * 6 - 3), y: y - 6, value: Math.round(value), life: 0.6, crit });
  }

  text(x, y, str, color) {
    if (this.numbers.length >= MAX_NUMBERS) this.numbers.shift();
    this.numbers.push({ x, y, value: str, life: 1.1, color });
  }

  // kind: 'zap' (x,y -> x2,y2), 'slash' (arc), 'ring' (expanding circle)
  add(f) {
    if (this.fx.length >= MAX_FX) this.fx.shift();
    f.t = 0;
    this.fx.push(f);
  }

  update(dt) {
    const p = this.particles;
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      q.life -= dt;
      if (q.life <= 0) { p[i] = p[p.length - 1]; p.pop(); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.vx *= 0.9; q.vy = q.vy * 0.9 + 60 * dt;
    }
    const n = this.numbers;
    for (let i = n.length - 1; i >= 0; i--) {
      const q = n[i];
      q.life -= dt;
      if (q.life <= 0) { n.splice(i, 1); continue; }
      q.y -= 18 * dt;
    }
    const f = this.fx;
    for (let i = f.length - 1; i >= 0; i--) {
      f[i].t += dt;
      if (f[i].t >= f[i].dur) f.splice(i, 1);
    }
  }
}
