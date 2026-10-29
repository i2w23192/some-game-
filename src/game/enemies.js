// Enemy storage: a pooled array of plain objects plus a uniform spatial grid
// rebuilt every frame around the player. All collision queries go through
// the grid, so cost scales with local density rather than enemy count².

const CELL = 32;
const MAX_HIT_SLOTS = 8;

export class Enemies {
  constructor() {
    this.list = [];
    this.free = [];
    this.uid = 1;
    this.cols = 0;
    this.rows = 0;
    this.ox = 0;
    this.oy = 0;
    this.head = new Int32Array(0);
    this.next = new Int32Array(1024);
    this.qbuf = [];
  }

  create() {
    const e = this.free.pop() || { hitCd: new Float32Array(MAX_HIT_SLOTS) };
    e.uid = this.uid++;
    e.idx = this.list.length;
    e.hitCd.fill(0);
    e.kx = 0; e.ky = 0; e.sx = 0; e.sy = 0;
    e.flash = 0; e.slow = 0; e.slowT = 0;
    e.anim = Math.random() * 10;
    e.flip = false;
    e.dead = false;
    e.ai = null;
    e.state = 0; e.t = 0; e.t2 = 0; e.tx = 0; e.ty = 0;
    e.rangedT = 0;
    e.isElite = false; e.isBoss = false; e.isStatic = false; e.isFinal = false;
    e.scale = 1;
    this.list.push(e);
    return e;
  }

  // Enemies are only flagged dead during a frame; flush() compacts the list
  // afterwards so grid indices stay valid while weapons are resolving hits.
  kill(e) {
    e.dead = true;
  }

  flush() {
    const list = this.list;
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead) { this.free.push(e); continue; }
      e.idx = w;
      list[w++] = e;
    }
    list.length = w;
  }

  clear() {
    for (const e of this.list) { e.dead = true; this.free.push(e); }
    this.list.length = 0;
  }

  // Build the grid covering (cx ± half, cy ± half).
  buildGrid(cx, cy, halfW, halfH) {
    const cols = Math.ceil((halfW * 2) / CELL) + 1;
    const rows = Math.ceil((halfH * 2) / CELL) + 1;
    if (cols * rows !== this.head.length) this.head = new Int32Array(cols * rows);
    this.cols = cols; this.rows = rows;
    this.ox = Math.floor((cx - halfW) / CELL) * CELL;
    this.oy = Math.floor((cy - halfH) / CELL) * CELL;
    const head = this.head;
    head.fill(-1);
    const list = this.list;
    if (this.next.length < list.length) this.next = new Int32Array(list.length * 2);
    const next = this.next;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const c = Math.floor((e.x - this.ox) / CELL), r = Math.floor((e.y - this.oy) / CELL);
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const h = r * cols + c;
      next[i] = head[h];
      head[h] = i;
    }
  }

  // Enemies whose body overlaps the circle (x, y, rad). Returns a shared
  // buffer that is only valid until the next query.
  query(x, y, rad) {
    const out = this.qbuf;
    out.length = 0;
    const list = this.list, head = this.head, next = this.next, cols = this.cols;
    const reach = rad + 20; // max enemy radius margin
    let c0 = Math.floor((x - reach - this.ox) / CELL), c1 = Math.floor((x + reach - this.ox) / CELL);
    let r0 = Math.floor((y - reach - this.oy) / CELL), r1 = Math.floor((y + reach - this.oy) / CELL);
    if (c0 < 0) c0 = 0; if (r0 < 0) r0 = 0;
    if (c1 >= cols) c1 = cols - 1; if (r1 >= this.rows) r1 = this.rows - 1;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        let i = head[r * cols + c];
        while (i !== -1) {
          const e = list[i];
          const dx = e.x - x, dy = e.y - y, rr = rad + e.r;
          if (dx * dx + dy * dy < rr * rr && !e.dead) out.push(e);
          i = next[i];
        }
      }
    }
    return out;
  }

  // Nearest living, targetable enemy to (x, y) within maxD.
  nearest(x, y, maxD = 400, skipUid = null) {
    let best = null, bd = maxD * maxD;
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || e.isStatic || (skipUid && skipUid.has(e.uid))) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
}
