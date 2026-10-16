// Maps: ground look, enemy waves, boss schedule and difficulty/reward
// multipliers. Wave entries apply from `at` minutes until the next entry.

export const RUN_LENGTH = 25 * 60; // seconds until the final boss in Standard mode

export const MAPS = {
  gravewood: {
    name: 'Gravewood',
    desc: 'A drowned forest of graves. Where every vigil begins.',
    ground: { base: '#22301f', dark: '#1a2518', light: '#2d3d28', speck: '#3c5233' },
    decor: [['grave', 3], ['deadtree', 2], ['bush', 4], ['bones', 2], ['mushroom', 2], ['flowers', 4], ['rock', 2]],
    hp: 1, speed: 1, gold: 1, eliteEvery: 60,
    waves: [
      { at: 0, pool: [['bat', 3], ['ghoul', 5]] },
      { at: 1, pool: [['bat', 3], ['ghoul', 4], ['skeleton', 3]] },
      { at: 3, pool: [['ghoul', 3], ['skeleton', 4], ['slime', 3], ['bat', 2]] },
      { at: 6, pool: [['skeleton', 3], ['slime', 3], ['wraith', 3], ['cultist', 1]] },
      { at: 9, pool: [['wraith', 4], ['slime', 2], ['brute', 1], ['cultist', 1], ['frostbat', 3]] },
      { at: 12, pool: [['bloodghoul', 4], ['wraith', 3], ['brute', 1], ['frostbat', 3], ['cultist', 1]] },
      { at: 16, pool: [['bloodghoul', 3], ['ashskeleton', 4], ['voidwraith', 2], ['brute', 1], ['acolyte', 1]] },
      { at: 20, pool: [['ashskeleton', 3], ['voidwraith', 3], ['magmaslime', 3], ['cryptbrute', 1], ['acolyte', 1]] },
    ],
    events: [
      { at: 3, type: 'swarm', enemy: 'bat', count: 40 },
      { at: 7, type: 'ring', enemy: 'ghoul', count: 36 },
      { at: 11, type: 'swarm', enemy: 'frostbat', count: 50 },
      { at: 14, type: 'ring', enemy: 'skeleton', count: 44 },
      { at: 18, type: 'swarm', enemy: 'frostbat', count: 70 },
      { at: 22, type: 'ring', enemy: 'bloodghoul', count: 52 },
    ],
    bosses: [
      { at: 5, id: 'colossus' },
      { at: 10, id: 'witch' },
      { at: 15, id: 'frostcolossus' },
      { at: 20, id: 'voidwitch' },
      { at: 25, id: 'lord' },
    ],
  },
  crypt: {
    name: 'Sunken Crypt',
    desc: 'Cold halls of restless bone. Faster, tougher, richer.',
    ground: { base: '#232838', dark: '#1b1f2c', light: '#2c3245', speck: '#3a4258' },
    decor: [['pillar', 2], ['bones', 4], ['grave', 2], ['crystal', 3], ['rock', 3]],
    hp: 1.45, speed: 1.08, gold: 1.6, eliteEvery: 55,
    waves: [
      { at: 0, pool: [['skeleton', 4], ['bat', 3]] },
      { at: 1, pool: [['skeleton', 4], ['eye', 3], ['bat', 2]] },
      { at: 3, pool: [['skeleton', 3], ['eye', 3], ['wraith', 3]] },
      { at: 6, pool: [['eye', 3], ['wraith', 3], ['frostbat', 3], ['acolyte', 1]] },
      { at: 9, pool: [['ashskeleton', 3], ['wraith', 3], ['brute', 1], ['acolyte', 1], ['frostbat', 2]] },
      { at: 13, pool: [['ashskeleton', 4], ['voidwraith', 3], ['cryptbrute', 1], ['acolyte', 1]] },
      { at: 18, pool: [['voidwraith', 4], ['ashskeleton', 3], ['cryptbrute', 1], ['acolyte', 2]] },
    ],
    events: [
      { at: 3, type: 'ring', enemy: 'skeleton', count: 36 },
      { at: 8, type: 'swarm', enemy: 'frostbat', count: 50 },
      { at: 12, type: 'ring', enemy: 'eye', count: 44 },
      { at: 17, type: 'swarm', enemy: 'frostbat', count: 70 },
      { at: 22, type: 'ring', enemy: 'voidwraith', count: 50 },
    ],
    bosses: [
      { at: 5, id: 'frostcolossus' },
      { at: 10, id: 'witch' },
      { at: 15, id: 'colossus' },
      { at: 20, id: 'voidwitch' },
      { at: 25, id: 'lord' },
    ],
  },
  ashen: {
    name: 'Ashen Wastes',
    desc: 'A burning land where the strongest builds are forged.',
    ground: { base: '#33201c', dark: '#281915', light: '#3e2822', speck: '#57342a' },
    decor: [['emberrock', 4], ['bones', 3], ['deadtree', 2], ['rock', 2]],
    hp: 2.1, speed: 1.12, gold: 2.4, eliteEvery: 45,
    waves: [
      { at: 0, pool: [['imp', 4], ['ghoul', 3]] },
      { at: 1, pool: [['imp', 4], ['bloodghoul', 3]] },
      { at: 3, pool: [['imp', 3], ['bloodghoul', 3], ['magmaslime', 2], ['cultist', 1]] },
      { at: 6, pool: [['imp', 3], ['magmaslime', 3], ['ashskeleton', 3], ['acolyte', 1]] },
      { at: 10, pool: [['ashskeleton', 3], ['magmaslime', 3], ['brute', 1], ['acolyte', 1], ['imp', 3]] },
      { at: 14, pool: [['ashskeleton', 3], ['voidwraith', 3], ['cryptbrute', 1], ['acolyte', 1], ['imp', 2]] },
      { at: 19, pool: [['voidwraith', 3], ['magmaslime', 3], ['cryptbrute', 2], ['acolyte', 2]] },
    ],
    events: [
      { at: 2, type: 'swarm', enemy: 'imp', count: 40 },
      { at: 6, type: 'ring', enemy: 'bloodghoul', count: 44 },
      { at: 10, type: 'swarm', enemy: 'imp', count: 60 },
      { at: 15, type: 'ring', enemy: 'magmaslime', count: 48 },
      { at: 20, type: 'swarm', enemy: 'imp', count: 80 },
    ],
    bosses: [
      { at: 5, id: 'witch' },
      { at: 10, id: 'frostcolossus' },
      { at: 15, id: 'voidwitch' },
      { at: 20, id: 'lord' },
      { at: 25, id: 'emberlord' },
    ],
  },
};

export const MAP_IDS = Object.keys(MAPS);
