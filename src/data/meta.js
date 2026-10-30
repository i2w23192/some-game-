// Meta-progression content: permanent shop upgrades, relics, feats and
// bounty templates. The rules that apply them live in src/meta/progression.js.

// ---- Shrine (permanent upgrades bought with gold) ----
// cost(level) = round(cost * growth ^ level)
export const SHOP = [
  { id: 'might', name: 'Might', icon: 'gauntlet', max: 10, cost: 120, growth: 1.45, per: { might: 0.05 }, text: '+5% damage' },
  { id: 'vitality', name: 'Vitality', icon: 'heart', max: 8, cost: 100, growth: 1.45, per: { maxHp: 0.1 }, text: '+10% max health' },
  { id: 'armor', name: 'Armor', icon: 'shield', max: 5, cost: 250, growth: 1.7, per: { armor: 1 }, text: '+1 armor' },
  { id: 'regen', name: 'Recovery', icon: 'cross', max: 5, cost: 180, growth: 1.6, per: { regen: 0.15 }, text: '+0.15 health/sec' },
  { id: 'haste', name: 'Haste', icon: 'tome', max: 6, cost: 220, growth: 1.6, per: { cooldown: -0.03 }, text: '-3% cooldown' },
  { id: 'reach', name: 'Area', icon: 'lens', max: 5, cost: 160, growth: 1.6, per: { area: 0.05 }, text: '+5% area' },
  { id: 'hourglass', name: 'Duration', icon: 'hourglass', max: 5, cost: 160, growth: 1.6, per: { duration: 0.08 }, text: '+8% duration' },
  { id: 'swiftness', name: 'Swiftness', icon: 'boot', max: 5, cost: 120, growth: 1.55, per: { moveSpeed: 0.05 }, text: '+5% move speed' },
  { id: 'magnet', name: 'Magnetism', icon: 'magnet', max: 5, cost: 90, growth: 1.5, per: { magnet: 0.2 }, text: '+20% pickup range' },
  { id: 'growth', name: 'Growth', icon: 'gem2', max: 10, cost: 150, growth: 1.4, per: { growth: 0.05 }, text: '+5% experience' },
  { id: 'greed', name: 'Greed', icon: 'coin', max: 10, cost: 140, growth: 1.4, per: { greed: 0.08 }, text: '+8% gold' },
  { id: 'luck', name: 'Luck', icon: 'clover', max: 5, cost: 200, growth: 1.6, per: { luck: 0.08 }, text: '+8% luck' },
  { id: 'crit', name: 'Precision', icon: 'star', max: 5, cost: 260, growth: 1.6, per: { crit: 0.02 }, text: '+2% critical chance' },
  { id: 'reroll', name: 'Reroll', icon: 'echo', max: 5, cost: 300, growth: 1.8, per: { rerolls: 1 }, text: '+1 reroll per run' },
  { id: 'skip', name: 'Skip', icon: 'boot', max: 3, cost: 150, growth: 2, per: { skips: 1 }, text: '+1 skip per run' },
  { id: 'banish', name: 'Banish', icon: 'lock', max: 3, cost: 400, growth: 2, per: { banishes: 1 }, text: '+1 banish per run' },
  { id: 'dash', name: 'Second Wind', icon: 'boot', max: 2, cost: 1500, growth: 3, per: { dashCharges: 1 }, text: '+1 dash charge' },
  { id: 'echo', name: 'Echo', icon: 'echo', max: 2, cost: 2500, growth: 4, per: { amount: 1 }, text: '+1 projectile / strike' },
  { id: 'revival', name: 'Revival', icon: 'r_feather_r', max: 2, cost: 1800, growth: 3, per: { revives: 1 }, text: '+1 revive per run' },
  { id: 'foresight', name: 'Foresight', icon: 'eye', max: 1, cost: 3000, growth: 1, per: { choices: 1 }, text: '+1 level-up choice' },
];

export function shopCost(item, level) {
  return Math.round(item.cost * Math.pow(item.growth, level));
}

// ---- Relics: found in boss chests, collected permanently, equipped in slots ----
export const RARITIES = {
  common: { name: 'Common', color: '#b8b2c8', weight: 60, dupeGold: 60 },
  rare: { name: 'Rare', color: '#4b8de0', weight: 28, dupeGold: 200 },
  epic: { name: 'Epic', color: '#a35ad8', weight: 10, dupeGold: 600 },
  legendary: { name: 'Legendary', color: '#f5b041', weight: 2, dupeGold: 1800 },
};
export const RELIC_MAX_STARS = 5;

