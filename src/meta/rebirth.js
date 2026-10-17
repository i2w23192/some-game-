// Rebirth (prestige): trade your gold and Shrine upgrades for Soul Embers,
// which give permanent bonuses to every future run. Relics, characters,
// maps, feats, records and Nightfall progress are kept.

export const REBIRTH_MIN_GOLD = 20000; // gold earned since the last rebirth
export const EMBER_BONUS = { might: 0.03, maxHp: 0.03, greed: 0.05, growth: 0.03 };

export function goldSinceRebirth(p) {
  return Math.max(0, p.stats.goldEarned - (p.rebirth.base || 0));
}

// Square-root curve: 20k -> 3, 50k -> 5, 500k -> 15, 5M -> 50 embers.
export function embersForRebirth(p) {
  const g = goldSinceRebirth(p);
  return g < REBIRTH_MIN_GOLD ? 0 : Math.floor(Math.sqrt(g / 2000));
}

export function canRebirth(p) {
  return embersForRebirth(p) > 0;
}

export function doRebirth(p) {
  const gain = embersForRebirth(p);
  if (!gain) return 0;
  p.rebirth.embers += gain;
  p.rebirth.count += 1;
  p.rebirth.base = p.stats.goldEarned;
  p.gold = 0;
  p.shop = {};
  return gain;
}

// Roman numeral title shown on the title screen, e.g. "Reborn III".
export function rebirthTitle(n) {
  if (!n) return '';
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return 'Reborn ' + out;
}
