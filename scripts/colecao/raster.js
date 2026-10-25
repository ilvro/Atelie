import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fbm, worley2D } from './noise.js';

/**
 * Parses hex color '#rrggbb' or '#rrggbbaa' into normalized [r, g, b, a] in 0..1.
 */
export function parseColor(color) {
  if (Array.isArray(color)) {
    return [
      color[0] ?? 1,
      color[1] ?? 1,
      color[2] ?? 1,
      color[3] ?? 1,
    ];
  }
  const clean = String(color || '#ffffff').replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) / 255,
      parseInt(clean[1] + clean[1], 16) / 255,
      parseInt(clean[2] + clean[2], 16) / 255,
      1,
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16) / 255,
      parseInt(clean.slice(2, 4), 16) / 255,
      parseInt(clean.slice(4, 6), 16) / 255,
      1,
    ];
  }
  if (clean.length === 8) {
    return [
      parseInt(clean.slice(0, 2), 16) / 255,
      parseInt(clean.slice(2, 4), 16) / 255,
      parseInt(clean.slice(4, 6), 16) / 255,
      parseInt(clean.slice(6, 8), 16) / 255,
    ];
  }
  return [1, 1, 1, 1];
}

/**
 * High-performance Float32 RGBA raster buffer for texture synthesis.
 * All color components in 0..1.
 */
export class Raster {
  constructor(width, height, defaultColor = [1, 1, 1, 1]) {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.data = new Float32Array(this.width * this.height * 4);
    if (defaultColor) {
      this.fill(...parseColor(defaultColor));
    }
  }

