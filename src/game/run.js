// One play session: owns the player, enemies, weapons, pickups and the
// spawn director. The UI talks to it through `hooks` and the choose/close
// methods; it never touches the DOM itself.

import { Enemies } from './enemies.js';
import { Combat, makeWeapon, computeWeapon } from './weapons.js';
import { Director } from './spawner.js';
import { Effects } from './effects.js';
import { metaStats, runStats, BASE_HP, BASE_SPEED, BASE_MAGNET, BASE_DASH_CD } from './stats.js';
import { WEAPONS, MAX_WEAPON_LEVEL } from '../data/weapons.js';
import { PASSIVES, PASSIVE_IDS } from '../data/passives.js';
import { CHARACTERS } from '../data/characters.js';
import { MAPS } from '../data/maps.js';
import { nightfallMods, DIFFICULTIES } from '../data/meta.js';
import { atlas } from '../gfx/atlas.js';
import { sfx } from '../core/audio.js';
import { weighted } from '../core/math.js';
import { rarityWeight } from '../data/rarity.js';

const TAU = Math.PI * 2;
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;
const MAX_GEMS = 220; // extra drops merge into existing gems
const ENV_SLOT = 7; // damage from bombs etc.

export function xpForLevel(l) {
  if (l < 20) return 5 + (l - 1) * 8;
  if (l < 40) return 200 + (l - 20) * 20;
  return 600 + (l - 40) * 40;
}

export class Run {
  // opts: { char, map, mode, nightfall, weaponPool, cap }
  constructor(opts, profile, hooks) {
    this.opts = opts;
    this.hooks = hooks;
    this.charId = opts.char;
    this.mapId = opts.map;
    this.map = MAPS[opts.map];
    this.endless = opts.mode === 'endless';
    this.nightfall = opts.nightfall || 0;
    this.difficulty = DIFFICULTIES[opts.difficulty] ? opts.difficulty : 'normal';
    // Difficulty multiplies into the Nightfall modifiers, so every system
    // that already respects Nightfall respects difficulty too.
    const nf = nightfallMods(this.nightfall), df = DIFFICULTIES[this.difficulty];
    this.nf = { hp: nf.hp * df.hp, dmg: nf.dmg * df.dmg, speed: nf.speed * df.speed, density: nf.density * df.density, gold: nf.gold * df.gold, legendary: nf.legendary + df.legendary };
    this.cap = opts.cap || 350;
    this.weaponPool = opts.weaponPool;
    this.view = { w: 240, h: 400 };

    this.time = 0;
    this.paused = false;
    this.over = false;
    this.victory = false;
    this.modal = null; // 'level' | 'chest' | null
    this.shake = 0;

    this.enemies = new Enemies();
    this.fx = new Effects();
    this.combat = new Combat(this);
    this.director = new Director(this);
    this.gems = [];
    this.items = [];
    this.braziers = 0;
    this.bossAlive = 0;
    this.bosses = [];

    this.meta = metaStats(this.charId, profile);
    this.weapons = [];
    this.passives = {};
    this.banished = new Set();
    this.stats = null;

    this.level = 1;
    this.xp = 0;
    this.xpNext = xpForLevel(1);
    this.pendingLevels = 0;
    this.kills = 0;
    this.gold = 0;
    this.elitesKilled = 0;
    this.bossKills = 0;
    this.chests = 0;
    this.evolutions = 0;
    this.firstHitAt = -1;
    this.dmgBySlot = new Float64Array(8);
    this.gemCombo = 0;
    this.gemComboT = 0;

    const pl = this.player = {
      x: 0, y: 0, vx: 0, vy: 0, faceX: 1, faceY: 0, r: 5,
      hp: 100, maxHp: 100, iframes: 0, flash: 0, anim: 0,
      dash: 0, dashX: 0, dashY: 0, charges: 1, chargeT: 0,
      sprite: atlas.get(this.charId),
    };
    this.addWeapon(CHARACTERS[this.charId].weapon);
    this.refreshStats();
    pl.hp = pl.maxHp;
    pl.charges = this.stats.dashCharges;
    this.rerolls = this.stats.rerolls;
    this.skips = this.stats.skips;
    this.banishes = this.stats.banishes;
    this.revives = this.stats.revives;

    this.sprGem = ['gem1', 'gem2', 'gem3', 'gem4'].map((n) => atlas.get(n));
    this.sprItem = {};
    for (const n of ['coin', 'coinbag', 'heart', 'magnet', 'bomb', 'chest', 'bosschest']) this.sprItem[n] = atlas.get(n);
  }

