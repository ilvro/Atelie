import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { loadRecipes, generatePaper } from './papers.js';
import { OVERLAYS, generateOverlay } from './overlays.js';
import { readFontNames } from '../lib/font-names.js';

// Vector element modules
import * as stamps from './vectors/stamps.js';
import * as seals from './vectors/seals.js';
import * as fasteners from './vectors/fasteners.js';
import * as tape from './vectors/tape.js';
import * as labels from './vectors/labels.js';
import * as waxSeals from './vectors/wax-seals.js';
import * as frames from './vectors/frames.js';
import * as ornaments from './vectors/ornaments.js';
import * as emblems from './vectors/emblems.js';
import * as symbols from './vectors/symbols.js';
import * as marks from './vectors/marks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const colecaoDir = path.join(projectRoot, 'public/colecao');
const papeisDir = path.join(colecaoDir, 'papeis');
const texturasDir = path.join(colecaoDir, 'texturas');
const elementosDir = path.join(colecaoDir, 'elementos');
const fontesDir = path.join(colecaoDir, 'fontes');
const previewsDir = path.join(colecaoDir, 'previews');
const manifestPath = path.join(colecaoDir, 'library.json');
const fontsJsonPath = path.join(projectRoot, 'scripts/fonts/fonts.json');

const VECTOR_MODULES = [
  stamps,
  seals,
  fasteners,
  tape,
  labels,
  waxSeals,
  frames,
  ornaments,
  emblems,
  symbols,
  marks,
];

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getDimensions(item) {
  if (item.width && item.height) return { width: item.width, height: item.height };
  const vbMatch = item.svg.match(/viewBox="[0-9.-]+\s+[0-9.-]+\s+([0-9.]+)\s+([0-9.]+)"/);
  if (vbMatch) {
    return { width: Math.round(parseFloat(vbMatch[1])), height: Math.round(parseFloat(vbMatch[2])) };
  }
  return { width: 300, height: 300 };
}