  fill(r, g, b, a = 1) {
    const d = this.data;
    const len = d.length;
    for (let i = 0; i < len; i += 4) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = a;
    }
  }

  get(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return [0, 0, 0, 0];
    }
    const idx = (y * this.width + x) * 4;
    return [this.data[idx], this.data[idx + 1], this.data[idx + 2], this.data[idx + 3]];
  }

  set(x, y, r, g, b, a = 1) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    this.data[idx] = r;
    this.data[idx + 1] = g;
    this.data[idx + 2] = b;
    this.data[idx + 3] = a;
  }

  blendPixel(x, y, sr, sg, sb, sa, mode = 'normal') {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || sa <= 0) return;
    const idx = (y * this.width + x) * 4;
    const dr = this.data[idx];
    const dg = this.data[idx + 1];
    const db = this.data[idx + 2];
    const da = this.data[idx + 3];

    let br = sr, bg = sg, bb = sb;

    if (mode === 'multiply') {
      br = dr * sr;
      bg = dg * sg;
      bb = db * sb;
    } else if (mode === 'screen') {
      br = 1 - (1 - dr) * (1 - sr);
      bg = 1 - (1 - dg) * (1 - sg);
      bb = 1 - (1 - db) * (1 - sb);
    } else if (mode === 'overlay') {
      br = dr < 0.5 ? 2 * dr * sr : 1 - 2 * (1 - dr) * (1 - sr);
      bg = dg < 0.5 ? 2 * dg * sg : 1 - 2 * (1 - dg) * (1 - sg);
      bb = db < 0.5 ? 2 * db * sb : 1 - 2 * (1 - db) * (1 - sb);
    } else if (mode === 'soft-light') {
      const sl = (d, s) => s < 0.5 ? 2 * d * s + d * d * (1 - 2 * s) : Math.sqrt(d) * (2 * s - 1) + 2 * d * (1 - s);
      br = sl(dr, sr);
      bg = sl(dg, sg);
      bb = sl(db, sb);
    }

    // Standard alpha compositing
    const outA = sa + da * (1 - sa);
    if (outA > 0) {
      this.data[idx] = (br * sa + dr * da * (1 - sa)) / outA;
      this.data[idx + 1] = (bg * sa + dg * da * (1 - sa)) / outA;
      this.data[idx + 2] = (bb * sa + db * da * (1 - sa)) / outA;
      this.data[idx + 3] = outA;
    }
  }

  drawLine(x0, y0, x1, y1, color, thickness = 1, opacity = 1, jitter = 0, rand = Math.random) {
    const [r, g, b, baseA] = parseColor(color);
    const alpha = baseA * opacity;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist));
    const rad = thickness / 2;

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      let cx = x0 + dx * t;
      let cy = y0 + dy * t;
      if (jitter > 0) {
        cx += (rand() - 0.5) * jitter;
        cy += (rand() - 0.5) * jitter;
      }

      const minX = Math.max(0, Math.floor(cx - rad));
      const maxX = Math.min(this.width - 1, Math.ceil(cx + rad));
      const minY = Math.max(0, Math.floor(cy - rad));
      const maxY = Math.min(this.height - 1, Math.ceil(cy + rad));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= rad) {
            const edgeA = rad <= 1 ? alpha : alpha * Math.max(0, Math.min(1, (rad - d) + 0.5));
            this.blendPixel(x, y, r, g, b, edgeA, 'normal');
          }
        }
      }
    }
  }

  drawCircle(cx, cy, radius, color, opacity = 1) {
    const [r, g, b, baseA] = parseColor(color);
    const alpha = baseA * opacity;
    const minX = Math.max(0, Math.floor(cx - radius - 1));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + radius + 1));
    const minY = Math.max(0, Math.floor(cy - radius - 1));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + radius + 1));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= radius) {
          const a = radius <= 1 ? alpha : alpha * Math.max(0, Math.min(1, radius - d + 0.5));
          this.blendPixel(x, y, r, g, b, a, 'normal');
        }
      }
    }
  }

  drawRing(cx, cy, radius, thickness, color, opacity = 1, jitterFunc = null) {
    const [r, g, b, baseA] = parseColor(color);
    const numSteps = Math.ceil(2 * Math.PI * radius * 1.5);
    const rad = thickness / 2;

    for (let i = 0; i < numSteps; i++) {
      const angle = (i / numSteps) * Math.PI * 2;
      const rOffset = jitterFunc ? jitterFunc(angle) : 0;
      const curR = radius + rOffset;
      const px = cx + Math.cos(angle) * curR;
      const py = cy + Math.sin(angle) * curR;

      this.drawCircle(px, py, rad, [r, g, b, baseA * opacity]);
    }
  }

  /**
   * Converts Float32 0..1 to standard RGBA Uint8ClampedArray 0..255.
   */
  toBuffer() {
    const len = this.data.length;
    const buf = new Uint8ClampedArray(len);
    for (let i = 0; i < len; i += 4) {
      buf[i] = Math.round(Math.max(0, Math.min(1, this.data[i])) * 255);
      buf[i + 1] = Math.round(Math.max(0, Math.min(1, this.data[i + 1])) * 255);
      buf[i + 2] = Math.round(Math.max(0, Math.min(1, this.data[i + 2])) * 255);
      buf[i + 3] = Math.round(Math.max(0, Math.min(1, this.data[i + 3])) * 255);
    }
    return buf;
  }

  toSharp() {
    const buf = Buffer.from(this.toBuffer().buffer);
    return sharp(buf, {
      raw: {
        width: this.width,
        height: this.height,
        channels: 4,
      },
    });
  }

  async saveWebP(filePath, { quality = 80 } = {}) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await this.toSharp().webp({ quality, effort: 4 }).toFile(filePath);
  }

  async savePreview(filePath, { maxSize = 320, quality = 76 } = {}) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const isLandscape = this.width >= this.height;
    const targetW = isLandscape ? maxSize : Math.round((this.width / this.height) * maxSize);
    const targetH = isLandscape ? Math.round((this.height / this.width) * maxSize) : maxSize;

    await this.toSharp()
      .resize(targetW, targetH, { fit: 'inside' })
      .webp({ quality, effort: 4 })
      .toFile(filePath);
  }
}

