// Clicks through the real menus like a player: start a run, level up via the
// overlay, die, check results + saved progress, then visit every menu screen.
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:8080/';
const shots = process.argv[3] || '/tmp';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) process.exitCode = 1; };
const tap = async (text) => { await page.getByRole('button', { name: text, exact: true }).first().tap(); await page.waitForTimeout(250); };

await page.goto(base);
await page.waitForTimeout(800);
await tap('Play');
ok(await page.locator('h2', { hasText: 'Choose your Warden' }).isVisible(), 'character select opens');
await page.screenshot({ path: shots + '/ui-chars.png' });
await tap('Next');
ok(await page.locator('h2', { hasText: 'Choose the Ground' }).isVisible(), 'map select opens');
await page.screenshot({ path: shots + '/ui-maps.png' });
await tap('Begin');
await page.waitForTimeout(500);
ok(await page.evaluate(() => !!window.__game.run), 'run started');

// Drag the virtual joystick for a moment.
const box = { x: 195, y: 600 };
await page.mouse.move(box.x, box.y);
await page.dispatchEvent('#app', 'pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 150, clientY: 600, isPrimary: true });
await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, pointerType: 'touch', clientX: 200, clientY: 560 })));
await page.waitForTimeout(600);
const moved = await page.evaluate(() => { const p = window.__game.run.player; return Math.hypot(p.x, p.y); });
ok(moved > 10, 'touch joystick moves the player (' + moved.toFixed(1) + 'px)');
await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch' })));

// Force a level-up and pick a card through the overlay.
await page.evaluate(() => window.__game.run.addXp(30));
await page.waitForTimeout(400);
ok(await page.locator('.levelup').isVisible(), 'level-up overlay appears');
await page.screenshot({ path: shots + '/ui-levelup.png' });
const before = await page.evaluate(() => JSON.stringify([window.__game.run.weapons.map((w) => w.id + w.level), window.__game.run.passives]));
await page.locator('.card.choice').first().tap();
await page.waitForTimeout(400);
while (await page.locator('.levelup').isVisible()) { await page.locator('.card.choice').first().tap(); await page.waitForTimeout(300); }
const after = await page.evaluate(() => JSON.stringify([window.__game.run.weapons.map((w) => w.id + w.level), window.__game.run.passives]));
ok(before !== after, 'choosing a card changes the build');
ok(await page.evaluate(() => !window.__game.run.paused), 'game resumes after level-up');

// Chest overlay
await page.evaluate(() => { const r = window.__game.run; r.gold += 50; r.dropItem(r.player.x, r.player.y, 'chest'); });
await page.waitForTimeout(500);
ok(await page.locator('.chest').isVisible(), 'chest overlay appears');
await page.screenshot({ path: shots + '/ui-chest.png' });
await tap('Continue');

// Pause menu
await page.locator('.pausebtn').tap();
await page.waitForTimeout(300);
ok(await page.locator('h2', { hasText: 'Paused' }).isVisible(), 'pause menu opens');
await page.screenshot({ path: shots + '/ui-pause.png' });
await tap('Resume');
ok(await page.evaluate(() => !window.__game.run.paused), 'resume works');

// Die
await page.evaluate(() => { const r = window.__game.run; r.time = 400; r.kills = 321; r.player.iframes = 0; r.hurtPlayer(99999); });
await page.waitForTimeout(1800);
ok(await page.locator('.results').isVisible(), 'results screen after death');
await page.screenshot({ path: shots + '/ui-results.png' });
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gravelight.save.v1')));
ok(saved && saved.stats.runs === 1 && saved.stats.kills === 321, 'run saved to localStorage');
ok(saved.gold >= 50, 'gold banked (' + saved.gold + ')');
ok(saved.feats.reach5, 'feat "First Light" unlocked by surviving 5 min');

// Reload: progress persists
await page.reload();
await page.waitForTimeout(800);
const p2 = await page.evaluate(() => window.__game.profile);
ok(p2.stats.runs === 1 && p2.gold === saved.gold, 'progress survives reload');

// Visit every menu
for (const [btnName, title] of [['Shrine', 'The Shrine'], ['Relics', 'Relics'], ['Feats', 'Feats'], ['Bounties', 'Bounties'], ['Settings', 'Settings']]) {
  await tap(btnName);
  ok(await page.locator('h2', { hasText: title }).isVisible(), title + ' screen opens');
  await page.screenshot({ path: shots + '/ui-' + btnName.toLowerCase() + '.png', fullPage: false });
  if (btnName === 'Shrine') {
    const g0 = await page.evaluate(() => window.__game.profile.gold);
    await page.locator('.card.shop.afford').first().tap().catch(() => {});
    await page.waitForTimeout(200);
    const g1 = await page.evaluate(() => window.__game.profile.gold);
    ok(g1 < g0, `buying an upgrade spends gold (${g0} -> ${g1})`);
  }
  if (btnName === 'Settings') {
    await tap('Show backup code');
    const code = await page.locator('textarea.code').first().inputValue();
    ok(code.startsWith('GL1.'), 'export code generated');
    await page.locator('textarea.code').nth(1).fill(code);
    await tap('Load code');
    await tap('Yes');
    ok(await page.evaluate(() => window.__game.profile.stats.runs === 1), 'import round-trips');
    await page.waitForTimeout(300);
    if (await page.locator('h2', { hasText: 'GRAVELIGHT' }).count() === 0 && await page.getByRole('button', { name: 'Back' }).count()) await tap('Back');
    continue;
  }
  await tap('Back');
}
// Keyboard navigation on the title screen
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
ok(await page.locator('h2').count() > 0, 'keyboard navigation opens a menu');

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
