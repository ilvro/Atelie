import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createApp } from '../../server/app.js';
import { validateTemplateHandout } from './model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const colecaoDir = path.join(projectRoot, 'public/colecao');
const libraryPath = path.join(colecaoDir, 'library.json');
const modelosDir = path.join(colecaoDir, 'modelos');
const previewsDir = path.join(colecaoDir, 'previews');
const refDir = path.join(projectRoot, 'docs/referencias');

import { TEMPLATES, CATEGORIES } from './modelos/index.js';
import { CONJUNTOS } from './modelos/conjuntos.js';
import { INSTITUICOES } from './universo.js';
import { META } from './modelos/meta.js';

export { TEMPLATES };


function normalizeHex(c) {
  if (typeof c !== 'string') return c;
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  }
  return c;
}

export function buildHandoutFromSpec(spec) {
  const templateId = `casa-tpl-${spec.slug}`;
  let layerCounter = 1;

  const layers = spec.layers.map(layerSpec => {
    const layerId = layerSpec.id || `l-${layerCounter++}-${spec.slug}`;
    const base = {
      id: layerId,
      name: layerSpec.name || 'Camada',
      kind: layerSpec.kind,
      visible: layerSpec.visible !== false,
      locked: false,
      opacity: layerSpec.opacity ?? 1,
      blend: layerSpec.blend || 'normal',
      x: layerSpec.x ?? 0,
      y: layerSpec.y ?? 0,
      width: Math.max(1, layerSpec.width ?? spec.page.width),
      height: Math.max(1, layerSpec.height ?? spec.page.height),
      rotation: layerSpec.rotation ?? 0,
      clip: layerSpec.clip === true,
      light: layerSpec.light || 'both',
    };

    if (layerSpec.kind === 'image') {
      let tint = null;
      if (layerSpec.tint) {
        if (typeof layerSpec.tint === 'string') {
          tint = { color: normalizeHex(layerSpec.tint), amount: 1 };
        } else if (typeof layerSpec.tint === 'object') {
          tint = { color: normalizeHex(layerSpec.tint.color), amount: layerSpec.tint.amount ?? 1 };
        }
      }

      base.image = {
        src: layerSpec.image?.src ?? null,
        fit: layerSpec.image?.fit ?? 'stretch',
        crop: null,
        flipX: false,
        flipY: false,
        filter: {
          grayscale: 0,
          sepia: 0,
          brightness: 0,
          contrast: 0,
          saturation: 0,
          hue: 0,
          blur: 0,
          invert: false,
          ...(layerSpec.image?.filter || {}),
        },
        tint,
      };
    } else if (layerSpec.kind === 'text') {
      base.text = {
        content: layerSpec.text?.content ?? '',
        font: {
          family: layerSpec.text?.font?.family ?? 'Courier Prime',
          library: layerSpec.text?.font?.library ?? null,
          weight: layerSpec.text?.font?.weight ?? 400,
          italic: layerSpec.text?.font?.italic ?? false,
        },
        size: layerSpec.text?.size ?? 24,
        color: normalizeHex(layerSpec.text?.color ?? '#111111'),
        align: layerSpec.text?.align ?? 'left',
        valign: 'top',
        lineHeight: layerSpec.text?.lineHeight ?? 1.25,
        letterSpacing: layerSpec.text?.letterSpacing ?? 0,
        box: 'area',
        fit: 'overflow',
        ink: {
          style: layerSpec.text?.ink?.style ?? 'clean',
          wear: layerSpec.text?.ink?.wear ?? 0,
          seed: layerSpec.text?.ink?.seed ?? 1,
        },
      };
    } else if (layerSpec.kind === 'shape') {
      base.shape = {
        type: layerSpec.shape?.type ?? 'rect',
        fill: layerSpec.shape?.fill ? normalizeHex(layerSpec.shape.fill) : null,
        stroke: layerSpec.shape?.stroke ? normalizeHex(layerSpec.shape.stroke) : null,
        strokeWidth: layerSpec.shape?.strokeWidth ?? 1,
        radius: layerSpec.shape?.radius ?? 0,
        dash: layerSpec.shape?.dash ?? [],
        ...(layerSpec.shape?.type === 'path' ? { points: layerSpec.shape.points } : {}),
      };
    } else if (layerSpec.kind === 'effect') {
      base.effect = {
        type: layerSpec.effect?.type ?? 'grain',
        seed: layerSpec.effect?.seed ?? 1,
        amount: layerSpec.effect?.amount ?? 0.5,
        params: layerSpec.effect?.params ?? {},
      };
      if (layerSpec.effect?.type === 'cut') {
        const { edge, remove, holes, char, fiber } = layerSpec.effect;
        Object.assign(base.effect, { edge, remove: remove ?? [], holes: holes ?? [], char: char ?? 0.5, fiber: fiber ?? 0.5 });
      }
    }

    return base;
  });

  const fields = (spec.fields || []).map(f => {
    const targetLayer = layers.find(l => l.id === f.layerId || l.name === f.layerId || l.name === f.label);
    return {
      layerId: targetLayer ? targetLayer.id : f.layerId,
      label: f.label,
    };
  });

  return {
    schema: 1,
    id: templateId,
    revision: 0,
    name: spec.name,
    category: spec.category,
    tags: [spec.category.toLowerCase()],
    folder: null,
    favorite: false,
    guides: { x: [], y: [] },
    page: {
      width: spec.page.width,
      height: spec.page.height,
      background: normalizeHex(spec.page.background || '#ffffff'),
    },
    layers,
    fields,
    source: { kind: 'blank' },
    back: null,
  };
}

