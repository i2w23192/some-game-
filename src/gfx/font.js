// Tiny 3x5 bitmap font for in-game numbers and HUD text. Glyphs are
// pre-rendered once per colour so drawing a string is just a few drawImage
// calls (no canvas text rendering, which is blurry at this resolution).

const GLYPHS = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111',
  '3': '111001111001111', '4': '101101111001001', '5': '111100111001111',
  '6': '111100111101111', '7': '111001001010010', '8': '111101111101111',
  '9': '111101111001111', 'A': '010101111101101', 'B': '110101110101110',
  'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111',
  'F': '111100110100100', 'G': '011100101101011', 'H': '101101111101101',
  'I': '111010010010111', 'J': '001001001101010', 'K': '101101110101101',
  'L': '100100100100111', 'M': '101111111101101', 'N': '110101101101101',
  'O': '010101101101010', 'P': '110101110100100', 'Q': '010101101110011',
  'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010',
  'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101',
  'X': '101101010101101', 'Y': '101101010010010', 'Z': '111001010100111',
  ':': '000010000010000', '/': '001001010100100', '+': '000010111010000',
  '-': '000000111000000', '%': '101001010100101', '!': '010010010000010',
  '.': '000000000000010', 'x': '000101010101000', ' ': '000000000000000',
  "'": '010010000000000', '?': '111001010000010',
};

const CHARS = Object.keys(GLYPHS);
const GW = 4; // glyph cell width incl. 1px spacing
const GH = 6;

class BitmapFont {
  constructor() {
    this.sheets = new Map();
    this.index = new Map(CHARS.map((c, i) => [c, i]));
  }

  // Each sheet: glyphs in a row, with a 1px dark outline baked in.
  sheet(color) {
    let s = this.sheets.get(color);
    if (s) return s;
    s = document.createElement('canvas');
    s.width = CHARS.length * (GW + 2);
    s.height = GH + 2;
    const ctx = s.getContext('2d');
    CHARS.forEach((ch, i) => {
      const bits = GLYPHS[ch];
      const ox = i * (GW + 2) + 1, oy = 1;
      ctx.fillStyle = '#1b1324';
      for (let p = 0; p < 15; p++) {
        if (bits[p] !== '1') continue;
        const x = ox + (p % 3), y = oy + Math.floor(p / 3);
        ctx.fillRect(x - 1, y - 1, 3, 3);
      }
      ctx.fillStyle = color;
      for (let p = 0; p < 15; p++) {
        if (bits[p] === '1') ctx.fillRect(ox + (p % 3), oy + Math.floor(p / 3), 1, 1);
      }
    });
    this.sheets.set(color, s);
    return s;
  }

  measure(text, scale = 1) {
    return (text.length * GW - 1) * scale;
  }

  // align: 0 left, 0.5 centre, 1 right
  draw(ctx, text, x, y, color = '#f2ecdc', scale = 1, align = 0) {
    text = String(text).toUpperCase();
    const s = this.sheet(color);
    let cx = Math.round(x - this.measure(text, scale) * align);
    const cy = Math.round(y);
    for (let i = 0; i < text.length; i++) {
      const gi = this.index.get(text[i]);
      if (gi !== undefined && text[i] !== ' ') {
        ctx.drawImage(s, gi * (GW + 2), 0, 5, 7, cx - scale, cy - scale, 5 * scale, 7 * scale);
      }
      cx += GW * scale;
    }
  }
}

export const font = new BitmapFont();
