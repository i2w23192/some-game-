// Secret gift codes, redeemed from Settings. Codes are stored only as hashes
// so they don't show up as plain text in the game files.

export const DEV_GIFT_GOLD = 92871017;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

const CODES = {
  // The dev gift: tops your gold up to 92,871,017. Can be used again.
  '5yb42a': (p) => {
    const add = Math.max(0, DEV_GIFT_GOLD - p.gold);
    p.gold += add;
    return add ? `A gift from the devs: +${add.toLocaleString()} gold!` : 'Your purse is already overflowing.';
  },
};

// Returns a message for the player, or null if the code is wrong.
export function redeemCode(p, code) {
  const key = hash(String(code).trim().toUpperCase().replace(/\s+/g, ''));
  const fn = CODES[key];
  return fn ? fn(p) : null;
}

export const _hash = hash;
