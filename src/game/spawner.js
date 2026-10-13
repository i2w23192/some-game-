// The Director decides what spawns, where and how strong it is, following the
// map's wave table, scheduled events, elites and bosses. Endless mode keeps
// cycling bosses and adds exponential scaling past the 25 minute mark.

import { ENEMIES, BOSSES } from '../data/enemies.js';
import { RUN_LENGTH } from '../data/maps.js';
import { weighted } from '../core/math.js';
import { atlas } from '../gfx/atlas.js';

const TAU = Math.PI * 2;
const ENDLESS_BOSSES = ['frostcolossus', 'voidwitch', 'lord', 'emberlord'];

export class Director {
  constructor(run) {
    this.run = run;
    this.map = run.map;
    this.acc = 0;
    this.eventIdx = 0;
    this.bossIdx = 0;
    this.eliteT = this.map.eliteEvery + 60;
    this.brazierT = 15;
    this.nextEndlessBoss = RUN_LENGTH + 300;
    this.endlessBossN = 0;
    this.frames = new Map();
  }

  frame(name) {
    let f = this.frames.get(name);
    if (!f) { f = atlas.get(name); this.frames.set(name, f); }
    return f;
  }

  get minutes() { return this.run.time / 60; }

  hpScale() {
    const m = this.minutes, run = this.run;
    let s = (1 + 0.1 * m + 0.0045 * m * m) * this.map.hp * run.nf.hp;
    if (m > 25) s *= Math.pow(run.endless ? 1.12 : 1.05, m - 25);
    return s;
  }

  dmgScale() {
    const m = this.minutes, run = this.run;
    let s = (1 + 0.075 * m) * run.nf.dmg;
    if (m > 25) s *= Math.pow(1.05, m - 25);
    return s;
  }

  pool() {
    const waves = this.map.waves, m = this.minutes;
    let w = waves[0];
    for (const wv of waves) if (wv.at <= m) w = wv;
    return w.pool;
  }

  target() {
    const m = this.minutes;
    return Math.min(this.run.cap, Math.round((22 + 16 * Math.min(m, 25) + (m > 25 ? 4 * (m - 25) : 0)) * this.run.nf.density));
  }

  // Random point on a ring just outside the visible area, biased toward the
  // direction the player is moving so new enemies appear ahead of them.
  spawnPos(extra = 0) {
    const run = this.run, pl = run.player;
    const r = Math.hypot(run.view.w, run.view.h) / 2 + 14 + extra;
    let a;
    if ((pl.vx || pl.vy) && Math.random() < 0.55) a = Math.atan2(pl.vy, pl.vx) + (Math.random() - 0.5) * 2.2;
    else a = Math.random() * TAU;
    return [pl.x + Math.cos(a) * r, pl.y + Math.sin(a) * r];
  }

  spawn(id, x, y, opts = {}) {
    const def = ENEMIES[id];
    const run = this.run;
    const e = run.enemies.create();
    const hp = def.hp * this.hpScale() * (opts.hpMul || 1);
    e.def = def; e.id = id;
    e.x = x; e.y = y;
    e.hp = e.maxHp = hp;
    e.speed = def.speed * this.map.speed * run.nf.speed * (1 + 0.012 * Math.min(this.minutes, 30)) * (opts.speedMul || 1) * (0.92 + Math.random() * 0.16);
    e.dmg = def.dmg * this.dmgScale();
    e.r = def.r * (opts.scale || 1);
    e.xp = def.xp * (opts.xpMul || 1);
    e.kbRes = def.kb;
    e.scale = opts.scale || 1;
    if (Array.isArray(def.sprite)) { e.f1 = this.frame(def.sprite[0]); e.f2 = this.frame(def.sprite[1]); }
    else { e.f1 = this.frame(def.sprite); e.f2 = null; }
    e.ranged = def.ranged || null;
    e.rangedT = def.ranged ? def.ranged.every * Math.random() : 0;
    return e;
  }

  spawnElite() {
    const [x, y] = this.spawnPos(10);
    const id = weighted(this.pool());
    const e = this.spawn(id, x, y, { hpMul: 14, scale: 2, xpMul: 10, speedMul: 0.95 });
    e.isElite = true;
    e.kbRes *= 0.25;
    return e;
  }

