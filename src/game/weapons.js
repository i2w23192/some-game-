// Weapon behaviours, player projectiles, ground zones and enemy bullets.
// Everything is pooled; collision always goes through the enemy grid.

import { WEAPONS, weaponStats } from '../data/weapons.js';
import { atlas } from '../gfx/atlas.js';
import { sfx } from '../core/audio.js';

const TAU = Math.PI * 2;

export function makeWeapon(id, slot) {
  return { id, def: WEAPONS[id], level: 1, slot, timer: 0.4, active: 0, angle: 0, side: 1, fs: null };
}

// Final numbers for one weapon given the player's run stats.
export function computeWeapon(w, s) {
  const b = weaponStats(w.id, w.level);
  const kind = w.def.kind;
  w.fs = {
    damage: b.damage * s.might,
    cooldown: Math.max(0.05, b.cooldown * (kind === 'aura' ? 0.5 + 0.5 * s.cooldown : s.cooldown)),
    amount: kind === 'aura' ? 0 : Math.max(1, b.amount + s.amount),
    area: b.area * s.area,
    speed: b.speed * s.projSpeed,
    pierce: b.pierce,
    duration: b.duration * s.duration,
    homing: b.homing || 0,
    backstab: b.backstab || 0,
    slow: b.slow || 0,
    drain: b.drain || 0,
    chain: b.chain || 0,
    full: b.full || 0,
    pull: b.pull || 0,
  };
}

export class Combat {
  constructor(run) {
    this.run = run;
    this.shots = [];
    this.shotFree = [];
    this.zones = [];
    this.bullets = []; // enemy projectiles
    this.spr = {};
    for (const n of ['bolt', 'torrent', 'dagger', 'edge', 'axe', 'redaxe', 'flask', 'orb', 'fireorb', 'flame', 'blueflame', 'blade', 'halo'])
      this.spr[n] = atlas.get(n);
  }

  clear() {
    this.shots.length = 0;
    this.zones.length = 0;
    this.bullets.length = 0;
  }

  shot() {
    const p = this.shotFree.pop() || { hits: [] };
    p.hits.length = 0;
    p.gravity = 0; p.homing = 0; p.curve = 0; p.spin = 0; p.rot = 0;
    p.retarget = 0; p.zone = null; p.scale = 1; p.kb = 1.2; p.only = null;
    this.shots.push(p);
    return p;
  }

  // ---------------------------------------------------------------- firing
  updateWeapon(w, dt) {
    const fs = w.fs, kind = w.def.kind;
    if (kind === 'orbit') return this.updateOrbit(w, dt);
    if (kind === 'aura') return this.updateAura(w, dt);
    w.timer -= dt;
    if (w.timer > 0) return;
    let fired = true;
    switch (kind) {
      case 'bolt': fired = this.fireBolt(w, fs); break;
      case 'knife': this.fireKnife(w, fs); break;
      case 'axe': this.fireAxe(w, fs); break;
      case 'spiral': this.fireSpiral(w, fs); break;
      case 'lightning': fired = this.fireLightning(w, fs); break;
      case 'meteor': fired = this.fireMeteor(w, fs); break;
      case 'firebomb': this.fireBomb(w, fs); break;
      case 'scythe': this.fireScythe(w, fs); break;
    }
    w.timer = fired ? fs.cooldown : 0.15;
    if (fired && kind !== 'lightning' && kind !== 'scythe') sfx.shoot();
  }

