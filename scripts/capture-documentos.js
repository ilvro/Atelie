import { mkdir, rm, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../server/app.js';
import { projectDir } from '../server/paths.js';

async function main() {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-screenshot-'));
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

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // 1. Load editor
    await page.goto(`${baseUrl}/?diagnostics`);
    await page.waitForFunction(() => !!window.__atelie?.editor?.state);

    // 2. Open documents drawer
    await page.click('.rail-btn[data-action="documents"]');
    await page.waitForSelector('.docs-navigator', { state: 'visible' });

    // 3. Create folders
    page.once('dialog', d => d.accept('Campanha: O Segredo na Floresta'));
    await page.click('.nav-new-folder-btn');
    await page.waitForTimeout(300);

    page.once('dialog', d => d.accept('Dossiês Confidenciais'));
    await page.click('.nav-new-folder-btn');
    await page.waitForTimeout(300);

    // 4. Archive current document
    const nameInput = page.locator('.at-doc-name-input');
    await nameInput.fill('Relatório de Autópsia - Caso 42');
    await nameInput.dispatchEvent('input');
    await page.click('[data-action="archive"]');
    await page.waitForTimeout(500);

    const docId = await page.evaluate(() => window.__atelie.editor.state.handout.id);

    // 5. Move document to folder
    const docRow = page.locator(`.nav-doc-row[data-doc-id="${docId}"]`).first();
    await docRow.click({ button: 'right' });
    await page.waitForSelector('.at-context-menu', { state: 'visible' });
    await page.click('.at-context-menu-item:has-text("Mover para: Campanha: O Segredo na Floresta")');
    await page.waitForTimeout(300);

    // 6. Pin document
    const pinBtn = page.locator(`.nav-doc-row[data-doc-id="${docId}"] .pin-btn`).first();
    await pinBtn.click();
    await page.waitForTimeout(300);

    // 7. Make an unarchived edit so draft bar is visible
    await nameInput.fill('Relatório de Autópsia - Caso 42 (Revisão Dr. Veríssimo)');
    await nameInput.dispatchEvent('input');
    await page.waitForTimeout(1000); // trigger draft save

    // Ensure drawer is open
    const isDrawerOpen = await page.locator('.docs-navigator').isVisible();
    if (!isDrawerOpen) {
      await page.click('.rail-btn[data-action="documents"]');
      await page.waitForSelector('.docs-navigator', { state: 'visible' });
    }

    await page.waitForTimeout(500);

    // 8. Capture screenshot to docs/referencias/atelie-documentos.png
    const destPath = path.join(projectDir, 'docs/referencias/atelie-documentos.png');
    await page.screenshot({ path: destPath });
    console.log('Saved screenshot to:', destPath);
  } finally {
    await browser.close();
    await new Promise(r => server.close(r));
    await rm(dataDir, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

