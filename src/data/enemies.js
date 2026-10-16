// Enemy archetypes. Base values are multiplied by time / map / Nightfall
// scaling when spawned (see src/game/spawner.js).
//   r: collision radius, xp: gem value, kb: knockback taken (0..1)

export const ENEMIES = {
  bat: { sprite: ['bat1', 'bat2'], hp: 6, speed: 46, dmg: 5, r: 5, xp: 1, kb: 1 },
  ghoul: { sprite: 'ghoul', hp: 12, speed: 27, dmg: 8, r: 6, xp: 1, kb: 1 },
  skeleton: { sprite: 'skeleton', hp: 22, speed: 31, dmg: 10, r: 6, xp: 2, kb: 0.9 },
  slime: { sprite: 'slime', hp: 32, speed: 22, dmg: 10, r: 6, xp: 2, kb: 0.8 },
  wraith: { sprite: 'wraith', hp: 34, speed: 38, dmg: 12, r: 7, xp: 3, kb: 1 },
  eye: { sprite: 'eye', hp: 40, speed: 33, dmg: 12, r: 6, xp: 3, kb: 1 },
  imp: { sprite: 'imp', hp: 28, speed: 52, dmg: 10, r: 6, xp: 3, kb: 1 },
  cultist: { sprite: 'cultist', hp: 46, speed: 24, dmg: 12, r: 7, xp: 4, kb: 0.8, ranged: { every: 3.2, speed: 70, dmg: 10, sprite: 'orb' } },
  brute: { sprite: 'brute', hp: 140, speed: 20, dmg: 20, r: 9, xp: 8, kb: 0.3 },
  frostbat: { sprite: ['frostbat1', 'frostbat2'], hp: 14, speed: 54, dmg: 8, r: 5, xp: 2, kb: 1 },
  bloodghoul: { sprite: 'bloodghoul', hp: 42, speed: 31, dmg: 14, r: 6, xp: 3, kb: 0.9 },
  ashskeleton: { sprite: 'ashskeleton', hp: 64, speed: 34, dmg: 16, r: 6, xp: 4, kb: 0.8 },
  voidwraith: { sprite: 'voidwraith', hp: 80, speed: 42, dmg: 18, r: 7, xp: 5, kb: 0.9 },
  magmaslime: { sprite: 'magmaslime', hp: 95, speed: 26, dmg: 18, r: 6, xp: 5, kb: 0.7 },
  acolyte: { sprite: 'acolyte', hp: 95, speed: 26, dmg: 16, r: 7, xp: 6, kb: 0.7, ranged: { every: 2.6, speed: 85, dmg: 16, sprite: 'fireorb' } },
  cryptbrute: { sprite: 'cryptbrute', hp: 320, speed: 22, dmg: 28, r: 9, xp: 15, kb: 0.2 },
};

// Bosses: drawn at 2x. `ai` selects the behaviour in src/game/bosses.js.
export const BOSSES = {
  colossus: { name: 'Bone Colossus', sprite: 'boss_colossus', hp: 1200, speed: 24, dmg: 25, r: 16, ai: 'charger' },
  witch: { name: 'Mire Witch', sprite: 'boss_witch', hp: 2200, speed: 20, dmg: 22, r: 15, ai: 'caster' },
  frostcolossus: { name: 'Frost Colossus', sprite: 'boss_frostcolossus', hp: 3000, speed: 27, dmg: 32, r: 16, ai: 'charger' },
  voidwitch: { name: 'Void Matron', sprite: 'boss_voidwitch', hp: 4000, speed: 22, dmg: 30, r: 15, ai: 'caster' },
  lord: { name: 'The Ashen Lord', sprite: 'boss_lord', hp: 6500, speed: 26, dmg: 35, r: 16, ai: 'lord', final: true },
  emberlord: { name: 'Ember Tyrant', sprite: 'boss_emberlord', hp: 9000, speed: 28, dmg: 40, r: 16, ai: 'lord', final: true },
};
