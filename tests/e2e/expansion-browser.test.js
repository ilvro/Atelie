import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import os from 'node:os';
import { stat, mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { chromium } from 'playwright';

const distPagesDir = path.resolve('dist-pages');

// Minimal 1x1 transparent PNG buffer
const DUMMY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

test('expansion browser e2e: install via webkitdirectory, verify library items, reload persistence, and remove', { timeout: 90_000 }, async (t) => {
  const distStat = await stat(distPagesDir).catch(() => null);
  assert.ok(distStat && distStat.isDirectory(), 'dist-pages/ deve existir antes do teste.');

  // Set up static Express server serving /Atelie/
  const app = express();
  app.use('/Atelie', express.static(distPagesDir));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  const atelieUrl = `http://127.0.0.1:${port}/Atelie/`;

  // Create temporary test expansion directory
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-e2e-exp-'));
  const elementsDir = path.join(tempDir, 'elements');
  const previewsDir = path.join(tempDir, 'previews');
  await mkdir(elementsDir, { recursive: true });
  await mkdir(previewsDir, { recursive: true });

  const expJsonPath = path.join(tempDir, 'expansion.json');
  const libJsonPath = path.join(tempDir, 'library.json');
  const elemPath = path.join(elementsDir, 'selo.png');
  const prevPath = path.join(previewsDir, 'selo.png');

  await writeFile(
    expJsonPath,
    JSON.stringify({
      id: 'e2e-exp',
      name: 'Expansão E2E Teste',
      description: 'Expansão de teste automatizado',
      license: 'Uso de teste',
    })
  );

  await writeFile(
    libJsonPath,
    JSON.stringify({
      items: [
        {
          id: 'e2e-selo-teste',
          name: 'Selo de Teste E2E',
          kind: 'element',
          category: 'Selos',
          file: 'elements/selo.png',
          preview: 'previews/selo.png',
        },
      ],
    })
  );

  await writeFile(elemPath, DUMMY_PNG);
  await writeFile(prevPath, DUMMY_PNG);

  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'atelie-pw-exp-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: { width: 1400, height: 900 },
  });

  t.after(async () => {
    await context.close().catch(() => {});
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    await new Promise(resolve => server.close(resolve));
  });

  const page = await context.newPage();
  await page.goto(atelieUrl);
  await page.waitForLoadState('networkidle');

  // 1. Open settings modal
  await page.click('.app-rail [data-action="settings"]');
  await page.waitForSelector('#at-settings-modal', { timeout: 10_000 });

  // 2. Install expansion via hidden file input (passing the directory path)
  const folderInput = page.locator('#setting-expansion-folder-input');
  await folderInput.setInputFiles(tempDir);

  // 3. Confirm confirmation dialog appears
  await page.waitForSelector('#at-expansion-modal', { timeout: 10_000 });
  const modalText = await page.textContent('.at-expansion-name');
  assert.match(modalText, /Expansão E2E Teste/);

  // Click install
  await page.click('#btn-confirm-install-exp');
  await page.waitForSelector('#at-expansion-modal', { state: 'detached', timeout: 15_000 });

  // 4. Verify expansion is now listed in settings modal
  await page.waitForSelector('.at-expansion-card-item', { timeout: 10_000 });
  const itemText = await page.textContent('.at-expansion-card-item');
  assert.match(itemText, /Expansão E2E Teste/);
  assert.match(itemText, /1 itens/);

  // Close settings
  await page.keyboard.press('Escape');
  await page.waitForSelector('#at-settings-modal', { state: 'detached' });

  // 5. Open Library drawer and verify expansion items are merged
  await page.locator('.app-rail [data-action="library"]').click();
  await page.waitForFunction(() => document.querySelector('#app-drawer')?.classList.contains('open'));

  // Query library via api to verify it returns the source and item
  const libData = await page.evaluate(async () => {
    return await window.__atelie.api.library.list();
  });

  const hasSource = libData.sources.some(s => s.id === 'e2e-exp');
  const hasItem = libData.items.some(i => i.id === 'e2e-selo-teste');
  assert.ok(hasSource, 'A lista de fontes deve incluir a expansão instalada');
  assert.ok(hasItem, 'A lista de itens deve incluir o item da expansão instalada');

  // 6. Reload page and verify expansion persists in IndexedDB
  await page.reload();
  await page.waitForLoadState('networkidle');

  const libDataAfterReload = await page.evaluate(async () => {
    return await window.__atelie.api.library.list();
  });
  assert.ok(libDataAfterReload.sources.some(s => s.id === 'e2e-exp'), 'Expansão deve persistir após recarregar');

  // 7. Remove expansion from Settings
  await page.click('.app-rail [data-action="settings"]');
  await page.waitForSelector('#at-settings-modal', { timeout: 5000 });

  page.on('dialog', async d => {
    await d.accept();
  });

  await page.click('[data-action="remove-expansion"]');

  // Verify removed from list
  await page.waitForFunction(() => {
    const list = document.querySelector('#setting-expansions-list');
    return list && list.textContent.includes('Nenhuma expansão instalada');
  }, { timeout: 10_000 });

  const libDataAfterRemoval = await page.evaluate(async () => {
    return await window.__atelie.api.library.list();
  });
  assert.equal(libDataAfterRemoval.sources.some(s => s.id === 'e2e-exp'), false, 'Expansão não deve constar após remoção');
});
