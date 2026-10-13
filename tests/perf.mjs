// Late-game stress test at real-time speed. Measures JS time spent in the
// simulation (update) and in drawing, per frame, plus heap size.
// Usage: node tests/perf.mjs [baseUrl] [seconds] [cpuThrottle]
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:8080/';
const seconds = parseInt(process.argv[3] || '60', 10);
const throttle = parseFloat(process.argv[4] || '1');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
if (throttle > 1) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
}
await page.goto(base + '?stress=1&bot=1&god=1');
await page.waitForTimeout(1500);
if (process.argv[6] === 'crowd') {
  // Worst case: a weak build so the horde piles up to the 500 cap.
  await page.evaluate(() => {
    const run = window.__game.run;
    run.weapons.length = 1;
    run.weapons[0].fs.damage = 1;
    run.director.target = () => 500;
  });
}
await page.evaluate(() => {
  const g = window.__game;
  const m = (window.__perf = { upd: [], draw: [], frames: 0, enemies: [], start: performance.now() });
  let acc = 0;
  const run = g.run;
  const u = run.update.bind(run);
  run.update = (dt) => { const t = performance.now(); u(dt); acc += performance.now() - t; };
  const d = g.renderer.draw.bind(g.renderer);
  g.renderer.draw = (...a) => {
    const t = performance.now(); d(...a); m.draw.push(performance.now() - t);
    m.upd.push(acc); acc = 0; m.frames++;
    if (m.frames % 30 === 0) m.enemies.push(run.enemies.list.length);
  };
});
await page.waitForTimeout(seconds * 1000);
const r = await page.evaluate(() => {
  const m = window.__perf, g = window.__game, run = g.run;
  const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length * p)] || 0; };
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const wall = (performance.now() - m.start) / 1000;
  return {
    wallSeconds: wall.toFixed(1), fps: (m.frames / wall).toFixed(1),
    updateMs: { avg: avg(m.upd).toFixed(2), p95: q(m.upd, 0.95).toFixed(2), max: Math.max(...m.upd).toFixed(2) },
    drawMs: { avg: avg(m.draw).toFixed(2), p95: q(m.draw, 0.95).toFixed(2) },
    enemies: { avg: Math.round(avg(m.enemies)), max: Math.max(...m.enemies) },
    shots: run.combat.shots.length, gems: run.gems.length, zones: run.combat.zones.length,
    gameMinute: (run.time / 60).toFixed(1), kills: run.kills, cap: run.cap,
    heapMB: performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) : 'n/a',
  };
});
console.log(JSON.stringify(r, null, 1));
console.log(errors.length ? 'ERRORS: ' + errors.join('\n') : 'no errors');
await page.screenshot({ path: process.argv[5] || '/tmp/perf.png' });
await browser.close();
