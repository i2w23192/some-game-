// All menus and in-run overlays (DOM layer above the game canvas).
// Navigation works with touch, mouse, keyboard and gamepad: anything with
// [data-f] is focusable and arrow keys / d-pad move focus spatially.

import { h, btn, icon } from './dom.js';
import { atlas } from '../gfx/atlas.js';
import { sfx } from '../core/audio.js';
import { formatTime, formatNum } from '../core/math.js';
import { WEAPONS, MAX_WEAPON_LEVEL } from '../data/weapons.js';
import { PASSIVES } from '../data/passives.js';
import { CHARACTERS, CHARACTER_IDS } from '../data/characters.js';
import { MAPS, MAP_IDS } from '../data/maps.js';
import { SHOP, shopCost, RELICS, RARITIES, RELIC_MAX_STARS, FEATS, nightfallMods } from '../data/meta.js';
import {
  isCharUnlocked, isMapUnlocked, endlessUnlocked, nightfallUnlocked, maxNightfall,
  relicSlots, rewardText, buyUpgrade, refundAll, toggleEquip, ensureBounties,
  claimBounty, rerollBounty,
} from '../meta/progression.js';
import { RARITY } from '../data/rarity.js';
import { redeemCode } from '../meta/gift.js';
import { dailyStatus, claimDaily, DAILY_REWARDS, rewardScale } from '../meta/daily.js';
import { leaderboardView } from '../meta/leaderboard.js';
import { exportCode, importCode, wipeProfile, defaultProfile } from '../meta/save.js';

const FEAT_BY_ID = Object.fromEntries(FEATS.map((f) => [f.id, f]));

