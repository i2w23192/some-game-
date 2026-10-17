# Gravelight

An endless survivor roguelite with chunky pixel art, built to run smoothly on an iPhone (or any modern browser). Your weapons fire on their own. You move, dash, collect gems, pick upgrades, evolve weapons and try to survive the night.

It is a plain HTML5/JavaScript game with **no engine, no dependencies and no build step**. All art and sound are generated in code, it works fully offline once installed, and all progress is saved on your device.

## Play it on your iPhone

1. Open the game's link in **Safari**: `https://i2w23192.github.io/some-game-/` (once GitHub Pages is switched on; see *Publishing* below).
2. Tap **Share → Add to Home Screen**.
3. Launch it from the new icon. It runs full-screen, works offline, and keeps your save.

Your progress lives in the phone's storage for this app. To back it up or move it to another device, go to **Settings → Show backup code** and later use **Load code**.

## Controls

| | Touch | Keyboard | Controller |
|---|---|---|---|
| Move | Drag anywhere (floating stick) | WASD / arrows | Left stick / D-pad |
| Dash | Dash button (bottom right) | Space / Shift | A / RB / RT |
| Pause | ❚❚ button | Esc / P | Start |
| Menus | Tap | Arrows + Enter, Esc = back | D-pad + A, B = back |

Bluetooth Xbox/PlayStation controllers work in iPhone Safari too.

## How it plays

**During a run (about 25 minutes):**
- Weapons attack automatically. Kill enemies, collect XP gems and level up, then choose 1 of 3 random upgrades.
- Carry up to 6 weapons and 6 passive items. Get a weapon to **level 8** while holding its partner passive, then open a chest from an elite or boss to **evolve** it.
- An elite (with a gold ring under it) appears about every minute and drops a chest. Bosses arrive at 5, 10, 15 and 20 minutes, and the final boss at 25:00. Beat it to win.
- Braziers drop healing, magnets, bombs and gold. Swarms and encircling rings are timed events.

| Weapon | Evolves with | Into |
|---|---|---|
| Arcane Bolt | Quickening Tome | Arcane Torrent |
| Throwing Daggers | Wind Boots | Thousand Edges |
| Hurled Axe | Iron Gauntlet | Death Spiral |
| Spirit Blades | Sand Glass | Eternal Halo |
| Blight Aura | Hollow Heart | Plague Heart |
| Storm Call | Echo Charm | Thunder King |
| Firebomb | Seer Lens | Inferno |
| Reaper's Arc | Mending Sigil | Soul Harvest |

Every weapon and passive has a **rarity** (Common, Rare, Epic, Legendary) shown on its level-up card. Rarer skills are offered less often (Luck raises the odds) but are much stronger. The Legendary skills are **Starfall** (meteor strikes), **Abyssal Maw** (a huge void that pulls enemies in and shreds them), **Crown of Ruin** and **Heart of Eternity**.

There's also a **daily reward**: a 7-day login streak with gold every day, a relic on Day 3 and a better relic on Day 7. Missing a day restarts the streak.

**Between runs (the long grind):** each system has one job.
- **Gold → Shrine:** permanent stat upgrades with rising costs (20 upgrade lines). Refunds are free, so you can experiment.
- **Feats:** milestone achievements that unlock the 8 characters, 4 extra weapons, 2 more maps, Endless mode, Nightfall and relic slots.
- **Relics:** rare items with rarity tiers (Common → Legendary) that drop from boss chests. Duplicates add stars (up to 5). Equip them in 1–5 slots.
- **Bounties:** three offline "daily-style" contracts that refresh as you finish them. They don't depend on the real-world date.
- **Nightfall 1–15:** per-map difficulty tiers unlocked by winning. They make enemies stronger but give much more gold and better relic odds. This is the long-term prestige ladder, and it never wipes your progress.
- **Endless mode:** no final victory. Bosses keep coming and scaling turns exponential after 25:00, so the question is how long you last.

If the app gets closed mid-run, the gold and kills from that run are recovered the next time it opens.

## Performance

These numbers are measured with the included tests in headless Chromium, using a 390×844 iPhone-sized viewport:

| Scenario | FPS | Simulation / frame | Heap |
|---|---|---|---|
| Late game (minute 20, 6 evolved weapons, ~300 enemies) | 60 | 0.2 ms | 9.5 MB |
| Worst case: 500 enemies alive | 60 | 0.3 ms | 9.5 MB |
| Late game with CPU throttled 6× | 53 | 1.4 ms | 9.5 MB |
| 45-minute Endless session | n/a | n/a | flat at 9.5 MB |

How it stays light:
- It renders at a low internal resolution (about 234×507 on an iPhone), scaled up with whole-pixel scaling.
- Enemies, projectiles, gems and effects are pooled. All collision goes through a uniform spatial grid, and there is no physics engine.
- The art comes from a single texture atlas. Hit-flash and flipped sprites are pre-baked, and fire pools and lighting are cached images.
- There are hard caps on enemies, gems (overflow merges into existing gems), particles and damage numbers. **Auto performance** lowers the enemy cap if frames get slow, and **Settings** has manual limits (200 / 350 / 500 enemies, low effects).
- No network, telemetry or background work. The game pauses itself when the app goes to the background.

## Project layout

```
index.html, style.css      page shell and menu styling
manifest.webmanifest, sw.js, sw-assets.js   installable app and offline cache
src/main.js                loop, canvas scaling, glue
src/core/                  input (touch/keyboard/gamepad), synthesized audio, math
src/gfx/                   pixel-art sprite data, texture atlas, bitmap font, renderer
src/game/                  run simulation: enemies + grid, weapons, spawner, stats, effects
src/data/                  all balance numbers: weapons, passives, enemies, maps, characters, meta
src/meta/                  save/load/export and progression rules
src/ui/                    menus and in-run overlays (DOM)
src/dev/bot.js             test autopilot (only active with ?bot=1 / ?stress=1)
tests/                     browser tests (Playwright)
tools/                     sprite validator, icon generator, offline-cache list generator
```

To change balance, edit the files in `src/data/`. Each file explains its numbers.

## Development

```
npm install          # installs Playwright (tests only; the game itself has no dependencies)
npm run serve        # http://localhost:8080
npm test             # sprite check + menu/save flow + offline + bot run + 500-enemy perf test
node tools/update-sw.mjs   # run after changing any game file, so installed copies update
```

Handy URLs while developing:
- `?bot=1&speed=8`: watch an autopilot play at 8× speed. Add `&god=1`, `&map=crypt`, `&char=huntress`, `&mode=endless` or `&nf=5` to vary the run.
- `?stress=1`: late-game stress scene with a fully evolved build and up to 500 enemies.

If you only need to run the game locally, any static file server works: the game needs nothing but static files.

## Publishing (GitHub Pages)

The workflow in `.github/workflows/pages.yml` publishes the game whenever `main` changes. One-time setup: in the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. The game will then be at `https://i2w23192.github.io/some-game-/`.

## Credits

All game code, pixel art and sound effects were created for this project. The font is [Pixelify Sans](https://github.com/eifetx/Pixelify-Sans), used under the SIL Open Font License (`assets/fonts/OFL-LICENSE.txt`).
