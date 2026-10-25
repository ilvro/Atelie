#!/usr/bin/env node
/**
 * Visual Verification CLI for PSD Composition (Etapa 24)
 * Compares our Node-composed layer reconstruction against Photoshop's baked composite (psd.imageData).
 *
 * Usage:
 *   node --max-old-space-size=8192 scripts/library/psd-check.js --file "<caminho do .psd>"
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { readPsd } from 'ag-psd';

import { expansionDir } from '../../server/paths.js';
import { useImageDataCanvas } from './lib/psd-canvas.js';
import {
  fromImageData,
  toUint8ClampedArray,
  resizeBuffer,
  resizeMask,
  cloneBuffer,
} from './lib/raster.js';
import { normalizeTree } from './lib/psd-tree.js';
import { composeTree } from './lib/compose.js';

export const DEFAULT_EXPANSION_ID = 'arquivos-confidenciais';
export const DEFAULT_SOURCE = '/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Arquivos Confidenciais';

/**
 * Compares two RGBA buffers of the same dimensions.
 * mae: mean absolute error of R, G, B in 0–255 weighted by alpha of b.
 * bad: fraction of visible pixels with error > 24 (on a 0–255 scale).
 * @param {{ width: number, height: number, data: Float32Array }} a
 * @param {{ width: number, height: number, data: Float32Array }} b
 * @returns {{ mae: number, bad: number }}
 */
export function compareBuffers(a, b) {
  const len = Math.min(a.width * a.height, b.width * b.height);
  const dataA = a.data;
  const dataB = b.data;

  let totalWeightedError = 0;
  let totalWeight = 0;
  let badPixels = 0;
  let visiblePixels = 0;

  for (let i = 0; i < len; i++) {
    const pIdx = i * 4;
    const ab = dataB[pIdx + 3];

    if (ab > 0.05) {
      visiblePixels++;
      const errR = Math.abs(dataA[pIdx] - dataB[pIdx]) * 255;
      const errG = Math.abs(dataA[pIdx + 1] - dataB[pIdx + 1]) * 255;
      const errB = Math.abs(dataA[pIdx + 2] - dataB[pIdx + 2]) * 255;

      const pixelErr = (errR + errG + errB) / 3;

      totalWeightedError += ab * pixelErr;
      totalWeight += ab;

      const maxChannelErr = Math.max(errR, errG, errB);
      if (maxChannelErr > 24) {
        badPixels++;
      }
    }
  }

  const mae = totalWeight > 0 ? totalWeightedError / totalWeight : 0;
  const count = visiblePixels > 0 ? visiblePixels : len;
  const bad = count > 0 ? badPixels / count : 0;

  return {
    mae: Math.round(mae * 100) / 100,
    bad: Math.round(bad * 10000) / 10000,
  };
}

/**
 * Creates a slug from relative path.
 */
