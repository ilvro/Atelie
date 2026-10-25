import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const colecaoDir = path.join(projectRoot, 'public/colecao');
const manifestPath = path.join(colecaoDir, 'library.json');
const refDir = path.join(projectRoot, 'docs/referencias');

async function createContactSheet({ items, outPath, cols = 6, thumbW = 180, thumbH = 250, cellPad = 12, labelH = 40, bgPaper = false }) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const rows = Math.ceil(items.length / cols);
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
      let thumbImg = sharp(previewPath).resize(thumbW, thumbH, { fit: 'contain', background: bgPaper ? '#e8dec8' : '#2a2634' });

      if (bgPaper) {
        const paperBg = await sharp({
          create: {
            width: thumbW,
            height: thumbH,
            channels: 4,
            background: '#e8dec8',
          },
        }).png().toBuffer();

        const overlayBuf = await thumbImg.png().toBuffer();
        thumbImg = sharp(paperBg).composite([{ input: overlayBuf, blend: 'over' }]);
      }

      const thumbBuf = await thumbImg.png().toBuffer();
      composites.push({
        input: thumbBuf,
        left: cellLeft,
        top: cellTop,
      });

      const cleanName = item.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const cleanCat = (item.category || '').replace(/&/g, '&amp;');
      const labelSvg = Buffer.from(`
        <svg width="${thumbW}" height="${labelH}">
          <rect width="100%" height="100%" fill="#1a1822" rx="4" />
          <text x="${thumbW / 2}" y="16" fill="#e2ded4" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">${cleanName}</text>
          <text x="${thumbW / 2}" y="30" fill="#9e99a8" font-family="sans-serif" font-size="9" text-anchor="middle">${cleanCat}</text>
        </svg>
      `);

      composites.push({
        input: labelSvg,
        left: cellLeft,
        top: cellTop + thumbH + 4,
      });
    } catch (err) {
      console.warn(`[contact-sheet] Erro ao carregar prévia ${item.id}:`, err.message);
    }
  }

  await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: '#121118',
    },
  })
    .composite(composites)
    .png()
    .toFile(outPath);

  console.log(`[contact-sheet] Gerada folha de contato em ${outPath} (${sheetW}x${sheetH} px)`);
}

async function createElementContactSheet({ items, outPath, cols = 10, thumbW = 160, thumbH = 160, cellPad = 8, labelH = 40 }) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const rows = Math.ceil(items.length / cols);
  const cellW = thumbW + cellPad * 2;
  const cellTotalH = thumbH + labelH + cellPad * 2;
  const sheetW = cols * cellW;
  const sheetH = rows * cellTotalH;

  // Load Ofício Creme Usado paper texture
  const paperPath = path.join(colecaoDir, 'papeis/oficio-creme-usado.webp');
  let paperBuffer = null;
  try {
    paperBuffer = await sharp(paperPath).resize(thumbW, thumbH, { fit: 'cover' }).toBuffer();
  } catch (err) {
    console.warn('[contact-sheet] Papel oficio-creme-usado não encontrado, usando cor sólida:', err.message);
  }

  const monoCategories = new Set(['Carimbos', 'Selos', 'Ornamentos', 'Emblemas', 'Símbolos', 'Marcas']);
  const composites = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cellLeft = col * cellW + cellPad;
    const cellTop = row * cellTotalH + cellPad;

    try {
      const svgPath = path.join(colecaoDir, item.file);
      let svgStr = await fs.readFile(svgPath, 'utf8');

      // Monochromatic items tinted with dark blue ink (#1b3566)
      const isMonochromatic =
        monoCategories.has(item.category) ||
        (item.category === 'Molduras' && !item.id.includes('polaroide') && !item.id.includes('foto-antiga'));

      if (isMonochromatic) {
        svgStr = svgStr
          .replace(/stroke="#000000"/g, 'stroke="#1b3566"')
          .replace(/stroke="#000"/g, 'stroke="#1b3566"')
          .replace(/fill="#000000"/g, 'fill="#1b3566"')
          .replace(/fill="#000"/g, 'fill="#1b3566"');
      }

      // Rasterize element inside thumb bounds
      const elemBuf = await sharp(Buffer.from(svgStr))
        .resize(thumbW - 16, thumbH - 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      // Background tile: paper or fallback cream
      let tilePipeline;
      if (paperBuffer) {
        tilePipeline = sharp(paperBuffer);
      } else {
        tilePipeline = sharp({
          create: { width: thumbW, height: thumbH, channels: 4, background: '#e8dec8' },
        });
      }

      const compositeTile = await tilePipeline
        .composite([{ input: elemBuf, gravity: 'center' }])
        .png()
        .toBuffer();

      composites.push({
        input: compositeTile,
        left: cellLeft,
        top: cellTop,
      });

      // Label below thumbnail
      const cleanName = item.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const cleanCat = (item.category || '').replace(/&/g, '&amp;');
      const labelSvg = Buffer.from(`
        <svg width="${thumbW}" height="${labelH}">
          <rect width="100%" height="100%" fill="#1a1822" rx="3" />
          <text x="${thumbW / 2}" y="15" fill="#e2ded4" font-family="sans-serif" font-size="9.5" font-weight="bold" text-anchor="middle">${cleanName}</text>
          <text x="${thumbW / 2}" y="29" fill="#9e99a8" font-family="sans-serif" font-size="8.5" text-anchor="middle">${cleanCat}</text>
        </svg>
      `);

      composites.push({
        input: labelSvg,
        left: cellLeft,
        top: cellTop + thumbH + 4,
      });
    } catch (err) {
      console.warn(`[contact-sheet] Erro no item vetorial ${item.id}:`, err.message);
    }
  }

  await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: '#100f16',
    },
  })
    .composite(composites)
    .png()
    .toFile(outPath);

  console.log(`[contact-sheet] Gerada folha de contato em ${outPath} (${sheetW}x${sheetH} px)`);
}

async function main() {
  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  const items = manifest.items || [];

  const textureCategories = new Set([
    'Manchas', 'Água', 'Sangue', 'Sujeira', 'Queimado', 'Amassados', 'Dobras', 'Digitais', 'Rasgos',
  ]);
  const vectorCategories = new Set([
    'Carimbos', 'Selos', 'Prendedores', 'Fitas', 'Etiquetas', 'Lacres', 'Molduras', 'Ornamentos', 'Emblemas', 'Símbolos', 'Marcas',
  ]);

  const papers = items.filter(it => it.category === 'Papéis');
  const textures = items.filter(it => textureCategories.has(it.category));
  const elements = items.filter(it => vectorCategories.has(it.category));

  console.log(`[contact-sheet] Gerando folhas de contato: ${papers.length} papéis, ${textures.length} texturas, ${elements.length} elementos...`);

  if (papers.length > 0) {
    await createContactSheet({
      items: papers,
      outPath: path.join(refDir, 'colecao-papeis.png'),
      cols: 6,
      thumbW: 180,
      thumbH: 254,
      bgPaper: false,
    });
  }

  if (textures.length > 0) {
    await createContactSheet({
      items: textures,
      outPath: path.join(refDir, 'colecao-texturas.png'),
      cols: 8,
      thumbW: 160,
      thumbH: 160,
      bgPaper: true,
    });
  }

  if (elements.length > 0) {
    await createElementContactSheet({
      items: elements,
      outPath: path.join(refDir, 'colecao-elementos.png'),
      cols: 10,
      thumbW: 160,
      thumbH: 160,
      cellPad: 8,
      labelH: 38,
    });
  }
}

main().catch(err => {
  console.error('[contact-sheet] Erro fatal:', err);
  process.exit(1);
});