// `per` applies once per star; `fixed` applies once when equipped.
export const RELICS = {
  ember_amulet: { name: 'Ember Amulet', icon: 'r_amulet_r', rarity: 'common', per: { might: 0.04 }, text: '+4% damage per star' },
  tide_amulet: { name: 'Tide Amulet', icon: 'r_amulet_b', rarity: 'common', per: { cooldown: -0.03 }, text: '-3% cooldown per star' },
  moss_amulet: { name: 'Moss Amulet', icon: 'r_amulet_g', rarity: 'common', per: { maxHp: 0.08 }, text: '+8% max health per star' },
  gilded_ring: { name: 'Gilded Ring', icon: 'r_ring_y', rarity: 'common', per: { greed: 0.08 }, text: '+8% gold per star' },
  pilgrim_candle: { name: 'Pilgrim Candle', icon: 'r_candle_w', rarity: 'common', per: { growth: 0.06 }, text: '+6% experience per star' },
  gnawed_skull: { name: 'Gnawed Skull', icon: 'r_skull_e', rarity: 'rare', per: { armor: 1 }, text: '+1 armor per star' },
  gale_feather: { name: 'Gale Feather', icon: 'r_feather_w', rarity: 'rare', per: { moveSpeed: 0.05, magnet: 0.1 }, text: '+5% speed, +10% pickup range per star' },
  ward_candle: { name: 'Ward Candle', icon: 'r_candle_b', rarity: 'rare', per: { regen: 0.2 }, text: '+0.2 health/sec per star' },
  seer_orb: { name: 'Seer Orb', icon: 'r_orb_c', rarity: 'rare', per: { area: 0.05 }, text: '+5% area per star' },
  void_ring: { name: 'Void Ring', icon: 'r_ring_p', rarity: 'epic', per: { crit: 0.03, critDmg: 0.1 }, text: '+3% crit, +10% crit damage per star' },
  tempest_orb: { name: 'Tempest Orb', icon: 'r_orb_p', rarity: 'epic', per: { projSpeed: 0.06, duration: 0.06 }, text: '+6% speed and duration per star' },
  misers_skull: { name: "Miser's Skull", icon: 'r_skull_y', rarity: 'epic', per: { greed: 0.12, luck: 0.05 }, text: '+12% gold, +5% luck per star' },
  phoenix_plume: { name: 'Phoenix Plume', icon: 'r_feather_r', rarity: 'legendary', fixed: { revives: 1 }, per: { maxHp: 0.05 }, text: '+1 revive. +5% max health per star' },
  twin_moon: { name: 'Twin Moon Band', icon: 'r_ring_c', rarity: 'legendary', fixed: { amount: 1 }, per: { might: 0.03 }, text: '+1 projectile. +3% damage per star' },
  eclipse_core: { name: 'Eclipse Core', icon: 'r_orb_k', rarity: 'legendary', per: { might: 0.08, cooldown: -0.04 }, text: '+8% damage, -4% cooldown per star' },
  sunheart: { name: 'Sunheart', icon: 'r_orb_o', rarity: 'legendary', fixed: { dashCharges: 1 }, per: { might: 0.06 }, text: '+1 dash charge. +6% damage per star' },
};

export const BASE_RELIC_SLOTS = 1;

// ---- Difficulty modes (picked per run, stack with Nightfall) ----
// unlock: null = always; 'win' = any win; 'nightmare' = a win on Nightmare.
export const DIFFICULTIES = {
  easy: { name: 'Easy', color: '#63c55b', hp: 0.6, dmg: 0.6, speed: 0.92, density: 0.8, gold: 0.6, legendary: 0, unlock: null, desc: 'Weaker enemies, less gold. Learn the ropes.' },
  normal: { name: 'Normal', color: '#f2ecdc', hp: 1, dmg: 1, speed: 1, density: 1, gold: 1, legendary: 0, unlock: null, desc: 'The intended challenge.' },
  hard: { name: 'Hard', color: '#ec8a2e', hp: 1.6, dmg: 1.3, speed: 1.06, density: 1.15, gold: 1.6, legendary: 1, unlock: null, desc: 'Tougher, faster hordes. +60% gold.' },
  nightmare: { name: 'Nightmare', color: '#d23b3b', hp: 2.4, dmg: 1.45, speed: 1.1, density: 1.3, gold: 2.6, legendary: 2, unlock: 'win', desc: 'For finished builds. +160% gold, better relics.' },
  hell: { name: 'Hell', color: '#a35ad8', hp: 4, dmg: 1.85, speed: 1.15, density: 1.45, gold: 4.5, legendary: 4, unlock: 'nightmare', desc: 'Absolute carnage. +350% gold, best relic odds.' },
};
export const DIFFICULTY_IDS = Object.keys(DIFFICULTIES);

