// Rules for permanent progress: unlocks, end-of-run rewards, feats, relic
// drops, bounties and the Shrine. Pure functions over the profile object.

import { CHARACTERS, CHARACTER_IDS } from '../data/characters.js';
import { MAPS } from '../data/maps.js';
import {
  SHOP, shopCost, RELICS, RARITIES, RELIC_MAX_STARS, BASE_RELIC_SLOTS,
  FEATS, BOUNTY_TEMPLATES, NIGHTFALL_MAX, nightfallMods, DIFFICULTIES, DIFFICULTY_IDS,
} from '../data/meta.js';
import { addToLeaderboard } from './leaderboard.js';
import { seededRng, weighted } from '../core/math.js';

// Legendary weapons are always in the pool; their rarity keeps them scarce.
export const STARTING_WEAPONS = ['bolt', 'knife', 'orbit', 'aura', 'starfall', 'maw'];

// ---------------------------------------------------------------- unlocks
function featRewards(p) {
  const out = [];
  for (const f of FEATS) if (p.feats[f.id]) out.push(f.reward);
  return out;
}

export function isCharUnlocked(p, id) {
  const u = CHARACTERS[id].unlock;
  return !u || !!p.feats[u];
}

export function weaponPool(p, charId) {
  const pool = new Set(STARTING_WEAPONS);
  for (const r of featRewards(p)) if (r.weapon) pool.add(r.weapon);
  if (charId) pool.add(CHARACTERS[charId].weapon);
  return [...pool];
}

export function isMapUnlocked(p, id) {
  if (id === 'gravewood') return true;
  return featRewards(p).some((r) => r.map === id);
}

export const endlessUnlocked = (p) => featRewards(p).some((r) => r.endless);
export const nightfallUnlocked = (p) => featRewards(p).some((r) => r.nightfall);

export function isDifficultyUnlocked(p, id) {
  const u = DIFFICULTIES[id].unlock;
  if (!u) return true;
  if (u === 'win') return p.stats.wins > 0 || Object.values(p.wins).some((n) => n > 0);
  if (u === 'nightmare') return (p.stats.bestDifficultyWin || 0) >= DIFFICULTY_IDS.indexOf('nightmare');
  return false;
}

export function relicSlots(p) {
  let n = BASE_RELIC_SLOTS;
  for (const r of featRewards(p)) if (r.relicSlot) n += r.relicSlot;
  return n;
}

export function maxNightfall(p, mapId) {
  if (!nightfallUnlocked(p)) return 0;
  return Math.min(NIGHTFALL_MAX, p.nightfall[mapId] || 0);
}

// What a feat unlocks, as display text.
export function rewardText(r) {
  const parts = [];
  if (r.char) parts.push(`Character: ${CHARACTERS[r.char].name}`);
  if (r.weapon) parts.push(`Weapon: ${r.weapon === 'lightning' ? 'Storm Call' : r.weapon === 'firebomb' ? 'Firebomb' : r.weapon === 'axe' ? 'Hurled Axe' : "Reaper's Arc"}`);
  if (r.map) parts.push(`Map: ${MAPS[r.map].name}`);
  if (r.endless) parts.push('Endless mode');
  if (r.nightfall) parts.push('Nightfall difficulty');
  if (r.relicSlot) parts.push('+1 relic slot');
  if (r.gold) parts.push(`${r.gold} gold`);
  return parts.join(' · ');
}

// ---------------------------------------------------------------- relics
export function rollRelic(p, nightfall = 0, luck = 1) {
  const nf = nightfallMods(nightfall);
  const rar = weighted(Object.entries(RARITIES).map(([k, v]) => {
    let w = v.weight;
    if (k === 'legendary') w += nf.legendary + (luck - 1) * 3;
    if (k === 'epic') w += (luck - 1) * 6;
    return [k, w];
  }));
  const ids = Object.keys(RELICS).filter((id) => RELICS[id].rarity === rar);
  const id = ids[Math.floor(Math.random() * ids.length)];
  const stars = p.relics[id] || 0;
  const res = { id, rarity: rar, isNew: !stars, stars: stars, dupeGold: 0 };
  if (stars >= RELIC_MAX_STARS) {
    res.dupeGold = RARITIES[rar].dupeGold;
    p.gold += res.dupeGold;
  } else {
    p.relics[id] = stars + 1;
    res.stars = stars + 1;
    // Auto-equip into a free slot so new finds are felt immediately.
    if (!stars && p.equipped.length < relicSlots(p)) p.equipped.push(id);
  }
  p.stats.relicsFound++;
  return res;
}

export function toggleEquip(p, id) {
  const i = p.equipped.indexOf(id);
  if (i >= 0) { p.equipped.splice(i, 1); return true; }
  if (!p.relics[id] || p.equipped.length >= relicSlots(p)) return false;
  p.equipped.push(id);
  return true;
}

// ---------------------------------------------------------------- shrine
export function buyUpgrade(p, id) {
  const item = SHOP.find((s) => s.id === id);
  const lvl = p.shop[id] || 0;
  if (!item || lvl >= item.max) return false;
  const cost = shopCost(item, lvl);
  if (p.gold < cost) return false;
  p.gold -= cost;
  p.shop[id] = lvl + 1;
  return true;
}

export function refundAll(p) {
  let back = 0;
  for (const item of SHOP) {
    const lvl = p.shop[item.id] || 0;
    for (let i = 0; i < lvl; i++) back += shopCost(item, i);
  }
  p.gold += back;
  p.shop = {};
  return back;
}

