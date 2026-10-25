import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRecipes, generatePaper } from './papers.js';
import { OVERLAYS, generateOverlay } from './overlays.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const colecaoDir = path.join(projectRoot, 'public/colecao');
const papeisDir = path.join(colecaoDir, 'papeis');
const texturasDir = path.join(colecaoDir, 'texturas');
const previewsDir = path.join(colecaoDir, 'previews');
const manifestPath = path.join(colecaoDir, 'library.json');

async function main() {
  console.log('[colecao] Iniciando geração da coleção da casa...');
  const startTime = Date.now();

  await fs.mkdir(papeisDir, { recursive: true });
  await fs.mkdir(texturasDir, { recursive: true });
  await fs.mkdir(previewsDir, { recursive: true });

  const recipes = await loadRecipes();
  const ages = ['novo', 'usado', 'antigo'];
  const newItems = [];

  // 1. Generate Papers (16 papers x 3 ages = 48 papers)
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

      newItems.push({
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

  // 2. Generate Overlays (53 overlays)
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

    newItems.push({
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

  // 3. Update library.json manifest preserving other items
  let existingManifest = { schema: 1, generatedAt: null, items: [] };
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    existingManifest = JSON.parse(raw);
  } catch {}

  const currentCategories = new Set(['Papéis', 'Manchas', 'Água', 'Sangue', 'Sujeira', 'Queimado', 'Amassados', 'Dobras', 'Digitais', 'Rasgos']);
  const otherItems = (existingManifest.items || []).filter(item => !currentCategories.has(item.category));
  const finalItems = [...newItems, ...otherItems];

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