  fireBolt(w, fs) {
    const pl = this.run.player, en = this.run.enemies;
    const used = new Set();
    let any = false;
    // The first bolt of each volley goes for a nearby boss or elite.
    const vip = this.run.priorityTarget(200);
    for (let i = 0; i < fs.amount; i++) {
      let t = i === 0 && vip ? vip : en.nearest(pl.x, pl.y, 260, used);
      if (!t) t = en.nearest(pl.x, pl.y, 260);
      if (!t) break;
      used.add(t.uid);
      const a = Math.atan2(t.y - pl.y, t.x - pl.x) + (i ? (Math.random() - 0.5) * 0.15 : 0);
      const p = this.shot();
      p.x = pl.x; p.y = pl.y - 2;
      p.vx = Math.cos(a) * fs.speed; p.vy = Math.sin(a) * fs.speed;
      p.dmg = fs.damage; p.pierce = fs.pierce; p.life = fs.duration;
      p.r = 3 * fs.area; p.slot = w.slot; p.sprite = w.def.evolved ? this.spr.torrent : this.spr.bolt;
      p.homing = fs.homing; p.kb = 1;
      // A boss-seeking bolt flies through the crowd and only hits its target.
      if (t === vip && (vip.isBoss || vip.isElite)) { p.only = vip; p.life = 3; p.homing = 1; }
      any = true;
    }
    return any;
  }

  fireKnife(w, fs) {
    const pl = this.run.player;
    const dirs = fs.backstab ? [1, -1] : [1];
    for (const d of dirs) {
      const base = Math.atan2(pl.faceY, pl.faceX) + (d < 0 ? Math.PI : 0);
      for (let i = 0; i < fs.amount; i++) {
        const off = (i - (fs.amount - 1) / 2);
        const a = base + off * 0.09 + (Math.random() - 0.5) * 0.05;
        const p = this.shot();
        p.x = pl.x - Math.sin(base) * off * 3; p.y = pl.y - 2 + Math.cos(base) * off * 3;
        p.vx = Math.cos(a) * fs.speed; p.vy = Math.sin(a) * fs.speed;
        p.dmg = fs.damage; p.pierce = fs.pierce; p.life = fs.duration;
        p.r = 3 * fs.area; p.slot = w.slot; p.sprite = w.def.evolved ? this.spr.edge : this.spr.dagger;
        p.rot = a; p.kb = 0.8;
      }
    }
  }

  fireAxe(w, fs) {
    const pl = this.run.player;
    for (let i = 0; i < fs.amount; i++) {
      const p = this.shot();
      const side = (i % 2 ? -1 : 1) * (pl.faceX >= 0 ? 1 : -1);
      p.x = pl.x; p.y = pl.y - 4;
      p.vx = side * (25 + Math.random() * 45 + i * 12);
      p.vy = -210 - Math.random() * 40;
      p.gravity = 420;
      p.dmg = fs.damage; p.pierce = 999; p.life = fs.duration;
      p.r = 6 * fs.area; p.slot = w.slot; p.sprite = this.spr.axe;
      p.spin = 9 * side; p.scale = fs.area >= 1.5 ? 2 : 1; p.kb = 2;
    }
  }

  fireSpiral(w, fs) {
    const pl = this.run.player;
    w.angle += 0.4;
    for (let i = 0; i < fs.amount; i++) {
      const a = w.angle + (i / fs.amount) * TAU;
      const p = this.shot();
      p.x = pl.x; p.y = pl.y;
      p.vx = Math.cos(a) * fs.speed; p.vy = Math.sin(a) * fs.speed;
      p.curve = 1.6;
      p.dmg = fs.damage; p.pierce = 999; p.life = fs.duration;
      p.r = 8 * fs.area; p.slot = w.slot; p.sprite = this.spr.redaxe;
      p.spin = 10; p.scale = 2; p.kb = 2;
    }
  }

