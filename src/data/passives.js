// In-run passive items. Each level applies `per` once more to the run stats.
// Stat keys match the player stat block in src/game/stats.js.

export const PASSIVES = {
  might: { rarity: 'common', name: 'Iron Gauntlet', icon: 'gauntlet', max: 5, per: { might: 0.1 }, text: '+10% damage' },
  haste: { rarity: 'rare', name: 'Quickening Tome', icon: 'tome', max: 5, per: { cooldown: -0.07 }, text: '-7% weapon cooldown' },
  vitality: { rarity: 'common', name: 'Hollow Heart', icon: 'heart', max: 5, per: { maxHp: 0.2 }, text: '+20% max health' },
  swiftness: { rarity: 'common', name: 'Wind Boots', icon: 'boot', max: 5, per: { moveSpeed: 0.1 }, text: '+10% move speed' },
  magnet: { rarity: 'common', name: 'Lodestone', icon: 'magnet', max: 5, per: { magnet: 0.35 }, text: '+35% pickup range' },
  reach: { rarity: 'rare', name: 'Seer Lens', icon: 'lens', max: 5, per: { area: 0.1 }, text: '+10% area' },
  echo: { rarity: 'epic', name: 'Echo Charm', icon: 'echo', max: 2, per: { amount: 1 }, text: '+1 projectile / strike' },
  hourglass: { rarity: 'rare', name: 'Sand Glass', icon: 'hourglass', max: 5, per: { duration: 0.12, projSpeed: 0.08 }, text: '+12% duration, +8% speed' },
  armor: { rarity: 'common', name: 'Warded Shield', icon: 'shield', max: 5, per: { armor: 1 }, text: '+1 armor' },
  regen: { rarity: 'rare', name: 'Mending Sigil', icon: 'cross', max: 5, per: { regen: 0.3 }, text: '+0.3 health/sec' },
  luck: { rarity: 'epic', name: 'Clover Charm', icon: 'clover', max: 5, per: { luck: 0.1, crit: 0.02 }, text: '+10% luck, +2% crit' },
  // legendary passives
  crown: { rarity: 'legendary', name: 'Crown of Ruin', icon: 'r_skull_y', max: 3, per: { might: 0.4, area: 0.2, cooldown: -0.12 }, text: '+40% damage, +20% area, -12% cooldown' },
  eternity: { rarity: 'legendary', name: 'Heart of Eternity', icon: 'r_feather_r', max: 3, per: { maxHp: 0.6, regen: 2, armor: 3 }, text: '+60% max health, +2 health/sec, +3 armor' },
};

export const PASSIVE_IDS = Object.keys(PASSIVES);