export class UI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ui');
    this.hud = document.getElementById('hud');
    this.screen = null;
    this.onBack = null;
    this.toastEl = null;
    this.buildHud();
  }

  get p() { return this.game.profile; }

  // ------------------------------------------------------------ plumbing
  mount(name, el, onBack = null) {
    this.root.innerHTML = '';
    this.root.appendChild(el);
    this.root.classList.add('open');
    this.screen = name;
    this.onBack = onBack;
    this.game.input.enabled = false;
    requestAnimationFrame(() => this.focusFirst());
  }

  close() {
    this.root.innerHTML = '';
    this.root.classList.remove('open');
    this.screen = null;
    this.onBack = null;
    this.game.input.enabled = true;
  }

  isOpen() { return !!this.screen; }

  focusables() {
    return [...this.root.querySelectorAll('[data-f]:not([disabled])')].filter((e) => e.offsetParent !== null);
  }

  focusFirst() {
    if (this.game.input.mode === 'touch') return;
    const f = this.root.querySelector('[data-autofocus]') || this.focusables()[0];
    if (f) f.focus({ preventScroll: false });
  }

  // Returns true if the action was used by the menu.
  nav(action) {
    if (!this.screen) {
      if (action === 'pause' && this.game.run) { this.game.togglePause(); return true; }
      return false;
    }
    const items = this.focusables();
    const cur = document.activeElement && items.includes(document.activeElement) ? document.activeElement : null;
    if (action === 'ok') {
      if (cur) { cur.click(); return true; }
      return false;
    }
    if (action === 'back' || action === 'pause') {
      if (this.onBack) { sfx.click(); this.onBack(); return true; }
      return false;
    }
    if (action === 'prevtab' || action === 'nexttab') return false;
    if (!cur) { if (items[0]) items[0].focus(); return true; }
    // Spatial navigation
    const r = cur.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = null, bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      const b = el.getBoundingClientRect();
      const x = b.left + b.width / 2, y = b.top + b.height / 2;
      const dx = x - cx, dy = y - cy;
      let main, cross;
      if (action === 'up') { main = -dy; cross = Math.abs(dx); }
      else if (action === 'down') { main = dy; cross = Math.abs(dx); }
      else if (action === 'left') { main = -dx; cross = Math.abs(dy); }
      else { main = dx; cross = Math.abs(dy); }
      if (main <= 2) continue;
      const score = main + cross * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); sfx.click(); }
    return true;
  }

  // ------------------------------------------------------------ HUD layer
  buildHud() {
    this.pauseBtn = h('button', { class: 'pausebtn', 'aria-label': 'Pause', onclick: () => this.game.togglePause() }, h('span'), h('span'));
    this.bossBanner = h('div', { class: 'banner' });
    this.toastBox = h('div', { class: 'toasts' });
    this.fpsEl = h('div', { class: 'fps' });
    this.hud.append(this.pauseBtn, this.bossBanner, this.fpsEl);
    document.getElementById('app').appendChild(this.toastBox); // visible in menus too
    this.setHud(false);
  }

  setHud(on) {
    this.hud.style.display = on ? 'block' : 'none';
  }

  toast(text, cls = '') {
    const t = h('div', { class: 'toast ' + cls }, text);
    this.toastBox.appendChild(t);
    while (this.toastBox.children.length > 3) this.toastBox.firstChild.remove();
    setTimeout(() => t.remove(), 2600);
  }

  bossWarning(name) {
    this.bossBanner.textContent = name.toUpperCase() + ' AWAKENS';
    this.bossBanner.classList.remove('show');
    void this.bossBanner.offsetWidth;
    this.bossBanner.classList.add('show');
  }

  // ------------------------------------------------------------ title
  showTitle() {
    const p = this.p;
    ensureBounties(p);
    const claimable = p.bounties.filter((b) => b.done).length;
    const daily = dailyStatus(p);
    // Greet the player with today's reward once per app launch.
    if (daily.canClaim && !this.dailyShown) { this.dailyShown = true; this.showDaily(); return; }
    const el = h('div', { class: 'screen title' },
      h('div', { class: 'logo' },
        h('div', { class: 'logo-art' }, icon(atlas.icon('warden', 6), 'hero'), icon(atlas.icon('brazier', 5), 'flame')),
        h('h1', null, 'GRAVELIGHT'),
        p.admin ? h('div', { class: 'admin-badge' }, 'ADMIN') : null,
        h('div', { class: 'sub' }, 'Hold the light. Survive the night.')),
      h('div', { class: 'gold-line' }, icon(atlas.icon('coin', 3), 'ico-s'), formatNum(p.gold)),
      h('div', { class: 'menu' },
        btn('Play', () => this.showCharacters(), 'big primary', { 'data-autofocus': true }),
        h('div', { class: 'row2' },
          btn('Shrine', () => this.showShrine()),
          btn('Relics', () => this.showRelics())),
        h('div', { class: 'row2' },
          btn('Feats', () => this.showFeats()),
          btn(['Bounties', claimable ? h('span', { class: 'badge' }, String(claimable)) : null], () => this.showBounties())),
        h('div', { class: 'row3' },
          btn(['Daily', daily.canClaim ? h('span', { class: 'badge' }, '!') : null], () => this.showDaily()),
          btn('Records', () => this.showLeaderboard()),
          btn('Settings', () => this.showSettings()))),
      h('div', { class: 'foot' },
        `Runs ${p.stats.runs} · Kills ${formatNum(p.stats.kills)} · Best ${formatTime(Math.max(0, ...Object.values(p.best), 0))}`));
    this.mount('title', el, null);
  }

  // ------------------------------------------------------------ characters
  showCharacters() {
    const p = this.p;
    let sel = isCharUnlocked(p, p.last.char) ? p.last.char : 'warden';
    const grid = h('div', { class: 'grid2' });
    const detail = h('div', { class: 'detail' });
    const renderDetail = () => {
      const c = CHARACTERS[sel], w = WEAPONS[c.weapon];
      detail.innerHTML = '';
      detail.append(
        h('div', { class: 'detail-head' }, icon(atlas.icon(sel, 5), 'portrait'),
          h('div', null, h('h3', null, c.name), h('div', { class: 'muted' }, c.desc))),
        h('div', { class: 'perk' }, c.perk),
        h('div', { class: 'perk' }, icon(atlas.icon(w.icon, 3), 'ico-s'), 'Starts with ', h('b', null, w.name)),
        h('div', { class: 'muted' }, p.charWins[sel] ? `Wins: ${p.charWins[sel]}` : 'No wins yet'));
    };
    for (const id of CHARACTER_IDS) {
      const c = CHARACTERS[id];
      const open = isCharUnlocked(p, id);
      const card = h('button', {
        class: 'card char' + (open ? '' : ' locked') + (id === sel ? ' sel' : ''), 'data-f': true,
        onclick: () => {
          if (!open) { sfx.click(); this.toast(`Unlock: ${FEAT_BY_ID[c.unlock].desc}`); return; }
          sel = id; sfx.click();
          grid.querySelectorAll('.card').forEach((x) => x.classList.remove('sel'));
          card.classList.add('sel');
          renderDetail();
        },
      },
      open ? icon(atlas.icon(id, 4), 'portrait-s') : icon(atlas.icon('lock', 4), 'portrait-s'),
      h('div', { class: 'card-name' }, open ? c.name : '???'),
      open ? null : h('div', { class: 'card-sub' }, FEAT_BY_ID[c.unlock].desc));
      grid.appendChild(card);
    }
    renderDetail();
    const el = h('div', { class: 'screen' },
      h('h2', null, 'Choose your Warden'),
      grid, detail,
      h('div', { class: 'bar' },
        btn('Back', () => this.showTitle()),
        btn('Next', () => { p.last.char = sel; this.game.save(); this.showMaps(); }, 'primary', { 'data-autofocus': true })));
    this.mount('chars', el, () => this.showTitle());
  }

  // ------------------------------------------------------------ maps
  showMaps() {
    const p = this.p;
    let map = isMapUnlocked(p, p.last.map) ? p.last.map : 'gravewood';
    let mode = p.last.mode === 'endless' && endlessUnlocked(p) ? 'endless' : 'standard';
    let nf = Math.min(p.last.nightfall || 0, maxNightfall(p, map));
    const list = h('div', { class: 'list' });
    const opts = h('div', { class: 'opts' });
    const render = () => {
      list.innerHTML = '';
      for (const id of MAP_IDS) {
        const m = MAPS[id], open = isMapUnlocked(p, id);
        const unlockFeat = FEATS.find((f) => f.reward.map === id);
        const best = p.best[id] ? `Best ${formatTime(p.best[id])}` : 'Not yet survived';
        const wins = p.wins[id] ? ` · Wins ${p.wins[id]}` : '';
        list.appendChild(h('button', {
          class: 'card map' + (open ? '' : ' locked') + (id === map ? ' sel' : ''), 'data-f': true,
          style: `--g:${m.ground.base}`,
          onclick: () => {
            if (!open) { this.toast(`Unlock: ${unlockFeat.desc}`); return; }
            map = id; nf = Math.min(nf, maxNightfall(p, map)); sfx.click(); render();
          },
        },
        h('div', { class: 'card-name' }, open ? m.name : '???'),
        h('div', { class: 'card-sub' }, open ? m.desc : `Unlock: ${unlockFeat.desc}`),
        open ? h('div', { class: 'card-sub' }, best + wins + (p.bestEndless[id] ? ` · Endless ${formatTime(p.bestEndless[id])}` : '')) : null,
        open ? h('div', { class: 'tags' }, h('span', null, `Enemy HP x${m.hp}`), h('span', { class: 'gold' }, `Gold x${m.gold}`)) : null));
      }
      opts.innerHTML = '';
      if (endlessUnlocked(p)) {
        opts.appendChild(h('div', { class: 'opt' }, h('span', null, 'Mode'),
          h('div', { class: 'seg' },
            btn('Standard', () => { mode = 'standard'; render(); }, mode === 'standard' ? 'on' : ''),
            btn('Endless', () => { mode = 'endless'; render(); }, mode === 'endless' ? 'on' : ''))));
      } else {
        opts.appendChild(h('div', { class: 'opt muted' }, 'Standard: survive 25:00 and defeat the final boss.'));
      }
      const maxNf = maxNightfall(p, map);
      if (nightfallUnlocked(p)) {
        const mods = nightfallMods(nf);
        opts.appendChild(h('div', { class: 'opt' }, h('span', null, 'Nightfall'),
          h('div', { class: 'stepper' },
            btn('-', () => { nf = Math.max(0, nf - 1); render(); }, '', { disabled: nf <= 0 }),
            h('b', null, String(nf)),
            btn('+', () => { nf = Math.min(maxNf, nf + 1); render(); }, '', { disabled: nf >= maxNf }))));
        opts.appendChild(h('div', { class: 'opt muted small' }, nf
          ? `Enemies +${Math.round((mods.hp - 1) * 100)}% HP, +${Math.round((mods.dmg - 1) * 100)}% damage. Gold +${Math.round((mods.gold - 1) * 100)}%, rarer relics.`
          : `Win to unlock the next Nightfall level (max here: ${maxNf}).`));
      }
    };
    render();
    const start = () => {
      p.last.map = map; p.last.mode = mode; p.last.nightfall = nf;
      this.game.save();
      this.game.startRun({ char: p.last.char, map, mode, nightfall: nf });
    };
    const el = h('div', { class: 'screen' },
      h('h2', null, 'Choose the Ground'),
      list, opts,
      h('div', { class: 'bar' },
        btn('Back', () => this.showCharacters()),
        btn('Begin', start, 'primary', { 'data-autofocus': true })));
    this.mount('maps', el, () => this.showCharacters());
  }

  // ------------------------------------------------------------ shrine
  showShrine() {
    const p = this.p;
    const goldEl = h('div', { class: 'gold-line' });
    const list = h('div', { class: 'list' });
    const render = () => {
      goldEl.innerHTML = '';
      goldEl.append(icon(atlas.icon('coin', 3), 'ico-s'), formatNum(p.gold));
      const focusedId = document.activeElement && document.activeElement.dataset.id;
      list.innerHTML = '';
      for (const item of SHOP) {
        const lvl = p.shop[item.id] || 0, maxed = lvl >= item.max;
        const cost = maxed ? 0 : shopCost(item, lvl);
        const pips = h('div', { class: 'pips' });
        for (let i = 0; i < item.max; i++) pips.appendChild(h('i', { class: i < lvl ? 'on' : '' }));
        const b = h('button', {
          class: 'card shop' + (maxed ? ' maxed' : p.gold >= cost ? ' afford' : ''), 'data-f': true, 'data-id': item.id,
          onclick: () => {
            if (buyUpgrade(p, item.id)) { sfx.buy(); this.game.save(); render(); }
            else sfx.click();
          },
        },
        icon(atlas.icon(item.icon, 3), 'ico'),
        h('div', { class: 'grow' }, h('div', { class: 'card-name' }, item.name), h('div', { class: 'card-sub' }, item.text), pips),
        h('div', { class: 'price' }, maxed ? 'MAX' : [icon(atlas.icon('coin', 2), 'ico-xs'), formatNum(cost)]));
        list.appendChild(b);
        if (focusedId === item.id && this.game.input.mode !== 'touch') requestAnimationFrame(() => b.focus());
      }
    };
    render();
    const el = h('div', { class: 'screen' },
      h('h2', null, 'The Shrine'),
      h('div', { class: 'muted center' }, 'Permanent blessings. Refunds are free.'),
      goldEl, list,
      h('div', { class: 'bar' },
        btn('Back', () => this.showTitle()),
        btn('Refund all', () => {
          this.confirm('Refund every Shrine upgrade?', () => { refundAll(p); this.game.save(); this.showShrine(); }, () => this.showShrine());
        })));
    this.mount('shrine', el, () => this.showTitle());
  }

  // ------------------------------------------------------------ relics
  showRelics() {
    const p = this.p;
    const slots = relicSlots(p);
    const slotRow = h('div', { class: 'slots' });
    const grid = h('div', { class: 'grid4' });
    const detail = h('div', { class: 'detail' });
    let sel = null;
    const render = () => {
      slotRow.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const id = p.equipped[i];
        slotRow.appendChild(h('div', { class: 'slot' + (i >= slots ? ' locked' : '') },
          id ? icon(atlas.icon(RELICS[id].icon, 3)) : i >= slots ? icon(atlas.icon('lock', 3)) : null));
      }
      grid.innerHTML = '';
      for (const id in RELICS) {
        const r = RELICS[id], stars = p.relics[id] || 0;
        const eq = p.equipped.includes(id);
        grid.appendChild(h('button', {
          class: 'relic' + (stars ? '' : ' unknown') + (eq ? ' eq' : '') + (sel === id ? ' sel' : ''), 'data-f': true,
          style: `--rc:${RARITIES[r.rarity].color}`,
          onclick: () => { sel = id; sfx.click(); render(); },
        }, stars ? icon(atlas.icon(r.icon, 3)) : h('span', { class: 'q' }, '?'),
        stars ? h('span', { class: 'stars' }, '★'.repeat(stars)) : null));
      }
      detail.innerHTML = '';
      if (!sel) {
        detail.append(h('div', { class: 'muted' }, `Relics drop from boss chests (and rarely elites). Duplicates add stars, up to ${RELIC_MAX_STARS}. Equipped: ${p.equipped.length}/${slots}.`));
      } else {
        const r = RELICS[sel], stars = p.relics[sel] || 0, rar = RARITIES[r.rarity];
        if (!stars) {
          detail.append(h('h3', { style: `color:${rar.color}` }, `Undiscovered ${rar.name} relic`), h('div', { class: 'muted' }, 'Keep hunting bosses.'));
        } else {
          const eq = p.equipped.includes(sel);
          detail.append(
            h('div', { class: 'detail-head' }, icon(atlas.icon(r.icon, 5), 'portrait'),
              h('div', null, h('h3', { style: `color:${rar.color}` }, r.name), h('div', { class: 'muted' }, `${rar.name} · ${'★'.repeat(stars)}${'☆'.repeat(RELIC_MAX_STARS - stars)}`))),
            h('div', { class: 'perk' }, r.text),
            btn(eq ? 'Unequip' : p.equipped.length >= slots ? 'Slots full' : 'Equip', () => {
              if (toggleEquip(p, sel)) { sfx.buy(); this.game.save(); render(); } else this.toast('All relic slots are full.');
            }, eq ? '' : 'primary'));
        }
      }
    };
    render();
    const found = Object.keys(p.relics).length;
    const el = h('div', { class: 'screen' },
      h('h2', null, 'Relics'),
      h('div', { class: 'muted center' }, `${found}/${Object.keys(RELICS).length} discovered`),
      slotRow, grid, detail,
      h('div', { class: 'bar' }, btn('Back', () => this.showTitle())));
    this.mount('relics', el, () => this.showTitle());
  }

  // ------------------------------------------------------------ daily reward
  showDaily(claimed = null) {
    const p = this.p;
    const st = dailyStatus(p);
    const scale = rewardScale(p);
    const strip = h('div', { class: 'daily-strip' });
    for (const r of DAILY_REWARDS) {
      const done = st.canClaim ? r.day < st.day : r.day <= st.day;
      const today = st.canClaim && r.day === st.day;
      strip.appendChild(h('div', { class: 'dday' + (done ? ' done' : '') + (today ? ' today' : '') + (r.day === 7 ? ' big' : '') },
        h('div', { class: 'dnum' }, 'Day ' + r.day),
        icon(atlas.icon(r.relicLuck ? (r.day === 7 ? 'bosschest' : 'chest') : 'coinbag', 3), 'ico'),
        h('div', { class: 'dgold' }, formatNum(Math.round(r.gold * scale))),
        r.relicLuck ? h('div', { class: 'dextra' }, r.day === 7 ? '+ great relic' : '+ relic') : null,
        done ? h('div', { class: 'dcheck' }, '✓') : null));
    }
    const result = claimed ? h('div', { class: 'list' },
      h('div', { class: 'card reward-card goldr' }, icon(atlas.icon('coinbag', 4), 'ico-l'),
        h('div', { class: 'grow' }, h('div', { class: 'card-name' }, `+${formatNum(claimed.gold)} gold`))),
      claimed.relic ? (() => {
        const r = RELICS[claimed.relic.id], rar = RARITIES[claimed.relic.rarity];
        return h('div', { class: 'card reward-card relicr', style: `--rc:${rar.color}` }, icon(atlas.icon(r.icon, 4), 'ico-l'),
          h('div', { class: 'grow' }, h('div', { class: 'card-name', style: `color:${rar.color}` }, r.name,
            h('span', { class: 'tag new' }, claimed.relic.isNew ? 'NEW RELIC' : claimed.relic.dupeGold ? 'MAXED' : `★${claimed.relic.stars}`)),
          h('div', { class: 'card-sub' }, claimed.relic.dupeGold ? `Converted to ${claimed.relic.dupeGold} gold` : `${rar.name} · ${r.text}`)));
      })() : null) : null;
    const el = h('div', { class: 'screen modal' },
      h('div', { class: 'panel daily' },
        h('h2', { class: 'glow' }, 'Daily Reward'),
        h('div', { class: 'muted center' }, st.canClaim
          ? (st.streak ? `Streak: ${st.streak} day${st.streak > 1 ? 's' : ''}. Come back every day to reach Day 7!` : 'Log in each day in a row to climb to the Day 7 treasure.')
          : `Streak: ${st.streak} day${st.streak > 1 ? 's' : ''}. Next reward tomorrow.`),
        strip, result,
        st.canClaim
          ? btn(`Claim Day ${st.day}`, () => { const res = claimDaily(p); this.game.save(); sfx.chest(); this.showDaily(res); }, 'primary', { 'data-autofocus': true })
          : btn('Continue', () => this.showTitle(), 'primary', { 'data-autofocus': true }),
        h('div', { class: 'muted small center' }, 'Missing a day restarts the streak at Day 1.')));
    this.mount('daily', el, () => this.showTitle());
  }

  // ------------------------------------------------------------ leaderboard
  showLeaderboard(mode = 'standard', map = 'all') {
    const p = this.p;
    const rows = leaderboardView(p, mode, map);
    const list = h('div', { class: 'list' });
    if (!rows.length) list.appendChild(h('div', { class: 'card note' }, 'No runs here yet. Go set a record!'));
    rows.slice(0, 50).forEach((e, i) => {
      const d = new Date(e.date);
      list.appendChild(h('div', { class: 'card lbrow' + (i < 3 ? ' top' + (i + 1) : '') },
        h('b', { class: 'lbrank' }, '#' + (i + 1)),
        icon(atlas.icon(e.char, 3), 'ico'),
        h('div', { class: 'grow' },
          h('div', { class: 'card-name' }, formatNum(e.score),
            e.victory ? h('span', { class: 'tag new' }, 'WIN') : null,
            e.nightfall ? h('span', { class: 'tag' }, 'NF ' + e.nightfall) : null),
          h('div', { class: 'card-sub' }, `${formatTime(e.time)} · Lv ${e.level} · ${formatNum(e.kills)} kills · ${MAPS[e.map].name}`),
          h('div', { class: 'card-sub' }, `${CHARACTERS[e.char].name} · ${d.toLocaleDateString()}`))));
    });
    const tab = (label, on, fn) => btn(label, fn, on ? 'on' : '');
    const el = h('div', { class: 'screen' },
      h('h2', null, 'Records'),
      h('div', { class: 'muted center small' }, 'Your best runs on this device. Score = kills, time, level, bosses and wins, boosted by map and Nightfall.'),
      h('div', { class: 'seg center-seg' },
        tab('Standard', mode === 'standard', () => this.showLeaderboard('standard', map)),
        endlessUnlocked(p) || p.leaderboard.some((e) => e.mode === 'endless') ? tab('Endless', mode === 'endless', () => this.showLeaderboard('endless', map)) : null),
      h('div', { class: 'seg center-seg wrap' },
        tab('All maps', map === 'all', () => this.showLeaderboard(mode, 'all')),
        MAP_IDS.filter((id) => isMapUnlocked(p, id)).map((id) => tab(MAPS[id].name, map === id, () => this.showLeaderboard(mode, id)))),
      list,
      h('div', { class: 'bar' }, btn('Back', () => this.showTitle())));
    this.mount('records', el, () => this.showTitle());
  }

  // ------------------------------------------------------------ feats
  showFeats() {
    const p = this.p;
    const list = h('div', { class: 'list' });
    const done = FEATS.filter((f) => p.feats[f.id]).length;
    for (const f of FEATS) {
      const got = !!p.feats[f.id];
      let bar = null;
      if (!got && f.progress) {
        const [cur, max] = f.progress(p);
        bar = h('div', { class: 'progress' }, h('i', { style: `width:${Math.min(100, (cur / max) * 100)}%` }), h('span', null, `${formatNum(cur)} / ${formatNum(max)}`));
      }
      list.appendChild(h('div', { class: 'card feat' + (got ? ' done' : ''), 'data-f': true, tabindex: 0 },
        icon(atlas.icon(got ? 'star' : 'lock', 3), 'ico'),
        h('div', { class: 'grow' },
          h('div', { class: 'card-name' }, f.name),
          h('div', { class: 'card-sub' }, f.desc),
          h('div', { class: 'card-sub reward' }, rewardText(f.reward)),
          bar)));
    }
    const el = h('div', { class: 'screen' },
      h('h2', null, 'Feats'),
      h('div', { class: 'muted center' }, `${done}/${FEATS.length} complete`),
      list,
      h('div', { class: 'bar' }, btn('Back', () => this.showTitle())));
    this.mount('feats', el, () => this.showTitle());
  }

  // ------------------------------------------------------------ bounties
  showBounties() {
    const p = this.p;
    ensureBounties(p);
    const list = h('div', { class: 'list' });
    p.bounties.forEach((b, i) => {
      list.appendChild(h('div', { class: 'card bounty' + (b.done ? ' done' : '') },
        h('div', { class: 'grow' },
          h('div', { class: 'card-name' }, b.text),
          h('div', { class: 'card-sub reward' }, `Reward: ${formatNum(b.reward)} gold${b.relic ? ' + relic' : ''}`)),
        b.done
          ? btn('Claim', () => {
            const res = claimBounty(p, i);
            this.game.save();
            sfx.chest();
            this.toast(`+${formatNum(res.gold)} gold`, 'gold');
            if (res.relic) this.toast(`Relic: ${RELICS[res.relic.id].name}`, 'gold');
            this.showBounties();
          }, 'primary')
          : btn(`Swap (${p.bountyRerolls})`, () => {
            if (rerollBounty(p, i)) { this.game.save(); this.showBounties(); } else this.toast('Finish a run to get another swap.');
          }, '', { disabled: p.bountyRerolls <= 0 })));
    });
    const el = h('div', { class: 'screen' },
      h('h2', null, 'Bounties'),
      h('div', { class: 'muted center' }, 'Contracts refresh as you complete them. Progress counts from any single run.'),
      list,
      h('div', { class: 'bar' }, btn('Back', () => this.showTitle())));
    this.mount('bounties', el, () => this.showTitle());
  }

  // ------------------------------------------------------------ settings
  showSettings(fromPause = false) {
    const p = this.p, st = p.settings;
    const back = () => (fromPause ? this.showPause() : this.showTitle());
    const apply = () => { this.game.applySettings(); this.game.save(); this.showSettings(fromPause); };
    const toggle = (label, key) => h('div', { class: 'opt' }, h('span', null, label),
      btn(st[key] ? 'On' : 'Off', () => { st[key] = !st[key]; apply(); }, st[key] ? 'on' : ''));
    const choice = (label, key, values, names) => h('div', { class: 'opt' }, h('span', null, label),
      h('div', { class: 'seg' }, values.map((v, i) => btn(names[i], () => { st[key] = v; apply(); }, st[key] === v ? 'on' : ''))));
    const exportBox = h('textarea', { class: 'code', readonly: true, rows: 3 });
    const importBox = h('textarea', { class: 'code', rows: 3, placeholder: 'Paste a save code here' });
    const giftBox = h('input', { class: 'code gift', type: 'text', placeholder: 'Enter code', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' });
    const el = h('div', { class: 'screen' },
      h('h2', null, 'Settings'),
      h('div', { class: 'opt' }, h('span', null, 'Sound'),
        h('div', { class: 'stepper' },
          btn('-', () => { st.volume = Math.max(0, Math.round((st.volume - 0.1) * 10) / 10); apply(); }),
          h('b', null, `${Math.round(st.volume * 100)}%`),
          btn('+', () => { st.volume = Math.min(1, Math.round((st.volume + 0.1) * 10) / 10); apply(); }))),
      toggle('Damage numbers', 'numbers'),
      toggle('Screen shake', 'shake'),
      choice('Effects', 'quality', ['high', 'low'], ['High', 'Low']),
      choice('Max enemies', 'maxEnemies', [200, 350, 500], ['200', '350', '500']),
      toggle('Auto performance', 'autoPerf'),
      toggle('Show FPS', 'showFps'),
      choice('Joystick', 'fixedStick', [false, true], ['Floating', 'Fixed']),
      h('h3', null, 'Gift code'),
      h('div', { class: 'row2' },
        giftBox,
        btn('Redeem', async () => {
          const msg = await redeemCode(p, giftBox.value);
          if (!msg) { this.toast('That code is not valid.'); return; }
          this.game.save(); sfx.chest(); this.toast(msg, 'gold'); giftBox.value = '';
        }, 'primary')),
      h('h3', null, 'Save data'),
      h('div', { class: 'muted small' }, 'Progress saves automatically on this device. Copy a backup code to keep it safe or move it to another device.'),
      h('div', { class: 'row2' },
        btn('Show backup code', () => {
          exportBox.value = exportCode(p);
          exportBox.select();
          if (navigator.clipboard) navigator.clipboard.writeText(exportBox.value).then(() => this.toast('Copied to clipboard')).catch(() => {});
        }),
        btn('Load code', () => {
          try {
            const np = importCode(importBox.value);
            this.confirm('Replace current progress with this save?', () => { this.game.replaceProfile(np); this.toast('Save loaded'); this.showTitle(); }, () => this.showSettings(fromPause));
          } catch (e) { this.toast(e.message); }
        })),
      exportBox, importBox,
      fromPause ? null : btn('Reset all progress', () => {
        this.confirm('Erase ALL progress? This cannot be undone.', () => {
          this.confirm('Really erase everything?', () => { wipeProfile(); this.game.replaceProfile(defaultProfile()); this.showTitle(); }, () => this.showSettings());
        }, () => this.showSettings());
      }, 'danger'),
      h('div', { class: 'muted small' }, 'Controls: move with the left stick / WASD / drag anywhere. Dash with A, Space or the button. Pause with Start / Esc.'),
      h('div', { class: 'muted small' }, 'Font: Pixelify Sans (SIL Open Font License). All art and sound are made in code for this game.'),
      h('div', { class: 'bar' }, btn('Back', back, 'primary')));
    this.mount('settings', el, back);
  }

  confirm(text, yes, no) {
    const el = h('div', { class: 'screen modal' },
      h('div', { class: 'panel' },
        h('h3', null, text),
        h('div', { class: 'row2' }, btn('No', no, '', { 'data-autofocus': true }), btn('Yes', yes, 'danger'))));
    this.mount('confirm', el, no);
  }

  notice(title, text, ok) {
    const el = h('div', { class: 'screen modal' },
      h('div', { class: 'panel' }, h('h3', null, title), h('div', { class: 'muted' }, text), btn('OK', ok, 'primary', { 'data-autofocus': true })));
    this.mount('notice', el, ok);
  }

  // ------------------------------------------------------------ in-run: level up
  choiceCard(c, run, onPick) {
    let name, desc, ic, tag, hint = null, rarity = null;
    if (c.type === 'weapon') {
      const d = WEAPONS[c.id];
      name = d.name; ic = d.icon; rarity = d.rarity;
      tag = c.level === 1 ? 'NEW' : `LV ${c.level}`;
      desc = c.level === 1 ? d.desc : d.levels[c.level - 2].text;
      if (d.evolve) {
        const pas = PASSIVES[d.evolve.passive];
        const has = !!run.passives[d.evolve.passive];
        hint = h('div', { class: 'hint' + (has ? ' ready' : '') }, icon(atlas.icon(pas.icon, 2), 'ico-xs'), `Evolves at LV ${MAX_WEAPON_LEVEL} with ${pas.name}`);
      }
    } else if (c.type === 'passive') {
      const d = PASSIVES[c.id];
      name = d.name; ic = d.icon; rarity = d.rarity;
      tag = c.level === 1 ? 'NEW' : `LV ${c.level}`;
      desc = d.text;
      const w = run.weapons.find((x) => x.def.evolve && x.def.evolve.passive === c.id);
      if (w) hint = h('div', { class: 'hint ready' }, icon(atlas.icon(w.def.icon, 2), 'ico-xs'), `Evolves ${w.def.name}`);
    } else if (c.type === 'gold') {
      name = 'Gold'; ic = 'coinbag'; tag = ''; desc = `+${c.amount} gold`;
    } else {
      name = 'Feast'; ic = 'heart'; tag = ''; desc = `Heal ${c.amount}`;
    }
    const rid = rarity || 'common';
    const rar = RARITY[rid];
    return h('button', { class: 'card choice rar-' + rid, style: `--rc:${rar.color}`, 'data-f': true, onclick: () => onPick(c) },
      icon(atlas.icon(ic, 4), 'ico-l'),
      h('div', { class: 'grow' },
        rarity ? h('div', { class: 'rarity' }, rar.name) : null,
        h('div', { class: 'card-name' }, name, tag ? h('span', { class: 'tag' + (tag === 'NEW' ? ' new' : '') }, tag) : null),
        h('div', { class: 'card-sub' }, desc), hint));
  }

  showLevelUp(choices) {
    const run = this.game.run;
    let banishMode = false;
    const cards = h('div', { class: 'list' });
    const tools = h('div', { class: 'row3' });
    const renderCards = (list) => {
      cards.innerHTML = '';
      for (const c of list) {
        cards.appendChild(this.choiceCard(c, run, (pick) => {
          if (banishMode) {
            const next = run.banish(pick);
            banishMode = false;
            if (next) { sfx.click(); renderCards(next); }
            return;
          }
          sfx.buy();
          this.close();
          run.resolveLevelUp(pick);
          if (!run.modal) this.game.resume();
        }));
      }
      renderTools();
      requestAnimationFrame(() => this.focusFirst());
    };
    const renderTools = () => {
      tools.innerHTML = '';
      tools.append(
        btn(`Reroll ${run.rerolls}`, () => { const n = run.reroll(); if (n) { sfx.click(); renderCards(n); } }, '', { disabled: run.rerolls <= 0 }),
        btn(`Skip ${run.skips}`, () => {
          if (run.skips <= 0) return;
          run.skips--; this.close(); run.resolveLevelUp(null); if (!run.modal) this.game.resume();
        }, '', { disabled: run.skips <= 0 }),
        btn(banishMode ? 'Pick one…' : `Banish ${run.banishes}`, () => { banishMode = !banishMode; renderTools(); }, banishMode ? 'danger' : '', { disabled: run.banishes <= 0 }));
    };
    const el = h('div', { class: 'screen modal levelup' },
      h('div', { class: 'panel' },
        h('h2', { class: 'glow' }, `Level ${run.level - run.pendingLevels + 1}`),
        cards, tools));
    this.mount('levelup', el, null);
    renderCards(choices);
  }

  // ------------------------------------------------------------ in-run: chest
  showChest(data, relic) {
    const run = this.game.run;
    const list = h('div', { class: 'list' });
    data.rewards.forEach((r, i) => {
      let name, sub, ic, cls = '';
      if (r.type === 'evolve') { const d = WEAPONS[r.id]; name = d.name; sub = 'EVOLVED! ' + d.desc; ic = d.icon; cls = 'evolve'; }
      else if (r.type === 'weapon') { const d = WEAPONS[r.id]; name = d.name; sub = `Level ${r.level}`; ic = d.icon; }
      else if (r.type === 'passive') { const d = PASSIVES[r.id]; name = d.name; sub = `Level ${r.level}`; ic = d.icon; }
      else { name = `+${formatNum(r.amount)} gold`; sub = ''; ic = 'coinbag'; cls = 'goldr'; }
      list.appendChild(h('div', { class: 'card reward-card ' + cls, style: `animation-delay:${i * 0.15}s` },
        icon(atlas.icon(ic, 4), 'ico-l'), h('div', { class: 'grow' }, h('div', { class: 'card-name' }, name), h('div', { class: 'card-sub' }, sub))));
    });
    if (relic) {
      const r = RELICS[relic.id], rar = RARITIES[relic.rarity];
      list.appendChild(h('div', { class: 'card reward-card relicr', style: `--rc:${rar.color};animation-delay:${data.rewards.length * 0.15}s` },
        icon(atlas.icon(r.icon, 4), 'ico-l'),
        h('div', { class: 'grow' },
          h('div', { class: 'card-name', style: `color:${rar.color}` }, r.name, h('span', { class: 'tag new' }, relic.isNew ? 'NEW RELIC' : relic.dupeGold ? 'MAXED' : `★${relic.stars}`)),
          h('div', { class: 'card-sub' }, relic.dupeGold ? `Converted to ${relic.dupeGold} gold` : `${rar.name} · ${r.text}`))));
    }
    const el = h('div', { class: 'screen modal chest' },
      h('div', { class: 'panel' },
        icon(atlas.icon(data.boss ? 'bosschest' : 'chest', 5), 'chest-ico'),
        h('h2', { class: 'glow' }, data.boss ? 'Boss Treasure' : 'Treasure'),
        list,
        btn('Continue', () => { this.close(); run.closeChest(); this.game.resume(); }, 'primary', { 'data-autofocus': true })));
    this.mount('chest', el, null);
  }

  // ------------------------------------------------------------ in-run: pause
  buildSummary(run) {
    const wrap = h('div', { class: 'build' });
    for (const w of run.weapons) {
      wrap.appendChild(h('div', { class: 'bitem' + (w.def.evolved ? ' evo' : '') }, icon(atlas.icon(w.def.icon, 3)), h('span', null, w.def.evolved ? '★' : w.level)));
    }
    for (const id in run.passives) {
      wrap.appendChild(h('div', { class: 'bitem' }, icon(atlas.icon(PASSIVES[id].icon, 3)), h('span', null, run.passives[id])));
    }
    return wrap;
  }

  showPause() {
    const run = this.game.run;
    const s = run.stats;
    const el = h('div', { class: 'screen modal' },
      h('div', { class: 'panel' },
        h('h2', null, 'Paused'),
        h('div', { class: 'muted center' }, `${MAPS[run.mapId].name}${run.endless ? ' · Endless' : ''}${run.nightfall ? ' · Nightfall ' + run.nightfall : ''}`),
        this.buildSummary(run),
        h('div', { class: 'statgrid' },
          stat('Damage', `+${Math.round((s.might - 1) * 100)}%`), stat('Cooldown', `${Math.round((s.cooldown - 1) * 100)}%`),
          stat('Area', `+${Math.round((s.area - 1) * 100)}%`), stat('Armor', s.armor),
          stat('Max HP', Math.round(run.player.maxHp)), stat('Regen', s.regen.toFixed(1)),
          stat('Speed', `+${Math.round((s.moveSpeed - 1) * 100)}%`), stat('Crit', `${Math.round(s.crit * 100)}%`),
          stat('Revives', run.revives), stat('Luck', `+${Math.round((s.luck - 1) * 100)}%`)),
        btn('Resume', () => this.game.togglePause(), 'primary', { 'data-autofocus': true }),
        h('div', { class: 'row2' },
          btn('Settings', () => this.showSettings(true)),
          btn('Give up', () => this.confirm('End this run? You keep the gold you found.', () => { this.close(); run.abandon(); }, () => this.showPause()), 'danger'))));
    this.mount('pause', el, () => this.game.togglePause());
  }

  // ------------------------------------------------------------ results
  showResults(sum, report) {
    const title = sum.victory ? 'Dawn Breaks' : 'The Light Fades';
    const rows = h('div', { class: 'dmg' });
    const maxDmg = Math.max(1, ...sum.weapons.map((w) => w.dmg));
    for (const w of [...sum.weapons].sort((a, b) => b.dmg - a.dmg)) {
      const d = WEAPONS[w.id];
      rows.appendChild(h('div', { class: 'dmgrow' }, icon(atlas.icon(d.icon, 2), 'ico-xs'), h('span', { class: 'grow' }, d.name),
        h('div', { class: 'progress thin' }, h('i', { style: `width:${(w.dmg / maxDmg) * 100}%` })), h('b', null, formatNum(w.dmg))));
    }
    const extras = h('div', { class: 'list' });
    for (const r of report.records) extras.appendChild(h('div', { class: 'card note' }, '★ ' + r));
    if (report.relic) {
      const r = RELICS[report.relic.id], rar = RARITIES[report.relic.rarity];
      extras.appendChild(h('div', { class: 'card reward-card relicr', style: `--rc:${rar.color}` }, icon(atlas.icon(r.icon, 4), 'ico-l'),
        h('div', { class: 'grow' }, h('div', { class: 'card-name', style: `color:${rar.color}` }, 'Victory relic: ' + r.name), h('div', { class: 'card-sub' }, report.relic.dupeGold ? `Maxed, +${report.relic.dupeGold} gold` : `${rar.name} · ★${report.relic.stars}`))));
    }
    for (const f of report.feats) {
      extras.appendChild(h('div', { class: 'card feat done unlocked' }, icon(atlas.icon('star', 3), 'ico'),
        h('div', { class: 'grow' }, h('div', { class: 'card-name' }, 'Feat: ' + f.name), h('div', { class: 'card-sub reward' }, rewardText(f.reward)))));
    }
    for (const b of report.bounties) extras.appendChild(h('div', { class: 'card note gold' }, `Bounty complete: ${b.text} (claim on the title screen)`));
    const el = h('div', { class: 'screen results' },
      h('h2', { class: sum.victory ? 'glow win' : 'lose' }, title),
      h('div', { class: 'statgrid big' },
        stat('Time', formatTime(sum.time)), stat('Level', sum.level),
        stat('Kills', formatNum(sum.kills)), stat('Gold', '+' + formatNum(report.gold)),
        stat('Score', formatNum(report.score)), stat('Rank', report.rank ? '#' + report.rank : '-')),
      rows, extras,
      h('div', { class: 'bar' },
        btn('Menu', () => this.showTitle()),
        btn('Again', () => this.game.startRun({ char: sum.char, map: sum.map, mode: sum.mode, nightfall: sum.nightfall }), 'primary', { 'data-autofocus': true })));
    this.mount('results', el, () => this.showTitle());
  }
}

function stat(label, value) {
  return h('div', { class: 'stat' }, h('span', null, label), h('b', null, String(value)));
}
