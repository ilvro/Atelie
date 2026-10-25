#!/usr/bin/env node
/**
 * Import Elements, Symbols and Fonts (Etapa 22)
 * CLI and programmatic importer for the "Arquivos Confidenciais" private expansion.
 *
 * Reads images, symbols and fonts from an external HD/folder, optimizes them,
 * and builds a self-contained local expansion under data-private/expansoes/arquivos-confidenciais/.
 */
import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import * as fflate from 'fflate';

import { projectDir, collectionDir, expansionDir } from '../../server/paths.js';
import { atomicWrite } from '../../server/storage.js';
import { readFontNames } from '../lib/font-names.js';
import {
  stripCount,
  isMonthFolder,
  categoryOf,
  displayName,
  tagsOf,
  elementId,
  fontId,
} from './lib/catalog.js';
import { readManifest, mergeItems, writeManifest } from './lib/manifest.js';

// Default source location on user's machine
export const DEFAULT_SOURCE = '/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Arquivos Confidenciais';
export const DEFAULT_EXPANSION_ID = 'arquivos-confidenciais';

export const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
export const FONT_EXTS = new Set(['.ttf', '.otf', '.woff', '.woff2']);
export const ARCHIVE_EXTS = new Set(['.zip']);

function createLimiter(concurrency = 4) {
  let active = 0;
  const queue = [];

  const next = () => {
    if (active < concurrency && queue.length > 0) {
      active++;
      const { fn, resolve, reject } = queue.shift();
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--;
          next();
        });
    }
  };

  return function limit(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}

export function bundleOf(relativePath) {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  for (let i = 0; i < parts.length - 1; i++) {
    if (/^\d{4}$/.test(parts[i]) && isMonthFolder(parts[i + 1])) {
      return `${parts[i]}/${stripCount(parts[i + 1])}`;
    }
  }
  for (const p of parts) {
    if (/^bundle/i.test(p)) return stripCount(p);
    if (isMonthFolder(p)) return stripCount(p);
  }
  return parts.length > 1 ? parts[1] : (parts[0] || 'geral');
}

/**
 * Main import function.
 */
