#!/usr/bin/env node
/**
 * PSD to Ateliê Template Importer (Etapa 25)
 * CLI and programmatic importer converting PSD/PSB files into editable Ateliê templates.
 *
 * Usage:
 *   node --max-old-space-size=8192 scripts/library/import-psd.js --source "<pasta>" [--bundle "Bundle 4"] [--file "<psd>"] [--limit 10] [--force]
 */
import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { readPsd } from 'ag-psd';

import { projectDir, collectionDir, expansionDir } from '../../server/paths.js';
import { atomicWrite } from '../../server/storage.js';
import { useImageDataCanvas } from './lib/psd-canvas.js';
import {
  fromImageData,
  toUint8ClampedArray,
  resizeBuffer,
  resizeMask,
} from './lib/raster.js';
import { normalizeTree } from './lib/psd-tree.js';
import { composeTree } from './lib/compose.js';
import { psdToHandout } from './lib/psd-to-handout.js';
import { readManifest, mergeItems, writeManifest } from './lib/manifest.js';
import {
  cleanTemplateCategory,
  cleanTemplateName,
  templateId as makeTemplateId,
} from './lib/catalog.js';
import { bundleOf } from './import-elements.js';

export const DEFAULT_SOURCE = '/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Arquivos Confidenciais';
export const DEFAULT_EXPANSION_ID = 'arquivos-confidenciais';

/**
 * Checks if a buffer has magic bytes '8BPS'.
 */
function isPsdBuffer(buf) {
  if (!buf || buf.length < 4) return false;
  return buf[0] === 0x38 && buf[1] === 0x42 && buf[2] === 0x50 && buf[3] === 0x53;
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

/**
 * Compares two buffers excluding pixels masked by textMask (Uint8Array: 1 = ignore).
 */
export function compareWithoutText(a, b, textMask) {
  const len = Math.min(a.width * a.height, b.width * b.height);
  const dataA = a.data;
  const dataB = b.data;

  let totalWeightedError = 0;
  let totalWeight = 0;
  let badPixels = 0;
  let visiblePixels = 0;

  for (let i = 0; i < len; i++) {
    // If pixel is within a text bounding box, skip it
    if (textMask && textMask[i] === 1) continue;

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
 * Loads font items from collection and expansion library.json files.
 */
async function loadLibraryFonts(expansionDir) {
  const fonts = [];
  try {
    const houseManifest = await readManifest(collectionDir);
    for (const item of houseManifest.items) {
      if (item.kind === 'font') fonts.push(item);
    }
  } catch {
    // ignore
  }

  try {
    const expManifest = await readManifest(expansionDir);
    for (const item of expManifest.items) {
      if (item.kind === 'font') fonts.push(item);
    }
  } catch {
    // ignore
  }

  return fonts;
}

/**
 * Recursively scans source directory for PSD/PSB files.
 */
async function scanPsdFiles(dir, baseDir, files = []) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name.startsWith('.') || ent.name === '__MACOSX') continue;
      await scanPsdFiles(full, baseDir, files);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (ext === '.psd' || ext === '.psb') {
        files.push({
          fullPath: full,
          relativePath: path.relative(baseDir, full),
        });
      }
    }
  }

  return files;
}

/**
 * Main import function for converting PSDs into templates.
 */
