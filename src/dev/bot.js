// Test harness (only active with URL parameters, never in normal play).
//   ?bot=1        autopilot that kites enemies and auto-picks upgrades
//   &god=1        player cannot die
//   &speed=4      simulation speed multiplier
//   &char=warden&map=gravewood&mode=standard   auto-start a run
//   &stress=1     late-game stress test: max build, minute 20, cap 500
// Results are exposed on window.__botStats for automated tests.

import { WEAPONS, BASE_WEAPONS, MAX_WEAPON_LEVEL } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';

export function installDevTools(game) {
  const q = new URLSearchParams(location.search);
  if (!q.has('bot') && !q.has('stress')) return;
  const god = q.get('god') === '1';
  const stress = q.get('stress') === '1';
  game.simSpeed = Math.max(1, Math.min(16, parseInt(q.get('speed') || '1', 10)));
  const stats = (window.__botStats = { runs: 0, levelUps: 0, chests: 0, log: [] });

  game.onRunStart = (run) => {
    run.autopilot = autopilot;
    const hooks = run.hooks;
    hooks.levelUp = (choices) => { stats.levelUps++; run.resolveLevelUp(pickChoice(run, choices)); };
    hooks.chest = (data) => { stats.chests++; stats.log.push(`chest ${run.time.toFixed(0)}s ${data.rewards.map((r) => r.type + ':' + (r.id || r.amount)).join(',')}`); run.closeChest(); };
    hooks.boss = (name) => stats.log.push(`boss ${name} @${run.time.toFixed(0)}s`);
    const end = hooks.end;
    hooks.end = (s) => { stats.runs++; stats.last = s; end(s); };
    if (god) {
      const hurt = run.hurtPlayer.bind(run);
      run.hurtPlayer = (d) => { const pl = run.player; pl.hp = Math.max(pl.hp, d + 1); hurt(d); };
    }
    if (stress) setupStress(run);
  };

  const params = {
    char: q.get('char') || 'warden',
    map: q.get('map') || 'gravewood',
    mode: q.get('mode') || 'standard',
    nightfall: parseInt(q.get('nf') || '0', 10),
    difficulty: q.get('diff') || 'normal',
  };
  if (stress) game.profile.settings.maxEnemies = 500;
  setTimeout(() => game.startRun(params), 50);
}

// Late-game stress: every weapon evolved, minute 20 waves, high enemy cap.
function setupStress(run) {
  run.weapons.length = 0;
  for (const id of ['bolt', 'knife', 'axe', 'aura', 'lightning', 'firebomb']) {
    const w = run.addWeapon(id);
    const ev = WEAPONS[id].evolve;
    w.id = ev.into; w.def = WEAPONS[ev.into]; w.level = MAX_WEAPON_LEVEL;
  }
  for (const id of ['might', 'haste', 'vitality', 'reach', 'echo', 'armor']) run.passives[id] = PASSIVES[id].max;
  run.refreshStats();
  run.player.hp = run.player.maxHp;
  run.cap = 500;
  run.capLimit = 500;
  run.time = 20 * 60;
  const d = run.director;
  d.bossIdx = d.map.bosses.findIndex((b) => b.at > 20);
  d.eventIdx = d.map.events.findIndex((e) => e.at > 20);
  if (d.eventIdx < 0) d.eventIdx = d.map.events.length;
}

// Priority: evolution partners > upgrading owned weapons > new weapons > passives.
function pickChoice(run, choices) {
  let best = choices[0], bestScore = -1;
  for (const c of choices) {
    let s = 1;
    if (c.type === 'passive' && run.weapons.some((w) => w.def.evolve && w.def.evolve.passive === c.id)) s = 5;
    else if (c.type === 'weapon' && c.level > 1) s = 4;
    else if (c.type === 'weapon' && BASE_WEAPONS.includes(c.id)) s = 3;
    else if (c.type === 'passive') s = 2;
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
}

// Steer away from nearby enemies, toward gems and chests.
function autopilot(run) {
  const pl = run.player;
  let fx = 0, fy = 0;
  const near = run.enemies.query(pl.x, pl.y, 70);
  for (const e of near) {
    const dx = pl.x - e.x, dy = pl.y - e.y, d2 = dx * dx + dy * dy + 1;
    const w = (e.isBoss ? 4 : 1) * 900 / d2;
    fx += dx * w / Math.sqrt(d2); fy += dy * w / Math.sqrt(d2);
  }
  for (const b of run.combat.bullets) {
    const dx = pl.x - b.x, dy = pl.y - b.y, d2 = dx * dx + dy * dy + 1;
    if (d2 < 2500) { fx += dx * 600 / d2 / Math.sqrt(d2); fy += dy * 600 / d2 / Math.sqrt(d2); }
  }
  // Attraction: items first, then the closest gem.
  let target = null, td = Infinity;
  for (const it of run.items) {
    const d = Math.hypot(it.x - pl.x, it.y - pl.y);
    if (d < td && d < 250) { td = d; target = it; }
  }
  if (!target) {
    for (let i = 0; i < run.gems.length; i += 3) {
      const g = run.gems[i];
      const d = Math.hypot(g.x - pl.x, g.y - pl.y);
      if (d < td) { td = d; target = g; }
    }
  }
  // Engage bosses at mid range like a player would.
  const boss = run.bosses[0];
  if (boss) {
    const bd = Math.hypot(boss.x - pl.x, boss.y - pl.y);
    if (bd > 150) { fx += (boss.x - pl.x) / bd * 0.7; fy += (boss.y - pl.y) / bd * 0.7; }
  }
  if (target && td > 2) { fx += (target.x - pl.x) / td * 0.8; fy += (target.y - pl.y) / td * 0.8; }
  // Gentle orbit so the bot keeps moving.
  fx += Math.cos(run.time * 0.3) * 0.3; fy += Math.sin(run.time * 0.3) * 0.3;
  const l = Math.hypot(fx, fy) || 1;
  if (near.length > 6 && pl.charges > 0 && run.input) run.input.dashQueued = true;
  return [fx / l, fy / l];
}
