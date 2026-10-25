import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { createApp } from '../../server/app.js';
import { projectDir } from '../../server/paths.js';
import { generatePrintHtml, printLayout } from '../../src/editor/export.js';

test('export and print e2e: 300 DPI export, UV export option, navigator context menu, shortcut E, and 1:1 scale print layout', { timeout: 90_000 }, async (t) => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-export-e2e-'));
  const collectionDir = path.join(projectDir, 'public/colecao');
  const distDir = path.join(projectDir, 'dist');
  const app = await createApp({ dataDir, collection: collectionDir, distDir });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const browser = await chromium.launch({
    executablePath: process.env.TABLETOP_BROWSER_PATH || chromium.executablePath(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  t.after(async () => {
    await browser.close();
    await new Promise(r => server.close(r));
    await rm(dataDir, { recursive: true, force: true });
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  // 1. Initial page load with A4 default document
  await page.goto(`${baseUrl}/?diagnostics`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);

  // 2. Test shortcut E to open Export drawer
  await page.keyboard.press('e');
  await page.waitForSelector('#app-drawer.open', { state: 'visible' });

  const drawerTitle = await page.locator('#drawer-title').innerText();
  assert.ok(drawerTitle.includes('EXPORTAR'), 'Drawer title should be EXPORTAR');

  // Verify options are present
  await page.waitForSelector('[data-action="export-screen"]', { state: 'visible' });
  await page.waitForSelector('[data-action="export-print"]', { state: 'visible' });
  await page.waitForSelector('[data-action="print"]', { state: 'visible' });

  // 3. Test 300 DPI Export (PNG · Impressão)
  const printDownloadPromise = page.waitForEvent('download');
  await page.click('[data-action="export-print"]');
  const printDownload = await printDownloadPromise;

  const printFilename = printDownload.suggestedFilename();
  assert.ok(printFilename.endsWith('.png'), `Filename should end with .png: ${printFilename}`);
  assert.ok(printFilename.includes('300dpi'), `Filename should include 300dpi tag: ${printFilename}`);

  const printDownloadPath = await printDownload.path();
  const printBytes = await readFile(printDownloadPath);
  assert.equal(printBytes.toString('ascii', 12, 16), 'IHDR');
  const width300 = printBytes.readUInt32BE(16);
  const height300 = printBytes.readUInt32BE(20);
  assert.equal(width300, 1240 * 2, 'Width in 300 DPI print export should be exactly 2x (2480 px)');
  assert.equal(height300, 1754 * 2, 'Height in 300 DPI print export should be exactly 2x (3508 px)');

  // 4. Test UV Export Option with template Diário de culto · com UV
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  await page.goto(`${baseUrl}/?diagnostics&template=casa-tpl-diario-culto-uv`);
  await page.waitForFunction(() => !!window.__atelie?.editor?.state);
  await page.waitForTimeout(300);

  // Open Export Drawer
  await page.keyboard.press('e');
  await page.waitForSelector('#app-drawer.open', { state: 'visible' });

  // Verify UV box is present
  const uvCheckbox = page.locator('#export-uv-checkbox');
  await uvCheckbox.waitFor({ state: 'visible' });
  await uvCheckbox.check();

  // Export screen PNG with UV light
  const uvDownloadPromise = page.waitForEvent('download');
  await page.click('[data-action="export-screen"]');
  const uvDownload = await uvDownloadPromise;

  const uvFilename = uvDownload.suggestedFilename();
  assert.ok(uvFilename.includes('uv'), `Filename should include uv tag: ${uvFilename}`);

  const uvPath = await uvDownload.path();
  const uvBytes = await readFile(uvPath);
  assert.equal(uvBytes.toString('ascii', 12, 16), 'IHDR');
  const uvW = uvBytes.readUInt32BE(16);
  const uvH = uvBytes.readUInt32BE(20);
  assert.equal(Math.max(uvW, uvH), 2048, 'Max dimension must be 2048 for UV screen export');

  // Close drawer
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // 5. Test Navigator context menu "Exportar…"
  // Archive document first
  await page.click('[data-action="archive"]');
  await page.waitForTimeout(400);

  const docId = await page.evaluate(() => window.__atelie.editor.state.handout.id);

  // Open documents drawer
  await page.click('.rail-btn[data-action="documents"]');
  await page.waitForSelector('.docs-navigator', { state: 'visible' });

  const docRow = page.locator(`.nav-doc-row[data-doc-id="${docId}"]`).first();
  await docRow.click({ button: 'right' });
  await page.waitForSelector('.at-context-menu', { state: 'visible' });

  // Click "Exportar…"
  const exportMenuItem = page.locator('.at-context-menu-item:has-text("Exportar")');
  await exportMenuItem.click();
  await page.waitForSelector('#app-drawer.open', { state: 'visible' });
  const isExportOpen = await page.locator('#drawer-title').innerText();
  assert.ok(isExportOpen.includes('EXPORTAR'), 'Drawer should switch to EXPORTAR from context menu');

  // 6. Test Print action and generated HTML from UI
  await page.evaluate(() => {
    window.open = (url, target) => {
      window.__lastOpenedTarget = target;
      return {
        document: {
          open: () => {},
          write: (html) => { window.__lastPrintHtml = html; },
          close: () => {},
        },
      };
    };
  });

  await page.click('[data-action="print"]');
  await page.waitForTimeout(300);

  const capturedPrintHtml = await page.evaluate(() => window.__lastPrintHtml);
  assert.ok(capturedPrintHtml, 'printDocument must write print HTML to opened window');
  assert.ok(capturedPrintHtml.includes('@page {'), 'Captured print HTML must have @page rule');
  assert.ok(capturedPrintHtml.includes('size: A4 portrait'), 'Captured print HTML must be A4 portrait');
  assert.ok(capturedPrintHtml.includes('width: 210mm'), 'Captured print HTML must be 210mm wide');
  assert.ok(capturedPrintHtml.includes('height: 297mm'), 'Captured print HTML must be 297mm high');

  assert.deepEqual(errors, []);
});
