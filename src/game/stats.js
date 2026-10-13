// Player stat block. Every source (character, Shrine upgrades, relics,
// in-run passives) is a set of additive modifiers on top of BASE.

import { CHARACTERS } from '../data/characters.js';
import { PASSIVES } from '../data/passives.js';
import { SHOP, RELICS } from '../data/meta.js';

export const BASE = {
  might: 1, cooldown: 1, area: 1, duration: 1, projSpeed: 1, amount: 0,
  maxHp: 1, armor: 0, regen: 0, moveSpeed: 1, magnet: 1, luck: 1,
  growth: 1, greed: 1, crit: 0.05, critDmg: 2, revives: 0, rerolls: 0,
  skips: 0, banishes: 0, dashCharges: 1, dashCooldown: 1, choices: 3,
};

export const BASE_HP = 100;
export const BASE_SPEED = 62; // px / s
export const BASE_MAGNET = 30; // px
export const BASE_DASH_CD = 2.6; // s

function add(s, mods, times = 1) {
  if (!mods) return;
  for (const k in mods) s[k] = (s[k] || 0) + mods[k] * times;
}

// Stats that persist through the run (character + meta + relics).
export function metaStats(charId, profile) {
  const s = { ...BASE };
  add(s, CHARACTERS[charId].bonus);
  for (const item of SHOP) {
    const lvl = profile.shop[item.id] || 0;
    if (lvl) add(s, item.per, lvl);
  }
  for (const id of profile.equipped) {
    const r = RELICS[id];
    const stars = profile.relics[id] || 0;
    if (!r || !stars) continue;
    add(s, r.fixed);
    add(s, r.per, stars);
  }
  return s;
}

// Full stats = meta + passives owned in this run.
export function runStats(meta, passives) {
  const s = { ...meta };
  for (const id in passives) add(s, PASSIVES[id].per, passives[id]);
  s.cooldown = Math.max(0.35, s.cooldown);
  s.dashCooldown = Math.max(0.3, s.dashCooldown);
  s.maxHp = Math.max(0.3, s.maxHp);
  s.moveSpeed = Math.max(0.5, s.moveSpeed);
  s.crit = Math.min(0.8, s.crit);
  return s;
}
