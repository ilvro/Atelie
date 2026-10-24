import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { createApp } from '../server/app.js';
import { projectDir } from '../server/paths.js';

const rootDir = projectDir;
const refDir = path.join(rootDir, 'docs/referencias');

async function capture() {
  await mkdir(refDir, { recursive: true });

  const distDir = path.join(rootDir, 'dist');
  const tempDir = path.join(rootDir, 'data/temp-capture');
  await mkdir(tempDir, { recursive: true });

  const app = await createApp({ dataDir: tempDir, distDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`Ateliê rodando em ${baseUrl} para captura de telas...`);

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

  try {
    await page.goto(baseUrl);
    await page.waitForFunction(() => !!window.__atelie);

    // 1. Casca vazia
    console.log('Capturando 1: casca vazia...');
    await page.screenshot({ path: path.join(refDir, 'atelie-casca-1.png') });

    // 2. Gaveta aberta (Documentos)
    console.log('Capturando 2: gaveta aberta...');
    await page.locator('.app-rail [data-action="documents"]').click();
    await page.waitForFunction(() => document.querySelector('#app-drawer')?.classList.contains('open'));
    await page.screenshot({ path: path.join(refDir, 'atelie-casca-2.png') });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#app-drawer')?.classList.contains('open'));

    // 3. Ctrl+K aberto
    console.log('Capturando 3: Ctrl+K aberto...');
    await page.keyboard.press('Control+k');
    await page.locator('#at-palette-modal').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(refDir, 'atelie-casca-3.png') });
    await page.keyboard.press('Escape');
    await page.locator('#at-palette-modal').waitFor({ state: 'detached' });

    // 4. Um aviso
    console.log('Capturando 4: um aviso...');
    await page.evaluate(() => {
      window.__atelie.notify('Documento arquivado com segurança na bancada.', { tone: 'ok' });
    });
    await page.locator('.notify-item').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(refDir, 'atelie-casca-4.png') });

    // 5. Um menu de contexto
    console.log('Capturando 5: menu de contexto...');
    await page.locator('#at-desk').click({ button: 'right', position: { x: 500, y: 400 } });
    await page.locator('.at-context-menu').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(refDir, 'atelie-casca-5.png') });
    await page.keyboard.press('Escape');
    await page.locator('.at-context-menu').waitFor({ state: 'detached' });

    // 6. Ajustes
    console.log('Capturando 6: ajustes...');
    await page.locator('.app-rail [data-action="settings"]').click();
    await page.locator('#at-settings-modal').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(refDir, 'atelie-casca-6.png') });
    await page.keyboard.press('Escape');
    await page.locator('#at-settings-modal').waitFor({ state: 'detached' });

    console.log('Capturas do Ateliê concluídas!');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }

  // Captura da Ficha
  const fichaDir = '/home/ilvro/Documents/Projects/Ficha teste - Ordem II';
  try {
    console.log('Iniciando servidor de prévia da Ficha...');
    const preview = spawn('npx', ['vite', 'preview', '--port', '4791'], { cwd: fichaDir, stdio: 'ignore' });

    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch('http://127.0.0.1:4791', { signal: AbortSignal.timeout(500) });
        if (res.ok) { ready = true; break; }
      } catch {}
      await new Promise(r => setTimeout(r, 200));
    }

    if (!ready) {
      console.warn('Aviso: servidor da Ficha não respondeu a tempo.');
      preview.kill('SIGTERM');
      return;
    }

    const fichaBrowser = await chromium.launch({
      executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
      headless: true,
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });

    const fichaPage = await fichaBrowser.newPage({ viewport: { width: 1600, height: 950 } });
    try {
      await fichaPage.goto('http://127.0.0.1:4791');
      await fichaPage.waitForTimeout(1000);
      await fichaPage.screenshot({ path: path.join(refDir, 'ficha-principal.png') });
      console.log('Capturado ficha-principal.png');

      await fichaPage.keyboard.press('Control+k');
      await fichaPage.waitForTimeout(500);
      await fichaPage.screenshot({ path: path.join(refDir, 'ficha-ctrl-k.png') });
      console.log('Capturado ficha-ctrl-k.png');
    } finally {
      await fichaBrowser.close();
      preview.kill('SIGTERM');
    }
  } catch (err) {
    console.warn('Não foi possível capturar a Ficha:', err.message);
  }
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});