async function renderContactSheet(items, outPath) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const cols = 6;
  const rows = Math.ceil(items.length / cols);
  const thumbW = 200;
  const thumbH = 260;
  const cellPad = 12;
  const labelH = 46;

  const cellW = thumbW + cellPad * 2;
  const cellTotalH = thumbH + labelH + cellPad * 2;
  const sheetW = cols * cellW;
  const sheetH = rows * cellTotalH;

  const composites = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cellLeft = col * cellW + cellPad;
    const cellTop = row * cellTotalH + cellPad;

    const previewPath = path.join(colecaoDir, item.preview);

    try {
      const thumbBuf = await sharp(previewPath)
        .resize(thumbW, thumbH, { fit: 'contain', background: '#221f2d' })
        .png()
        .toBuffer();

      composites.push({
        input: thumbBuf,
        left: cellLeft,
        top: cellTop,
      });

      const cleanName = item.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const cleanCat = (item.category || '').replace(/&/g, '&amp;');
      const labelSvg = Buffer.from(`
        <svg width="${thumbW}" height="${labelH}">
          <rect width="100%" height="100%" fill="#1a1824" rx="4" />
          <text x="${thumbW / 2}" y="18" fill="#e8e4dc" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">${cleanName}</text>
          <text x="${thumbW / 2}" y="34" fill="#a49eb2" font-family="sans-serif" font-size="10" text-anchor="middle">${cleanCat}</text>
        </svg>
      `);

      composites.push({
        input: labelSvg,
        left: cellLeft,
        top: cellTop + thumbH + 4,
      });
    } catch (err) {
      console.warn(`[contact-sheet] Erro ao carregar prévia de ${item.id}:`, err.message);
    }
  }

  await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: '#13111a',
    },
  })
    .composite(composites)
    .png()
    .toFile(outPath);

  console.log(`[contact-sheet] Folha de contato gerada em ${outPath} (${sheetW}x${sheetH} px)`);
}

function metaOf(spec) {
  const base = spec.meta || META[spec.slug];
  if (!base) throw new Error(`Modelo sem metadados em modelos/meta.js: ${spec.slug}`);
  return {
    era: base.era, tom: base.tom, tags: base.tags || [],
    ...(base.org ? { org: base.org, orgNome: INSTITUICOES[base.org]?.nome } : {}),
    ...(base.addedIn ? { addedIn: base.addedIn } : {}),
    ...(spec.family ? { family: spec.family } : {}),
  };
}

/** O texto de exemplo dos campos (para a busca da gaveta Modelos). */
function textoDosCampos(handout) {
  const partes = [];
  for (const f of handout.fields || []) {
    const layer = handout.layers.find(l => l.id === f.layerId);
    if (layer?.text?.content) partes.push(layer.text.content.replace(/\s+/g, ' ').trim());
  }
  return partes.join(' · ').slice(0, 500);
}