async function main() {
  const args = process.argv.slice(2);
  const onlyElements = args.includes('--elements');
  const onlyPapers = args.includes('--papers');
  const onlyOverlays = args.includes('--overlays');
  const onlyFonts = args.includes('--fonts');
  const doAll = !onlyElements && !onlyPapers && !onlyOverlays && !onlyFonts;

  console.log('[colecao] Iniciando construção da coleção da casa...');
  const startTime = Date.now();

  await fs.mkdir(papeisDir, { recursive: true });
  await fs.mkdir(texturasDir, { recursive: true });
  await fs.mkdir(elementosDir, { recursive: true });
  await fs.mkdir(previewsDir, { recursive: true });

  const generatedItems = [];
  const generatedCategories = new Set();
  const generatedKinds = new Set();

  // 1. Generate Papers (16 papers x 3 ages = 48 papers)
  if (doAll || onlyPapers) {
    generatedCategories.add('Papéis');
    const recipes = await loadRecipes();
    const ages = ['novo', 'usado', 'antigo'];
    console.log(`[colecao] Gerando ${recipes.length * ages.length} papéis (48 arquivos)...`);

    for (const recipe of recipes) {
      for (const age of ages) {
        const id = `casa-papel-${recipe.slug}-${age}`;
        const ageLabel = age.charAt(0).toUpperCase() + age.slice(1);
        const name = `${recipe.name} (${ageLabel})`;
        const fileName = `${recipe.slug}-${age}.webp`;
        const filePath = path.join(papeisDir, fileName);
        const previewFileName = `${id}.webp`;
        const previewPath = path.join(previewsDir, previewFileName);

        process.stdout.write(`  -> Gerando ${id}... `);
        const raster = generatePaper(recipe, age);
        await raster.saveWebP(filePath, { quality: 80 });
        await raster.savePreview(previewPath, { maxSize: 320, quality: 76 });
        console.log('✓');

        generatedItems.push({
          id,
          kind: 'element',
          name,
          category: 'Papéis',
          tags: [...recipe.tags, age],
          file: `papeis/${fileName}`,
          preview: `previews/${previewFileName}`,
          width: recipe.width,
          height: recipe.height,
          license: 'própria',
        });
      }
    }
  }

  // 2. Generate Overlays (53 overlays)
  if (doAll || onlyOverlays) {
    const overlayCats = ['Manchas', 'Água', 'Sangue', 'Sujeira', 'Queimado', 'Amassados', 'Dobras', 'Digitais', 'Rasgos'];
    for (const c of overlayCats) generatedCategories.add(c);

    console.log(`[colecao] Gerando ${OVERLAYS.length} texturas de sobreposição...`);
    for (const def of OVERLAYS) {
      const slug = def.id.replace('casa-', '');
      const fileName = `${slug}.webp`;
      const filePath = path.join(texturasDir, fileName);
      const previewFileName = `${def.id}.webp`;
      const previewPath = path.join(previewsDir, previewFileName);

      process.stdout.write(`  -> Gerando ${def.id}... `);
      const raster = generateOverlay(def);
      await raster.saveWebP(filePath, { quality: 80 });
      await raster.savePreview(previewPath, { maxSize: 320, quality: 76 });
      console.log('✓');

      generatedItems.push({
        id: def.id,
        kind: 'element',
        name: def.name,
        category: def.category,
        tags: def.tags,
        file: `texturas/${fileName}`,
        preview: `previews/${previewFileName}`,
        width: def.width,
        height: def.height,
        license: 'própria',
      });
    }
  }

  // 3. Generate Vector Elements (~140 SVG items)
  if (doAll || onlyElements) {
    const allVectors = [];
    for (const mod of VECTOR_MODULES) {
      const items = mod.items();
      for (const it of items) {
        allVectors.push(it);
        generatedCategories.add(it.category);
      }
    }

    console.log(`[colecao] Gerando ${allVectors.length} elementos vetoriais (SVG + prévia WebP)...`);
    for (const it of allVectors) {
      const svgFileName = `${it.id}.svg`;
      const svgPath = path.join(elementosDir, svgFileName);
      const previewFileName = `${it.id}.webp`;
      const previewPath = path.join(previewsDir, previewFileName);
      const dims = getDimensions(it);

      await fs.writeFile(svgPath, it.svg.trim(), 'utf8');

      await sharp(Buffer.from(it.svg))
        .resize({ width: 320, height: 320, fit: 'inside' })
        .webp({ quality: 80 })
        .toFile(previewPath);

      generatedItems.push({
        id: it.id,
        kind: 'element',
        name: it.name,
        category: it.category,
        tags: it.tags,
        file: `elementos/${svgFileName}`,
        preview: `previews/${previewFileName}`,
        width: dims.width,
        height: dims.height,
        license: 'própria',
      });
    }
    console.log(`[colecao] Concluídos ${allVectors.length} elementos vetoriais.`);
  }

  // 4. Process Fonts (26 font families)
  if (doAll || onlyFonts) {
    generatedKinds.add('font');
    console.log('[colecao] Indexando fontes livres da coleção da casa...');

    let fontMetaMap = new Map();
    try {
      const fontsConfig = JSON.parse(await fs.readFile(fontsJsonPath, 'utf8'));
      for (const f of fontsConfig) {
        if (f.use === 'colecao') {
          fontMetaMap.set(f.path, {
            family: f.family,
            category: f.category || 'Fontes',
            license: f.license === 'OFL.txt' ? 'OFL-1.1' : 'Apache-2.0',
          });
        }
      }
    } catch (err) {
      console.warn('[colecao] fonts.json não encontrado ou inválido:', err.message);
    }

    let fontFilesCount = 0;
    try {
      const entries = await fs.readdir(fontesDir, { recursive: true, withFileTypes: true });
      for (const ent of entries) {
        if (ent.isFile() && ent.name.endsWith('.ttf')) {
          const fullPath = path.join(ent.parentPath || ent.path, ent.name);
          const relPath = path.relative(colecaoDir, fullPath).replace(/\\/g, '/');
          const relDir = path.dirname(relPath).replace(/^fontes\//, '');
          const meta = fontMetaMap.get(relDir) || { family: '', category: 'Fontes', license: 'OFL-1.1' };

          const buf = await fs.readFile(fullPath);
          const fontInfo = readFontNames(buf);
          if (!fontInfo) {
            console.warn(`[colecao] Aviso: Não foi possível ler tabelas sfnt de ${relPath}`);
            continue;
          }

          const psSlug = slugify(fontInfo.postscript || path.basename(ent.name, '.ttf'));
          const id = `casa-font-${psSlug}`;
          const family = meta.family || fontInfo.family;

          generatedItems.push({
            id,
            kind: 'font',
            name: fontInfo.fullName,
            category: meta.category,
            family,
            postscript: fontInfo.postscript,
            weight: fontInfo.weight,
            style: fontInfo.italic ? 'italic' : 'normal',
            variable: fontInfo.variable ? fontInfo.variable : null,
            file: relPath,
            license: meta.license,
          });

          fontFilesCount++;
        }
      }
      console.log(`[colecao] Concluídas ${fontFilesCount} fontes.`);
    } catch (err) {
      console.warn('[colecao] Diretório de fontes não encontrado:', err.message);
    }
  }

  // 5. Update library.json manifest preserving items not regenerated in this run
  let existingManifest = { schema: 1, generatedAt: null, items: [] };
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    existingManifest = JSON.parse(raw);
  } catch {}

  const preservedItems = (existingManifest.items || []).filter(item => {
    if (generatedKinds.has(item.kind)) return false;
    if (generatedCategories.has(item.category)) return false;
    return true;
  });

  const finalItems = [...preservedItems, ...generatedItems];

  const manifest = {
    schema: 1,
    generatedAt: new Date().toISOString(),
    items: finalItems,
  };

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  // Compute folder size
  let totalBytes = 0;
  async function scanDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await scanDir(full);
      } else {
        const st = await fs.stat(full);
        totalBytes += st.size;
      }
    }
  }
  await scanDir(colecaoDir);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const sizeMb = (totalBytes / (1024 * 1024)).toFixed(2);
  console.log(`\n[colecao] Concluído em ${durationSec}s!`);
  console.log(`[colecao] Total de itens no manifesto: ${finalItems.length}`);
  console.log(`[colecao] Tamanho de public/colecao/: ${sizeMb} MB (orçamento máximo: 60 MB)`);
}

main().catch(err => {
  console.error('[colecao] Erro fatal:', err);
  process.exit(1);
});