  spawnBoss(id) {
    const def = BOSSES[id], run = this.run;
    const [x, y] = this.spawnPos(10);
    const e = run.enemies.create();
    const extra = run.endless && this.endlessBossN ? Math.pow(1.35, this.endlessBossN) : 1;
    e.def = def; e.id = id;
    e.x = x; e.y = y;
    // Bosses scale more gently than the crowd so fights stay ~20-40 s.
    const m = this.minutes;
    const scale = (1 + 0.06 * m) * this.map.hp * run.nf.hp * (m > 25 ? Math.pow(1.08, m - 25) : 1);
    e.hp = e.maxHp = def.hp * scale * extra;
    e.speed = def.speed * run.nf.speed;
    e.dmg = def.dmg * this.dmgScale();
    e.r = def.r;
    e.xp = 0;
    e.kbRes = 0;
    e.scale = 2;
    e.f1 = this.frame(def.sprite); e.f2 = null;
    e.isBoss = true;
    e.ai = def.ai;
    e.t = 2;
    e.ranged = null;
    run.onBoss(e);
    return e;
  }

  spawnBrazier() {
    const run = this.run, pl = run.player;
    const a = Math.random() * TAU, d = 110 + Math.random() * 120;
    const e = run.enemies.create();
    e.def = null; e.id = 'brazier';
    e.x = pl.x + Math.cos(a) * d; e.y = pl.y + Math.sin(a) * d;
    e.hp = e.maxHp = 1;
    e.speed = 0; e.dmg = 0; e.r = 5; e.xp = 0; e.kbRes = 0;
    e.f1 = this.frame('brazier'); e.f2 = null;
    e.isStatic = true;
    e.ranged = null;
    run.braziers++;
  }

  runEvent(ev) {
    const run = this.run, pl = run.player;
    const room = Math.max(0, run.cap + 80 - run.enemies.list.length);
    const count = Math.min(ev.count, room);
    if (ev.type === 'ring') {
      const R = Math.max(run.view.w, run.view.h) * 0.42 + 30;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU;
        this.spawn(ev.enemy, pl.x + Math.cos(a) * R, pl.y + Math.sin(a) * R, { speedMul: 0.8 });
      }
      run.toast('THEY CLOSE IN');
    } else if (ev.type === 'swarm') {
      const a = Math.random() * TAU;
      const dx = Math.cos(a), dy = Math.sin(a);
      const R = Math.hypot(run.view.w, run.view.h) / 2 + 20;
      for (let i = 0; i < count; i++) {
        const off = (Math.random() - 0.5) * 140, back = Math.random() * 90;
        const e = this.spawn(ev.enemy, pl.x - dx * (R + back) - dy * off, pl.y - dy * (R + back) + dx * off, { speedMul: 1.7 });
        e.ai = 'swarm'; e.tx = dx; e.ty = dy; e.t = 9;
      }
      run.toast('A SWARM APPROACHES');
    }
  }

  update(dt) {
    const run = this.run, t = run.time, m = t / 60;
    const list = run.enemies.list;

    // Scheduled bosses
    const bosses = this.map.bosses;
    while (this.bossIdx < bosses.length && m >= bosses[this.bossIdx].at) {
      this.spawnBoss(bosses[this.bossIdx++].id);
    }
    if (run.endless && t >= this.nextEndlessBoss) {
      this.nextEndlessBoss += 300;
      this.endlessBossN++;
      this.spawnBoss(ENDLESS_BOSSES[this.endlessBossN % ENDLESS_BOSSES.length]);
    }

    // Events
    const evs = this.map.events;
    while (this.eventIdx < evs.length && m >= evs[this.eventIdx].at) this.runEvent(evs[this.eventIdx++]);
    if (run.endless && m > 25 && Math.floor(m * 2) !== this.lastEndlessEvent && Math.floor(m * 2) % 5 === 0) {
      this.lastEndlessEvent = Math.floor(m * 2);
      const pool = this.pool();
      this.runEvent({ type: Math.random() < 0.5 ? 'ring' : 'swarm', enemy: pool[(Math.random() * pool.length) | 0][0], count: 60 });
    }

    // Elites
    this.eliteT -= dt;
    if (this.eliteT <= 0) {
      this.eliteT = this.map.eliteEvery * (m > 15 ? 0.75 : 1);
      this.spawnElite();
    }

    // Braziers with loot
    this.brazierT -= dt;
    if (this.brazierT <= 0) {
      this.brazierT = 22;
      if (run.braziers < 3) this.spawnBrazier();
    }

    // Regular stream
    const target = this.target() * (run.bossAlive ? 0.75 : 1);
    const alive = list.length;
    if (alive < target) {
      this.acc += dt * (3 + m * 1.2 + (target - alive) * 0.6);
      const pool = this.pool();
      let n = Math.floor(this.acc);
      this.acc -= n;
      n = Math.min(n, target - alive, 12);
      for (let i = 0; i < n; i++) {
        const [x, y] = this.spawnPos();
        this.spawn(weighted(pool), x, y);
      }
    } else this.acc = 0;
  }
}
