// Verifies the installed game works with no network: load once (service
// worker caches everything), go offline, reload and start a run.
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:8080/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
await page.goto(base);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForTimeout(1500);
ok(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), 'service worker registered');
await page.reload(); // ensure the page is now controlled by the worker
await page.waitForTimeout(800);
ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'page controlled by service worker');
await ctx.setOffline(true);
await page.reload();
await page.waitForTimeout(1000);
ok(await page.locator('h1', { hasText: 'GRAVELIGHT' }).isVisible(), 'title screen loads offline');
await page.evaluate(() => window.__game.startRun({ char: 'warden', map: 'gravewood', mode: 'standard', nightfall: 0 }));
await page.waitForTimeout(1500);
ok(await page.evaluate(() => window.__game.run && window.__game.run.time > 0.5), 'a run plays offline');
console.log(errors.length ? 'ERRORS: ' + errors.join('\n') : 'no page errors');
await browser.close();
