#!/usr/bin/env node
/**
 * PSD/PSB Structure Analysis & Report Generator (Etapa 23)
 * Analyzes Photoshop documents in the private expansion without rendering any image pixels,
 * building normalized layer trees, computing complexity scores, and generating comprehensive reports.
 *
 * Usage:
 *   npm run library:psd-report -- [--source <path>] [--bundle <name>] [--file <path>] [--limit <n>]
 */
import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { readPsd } from 'ag-psd';

import { projectDir, collectionDir, expansionDir } from '../../server/paths.js';
import { cornersToAffine } from './lib/psd-geometry.js';
import {
  normalizeTree,
  textNodes,
  variantGroups,
  looksLikeUv,
} from './lib/psd-tree.js';

export const DEFAULT_SOURCE = '/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Arquivos Confidenciais';
export const DEFAULT_EXPANSION_ID = 'arquivos-confidenciais';

export const ALLOWED_ADJUSTMENTS = new Set([
  'hue/saturation',
  'black & white',
  'brightness/contrast',
  'invert',
  'levels',
]);

/**
 * Transforms a relative file path into a clean filesystem slug without accents or spaces.
 * @param {string} relPath
 * @returns {string}
 */
export function slugPath(relPath) {
  return relPath
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
 * Checks if a buffer represents a PSD/PSB file (magic bytes '8BPS').
 * @param {Uint8Array} buf
 * @returns {boolean}
 */
export function isPsdBuffer(buf) {
  if (!buf || buf.length < 4) return false;
  return buf[0] === 0x38 && buf[1] === 0x42 && buf[2] === 0x50 && buf[3] === 0x53;
}

/**
 * Computes the 0–100 difficulty score for a document based on its structural elements.
 */
export function calculateScore({ blends, adjustments, perspectiveCount, totalEffects, textsCount }) {
  let score = 100;

  // −5 por mesclagem sem equivalente
  let unsupportedBlends = 0;
  for (const [mode, count] of Object.entries(blends)) {
    if (mode.startsWith('unsupported:')) {
      unsupportedBlends += count;
    }
  }
  score -= unsupportedBlends * 5;

  // −3 por tipo de ajuste diferente de hue/saturation, black & white, brightness/contrast, invert, levels
  let nonAllowedAdjustTypes = 0;
  for (const type of Object.keys(adjustments)) {
    if (!ALLOWED_ADJUSTMENTS.has(type.toLowerCase())) {
      nonAllowedAdjustTypes++;
    }
  }
  score -= nonAllowedAdjustTypes * 3;

  // −10 por objeto inteligente em perspectiva
  score -= perspectiveCount * 10;

  // −2 por efeito de camada (até −20)
  score -= Math.min(20, totalEffects * 2);

  // −15 se não houver texto nenhum (é só imagem)
  if (textsCount === 0) {
    score -= 15;
  }

  return Math.max(0, score);
}

/**
 * Recursively analyzes the normalized layer tree for statistics.
 */
export function analyzeTree(tree) {
  const blends = {};
  const adjustments = {};
  const effects = {};
  const unsupported = [];
  let perspectiveCount = 0;
  let totalEffects = 0;
  const uvSet = new Set();

  function walk(nodeList) {
    if (!Array.isArray(nodeList)) return;
    for (const node of nodeList) {
      if (node.blend) {
        blends[node.blend] = (blends[node.blend] || 0) + 1;
        if (node.blend.startsWith('unsupported:') && !unsupported.includes(node.blend)) {
          unsupported.push(node.blend);
        }
      }

      if (Array.isArray(node.effects)) {
        for (const eff of node.effects) {
          effects[eff] = (effects[eff] || 0) + 1;
          totalEffects++;
        }
      }

      if (node.kind === 'adjust' && node.adjust?.type) {
        const type = String(node.adjust.type).toLowerCase();
        adjustments[type] = (adjustments[type] || 0) + 1;
        if (!ALLOWED_ADJUSTMENTS.has(type)) {
          const mark = `adjust:${type}`;
          if (!unsupported.includes(mark)) unsupported.push(mark);
        }
      }

      if (node.kind === 'smart' && node.smart) {
        const aff = cornersToAffine(node.smart.corners, node.smart.width, node.smart.height);
        if (aff.perspective) {
          perspectiveCount++;
          if (!unsupported.includes('smart-perspective')) {
            unsupported.push('smart-perspective');
          }
        }
      }

      if (looksLikeUv(node.name)) {
        uvSet.add(node.name);
      }

      if (node.kind === 'group' && Array.isArray(node.children)) {
        walk(node.children);
      }

      if (node.kind === 'smart' && node.smart?.content?.nodes) {
        walk(node.smart.content.nodes);
      }
    }
  }

  walk(tree.nodes);

  if (Array.isArray(tree.warnings)) {
    for (const w of tree.warnings) {
      if (!unsupported.includes(w)) unsupported.push(w);
    }
  }

  return {
    blends,
    adjustments,
    effects,
    unsupported,
    perspectiveCount,
    totalEffects,
    uv: Array.from(uvSet),
  };
}

/**
 * Reads all known postscript font names from public/colecao and the expansion library.json.
 */
export async function loadKnownFonts(expansionId) {
  const known = new Set();

  async function addFromLibraryFile(filePath) {
    try {
      const content = await readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      for (const item of data.items || []) {
        if (item.kind === 'font' && item.postscript) {
          known.add(item.postscript.toLowerCase().trim());
        }
      }
    } catch {
      // file might not exist yet
    }
  }

  await addFromLibraryFile(path.join(collectionDir, 'library.json'));
  await addFromLibraryFile(path.join(expansionDir(expansionId), 'library.json'));

  return known;
}

/**
 * Recursively scans directory for .psd and .psb files.
 */
async function scanPsdFiles(dir, baseDir = dir) {
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('._')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await scanPsdFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else if (/\.ps[db]$/i.test(entry.name)) {
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        files.push({ fullPath, relativePath, name: entry.name });
      }
    }
  } catch (err) {
    console.error(`[psd-report] Erro ao ler diretório "${dir}":`, err.message);
  }
  return files;
}

