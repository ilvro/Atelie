/**
 * 5x7 stroke grid letter-path engine for vintage rubber stamps and seals.
 * Pure path definitions: no fonts, no <text> tags.
 */

export const GLYPHS = {
  // Letters A-Z
  'A': 'M 0 6 L 0 2 L 2 0 L 4 2 L 4 6 M 0 3.5 L 4 3.5',
  'B': 'M 0 6 L 0 0 L 3 0 L 4 1.5 L 3 3 L 0 3 M 3 3 L 4 4.5 L 3 6 L 0 6',
  'C': 'M 4 1 L 3 0 L 1 0 L 0 1 L 0 5 L 1 6 L 3 6 L 4 5',
  'D': 'M 0 6 L 0 0 L 2.5 0 L 4 1.5 L 4 4.5 L 2.5 6 L 0 6',
  'E': 'M 4 0 L 0 0 L 0 6 L 4 6 M 0 3 L 3 3',
  'F': 'M 4 0 L 0 0 L 0 6 M 0 3 L 3 3',
  'G': 'M 4 1 L 3 0 L 1 0 L 0 1 L 0 5 L 1 6 L 3 6 L 4 5 L 4 3 L 2 3',
  'H': 'M 0 0 L 0 6 M 4 0 L 4 6 M 0 3 L 4 3',
  'I': 'M 0.5 0 L 3.5 0 M 2 0 L 2 6 M 0.5 6 L 3.5 6',
  'J': 'M 3 0 L 3 5 L 2 6 L 1 6 L 0 5',
  'K': 'M 0 0 L 0 6 M 4 0 L 0 3.5 L 4 6',
  'L': 'M 0 0 L 0 6 L 4 6',
  'M': 'M 0 6 L 0 0 L 2 3 L 4 0 L 4 6',
  'N': 'M 0 6 L 0 0 L 4 6 L 4 0',
  'O': 'M 1 0 L 3 0 L 4 1 L 4 5 L 3 6 L 1 6 L 0 5 L 0 1 Z',
  'P': 'M 0 6 L 0 0 L 3 0 L 4 1.5 L 3 3 L 0 3',
  'Q': 'M 1 0 L 3 0 L 4 1 L 4 5 L 3 6 L 1 6 L 0 5 L 0 1 Z M 2.5 4.5 L 4.5 6.5',
  'R': 'M 0 6 L 0 0 L 3 0 L 4 1.5 L 3 3 L 0 3 M 2 3 L 4 6',
  'S': 'M 4 1 L 3 0 L 1 0 L 0 1 L 0 2.5 L 1 3 L 3 3 L 4 3.5 L 4 5 L 3 6 L 1 6 L 0 5',
  'T': 'M 0 0 L 4 0 M 2 0 L 2 6',
  'U': 'M 0 0 L 0 5 L 1 6 L 3 6 L 4 5 L 4 0',
  'V': 'M 0 0 L 2 6 L 4 0',
  'W': 'M 0 0 L 1 6 L 2 3 L 3 6 L 4 0',
  'X': 'M 0 0 L 4 6 M 4 0 L 0 6',
  'Y': 'M 0 0 L 2 3 L 4 0 M 2 3 L 2 6',
  'Z': 'M 0 0 L 4 0 L 0 6 L 4 6',

  // Digits 0-9
  '0': 'M 1 0 L 3 0 L 4 1 L 4 5 L 3 6 L 1 6 L 0 5 L 0 1 Z M 3.5 0.5 L 0.5 5.5',
  '1': 'M 1 1.5 L 2 0 L 2 6 M 0.5 6 L 3.5 6',
  '2': 'M 0 1 L 1 0 L 3 0 L 4 1 L 4 2.5 L 0 6 L 4 6',
  '3': 'M 0 0 L 4 0 L 2 2.5 L 3 2.5 L 4 3.5 L 4 5 L 3 6 L 0 6',
  '4': 'M 3 6 L 3 0 L 0 4 L 4 4',
  '5': 'M 4 0 L 0 0 L 0 2.5 L 3 2.5 L 4 3.5 L 4 5 L 3 6 L 0 6',
  '6': 'M 3 0 L 1 0 L 0 1 L 0 5 L 1 6 L 3 6 L 4 5 L 4 3 L 3 2.5 L 0 2.5',
  '7': 'M 0 0 L 4 0 L 1.5 6',
  '8': 'M 1 0 L 3 0 L 4 1 L 4 2 L 3 3 L 1 3 L 0 2 L 0 1 Z M 1 3 L 3 3 L 4 4 L 4 5 L 3 6 L 1 6 L 0 5 L 0 4 Z',
  '9': 'M 4 3.5 L 1 3.5 L 0 3 L 0 1 L 1 0 L 3 0 L 4 1 L 4 5 L 3 6 L 1 6',

  // Cedilla
  'Ç': 'M 4 1 L 3 0 L 1 0 L 0 1 L 0 5 L 1 6 L 3 6 L 4 5 M 2 6 L 2 7.2 L 1 7.2',

  // Acute accents
  'Á': 'M 0 6 L 0 2 L 2 0 L 4 2 L 4 6 M 0 3.5 L 4 3.5 M 1.5 -0.6 L 2.5 -1.6',
  'É': 'M 4 0 L 0 0 L 0 6 L 4 6 M 0 3 L 3 3 M 1.5 -0.6 L 2.5 -1.6',
  'Í': 'M 0.5 0 L 3.5 0 M 2 0 L 2 6 M 0.5 6 L 3.5 6 M 1.5 -0.6 L 2.5 -1.6',
  'Ó': 'M 1 0 L 3 0 L 4 1 L 4 5 L 3 6 L 1 6 L 0 5 L 0 1 Z M 1.5 -0.6 L 2.5 -1.6',
  'Ú': 'M 0 0 L 0 5 L 1 6 L 3 6 L 4 5 L 4 0 M 1.5 -0.6 L 2.5 -1.6',

  // Circumflex accents
  'Â': 'M 0 6 L 0 2 L 2 0 L 4 2 L 4 6 M 0 3.5 L 4 3.5 M 1 -0.6 L 2 -1.6 L 3 -0.6',
  'Ê': 'M 4 0 L 0 0 L 0 6 L 4 6 M 0 3 L 3 3 M 1 -0.6 L 2 -1.6 L 3 -0.6',
  'Ô': 'M 1 0 L 3 0 L 4 1 L 4 5 L 3 6 L 1 6 L 0 5 L 0 1 Z M 1 -0.6 L 2 -1.6 L 3 -0.6',

  // Tilde accents
  'Ã': 'M 0 6 L 0 2 L 2 0 L 4 2 L 4 6 M 0 3.5 L 4 3.5 M 1 -1.2 L 2 -1.7 L 3 -1.2',
  'Õ': 'M 1 0 L 3 0 L 4 1 L 4 5 L 3 6 L 1 6 L 0 5 L 0 1 Z M 1 -1.2 L 2 -1.7 L 3 -1.2',

  // Punctuation and symbols
  '/': 'M 0 6 L 4 0',
  '-': 'M 0.5 3 L 3.5 3',
  '.': 'M 1.5 5.5 L 2.5 5.5 L 2.5 6 L 1.5 6 Z',
  ',': 'M 2 5.5 L 2 6.5 L 1.2 7.2',
  ':': 'M 1.5 1.5 L 2.5 1.5 L 2.5 2 L 1.5 2 Z M 1.5 5.5 L 2.5 5.5 L 2.5 6 L 1.5 6 Z',
  '!': 'M 2 0 L 2 4 M 1.5 5.5 L 2.5 5.5 L 2.5 6 L 1.5 6 Z',
  '?': 'M 0 1 L 1 0 L 3 0 L 4 1 L 4 2.5 L 2 3.5 L 2 4.5 M 1.5 5.5 L 2.5 5.5 L 2.5 6 L 1.5 6 Z',
  '#': 'M 1.2 0 L 0.8 6 M 3.2 0 L 2.8 6 M 0 2 L 4 2 M 0 4 L 4 4',
  '(': 'M 3 0 L 1.5 1.5 L 1.5 4.5 L 3 6',
  ')': 'M 1 0 L 2.5 1.5 L 2.5 4.5 L 1 6',
  '&': 'M 4 6 L 1 2.5 L 1 1 L 2 0 L 3 1 L 3 2 L 0.5 4.5 L 1.5 6 L 3 6 L 4 4',
  '+': 'M 0.5 3 L 3.5 3 M 2 1.5 L 2 4.5',
  'º': 'M 1 0 L 3 0 L 3 2 L 1 2 Z',
  '°': 'M 1 0 L 3 0 L 3 2 L 1 2 Z',
  "'": 'M 2 0 L 2 1.8',
  'ª': 'M 1 0 L 3 0 L 3 2 L 1 2 Z M 1 3 L 3 3',
  ' ': '',
};

