/**
 * Color Blending & Layer Compositing (Etapa 24)
 * Pure functions implementing W3C Compositing & Blending Level 1 with alpha compositing,
 * separable and non-separable blend modes, mask clipping, and base-layer clipping.
 */
import { blendChannel } from '../../../src/domain/handout-pixels.js';

export { blendChannel };

function lum([r, g, b]) {
  return 0.3 * r + 0.59 * g + 0.11 * b;
}

function clipColor([r, g, b]) {
  const l = lum([r, g, b]);
  const n = Math.min(r, g, b);
  const x = Math.max(r, g, b);
  let ro = r;
  let go = g;
  let bo = b;

  if (n < 0) {
    const denom = l - n;
    if (denom > 0) {
      ro = l + ((r - l) * l) / denom;
      go = l + ((g - l) * l) / denom;
      bo = l + ((b - l) * l) / denom;
    }
  }

  if (x > 1) {
    const denom = x - l;
    if (denom > 0) {
      ro = l + ((ro - l) * (1 - l)) / denom;
      go = l + ((go - l) * (1 - l)) / denom;
      bo = l + ((bo - l) * (1 - l)) / denom;
    }
  }

  return [
    Math.max(0, Math.min(1, ro)),
    Math.max(0, Math.min(1, go)),
    Math.max(0, Math.min(1, bo)),
  ];
}

function setLum(c, l) {
  const d = l - lum(c);
  return clipColor([c[0] + d, c[1] + d, c[2] + d]);
}

function sat([r, g, b]) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function setSat(c, s) {
  let [r, g, b] = c;
  const items = [
    { c: 'r', val: r },
    { c: 'g', val: g },
    { c: 'b', val: b },
  ];
  items.sort((a, b) => a.val - b.val);

  const min = items[0];
  const mid = items[1];
  const max = items[2];

  const out = {};
  if (max.val > min.val) {
    out[mid.c] = ((mid.val - min.val) * s) / (max.val - min.val);
    out[max.c] = s;
  } else {
    out[mid.c] = 0;
    out[max.c] = 0;
  }
  out[min.c] = 0;

  return [out.r, out.g, out.b];
}

/**
 * Computes non-separable blend modes according to W3C Compositing & Blending Level 1.
 * @param {'hue'|'saturation'|'color'|'luminosity'|'lighter-color'|'darker-color'} mode
 * @param {number[]} cb [r, g, b] 0–1
 * @param {number[]} cs [r, g, b] 0–1
 * @returns {number[]} [r, g, b] 0–1
 */
export function nonSeparable(mode, cb, cs) {
  const m = (mode || '').replace(/\s+/g, '-').toLowerCase();
  switch (m) {
    case 'hue':
      return setLum(setSat(cs, sat(cb)), lum(cb));
    case 'saturation':
      return setLum(setSat(cb, sat(cs)), lum(cb));
    case 'color':
      return setLum(cs, lum(cb));
    case 'luminosity':
      return setLum(cb, lum(cs));
    case 'lighter-color': {
      const sumB = cb[0] + cb[1] + cb[2];
      const sumS = cs[0] + cs[1] + cs[2];
      return sumS > sumB ? [cs[0], cs[1], cs[2]] : [cb[0], cb[1], cb[2]];
    }
    case 'darker-color': {
      const sumB = cb[0] + cb[1] + cb[2];
      const sumS = cs[0] + cs[1] + cs[2];
      return sumS < sumB ? [cs[0], cs[1], cs[2]] : [cb[0], cb[1], cb[2]];
    }
    default:
      return [cs[0], cs[1], cs[2]];
  }
}

/**
 * Blends a single source pixel over a backdrop pixel using W3C Compositing & Blending Level 1 formula.
 * @param {string} mode
 * @param {number[]} backdrop [r, g, b, a] 0–1
 * @param {number[]} source [r, g, b, a] 0–1
 * @param {number[]} out [r, g, b, a] 0–1
 * @returns {number[]}
 */
