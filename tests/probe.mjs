// Runs the bot and samples boss HP / player DPS over time.
import { chromium } from 'playwright';
const url = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(url);
let minHp = 1e9;
for (let i = 0; i < 24; i++) {
  for (let k = 0; k < 10; k++) { await page.waitForTimeout(500); const hp = await page.evaluate(() => window.__game.run ? window.__game.run.player.hp / window.__game.run.player.maxHp : 1); minHp = Math.min(minHp, hp); }
  const s = await page.evaluate(() => {
    const r = window.__game.run; if (!r) { const l = window.__botStats.last; return 'ended ' + JSON.stringify(l && { victory: l.victory, time: Math.round(l.time), level: l.level, kills: l.kills, bosses: l.bosses, gold: l.gold }); }
    const dmg = r.weapons.map((w) => w.id + '=' + Math.round(r.dmgBySlot[w.slot] / 1000) + 'k').join(' ');
    return `t=${(r.time / 60).toFixed(1)}m lvl=${r.level} hp=${Math.round(r.player.hp)} foes=${r.enemies.list.length} bosses=[${r.bosses.map((b) => b.id + ' ' + Math.round(b.hp / b.maxHp * 100) + '% d=' + Math.round(Math.hypot(b.x - r.player.x, b.y - r.player.y))).join(', ')}] ${dmg}`;
  });
  console.log(s, 'minHp%=' + Math.round(minHp * 100));
}
await browser.close();
