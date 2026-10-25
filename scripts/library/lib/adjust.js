/**
 * Adjustment Layers Processor for PSD Composition (Etapa 24)
 * Pure functions implementing Photoshop adjustment layer types:
 * - hue/saturation (with colorize and master adjustments)
 * - black & white (hue-weighted luminance interpolation and tint)
 * - brightness/contrast
 * - invert
 * - levels (input shadows/highlights, gamma, output range)
 * - curves (spline/linear LUT)
 * - color balance (shadows, midtones, highlights)
 */

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  const d = max - min;
  if (d > 1e-6) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  let r, g, b;

  if (s <= 1e-6) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hk = (h % 360 + 360) % 360 / 360;

    const hue2rgb = (t) => {
      let tc = t;
      if (tc < 0) tc += 1;
      if (tc > 1) tc -= 1;
      if (tc < 1 / 6) return p + (q - p) * 6 * tc;
      if (tc < 1 / 2) return q;
      if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6;
      return p;
    };

    r = hue2rgb(hk + 1 / 3);
    g = hue2rgb(hk);
    b = hue2rgb(hk - 1 / 3);
  }

  return [
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b)),
  ];
}

/**
 * Applies Hue/Saturation adjustment.
 */
function applyHueSaturation(r, g, b, adj) {
  const master = adj.master || {};
  const dHue = master.hue || 0;
  const dSat = master.saturation || 0;
  const dLight = master.lightness || 0;
  const colorize = Boolean(adj.colorize);

  let [h, s, l] = rgbToHsl(r, g, b);

  if (colorize) {
    h = (dHue % 360 + 360) % 360;
    s = Math.max(0, Math.min(1, (dSat + 100) / 100));
    if (dLight < 0) {
      l = l * (1 + dLight / 100);
    } else if (dLight > 0) {
      l = l + (1 - l) * (dLight / 100);
    }
  } else {
    h = (h + dHue % 360 + 360) % 360;

    if (dSat < 0) {
      s = s * (1 + dSat / 100);
    } else if (dSat > 0) {
      s = s + (1 - s) * (dSat / 100);
    }

    if (dLight < 0) {
      l = l * (1 + dLight / 100);
    } else if (dLight > 0) {
      l = l + (1 - l) * (dLight / 100);
    }
  }

  return hslToRgb(h, s, l);
}

/**
 * Applies Black & White adjustment using hue weights.
 */
function applyBlackAndWhite(r, g, b, adj) {
  const weights = {
    reds: adj.reds ?? 40,
    yellows: adj.yellows ?? 60,
    greens: adj.greens ?? 40,
    cyans: adj.cyans ?? 60,
    blues: adj.blues ?? 20,
    magentas: adj.magentas ?? 80,
  };

  const [h, s, l] = rgbToHsl(r, g, b);

  // Hue anchors: 0 (red), 60 (yellow), 120 (green), 180 (cyan), 240 (blue), 300 (magenta), 360 (red)
  const anchors = [
    { h: 0, w: weights.reds },
    { h: 60, w: weights.yellows },
    { h: 120, w: weights.greens },
    { h: 180, w: weights.cyans },
    { h: 240, w: weights.blues },
    { h: 300, w: weights.magentas },
    { h: 360, w: weights.reds },
  ];

  let weight = 50;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a0 = anchors[i];
    const a1 = anchors[i + 1];
    if (h >= a0.h && h <= a1.h) {
      const frac = (h - a0.h) / (a1.h - a0.h);
      weight = a0.w + frac * (a1.w - a0.w);
      break;
    }
  }

  let gray = l + ((weight - 50) / 100) * s;
  gray = Math.max(0, Math.min(1, gray));

  if (adj.useTint && adj.tintColor) {
    const tr = (adj.tintColor.r ?? 255) / 255;
    const tg = (adj.tintColor.g ?? 255) / 255;
    const tb = (adj.tintColor.b ?? 255) / 255;
    return [gray * tr, gray * tg, gray * tb];
  }

  return [gray, gray, gray];
}

/**
 * Applies Brightness/Contrast adjustment.
 */
function applyBrightnessContrast(r, g, b, adj) {
  const brightness = adj.brightness ?? 0;
  const contrast = adj.contrast ?? 0;

  const bOffset = brightness / 255;
  const cFactor = 1 + contrast / 100;

  const adjChannel = (v) => {
    let out = v + bOffset;
    out = (out - 0.5) * cFactor + 0.5;
    return Math.max(0, Math.min(1, out));
  };

  return [adjChannel(r), adjChannel(g), adjChannel(b)];
}

