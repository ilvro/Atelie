import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { validateHandout } from '../../src/domain/handouts.js';
import { defaultDataDir } from '../../server/paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const colecaoDir = path.join(projectRoot, 'public/colecao');
const libraryPath = path.join(colecaoDir, 'library.json');
const modelosDir = path.join(colecaoDir, 'modelos');
const previewsDir = path.join(colecaoDir, 'previews');

export async function validateTemplateHandout(handout) {
  validateHandout(handout);

  if (!handout.fields || handout.fields.length === 0) {
    throw new Error('Modelo deve conter ao menos um campo marcado em "fields".');
  }

  for (const layer of handout.layers) {
    if (layer.kind === 'image') {
      if (layer.image?.src?.upload) {
        throw new Error(`Camada "${layer.name}" usa imagem enviada (upload), proibido na coleção.`);
      }
      if (layer.image?.src?.library && !layer.image.src.library.startsWith('casa-')) {
        throw new Error(`Camada "${layer.name}" usa item de biblioteca "${layer.image.src.library}" que não pertence à coleção da casa (casa-).`);
      }
    }

    if (layer.kind === 'text') {
      const fontLib = layer.text?.font?.library;
      if (fontLib && !fontLib.startsWith('casa-')) {
        throw new Error(`Camada de texto "${layer.name}" usa fonte "${fontLib}" que não pertence à coleção da casa.`);
      }
    }
  }
}

export async function saveTemplate({ handout, slug, category, backSlug = null, browser = null }) {
  await validateTemplateHandout(handout);
  await fs.mkdir(modelosDir, { recursive: true });
  await fs.mkdir(previewsDir, { recursive: true });

  const templateId = `casa-tpl-${slug}`;
  const modelFile = `modelos/${slug}.json`;
  const previewFile = `previews/${templateId}.webp`;

  const cleanHandout = structuredClone(handout);
  cleanHandout.id = templateId;
  cleanHandout.revision = 0;
  cleanHandout.source = { kind: 'blank' };
  if (backSlug) {
    cleanHandout.back = { handoutId: `casa-tpl-${backSlug}` };
  } else {
    cleanHandout.back = null;
  }

  await fs.writeFile(path.join(colecaoDir, modelFile), JSON.stringify(cleanHandout, null, 2), 'utf8');

  // Update library.json
  const rawLib = await fs.readFile(libraryPath, 'utf8');
  const lib = JSON.parse(rawLib);
  const existingIdx = lib.items.findIndex(i => i.id === templateId);

  const templateItem = {
    id: templateId,
    kind: 'template',
    name: cleanHandout.name,
    category,
    license: 'CC0-1.0',
    file: modelFile,
    preview: previewFile,
    fields: cleanHandout.fields.map(f => f.label),
    ...(backSlug ? { backTemplate: `casa-tpl-${backSlug}` } : {}),
  };

  if (existingIdx >= 0) {
    lib.items[existingIdx] = templateItem;
  } else {
    lib.items.push(templateItem);
  }

  await fs.writeFile(libraryPath, JSON.stringify(lib, null, 2), 'utf8');

  // Preview generation via Playwright + window.__atelie.renderHandout
  let ownBrowser = false;
  let ownServer = false;
  let server = null;
  let b = browser;

  try {
    const { createApp } = await import('../../server/app.js');
    const app = await createApp();
    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    ownServer = true;
    const port = server.address().port;

    if (!b) {
      ownBrowser = true;
      b = await chromium.launch({
        executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
        headless: true,
        args: ['--no-sandbox'],
      });
    }

    const page = await b.newPage({ viewport: { width: 1400, height: 1000 } });
    await page.goto(`http://127.0.0.1:${port}/?diagnostics`);
    await page.waitForFunction(() => !!window.__atelie && typeof window.__atelie.renderHandout === 'function');

    const maxDim = Math.max(cleanHandout.page.width, cleanHandout.page.height);
    const scale = 480 / maxDim;

    const dataUrl = await page.evaluate(
      async ({ doc, s }) => {
        const res = await window.__atelie.renderHandout(doc, { scale: s, light: 'normal' });
        return res.canvas.toDataURL('image/png');
      },
      { doc: cleanHandout, s: scale }
    );

    const pngBuf = Buffer.from(dataUrl.split(',')[1], 'base64');
    await sharp(pngBuf).webp({ quality: 85 }).toFile(path.join(colecaoDir, previewFile));
    await page.close();
  } catch (err) {
    console.warn(`[colecao:modelo] Aviso ao renderizar prévia via browser (${err.message}). Usando fallback.`);
    const maxDim = Math.max(cleanHandout.page.width, cleanHandout.page.height);
    const scale = 480 / maxDim;
    const targetW = Math.round(cleanHandout.page.width * scale);
    const targetH = Math.round(cleanHandout.page.height * scale);
    const previewWebpPath = path.join(colecaoDir, previewFile);

    const bg = cleanHandout.page.background || '#f4f1ea';
    const paperLayer = cleanHandout.layers.find(l => l.kind === 'image' && l.image?.src?.library?.includes('paper'));
    let baseSharp;
    if (paperLayer) {
      const paperItem = lib.items.find(i => i.id === paperLayer.image.src.library);
      if (paperItem && paperItem.file) {
        baseSharp = sharp(path.join(colecaoDir, paperItem.file)).resize(targetW, targetH, { fit: 'cover' });
      }
    }
    if (!baseSharp) {
      baseSharp = sharp({
        create: {
          width: targetW,
          height: targetH,
          channels: 4,
          background: bg,
        },
      });
    }

    const titleSvg = Buffer.from(`
      <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="12" width="${targetW - 24}" height="28" fill="#1f1d2b" rx="3" opacity="0.85" />
        <text x="${targetW / 2}" y="31" fill="#f4f1ea" font-family="monospace" font-size="13" font-weight="bold" text-anchor="middle">
          ${cleanHandout.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}
        </text>
      </svg>
    `);

    const finalBuf = await baseSharp
      .composite([{ input: titleSvg, blend: 'over' }])
      .webp({ quality: 80 })
      .toBuffer();

    await fs.writeFile(previewWebpPath, finalBuf);
  } finally {
    if (ownBrowser && b) {
      await b.close();
    }
    if (ownServer && server) {
      await new Promise(resolve => server.close(resolve));
    }
  }

  return templateItem;
}

// CLI handler
async function main() {
  const args = process.argv.slice(2);
  let handoutId = null;
  let slug = null;
  let category = null;
  let backSlug = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--handout') handoutId = args[++i];
    else if (args[i] === '--slug') slug = args[++i];
    else if (args[i] === '--category') category = args[++i];
    else if (args[i] === '--back') backSlug = args[++i];
  }

  if (!handoutId || !slug || !category) {
    console.error('Uso: node scripts/colecao/model.js --handout <id> --slug <slug> --category "<categoria>" [--back <verso-slug>]');
    process.exit(1);
  }

  const dataDir = defaultDataDir();
  const filePath = path.join(dataDir, 'handouts', `${handoutId}.json`);
  const raw = await fs.readFile(filePath, 'utf8');
  const handout = JSON.parse(raw);

  const result = await saveTemplate({ handout, slug, category, backSlug });
  console.log(`[colecao:modelo] Modelo "${result.name}" gravado com sucesso em: ${result.file}`);
}

if (process.argv[1] && process.argv[1].endsWith('model.js')) {
  main().catch(err => {
    console.error('[colecao:modelo] Erro:', err.message);
    process.exit(1);
  });
}
