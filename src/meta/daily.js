// Daily login reward: a 7-day streak calendar based on the device's local
// date. Claiming on consecutive days advances the streak; missing a day
// starts it over at day 1. Day 7 is the big one, then the cycle repeats.

import { rollRelic } from './progression.js';

// gold is multiplied by rewardScale(); relicLuck > 0 also rolls a relic.
export const DAILY_REWARDS = [
  { day: 1, gold: 100 },
  { day: 2, gold: 150 },
  { day: 3, gold: 100, relicLuck: 1.5 },
  { day: 4, gold: 250 },
  { day: 5, gold: 300 },
  { day: 6, gold: 400 },
  { day: 7, gold: 600, relicLuck: 3 },
];

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a, b) {
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}

// Rewards grow a little as the player progresses, so they stay worth claiming.
export function rewardScale(p) {
  return 1 + Math.min(4, p.stats.runs / 40);
}

// { canClaim, day (1-7, the day that would be claimed next), streak }
export function dailyStatus(p, now = new Date()) {
  const d = p.daily;
  const today = todayKey(now);
  if (d.last === today) return { canClaim: false, day: d.streak % 7 || 7, streak: d.streak };
  const gap = d.last ? daysBetween(d.last, today) : Infinity;
  const streak = gap === 1 ? d.streak : 0; // missed a day (or first time): restart
  return { canClaim: true, day: (streak % 7) + 1, streak };
}

export function claimDaily(p, now = new Date()) {
  const st = dailyStatus(p, now);
  if (!st.canClaim) return null;
  const r = DAILY_REWARDS[st.day - 1];
  const gold = Math.round(r.gold * rewardScale(p));
  p.gold += gold;
  p.stats.goldEarned += gold;
  const relic = r.relicLuck ? rollRelic(p, 0, r.relicLuck) : null;
  p.daily.last = todayKey(now);
  p.daily.streak = st.streak + 1;
  p.daily.total = (p.daily.total || 0) + 1;
  return { day: st.day, gold, relic };
}
