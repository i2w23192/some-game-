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
// Daily reward greets a new player.
ok(await page.locator('h2', { hasText: 'Daily Reward' }).isVisible(), 'daily reward pops up on first launch');
const g0 = await page.evaluate(() => window.__game.profile.gold);
await tap('Claim Day 1');
const g1 = await page.evaluate(() => window.__game.profile.gold);
ok(g1 > g0, `claiming day 1 gives gold (${g0} -> ${g1})`);
ok(await page.getByRole('button', { name: 'Claim Day 1', exact: true }).count() === 0, 'cannot claim twice in one day');
await tap('Continue');
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
ok(await page.locator('.card.choice .rarity').count() > 0, 'level-up cards show their rarity');
const rar = await page.evaluate(async () => {
  const { WEAPONS } = await import('/src/data/weapons.js');
  const { PASSIVES } = await import('/src/data/passives.js');
  const bad = [...Object.entries(WEAPONS).filter(([, w]) => !w.evolved), ...Object.entries(PASSIVES)].filter(([, d]) => !d.rarity).map(([k]) => k);
  return { bad, legendaries: [...Object.values(WEAPONS), ...Object.values(PASSIVES)].filter((d) => d.rarity === 'legendary').length };
});
ok(rar.bad.length === 0 && rar.legendaries >= 4, `every skill has a rarity (${rar.legendaries} legendary)`);
const content = await page.evaluate(async () => {
  const { MAPS } = await import('/src/data/maps.js');
  const { ENEMIES, BOSSES } = await import('/src/data/enemies.js');
  const { DIFFICULTIES, FEATS } = await import('/src/data/meta.js');
  const bad = [];
  for (const [id, m] of Object.entries(MAPS)) {
    for (const w of m.waves) for (const [e] of w.pool) if (!ENEMIES[e]) bad.push(id + ':' + e);
    for (const ev of m.events) if (!ENEMIES[ev.enemy]) bad.push(id + ':' + ev.enemy);
    for (const b of m.bosses) if (!BOSSES[b.id]) bad.push(id + ':' + b.id);
    if (id !== 'gravewood' && !FEATS.some((f) => f.reward.map === id)) bad.push(id + ':no unlock');
  }
  return { maps: Object.keys(MAPS).length, diffs: Object.keys(DIFFICULTIES).length, bad };
});
ok(content.maps >= 6 && content.diffs >= 5 && content.bad.length === 0, `${content.maps} maps and ${content.diffs} difficulties, all enemies/bosses/unlocks valid ${content.bad.join(',')}`);
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
ok(await page.locator('h2', { hasText: 'Daily Reward' }).count() === 0, 'daily reward does not pop up again the same day');
const p2 = await page.evaluate(() => window.__game.profile);
ok(p2.stats.runs === 1 && p2.gold === saved.gold, 'progress survives reload');

// Visit every menu
for (const [btnName, title] of [['Rebirth', 'Rebirth'], ['Records', 'Records'], ['Shrine', 'The Shrine'], ['Relics', 'Relics'], ['Feats', 'Feats'], ['Bounties', 'Bounties'], ['Settings', 'Settings']]) {
  await tap(btnName);
  ok(await page.locator('h2', { hasText: title }).isVisible(), title + ' screen opens');
  await page.screenshot({ path: shots + '/ui-' + btnName.toLowerCase() + '.png', fullPage: false });
  if (btnName === 'Records') {
    ok(await page.locator('.lbrow').count() === 1, 'the finished run is on the leaderboard');
    const saved2 = await page.evaluate(() => JSON.parse(localStorage.getItem('gravelight.save.v1')).leaderboard);
    ok(saved2.length === 1 && saved2[0].score > 0, 'leaderboard entry saved (score ' + (saved2[0] && saved2[0].score) + ')');
  }
  if (btnName === 'Rebirth') {
    const rb = await page.evaluate(async () => {
      const { doRebirth, embersForRebirth } = await import('/src/meta/rebirth.js');
      const { metaStats } = await import('/src/game/stats.js');
      const p = JSON.parse(JSON.stringify(window.__game.profile));
      const tooEarly = embersForRebirth(p);
      p.stats.goldEarned += 50000; p.shop = { might: 3 }; p.gold = 5000;
      const before = metaStats('warden', { ...p, shop: {} }).might;
      const gain = doRebirth(p);
      const after = metaStats('warden', p).might;
      return { tooEarly, gain, gold: p.gold, shop: Object.keys(p.shop).length, before, after, count: p.rebirth.count };
    });
    ok(rb.gain === 5 && rb.gold === 0 && rb.shop === 0 && rb.count === 1, `rebirth resets gold/shrine and grants embers (+${rb.gain})`);
    ok(rb.after > rb.before, `embers make you stronger (might ${rb.before.toFixed(2)} -> ${rb.after.toFixed(2)})`);
  }
  if (btnName === 'Shrine') {
    const g0 = await page.evaluate(() => window.__game.profile.gold);
    await page.locator('.card.shop.afford').first().tap().catch(() => {});
    await page.waitForTimeout(200);
    const g1 = await page.evaluate(() => window.__game.profile.gold);
    ok(g1 < g0, `buying an upgrade spends gold (${g0} -> ${g1})`);
  }
  if (btnName === 'Settings') {
    await page.locator('input.gift').fill('wrong-code');
    await tap('Redeem');
    ok(await page.evaluate(() => window.__game.profile.gold) < 92871017, 'a wrong gift code gives nothing');
    await page.locator('input.gift').fill('devgift-92871017');
    await tap('Redeem');
    ok(await page.evaluate(() => window.__game.profile.gold) === 92871017, 'the dev gift code tops gold up to 92,871,017');
    const admin = await page.evaluate(async () => {
      const { applyAdmin } = await import('/src/meta/gift.js');
      const { redeemCode } = await import('/src/meta/gift.js');
      const copy = JSON.parse(JSON.stringify(window.__game.profile));
      applyAdmin(copy);
      const { isDifficultyUnlocked } = await import('/src/meta/progression.js');
      if (!isDifficultyUnlocked(copy, 'hell')) return { shop: 0 };
      const wrong = await redeemCode(JSON.parse(JSON.stringify(copy)), 'GL-ADMIN-NOPE-NOPE-NOPE');
      return { shop: Object.keys(copy.shop).length, feats: Object.keys(copy.feats).length, relics: Object.values(copy.relics).every((s) => s === 5), gold: copy.gold, wrong };
    });
    ok(admin.shop >= 20 && admin.feats >= 24 && admin.relics && admin.gold >= 999999999 && admin.wrong === null, 'admin mode maxes everything; a wrong admin code is rejected');
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
