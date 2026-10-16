// Generates the home-screen / PWA icons from the game's own pixel art.
// Writes PNGs with a tiny built-in encoder (no image libraries needed).
//   node tools/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolveSprite, PALETTE } from '../src/gfx/sprites.js';

const OUT = new URL('../assets/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixels) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// 32x32 logical canvas: warden + brazier on a dark radial glow.
function makeIcon(size) {
  const L = 32, s = size / L;
  const px = Buffer.alloc(size * size * 4);
  const bg = hex('#120c18'), glow = hex('#3a2242');
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x / size - 0.5, y / size - 0.55) * 2;
      const t = Math.max(0, 1 - d);
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(bg[c] + (glow[c] - bg[c]) * t);
      px[i + 3] = 255;
    }
  }
  const stamp = (name, ox, oy) => {
    const rows = resolveSprite(name);
    rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
      if (ch === '.') return;
      const col = hex(PALETTE[ch]);
      for (let yy = Math.floor((oy + ry) * s); yy < Math.floor((oy + ry + 1) * s); yy++)
        for (let xx = Math.floor((ox + rx) * s); xx < Math.floor((ox + rx + 1) * s); xx++) {
          const i = (yy * size + xx) * 4;
          px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255;
        }
    }));
  };
  stamp('warden', 5, 8);
  stamp('brazier', 20, 13);
  return png(size, px);
}

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(new URL(name, OUT), makeIcon(size));
  console.log('wrote', name);
}
