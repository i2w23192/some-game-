// Skill rarities. Every weapon and passive has one. Rarer skills are offered
// less often in level-ups (weight) but are far stronger. Luck raises the
// odds of the non-common tiers.

export const RARITY = {
  common: { name: 'Common', color: '#b8b2c8', weight: 1 },
  rare: { name: 'Rare', color: '#4b8de0', weight: 0.6 },
  epic: { name: 'Epic', color: '#a35ad8', weight: 0.35 },
  legendary: { name: 'Legendary', color: '#f5b041', weight: 0.12 },
};

export function rarityWeight(rarity, luck = 1) {
  const r = RARITY[rarity] || RARITY.common;
  return rarity === 'common' ? r.weight : r.weight * (1 + (luck - 1) * 2);
}