  // ------------------------------------------------------------ stats
  refreshStats() {
    const s = this.stats = runStats(this.meta, this.passives);
    const pl = this.player;
    const newMax = BASE_HP * s.maxHp;
    if (pl.maxHp && newMax > pl.maxHp) pl.hp += newMax - pl.maxHp;
    pl.maxHp = newMax;
    pl.hp = Math.min(pl.hp, pl.maxHp);
    this.speed = BASE_SPEED * s.moveSpeed;
    this.magnet = BASE_MAGNET * s.magnet;
    this.dashCd = BASE_DASH_CD * s.dashCooldown;
    for (const w of this.weapons) computeWeapon(w, s);
  }

  addWeapon(id) {
    const w = makeWeapon(id, this.weapons.length);
    this.weapons.push(w);
    if (this.stats) computeWeapon(w, this.stats);
    return w;
  }

  weaponById(id) {
    return this.weapons.find((w) => w.id === id);
  }

  // ------------------------------------------------------------ main update
  update(dt) {
    if (this.paused || this.over) return;
    this.time += dt;
    const pl = this.player, s = this.stats;

    // The grid must be rebuilt before anything queries it this frame.
    this.enemies.buildGrid(pl.x, pl.y, this.view.w / 2 + 96, this.view.h / 2 + 96);
    this.updatePlayer(dt);
    this.director.update(dt);
    this.updateEnemies(dt);
    for (const w of this.weapons) this.combat.updateWeapon(w, dt);
    this.combat.update(dt);
    this.updatePickups(dt);
    this.fx.update(dt);
    this.enemies.flush();

    if (s.regen > 0 && pl.hp < pl.maxHp) pl.hp = Math.min(pl.maxHp, pl.hp + s.regen * dt);
    this.shake = Math.max(0, this.shake - dt * 20);
    if (this.gemComboT > 0) { this.gemComboT -= dt; if (this.gemComboT <= 0) this.gemCombo = 0; }

    if (!this.over && !this.modal && this.pendingLevels > 0) this.openLevelUp();
  }

  updatePlayer(dt) {
    const pl = this.player, input = this.input;
    let mx = input ? input.moveX : 0, my = input ? input.moveY : 0;
    if (this.autopilot) [mx, my] = this.autopilot(this);
    if (mx || my) {
      const len = Math.hypot(mx, my);
      pl.faceX = mx / len; pl.faceY = my / len;
    }
    // Dash
    if (pl.charges < this.stats.dashCharges) {
      pl.chargeT += dt;
      if (pl.chargeT >= this.dashCd) { pl.charges++; pl.chargeT = 0; }
    }
    if (input && input.consumeDash() && pl.charges > 0 && pl.dash <= 0) {
      pl.charges--;
      pl.dash = 0.18;
      pl.dashX = pl.faceX; pl.dashY = pl.faceY;
      pl.iframes = Math.max(pl.iframes, 0.3);
      sfx.dash();
      this.fx.burst(pl.x, pl.y + 4, '#9a94a8', 5, 30);
    }
    if (pl.dash > 0) {
      pl.dash -= dt;
      pl.vx = pl.dashX * this.speed * 4.2;
      pl.vy = pl.dashY * this.speed * 4.2;
    } else {
      pl.vx = mx * this.speed;
      pl.vy = my * this.speed;
    }
    pl.x += pl.vx * dt;
    pl.y += pl.vy * dt;
    pl.iframes -= dt;
    pl.flash -= dt;
    if (mx || my) pl.anim += dt;
  }

