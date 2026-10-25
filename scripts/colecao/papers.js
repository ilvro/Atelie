import { Raster, parseColor } from './raster.js';
import { mulberry32, valueNoise2D, fbm } from './noise.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadRecipes() {
  const jsonPath = path.join(__dirname, 'papers.json');
  const raw = await fs.readFile(jsonPath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Deterministically generates a paper raster based on recipe and age.
 * age: 'novo' | 'usado' | 'antigo'
 */
export function generatePaper(recipe, age = 'novo', { width, height } = {}) {
  const W = width || recipe.width;
  const H = height || recipe.height;
  const scale = W / recipe.width;

  const seed = (recipe.seed * 1009 + (age === 'antigo' ? 3001 : age === 'usado' ? 2003 : 1007)) >>> 0;
  const rand = mulberry32(seed);
  const noise = valueNoise2D(seed);

  const [baseR, baseG, baseB] = parseColor(recipe.base);
  const baseAlpha = recipe.baseAlpha ?? 1.0;

  const raster = new Raster(W, H, [baseR, baseG, baseB, baseAlpha]);
  const data = raster.data;
  const totalPixels = W * H;

  // 1. Mottle (low-frequency cloud variation)
  if (recipe.mottle && recipe.mottle.strength > 0) {
    const strength = recipe.mottle.strength;
    const mScale = recipe.mottle.scale / scale;

    // Use a 4x downsampled grid for silky smooth cloud interpolation and 16x speedup
    const step = 4;
    const gridW = Math.ceil(W / step) + 1;
    const gridH = Math.ceil(H / step) + 1;
    const grid = new Float32Array(gridW * gridH);

    for (let gy = 0; gy < gridH; gy++) {
      const py = gy * step;
      for (let gx = 0; gx < gridW; gx++) {
        const px = gx * step;
        const n = fbm(noise, px * mScale, py * mScale, { octaves: 3, lacunarity: 2, gain: 0.5 });
        grid[gy * gridW + gx] = (n - 0.5) * strength;
      }
    }

    for (let y = 0; y < H; y++) {
      const gy = Math.floor(y / step);
      const ty = (y % step) / step;
      const rowIdx = y * W;

      for (let x = 0; x < W; x++) {
        const gx = Math.floor(x / step);
        const tx = (x % step) / step;

        const g00 = grid[gy * gridW + gx];
        const g10 = grid[gy * gridW + gx + 1];
        const g01 = grid[(gy + 1) * gridW + gx];
        const g11 = grid[(gy + 1) * gridW + gx + 1];

        const m = (g00 * (1 - tx) + g10 * tx) * (1 - ty) + (g01 * (1 - tx) + g11 * tx) * ty;

        const pIdx = (rowIdx + x) * 4;
        data[pIdx] = Math.max(0, Math.min(1, data[pIdx] + m));
        data[pIdx + 1] = Math.max(0, Math.min(1, data[pIdx + 1] + m));
        data[pIdx + 2] = Math.max(0, Math.min(1, data[pIdx + 2] + m));
      }
    }
  }

  // 2. Fibers (thin organic paper fibers)
  if (recipe.fibers && recipe.fibers.density > 0) {
    const fiberCount = Math.round(totalPixels * recipe.fibers.density);
    const [dr, dg, db] = parseColor(recipe.fibers.darkColor || '#4a4235');
    const [lr, lg, lb] = parseColor(recipe.fibers.lightColor || '#ffffff');
    const fiberLen = Math.max(4, recipe.fibers.length * scale);

    for (let i = 0; i < fiberCount; i++) {
      const fx = rand() * W;
      const fy = rand() * H;
      const angle = rand() * Math.PI * 2;
      const len = fiberLen * (0.5 + rand() * 0.7);
      const isDark = rand() > 0.35;
      const col = isDark ? [dr, dg, db, 0.45] : [lr, lg, lb, 0.4];

      raster.drawLine(
        fx,
        fy,
        fx + Math.cos(angle) * len,
        fy + Math.sin(angle) * len,
        col,
        Math.max(1, 1.2 * scale),
        1,
        0.5,
        rand
      );
    }
  }

  // 3. Lines / Rules / Grids (drawn before aging so age can fade them)
  if (recipe.lines) {
    const lConf = recipe.lines;
    const fadeFactor = age === 'antigo' ? 0.45 : age === 'usado' ? 0.75 : 1.0;

    if (lConf.type === 'ruled') {
      const [lr, lg, lb] = parseColor(lConf.color);
      const sp = Math.round(lConf.spacing * scale);
      const top = Math.round((lConf.marginTop || 200) * scale);
      const bot = Math.round((lConf.marginBottom || 150) * scale);

      for (let y = top; y < H - bot; y += sp) {
        raster.drawLine(
          60 * scale,
          y,
          W - 60 * scale,
          y,
          [lr, lg, lb, 0.55 * fadeFactor],
          Math.max(1, 1.2 * scale),
          1,
          0.4,
          rand
        );
      }
    } else if (lConf.type === 'notebook') {
      const [lr, lg, lb] = parseColor(lConf.lineColor);
      const [mr, mg, mb] = parseColor(lConf.marginColor);
      const sp = Math.round(lConf.spacing * scale);
      const mLeft = Math.round(lConf.marginLeft * scale);

      // Horizontal lines
      for (let y = 140 * scale; y < H - 80 * scale; y += sp) {
        raster.drawLine(
          mLeft - 40 * scale,
          y,
          W - 60 * scale,
          y,
          [lr, lg, lb, 0.5 * fadeFactor],
          Math.max(1, 1.2 * scale),
          1,
          0.3,
          rand
        );
      }

      // Vertical red margin
      raster.drawLine(
        mLeft,
        60 * scale,
        mLeft,
        H - 60 * scale,
        [mr, mg, mb, 0.7 * fadeFactor],
        Math.max(1, 1.8 * scale),
        1,
        0.3,
        rand
      );

      // Spiral binder holes
      if (lConf.holes && mLeft > 100 * scale) {
        const holeX = Math.round(mLeft * 0.4);
        const holeR = Math.max(3, 10 * scale);
        for (let hy = 160 * scale; hy < H - 120 * scale; hy += sp * 1.5) {
          raster.drawCircle(holeX, hy, holeR, [0.15, 0.15, 0.15, 0.95]);
          raster.drawCircle(holeX + 1 * scale, hy + 1 * scale, holeR * 0.7, [0.08, 0.08, 0.08, 1]);
        }
      }
    } else if (lConf.type === 'grid') {
      const [lr, lg, lb] = parseColor(lConf.color);
      const sz = Math.round(lConf.size * scale);
      // Verticals
      for (let x = 60 * scale; x < W - 60 * scale; x += sz) {
        raster.drawLine(x, 60 * scale, x, H - 60 * scale, [lr, lg, lb, 0.35 * fadeFactor], Math.max(1, 1 * scale), 1, 0.2, rand);
      }
      // Horizontals
      for (let y = 60 * scale; y < H - 60 * scale; y += sz) {
        raster.drawLine(60 * scale, y, W - 60 * scale, y, [lr, lg, lb, 0.35 * fadeFactor], Math.max(1, 1 * scale), 1, 0.2, rand);
      }
    } else if (lConf.type === 'millimeter') {
      const [sr, sg, sb] = parseColor(lConf.subColor);
      const [mr, mg, mb] = parseColor(lConf.majorColor);
      const sub = Math.max(2, Math.round(lConf.subdiv * scale));
      const maj = Math.max(sub * 2, Math.round(lConf.major * scale));

      for (let x = 60 * scale; x < W - 60 * scale; x += sub) {
        const isMajor = Math.abs(x % maj) < sub / 2;
        const col = isMajor ? [mr, mg, mb, 0.6 * fadeFactor] : [sr, sg, sb, 0.25 * fadeFactor];
        raster.drawLine(x, 60 * scale, x, H - 60 * scale, col, Math.max(1, isMajor ? 1.4 * scale : 1 * scale), 1, 0.1, rand);
      }
      for (let y = 60 * scale; y < H - 60 * scale; y += sub) {
        const isMajor = Math.abs(y % maj) < sub / 2;
        const col = isMajor ? [mr, mg, mb, 0.6 * fadeFactor] : [sr, sg, sb, 0.25 * fadeFactor];
        raster.drawLine(60 * scale, y, W - 60 * scale, y, col, Math.max(1, isMajor ? 1.4 * scale : 1 * scale), 1, 0.1, rand);
      }
    } else if (lConf.type === 'double-margin') {
      const [lr, lg, lb] = parseColor(lConf.lineColor);
      const [mr, mg, mb] = parseColor(lConf.marginColor);
      const sp = Math.round(lConf.spacing * scale);
      const mLeft = Math.round(lConf.marginLeft * scale);
      const gap = Math.round(lConf.marginGap * scale);

      for (let y = 160 * scale; y < H - 100 * scale; y += sp) {
        raster.drawLine(60 * scale, y, W - 60 * scale, y, [lr, lg, lb, 0.45 * fadeFactor], Math.max(1, 1.2 * scale), 1, 0.3, rand);
      }
      raster.drawLine(mLeft, 60 * scale, mLeft, H - 60 * scale, [mr, mg, mb, 0.6 * fadeFactor], Math.max(1, 1.4 * scale), 1, 0.2, rand);
      raster.drawLine(mLeft + gap, 60 * scale, mLeft + gap, H - 60 * scale, [mr, mg, mb, 0.6 * fadeFactor], Math.max(1, 1.4 * scale), 1, 0.2, rand);
    } else if (lConf.type === 'watermark') {
      // Repeat faint watermark text across diagonals
      const [wr, wg, wb] = parseColor(lConf.color);
      const wAlpha = (lConf.alpha || 0.4) * fadeFactor;
      const step = Math.round((lConf.spacing || 260) * scale);
      const textLen = 140 * scale;

      for (let y = -H; y < H * 2; y += step) {
        for (let x = -W; x < W * 2; x += step * 1.5) {
          raster.drawLine(x, y, x + textLen, y + textLen * 0.7, [wr, wg, wb, wAlpha * 0.4], Math.max(1, 2 * scale), 1, 0, rand);
        }
      }
    }
  }

  // 4. Aging (yellowing, edge vignette, foxing)
  const isJornal = recipe.slug === 'papel-jornal';
  const isPergaminho = recipe.slug === 'pergaminho';

  let yellowStrength = 0;
  let edgeStrength = 0.02;
  let foxingClusters = 0;

  if (age === 'novo') {
    yellowStrength = isPergaminho ? 0.08 : 0.01;
    edgeStrength = isPergaminho ? 0.08 : 0.02;
    foxingClusters = isPergaminho ? 3 : 0;
  } else if (age === 'usado') {
    yellowStrength = isJornal ? 0.28 : isPergaminho ? 0.24 : 0.18;
    edgeStrength = 0.22;
    foxingClusters = 14;
  } else if (age === 'antigo') {
    yellowStrength = isJornal ? 0.55 : isPergaminho ? 0.45 : 0.38;
    edgeStrength = 0.48;
    foxingClusters = 38;
  }

  // Yellowing towards #d8b77a ([0.847, 0.718, 0.478])
  if (yellowStrength > 0) {
    const yr = 0.847;
    const yg = 0.718;
    const yb = 0.478;

    for (let i = 0; i < totalPixels * 4; i += 4) {
      data[i] = data[i] * (1 - yellowStrength) + yr * yellowStrength;
      data[i + 1] = data[i + 1] * (1 - yellowStrength) + yg * yellowStrength;
      data[i + 2] = data[i + 2] * (1 - yellowStrength) + yb * yellowStrength;
    }
  }

  // Edge darkening vignette
  if (edgeStrength > 0) {
    const insetX = W * 0.22;
    const insetY = H * 0.22;
    const [vr, vg, vb] = [0.38, 0.26, 0.12]; // aged brown border

    for (let y = 0; y < H; y++) {
      const dy = Math.min(y, H - 1 - y);
      const ty = Math.max(0, Math.min(1, 1 - dy / insetY));
      const rowIdx = y * W;

      for (let x = 0; x < W; x++) {
        const dx = Math.min(x, W - 1 - x);
        const tx = Math.max(0, Math.min(1, 1 - dx / insetX));
        const edgeFactor = Math.max(tx, ty);

        if (edgeFactor > 0) {
          const dark = edgeFactor * edgeFactor * edgeStrength;
          const idx = (rowIdx + x) * 4;
          data[idx] = data[idx] * (1 - dark) + vr * dark;
          data[idx + 1] = data[idx + 1] * (1 - dark) + vg * dark;
          data[idx + 2] = data[idx + 2] * (1 - dark) + vb * dark;
        }
      }
    }
  }

  // Foxing (oxidation spots in clusters)
  if (foxingClusters > 0) {
    const scaledClusters = Math.max(1, Math.round(foxingClusters * Math.min(1, (W * H) / (1697 * 2400))));
    const [fxR, fxG, fxB] = [0.45, 0.28, 0.14];

    for (let c = 0; c < scaledClusters; c++) {
      const cx = rand() * W;
      const cy = rand() * H;
      const spotsInCluster = 2 + Math.floor(rand() * 4);

      for (let s = 0; s < spotsInCluster; s++) {
        const sx = cx + (rand() - 0.5) * (40 * scale);
        const sy = cy + (rand() - 0.5) * (40 * scale);
        const rad = (1 + rand() * 4) * scale;
        const alpha = 0.3 + rand() * 0.45;
        raster.drawCircle(sx, sy, rad, [fxR, fxG, fxB, alpha]);
      }
    }
  }

  // 5. Grain (high-frequency tactile noise)
  if (recipe.grain && recipe.grain.strength > 0) {
    const gStrength = recipe.grain.strength;
    for (let i = 0; i < totalPixels * 4; i += 4) {
      const n = (rand() - 0.5) * gStrength;
      data[i] = Math.max(0, Math.min(1, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(1, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(1, data[i + 2] + n));
    }
  }

  // 6. Edge cut (reta, serrilhada, deckle)
  if (recipe.edge === 'deckle') {
    const maxCut = Math.max(4, 18 * scale);
    for (let y = 0; y < H; y++) {
      const cutLeft = maxCut * (0.3 + 0.7 * noise(y * 0.02, 10));
      const cutRight = maxCut * (0.3 + 0.7 * noise(y * 0.02, 20));
      for (let x = 0; x < Math.min(W, cutLeft); x++) {
        const idx = (y * W + x) * 4;
        data[idx + 3] = 0;
      }
      for (let x = Math.max(0, W - cutRight); x < W; x++) {
        const idx = (y * W + x) * 4;
        data[idx + 3] = 0;
      }
    }
    for (let x = 0; x < W; x++) {
      const cutTop = maxCut * (0.3 + 0.7 * noise(x * 0.02, 30));
      const cutBot = maxCut * (0.3 + 0.7 * noise(x * 0.02, 40));
      for (let y = 0; y < Math.min(H, cutTop); y++) {
        const idx = (y * W + x) * 4;
        data[idx + 3] = 0;
      }
      for (let y = Math.max(0, H - cutBot); y < H; y++) {
        const idx = (y * W + x) * 4;
        data[idx + 3] = 0;
      }
    }
  } else if (recipe.edge === 'serrilhada') {
    const maxCut = Math.max(3, 12 * scale);
    for (let y = 0; y < H; y++) {
      const cutLeft = maxCut * (0.2 + 0.8 * rand());
      const cutRight = maxCut * (0.2 + 0.8 * rand());
      for (let x = 0; x < Math.min(W, cutLeft); x++) {
        data[(y * W + x) * 4 + 3] = 0;
      }
      for (let x = Math.max(0, W - cutRight); x < W; x++) {
        data[(y * W + x) * 4 + 3] = 0;
      }
    }
    for (let x = 0; x < W; x++) {
      const cutTop = maxCut * (0.2 + 0.8 * rand());
      const cutBot = maxCut * (0.2 + 0.8 * rand());
      for (let y = 0; y < Math.min(H, cutTop); y++) {
        data[(y * W + x) * 4 + 3] = 0;
      }
      for (let y = Math.max(0, H - cutBot); y < H; y++) {
        data[(y * W + x) * 4 + 3] = 0;
      }
    }
  }

  return raster;
}

