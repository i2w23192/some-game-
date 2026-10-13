// In-run passive items. Each level applies `per` once more to the run stats.
// Stat keys match the player stat block in src/game/stats.js.

export const PASSIVES = {
  might: { name: 'Iron Gauntlet', icon: 'gauntlet', max: 5, per: { might: 0.1 }, text: '+10% damage' },
  haste: { name: 'Quickening Tome', icon: 'tome', max: 5, per: { cooldown: -0.07 }, text: '-7% weapon cooldown' },
  vitality: { name: 'Hollow Heart', icon: 'heart', max: 5, per: { maxHp: 0.2 }, text: '+20% max health' },
  swiftness: { name: 'Wind Boots', icon: 'boot', max: 5, per: { moveSpeed: 0.1 }, text: '+10% move speed' },
  magnet: { name: 'Lodestone', icon: 'magnet', max: 5, per: { magnet: 0.35 }, text: '+35% pickup range' },
  reach: { name: 'Seer Lens', icon: 'lens', max: 5, per: { area: 0.1 }, text: '+10% area' },
  echo: { name: 'Echo Charm', icon: 'echo', max: 2, per: { amount: 1 }, text: '+1 projectile / strike' },
  hourglass: { name: 'Sand Glass', icon: 'hourglass', max: 5, per: { duration: 0.12, projSpeed: 0.08 }, text: '+12% duration, +8% speed' },
  armor: { name: 'Warded Shield', icon: 'shield', max: 5, per: { armor: 1 }, text: '+1 armor' },
  regen: { name: 'Mending Sigil', icon: 'cross', max: 5, per: { regen: 0.3 }, text: '+0.3 health/sec' },
  luck: { name: 'Clover Charm', icon: 'clover', max: 5, per: { luck: 0.1, crit: 0.02 }, text: '+10% luck, +2% crit' },
};

export const PASSIVE_IDS = Object.keys(PASSIVES);