// ---------------------------------------------------------------- bounties
export function ensureBounties(p) {
  while (p.bounties.length < 3) p.bounties.push(makeBounty(p));
}

function makeBounty(p) {
  const rng = seededRng(p.bountySeed++ * 7919);
  const chars = CHARACTER_IDS.filter((c) => isCharUnlocked(p, c));
  const existing = new Set(p.bounties.map((b) => b.type));
  let tpl;
  for (let i = 0; i < 10; i++) {
    tpl = BOUNTY_TEMPLATES[Math.floor(rng() * BOUNTY_TEMPLATES.length)];
    if (!existing.has(tpl.type)) break;
  }
  const ch = chars[Math.floor(rng() * chars.length)];
  const b = tpl.make(rng, ch, CHARACTERS[ch].name);
  // Rewards grow with long-term progress so bounties stay worth doing.
  const scale = 1 + Math.min(4, p.stats.runs / 40);
  return { type: tpl.type, target: b.target, char: b.char || null, text: b.text, reward: Math.round(b.reward * scale), relic: !!b.relic, done: false };
}

function bountyMet(b, r) {
  switch (b.type) {
    case 'kills': return r.kills >= b.target;
    case 'time': return r.time >= b.target;
    case 'level': return r.level >= b.target;
    case 'bosses': return r.bosses >= b.target;
    case 'gold': return r.gold >= b.target;
    case 'elites': return r.elites >= b.target;
    case 'evolve': return r.evolutions >= b.target;
    case 'char': return r.char === b.char && r.time >= b.target;
  }
  return false;
}

export function claimBounty(p, i) {
  const b = p.bounties[i];
  if (!b || !b.done) return null;
  p.gold += b.reward;
  p.stats.goldEarned += b.reward;
  const out = { gold: b.reward, relic: null };
  if (b.relic) out.relic = rollRelic(p, 0, 1.5);
  p.bounties.splice(i, 1);
  ensureBounties(p);
  return out;
}

export function rerollBounty(p, i) {
  if (p.bountyRerolls <= 0 || !p.bounties[i] || p.bounties[i].done) return false;
  p.bountyRerolls--;
  p.bounties.splice(i, 1, makeBounty(p));
  return true;
}

// ---------------------------------------------------------------- feats
export function checkFeats(p, r) {
  const got = [];
  for (const f of FEATS) {
    if (p.feats[f.id]) continue;
    if (f.check(p, r)) {
      p.feats[f.id] = Date.now();
      if (f.reward.gold) { p.gold += f.reward.gold; p.stats.goldEarned += f.reward.gold; }
      got.push(f);
    }
  }
  return got;
}

// ---------------------------------------------------------------- run end
// Applies a finished (or interrupted) run to the profile. Returns a report
// for the results screen.
export function applyRun(p, r) {
  const report = { gold: r.gold, feats: [], bounties: [], relic: null, records: [], score: 0, rank: 0 };
  p.gold += r.gold;
  const s = p.stats;
  s.goldEarned += r.gold;
  s.kills += r.kills;
  s.runs++;
  s.bossKills += r.bosses;
  s.evolutions += r.evolutions;
  s.playTime += r.time;
  if (r.level > s.bestLevel) s.bestLevel = r.level;
  if (r.kills > s.bestKillsRun) s.bestKillsRun = r.kills;

  if (r.mode === 'endless') {
    if (r.time > (p.bestEndless[r.map] || 0)) { p.bestEndless[r.map] = r.time; report.records.push('New Endless record!'); }
  } else if (r.time > (p.best[r.map] || 0)) {
    p.best[r.map] = r.time;
    if (!r.victory) report.records.push('New best time!');
  }

  if (r.victory) {
    s.wins++;
    p.wins[r.map] = (p.wins[r.map] || 0) + 1;
    p.charWins[r.char] = (p.charWins[r.char] || 0) + 1;
    if (r.nightfall > s.bestNightfallWin) s.bestNightfallWin = r.nightfall;
    const di = DIFFICULTY_IDS.indexOf(r.difficulty || 'normal');
    if (di > (s.bestDifficultyWin || 0)) s.bestDifficultyWin = di;
    const cur = p.nightfall[r.map] || 0;
    if (r.nightfall >= cur && cur < NIGHTFALL_MAX) {
      p.nightfall[r.map] = r.nightfall + 1;
      if (r.nightfall > 0 || nightfallUnlocked(p)) report.records.push(`Nightfall ${r.nightfall + 1} unlocked on ${MAPS[r.map].name}`);
    }
    report.relic = rollRelic(p, r.nightfall + (DIFFICULTIES[r.difficulty] ? DIFFICULTIES[r.difficulty].legendary * 2 : 0), 1.3);
  }

  const lb = addToLeaderboard(p, r);
  report.score = lb.entry.score;
  report.rank = lb.rank;
  if (lb.rank && lb.rank <= 10) report.records.push(`Leaderboard: #${lb.rank} ${r.mode === 'endless' ? 'Endless' : 'Standard'} run!`);

  for (const b of p.bounties) {
    if (!b.done && bountyMet(b, r)) { b.done = true; report.bounties.push(b); }
  }
  p.bountyRerolls = 1;
  report.feats = checkFeats(p, r);
  ensureBounties(p);
  return report;
}