  fireLightning(w, fs) {
    const run = this.run, list = run.enemies.list, pl = run.player;
    if (!list.length) return false;
    const hw = run.view.w / 2 + 10, hh = run.view.h / 2 + 10;
    let hits = 0;
    for (let i = 0; i < fs.amount; i++) {
      let t = i === 0 ? run.priorityTarget(Math.min(hw, hh)) : null;
      for (let tries = 0; tries < 8 && !t; tries++) {
        const e = list[(Math.random() * list.length) | 0];
        if (!e.dead && Math.abs(e.x - pl.x) < hw && Math.abs(e.y - pl.y) < hh) { t = e; break; }
      }
      if (!t) continue;
      hits++;
      const x = t.x, y = t.y;
      run.fx.add({ kind: 'zap', x, y: y - 90, x2: x, y2: y, dur: 0.18, color: '#f5d351' });
      this.blast(x, y, 12 * fs.area, fs.damage, w.slot, 0.6);
      if (fs.chain) {
        let from = t;
        const seen = new Set([t.uid]);
        for (let c = 0; c < fs.chain; c++) {
          const n = run.enemies.nearest(from.x, from.y, 70, seen);
          if (!n) break;
          seen.add(n.uid);
          run.fx.add({ kind: 'zap', x: from.x, y: from.y, x2: n.x, y2: n.y, dur: 0.15, color: '#7ff0e6' });
          run.damage(n, fs.damage * 0.7, w.slot, 0, 0, 0);
          from = n;
        }
      }
    }
    if (hits) sfx.zap();
    return hits > 0;
  }

  // Starfall: meteors slam into enemies on screen (bosses first).
  fireMeteor(w, fs) {
    const run = this.run, list = run.enemies.list, pl = run.player;
    const hw = run.view.w / 2, hh = run.view.h / 2;
    let hits = 0;
    for (let i = 0; i < fs.amount; i++) {
      let t = i === 0 ? run.priorityTarget(Math.min(hw, hh)) : null;
      for (let tries = 0; tries < 8 && !t; tries++) {
        const e = list.length ? list[(Math.random() * list.length) | 0] : null;
        if (e && !e.dead && !e.isStatic && Math.abs(e.x - pl.x) < hw && Math.abs(e.y - pl.y) < hh) t = e;
      }
      if (!t) continue;
      hits++;
      const R = 30 * fs.area;
      run.fx.add({ kind: 'zap', x: t.x + 40, y: t.y - 120, x2: t.x, y2: t.y, dur: 0.2, color: '#ec8a2e' });
      run.fx.add({ kind: 'ring', x: t.x, y: t.y, r: R, dur: 0.3, color: '#f5d351' });
      run.fx.burst(t.x, t.y, '#ec8a2e', 6, 70);
      this.blast(t.x, t.y, R, fs.damage, w.slot, 2.5);
    }
    if (hits) { sfx.boom(); run.shake = Math.max(run.shake, 1.5); }
    return hits > 0;
  }

  // Instant area damage (bypasses per-slot hit cooldown).
  blast(x, y, r, dmg, slot, kb) {
    const hits = this.run.enemies.query(x, y, r);
    for (let i = 0; i < hits.length; i++) {
      const e = hits[i];
      const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
      this.run.damage(e, dmg, slot, dx / d, dy / d, kb);
    }
  }

  fireBomb(w, fs) {
    const run = this.run, pl = run.player;
    for (let i = 0; i < fs.amount; i++) {
      let tx, ty;
      const e = run.enemies.list.length ? run.enemies.list[(Math.random() * run.enemies.list.length) | 0] : null;
      const vip = i === 0 ? run.priorityTarget(140) : null;
      if (vip) { tx = vip.x; ty = vip.y; }
      else if (e && !e.dead && Math.abs(e.x - pl.x) < 140 && Math.abs(e.y - pl.y) < 140) { tx = e.x; ty = e.y; }
      else { const a = Math.random() * TAU, d = 30 + Math.random() * 70; tx = pl.x + Math.cos(a) * d; ty = pl.y + Math.sin(a) * d; }
      const p = this.shot();
      const T = 0.45;
      p.x = pl.x; p.y = pl.y - 4;
      // Ballistic arc that lands exactly on (tx, ty) after T seconds.
      p.gravity = 560;
      p.vx = (tx - pl.x) / T;
      p.vy = (ty - pl.y - 0.5 * p.gravity * T * T) / T;
      p.dmg = 0; p.pierce = 999; p.life = T; p.r = 0; p.slot = w.slot;
      p.sprite = this.spr.flask; p.spin = 8;
      p.zone = { r: 18 * fs.area, dmg: fs.damage, dur: fs.duration, slot: w.slot, blue: !!w.def.evolved };
    }
  }

