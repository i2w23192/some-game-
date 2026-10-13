// Builds one texture atlas canvas at startup from the pixel-art definitions.
// Each sprite gets three versions: normal, horizontally flipped and a solid
// white silhouette (used for the hit flash), so drawing never needs per-draw
// transforms or filters.

import { SPRITES, PALETTE, resolveSprite } from './sprites.js';

const ATLAS_W = 512;

class Atlas {
  constructor() {
    this.canvas = null;
    this.frames = new Map(); // name -> { x, y, w, h, fx, wx }
    this.iconCache = new Map();
  }

  build() {
    const entries = Object.keys(SPRITES).map((name) => ({ name, rows: resolveSprite(name) }));
    // Shelf-pack: each entry needs 3 copies side by side (+1px gutter).
    entries.sort((a, b) => b.rows.length - a.rows.length);
    let x = 0, y = 0, shelfH = 0;
    for (const e of entries) {
      const w = e.rows[0].length, h = e.rows.length;
      const need = (w + 1) * 3;
      if (x + need > ATLAS_W) { x = 0; y += shelfH + 1; shelfH = 0; }
      e.x = x; e.y = y; e.w = w; e.h = h;
      x += need;
      shelfH = Math.max(shelfH, h);
    }
    const height = y + shelfH + 1;
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_W;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(ATLAS_W, height);
    const rgb = {};
    for (const k in PALETTE) {
      const hex = PALETTE[k];
      rgb[k] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    }
    const put = (px, py, c) => {
      const i = (py * ATLAS_W + px) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    };
    const white = [255, 255, 255];
    for (const e of entries) {
      const fx = e.x + e.w + 1, wx = e.x + (e.w + 1) * 2;
      for (let r = 0; r < e.h; r++) {
        const row = e.rows[r];
        for (let c = 0; c < e.w; c++) {
          const ch = row[c];
          if (ch === '.') continue;
          put(e.x + c, e.y + r, rgb[ch]);
          put(fx + (e.w - 1 - c), e.y + r, rgb[ch]);
          put(wx + c, e.y + r, white);
        }
      }
      this.frames.set(e.name, { x: e.x, y: e.y, w: e.w, h: e.h, fx, wx });
    }
    ctx.putImageData(img, 0, 0);
    this.canvas = canvas;
  }

  get(name) {
    const f = this.frames.get(name);
    if (!f) throw new Error(`Sprite not in atlas: ${name}`);
    return f;
  }

  // Draw centred at (x, y). variant: 0 normal, 1 flipped, 2 white.
  draw(ctx, f, x, y, variant = 0, scale = 1) {
    const sx = variant === 0 ? f.x : variant === 1 ? f.fx : f.wx;
    const w = f.w * scale, h = f.h * scale;
    ctx.drawImage(this.canvas, sx, f.y, f.w, f.h, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  }

  // Data-URL icon for DOM menus (cached).
  icon(name, scale = 4) {
    const key = name + '@' + scale;
    let url = this.iconCache.get(key);
    if (url) return url;
    const f = this.get(name);
    const c = document.createElement('canvas');
    c.width = f.w * scale; c.height = f.h * scale;
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = false;
    cx.drawImage(this.canvas, f.x, f.y, f.w, f.h, 0, 0, c.width, c.height);
    url = c.toDataURL();
    this.iconCache.set(key, url);
    return url;
  }
}

export const atlas = new Atlas();
