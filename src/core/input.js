// Unified input: floating touch joystick + dash button, keyboard, gamepad.
// Gameplay reads moveX/moveY (length <= 1) and consumes one-shot presses.
// Menus receive navigation events through onNav.

const DEADZONE = 0.22;

export class Input {
  constructor(surface) {
    this.surface = surface;
    this.moveX = 0;
    this.moveY = 0;
    this.mode = matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard';
    this.keys = new Set();
    this.dashQueued = false;
    this.enabled = true; // gameplay touch handling on/off (off while menus are open)
    // Joystick state in CSS pixels.
    this.stick = { id: -1, ox: 0, oy: 0, x: 0, y: 0, radius: 46 };
    this.dashButton = { x: 0, y: 0, r: 34 }; // CSS px, set by layout
    this.onNav = null; // (action) => void, action: up/down/left/right/ok/back/pause
    this.padPrev = [];
    this.padNavCooldown = 0;
    this.fixedStick = false;
    this._bind();
  }

  _bind() {
    const s = this.surface;
    s.addEventListener('pointerdown', (e) => this._down(e));
    window.addEventListener('pointermove', (e) => this._move(e), { passive: true });
    window.addEventListener('pointerup', (e) => this._up(e));
    window.addEventListener('pointercancel', (e) => this._up(e));
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.mode = 'keyboard';
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      // Menus get first refusal; anything they don't use goes to gameplay.
      const nav = KEY_NAV[e.code];
      if (nav && this.onNav && this.onNav(nav)) { e.preventDefault(); return; }
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') this.dashQueued = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this._releaseStick(); });
  }

  _down(e) {
    if (!this.enabled) return;
    if (e.pointerType === 'touch' || e.pointerType === 'pen') this.mode = 'touch';
    const d = this.dashButton;
    if (this.mode === 'touch' && Math.hypot(e.clientX - d.x, e.clientY - d.y) < d.r * 1.3) {
      this.dashQueued = true;
      return;
    }
    if (this.stick.id !== -1) return;
    this.stick.id = e.pointerId;
    if (this.fixedStick && this.mode === 'touch') {
      this.stick.ox = this.stick.fx;
      this.stick.oy = this.stick.fy;
    } else {
      this.stick.ox = e.clientX;
      this.stick.oy = e.clientY;
    }
    this.stick.x = e.clientX;
    this.stick.y = e.clientY;
    e.preventDefault();
  }

  _move(e) {
    if (e.pointerId !== this.stick.id) return;
    this.stick.x = e.clientX;
    this.stick.y = e.clientY;
  }

  _up(e) {
    if (e.pointerId === this.stick.id) this._releaseStick();
  }

  _releaseStick() {
    this.stick.id = -1;
  }

  get stickActive() {
    return this.stick.id !== -1;
  }

  consumeDash() {
    const d = this.dashQueued;
    this.dashQueued = false;
    return d;
  }

  clearPresses() {
    this.dashQueued = false;
  }

  // Called once per frame.
  update(dt) {
    let x = 0, y = 0;
    // Keyboard
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    // Touch / mouse stick
    if (this.stick.id !== -1) {
      const s = this.stick;
      let dx = s.x - s.ox, dy = s.y - s.oy;
      const len = Math.hypot(dx, dy);
      if (len > s.radius) {
        // Drag the origin along so reversing direction is instant.
        s.ox = s.x - (dx / len) * s.radius;
        s.oy = s.y - (dy / len) * s.radius;
        dx = s.x - s.ox; dy = s.y - s.oy;
      }
      const m = Math.min(1, len / s.radius);
      if (len > 4) { x += (dx / len) * m; y += (dy / len) * m; }
    }
    // Gamepad
    this._pollPad(dt, (px, py) => { x += px; y += py; });
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.moveX = x;
    this.moveY = y;
  }

  _pollPad(dt, addMove) {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let pad = null;
    for (const p of pads) if (p && p.connected) { pad = p; break; }
    if (!pad) return;
    const btn = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
    const pressed = (i) => btn(i) && !this.padPrev[i];
    let ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    if (Math.hypot(ax, ay) < DEADZONE) { ax = 0; ay = 0; }
    if (btn(14)) ax = -1; if (btn(15)) ax = 1;
    if (btn(12)) ay = -1; if (btn(13)) ay = 1;
    let any = ax !== 0 || ay !== 0;
    for (let i = 0; i < pad.buttons.length; i++) if (btn(i)) { any = true; break; }
    if (any) this.mode = 'gamepad';
    addMove(ax, ay);
    // Menu navigation first; unused presses fall through to gameplay.
    const nav = (i, action) => pressed(i) && this.onNav && this.onNav(action);
    const okUsed = nav(0, 'ok');
    nav(1, 'back');
    nav(9, 'pause');
    nav(4, 'prevtab');
    if ((pressed(0) && !okUsed) || pressed(5) || pressed(7) || pressed(2)) this.dashQueued = true;
    if (this.onNav) {
      this.padNavCooldown -= dt;
      let dir = null;
      if (ay < -0.5) dir = 'up'; else if (ay > 0.5) dir = 'down';
      else if (ax < -0.5) dir = 'left'; else if (ax > 0.5) dir = 'right';
      if (!dir) this.padNavCooldown = 0;
      else if (this.padNavCooldown <= 0) {
        this.onNav(dir);
        this.padNavCooldown = this.padNavHeld ? 0.12 : 0.32;
        this.padNavHeld = true;
      }
      if (!dir) this.padNavHeld = false;
    }
    this.padPrev = pad.buttons.map((b) => b.pressed);
  }
}

const KEY_NAV = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  Enter: 'ok', Space: 'ok', Escape: 'pause', KeyP: 'pause', Backspace: 'back',
  KeyQ: 'prevtab', KeyE: 'nexttab',
};