// ---- Nightfall (ascension difficulty) ----
export const NIGHTFALL_MAX = 15;
export function nightfallMods(n) {
  return {
    hp: 1 + 0.15 * n,
    dmg: 1 + 0.08 * n,
    speed: 1 + 0.02 * n,
    density: 1 + 0.04 * n,
    gold: 1 + 0.2 * n,
    legendary: 0.5 * n, // extra legendary relic weight
  };
}

// ---- Feats (achievements). Checked after every run. ----
// check(p, r): p = profile, r = finished run summary (or null).
// progress(p): [current, target] for the progress bar, optional.
export const FEATS = [
  { id: 'reach5', name: 'First Light', desc: 'Survive 5 minutes.', check: (p, r) => r && r.time >= 300, reward: { char: 'huntress' } },
  { id: 'boss1', name: 'Giant Slayer', desc: 'Defeat a boss.', check: (p) => p.stats.bossKills >= 1, reward: { char: 'stormcaller', weapon: 'lightning', relicSlot: 1 } },
  { id: 'reach10', name: 'Long Night', desc: 'Survive 10 minutes.', check: (p, r) => r && r.time >= 600, reward: { char: 'pyromancer', weapon: 'firebomb' } },
  { id: 'kills2k', name: 'Grave Digger', desc: 'Defeat 2,000 enemies in total.', check: (p) => p.stats.kills >= 2000, progress: (p) => [p.stats.kills, 2000], reward: { char: 'berserker', weapon: 'axe' } },
  { id: 'evolve1', name: 'Transmutation', desc: 'Evolve a weapon.', check: (p) => p.stats.evolutions >= 1, reward: { char: 'blademaster' } },
  { id: 'level30', name: 'Ascendant', desc: 'Reach level 30 in a single run.', check: (p, r) => r && r.level >= 30, reward: { char: 'plaguebearer' } },
  { id: 'reach15', name: 'Deeper Dark', desc: 'Survive 15 minutes.', check: (p, r) => r && r.time >= 900, reward: { map: 'crypt' } },
  { id: 'win1', name: 'Dawnbreaker', desc: 'Defeat the Ashen Lord in Gravewood.', check: (p) => !!p.wins.gravewood, reward: { char: 'gravekeeper', weapon: 'scythe', endless: true, nightfall: true, relicSlot: 1 } },
  { id: 'win_crypt', name: 'Crypt Breaker', desc: 'Win in the Sunken Crypt.', check: (p) => !!p.wins.crypt, reward: { map: 'ashen' } },
  { id: 'win_ashen', name: 'Ember Walker', desc: 'Win in the Ashen Wastes.', check: (p) => !!p.wins.ashen, reward: { relicSlot: 1, gold: 5000, map: 'frozen' } },
  { id: 'win_frozen', name: 'Thaw', desc: 'Win in the Frozen Cathedral.', check: (p) => !!p.wins.frozen, reward: { map: 'blood', gold: 10000 } },
  { id: 'win_blood', name: 'Bloodbound', desc: 'Win in the Blood Marsh.', check: (p) => !!p.wins.blood, reward: { map: 'abyss', gold: 20000 } },
  { id: 'win_abyss', name: 'Abyss Walker', desc: 'Win in The Abyss.', check: (p) => !!p.wins.abyss, reward: { gold: 75000 } },
  { id: 'win_hard', name: 'Hardened', desc: 'Win on Hard difficulty.', check: (p) => (p.stats.bestDifficultyWin || 0) >= 2, reward: { gold: 3000 } },
  { id: 'win_nightmare', name: 'Nightmare Slayer', desc: 'Win on Nightmare difficulty. Unlocks Hell.', check: (p) => (p.stats.bestDifficultyWin || 0) >= 3, reward: { gold: 15000 } },
  { id: 'win_hell', name: 'Hellwalker', desc: 'Win on Hell difficulty.', check: (p) => (p.stats.bestDifficultyWin || 0) >= 4, reward: { gold: 50000 } },
  { id: 'nf5', name: 'Nightwalker', desc: 'Win at Nightfall 5 or higher.', check: (p) => p.stats.bestNightfallWin >= 5, reward: { relicSlot: 1 } },
  { id: 'nf10', name: 'Eternal Night', desc: 'Win at Nightfall 10 or higher.', check: (p) => p.stats.bestNightfallWin >= 10, reward: { gold: 20000 } },
  { id: 'nf15', name: 'Abyss Gazer', desc: 'Win at Nightfall 15.', check: (p) => p.stats.bestNightfallWin >= 15, reward: { gold: 60000 } },
  { id: 'evolve4', name: 'Arsenal', desc: 'Have 4 evolved weapons in one run.', check: (p, r) => r && r.evolved >= 4, reward: { gold: 3000 } },
  { id: 'kills25k', name: 'Reaper', desc: 'Defeat 25,000 enemies in total.', check: (p) => p.stats.kills >= 25000, progress: (p) => [p.stats.kills, 25000], reward: { gold: 4000 } },
  { id: 'kills250k', name: 'Extinction', desc: 'Defeat 250,000 enemies in total.', check: (p) => p.stats.kills >= 250000, progress: (p) => [p.stats.kills, 250000], reward: { gold: 40000 } },
  { id: 'onerun3k', name: 'Massacre', desc: 'Defeat 3,000 enemies in one run.', check: (p, r) => r && r.kills >= 3000, reward: { gold: 1500 } },
  { id: 'endless30', name: 'Unending', desc: 'Survive 30 minutes in Endless.', check: (p, r) => r && r.mode === 'endless' && r.time >= 1800, reward: { gold: 6000 } },
  { id: 'endless40', name: 'Beyond Time', desc: 'Survive 40 minutes in Endless.', check: (p, r) => r && r.mode === 'endless' && r.time >= 2400, reward: { gold: 25000 } },
  { id: 'relics8', name: 'Collector', desc: 'Discover 8 different relics.', check: (p) => Object.keys(p.relics).length >= 8, progress: (p) => [Object.keys(p.relics).length, 8], reward: { gold: 2500 } },
  { id: 'relics16', name: 'Curator', desc: 'Discover every relic.', check: (p) => Object.keys(p.relics).length >= 16, progress: (p) => [Object.keys(p.relics).length, 16], reward: { gold: 15000 } },
  { id: 'chars4', name: 'Company of Four', desc: 'Win with 4 different characters.', check: (p) => Object.keys(p.charWins).length >= 4, progress: (p) => [Object.keys(p.charWins).length, 4], reward: { gold: 8000 } },
  { id: 'shop50', name: 'Devoted', desc: 'Buy 50 Shrine upgrade levels.', check: (p) => Object.values(p.shop).reduce((a, b) => a + b, 0) >= 50, progress: (p) => [Object.values(p.shop).reduce((a, b) => a + b, 0), 50], reward: { gold: 5000 } },
  { id: 'nodamage5', name: 'Untouchable', desc: 'Survive 5 minutes without taking damage.', check: (p, r) => r && r.firstHitAt >= 300, reward: { gold: 1200 } },
];