  fireScythe(w, fs) {
    const run = this.run, pl = run.player;
    const R = 34 * fs.area;
    const base = Math.atan2(pl.faceY, pl.faceX);
    const sweeps = fs.full ? [0] : fs.amount >= 2 ? [0, Math.PI] : [0];
    let healed = 0;
    for (const off of sweeps) {
      const a = base + off;
      run.fx.add({ kind: 'slash', x: pl.x, y: pl.y, r: R, a, arc: fs.full ? TAU : 2.3, dur: 0.16, color: fs.full ? '#b9ea5f' : '#f2ecdc' });
      const hits = run.enemies.query(pl.x, pl.y, R);
      for (let i = 0; i < hits.length; i++) {
        const e = hits[i];
        const dx = e.x - pl.x, dy = e.y - pl.y;
        if (!fs.full) {
          let da = Math.atan2(dy, dx) - a;
          while (da > Math.PI) da -= TAU;
          while (da < -Math.PI) da += TAU;
          if (Math.abs(da) > 1.15 && dx * dx + dy * dy > 100) continue;
        }
        const d = Math.hypot(dx, dy) || 1;
        run.damage(e, fs.damage, w.slot, dx / d, dy / d, 2.2);
        if (fs.drain && healed < 4) { run.heal(1); healed++; }
      }
    }
    sfx.dash();
  }

  updateOrbit(w, dt) {
    const fs = w.fs;
    if (w.active <= 0) {
      w.timer -= dt;
      if (w.timer <= 0) { w.active = fs.duration; w.timer = fs.cooldown; }
      return;
    }
    w.active -= dt;
    w.angle += 3.2 * fs.speed * dt;
    const pl = this.run.player, R = 30 * fs.area, br = 5 * Math.min(fs.area, 1.6);
    const now = this.run.time;
    for (let i = 0; i < fs.amount; i++) {
      const a = w.angle + (i / fs.amount) * TAU;
      const bx = pl.x + Math.cos(a) * R, by = pl.y + Math.sin(a) * R;
      const hits = this.run.enemies.query(bx, by, br);
      for (let j = 0; j < hits.length; j++) {
        const e = hits[j];
        if (e.hitCd[w.slot] > now) continue;
        e.hitCd[w.slot] = now + 0.4;
        this.run.damage(e, fs.damage, w.slot, Math.cos(a), Math.sin(a), 1.5);
      }
    }
  }

  updateAura(w, dt) {
    const fs = w.fs, run = this.run, pl = run.player;
    w.angle += dt;
    w.timer -= dt;
    const R = 26 * fs.area;
    if (fs.slow || fs.pull) {
      const hits = run.enemies.query(pl.x, pl.y, R);
      for (let i = 0; i < hits.length; i++) {
        const e = hits[i];
        if (fs.slow) { e.slow = fs.slow; e.slowT = 0.2; }
        // Abyssal Maw drags everything toward the centre.
        if (fs.pull && !e.isBoss && !e.isStatic) {
          const dx = pl.x - e.x, dy = pl.y - e.y, d = Math.hypot(dx, dy) || 1;
          e.kx += (dx / d) * 160 * fs.pull * dt; e.ky += (dy / d) * 160 * fs.pull * dt;
        }
      }
    }
    if (w.timer > 0) return;
    w.timer = fs.cooldown;
    const hits = run.enemies.query(pl.x, pl.y, R);
    for (let i = 0; i < hits.length; i++) {
      const e = hits[i];
      const dx = e.x - pl.x, dy = e.y - pl.y, d = Math.hypot(dx, dy) || 1;
      run.damage(e, fs.damage, w.slot, dx / d, dy / d, 0.7);
    }
    if (fs.drain && hits.length) run.heal(0.5);
  }