export async function importPsdTemplates({
  source = DEFAULT_SOURCE,
  dest = expansionDir(DEFAULT_EXPANSION_ID),
  bundle = null,
  file = null,
  limit = Infinity,
  force = false,
  verbose = false,
  logger = console.log,
} = {}) {
  const startTime = Date.now();
  useImageDataCanvas();

  const sourceDir = path.resolve(source);
  const destDir = path.resolve(dest);

  const templatesDir = path.join(destDir, 'templates');
  const previewsDir = path.join(destDir, 'previews');
  const stateDir = path.join(destDir, 'state');
  const reportsDir = path.join(destDir, 'reports', 'templates');

  await mkdir(templatesDir, { recursive: true });
  await mkdir(previewsDir, { recursive: true });
  await mkdir(stateDir, { recursive: true });
  await mkdir(reportsDir, { recursive: true });

  // Read index state for incremental processing
  const indexPath = path.join(stateDir, 'psd-index.json');
  let indexState = {};
  try {
    const raw = await readFile(indexPath, 'utf8');
    indexState = JSON.parse(raw);
  } catch {
    indexState = {};
  }

  // Load known fonts
  const libraryFonts = await loadLibraryFonts(destDir);
  logger(`[import-psd] Fontes conhecidas na biblioteca: ${libraryFonts.length}`);

  // Discover candidate files
  let candidates = [];
  if (file) {
    let resolved = path.isAbsolute(file) ? file : path.resolve(file);
    if (!await stat(resolved).catch(() => null)) {
      resolved = path.join(sourceDir, file);
    }
    const st = await stat(resolved).catch(() => null);
    if (st && st.isFile()) {
      candidates.push({
        fullPath: resolved,
        relativePath: path.relative(sourceDir, resolved),
      });
    } else {
      throw new Error(`Arquivo não encontrado: "${file}"`);
    }
  } else {
    candidates = await scanPsdFiles(sourceDir, sourceDir);
  }

  // Filter by bundle
  if (bundle) {
    const bundleList = bundle.split(',').map(b => b.trim()).filter(Boolean);
    candidates = candidates.filter(c => {
      return bundleList.some(b => {
        const escaped = b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(c.relativePath);
      });
    });
  }

  // Sort candidates deterministically
  candidates.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  if (Number.isFinite(limit) && limit > 0) {
    candidates = candidates.slice(0, limit);
  }

  logger(`[import-psd] Candidatos a converter: ${candidates.length} arquivos.`);

  const manifest = await readManifest(destDir);
  const newManifestItems = [];
  const processedReports = [];
  const allMissingFonts = new Map();

  let acceptedCount = 0;
  let revisarCount = 0;
  let skippedCount = 0;

  for (let idx = 0; idx < candidates.length; idx++) {
    const item = candidates[idx];
    const { fullPath, relativePath } = item;
    const fileStats = await stat(fullPath);

    // Incremental check
    if (!force) {
      const cached = indexState[relativePath];
      if (
        cached &&
        cached.size === fileStats.size &&
        cached.mtime === fileStats.mtimeMs
      ) {
        const expectedTpl = path.join(destDir, 'templates', `${cached.tplId}.json`);
        const exists = await stat(expectedTpl).catch(() => null);
        if (exists) {
          skippedCount++;
          continue;
        }
      }
    }

    const t0 = performance.now();
    logger(`\n[${idx + 1}/${candidates.length}] Processando: ${path.basename(fullPath)}...`);

    let psdBuf;
    try {
      psdBuf = await readFile(fullPath);
    } catch (err) {
      logger(`  [ERRO] Falha ao ler arquivo: ${err.message}`);
      continue;
    }

    if (!isPsdBuffer(psdBuf)) {
      logger('  [AVISO] Não é um arquivo PSD/PSB válido. Pulando.');
      continue;
    }

    let psd;
    try {
      psd = readPsd(psdBuf, { useImageData: true });
    } catch (err) {
      logger(`  [ERRO] Falha ao decodificar PSD: ${err.message}`);
      continue;
    }

    if (!psd.imageData) {
      logger('  [AVISO] PSD não contém imagem composta salva (psd.imageData). Pulando.');
      continue;
    }

    // Determine scale
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
      if (f.data && f.data.length >= 4 && isPsdBuffer(f.data)) {
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
    const pixelCache = new Map();

    const pixels = async (node) => {
      if (pixelCache.has(node.id)) return pixelCache.get(node.id);
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

      if (rawLayer.mask && !rawLayer.mask.disabled && rawLayer.mask.imageData) {
        const mImg = rawLayer.mask.imageData;
        const maxVal = mImg.data instanceof Uint16Array ? 65535 : 255;
        const mLen = mImg.width * mImg.height;
        const rawMaskData = new Float32Array(mLen);
        for (let k = 0; k < mLen; k++) rawMaskData[k] = mImg.data[k * 4] / maxVal;
        const fullMask = { width: mImg.width, height: mImg.height, data: rawMaskData };
        const tmw = Math.max(1, Math.round(mImg.width * scale));
        const tmh = Math.max(1, Math.round(mImg.height * scale));
        const scaledMask = await resizeMask(fullMask, tmw, tmh);

        const mLeftRaw = rawLayer.mask.positionRelativeToLayer
          ? (rawLayer.left || 0) + (rawLayer.mask.left || 0)
          : rawLayer.mask.left || 0;
        const mTopRaw = rawLayer.mask.positionRelativeToLayer
          ? (rawLayer.top || 0) + (rawLayer.mask.top || 0)
          : rawLayer.mask.top || 0;

        const mLeft = Math.round(mLeftRaw * scale);
        const mTop = Math.round(mTopRaw * scale);
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
      }

      const result = { buffer: layerBuf, mask: maskBuf };
      pixelCache.set(node.id, result);
      return result;
    };

    // Metadata
    const bundleName = bundleOf(relativePath);
    const category = cleanTemplateCategory(bundleName);
    const docName = cleanTemplateName(path.basename(fullPath));
    const tplId = makeTemplateId(category, docName, relativePath);

    let conversion;
    try {
      conversion = await psdToHandout(tree, pixels, {
        tplId,
        category,
        name: docName,
        sourcePath: relativePath,
        scale,
        libraryFonts,
      });
    } catch (err) {
      logger(`  [ERRO] Falha ao converter para modelo: ${err.message}`);
      continue;
    }

    const { handout, rasters, report } = conversion;

    // Collect missing fonts
    for (const f of report.missingFonts) {
      allMissingFonts.set(f, (allMissingFonts.get(f) || 0) + 1);
    }

    // Validation 1: Compose without text & compare with PSD composition
    const noTextBuffer = await composeTree(tree, pixels, {
      scale,
      skip: n => n.kind === 'text' || Boolean(n.text),
      warnings: report.warnings,
    });

    const origScaledBuf = await resizeBuffer(
      fromImageData(psd.imageData),
      targetW,
      targetH
    );

    // Build text exclusion mask
    const textMask = new Uint8Array(targetW * targetH);
    for (const layer of handout.layers) {
      if (layer.kind === 'text') {
        const x0 = Math.max(0, Math.floor(layer.x));
        const y0 = Math.max(0, Math.floor(layer.y));
        const x1 = Math.min(targetW, Math.ceil(layer.x + layer.width));
        const y1 = Math.min(targetH, Math.ceil(layer.y + layer.height));
        for (let y = y0; y < y1; y++) {
          const row = y * targetW;
          for (let x = x0; x < x1; x++) {
            textMask[row + x] = 1;
          }
        }
      }
    }

    const { mae, bad } = compareWithoutText(noTextBuffer, origScaledBuf, textMask);

    const isAccepted = mae <= 8 && bad <= 0.05;
    const status = isAccepted ? 'accepted' : 'revisar';

    if (isAccepted) {
      acceptedCount++;
    } else {
      revisarCount++;
      if (!handout.tags.includes('revisar')) {
        handout.tags.push('revisar');
      }
    }

    // Write raster WebP files
    const templateSubDir = path.join(destDir, 'templates', tplId);
    await mkdir(templateSubDir, { recursive: true });

    for (const r of rasters) {
      const u8 = toUint8ClampedArray(r.buffer);
      const outPath = path.join(destDir, r.relativePath);
      await sharp(u8, {
        raw: { width: r.width, height: r.height, channels: 4 },
      })
        .webp({ quality: 88, alphaQuality: 100 })
        .toFile(outPath);

      newManifestItems.push({
        id: r.id,
        kind: 'layer',
        file: r.relativePath,
        width: r.width,
        height: r.height,
      });
    }

    // Write template document JSON
    const tplDocPath = path.join(destDir, 'templates', `${tplId}.json`);
    await atomicWrite(tplDocPath, JSON.stringify(handout, null, 2));

    // Generate template preview (PSD composite scaled to max 480)
    const prevScale = Math.min(1, 480 / Math.max(psd.width, psd.height));
    const prevW = Math.max(1, Math.round(psd.width * prevScale));
    const prevH = Math.max(1, Math.round(psd.height * prevScale));
    const prevBuf = await resizeBuffer(fromImageData(psd.imageData), prevW, prevH);
    const prevU8 = toUint8ClampedArray(prevBuf);

    const prevRelPath = `previews/${tplId}.webp`;
    const prevPath = path.join(destDir, prevRelPath);
    await sharp(prevU8, {
      raw: { width: prevW, height: prevH, channels: 4 },
    })
      .webp({ quality: 85 })
      .toFile(prevPath);

    // Manifest template item
    const templateItem = {
      id: tplId,
      kind: 'template',
      name: handout.name,
      category: handout.category,
      tags: handout.tags,
      file: `templates/${tplId}.json`,
      preview: prevRelPath,
      width: handout.page.width,
      height: handout.page.height,
      source: { bundle: bundleName, path: relativePath },
      fields: handout.fields.length,
      layers: handout.layers.length,
    };
    newManifestItems.push(templateItem);

    // Record report
    const t1 = performance.now();
    const elapsedMs = Math.round(t1 - t0);

    const fileReport = {
      id: tplId,
      file: relativePath,
      name: docName,
      category,
      mae,
      bad,
      badPercent: `${(bad * 100).toFixed(2)}%`,
      status,
      motivo: isAccepted ? null : 'mae > 8 ou bad > 5%',
      missingFonts: report.missingFonts,
      warnings: report.warnings,
      layers: handout.layers.length,
      fields: handout.fields.length,
      rasters: rasters.length,
      elapsedMs,
    };

    processedReports.push(fileReport);

    await atomicWrite(
      path.join(reportsDir, `${tplId}.json`),
      JSON.stringify(fileReport, null, 2)
    );

    // Update index state
    indexState[relativePath] = {
      size: fileStats.size,
      mtime: fileStats.mtimeMs,
      tplId,
    };

    logger(
      `  -> ${tplId} | ${handout.layers.length} camadas | ${handout.fields.length} campos | mae: ${mae} | bad: ${(bad * 100).toFixed(2)}% [${status.toUpperCase()}] (${(elapsedMs / 1000).toFixed(1)}s)`
    );
  }

  // Save index state
  await atomicWrite(indexPath, JSON.stringify(indexState, null, 2));

  // Merge manifest items and write library.json
  const updatedManifest = mergeItems(manifest, newManifestItems);
  await writeManifest(destDir, updatedManifest);

  // Generate templates-summary.md report
  const summaryPath = path.join(destDir, 'reports', 'templates-summary.md');
  const summaryMd = generateSummaryMarkdown({
    totalProcessed: processedReports.length,
    acceptedCount,
    revisarCount,
    skippedCount,
    reports: processedReports,
    missingFontsMap: allMissingFonts,
    elapsedTotalMs: Date.now() - startTime,
  });

  await atomicWrite(summaryPath, summaryMd);

  logger('\n[import-psd] Importação concluída!');
  logger(`  Modelos gerados: ${processedReports.length}`);
  logger(`  Aceitos automaticamente: ${acceptedCount}`);
  logger(`  Marcados para revisar: ${revisarCount}`);
  logger(`  Ignorados (já atualizados): ${skippedCount}`);
  logger(`  Relatório gravado em: ${summaryPath}`);

  return {
    acceptedCount,
    revisarCount,
    skippedCount,
    reports: processedReports,
  };
}

function generateSummaryMarkdown({
  totalProcessed,
  acceptedCount,
  revisarCount,
  skippedCount,
  reports,
  missingFontsMap,
  elapsedTotalMs,
}) {
  const lines = [];
  lines.push('# Relatório de Conversão de Modelos PSD (Etapa 25)');
  lines.push('');
  lines.push(`- **Data**: ${new Date().toISOString()}`);
  lines.push(`- **Tempo total**: ${(elapsedTotalMs / 1000).toFixed(1)}s`);
  lines.push(`- **Modelos processados**: ${totalProcessed}`);
  lines.push(`- **Aceitos automaticamente (mae ≤ 8, bad ≤ 5%)**: ${acceptedCount}`);
  lines.push(`- **Marcados para revisar**: ${revisarCount}`);
  lines.push(`- **Ignorados (cache inalterado)**: ${skippedCount}`);
  lines.push('');

  lines.push('## Modelos Convertidos');
  lines.push('');
  lines.push('| ID | Nome | Categoria | Camadas | Campos | MAE | Bad % | Situação |');
  lines.push('|---|---|---|---|---|---|---|---|');

  for (const r of reports) {
    const sit = r.status === 'accepted' ? '✅ Aceito' : '⚠️ Revisar';
    lines.push(
      `| \`${r.id}\` | ${r.name} | ${r.category} | ${r.layers} | ${r.fields} | ${r.mae} | ${r.badPercent} | ${sit} |`
    );
  }
  lines.push('');

  lines.push('## Fontes Mais Ausentes no Acervo');
  lines.push('');
  lines.push('| Fonte PostScript | Arquivos |');
  lines.push('|---|---|');

  const sortedFonts = [...missingFontsMap.entries()].sort((a, b) => b[1] - a[1]);
  for (const [font, count] of sortedFonts.slice(0, 20)) {
    lines.push(`| \`${font}\` | ${count} |`);
  }
  if (sortedFonts.length === 0) {
    lines.push('| *Nenhuma fonte ausente detectada* | - |');
  }
  lines.push('');

  return lines.join('\n');
}

// CLI Invocation
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  let source = DEFAULT_SOURCE;
  let expansion = DEFAULT_EXPANSION_ID;
  let bundle = null;
  let file = null;
  let limit = Infinity;
  let force = false;
  let verbose = false;

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--source' && process.argv[i + 1]) source = process.argv[++i];
    else if (arg === '--expansion' && process.argv[i + 1]) expansion = process.argv[++i];
    else if (arg === '--bundle' && process.argv[i + 1]) bundle = process.argv[++i];
    else if (arg === '--file' && process.argv[i + 1]) file = process.argv[++i];
    else if (arg === '--limit' && process.argv[i + 1]) limit = parseInt(process.argv[++i], 10);
    else if (arg === '--force') force = true;
    else if (arg === '--verbose') verbose = true;
  }

  const destDir = expansionDir(expansion);

  importPsdTemplates({
    source,
    dest: destDir,
    bundle,
    file,
    limit,
    force,
    verbose,
  }).catch(err => {
    console.error('[import-psd] Erro fatal:', err);
    process.exit(1);
  });
}

