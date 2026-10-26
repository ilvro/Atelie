import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { scanBundleFiles, slug, cleanTemplateCategory, cleanTemplateName } from '../../src/data/bundle-scanner.js';

const DEFAULT_SOURCE = '/media/hd/RPG - Conteúdo/Arquivos Confidenciais/Documentos';
const ALT_SOURCE = '/home/ilvro/Documents/RPG - Conteúdo/RPG - Conteúdo/Arquivos Confidenciais/Documentos';

export async function indexAllBundles({ source, dest = 'data-private/expansoes/arquivos-confidenciais', dryRun = false } = {}) {
  const docsDir = source || (fs.existsSync(DEFAULT_SOURCE) ? DEFAULT_SOURCE : ALT_SOURCE);
  if (!fs.existsSync(docsDir)) {
    throw new Error(`Pasta de documentos não encontrada: "${docsDir}"`);
  }

  const destDir = path.resolve(dest);
  const previewsDir = path.join(destDir, 'previews');
  const libFile = path.join(destDir, 'library.json');
  const psdsSymlink = path.join(destDir, 'psds');

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (!fs.existsSync(previewsDir)) {
    fs.mkdirSync(previewsDir, { recursive: true });
  }

  // Create or verify symlink to raw PSDs
  if (!fs.existsSync(psdsSymlink)) {
    try {
      fs.symlinkSync(docsDir, psdsSymlink);
      console.log(`[index-bundles] Symlink criado: ${psdsSymlink} -> ${docsDir}`);
    } catch (err) {
      console.warn(`[index-bundles] Aviso ao criar symlink:`, err.message);
    }
  }

  // Read existing library.json
  let libraryData = { items: [] };
  if (fs.existsSync(libFile)) {
    try {
      libraryData = JSON.parse(fs.readFileSync(libFile, 'utf8'));
    } catch {
      libraryData = { items: [] };
    }
  }

  const existingItems = libraryData.items || [];
  const existingTemplates = existingItems.filter(i => i.kind === 'template');
  console.log(`[index-bundles] Modelos pré-existentes na biblioteca: ${existingTemplates.length}`);

  // Walk files on disk
  function walkDir(dir) {
    let files = [];
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch { return []; }

    for (const e of entries) {
      if (e.name === '__MACOSX' || e.name.startsWith('.') || e.name.startsWith('~$')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        files = files.concat(walkDir(full));
      } else {
        const rel = path.relative(docsDir, full);
        files.push({
          name: e.name,
          fullPath: full,
          webkitRelativePath: rel,
          file: { name: e.name, fullPath: full },
        });
      }
    }
    return files;
  }

  console.log(`[index-bundles] Escaneando arquivos em: ${docsDir}...`);
  const allFiles = walkDir(docsDir);
  console.log(`[index-bundles] Total de arquivos encontrados: ${allFiles.length}`);

  const scanResult = await scanBundleFiles(allFiles);
  console.log(`[index-bundles] Bundles identificados: ${scanResult.bundles.length}`);
  console.log(`[index-bundles] PSDs identificados: ${scanResult.totalPsdCount}`);
  console.log(`[index-bundles] Prévias emparelhadas: ${scanResult.totalPreviewCount}`);

  // Map of existing template files and IDs
  const existingFiles = new Set(existingTemplates.map(t => path.basename(t.file || '')));
  const existingIds = new Set(existingItems.map(i => i.id));

  let addedCount = 0;
  let skippedCount = 0;
  let previewsGenerated = 0;

  for (const bundle of scanResult.bundles) {
    for (const tpl of bundle.templates) {
      // Check if this PSD file is already converted
      const psdBase = path.basename(tpl.fileName, path.extname(tpl.fileName));
      const alreadyHas = existingTemplates.some(t => {
        const tFile = path.basename(t.file || '', '.json');
        return tFile.includes(slug(tpl.name)) || (t.source?.path && t.source.path.includes(tpl.fileName));
      });

      if (alreadyHas) {
        skippedCount++;
        continue;
      }

      // Generate stable unique template ID
      let id = tpl.id;
      let counter = 1;
      while (existingIds.has(id)) {
        id = `${tpl.id}-${counter++}`;
      }
      existingIds.add(id);

      // Generate WebP preview if preview file exists
      let previewRelativePath = null;
      if (tpl.previewFile && tpl.previewFile.fullPath && fs.existsSync(tpl.previewFile.fullPath)) {
        const previewFileName = `${id}.webp`;
        const previewDestPath = path.join(previewsDir, previewFileName);

        if (!fs.existsSync(previewDestPath) && !dryRun) {
          try {
            await sharp(tpl.previewFile.fullPath)
              .resize({ width: 600, height: 800, fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 85 })
              .toFile(previewDestPath);
            previewsGenerated++;
          } catch (err) {
            console.warn(`[index-bundles] Falha ao gerar preview para ${tpl.name}:`, err.message);
          }
        }
        previewRelativePath = `previews/${previewFileName}`;
      }

      const itemRecord = {
        id,
        kind: 'template',
        name: tpl.name,
        category: tpl.category,
        tags: ['jit', 'bundle', 'arquivos-confidenciais', ...slug(tpl.category).split('-')],
        status: 'pending',
        file: `psds/${tpl.psdPath}`,
        preview: previewRelativePath,
        source: 'arquivos-confidenciais',
        sourceName: 'Arquivos Confidenciais',
        bundle: bundle.id,
        bundleName: bundle.name,
        fields: [],
        layers: 0,
      };

      existingItems.push(itemRecord);
      addedCount++;
    }
  }

  console.log(`[index-bundles] Novos modelos adicionados: ${addedCount}`);
  console.log(`[index-bundles] Modelos mantidos da conversão anterior: ${skippedCount}`);
  console.log(`[index-bundles] Novas prévias WebP geradas: ${previewsGenerated}`);

  if (!dryRun) {
    libraryData.items = existingItems;
    fs.writeFileSync(libFile, JSON.stringify(libraryData, null, 2), 'utf8');
    console.log(`[index-bundles] library.json atualizado com sucesso (${existingItems.length} itens no total).`);
  }

  return {
    totalItems: existingItems.length,
    addedCount,
    skippedCount,
    previewsGenerated,
  };
}

if (process.argv[1] && process.argv[1].endsWith('index-all-bundles.js')) {
  indexAllBundles().catch(err => {
    console.error('[index-bundles] Erro:', err);
    process.exit(1);
  });
}

