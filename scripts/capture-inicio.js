import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../server/app.js';
import { projectDir } from '../server/paths.js';

async function main() {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-inicio-capture-'));
  const distDir = path.join(projectDir, 'dist');
  const app = await createApp({ dataDir, distDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

    // -------------------------------------------------------------------------
    // Captura 1: atelie-inicio.png (primeira visita com bilhetes de introdução)
    // -------------------------------------------------------------------------
    console.log('[capture] Gerando atelie-inicio.png (primeira visita)...');
    await page.goto(`${baseUrl}/?diagnostics&start`);
    await page.waitForFunction(() => !!window.__atelie?.editor);
    await page.waitForSelector('.welcome-overlay', { state: 'visible' });
    await page.waitForSelector('.start-featured-row .start-featured-card', { state: 'visible' });
    await page.waitForTimeout(600);

    const outPath1 = path.join(projectDir, 'docs/referencias/atelie-inicio.png');
    await page.screenshot({ path: outPath1 });
    console.log(`[capture] Salvo em ${outPath1}`);

    // -------------------------------------------------------------------------
    // Captura 2: atelie-inicio-2.png (com documentos recentes na bancada)
    // -------------------------------------------------------------------------
    console.log('[capture] Gerando atelie-inicio-2.png (com recentes)...');

    // Fechar boas-vindas
    await page.evaluate(() => {
      localStorage.setItem('atelie-welcome', 'done');
      document.querySelector('.welcome-overlay')?.remove();
    });

    // Criar documentos válidos via editor.createHandout
    await page.evaluate(async () => {
      const api = window.__atelie.api;
      const editor = window.__atelie.editor;

      const doc1 = editor.createHandout({ preset: 'a4' });
      doc1.name = 'Dossiê Arkham — Ocorrência nº 104';

      const doc2 = editor.createHandout({ preset: 'letter' });
      doc2.name = 'Carta de Gustav a Lia';

      const doc3 = editor.createHandout({ preset: 'a4' });
      doc3.name = 'Certidão de Óbito de Jeremy Thorne';

      const doc4 = editor.createHandout({ preset: 'telegram' });
      doc4.name = 'Telegrama de Socorro da Embaixada';

      const docs = [doc1, doc2, doc3, doc4];
      for (const d of docs) {
        await api.handouts.create(d);
      }

      localStorage.setItem('atelie-recents', JSON.stringify(docs.map(d => d.id)));
      editor.showStartScreen();
    });

    await page.waitForSelector('.start-recents-row .start-recent-card', { state: 'visible' });
    await page.waitForTimeout(600);

    const outPath2 = path.join(projectDir, 'docs/referencias/atelie-inicio-2.png');
    await page.screenshot({ path: outPath2 });
    console.log(`[capture] Salvo em ${outPath2}`);

  } finally {
    await browser.close();
    server.close();
    await rm(dataDir, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error('[capture] Erro fatal:', err);
  process.exit(1);
});

