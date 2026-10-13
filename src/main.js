// Entry point: canvas sizing, the main loop and glue between the Run
// (simulation), Renderer, UI and the saved profile.

import { atlas } from './gfx/atlas.js';
import { Renderer } from './gfx/render.js';
import { Input } from './core/input.js';
import { sfx } from './core/audio.js';
import { Run } from './game/run.js';
import { UI } from './ui/ui.js';
import { loadProfile, saveProfile } from './meta/save.js';
import { applyRun, weaponPool, rollRelic, ensureBounties } from './meta/progression.js';
import { formatNum } from './core/math.js';
import { installDevTools } from './dev/bot.js';

const STEP = 1 / 60;

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.input = new Input(document.getElementById('app'));
    this.profile = loadProfile();
    this.run = null;
    this.W = 240; this.H = 400; this.scale = 1;
    this.safe = { top: 0, bottom: 0, left: 0, right: 0 };
    this.acc = 0;
    this.last = 0;
    this.menuT = 0;
    this.fps = { frames: 0, t: 0, value: 0, ema: 16, slowT: 0 };
    this.simSpeed = 1;

    atlas.build();
    this.renderer = new Renderer(this.ctx);
    this.ui = new UI(this);
    this.input.onNav = (a) => this.ui.nav(a);
    this.applySettings();

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    document.addEventListener('visibilitychange', () => this.onVisibility());
    window.addEventListener('pagehide', () => this.persistPending());
    // iOS only allows audio after a user gesture.
    const unlock = () => sfx.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    this.resize();
    ensureBounties(this.profile);
    this.recoverPending();
    if (!this.ui.isOpen()) this.ui.showTitle();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ---------------------------------------------------------------- layout
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth, cssH = window.innerHeight;
    const devW = Math.round(cssW * dpr), devH = Math.round(cssH * dpr);
    // Integer pixel scale chosen so the short side is ~250 game pixels.
    const scale = Math.max(1, Math.round(Math.min(devW, devH) / 250));
    this.scale = scale;
    this.W = Math.ceil(devW / scale);
    this.H = Math.ceil(devH / scale);
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.canvas.style.width = (this.W * scale) / dpr + 'px';
    this.canvas.style.height = (this.H * scale) / dpr + 'px';
    this.ctx.imageSmoothingEnabled = false;
    const k = dpr / scale; // CSS px -> game px
    this.renderer.cssToPx = k;
    const probe = document.getElementById('safe-probe');
    const cs = getComputedStyle(probe);
    const px = (v) => parseFloat(v) || 0;
    this.safeCss = { top: px(cs.paddingTop), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft), right: px(cs.paddingRight) };
    this.safe = {
      top: Math.ceil(this.safeCss.top * k), bottom: Math.ceil(this.safeCss.bottom * k),
      left: Math.ceil(this.safeCss.left * k), right: Math.ceil(this.safeCss.right * k),
    };
    const d = this.input.dashButton;
    d.r = 34;
    d.x = cssW - 64 - this.safeCss.right;
    d.y = cssH - 88 - this.safeCss.bottom;
    this.input.stick.fx = 90 + this.safeCss.left;
    this.input.stick.fy = cssH - 110 - this.safeCss.bottom;
    if (this.run) this.run.view = { w: this.W, h: this.H };
  }

  applySettings() {
    const st = this.profile.settings;
    sfx.setVolume(st.volume);
    this.input.fixedStick = !!st.fixedStick;
    this.ui.fpsEl.style.display = st.showFps ? 'block' : 'none';
    if (this.run) this.applyRunSettings(this.run);
  }

  applyRunSettings(run) {
    const st = this.profile.settings;
    run.fx.showNumbers = st.numbers;
    run.fx.particleScale = st.quality === 'low' ? 0.4 : 1;
    run.cap = Math.min(run.capLimit || st.maxEnemies, st.maxEnemies);
  }

  save() {
    saveProfile(this.profile);
  }

  replaceProfile(p) {
    this.profile = p;
    ensureBounties(p);
    this.applySettings();
    this.save();
  }

  // ---------------------------------------------------------------- runs
  startRun(opts) {
    sfx.unlock();
    const p = this.profile;
    const run = new Run({ ...opts, weaponPool: weaponPool(p, opts.char), cap: p.settings.maxEnemies }, p, {
      levelUp: (choices) => { run.paused = true; this.ui.showLevelUp(choices); },
      chest: (data) => {
        run.paused = true;
        let relic = null;
        if (data.relic) {
          relic = rollRelic(p, run.nightfall, run.stats.luck);
          this.save();
        }
        this.ui.showChest(data, relic);
      },
      boss: (name) => this.ui.bossWarning(name),
      toast: (t) => this.ui.toast(t),
      end: (summary) => this.endRun(summary),
    });
    run.input = this.input;
    run.view = { w: this.W, h: this.H };
    this.applyRunSettings(run);
    this.run = run;
    this.acc = 0;
    this.input.clearPresses();
    this.ui.close();
    this.ui.setHud(true);
    if (this.onRunStart) this.onRunStart(run);
  }

  endRun(summary) {
    const p = this.profile;
    const report = applyRun(p, summary);
    p.pending = null;
    this.save();
    this.lastReport = { summary, report };
    // Let the final moment breathe before the results screen.
    setTimeout(() => {
      this.ui.setHud(false);
      this.ui.showResults(summary, report);
      this.run = null;
    }, summary.victory ? 1500 : 1100);
  }

  togglePause() {
    const run = this.run;
    if (!run || run.over || run.modal) return;
    if (run.paused) { this.ui.close(); this.resume(); }
    else { run.paused = true; this.ui.showPause(); }
  }

  resume() {
    if (!this.run) return;
    this.run.paused = false;
    this.input.clearPresses();
    this.last = performance.now();
  }

  // Interrupted-run safety net: if the app is killed mid-run, the gold and
  // kills collected so far are granted on next launch.
  persistPending() {
    const run = this.run;
    if (!run || run.over) return;
    this.profile.pending = run.summary();
    this.save();
  }

  recoverPending() {
    const p = this.profile;
    if (!p.pending) return;
    const s = p.pending;
    s.victory = false;
    const report = applyRun(p, s);
    p.pending = null;
    this.save();
    this.ui.notice('Run recovered', `Your last run was interrupted. You kept ${formatNum(report.gold)} gold and ${formatNum(s.kills)} kills.`, () => this.ui.showTitle());
  }

  onVisibility() {
    if (document.hidden) {
      if (this.run && !this.run.paused && !this.run.over) this.togglePause();
      this.persistPending();
    } else {
      this.last = performance.now();
    }
  }

  // ---------------------------------------------------------------- loop
  frame(t) {
    requestAnimationFrame((tt) => this.frame(tt));
    const dt = Math.min(0.1, Math.max(0, (t - (this.last || t)) / 1000));
    this.last = t;
    this.input.update(dt);
    this.trackPerf(dt);

    const run = this.run;
    if (run) {
      if (!run.paused && !run.over) {
        this.acc += dt * this.simSpeed;
        let steps = 0;
        const maxSteps = 4 * this.simSpeed;
        while (this.acc >= STEP && steps < maxSteps) {
          run.update(STEP);
          this.acc -= STEP;
          steps++;
          if (run.paused || run.over) { this.acc = 0; break; }
        }
        if (steps >= maxSteps) this.acc = 0;
        this.pendingT = (this.pendingT || 0) + dt;
        if (this.pendingT > 20) { this.pendingT = 0; this.persistPending(); }
      }
      this.renderer.draw(run, this.W, this.H, this.safe, this.input, this.profile.settings);
    } else {
      this.menuT += dt;
      this.renderer.drawBackdrop(this.profile.last.map || 'gravewood', this.menuT, this.W, this.H);
    }
  }

  trackPerf(dt) {
    const f = this.fps;
    f.frames++; f.t += dt;
    f.ema = f.ema * 0.95 + dt * 1000 * 0.05;
    if (f.t >= 0.5) {
      f.value = Math.round(f.frames / f.t);
      f.frames = 0; f.t = 0;
      if (this.profile.settings.showFps) {
        const r = this.run;
        this.ui.fpsEl.textContent = `${f.value} FPS${r ? ` · ${r.enemies.list.length} foes` : ''}`;
      }
    }
    // Auto performance: if frames stay slow during a run, lower the enemy cap.
    const run = this.run;
    if (run && !run.paused && this.profile.settings.autoPerf && this.simSpeed === 1) {
      if (f.ema > 24) f.slowT += dt; else f.slowT = Math.max(0, f.slowT - dt);
      if (f.slowT > 4 && run.cap > 150) {
        f.slowT = 0;
        run.capLimit = Math.max(150, Math.round(run.cap * 0.85));
        run.cap = run.capLimit;
        run.fx.particleScale = Math.min(run.fx.particleScale, 0.5);
        this.ui.toast(`Performance: enemy cap ${run.cap}`);
      }
    }
  }
}

const game = new Game();
window.__game = game;
installDevTools(game);
