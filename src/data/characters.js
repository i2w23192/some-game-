// Playable characters. `bonus` uses the same keys as passive/meta stats.
// `unlock` names the feat that unlocks them (see src/data/feats.js).

export const CHARACTERS = {
  warden: {
    name: 'The Warden', weapon: 'bolt',
    desc: 'A steady keeper of the light.', perk: '+10% damage',
    bonus: { might: 0.1 },
  },
  huntress: {
    name: 'Huntress', weapon: 'knife', unlock: 'reach5',
    desc: 'Swift and hard to pin down.', perk: '+12% speed, dash recharges 30% faster',
    bonus: { moveSpeed: 0.12, dashCooldown: -0.3 },
  },
  berserker: {
    name: 'Berserker', weapon: 'axe', unlock: 'kills2k',
    desc: 'Heavy, slow and very angry.', perk: '+30% max HP, +10% damage, -8% speed',
    bonus: { maxHp: 0.3, might: 0.1, moveSpeed: -0.08 },
  },
  pyromancer: {
    name: 'Pyromancer', weapon: 'firebomb', unlock: 'reach10',
    desc: 'Everything burns eventually.', perk: '+15% area, -10% max HP',
    bonus: { area: 0.15, maxHp: -0.1 },
  },
  plaguebearer: {
    name: 'Plaguebearer', weapon: 'aura', unlock: 'level30',
    desc: 'Walks through crowds untouched.', perk: '+40% max HP, +1 armor, -10% speed',
    bonus: { maxHp: 0.4, armor: 1, moveSpeed: -0.1 },
  },
  stormcaller: {
    name: 'Stormcaller', weapon: 'lightning', unlock: 'boss1',
    desc: 'Fragile, but the sky obeys.', perk: '-12% cooldown, +5% crit, -15% max HP',
    bonus: { cooldown: -0.12, crit: 0.05, maxHp: -0.15 },
  },
  blademaster: {
    name: 'Blademaster', weapon: 'orbit', unlock: 'evolve1',
    desc: 'A dancer surrounded by steel.', perk: '+20% duration, +10% speed',
    bonus: { duration: 0.2, moveSpeed: 0.1 },
  },
  gravekeeper: {
    name: 'Gravekeeper', weapon: 'scythe', unlock: 'win1',
    desc: 'Reaps what the night sows.', perk: '+2 armor, +0.5 health/sec',
    bonus: { armor: 2, regen: 0.5 },
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS);
