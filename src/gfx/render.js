// Draws a Run onto the low-res canvas: ground, entities, effects, lighting
// and the HUD. Uses only drawImage / fillRect / a few arcs per frame.

import { atlas } from './atlas.js';
import { font } from './font.js';
import { SPRITES } from './sprites.js';
import { MAPS } from '../data/maps.js';
import { PASSIVES } from '../data/passives.js';
import { seededRng, formatTime, formatNum } from '../core/math.js';

const TILE = 256;
const TAU = Math.PI * 2;

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.tiles = new Map(); // mapId -> [canvas, canvas, canvas]
    this.vignette = null;
    this.vw = 0; this.vh = 0;
    this.icons = {};
  }

  groundTiles(mapId) {
    let t = this.tiles.get(mapId);
    if (t) return t;
    const map = MAPS[mapId];
    t = [];
    for (let v = 0; v < 3; v++) {
      const c = document.createElement('canvas');
      c.width = TILE; c.height = TILE;
      const g = c.getContext('2d');
      const rng = seededRng(mapId.length * 977 + v * 131);
      const G = map.ground;
      g.fillStyle = G.base; g.fillRect(0, 0, TILE, TILE);
      for (let i = 0; i < 70; i++) {
        g.fillStyle = rng() < 0.5 ? G.dark : G.light;
        const w = 6 + rng() * 30, h = 4 + rng() * 18;
        g.fillRect(Math.floor(rng() * TILE), Math.floor(rng() * TILE), Math.floor(w), Math.floor(h));
      }
      g.fillStyle = G.speck;
      for (let i = 0; i < 260; i++) g.fillRect(Math.floor(rng() * TILE), Math.floor(rng() * TILE), 1, 1);
      // Decorations (baked, so they cost nothing per frame)
      const total = map.decor.reduce((a, d) => a + d[1], 0);
      const n = 9 + Math.floor(rng() * 5);
      for (let i = 0; i < n; i++) {
        let r = rng() * total, name = map.decor[0][0];
        for (const [d, w] of map.decor) { r -= w; if (r <= 0) { name = d; break; } }
        if (!SPRITES[name]) continue;
        const f = atlas.get(name);
        const x = 8 + Math.floor(rng() * (TILE - 16 - f.w)), y = 8 + Math.floor(rng() * (TILE - 16 - f.h));
        g.globalAlpha = 0.8;
        g.drawImage(atlas.canvas, rng() < 0.5 ? f.x : f.fx, f.y, f.w, f.h, x, y, f.w, f.h);
        g.globalAlpha = 1;
      }
      t.push(c);
    }
    this.tiles.set(mapId, t);
    return t;
  }

  ensureVignette(w, h) {
    if (this.vignette && this.vw === w && this.vh === h) return;
    this.vw = w; this.vh = h;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const r = Math.hypot(w, h) / 2;
    const grad = g.createRadialGradient(w / 2, h / 2, r * 0.35, w / 2, h / 2, r);
    grad.addColorStop(0, 'rgba(10,6,16,0)');
    grad.addColorStop(1, 'rgba(10,6,16,0.75)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    this.vignette = c;
  }

  drawGround(mapId, camX, camY, w, h) {
    const ctx = this.ctx, tiles = this.groundTiles(mapId);
    const tx0 = Math.floor(camX / TILE), ty0 = Math.floor(camY / TILE);
    const tx1 = Math.floor((camX + w) / TILE), ty1 = Math.floor((camY + h) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const v = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
        ctx.drawImage(tiles[v % 3], tx * TILE - camX, ty * TILE - camY);
      }
    }
  }

  // Menu backdrop: slowly drifting ground.
  drawBackdrop(mapId, t, w, h) {
    const ctx = this.ctx;
    this.drawGround(mapId, Math.floor(t * 8), Math.floor(t * 5), w, h);
    this.ensureVignette(w, h);
    ctx.drawImage(this.vignette, 0, 0);
  }

  draw(run, w, h, safe, input, settings) {
    const ctx = this.ctx, pl = run.player, A = atlas.canvas;
    let sx = 0, sy = 0;
    if (run.shake > 0 && settings.shake) { sx = (Math.random() - 0.5) * run.shake; sy = (Math.random() - 0.5) * run.shake; }
    const camX = Math.round(pl.x - w / 2 + sx), camY = Math.round(pl.y - h / 2 + sy);
    this.drawGround(run.mapId, camX, camY, w, h);
    const inView = (x, y, m) => x > camX - m && x < camX + w + m && y > camY - m && y < camY + h + m;

    // Fire zones
    const zones = run.combat.zones;
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      if (!inView(z.x, z.y, z.r)) continue;
      const fade = Math.min(1, z.life * 2);
      const pool = this.zoneSprite(z.r, z.blue);
      ctx.globalAlpha = fade;
      ctx.drawImage(pool, Math.round(z.x - camX - pool.width / 2), Math.round(z.y - camY - pool.height / 2));
      const f = atlas.get(z.blue ? 'blueflame' : 'flame');
      const n = 3 + Math.floor(z.r / 10);
      for (let k = 0; k < n; k++) {
        const a = z.seed + k * 2.4, rr = (k / n) * z.r * 0.8;
        const fx = z.x + Math.cos(a) * rr, fy = z.y + Math.sin(a) * rr * 0.75;
        const flick = ((run.time * 10 + k) | 0) % 2;
        atlas.draw(ctx, f, fx - camX, fy - camY - flick, flick);
      }
      ctx.globalAlpha = 1;
    }

    // Auras
    for (const wpn of run.weapons) {
      if (wpn.def.kind !== 'aura') continue;
      const R = 26 * wpn.fs.area;
      const evo = wpn.def.evolved;
      const abyss = wpn.def.rarity === 'legendary';
      ctx.globalAlpha = 0.13 + Math.sin(run.time * 4) * 0.03;
      ctx.fillStyle = abyss ? '#1b0b2e' : evo ? '#a35ad8' : '#63c55b';
      if (abyss) ctx.globalAlpha = 0.45 + Math.sin(run.time * 3) * 0.05;
      ctx.beginPath(); ctx.arc(pl.x - camX, pl.y - camY, R, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = abyss ? '#a35ad8' : evo ? '#ef7fb6' : '#b9ea5f';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.lineDashOffset = -run.time * 12;
      ctx.beginPath(); ctx.arc(pl.x - camX, pl.y - camY, R, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Gems & items
    const gems = run.gems;
    for (let i = 0; i < gems.length; i++) {
      const g = gems[i];
      if (!inView(g.x, g.y, 8)) continue;
      const f = g.f;
      ctx.drawImage(A, f.x, f.y, f.w, f.h, Math.round(g.x - camX - f.w / 2), Math.round(g.y - camY - f.h / 2), f.w, f.h);
    }
    for (const it of run.items) {
      if (!inView(it.x, it.y, 12)) continue;
      const bob = Math.round(Math.sin(run.time * 4 + it.bob) * 1.5);
      atlas.draw(ctx, it.f, it.x - camX, it.y - camY + bob);
      if (it.type === 'chest' || it.type === 'bosschest') this.drawPointerIfOffscreen(it, camX, camY, w, h, safe, '#f5d351');
    }

    // Enemy shadows, then bodies
    const list = run.enemies.list;
    ctx.fillStyle = 'rgba(8,4,14,0.35)';
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || !inView(e.x, e.y, 24)) continue;
      const hw = e.f1.w * e.scale * 0.35;
      ctx.fillRect(Math.round(e.x - camX - hw), Math.round(e.y - camY + e.f1.h * e.scale * 0.5 - 2), Math.round(hw * 2), 2);
    }
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || !inView(e.x, e.y, 24 * e.scale)) continue;
      const f = e.f2 && ((e.anim * 6) | 0) % 2 ? e.f2 : e.f1;
      const variant = e.flash > 0 ? 2 : e.flip ? 1 : 0;
      const bob = e.isStatic || e.f2 ? 0 : ((e.anim * 5) | 0) % 2;
      const sxp = variant === 0 ? f.x : variant === 1 ? f.fx : f.wx;
      const dw = f.w * e.scale, dh = f.h * e.scale;
      if (e.isElite) {
        ctx.globalAlpha = 0.5 + Math.sin(run.time * 6) * 0.2;
        ctx.strokeStyle = '#f5d351';
        ctx.beginPath(); ctx.ellipse(e.x - camX, e.y - camY + dh / 2 - 2, dw * 0.45, 4, 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(A, sxp, f.y, f.w, f.h, Math.round(e.x - camX - dw / 2), Math.round(e.y - camY - dh / 2 - bob), dw, dh);
      if (e.isBoss) this.drawPointerIfOffscreen(e, camX, camY, w, h, safe, '#d23b3b');
    }

    // Player
    const pf = pl.sprite;
    if (!(pl.iframes > 0 && pl.dash <= 0 && ((run.time * 20) | 0) % 2)) {
      ctx.fillStyle = 'rgba(8,4,14,0.4)';
      ctx.fillRect(Math.round(pl.x - camX - 5), Math.round(pl.y - camY + 7), 10, 2);
      const bob = pl.vx || pl.vy ? ((pl.anim * 8) | 0) % 2 : 0;
      atlas.draw(ctx, pf, pl.x - camX, pl.y - camY - bob, pl.flash > 0 ? 2 : pl.faceX < 0 ? 1 : 0);
    }
    // Player HP bar
    const hpw = 16, hpx = Math.round(pl.x - camX - hpw / 2), hpy = Math.round(pl.y - camY + 11);
    ctx.fillStyle = '#1b1324'; ctx.fillRect(hpx - 1, hpy - 1, hpw + 2, 4);
    ctx.fillStyle = '#7d1f2e'; ctx.fillRect(hpx, hpy, hpw, 2);
    ctx.fillStyle = '#d23b3b'; ctx.fillRect(hpx, hpy, Math.round(hpw * Math.max(0, pl.hp / pl.maxHp)), 2);

    // Orbiting blades
    for (const wpn of run.weapons) {
      if (wpn.def.kind !== 'orbit' || wpn.active <= 0) continue;
      const f = atlas.get(wpn.def.evolved ? 'halo' : 'blade');
      const R = 30 * wpn.fs.area;
      for (let i = 0; i < wpn.fs.amount; i++) {
        const a = wpn.angle + (i / wpn.fs.amount) * TAU;
        atlas.draw(ctx, f, pl.x + Math.cos(a) * R - camX, pl.y + Math.sin(a) * R - camY, 0, wpn.fs.area >= 1.5 ? 2 : 1);
      }
    }

    // Projectiles
    const shots = run.combat.shots;
    for (let i = 0; i < shots.length; i++) {
      const p = shots[i];
      if (!inView(p.x, p.y, 16)) continue;
      const f = p.sprite;
      if (p.rot || p.spin) {
        const c = Math.cos(p.rot), s = Math.sin(p.rot), sc = p.scale;
        ctx.setTransform(c * sc, s * sc, -s * sc, c * sc, Math.round(p.x - camX), Math.round(p.y - camY));
        ctx.drawImage(A, f.x, f.y, f.w, f.h, -f.w / 2, -f.h / 2, f.w, f.h);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        atlas.draw(ctx, f, p.x - camX, p.y - camY, 0, p.scale);
      }
    }
    const bl = run.combat.bullets;
    for (let i = 0; i < bl.length; i++) {
      const b = bl[i];
      if (inView(b.x, b.y, 8)) atlas.draw(ctx, b.spr, b.x - camX, b.y - camY);
    }

    // Shaped effects
    for (const f of run.fx.fx) {
      const k = f.t / f.dur;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = f.color;
      if (f.kind === 'zap') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(f.x - camX, f.y - camY);
        const segs = 5;
        for (let s = 1; s < segs; s++) {
          const t = s / segs;
          ctx.lineTo(f.x + (f.x2 - f.x) * t - camX + (Math.random() - 0.5) * 8, f.y + (f.y2 - f.y) * t - camY + (Math.random() - 0.5) * 4);
        }
        ctx.lineTo(f.x2 - camX, f.y2 - camY);
        ctx.stroke();
        ctx.lineWidth = 1;
      } else if (f.kind === 'slash') {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(f.x - camX, f.y - camY, f.r * (0.7 + k * 0.3), f.a - f.arc / 2, f.a + f.arc / 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(f.x - camX, f.y - camY, f.r * (0.45 + k * 0.3), f.a - f.arc / 2.5, f.a + f.arc / 2.5);
        ctx.stroke();
      } else if (f.kind === 'ring') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x - camX, f.y - camY, f.r * k, 0, TAU);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.globalAlpha = 1;
    }

    // Particles
    const parts = run.fx.particles;
    for (let i = 0; i < parts.length; i++) {
      const q = parts[i];
      ctx.fillStyle = q.color;
      ctx.fillRect(Math.round(q.x - camX), Math.round(q.y - camY), q.size, q.size);
    }

    // Lighting
    this.ensureVignette(w, h);
    ctx.drawImage(this.vignette, 0, 0);

    // Damage numbers (above lighting so they stay readable)
    for (const n of run.fx.numbers) {
      ctx.globalAlpha = Math.min(1, n.life * 3);
      if (typeof n.value === 'string') font.draw(ctx, n.value, n.x - camX, n.y - camY, n.color, 1, 0.5);
      else font.draw(ctx, formatNum(n.value), n.x - camX, n.y - camY, n.crit ? '#f5d351' : '#f2ecdc', 1, 0.5);
    }
    ctx.globalAlpha = 1;

    this.drawHud(run, w, h, safe, input);
  }

  // Pre-rendered translucent fire pool, cached per radius (no per-frame paths).
  zoneSprite(r, blue) {
    const key = (blue ? 'b' : 'o') + Math.round(r);
    let c = this.zoneCache && this.zoneCache.get(key);
    if (c) return c;
    if (!this.zoneCache) this.zoneCache = new Map();
    const R = Math.round(r);
    c = document.createElement('canvas');
    c.width = R * 2 + 2; c.height = Math.round(R * 1.5) + 2;
    const g = c.getContext('2d');
    g.globalAlpha = 0.3;
    g.fillStyle = blue ? '#4b8de0' : '#ec8a2e';
    g.beginPath(); g.ellipse(c.width / 2, c.height / 2, R, R * 0.75, 0, 0, TAU); g.fill();
    this.zoneCache.set(key, c);
    return c;
  }

  drawPointerIfOffscreen(o, camX, camY, w, h, safe, color) {
    const x = o.x - camX, y = o.y - camY;
    if (x > 0 && x < w && y > 0 && y < h) return;
    const cx = w / 2, cy = h / 2;
    const a = Math.atan2(y - cy, x - cx);
    const px = Math.max(6, Math.min(w - 6, cx + Math.cos(a) * w));
    const py = Math.max(safe.top + 20, Math.min(h - safe.bottom - 6, cy + Math.sin(a) * h));
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(a) * 5, py + Math.sin(a) * 5);
    ctx.lineTo(px + Math.cos(a + 2.5) * 4, py + Math.sin(a + 2.5) * 4);
    ctx.lineTo(px + Math.cos(a - 2.5) * 4, py + Math.sin(a - 2.5) * 4);
    ctx.fill();
  }

  drawHud(run, w, h, safe, input) {
    const ctx = this.ctx, top = safe.top + 2;
    // XP bar
    ctx.fillStyle = '#1b1324'; ctx.fillRect(0, top, w, 6);
    ctx.fillStyle = '#2a3f84'; ctx.fillRect(1, top + 1, w - 2, 4);
    ctx.fillStyle = '#7ff0e6'; ctx.fillRect(1, top + 1, Math.round((w - 2) * Math.min(1, run.xp / run.xpNext)), 4);
    font.draw(ctx, 'LV ' + run.level, safe.left + 3, top + 9, '#7ff0e6');
    font.draw(ctx, formatTime(run.time), w / 2, top + 9, '#f2ecdc', 2, 0.5);
    // Kills & gold (right side, leaving room for the pause button)
    // Keep clear of the DOM pause button (46 CSS px wide).
    const rx = w - safe.right - Math.ceil(54 * (this.cssToPx || 1)) - 4;
    font.draw(ctx, formatNum(run.kills), rx, top + 9, '#e9dfbd', 1, 1);
    font.draw(ctx, formatNum(run.gold), rx, top + 17, '#f5d351', 1, 1);
    atlas.draw(ctx, atlas.get('r_skull_e'), rx + 7, top + 11);
    atlas.draw(ctx, atlas.get('coin'), rx + 6, top + 19);

    // Owned weapons / passives
    let ix = safe.left + 3, iy = top + 18;
    for (const wpn of run.weapons) {
      const f = atlas.get(wpn.def.icon);
      ctx.drawImage(atlas.canvas, f.x, f.y, f.w, f.h, ix, iy, Math.min(f.w, 9), Math.min(f.h, 9));
      ix += 10;
    }
    ix = safe.left + 3; iy += 10;
    for (const id in run.passives) {
      const f = this.passiveIcon(id);
      ctx.drawImage(atlas.canvas, f.x, f.y, f.w, f.h, ix, iy, Math.min(f.w, 9), Math.min(f.h, 9));
      ix += 10;
    }

    // Boss bars
    let by = top + 40; // below the weapon / passive icon rows
    for (const b of run.bosses) {
      const bw = Math.min(150, w - 70), bx = Math.round(w / 2 - bw / 2);
      font.draw(ctx, b.def.name, w / 2, by, '#d23b3b', 1, 0.5);
      ctx.fillStyle = '#1b1324'; ctx.fillRect(bx - 1, by + 7, bw + 2, 5);
      ctx.fillStyle = '#d23b3b'; ctx.fillRect(bx, by + 8, Math.round(bw * Math.max(0, b.hp / b.maxHp)), 3);
      by += 16;
    }

    // Touch controls
    if (input && input.mode === 'touch') {
      const k = this.cssToPx;
      if (input.stickActive) {
        const s = input.stick;
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#f2ecdc';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(s.ox * k, s.oy * k, s.radius * k, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#f2ecdc';
        ctx.beginPath(); ctx.arc(s.x * k, s.y * k, 7, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      const d = input.dashButton, pl = run.player;
      const dx = d.x * k, dy = d.y * k, dr = d.r * k;
      ctx.globalAlpha = pl.charges > 0 ? 0.55 : 0.25;
      ctx.fillStyle = '#1b1324';
      ctx.beginPath(); ctx.arc(dx, dy, dr, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7ff0e6';
      ctx.beginPath(); ctx.arc(dx, dy, dr, 0, TAU); ctx.stroke();
      if (pl.charges < run.stats.dashCharges) {
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(dx, dy, dr - 2, -Math.PI / 2, -Math.PI / 2 + TAU * (pl.chargeT / run.dashCd)); ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.globalAlpha = 1;
      atlas.draw(ctx, atlas.get('boot'), dx, dy, 0, 1);
      if (run.stats.dashCharges > 1) font.draw(ctx, String(pl.charges), dx + dr - 4, dy + dr - 6, '#7ff0e6');
    } else if (run.stats.dashCharges) {
      // Small dash meter for keyboard / gamepad
      const pl = run.player;
      for (let i = 0; i < run.stats.dashCharges; i++) {
        ctx.fillStyle = i < pl.charges ? '#7ff0e6' : '#2a3f84';
        ctx.fillRect(safe.left + 3 + i * 6, h - safe.bottom - 6, 4, 3);
      }
    }
  }

  passiveIcon(id) {
    let f = this.icons[id];
    if (!f) {
      f = atlas.get(PASSIVE_ICONS[id]);
      this.icons[id] = f;
    }
    return f;
  }
}

const PASSIVE_ICONS = Object.fromEntries(Object.entries(PASSIVES).map(([k, v]) => [k, v.icon]));