export function blendPixel(mode, backdrop, source, out = [0, 0, 0, 0]) {
  const ab = backdrop[3];
  const as = source[3];

  if (as <= 0) {
    out[0] = backdrop[0];
    out[1] = backdrop[1];
    out[2] = backdrop[2];
    out[3] = ab;
    return out;
  }

  if (ab <= 0) {
    out[0] = source[0];
    out[1] = source[1];
    out[2] = source[2];
    out[3] = as;
    return out;
  }

  const ao = as + ab * (1 - as);
  out[3] = ao;

  if (ao <= 0) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }

  const m = (mode || 'normal').replace(/\s+/g, '-').toLowerCase();
  let b0, b1, b2;
  const isNonSep =
    m === 'hue' ||
    m === 'saturation' ||
    m === 'color' ||
    m === 'luminosity' ||
    m === 'lighter-color' ||
    m === 'darker-color';

  if (isNonSep) {
    const blended = nonSeparable(
      m,
      [backdrop[0], backdrop[1], backdrop[2]],
      [source[0], source[1], source[2]]
    );
    b0 = blended[0];
    b1 = blended[1];
    b2 = blended[2];
  } else {
    // Normal / Separable modes
    const resolvedMode = m.startsWith('unsupported:') || m === 'pass-through' ? 'normal' : m;
    b0 = blendChannel(resolvedMode, backdrop[0], source[0]);
    b1 = blendChannel(resolvedMode, backdrop[1], source[1]);
    b2 = blendChannel(resolvedMode, backdrop[2], source[2]);
  }

  // W3C formula: Co = [ (1 - ab) * as * Cs + ab * as * B(Cb, Cs) + (1 - as) * ab * Cb ] / ao
  const termS = (1 - ab) * as;
  const termB = ab * as;
  const termBack = (1 - as) * ab;

  out[0] = Math.max(0, Math.min(1, (termS * source[0] + termB * b0 + termBack * backdrop[0]) / ao));
  out[1] = Math.max(0, Math.min(1, (termS * source[1] + termB * b1 + termBack * backdrop[1]) / ao));
  out[2] = Math.max(0, Math.min(1, (termS * source[2] + termB * b2 + termBack * backdrop[2]) / ao));

  return out;
}

/**
 * Draws `layer` onto `target` at (left, top).
 * @param {{ width: number, height: number, data: Float32Array }} target
 * @param {{ width: number, height: number, data: Float32Array }} layer
 * @param {object} options
 * @param {string} [options.mode='normal']
 * @param {number} [options.opacity=1]
 * @param {{ width: number, height: number, data: Float32Array } | null} [options.mask=null]
 * @param {Float32Array | null} [options.clipAlpha=null]
 * @param {number} [options.left=0]
 * @param {number} [options.top=0]
 */
export function compositeLayer(
  target,
  layer,
  { mode = 'normal', opacity = 1, mask = null, clipAlpha = null, left = 0, top = 0 } = {}
) {
  if (!target || !layer || opacity <= 0) return target;

  const lLeft = Math.round(left);
  const lTop = Math.round(top);

  const x0 = Math.max(0, lLeft);
  const y0 = Math.max(0, lTop);
  const x1 = Math.min(target.width, lLeft + layer.width);
  const y1 = Math.min(target.height, lTop + layer.height);

  if (x0 >= x1 || y0 >= y1) return target;

  const tWidth = target.width;
  const lWidth = layer.width;
  const tData = target.data;
  const lData = layer.data;

  const maskData = mask ? mask.data : null;
  const maskWidth = mask ? mask.width : 0;
  const maskIsLayerAligned = mask && maskWidth === lWidth;

  const pixelOut = [0, 0, 0, 0];
  const bPixel = [0, 0, 0, 0];
  const sPixel = [0, 0, 0, 0];

  for (let ty = y0; ty < y1; ty++) {
    const ly = ty - lTop;
    const tRowIdx = ty * tWidth;
    const lRowIdx = ly * lWidth;

    for (let tx = x0; tx < x1; tx++) {
      const lx = tx - lLeft;
      const lIdx = (lRowIdx + lx) * 4;
      let as = lData[lIdx + 3] * opacity;

      if (as <= 0) continue;

      // Mask multiplication
      if (maskData) {
        let mVal = 1;
        if (maskIsLayerAligned) {
          mVal = maskData[lRowIdx + lx];
        } else {
          mVal = maskData[tRowIdx + tx];
        }
        as *= mVal;
        if (as <= 0) continue;
      }

      // Base clipping alpha multiplication
      if (clipAlpha) {
        const cVal = clipAlpha[tRowIdx + tx];
        as *= cVal;
        if (as <= 0) continue;
      }

      const tIdx = (tRowIdx + tx) * 4;
      bPixel[0] = tData[tIdx];
      bPixel[1] = tData[tIdx + 1];
      bPixel[2] = tData[tIdx + 2];
      bPixel[3] = tData[tIdx + 3];

      sPixel[0] = lData[lIdx];
      sPixel[1] = lData[lIdx + 1];
      sPixel[2] = lData[lIdx + 2];
      sPixel[3] = as;

      blendPixel(mode, bPixel, sPixel, pixelOut);

      tData[tIdx] = pixelOut[0];
      tData[tIdx + 1] = pixelOut[1];
      tData[tIdx + 2] = pixelOut[2];
      tData[tIdx + 3] = pixelOut[3];
    }
  }

  return target;
}
