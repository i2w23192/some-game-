// Weapon definitions. Stats at level N = base + every level delta up to N.
// Behaviour code lives in src/game/weapons.js, keyed by `kind`.
//
// Stat meanings
//   damage    per hit (or per tick for zones)
//   cooldown  seconds between volleys (tick interval for auras)
//   amount    projectiles / strikes per volley
//   area      size multiplier (radius for zones)
//   speed     projectile speed (px/s) or orbit speed multiplier
//   pierce    enemies a projectile can hit before vanishing
//   duration  lifetime in seconds of zones / orbits / projectiles

export const WEAPONS = {
  bolt: {
    name: 'Arcane Bolt', icon: 'bolt', kind: 'bolt',
    desc: 'Fires a bolt at the nearest enemy.',
    base: { damage: 12, cooldown: 0.8, amount: 1, area: 1, speed: 210, pierce: 1, duration: 1.6 },
    levels: [
      { amount: 1, text: '+1 bolt' },
      { damage: 5, text: '+5 damage' },
      { cooldown: -0.15, text: 'Faster casting' },
      { amount: 1, text: '+1 bolt' },
      { pierce: 1, text: 'Bolts pierce +1 enemy' },
      { damage: 6, text: '+6 damage' },
      { amount: 1, damage: 4, text: '+1 bolt, +4 damage' },
    ],
    evolve: { passive: 'haste', into: 'torrent' },
  },
  knife: {
    name: 'Throwing Daggers', icon: 'dagger', kind: 'knife',
    desc: 'Rapidly throws daggers where you face.',
    base: { damage: 8, cooldown: 0.6, amount: 1, area: 1, speed: 300, pierce: 1, duration: 1 },
    levels: [
      { amount: 1, text: '+1 dagger' },
      { damage: 4, text: '+4 damage' },
      { amount: 1, text: '+1 dagger' },
      { pierce: 1, text: 'Pierce +1 enemy' },
      { amount: 1, cooldown: -0.1, text: '+1 dagger, faster' },
      { damage: 5, text: '+5 damage' },
      { pierce: 1, amount: 1, text: '+1 dagger, pierce +1' },
    ],
    evolve: { passive: 'swiftness', into: 'edges' },
  },
  axe: {
    name: 'Hurled Axe', icon: 'axe', kind: 'axe',
    desc: 'Throws heavy axes in an arc. Pierces everything.',
    base: { damage: 25, cooldown: 1.8, amount: 1, area: 1, speed: 1, pierce: 999, duration: 3 },
    levels: [
      { amount: 1, text: '+1 axe' },
      { damage: 10, text: '+10 damage' },
      { area: 0.15, cooldown: -0.2, text: 'Bigger, faster throws' },
      { amount: 1, text: '+1 axe' },
      { damage: 10, text: '+10 damage' },
      { amount: 1, text: '+1 axe' },
      { damage: 15, area: 0.15, text: '+15 damage, bigger axes' },
    ],
    evolve: { passive: 'might', into: 'spiral' },
  },
  orbit: {
    name: 'Spirit Blades', icon: 'blade', kind: 'orbit',
    desc: 'Blades circle around you for a while.',
    base: { damage: 10, cooldown: 3.5, amount: 2, area: 1, speed: 1, pierce: 999, duration: 3 },
    levels: [
      { amount: 1, text: '+1 blade' },
      { area: 0.2, damage: 3, text: 'Wider orbit, +3 damage' },
      { duration: 0.6, text: 'Blades last longer' },
      { amount: 1, text: '+1 blade' },
      { speed: 0.3, damage: 4, text: 'Faster spin, +4 damage' },
      { duration: 0.8, cooldown: -0.5, text: 'Longer, more often' },
      { amount: 1, damage: 4, text: '+1 blade, +4 damage' },
    ],
    evolve: { passive: 'hourglass', into: 'halo' },
  },
  aura: {
    name: 'Blight Aura', icon: 'ringicon', kind: 'aura',
    desc: 'Damages enemies near you. Pushes them back.',
    base: { damage: 6, cooldown: 0.55, amount: 0, area: 1, speed: 1, pierce: 999, duration: 0 },
    levels: [
      { area: 0.2, text: 'Larger area' },
      { damage: 3, text: '+3 damage' },
      { cooldown: -0.08, text: 'Faster ticks' },
      { area: 0.2, text: 'Larger area' },
      { damage: 4, text: '+4 damage' },
      { cooldown: -0.08, text: 'Faster ticks' },
      { area: 0.2, damage: 4, text: 'Larger area, +4 damage' },
    ],
    evolve: { passive: 'vitality', into: 'plague' },
  },
  lightning: {
    name: 'Storm Call', icon: 'zap', kind: 'lightning',
    desc: 'Lightning strikes random enemies.',
    base: { damage: 20, cooldown: 2.0, amount: 2, area: 1, speed: 1, pierce: 999, duration: 0 },
    levels: [
      { amount: 1, text: '+1 strike' },
      { damage: 8, text: '+8 damage' },
      { amount: 1, text: '+1 strike' },
      { area: 0.25, cooldown: -0.2, text: 'Bigger, faster strikes' },
      { amount: 1, text: '+1 strike' },
      { damage: 10, text: '+10 damage' },
      { amount: 2, text: '+2 strikes' },
    ],
    evolve: { passive: 'echo', into: 'thunder' },
  },
  firebomb: {
    name: 'Firebomb', icon: 'flask', kind: 'firebomb',
    desc: 'Lobs flasks that leave burning ground.',
    base: { damage: 7, cooldown: 2.6, amount: 1, area: 1, speed: 1, pierce: 999, duration: 2.5 },
    levels: [
      { amount: 1, text: '+1 flask' },
      { area: 0.2, text: 'Larger fires' },
      { damage: 3, text: '+3 damage' },
      { amount: 1, duration: 0.5, text: '+1 flask, burns longer' },
      { area: 0.2, text: 'Larger fires' },
      { damage: 4, text: '+4 damage' },
      { amount: 1, duration: 0.5, text: '+1 flask, burns longer' },
    ],
    evolve: { passive: 'reach', into: 'inferno' },
  },
  scythe: {
    name: "Reaper's Arc", icon: 'scythe', kind: 'scythe',
    desc: 'Sweeps a wide arc in front of you.',
    base: { damage: 22, cooldown: 1.3, amount: 1, area: 1, speed: 1, pierce: 999, duration: 0 },
    levels: [
      { damage: 8, text: '+8 damage' },
      { area: 0.15, text: 'Wider sweep' },
      { amount: 1, text: 'Also sweeps behind you' },
      { cooldown: -0.25, text: 'Faster sweeps' },
      { damage: 10, text: '+10 damage' },
      { area: 0.15, text: 'Wider sweep' },
      { damage: 12, cooldown: -0.15, text: '+12 damage, faster' },
    ],
    evolve: { passive: 'regen', into: 'harvest' },
  },

  // ---- evolutions (max level, cannot be levelled further) ----
  torrent: {
    name: 'Arcane Torrent', icon: 'torrent', kind: 'bolt', evolved: true,
    desc: 'A relentless stream of homing, piercing bolts.',
    base: { damage: 24, cooldown: 0.3, amount: 2, area: 1.2, speed: 260, pierce: 3, duration: 2, homing: 1 },
  },
  edges: {
    name: 'Thousand Edges', icon: 'edge', kind: 'knife', evolved: true,
    desc: 'An endless storm of blades, front and back.',
    base: { damage: 16, cooldown: 0.12, amount: 2, area: 1, speed: 360, pierce: 3, duration: 1, backstab: 1 },
  },
  spiral: {
    name: 'Death Spiral', icon: 'redaxe', kind: 'spiral', evolved: true,
    desc: 'Huge axes spiral outward in every direction.',
    base: { damage: 48, cooldown: 1.5, amount: 8, area: 1.5, speed: 120, pierce: 999, duration: 2.5 },
  },
  halo: {
    name: 'Eternal Halo', icon: 'halo', kind: 'orbit', evolved: true,
    desc: 'A permanent ring of holy blades.',
    base: { damage: 22, cooldown: 0.5, amount: 6, area: 1.5, speed: 1.4, pierce: 999, duration: 999 },
  },
  plague: {
    name: 'Plague Heart', icon: 'heart', kind: 'aura', evolved: true,
    desc: 'A vast aura that slows enemies and heals you while it feeds.',
    base: { damage: 14, cooldown: 0.4, amount: 0, area: 1.9, speed: 1, pierce: 999, duration: 0, slow: 0.45, drain: 1 },
  },
  thunder: {
    name: 'Thunder King', icon: 'zap', kind: 'lightning', evolved: true,
    desc: 'Strikes that chain between enemies.',
    base: { damage: 36, cooldown: 1.2, amount: 6, area: 1.4, speed: 1, pierce: 999, duration: 0, chain: 3 },
  },
  inferno: {
    name: 'Inferno', icon: 'blueflame', kind: 'firebomb', evolved: true,
    desc: 'Soul-fire carpets the ground.',
    base: { damage: 15, cooldown: 2, amount: 4, area: 1.7, speed: 1, pierce: 999, duration: 4.5 },
  },
  harvest: {
    name: 'Soul Harvest', icon: 'scythe', kind: 'scythe', evolved: true,
    desc: 'Full-circle reaps that heal you for each soul.',
    base: { damage: 40, cooldown: 1.15, amount: 1, area: 1.35, speed: 1, pierce: 999, duration: 0, full: 1, drain: 1 },
  },
};

export const BASE_WEAPONS = ['bolt', 'knife', 'axe', 'orbit', 'aura', 'lightning', 'firebomb', 'scythe'];
export const MAX_WEAPON_LEVEL = 8;

export function weaponStats(id, level) {
  const def = WEAPONS[id];
  const s = { ...def.base };
  if (def.levels) {
    for (let i = 0; i < level - 1 && i < def.levels.length; i++) {
      const d = def.levels[i];
      for (const k in d) if (k !== 'text') s[k] = (s[k] || 0) + d[k];
    }
  }
  return s;
}
