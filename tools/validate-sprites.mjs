// Checks every sprite resolves, has equal-width rows and only known palette keys.
import { SPRITES, PALETTE, resolveSprite } from '../src/gfx/sprites.js';
let bad = 0;
for (const name of Object.keys(SPRITES)) {
  const rows = resolveSprite(name);
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) { console.log(`${name} row ${i} len ${r.length} != ${w}: "${r}"`); bad++; }
    for (const ch of r) if (ch !== '.' && !PALETTE[ch]) { console.log(`${name} row ${i} unknown key '${ch}'`); bad++; break; }
  });
}
console.log(bad ? `${bad} problems` : `all ${Object.keys(SPRITES).length} sprites OK`);
process.exit(bad ? 1 : 0);