/**
 * Parses path commands string and shifts all X coordinates by offsetX and applies scale.
 */
function offsetPath(d, offsetX, scale = 1, yOffset = 0) {
  if (!d) return '';
  const tokens = d.trim().split(/\s+/);
  const out = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'M' || t === 'L') {
      const x = (parseFloat(tokens[++i]) + offsetX) * scale;
      const y = (parseFloat(tokens[++i]) + yOffset) * scale;
      out.push(t, x.toFixed(2), y.toFixed(2));
    } else if (t === 'Z') {
      out.push('Z');
    } else {
      out.push(t);
    }
  }

  return out.join(' ');
}

/**
 * Converts a text string into an SVG path (d attribute), width and height.
 */
export function wordPath(text, { scale = 1, letterSpacing = 1.5, glyphWidth = 4.2 } = {}) {
  const clean = String(text || '').toUpperCase();
  const parts = [];
  let curX = 0;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === ' ') {
      curX += (glyphWidth * 0.7) + letterSpacing;
      continue;
    }

    const glyphD = GLYPHS[ch] || GLYPHS['?'] || '';
    if (glyphD) {
      // Y offset of 2 so accents above (Y < 0) fit cleanly inside viewBox
      parts.push(offsetPath(glyphD, curX, scale, 2));
    }

    curX += glyphWidth + letterSpacing;
  }

  const totalWidth = Math.max(1, (curX > 0 ? curX - letterSpacing : 0) * scale);
  const totalHeight = 10 * scale; // 2 units for accents + 6 for body + 2 for descenders/spacing

  return {
    d: parts.join(' '),
    width: totalWidth,
    height: totalHeight,
  };
}