// ---- Bounties: offline "daily-style" contracts that refresh as you play ----
// Each template builds a concrete bounty from an rng and the profile.
export const BOUNTY_TEMPLATES = [
  { type: 'kills', make: (rng) => { const n = [600, 1000, 1500, 2500][Math.floor(rng() * 4)]; return { target: n, text: `Defeat ${n} enemies in one run`, reward: Math.round(n * 0.5) }; } },
  { type: 'time', make: (rng) => { const m = [6, 9, 12, 16][Math.floor(rng() * 4)]; return { target: m * 60, text: `Survive ${m} minutes`, reward: m * 45 }; } },
  { type: 'level', make: (rng) => { const l = [15, 22, 30, 38][Math.floor(rng() * 4)]; return { target: l, text: `Reach level ${l}`, reward: l * 18 }; } },
  { type: 'bosses', make: (rng) => { const b = 1 + Math.floor(rng() * 3); return { target: b, text: `Defeat ${b} boss${b > 1 ? 'es' : ''} in one run`, reward: 300 * b, relic: b >= 3 }; } },
  { type: 'gold', make: (rng) => { const g = [150, 300, 500][Math.floor(rng() * 3)]; return { target: g, text: `Collect ${g} gold in one run`, reward: Math.round(g * 1.2) }; } },
  { type: 'elites', make: (rng) => { const e = [3, 6, 10][Math.floor(rng() * 3)]; return { target: e, text: `Defeat ${e} elites in one run`, reward: e * 70 }; } },
  { type: 'evolve', make: (rng) => { const e = 1 + Math.floor(rng() * 2); return { target: e, text: `Evolve ${e} weapon${e > 1 ? 's' : ''} in one run`, reward: 450 * e, relic: e >= 2 }; } },
  { type: 'char', needsChar: true, make: (rng, ch, chName) => { const m = [8, 12][Math.floor(rng() * 2)]; return { target: m * 60, char: ch, text: `Survive ${m} min as ${chName}`, reward: m * 70 }; } },
];