function slugFromPath(filePath) {
  return filePath
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[º°]/g, 'o')
    .replace(/[ª]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Maps normalized tree node IDs to raw ag-psd layers.
 */
function buildNodeLayerMap(rawNodes, treeNodes, map = new Map()) {
  if (!Array.isArray(rawNodes) || !Array.isArray(treeNodes)) return map;

  for (let i = 0; i < treeNodes.length; i++) {
    const tNode = treeNodes[i];
    const rLayer = rawNodes[i];
    if (tNode && rLayer) {
      map.set(tNode.id, rLayer);
      if (tNode.children && rLayer.children) {
        buildNodeLayerMap(rLayer.children, tNode.children, map);
      }
    }
  }

  return map;
}

export async function checkPsd(filePath, options = {}) {
  const expansionId = options.expansion || DEFAULT_EXPANSION_ID;
  const t0 = performance.now();

  useImageDataCanvas();

  const buf = await readFile(filePath);
  const psd = readPsd(buf, { useImageData: true });

  if (!psd.imageData) {
    throw new Error(`PSD "${filePath}" não contém imagem composta (psd.imageData).`);
  }

  // Calculate target scale
  let scale = 1;
  if (psd.width >= 2400 && psd.height > psd.width) {
    scale = Math.min(1, 1240 / psd.width);
  } else {
    scale = Math.min(1, 2048 / Math.max(psd.width, psd.height));
  }

  const targetW = Math.max(1, Math.round(psd.width * scale));
  const targetH = Math.max(1, Math.round(psd.height * scale));

  // Linked PSBs
  const linkedMap = new Map();
  for (const f of psd.linkedFiles || []) {
    if (f.data && f.data.length >= 4 && f.data[0] === 0x38 && f.data[1] === 0x42) {
      try {
        linkedMap.set(f.id, readPsd(f.data, { useImageData: true }));
      } catch {
        // ignore
      }
    }
  }

  const tree = normalizeTree(psd, {
    linked: id => linkedMap.get(id) || null,
  });

  const layerMap = buildNodeLayerMap(psd.children || [], tree.nodes);
  const warnings = [];

  // Scaled pixel resolver with caching
  const pixelCache = new Map();
  const pixels = async (node) => {
    if (pixelCache.has(node.id)) {
      return pixelCache.get(node.id);
    }

    const rawLayer = layerMap.get(node.id);
    if (!rawLayer) return { buffer: null, mask: null };

    let layerBuf = null;
    let maskBuf = null;

    if (rawLayer.imageData) {
      const fullBuf = fromImageData(rawLayer.imageData);
      const tw = Math.max(1, Math.round(rawLayer.imageData.width * scale));
      const th = Math.max(1, Math.round(rawLayer.imageData.height * scale));
      layerBuf = await resizeBuffer(fullBuf, tw, th);
    }

    if (rawLayer.mask && !rawLayer.mask.disabled) {
      if (rawLayer.mask.imageData) {
        const mImg = rawLayer.mask.imageData;
        const maxVal = mImg.data instanceof Uint16Array ? 65535 : 255;
        const mLen = mImg.width * mImg.height;
        const rawMaskData = new Float32Array(mLen);
        for (let k = 0; k < mLen; k++) {
          rawMaskData[k] = mImg.data[k * 4] / maxVal;
        }

        const fullMask = { width: mImg.width, height: mImg.height, data: rawMaskData };
        const tmw = Math.max(1, Math.round(mImg.width * scale));
        const tmh = Math.max(1, Math.round(mImg.height * scale));
        const scaledMask = await resizeMask(fullMask, tmw, tmh);

        // Position mask in document coordinates
        const mLeftRaw = rawLayer.mask.positionRelativeToLayer
          ? (rawLayer.left || 0) + (rawLayer.mask.left || 0)
          : rawLayer.mask.left || 0;
        const mTopRaw = rawLayer.mask.positionRelativeToLayer
          ? (rawLayer.top || 0) + (rawLayer.mask.top || 0)
          : rawLayer.mask.top || 0;

        const mLeft = Math.round(mLeftRaw * scale);
        const mTop = Math.round(mTopRaw * scale);

        // Document-sized mask initialized to defaultColor
        const defVal = (rawLayer.mask.defaultColor ?? 255) / 255;
        const docMaskData = new Float32Array(targetW * targetH);
        docMaskData.fill(defVal);

        const x0 = Math.max(0, mLeft);
        const y0 = Math.max(0, mTop);
        const x1 = Math.min(targetW, mLeft + scaledMask.width);
        const y1 = Math.min(targetH, mTop + scaledMask.height);

        for (let ty = y0; ty < y1; ty++) {
          const my = ty - mTop;
          for (let tx = x0; tx < x1; tx++) {
            const mx = tx - mLeft;
            docMaskData[ty * targetW + tx] = scaledMask.data[my * scaledMask.width + mx];
          }
        }

        maskBuf = { width: targetW, height: targetH, data: docMaskData };
      } else if (rawLayer.mask.defaultColor !== undefined) {
        const defVal = rawLayer.mask.defaultColor / 255;
        const docMaskData = new Float32Array(targetW * targetH);
        docMaskData.fill(defVal);
        maskBuf = { width: targetW, height: targetH, data: docMaskData };
      }
    }

    const result = { buffer: layerBuf, mask: maskBuf };
    pixelCache.set(node.id, result);
    return result;
  };

  // Compose our composite
  const nossoBuffer = await composeTree(tree, pixels, {
    scale,
    warnings,
  });

  // Scale original Photoshop composite to target dimensions
  const origFullBuf = fromImageData(psd.imageData);
  const origScaledBuf = await resizeBuffer(origFullBuf, targetW, targetH);

  // Compare
  const { mae, bad } = compareBuffers(nossoBuffer, origScaledBuf);

  const t1 = performance.now();
  const elapsedMs = Math.round(t1 - t0);
  const memoryMb = Math.round(process.memoryUsage().heapUsed / (1024 * 1024));

  // Write visual check outputs
  const destExpansionDir = expansionDir(expansionId);
  const relPath = path.isAbsolute(filePath)
    ? path.relative(DEFAULT_SOURCE, filePath)
    : filePath;
  const slug = slugFromPath(relPath);
  const outDir = path.join(destExpansionDir, 'reports', 'psd-check', slug);
  await mkdir(outDir, { recursive: true });

  const origU8 = toUint8ClampedArray(origScaledBuf);
  const nossoU8 = toUint8ClampedArray(nossoBuffer);

  // Generate difference image (|nosso - orig| * 4)
  const diffU8 = new Uint8ClampedArray(targetW * targetH * 4);
  for (let i = 0; i < diffU8.length; i += 4) {
    diffU8[i] = Math.min(255, Math.abs(nossoBuffer.data[i] - origScaledBuf.data[i]) * 255 * 4);
    diffU8[i + 1] = Math.min(255, Math.abs(nossoBuffer.data[i + 1] - origScaledBuf.data[i + 1]) * 255 * 4);
    diffU8[i + 2] = Math.min(255, Math.abs(nossoBuffer.data[i + 2] - origScaledBuf.data[i + 2]) * 255 * 4);
    diffU8[i + 3] = 255;
  }

  await sharp(origU8, { raw: { width: targetW, height: targetH, channels: 4 } })
    .png()
    .toFile(path.join(outDir, 'original.png'));

  await sharp(nossoU8, { raw: { width: targetW, height: targetH, channels: 4 } })
    .png()
    .toFile(path.join(outDir, 'nosso.png'));

  await sharp(diffU8, { raw: { width: targetW, height: targetH, channels: 4 } })
    .png()
    .toFile(path.join(outDir, 'diferenca.png'));

  const result = {
    file: relPath,
    mae,
    bad,
    badPercent: `${(bad * 100).toFixed(2)}%`,
    width: targetW,
    height: targetH,
    scale,
    warnings,
    elapsedMs,
    memoryMb,
  };

  await writeFile(path.join(outDir, 'resultado.json'), JSON.stringify(result, null, 2), 'utf8');

  console.log(
    `[psd-check] ${path.basename(filePath)} · mae: ${mae} · bad: ${(bad * 100).toFixed(2)}% · ${(elapsedMs / 1000).toFixed(1)}s`
  );

  return result;
}

// CLI invocation
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let fileArg = null;
  let expansionArg = DEFAULT_EXPANSION_ID;

  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--file' && process.argv[i + 1]) {
      fileArg = process.argv[++i];
    } else if (process.argv[i] === '--expansion' && process.argv[i + 1]) {
      expansionArg = process.argv[++i];
    }
  }

  if (!fileArg) {
    console.error('Uso: node --max-old-space-size=8192 scripts/library/psd-check.js --file "<caminho do .psd>"');
    process.exit(1);
  }

  const resolvedPath = path.isAbsolute(fileArg) ? fileArg : path.join(DEFAULT_SOURCE, fileArg);

  checkPsd(resolvedPath, { expansion: expansionArg }).catch(err => {
    console.error('[psd-check] Erro fatal:', err);
    process.exit(1);
  });
}