export async function importElements({
  source = DEFAULT_SOURCE,
  dest = expansionDir(DEFAULT_EXPANSION_ID),
  collection = collectionDir,
  only = null, // 'assets' | 'symbols' | 'fonts' | null (all)
  limit = Infinity,
  dryRun = false,
  verbose = false,
  logger = console.log,
} = {}) {
  const startTime = Date.now();
  const limitTask = createLimiter(4);

  // Setup directories
  const elementsDir = path.join(dest, 'elements');
  const previewsDir = path.join(dest, 'previews');
  const fontsDir = path.join(dest, 'fonts');
  const stateDir = path.join(dest, 'state');
  const reportsDir = path.join(dest, 'reports');

  if (!dryRun) {
    await mkdir(dest, { recursive: true });
    await mkdir(elementsDir, { recursive: true });
    await mkdir(previewsDir, { recursive: true });
    await mkdir(fontsDir, { recursive: true });
    await mkdir(stateDir, { recursive: true });
    await mkdir(reportsDir, { recursive: true });

    // Write expansion.json if not present
    const expansionJsonPath = path.join(dest, 'expansion.json');
    try {
      await stat(expansionJsonPath);
    } catch {
      const expDescriptor = {
        id: DEFAULT_EXPANSION_ID,
        name: 'Arquivos Confidenciais',
        description: 'Acervo da comunidade de Ordem Paranormal (Catarse). Uso pessoal.',
        license: 'uso pessoal, não redistribuir',
        createdAt: new Date().toISOString(),
      };
      await atomicWrite(expansionJsonPath, JSON.stringify(expDescriptor, null, 2) + '\n');
    }
  }

  // Load state index
  const indexPath = path.join(stateDir, 'elements-index.json');
  let stateIndex = {};
  try {
    const rawIndex = await readFile(indexPath, 'utf8');
    stateIndex = JSON.parse(rawIndex);
  } catch {}

  // Read house collection to prevent copying duplicate fonts
  const houseFontPostscripts = new Set();
  try {
    const houseManifest = await readManifest(collection);
    for (const item of houseManifest.items || []) {
      if (item.kind === 'font' && item.postscript) {
        houseFontPostscripts.add(item.postscript.toLowerCase());
      }
    }
  } catch {}

  // Read existing expansion manifest
  const existingManifest = await readManifest(dest);

  // Map of sha1 -> item for fast deduplication
  const sha1Map = new Map();
  for (const item of existingManifest.items || []) {
    if (item.source?.sha1) {
      sha1Map.set(item.source.sha1, item);
    }
  }

  const seenFontPostscripts = new Set(houseFontPostscripts);
  for (const item of existingManifest.items || []) {
    if (item.kind === 'font' && item.postscript) {
      seenFontPostscripts.add(item.postscript.toLowerCase());
    }
  }

  const report = {
    scanned: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    duplicates: 0,
    errors: [],
    tooLarge: [],
  };

  const newItems = [];
  const attributionCache = new Map();

  async function getAttribution(dirPath) {
    if (attributionCache.has(dirPath)) {
      return attributionCache.get(dirPath);
    }
    try {
      const entries = await readdir(dirPath);
      const attrFile = entries.find(name => /^atribui[cç][aã]o.*\.txt$/i.test(name));
      if (attrFile) {
        const content = (await readFile(path.join(dirPath, attrFile), 'utf8')).trim().slice(0, 2000);
        attributionCache.set(dirPath, content);
        return content;
      }
    } catch {}
    attributionCache.set(dirPath, null);
    return null;
  }

  // Discover candidate files
  const fileQueue = [];

  async function walk(currentDir) {
    if (fileQueue.length >= limit) return;

    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch (err) {
      report.errors.push({ path: currentDir, message: err.message });
      return;
    }

    for (const entry of entries) {
      if (fileQueue.length >= limit) break;

      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(source, fullPath).replace(/\\/g, '/');

      // Ignore macOS artifacts and hidden directories
      if (entry.name.startsWith('.') || entry.name === '__MACOSX') continue;
      // Never process PSD / PSB files in stage 22
      if (/\.ps[db]$/i.test(entry.name)) continue;

      if (entry.isDirectory()) {
        const lowerName = entry.name.toLowerCase();
        // Skip tutorial folders
        if (lowerName === 'tutoriais') continue;

        // Apply --only filter on top-level folders
        if (only) {
          const top = relPath.split('/')[0].toLowerCase();
          if (only === 'assets' && !['assets', 'extras', 'extras (2)'].includes(top)) continue;
          if (only === 'symbols' && !['simbolos', 'símbolos'].includes(top)) continue;
          if (only === 'fonts' && !['documentos', 'assets'].includes(top)) continue;
        }

        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const top = relPath.split('/')[0].toLowerCase();

        const isImage = IMAGE_EXTS.has(ext);
        const isFont = FONT_EXTS.has(ext);
        const isZip = ARCHIVE_EXTS.has(ext);

        if (!isImage && !isFont && !isZip) continue;

        if (only === 'assets' && (top.startsWith('simbolos') || top.startsWith('símbolos'))) continue;
        if (only === 'symbols' && !top.startsWith('simbolos') && !top.startsWith('símbolos')) continue;
        if (only === 'fonts' && isImage) continue;

        fileQueue.push({ fullPath, relPath, ext, isImage, isFont, isZip });
      }
    }
  }

  logger(`Escaneando acervo em: ${source}...`);
  await walk(source);
  logger(`Encontrados ${fileQueue.length} arquivo(s) para análise.`);

  // Process files one by one for HD read safety
  for (const file of fileQueue) {
    if (report.created + report.updated + report.duplicates >= limit) break;

    report.scanned++;
    const { fullPath, relPath, ext, isImage, isFont, isZip } = file;

    let fileStat;
    try {
      fileStat = await stat(fullPath);
    } catch (err) {
      report.errors.push({ path: relPath, message: err.message });
      continue;
    }

    // Ignore tiny image files (< 1 KB)
    if (isImage && fileStat.size < 1024) {
      report.skipped++;
      continue;
    }

    // Check incremental index
    const cached = stateIndex[relPath];
    if (cached && cached.size === fileStat.size && Math.abs(cached.mtimeMs - fileStat.mtimeMs) < 1000) {
      // Already processed in a previous run and unchanged
      report.skipped++;
      continue;
    }

    // Process image
    if (isImage) {
      try {
        const buffer = await readFile(fullPath);
        const sha1 = createHash('sha1').update(buffer).digest('hex');

        // Check deduplication
        if (sha1Map.has(sha1)) {
          report.duplicates++;
          const existing = sha1Map.get(sha1);
          const newTags = tagsOf(relPath);
          const mergedTags = Array.from(new Set([...(existing.tags || []), ...newTags])).slice(0, 12);
          existing.tags = mergedTags;

          stateIndex[relPath] = {
            size: fileStat.size,
            mtimeMs: fileStat.mtimeMs,
            id: existing.id,
            sha1,
            duplicateOf: existing.id,
          };
          continue;
        }

        // Validate image metadata with Sharp
        const meta = await sharp(buffer).metadata();
        if (!meta.width || !meta.height) {
          report.errors.push({ path: relPath, message: 'Dimensões inválidas' });
          continue;
        }

        if (meta.width * meta.height > 80_000_000) {
          report.tooLarge.push({ path: relPath, width: meta.width, height: meta.height });
          continue;
        }

        const id = elementId(relPath);
        const elemOutPath = path.join(elementsDir, `${id}.webp`);
        const prevOutPath = path.join(previewsDir, `${id}.webp`);

        let genWidth = meta.width;
        let genHeight = meta.height;

        if (!dryRun) {
          const elemResult = await limitTask(() =>
            sharp(buffer)
              .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 86, alphaQuality: 100 })
              .toFile(elemOutPath)
          );
          genWidth = elemResult.width;
          genHeight = elemResult.height;

          await limitTask(() =>
            sharp(buffer)
              .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 78 })
              .toFile(prevOutPath)
          );
        } else {
          const maxDim = Math.max(meta.width, meta.height);
          if (maxDim > 2048) {
            const scale = 2048 / maxDim;
            genWidth = Math.round(meta.width * scale);
            genHeight = Math.round(meta.height * scale);
          }
        }

        const attribution = await getAttribution(path.dirname(fullPath));
        const item = {
          id,
          kind: 'element',
          name: displayName(relPath),
          category: categoryOf(relPath),
          tags: tagsOf(relPath),
          file: `elements/${id}.webp`,
          preview: `previews/${id}.webp`,
          width: genWidth,
          height: genHeight,
          source: {
            bundle: bundleOf(relPath),
            path: relPath,
            sha1,
            ...(attribution ? { attribution } : {}),
          },
        };

        newItems.push(item);
        sha1Map.set(sha1, item);

        stateIndex[relPath] = {
          size: fileStat.size,
          mtimeMs: fileStat.mtimeMs,
          id,
          sha1,
        };

        report.created++;
        if (verbose) logger(`[element] ${item.name} (${item.category}) -> ${id}`);
      } catch (err) {
        report.errors.push({ path: relPath, message: err.message });
      }
    } else if (isFont) {
      // Loose font
      try {
        const buffer = await readFile(fullPath);
        if (ext === '.woff' || ext === '.woff2') {
          const baseName = path.basename(relPath, ext);
          const psName = baseName;
          if (seenFontPostscripts.has(psName.toLowerCase())) {
            report.skipped++;
            continue;
          }
          seenFontPostscripts.add(psName.toLowerCase());

          const id = fontId(psName);
          const destFontFile = path.join(fontsDir, `${id}${ext}`);
          if (!dryRun) {
            await writeFile(destFontFile, buffer);
          }

          const item = {
            id,
            kind: 'font',
            name: baseName,
            category: 'Fontes',
            tags: [baseName.toLowerCase(), bundleOf(relPath).toLowerCase()],
            file: `fonts/${id}${ext}`,
            family: baseName,
            postscript: psName,
            weight: 400,
            style: 'normal',
            source: { bundle: bundleOf(relPath), path: relPath },
          };

          newItems.push(item);
          report.created++;
          stateIndex[relPath] = { size: fileStat.size, mtimeMs: fileStat.mtimeMs, id };
        } else {
          // .ttf or .otf
          const parsed = readFontNames(buffer);
          if (!parsed || !parsed.postscript) {
            report.errors.push({ path: relPath, message: 'Fonte TrueType/OpenType inválida ou sem nome' });
            continue;
          }

          if (seenFontPostscripts.has(parsed.postscript.toLowerCase())) {
            report.skipped++;
            continue;
          }
          seenFontPostscripts.add(parsed.postscript.toLowerCase());

          const id = fontId(parsed.postscript);
          const destFontFile = path.join(fontsDir, `${id}${ext}`);
          if (!dryRun) {
            await writeFile(destFontFile, buffer);
          }

          const item = {
            id,
            kind: 'font',
            name: parsed.fullName || parsed.family,
            category: 'Fontes',
            tags: [parsed.family.toLowerCase(), bundleOf(relPath).toLowerCase()],
            file: `fonts/${id}${ext}`,
            family: parsed.family,
            postscript: parsed.postscript,
            weight: parsed.weight || 400,
            style: parsed.italic ? 'italic' : 'normal',
            source: { bundle: bundleOf(relPath), path: relPath },
          };

          newItems.push(item);
          report.created++;
          stateIndex[relPath] = { size: fileStat.size, mtimeMs: fileStat.mtimeMs, id };
          if (verbose) logger(`[font] ${item.name} (${parsed.postscript}) -> ${id}`);
        }
      } catch (err) {
        report.errors.push({ path: relPath, message: err.message });
      }
    } else if (isZip) {
      // Archive containing fonts
      try {
        const zipBuffer = await readFile(fullPath);
        let unzipped;
        try {
          unzipped = fflate.unzipSync(zipBuffer);
        } catch {
          report.errors.push({ path: relPath, message: 'Arquivo zip corrompido' });
          continue;
        }

        let zipFontCount = 0;
        for (const [entryName, entryBytes] of Object.entries(unzipped)) {
          if (entryName.includes('__MACOSX/') || path.basename(entryName).startsWith('._')) continue;
          const entryExt = path.extname(entryName).toLowerCase();
          if (entryExt !== '.ttf' && entryExt !== '.otf') continue;

          const parsed = readFontNames(Buffer.from(entryBytes));
          if (!parsed || !parsed.postscript) continue;

          if (seenFontPostscripts.has(parsed.postscript.toLowerCase())) {
            continue;
          }
          seenFontPostscripts.add(parsed.postscript.toLowerCase());

          const id = fontId(parsed.postscript);
          const destFontFile = path.join(fontsDir, `${id}${entryExt}`);
          if (!dryRun) {
            await writeFile(destFontFile, Buffer.from(entryBytes));
          }

          const item = {
            id,
            kind: 'font',
            name: parsed.fullName || parsed.family,
            category: 'Fontes',
            tags: [parsed.family.toLowerCase(), bundleOf(relPath).toLowerCase()],
            file: `fonts/${id}${entryExt}`,
            family: parsed.family,
            postscript: parsed.postscript,
            weight: parsed.weight || 400,
            style: parsed.italic ? 'italic' : 'normal',
            source: { bundle: bundleOf(relPath), path: `${relPath}#${entryName}` },
          };

          newItems.push(item);
          report.created++;
          zipFontCount++;
          if (verbose) logger(`[font zip] ${item.name} (${parsed.postscript}) -> ${id}`);
        }

        stateIndex[relPath] = { size: fileStat.size, mtimeMs: fileStat.mtimeMs, fontsExtracted: zipFontCount };
      } catch (err) {
        report.errors.push({ path: relPath, message: err.message });
      }
    }
  }

  // Update manifest and state
  let finalManifest = existingManifest;
  if (!dryRun) {
    finalManifest = mergeItems(existingManifest, newItems);
    await writeManifest(dest, finalManifest);
    await atomicWrite(indexPath, JSON.stringify(stateIndex, null, 2) + '\n');

    // Save timestamped report
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const reportPath = path.join(reportsDir, `elements-${stamp}.json`);
    await atomicWrite(reportPath, JSON.stringify(report, null, 2) + '\n');
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalItems = finalManifest.items?.length || newItems.length;

  logger('\n======================================================');
  logger(`  Importação: Arquivos Confidenciais (${only || 'tudo'})`);
  logger('======================================================');
  logger(`  Arquivos escaneados: ${report.scanned} | Criados: ${report.created} | Atualizados: ${report.updated}`);
  logger(`  Pulados (iguais): ${report.skipped} | Duplicatas unificadas: ${report.duplicates}`);
  logger(`  Itens muito grandes (>80MP): ${report.tooLarge.length} | Erros: ${report.errors.length}`);
  logger(`  Total de itens na expansão: ${totalItems} (tempo: ${elapsedSec}s)`);
  logger('======================================================\n');

  return {
    report,
    manifest: finalManifest,
    items: newItems,
    elapsedSec,
  };
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('import-elements.js')) {
  const args = process.argv.slice(2);
  let source = DEFAULT_SOURCE;
  let dest = expansionDir(DEFAULT_EXPANSION_ID);
  let only = null;
  let limit = Infinity;
  let dryRun = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      source = args[++i];
    } else if (args[i] === '--dest' && args[i + 1]) {
      dest = args[++i];
    } else if (args[i] === '--only' && args[i + 1]) {
      only = args[++i].toLowerCase();
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[++i], 10);
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--verbose') {
      verbose = true;
    }
  }

  importElements({ source, dest, only, limit, dryRun, verbose }).catch(err => {
    console.error('Erro na importação de elementos:', err);
    process.exit(1);
  });
}