  updateEnemies(dt) {
    const list = this.enemies.list, pl = this.player, en = this.enemies;
    const despawn2 = Math.pow(Math.hypot(this.view.w, this.view.h) / 2 + 140, 2);
    const parity = Math.floor(this.time * 60) & 1;
    const decay = Math.exp(-9 * dt);
    for (let i = 0, n = list.length; i < n; i++) {
      const e = list[i];
      if (e.dead) continue;
      e.flash -= dt;
      if (e.isStatic) continue;
      if (e.slowT > 0) e.slowT -= dt; else e.slow = 0;
      e.anim += dt;
      let dx = pl.x - e.x, dy = pl.y - e.y;
      const d2 = dx * dx + dy * dy;
      const d = Math.sqrt(d2) || 1;
      let mx, my;
      if (e.ai) {
        const r = this.ai(e, dt, dx, dy, d);
        mx = r[0]; my = r[1];
        if (e.dead) continue;
      } else {
        const sp = e.speed * (1 - e.slow);
        mx = (dx / d) * sp; my = (dy / d) * sp;
      }
      // Separation (half the crowd per frame)
      if (!e.isBoss && (e.uid & 1) === parity) {
        let sx = 0, sy = 0;
        const near = en.query(e.x, e.y, e.r);
        for (let j = 0; j < near.length && j < 8; j++) {
          const o = near[j];
          if (o === e || o.isStatic) continue;
          let ox = e.x - o.x, oy = e.y - o.y;
          let od = Math.hypot(ox, oy);
          if (od < 0.01) { ox = Math.random() - 0.5; oy = Math.random() - 0.5; od = 0.5; }
          const push = (e.r + o.r - od) / (e.r + o.r);
          sx += (ox / od) * push; sy += (oy / od) * push;
        }
        e.sx = sx * 40; e.sy = sy * 40;
      }
      e.x += (mx + e.kx + e.sx) * dt;
      e.y += (my + e.ky + e.sy) * dt;
      e.kx *= decay; e.ky *= decay;
      if (Math.abs(dx) > 1) e.flip = dx < 0;

      if (e.ranged) {
        e.rangedT -= dt;
        if (e.rangedT <= 0 && d < 150) {
          e.rangedT = e.ranged.every;
          this.combat.enemyShot(e.x, e.y, Math.atan2(dy, dx), e.ranged.speed, e.ranged.dmg * this.director.dmgScale(), e.ranged.sprite);
        }
      }
      // Recycle stragglers far behind the player back to the spawn ring.
      // Bosses get a longer leash but are never allowed to be outrun.
      if (d2 > despawn2 * (e.isBoss ? 1.6 : 1) && e.ai !== 'swarm') {
        const [x, y] = this.director.spawnPos();
        e.x = x; e.y = y;
      }
      if (d < e.r + pl.r) this.hurtPlayer(e.dmg);
    }
  }