export async function generateAllTemplates() {
  console.log(`[colecao:modelos] Iniciando geração de ${TEMPLATES.length} modelos da coleção...`);

  await fs.mkdir(modelosDir, { recursive: true });
  await fs.mkdir(previewsDir, { recursive: true });

  const rawLib = await fs.readFile(libraryPath, 'utf8');
  const lib = JSON.parse(rawLib);

  const templateItems = [];
  const handoutsToRender = [];

  for (const spec of TEMPLATES) {
    const handout = buildHandoutFromSpec(spec);

    // Validate
    await validateTemplateHandout(handout);

    const modelFile = `modelos/${spec.slug}.json`;
    const previewFile = `previews/${handout.id}.webp`;

    await fs.writeFile(path.join(colecaoDir, modelFile), JSON.stringify(handout, null, 2), 'utf8');

    const item = {
      id: handout.id,
      kind: 'template',
      name: handout.name,
      category: spec.category,
      license: 'CC0-1.0',
      file: modelFile,
      preview: previewFile,
      fields: handout.fields.map(f => f.label),
      texto: textoDosCampos(handout),
      ...metaOf(spec),
      ...(spec.backTemplate ? { backTemplate: spec.backTemplate } : {}),
    };

    templateItems.push(item);
    handoutsToRender.push({ handout, previewFile });

    const existingIdx = lib.items.findIndex(i => i.id === handout.id);
    if (existingIdx >= 0) {
      lib.items[existingIdx] = item;
    } else {
      lib.items.push(item);
    }
  }

  // Conjuntos: um card por conjunto, com a prévia do primeiro modelo
  const porSlug = new Map(templateItems.map(i => [i.id, i]));
  lib.items = lib.items.filter(i => i.kind !== 'set');
  for (const c of CONJUNTOS) {
    const ids = c.modelos.map(m => `casa-tpl-${m}`);
    for (const id of ids) if (!porSlug.has(id)) throw new Error(`Conjunto "${c.name}" cita modelo inexistente: ${id}`);
    lib.items.push({
      id: `casa-set-${c.slug}`, kind: 'set', name: c.name, category: 'Conjuntos', license: 'CC0-1.0',
      description: c.descricao, templates: ids, preview: porSlug.get(ids[0]).preview, era: c.era, tom: c.tom,
      org: c.org, orgNome: INSTITUICOES[c.org].nome, tags: c.tags, addedIn: '2026-10-27',
    });
  }

  await fs.writeFile(libraryPath, JSON.stringify(lib, null, 2), 'utf8');
  console.log(`[colecao:modelos] ${TEMPLATES.length} modelos salvos e registrados no library.json.`);

  // Render previews using express app + Playwright
  console.log('[colecao:modelos] Iniciando servidor e navegador para renderizar prévias...');
  const app = await createApp();
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const port = server.address().port;

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    await page.goto(`http://127.0.0.1:${port}/?diagnostics`);
    await page.waitForFunction(() => !!window.__atelie && typeof window.__atelie.renderHandout === 'function');

    for (let i = 0; i < handoutsToRender.length; i++) {
      const { handout, previewFile } = handoutsToRender[i];
      const previewWebpPath = path.join(colecaoDir, previewFile);

      const maxDim = Math.max(handout.page.width, handout.page.height);
      const scale = 480 / maxDim;

      const dataUrl = await page.evaluate(
        async ({ doc, s }) => {
          const res = await window.__atelie.renderHandout(doc, { scale: s, light: 'normal' });
          return res.canvas.toDataURL('image/png');
        },
        { doc: handout, s: scale }
      );

      const pngBuf = Buffer.from(dataUrl.split(',')[1], 'base64');
      await sharp(pngBuf).webp({ quality: 85 }).toFile(previewWebpPath);
      process.stdout.write(`\r[colecao:modelos] Renderizado ${i + 1}/${handoutsToRender.length}: ${handout.name}`);
    }
    console.log('\n[colecao:modelos] Todas as prévias foram renderizadas!');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }

  // Generate contact sheet
  console.log('[colecao:modelos] Gerando folha de contato colecao-modelos.png...');
  await renderContactSheet(templateItems, path.join(refDir, 'colecao-modelos.png'));

  for (const cat of CATEGORIES) {
    const items = templateItems.filter(i => i.category === cat.name);
    if (items.length) await renderContactSheet(items, path.join(refDir, `colecao-modelos-${cat.slug}.png`));
  }

  console.log('[colecao:modelos] Concluído com sucesso!');
}

if (process.argv[1] && process.argv[1].endsWith('templates.js')) {
  generateAllTemplates().catch(err => {
    console.error('[colecao:modelos] Erro fatal:', err);
    process.exit(1);
  });
}