/**
 * Applies Invert adjustment.
 */
function applyInvert(r, g, b) {
  return [1 - r, 1 - g, 1 - b];
}

/**
 * Applies Levels adjustment.
 */
function applyLevels(r, g, b, adj) {
  const applyChannel = (v, ch) => {
    if (!ch) return v;
    const shadowIn = ch.shadowInput ?? 0;
    const highlightIn = ch.highlightInput ?? 255;
    const midtoneIn = ch.midtoneInput ?? 1.0;
    const shadowOut = ch.shadowOutput ?? 0;
    const highlightOut = ch.highlightOutput ?? 255;

    const v255 = v * 255;
    const rangeIn = highlightIn - shadowIn;
    let norm = 0;
    if (rangeIn > 0) {
      norm = Math.max(0, Math.min(1, (v255 - shadowIn) / rangeIn));
    }
    if (midtoneIn > 0 && midtoneIn !== 1.0) {
      norm = Math.pow(norm, 1 / midtoneIn);
    }
    const out255 = shadowOut + norm * (highlightOut - shadowOut);
    return Math.max(0, Math.min(1, out255 / 255));
  };

  let nr = r;
  let ng = g;
  let nb = b;

  // Composite RGB channel
  if (adj.rgb) {
    nr = applyChannel(nr, adj.rgb);
    ng = applyChannel(ng, adj.rgb);
    nb = applyChannel(nb, adj.rgb);
  }

  // Individual channels (if defined separately)
  if (adj.red) nr = applyChannel(nr, adj.red);
  if (adj.green) ng = applyChannel(ng, adj.green);
  if (adj.blue) nb = applyChannel(nb, adj.blue);

  return [nr, ng, nb];
}

/**
 * Builds a 256-entry lookup table from curves points.
 */
function buildCurvesLut(points) {
  const lut = new Float32Array(256);
  if (!Array.isArray(points) || points.length === 0) {
    for (let i = 0; i < 256; i++) lut[i] = i / 255;
    return lut;
  }

  const sorted = [...points].sort((a, b) => a.input - b.input);

  // Pad left and right if needed
  if (sorted[0].input > 0) {
    sorted.unshift({ input: 0, output: sorted[0].output });
  }
  if (sorted[sorted.length - 1].input < 255) {
    sorted.push({ input: 255, output: sorted[sorted.length - 1].output });
  }

  let segIdx = 0;
  for (let x = 0; x < 256; x++) {
    while (segIdx < sorted.length - 2 && sorted[segIdx + 1].input < x) {
      segIdx++;
    }
    const p0 = sorted[segIdx];
    const p1 = sorted[segIdx + 1];
    const dx = p1.input - p0.input;
    let out = p0.output;
    if (dx > 0) {
      const t = (x - p0.input) / dx;
      out = p0.output + t * (p1.output - p0.output);
    }
    lut[x] = Math.max(0, Math.min(1, out / 255));
  }

  return lut;
}

/**
 * Applies Curves adjustment.
 */
function applyCurves(r, g, b, adj, precomputedLut) {
  const lut = precomputedLut;
  const idxR = Math.max(0, Math.min(255, Math.round(r * 255)));
  const idxG = Math.max(0, Math.min(255, Math.round(g * 255)));
  const idxB = Math.max(0, Math.min(255, Math.round(b * 255)));

  return [lut[idxR], lut[idxG], lut[idxB]];
}

/**
 * Applies Color Balance adjustment.
 */
function applyColorBalance(r, g, b, adj) {
  const mid = adj.midtones || {};
  const cyanRed = mid.cyanRed || 0;
  const magentaGreen = mid.magentaGreen || 0;
  const yellowBlue = mid.yellowBlue || 0;

  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  const w = 4 * l * (1 - l);

  // In ag-psd, color balance midtones are -100..100. Normalize accordingly.
  const divisor = Math.abs(cyanRed) > 100 || Math.abs(magentaGreen) > 100 || Math.abs(yellowBlue) > 100 ? 255 : 100;
  let nr = r + (cyanRed / divisor) * 0.5 * w;
  let ng = g + (magentaGreen / divisor) * 0.5 * w;
  let nb = b + (yellowBlue / divisor) * 0.5 * w;

  nr = Math.max(0, Math.min(1, nr));
  ng = Math.max(0, Math.min(1, ng));
  nb = Math.max(0, Math.min(1, nb));

  if (adj.preserveLuminosity) {
    const origLum = l;
    const newLum = 0.3 * nr + 0.59 * ng + 0.11 * nb;
    const diff = origLum - newLum;
    nr = Math.max(0, Math.min(1, nr + diff));
    ng = Math.max(0, Math.min(1, ng + diff));
    nb = Math.max(0, Math.min(1, nb + diff));
  }

  return [nr, ng, nb];
}