  // Boss / special behaviours. Returns the desired velocity.
  ai(e, dt, dx, dy, d) {
    const run = this;
    const sp = e.speed * (1 - e.slow * 0.5);
    switch (e.ai) {
      case 'swarm':
        e.t -= dt;
        if (e.t <= 0) { this.enemies.kill(e); return [0, 0]; }
        return [e.tx * e.speed, e.ty * e.speed];
      case 'charger': {
        e.t -= dt;
        if (e.state === 0) {
          if (e.t <= 0) { e.state = 1; e.t = 0.7; e.flash = 0.7; }
          return [(dx / d) * sp, (dy / d) * sp];
        }
        if (e.state === 1) {
          if (e.t <= 0) { e.state = 2; e.t = 0.9; e.tx = dx / d; e.ty = dy / d; run.shake = 3; }
          return [0, 0];
        }
        if (e.t <= 0) { e.state = 0; e.t = 3 + Math.random(); }
        return [e.tx * sp * 5, e.ty * sp * 5];
      }
      case 'caster': {
        e.t -= dt; e.t2 -= dt;
        if (e.t <= 0) {
          e.t = 2.8;
          const n = 12, off = Math.random() * TAU;
          for (let i = 0; i < n; i++) this.combat.enemyShot(e.x, e.y, off + (i / n) * TAU, 55, e.dmg * 0.6, 'orb');
        }
        if (e.t2 <= 0) {
          e.t2 = 7;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU;
            this.director.spawn(this.mapId === 'ashen' ? 'imp' : 'bat', e.x + Math.cos(a) * 24, e.y + Math.sin(a) * 24);
          }
        }
        const want = d > 70 ? 1 : 0.4;
        return [(dx / d) * sp * want, (dy / d) * sp * want];
      }
      case 'lord': {
        e.t -= dt; e.t2 -= dt;
        if (e.state === 2) {
          if (e.t <= 0) { e.state = 0; e.t = 2.2; }
          return [e.tx * sp * 5, e.ty * sp * 5];
        }
        if (e.state === 1) {
          if (e.t <= 0) { e.state = 2; e.t = 0.8; e.tx = dx / d; e.ty = dy / d; run.shake = 3; }
          return [0, 0];
        }
        if (e.t <= 0) {
          e.phase = (e.phase || 0) + 1;
          if (e.phase % 3 === 0) { e.state = 1; e.t = 0.6; e.flash = 0.6; }
          else if (e.phase % 3 === 1) {
            const n = 16, off = Math.random() * TAU;
            for (let i = 0; i < n; i++) this.combat.enemyShot(e.x, e.y, off + (i / n) * TAU, 62, e.dmg * 0.6, 'fireorb');
            e.t = 2.2;
          } else {
            const pool = this.director.pool();
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * TAU;
              this.director.spawn(weighted(pool), e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30);
            }
            e.t = 2.2;
          }
        }
        return [(dx / d) * sp, (dy / d) * sp];
      }
    }
    return [(dx / d) * sp, (dy / d) * sp];
  }

  // ------------------------------------------------------------ combat
  // Closest boss (else elite) within range, used by auto-aimed weapons so
  // big threats don't hide behind the crowd.
  priorityTarget(range) {
    let best = null, bd = range * range;
    for (const b of this.bosses) {
      const d = (b.x - this.player.x) ** 2 + (b.y - this.player.y) ** 2;
      if (d < bd && !b.dead) { bd = d; best = b; }
    }
    if (best) return best;
    for (const e of this.enemies.list) {
      if (!e.isElite || e.dead) continue;
      const d = (e.x - this.player.x) ** 2 + (e.y - this.player.y) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  damage(e, dmg, slot, kx, ky, kb) {
    if (e.dead) return;
    const s = this.stats;
    let crit = false;
    if (Math.random() < s.crit) { dmg *= s.critDmg; crit = true; }
    dmg *= 0.9 + Math.random() * 0.2;
    e.hp -= dmg;
    e.flash = 0.08;
    this.dmgBySlot[slot] += Math.min(dmg, e.hp + dmg);
    if (kb && e.kbRes) { e.kx += kx * kb * 40 * e.kbRes; e.ky += ky * kb * 40 * e.kbRes; }
    if (!e.isStatic) this.fx.number(e.x, e.y - e.r * e.scale, dmg, crit);
    sfx.hit();
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    this.enemies.kill(e);
    const s = this.stats;
    if (e.isStatic) {
      this.braziers--;
      this.fx.burst(e.x, e.y, '#ec8a2e', 8, 50);
      this.dropItem(e.x, e.y, weighted([['heart', 35], ['coinbag', 30], ['magnet', 18], ['bomb', 17]]));
      return;
    }
    this.kills++;
    sfx.kill();
    this.fx.burst(e.x, e.y, e.isBoss ? '#f5d351' : '#d23b3b', e.isBoss ? 30 : e.isElite ? 12 : 3, e.isBoss ? 90 : 45);
    if (e.xp) this.dropGem(e.x, e.y, e.xp);
    if (e.isBoss) {
      this.bossKills++;
      this.bossAlive--;
      this.bosses = this.bosses.filter((b) => b !== e);
      this.shake = 6;
      sfx.boom();
      if (e.isFinal && !this.endless) {
        this.finish(true);
        return;
      }
      this.dropItem(e.x, e.y, 'bosschest');
      this.dropItem(e.x + 10, e.y, 'coinbag');
      this.dropItem(e.x - 10, e.y, 'heart');
      return;
    }
    if (e.isElite) {
      this.elitesKilled++;
      this.dropItem(e.x, e.y, 'chest');
      return;
    }
    const r = Math.random() / s.luck;
    if (r < 0.035) this.dropItem(e.x + 3, e.y, 'coin');
    else if (r < 0.038) this.dropItem(e.x, e.y, 'heart');
    else if (r < 0.0388) this.dropItem(e.x, e.y, 'magnet');
    else if (r < 0.0396) this.dropItem(e.x, e.y, 'bomb');
  }

  hurtPlayer(dmg) {
    const pl = this.player;
    if (pl.iframes > 0 || pl.dash > 0 || this.over) return;
    dmg = Math.max(1, dmg - this.stats.armor);
    pl.hp -= dmg;
    pl.iframes = 0.45;
    pl.flash = 0.2;
    this.shake = Math.max(this.shake, 2);
    if (this.firstHitAt < 0) this.firstHitAt = this.time;
    sfx.hurt();
    if (pl.hp <= 0) {
      if (this.revives > 0) {
        this.revives--;
        pl.hp = pl.maxHp * 0.6;
        pl.iframes = 2.5;
        this.nova();
        this.toast('REVIVED!');
      } else this.finish(false);
    }
  }

  heal(h) {
    const pl = this.player;
    pl.hp = Math.min(pl.maxHp, pl.hp + h);
  }

  // Screen-clearing blast (bomb pickup, revive).
  nova() {
    const pl = this.player, list = this.enemies.list;
    const hw = this.view.w / 2 + 20, hh = this.view.h / 2 + 20;
    this.fx.add({ kind: 'ring', x: pl.x, y: pl.y, r: Math.max(hw, hh) * 1.2, dur: 0.4, color: '#f5d351' });
    this.shake = 5;
    sfx.boom();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || e.isStatic || Math.abs(e.x - pl.x) > hw || Math.abs(e.y - pl.y) > hh) continue;
      const dmg = e.isBoss ? e.maxHp * 0.05 : e.isElite ? e.maxHp * 0.25 : e.hp + 1;
      this.damage(e, dmg, ENV_SLOT, 0, 0, 0);
    }
  }

  // ------------------------------------------------------------ pickups
  dropGem(x, y, v) {
    const gems = this.gems;
    if (gems.length >= MAX_GEMS) {
      // Merge into an existing gem instead of creating more objects.
      const g = gems[(Math.random() * gems.length) | 0];
      g.v += v;
      g.f = this.gemSprite(g.v);
      return;
    }
    gems.push({ x: x + (Math.random() * 4 - 2), y: y + (Math.random() * 4 - 2), v, f: this.gemSprite(v), pull: false, sp: 0 });
  }

  gemSprite(v) {
    return this.sprGem[v < 3 ? 0 : v < 10 ? 1 : v < 40 ? 2 : 3];
  }

  dropItem(x, y, type) {
    this.items.push({ x, y, type, f: this.sprItem[type], pull: false, sp: 0, bob: Math.random() * 6 });
  }

  updatePickups(dt) {
    const pl = this.player, mag2 = this.magnet * this.magnet;
    const gems = this.gems;
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      const dx = pl.x - g.x, dy = pl.y - g.y, d2 = dx * dx + dy * dy;
      if (!g.pull && d2 < mag2) { g.pull = true; g.sp = -40; }
      if (g.pull) {
        const d = Math.sqrt(d2) || 1;
        g.sp = Math.min(g.sp + 500 * dt, 400);
        g.x += (dx / d) * g.sp * dt; g.y += (dy / d) * g.sp * dt;
        if (d < 6) {
          this.addXp(g.v);
          gems[i] = gems[gems.length - 1]; gems.pop();
          this.gemCombo++; this.gemComboT = 0.4;
          sfx.gem(Math.min(this.gemCombo, 20));
        }
      }
    }
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const dx = pl.x - it.x, dy = pl.y - it.y, d2 = dx * dx + dy * dy;
      const magnetic = it.type === 'coin' || it.type === 'coinbag';
      if (magnetic && !it.pull && d2 < mag2) { it.pull = true; it.sp = -30; }
      if (it.pull) {
        const d = Math.sqrt(d2) || 1;
        it.sp = Math.min(it.sp + 500 * dt, 400);
        it.x += (dx / d) * it.sp * dt; it.y += (dy / d) * it.sp * dt;
      }
      if (d2 < 64) {
        items[i] = items[items.length - 1]; items.pop();
        this.collect(it);
      }
    }
  }

  goldMult() {
    return this.stats.greed * this.map.gold * this.nf.gold * (this.endless && this.time > 1500 ? 1 + (this.time - 1500) / 1200 : 1);
  }

  addGold(v) {
    const g = v * this.goldMult();
    this.gold += g;
    return g;
  }

  collect(it) {
    const pl = this.player;
    switch (it.type) {
      case 'coin': this.addGold(2); sfx.coin(); break;
      case 'coinbag': this.fx.text(pl.x, pl.y - 12, '+' + Math.round(this.addGold(25)), '#f5d351'); sfx.coin(); break;
      case 'heart': this.heal(30); this.fx.text(pl.x, pl.y - 12, '+30', '#63c55b'); sfx.heal(); break;
      case 'magnet': for (const g of this.gems) { g.pull = true; g.sp = 60; } sfx.chest(); break;
      case 'bomb': this.nova(); break;
      case 'chest': this.openChest(false); break;
      case 'bosschest': this.openChest(true); break;
    }
  }

  addXp(v) {
    this.xp += v * this.stats.growth;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = xpForLevel(this.level);
      this.pendingLevels++;
    }
  }

  // ------------------------------------------------------------ level up
  ownedPassives() { return Object.keys(this.passives); }

  choiceCandidates() {
    const c = [];
    for (const w of this.weapons) {
      if (!w.def.evolved && w.level < MAX_WEAPON_LEVEL && !this.banished.has(w.id))
        c.push([{ type: 'weapon', id: w.id, level: w.level + 1 }, 10]);
    }
    if (this.weapons.length < MAX_WEAPONS) {
      for (const id of this.weaponPool) {
        if (this.banished.has(id) || this.weapons.some((w) => w.id === id || evolvedFromId(w.id) === id)) continue;
        // New skills are offered by rarity: legendaries show up rarely.
        c.push([{ type: 'weapon', id, level: 1 }, 7 * rarityWeight(WEAPONS[id].rarity, this.stats.luck)]);
      }
    }
    for (const id in this.passives) {
      if (this.passives[id] < PASSIVES[id].max && !this.banished.has(id))
        c.push([{ type: 'passive', id, level: this.passives[id] + 1 }, 8]);
    }
    if (this.ownedPassives().length < MAX_PASSIVES) {
      for (const id of PASSIVE_IDS) {
        if (this.passives[id] || this.banished.has(id)) continue;
        c.push([{ type: 'passive', id, level: 1 }, 5 * rarityWeight(PASSIVES[id].rarity, this.stats.luck)]);
      }
    }
    return c;
  }

  makeChoices() {
    const cands = this.choiceCandidates();
    let n = this.stats.choices;
    if (Math.random() < (this.stats.luck - 1) * 0.5) n++;
    const out = [];
    while (out.length < n && cands.length) {
      const pick = weighted(cands);
      out.push(pick);
      cands.splice(cands.findIndex((c) => c[0] === pick), 1);
    }
    if (!out.length) {
      out.push({ type: 'gold', amount: 25 }, { type: 'heal', amount: 40 });
    }
    return out;
  }

  openLevelUp() {
    this.modal = 'level';
    sfx.levelUp();
    this.hooks.levelUp(this.makeChoices());
  }

  applyChoice(c) {
    if (c.type === 'weapon') {
      const w = this.weaponById(c.id);
      if (w) w.level++;
      else this.addWeapon(c.id);
    } else if (c.type === 'passive') {
      this.passives[c.id] = (this.passives[c.id] || 0) + 1;
    } else if (c.type === 'gold') {
      this.addGold(c.amount);
    } else if (c.type === 'heal') {
      this.heal(c.amount);
    }
    this.refreshStats();
  }

  // Called by the UI after the player picks / skips.
  resolveLevelUp(choice) {
    if (choice) this.applyChoice(choice);
    this.pendingLevels--;
    this.modal = null;
    if (this.pendingLevels > 0) this.openLevelUp();
  }

  reroll() {
    if (this.rerolls <= 0) return null;
    this.rerolls--;
    return this.makeChoices();
  }

  banish(c) {
    if (this.banishes <= 0 || !c.id) return null;
    this.banishes--;
    this.banished.add(c.id);
    return this.makeChoices();
  }

  // ------------------------------------------------------------ chests
  evolvable() {
    return this.weapons.filter((w) => !w.def.evolved && w.level >= MAX_WEAPON_LEVEL && w.def.evolve && this.passives[w.def.evolve.passive]);
  }

  openChest(boss) {
    this.chests++;
    const rewards = [];
    const s = this.stats;
    let count = 1;
    if (boss) count = 3;
    else {
      const r = Math.random() / s.luck;
      if (r < 0.04) count = 5; else if (r < 0.15) count = 3;
    }
    for (let i = 0; i < count; i++) {
      const ev = this.evolvable();
      if (ev.length) {
        const w = ev[0];
        const into = w.def.evolve.into;
        rewards.push({ type: 'evolve', from: w.id, id: into });
        w.id = into; w.def = WEAPONS[into]; w.level = MAX_WEAPON_LEVEL; w.timer = 0.2;
        this.evolutions++;
        continue;
      }
      const ups = [];
      // Weapons are listed twice so chests favour them over passives.
      for (const w of this.weapons) if (!w.def.evolved && w.level < MAX_WEAPON_LEVEL) ups.push(['w', w], ['w', w]);
      for (const id in this.passives) if (this.passives[id] < PASSIVES[id].max) ups.push(['p', id]);
      if (!ups.length) break;
      const [t, x] = ups[(Math.random() * ups.length) | 0];
      if (t === 'w') { x.level++; rewards.push({ type: 'weapon', id: x.id, level: x.level }); }
      else { this.passives[x]++; rewards.push({ type: 'passive', id: x, level: this.passives[x] }); }
      this.refreshStats();
    }
    this.refreshStats();
    const gold = this.addGold((boss ? 60 : 15) + Math.random() * (boss ? 60 : 25) + this.time / 30);
    rewards.push({ type: 'gold', amount: Math.round(gold) });
    let relic = false;
    if (boss || Math.random() < 0.05 * s.luck) relic = true;
    this.modal = 'chest';
    sfx.chest();
    this.hooks.chest({ boss, rewards, relic });
  }

  closeChest() {
    this.modal = null;
  }

  // ------------------------------------------------------------ misc
  onBoss(e) {
    this.bossAlive++;
    this.bosses.push(e);
    this.shake = 4;
    sfx.roar();
    this.hooks.boss(e.def.name);
  }

  toast(text) {
    this.hooks.toast(text);
  }

  finish(victory) {
    if (this.over) return;
    this.over = true;
    this.victory = victory;
    if (victory) sfx.victory(); else sfx.defeat();
    this.hooks.end(this.summary());
  }

  abandon() {
    this.finish(false);
  }

  summary() {
    return {
      char: this.charId, map: this.mapId, mode: this.endless ? 'endless' : 'standard',
      nightfall: this.nightfall, difficulty: this.difficulty, victory: this.victory,
      time: this.time, level: this.level, kills: this.kills,
      gold: Math.floor(this.gold), elites: this.elitesKilled, bosses: this.bossKills,
      chests: this.chests, evolutions: this.evolutions,
      evolved: this.weapons.filter((w) => w.def.evolved).length,
      firstHitAt: this.firstHitAt < 0 ? this.time : this.firstHitAt,
      weapons: this.weapons.map((w) => ({ id: w.id, level: w.level, dmg: Math.round(this.dmgBySlot[w.slot]) })),
      passives: { ...this.passives },
      relicRolls: 0,
    };
  }
}

function evolvedFromId(evolvedId) {
  for (const id in WEAPONS) {
    const ev = WEAPONS[id].evolve;
    if (ev && ev.into === evolvedId) return id;
  }
  return null;
}