  // ---------------------------------------------------------------- update
  update(dt) {
    const run = this.run, en = run.enemies, now = run.time;
    const shots = this.shots;
    for (let i = shots.length - 1; i >= 0; i--) {
      const p = shots[i];
      p.life -= dt;
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.curve) {
        const c = Math.cos(p.curve * dt), s = Math.sin(p.curve * dt);
        const vx = p.vx * c - p.vy * s; p.vy = p.vx * s + p.vy * c; p.vx = vx;
      }
      if (p.homing) {
        p.retarget -= dt;
        if (p.retarget <= 0) {
          p.retarget = 0.12;
          const t = p.only && !p.only.dead ? p.only : en.nearest(p.x, p.y, 120);
          if (t) {
            const sp = Math.hypot(p.vx, p.vy);
            const want = Math.atan2(t.y - p.y, t.x - p.x), cur = Math.atan2(p.vy, p.vx);
            let da = want - cur;
            while (da > Math.PI) da -= TAU;
            while (da < -Math.PI) da += TAU;
            const na = cur + Math.max(-0.5, Math.min(0.5, da));
            p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
          }
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.spin * dt;
      if (p.zone) {
        if (p.life <= 0) {
          const z = p.zone;
          this.zones.push({ x: p.x, y: p.y, r: z.r, dmg: z.dmg, life: z.dur, tick: 0, slot: z.slot, blue: z.blue, seed: Math.random() * 10 });
          this.remove(i);
        }
        continue;
      }
      if (p.r > 0) {
        const hits = en.query(p.x, p.y, p.r);
        const sp = Math.hypot(p.vx, p.vy) || 1;
        for (let j = 0; j < hits.length && p.pierce > 0; j++) {
          const e = hits[j];
          if (p.only && e !== p.only) continue;
          if (p.pierce >= 999) {
            if (e.hitCd[p.slot] > now) continue;
            e.hitCd[p.slot] = now + 0.5;
          } else {
            if (p.hits.includes(e.uid)) continue;
            p.hits.push(e.uid);
            p.pierce--;
          }
          run.damage(e, p.dmg, p.slot, p.vx / sp, p.vy / sp, p.kb);
        }
      }
      if (p.life <= 0 || p.pierce <= 0) this.remove(i);
    }

    // Ground zones (fire)
    const zones = this.zones;
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      z.life -= dt;
      z.tick -= dt;
      if (z.tick <= 0) {
        z.tick = 0.35;
        const hits = en.query(z.x, z.y, z.r);
        for (let j = 0; j < hits.length; j++) run.damage(hits[j], z.dmg, z.slot, 0, 0, 0);
      }
      if (z.life <= 0) { zones[i] = zones[zones.length - 1]; zones.pop(); }
    }

    // Enemy bullets
    const pl = run.player, bl = this.bullets;
    for (let i = bl.length - 1; i >= 0; i--) {
      const b = bl[i];
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      const dx = b.x - pl.x, dy = b.y - pl.y;
      if (dx * dx + dy * dy < 36) { run.hurtPlayer(b.dmg); b.life = 0; }
      if (b.life <= 0) { bl[i] = bl[bl.length - 1]; bl.pop(); }
    }
  }

  remove(i) {
    const s = this.shots, p = s[i];
    s[i] = s[s.length - 1];
    s.pop();
    this.shotFree.push(p);
  }

  enemyShot(x, y, angle, speed, dmg, sprite) {
    if (this.bullets.length > 300) return;
    this.bullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg, life: 6, spr: this.spr[sprite] || this.spr.orb });
  }
}