/**
 * Applies an adjustment layer to an RGBA buffer.
 * @param {{ width: number, height: number, data: Float32Array }} buffer
 * @param {object} adjustment
 * @param {object} [options]
 * @param {{ width: number, height: number, data: Float32Array } | null} [options.mask=null]
 * @param {Float32Array | null} [options.clipAlpha=null]
 * @param {number} [options.opacity=1]
 * @param {string[]} [options.warnings=[]]
 * @returns {{ width: number, height: number, data: Float32Array }}
 */
export function adjustBuffer(
  buffer,
  adjustment,
  { mask = null, clipAlpha = null, opacity = 1, warnings = [] } = {}
) {
  if (!buffer || !adjustment || opacity <= 0) return buffer;

  const type = String(adjustment.type || '').toLowerCase();
  const { width, height, data } = buffer;
  const len = width * height;

  const maskData = mask ? mask.data : null;
  const maskWidth = mask ? mask.width : 0;
  const maskIsBufferAligned = mask && maskWidth === width;

  let curvesLut = null;
  if (type === 'curves') {
    const pts = adjustment.points || adjustment.rgb?.points || adjustment.curves?.[0]?.points || [];
    curvesLut = buildCurvesLut(pts);
  }

  for (let idx = 0; idx < len; idx++) {
    const pIdx = idx * 4;
    const a = data[pIdx + 3];
    if (a <= 0) continue;

    let strength = opacity;

    if (maskData) {
      const mVal = maskIsBufferAligned ? maskData[idx] : maskData[idx % maskData.length];
      strength *= mVal;
      if (strength <= 0) continue;
    }

    if (clipAlpha) {
      const cVal = clipAlpha[idx];
      strength *= cVal;
      if (strength <= 0) continue;
    }

    const r = data[pIdx];
    const g = data[pIdx + 1];
    const b = data[pIdx + 2];

    let adjR = r;
    let adjG = g;
    let adjB = b;

    switch (type) {
      case 'hue/saturation': {
        const out = applyHueSaturation(r, g, b, adjustment);
        adjR = out[0];
        adjG = out[1];
        adjB = out[2];
        break;
      }
      case 'black & white': {
        const out = applyBlackAndWhite(r, g, b, adjustment);
        adjR = out[0];
        adjG = out[1];
        adjB = out[2];
        break;
      }
      case 'brightness/contrast': {
        const out = applyBrightnessContrast(r, g, b, adjustment);
        adjR = out[0];
        adjG = out[1];
        adjB = out[2];
        break;
      }
      case 'invert': {
        const out = applyInvert(r, g, b);
        adjR = out[0];
        adjG = out[1];
        adjB = out[2];
        break;
      }
      case 'levels': {
        const out = applyLevels(r, g, b, adjustment);
        adjR = out[0];
        adjG = out[1];
        adjB = out[2];
        break;
      }
      case 'curves': {
        const out = applyCurves(r, g, b, adjustment, curvesLut);
        adjR = out[0];
        adjG = out[1];
        adjB = out[2];
        break;
      }
      case 'color balance': {
        const out = applyColorBalance(r, g, b, adjustment);
        adjR = out[0];
        adjG = out[1];
        adjB = out[2];
        break;
      }
      default:
        // Unsupported adjustment
        if (!warnings.includes(`unsupported-adjust:${type}`)) {
          warnings.push(`unsupported-adjust:${type}`);
        }
        return buffer;
    }

    // Blend adjusted color with original according to strength
    data[pIdx] = r + (adjR - r) * strength;
    data[pIdx + 1] = g + (adjG - g) * strength;
    data[pIdx + 2] = b + (adjB - b) * strength;
  }

  return buffer;
}
