// Personal leaderboard: every finished run gets a score and the best runs
// are kept in the save file (on this device only; there is no server).

import { MAPS } from '../data/maps.js';
import { nightfallMods, DIFFICULTIES } from '../data/meta.js';

export const LEADERBOARD_SIZE = 100;

// Score rewards surviving, killing and beating bosses, scaled up on harder
// maps and Nightfall levels so a tough run outranks an easy one.
export function scoreRun(r) {
  const base = r.kills + Math.floor(r.time) * 5 + r.level * 20 + r.bosses * 400 + r.elites * 60 + (r.victory ? 5000 : 0);
  const mapMult = MAPS[r.map] ? MAPS[r.map].hp : 1;
  const diff = DIFFICULTIES[r.difficulty] || DIFFICULTIES.normal;
  return Math.round(base * mapMult * nightfallMods(r.nightfall || 0).gold * diff.gold);
}

// Adds a run and returns its rank among runs of the same mode (1 = best).
export function addToLeaderboard(p, r) {
  const entry = {
    score: scoreRun(r), time: Math.floor(r.time), kills: r.kills, level: r.level,
    bosses: r.bosses, char: r.char, map: r.map, mode: r.mode,
    nightfall: r.nightfall || 0, difficulty: r.difficulty || 'normal', victory: !!r.victory, date: Date.now(),
  };
  const board = p.leaderboard;
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  if (board.length > LEADERBOARD_SIZE) board.length = LEADERBOARD_SIZE;
  if (!board.includes(entry)) return { entry, rank: 0 };
  const rank = board.filter((e) => e.mode === entry.mode).indexOf(entry) + 1;
  return { entry, rank };
}

// Entries for the Records screen. map: 'all' or a map id.
export function leaderboardView(p, mode, map) {
  return p.leaderboard.filter((e) => e.mode === mode && (map === 'all' || e.map === map));
}
