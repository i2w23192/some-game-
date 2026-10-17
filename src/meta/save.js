// Local save: one JSON profile in localStorage plus a rolling backup.
// Export/import uses a plain-text code so progress can be copied anywhere.

const KEY = 'gravelight.save.v1';
const BACKUP_KEY = 'gravelight.save.v1.bak';
export const SAVE_VERSION = 1;

export function defaultProfile() {
  return {
    v: SAVE_VERSION,
    gold: 0,
    shop: {},
    relics: {},
    equipped: [],
    feats: {},
    stats: {
      kills: 0, runs: 0, wins: 0, goldEarned: 0, bossKills: 0, evolutions: 0,
      playTime: 0, bestNightfallWin: -1, bestLevel: 0, bestKillsRun: 0, relicsFound: 0,
    },
    best: {}, // mapId -> best survival seconds (standard)
    bestEndless: {}, // mapId -> best endless seconds
    wins: {}, // mapId -> count
    charWins: {}, // charId -> count
    nightfall: {}, // mapId -> highest selectable Nightfall level
    bounties: [],
    leaderboard: [], // best runs, see src/meta/leaderboard.js
    daily: { last: null, streak: 0, total: 0 }, // login streak, see src/meta/daily.js
    bountySeed: 1,
    bountyRerolls: 1,
    last: { char: 'warden', map: 'gravewood', mode: 'standard', nightfall: 0 },
    settings: {
      volume: 0.6, numbers: true, shake: true, quality: 'high', maxEnemies: 350,
      autoPerf: true, showFps: false, fixedStick: false,
    },
    pending: null, // rewards of a run that was interrupted (app closed)
    seen: {}, // ids of unlocks the player has already been told about
  };
}

// Fill any missing keys from defaults (forward-compatible with new fields).
function merge(base, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data === undefined ? base : data;
  const out = Array.isArray(base) ? [] : { ...base };
  for (const k in data) {
    const bv = base ? base[k] : undefined;
    if (bv && typeof bv === 'object' && !Array.isArray(bv) && data[k] && typeof data[k] === 'object' && !Array.isArray(data[k]))
      out[k] = merge(bv, data[k]);
    else out[k] = data[k];
  }
  return out;
}

export function normalize(data) {
  const p = merge(defaultProfile(), data);
  p.v = SAVE_VERSION;
  if (!Array.isArray(p.equipped)) p.equipped = [];
  if (!Array.isArray(p.bounties)) p.bounties = [];
  if (!Array.isArray(p.leaderboard)) p.leaderboard = [];
  if (typeof p.gold !== 'number' || !isFinite(p.gold)) p.gold = 0;
  return p;
}

export function loadProfile() {
  for (const key of [KEY, BACKUP_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {
      console.warn('Save slot unreadable', key, e);
    }
  }
  return defaultProfile();
}

let lastWrite = 0;
export function saveProfile(p) {
  try {
    const json = JSON.stringify(p);
    // Rotate a backup at most once a minute so a corrupt write can't take both.
    const now = Date.now();
    if (now - lastWrite > 60000) {
      const prev = localStorage.getItem(KEY);
      if (prev) localStorage.setItem(BACKUP_KEY, prev);
      lastWrite = now;
    }
    localStorage.setItem(KEY, json);
    return true;
  } catch (e) {
    console.warn('Save failed', e);
    return false;
  }
}

export function wipeProfile() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BACKUP_KEY);
  } catch (e) { /* storage unavailable */ }
}

// ---- export / import codes ----
function checksum(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function exportCode(p) {
  const body = toBase64(JSON.stringify(p));
  return `GL1.${checksum(body)}.${body}`;
}

export function importCode(code) {
  code = String(code).trim().replace(/\s+/g, '');
  const parts = code.split('.');
  if (parts.length !== 3 || parts[0] !== 'GL1') throw new Error('Not a Gravelight save code.');
  if (checksum(parts[2]) !== parts[1]) throw new Error('Save code is damaged or incomplete.');
  return normalize(JSON.parse(fromBase64(parts[2])));
}
