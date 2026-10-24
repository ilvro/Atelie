/**
 * Pure pixel and color mathematics for handout rendering and import.
 */

/**
 * CSS filter of an image or adjust block, at the render scale (blur is in document px). '' when nothing changes.
 */
export function cssFilter(
  {
    grayscale = 0,
    sepia = 0,
    brightness = 0,
    contrast = 0,
    saturation = 0,
    hue = 0,
    blur = 0,
    invert = false,
  } = {},
  scale = 1
) {
  const parts = [];

  if (grayscale !== 0) parts.push(`grayscale(${grayscale})`);
  if (sepia !== 0) parts.push(`sepia(${sepia})`);
  if (brightness !== 0) parts.push(`brightness(${1 + brightness})`);
  if (contrast !== 0) parts.push(`contrast(${1 + contrast})`);
  if (saturation !== 0) parts.push(`saturate(${1 + saturation})`);
  if (hue !== 0) parts.push(`hue-rotate(${hue}deg)`);
  if (blur > 0) parts.push(`blur(${blur * scale}px)`);
  if (invert) parts.push('invert(1)');

  return parts.join(' ');
}

function buildCurveLookup(points) {
  const table = new Uint8Array(256);
  if (!points || points.length < 2) {
    for (let i = 0; i < 256; i++) table[i] = i;
    return table;
  }

  let seg = 0;
  for (let x = 0; x < 256; x++) {
    while (seg < points.length - 2 && points[seg + 1][0] < x) {
      seg++;
    }
    const [x0, y0] = points[seg];
    const [x1, y1] = points[seg + 1];
    if (x <= x0) {
      table[x] = Math.round(Math.max(0, Math.min(255, y0)));
    } else if (x >= x1) {
      table[x] = Math.round(Math.max(0, Math.min(255, y1)));
    } else {
      const t = (x - x0) / (x1 - x0);
      const y = y0 + t * (y1 - y0);
      table[x] = Math.round(Math.max(0, Math.min(255, y)));
    }
  }
  return table;
}

/**
 * The same filter applied to RGBA bytes, for browsers without ctx.filter and for Node. Mutates and returns data.
 */
export function applyAdjustPixels(data, adjust = {}) {
  const {
    grayscale = 0,
    sepia = 0,
    brightness = 0,
    contrast = 0,
    saturation = 0,
    hue = 0,
    invert = false,
    curve = null,
  } = adjust;

  const hasCurve = Array.isArray(curve) && curve.length >= 2;
  const curveTable = hasCurve ? buildCurveLookup(curve) : null;

  const hasHue = hue !== 0;
  const rad = (hue * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const h00 = 0.213 + cos * 0.787 - sin * 0.213;
  const h01 = 0.715 - cos * 0.715 - sin * 0.715;
  const h02 = 0.072 - cos * 0.072 + sin * 0.928;
  const h10 = 0.213 - cos * 0.213 + sin * 0.143;
  const h11 = 0.715 + cos * 0.285 + sin * 0.140;
  const h12 = 0.072 - cos * 0.072 - sin * 0.283;
  const h20 = 0.213 - cos * 0.213 - sin * 0.787;
  const h21 = 0.715 - cos * 0.715 + sin * 0.715;
  const h22 = 0.072 + cos * 0.928 + sin * 0.072;

  const bMult = 1 + brightness;
  const cMult = 1 + contrast;
  const sMult = 1 + saturation;

  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Curve
    if (curveTable) {
      r = curveTable[r];
      g = curveTable[g];
      b = curveTable[b];
    }

    // 2. Grayscale
    if (grayscale !== 0) {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = r * (1 - grayscale) + lum * grayscale;
      g = g * (1 - grayscale) + lum * grayscale;
      b = b * (1 - grayscale) + lum * grayscale;
    }

    // 3. Sepia
    if (sepia !== 0) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = r * (1 - sepia) + sr * sepia;
      g = g * (1 - sepia) + sg * sepia;
      b = b * (1 - sepia) + sb * sepia;
    }

    // 4. Brightness
    if (brightness !== 0) {
      r *= bMult;
      g *= bMult;
      b *= bMult;
    }

    // 5. Contrast
    if (contrast !== 0) {
      r = (r - 128) * cMult + 128;
      g = (g - 128) * cMult + 128;
      b = (b - 128) * cMult + 128;
    }

    // 6. Saturation
    if (saturation !== 0) {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = lum + (r - lum) * sMult;
      g = lum + (g - lum) * sMult;
      b = lum + (b - lum) * sMult;
    }

    // 7. Hue
    if (hasHue) {
      const hr = r * h00 + g * h01 + b * h02;
      const hg = r * h10 + g * h11 + b * h12;
      const hb = r * h20 + g * h21 + b * h22;
      r = hr;
      g = hg;
      b = hb;
    }

    // 8. Invert
    if (invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    data[i] = Math.round(Math.max(0, Math.min(255, r)));
    data[i + 1] = Math.round(Math.max(0, Math.min(255, g)));
    data[i + 2] = Math.round(Math.max(0, Math.min(255, b)));
  }

  return data;
}

/**
 * Separable blend of one channel, 0–1, for the modes of BLEND_MODES.
 */
export function blendChannel(mode, b, s) {
  switch (mode) {
    case 'normal':
      return s;
    case 'multiply':
    case 'linear-burn-approx':
      return b * s;
    case 'screen':
      return b + s - b * s;
    case 'overlay':
      return b <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s);
    case 'hard-light':
      return s <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s);
    case 'soft-light': {
      if (s <= 0.5) {
        return b - (1 - 2 * s) * b * (1 - b);
      }
      const d = b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b);
      return b + (2 * s - 1) * (d - b);
    }
    case 'darken':
    case 'darker-color':
      return Math.min(b, s);
    case 'lighten':
    case 'lighter-color':
      return Math.max(b, s);
    case 'color-dodge':
      if (b === 0) return 0;
      if (s >= 1) return 1;
      return Math.min(1, b / (1 - s));
    case 'color-burn':
      if (b >= 1) return 1;
      if (s <= 0) return 0;
      return 1 - Math.min(1, (1 - b) / s);
    case 'difference':
      return Math.abs(b - s);
    case 'exclusion':
      return b + s - 2 * b * s;
    case 'linear-dodge':
      return Math.min(1, b + s);
    case 'linear-burn':
      return Math.max(0, b + s - 1);
    default:
      return s;
  }
}

