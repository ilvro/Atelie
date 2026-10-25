import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const colecaoDir = path.join(projectRoot, 'public/colecao');
const libraryPath = path.join(colecaoDir, 'library.json');
const outPath = path.join(projectRoot, 'docs/referencias/colecao-fontes.png');

const CATEGORIES = [
  {
    name: 'Máquina de escrever',
    sample: 'RELATÓRIO CONFIDENCIAL Nº 104 — O suspeito foi avistado em Arkham às 23:45.',
  },
  {
    name: 'Letra à mão',
    sample: 'Não confie nas sombras do corredor; encontre-me na biblioteca antes do amanhecer.',
  },
  {
    name: 'Marcador',
    sample: 'URGENTE: EVACUAR O PERÍMETRO IMEDIATAMENTE! CÓDIGO VERMELHO!',
  },
  {
    name: 'Impressão antiga',
    sample: 'Anno Domini MDCXCII — Tractatus de rebus arcanis ac libris prohibitis.',
  },
  {
    name: 'Jornal e cartaz',
    sample: 'THE DAILY CHRONICLE · EXTRAORDINARY DISCOVERY IN THE ANCIENT EXPEDITION',
  },
  {
    name: 'Gótica',
    sample: 'In Nomine Antiquorum · Custodes Portae et Mysterium Magnum',
  },
  {
    name: 'Estêncil e militar',
    sample: 'TOP SECRET // RESTRICTED ACCESS // SECTOR 7 CLASSIFIED CARGO',
  },
  {
    name: 'Tela de computador',
    sample: 'SYSTEM READY > LOAD "ARCHIVE.DAT",8,1 : INITIATING BUFFER TRANSFER... [OK]',
  },
];

async function main() {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const rawLib = await fs.readFile(libraryPath, 'utf-8');
  const lib = JSON.parse(rawLib);
  const fontItems = lib.items.filter(i => i.kind === 'font');

  // Select one representative file per family (regular preferred)
  const familyMap = new Map();
  for (const item of fontItems) {
    if (!familyMap.has(item.family)) {
      familyMap.set(item.family, item);
    } else {
      const existing = familyMap.get(item.family);
      if (item.file.includes('Regular') || item.file.includes('rm28P') || (!item.file.includes('Bold') && !item.file.includes('Italic'))) {
        familyMap.set(item.family, item);
      }
    }
  }

  // Build @font-face rules
  const fontFaceRules = [];
  for (const [family, item] of familyMap.entries()) {
    const filePath = path.join(colecaoDir, item.file);
    const buf = await fs.readFile(filePath);
    const b64 = buf.toString('base64');
    fontFaceRules.push(`
      @font-face {
        font-family: '${family}';
        src: url('data:font/ttf;base64,${b64}') format('truetype');
        font-display: block;
      }
    `);
  }

  // Generate sections
  let sectionsHTML = '';
  for (const cat of CATEGORIES) {
    const families = Array.from(familyMap.values()).filter(f => f.category === cat.name);
    if (families.length === 0) continue;

    sectionsHTML += `
      <section class="category-section">
        <h2 class="category-title">${cat.name}</h2>
        <div class="category-fonts">
    `;

    for (const f of families) {
      sectionsHTML += `
        <div class="font-row">
          <div class="font-meta">
            <span class="font-family-name">${f.family}</span>
            <span class="font-license-badge">${f.license}</span>
          </div>
          <div class="font-specimen-text" style="font-family: '${f.family}', sans-serif;">
            ${cat.sample}
          </div>
        </div>
      `;
    }

    sectionsHTML += `
        </div>
      </section>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Coleção de Fontes — Ateliê de Documentos</title>
      <style>
        ${fontFaceRules.join('\n')}

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #14121a;
          color: #f0e6d2;
          font-family: system-ui, -apple-system, sans-serif;
          padding: 40px;
          display: flex;
          justify-content: center;
        }

        .sheet {
          width: 1200px;
          background: #fbf7ee;
          color: #1a1820;
          padding: 56px 64px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.5);
          border-radius: 4px;
        }

        .header {
          border-bottom: 2px solid #2d261e;
          padding-bottom: 24px;
          margin-bottom: 32px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .header-title h1 {
          font-size: 32px;
          letter-spacing: -0.5px;
          font-weight: 800;
          color: #1c1917;
          margin-bottom: 6px;
        }

        .header-title p {
          font-size: 15px;
          color: #635749;
        }

        .header-badge {
          background: #2d261e;
          color: #f7eedb;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 6px 14px;
          border-radius: 3px;
        }

        .category-section {
          margin-bottom: 28px;
          break-inside: avoid;
        }

        .category-title {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 800;
          color: #8c4227;
          border-bottom: 1px solid #e2d7c5;
          padding-bottom: 6px;
          margin-bottom: 14px;
        }

        .category-fonts {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .font-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px 12px;
          background: rgba(235, 226, 210, 0.4);
          border-radius: 4px;
          border-left: 3px solid #b59f80;
        }

        .font-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .font-family-name {
          font-size: 12px;
          font-weight: 700;
          color: #55493d;
          letter-spacing: 0.5px;
        }

        .font-license-badge {
          font-size: 10px;
          font-weight: 600;
          color: #7a6e60;
          background: #e5dac9;
          padding: 2px 6px;
          border-radius: 2px;
        }

        .font-specimen-text {
          font-size: 20px;
          line-height: 1.35;
          color: #181512;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px dashed #d1c4b0;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #827566;
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <header class="header">
          <div class="header-title">
            <h1>Ateliê de Documentos · Coleção da Casa</h1>
            <p>Amostrário tipográfico das 26 famílias de fontes livres (OFL e Apache 2.0)</p>
          </div>
          <div class="header-badge">26 Famílias · 8 Categorias</div>
        </header>

        ${sectionsHTML}

        <footer class="footer">
          <span>Acervo da Casa Ateliê · Google Fonts commit e7db6ca603fd4862010383ff17ffd6cc4ffac1c0</span>
          <span>public/colecao/fontes/</span>
        </footer>
      </div>
    </body>
    </html>
  `;

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1300, height: 2600 } });
    await page.setContent(html, { waitUntil: 'networkidle' });
    // Wait a brief moment to ensure all base64 fonts are parsed and ready
    await page.evaluate(() => document.fonts.ready);

    const sheet = page.locator('.sheet');
    await sheet.screenshot({ path: outPath });
    console.log(`[font-specimen] Specimen gerado em: ${outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('[font-specimen] Erro:', err);
  process.exit(1);
});