/**
 * Parses CLI arguments.
 */
function parseArgs(argv) {
  const args = {
    source: DEFAULT_SOURCE,
    expansion: DEFAULT_EXPANSION_ID,
    bundle: null,
    file: null,
    limit: Infinity,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--source' && argv[i + 1]) {
      args.source = argv[++i];
    } else if (arg === '--expansion' && argv[i + 1]) {
      args.expansion = argv[++i];
    } else if (arg === '--bundle' && argv[i + 1]) {
      args.bundle = argv[++i];
    } else if (arg === '--file' && argv[i + 1]) {
      args.file = argv[++i];
    } else if (arg === '--limit' && argv[i + 1]) {
      args.limit = parseInt(argv[++i], 10);
    }
  }

  return args;
}

export async function runPsdReport(options = {}) {
  const sourceDir = path.resolve(options.source || DEFAULT_SOURCE);
  const expansionId = options.expansion || DEFAULT_EXPANSION_ID;
  const bundleFilter = options.bundle ? options.bundle.toLowerCase().trim() : null;
  const fileFilter = options.file ? options.file.toLowerCase().trim() : null;
  const limit = options.limit || Infinity;

  const destExpansionDir = expansionDir(expansionId);
  const reportsDir = path.join(destExpansionDir, 'reports');
  const psdReportsDir = path.join(reportsDir, 'psd');

  await mkdir(psdReportsDir, { recursive: true });

  console.log(`[psd-report] Origem: ${sourceDir}`);
  console.log(`[psd-report] Destino relatórios: ${reportsDir}`);
  if (bundleFilter) console.log(`[psd-report] Filtro bundle: "${options.bundle}"`);
  if (fileFilter) console.log(`[psd-report] Filtro arquivo: "${options.file}"`);
  if (limit !== Infinity) console.log(`[psd-report] Limite: ${limit} arquivos`);

  const knownFonts = await loadKnownFonts(expansionId);
  console.log(`[psd-report] Fontes conhecidas na biblioteca: ${knownFonts.size}`);

  // Discover PSDs
  const tScan0 = performance.now();
  let allFiles = await scanPsdFiles(sourceDir);
  allFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  if (bundleFilter) {
    const filters = bundleFilter.split(',').map(s => s.trim()).filter(Boolean);
    const regexes = filters.map(f => {
      const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i');
    });
    allFiles = allFiles.filter(f => regexes.some(rx => rx.test(f.relativePath)));
  }
  if (fileFilter) {
    allFiles = allFiles.filter(f =>
      f.relativePath.toLowerCase().includes(fileFilter) ||
      f.fullPath.toLowerCase().includes(fileFilter)
    );
  }
  if (limit < allFiles.length) {
    allFiles = allFiles.slice(0, limit);
  }

  const tScan1 = performance.now();
  console.log(`[psd-report] Encontrados ${allFiles.length} arquivos PSD/PSB (${((tScan1 - tScan0) / 1000).toFixed(2)}s)`);

  const summary = {
    totalFiles: 0,
    totalBytes: 0,
    totalTexts: 0,
    blends: {},
    adjustments: {},
    effects: {},
    fontCounts: {}, // fontName -> fileCount
    fontUsage: {},  // fontName -> totalLayers
    fileScores: [], // { file, score, textsCount, variantsCount, uvCount, unsupported, perspective }
    errors: [],
  };

  const tStart = performance.now();

  for (let idx = 0; idx < allFiles.length; idx++) {
    const fileInfo = allFiles[idx];
    const rel = fileInfo.relativePath;
    const t0 = performance.now();

    try {
      const fileStat = await stat(fileInfo.fullPath);
      const buf = await readFile(fileInfo.fullPath);
      summary.totalBytes += fileStat.size;

      // 1. Read structural outline only
      const psd = readPsd(buf, {
        skipLayerImageData: true,
        skipCompositeImageData: true,
        skipThumbnail: true,
      });

      // Resolve linked PSB smart objects
      const linkedMap = new Map();
      for (const linkedFile of psd.linkedFiles || []) {
        if (linkedFile.data && linkedFile.data.length >= 4 && isPsdBuffer(linkedFile.data)) {
          try {
            const innerPsd = readPsd(linkedFile.data, {
              skipLayerImageData: true,
              skipCompositeImageData: true,
              skipThumbnail: true,
            });
            linkedMap.set(linkedFile.id, innerPsd);
          } catch {
            // ignore corrupt linked files
          }
        }
      }

      // 2. Normalize Tree
      const tree = normalizeTree(psd, {
        linked: id => linkedMap.get(id) || null,
      });

      const texts = textNodes(tree);
      const variants = variantGroups(tree);
      const analysis = analyzeTree(tree);

      const fileFonts = Array.from(new Set(texts.map(t => t.postscript).filter(Boolean)));

      const score = calculateScore({
        blends: analysis.blends,
        adjustments: analysis.adjustments,
        perspectiveCount: analysis.perspectiveCount,
        totalEffects: analysis.totalEffects,
        textsCount: texts.length,
      });

      const fileReport = {
        file: rel,
        bytes: fileStat.size,
        width: tree.width,
        height: tree.height,
        nodes: tree.nodes,
        texts,
        variants,
        uv: analysis.uv,
        fonts: fileFonts,
        blends: analysis.blends,
        adjustments: analysis.adjustments,
        effects: analysis.effects,
        unsupported: analysis.unsupported,
        perspective: analysis.perspectiveCount,
        score,
      };

      // Write per-file report
      const slug = slugPath(rel);
      const outPath = path.join(psdReportsDir, `${slug}.json`);
      await writeFile(outPath, JSON.stringify(fileReport, null, 2), 'utf8');

      // Update aggregations
      summary.totalFiles++;
      summary.totalTexts += texts.length;

      for (const [b, count] of Object.entries(analysis.blends)) {
        summary.blends[b] = (summary.blends[b] || 0) + count;
      }
      for (const [adj, count] of Object.entries(analysis.adjustments)) {
        summary.adjustments[adj] = (summary.adjustments[adj] || 0) + count;
      }
      for (const [eff, count] of Object.entries(analysis.effects)) {
        summary.effects[eff] = (summary.effects[eff] || 0) + count;
      }

      for (const fn of fileFonts) {
        summary.fontCounts[fn] = (summary.fontCounts[fn] || 0) + 1;
      }
      for (const t of texts) {
        if (t.postscript) {
          summary.fontUsage[t.postscript] = (summary.fontUsage[t.postscript] || 0) + 1;
        }
      }

      summary.fileScores.push({
        file: rel,
        score,
        textsCount: texts.length,
        variantsCount: variants.length,
        uvCount: analysis.uv.length,
        uvNames: analysis.uv,
        unsupported: analysis.unsupported,
        perspective: analysis.perspectiveCount,
        bytes: fileStat.size,
      });

      const t1 = performance.now();
      const elapsed = ((t1 - t0) / 1000).toFixed(1);
      console.log(`[${idx + 1}/${allFiles.length}] ${rel} · ${elapsed} s · Score ${score}`);
    } catch (err) {
      summary.errors.push({ file: rel, error: err.message });
      console.error(`[${idx + 1}/${allFiles.length}] ERRO em ${rel}: ${err.message}`);
    }
  }

  const tEnd = performance.now();
  const totalElapsedSec = ((tEnd - tStart) / 1000).toFixed(1);

  // Sort files by score
  summary.fileScores.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
  const topHighest = summary.fileScores.slice(0, 20);
  const topLowest = [...summary.fileScores].reverse().slice(0, 20);

  // Fonts list with library presence
  const fontList = Object.entries(summary.fontCounts)
    .map(([fontName, filesCount]) => ({
      postscript: fontName,
      files: filesCount,
      occurrences: summary.fontUsage[fontName] || filesCount,
      inLibrary: knownFonts.has(fontName.toLowerCase().trim()),
    }))
    .sort((a, b) => b.files - a.files || a.postscript.localeCompare(b.postscript));

  const summaryData = {
    totalFiles: summary.totalFiles,
    totalBytes: summary.totalBytes,
    totalTexts: summary.totalTexts,
    totalErrors: summary.errors.length,
    elapsedSeconds: parseFloat(totalElapsedSec),
    blends: summary.blends,
    adjustments: summary.adjustments,
    effects: summary.effects,
    fonts: fontList,
    topHighestScore: topHighest,
    topLowestScore: topLowest,
    errors: summary.errors,
  };

  // Write psd-summary.json
  const summaryJsonPath = path.join(reportsDir, 'psd-summary.json');
  await writeFile(summaryJsonPath, JSON.stringify(summaryData, null, 2), 'utf8');

  // Build markdown table report
  const summaryMd = generateMarkdownReport(summaryData);
  const summaryMdPath = path.join(reportsDir, 'psd-summary.md');
  await writeFile(summaryMdPath, summaryMd, 'utf8');

  console.log(`\n========================================`);
  console.log(`[psd-report] Relatório concluído em ${totalElapsedSec}s!`);
  console.log(`[psd-report] Total analisado: ${summary.totalFiles} arquivos (${(summary.totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB)`);
  console.log(`[psd-report] Erros: ${summary.errors.length}`);
  console.log(`[psd-report] Resumo JSON: ${summaryJsonPath}`);
  console.log(`[psd-report] Resumo Markdown: ${summaryMdPath}`);
  console.log(`========================================\n`);

  return summaryData;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateMarkdownReport(data) {
  const lines = [];

  lines.push('# Relatório de Análise Estrutural dos PSDs — Arquivos Confidenciais');
  lines.push('');
  lines.push(`- **Total de arquivos analisados**: ${data.totalFiles}`);
  lines.push(`- **Tamanho total**: ${formatBytes(data.totalBytes)} (${data.totalBytes.toLocaleString()} bytes)`);
  lines.push(`- **Total de camadas de texto**: ${data.totalTexts}`);
  lines.push(`- **Tempo total de processamento**: ${data.elapsedSeconds} s`);
  lines.push(`- **Erros encontrados**: ${data.totalErrors}`);
  lines.push('');

  // Blends
  lines.push('## Modos de Mesclagem (Blends)');
  lines.push('');
  lines.push('| Modo | Ocorrências | Suportado no Ateliê |');
  lines.push('| :--- | :--- | :--- |');
  const sortedBlends = Object.entries(data.blends).sort((a, b) => b[1] - a[1]);
  for (const [blend, count] of sortedBlends) {
    const isUnsupported = blend.startsWith('unsupported:');
    const status = isUnsupported ? '❌ Não' : '✅ Sim';
    lines.push(`| \`${blend}\` | ${count} | ${status} |`);
  }
  lines.push('');

  // Adjustments
  lines.push('## Camadas de Ajuste (Adjustments)');
  lines.push('');
  lines.push('| Tipo de Ajuste | Ocorrências | Suportado na Etapa 24 |');
  lines.push('| :--- | :--- | :--- |');
  const sortedAdj = Object.entries(data.adjustments).sort((a, b) => b[1] - a[1]);
  for (const [adj, count] of sortedAdj) {
    const isAllowed = ALLOWED_ADJUSTMENTS.has(adj.toLowerCase());
    const status = isAllowed ? '✅ Sim' : '⚠️ Parcial / Não';
    lines.push(`| \`${adj}\` | ${count} | ${status} |`);
  }
  lines.push('');

  // Effects
  lines.push('## Efeitos de Camada (Layer Effects)');
  lines.push('');
  lines.push('| Efeito | Ocorrências |');
  lines.push('| :--- | :--- |');
  const sortedEff = Object.entries(data.effects).sort((a, b) => b[1] - a[1]);
  for (const [eff, count] of sortedEff) {
    lines.push(`| \`${eff}\` | ${count} |`);
  }
  lines.push('');

  // Fonts
  lines.push('## Fontes Utilizadas');
  lines.push('');
  lines.push('| Fonte (PostScript) | Arquivos que Usam | Camadas Totais | Na Biblioteca? |');
  lines.push('| :--- | :--- | :--- | :--- |');
  for (const font of data.fonts) {
    const status = font.inLibrary ? '✅ Sim' : '❌ Falta';
    lines.push(`| \`${font.postscript}\` | ${font.files} | ${font.occurrences} | ${status} |`);
  }
  lines.push('');

  // Top 20 Highest
  lines.push('## 20 Arquivos de Maior Score (Mais simples e diretos para importar)');
  lines.push('');
  lines.push('| Score | Arquivo | Textos | Variantes | UV | Destaques |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const f of data.topHighestScore) {
    const uvText = f.uvCount > 0 ? `Sim (${f.uvNames.join(', ')})` : 'Não';
    const notes = f.unsupported.length > 0 ? f.unsupported.join(', ') : 'OK';
    lines.push(`| **${f.score}** | \`${f.file}\` | ${f.textsCount} | ${f.variantsCount} | ${uvText} | ${notes} |`);
  }
  lines.push('');

  // Top 20 Lowest
  lines.push('## 20 Arquivos de Menor Score (Maior complexidade / requerem atenção)');
  lines.push('');
  lines.push('| Score | Arquivo | Textos | Variantes | UV | Problemas Detectados |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const f of data.topLowestScore) {
    const uvText = f.uvCount > 0 ? `Sim (${f.uvNames.join(', ')})` : 'Não';
    const issues = f.unsupported.length > 0 ? f.unsupported.join(', ') : (f.textsCount === 0 ? 'Sem textos (imagem pura)' : 'Perspectiva / Efeitos');
    lines.push(`| **${f.score}** | \`${f.file}\` | ${f.textsCount} | ${f.variantsCount} | ${uvText} | ${issues} |`);
  }
  lines.push('');

  // Errors
  if (data.errors && data.errors.length > 0) {
    lines.push('## Erros Durante a Leitura');
    lines.push('');
    lines.push('| Arquivo | Erro |');
    lines.push('| :--- | :--- |');
    for (const err of data.errors) {
      lines.push(`| \`${err.file}\` | ${err.error} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// Direct CLI invocation
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const args = parseArgs(process.argv);
  runPsdReport(args).catch(err => {
    console.error('[psd-report] Erro fatal:', err);
    process.exit(1);
  });
}
