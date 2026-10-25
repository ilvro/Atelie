import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../server/app.js';
import { projectDir } from '../server/paths.js';

async function main() {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-lib-capture-'));
  const distDir = path.join(projectDir, 'dist');
  const app = await createApp({ dataDir, distDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

    // Open editor
    await page.goto(`${baseUrl}/?diagnostics`);
    await page.waitForFunction(() => !!window.__atelie?.editor?.state);

    // Setup an evocative document being assembled on stage
    await page.evaluate(() => {
      const doc = {
        id: 'doc-caso-arkham-1926',
        name: 'Dossiê Arkham — Ocorrência nº 104',
        page: { width: 1240, height: 1754, preset: 'a4', background: '#ece4d0' },
        layers: [
          {
            id: 'l-paper-base',
            kind: 'image',
            name: 'Ofício Creme · Usado',
            x: 0, y: 0, width: 1240, height: 1754, rotation: 0, opacity: 1, blend: 'normal', locked: true, visible: true, light: 'normal',
            image: { src: { library: 'casa-paper-oficio-creme-usado' }, fit: 'cover' },
          },
          {
            id: 'l-title',
            kind: 'text',
            name: 'Cabeçalho Policial',
            x: 140, y: 160, width: 960, height: 80, rotation: 0, opacity: 1, blend: 'normal', locked: false, visible: true, light: 'normal',
            text: {
              content: 'DEPARTAMENTO DE POLÍCIA DE ARKHAM\nDIVISÃO DE INVESTIGAÇÕES ESPECIAIS',
              font: { family: 'Courier Prime', library: 'casa-font-courierprime-bold', weight: 700, italic: false },
              size: 26,
              color: '#1a1820',
              align: 'center',
              valign: 'top',
              lineHeight: 1.25,
              letterSpacing: 20,
              box: 'area',
              fit: 'overflow',
              ink: { style: 'typewriter', wear: 0.15, seed: 104 },
            },
          },
          {
            id: 'l-body',
            kind: 'text',
            name: 'Relato Datilografado',
            x: 140, y: 320, width: 960, height: 500, rotation: 0, opacity: 1, blend: 'normal', locked: false, visible: true, light: 'normal',
            text: {
              content: 'Às 23:45 da noite de ontem, a patrulha avistou movimento suspeito nos arredores do antigo sanatório. Portas dos fundos arrombadas e marcas de fuligem no assoalho.\n\nNenhuma testemunha quis se pronunciar voluntariamente. O Dr. Finch afirma que os arquivos da ala sul foram revirados.',
              font: { family: 'Courier Prime', library: 'casa-font-courierprime-regular', weight: 400, italic: false },
              size: 22,
              color: '#1a1820',
              align: 'left',
              valign: 'top',
              lineHeight: 1.45,
              letterSpacing: 0,
              box: 'area',
              fit: 'overflow',
              ink: { style: 'typewriter', wear: 0.1, seed: 42 },
            },
          },
          {
            id: 'l-stamp-conf',
            kind: 'image',
            name: 'Carimbo CONFIDENCIAL',
            x: 720, y: 180, width: 340, height: 130, rotation: -12, opacity: 0.9, blend: 'multiply', locked: false, visible: true, light: 'normal',
            image: { src: { library: 'casa-vector-stamp-confidencial' }, fit: 'contain', tint: { color: '#a3202a', mode: 'multiply' } },
          },
          {
            id: 'l-coffee-stain',
            kind: 'image',
            name: 'Mancha de Café Dupla',
            x: 680, y: 640, width: 440, height: 440, rotation: 18, opacity: 0.85, blend: 'multiply', locked: false, visible: true, light: 'normal',
            image: { src: { library: 'casa-overlay-stain-coffee-01' }, fit: 'contain' },
          },
        ],
        fields: [],
      };

      window.__atelie.editor.state.edit(doc);
    });

    await page.waitForTimeout(400);

    // Open library drawer
    await page.click('.rail-btn[data-action="library"]');
    await page.waitForSelector('.library-drawer-inner', { state: 'visible' });

    // Give time for images/cards to settle
    await page.waitForTimeout(600);

    const outPath = path.join(projectDir, 'docs/referencias/atelie-biblioteca.png');
    await page.screenshot({ path: outPath });
    console.log(`[capture-biblioteca] Captura salva em: ${outPath}`);
  } finally {
    await browser.close();
    await new Promise(r => server.close(r));
    await rm(dataDir, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error('[capture-biblioteca] Erro:', err);
  process.exit(1);
});

