// Secret gift codes, redeemed from Settings. Codes are stored only as hashes
// so they don't show up as plain text in the game files.

import { SHOP, RELICS, FEATS, NIGHTFALL_MAX } from '../data/meta.js';
import { MAP_IDS } from '../data/maps.js';
import { CHARACTER_IDS } from '../data/characters.js';
import { relicSlots } from './progression.js';

export const DEV_GIFT_GOLD = 92871017;
export const ADMIN_GOLD = 999999999;

// The admin code is checked with a salted SHA-256, so the code itself
// can't be recovered from these files.
const ADMIN_SALT = '06779e8275e0a627a9ce55b9';
const ADMIN_HASH = 'b30ec42e6a066aafe720ef7900e917933e2306d7fbe39a9a3008ae1236ec64f3';

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Admin mode: max every Shrine upgrade, unlock every feat (so every
// character, weapon, map and mode), every relic at max stars, Nightfall
// fully open, and a mountain of gold.
export function applyAdmin(p) {
  for (const item of SHOP) p.shop[item.id] = item.max;
  for (const f of FEATS) if (!p.feats[f.id]) p.feats[f.id] = Date.now();
  for (const id in RELICS) p.relics[id] = 5;
  for (const m of MAP_IDS) { p.nightfall[m] = NIGHTFALL_MAX; p.wins[m] = Math.max(1, p.wins[m] || 0); }
  for (const c of CHARACTER_IDS) p.charWins[c] = Math.max(1, p.charWins[c] || 0);
  const order = Object.keys(RELICS).sort((a, b) => rank(RELICS[b].rarity) - rank(RELICS[a].rarity));
  p.equipped = order.slice(0, relicSlots(p));
  p.stats.wins = Math.max(1, p.stats.wins);
  p.stats.bestDifficultyWin = 4; // every difficulty open
  p.gold = Math.max(p.gold, ADMIN_GOLD);
  p.admin = true;
  return 'ADMIN MODE: everything maxed out.';
}

const rank = (r) => ({ common: 0, rare: 1, epic: 2, legendary: 3 })[r] || 0;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

const CODES = {
  // The dev gift: tops your gold up to 92,871,017. Can be used again.
  '5yb42a': (p) => {
    const add = Math.max(0, DEV_GIFT_GOLD - p.gold);
    p.gold += add;
    return add ? `A gift from the devs: +${add.toLocaleString()} gold!` : 'Your purse is already overflowing.';
  },
};

// Returns a message for the player, or null if the code is wrong.
export async function redeemCode(p, code) {
  const norm = String(code).trim().toUpperCase().replace(/\s+/g, '');
  if (norm && crypto.subtle && (await sha256(ADMIN_SALT + '|' + norm)) === ADMIN_HASH) return applyAdmin(p);
  const fn = CODES[hash(norm)];
  return fn ? fn(p) : null;
}

export const _hash = hash;