const hash = n => {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
};

/**
 * Handwritten look: the same strokes as `wordPath`, but every point wobbles, every letter leans and sits
 * a little off the line, and strokes are drawn with round joins by the caller. Deterministic by `seed`.
 */
export function handWord(text, { scale = 1, letterSpacing = 1.2, jitter = 0.35, seed = 1 } = {}) {
  const clean = String(text || '').toUpperCase();
  const parts = [];
  let curX = 0;
  let n = 0;
  for (const ch of clean) {
    if (ch === ' ') { curX += 3 + letterSpacing; continue; }
    const d = GLYPHS[ch] || GLYPHS['?'];
    const lean = (hash(seed * 31 + n) - 0.5) * 0.28;
    const drop = (hash(seed * 17 + n) - 0.5) * 0.9;
    const tokens = d.trim().split(/\s+/);
    const out = [];
    let k = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === 'M' || t === 'L') {
        const gx = parseFloat(tokens[++i]);
        const gy = parseFloat(tokens[++i]);
        const x = (gx + (3 - gy) * lean + curX + (hash(seed * 7 + n * 13 + k) - 0.5) * jitter) * scale;
        const y = (gy + 2 + drop + (hash(seed * 11 + n * 19 + k) - 0.5) * jitter) * scale;
        out.push(t, x.toFixed(2), y.toFixed(2));
        k++;
      } else out.push(t);
    }
    parts.push(out.join(' '));
    curX += 4.2 + letterSpacing + (hash(seed + n * 3) - 0.5) * 0.8;
    n++;
  }
  return { d: parts.join(' '), width: Math.max(1, (curX - letterSpacing) * scale), height: 10 * scale };
}
